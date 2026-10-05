import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { shell } from "electron";

import { loadStore } from "@/lib/store";
import type { SourceHit } from "@/lib/types";

const execFileAsync = promisify(execFile);

export type OpenSourceResult =
  | { ok: true }
  | { ok: false; error: string };

export async function openSourceHit(
  hit: Partial<SourceHit> | null | undefined,
): Promise<OpenSourceResult> {
  const fileName =
    (typeof hit?.fileName === "string" && hit.fileName) || "Datei";
  const resolved = await resolveSourcePath(hit);
  if (!resolved.path) {
    return {
      ok: false,
      error:
        `Die Originaldatei „${fileName}“ ist auf diesem Rechner nicht hinterlegt. ` +
        "Die Verwaltung muss die Datei erneut einlesen, dann öffnet ein Klick die Stelle.",
    };
  }

  try {
    await access(resolved.path, constants.R_OK);
  } catch {
    return {
      ok: false,
      error:
        `Die Datei „${fileName}“ fehlt oder wurde verschoben:\n${resolved.path}`,
    };
  }

  const ext = path.extname(resolved.path).toLowerCase();
  if (ext === ".pdf" && resolved.page && resolved.page > 0) {
    const jumped = await openPdfAtPage(resolved.path, resolved.page);
    if (jumped) return { ok: true };
  }

  const openError = await shell.openPath(resolved.path);
  if (openError) {
    return {
      ok: false,
      error: `Die Datei „${fileName}“ konnte nicht geöffnet werden. ${openError}`.trim(),
    };
  }
  return { ok: true };
}

async function resolveSourcePath(
  hit: Partial<SourceHit> | null | undefined,
): Promise<{ path?: string; page?: number }> {
  const store = await loadStore();
  const byId = hit?.documentId
    ? store.documents.find((doc) => doc.id === hit.documentId)
    : undefined;
  const byName = hit?.fileName
    ? store.documents.find((doc) => doc.fileName === hit.fileName)
    : undefined;
  const document = byId ?? byName;
  const chunk =
    document && typeof hit?.chunkIndex === "number"
      ? store.chunks.find(
          (item) =>
            item.documentId === document.id && item.index === hit.chunkIndex,
        )
      : undefined;

  const sourcePath =
    (typeof hit?.sourcePath === "string" && hit.sourcePath) ||
    chunk?.sourcePath ||
    document?.sourcePath;
  const page = hit?.page ?? chunk?.page;
  return { path: sourcePath, page };
}

async function openPdfAtPage(filePath: string, page: number): Promise<boolean> {
  const url = `${pathToFileURL(filePath).href}#page=${page}`;
  if (process.platform === "win32") {
    try {
      await execFileAsync(
        "cmd.exe",
        ["/c", "start", "", url],
        { windowsHide: true },
      );
      return true;
    } catch {
      // fall through
    }
  }
  try {
    await shell.openExternal(url);
    return true;
  } catch {
    return false;
  }
}
