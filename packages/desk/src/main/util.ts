import { readFileSync } from "node:fs";
import path from "node:path";
import { app } from "electron";

export function getFrontendDir(): string {
  return path.join(app.getPath("userData"), "frontend-dist");
}

export function getBundledFrontendDir(): string | null {
  if (!app.isPackaged) return null;
  return path.join(process.resourcesPath, "frontend-dist");
}

export type VersionJson = {
  hash: string;
  zipFileName: string;
  version: string;
  frontendDir: string;
};

export function getBundledFrontendVersion(): VersionJson | null {
  const bundledDir = getBundledFrontendDir();
  if (!bundledDir) return null;

  const versionFile = path.join(bundledDir, "version.json");
  let versionJson: VersionJson | null = null;
  try {
    versionJson = JSON.parse(readFileSync(versionFile, "utf-8"));
  } catch (error) {
    console.error("Failed to read bundled frontend version:", error);
  }

  if (versionJson) {
    versionJson.frontendDir = bundledDir;
  }

  return versionJson;
}

export function getUserFrontendVersion(): VersionJson | null {
  const frontendDir = getFrontendDir();
  const versionFile = path.join(frontendDir, "version.json");

  let versionJson: VersionJson | null = null;
  try {
    versionJson = JSON.parse(readFileSync(versionFile, "utf-8"));
  } catch (error) {
    console.error("Failed to read user frontend version:", error);
  }

  if (versionJson) {
    versionJson.frontendDir = frontendDir;
  }

  return versionJson;
}

export function compareVersions(a: string, b: string): number {
  return a > b ? 1 : a < b ? -1 : 0;
}

export function isSameHash(a: string, b: string): boolean {
  return a === b;
}

export function getTargetFrontendVersion(): VersionJson | null {
  const bundledVersion = getBundledFrontendVersion();
  if (process.env.ELECTRON_LOCAL_PACKAGE) {
    return bundledVersion;
  }

  const userVersion = getUserFrontendVersion();
  if (!bundledVersion || !userVersion) {
    return bundledVersion || userVersion;
  }

  if (isSameHash(bundledVersion.hash, userVersion.hash)) {
    return bundledVersion;
  }

  if (compareVersions(bundledVersion.version, userVersion.version) < 0) {
    return userVersion;
  }

  return bundledVersion;
}
