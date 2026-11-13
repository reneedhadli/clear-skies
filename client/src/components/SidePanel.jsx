import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useDialog } from "../lib/useDialog.js";

export default function SidePanel({ open, onClose, title, subtitle, children, footer }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const reduce = useReducedMotion();
  useDialog(open, onClose, panelRef);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            className="absolute inset-0 bg-night/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-white/10 bg-surface shadow-[-30px_0_100px_-30px_rgba(0,0,0,0.9)] sm:rounded-l-[28px]"
            initial={reduce ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: reduce ? 0 : 0.28, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
              <div>
                <h2 id={titleId} className="text-2xl font-extrabold tracking-tight">
                  {title}
                </h2>
                {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-text"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
            {footer && (
              <div className="border-t border-white/[0.06] bg-surface px-6 py-4">{footer}</div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
