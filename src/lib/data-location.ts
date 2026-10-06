import { existsSync } from "node:fs";
import path from "node:path";

import type { App } from "electron";

export const PORTABLE_DATA_FOLDER = "SmartSeacrch-Daten";

export type DataLocation = {
  dataDir: string;
  originalsDir: string;
  portable: boolean;
};

export function chooseDataLocation(app: App): DataLocation {
  const env = process.env.SMARTSEARCH_DATA?.trim();
  if (env) {
    return location(env, true);
  }
  const portableRoot = process.env.PORTABLE_EXECUTABLE_DIR?.trim();
  if (portableRoot) {
    return location(path.join(portableRoot, PORTABLE_DATA_FOLDER), true);
  }
  const exeDir = path.dirname(app.getPath("exe"));
  const sibling = path.join(exeDir, PORTABLE_DATA_FOLDER);
  if (existsSync(sibling)) {
    return location(sibling, true);
  }
  return location(path.join(app.getPath("userData"), "data"), false);
}

function location(dataDir: string, portable: boolean): DataLocation {
  return {
    dataDir,
    originalsDir: path.join(dataDir, "originals"),
    portable,
  };
}
