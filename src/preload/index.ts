import { contextBridge, ipcRenderer, webUtils } from "electron";

import type { AdminStatus } from "@/lib/admin";
import type { Branding } from "@/lib/branding";
import type {
  AskResponse,
  ChatSession,
  ChatsSnapshot,
  IngestResponse,
  LibraryLocation,
  LibraryPackResult,
  LibraryResponse,
  SourceHit,
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
  loadChats: () => Promise<ChatsSnapshot>;
  createChat: () => Promise<ChatsSnapshot>;
  selectChat: (id: string) => Promise<ChatsSnapshot>;
  saveChat: (chat: ChatSession) => Promise<ChatsSnapshot>;
  deleteChat: (id: string) => Promise<ChatsSnapshot>;
  openSource: (
    source: SourceHit,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  libraryLocation: () => Promise<LibraryLocation>;
  openLibraryFolder: () => Promise<LibraryPackResult>;
  exportLibrary: () => Promise<LibraryPackResult | null>;
  importLibrary: () => Promise<IngestResponse | null>;
  copyLibraryFolder: () => Promise<LibraryPackResult | null>;
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
  loadChats: () => ipcRenderer.invoke("chats:load"),
  createChat: () => ipcRenderer.invoke("chats:create"),
  selectChat: (id) => ipcRenderer.invoke("chats:select", id),
  saveChat: (chat) => ipcRenderer.invoke("chats:save", chat),
  deleteChat: (id) => ipcRenderer.invoke("chats:delete", id),
  openSource: (source) => ipcRenderer.invoke("source:open", source),
  libraryLocation: () => ipcRenderer.invoke("library:location"),
  openLibraryFolder: () => ipcRenderer.invoke("library:open-folder"),
  exportLibrary: () => ipcRenderer.invoke("library:export"),
  importLibrary: () => ipcRenderer.invoke("library:import"),
  copyLibraryFolder: () => ipcRenderer.invoke("library:copy-folder"),
  pathForFile: (file) => webUtils.getPathForFile(file),
};

contextBridge.exposeInMainWorld("smartsearch", api);
