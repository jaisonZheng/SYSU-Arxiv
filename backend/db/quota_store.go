package db

import (
	"time"

	"sysu-arxiv/models"
)

// 期末限定活动：2026-06-28 00:00 ~ 2026-07-05 23:59（北京时间）
// 活动期间，每个同学本周下载额度至少提升到 10 次。
var (
	cst            = time.FixedZone("CST", 8*60*60)
	finalWeekStart = time.Date(2026, 6, 28, 0, 0, 0, 0, cst)
	finalWeekEnd   = time.Date(2026, 7, 6, 0, 0, 0, 0, cst) // 开区间
	finalWeekMin   = int64(10)
)

type QuotaStore struct{}

func NewQuotaStore() *QuotaStore { return &QuotaStore{} }

// isFinalWeekActive 判断当前时间是否在期末限定活动期间。
func (s *QuotaStore) isFinalWeekActive() bool {
	now := time.Now().In(cst)
	return !now.Before(finalWeekStart) && now.Before(finalWeekEnd)
}

// boostQuotaIfNeeded 在活动期间将额度补齐到至少 10 次。
func (s *QuotaStore) boostQuotaIfNeeded(q *models.DownloadQuota) error {
	if !s.isFinalWeekActive() {
		return nil
	}
	if q.TotalQuota >= finalWeekMin {
		return nil
	}
	_, err := DB.Exec(
		`UPDATE download_quota SET total_quota = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		finalWeekMin, q.ID,
	)
	if err != nil {
		return err
	}
	q.TotalQuota = finalWeekMin
	return nil
}

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
		_ = s.boostQuotaIfNeeded(q)
		return q, nil
	}
	// Create new quota
	totalQuota := int64(3)
	if s.isFinalWeekActive() {
		totalQuota = finalWeekMin
	}
	result, err := DB.Exec(
		`INSERT INTO download_quota (user_id, week_start, total_quota, used_quota) VALUES (?, ?, ?, 0)`,
		userID, weekStart, totalQuota,
	)
	if err != nil {
		return nil, err
	}
	id, _ := result.LastInsertId()
	q.ID = id
	q.UserID = userID
	q.WeekStart = weekStart
	q.TotalQuota = totalQuota
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
