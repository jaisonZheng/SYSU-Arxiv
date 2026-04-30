package models

import (
	"database/sql"
	"time"
)

type Material struct {
	ID            int64          `json:"id"`
	Title         string         `json:"title"`
	Description   string         `json:"description"`
	Category      string         `json:"category"`
	SubCategory   string         `json:"sub_category"`
	Department    string         `json:"department"`
	Major         string         `json:"major"`
	CourseName    string         `json:"course_name"`
	Instructor    string         `json:"instructor"`
	Year          sql.NullInt64  `json:"year"`
	FileType      string         `json:"file_type"`
	UploaderName  string         `json:"uploader_name"`
	FileName      string         `json:"file_name"`
	FilePath      string         `json:"file_path"`
	FileSize      int64          `json:"file_size"`
	MimeType      string         `json:"mime_type"`
	IsZipPackage  bool           `json:"is_zip_package"`
	DownloadCount int64          `json:"download_count"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

type MaterialFilter struct {
	Category    string `json:"category"`
	SubCategory string `json:"sub_category"`
	Department  string `json:"department"`
	Major       string `json:"major"`
	CourseName  string `json:"course_name"`
	Instructor  string `json:"instructor"`
	Year        int    `json:"year"`
	FileType    string `json:"file_type"`
	Search      string `json:"search"`
	SortBy      string `json:"sort_by"`
	SortOrder   string `json:"sort_order"`
	Page        int    `json:"page"`
	PageSize    int    `json:"page_size"`
}

type MaterialListResponse struct {
	Items      []Material `json:"items"`
	Total      int64      `json:"total"`
	Page       int        `json:"page"`
	PageSize   int        `json:"page_size"`
	TotalPages int        `json:"total_pages"`
}

type CreateMaterialRequest struct {
	Title        string `json:"title" form:"title" binding:"required"`
	Description  string `json:"description" form:"description"`
	Category     string `json:"category" form:"category" binding:"required"`
	SubCategory  string `json:"sub_category" form:"sub_category"`
	Department   string `json:"department" form:"department"`
	Major        string `json:"major" form:"major"`
	CourseName   string `json:"course_name" form:"course_name"`
	Instructor   string `json:"instructor" form:"instructor"`
	Year         int    `json:"year" form:"year"`
	FileType     string `json:"file_type" form:"file_type"`
	UploaderName string `json:"uploader_name" form:"uploader_name"`
	IsZipPackage bool   `json:"is_zip_package" form:"is_zip_package"`
}
