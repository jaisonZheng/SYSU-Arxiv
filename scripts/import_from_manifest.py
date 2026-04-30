#!/usr/bin/env python3
"""
Import SYSU_Notebook data from manifest.json into the SQLite database.
This creates database records based on the manifest without needing actual files.
For deployment, files will be cloned and processed on the server.
"""

import json
import os
import sys
import sqlite3
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "sysu-arxiv.db"

CATEGORY_MAP = {
    "真题": "past_exam", "past_exam": "past_exam", "考试": "past_exam",
    "exam": "past_exam", "试卷": "past_exam", "复习": "study_material",
    "study": "study_material", "笔记": "study_material", "note": "study_material",
    "课件": "study_material", "lecture": "study_material", "slide": "study_material",
    "总结": "study_material", "summary": "study_material", "模拟": "study_material",
    "mock": "study_material", "资料": "study_material",
}

SUB_CATEGORY_MAP = {
    "课件": "lecture", "lecture": "lecture", "slide": "lecture",
    "笔记": "notes", "note": "notes", "notes": "notes",
    "模拟": "mock_exam", "mock": "mock_exam",
    "总结": "summary", "summary": "summary",
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
    if ext in [".pdf"] and ("真题" in filename or "exam" in filename or "试卷" in filename):
        return "notes"
    return "other"

def infer_year(filename):
    import re
    matches = re.findall(r'20\d{2}', filename)
    if matches:
        return int(matches[0])
    return None

def infer_department(course_name):
    cs_keywords = ["操作系统", "计算机网络", "数据库", "编译原理", "算法", "数据结构", "人工智能",
                   "机器学习", "计算机", "分布式", "密码学", "图论", "自然语言处理", "计算机体系结构",
                   "模式识别", "计算复杂性", "程序理论", "网络安全", "体系结构", "智能控制", "图像处理",
                   "云计算", "大数据", "软件工程"]
    math_keywords = ["数学分析", "复变函数", "矩阵分析", "最优化", "概率论", "随机过程",
                     "数值计算", "数理逻辑", "高等代数", "组合数学", "离散数学"]

    for c in cs_keywords:
        if c in course_name:
            return "School of Computer Science"
    for c in math_keywords:
        if c in course_name:
            return "School of Mathematics"
    return "Sun Yat-sen University"

def main():
    manifest_path = DATA_DIR / "source" / "github" / "manifest.json"
    if not manifest_path.exists():
        print(f"Error: Manifest not found at {manifest_path}")
        sys.exit(1)

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    # Ensure DB exists
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        print("Please start the backend first to initialize the database.")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Check if data already exists
    cursor.execute("SELECT COUNT(*) FROM materials")
    count = cursor.fetchone()[0]
    if count > 0:
        print(f"Database already has {count} records. Skipping import.")
        print("To re-import, delete the database first.")
        conn.close()
        return

    total_files = 0
    total_courses = 0

    course_data = manifest.get("top_level_folders", {}).get("课程资料", {})
    if not course_data:
        print("Error: '课程资料' folder not found in manifest")
        # Try to find it
        for key, value in manifest.get("top_level_folders", {}).items():
            if "课程" in key or "course" in key.lower():
                print(f"Found alternative: {key}")
                course_data = value
                break

    subfolders = course_data.get("subfolders", {})

    for course_name, course_info in sorted(subfolders.items()):
        print(f"Processing: {course_name}")

        files = course_info.get("files", [])
        subsub = course_info.get("subfolders", {})

        # Collect all files including nested
        all_files = list(files)
        for subname, subinfo in subsub.items():
            all_files.extend(subinfo.get("files", []))
            for subsubname, subsubinfo in subinfo.get("subfolders", {}).items():
                all_files.extend(subsubinfo.get("files", []))

        if not all_files:
            print(f"  -> No files found")
            continue

        dept = infer_department(course_name)

        # Insert package record (mark as placeholder)
        cursor.execute("""
            INSERT INTO materials (title, description, category, sub_category, department, course_name,
                file_name, file_path, file_size, mime_type, is_zip_package, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"{course_name} - Complete Package",
            f"Complete study material package for {course_name}. Contains {len(all_files)} files.",
            "study_material",
            "other",
            dept,
            course_name,
            f"{course_name}_package.zip",
            f"data/source/github/SYSU_Notebook/课程资料/{course_name}",
            0,
            "application/zip",
            1,
            datetime.now(),
            datetime.now(),
        ))

        for filename in all_files:
            category = infer_category(filename)
            sub_category = infer_sub_category(filename)
            year = infer_year(filename)
            ext = Path(filename).suffix.lower() or "unknown"

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
                ext,
                filename,
                f"data/source/github/SYSU_Notebook/课程资料/{course_name}/{filename}",
                0,
                "application/octet-stream",
                0,
                datetime.now(),
                datetime.now(),
            ))
            total_files += 1

        total_courses += 1
        print(f"  -> {len(all_files)} files imported")

    conn.commit()
    conn.close()

    print(f"\nDone! Imported {total_files} files from {total_courses} courses.")
    print(f"Database: {DB_PATH}")

if __name__ == "__main__":
    main()
