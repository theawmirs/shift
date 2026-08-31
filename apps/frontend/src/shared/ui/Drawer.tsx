import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import { X } from "lucide-react";

/**
 * Responsive Modal / Drawer:
 * - On Mobile (< 860px): Native BottomSheet with drag-to-close grab bar and smooth bottom sheet entrance.
 * - On Desktop (>= 860px): Centered Floating Dialog Modal with scale+fade animation, neo-brutalist border, and backdrop.
 */
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
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 860;
  });

  // Track window resize for responsive mode
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 860);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape key press
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const onOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isDesktop && (info.offset.y > 80 || info.velocity.y > 300)) {
      onClose?.();
    }
  };

  const portalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="drawer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "linear" }}
          onClick={onOverlay}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(8, 12, 22, 0.70)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: isDesktop ? "center" : "flex-end",
            justifyContent: "center",
            padding: isDesktop ? "24px 16px" : 0,
            willChange: "opacity",
          }}
        >
          {isDesktop ? (
            /* ── DESKTOP CENTERED MODAL ── */
            <motion.div
              key="desktop-modal"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "540px",
                maxHeight: "85vh",
                background: "var(--card, #111D33)",
                color: "var(--text, #F1F5F9)",
                border: "3px solid #000",
                borderRadius: "22px",
                boxShadow: "8px 8px 0 #000",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                zIndex: 9999,
                position: "relative",
              }}
            >
              {/* Desktop Modal Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: "2px solid var(--border-strong, #000)",
                  background: "var(--surface-2, rgba(0,0,0,0.15))",
                }}
              >
                <b className="mono" style={{ fontSize: 16, fontWeight: 900, color: "var(--text)" }}>
                  {title}
                </b>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 34, height: 34, borderRadius: 10, boxShadow: "2px 2px 0 #000" }}
                  onClick={onClose}
                  title="بستن پنجره"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Desktop Modal Content */}
              <div
                className="custom-scroll"
                style={{
                  overflowY: "auto",
                  padding: "20px",
                  maxHeight: "calc(85vh - 70px)",
                }}
              >
                {children}
              </div>
            </motion.div>
          ) : (
            /* ── MOBILE BOTTOM SHEET ── */
            <motion.div
              key="mobile-drawer-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.02, bottom: 0.2 }}
              onDragEnd={handleDragEnd}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "430px",
                maxHeight: height,
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                background: "var(--card, #111D33)",
                color: "var(--text, #F1F5F9)",
                borderTop: "3px solid #000",
                borderLeft: "2px solid #000",
                borderRight: "2px solid #000",
                borderRadius: "20px 20px 0 0",
                boxShadow: "0 -12px 40px rgba(0,0,0,.35)",
                overflow: "hidden",
                zIndex: 9999,
                willChange: "transform",
                transform: "translateZ(0)",
              }}
            >
              {/* Draggable Header / Grab Bar */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                style={{
                  touchAction: "none",
                  cursor: "grab",
                  userSelect: "none",
                  paddingTop: 8,
                  background: "inherit",
                }}
              >
                {/* Grab Bar */}
                <div
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 999,
                    background: "var(--text, #000)",
                    opacity: 0.25,
                    margin: "2px auto 6px",
                  }}
                />

                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 16px 10px",
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
              </div>

              {/* Content Body */}
              <div
                className="custom-scroll"
                style={{
                  overflowY: "auto",
                  padding: "14px 16px calc(24px + env(safe-area-inset-bottom))",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {children}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(portalContent, document.body);
}
