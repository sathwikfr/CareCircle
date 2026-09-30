'use client';

import React from 'react';
import { MotionConfig } from 'motion/react';

/** App-wide Motion defaults: honour the OS "reduce motion" setting, use a soft spring. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}>
      {children}
    </MotionConfig>
  );
}
