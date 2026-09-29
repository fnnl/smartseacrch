import {
  FolderOpenIcon,
  ImageIcon,
  LoaderCircleIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type WorkspaceBarProps = {
  ready: boolean;
  ingesting: boolean;
  error: string | null;
  notice: string | null;
  hasLogo: boolean;
  onPickFiles: () => Promise<void> | void;
  onPickFolder: () => Promise<void> | void;
  onDropPaths: (paths: string[]) => Promise<void> | void;
  onLoadSample: () => Promise<void>;
  onPickLogo: () => Promise<void> | void;
  onClearLogo: () => Promise<void> | void;
  onClear: () => Promise<void>;
};

export function WorkspaceBar({
  ready,
  ingesting,
  error,
  notice,
  hasLogo,
  onPickFiles,
  onPickFolder,
  onDropPaths,
  onLoadSample,
  onPickLogo,
  onClearLogo,
  onClear,
}: WorkspaceBarProps) {
  const [dragging, setDragging] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="mt-6 space-y-4">
      <div
        className={`rounded-3xl border px-5 py-4 transition-colors ${
          dragging
            ? "border-primary bg-primary/8"
            : "border-border/80 bg-card/80"
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
        <p className="max-w-3xl text-[0.95rem] leading-7 text-muted-foreground">
          Ordner oder Dateien von diesem Rechner wählen. SmartSeacrch liest{" "}
          <span className="text-foreground font-medium">Word</span>,{" "}
          <span className="text-foreground font-medium">PDF</span> und{" "}
          <span className="text-foreground font-medium">Text</span> lokal —
          nichts geht ins Netz.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            size="lg"
            disabled={ingesting}
            onClick={() => void onPickFolder()}
          >
            <FolderOpenIcon data-icon="inline-start" />
            Ordner wählen
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={ingesting}
            onClick={() => void onPickFiles()}
          >
            <UploadIcon data-icon="inline-start" />
            Dateien
          </Button>
          <Button
            type="button"
            size="lg"
            variant="ghost"
            disabled={ingesting}
            onClick={() => void onLoadSample()}
          >
            <SparklesIcon data-icon="inline-start" />
            Beispiel laden
          </Button>
          <span className="bg-border/80 mx-1 hidden h-6 w-px sm:block" />
          <Button
            type="button"
            size="lg"
            variant="ghost"
            onClick={() => void onPickLogo()}
          >
            <ImageIcon data-icon="inline-start" />
            {hasLogo ? "Logo ersetzen" : "Firmenlogo"}
          </Button>
          {hasLogo ? (
            <Button
              type="button"
              size="lg"
              variant="ghost"
              onClick={() => void onClearLogo()}
            >
              Logo entfernen
            </Button>
          ) : null}
        </div>
      </div>

      {ingesting ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Unterlagen werden gelesen und indexiert…
        </p>
      ) : null}

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="text-sm text-muted-foreground">{notice}</p>
      ) : null}

      {ready ? (
        <div>
          {confirmClear ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm">Alle Unterlagen aus dem Index nehmen?</p>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  setConfirmClear(false);
                  void onClear();
                }}
              >
                <Trash2Icon data-icon="inline-start" />
                Leeren
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
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setConfirmClear(true)}
            >
              Unterlagen leeren
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
