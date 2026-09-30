'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PhoneCall, PhoneOff, MessageCircle, LayoutDashboard, Check, Smile, AlertTriangle, PenLine } from 'lucide-react';
import s from './home.module.css';

type Stage = 0 | 1 | 2;

const LINES = [
  { who: 'saathi', text: 'Namaste Amma! Nashte ke baad BP ki goli li?' },
  { who: 'parent', text: 'Haan beta, abhi le li.' },
  { who: 'saathi', text: 'Bahut accha. Aaj tabiyat kaisi hai?' },
  { who: 'parent', text: 'Theek hoon. Bas ghutne mein thoda dard hai.' },
] as const;

const STEPS = [
  { icon: PhoneCall, title: 'Saathi calls on time', body: 'At each medicine time, Amma’s phone rings. Any phone, even a landline.', ms: 3200 },
  { icon: MessageCircle, title: 'A short, kind chat', body: 'Did she take her tablet? How is she feeling? In her language, at her pace.', ms: 7200 },
  { icon: LayoutDashboard, title: 'You see how she is', body: 'Medicines, mood and anything worrying land on your dashboard right away.', ms: 5200 },
];

/** Auto-playing example call inside a phone, synced to three step cards. Starts when scrolled into view. */
export function LiveCallPhone() {
  const [stage, setStage] = useState<Stage>(0);
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const loopRef = useRef<(from: Stage) => void>(() => {});

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const play = useCallback((from: Stage) => {
    clear();
    setRunning(true);
    setRunId((n) => n + 1);
    setStage(from);
    setShown(from === 0 ? 0 : from === 1 ? 0 : LINES.length);
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    let t = 0;
    if (from === 0) {
      t += STEPS[0].ms;
      at(t, () => setStage(1));
    }
    if (from <= 1) {
      LINES.forEach((_, i) => at(t + 500 + i * 1600, () => setShown(i + 1)));
      t += STEPS[1].ms;
      at(t, () => setStage(2));
    }
    t += STEPS[2].ms;
    at(t, () => loopRef.current(0));
  }, []);

  useEffect(() => {
    loopRef.current = play;
  }, [play]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = window.setTimeout(() => {
        setStage(2);
        setShown(LINES.length);
      }, 0);
      return () => window.clearTimeout(id);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        play(0);
      }
    }, { threshold: 0.35 });
    io.observe(node);
    return () => {
      io.disconnect();
      clear();
    };
  }, [play]);

  return (
    <div ref={rootRef}>
      <div className={s.phone}>
        <span className={s.exampleTag} style={{ top: '-12px', right: '24px' }}>Example</span>
        <div className={s.phoneScreen}>
          <span className={s.notch} aria-hidden="true" />
          <div className={s.phoneTop}>
            <span className={s.phoneAvatar}>A</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Amma</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--ink-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="dot live" style={{ width: '6px', height: '6px' }} />
                {stage === 0 ? 'Calling… 8:30 AM' : stage === 1 ? 'On call · Hindi' : 'Call ended · 1m 12s'}
              </div>
            </div>
          </div>

          <div className={s.phoneBody} aria-live="polite">
            {stage === 0 && (
              <div className={s.ring}>
                <div className={s.ringOrb}><PhoneCall size={32} /></div>
                <div style={{ fontWeight: 600 }}>Saathi is calling Amma</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-subtle)' }}>Morning medicine check-in</div>
              </div>
            )}

            {stage >= 1 &&
              LINES.slice(0, shown).map((l, i) => (
                <div key={i} className={`${s.bubble} ${l.who === 'saathi' ? s.bSaathi : s.bParent}`}>
                  <small>{l.who === 'saathi' ? 'Saathi' : 'Amma'}</small>
                  {l.text}
                </div>
              ))}

            {stage === 2 && (
              <div className={s.noting}>
                <div className={s.notingHead}><PenLine size={13} /> Saathi noted</div>
                <div className={s.notingRow}><Check size={15} color="var(--green)" /> BP tablet taken</div>
                <div className={s.notingRow} style={{ animationDelay: '180ms' }}><Smile size={15} color="var(--gold)" /> Mood: okay</div>
                <div className={s.notingRow} style={{ animationDelay: '360ms' }}><AlertTriangle size={15} color="var(--amber)" /> Mentioned knee pain</div>
              </div>
            )}
          </div>

          <div className={s.phoneFoot}>
            <span>{stage === 2 ? 'Sent to your dashboard' : 'Saathi · Aaptha'}</span>
            <span className={s.hangup}><PhoneOff size={16} /></span>
          </div>
        </div>
      </div>

      <div className={s.stepsRow}>
        {STEPS.map((st, i) => (
          <button
            key={st.title}
            type="button"
            className={s.stepCard}
            aria-current={running && stage === i ? 'step' : undefined}
            onClick={() => play(i as Stage)}
          >
            <span className={s.stepBadge}>
              <span><st.icon size={18} /></span>
              <b>{i + 1}</b>
            </span>
            <h3>{st.title}</h3>
            <p>{st.body}</p>
            {running && stage === i && (
              <span className={s.stepProgress} aria-hidden="true">
                <i key={`${runId}-${stage}`} style={{ '--dur-step': `${st.ms}ms` } as React.CSSProperties} />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
