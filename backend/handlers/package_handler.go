package handlers

import (
	"archive/zip"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"sysu-arxiv/db"
	"sysu-arxiv/models"
	"sysu-arxiv/storage"
)

type PackageHandler struct {
	store     *db.PackageStore
	storage   *storage.LocalStorage
}

func NewPackageHandler(store *db.PackageStore, storage *storage.LocalStorage) *PackageHandler {
	return &PackageHandler{store: store, storage: storage}
}

func (h *PackageHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/packages", h.ListPackages)
		api.GET("/packages/:id", h.GetPackage)
		api.GET("/packages/:id/items", h.GetPackageItems)
		api.GET("/packages/:id/download", h.DownloadPackage)
		api.GET("/packages/:id/preview/*path", h.PreviewPackageItem)
		api.GET("/packages/courses", h.GetPackageCourses)
		api.POST("/packages", h.CreatePackage)
	}
}

func (h *PackageHandler) ListPackages(c *gin.Context) {
	filter := &models.CoursePackageFilter{}

	if page, err := strconv.Atoi(c.Query("page")); err == nil && page > 0 {
		filter.Page = page
	} else {
		filter.Page = 1
	}

	if pageSize, err := strconv.Atoi(c.Query("page_size")); err == nil && pageSize > 0 {
		filter.PageSize = pageSize
	} else {
		filter.PageSize = 20
	}

	filter.CourseName = c.Query("course_name")
	filter.SourceType = c.Query("source_type")
	filter.Search = c.Query("search")
	filter.SortBy = c.Query("sort_by")
	filter.SortOrder = c.Query("sort_order")

	items, total, err := h.store.List(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	totalPages := int(total) / filter.PageSize
	if int(total)%filter.PageSize > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, models.CoursePackageListResponse{
		Items:      items,
		Total:      total,
		Page:       filter.Page,
		PageSize:   filter.PageSize,
		TotalPages: totalPages,
	})
}

func (h *PackageHandler) GetPackage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	p, err := h.store.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "package not found"})
		return
	}

	items, _ := h.store.GetItems(id)

	c.JSON(http.StatusOK, gin.H{
		"package": p,
		"items":   items,
	})
}

func (h *PackageHandler) GetPackageItems(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	items, err := h.store.GetItems(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *PackageHandler) DownloadPackage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	p, err := h.store.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "package not found"})
		return
	}

	if !h.storage.FileExists(p.FilePath) {
		c.JSON(http.StatusNotFound, gin.H{"error": "package file not found on disk"})
		return
	}

	h.store.IncrementDownloadCount(id)

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", p.FileName))
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Length", fmt.Sprintf("%d", p.FileSize))
	c.File(h.storage.ResolvePath(p.FilePath))
}

func (h *PackageHandler) PreviewPackageItem(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	p, err := h.store.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "package not found"})
		return
	}

	if !h.storage.FileExists(p.FilePath) {
		c.JSON(http.StatusNotFound, gin.H{"error": "package file not found on disk"})
		return
	}

	itemPath := c.Param("path")
	if itemPath == "" || itemPath == "/" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "item path required"})
		return
	}
	itemPath = strings.TrimPrefix(itemPath, "/")

	// Open zip and extract the requested file
	zr, err := zip.OpenReader(h.storage.ResolvePath(p.FilePath))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open package"})
		return
	}
	defer zr.Close()

	for _, f := range zr.File {
		if f.Name == itemPath {
			rc, err := f.Open()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open file in package"})
				return
			}
			defer rc.Close()

			// Set content type based on extension
			ext := strings.ToLower(filepath.Ext(f.Name))
			contentType := "application/octet-stream"
			switch ext {
			case ".pdf":
				contentType = "application/pdf"
			case ".jpg", ".jpeg":
				contentType = "image/jpeg"
			case ".png":
				contentType = "image/png"
			case ".gif":
				contentType = "image/gif"
			case ".txt", ".md", ".c", ".cpp", ".h", ".py", ".js":
				contentType = "text/plain; charset=utf-8"
			case ".html":
				contentType = "text/html; charset=utf-8"
			}

			c.Header("Content-Type", contentType)
			c.Header("Content-Length", fmt.Sprintf("%d", f.UncompressedSize64))
			// For inline preview (not download)
			c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filepath.Base(f.Name)))
			io.Copy(c.Writer, rc)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "item not found in package"})
}

func (h *PackageHandler) GetPackageCourses(c *gin.Context) {
	courses, err := h.store.GetDistinctCourses()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"courses": courses})
}

func (h *PackageHandler) CreatePackage(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请选择要上传的文件"})
		return
	}
	defer file.Close()

	fileName := header.Filename
	fileExt := strings.ToLower(filepath.Ext(fileName))

	if fileExt != ".zip" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "资源包仅支持 ZIP 格式"})
		return
	}

	filePath, fileSize, err := h.storage.SaveFile(file, header, "packages")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存文件失败: " + err.Error()})
		return
	}

	// Parse zip to count files and create items
	zr, err := zip.OpenReader(h.storage.ResolvePath(filePath))
	if err != nil {
		h.storage.DeleteFile(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "无法打开 ZIP 文件: " + err.Error()})
		return
	}
	defer zr.Close()

	totalFiles := 0
	items := []models.PackageItem{}
	for _, f := range zr.File {
		if f.FileInfo().IsDir() {
			continue
		}
		totalFiles++
		ext := strings.ToLower(filepath.Ext(f.Name))
		items = append(items, models.PackageItem{
			Path:     f.Name,
			FileName: filepath.Base(f.Name),
			FileSize: int64(f.UncompressedSize64),
			FileType: ext,
		})
	}

	p := &models.CoursePackage{
		Title:       c.PostForm("title"),
		Description: c.PostForm("description"),
		CourseName:  c.PostForm("course_name"),
		SourceType:  "user_upload",
		FileName:    fileName,
		FilePath:    filePath,
		FileSize:    fileSize,
		TotalFiles:  totalFiles,
	}

	if p.Title == "" {
		p.Title = strings.TrimSuffix(fileName, fileExt)
	}

	if dept := c.PostForm("department"); dept != "" {
		p.Department = sql.NullString{String: dept, Valid: true}
	}

	if p.CourseName == "" {
		p.CourseName = "未分类"
	}

	id, err := h.store.Create(p)
	if err != nil {
		h.storage.DeleteFile(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建资源包记录失败: " + err.Error()})
		return
	}

	// Create package items
	for _, item := range items {
		item.PackageID = id
		if err := h.store.CreateItem(&item); err != nil {
			fmt.Printf("failed to create package item: %v\n", err)
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":      id,
		"message": "upload successful",
	})
}
