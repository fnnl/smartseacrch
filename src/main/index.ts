import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";

import { answerQuestion } from "@/lib/answer";
import { filesFromPaths } from "@/lib/from-disk";
import { ingestIncomingFiles } from "@/lib/ingest";
import { buildSampleFiles } from "@/lib/sample-docs";
import {
  clearStore,
  configuredAnswerMode,
  loadStore,
  removeDocument,
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
    width: 1220,
    height: 800,
    minWidth: 720,
    minHeight: 560,
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

  ipcMain.handle("library:remove", async (_event, id: string) =>
    libraryFromStore(await removeDocument(id)),
  );

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

  ipcMain.handle("ask", async (_event, question: string) => {
    const trimmed = question.trim();
    if (!trimmed) {
      return { error: "Bitte eine Frage eingeben." };
    }
    const store = await loadStore();
    if (!store.chunks.length) {
      return {
        error:
          "Es sind noch keine Dokumente indexiert. Wähle zuerst Dateien oder einen Ordner.",
      };
    }
    return answerQuestion(store.chunks, trimmed);
  });
}

app.whenReady().then(async () => {
  setDataDir(path.join(app.getPath("userData"), "data"));
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
