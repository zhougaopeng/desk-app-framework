import { createApp, type CreateAppOptions } from "@desk-framework/server";
import {
  APP_DISPLAY_NAME,
  UI_ORIGIN,
  UI_PROTOCOL,
  WEB_DEV_URL,
} from "@desk-framework/shared";
import { app, protocol } from "electron";
import { setupUiProtocol } from "./protocol";
import { setupRoutes } from "./routes/setup";
import { initAppUpdater } from "./updater/app-updater";
import { checkForUpdate, downloadUpdate, loadSplash } from "./updater/frontend-loader";
import { getTargetFrontendVersion } from "./util";
import { createMainWindow } from "./window";

// ── 应用配置（模板使用者按需修改） ─────────────────────────

const RELEASE_URL = ""; // GitHub release page URL，留空则禁用手动更新入口

const defaultSettings = {
  example: {
    greeting: `Hello from ${APP_DISPLAY_NAME}!`,
  },
};

type AppSettings = typeof defaultSettings;

const appOptions: CreateAppOptions<AppSettings> = {
  defaults: defaultSettings,
};

// ── 启动流程 ───────────────────────────────────────────────

if (!process.env.WEB_DEV) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: UI_PROTOCOL,
      privileges: { standard: true, supportFetchAPI: true },
    },
  ]);
}

app.whenReady().then(async () => {
  const mainWindow = createMainWindow();

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  if (process.env.WEB_DEV) {
    mainWindow.loadURL(WEB_DEV_URL);
    return;
  }

  let targetFrontendVersion = getTargetFrontendVersion();

  if (!targetFrontendVersion) {
    loadSplash(mainWindow);
  }

  setupUiProtocol(() => targetFrontendVersion?.frontendDir);

  const serverApp = await createApp({
    ...appOptions,
    config: { dataDir: app.getPath("userData") },
  });

  setupRoutes(serverApp);

  initAppUpdater(mainWindow, APP_DISPLAY_NAME, RELEASE_URL || undefined);

  const isLocalPackage = !!process.env.ELECTRON_LOCAL_PACKAGE;
  let justDownloaded = false;

  if (!targetFrontendVersion) {
    if (isLocalPackage) {
      console.error("[desk] ELECTRON_LOCAL_PACKAGE set but no bundled frontend found.");
    } else {
      console.log("[desk] No local frontend found, downloading initial version...");

      mainWindow.webContents.send("splash:status", {
        stage: "checking",
        message: "正在检查更新...",
        progress: -1,
      });

      const update = await checkForUpdate(null).catch((err) => {
        console.error("[desk] Initial download check failed:", err);
        return null;
      });

      if (update) {
        await downloadUpdate(update, (status) => {
          mainWindow.webContents.send("splash:status", status);
        }).catch((err) => {
          console.error("[desk] Initial download failed:", err);
        });
        targetFrontendVersion = getTargetFrontendVersion();
        justDownloaded = true;
      }
    }
  }

  mainWindow.loadURL(`${UI_ORIGIN}/`);

  if (!isLocalPackage && !justDownloaded) {
    checkForUpdate(targetFrontendVersion)
      .then(async (update) => {
        if (!update) return;

        console.log(`[desk] Downloading frontend update ${update.version}...`);
        await downloadUpdate(update);

        mainWindow.webContents.send("frontend:update-ready", { version: update.version });
        console.log(`[desk] Frontend update ready: ${update.version}`);
      })
      .catch((err) => {
        console.error("[desk] Background update failed:", err);
      });
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
