import { createFetch, type FetchFn } from "./fetch";

export interface Api {
  settings: {
    get(): Promise<Record<string, unknown>>;
    set(key: string, value: unknown): Promise<void>;
  };
}

export function createApi(fetchFn: FetchFn = createFetch()): Api {
  return {
    settings: {
      get: () => fetchFn("/settings").then((r) => r.json()) as Promise<Record<string, unknown>>,
      set: (key, value) =>
        fetchFn("/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        }).then(() => {}),
    },
  };
}

export const api: Api = createApi();
