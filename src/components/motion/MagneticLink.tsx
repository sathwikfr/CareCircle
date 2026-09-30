'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

const MotionLink = motion.create(Link);

/** Call-to-action link that leans a little towards the cursor and presses in with a spring. */
export function MagneticLink({ href, className, children, strength = 0.25 }: { href: string; className?: string; children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 300, damping: 20 });
  const y = useSpring(useMotionValue(0), { stiffness: 300, damping: 20 });

  return (
    <MotionLink
      ref={ref}
      href={href}
      className={className}
      style={{ x, y }}
      whileTap={{ scale: 0.96 }}
      onPointerMove={(e: React.PointerEvent<HTMLAnchorElement>) => {
        if (reduce || e.pointerType !== 'mouse' || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </MotionLink>
  );
}
