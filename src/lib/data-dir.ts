import path from "node:path";

let dataDir = path.join(process.cwd(), ".data");

export function setDataDir(dir: string): void {
  dataDir = dir;
}

export function getDataDir(): string {
  return dataDir;
}
