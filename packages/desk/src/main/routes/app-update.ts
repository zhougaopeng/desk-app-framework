import type { Hono } from "hono";
import { checkForAppUpdate } from "../updater/app-updater";

export function registerAppUpdateRoutes(router: Hono) {
  router.post("/app-update/check", (c) => {
    checkForAppUpdate(true);
    return c.json({ ok: true });
  });
}
