import { get, set } from "idb-keyval";
import { API } from "./api";
import { queryClient } from "../api/queryClient";
import { queryKeys } from "../api/queries";

export type OutboxActionType = "record" | "addTask" | "patchTask" | "delTask" | "workMode" | "editCheckin";

export interface OutboxItem {
  id: string;
  type: OutboxActionType;
  payload: any;
  timestamp: number;
  description: string;
}

const OUTBOX_KEY = "SHIFT_OFFLINE_OUTBOX";

export async function getOutboxQueue(): Promise<OutboxItem[]> {
  try {
    const queue = await get<OutboxItem[]>(OUTBOX_KEY);
    return Array.isArray(queue) ? queue : [];
  } catch (err) {
    console.error("Failed to read offline outbox:", err);
    return [];
  }
}

async function saveOutboxQueue(queue: OutboxItem[]): Promise<void> {
  try {
    await set(OUTBOX_KEY, queue);
    notifyQueueChange(queue.length);
  } catch (err) {
    console.error("Failed to save offline outbox:", err);
  }
}

export async function enqueueOutboxItem(type: OutboxActionType, payload: any, description: string): Promise<OutboxItem> {
  const item: OutboxItem = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    payload,
    timestamp: Date.now(),
    description,
  };
  const queue = await getOutboxQueue();
  queue.push(item);
  await saveOutboxQueue(queue);
  return item;
}

let isSyncing = false;
const listeners = new Set<(count: number) => void>();

function notifyQueueChange(count: number) {
  listeners.forEach((fn) => {
    try {
      fn(count);
    } catch {}
  });
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("shift:outbox-change", { detail: { count } }));
    } catch {}
  }
}

export function subscribeOutbox(fn: (count: number) => void): () => void {
  listeners.add(fn);
  getOutboxQueue().then((q) => fn(q.length));
  return () => listeners.delete(fn);
}

export async function processOfflineOutbox(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }
  if (isSyncing) return { synced: 0, failed: 0 };

  const queue = await getOutboxQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  isSyncing = true;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("shift:sync-start"));
  }

  let synced = 0;
  let failed = 0;
  const remaining: OutboxItem[] = [];

  for (const item of queue) {
    try {
      if (item.type === "record") {
        await API.record(
          item.payload.event_type,
          item.payload.at,
          item.payload.date,
          item.payload.allow_holiday
        );
      } else if (item.type === "addTask") {
        await API.addTask(item.payload);
      } else if (item.type === "patchTask") {
        await API.patchTask(item.payload.id, item.payload.body);
      } else if (item.type === "delTask") {
        await API.delTask(item.payload.id);
      } else if (item.type === "workMode") {
        await API.toggleWorkMode(item.payload.date);
      } else if (item.type === "editCheckin") {
        await API.editCheckin(item.payload.at, item.payload.date);
      }
      synced++;
    } catch (err: any) {
      const isNetError =
        !navigator.onLine ||
        err?.name === "TypeError" ||
        String(err?.message || "").toLowerCase().includes("network") ||
        String(err?.message || "").toLowerCase().includes("fetch");

      if (isNetError) {
        // Network dropped mid-sync; keep remaining items and stop
        remaining.push(item);
        break;
      } else {
        // Server rejected with 400 or logical error; discard and notify
        console.warn(`Outbox item ${item.id} (${item.description}) failed permanently:`, err);
        failed++;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("shift:sync-item-failed", {
              detail: { item, error: err?.message || String(err) },
            })
          );
        }
      }
    }
  }

  await saveOutboxQueue(remaining);
  isSyncing = false;

  if (synced > 0) {
    // Invalidate queries so fresh server data replaces optimistic state
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.today }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.week }),
      queryClient.invalidateQueries({ queryKey: ["month"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves }),
    ]);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("shift:sync-complete", {
          detail: { synced, failed, remaining: remaining.length },
        })
      );
    }
  }

  return { synced, failed };
}

// Attach automatic listeners if in browser
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    // Wait 1.5s for network stability then process
    setTimeout(() => {
      processOfflineOutbox();
    }, 1500);
  });
}
