import { defineConfig } from "electron-vite";
import { loadEnv } from "vite";

const mode = process.env.NODE_ENV === "production" ? "production" : "development";
const env = loadEnv(mode, ".", "");

const githubOwner = process.env.GITHUB_OWNER ?? env.GITHUB_OWNER ?? "";
const githubRepo = process.env.GITHUB_REPO ?? env.GITHUB_REPO ?? "";
const githubReleases =
  githubOwner && githubRepo ? `https://github.com/${githubOwner}/${githubRepo}/releases` : "";

export default defineConfig({
  main: {
    define: {
      "process.env.FRONTEND_BUNDLE_URL": JSON.stringify(
        process.env.FRONTEND_BUNDLE_URL ??
          env.FRONTEND_BUNDLE_URL ??
          (githubReleases ? `${githubReleases}/latest/download/` : ""),
      ),
      "process.env.RELEASE_URL": JSON.stringify(
        process.env.RELEASE_URL ?? env.RELEASE_URL ?? githubReleases,
      ),
      "process.env.WEB_DEV": JSON.stringify(process.env.WEB_DEV ?? env.WEB_DEV ?? ""),
      "process.env.ELECTRON_LOCAL_PACKAGE": JSON.stringify(
        process.env.ELECTRON_LOCAL_PACKAGE ?? env.ELECTRON_LOCAL_PACKAGE ?? "",
      ),
    },
  },
  preload: {
    build: {
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs",
        },
      },
    },
  },
  renderer: {},
});
