import {
  FileTextIcon,
  FolderOpenIcon,
  LoaderCircleIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBytes, formatDocumentKind } from "@/lib/format";
import type { LibraryDocument, SkippedFile } from "@/lib/types";

type LibraryPanelProps = {
  documents: LibraryDocument[];
  chunkCount: number;
  ingesting: boolean;
  skipped: SkippedFile[];
  error: string | null;
  onPickFiles: () => Promise<void> | void;
  onPickFolder: () => Promise<void> | void;
  onDropPaths: (paths: string[]) => Promise<void> | void;
  onLoadSample: () => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onClear: () => Promise<void>;
};

export function LibraryPanel({
  documents,
  chunkCount,
  ingesting,
  skipped,
  error,
  onPickFiles,
  onPickFolder,
  onDropPaths,
  onLoadSample,
  onRemove,
  onClear,
}: LibraryPanelProps) {
  const [dragging, setDragging] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pt-4 pb-3">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Bibliothek
        </p>
        <h2 className="font-heading mt-1 text-lg">Dokumente</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {documents.length
            ? `${documents.length} ${documents.length === 1 ? "Datei" : "Dateien"}, ${chunkCount} Stellen indexiert`
            : "Noch nichts geladen"}
        </p>
      </div>

      <div
        className={`mx-4 rounded-xl border border-dashed p-3 transition-colors ${
          dragging
            ? "border-primary bg-primary/6"
            : "border-border bg-background/70"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const paths = [...event.dataTransfer.files]
            .map((file) => window.smartsearch.pathForFile(file))
            .filter(Boolean);
          if (paths.length) void onDropPaths(paths);
        }}
      >
        <p className="text-sm leading-5 text-foreground">
          Wähle einen Ordner auf diesem Rechner — oder einzelne Dateien.
          SmartSeacrch liest <span className="font-medium">.docx</span>,{" "}
          <span className="font-medium">.pdf</span> und{" "}
          <span className="font-medium">.txt</span> lokal. Nichts wird
          hochgeladen.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={ingesting}
            onClick={() => void onPickFiles()}
          >
            <UploadIcon data-icon="inline-start" />
            Dateien
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={ingesting}
            onClick={() => void onPickFolder()}
          >
            <FolderOpenIcon data-icon="inline-start" />
            Ordner
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={ingesting}
            onClick={() => void onLoadSample()}
          >
            Beispiel laden
          </Button>
        </div>
      </div>

      {ingesting && (
        <div className="text-muted-foreground mx-4 mt-3 flex items-center gap-2 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Dokumente werden gelesen und indexiert…
        </div>
      )}

      {error && (
        <p className="text-destructive mx-4 mt-3 text-sm" role="alert">
          {error}
        </p>
      )}

      {skipped.length > 0 && (
        <ul className="mx-4 mt-3 space-y-1 text-sm text-amber-900">
          {skipped.map((item) => (
            <li key={`${item.name}-${item.reason}`}>
              {item.name}: {item.reason}
            </li>
          ))}
        </ul>
      )}

      <ScrollArea className="mt-3 min-h-0 flex-1">
        <div className="px-4 pb-4">
          {documents.length === 0 && !ingesting ? (
            <div className="rounded-xl bg-background/80 px-3 py-6 text-sm leading-6 text-muted-foreground">
              Nimm den Ordner mit Problembeschreibungen und Handbüchern. Die
              Suche bleibt auf diesem Computer.
            </div>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="bg-card ring-foreground/8 flex items-start gap-2 rounded-xl px-3 py-2.5 ring-1"
                >
                  <FileTextIcon className="text-primary mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" title={doc.displayPath}>
                      {displayName(doc)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">
                        {formatDocumentKind(doc.format)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {doc.chunkCount} Stellen · {formatBytes(doc.size)}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`${doc.fileName} entfernen`}
                    onClick={() => void onRemove(doc.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>

      {documents.length > 0 && (
        <div className="border-border/80 border-t px-4 py-3">
          {confirmClear ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm">Alle Dokumente entfernen?</p>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setConfirmClear(false);
                    void onClear();
                  }}
                >
                  Entfernen
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmClear(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirmClear(true)}
            >
              Bibliothek leeren
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function displayName(doc: LibraryDocument): string {
  return doc.displayPath.includes("/") ? doc.displayPath : doc.fileName;
}
