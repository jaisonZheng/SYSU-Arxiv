package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"sysu-arxiv/db"
	"sysu-arxiv/models"
	"sysu-arxiv/storage"
)

type MaterialHandler struct {
	store  *db.MaterialStore
	storage *storage.LocalStorage
}

func NewMaterialHandler(store *db.MaterialStore, storage *storage.LocalStorage) *MaterialHandler {
	return &MaterialHandler{store: store, storage: storage}
}

func (h *MaterialHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/materials", h.ListMaterials)
		api.GET("/materials/:id", h.GetMaterial)
		api.POST("/materials", h.CreateMaterial)
		api.POST("/materials/zip", h.CreateZipPackage)
		api.GET("/materials/:id/download", h.DownloadMaterial)
		api.GET("/materials/:id/download-package", h.DownloadPackage)
		api.GET("/materials/check-duplicate", h.CheckDuplicate)
		api.GET("/departments", h.GetDepartments)
		api.GET("/courses", h.GetCourses)
		api.GET("/tags", h.GetTags)
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

	related, _ := h.store.GetRelatedMaterials(id, m.CourseName, 4)

	c.JSON(http.StatusOK, gin.H{
		"material": m,
		"related":  related,
	})
}

func (h *MaterialHandler) CreateMaterial(c *gin.Context) {
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
		".jpeg": true, ".png": true, ".zip": true, ".rar": true, ".7z": true,
	}

	if !allowedExts[fileExt] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported file type: " + fileExt})
		return
	}

	filePath, fileSize, err := h.storage.SaveFile(file, header, "files")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file: " + err.Error()})
		return
	}

	m := &models.Material{
		Title:        c.PostForm("title"),
		Description:  c.PostForm("description"),
		Category:     c.PostForm("category"),
		SubCategory:  c.PostForm("sub_category"),
		Department:   c.PostForm("department"),
		Major:        c.PostForm("major"),
		CourseName:   c.PostForm("course_name"),
		Instructor:   c.PostForm("instructor"),
		FileType:     c.PostForm("file_type"),
		UploaderName: c.PostForm("uploader_name"),
		FileName:     fileName,
		FilePath:     filePath,
		FileSize:     fileSize,
		MimeType:     header.Header.Get("Content-Type"),
		IsZipPackage: false,
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

	if m.FileType == "" {
		m.FileType = fileExt
	}

	id, err := h.store.Create(m)
	if err != nil {
		h.storage.DeleteFile(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create material: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":      id,
		"message": "upload successful",
	})
}

func (h *MaterialHandler) CreateZipPackage(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file required"})
		return
	}
	defer file.Close()

	fileName := header.Filename
	fileExt := strings.ToLower(filepath.Ext(fileName))

	if fileExt != ".zip" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only ZIP files are accepted for package upload"})
		return
	}

	filePath, fileSize, err := h.storage.SaveFile(file, header, "packages")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file: " + err.Error()})
		return
	}

	m := &models.Material{
		Title:        c.PostForm("title"),
		Description:  c.PostForm("description"),
		Category:     c.PostForm("category"),
		SubCategory:  c.PostForm("sub_category"),
		Department:   c.PostForm("department"),
		Major:        c.PostForm("major"),
		CourseName:   c.PostForm("course_name"),
		Instructor:   c.PostForm("instructor"),
		FileType:     "zip",
		UploaderName: c.PostForm("uploader_name"),
		FileName:     fileName,
		FilePath:     filePath,
		FileSize:     fileSize,
		MimeType:     "application/zip",
		IsZipPackage: true,
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

	id, err := h.store.Create(m)
	if err != nil {
		h.storage.DeleteFile(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create material: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":      id,
		"message": "zip package uploaded successfully",
	})
}

func (h *MaterialHandler) DownloadMaterial(c *gin.Context) {
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

	h.store.IncrementDownloadCount(id)

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", m.FileName))
	c.Header("Content-Type", m.MimeType)
	if m.MimeType == "" {
		c.Header("Content-Type", "application/octet-stream")
	}
	c.Header("Content-Length", fmt.Sprintf("%d", m.FileSize))
	c.File(m.FilePath)
}

func (h *MaterialHandler) DownloadPackage(c *gin.Context) {
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

	if !m.IsZipPackage {
		c.JSON(http.StatusBadRequest, gin.H{"error": "this material is not a zip package"})
		return
	}

	if !h.storage.FileExists(m.FilePath) {
		c.JSON(http.StatusNotFound, gin.H{"error": "package file not found on disk"})
		return
	}

	h.store.IncrementDownloadCount(id)

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", m.FileName))
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Length", fmt.Sprintf("%d", m.FileSize))
	c.File(m.FilePath)
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

func (h *MaterialHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"time":   time.Now().UTC(),
	})
}
