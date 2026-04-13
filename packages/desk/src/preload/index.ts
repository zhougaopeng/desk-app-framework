import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  ipc: {
    invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, cb: (...args: unknown[]) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, ...args: unknown[]) => cb(...args);
      ipcRenderer.on(channel, listener);
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
