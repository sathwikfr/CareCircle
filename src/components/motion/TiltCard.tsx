'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';

type Props = React.ComponentProps<typeof motion.div> & { max?: number };

/** Card that tilts a few degrees towards the pointer (fine pointers only), springing back on leave. */
export function TiltCard({ max = 7, style, children, onPointerMove, onPointerLeave, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 220, damping: 22 });
  const sy = useSpring(py, { stiffness: 220, damping: 22 });
  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const glowX = useTransform(sx, (v) => `${v * 100}%`);
  const glowY = useTransform(sy, (v) => `${v * 100}%`);

  return (
    <motion.div
      ref={ref}
      {...rest}
      style={{
        ...style,
        rotateX: reduce ? 0 : rotateX,
        rotateY: reduce ? 0 : rotateY,
        transformPerspective: 900,
        ['--glow-x' as string]: glowX,
        ['--glow-y' as string]: glowY,
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (e.pointerType !== 'mouse' || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
    </motion.div>
  );
}
