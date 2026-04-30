#!/usr/bin/env python3
"""
蓝奏云文件批量下载脚本 v2
通过分析蓝奏云页面结构，提取真实下载链接并下载文件。
流程：访问文件夹链接 -> 输入密码 -> 获取文件列表 -> 访问每个文件页 -> 获取iframe -> 获取下载链接 -> 下载
"""

import json
import os
import re
import time
from pathlib import Path
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# 配置
DOWNLOAD_DIR = Path("/Users/mac/foo/sysu-arxiv/data/source/lanzou")
MANIFEST_PATH = DOWNLOAD_DIR / "manifest.json"

# 蓝奏云链接列表
LINKS = [
    {"name": "大物真题", "url": "https://wwavx.lanzoum.com/b0139eq99i", "password": "19k8"},
    {"name": "xi概复习资料", "url": "https://wwavx.lanzoum.com/b0139eq9la", "password": "388r"},
    {"name": "数学专业课真题", "url": "https://wwavx.lanzoum.com/b0139eq9nc", "password": "9d1w"},
    {"name": "高数真题", "url": "https://wwavx.lanzoum.com/b0139eqa3i", "password": "3i99"},
    {"name": "程序设计1真题", "url": "https://wwavx.lanzoum.com/b0139eqabg", "password": "fkgw"},
    {"name": "英语A班真题", "url": "https://wwavx.lanzoum.com/b0139eqa1g", "password": "gqq6"},
    {"name": "英语B班真题", "url": "https://wwavx.lanzoum.com/b0139fkzte", "password": "4zh4"},
    {"name": "数据库真题", "url": "https://wwavx.lanzoum.com/b0139fl09a", "password": "h52x"},
    {"name": "概率统计真题", "url": "https://wwavx.lanzoum.com/b0139fl1sf", "password": "29dx"},
    {"name": "数据结构与算法真题", "url": "https://wwavx.lanzoum.com/b0139fky9i", "password": "4qzf"},
    {"name": "马原真题", "url": "https://wwavx.lanzoum.com/b0139fky2b", "password": "3j73"},
    {"name": "操作系统真题", "url": "https://wwavx.lanzoum.com/b0139fkzid", "password": "4vgx"},
    {"name": "毛概复习资料", "url": "https://wwavx.lanzoum.com/b0139fl22f", "password": "6wwz"},
    {"name": "近代史纲", "url": "https://wwavx.lanzoum.com/b0138y090h", "password": "a4dd"},
]


def get_folder_files(page, url, password):
    """
    访问蓝奏云文件夹链接，输入密码，返回文件列表。
    每个文件是 dict: {name, url}
    """
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    time.sleep(2)

    # 输入密码
    pwd_input = page.locator("input#pwd").first
    if pwd_input.is_visible():
        pwd_input.fill(password)
        time.sleep(0.5)
        submit_btn = page.locator("input#sub").first
        if submit_btn.is_visible():
            submit_btn.click()
            time.sleep(3)
        else:
            pwd_input.press("Enter")
            time.sleep(3)

    # 等待文件列表加载
    time.sleep(2)

    # 提取文件链接
    files = []
    links = page.locator("#infos a").all()
    for link in links:
        href = link.get_attribute("href")
        text = link.text_content()
        if href:
            file_url = urljoin(url, href)
            files.append({"name": text.strip(), "url": file_url})

    return files


def download_file(page, file_url, download_dir, expected_name):
    """
    访问单个文件页面，获取真实下载链接并下载。
    返回 (success: bool, filename: str or None, error: str or None)
    """
    try:
        page.goto(file_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(2)

        # 获取 iframe src
        iframe = page.locator("iframe.ifr2").first
        if not iframe.is_visible():
            return False, None, "未找到下载iframe"

        iframe_src = iframe.get_attribute("src")
        if not iframe_src:
            return False, None, "iframe src为空"

        # 访问 iframe 页面获取下载链接
        iframe_url = urljoin(file_url, iframe_src)
        page.goto(iframe_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(2)

        # 等待 AJAX 加载下载链接
        time.sleep(2)

        # 获取下载链接
        download_link = page.locator("#tourl a.txt").first
        if not download_link.is_visible():
            return False, None, "未找到下载链接"

        download_url = download_link.get_attribute("href")
        if not download_url:
            return False, None, "下载链接为空"

        # 访问下载链接触发下载
        # 使用 expect_download 监听下载
        with page.expect_download(timeout=60000) as download_info:
            page.goto(download_url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(3)

        download = download_info.value
        suggested = download.suggested_filename

        # 保存到目标目录
        dest = download_dir / suggested
        download.save_as(dest)

        return True, suggested, None

    except PlaywrightTimeout as e:
        return False, None, f"超时: {e}"
    except Exception as e:
        return False, None, str(e)


def main():
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = context.new_page()

        for item in LINKS:
            print(f"\n=== 处理: {item['name']} ===")
            entry = {
                "name": item["name"],
                "url": item["url"],
                "password": item["password"],
                "files": [],
            }

            try:
                # 1. 获取文件夹中的文件列表
                files = get_folder_files(page, item["url"], item["password"])
                print(f"  找到 {len(files)} 个文件")

                if not files:
                    entry["files"].append({
                        "status": "failed",
                        "filename": None,
                        "error": "文件夹中没有找到文件"
                    })

                for f in files:
                    print(f"  下载: {f['name']} ({f['url']})")
                    success, filename, error = download_file(page, f["url"], DOWNLOAD_DIR, f["name"])

                    file_entry = {
                        "original_name": f["name"],
                        "url": f["url"],
                        "status": "success" if success else "failed",
                        "filename": filename,
                        "error": error,
                    }
                    entry["files"].append(file_entry)

                    if success:
                        print(f"    ✓ 成功: {filename}")
                    else:
                        print(f"    ✗ 失败: {error}")

                    time.sleep(2)

            except Exception as e:
                entry["files"].append({
                    "status": "failed",
                    "filename": None,
                    "error": str(e)
                })
                print(f"  ✗ 处理失败: {e}")

            manifest.append(entry)

            # 保存中间结果
            with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)

            time.sleep(3)

        browser.close()

    # 最终保存
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # 统计
    total_files = sum(len(e["files"]) for e in manifest)
    success_files = sum(1 for e in manifest for f in e["files"] if f["status"] == "success")
    failed_files = sum(1 for e in manifest for f in e["files"] if f["status"] == "failed")

    print(f"\n=== 下载完成 ===")
    print(f"总文件数: {total_files}, 成功: {success_files}, 失败: {failed_files}")

    for e in manifest:
        for f in e["files"]:
            icon = "✓" if f["status"] == "success" else "✗"
            name = f.get("filename") or f.get("original_name") or "unknown"
            print(f"  {icon} [{e['name']}] {name}")


if __name__ == "__main__":
    main()
