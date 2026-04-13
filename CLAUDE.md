# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # start server + web (vite:5173) + Electron concurrently
npm run dev:server     # standalone server only (tsx watch, port 3100)
npm run dev:web        # web frontend only (vite)
npm run build:shared   # build shared package (tsup)
npm run build:server   # build shared + server
npm run build:server:embed  # build shared + server (embedded mode for desk)
npm run build:web      # build shared + web (vite build)
npm run build:web:zip  # build shared + web zip bundle
npm run build:desk     # build desk (electron-vite)
npm run package        # full build + electron-builder packaging
npm run package:local  # same as package, with ELECTRON_LOCAL_PACKAGE=1
npm run test           # vitest run (all packages)
npm run test:watch     # vitest watch
npm run lint           # biome check (lint + format)
npm run lint:fix       # biome check --fix
npm run format         # biome format --fix
```

Run a single test file:
```bash
npx vitest run packages/server/tests/path/to/test.ts
```

Test files live in `packages/*/tests/` mirroring `src/` structure.

## Monorepo Structure

npm workspace with four packages:

```
packages/
├── shared/  # @desk-framework/shared  — Constants and types shared across all packages
├── server/  # @desk-framework/server  — Node.js backend (library + standalone HTTP via Hono)
├── web/     # @desk-framework/web     — React 19 + Tailwind v4 frontend
└── desk/    # @desk-framework/desk    — Electron shell (imports server in-process)
```

- **shared** exports app identity constants (APP_DISPLAY_NAME, APP_SLUG, UI_PROTOCOL, ports, etc.)
- **server** is both a library (imported by Electron) and a standalone HTTP server (port 3100)
- **web** can run against Electron's custom protocol or standalone against the HTTP server
- **desk** is the Electron shell: loads server in-process and serves the web frontend

### Package Dependencies

```
desk → server → shared
web  → shared
```

## Architecture

### Shared (`packages/shared`)

Central constants in `src/index.ts`:
- APP_DISPLAY_NAME, APP_SLUG — app identity
- UI_PROTOCOL — Electron custom protocol for frontend assets
- SERVER_PORT, WEB_DEV_PORT — network configuration
- API_PREFIX, SERVER_BASE_URL — API routing
- UI_ORIGIN, IPC_CHANNEL — Electron communication

### Server (`packages/server`)

Factory pattern: `createApp()` in `src/index.ts` returns an `AppInstance` with settings store and lifecycle hooks.

```
src/
├── index.ts       # createApp() factory, AppInstance type, re-exports
├── config.ts      # ServerConfig with DATA_DIR override support
├── server.ts      # Standalone HTTP server (Hono + @hono/node-server)
├── router.ts      # createRouter() for Hono routes
├── store/
│   └── settings.ts  # Generic conf-based settings store
└── routes/
    ├── index.ts     # Route registration
    ├── health.ts    # Health check endpoint
    ├── settings.ts  # Settings CRUD
    └── types.ts     # Route type definitions
```

### Web (`packages/web`)

```
src/
├── App.tsx        # Main application component
├── main.tsx       # Entry point
├── api/
│   ├── api.ts     # API client
│   ├── adapter.ts # ApiAdapter: auto-detect Electron vs HTTP mode
│   └── fetch.ts   # Fetch utilities
└── styles/
    └── globals.css  # Tailwind global styles
```

**Dual-mode API**: `ApiAdapter` detects `window.electronAPI` at runtime. Electron mode uses custom protocol + IPC; standalone mode uses HTTP REST.

### Desk (`packages/desk`)

Electron shell that imports `createApp` from server:

```
src/
├── main/
│   ├── index.ts         # App lifecycle, protocol registration
│   ├── window.ts        # BrowserWindow creation
│   ├── util.ts          # Utility functions
│   ├── protocol/
│   │   └── index.ts     # Custom protocol handler (UI_PROTOCOL)
│   ├── routes/
│   │   ├── setup.ts     # IPC route setup
│   │   └── app-update.ts  # Auto-update routes
│   └── updater/
│       ├── app-updater.ts      # Electron auto-updater
│       └── frontend-loader.ts  # Frontend bundle loader
├── preload/
│   └── index.ts         # contextBridge → window.electronAPI
└── renderer/
    └── index.html       # Splash/loading page
```

### Communication

| Mode | Frontend | Settings | API |
|------|----------|----------|-----|
| Electron | `{UI_PROTOCOL}://main` (custom protocol) | IPC (`ipcMain.handle`) | IPC via Hono RPC |
| Standalone | `http://localhost:{WEB_DEV_PORT}` | HTTP REST | HTTP REST |

## Code Style

Biome is the single tool for linting and formatting (no ESLint, no Prettier):
- 2-space indent, double quotes, semicolons always, trailing commas, 100-char line width
- `noExplicitAny` is an **error** — avoid `any`; use `unknown` + type guards
- Husky pre-commit hook runs lint-staged (biome check + format on staged `*.{ts,tsx}` and format on `*.{json,css}`)
- Root `tsconfig.json` uses project references to all sub-packages
- CSS: Tailwind v4 with cssModules + `@tailwindcss/vite` plugin

## Release

CI workflow (`.github/workflows/release.yml`) triggers on tag push:

| Tag prefix | Behavior |
|------------|----------|
| `v*` (e.g. `v1.0.5`) | Full build and release: web zip + version.json + Electron desk app |
| `w*` (e.g. `w1.0.5`) | Web only: build and release web zip + version.json |

Manual `workflow_dispatch` is also available for selective publishing.

### Tagging Rules

When asked to create a release tag, determine the correct prefix automatically:

1. Find the latest tag: `git describe --tags --abbrev=0 --match "v*" --match "w*"`
2. Get changed files: `git diff --name-only <lastTag>..HEAD`
3. Choose prefix:
   - All changed files are under `packages/web/` → use `w` prefix (web-only release)
   - Any file outside `packages/web/` is changed → use `v` prefix (full release)
4. Present the result and chosen tag to the user for confirmation before executing
5. If unable to determine (no previous tags, dirty working tree, ambiguous state), ask the user directly
