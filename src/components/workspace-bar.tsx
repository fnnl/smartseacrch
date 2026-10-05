import {
  FolderOpenIcon,
  ImageIcon,
  LoaderCircleIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useState } from "react";

import { ActionButton } from "@/components/action-button";

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
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          borderRadius: 14,
          border: dragging ? "2px dashed var(--primary)" : "2px dashed var(--border)",
          background: dragging ? "var(--accent)" : "#ffffff",
          padding: "12px clamp(12px, 2vw, 20px)",
        }}
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
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            Unterlagen hinzufügen
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 14,
              lineHeight: 1.55,
              color: "#5c6570",
              maxWidth: "100%",
            }}
          >
            Ordner oder Dateien von diesem Rechner wählen. SmartSeacrch liest
            Word, PDF und Text lokal — nichts geht ins Netz. Dateien hierher
            ziehen geht auch.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
          }}
        >
          <ActionButton
            variant="filled"
            disabled={ingesting}
            onClick={() => void onPickFolder()}
          >
            <FolderOpenIcon style={{ width: 18, height: 18 }} />
            Ordner wählen
          </ActionButton>
          <ActionButton
            variant="outlined"
            disabled={ingesting}
            onClick={() => void onPickFiles()}
          >
            <UploadIcon style={{ width: 18, height: 18 }} />
            Dateien wählen
          </ActionButton>
          <ActionButton
            variant="outlined"
            disabled={ingesting}
            onClick={() => void onLoadSample()}
          >
            <SparklesIcon style={{ width: 18, height: 18 }} />
            Beispiel laden
          </ActionButton>
          <ActionButton variant="muted" onClick={() => void onPickLogo()}>
            <ImageIcon style={{ width: 18, height: 18 }} />
            {hasLogo ? "Logo ersetzen" : "Firmenlogo wählen"}
          </ActionButton>
          {hasLogo ? (
            <ActionButton variant="muted" onClick={() => void onClearLogo()}>
              Logo entfernen
            </ActionButton>
          ) : null}
          {ready ? (
            confirmClear ? (
              <>
                <p style={{ margin: 0, fontSize: 14, color: "var(--foreground)" }}>
                  Alle Unterlagen aus dem Index nehmen?
                </p>
                <ActionButton
                  variant="danger"
                  onClick={() => {
                    setConfirmClear(false);
                    void onClear();
                  }}
                >
                  <Trash2Icon style={{ width: 18, height: 18 }} />
                  Ja, leeren
                </ActionButton>
                <ActionButton
                  variant="muted"
                  onClick={() => setConfirmClear(false)}
                >
                  Abbrechen
                </ActionButton>
              </>
            ) : (
              <ActionButton variant="danger" onClick={() => setConfirmClear(true)}>
                <Trash2Icon style={{ width: 18, height: 18 }} />
                Unterlagen leeren
              </ActionButton>
            )
          ) : null}
        </div>
      </div>

      {ingesting ? (
        <p
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            color: "#475569",
          }}
        >
          <LoaderCircleIcon
            className="animate-spin"
            style={{ width: 16, height: 16 }}
          />
          Unterlagen werden gelesen und indexiert…
        </p>
      ) : null}

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}

      {notice ? (
        <p style={{ margin: 0, fontSize: 14, color: "var(--primary)", fontWeight: 600 }}>
          {notice}
        </p>
      ) : null}
    </div>
  );
}
