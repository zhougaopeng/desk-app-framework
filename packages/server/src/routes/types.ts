import type { Hono } from "hono";
import type { AppInstance } from "../index";

export type RouteDef = {
  register: (hono: Hono, app: AppInstance<any>) => void;
};
