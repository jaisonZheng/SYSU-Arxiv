#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Import experience materials from a GitHub repository into the SYSU-Arxiv database.

Each file in the repository becomes a separate material record with:
- category = 'experience'
- sub_category = NULL
- uploader_name = '鸭大公共资料'
"""

import argparse
import os
import shutil
import sqlite3
import sys
import time
from pathlib import Path
from datetime import datetime


def get_mime_type(ext: str) -> str:
    """Infer MIME type from file extension."""
    ext = ext.lower()
    mime_map = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.csv': 'text/csv',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml',
        '.zip': 'application/zip',
        '.rar': 'application/x-rar-compressed',
        '.7z': 'application/x-7z-compressed',
        '.tar': 'application/x-tar',
        '.gz': 'application/gzip',
        '.mp4': 'video/mp4',
        '.mp3': 'audio/mpeg',
        '.html': 'text/html',
        '.htm': 'text/html',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.py': 'text/x-python',
        '.js': 'application/javascript',
        '.css': 'text/css',
    }
    return mime_map.get(ext, 'application/octet-stream')


# Only import from folders that match the "experience/guide" categories.
ALLOWED_FOLDERS = ['转专业', '生活类资料', '新生专属', '资料框架', '选课', '二次遴选']
# Explicitly skip known course-material / exam folders.
BLOCKED_FOLDERS = ['六级', '四级', '马工程', '思政', '公共数学', '杂项', '军理', '军事理论']


def collect_files(repo_dir: Path) -> list[Path]:
    """Collect regular files under allowed repo subfolders."""
    files = []
    for root, dirs, filenames in os.walk(repo_dir):
        # Skip .git directories entirely
        dirs[:] = [d for d in dirs if d != '.git']
        rel_parts = Path(root).relative_to(repo_dir).parts

        # Skip blocked folders anywhere in the path
        if any(banned in part for part in rel_parts for banned in BLOCKED_FOLDERS):
            continue

        # Only keep files inside allowed folders (or subfolders thereof)
        if not any(allowed in part for part in rel_parts for allowed in ALLOWED_FOLDERS):
            continue

        for filename in filenames:
            # Skip hidden files
            if filename.startswith('.'):
                continue
            file_path = Path(root) / filename
            if file_path.is_file():
                files.append(file_path)
    return sorted(files)


def file_exists_in_db(conn: sqlite3.Connection, file_name: str) -> bool:
    """Check if a file with the same file_name already exists in materials table."""
    cursor = conn.execute(
        "SELECT 1 FROM materials WHERE file_name = ? LIMIT 1",
        (file_name,)
    )
    return cursor.fetchone() is not None


def insert_material(conn: sqlite3.Connection, record: dict) -> int:
    """Insert a material record and return the new row id."""
    cursor = conn.execute(
        """
        INSERT INTO materials (
            title, description, category, sub_category, department, major,
            course_name, instructor, year, file_type, uploader_name,
            file_name, file_path, file_size, mime_type, download_count,
            thanks_count, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        """,
        (
            record['title'],
            record.get('description', ''),
            record['category'],
            record.get('sub_category'),
            record.get('department', ''),
            record.get('major', ''),
            record.get('course_name', ''),
            record.get('instructor', ''),
            record.get('year'),
            record['file_type'],
            record['uploader_name'],
            record['file_name'],
            record['file_path'],
            record['file_size'],
            record['mime_type'],
            0,  # download_count
            0,  # thanks_count
            record['created_at'],
            record['updated_at'],
        )
    )
    return cursor.lastrowid


def main():
    parser = argparse.ArgumentParser(
        description='Import experience materials from a GitHub repo into SYSU-Arxiv database.'
    )
    parser.add_argument(
        '--repo-dir',
        default='../SYSU_freshman_materials-main',
        help='Path to the downloaded repository directory (default: ../SYSU_freshman_materials-main)'
    )
    parser.add_argument(
        '--data-dir',
        default='../data',
        help='Path to the data directory containing the database and uploads (default: ../data)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Print what would be imported without writing to database or copying files'
    )
    parser.add_argument(
        '--skip-existing',
        action='store_true',
        help='Skip files whose file_name already exists in the database'
    )
    args = parser.parse_args()

    repo_dir = Path(args.repo_dir).resolve()
    data_dir = Path(args.data_dir).resolve()

    # Validate repo directory
    if not repo_dir.exists():
        print(f"Error: Repository directory does not exist: {repo_dir}", file=sys.stderr)
        sys.exit(1)
    if not repo_dir.is_dir():
        print(f"Error: Not a directory: {repo_dir}", file=sys.stderr)
        sys.exit(1)

    # Set up paths
    db_path = data_dir / 'sysu-arxiv-new.db'
    uploads_dir = data_dir / 'uploads' / 'files'

    # Ensure uploads directory exists (even in dry-run, show intent)
    if not args.dry_run:
        uploads_dir.mkdir(parents=True, exist_ok=True)

    # Collect files
    files = collect_files(repo_dir)
    if not files:
        print(f"No files found in {repo_dir}")
        sys.exit(0)

    print(f"Found {len(files)} file(s) in {repo_dir}")
    if args.dry_run:
        print("=== DRY RUN MODE: No files will be copied or database records written ===\n")

    # Connect to database
    conn = None
    if not args.dry_run:
        if not db_path.exists():
            print(f"Error: Database file not found: {db_path}", file=sys.stderr)
            sys.exit(1)
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row

    now = datetime.now().isoformat()
    success_count = 0
    skip_count = 0
    fail_count = 0

    for file_path in files:
        basename = file_path.name
        title = file_path.stem  # filename without extension
        ext = file_path.suffix  # extension including dot
        file_size = file_path.stat().st_size
        mime_type = get_mime_type(ext)

        # Generate target path with nanosecond timestamp
        ns = time.time_ns()
        target_filename = f"{ns}_{basename}"
        target_path = uploads_dir / target_filename

        # Check for existing file in database
        if not args.dry_run and args.skip_existing and file_exists_in_db(conn, basename):
            print(f"[SKIP] Already exists: {basename}")
            skip_count += 1
            continue

        # In dry-run, just print
        if args.dry_run:
            print(f"[DRY-RUN] Would import: {file_path.relative_to(repo_dir)}")
            print(f"          Title: {title}")
            print(f"          Size: {file_size} bytes")
            print(f"          Target: {target_path}")
            print()
            success_count += 1
            continue

        # Copy file
        try:
            shutil.copy2(file_path, target_path)
        except Exception as e:
            print(f"[FAIL] Copy failed for {basename}: {e}")
            fail_count += 1
            continue

        # Insert into database
        record = {
            'title': title,
            'description': '',
            'category': 'experience',
            'sub_category': None,
            'department': '',
            'major': '',
            'course_name': '',
            'instructor': '',
            'year': None,
            'file_type': ext,
            'uploader_name': '鸭大公共资料',
            'file_name': basename,
            'file_path': str(target_path),
            'file_size': file_size,
            'mime_type': mime_type,
            'created_at': now,
            'updated_at': now,
        }

        try:
            insert_material(conn, record)
            success_count += 1
            print(f"[OK] Imported: {basename}")
        except Exception as e:
            print(f"[FAIL] DB insert failed for {basename}: {e}")
            fail_count += 1
            # Clean up copied file on DB failure
            try:
                target_path.unlink()
            except OSError:
                pass

    if conn:
        conn.commit()
        conn.close()

    print("\n=== Import Summary ===")
    print(f"Total files scanned: {len(files)}")
    print(f"Successfully imported: {success_count}")
    print(f"Skipped (existing): {skip_count}")
    print(f"Failed: {fail_count}")


if __name__ == '__main__':
    main()
