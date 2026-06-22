#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Heuristic review of imported experience materials based on filename.
Outputs a list of IDs suggested for deletion and a sample report.
"""

import re
from pathlib import Path

INPUT = Path('/tmp/experience_files.txt')
OUTPUT_IDS = Path('/tmp/experience_delete_ids.txt')
OUTPUT_REPORT = Path('/tmp/experience_review_report.txt')

# Keywords indicating the file is an experience/guide/freshman/transfer/abroad/reselection resource
KEEP_KEYWORDS = [
    '攻略', '经验', '指南', '生存手册', '新生', '转专业', '留学', '出国', '交换',
    '二次遴选', '保研', '考研', '就业', '实习', '工作', '选课', '学业规划',
    '食堂', '宿舍', '搬迁', '报到', '入学', '校园', '南校', '北校', '东校', '珠海', '深圳',
    '充电桩', '地图', '链接', '建议', '流程', '申请', '简介', '须知', '注意事项',
    '生活', '交通', '快递', '银行', '医院', '体育馆', '图书馆', '社团', '学生组织',
    '勤工助学', '奖学金', '贷款', '医保', '体测', '军训', '心理', '安全',
    '中大', '中山大学', '鸭大',
]

# Keywords indicating course-specific material, textbook, exam paper, etc. -> delete from experience
DELETE_KEYWORDS = [
    '真题', '试卷', '试题', '题库', '答案', '解析', '复习资料', '复习提纲', '复习要点', '复习大纲',
    '课件', 'ppt', 'PPT', '讲义', '教材', '课本', '教科书', '习题', '练习', '章节',
    '笔记', '手写', '期末考试', '期中考试', '期末复习', '期中复习',
    '军理', '军事理论', '数学分析', '高等数学', '高数', '线性代数', '线代', '概率', '概统',
    '历年期末', '历年',
    '政治', '经济学', '艺术学', '社会学', '统计学', '英语', '大物', '物理',
    '化学', '生物', '历史', '哲学', '法学', '医学', '计算机', '数据结构', '操作系统',
    '编程', '代码', '程序设计', '工程', '论文', '实验报告', '课程设计',
    '毕业设计', '开题报告', '马工程', '《', '》',
]

# Extensions / suffixes that are clearly temporary or unrelated
DELETE_SUFFIXES = ('.baiduyun.p.downloading', '.download', '.tmp', '.exe', '.apk', '.mp4', '.mp3', '.avi')

# Generic number-only image names like 1.png, 2.jpg
NUMBER_IMAGE_RE = re.compile(r'^\d+\.(png|jpg|jpeg|gif|webp|bmp)$')


def should_delete(file_name: str, title: str) -> tuple[bool, str]:
    text = file_name + ' ' + title
    fn_lower = file_name.lower()

    # temporary/incomplete files
    if fn_lower.endswith(DELETE_SUFFIXES):
        return True, '临时/未完成下载文件'

    # generic number image
    if NUMBER_IMAGE_RE.match(file_name):
        return True, '无意义数字命名图片'

    # if any delete keyword is present, delete first (course materials etc.)
    for kw in DELETE_KEYWORDS:
        if kw in text:
            return True, f'命中删除关键词：{kw}'

    # if any keep keyword is present, keep it
    for kw in KEEP_KEYWORDS:
        if kw in text:
            return False, ''

    # overly generic file names (e.g. "pdf版.pdf", "1.png") without keep keywords
    base = Path(file_name).stem
    if len(base) <= 8:
        return True, '文件名过于简略，无法判断内容'

    # default: keep for manual review
    return False, ''


def main():
    lines = INPUT.read_text(encoding='utf-8').strip().splitlines()
    delete_ids = []
    delete_samples = []
    keep_samples = []
    total = 0

    for line in lines:
        if not line.strip():
            continue
        parts = line.split('|')
        if len(parts) < 3:
            continue
        id_, file_name, title = parts[0], parts[1], parts[2]
        total += 1
        is_delete, reason = should_delete(file_name, title)
        if is_delete:
            delete_ids.append(id_)
            if len(delete_samples) < 80:
                delete_samples.append((id_, file_name, reason))
        else:
            if len(keep_samples) < 80:
                keep_samples.append((id_, file_name))

    OUTPUT_IDS.write_text('\n'.join(delete_ids) + '\n', encoding='utf-8')

    report_lines = [
        f'总共审查：{total} 条',
        f'建议删除：{len(delete_ids)} 条',
        f'建议保留：{total - len(delete_ids)} 条',
        '',
        '=== 建议删除的代表性样本 ===',
    ]
    for id_, fn, reason in delete_samples:
        report_lines.append(f'{id_}\t{fn}\t{reason}')

    report_lines.extend(['', '=== 建议保留的代表性样本 ==='])
    for id_, fn in keep_samples:
        report_lines.append(f'{id_}\t{fn}')

    OUTPUT_REPORT.write_text('\n'.join(report_lines) + '\n', encoding='utf-8')
    print(f'Review complete. Total={total}, Delete={len(delete_ids)}, Keep={total - len(delete_ids)}')
    print(f'Delete IDs saved to {OUTPUT_IDS}')
    print(f'Report saved to {OUTPUT_REPORT}')


if __name__ == '__main__':
    main()
