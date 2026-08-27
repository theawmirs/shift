import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export function Drawer({
  open,
  onClose,
  title,
  children,
  height = "82vh",
}: {
  open: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
  height?: string;
}) {
  const dragControls = useDragControls();

  // Lock scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const portalContent = (
    <AnimatePresence>
      {open && (
        <div style={{ position: "relative", zIndex: 9999 }}>
          {/* Backdrop Overlay */}
          <motion.div
            key="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onOverlay}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              background: "rgba(8,12,22,.65)",
              backdropFilter: "blur(4px)",
            }}
          />

          {/* Bottom Sheet Modal */}
          <motion.div
            key="drawer-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              maxWidth: 430,
              width: "100%",
              margin: "0 auto",
              maxHeight: height,
              display: "flex",
              flexDirection: "column",
              background: "var(--card, #fff)",
              color: "var(--text, #0F172A)",
              borderTop: "3px solid #000",
              borderLeft: "2px solid #000",
              borderRight: "2px solid #000",
              borderRadius: "20px 20px 0 0",
              boxShadow: "0 -12px 40px rgba(0,0,0,.35)",
              overflow: "hidden",
            }}
          >
            {/* Grab Bar */}
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 999,
                background: "var(--text, #000)",
                opacity: 0.2,
                margin: "10px auto 6px",
              }}
            />

            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 16px 10px",
                borderBottom: "2px solid var(--border, rgba(0,0,0,.08))",
              }}
            >
              <b className="mono" style={{ fontSize: 15, fontWeight: 800 }}>
                {title}
              </b>
              <button
                type="button"
                className="btn btn-ghost"
                style={{
                  width: "auto",
                  padding: "4px 10px",
                  fontSize: 12,
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onClose}
              >
                ✕ بستن
              </button>
            </div>

            {/* Content Body */}
            <div
              style={{
                overflowY: "auto",
                padding: "14px 16px calc(24px + env(safe-area-inset-bottom))",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(portalContent, document.body);
}
