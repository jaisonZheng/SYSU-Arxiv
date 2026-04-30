#!/usr/bin/env python3
"""
蓝奏云文件批量下载脚本 v3
使用 requests + 解析页面逻辑来下载，避免 Playwright 的下载监听问题。
流程：
1. Playwright 访问文件夹页，输入密码，获取文件列表
2. 对每个文件，Playwright 访问文件页，获取 iframe 中的下载链接
3. 用 requests 直接下载文件
"""

import json
import os
import re
import time
import requests
from pathlib import Path
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# 配置
DOWNLOAD_DIR = Path("/Users/mac/foo/sysu-arxiv/data/source/lanzou")
MANIFEST_PATH = DOWNLOAD_DIR / "manifest.json"

# 请求头
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

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
    """访问文件夹页，输入密码，返回文件列表 [{name, url}]"""
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    time.sleep(2)

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

    time.sleep(2)

    files = []
    links = page.locator("#infos a").all()
    for link in links:
        href = link.get_attribute("href")
        text = link.text_content()
        if href:
            file_url = urljoin(url, href)
            files.append({"name": text.strip(), "url": file_url})

    return files


def get_download_url(page, file_url):
    """
    访问单个文件页，获取真实下载URL。
    返回 (download_url, filename) 或 (None, None)
    """
    try:
        page.goto(file_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(2)

        # 获取 iframe src
        iframe = page.locator("iframe.ifr2").first
        if not iframe.is_visible():
            return None, None

        iframe_src = iframe.get_attribute("src")
        if not iframe_src:
            return None, None

        iframe_url = urljoin(file_url, iframe_src)
        page.goto(iframe_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)  # 等待 AJAX 加载

        # 获取下载链接
        download_link = page.locator("#tourl a.txt").first
        if not download_link.is_visible():
            return None, None

        download_url = download_link.get_attribute("href")
        if not download_url:
            return None, None

        # 获取文件名
        filename = None
        try:
            # 从页面标题或附近元素获取
            title_el = page.locator(".d > div:first-child").first
            if title_el.is_visible():
                title_text = title_el.text_content().strip()
                if title_text:
                    filename = title_text
        except Exception:
            pass

        return download_url, filename

    except Exception as e:
        print(f"    获取下载链接失败: {e}")
        return None, None


def download_with_requests(url, dest_path, headers):
    """使用 requests 下载文件"""
    try:
        session = requests.Session()
        session.headers.update(headers)
        resp = session.get(url, timeout=60, allow_redirects=True)
        resp.raise_for_status()

        with open(dest_path, "wb") as f:
            f.write(resp.content)

        return True, None
    except Exception as e:
        return False, str(e)


def main():
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=HEADERS["User-Agent"],
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
                files = get_folder_files(page, item["url"], item["password"])
                print(f"  找到 {len(files)} 个文件")

                if not files:
                    entry["files"].append({
                        "status": "failed",
                        "filename": None,
                        "error": "文件夹中没有找到文件"
                    })

                for f in files:
                    print(f"  处理: {f['name']}")
                    download_url, page_filename = get_download_url(page, f["url"])

                    if not download_url:
                        entry["files"].append({
                            "original_name": f["name"],
                            "url": f["url"],
                            "status": "failed",
                            "filename": None,
                            "error": "无法获取下载链接"
                        })
                        print(f"    ✗ 无法获取下载链接")
                        continue

                    # 确定文件名
                    safe_name = re.sub(r'[\\/:*?"<>>|]', '_', f["name"])
                    if not safe_name.endswith('.zip'):
                        safe_name += '.zip'

                    dest_path = DOWNLOAD_DIR / safe_name

                    # 下载
                    success, error = download_with_requests(download_url, dest_path, HEADERS)

                    file_entry = {
                        "original_name": f["name"],
                        "url": f["url"],
                        "status": "success" if success else "failed",
                        "filename": safe_name if success else None,
                        "error": error,
                    }
                    entry["files"].append(file_entry)

                    if success:
                        print(f"    ✓ 成功: {safe_name} ({dest_path.stat().st_size} bytes)")
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

            with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)

            time.sleep(3)

        browser.close()

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

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
