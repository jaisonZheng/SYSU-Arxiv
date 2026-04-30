package storage

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
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

	return filePath, size, nil
}

func (s *LocalStorage) DeleteFile(filePath string) error {
	if filePath == "" {
		return nil
	}
	return os.Remove(filePath)
}

func (s *LocalStorage) FileExists(filePath string) bool {
	_, err := os.Stat(filePath)
	return err == nil
}

func (s *LocalStorage) GetFile(filePath string) (*os.File, error) {
	return os.Open(filePath)
}
