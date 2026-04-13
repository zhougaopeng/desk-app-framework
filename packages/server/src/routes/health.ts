import type { RouteDef } from "./types";

export const healthRoute: RouteDef = {
  register(hono) {
    hono.get("/health", (c) => c.text("ok"));
  },
};
