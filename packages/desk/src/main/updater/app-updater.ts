import { APP_DISPLAY_NAME } from "@desk-framework/shared";
import { app, type BrowserWindow, dialog, Menu, type MenuItem, shell } from "electron";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;
type UpdateInfo = electronUpdater.UpdateInfo;

const TAG = "[app-updater]";

let releaseUrl = "";
let mainWindow: BrowserWindow | null = null;
let checkForUpdatesMenuItem: MenuItem | null = null;
let isManualCheck = false;

function send(channel: string, data?: unknown): void {
  mainWindow?.webContents.send(channel, data);
}

function getParentWindow(): BrowserWindow | undefined {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
}

function showDialog(options: Electron.MessageBoxOptions): Promise<Electron.MessageBoxReturnValue> {
  const parent = getParentWindow();
  return parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options);
}

function openReleasePage(version: string): void {
  shell.openExternal(`${releaseUrl}/tag/v${version}`);
}

function buildAppMenu(appName: string, packaged: boolean): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: appName,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Check for Updates…",
          id: "check-for-updates",
          enabled: packaged,
          click: () => checkForAppUpdate(true),
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  checkForUpdatesMenuItem = menu.getMenuItemById("check-for-updates");
}

export function initAppUpdater(
  win: BrowserWindow,
  appName: string,
  configuredReleaseUrl?: string,
): void {
  releaseUrl = configuredReleaseUrl || "";
  buildAppMenu(appName, app.isPackaged);

  if (!app.isPackaged) {
    console.log(`${TAG} Skipping auto-updater in dev mode`);
    return;
  }

  mainWindow = win;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => {
    console.log(`${TAG} Checking for update...`);
    send("app-update:checking");
    if (checkForUpdatesMenuItem) {
      checkForUpdatesMenuItem.label = "Checking for Updates…";
      checkForUpdatesMenuItem.enabled = false;
    }
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    console.log(`${TAG} Update available: ${info.version}`);
    send("app-update:available", {
      version: info.version,
      releaseDate: info.releaseDate,
    });

    if (checkForUpdatesMenuItem) {
      checkForUpdatesMenuItem.label = `Download Update (v${info.version})…`;
      checkForUpdatesMenuItem.enabled = true;
      checkForUpdatesMenuItem.click = () => openReleasePage(info.version);
    }

    showDialog({
      type: "info",
      title: "Update Available",
      message: `A new version is available: v${info.version}`,
      detail: 'Click "Download" to open the download page.',
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) openReleasePage(info.version);
    });
  });

  autoUpdater.on("update-not-available", (info: UpdateInfo) => {
    console.log(`${TAG} Already up-to-date: ${info.version}`);
    send("app-update:not-available", { version: info.version });
    if (checkForUpdatesMenuItem) {
      checkForUpdatesMenuItem.label = "Check for Updates…";
      checkForUpdatesMenuItem.enabled = true;
    }
    if (isManualCheck) {
      isManualCheck = false;
      showDialog({
        type: "info",
        title: "No Updates Available",
        message: "You're up to date!",
        detail: `${appName} ${info.version} is currently the newest version available.`,
        buttons: ["OK"],
      });
    }
  });

  autoUpdater.on("error", (err: Error) => {
    console.error(`${TAG} Update error:`, err);
    send("app-update:error", { message: err.message });
    isManualCheck = false;
    if (checkForUpdatesMenuItem) {
      checkForUpdatesMenuItem.label = "Check for Updates…";
      checkForUpdatesMenuItem.enabled = true;
    }
  });

  setTimeout(() => checkForAppUpdate(), 3_000);
}

export function checkForAppUpdate(manual = false): void {
  if (!app.isPackaged) {
    console.log(`${TAG} Skipping update check in dev mode`);
    return;
  }
  isManualCheck = manual;
  autoUpdater.checkForUpdates();
}
