package db

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var ErrDownloadQuota = errors.New("quota_exceeded")
var ErrDailyDownloadLimit = errors.New("daily_repeat_limit_exceeded")

type DownloadDecision struct {
	First                       bool
	CycleStart                  time.Time
	CycleEnd                    time.Time
	Total, Used, DailyRemaining int64
}

// WithDownloadTransaction serializes all old and integration download admissions.
// Every query in the callback must use this same connection.
func WithDownloadTransaction(ctx context.Context, action func(*sql.Conn) error) error {
	conn, err := DB.Conn(ctx)
	if err != nil {
		return err
	}
	defer conn.Close()
	if _, err = conn.ExecContext(ctx, "PRAGMA busy_timeout=5000"); err != nil {
		return err
	}
	if _, err = conn.ExecContext(ctx, "BEGIN IMMEDIATE"); err != nil {
		return err
	}
	defer conn.ExecContext(context.Background(), "ROLLBACK")
	if err = action(conn); err != nil {
		return err
	}
	_, err = conn.ExecContext(ctx, "COMMIT")
	return err
}

func DownloadCycle(createdAt, now time.Time) time.Time {
	created := createdAt.UTC().Truncate(24 * time.Hour)
	today := now.UTC().Truncate(24 * time.Hour)
	if today.Before(created) {
		return created
	}
	weeks := int64(today.Sub(created) / (7 * 24 * time.Hour))
	return created.Add(time.Duration(weeks) * 7 * 24 * time.Hour)
}

func DownloadQuotaInTransaction(ctx context.Context, conn *sql.Conn, userID int64, now time.Time) (DownloadDecision, error) {
	var result DownloadDecision
	var created time.Time
	if err := conn.QueryRowContext(ctx, "SELECT created_at FROM users WHERE id=?", userID).Scan(&created); err != nil {
		return result, err
	}
	result.CycleStart = DownloadCycle(created, now)
	result.CycleEnd = result.CycleStart.Add(7 * 24 * time.Hour)
	total := int64(3)
	active := !now.In(cst).Before(finalWeekStart) && now.In(cst).Before(finalWeekEnd)
	if active {
		total = finalWeekMin
	}
	if _, err := conn.ExecContext(ctx, "INSERT INTO download_quota(user_id,week_start,total_quota,used_quota) VALUES(?,?,?,0) ON CONFLICT(user_id,week_start) DO NOTHING", userID, result.CycleStart, total); err != nil {
		return result, err
	}
	if active {
		if _, err := conn.ExecContext(ctx, "UPDATE download_quota SET total_quota=MAX(total_quota,?) WHERE user_id=? AND week_start=?", finalWeekMin, userID, result.CycleStart); err != nil {
			return result, err
		}
	}
	err := conn.QueryRowContext(ctx, "SELECT total_quota,used_quota FROM download_quota WHERE user_id=? AND week_start=?", userID, result.CycleStart).Scan(&result.Total, &result.Used)
	return result, err
}

// AdmitDownload preserves the deployed policy: only the first historical download
// consumes quota; all admissions (including that first one) enter the daily count.
func AdmitDownload(ctx context.Context, conn *sql.Conn, userID, resourceID int64, kind string, now time.Time) (DownloadDecision, error) {
	var result DownloadDecision
	if kind != "material" && kind != "package" {
		return result, errors.New("invalid download kind")
	}
	result, err := DownloadQuotaInTransaction(ctx, conn, userID, now)
	if err != nil {
		return result, err
	}
	var exists bool
	if err = conn.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM download_records WHERE user_id=? AND resource_id=? AND resource_type=?)", userID, resourceID, kind).Scan(&exists); err != nil {
		return result, err
	}
	var daily int64
	if err = conn.QueryRowContext(ctx, `SELECT COUNT(*) FROM download_repeat_records WHERE user_id=? AND resource_id=? AND resource_type=? AND date(created_at,'+8 hours')=date(?,'+8 hours')`, userID, resourceID, kind, now.UTC().Format("2006-01-02 15:04:05")).Scan(&daily); err != nil {
		return result, err
	}
	if exists && daily >= 10 {
		return result, ErrDailyDownloadLimit
	}
	result.First = !exists
	if !exists {
		changed, err := conn.ExecContext(ctx, "UPDATE download_quota SET used_quota=used_quota+1,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND week_start=? AND used_quota<total_quota", userID, result.CycleStart)
		if err != nil {
			return result, err
		}
		n, err := changed.RowsAffected()
		if err != nil {
			return result, err
		}
		if n != 1 {
			return result, ErrDownloadQuota
		}
		result.Used++
		if _, err = conn.ExecContext(ctx, "INSERT INTO download_records(user_id,resource_id,resource_type) VALUES(?,?,?)", userID, resourceID, kind); err != nil {
			return result, err
		}
		table := "materials"
		if kind == "package" {
			table = "course_packages"
		}
		if _, err = conn.ExecContext(ctx, "UPDATE "+table+" SET download_count=download_count+1 WHERE id=?", resourceID); err != nil {
			return result, err
		}
		if _, err = conn.ExecContext(ctx, "INSERT INTO site_stats(key,value) VALUES('total_downloads',1) ON CONFLICT(key) DO UPDATE SET value=value+1"); err != nil {
			return result, err
		}
	}
	if _, err = conn.ExecContext(ctx, "INSERT INTO download_repeat_records(user_id,resource_id,resource_type) VALUES(?,?,?)", userID, resourceID, kind); err != nil {
		return result, err
	}
	result.DailyRemaining = 10 - daily - 1
	if result.DailyRemaining < 0 {
		result.DailyRemaining = 0
	}
	return result, nil
}

func ConsumeDownload(ctx context.Context, userID, resourceID int64, kind string) (DownloadDecision, error) {
	var result DownloadDecision
	err := WithDownloadTransaction(ctx, func(conn *sql.Conn) error {
		var err error
		result, err = AdmitDownload(ctx, conn, userID, resourceID, kind, time.Now())
		return err
	})
	return result, err
}
