import {
  absolutizeSourcePath,
  copyIntoOriginalsIfNeeded,
  isRelativeLibraryPath,
  rewriteSourcePaths,
} from "@/lib/originals";
import { mutateStore } from "@/lib/store";

export async function migrateLibraryOriginals(): Promise<void> {
  await mutateStore(async (store) => {
    const idToRel = new Map<string, string>();
    for (const doc of store.documents) {
      const rel = await copyIntoOriginalsIfNeeded(doc);
      if (rel && isRelativeLibraryPath(rel)) {
        idToRel.set(doc.id, rel);
      }
    }
    if (!idToRel.size) return store;
    const next = rewriteSourcePaths(store.documents, store.chunks, idToRel);
    return next;
  });
}

export { absolutizeSourcePath };
