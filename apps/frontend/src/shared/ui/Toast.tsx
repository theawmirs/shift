import React, { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";

export type ToastVariant = "success" | "error";

export interface ToastItem {
  id: number;
  msg: string;
  variant: ToastVariant;
}

export interface ToastContextType {
  push: (msg: string, variant?: ToastVariant) => void;
  dismiss: (id: number) => void;
}

const ToastCtx = createContext<ToastContextType | null>(null);
export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    return {
      push: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
};

// Only call push() for POST-like mutations (save, toggle, add, record).
// Navigation / tab switches must NOT trigger a toast.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = (msg: string, variant: ToastVariant = "success") => {
    const id = Date.now() + Math.random();
    setToasts((s) => [...s, { id, msg, variant }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), 2800);
  };
  const dismiss = (id: number) => setToasts((s) => s.filter((t) => t.id !== id));
  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 78,
          margin: "0 auto",
          maxWidth: 430,
          width: "100%",
          padding: "0 12px",
          zIndex: 50,
          display: "grid",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: 12, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 6, opacity: 0 }}
              transition={{ type: "tween", duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className={`toast ${t.variant === "error" ? "toast--error" : "toast--success"}`}
              style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
            >
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`toast-icon ${t.variant === "error" ? "toast-icon--err" : "toast-icon--ok"}`}>
                  {t.variant === "error" ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                </span>
                {t.msg}
              </span>
              <button
                className="btn btn-ghost"
                style={{ width: "auto", padding: "6px 10px", boxShadow: "2px 2px 0 #000" }}
                onClick={() => dismiss(t.id)}
              >
                باشه
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
