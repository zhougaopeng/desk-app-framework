import { getSettings, updateSetting } from "../store/settings";
import type { RouteDef } from "./types";

export const settingsRoute: RouteDef = {
  register(hono, app) {
    hono.get("/settings", (c) => {
      return c.json(getSettings(app.settingsStore));
    });

    hono.post("/settings", async (c) => {
      const body = await c.req.json<{ key: string; value: unknown }>();
      const store = updateSetting(app.settingsStore, body.key, body.value);
      return c.json(store);
    });
  },
};
