import { contextBridge, ipcRenderer, webUtils } from "electron";

import type { AdminStatus } from "@/lib/admin";
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
  removeDocument: (documentId: string) => Promise<LibraryResponse>;
  adminStatus: () => Promise<AdminStatus>;
  adminSetup: (password: string) => Promise<AdminStatus>;
  adminLogin: (password: string) => Promise<boolean>;
  adminLogout: () => Promise<AdminStatus>;
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
  removeDocument: (documentId) =>
    ipcRenderer.invoke("library:remove", documentId),
  adminStatus: () => ipcRenderer.invoke("admin:status"),
  adminSetup: (password) => ipcRenderer.invoke("admin:setup", password),
  adminLogin: (password) => ipcRenderer.invoke("admin:login", password),
  adminLogout: () => ipcRenderer.invoke("admin:logout"),
  ask: (question) => ipcRenderer.invoke("ask", question),
  pathForFile: (file) => webUtils.getPathForFile(file),
};

contextBridge.exposeInMainWorld("smartsearch", api);
