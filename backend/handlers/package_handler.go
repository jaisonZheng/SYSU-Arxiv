package handlers

import (
	"archive/zip"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"sysu-arxiv/db"
	"sysu-arxiv/middleware"
	"sysu-arxiv/models"
	"sysu-arxiv/storage"
)

type PackageHandler struct {
	store        *db.PackageStore
	quotaStore   *db.QuotaStore
	recordStore  *db.RecordStore
	storage      *storage.LocalStorage
	cacheStorage *storage.LocalStorage
}

func NewPackageHandler(store *db.PackageStore, storage *storage.LocalStorage) *PackageHandler {
	return &PackageHandler{store: store, storage: storage}
}

func (h *PackageHandler) SetQuotaStore(qs *db.QuotaStore) {
	h.quotaStore = qs
}

func (h *PackageHandler) SetRecordStore(rs *db.RecordStore) {
	h.recordStore = rs
}

func (h *PackageHandler) SetCacheStorage(cs *storage.LocalStorage) {
	h.cacheStorage = cs
}

func (h *PackageHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/packages", h.ListPackages)
		api.GET("/packages/:id", h.GetPackage)
		api.GET("/packages/:id/items", h.GetPackageItems)
		api.GET("/packages/:id/preview/*path", h.PreviewPackageItem)
		api.GET("/packages/courses", h.GetPackageCourses)
	}

	// Auth-required routes
	auth := r.Group("/api")
	auth.Use(middleware.AuthRequired())
	{
		auth.GET("/packages/:id/download", h.DownloadPackage)
		auth.GET("/packages/:id/download-status", h.DownloadPackageStatus)
	}

	// Upload can be anonymous
	upload := r.Group("/api")
	upload.Use(middleware.AuthOptional())
	{
		upload.POST("/packages", h.CreatePackage)
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

func (h *PackageHandler) DownloadPackageStatus(c *gin.Context) {
	userID := c.GetInt64("userID")

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if _, err := h.store.GetByID(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "package not found"})
		return
	}

	user, err := db.NewUserStore().GetByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}
	weekStart := h.quotaStore.CurrentWeekStart(user.CreatedAt)
	quota, err := h.quotaStore.GetOrCreateQuota(userID, weekStart)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get quota"})
		return
	}

	alreadyDownloaded := false
	if h.recordStore != nil {
		alreadyDownloaded, err = h.recordStore.HasDownloadedRecord(userID, id, "package")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check download record"})
			return
		}
	}

	remaining := quota.TotalQuota - quota.UsedQuota
	if remaining < 0 {
		remaining = 0
	}
	canDownload := alreadyDownloaded || remaining > 0

	c.JSON(http.StatusOK, gin.H{
		"already_downloaded": alreadyDownloaded,
		"remaining_quota":    remaining,
		"can_download":       canDownload,
	})
}

func (h *PackageHandler) DownloadPackage(c *gin.Context) {
	userID := c.GetInt64("userID")

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
		if p.SourceType != "" && p.SourceType != "user_upload" {
			c.JSON(http.StatusConflict, gin.H{"error": "external_source", "source_type": p.SourceType})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "package file not found on disk"})
		return
	}

	// Check if already downloaded; if so, serve without deducting quota or recording.
	alreadyDownloaded := false
	if h.recordStore != nil {
		alreadyDownloaded, err = h.recordStore.HasDownloadedRecord(userID, id, "package")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check download record"})
			return
		}
	}

	// Check quota only for first-time downloads
	if !alreadyDownloaded && h.quotaStore != nil {
		user, err := db.NewUserStore().GetByID(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
			return
		}
		weekStart := h.quotaStore.CurrentWeekStart(user.CreatedAt)
		quota, err := h.quotaStore.GetOrCreateQuota(userID, weekStart)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get quota"})
			return
		}
		if quota.UsedQuota >= quota.TotalQuota {
			c.JSON(http.StatusForbidden, gin.H{"error": "quota_exceeded"})
			return
		}
		if _, err := h.quotaStore.IncrementUsed(userID, weekStart); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update quota"})
			return
		}
	}

	// Record download only for first-time downloads
	if !alreadyDownloaded {
		if h.recordStore != nil {
			h.recordStore.CreateDownloadRecord(userID, id, "package")
		}
		h.store.IncrementDownloadCount(id)
		db.IncrementSiteStat("total_downloads")
	}

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
		if p.SourceType != "" && p.SourceType != "user_upload" {
			c.JSON(http.StatusConflict, gin.H{"error": "external_source", "source_type": p.SourceType})
			return
		}
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
			case ".webp":
				contentType = "image/webp"
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
	userID := c.GetInt64("userID")
	validUploader := userID > 0

	filePath := c.PostForm("file_path")
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file_path required"})
		return
	}

	if !strings.HasPrefix(filePath, "cache/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file_path"})
		return
	}

	if h.cacheStorage == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cache storage not available"})
		return
	}

	absSrc := h.cacheStorage.ResolvePath(filePath)
	if _, err := os.Stat(absSrc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cached file not found"})
		return
	}

	fileName := c.PostForm("file_name")
	if fileName == "" {
		fileName = filepath.Base(absSrc)
	}
	fileExt := strings.ToLower(filepath.Ext(fileName))

	if fileExt != ".zip" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "资源包仅支持 ZIP 格式"})
		return
	}

	// Move cached file to packages directory
	timestamp := time.Now().UnixNano()
	dstFilename := fmt.Sprintf("%d_%s", timestamp, fileName)
	dstDir := filepath.Join(h.storage.BasePath, "packages")
	if err := os.MkdirAll(dstDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create packages dir: " + err.Error()})
		return
	}
	absDst := filepath.Join(dstDir, dstFilename)

	if err := os.Rename(absSrc, absDst); err != nil {
		// Fallback copy+delete
		srcFile, err := os.Open(absSrc)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open cached file: " + err.Error()})
			return
		}
		defer srcFile.Close()
		dstFile, err := os.Create(absDst)
		if err != nil {
			srcFile.Close()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create package file: " + err.Error()})
			return
		}
		if _, err := io.Copy(dstFile, srcFile); err != nil {
			dstFile.Close()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to copy file: " + err.Error()})
			return
		}
		if err := dstFile.Close(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to close package file: " + err.Error()})
			return
		}
		if err := os.Remove(absSrc); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove cached file: " + err.Error()})
			return
		}
	}

	finalPath := "packages/" + dstFilename
	fileSize := int64(0)
	if info, err := os.Stat(absDst); err == nil {
		fileSize = info.Size()
	}

	// Parse zip to count files and create items
	zr, err := zip.OpenReader(absDst)
	if err != nil {
		os.Remove(absDst)
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
		mimeType := mimeTypeForExt(ext)
		items = append(items, models.PackageItem{
			Path:     f.Name,
			FileName: filepath.Base(f.Name),
			FileSize: int64(f.UncompressedSize64),
			FileType: ext,
			MimeType: mimeType,
		})
	}

	p := &models.CoursePackage{
		Title:        c.PostForm("title"),
		Description:  c.PostForm("description"),
		CourseName:   c.PostForm("course_name"),
		SourceType:   "user_upload",
		UploaderID:   sql.NullInt64{Int64: userID, Valid: validUploader},
		FileName:     fileName,
		FilePath:     finalPath,
		FileSize:     fileSize,
		TotalFiles:   totalFiles,
	}

	if uploader := c.PostForm("uploader_name"); uploader != "" {
		p.UploaderName = sql.NullString{String: uploader, Valid: true}
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
		os.Remove(absDst)
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

	// Record upload
	if validUploader && h.recordStore != nil {
		h.recordStore.CreateUploadRecord(userID, id, "package")
	}

	// Add bonus quota (+3) for upload
	if validUploader && h.quotaStore != nil {
		user, _ := db.NewUserStore().GetByID(userID)
		if user != nil {
			weekStart := h.quotaStore.CurrentWeekStart(user.CreatedAt)
			h.quotaStore.AddBonus(userID, weekStart, 3)
		}
	}

	db.IncrementSiteStat("total_uploads")

	c.JSON(http.StatusCreated, gin.H{
		"id":      id,
		"message": "upload successful",
	})
}

func mimeTypeForExt(ext string) string {
	ext = strings.ToLower(ext)
	switch ext {
	case ".pdf":
		return "application/pdf"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".txt", ".md", ".c", ".cpp", ".h", ".py", ".js":
		return "text/plain; charset=utf-8"
	case ".html":
		return "text/html; charset=utf-8"
	default:
		return ""
	}
}
