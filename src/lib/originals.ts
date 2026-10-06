import { constants, existsSync } from "node:fs";
import { access, copyFile, mkdir, readdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { extensionOf } from "@/lib/constants";
import { getDataDir } from "@/lib/data-dir";
import type { Chunk, LibraryDocument } from "@/lib/types";

export const ORIGINALS_DIR_NAME = "originals";

export function originalsDir(): string {
  return path.join(getDataDir(), ORIGINALS_DIR_NAME);
}

export function originalsRelFor(documentId: string, fileName: string): string {
  const ext = extensionOf(fileName) || path.extname(fileName).toLowerCase();
  return `${ORIGINALS_DIR_NAME}/${documentId}${ext}`;
}

export function isRelativeLibraryPath(stored: string): boolean {
  const normalized = stored.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    return false;
  }
  return !path.isAbsolute(stored);
}

export function absolutizeSourcePath(
  stored: string | undefined,
): string | undefined {
  if (!stored) return undefined;
  if (!isRelativeLibraryPath(stored)) return stored;
  return path.join(getDataDir(), ...stored.replace(/\\/g, "/").split("/"));
}

export async function writeOriginalBytes(
  documentId: string,
  fileName: string,
  bytes: Uint8Array,
): Promise<string> {
  const rel = originalsRelFor(documentId, fileName);
  const dest = path.join(getDataDir(), ...rel.split("/"));
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, bytes);
  return rel;
}

export async function removeOriginalFile(
  stored: string | undefined,
): Promise<void> {
  const abs = absolutizeSourcePath(stored);
  if (!abs) return;
  if (!isInsideDir(originalsDir(), abs)) return;
  try {
    await unlink(abs);
  } catch {
    // already gone
  }
}

export async function clearOriginalsDir(): Promise<void> {
  const dir = originalsDir();
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

export async function fileIsReadable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function copyIntoOriginalsIfNeeded(
  document: LibraryDocument,
): Promise<string | undefined> {
  const rel = originalsRelFor(document.id, document.fileName);
  const dest = path.join(getDataDir(), ...rel.split("/"));
  await mkdir(path.dirname(dest), { recursive: true });

  if (existsSync(dest)) return rel;

  const current = absolutizeSourcePath(document.sourcePath);
  if (current && (await fileIsReadable(current))) {
    const originalsRoot = originalsDir();
    if (isInsideDir(originalsRoot, current)) {
      return path.relative(getDataDir(), current).split(path.sep).join("/");
    }
    await copyFile(current, dest);
    return rel;
  }
  return existsSync(dest) ? rel : document.sourcePath;
}

export function rewriteSourcePaths(
  documents: LibraryDocument[],
  chunks: Chunk[],
  idToRel: Map<string, string>,
): { documents: LibraryDocument[]; chunks: Chunk[] } {
  return {
    documents: documents.map((doc) => {
      const rel = idToRel.get(doc.id);
      return rel ? { ...doc, sourcePath: rel } : doc;
    }),
    chunks: chunks.map((chunk) => {
      const rel = idToRel.get(chunk.documentId);
      return rel ? { ...chunk, sourcePath: rel } : chunk;
    }),
  };
}

export async function listOriginalNames(): Promise<string[]> {
  try {
    return await readdir(originalsDir());
  } catch {
    return [];
  }
}

function isInsideDir(root: string, filePath: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.resolve(filePath);
  return (
    resolvedFile === resolvedRoot ||
    resolvedFile.startsWith(resolvedRoot + path.sep)
  );
}
