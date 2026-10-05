import { app, BrowserWindow, dialog, ipcMain, screen } from "electron";
import path from "node:path";

import { answerQuestion } from "@/lib/answer";
import {
  adminStatus,
  lockAdmin,
  requireAdmin,
  setAdminDir,
  setupAdminPassword,
  unlockAdmin,
} from "@/lib/admin";
import {
  clearLogo,
  loadBranding,
  saveLogoFromPath,
  setBrandingDir,
} from "@/lib/branding";
import { filesFromPaths } from "@/lib/from-disk";
import { ingestIncomingFiles } from "@/lib/ingest";
import { buildSampleFiles } from "@/lib/sample-docs";
import {
  createChat,
  deleteChat,
  loadChats,
  saveChat,
  selectChat,
  setChatsDir,
} from "@/lib/chats";
import {
  clearStore,
  configuredAnswerMode,
  loadStore,
  removeDocument,
  setDataDir,
} from "@/lib/store";
import type { ChatSession, IngestResponse, LibraryResponse } from "@/lib/types";

function libraryFromStore(
  store: Awaited<ReturnType<typeof loadStore>>,
): LibraryResponse {
  return {
    documents: store.documents,
    chunkCount: store.chunks.length,
    answerMode: configuredAnswerMode(),
  };
}

function initialWindowBounds(): { width: number; height: number } {
  const { width: areaWidth, height: areaHeight } =
    screen.getPrimaryDisplay().workAreaSize;
  return {
    width: Math.min(areaWidth, Math.max(720, Math.round(areaWidth * 0.9))),
    height: Math.min(areaHeight, Math.max(560, Math.round(areaHeight * 0.9))),
  };
}

async function createWindow(): Promise<void> {
  const { width, height } = initialWindowBounds();
  const window = new BrowserWindow({
    width,
    height,
    minWidth: 560,
    minHeight: 480,
    title: "SmartSeacrch",
    backgroundColor: "#f5f6f8",
    autoHideMenuBar: true,
    show: false,
    resizable: true,
    maximizable: true,
    useContentSize: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function registerIpc(): void {
  ipcMain.handle("library:get", async () => libraryFromStore(await loadStore()));

  ipcMain.handle("library:clear", async () => {
    requireAdmin();
    return libraryFromStore(await clearStore());
  });

  ipcMain.handle("library:remove", async (_event, documentId: string) => {
    requireAdmin();
    return libraryFromStore(await removeDocument(documentId));
  });

  ipcMain.handle("ingest:paths", async (_event, paths: string[]) => {
    requireAdmin();
    const files = await filesFromPaths(paths);
    if (!files.length) {
      const store = await loadStore();
      return {
        documents: store.documents,
        added: [],
        skipped: [
          {
            name: paths[0] ?? "Auswahl",
            reason: "Keine .docx-, .pdf- oder .txt-Datei gefunden.",
          },
        ],
        chunkCount: store.chunks.length,
      } satisfies IngestResponse;
    }
    return ingestIncomingFiles(files);
  });

  ipcMain.handle("ingest:pick-files", async () => {
    requireAdmin();
    const picked = await dialog.showOpenDialog({
      title: "Dokumente wählen",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Dokumente", extensions: ["docx", "pdf", "txt", "md"] },
        { name: "Alle Dateien", extensions: ["*"] },
      ],
    });
    if (picked.canceled || !picked.filePaths.length) return null;
    return ingestIncomingFiles(await filesFromPaths(picked.filePaths));
  });

  ipcMain.handle("ingest:pick-folder", async () => {
    requireAdmin();
    const picked = await dialog.showOpenDialog({
      title: "Ordner mit Handbüchern wählen",
      properties: ["openDirectory"],
    });
    if (picked.canceled || !picked.filePaths[0]) return null;
    return ingestIncomingFiles(await filesFromPaths(picked.filePaths));
  });

  ipcMain.handle("ingest:sample", async () => {
    requireAdmin();
    const samples = await buildSampleFiles();
    return ingestIncomingFiles(
      samples.map((file) => ({
        name: file.name,
        displayPath: file.name,
        size: file.bytes.byteLength,
        bytes: file.bytes,
      })),
    );
  });

  ipcMain.handle("admin:status", async () => adminStatus());

  ipcMain.handle("admin:setup", async (_event, password: string) =>
    setupAdminPassword(typeof password === "string" ? password : ""),
  );

  ipcMain.handle("admin:login", async (_event, password: string) =>
    unlockAdmin(typeof password === "string" ? password : ""),
  );

  ipcMain.handle("admin:logout", async () => {
    lockAdmin();
    return adminStatus();
  });

  ipcMain.handle("branding:get", async () => loadBranding());

  ipcMain.handle("branding:pick", async () => {
    requireAdmin();
    const picked = await dialog.showOpenDialog({
      title: "Firmenlogo wählen",
      properties: ["openFile"],
      filters: [
        {
          name: "Bilder",
          extensions: ["png", "jpg", "jpeg", "webp", "gif", "svg"],
        },
      ],
    });
    if (picked.canceled || !picked.filePaths[0]) return null;
    return saveLogoFromPath(picked.filePaths[0]);
  });

  ipcMain.handle("branding:clear", async () => {
    requireAdmin();
    return clearLogo();
  });

  ipcMain.handle("chats:load", async () => loadChats());

  ipcMain.handle("chats:create", async () => createChat());

  ipcMain.handle("chats:select", async (_event, id: string) =>
    selectChat(typeof id === "string" ? id : ""),
  );

  ipcMain.handle("chats:save", async (_event, chat: ChatSession) =>
    saveChat(chat),
  );

  ipcMain.handle("chats:delete", async (_event, id: string) =>
    deleteChat(typeof id === "string" ? id : ""),
  );

  ipcMain.handle("ask", async (_event, question: string) => {
    const trimmed = question.trim();
    if (!trimmed) {
      return { error: "Bitte eine Frage eingeben." };
    }
    const store = await loadStore();
    if (!store.chunks.length) {
      return {
        error:
          "Es sind noch keine Unterlagen hinterlegt. Die Verwaltung legt sie an.",
      };
    }
    return answerQuestion(store.chunks, trimmed);
  });
}

app.whenReady().then(async () => {
  const dataDir = path.join(app.getPath("userData"), "data");
  setDataDir(dataDir);
  setBrandingDir(dataDir);
  setAdminDir(dataDir);
  setChatsDir(dataDir);
  registerIpc();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
