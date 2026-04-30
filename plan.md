# SYSU-Arxiv 开发计划

## Context

搭建一个中山大学期中/期末考试试卷及复习资料共享平台，类似 Hugging Face Datasets 的逻辑。用户可以自由下载或上传内容。项目完成后部署至腾讯云服务器，绑定域名 `arxiv.jaison.ink`。

## 技术栈

- **前端**: React + Vite + Tailwind CSS
- **后端**: Go + Gin + SQLite
- **文件存储**: 本地文件系统（腾讯云服务器）
- **进程管理**: pm2
- **反向代理**: Nginx
- **初始数据获取**: content-processor agent + playwright-cli

## 项目结构

```
sysu-arxiv/
├── frontend/              # React 前端
│   ├── src/
│   │   ├── components/    # 共享组件 (Header, Sidebar, Footer, ResourceCard)
│   │   ├── pages/         # 页面 (Home, Explore, Detail, Upload)
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── api/           # API 调用封装
│   │   └── App.jsx
│   ├── public/
│   └── package.json
├── backend/               # Go 后端
│   ├── main.go
│   ├── handlers/          # HTTP handlers
│   ├── models/            # 数据模型
│   ├── db/                # 数据库操作
│   ├── storage/           # 文件存储逻辑
│   └── go.mod
├── data/                  # SQLite 数据库 & 上传文件存储
│   ├── uploads/           # 上传的文件
│   └── sysu-arxiv.db
├── scripts/               # 部署脚本
└── progress.md            # 进度记录
```

## Phase 1: 后端基础架构

### 1.1 数据库设计 (SQLite)

**表结构：**

```sql
-- 资源表 materials
CREATE TABLE materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,           -- 'past_exam' | 'study_material'
    sub_category TEXT,                -- 'lecture' | 'notes' | 'mock_exam' | 'summary' | 'other'
    department TEXT,                  -- 院系
    major TEXT,                       -- 专业
    course_name TEXT,                 -- 课程名称
    instructor TEXT,                  -- 授课老师
    year INTEGER,                     -- 年份
    file_type TEXT,                   -- 文件类型标签
    uploader_name TEXT,               -- 上传人
    file_name TEXT NOT NULL,          -- 原始文件名
    file_path TEXT NOT NULL,          -- 存储路径
    file_size INTEGER,                -- 文件大小(字节)
    mime_type TEXT,                   -- MIME 类型
    is_zip_package INTEGER DEFAULT 0, -- 是否是 ZIP 资料包
    download_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 全文搜索索引
CREATE VIRTUAL TABLE materials_fts USING fts5(
    title, description, course_name, instructor,
    content='materials',
    content_rowid='id'
);
```

### 1.2 API 设计

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/materials` | 列表 + 搜索 + 过滤 + 分页 |
| GET | `/api/materials/:id` | 资源详情 |
| POST | `/api/materials` | 创建资源（单文件上传） |
| POST | `/api/materials/zip` | 创建资源（ZIP 包上传） |
| GET | `/api/materials/:id/download` | 下载单文件 |
| GET | `/api/materials/:id/download-package` | 下载 ZIP 资料包 |
| GET | `/api/materials/check-duplicate` | 检查文件名重复 |
| GET | `/api/departments` | 获取院系列表（去重） |
| GET | `/api/courses` | 获取课程列表（去重） |
| GET | `/api/tags` | 获取热门标签 |

### 1.3 后端文件组织

- `main.go` - 入口，路由注册
- `models/material.go` - 数据模型
- `db/db.go` - 数据库连接和迁移
- `db/material_store.go` - 资源 CRUD
- `handlers/material_handler.go` - HTTP handlers
- `storage/local.go` - 本地文件存储
- `middleware/cors.go` - CORS 中间件

## Phase 2: 前端开发

### 2.1 页面路由

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | 首页：搜索框 + 分类 Bento + 最近上传列表 |
| `/explore` | Explore | 资源探索：搜索 + 过滤面板 + 资源卡片列表 + 分页 |
| `/material/:id` | Detail | 资源详情：元数据 + 下载按钮 + 相关推荐 |
| `/upload` | Upload | 上传页面：拖拽上传 + 标签表单 |

### 2.2 共享组件

- `Layout` - 顶部导航 + 侧边栏 + 主内容区
- `TopNav` - 顶部导航栏（Logo、搜索、导航链接）
- `SideNav` - 侧边栏（Home、Explore、Past Exams、Study Materials）
- `ResourceCard` - 资源卡片（用于列表展示）
- `Tag` - 标签组件
- `Pagination` - 分页组件
- `FileUploader` - 文件上传组件（支持拖拽）

### 2.3 状态管理

使用 React Context + useReducer 进行简单的全局状态管理：
- 搜索关键词
- 过滤条件
- 当前分页

## Phase 3: 核心功能实现

### 3.1 单文件上传流程

1. 用户选择文件（拖拽或点击）
2. 前端检查文件大小（限制 100MB）
3. 填写标签表单（课程名称、院系、年份等）
4. 提交前调用 `/api/materials/check-duplicate?filename=xxx`
5. 如果重复，弹窗确认"已有该文件，是否要继续上传？"
6. 用户确认后，POST `/api/materials` 上传
7. 后端保存文件到 `data/uploads/`，写入数据库

### 3.2 ZIP 包上传流程

1. 用户选择 ZIP 文件
2. 填写标签表单（不解析 ZIP 内部结构）
3. 标记 `is_zip_package = 1`
4. 直接保存 ZIP 文件

### 3.3 下载功能

- **单文件下载**：直接返回文件流，Content-Disposition: attachment
- **资料包下载**：直接返回已存储的 ZIP 文件流

### 3.4 搜索与过滤

- 搜索框：对 title、description、course_name、instructor 做全文搜索
- 过滤面板：category、department、year、file_type 多选
- 排序：按时间、下载量

## Phase 4: 初始数据准备（content-processor agent）

### 4.1 数据来源

1. **GitHub 仓库**: `git@github.com:ysyisyourbrother/SYSU_Notebook.git`
   - 克隆仓库
   - 解压所有文件夹
   - 按课程/文件夹拆分，提取标签信息

2. **Markdown 文件**: `软工期末复习资料汇总（新）.md`
   - 解析其中的蓝奏云网盘链接
   - 使用 playwright-cli 自动下载文件
   - 蓝奏云链接需要密码，从 markdown 中提取

### 4.2 数据处理流程

1. 下载/克隆所有源数据
2. 按文件夹/课程拆分文件
3. 对每个文件：
   - 提取课程名称（从文件夹名/文件名推断）
   - 设置院系、专业、年份等标签（手动标注或推断）
   - 将文件作为独立资源入库
4. 保留每个课程文件夹的 ZIP 副本作为"资料包"
5. 使用后端 API 或直接操作数据库入库

### 4.3 标签推断规则

- **院系/专业**: 从文件夹名推断（如 "计算机学院"、"数学学院"）
- **课程名称**: 从文件夹名或文件名推断
- **年份**: 从文件名提取（如 "2023"、"2022-2023"）
- **文件类型**: 根据文件扩展名判断（.pdf -> 真题/笔记, .pptx -> 课件）
- **授课老师**: 如有标注则提取，否则留空

## Phase 5: 测试

### 5.1 后端单元测试

- `db/material_store_test.go` - 数据库操作测试
- `handlers/material_handler_test.go` - HTTP handler 测试
- `storage/local_test.go` - 文件存储测试

### 5.2 前端单元测试

- 组件渲染测试（React Testing Library）
- API 调用测试（Mock Service Worker）

### 5.3 集成测试

- 上传 -> 搜索 -> 下载 完整流程
- 重复文件检测
- ZIP 包上传下载

## Phase 6: 部署

### 6.1 本地构建

```bash
# 前端构建
cd frontend
npm run build

# 后端构建
cd backend
go build -o sysu-arxiv-backend
```

### 6.2 服务器部署流程

1. 将构建产物上传至腾讯云服务器
2. 配置 Nginx 反向代理：
   - `arxiv.jaison.ink` -> 前端静态文件 + API 代理到后端
   - HTTPS 使用 Let's Encrypt 或已有证书
3. 使用 pm2 启动后端服务
4. 配置 systemd 或 pm2 开机自启

### 6.3 Nginx 配置

```nginx
server {
    listen 443 ssl http2;
    server_name arxiv.jaison.ink;

    # SSL 证书配置
    ssl_certificate /path/to/cert;
    ssl_certificate_key /path/to/key;

    # 前端静态文件
    location / {
        root /var/www/sysu-arxiv/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:8083/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 文件下载
    location /uploads/ {
        alias /var/www/sysu-arxiv/data/uploads/;
    }
}
```

## Phase 7: 开发里程碑

| 阶段 | 内容 | 预计交付 |
|------|------|---------|
| M1 | 后端基础：数据库 + API + 文件存储 | ✅ |
| M2 | 前端基础：路由 + Layout + 首页 | ✅ |
| M3 | 核心功能：上传 + 下载 + 搜索 | ✅ |
| M4 | 初始数据：GitHub + 网盘数据抓取处理 | ✅ |
| M5 | 测试 + 部署 + HTTPS 配置 | ✅ |

## 关键文件清单

### 后端
- `backend/main.go`
- `backend/models/material.go`
- `backend/db/db.go`
- `backend/db/material_store.go`
- `backend/handlers/material_handler.go`
- `backend/storage/local.go`
- `backend/middleware/cors.go`

### 前端
- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `frontend/src/components/Layout.jsx`
- `frontend/src/components/TopNav.jsx`
- `frontend/src/components/SideNav.jsx`
- `frontend/src/components/ResourceCard.jsx`
- `frontend/src/pages/Home.jsx`
- `frontend/src/pages/Explore.jsx`
- `frontend/src/pages/Detail.jsx`
- `frontend/src/pages/Upload.jsx`
- `frontend/src/api/client.js`
- `frontend/tailwind.config.js`

### 配置
- `frontend/package.json`
- `backend/go.mod`
- `scripts/deploy.sh`

## 风险与注意事项

1. **蓝奏云下载**: 蓝奏云有反爬虫机制，可能需要特殊处理
2. **文件大小**: 大文件上传需要分片或增加超时时间
3. **存储空间**: 腾讯云服务器存储有限，需监控磁盘使用
4. **无鉴权**: 全开放系统，注意文件类型白名单防止上传恶意文件
5. **jaison.ink 优先级**: 不要修改已有的 Nginx 配置，新增 server block
