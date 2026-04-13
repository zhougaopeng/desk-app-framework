import { APP_SLUG } from "@desk-framework/shared";
import Conf from "conf";

export function createSettingsStore<TSettings extends Record<string, unknown>>(
  dataDir: string,
  defaults: TSettings,
  projectName = APP_SLUG,
): Conf<TSettings> {
  return new Conf<TSettings>({
    projectName,
    cwd: dataDir,
    defaults,
  });
}

export function getSettings<TSettings extends Record<string, unknown>>(
  settingsStore: Conf<TSettings>,
): TSettings {
  return settingsStore.store;
}

export function updateSetting<TSettings extends Record<string, unknown>>(
  settingsStore: Conf<TSettings>,
  key: string,
  value: unknown,
): TSettings {
  settingsStore.set(key, value);
  return settingsStore.store;
}
