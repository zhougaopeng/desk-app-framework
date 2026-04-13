import { IPC_CHANNEL } from "@desk-framework/shared";
import { createRouter, type AppInstance } from "@desk-framework/server";
import { ipcMain } from "electron";
import { registerAppUpdateRoutes } from "./app-update";

export function setupRoutes(serverApp: AppInstance<any>) {
  const router = createRouter(serverApp);

  router.onError((err, c) => {
    console.error("[desk] Route handler error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  });

  registerAppUpdateRoutes(router);

  ipcMain.handle(
    IPC_CHANNEL,
    async (
      _,
      url: string,
      init?: { method?: string; headers?: [string, string][]; body?: string },
    ) => {
      const response = await router.request(url, {
        method: init?.method,
        headers: init?.headers,
        body: init?.body,
      });
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("json")
        ? await response.json()
        : await response.text();
      return { status: response.status, data };
    },
  );
}
