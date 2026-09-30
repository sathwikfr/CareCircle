'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'motion/react';

/**
 * Moves its children vertically as the page scrolls past them.
 * speed > 0 drifts up faster than the page, < 0 lags behind. Kept small on purpose.
 */
export function Parallax({ speed = 0.15, className, style, children }: { speed?: number; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const raw = useTransform(scrollYProgress, [0, 1], [120 * speed, -120 * speed]);
  const y = useSpring(raw, { stiffness: 120, damping: 24, mass: 0.4 });
  return (
    <motion.div ref={ref} className={className} style={{ ...style, y: reduce ? 0 : y }}>
      {children}
    </motion.div>
  );
}
