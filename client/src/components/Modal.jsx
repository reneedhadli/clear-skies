import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useDialog } from "../lib/useDialog.js";

export default function Modal({ open, onClose, title, subtitle, children, footer, wide = false }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const titleId = useId();
  const reduce = useReducedMotion();
  useDialog(open, onClose, panelRef);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
          <motion.div
            className="absolute inset-0 bg-night/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-surface shadow-[0_30px_100px_-20px_rgba(0,0,0,0.95)] ${
              wide ? "max-w-2xl" : "max-w-xl"
            }`}
            initial={reduce ? false : { opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-7 sm:pt-6">
              <div>
                <h2 id={titleId} className="text-xl font-extrabold tracking-tight sm:text-2xl">
                  {title}
                </h2>
                {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
              </div>
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Close dialog"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-text"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-6 sm:px-7">{children}</div>
            {footer && (
              <div className="border-t border-white/[0.06] bg-surface/95 px-5 py-4 sm:px-7">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
