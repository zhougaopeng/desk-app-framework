import { IPC_CHANNEL, SERVER_BASE_URL } from "@desk-framework/shared";

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

const isElectron = typeof window !== "undefined" && "electronAPI" in window;

const useIpc =
  isElectron && typeof window !== "undefined" && window.location.protocol !== "http:";

function createIpcFetch(): FetchFn {
  return async (input, init) => {
    const ipcInit = init
      ? {
          method: init.method,
          headers: init.headers
            ? [...new Headers(init.headers as HeadersInit).entries()]
            : undefined,
          body: typeof init.body === "string" ? init.body : undefined,
        }
      : undefined;

    const result = (await window.electronAPI.ipc.invoke(IPC_CHANNEL, input, ipcInit)) as {
      status: number;
      data: unknown;
    };

    const body = typeof result.data === "string" ? result.data : JSON.stringify(result.data);
    return new Response(body, {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  };
}

function createHttpFetch(): FetchFn {
  return (input, init) => fetch(`${SERVER_BASE_URL}${input}`, init);
}

export function createFetch(): FetchFn {
  return useIpc ? createIpcFetch() : createHttpFetch();
}
