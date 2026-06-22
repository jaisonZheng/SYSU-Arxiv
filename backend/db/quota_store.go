package db

import (
	"time"

	"sysu-arxiv/models"
)

type QuotaStore struct{}

func NewQuotaStore() *QuotaStore { return &QuotaStore{} }

// CurrentWeekStart calculates the user's current cycle start: createdAt + n*7 days
func (s *QuotaStore) CurrentWeekStart(createdAt time.Time) time.Time {
	now := time.Now().UTC().Truncate(24 * time.Hour)
	created := createdAt.UTC().Truncate(24 * time.Hour)
	if now.Before(created) {
		return created
	}
	days := int(now.Sub(created).Hours() / 24)
	weeks := days / 7
	return created.Add(time.Duration(weeks) * 7 * 24 * time.Hour)
}

func (s *QuotaStore) GetOrCreateQuota(userID int64, weekStart time.Time) (*models.DownloadQuota, error) {
	q := &models.DownloadQuota{}
	err := DB.QueryRow(
		`SELECT id, user_id, week_start, total_quota, used_quota, created_at, updated_at FROM download_quota WHERE user_id = ? AND week_start = ?`,
		userID, weekStart,
	).Scan(&q.ID, &q.UserID, &q.WeekStart, &q.TotalQuota, &q.UsedQuota, &q.CreatedAt, &q.UpdatedAt)
	if err == nil {
		return q, nil
	}
	// Create new quota
	result, err := DB.Exec(
		`INSERT INTO download_quota (user_id, week_start, total_quota, used_quota) VALUES (?, ?, 3, 0)`,
		userID, weekStart,
	)
	if err != nil {
		return nil, err
	}
	id, _ := result.LastInsertId()
	q.ID = id
	q.UserID = userID
	q.WeekStart = weekStart
	q.TotalQuota = 3
	q.UsedQuota = 0
	return q, nil
}

// IncrementUsed increases used quota and returns the latest quota
func (s *QuotaStore) IncrementUsed(userID int64, weekStart time.Time) (*models.DownloadQuota, error) {
	_, err := DB.Exec(
		`UPDATE download_quota SET used_quota = used_quota + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND week_start = ?`,
		userID, weekStart,
	)
	if err != nil {
		return nil, err
	}
	return s.GetOrCreateQuota(userID, weekStart)
}

// AddBonus increases total quota (e.g., invite, upload reward)
func (s *QuotaStore) AddBonus(userID int64, weekStart time.Time, amount int64) error {
	// Ensure quota row exists
	_, err := s.GetOrCreateQuota(userID, weekStart)
	if err != nil {
		return err
	}
	_, err = DB.Exec(
		`UPDATE download_quota SET total_quota = total_quota + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND week_start = ?`,
		amount, userID, weekStart,
	)
	return err
}

func (s *QuotaStore) GetQuota(userID int64, weekStart time.Time) (*models.DownloadQuota, error) {
	q := &models.DownloadQuota{}
	err := DB.QueryRow(
		`SELECT id, user_id, week_start, total_quota, used_quota, created_at, updated_at FROM download_quota WHERE user_id = ? AND week_start = ?`,
		userID, weekStart,
	).Scan(&q.ID, &q.UserID, &q.WeekStart, &q.TotalQuota, &q.UsedQuota, &q.CreatedAt, &q.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return q, nil
}
