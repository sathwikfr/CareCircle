'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

const subscribe = () => () => {};

/** Accessible dialog rendered into <body>; springs in, animates out, closes on Escape or backdrop click. */
export function Modal({ open, onClose, children, labelledBy, width }: { open: boolean; onClose: () => void; children: React.ReactNode; labelledBy?: string; width?: number }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!isClient) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          style={{ animation: 'none' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            style={{ animation: 'none', ...(width ? { maxWidth: `${width}px` } : {}) }}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <button className="btn btn-quiet btn-icon modal-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
