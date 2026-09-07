import { QueryClient } from "@tanstack/react-query";
import { get, set, del } from "idb-keyval";
import { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

export function createIDBPersister(idbKey = "SHIFT_QUERY_OFFLINE_CACHE"): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(idbKey, client);
      } catch (err) {
        console.warn("Failed to persist query client to IndexedDB:", err);
      }
    },
    restoreClient: async () => {
      try {
        return await get<PersistedClient>(idbKey);
      } catch (err) {
        console.warn("Failed to restore query client from IndexedDB:", err);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(idbKey);
      } catch (err) {
        console.warn("Failed to remove query client from IndexedDB:", err);
      }
    },
  };
}

export const idbPersister = createIDBPersister();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days retention
      refetchOnWindowFocus: false,
      retry: (failureCount) => {
        if (typeof navigator !== "undefined" && !navigator.onLine) return false;
        return failureCount < 2;
      },
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});
