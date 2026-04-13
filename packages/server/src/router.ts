import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppInstance } from "./index";
import { routeConfig } from "./routes";

export function createRouter(app: AppInstance<any>): Hono {
  const hono = new Hono();

  hono.use("*", cors());

  for (const def of routeConfig) {
    def.register(hono, app);
  }

  return hono;
}
