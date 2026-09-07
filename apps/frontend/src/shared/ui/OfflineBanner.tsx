import React from "react";
import { WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { useOfflineStatus } from "../lib/useOfflineStatus";

export const OfflineBanner: React.FC = () => {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineStatus();

  // If online and nothing is syncing or pending, render nothing
  if (isOnline && !isSyncing && pendingCount === 0) {
    return null;
  }

  return (
    <aside
      aria-label="وضعیت اتصال شبکه"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        width: "100%",
        padding: "8px 14px",
        fontSize: "0.82rem",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        transition: "all 0.25s ease",
        background: !isOnline
          ? "rgba(220, 38, 38, 0.92)" // Red banner for offline
          : isSyncing
          ? "rgba(37, 99, 235, 0.92)" // Blue banner for syncing
          : "rgba(217, 119, 6, 0.92)", // Amber banner for pending queue
        color: "#FFFFFF",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {!isOnline ? (
          <WifiOff size={16} strokeWidth={2.4} />
        ) : isSyncing ? (
          <RefreshCw size={16} strokeWidth={2.4} className="spin" />
        ) : (
          <AlertCircle size={16} strokeWidth={2.4} />
        )}
        <span>
          {!isOnline
            ? "آفلاین هستید — اطلاعات از حافظه محلی لود شده است"
            : isSyncing
            ? "در حال همگام‌سازی اطلاعات با سرور..."
            : "اتصال برقرار شد — در انتظار همگام‌سازی صف محلی"}
        </span>
        {pendingCount > 0 && (
          <span
            style={{
              background: "rgba(255, 255, 255, 0.25)",
              padding: "2px 6px",
              borderRadius: "10px",
              fontSize: "0.75rem",
              marginRight: "6px",
            }}
          >
            {pendingCount} مورد معلق
          </span>
        )}
      </div>

      {isOnline && pendingCount > 0 && !isSyncing && (
        <button
          type="button"
          onClick={syncNow}
          style={{
            background: "#FFFFFF",
            color: "#1E293B",
            border: "none",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <RefreshCw size={12} />
          ارسال
        </button>
      )}
    </aside>
  );
};
