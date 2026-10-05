import { MessageSquareIcon, PlusIcon, TrashIcon } from "lucide-react";

import type { ChatSession } from "@/lib/types";

type ChatSidebarProps = {
  chats: ChatSession[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ChatSidebar({
  chats,
  activeId,
  onNew,
  onSelect,
  onDelete,
}: ChatSidebarProps) {
  return (
    <aside
      aria-label="Chats"
      style={{
        flex: "0 0 220px",
        width: 220,
        minWidth: 180,
        maxWidth: 260,
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--border)",
        background: "var(--sidebar)",
      }}
    >
      <div style={{ padding: "12px 12px 8px", flex: "0 0 auto" }}>
        <button
          type="button"
          onClick={onNew}
          style={{
            width: "100%",
            minHeight: 40,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 10,
            border: "2px solid var(--primary)",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            fontSize: 14,
            fontWeight: 650,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          <PlusIcon style={{ width: 16, height: 16 }} />
          Neuer Chat
        </button>
      </div>
      <p
        style={{
          margin: "4px 14px 8px",
          fontSize: 11,
          fontWeight: 650,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--muted-foreground)",
        }}
      >
        Frühere Chats
      </p>
      <nav
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          overflowY: "auto",
          padding: "0 8px 12px",
        }}
      >
        {chats.length === 0 ? (
          <p style={{ margin: "8px 8px 0", fontSize: 13, color: "#5c6570" }}>
            Noch keine Chats.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {chats.map((chat) => {
              const active = chat.id === activeId;
              return (
                <li key={chat.id} style={{ marginBottom: 4 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      gap: 2,
                      borderRadius: 10,
                      background: active ? "var(--sidebar-accent)" : "transparent",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(chat.id)}
                      aria-current={active ? "page" : undefined}
                      style={{
                        flex: "1 1 auto",
                        minWidth: 0,
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        padding: "8px 8px 8px 10px",
                        fontFamily: "inherit",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <MessageSquareIcon
                          style={{
                            width: 14,
                            height: 14,
                            marginTop: 3,
                            flexShrink: 0,
                            color: "var(--primary)",
                          }}
                        />
                        <span style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: 13,
                              fontWeight: active ? 650 : 500,
                              lineHeight: 1.35,
                              color: "var(--foreground)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {chat.title}
                          </span>
                          <span
                            style={{
                              display: "block",
                              marginTop: 2,
                              fontSize: 11,
                              color: "#5c6570",
                            }}
                          >
                            {formatWhen(chat.updatedAt)}
                          </span>
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Chat «${chat.title}» löschen`}
                      onClick={() => onDelete(chat.id)}
                      style={{
                        flex: "0 0 auto",
                        width: 32,
                        border: "none",
                        background: "transparent",
                        color: "#5c6570",
                        cursor: "pointer",
                        borderRadius: 8,
                      }}
                    >
                      <TrashIcon style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("de-DE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
