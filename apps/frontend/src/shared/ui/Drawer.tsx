import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Drawer({
  open,
  onClose,
  title,
  children,
  height = "78vh",
}: {
  open: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
  height?: string;
}) {
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

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onOverlay}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 80,
              background: "rgba(8,12,22,.48)",
              backdropFilter: "blur(2px)",
            }}
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 81,
              maxWidth: 430,
              width: "100%",
              margin: "0 auto",
              maxHeight: height,
              display: "flex",
              flexDirection: "column",
              background: "var(--bg, #f7f6f0)",
              borderTop: "2px solid #000",
              borderLeft: "2px solid #000",
              borderRight: "2px solid #000",
              borderRadius: "18px 18px 0 0",
              boxShadow: "0 -12px 40px rgba(0,0,0,.18)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 999,
                background: "#000",
                opacity: 0.12,
                margin: "10px auto 6px",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px 10px",
                borderBottom: "1px solid rgba(0,0,0,.08)",
              }}
            >
              <b className="mono" style={{ fontSize: 14, fontWeight: 800 }}>
                {title}
              </b>
              <button
                className="btn btn-ghost"
                style={{
                  width: "auto",
                  padding: "6px 10px",
                  fontSize: 12,
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onClick={onClose}
              >
                ✕ بستن
              </button>
            </div>
            <div
              style={{
                overflow: "auto",
                padding: "14px 14px calc(14px + env(safe-area-inset-bottom))",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
