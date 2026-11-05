package cramameleon

import (
	"archive/zip"
	"encoding/binary"
	"errors"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"

	"sysu-arxiv/db"
	"sysu-arxiv/storage"
)

var errUnavailable = errors.New("file unavailable or unsupported")

type openedFile struct {
	io.ReadCloser
	name     string
	size     int64
	category string
}
type zipMember struct {
	io.ReadCloser
	archive *zip.Reader
	owner   *os.File
}

func (f *zipMember) Close() error {
	a := f.ReadCloser.Close()
	b := f.owner.Close()
	if a != nil {
		return a
	}
	return b
}

// Only database paths resolving inside the legacy site's data directory are read.
func (h *handler) safeFile(stored string) (*os.File, error) {
	root, err := filepath.EvalSymlinks(h.dataRoot)
	if err != nil {
		return nil, err
	}
	root, err = filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	resolved := storage.NewLocalStorage(filepath.Join(h.dataRoot, "uploads")).ResolvePath(stored)
	resolved, err = filepath.EvalSymlinks(resolved)
	if err != nil {
		return nil, err
	}
	resolved, err = filepath.Abs(resolved)
	if err != nil {
		return nil, err
	}
	rel, err := filepath.Rel(root, resolved)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
		return nil, errUnavailable
	}
	f, err := os.Open(resolved)
	if err != nil {
		return nil, err
	}
	info, err := f.Stat()
	if err != nil || !info.Mode().IsRegular() {
		f.Close()
		return nil, errUnavailable
	}
	return f, nil
}

// Bound the ZIP central directory before archive/zip allocates member metadata.
func boundedZip(f *os.File) (*zip.Reader, error) {
	info, err := f.Stat()
	if err != nil || info.Size() < 22 || info.Size() > 2<<30 {
		return nil, errUnavailable
	}
	n := info.Size()
	if n > 65557 {
		n = 65557
	}
	tail := make([]byte, n)
	if _, err = f.ReadAt(tail, info.Size()-n); err != nil {
		return nil, err
	}
	for i := len(tail) - 22; i >= 0; i-- {
		if binary.LittleEndian.Uint32(tail[i:i+4]) != 0x06054b50 {
			continue
		}
		b := tail[i:]
		if i+22+int(binary.LittleEndian.Uint16(b[20:22])) != len(tail) {
			continue
		}
		entries := binary.LittleEndian.Uint16(b[10:12])
		size := binary.LittleEndian.Uint32(b[12:16])
		offset := binary.LittleEndian.Uint32(b[16:20])
		if binary.LittleEndian.Uint16(b[4:6]) != 0 || binary.LittleEndian.Uint16(b[6:8]) != 0 || binary.LittleEndian.Uint16(b[8:10]) != entries || entries > 10000 || size > 16<<20 || offset == 0xffffffff || int64(offset)+int64(size) > info.Size()-22 {
			return nil, errUnavailable
		}
		return zip.NewReader(f, info.Size())
	}
	return nil, errUnavailable
}

func (h *handler) openResource(kind string, id, itemID int64) (*openedFile, error) {
	if kind == "material" {
		m, err := db.NewMaterialStore().GetByID(id)
		if err != nil {
			return nil, err
		}
		if !supported(m.FileName) {
			return nil, errUnavailable
		}
		f, err := h.safeFile(m.FilePath)
		if err != nil {
			return nil, err
		}
		info, err := f.Stat()
		if err != nil || info.Size() > fileLimit {
			f.Close()
			return nil, errUnavailable
		}
		return &openedFile{ReadCloser: f, name: filepath.Base(m.FileName), size: info.Size(), category: m.Category}, nil
	}
	p, err := db.NewPackageStore().GetByID(id)
	if err != nil {
		return nil, err
	}
	var name, member string
	var size int64
	if err = db.DB.QueryRow("SELECT file_name,path,file_size FROM package_items WHERE package_id=? AND id=?", id, itemID).Scan(&name, &member, &size); err != nil {
		return nil, err
	}
	if !supported(name) || size > fileLimit || strings.Contains(member, "\\") || strings.Contains(member, "\x00") || path.IsAbs(member) || path.Clean(member) != member || member == ".." || strings.HasPrefix(member, "../") {
		return nil, errUnavailable
	}
	f, err := h.safeFile(p.FilePath)
	if err != nil {
		return nil, err
	}
	ok := false
	defer func() {
		if !ok {
			f.Close()
		}
	}()
	z, err := boundedZip(f)
	if err != nil {
		return nil, err
	}
	var selected *zip.File
	for _, entry := range z.File {
		if entry.Name == member {
			if selected != nil {
				return nil, errUnavailable
			}
			selected = entry
		}
	}
	if selected == nil || !selected.Mode().IsRegular() || selected.UncompressedSize64 > uint64(fileLimit) || selected.Flags&1 != 0 {
		return nil, errUnavailable
	}
	r, err := selected.Open()
	if err != nil {
		return nil, err
	}
	ok = true
	return &openedFile{ReadCloser: &zipMember{ReadCloser: r, archive: z, owner: f}, name: path.Base(name), size: int64(selected.UncompressedSize64)}, nil
}
