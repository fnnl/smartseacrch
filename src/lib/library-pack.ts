import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import {
  ORIGINALS_DIR_NAME,
  absolutizeSourcePath,
  fileIsReadable,
  originalsRelFor,
} from "@/lib/originals";
import { getDataDir } from "@/lib/data-dir";
import { loadStore, replaceDocuments } from "@/lib/store";
import type { SearchStore } from "@/lib/store";
import type { Chunk, LibraryDocument } from "@/lib/types";

export const LIBRARY_FORMAT = "smartseacrch-library";
export const LIBRARY_FORMAT_VERSION = 1;

export type LibraryPackResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

type Manifest = {
  format: typeof LIBRARY_FORMAT;
  version: number;
  exportedAt: string;
};

function posixRel(stored: string | undefined, documentId: string, fileName: string): string {
  if (stored && stored.replace(/\\/g, "/").startsWith(`${ORIGINALS_DIR_NAME}/`)) {
    return stored.replace(/\\/g, "/");
  }
  return originalsRelFor(documentId, fileName);
}

export async function buildLibraryZip(): Promise<Buffer> {
  const store = await loadStore();
  const zip = new JSZip();
  const manifest: Manifest = {
    format: LIBRARY_FORMAT,
    version: LIBRARY_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const documents: LibraryDocument[] = [];
  const chunks: Chunk[] = [];
  const used = new Set<string>();

  for (const doc of store.documents) {
    const rel = posixRel(doc.sourcePath, doc.id, doc.fileName);
    const abs = absolutizeSourcePath(doc.sourcePath) ?? absolutizeSourcePath(rel);
    if (!abs || !(await fileIsReadable(abs))) {
      continue;
    }
    const bytes = await readFile(abs);
    zip.file(rel, bytes);
    used.add(doc.id);
    documents.push({ ...doc, sourcePath: rel });
  }

  for (const chunk of store.chunks) {
    if (!used.has(chunk.documentId)) continue;
    const rel = posixRel(chunk.sourcePath, chunk.documentId, chunk.fileName);
    chunks.push({ ...chunk, sourcePath: rel });
  }

  zip.file("index.json", JSON.stringify({ documents, chunks }));
  if (!documents.length) {
    throw new Error(
      "Es sind keine gespeicherten Dateien zum Exportieren da. Zuerst Unterlagen einlesen.",
    );
  }
  const nodebuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return Buffer.from(nodebuffer);
}

export async function importLibraryZip(bytes: Uint8Array): Promise<SearchStore> {
  const zip = await JSZip.loadAsync(bytes);
  const indexFile =
    zip.file("index.json") ??
    zip.file(/index\.json$/i)[0];
  if (!indexFile) {
    throw new Error("Die ZIP-Datei enthält keinen Index (index.json).");
  }
  const raw = JSON.parse(await indexFile.async("string")) as SearchStore;
  if (!Array.isArray(raw.documents) || !Array.isArray(raw.chunks)) {
    throw new Error("Der Index in der ZIP-Datei ist ungültig.");
  }

  const originalsRoot = path.join(getDataDir(), ORIGINALS_DIR_NAME);
  await mkdir(originalsRoot, { recursive: true });

  const importedDocs: LibraryDocument[] = [];
  const importedIds = new Set<string>();

  for (const doc of raw.documents) {
    const rel = posixRel(doc.sourcePath, doc.id, doc.fileName);
    const entry =
      zip.file(rel) ??
      zip.file(rel.replace(/\//g, "\\")) ??
      zip.file(new RegExp(`${doc.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^/]*$`))[0];
    if (!entry) continue;
    const fileBytes = await entry.async("uint8array");
    const dest = path.join(getDataDir(), ...rel.split("/"));
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, fileBytes);
    importedIds.add(doc.id);
    importedDocs.push({ ...doc, sourcePath: rel });
  }

  if (!importedDocs.length) {
    throw new Error("In der ZIP-Datei lagen keine lesbaren Originaldateien.");
  }

  const importedChunks = raw.chunks
    .filter((chunk) => importedIds.has(chunk.documentId))
    .map((chunk) => ({
      ...chunk,
      sourcePath: posixRel(chunk.sourcePath, chunk.documentId, chunk.fileName),
    }));

  return replaceDocuments(
    importedDocs.map((document) => ({
      document,
      chunks: importedChunks.filter((chunk) => chunk.documentId === document.id),
    })),
  );
}

export async function copyLibraryFolder(destDir: string): Promise<string> {
  const target = path.basename(destDir) === "SmartSeacrch-Daten"
    ? destDir
    : path.join(destDir, "SmartSeacrch-Daten");
  const zip = await buildLibraryZip();
  const unpacked = await JSZip.loadAsync(zip);
  await mkdir(path.join(target, ORIGINALS_DIR_NAME), { recursive: true });
  for (const [name, entry] of Object.entries(unpacked.files)) {
    if (entry.dir) continue;
    if (name === "manifest.json") continue;
    const dest = path.join(target, name.split("/").join(path.sep));
    await mkdir(path.dirname(dest), { recursive: true });
    const data = await entry.async("nodebuffer");
    await writeFile(dest, data);
  }
  return target;
}
