import { homedir } from "node:os";
import { join } from "node:path";
import { APP_SLUG, SERVER_PORT } from "@desk-framework/shared";

export interface ServerConfig {
  dataDir: string;
  port: number;
}

export function getDefaultConfig(): ServerConfig {
  return {
    dataDir: join(homedir(), `.${APP_SLUG}`),
    port: SERVER_PORT,
  };
}
