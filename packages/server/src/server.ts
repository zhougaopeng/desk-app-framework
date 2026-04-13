import { API_PREFIX, APP_DISPLAY_NAME, SERVER_PORT } from "@desk-framework/shared";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createApp, type CreateAppOptions } from "./index";
import { createRouter } from "./router";

const PORT = SERVER_PORT;

const defaultSettings = {
  example: {
    greeting: `Hello from ${APP_DISPLAY_NAME}!`,
  },
};

type ExampleSettings = typeof defaultSettings;

const appOptions: CreateAppOptions<ExampleSettings> = {
  defaults: defaultSettings,
  config: process.env.DATA_DIR ? { dataDir: process.env.DATA_DIR } : {},
};

async function main() {
  console.log("[server] Starting server...");
  const app = await createApp(appOptions);
  console.log("[server] App initialized");

  const hono = new Hono();
  hono.route(API_PREFIX, createRouter(app));

  serve({ fetch: hono.fetch, port: PORT }, (info) => {
    console.log(`[server] HTTP API on http://localhost:${info.port}`);
  });

  process.on("SIGINT", async () => {
    await app.cleanup();
    process.exit(0);
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled promise rejection (process kept alive):", reason);
});

main().catch(console.error);
