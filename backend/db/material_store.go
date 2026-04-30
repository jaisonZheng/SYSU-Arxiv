package db

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"sysu-arxiv/models"
)

type MaterialStore struct{}

func NewMaterialStore() *MaterialStore {
	return &MaterialStore{}
}

func (s *MaterialStore) Create(m *models.Material) (int64, error) {
	result, err := DB.Exec(`
		INSERT INTO materials (title, description, category, sub_category, department, major, course_name, instructor, year, file_type, uploader_name, file_name, file_path, file_size, mime_type, is_zip_package)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		m.Title, m.Description, m.Category, m.SubCategory, m.Department, m.Major, m.CourseName, m.Instructor, m.Year, m.FileType, m.UploaderName, m.FileName, m.FilePath, m.FileSize, m.MimeType, m.IsZipPackage,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (s *MaterialStore) GetByID(id int64) (*models.Material, error) {
	m := &models.Material{}
	err := DB.QueryRow(`
		SELECT id, title, description, category, sub_category, department, major, course_name, instructor, year, file_type, uploader_name, file_name, file_path, file_size, mime_type, is_zip_package, download_count, created_at, updated_at
		FROM materials WHERE id = ?`, id,
	).Scan(&m.ID, &m.Title, &m.Description, &m.Category, &m.SubCategory, &m.Department, &m.Major, &m.CourseName, &m.Instructor, &m.Year, &m.FileType, &m.UploaderName, &m.FileName, &m.FilePath, &m.FileSize, &m.MimeType, &m.IsZipPackage, &m.DownloadCount, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (s *MaterialStore) List(filter *models.MaterialFilter) ([]models.Material, int64, error) {
	where := []string{"1=1"}
	args := []interface{}{}

	if filter.Category != "" {
		where = append(where, "category = ?")
		args = append(args, filter.Category)
	}
	if filter.SubCategory != "" {
		where = append(where, "sub_category = ?")
		args = append(args, filter.SubCategory)
	}
	if filter.Department != "" {
		where = append(where, "department = ?")
		args = append(args, filter.Department)
	}
	if filter.Major != "" {
		where = append(where, "major = ?")
		args = append(args, filter.Major)
	}
	if filter.CourseName != "" {
		where = append(where, "course_name = ?")
		args = append(args, filter.CourseName)
	}
	if filter.Instructor != "" {
		where = append(where, "instructor = ?")
		args = append(args, filter.Instructor)
	}
	if filter.Year > 0 {
		where = append(where, "year = ?")
		args = append(args, filter.Year)
	}
	if filter.FileType != "" {
		where = append(where, "file_type = ?")
		args = append(args, filter.FileType)
	}

	if filter.Search != "" {
		searchTerm := "%" + filter.Search + "%"
		where = append(where, "(title LIKE ? OR description LIKE ? OR course_name LIKE ? OR instructor LIKE ?)")
		args = append(args, searchTerm, searchTerm, searchTerm, searchTerm)
	}

	var total int64
	countQuery := "SELECT COUNT(*) FROM materials WHERE " + strings.Join(where, " AND ")
	if err := DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	sortBy := "created_at"
	switch filter.SortBy {
	case "title":
		sortBy = "title"
	case "download_count":
		sortBy = "download_count"
	case "year":
		sortBy = "year"
	}
	sortOrder := "DESC"
	if filter.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	query := fmt.Sprintf(`
		SELECT id, title, description, category, sub_category, department, major, course_name, instructor, year, file_type, uploader_name, file_name, file_path, file_size, mime_type, is_zip_package, download_count, created_at, updated_at
		FROM materials
		WHERE %s
		ORDER BY %s %s
		LIMIT ? OFFSET ?`, strings.Join(where, " AND "), sortBy, sortOrder)
	queryArgs := append(append([]interface{}{}, args...), pageSize, offset)

	rows, err := DB.Query(query, queryArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := []models.Material{}
	for rows.Next() {
		m := models.Material{}
		err := rows.Scan(&m.ID, &m.Title, &m.Description, &m.Category, &m.SubCategory, &m.Department, &m.Major, &m.CourseName, &m.Instructor, &m.Year, &m.FileType, &m.UploaderName, &m.FileName, &m.FilePath, &m.FileSize, &m.MimeType, &m.IsZipPackage, &m.DownloadCount, &m.CreatedAt, &m.UpdatedAt)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, m)
	}

	return items, total, nil
}

func (s *MaterialStore) IncrementDownloadCount(id int64) error {
	_, err := DB.Exec("UPDATE materials SET download_count = download_count + 1 WHERE id = ?", id)
	return err
}

func (s *MaterialStore) CheckDuplicate(filename string) (bool, error) {
	var count int64
	err := DB.QueryRow("SELECT COUNT(*) FROM materials WHERE file_name = ?", filename).Scan(&count)
	return count > 0, err
}

func (s *MaterialStore) GetDistinctValues(column string) ([]string, error) {
	validColumns := map[string]bool{
		"department": true, "major": true, "course_name": true, "instructor": true, "file_type": true, "sub_category": true,
	}
	if !validColumns[column] {
		return nil, fmt.Errorf("invalid column: %s", column)
	}
	query := fmt.Sprintf("SELECT DISTINCT %s FROM materials WHERE %s IS NOT NULL AND %s != '' ORDER BY %s", column, column, column, column)
	rows, err := DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	values := []string{}
	for rows.Next() {
		var v sql.NullString
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		if v.Valid {
			values = append(values, v.String)
		}
	}
	return values, nil
}

func (s *MaterialStore) GetRelatedMaterials(id int64, courseName string, limit int) ([]models.Material, error) {
	rows, err := DB.Query(`
		SELECT id, title, description, category, sub_category, department, major, course_name, instructor, year, file_type, uploader_name, file_name, file_path, file_size, mime_type, is_zip_package, download_count, created_at, updated_at
		FROM materials
		WHERE id != ? AND course_name = ?
		ORDER BY download_count DESC
		LIMIT ?`, id, courseName, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []models.Material{}
	for rows.Next() {
		m := models.Material{}
		err := rows.Scan(&m.ID, &m.Title, &m.Description, &m.Category, &m.SubCategory, &m.Department, &m.Major, &m.CourseName, &m.Instructor, &m.Year, &m.FileType, &m.UploaderName, &m.FileName, &m.FilePath, &m.FileSize, &m.MimeType, &m.IsZipPackage, &m.DownloadCount, &m.CreatedAt, &m.UpdatedAt)
		if err != nil {
			return nil, err
		}
		items = append(items, m)
	}
	return items, nil
}

func (s *MaterialStore) Seed(materials []models.Material) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO materials (title, description, category, sub_category, department, major, course_name, instructor, year, file_type, uploader_name, file_name, file_path, file_size, mime_type, is_zip_package, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, m := range materials {
		if m.CreatedAt.IsZero() {
			m.CreatedAt = time.Now()
		}
		if m.UpdatedAt.IsZero() {
			m.UpdatedAt = time.Now()
		}
		_, err := stmt.Exec(m.Title, m.Description, m.Category, m.SubCategory, m.Department, m.Major, m.CourseName, m.Instructor, m.Year, m.FileType, m.UploaderName, m.FileName, m.FilePath, m.FileSize, m.MimeType, m.IsZipPackage, m.CreatedAt, m.UpdatedAt)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
