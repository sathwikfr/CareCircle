'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import c from './liveCallPhone.module.css';

/**
 * iPhone-style "slide to answer". Drag the green knob to the right to pick up;
 * let go early and it springs back. If nobody touches it, the knob slides
 * across slowly on its own after `autoDelay` ms (and again a little after a
 * drag that didn't make it). Enter, Space or → also answers.
 */

type Mode = 'rest' | 'drag' | 'spring' | 'auto' | 'done';

export const AUTO_SLIDE_MS = 1700;
const RETRY_MS = 2600;
const ANSWER_AT = 0.72;      // share of the track that counts as answered

export function SlideToAnswer({ autoDelay, onAnswer }: { autoDelay: number | null; onAnswer: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLButtonElement>(null);
  const [x, setX] = useState(0);
  const [mode, setMode] = useState<Mode>('rest');
  const [maxX, setMaxX] = useState(1);
  const grab = useRef({ from: 0, at: 0, moved: false });
  const timers = useRef<number[]>([]);
  const answered = useRef(false);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const travel = () => {
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return 0;
    const pad = knob.offsetLeft;
    return Math.max(0, track.clientWidth - knob.offsetWidth - pad * 2);
  };

  const finish = useCallback(() => {
    if (answered.current) return;
    answered.current = true;
    clearTimers();
    setMode('done');
    setX(travel());
    timers.current.push(window.setTimeout(onAnswer, 240));
  }, [onAnswer]);

  const startAuto = useCallback(() => {
    if (answered.current) return;
    setMode('auto');
    // Next frame, so the transition runs from where the knob is now.
    requestAnimationFrame(() => setX(travel()));
    timers.current.push(window.setTimeout(finish, AUTO_SLIDE_MS + 60));
  }, [finish]);

  const scheduleAuto = useCallback((ms: number) => {
    timers.current.push(window.setTimeout(startAuto, ms));
  }, [startAuto]);

  useEffect(() => {
    if (autoDelay !== null) scheduleAuto(autoDelay);
    return clearTimers;
  }, [autoDelay, scheduleAuto]);

  // Track length, for fading the label as the knob moves.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => setMaxX(travel() || 1));
    ro.observe(track);
    return () => ro.disconnect();
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (answered.current) return;
    clearTimers();
    // Pick the knob up where it is, even halfway through the auto slide.
    const track = trackRef.current!.getBoundingClientRect();
    const knob = knobRef.current!;
    const now = knob.getBoundingClientRect().left - track.left - knob.offsetLeft;
    grab.current = { from: e.clientX - now, at: e.clientX, moved: false };
    setX(now);
    setMode('drag');
    knob.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (mode !== 'drag') return;
    if (Math.abs(e.clientX - grab.current.at) > 3) grab.current.moved = true;
    setX(Math.min(travel(), Math.max(0, e.clientX - grab.current.from)));
  };

  const onPointerUp = () => {
    if (mode !== 'drag') return;
    const max = travel();
    if (max && x >= max * ANSWER_AT) {
      finish();
      return;
    }
    // A tap rather than a slide: nudge the knob to show which way it goes.
    setMode('spring');
    setX(grab.current.moved ? 0 : Math.min(max, 26));
    if (!grab.current.moved) timers.current.push(window.setTimeout(() => setX(0), 260));
    if (autoDelay !== null) scheduleAuto(RETRY_MS);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      finish();
    }
  };

  const share = Math.min(1, x / maxX);

  return (
    <div ref={trackRef} className={c.slider} data-mode={mode}>
      <span className={c.sliderText} style={{ opacity: Math.max(0, 1 - share * 1.8) }} aria-hidden="true">
        slide to answer
      </span>
      <button
        ref={knobRef}
        type="button"
        className={c.knob}
        style={{ transform: `translateX(${x}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        aria-label="Answer the example call (slide right, or press Enter)"
      >
        <Phone size={20} fill="currentColor" strokeWidth={0} />
      </button>
    </div>
  );
}
