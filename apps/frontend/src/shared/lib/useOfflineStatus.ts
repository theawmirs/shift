import { useState, useEffect, useCallback } from "react";
import { getOutboxQueue, subscribeOutbox, processOfflineOutbox } from "./offlineSync";

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsubscribe = subscribeOutbox((count) => {
      setPendingCount(count);
    });

    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncComplete = () => setIsSyncing(false);

    window.addEventListener("shift:sync-start", handleSyncStart);
    window.addEventListener("shift:sync-complete", handleSyncComplete);

    getOutboxQueue().then((q) => setPendingCount(q.length));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
      window.removeEventListener("shift:sync-start", handleSyncStart);
      window.removeEventListener("shift:sync-complete", handleSyncComplete);
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (isOnline && !isSyncing) {
      setIsSyncing(true);
      try {
        await processOfflineOutbox();
      } finally {
        setIsSyncing(false);
      }
    }
  }, [isOnline, isSyncing]);

  return { isOnline, pendingCount, isSyncing, syncNow };
}
