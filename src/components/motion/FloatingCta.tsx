'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';

/** Small pill that slides in once the visitor has scrolled past the hero. Dismissible. */
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

  if (dismissed) return null;

  return (
    <div className={`float-cta${show ? ' show' : ''}`} aria-hidden={!show}>
      <Link href={href} tabIndex={show ? 0 : -1}>
        <span><ArrowRight size={16} /></span>
        {label}
      </Link>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" tabIndex={show ? 0 : -1}>
        <X size={14} />
      </button>
    </div>
  );
}
