package storage

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type LocalStorage struct {
	BasePath string
}

func NewLocalStorage(basePath string) *LocalStorage {
	return &LocalStorage{BasePath: basePath}
}

func (s *LocalStorage) SaveFile(file multipart.File, header *multipart.FileHeader, subDir string) (string, int64, error) {
	timestamp := time.Now().UnixNano()
	filename := fmt.Sprintf("%d_%s", timestamp, header.Filename)
	dir := filepath.Join(s.BasePath, subDir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", 0, fmt.Errorf("failed to create dir: %w", err)
	}
	filePath := filepath.Join(dir, filename)

	out, err := os.Create(filePath)
	if err != nil {
		return "", 0, fmt.Errorf("failed to create file: %w", err)
	}
	defer out.Close()

	size, err := io.Copy(out, file)
	if err != nil {
		return "", 0, fmt.Errorf("failed to write file: %w", err)
	}

	relPath, err := filepath.Rel(s.BasePath, filePath)
	if err != nil {
		return "", 0, fmt.Errorf("failed to get relative path: %w", err)
	}
	return relPath, size, nil
}

func (s *LocalStorage) DeleteFile(filePath string) error {
	if filePath == "" {
		return nil
	}
	return os.Remove(s.resolvePath(filePath))
}

func (s *LocalStorage) MoveFile(srcPath, dstSubDir string) (string, int64, error) {
	absSrc, err := filepath.Abs(s.resolvePath(srcPath))
	if err != nil {
		return "", 0, fmt.Errorf("failed to resolve source path: %w", err)
	}

	absBase, err := filepath.Abs(s.BasePath)
	if err != nil {
		return "", 0, fmt.Errorf("failed to resolve base path: %w", err)
	}

	if !strings.HasPrefix(absSrc, absBase) {
		return "", 0, fmt.Errorf("source path is outside storage root")
	}

	info, err := os.Stat(absSrc)
	if err != nil {
		return "", 0, fmt.Errorf("failed to stat source file: %w", err)
	}

	timestamp := time.Now().UnixNano()
	filename := fmt.Sprintf("%d_%s", timestamp, filepath.Base(absSrc))
	dstDir := filepath.Join(absBase, dstSubDir)
	if err := os.MkdirAll(dstDir, 0755); err != nil {
		return "", 0, fmt.Errorf("failed to create destination dir: %w", err)
	}
	absDst := filepath.Join(dstDir, filename)

	if err := os.Rename(absSrc, absDst); err != nil {
		// Fallback to copy+delete if rename crosses devices
		srcFile, err := os.Open(absSrc)
		if err != nil {
			return "", 0, fmt.Errorf("failed to open source file: %w", err)
		}
		defer srcFile.Close()

		dstFile, err := os.Create(absDst)
		if err != nil {
			return "", 0, fmt.Errorf("failed to create destination file: %w", err)
		}
		if _, err := io.Copy(dstFile, srcFile); err != nil {
			dstFile.Close()
			return "", 0, fmt.Errorf("failed to copy file: %w", err)
		}
		if err := dstFile.Close(); err != nil {
			return "", 0, fmt.Errorf("failed to close destination file: %w", err)
		}
		if err := os.Remove(absSrc); err != nil {
			return "", 0, fmt.Errorf("failed to remove source file: %w", err)
		}
	}

	relDst, err := filepath.Rel(absBase, absDst)
	if err != nil {
		return "", 0, fmt.Errorf("failed to get relative destination path: %w", err)
	}
	return relDst, info.Size(), nil
}

func (s *LocalStorage) resolvePath(filePath string) string {
	// If already absolute, use as-is
	if filepath.IsAbs(filePath) {
		return filePath
	}

	// Try multiple resolution strategies
	candidates := []string{
		filePath,                                         // relative to CWD
		filepath.Join(s.BasePath, filePath),              // relative to BasePath
		filepath.Join(filepath.Dir(s.BasePath), filePath), // relative to BasePath's parent
	}

	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}

	// Return the most likely candidate (BasePath + filePath)
	return candidates[1]
}

func (s *LocalStorage) ResolvePath(filePath string) string {
	return s.resolvePath(filePath)
}

func (s *LocalStorage) FileExists(filePath string) bool {
	_, err := os.Stat(s.resolvePath(filePath))
	return err == nil
}

func (s *LocalStorage) GetFile(filePath string) (*os.File, error) {
	return os.Open(s.resolvePath(filePath))
}
