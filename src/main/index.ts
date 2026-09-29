import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";

import { answerQuestion } from "@/lib/answer";
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
  clearStore,
  configuredAnswerMode,
  loadStore,
  setDataDir,
} from "@/lib/store";
import type { IngestResponse, LibraryResponse } from "@/lib/types";

function libraryFromStore(
  store: Awaited<ReturnType<typeof loadStore>>,
): LibraryResponse {
  return {
    documents: store.documents,
    chunkCount: store.chunks.length,
    answerMode: configuredAnswerMode(),
  };
}

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 860,
    minHeight: 640,
    title: "SmartSeacrch",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function registerIpc(): void {
  ipcMain.handle("library:get", async () => libraryFromStore(await loadStore()));

  ipcMain.handle("library:clear", async () =>
    libraryFromStore(await clearStore()),
  );

  ipcMain.handle("ingest:paths", async (_event, paths: string[]) => {
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
    const picked = await dialog.showOpenDialog({
      title: "Ordner mit Handbüchern wählen",
      properties: ["openDirectory"],
    });
    if (picked.canceled || !picked.filePaths[0]) return null;
    return ingestIncomingFiles(await filesFromPaths(picked.filePaths));
  });

  ipcMain.handle("ingest:sample", async () => {
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

  ipcMain.handle("branding:get", async () => loadBranding());

  ipcMain.handle("branding:pick", async () => {
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

  ipcMain.handle("branding:clear", async () => clearLogo());

  ipcMain.handle("ask", async (_event, question: string) => {
    const trimmed = question.trim();
    if (!trimmed) {
      return { error: "Bitte eine Frage eingeben." };
    }
    const store = await loadStore();
    if (!store.chunks.length) {
      return {
        error:
          "Es sind noch keine Unterlagen indexiert. Wähle zuerst Dateien oder einen Ordner.",
      };
    }
    return answerQuestion(store.chunks, trimmed);
  });
}

app.whenReady().then(async () => {
  const dataDir = path.join(app.getPath("userData"), "data");
  setDataDir(dataDir);
  setBrandingDir(dataDir);
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
