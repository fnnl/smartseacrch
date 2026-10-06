import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { setDataDir } from "./data-dir";
import { ingestIncomingFiles } from "./ingest";
import { buildLibraryZip, importLibraryZip } from "./library-pack";
import {
  absolutizeSourcePath,
  isRelativeLibraryPath,
  writeOriginalBytes,
} from "./originals";
import { loadStore } from "./store";

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

async function main(): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "smartseacrch-lib-"));
  const dataA = path.join(root, "a");
  const dataB = path.join(root, "b");
  await mkdir(dataA, { recursive: true });
  await mkdir(dataB, { recursive: true });

  try {
    assert(isRelativeLibraryPath("originals/x.txt"), "relative originals path");
    assert(!isRelativeLibraryPath("/tmp/x.txt"), "unix absolute");
    assert(!isRelativeLibraryPath("C:\\\\Temp\\\\x.txt"), "windows absolute");

    setDataDir(dataA);
    const rel = await writeOriginalBytes("id-1", "Hinweis.txt", Buffer.from("Hallo"));
    assert(rel === "originals/id-1.txt", `rel ${rel}`);
    const abs = absolutizeSourcePath(rel);
    assert(abs && abs.endsWith(path.join("originals", "id-1.txt")), `abs ${abs}`);

    const text = Buffer.from(
      "Problembeschreibung: Display zeigt E12\nDer Tank ist gefüllt.\n",
    );
    const ingested = await ingestIncomingFiles([
      {
        name: "E12.txt",
        displayPath: "probleme/E12.txt",
        size: text.byteLength,
        bytes: new Uint8Array(text),
      },
    ]);
    assert(ingested.added.length === 1, "ingested one file");
    assert(
      ingested.added[0]?.sourcePath?.startsWith("originals/"),
      `stored copy ${ingested.added[0]?.sourcePath}`,
    );
    const storedAbs = absolutizeSourcePath(ingested.added[0]?.sourcePath);
    assert(storedAbs, "absolute stored path");
    const copied = await readFile(storedAbs!, "utf8");
    assert(copied.includes("E12"), "copy has text");

    const zip = await buildLibraryZip();
    assert(zip.byteLength > 40, "zip not empty");
    await writeFile(path.join(root, "lib.zip"), zip);

    setDataDir(dataB);
    const imported = await importLibraryZip(zip);
    assert(imported.documents.length === 1, "imported one doc");
    assert(
      imported.documents[0]?.sourcePath?.startsWith("originals/"),
      "imported relative path",
    );
    const otherAbs = absolutizeSourcePath(imported.documents[0]?.sourcePath);
    const otherText = await readFile(otherAbs!, "utf8");
    assert(otherText.includes("E12"), "imported copy readable");
    const storeB = await loadStore();
    assert(storeB.chunks.length >= 1, "imported chunks");

    console.log("library-pack ok");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

void main();
