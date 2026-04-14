import { readdirSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { app } from "electron";

/** Parent directory for versioned user frontends: `userData/frontend/<hash>/` */
export function getFrontendBaseDir(): string {
  return path.join(app.getPath("userData"), "frontend");
}

export function getVersionedDir(hash: string): string {
  return path.join(getFrontendBaseDir(), hash);
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

function isResolvedUnderBase(resolvedDir: string, resolvedBase: string): boolean {
  return resolvedDir === resolvedBase || resolvedDir.startsWith(`${resolvedBase}${path.sep}`);
}

/** True when the active frontend files live under `userData/frontend/<hash>/`. */
export function isUserFrontendDir(frontendDir: string): boolean {
  const base = path.resolve(getFrontendBaseDir());
  const resolved = path.resolve(frontendDir);
  return isResolvedUnderBase(resolved, base);
}

function pickBetterUserVersion(a: VersionJson, b: VersionJson): VersionJson {
  return compareVersions(a.version, b.version) > 0 ? a : b;
}

export function getUserFrontendVersion(): VersionJson | null {
  const baseDir = getFrontendBaseDir();
  let names: string[];
  try {
    names = readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return null;
  }

  let best: VersionJson | null = null;
  for (const name of names) {
    const dir = path.join(baseDir, name);
    try {
      const raw = readFileSync(path.join(dir, "version.json"), "utf-8");
      const v = JSON.parse(raw) as VersionJson;
      if (typeof v.hash !== "string" || typeof v.version !== "string") continue;
      if (name !== v.hash) continue;
      v.frontendDir = dir;
      best = best ? pickBetterUserVersion(v, best) : v;
    } catch {
      // skip corrupt or incomplete installs
    }
  }
  return best;
}

/**
 * Remove unused version directories under `userData/frontend/`.
 * @param keepHash — directory name to keep; `null` removes all (e.g. bundled is active).
 */
export async function cleanupOldVersions(keepHash: string | null): Promise<void> {
  const baseDir = getFrontendBaseDir();
  let names: string[];
  try {
    names = readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return;
  }

  for (const name of names) {
    if (keepHash !== null && name === keepHash) continue;
    await rm(path.join(baseDir, name), { recursive: true, force: true });
  }
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
