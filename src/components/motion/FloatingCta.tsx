'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, X } from 'lucide-react';

/** "Dynamic island" pill that springs in once the visitor has scrolled past the hero. Dismissible. */
export function FloatingCta({ href, label }: { href: string; label: string }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const nearEnd = y + window.innerHeight > document.documentElement.scrollHeight - 500;
        setShow(y > window.innerHeight * 0.9 && !nearEnd);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && !dismissed && (
        <motion.div
          className="float-cta show"
          initial={{ opacity: 0, y: 40, scale: 0.6, width: 56 }}
          animate={{ opacity: 1, y: 0, scale: 1, width: 'auto' }}
          exit={{ opacity: 0, y: 30, scale: 0.7 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          style={{ transform: 'none', overflow: 'hidden' }}
        >
          <Link href={href}>
            <motion.span initial={{ rotate: -90 }} animate={{ rotate: 0 }} transition={{ delay: 0.1 }}>
              <ArrowRight size={16} />
            </motion.span>
            <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }} style={{ whiteSpace: 'nowrap' }}>
              {label}
            </motion.span>
          </Link>
          <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
