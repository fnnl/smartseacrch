import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ChatSession, ChatTurn, ChatsSnapshot, SourceHit } from "@/lib/types";

let dataDir = path.join(process.cwd(), ".data");

export function setChatsDir(dir: string): void {
  dataDir = dir;
}

function chatsPath(): string {
  return path.join(dataDir, "chats.json");
}

let writeTail: Promise<void> = Promise.resolve();

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeTail.then(fn, fn);
  writeTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function emptyChat(): ChatSession {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: "Neuer Chat",
    createdAt: now,
    updatedAt: now,
    turns: [],
  };
}

function persistableTurn(turn: ChatTurn): ChatTurn | null {
  if (turn.pending) return null;
  const question = turn.question.trim();
  if (!question) return null;
  return {
    id: turn.id,
    question,
    answer: turn.answer,
    sources: Array.isArray(turn.sources) ? turn.sources : undefined,
    mode: turn.mode,
    fallbackReason: turn.fallbackReason,
    error: turn.error,
    createdAt: turn.createdAt || new Date().toISOString(),
  };
}

function titleFromTurns(turns: ChatTurn[]): string {
  const first = turns[0]?.question.trim();
  if (!first) return "Neuer Chat";
  return first.length > 52 ? `${first.slice(0, 49)}…` : first;
}

function normalizeChat(raw: ChatSession): ChatSession | null {
  if (!raw || typeof raw.id !== "string" || !raw.id) return null;
  const turns = Array.isArray(raw.turns)
    ? raw.turns
        .map((turn) => persistableTurn(turn))
        .filter((turn): turn is ChatTurn => turn !== null)
    : [];
  return {
    id: raw.id,
    title: titleFromTurns(turns),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    turns,
  };
}

function sortChats(chats: ChatSession[]): ChatSession[] {
  return [...chats].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function snapshot(chats: ChatSession[], activeId: string | null): ChatsSnapshot {
  const ordered = sortChats(chats);
  const active =
    (activeId && ordered.find((chat) => chat.id === activeId)?.id) ||
    ordered[0]?.id ||
    null;
  return { chats: ordered, activeId: active };
}

async function readFileSnapshot(): Promise<ChatsSnapshot> {
  try {
    const raw = await readFile(chatsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ChatsSnapshot>;
    const chats = Array.isArray(parsed.chats)
      ? parsed.chats
          .map((chat) => normalizeChat(chat as ChatSession))
          .filter((chat): chat is ChatSession => chat !== null)
      : [];
    if (!chats.length) {
      const chat = emptyChat();
      return { chats: [chat], activeId: chat.id };
    }
    return snapshot(chats, parsed.activeId ?? null);
  } catch {
    const chat = emptyChat();
    return { chats: [chat], activeId: chat.id };
  }
}

async function persist(data: ChatsSnapshot): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const tmp = `${chatsPath()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 0), "utf8");
  await rename(tmp, chatsPath());
}

export async function loadChats(): Promise<ChatsSnapshot> {
  return withWriteLock(async () => {
    const data = await readFileSnapshot();
    await persist(data);
    return data;
  });
}

export async function createChat(): Promise<ChatsSnapshot> {
  return withWriteLock(async () => {
    const data = await readFileSnapshot();
    const active = data.chats.find((chat) => chat.id === data.activeId);
    if (active && active.turns.length === 0) {
      return snapshot(data.chats, active.id);
    }
    const chat = emptyChat();
    return persistAndReturn(snapshot([chat, ...data.chats], chat.id));
  });
}

export async function selectChat(id: string): Promise<ChatsSnapshot> {
  return withWriteLock(async () => {
    const data = await readFileSnapshot();
    if (!data.chats.some((chat) => chat.id === id)) {
      return data;
    }
    return persistAndReturn(snapshot(data.chats, id));
  });
}

export async function saveChat(incoming: ChatSession): Promise<ChatsSnapshot> {
  return withWriteLock(async () => {
    const data = await readFileSnapshot();
    const normalized = normalizeChat({
      ...incoming,
      updatedAt: new Date().toISOString(),
    });
    if (!normalized) return data;
    const others = data.chats.filter((chat) => chat.id !== normalized.id);
    return persistAndReturn(snapshot([normalized, ...others], normalized.id));
  });
}

export async function deleteChat(id: string): Promise<ChatsSnapshot> {
  return withWriteLock(async () => {
    const data = await readFileSnapshot();
    const remaining = data.chats.filter((chat) => chat.id !== id);
    if (!remaining.length) {
      const chat = emptyChat();
      return persistAndReturn({ chats: [chat], activeId: chat.id });
    }
    const nextActive =
      data.activeId === id ? remaining[0].id : data.activeId;
    return persistAndReturn(snapshot(remaining, nextActive));
  });
}

async function persistAndReturn(data: ChatsSnapshot): Promise<ChatsSnapshot> {
  await persist(data);
  return data;
}
