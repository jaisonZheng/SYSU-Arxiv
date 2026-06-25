package handlers

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"sysu-arxiv/middleware"
	"sysu-arxiv/storage"
)

type UploadHandler struct {
	storage *storage.LocalStorage
}

func NewUploadHandler(storage *storage.LocalStorage) *UploadHandler {
	return &UploadHandler{storage: storage}
}

func (h *UploadHandler) RegisterRoutes(r *gin.Engine) {
	upload := r.Group("/api")
	upload.Use(middleware.AuthOptional())
	{
		upload.POST("/upload/cache", h.UploadCache)
	}
}

func (h *UploadHandler) UploadCache(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file required"})
		return
	}
	defer file.Close()

	fileName := header.Filename
	fileExt := strings.ToLower(filepath.Ext(fileName))

	allowedExts := map[string]bool{
		".pdf": true, ".doc": true, ".docx": true, ".ppt": true, ".pptx": true,
		".xls": true, ".xlsx": true, ".txt": true, ".md": true, ".jpg": true,
		".jpeg": true, ".png": true, ".rar": true, ".7z": true, ".zip": true,
	}
	if !allowedExts[fileExt] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported file type: " + fileExt})
		return
	}

	filePath, fileSize, err := h.storage.SaveFile(file, header, "cache")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file: " + err.Error()})
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	c.JSON(http.StatusCreated, gin.H{
		"file_path": filePath,
		"file_name": fileName,
		"file_size": fileSize,
		"mime_type": mimeType,
	})
}
