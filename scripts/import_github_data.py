#!/usr/bin/env python3
"""
Import SYSU_Notebook GitHub repo data into the SQLite database.
Processes each course folder, creates individual file records and ZIP packages.
"""

import json
import os
import sys
import zipfile
import sqlite3
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "sysu-arxiv.db"
UPLOADS_DIR = DATA_DIR / "uploads"
SOURCE_DIR = DATA_DIR / "source" / "github" / "SYSU_Notebook"

CATEGORY_MAP = {
    "真题": "past_exam",
    "past_exam": "past_exam",
    "考试": "past_exam",
    "exam": "past_exam",
    "复习": "study_material",
    "study": "study_material",
    "笔记": "study_material",
    "note": "study_material",
    "课件": "study_material",
    "lecture": "study_material",
    "ppt": "study_material",
    "pptx": "study_material",
    "pdf": "study_material",
    "slide": "study_material",
    "总结": "study_material",
    "summary": "study_material",
    "模拟": "study_material",
    "mock": "study_material",
}

SUB_CATEGORY_MAP = {
    "课件": "lecture",
    "lecture": "lecture",
    "slide": "lecture",
    "ppt": "lecture",
    "pptx": "lecture",
    "笔记": "notes",
    "note": "notes",
    "notes": "notes",
    "模拟": "mock_exam",
    "mock": "mock_exam",
    "模拟题": "mock_exam",
    "总结": "summary",
    "summary": "summary",
}

def infer_category(filename):
    fn_lower = filename.lower()
    for keyword, cat in CATEGORY_MAP.items():
        if keyword in fn_lower:
            return cat
    return "study_material"

def infer_sub_category(filename):
    fn_lower = filename.lower()
    for keyword, sub in SUB_CATEGORY_MAP.items():
        if keyword in fn_lower:
            return sub
    ext = Path(filename).suffix.lower()
    if ext in [".ppt", ".pptx"]:
        return "lecture"
    if ext in [".pdf", ".doc", ".docx"] and ("真题" in filename or "exam" in filename or "试卷" in filename):
        return "notes"
    return "other"

def infer_year(filename):
    import re
    matches = re.findall(r'20\d{2}', filename)
    if matches:
        return int(matches[0])
    return None

def infer_department(course_name):
    cs_courses = ["操作系统", "计算机网络", "数据库", "编译原理", "算法", "数据结构", "人工智能", "机器学习", "计算机", "分布式", "密码学", "图论", "自然语言处理", "计算机体系结构", "模式识别", "计算复杂性", "计算机程序理论"]
    math_courses = ["数学分析", "复变函数", "矩阵分析", "最优化", "概率论", "随机过程", "数值计算", "数理逻辑"]

    for c in cs_courses:
        if c in course_name:
            return "School of Computer Science"
    for c in math_courses:
        if c in course_name:
            return "School of Mathematics"
    return "Unknown"

def create_zip_package(source_dir, output_path):
    """Create a ZIP archive of a course folder."""
    if output_path.exists():
        return str(output_path)

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = str(file_path.relative_to(source_dir))
                zf.write(file_path, arcname)
    return str(output_path)

def import_course_files(course_name, course_dir, cursor):
    """Import all files from a course folder into the database."""
    records = []
    package_created = False
    package_path = None

    # Collect all files
    all_files = []
    for root, dirs, files in os.walk(course_dir):
        for file in files:
            file_path = Path(root) / file
            all_files.append(file_path)

    if not all_files:
        return 0

    # Create ZIP package for the course
    course_slug = "".join(c if c.isalnum() else "_" for c in course_name)
    zip_name = f"{course_slug}_package.zip"
    zip_path = UPLOADS_DIR / "packages" / zip_name
    zip_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        package_path = create_zip_package(course_dir, zip_path)
        package_size = zip_path.stat().st_size

        # Insert package record
        cursor.execute("""
            INSERT INTO materials (title, description, category, sub_category, department, course_name,
                file_name, file_path, file_size, mime_type, is_zip_package, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"{course_name} - Complete Package",
            f"Complete study material package for {course_name}",
            "study_material",
            "other",
            infer_department(course_name),
            course_name,
            zip_name,
            str(zip_path),
            package_size,
            "application/zip",
            1,
            datetime.now(),
            datetime.now(),
        ))
    except Exception as e:
        print(f"  Warning: Failed to create package for {course_name}: {e}")

    # Insert individual files
    for file_path in all_files:
        filename = file_path.name
        category = infer_category(filename)
        sub_category = infer_sub_category(filename)
        year = infer_year(filename)
        dept = infer_department(course_name)
        file_size = file_path.stat().st_size

        # Copy file to uploads directory
        target_dir = UPLOADS_DIR / "files"
        target_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = f"{timestamp}_{filename}"
        target_path = target_dir / safe_name

        try:
            import shutil
            shutil.copy2(file_path, target_path)
        except Exception as e:
            print(f"  Warning: Failed to copy {filename}: {e}")
            continue

        cursor.execute("""
            INSERT INTO materials (title, description, category, sub_category, department, course_name,
                year, file_type, file_name, file_path, file_size, mime_type, is_zip_package, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            filename,
            f"{course_name} - {filename}",
            category,
            sub_category,
            dept,
            course_name,
            year,
            file_path.suffix.lower() or "unknown",
            filename,
            str(target_path),
            file_size,
            "application/octet-stream",
            0,
            datetime.now(),
            datetime.now(),
        ))
        records.append(filename)

    return len(records)

def main():
    if not SOURCE_DIR.exists():
        print(f"Error: Source directory not found: {SOURCE_DIR}")
        print("Please clone the repo first: git clone https://github.com/ysyisyourbrother/SYSU_Notebook.git")
        sys.exit(1)

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    course_dir = SOURCE_DIR / "课程资料"
    if not course_dir.exists():
        # Try to find the course folder with different encoding
        for item in SOURCE_DIR.iterdir():
            if item.is_dir() and "课程" in item.name:
                course_dir = item
                break

    if not course_dir.exists():
        print(f"Error: Course directory not found in {SOURCE_DIR}")
        print("Available directories:")
        for item in SOURCE_DIR.iterdir():
            print(f"  - {item.name}")
        sys.exit(1)

    total_files = 0
    total_courses = 0

    for course_folder in sorted(course_dir.iterdir()):
        if not course_folder.is_dir():
            continue

        course_name = course_folder.name
        print(f"Processing: {course_name}")

        count = import_course_files(course_name, course_folder, cursor)
        total_files += count
        total_courses += 1

        print(f"  -> {count} files imported")

    conn.commit()
    conn.close()

    print(f"\nDone! Imported {total_files} files from {total_courses} courses.")

if __name__ == "__main__":
    main()
