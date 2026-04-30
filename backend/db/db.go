package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB(dbPath string) (*sql.DB, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory: %w", err)
	}

	db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
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
			is_zip_package INTEGER DEFAULT 0,
			download_count INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_department ON materials(department)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_course ON materials(course_name)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_year ON materials(year)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_sub_category ON materials(sub_category)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_materials_search ON materials(title, description, course_name, instructor)`,
	}

	for i, m := range migrations {
		if _, err := db.Exec(m); err != nil {
			return fmt.Errorf("migration %d failed: %w", i, err)
		}
	}
	return nil
}
