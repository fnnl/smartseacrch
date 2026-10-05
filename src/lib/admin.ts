import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const KEY_LEN = 32;
const SALT_LEN = 16;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

type AdminFile = {
  salt: string;
  hash: string;
  n: number;
  r: number;
  p: number;
};

export type AdminStatus = {
  hasPassword: boolean;
  unlocked: boolean;
};

let dataDir = path.join(process.cwd(), ".data");
let sessionUnlocked = false;

export function setAdminDir(dir: string): void {
  dataDir = dir;
}

function adminPath(): string {
  return path.join(dataDir, "admin.json");
}

export function isAdminUnlocked(): boolean {
  return sessionUnlocked;
}

export function lockAdmin(): void {
  sessionUnlocked = false;
}

export function requireAdmin(): void {
  if (!sessionUnlocked) {
    throw new Error("Admin-Anmeldung erforderlich.");
  }
}

async function readRecord(): Promise<AdminFile | null> {
  try {
    const raw = await readFile(adminPath(), "utf8");
    const parsed = JSON.parse(raw) as AdminFile;
    if (!parsed.salt || !parsed.hash) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function adminHasPassword(): Promise<boolean> {
  return (await readRecord()) !== null;
}

export async function adminStatus(): Promise<AdminStatus> {
  return {
    hasPassword: await adminHasPassword(),
    unlocked: sessionUnlocked,
  };
}

function assertPassword(password: string): void {
  if (password.length < 8) {
    throw new Error("Das Passwort muss mindestens 8 Zeichen haben.");
  }
}

async function deriveKey(
  password: string,
  salt: Buffer,
  n = SCRYPT_N,
  r = SCRYPT_R,
  p = SCRYPT_P,
): Promise<Buffer> {
  return scryptSync(password, salt, KEY_LEN, { N: n, r, p });
}

export async function setupAdminPassword(password: string): Promise<AdminStatus> {
  if (await adminHasPassword()) {
    throw new Error("Es ist bereits ein Admin-Passwort gesetzt.");
  }
  assertPassword(password);
  const salt = randomBytes(SALT_LEN);
  const hash = await deriveKey(password, salt);
  await mkdir(dataDir, { recursive: true });
  const tmp = `${adminPath()}.tmp`;
  const record: AdminFile = {
    salt: salt.toString("hex"),
    hash: hash.toString("hex"),
    n: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  };
  await writeFile(tmp, JSON.stringify(record), "utf8");
  await rename(tmp, adminPath());
  sessionUnlocked = true;
  return adminStatus();
}

export async function unlockAdmin(password: string): Promise<boolean> {
  const record = await readRecord();
  if (!record) {
    throw new Error("Es ist noch kein Admin-Passwort gesetzt.");
  }
  const salt = Buffer.from(record.salt, "hex");
  const expected = Buffer.from(record.hash, "hex");
  const actual = await deriveKey(
    password,
    salt,
    record.n ?? SCRYPT_N,
    record.r ?? SCRYPT_R,
    record.p ?? SCRYPT_P,
  );
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    sessionUnlocked = false;
    return false;
  }
  sessionUnlocked = true;
  return true;
}
