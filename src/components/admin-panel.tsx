import { LoaderCircleIcon, LockIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { ActionButton } from "@/components/action-button";
import { WorkspaceBar } from "@/components/workspace-bar";
import type { LibraryDocument } from "@/lib/types";

type AdminStatus = {
  hasPassword: boolean;
  unlocked: boolean;
};

type AdminPanelProps = {
  open: boolean;
  onClose: () => void;
  documents: LibraryDocument[];
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
  onRemove: (documentId: string) => Promise<void>;
};

export function AdminPanel({
  open,
  onClose,
  documents,
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
  onRemove,
}: AdminPanelProps) {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setPassword("");
    setConfirm("");
    void window.smartsearch
      .adminStatus()
      .then(setStatus)
      .catch(() =>
        setFormError("Die Verwaltung konnte nicht geladen werden."),
      );
  }, [open]);

  if (!open) return null;

  const refresh = async () => {
    setStatus(await window.smartsearch.adminStatus());
  };

  const setup = async () => {
    setFormError(null);
    if (password !== confirm) {
      setFormError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    try {
      setStatus(await window.smartsearch.adminSetup(password));
      setPassword("");
      setConfirm("");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Das Passwort konnte nicht gesetzt werden.",
      );
    } finally {
      setBusy(false);
    }
  };

  const login = async () => {
    setFormError(null);
    setBusy(true);
    try {
      const ok = await window.smartsearch.adminLogin(password);
      if (!ok) {
        setFormError("Das Passwort ist falsch.");
        setPassword("");
        return;
      }
      await refresh();
      setPassword("");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Die Anmeldung ist fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await window.smartsearch.adminLogout();
    await refresh();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(27, 31, 36, 0.4)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        style={{
          width: "min(480px, 100%)",
          height: "100%",
          background: "#ffffff",
          overflowY: "auto",
          padding: "20px 24px 32px",
          boxShadow: "-8px 0 24px rgba(27, 31, 36, 0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <p
              id="admin-title"
              style={{ margin: 0, fontSize: 18, fontWeight: 700 }}
            >
              Verwaltung
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5c6570" }}>
              Unterlagen nur nach Anmeldung hinzufügen oder entfernen.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              border: "1px solid var(--border)",
              background: "#fff",
              borderRadius: 8,
              width: 36,
              height: 36,
              cursor: "pointer",
            }}
          >
            <XIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {!status ? (
          <p style={{ color: "#5c6570", fontSize: 14 }}>Laden…</p>
        ) : !status.hasPassword ? (
          <SetupForm
            password={password}
            confirm={confirm}
            busy={busy}
            error={formError}
            onPassword={setPassword}
            onConfirm={setConfirm}
            onSubmit={() => void setup()}
          />
        ) : !status.unlocked ? (
          <LoginForm
            password={password}
            busy={busy}
            error={formError}
            onPassword={setPassword}
            onSubmit={() => void login()}
          />
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                Angemeldet
              </p>
              <ActionButton variant="muted" onClick={() => void logout()}>
                Abmelden
              </ActionButton>
            </div>
            <WorkspaceBar
              ready={ready}
              ingesting={ingesting}
              error={error}
              notice={notice}
              hasLogo={hasLogo}
              onPickFiles={onPickFiles}
              onPickFolder={onPickFolder}
              onDropPaths={onDropPaths}
              onLoadSample={onLoadSample}
              onPickLogo={onPickLogo}
              onClearLogo={onClearLogo}
              onClear={onClear}
            />
            <div style={{ marginTop: 20 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                Indexierte Dateien
              </p>
              {documents.length === 0 ? (
                <p style={{ margin: "8px 0 0", fontSize: 14, color: "#5c6570" }}>
                  Noch keine Unterlagen im Index.
                </p>
              ) : (
                <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}>
                  {documents.map((doc) => (
                    <li
                      key={doc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ fontSize: 14, minWidth: 0 }}>
                        {doc.fileName}
                      </span>
                      <ActionButton
                        variant="danger"
                        disabled={ingesting}
                        onClick={() => void onRemove(doc.id)}
                      >
                        Entfernen
                      </ActionButton>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function SetupForm({
  password,
  confirm,
  busy,
  error,
  onPassword,
  onConfirm,
  onSubmit,
}: {
  password: string;
  confirm: string;
  busy: boolean;
  error: string | null;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.55, color: "#5c6570" }}>
        Beim ersten Öffnen ein Admin-Passwort setzen. Es bleibt nur auf diesem
        Rechner — nicht im Programmcode.
      </p>
      <PasswordField
        id="admin-setup"
        label="Neues Passwort"
        value={password}
        onChange={onPassword}
        autoFocus
      />
      <PasswordField
        id="admin-setup-confirm"
        label="Passwort wiederholen"
        value={confirm}
        onChange={onConfirm}
      />
      {error ? (
        <p role="alert" style={{ color: "#b42318", fontSize: 14 }}>
          {error}
        </p>
      ) : null}
      <ActionButton type="submit" variant="filled" disabled={busy}>
        {busy ? <LoaderCircleIcon className="animate-spin" /> : <LockIcon style={{ width: 16, height: 16 }} />}
        Passwort speichern
      </ActionButton>
    </form>
  );
}

function LoginForm({
  password,
  busy,
  error,
  onPassword,
  onSubmit,
}: {
  password: string;
  busy: boolean;
  error: string | null;
  onPassword: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.55, color: "#5c6570" }}>
        Mit dem Admin-Passwort anmelden, um Unterlagen zu ändern.
      </p>
      <PasswordField
        id="admin-login"
        label="Passwort"
        value={password}
        onChange={onPassword}
        autoFocus
      />
      {error ? (
        <p role="alert" style={{ color: "#b42318", fontSize: 14 }}>
          {error}
        </p>
      ) : null}
      <ActionButton type="submit" variant="filled" disabled={busy || !password}>
        {busy ? <LoaderCircleIcon className="animate-spin" /> : <LockIcon style={{ width: 16, height: 16 }} />}
        Anmelden
      </ActionButton>
    </form>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label htmlFor={id} style={{ display: "block", marginBottom: 14 }}>
      <span
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      <input
        id={id}
        type="password"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          display: "block",
          width: "100%",
          minHeight: 44,
          padding: "10px 12px",
          border: "2px solid var(--border)",
          borderRadius: 10,
          fontSize: 16,
          fontFamily: "inherit",
          background: "#fff",
        }}
      />
    </label>
  );
}
