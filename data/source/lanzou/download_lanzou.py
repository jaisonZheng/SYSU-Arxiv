#!/usr/bin/env python3
"""
蓝奏云文件批量下载脚本
使用 Playwright 自动化浏览器访问蓝奏云链接，输入密码并下载文件。
"""

import json
import os
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# 配置
DOWNLOAD_DIR = Path("/Users/mac/foo/sysu-arxiv/data/source/lanzou")
MANIFEST_PATH = DOWNLOAD_DIR / "manifest.json"

# 蓝奏云链接列表（从 markdown 中提取）
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


def get_downloaded_files(download_dir: Path, before_time: float):
    """获取在 before_time 之后下载的文件列表"""
    files = []
    for f in download_dir.iterdir():
        if f.is_file() and f.stat().st_mtime > before_time:
            files.append(f)
    return files


def download_from_lanzou(page, item: dict, download_dir: Path) -> dict:
    """
    使用 Playwright 从蓝奏云下载单个文件。
    返回包含下载结果的字典。
    """
    result = {
        "name": item["name"],
        "url": item["url"],
        "password": item["password"],
        "status": "pending",
        "filename": None,
        "error": None,
    }

    url = item["url"]
    password = item["password"]

    try:
        # 1. 访问链接
        print(f"[{item['name']}] 访问: {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(2)

        # 2. 检查是否需要输入密码
        # 蓝奏云密码输入框通常是 id="pwd" 或 name="pwd"
        pwd_input = page.locator("input#pwd, input[name='pwd'], input[placeholder*='密码']").first
        if pwd_input.is_visible():
            print(f"[{item['name']}] 输入密码: {password}")
            pwd_input.fill(password)
            time.sleep(0.5)

            # 点击确认按钮
            submit_btn = page.locator("button#sub, a#sub, .passwddiv-btn, button:has-text('确定'), button:has-text('确认'), a:has-text('确定')").first
            if submit_btn.is_visible():
                submit_btn.click()
                time.sleep(3)
            else:
                # 尝试按回车
                pwd_input.press("Enter")
                time.sleep(3)

        # 3. 等待页面加载文件列表或下载按钮
        time.sleep(2)

        # 检查是否是文件夹列表页（URL 包含 /b0 开头）
        current_url = page.url
        print(f"[{item['name']}] 当前URL: {current_url}")

        # 尝试获取页面标题作为文件名参考
        page_title = page.title()
        print(f"[{item['name']}] 页面标题: {page_title}")

        # 4. 查找下载按钮
        # 蓝奏云下载按钮常见的选择器
        download_selectors = [
            "a#down",
            "a#downs",
            ".d",
            ".down",
            ".downbtn",
            "a[href*='download']",
            "a:has-text('下载')",
            "button:has-text('下载')",
            ".btn:has-text('下载')",
            "#sub"  # 有些页面下载按钮也是 #sub
        ]

        download_btn = None
        for selector in download_selectors:
            try:
                btn = page.locator(selector).first
                if btn.is_visible():
                    download_btn = btn
                    print(f"[{item['name']}] 找到下载按钮: {selector}")
                    break
            except Exception:
                continue

        if not download_btn:
            # 可能是文件夹列表页，尝试获取文件列表中的第一个文件
            file_links = page.locator(".filelist a, .list a, .f_tb a").all()
            if file_links:
                print(f"[{item['name']}] 检测到文件夹，点击第一个文件")
                file_links[0].click()
                time.sleep(3)
                # 重新查找下载按钮
                for selector in download_selectors:
                    try:
                        btn = page.locator(selector).first
                        if btn.is_visible():
                            download_btn = btn
                            print(f"[{item['name']}] 找到下载按钮: {selector}")
                            break
                    except Exception:
                        continue

        if not download_btn:
            result["status"] = "failed"
            result["error"] = "未找到下载按钮"
            print(f"[{item['name']}] 错误: 未找到下载按钮")
            return result

        # 5. 记录下载前的文件列表
        before_time = time.time()
        existing_files = set(f.name for f in download_dir.iterdir() if f.is_file())

        # 6. 点击下载按钮
        print(f"[{item['name']}] 点击下载按钮")

        # 设置下载监听
        with page.expect_download(timeout=60000) as download_info:
            download_btn.click()
            time.sleep(2)

        download = download_info.value
        print(f"[{item['name']}] 下载已开始: {download.suggested_filename}")

        # 等待下载完成
        download_path = download_dir / download.suggested_filename
        download.save_as(download_path)
        print(f"[{item['name']}] 下载完成: {download_path.name}")

        result["status"] = "success"
        result["filename"] = download_path.name

    except PlaywrightTimeout as e:
        result["status"] = "failed"
        result["error"] = f"超时: {str(e)}"
        print(f"[{item['name']}] 超时错误: {e}")
    except Exception as e:
        result["status"] = "failed"
        result["error"] = str(e)
        print(f"[{item['name']}] 错误: {e}")

    return result


def main():
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 非 headless 模式便于调试
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            accept_downloads=True,
        )

        # 设置下载目录
        context.set_default_timeout(30000)

        page = context.new_page()

        for item in LINKS:
            result = download_from_lanzou(page, item, DOWNLOAD_DIR)
            manifest.append(result)

            # 保存中间结果
            with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)

            # 间隔一段时间，避免触发反爬
            time.sleep(3)

        browser.close()

    # 最终保存 manifest
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("\n=== 下载完成 ===")
    success_count = sum(1 for r in manifest if r["status"] == "success")
    failed_count = sum(1 for r in manifest if r["status"] == "failed")
    print(f"成功: {success_count}, 失败: {failed_count}")

    for r in manifest:
        status_icon = "✓" if r["status"] == "success" else "✗"
        print(f"  {status_icon} {r['name']}: {r.get('filename', r.get('error', '未知'))}")


if __name__ == "__main__":
    main()
