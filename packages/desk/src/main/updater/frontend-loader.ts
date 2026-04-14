import { createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { APP_SLUG } from "@desk-framework/shared";
import { app, type BrowserWindow, net } from "electron";
import extract from "extract-zip";
import { compareVersions, getFrontendDir, isSameHash, type VersionJson } from "../util";

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

export async function downloadUpdate(
  info: UpdateInfo,
  onProgress?: ProgressCallback,
): Promise<void> {
  const report = (stage: ProgressStatus["stage"], message: string, progress: number) =>
    onProgress?.({ stage, message, progress });

  report("downloading", "正在下载更新...", 0);

  const zipRes = await net.fetch(info.zipUrl);
  if (!zipRes.ok || !zipRes.body) {
    throw new Error(`Download failed: ${zipRes.status}`);
  }

  const totalBytes = Number(zipRes.headers.get("content-length")) || 0;
  let downloadedBytes = 0;

  const tmpDir = path.join(app.getPath("temp"), `${APP_SLUG}-update`);
  const tmpZip = path.join(tmpDir, info.zipFileName);
  await mkdir(tmpDir, { recursive: true });

  const fileStream = createWriteStream(tmpZip);

  const reader = zipRes.body.getReader();
  while (true) {
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

  console.log(`${TAG} Downloaded ${info.zipFileName}`);

  report("extracting", "正在安装更新...", -1);

  const targetDir = getFrontendDir();
  const stagingDir = `${targetDir}-staging`;
  const backupDir = `${targetDir}-old`;

  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });

  try {
    await extract(tmpZip, { dir: stagingDir });
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }

  await rm(backupDir, { recursive: true, force: true });
  try {
    await rename(targetDir, backupDir);
  } catch {
    // targetDir may not exist on first install
  }
  await rename(stagingDir, targetDir);
  await rm(backupDir, { recursive: true, force: true }).catch(() => {});

  console.log(`${TAG} Updated to ${info.version}`);
}
