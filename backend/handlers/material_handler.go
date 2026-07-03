package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
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

type MaterialHandler struct {
	store        *db.MaterialStore
	packageStore *db.PackageStore
	quotaStore   *db.QuotaStore
	recordStore  *db.RecordStore
	storage      *storage.LocalStorage
}

func NewMaterialHandler(store *db.MaterialStore, storage *storage.LocalStorage) *MaterialHandler {
	return &MaterialHandler{store: store, storage: storage}
}

func (h *MaterialHandler) SetPackageStore(ps *db.PackageStore) {
	h.packageStore = ps
}

func (h *MaterialHandler) SetQuotaStore(qs *db.QuotaStore) {
	h.quotaStore = qs
}

func (h *MaterialHandler) SetRecordStore(rs *db.RecordStore) {
	h.recordStore = rs
}

func (h *MaterialHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/materials", h.ListMaterials)
		api.GET("/materials/:id", h.GetMaterial)
		api.GET("/materials/:id/preview", h.PreviewMaterial)
		api.GET("/materials/check-duplicate", h.CheckDuplicate)
		api.GET("/departments", h.GetDepartments)
		api.GET("/courses", h.GetCourses)
		api.GET("/tags", h.GetTags)
		api.GET("/stats/downloads", h.GetTotalDownloads)
		api.GET("/stats/uploads", h.GetTotalUploads)
		api.GET("/stats/thanks", h.GetTotalThanks)
		api.POST("/materials/:id/thank", h.ThankMaterial)
		api.POST("/packages/:id/thank", h.ThankPackage)
	}

	// Auth-required routes
	auth := r.Group("/api")
	auth.Use(middleware.AuthRequired())
	{
		auth.GET("/materials/:id/download", h.DownloadMaterial)
		auth.GET("/materials/:id/download-status", h.DownloadMaterialStatus)
	}

	// Upload can be anonymous
	upload := r.Group("/api")
	upload.Use(middleware.AuthOptional())
	{
		upload.POST("/materials", h.CreateMaterial)
	}
}

func (h *MaterialHandler) ListMaterials(c *gin.Context) {
	filter := &models.MaterialFilter{}

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

	filter.Search = c.Query("search")
	filter.Category = c.Query("category")
	filter.SubCategory = c.Query("sub_category")
	filter.Department = c.Query("department")
	filter.Major = c.Query("major")
	filter.CourseName = c.Query("course_name")
	filter.Instructor = c.Query("instructor")
	filter.FileType = c.Query("file_type")
	filter.SortBy = c.Query("sort_by")
	filter.SortOrder = c.Query("sort_order")

	if yearStr := c.Query("year"); yearStr != "" {
		if year, err := strconv.Atoi(yearStr); err == nil {
			filter.Year = year
		}
	}

	items, total, err := h.store.List(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	totalPages := int(total) / filter.PageSize
	if int(total)%filter.PageSize > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, models.MaterialListResponse{
		Items:      items,
		Total:      total,
		Page:       filter.Page,
		PageSize:   filter.PageSize,
		TotalPages: totalPages,
	})
}

func (h *MaterialHandler) GetMaterial(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	m, err := h.store.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "material not found"})
		return
	}

	related, _ := h.store.GetRelatedMaterials(id, m.CourseName.String, 4)

	c.JSON(http.StatusOK, gin.H{
		"material": m,
		"related":  related,
	})
}

func (h *MaterialHandler) CreateMaterial(c *gin.Context) {
	userID := c.GetInt64("userID")
	validUploader := userID > 0

	filePath := c.PostForm("file_path")
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file_path required"})
		return
	}

	// Security: file_path must point to the cache directory
	if !strings.HasPrefix(filePath, "cache/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file_path"})
		return
	}

	if !h.storage.FileExists(filePath) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cached file not found"})
		return
	}

	fileName := c.PostForm("file_name")
	if fileName == "" {
		fileName = filepath.Base(filePath)
	}
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

	finalPath, fileSize, err := h.storage.MoveFile(filePath, "files")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to move file: " + err.Error()})
		return
	}

	mimeType := c.PostForm("mime_type")
	if mimeType == "" {
		mimeType = mimeTypeForExt(fileExt)
	}

	m := &models.Material{
		Title:        c.PostForm("title"),
		Description:  c.PostForm("description"),
		Category:     c.PostForm("category"),
		SubCategory:  sql.NullString{String: c.PostForm("sub_category"), Valid: c.PostForm("sub_category") != ""},
		Department:   sql.NullString{String: c.PostForm("department"), Valid: c.PostForm("department") != ""},
		Major:        sql.NullString{String: c.PostForm("major"), Valid: c.PostForm("major") != ""},
		CourseName:   sql.NullString{String: c.PostForm("course_name"), Valid: c.PostForm("course_name") != ""},
		Instructor:   sql.NullString{String: c.PostForm("instructor"), Valid: c.PostForm("instructor") != ""},
		FileType:     sql.NullString{String: c.PostForm("file_type"), Valid: c.PostForm("file_type") != ""},
		UploaderName: sql.NullString{String: c.PostForm("uploader_name"), Valid: c.PostForm("uploader_name") != ""},
		UploaderID:   sql.NullInt64{Int64: userID, Valid: validUploader},
		FileName:     fileName,
		FilePath:     finalPath,
		FileSize:     fileSize,
		MimeType:     sql.NullString{String: mimeType, Valid: mimeType != ""},
	}

	if m.Title == "" {
		m.Title = strings.TrimSuffix(fileName, fileExt)
	}

	if yearStr := c.PostForm("year"); yearStr != "" {
		if year, err := strconv.Atoi(yearStr); err == nil {
			m.Year.Int64 = int64(year)
			m.Year.Valid = true
		}
	}

	if m.FileType.String == "" {
		m.FileType = sql.NullString{String: fileExt, Valid: true}
	}

	id, err := h.store.Create(m)
	if err != nil {
		h.storage.DeleteFile(finalPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create material: " + err.Error()})
		return
	}

	// Record upload
	if validUploader && h.recordStore != nil {
		h.recordStore.CreateUploadRecord(userID, id, "material")
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

func (h *MaterialHandler) DownloadMaterialStatus(c *gin.Context) {
	userID := c.GetInt64("userID")

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if _, err := h.store.GetByID(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "material not found"})
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
		alreadyDownloaded, err = h.recordStore.HasDownloadedRecord(userID, id, "material")
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

func (h *MaterialHandler) DownloadMaterial(c *gin.Context) {
	userID := c.GetInt64("userID")

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	m, err := h.store.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "material not found"})
		return
	}

	if !h.storage.FileExists(m.FilePath) {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found on disk"})
		return
	}

	// Check if already downloaded; if so, serve without deducting quota or recording.
	alreadyDownloaded := false
	if h.recordStore != nil {
		alreadyDownloaded, err = h.recordStore.HasDownloadedRecord(userID, id, "material")
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
			h.recordStore.CreateDownloadRecord(userID, id, "material")
		}
		h.store.IncrementDownloadCount(id)
		db.IncrementSiteStat("total_downloads")
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", m.FileName))
	c.Header("Content-Type", m.MimeType.String)
	if m.MimeType.String == "" {
		c.Header("Content-Type", "application/octet-stream")
	}
	c.Header("Content-Length", fmt.Sprintf("%d", m.FileSize))
	c.File(h.storage.ResolvePath(m.FilePath))
}

func (h *MaterialHandler) PreviewMaterial(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	m, err := h.store.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "material not found"})
		return
	}

	if !h.storage.FileExists(m.FilePath) {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found on disk"})
		return
	}

	// Determine content type for preview
	ext := strings.ToLower(filepath.Ext(m.FileName))
	contentType := m.MimeType.String
	if contentType == "" {
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
		default:
			contentType = "application/octet-stream"
		}
	}

	// Inline preview (not download)
	c.Header("Content-Type", contentType)
	c.Header("Content-Length", fmt.Sprintf("%d", m.FileSize))
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", m.FileName))
	c.File(h.storage.ResolvePath(m.FilePath))
}

func (h *MaterialHandler) CheckDuplicate(c *gin.Context) {
	filename := c.Query("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "filename required"})
		return
	}

	exists, err := h.store.CheckDuplicate(filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"duplicate": exists,
		"filename":  filename,
	})
}

func (h *MaterialHandler) GetDepartments(c *gin.Context) {
	depts, err := h.store.GetDistinctValues("department")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"departments": depts})
}

func (h *MaterialHandler) GetCourses(c *gin.Context) {
	courses, err := h.store.GetDistinctValues("course_name")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"courses": courses})
}

func (h *MaterialHandler) GetTags(c *gin.Context) {
	categories, _ := h.store.GetDistinctValues("category")
	subCategories, _ := h.store.GetDistinctValues("sub_category")
	fileTypes, _ := h.store.GetDistinctValues("file_type")

	c.JSON(http.StatusOK, gin.H{
		"categories":     categories,
		"sub_categories": subCategories,
		"file_types":     fileTypes,
	})
}

func (h *MaterialHandler) GetTotalDownloads(c *gin.Context) {
	// Prefer persistent site_stats counter
	total := db.GetSiteStat("total_downloads")
	if total == 0 {
		// Fallback: sum from tables
		materialDownloads, _ := h.store.GetTotalDownloads()
		var packageDownloads int64
		if h.packageStore != nil {
			packageDownloads, _ = h.packageStore.GetTotalDownloads()
		}
		total = materialDownloads + packageDownloads
	}
	c.JSON(http.StatusOK, gin.H{
		"total_downloads": total,
	})
}

func (h *MaterialHandler) GetTotalUploads(c *gin.Context) {
	// Prefer persistent site_stats counter
	total := db.GetSiteStat("total_uploads")
	if total == 0 {
		materialCount, _ := h.store.GetTotalCount()
		var packageCount int64
		if h.packageStore != nil {
			packageCount, _ = h.packageStore.GetTotalCount()
		}
		total = materialCount + packageCount
	}
	c.JSON(http.StatusOK, gin.H{
		"total_uploads": total,
	})
}

func (h *MaterialHandler) ThankMaterial(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.store.IncrementThanksCount(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	db.IncrementSiteStat("total_thanks")
	c.JSON(http.StatusOK, gin.H{"thanked": true})
}

func (h *MaterialHandler) ThankPackage(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if h.packageStore == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "package store not available"})
		return
	}
	if err := h.packageStore.IncrementThanksCount(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	db.IncrementSiteStat("total_thanks")
	c.JSON(http.StatusOK, gin.H{"thanked": true})
}

func (h *MaterialHandler) GetTotalThanks(c *gin.Context) {
	// Prefer persistent site_stats counter
	total := db.GetSiteStat("total_thanks")
	if total == 0 {
		materialThanks, _ := h.store.GetTotalThanks()
		var packageThanks int64
		if h.packageStore != nil {
			packageThanks, _ = h.packageStore.GetTotalThanks()
		}
		total = materialThanks + packageThanks
	}
	c.JSON(http.StatusOK, gin.H{
		"total_thanks": total,
	})
}

func (h *MaterialHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"time":   time.Now().UTC(),
	})
}
