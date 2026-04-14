import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { APP_SLUG } from "@desk-framework/shared";
import { app, type BrowserWindow, net } from "electron";
import extract from "extract-zip";
import { compareVersions, getVersionedDir, isSameHash, type VersionJson } from "../util";

interface VersionInfo {
  hash: string;
  zipFileName: string;
  version: string;
}

export interface UpdateInfo {
  hash: string;
  zipFileName: string;
  zipUrl: string;
  version: string;
}

export type ProgressStatus = {
  stage: "checking" | "downloading" | "extracting" | "loading";
  message: string;
  progress: number;
};

export type ProgressCallback = (status: ProgressStatus) => void;

const TAG = "[frontend-loader]";

export function loadSplash(win: BrowserWindow): void {
  win.loadFile(path.join(__dirname, "../../renderer/index.html"));
}

function getBaseUrl(): string | null {
  const url = process.env.FRONTEND_BUNDLE_URL;
  return url ? url.replace(/\/$/, "") : null;
}

export async function checkForUpdate(
  targetFrontendVersion: VersionJson | null,
): Promise<UpdateInfo | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  try {
    const versionUrl = `${baseUrl}/version.json?t=${Date.now()}`;
    console.log(`${TAG} Checking for updates: ${versionUrl}`);

    const res = await fetch(versionUrl, {
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.log(`${TAG} Version check returned ${res.status}, skipping`);
      return null;
    }

    const remote: VersionInfo = (await res.json()) as VersionInfo;

    const activeVersion = targetFrontendVersion;
    if (activeVersion) {
      if (isSameHash(activeVersion.hash, remote.hash)) {
        return null;
      }

      if (compareVersions(remote.version, activeVersion.version) > 0) {
        console.log(
          `${TAG} Update available: ${activeVersion.version ?? "none"} → ${remote.version}`,
        );
        return {
          hash: remote.hash,
          zipFileName: remote.zipFileName,
          zipUrl: `${baseUrl}/${remote.zipFileName}`,
          version: remote.version,
        };
      }

      return null;
    }

    console.log(`${TAG} Update available: ${remote.version}`);

    return {
      hash: remote.hash,
      zipFileName: remote.zipFileName,
      zipUrl: `${baseUrl}/${remote.zipFileName}`,
      version: remote.version,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.startsWith("HTTP ")) {
      console.error(`${TAG} Update check failed:`, err);
    }
    return null;
  }
}

const STALL_TIMEOUT_MS = 30_000;

export async function downloadUpdate(
  info: UpdateInfo,
  onProgress?: ProgressCallback,
): Promise<void> {
  const report = (stage: ProgressStatus["stage"], message: string, progress: number) =>
    onProgress?.({ stage, message, progress });

  report("downloading", "正在下载更新...", 0);

  const tmpDir = path.join(app.getPath("temp"), `${APP_SLUG}-update`);
  const tmpZip = path.join(tmpDir, info.zipFileName);

  const controller = new AbortController();
  let stallTimer: ReturnType<typeof setTimeout> | undefined;

  const resetStallTimer = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
  };

  try {
    resetStallTimer();
    const zipRes = await net.fetch(info.zipUrl, { signal: controller.signal });
    if (!zipRes.ok || !zipRes.body) {
      throw new Error(`Download failed: ${zipRes.status}`);
    }

    const totalBytes = Number(zipRes.headers.get("content-length")) || 0;
    let downloadedBytes = 0;

    await mkdir(tmpDir, { recursive: true });

    const fileStream = createWriteStream(tmpZip);

    const reader = zipRes.body.getReader();
    while (true) {
      resetStallTimer();
      const { done, value } = await reader.read();
      if (done) break;
      downloadedBytes += value.length;
      const progress = totalBytes > 0 ? downloadedBytes / totalBytes : -1;
      const pct = progress >= 0 ? ` (${Math.round(progress * 100)}%)` : "";
      report("downloading", `正在下载更新${pct}`, progress);
      await new Promise<void>((resolve, reject) =>
        fileStream.write(value, (err) => (err ? reject(err) : resolve())),
      );
    }
    await new Promise<void>((resolve, reject) =>
      fileStream.end((err: Error | null | undefined) => (err ? reject(err) : resolve())),
    );
  } finally {
    clearTimeout(stallTimer);
  }

  console.log(`${TAG} Downloaded ${info.zipFileName}`);

  report("extracting", "正在安装更新...", -1);

  const versionedDir = getVersionedDir(info.hash);
  await rm(versionedDir, { recursive: true, force: true });
  await mkdir(versionedDir, { recursive: true });

  try {
    await extract(tmpZip, { dir: versionedDir });
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }

  try {
    const raw = await readFile(path.join(versionedDir, "version.json"), "utf-8");
    const parsed = JSON.parse(raw) as VersionInfo;
    if (parsed.hash !== info.hash) {
      throw new Error("version.json hash does not match expected update");
    }
  } catch {
    await rm(versionedDir, { recursive: true, force: true });
    throw new Error(`${TAG} Extracted frontend is invalid: version.json missing or corrupt`);
  }

  console.log(`${TAG} Updated to ${info.version}`);
}
