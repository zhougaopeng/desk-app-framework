# Desk App Framework

一个基于 **Electron + Hono + React** 的桌面应用开发框架。采用 npm workspaces 单仓管理，提供开箱即用的桌面壳、同进程 Node 后端和现代化前端，支持双模式运行（Electron / 独立 Web）。

## 特性

- **双模式运行** — 同一套前端代码既可在 Electron 桌面壳中运行（IPC + 自定义协议），也可作为独立 Web 应用通过 HTTP 访问
- **同进程后端** — Electron 主进程直接引入 Hono 路由，API 请求通过 IPC 调度，无需额外启动 HTTP 服务
- **前端热更新** — 支持前端 bundle 独立分发和热加载，桌面应用无需整体更新即可升级前端
- **自动更新** — 集成 electron-updater，支持应用级自动更新
- **CI/CD** — 内置 GitHub Actions 发布工作流，支持标签驱动的自动构建和发布

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Node.js ≥ 22.13.0, TypeScript |
| 桌面 | Electron 41, electron-vite, electron-builder |
| 后端 | Hono, conf (持久化存储) |
| 前端 | React 19, Vite 7, Tailwind CSS v4 |
| 质量 | Biome (lint + format), Vitest, Husky + lint-staged |

## 仓库结构

```
packages/
├── shared/   # @desk-framework/shared  — 跨包常量与类型定义
├── server/   # @desk-framework/server  — Node.js 后端（库 + 独立 HTTP 服务）
├── web/      # @desk-framework/web     — React 前端
└── desk/     # @desk-framework/desk    — Electron 桌面壳
```

**依赖关系：** `desk → server → shared`，`web → shared`

## 快速开始

### 环境要求

- Node.js ≥ 22.13.0
- npm

### 安装

```bash
npm install
```

### 开发

启动全部服务（Server + Web + Electron 并行运行）：

```bash
npm run dev
```

也可以单独启动各个部分：

```bash
npm run dev:server    # 仅后端（tsx watch，端口 3100）
npm run dev:web       # 仅前端（Vite，端口 5173）
```

### 构建

```bash
npm run build:shared          # 构建 shared 包
npm run build:server          # 构建 server（含 shared）
npm run build:server:embed    # 构建 server 嵌入模式（供 Electron 使用）
npm run build:web             # 构建前端
npm run build:web:zip         # 构建前端 zip 分发包
npm run build:desk            # 构建 Electron 应用
```

### 打包桌面应用

```bash
npm run package               # 完整构建 + electron-builder 打包
npm run package:local         # 本地打包（ELECTRON_LOCAL_PACKAGE=1）
```

### 测试与代码检查

```bash
npm test                      # 运行全部测试
npm run test:watch            # 监听模式
npm run lint                  # Biome 检查
npm run lint:fix              # Biome 自动修复
```

## 架构

### 通信模式

| 模式 | 前端加载 | API 通信 |
|------|----------|----------|
| Electron | `app-ui://main` 自定义协议 | IPC (`ipcMain.handle`) → Hono 路由 |
| 独立 Web | `http://localhost:5173` | HTTP REST → `http://localhost:3100/api` |

### 核心设计

- **Server 工厂模式** — `createApp()` 返回包含 settings store 和生命周期钩子的 `AppInstance`，便于在 Electron 主进程和独立 HTTP 两种场景复用
- **双模式适配器** — 前端 `ApiAdapter` 在运行时检测 `window.electronAPI`，自动切换 IPC 和 HTTP 两种通信方式
- **前端分发** — `build:web:zip` 生成带 `version.json` 的 zip 包，Electron 可从远程拉取并热加载

## 发布

CI 工作流通过 Git 标签触发：

| 标签前缀 | 行为 |
|----------|------|
| `v*`（如 `v1.0.0`） | 全量发布：Web zip + Electron 桌面应用 |
| `w*`（如 `w1.0.0`） | 仅发布 Web zip + version.json |

也支持通过 `workflow_dispatch` 手动触发选择性发布。

## 环境变量

| 变量 | 说明 |
|------|------|
| `WEB_DEV` | 设为 `1` 时 Electron 加载 Vite 开发地址 |
| `DATA_DIR` | 覆盖独立 server 的数据目录 |
| `ELECTRON_LOCAL_PACKAGE` | 设为 `1` 启用本地打包行为 |
| `FRONTEND_BUNDLE_URL` | 远程前端 bundle 下载地址 |

## 代码规范

- Biome 统一管理 lint 和格式化（无 ESLint / Prettier）
- 2 空格缩进，双引号，分号，尾逗号，100 字符行宽
- 禁用 `any`，使用 `unknown` + 类型守卫
- Husky pre-commit 钩子自动运行 lint-staged
