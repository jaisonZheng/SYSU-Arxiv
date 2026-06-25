package db

import (
	"database/sql"
	"fmt"
	"time"
)

type SearchLogStore struct{}

func NewSearchLogStore() *SearchLogStore {
	return &SearchLogStore{}
}

func (s *SearchLogStore) Log(query string, resultCount int) error {
	_, err := DB.Exec(
		`INSERT INTO search_logs (query, result_count) VALUES (?, ?)`,
		query, resultCount,
	)
	return err
}

func (s *SearchLogStore) TopSearches(limit int, since time.Time) ([]struct {
	Query string `json:"query"`
	Count int64  `json:"count"`
}, error) {
	rows, err := DB.Query(`
		SELECT query, COUNT(*) as count
		FROM search_logs
		WHERE created_at >= ?
		GROUP BY query
		ORDER BY count DESC, query ASC
		LIMIT ?`, since, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []struct {
		Query string `json:"query"`
		Count int64  `json:"count"`
	}{}
	for rows.Next() {
		var query string
		var count int64
		if err := rows.Scan(&query, &count); err != nil {
			return nil, err
		}
		items = append(items, struct {
			Query string `json:"query"`
			Count int64  `json:"count"`
		}{Query: query, Count: count})
	}
	return items, nil
}

func (s *SearchLogStore) TopEmptySearches(limit int, since time.Time) ([]struct {
	Query string `json:"query"`
	Count int64  `json:"count"`
}, error) {
	rows, err := DB.Query(`
		SELECT query, COUNT(*) as count
		FROM search_logs
		WHERE result_count = 0 AND created_at >= ?
		GROUP BY query
		ORDER BY count DESC, query ASC
		LIMIT ?`, since, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []struct {
		Query string `json:"query"`
		Count int64  `json:"count"`
	}{}
	for rows.Next() {
		var query string
		var count int64
		if err := rows.Scan(&query, &count); err != nil {
			return nil, err
		}
		items = append(items, struct {
			Query string `json:"query"`
			Count int64  `json:"count"`
		}{Query: query, Count: count})
	}
	return items, nil
}

// SearchCount returns total searches in a date range (for overview/trends)
func (s *SearchLogStore) SearchCount(since time.Time) (int64, error) {
	var count int64
	err := DB.QueryRow(
		"SELECT COUNT(*) FROM search_logs WHERE created_at >= ?",
		since,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// CountByDate returns searches grouped by date for trend charts
func (s *SearchLogStore) CountByDate(days int) (map[string]int64, error) {
	rows, err := DB.Query(`
		SELECT date(created_at) as day, COUNT(*) as count
		FROM search_logs
		WHERE created_at >= date('now', ?)
		GROUP BY day
		ORDER BY day`, fmt.Sprintf("-%d days", days))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]int64)
	for rows.Next() {
		var day string
		var count int64
		if err := rows.Scan(&day, &count); err != nil {
			return nil, err
		}
		result[day] = count
	}
	return result, nil
}

// helper for nullable scan if needed elsewhere
func nullString(s sql.NullString) string {
	if s.Valid {
		return s.String
	}
	return ""
}
