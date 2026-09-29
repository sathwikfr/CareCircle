'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, RotateCcw, Smile, Pill } from 'lucide-react';
import styles from './landing.module.css';

type Line = { who: 'saathi' | 'parent'; text: string; en?: string };

const SCRIPTS: Record<string, { label: string; lines: Line[] }> = {
  te: {
    label: 'తెలుగు',
    lines: [
      { who: 'saathi', text: 'Namaskaram Amma! Tiffin tarvata BP tablet vesukunnara?', en: 'Did you take your BP tablet after breakfast?' },
      { who: 'parent', text: 'Vesukunnanu nanna, ippude.', en: 'Yes, just now.' },
      { who: 'saathi', text: 'Chala manchidi. Ee roju ela unnaru? Kallu tiragadam, noppi emaina unda?', en: 'How are you feeling today? Any dizziness or pain?' },
      { who: 'parent', text: 'Ledu, baagane unnanu. Podduna konchem nadichanu kuda.', en: "No, I'm well. I even went for a short walk." },
    ],
  },
  hi: {
    label: 'हिंदी',
    lines: [
      { who: 'saathi', text: 'Namaste Amma! Nashte ke baad BP ki goli le li?', en: 'Did you take your BP tablet after breakfast?' },
      { who: 'parent', text: 'Haan beta, abhi dus minute pehle li.', en: 'Yes, ten minutes ago.' },
      { who: 'saathi', text: 'Bahut accha. Aaj tabiyat kaisi hai? Chakkar ya dard toh nahi?', en: 'How are you feeling today? Any dizziness or pain?' },
      { who: 'parent', text: 'Nahi, sab theek hai. Subah thoda tehel bhi aayi.', en: "No, all fine. I went for a little walk too." },
    ],
  },
  ta: {
    label: 'தமிழ்',
    lines: [
      { who: 'saathi', text: 'Vanakkam Amma! Tiffin-ku apram BP maathirai saapteengala?', en: 'Did you take your BP tablet after breakfast?' },
      { who: 'parent', text: 'Saapten da, ippo thaan.', en: 'Yes, just now.' },
      { who: 'saathi', text: 'Romba nalladhu. Innaiku udambu eppadi irukku? Thalai suththal, vali edhavadhu?', en: 'How are you feeling today? Any dizziness or pain?' },
      { who: 'parent', text: 'Illa, nalla irukken. Kaalaiyila konjam nadandhen.', en: "No, I'm well. I walked a little this morning." },
    ],
  },
  en: {
    label: 'English',
    lines: [
      { who: 'saathi', text: 'Good morning Amma! Did you take your BP tablet after breakfast?' },
      { who: 'parent', text: 'Yes, just ten minutes ago.' },
      { who: 'saathi', text: 'Wonderful. How are you feeling today? Any dizziness or pain?' },
      { who: 'parent', text: "No, I'm fine. I even went for a short walk." },
    ],
  },
};

const STEP_MS = 1900;

function formatTimer(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function CallDemo() {
  const [lang, setLang] = useState<keyof typeof SCRIPTS>('te');
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const lines = SCRIPTS[lang].lines;
  const done = shown >= lines.length;

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const play = useCallback((script: Line[]) => {
    clear();
    setStarted(true);
    setShown(0);
    setSeconds(0);
    setTyping(true);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyping(false);
      setShown(script.length);
      setSeconds(62);
      return;
    }
    script.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setShown(i + 1);
          setTyping(i + 1 < script.length);
        }, 900 + i * STEP_MS)
      );
    });
  }, []);

  // Start the first time the card scrolls into view.
  const playRef = useRef(() => play(lines));
  useEffect(() => {
    playRef.current = () => play(lines);
  }, [play, lines]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        playRef.current();
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(node);
    return () => {
      io.disconnect();
      clear();
    };
  }, []);

  // Call timer ticks while the conversation is running.
  useEffect(() => {
    if (!started || done) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [started, done]);

  const nextWho = lines[shown]?.who;

  return (
    <div className={styles.demoStage} ref={rootRef}>
      <span className={styles.exampleTag}>Example call</span>
      <div className={styles.callCard}>
        <div className={styles.callHead}>
          <div className={styles.callWho}>
            <div className={styles.callAvatar} aria-hidden="true">A</div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.callName}>Amma · Hyderabad</div>
              <div className={styles.callMeta}>Morning check-in · 8:30 AM</div>
            </div>
          </div>
          <div className={styles.callTimer} aria-label={done ? 'Call ended' : 'Call in progress'}>
            <span className={`${styles.wave} ${started && !done ? styles.on : ''}`} aria-hidden="true">
              <i /><i /><i /><i /><i />
            </span>
            {done ? 'Ended' : formatTimer(seconds)}
          </div>
        </div>

        <div className={styles.langTabs} role="group" aria-label="Call language">
          {Object.entries(SCRIPTS).map(([key, s]) => (
            <button
              key={key}
              type="button"
              aria-pressed={lang === key}
              onClick={() => {
                setLang(key as keyof typeof SCRIPTS);
                play(SCRIPTS[key].lines);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className={styles.transcript} aria-live="polite">
          {lines.slice(0, shown).map((l, i) => (
            <div key={`${lang}-${i}`} className={`${styles.bubble} ${l.who === 'saathi' ? styles.saathi : styles.parent}`}>
              <span className={styles.bubbleWho}>{l.who === 'saathi' ? 'Saathi' : 'Amma'}</span>
              {l.text}
              {l.en && <small>{l.en}</small>}
            </div>
          ))}
          {typing && !done && (
            <div className={`${styles.typing} ${nextWho === 'parent' ? styles.right : ''}`} aria-hidden="true">
              <i /><i /><i />
            </div>
          )}
        </div>

        <div className={styles.callFoot}>
          <span>Illustrative conversation</span>
          <button type="button" className={styles.replay} onClick={() => play(lines)}>
            <RotateCcw size={13} /> Replay
          </button>
        </div>
      </div>

      <div className={`${styles.resultCard} ${done ? '' : styles.hidden}`} aria-hidden={!done}>
        <div className={styles.resultHead}>
          <span>Your dashboard</span>
          <span className="badge badge-green" style={{ letterSpacing: 0, textTransform: 'none' }}>Updated</span>
        </div>
        <div className={styles.resultRow}>
          <span className={styles.resultIcon}><Pill size={12} /></span>
          BP tablet taken
          <Check size={14} style={{ marginLeft: 'auto', color: 'var(--green)' }} />
        </div>
        <div className={styles.resultRow}>
          <span className={styles.resultIcon}><Smile size={12} /></span>
          Feeling well, went for a walk
        </div>
      </div>
    </div>
  );
}
