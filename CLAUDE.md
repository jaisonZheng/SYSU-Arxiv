# SYSU-Arxiv 项目指令

## 前端设计参考

前端开发必须严格遵循 `design/` 文件夹中的设计稿。主要参考文件：

- `design/academic_repository/DESIGN.md` - 设计系统规范（颜色、字体、间距）
- `design/sysu_arxiv_home_desktop_1/code.html` - 首页设计
- `design/explore_desktop_1/code.html` - 探索页设计
- `design/material_detail_desktop_1/code.html` - 详情页设计
- `design/upload_material_desktop/code.html` - 上传页设计

## 设计系统要点

- **字体**: Inter (sans-serif)
- **主色**: #0058be (primary blue)
- **辅色**: #4648d4 (secondary)
- **背景**: #f8f9fa
- **边框**: #E5E7EB
- **卡片**: 白色背景 + 1px 灰色边框 + hover 阴影
- **圆角**: 按钮 4px, 卡片 8px
- **布局**: 顶部导航栏 + 左侧边栏 + 主内容区

## 技术栈

- 前端: React + Vite + Tailwind CSS + React Router + Lucide Icons
- 后端: Go + Gin + SQLite
- 部署: Nginx + pm2 on Tencent Cloud

## 注意事项

- 无用户鉴权，全开放访问
- 蓝奏云下载使用 playwright-cli
- 初始数据使用 content-processor agent 处理
- 进度记录在 progress.md
- 使用 git 保存大进度
