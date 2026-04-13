import type Conf from "conf";
import { type ServerConfig, getDefaultConfig } from "./config";
import { createSettingsStore } from "./store/settings";

export interface AppInstance<TSettings extends Record<string, unknown> = Record<string, unknown>> {
  readonly settingsStore: Conf<TSettings>;
  cleanup: () => Promise<void>;
  rebuild: () => Promise<void>;
}

export interface CreateAppOptions<TSettings extends Record<string, unknown>> {
  config?: Partial<ServerConfig>;
  defaults: TSettings;
  projectName?: string;
  /** Called after settingsStore is created; use to perform app-specific initialization. */
  onInit?: (ctx: { settingsStore: Conf<TSettings>; config: ServerConfig }) => Promise<void>;
  /** Called on rebuild; use to reinitialize resources when settings change. */
  onRebuild?: (ctx: { settingsStore: Conf<TSettings>; config: ServerConfig }) => Promise<void>;
  /** Called on cleanup; use to release resources. */
  onCleanup?: (ctx: { settingsStore: Conf<TSettings>; config: ServerConfig }) => Promise<void>;
}

export async function createApp<TSettings extends Record<string, unknown>>(
  options: CreateAppOptions<TSettings>,
): Promise<AppInstance<TSettings>> {
  const cfg = { ...getDefaultConfig(), ...options.config };
  const settingsStore = createSettingsStore<TSettings>(
    cfg.dataDir,
    options.defaults,
    options.projectName,
  );

  const ctx = { settingsStore, config: cfg };

  await options.onInit?.(ctx);

  const app: AppInstance<TSettings> = {
    settingsStore,
    cleanup: async () => {
      await options.onCleanup?.(ctx);
    },
    rebuild: async () => {
      await options.onRebuild?.(ctx);
    },
  };

  return app;
}

export { createRouter } from "./router";

