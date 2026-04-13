import { healthRoute } from "./health";
import { settingsRoute } from "./settings";
import type { RouteDef } from "./types";

export const routeConfig: RouteDef[] = [healthRoute, settingsRoute];

export type { RouteDef } from "./types";
