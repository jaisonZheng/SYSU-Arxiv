package db

import (
	"database/sql"
	"fmt"

	"sysu-arxiv/models"
)

type RecordStore struct{}

func NewRecordStore() *RecordStore { return &RecordStore{} }

func (s *RecordStore) CreateDownloadRecord(userID, resourceID int64, resourceType string) error {
	_, err := DB.Exec(
		`INSERT INTO download_records (user_id, resource_id, resource_type) VALUES (?, ?, ?)`,
		userID, resourceID, resourceType,
	)
	return err
}

func (s *RecordStore) ListDownloadsByUser(userID int64) ([]models.DownloadRecord, error) {
	rows, err := DB.Query(
		`SELECT id, user_id, resource_id, resource_type, created_at FROM download_records WHERE user_id = ? ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := []models.DownloadRecord{}
	for rows.Next() {
		r := models.DownloadRecord{}
		if err := rows.Scan(&r.ID, &r.UserID, &r.ResourceID, &r.ResourceType, &r.CreatedAt); err != nil {
			return nil, err
		}
		records = append(records, r)
	}
	return records, nil
}

func (s *RecordStore) ListDownloadsByUserWithResource(userID int64) ([]models.DownloadRecordWithResource, error) {
	rows, err := DB.Query(`
		SELECT dr.id, dr.user_id, dr.resource_id, dr.resource_type, dr.created_at,
			COALESCE(m.title, cp.title) as resource_title
		FROM download_records dr
		LEFT JOIN materials m ON dr.resource_id = m.id AND dr.resource_type = 'material'
		LEFT JOIN course_packages cp ON dr.resource_id = cp.id AND dr.resource_type = 'package'
		WHERE dr.user_id = ?
		ORDER BY dr.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := []models.DownloadRecordWithResource{}
	for rows.Next() {
		r := models.DownloadRecordWithResource{}
		var title sql.NullString
		if err := rows.Scan(&r.ID, &r.UserID, &r.ResourceID, &r.ResourceType, &r.CreatedAt, &title); err != nil {
			return nil, err
		}
		if title.Valid {
			r.ResourceTitle = title.String
		}
		records = append(records, r)
	}
	return records, nil
}

func (s *RecordStore) CreateUploadRecord(userID, resourceID int64, resourceType string) error {
	_, err := DB.Exec(
		`INSERT INTO upload_records (user_id, resource_id, resource_type) VALUES (?, ?, ?)`,
		userID, resourceID, resourceType,
	)
	return err
}

func (s *RecordStore) ListUploadsByUser(userID int64) ([]models.UploadRecord, error) {
	rows, err := DB.Query(
		`SELECT id, user_id, resource_id, resource_type, created_at FROM upload_records WHERE user_id = ? ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := []models.UploadRecord{}
	for rows.Next() {
		r := models.UploadRecord{}
		if err := rows.Scan(&r.ID, &r.UserID, &r.ResourceID, &r.ResourceType, &r.CreatedAt); err != nil {
			return nil, err
		}
		records = append(records, r)
	}
	return records, nil
}

func (s *RecordStore) ListUploadsByUserWithResource(userID int64) ([]models.UploadRecordWithResource, error) {
	rows, err := DB.Query(`
		SELECT ur.id, ur.user_id, ur.resource_id, ur.resource_type, ur.created_at,
			COALESCE(m.title, cp.title) as resource_title
		FROM upload_records ur
		LEFT JOIN materials m ON ur.resource_id = m.id AND ur.resource_type = 'material'
		LEFT JOIN course_packages cp ON ur.resource_id = cp.id AND ur.resource_type = 'package'
		WHERE ur.user_id = ?
		ORDER BY ur.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := []models.UploadRecordWithResource{}
	for rows.Next() {
		r := models.UploadRecordWithResource{}
		var title sql.NullString
		if err := rows.Scan(&r.ID, &r.UserID, &r.ResourceID, &r.ResourceType, &r.CreatedAt, &title); err != nil {
			return nil, err
		}
		if title.Valid {
			r.ResourceTitle = title.String
		}
		records = append(records, r)
	}
	return records, nil
}

type DailyTrend struct {
	Date          string `json:"date"`
	Registrations int64  `json:"registrations"`
	Downloads     int64  `json:"downloads"`
	Uploads       int64  `json:"uploads"`
}

func (s *RecordStore) GetDailyTrends(days int) ([]DailyTrend, error) {
	rows, err := DB.Query(`
		WITH RECURSIVE dates(date) AS (
			SELECT date('now', ?)
			UNION ALL
			SELECT date(date, '+1 day')
			FROM dates
			WHERE date < date('now')
		)
		SELECT
			d.date,
			COALESCE((SELECT COUNT(*) FROM users WHERE date(created_at) = d.date), 0) as registrations,
			COALESCE((SELECT COUNT(*) FROM download_records WHERE date(created_at) = d.date), 0) as downloads,
			COALESCE((SELECT COUNT(*) FROM upload_records WHERE date(created_at) = d.date), 0) as uploads
		FROM dates d
		ORDER BY d.date`, fmt.Sprintf("-%d days", days))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []DailyTrend{}
	for rows.Next() {
		var t DailyTrend
		if err := rows.Scan(&t.Date, &t.Registrations, &t.Downloads, &t.Uploads); err != nil {
			return nil, err
		}
		result = append(result, t)
	}
	return result, nil
}
