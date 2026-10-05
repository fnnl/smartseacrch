import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { isSupportedFileName } from "@/lib/constants";
import type { IncomingFile } from "@/lib/ingest";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".data",
  "out",
  "release",
  "dist",
]);

export async function filesFromPaths(paths: string[]): Promise<IncomingFile[]> {
  const collected: IncomingFile[] = [];
  for (const item of paths) {
    try {
      const info = await stat(item);
      if (info.isDirectory()) {
        collected.push(...(await walkDirectory(item)));
      } else if (isSupportedFileName(item)) {
        collected.push(await readDiskFile(item, path.basename(item), info.size));
      }
    } catch {
      // skip unreadable paths
    }
  }
  return collected;
}

export async function walkDirectory(root: string): Promise<IncomingFile[]> {
  const collected: IncomingFile[] = [];
  await walk(root, root, collected);
  return collected;
}

async function walk(
  dir: string,
  root: string,
  into: IncomingFile[],
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, root, into);
      continue;
    }
    if (!isSupportedFileName(entry.name)) continue;
    const info = await stat(full);
    const relative = path.relative(root, full).split(path.sep).join("/");
    into.push(await readDiskFile(full, relative, info.size));
  }
}

async function readDiskFile(
  fullPath: string,
  displayPath: string,
  size: number,
): Promise<IncomingFile> {
  const buffer = await readFile(fullPath);
  return {
    name: path.basename(fullPath),
    displayPath,
    sourcePath: fullPath,
    size,
    bytes: new Uint8Array(buffer),
  };
}
