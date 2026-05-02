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
