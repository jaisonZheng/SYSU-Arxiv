package db

import (
	"fmt"
	"strings"

	"sysu-arxiv/models"
)

type PackageStore struct{}

func NewPackageStore() *PackageStore {
	return &PackageStore{}
}

func (s *PackageStore) Create(p *models.CoursePackage) (int64, error) {
	result, err := DB.Exec(`
		INSERT INTO course_packages (title, description, course_name, department, source_type, source_name, file_name, file_path, file_size, total_files)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.Title, p.Description, p.CourseName, p.Department, p.SourceType, p.SourceName, p.FileName, p.FilePath, p.FileSize, p.TotalFiles,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (s *PackageStore) GetByID(id int64) (*models.CoursePackage, error) {
	p := &models.CoursePackage{}
	err := DB.QueryRow(`
		SELECT id, title, description, course_name, department, source_type, source_name, file_name, file_path, file_size, total_files, download_count, thanks_count, created_at, updated_at
		FROM course_packages WHERE id = ?`, id,
	).Scan(&p.ID, &p.Title, &p.Description, &p.CourseName, &p.Department, &p.SourceType, &p.SourceName, &p.FileName, &p.FilePath, &p.FileSize, &p.TotalFiles, &p.DownloadCount, &p.ThanksCount, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (s *PackageStore) List(filter *models.CoursePackageFilter) ([]models.CoursePackage, int64, error) {
	where := []string{"1=1"}
	args := []interface{}{}

	if filter.CourseName != "" {
		where = append(where, "course_name = ?")
		args = append(args, filter.CourseName)
	}
	if filter.SourceType != "" {
		where = append(where, "source_type = ?")
		args = append(args, filter.SourceType)
	}
	if filter.Search != "" {
		searchTerm := "%" + filter.Search + "%"
		where = append(where, "(title LIKE ? OR description LIKE ? OR course_name LIKE ?)")
		args = append(args, searchTerm, searchTerm, searchTerm)
	}

	var total int64
	countQuery := "SELECT COUNT(*) FROM course_packages WHERE " + strings.Join(where, " AND ")
	if err := DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	sortBy := "created_at"
	switch filter.SortBy {
	case "title":
		sortBy = "title"
	case "download_count":
		sortBy = "download_count"
	case "course_name":
		sortBy = "course_name"
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
		SELECT id, title, description, course_name, department, source_type, source_name, file_name, file_path, file_size, total_files, download_count, thanks_count, created_at, updated_at
		FROM course_packages
		WHERE %s
		ORDER BY %s %s
		LIMIT ? OFFSET ?`, strings.Join(where, " AND "), sortBy, sortOrder)
	queryArgs := append(append([]interface{}{}, args...), pageSize, offset)

	rows, err := DB.Query(query, queryArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := []models.CoursePackage{}
	for rows.Next() {
		p := models.CoursePackage{}
		err := rows.Scan(&p.ID, &p.Title, &p.Description, &p.CourseName, &p.Department, &p.SourceType, &p.SourceName, &p.FileName, &p.FilePath, &p.FileSize, &p.TotalFiles, &p.DownloadCount, &p.ThanksCount, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, p)
	}

	return items, total, nil
}

func (s *PackageStore) GetItems(packageID int64) ([]models.PackageItem, error) {
	rows, err := DB.Query(`
		SELECT id, package_id, path, file_name, file_size, file_type, mime_type
		FROM package_items WHERE package_id = ? ORDER BY path`, packageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []models.PackageItem{}
	for rows.Next() {
		item := models.PackageItem{}
		err := rows.Scan(&item.ID, &item.PackageID, &item.Path, &item.FileName, &item.FileSize, &item.FileType, &item.MimeType)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *PackageStore) GetTotalDownloads() (int64, error) {
	var total int64
	err := DB.QueryRow("SELECT COALESCE(SUM(download_count), 0) FROM course_packages").Scan(&total)
	if err != nil {
		return 0, err
	}
	return total, nil
}

func (s *PackageStore) GetTotalCount() (int64, error) {
	var total int64
	err := DB.QueryRow("SELECT COUNT(*) FROM course_packages").Scan(&total)
	if err != nil {
		return 0, err
	}
	return total, nil
}

func (s *PackageStore) IncrementDownloadCount(id int64) error {
	_, err := DB.Exec("UPDATE course_packages SET download_count = download_count + 1 WHERE id = ?", id)
	return err
}

func (s *PackageStore) CreateItem(item *models.PackageItem) error {
	_, err := DB.Exec(`
		INSERT INTO package_items (package_id, path, file_name, file_size, file_type, mime_type)
		VALUES (?, ?, ?, ?, ?, ?)`,
		item.PackageID, item.Path, item.FileName, item.FileSize, item.FileType, item.MimeType,
	)
	return err
}

func (s *PackageStore) GetDistinctCourses() ([]string, error) {
	rows, err := DB.Query("SELECT DISTINCT course_name FROM course_packages WHERE course_name IS NOT NULL AND course_name != '' ORDER BY course_name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	values := []string{}
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		values = append(values, v)
	}
	return values, nil
}

func (s *PackageStore) IncrementThanksCount(id int64) error {
	_, err := DB.Exec("UPDATE course_packages SET thanks_count = thanks_count + 1 WHERE id = ?", id)
	return err
}

func (s *PackageStore) GetTotalThanks() (int64, error) {
	var total int64
	err := DB.QueryRow("SELECT COALESCE(SUM(thanks_count), 0) FROM course_packages").Scan(&total)
	if err != nil {
		return 0, err
	}
	return total, nil
}
