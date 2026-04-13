export { createFetch, type FetchFn } from "./fetch";
export { api, type Api } from "./api";

export const isElectron = typeof window !== "undefined" && "electronAPI" in window;
