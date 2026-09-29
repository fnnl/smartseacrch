import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type Branding = {
  logoDataUrl: string | null;
};

type LogoMeta = {
  file: string;
  mime: string;
};

const MAX_BYTES = 5 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

let dataDir = path.join(process.cwd(), ".data");

export function setBrandingDir(dir: string): void {
  dataDir = dir;
}

function brandingDir(): string {
  return path.join(dataDir, "branding");
}

function metaPath(): string {
  return path.join(brandingDir(), "logo.json");
}

export function logoExtension(filePath: string): string | null {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return MIME_BY_EXT[ext] ? (ext === "jpeg" ? "jpg" : ext) : null;
}

async function dataUrlFromFile(file: string, mime: string): Promise<string> {
  const bytes = await readFile(path.join(brandingDir(), file));
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

export async function loadBranding(): Promise<Branding> {
  try {
    const meta = JSON.parse(await readFile(metaPath(), "utf8")) as LogoMeta;
    if (!meta.file || !meta.mime) return { logoDataUrl: null };
    return { logoDataUrl: await dataUrlFromFile(meta.file, meta.mime) };
  } catch {
    return { logoDataUrl: null };
  }
}

export async function saveLogoFromPath(filePath: string): Promise<Branding> {
  const ext = logoExtension(filePath);
  if (!ext) {
    throw new Error("Bitte ein Bild wählen (PNG, JPG, SVG oder WebP).");
  }
  const bytes = await readFile(filePath);
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error("Das Logo ist größer als 5 MB.");
  }
  const mime = MIME_BY_EXT[ext] ?? MIME_BY_EXT.jpg;
  const destName = `logo.${ext}`;
  await mkdir(brandingDir(), { recursive: true });
  const existing = await readdir(brandingDir()).catch(() => []);
  await Promise.all(
    existing
      .filter((name) => name.startsWith("logo."))
      .map((name) => rm(path.join(brandingDir(), name), { force: true })),
  );
  await writeFile(path.join(brandingDir(), destName), bytes);
  await writeFile(metaPath(), JSON.stringify({ file: destName, mime } satisfies LogoMeta));
  return { logoDataUrl: `data:${mime};base64,${bytes.toString("base64")}` };
}

export async function clearLogo(): Promise<Branding> {
  await rm(brandingDir(), { recursive: true, force: true });
  return { logoDataUrl: null };
}
