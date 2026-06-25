package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func InitDB(dbPath string) (*sql.DB, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("failed to open db: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping db: %w", err)
	}

	if err := runMigrations(db); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	DB = db
	log.Println("Database initialized successfully")
	return db, nil
}

func runMigrations(db *sql.DB) error {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS materials (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			description TEXT,
			category TEXT NOT NULL,
			sub_category TEXT,
			department TEXT,
			major TEXT,
			course_name TEXT,
			instructor TEXT,
			year INTEGER,
			file_type TEXT,
			uploader_name TEXT,
			file_name TEXT NOT NULL,
			file_path TEXT NOT NULL,
			file_size INTEGER,
			mime_type TEXT,
			download_count INTEGER DEFAULT 0,
			thanks_count INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS course_packages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			description TEXT,
			course_name TEXT NOT NULL,
			department TEXT,
			source_type TEXT NOT NULL,
			source_name TEXT,
			file_name TEXT NOT NULL,
			file_path TEXT NOT NULL,
			file_size INTEGER,
			total_files INTEGER,
			download_count INTEGER DEFAULT 0,
			thanks_count INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS package_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			package_id INTEGER NOT NULL,
			path TEXT NOT NULL,
			file_name TEXT NOT NULL,
			file_size INTEGER,
			file_type TEXT,
			mime_type TEXT,
			FOREIGN KEY (package_id) REFERENCES course_packages(id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_department ON materials(department)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_course ON materials(course_name)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_year ON materials(year)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_sub_category ON materials(sub_category)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_search ON materials(title, description, course_name, instructor)`,
		`CREATE INDEX IF NOT EXISTS idx_packages_course ON course_packages(course_name)`,
		`CREATE INDEX IF NOT EXISTS idx_packages_source ON course_packages(source_type)`,
		`CREATE INDEX IF NOT EXISTS idx_package_items_package ON package_items(package_id)`,
		// Phase 3+4: user auth, quota, invite tables
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			nickname TEXT,
			password_hash TEXT,
			invite_code TEXT UNIQUE,
			avatar_url TEXT,
			invited_by INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS download_quota (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			week_start DATETIME NOT NULL,
			total_quota INTEGER DEFAULT 3,
			used_quota INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, week_start)
		)`,
		`CREATE TABLE IF NOT EXISTS download_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			resource_id INTEGER NOT NULL,
			resource_type TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS upload_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			resource_id INTEGER NOT NULL,
			resource_type TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS email_verifications (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL,
			code TEXT NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
		`CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code)`,
		`CREATE INDEX IF NOT EXISTS idx_quota_user_week ON download_quota(user_id, week_start)`,
		`CREATE INDEX IF NOT EXISTS idx_download_records_user ON download_records(user_id, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_upload_records_user ON upload_records(user_id, created_at)`,
		// Admin monitor: search logs
		`CREATE TABLE IF NOT EXISTS search_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			query TEXT NOT NULL,
			result_count INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query)`,
		`CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_search_logs_result_count ON search_logs(result_count)`,
	}

	for i, m := range migrations {
		if _, err := db.Exec(m); err != nil {
			return fmt.Errorf("migration %d failed: %w", i, err)
		}
	}

	// Add thanks_count columns safely (SQLite older than 3.35 doesn't support IF NOT EXISTS in ALTER TABLE)
	if err := addColumnIfNotExists(db, "materials", "thanks_count", "INTEGER DEFAULT 0"); err != nil {
		return fmt.Errorf("failed to add thanks_count to materials: %w", err)
	}
	if err := addColumnIfNotExists(db, "course_packages", "thanks_count", "INTEGER DEFAULT 0"); err != nil {
		return fmt.Errorf("failed to add thanks_count to course_packages: %w", err)
	}
	if err := addColumnIfNotExists(db, "course_packages", "uploader_name", "TEXT"); err != nil {
		return fmt.Errorf("failed to add uploader_name to course_packages: %w", err)
	}
	if err := addColumnIfNotExists(db, "materials", "uploader_id", "INTEGER"); err != nil {
		return fmt.Errorf("failed to add uploader_id to materials: %w", err)
	}
	if err := addColumnIfNotExists(db, "course_packages", "uploader_id", "INTEGER"); err != nil {
		return fmt.Errorf("failed to add uploader_id to course_packages: %w", err)
	}

	// site_stats for persistent global counters
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS site_stats (
		key TEXT PRIMARY KEY,
		value INTEGER DEFAULT 0
	)`); err != nil {
		return fmt.Errorf("failed to create site_stats: %w", err)
	}

	return nil
}

func addColumnIfNotExists(db *sql.DB, table, column, def string) error {
	var count int
	err := db.QueryRow(
		"SELECT COUNT(*) FROM pragma_table_info(?) WHERE name = ?",
		table, column,
	).Scan(&count)
	if err != nil {
		return err
	}
	if count == 0 {
		_, err = db.Exec(fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, def))
		if err != nil {
			return err
		}
	}
	return nil
}

func GetSiteStat(key string) int64 {
	var val int64
	DB.QueryRow("SELECT value FROM site_stats WHERE key = ?", key).Scan(&val)
	return val
}

func IncrementSiteStat(key string) error {
	_, err := DB.Exec(`INSERT INTO site_stats (key, value) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET value = value + 1`, key)
	return err
}

func SetSiteStat(key string, value int64) error {
	_, err := DB.Exec(`INSERT INTO site_stats (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`, key, value, value)
	return err
}
