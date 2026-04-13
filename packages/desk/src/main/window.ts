import path from "node:path";
import { type BrowserWindowConstructorOptions, app, BrowserWindow } from "electron";

let mainWindow: BrowserWindow | null = null;

const defaultOptions: BrowserWindowConstructorOptions = {
  width: 960,
  height: 720,
  minWidth: 380,
  minHeight: 500,
  titleBarStyle: "hidden",
  trafficLightPosition: { x: 12, y: 12 },
};

export function createMainWindow(overrides?: Partial<BrowserWindowConstructorOptions>): BrowserWindow {
  mainWindow = new BrowserWindow({
    ...defaultOptions,
    ...overrides,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: app.isPackaged,
      ...overrides?.webPreferences,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
