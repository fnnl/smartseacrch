import { isSupportedFileName } from "@/lib/constants";

type EntryLike = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (
    success: (file: File) => void,
    error?: (err: DOMException) => void,
  ) => void;
  createReader?: () => {
    readEntries: (
      success: (entries: EntryLike[]) => void,
      error?: (err: DOMException) => void,
    ) => void;
  };
};

export function displayPathFor(file: File): string {
  const relative = "webkitRelativePath" in file
    ? String((file as File & { webkitRelativePath?: string }).webkitRelativePath)
    : "";
  return relative || file.name;
}

export function filterSupportedFiles(files: File[]): File[] {
  return files.filter((file) =>
    isSupportedFileName(displayPathFor(file) || file.name),
  );
}

export async function filesFromFileList(list: FileList | File[]): Promise<File[]> {
  return filterSupportedFiles(Array.from(list));
}

export async function filesFromDataTransfer(
  transfer: DataTransfer,
): Promise<File[]> {
  const items = Array.from(transfer.items ?? []);
  const entries: EntryLike[] = [];
  for (const item of items) {
    const maybe = item as DataTransferItem & {
      webkitGetAsEntry?: () => EntryLike | FileSystemEntry | null;
    };
    const entry = maybe.webkitGetAsEntry?.();
    if (entry) entries.push(entry as EntryLike);
  }

  if (entries.length) {
    const collected: File[] = [];
    for (const entry of entries) {
      await walkEntry(entry, collected);
    }
    return filterSupportedFiles(collected);
  }

  return filesFromFileList(transfer.files);
}

async function walkEntry(entry: EntryLike, into: File[]): Promise<void> {
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((resolve, reject) => {
      entry.file!(resolve, reject);
    });
    into.push(file);
    return;
  }

  if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    const batch = await readAllEntries(reader);
    for (const child of batch) {
      await walkEntry(child, into);
    }
  }
}

function readAllEntries(
  reader: NonNullable<EntryLike["createReader"]> extends () => infer R
    ? R
    : never,
): Promise<EntryLike[]> {
  return new Promise((resolve, reject) => {
    const all: EntryLike[] = [];
    const pump = () => {
      reader.readEntries(
        (entries) => {
          if (!entries.length) {
            resolve(all);
            return;
          }
          all.push(...entries);
          pump();
        },
        reject,
      );
    };
    pump();
  });
}
