'use client';

import React, { useEffect, useRef } from 'react';

/**
 * The bars inside the phone's Dynamic Island during a call.
 *   saathi - green bars that enter on the left and flow right
 *   parent - red bars that enter on the right and flow left
 *   quiet  - the last words flow out and settle to small dots
 * Drawn on a canvas; the loop only runs while `running` is true.
 */

export type WaveMode = 'off' | 'saathi' | 'parent' | 'quiet';

const GREEN = '48, 209, 88';
const RED = '255, 69, 58';
const WHITE = '255, 255, 255';

const BARS = 17;
const STEP_MS = 64;          // a new sample enters every step

type Sample = { a: number; c: string };

export function IslandWave({ mode, running }: { mode: WaveMode; running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    // Newest sample first; drawn from the left for Saathi, from the right for the parent.
    let samples: Sample[] = Array.from({ length: BARS + 2 }, () => ({ a: 0.06, c: WHITE }));
    let dir: 1 | -1 = 1;
    let last = performance.now();
    let acc = 0;
    let modeSince = last;
    let seenMode: WaveMode = modeRef.current;
    let smooth = 0.3;
    let raf = 0;

    const speech = (t: number) => {
      // Syllables at ~4 a second, with now and then a short gap between words.
      const syll = Math.abs(Math.sin((t / 1000) * Math.PI * 4.1 + Math.sin(t / 370) * 1.4));
      let a = (0.3 + 0.7 * syll) * (0.55 + 0.45 * Math.random());
      if (Math.random() < 0.09) a *= 0.2;
      smooth = smooth * 0.3 + a * 0.7;
      return Math.min(1, smooth);
    };

    const draw = (now: number) => {
      const m = modeRef.current;
      if (m !== seenMode) {
        const newDir = m === 'parent' ? -1 : m === 'saathi' ? 1 : dir;
        // Keep the bars where they are on screen when the flow turns round.
        if (newDir !== dir) samples = samples.slice().reverse();
        dir = newDir;
        seenMode = m;
        modeSince = now;
        acc = 0;
      }

      const dt = Math.min(64, now - last);
      last = now;
      acc += dt;

      while (acc >= STEP_MS) {
        acc -= STEP_MS;
        const speaking = m === 'saathi' || m === 'parent';
        if (!speaking) samples = samples.map((s) => ({ a: Math.max(0.06, s.a * 0.86), c: s.c }));
        const next: Sample = speaking
          ? { a: speech(now - modeSince), c: m === 'saathi' ? GREEN : RED }
          : { a: 0.06, c: WHITE };
        samples.unshift(next);
        samples.pop();
      }

      ctx.clearRect(0, 0, w, h);
      const gap = w / BARS;
      const bw = Math.max(1.5, Math.min(gap * 0.46, h * 0.13));
      const mid = h / 2;
      ctx.lineCap = 'round';
      ctx.lineWidth = bw;

      const frac = acc / STEP_MS;
      samples.forEach((s, i) => {
        const fromLeft = (i - 0.5 + frac) * gap;
        const x = dir === 1 ? fromLeft : w - fromLeft;
        if (x < -bw || x > w + bw) return;
        // Fade the bars as they leave the island.
        const edge = Math.min(1, Math.min(x, w - x) / (gap * 1.6));
        const half = Math.max(0.5, (s.a * (h - bw * 2)) / 2);
        const alpha = (s.c === WHITE ? 0.3 : 0.55 + s.a * 0.45) * Math.max(0, edge);
        ctx.strokeStyle = `rgba(${s.c}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(x, mid - half);
        ctx.lineTo(x, mid + half);
        ctx.stroke();
      });

      if (running) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [running]);

  return <canvas ref={canvasRef} aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }} />;
}
