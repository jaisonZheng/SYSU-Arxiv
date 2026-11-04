package cramameleon

import (
	"database/sql"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"sysu-arxiv/db"
	"sysu-arxiv/models"
)

const fileLimit int64 = 20 << 20

type resource struct {
	ID                string `json:"id"`
	Kind              string `json:"kind"`
	Title             string `json:"title"`
	Course            string `json:"courseName"`
	Format            string `json:"format"`
	Size              int64  `json:"size"`
	URL               string `json:"url"`
	Availability      string `json:"availability"`
	AlreadyDownloaded bool   `json:"alreadyDownloaded"`
}
type item struct {
	ID        string `json:"id"`
	PackageID string `json:"packageId"`
	Name      string `json:"name"`
	Path      string `json:"path"`
	Format    string `json:"format"`
	Size      int64  `json:"size"`
	Supported bool   `json:"supported"`
}

func (h *handler) registerMaterials(api *gin.RouterGroup) {
	api.GET("/materials", h.listMaterials)
	api.GET("/materials/:id", h.getMaterial)
	api.GET("/packages", h.listPackages)
	api.GET("/packages/:id", h.getPackage)
	api.GET("/packages/:id/items", h.listItems)
	api.GET("/quota", h.quota)
	api.POST("/materials/:id/access", func(c *gin.Context) { h.access(c, "material") })
	api.POST("/packages/:id/access", func(c *gin.Context) { h.access(c, "package") })
	api.GET("/materials/:id/content", func(c *gin.Context) { h.content(c, "material") })
	api.GET("/packages/:id/items/:itemId/content", func(c *gin.Context) { h.content(c, "package") })
}

func format(name string) string { return strings.TrimPrefix(strings.ToLower(filepath.Ext(name)), ".") }
func supported(name string) bool {
	switch format(name) {
	case "txt", "md", "markdown", "pdf", "docx", "pptx":
		return true
	}
	return false
}
func number(c *gin.Context, name string) (int64, bool) {
	raw := c.Param(name)
	if !positiveID(raw) {
		fail(c, 400, "INVALID_REQUEST", "资料编号不正确")
		return 0, false
	}
	n, _ := strconv.ParseInt(raw, 10, 64)
	return n, true
}
func paging(c *gin.Context) (int, int, bool) {
	page, size := 1, 20
	var err error
	if raw := c.Query("page"); raw != "" {
		page, err = strconv.Atoi(raw)
		if err != nil || page < 1 || page > 10000 {
			fail(c, 400, "INVALID_REQUEST", "页码不正确")
			return 0, 0, false
		}
	}
	if raw := c.Query("page_size"); raw != "" {
		size, err = strconv.Atoi(raw)
		if err != nil || size < 1 || size > 50 {
			fail(c, 400, "INVALID_REQUEST", "每页最多 50 条")
			return 0, 0, false
		}
	}
	if utf8.RuneCountInString(c.Query("search")) > 100 || utf8.RuneCountInString(c.Query("course_name")) > 100 {
		fail(c, 400, "INVALID_REQUEST", "搜索内容过长")
		return 0, 0, false
	}
	return page, size, true
}

func (h *handler) material(m *models.Material) resource {
	r := resource{ID: strconv.FormatInt(m.ID, 10), Kind: "material", Title: m.Title, Course: m.CourseName.String, Format: format(m.FileName), Size: m.FileSize, URL: fmt.Sprintf("%s/material/%d", h.cfg.issuer, m.ID), Availability: "available"}
	if !supported(m.FileName) {
		r.Availability = "unsupported"
	} else if m.FileSize > fileLimit {
		r.Availability = "too_large"
	}
	if f, err := h.safeFile(m.FilePath); err != nil {
		r.Availability = "unavailable"
	} else {
		info, err := f.Stat()
		f.Close()
		if err != nil {
			r.Availability = "unavailable"
		} else if info.Size() > fileLimit {
			r.Availability = "too_large"
		}
	}
	return r
}
func (h *handler) pack(p *models.CoursePackage) resource {
	r := resource{ID: strconv.FormatInt(p.ID, 10), Kind: "package", Title: p.Title, Course: p.CourseName, Format: "zip", Size: p.FileSize, URL: fmt.Sprintf("%s/package/%d", h.cfg.issuer, p.ID), Availability: "available"}
	if f, err := h.safeFile(p.FilePath); err != nil {
		r.Availability = "unavailable"
	} else {
		f.Close()
	}
	return r
}

func (h *handler) listMaterials(c *gin.Context) {
	page, size, ok := paging(c)
	if !ok {
		return
	}
	values, total, err := db.NewMaterialStore().List(&models.MaterialFilter{Page: page, PageSize: size, Search: c.Query("search"), CourseName: c.Query("course_name")})
	if err != nil {
		fail(c, 503, "OLD_SITE_UNAVAILABLE", "资料搜索暂不可用")
		return
	}
	items := make([]resource, 0, len(values))
	for i := range values {
		items = append(items, h.material(&values[i]))
	}
	c.JSON(200, gin.H{"items": items, "total": total, "page": page, "pageSize": size, "hasMore": int64(page*size) < total})
}
func (h *handler) listPackages(c *gin.Context) {
	page, size, ok := paging(c)
	if !ok {
		return
	}
	values, total, err := db.NewPackageStore().List(&models.CoursePackageFilter{Page: page, PageSize: size, Search: c.Query("search"), CourseName: c.Query("course_name")})
	if err != nil {
		fail(c, 503, "OLD_SITE_UNAVAILABLE", "课程包搜索暂不可用")
		return
	}
	items := make([]resource, 0, len(values))
	for i := range values {
		items = append(items, h.pack(&values[i]))
	}
	c.JSON(200, gin.H{"items": items, "total": total, "page": page, "pageSize": size, "hasMore": int64(page*size) < total})
}
func (h *handler) getMaterial(c *gin.Context) {
	id, ok := number(c, "id")
	if !ok {
		return
	}
	m, err := db.NewMaterialStore().GetByID(id)
	if err != nil {
		fail(c, 404, "MATERIAL_NOT_FOUND", "资料不存在")
		return
	}
	r := h.material(m)
	r.AlreadyDownloaded, err = db.NewRecordStore().HasDownloadedRecord(c.GetInt64("userID"), id, "material")
	if err != nil {
		fail(c, 503, "STORAGE_FAILED", "资料状态暂不可用")
		return
	}
	c.JSON(200, r)
}
func (h *handler) getPackage(c *gin.Context) {
	id, ok := number(c, "id")
	if !ok {
		return
	}
	p, err := db.NewPackageStore().GetByID(id)
	if err != nil {
		fail(c, 404, "MATERIAL_NOT_FOUND", "课程包不存在")
		return
	}
	r := h.pack(p)
	r.AlreadyDownloaded, err = db.NewRecordStore().HasDownloadedRecord(c.GetInt64("userID"), id, "package")
	if err != nil {
		fail(c, 503, "STORAGE_FAILED", "资料状态暂不可用")
		return
	}
	c.JSON(200, r)
}
func (h *handler) listItems(c *gin.Context) {
	id, ok := number(c, "id")
	if !ok {
		return
	}
	page, size, ok := paging(c)
	if !ok {
		return
	}
	if _, err := db.NewPackageStore().GetByID(id); err != nil {
		fail(c, 404, "MATERIAL_NOT_FOUND", "课程包不存在")
		return
	}
	var total int64
	if err := db.DB.QueryRowContext(c.Request.Context(), "SELECT COUNT(*) FROM package_items WHERE package_id=?", id).Scan(&total); err != nil {
		fail(c, 503, "STORAGE_FAILED", "目录暂不可用")
		return
	}
	rows, err := db.DB.QueryContext(c.Request.Context(), "SELECT id,file_name,path,file_size FROM package_items WHERE package_id=? ORDER BY path,id LIMIT ? OFFSET ?", id, size, (page-1)*size)
	if err != nil {
		fail(c, 503, "STORAGE_FAILED", "目录暂不可用")
		return
	}
	defer rows.Close()
	items := []item{}
	for rows.Next() {
		var itemID int64
		var name, path string
		var bytes int64
		if rows.Scan(&itemID, &name, &path, &bytes) != nil {
			fail(c, 503, "STORAGE_FAILED", "目录暂不可用")
			return
		}
		items = append(items, item{ID: strconv.FormatInt(itemID, 10), PackageID: strconv.FormatInt(id, 10), Name: name, Path: path, Format: format(name), Size: bytes, Supported: supported(name) && bytes <= fileLimit})
	}
	if rows.Err() != nil {
		fail(c, 503, "STORAGE_FAILED", "目录暂不可用")
		return
	}
	c.JSON(200, gin.H{"items": items, "total": total, "page": page, "pageSize": size, "hasMore": int64(page*size) < total})
}

func (h *handler) quota(c *gin.Context) {
	var q db.DownloadDecision
	err := db.WithDownloadTransaction(c.Request.Context(), func(conn *sql.Conn) error {
		var err error
		q, err = db.DownloadQuotaInTransaction(c.Request.Context(), conn, c.GetInt64("userID"), time.Now())
		return err
	})
	if err != nil {
		fail(c, 503, "STORAGE_FAILED", "下载额度暂不可用")
		return
	}
	c.JSON(200, quotaJSON(q))
}
