// ============================================================
// 应用标识（脚手架替换区 ── scaffold: identity）
// ============================================================

/** 应用显示名称（标题栏、菜单、splash 等） */
export const APP_DISPLAY_NAME = "Desk App";

/** 应用短标识（kebab-case），用于数据目录、临时目录、构建产物命名 */
export const APP_SLUG = "desk-app";

// ============================================================
// 自定义协议（脚手架替换区 ── scaffold: protocol）
// ============================================================

/** Electron 自定义协议：前端静态资源 */
export const UI_PROTOCOL = "app-ui";

// ============================================================
// Web Dev Server 配置（仅开发模式）
// ============================================================

/** Vite web dev server 默认端口 */
export const WEB_DEV_PORT = 5173;

/** Vite web dev server URL（WEB_DEV=1 时 Electron 加载此地址） */
export const WEB_DEV_URL = `http://localhost:${WEB_DEV_PORT}`;

// ============================================================
// Server 连接配置
// ============================================================

/** 本地 HTTP server 默认端口（standalone web 模式使用） */
export const SERVER_PORT = 3100;

/** API 路径前缀 */
export const API_PREFIX = "/api";

/** 本地 HTTP server base URL（仅 standalone web 模式有效；Electron 模式走 IPC） */
export const SERVER_BASE_URL = `http://localhost:${SERVER_PORT}${API_PREFIX}`;

/** Electron 自定义协议 UI origin（用于 loadURL 及 CORS） */
export const UI_ORIGIN = `${UI_PROTOCOL}://main`;

// ============================================================
// IPC 配置
// ============================================================

/** Hono RPC IPC channel 名称（Electron main↔renderer 通信） */
export const IPC_CHANNEL = "hono-rpc";
