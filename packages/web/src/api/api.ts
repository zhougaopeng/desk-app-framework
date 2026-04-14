import { createFetch, type FetchFn } from "./fetch";

export interface Api {
  settings: {
    get(): Promise<Record<string, unknown>>;
    set(key: string, value: unknown): Promise<void>;
  };
}

async function assertOk(res: Response): Promise<Response> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status})${body ? `: ${body}` : ""}`);
  }
  return res;
}

export function createApi(fetchFn: FetchFn = createFetch()): Api {
  return {
    settings: {
      get: () =>
        fetchFn("/settings")
          .then(assertOk)
          .then((r) => r.json()) as Promise<Record<string, unknown>>,
      set: (key, value) =>
        fetchFn("/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        }).then(assertOk).then(() => {}),
    },
  };
}

export const api: Api = createApi();
