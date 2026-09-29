import { contextBridge, ipcRenderer, webUtils } from "electron";

import type { Branding } from "@/lib/branding";
import type {
  AskResponse,
  IngestResponse,
  LibraryResponse,
} from "@/lib/types";

export type SmartsearchApi = {
  getLibrary: () => Promise<LibraryResponse>;
  pickFiles: () => Promise<IngestResponse | null>;
  pickFolder: () => Promise<IngestResponse | null>;
  ingestPaths: (paths: string[]) => Promise<IngestResponse>;
  loadSample: () => Promise<IngestResponse>;
  clear: () => Promise<LibraryResponse>;
  getBranding: () => Promise<Branding>;
  pickLogo: () => Promise<Branding | null>;
  clearLogo: () => Promise<Branding>;
  ask: (
    question: string,
  ) => Promise<AskResponse & { error?: string }>;
  pathForFile: (file: File) => string;
};

const api: SmartsearchApi = {
  getLibrary: () => ipcRenderer.invoke("library:get"),
  pickFiles: () => ipcRenderer.invoke("ingest:pick-files"),
  pickFolder: () => ipcRenderer.invoke("ingest:pick-folder"),
  ingestPaths: (paths) => ipcRenderer.invoke("ingest:paths", paths),
  loadSample: () => ipcRenderer.invoke("ingest:sample"),
  clear: () => ipcRenderer.invoke("library:clear"),
  getBranding: () => ipcRenderer.invoke("branding:get"),
  pickLogo: () => ipcRenderer.invoke("branding:pick"),
  clearLogo: () => ipcRenderer.invoke("branding:clear"),
  ask: (question) => ipcRenderer.invoke("ask", question),
  pathForFile: (file) => webUtils.getPathForFile(file),
};

contextBridge.exposeInMainWorld("smartsearch", api);
