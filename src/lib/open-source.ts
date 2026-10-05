import { spawn } from "node:child_process";
import { constants, existsSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { BrowserWindow, shell } from "electron";

import { resolveSourceFromStore } from "@/lib/resolve-source";
import { loadStore } from "@/lib/store";
import type { SourceHit } from "@/lib/types";

export type OpenSourceResult =
  | { ok: true }
  | { ok: false; error: string };

export async function openSourceHit(
  hit: Partial<SourceHit> | null | undefined,
): Promise<OpenSourceResult> {
  const fileName =
    (typeof hit?.fileName === "string" && hit.fileName) || "Datei";
  const store = await loadStore();
  const resolved = resolveSourceFromStore(store, hit);
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
  const passage = typeof hit?.passage === "string" ? hit.passage : undefined;

  if (ext === ".pdf" && resolved.page && resolved.page > 0) {
    if (openPdfAtPage(resolved.path, resolved.page)) return { ok: true };
  }

  if ((ext === ".txt" || ext === ".md") && passage) {
    if (await openTextAtPassage(resolved.path, passage)) return { ok: true };
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

function openPdfAtPage(filePath: string, page: number): boolean {
  const url = `${pathToFileURL(filePath).href}#page=${page}`;
  if (process.platform === "win32") {
    return spawnDetached("cmd.exe", ["/c", "start", "", url]);
  }
  if (process.platform === "darwin") {
    return spawnDetached("open", [url]) || spawnDetached("open", [filePath]);
  }
  const chrome = whichSync([
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
  ]);
  if (chrome && spawnDetached(chrome, ["--new-window", url])) return true;
  if (spawnDetached("xdg-open", [url])) return true;
  return spawnDetached("xdg-open", [filePath]);
}

async function openTextAtPassage(
  filePath: string,
  passage: string,
): Promise<boolean> {
  try {
    const raw = await readFile(filePath, "utf8");
    const html = textPreviewHtml(path.basename(filePath), filePath, raw, passage);
    const window = new BrowserWindow({
      width: 780,
      height: 720,
      minWidth: 420,
      minHeight: 360,
      title: path.basename(filePath),
      autoHideMenuBar: true,
      backgroundColor: "#f5f6f8",
    });
    await window.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
    );
    window.show();
    return true;
  } catch {
    return false;
  }
}

function textPreviewHtml(
  fileName: string,
  filePath: string,
  raw: string,
  passage: string,
): string {
  const range = findPassageRange(raw, passage);
  let body: string;
  if (range) {
    body =
      escapeHtml(raw.slice(0, range.start)) +
      `<mark id="passage">${escapeHtml(raw.slice(range.start, range.end))}</mark>` +
      escapeHtml(raw.slice(range.end));
  } else {
    body = escapeHtml(raw);
  }
  return `<!doctype html>
<html lang="de">
<meta charset="utf-8">
<title>${escapeHtml(fileName)}</title>
<style>
  body { margin: 0; background: #f5f6f8; color: #1b1f24; font-family: "Segoe UI", sans-serif; }
  header { padding: 14px 20px 12px; background: #fff; border-bottom: 1px solid #d0d7de; }
  header strong { font-size: 15px; }
  header p { margin: 6px 0 0; font-size: 12px; color: #5c6570; word-break: break-all; }
  pre { margin: 0; padding: 20px 24px 32px; white-space: pre-wrap; font-family: ui-monospace, Consolas, monospace; font-size: 14px; line-height: 1.55; }
  mark { background: #ffe08a; color: inherit; padding: 0 2px; border-radius: 2px; }
</style>
<body>
<header>
  <strong>${escapeHtml(fileName)}</strong>
  <p>Originaldatei: ${escapeHtml(filePath)}</p>
</header>
<pre>${body}</pre>
<script>document.getElementById("passage")?.scrollIntoView({ block: "center" });</script>
</body>
</html>`;
}

function findPassageRange(
  raw: string,
  passage: string,
): { start: number; end: number } | null {
  const needle = passage.replace(/…/g, "").replace(/\s+/g, " ").trim();
  if (!needle) return null;
  const words = needle.split(" ").filter(Boolean).slice(0, 14);
  if (!words.length) return null;
  const re = new RegExp(words.map(escapeRegExp).join("\\s+"));
  const match = re.exec(raw);
  if (!match) return null;
  return { start: match.index, end: match.index + match[0].length };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function spawnDetached(command: string, args: string[]): boolean {
  const bin = path.isAbsolute(command) ? command : whichSync([command]);
  if (!bin || !existsSync(bin)) return false;
  try {
    const child = spawn(bin, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => undefined);
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function whichSync(names: string[]): string | undefined {
  const pathEnv = process.env.PATH ?? "";
  const sep = process.platform === "win32" ? ";" : ":";
  const ext = process.platform === "win32" ? ".exe" : "";
  for (const name of names) {
    if (path.isAbsolute(name) && existsSync(name)) return name;
    for (const dir of pathEnv.split(sep)) {
      const candidate = path.join(dir, process.platform === "win32" && name.endsWith(".exe") ? name : name + ext);
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}
