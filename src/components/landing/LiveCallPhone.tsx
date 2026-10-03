'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PhoneCall, MessageCircle, LayoutDashboard, Check, Smile, AlertTriangle, Heart, Phone, PhoneOff,
  Volume2, Video, MicOff, UserPlus, Grid3x3, AlarmClock, RotateCcw, Languages,
} from 'lucide-react';
import { IslandWave, type WaveMode } from './IslandWave';
import { SlideToAnswer, AUTO_SLIDE_MS } from './SlideToAnswer';
import { CALL_LANGS, CALL_SCRIPT, TIMELINE, CALL_MS, CALL_LANG_EVENT, formatCallTime, isCallLang, type CallLang } from './callScript';
import c from './liveCallPhone.module.css';

/**
 * "How it works": an example Saathi call on Amma's phone (an iPhone 16).
 * It rings (the phone icon shakes in the Dynamic Island), then either you slide
 * to answer or the knob slides across by itself. On the call the island shows
 * who is talking: green bars flowing left to right for Saathi, red bars flowing
 * right to left for Amma, while the words appear on the screen. What Saathi
 * notes fills the card beside the phone, and a timeline under it follows along.
 * Everything here is a scripted example; nothing is fetched.
 */

type Phase = 'idle' | 'ring' | 'answer' | 'talk' | 'ended';

const RING_BEFORE_AUTO_MS = 4200;
const ANSWER_MS = 520;
const AFTER_MS = 11000;          // how long the ended call stays before it rings again
const AUTO_PLAYS = 2;            // plays by itself this many times, then waits on the finished call

/** The timeline under the phone: the three parts of a call. Click one to jump there. */
const PARTS = [
  { icon: PhoneCall, title: 'Phone rings' },
  { icon: MessageCircle, title: 'The chat' },
  { icon: LayoutDashboard, title: 'Your update' },
];
const RING_MS = RING_BEFORE_AUTO_MS + AUTO_SLIDE_MS + ANSWER_MS;

/** What Saathi notes, and the line (index in CALL_SCRIPT) whose answer fills it in. */
const NOTES: { after: number; icon: typeof Check; tone: 'good' | 'calm' | 'warn'; label: string; sub?: string; value: string }[] = [
  { after: 1, icon: Check, tone: 'good', label: 'Amlodipine 5mg', sub: 'BP tablet, after breakfast', value: 'Taken' },
  { after: 3, icon: Smile, tone: 'calm', label: 'Mood', value: 'Calm' },
  { after: 3, icon: AlertTriangle, tone: 'warn', label: 'Mentioned', value: 'Knee pain' },
];

/** Saathi's opening words (the first two sentences of the call) in a language. */
const greeting = (l: CallLang) => (CALL_SCRIPT[0].text[l].match(/[^.!?।]+[.!?।]+/g) ?? []).slice(0, 2).join('').trim();

const CONTROLS = [
  { icon: Volume2, label: 'speaker' },
  { icon: Video, label: 'video' },
  { icon: MicOff, label: 'mute' },
  { icon: UserPlus, label: 'add' },
  { icon: PhoneOff, label: 'end', end: true },
  { icon: Grid3x3, label: 'keypad' },
];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/* ---------- Small pieces ---------- */

function StatusBar() {
  return (
    <div className={c.status} aria-hidden="true">
      <span className={c.statusSide}><time>8:30</time></span>
      <span className={c.statusSide}>
        <svg viewBox="0 0 18 12" className={c.sbSignal}>
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 16 12" className={c.sbWifi}>
          <path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.3A10.5 10.5 0 0 0 8 .8C5.2.8 2.7 1.9.8 3.7L2 5c1.6-1.5 3.7-2.4 6-2.4Z" />
          <path d="M8 6.2c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.8 6.8 0 0 0 8 4.4c-1.8 0-3.4.7-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3Z" />
          <path d="M8 9.8 10 7.9A2.9 2.9 0 0 0 8 7.1c-.8 0-1.5.3-2 .8L8 9.8Z" />
        </svg>
        <svg viewBox="0 0 27 13" className={c.sbBattery}>
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.6" fill="none" stroke="currentColor" strokeOpacity="0.4" />
          <rect x="2.2" y="2.2" width="16" height="8.6" rx="2" />
          <path d="M25 4.3v4.4c.9-.3 1.5-1.2 1.5-2.2s-.6-1.9-1.5-2.2Z" fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

/* ---------- The section ---------- */

export function LiveCallPhone() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [lang, setLang] = useState<CallLang>('en');
  const [talkMs, setTalkMs] = useState(0);
  const [run, setRun] = useState(0);
  const [visible, setVisible] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [autoLeft, setAutoLeft] = useState(AUTO_PLAYS);
  const talkRef = useRef(0);
  const startedRef = useRef(false);
  const deviceRef = useRef<HTMLDivElement>(null);

  const setTalk = (ms: number) => {
    talkRef.current = ms;
    setTalkMs(ms);
  };

  const ring = useCallback(() => {
    startedRef.current = true;
    talkRef.current = 0;
    setTalkMs(0);
    setRun((n) => n + 1);
    setPhase('ring');
  }, []);

  const answer = useCallback(() => setPhase('answer'), []);

  /** Asked for by the visitor: play once more, and stop playing on its own. */
  const replay = () => {
    setAutoLeft(0);
    ring();
  };

  /** Step cards: jump straight to a part of the call. */
  const jump = (i: number) => {
    startedRef.current = true;
    setAutoLeft(0);
    if (i === 0) return ring();
    setRun((n) => n + 1);
    if (i === 1 && !reduce) {
      setTalk(0);
      setPhase('talk');
      return;
    }
    setTalk(CALL_MS);
    setPhase('ended');
  };

  // Start ringing the first time the phone is properly on screen; pause the call while it's off screen.
  useEffect(() => {
    const node = deviceRef.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = window.setTimeout(() => {
        setReduce(true);
        setTalk(CALL_MS);
        setPhase('ended');
      }, 0);
      return () => window.clearTimeout(id);
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.35) {
        setVisible(true);
        if (!startedRef.current) {
          setAutoLeft(AUTO_PLAYS - 1);
          ring();
        }
      } else if (!e.isIntersecting) {
        setVisible(false);
      }
    }, { threshold: [0, 0.35] });
    io.observe(node);
    return () => io.disconnect();
  }, [ring]);

  // Other sections (the language grid) can switch the call's language.
  useEffect(() => {
    const onLang = (e: Event) => {
      const next = (e as CustomEvent).detail;
      if (isCallLang(next)) setLang(next);
    };
    window.addEventListener(CALL_LANG_EVENT, onLang);
    return () => window.removeEventListener(CALL_LANG_EVENT, onLang);
  }, []);

  // Picked up: a moment for the screen to change, then the conversation.
  useEffect(() => {
    if (phase !== 'answer') return;
    const id = window.setTimeout(() => {
      if (reduce) {
        setTalk(CALL_MS);
        setPhase('ended');
      } else {
        setTalk(0);
        setPhase('talk');
      }
    }, ANSWER_MS);
    return () => window.clearTimeout(id);
  }, [phase, reduce]);

  // The call clock. Pauses (and later resumes) while the phone is off screen.
  useEffect(() => {
    if (phase !== 'talk' || !visible) return;
    const start = performance.now() - talkRef.current;
    const id = window.setInterval(() => {
      const t = performance.now() - start;
      if (t >= CALL_MS) {
        setTalk(CALL_MS);
        setPhase('ended');
      } else {
        setTalk(t);
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [phase, visible]);

  // After a pause on the result, ring again (until the automatic plays run out).
  useEffect(() => {
    if (phase !== 'ended' || !visible || reduce || autoLeft <= 0) return;
    const id = window.setTimeout(() => {
      setAutoLeft((n) => n - 1);
      ring();
    }, AFTER_MS);
    return () => window.clearTimeout(id);
  }, [phase, visible, reduce, autoLeft, ring, run]);

  /* ---------- What to show ---------- */

  const onCall = phase === 'answer' || phase === 'talk' || phase === 'ended';
  const ms = phase === 'talk' ? talkMs : phase === 'ended' ? CALL_MS : 0;
  const speaking = phase === 'talk' ? TIMELINE.find((t) => ms >= t.start && ms < t.end) : undefined;
  const speaker = speaking?.who ?? null;
  const waveMode: WaveMode = phase === 'talk' || phase === 'answer' ? speaker ?? 'quiet' : 'off';
  const islandMode = phase === 'ring' ? 'ring' : phase === 'answer' || phase === 'talk' ? 'call' : 'idle';
  const shown = TIMELINE.filter((t) => ms >= t.start);
  const finished = TIMELINE.filter((t) => ms >= t.end).length;
  const lastDone = finished ? CALL_SCRIPT[finished - 1] : undefined;
  const stage = phase === 'talk' ? 1 : phase === 'ended' ? 2 : 0;
  const started = phase !== 'idle';
  const ringsAgain = phase === 'ended' && autoLeft > 0 && !reduce;
  const langName = CALL_LANGS.find((l) => l.key === lang)!.name;

  const hint = phase === 'talk' || phase === 'answer'
    ? 'The words appear as they are said, in Amma’s language.'
    : phase === 'ended'
      ? 'Medicines, mood and anything worrying, on your dashboard.'
      : 'Works on any phone, even a landline. Slide to answer.';

  return (
    <div className={c.stage}>
      <div className={c.scene}>
        {/* Left: the call language */}
        <div className={c.colLeft}>
          <div className={`${c.card} ${c.langCard}`}>
            <span className={c.kicker}><Languages size={14} /> Amma’s language</span>
            <div className={`segmented ${c.seg}`} role="group" aria-label="Language of the example call">
              {CALL_LANGS.map((l) => (
                <button key={l.key} type="button" aria-pressed={lang === l.key} onClick={() => setLang(l.key)} lang={l.key}>
                  {l.label}
                </button>
              ))}
            </div>
            {/* What she hears first, in the chosen language */}
            <div key={lang} className={c.greet}>
              <span className={c.greetWho}>
                <span className={c.greetBars} aria-hidden="true"><i /><i /><i /><i /></span>
                Saathi says
              </span>
              <p lang={lang}>{greeting(lang)}</p>
              {lang !== 'en' && <small>{greeting('en')}</small>}
            </div>
            <p className={c.langFoot}>Saathi speaks 9 Indian languages on real calls.</p>
          </div>
        </div>

        {/* The phone */}
        <div className={c.colPhone}>
          <div className={c.phoneWrap}>
            <div
              ref={deviceRef}
              className={c.device}
              data-ringing={phase === 'ring' || undefined}
              role="group"
              aria-label="Example call on Amma’s phone"
            >
              <span className={`${c.hw} ${c.hwAction}`} aria-hidden="true" />
              <span className={`${c.hw} ${c.hwVolUp}`} aria-hidden="true" />
              <span className={`${c.hw} ${c.hwVolDown}`} aria-hidden="true" />
              <span className={`${c.hw} ${c.hwSide}`} aria-hidden="true" />
              <span className={`${c.hw} ${c.hwCamera}`} aria-hidden="true" />
              <div className={c.bezel} aria-hidden="true" />

              <div className={c.screen} data-screen={onCall ? 'call' : 'incoming'} data-ended={phase === 'ended' || undefined}>
                <div className={c.wallpaper} aria-hidden="true" />
                <StatusBar />

                {/* Dynamic Island: a shaking phone icon while ringing, who is talking on the call */}
                <div className={c.island} data-mode={islandMode} aria-hidden="true">
                  <span className={c.islandIcon}><Phone fill="currentColor" strokeWidth={0} /></span>
                  <span className={c.islandWave}>
                    <IslandWave mode={waveMode} running={visible && !reduce && waveMode !== 'off'} />
                  </span>
                  <span className={c.islandTime}>{formatCallTime(ms)}</span>
                  <span className={c.lens} />
                </div>

                {/* Incoming call */}
                <div className={c.incoming} inert={onCall}>
                  <div className={c.caller}>
                    <span className={c.callerName}>Saathi</span>
                    <span className={c.callerSub}>Aaptha · morning check-in</span>
                  </div>
                  <div className={c.avatar} aria-hidden="true">
                    <Heart fill="currentColor" strokeWidth={0} />
                  </div>
                  <div className={c.quick} aria-hidden="true">
                    <span><i><AlarmClock /></i>Remind Me</span>
                    <span><i><MessageCircle fill="currentColor" strokeWidth={0} /></i>Message</span>
                  </div>
                  <SlideToAnswer key={run} autoDelay={reduce ? null : phase === 'ring' ? RING_BEFORE_AUTO_MS : null} onAnswer={answer} />
                </div>

                {/* On the call: live transcript */}
                <div className={c.incall} inert={!onCall}>
                  <div className={c.callHead}>
                    <span className={c.headName}>Saathi</span>
                    <span className={c.headSub}>{phase === 'ended' ? 'Call ended' : formatCallTime(ms)}</span>
                  </div>

                  <div className={c.transcript}>
                    <span className={c.liveLabel}>
                      <span className={c.liveDot} data-on={phase === 'talk' || undefined} />
                      {phase === 'ended' ? 'Transcript' : 'Live transcript'} · {langName}
                    </span>
                    <div className={c.feed}>
                      {shown.map((t) => {
                        const line = CALL_SCRIPT[t.index];
                        const words = line.text[lang].split(' ');
                        const p = clamp01((ms - t.start) / (t.end - t.start));
                        const upTo = Math.ceil(p * words.length);
                        const done = p >= 1;
                        return (
                          <div
                            key={t.index}
                            className={`${c.bubble} ${t.who === 'saathi' ? c.bSaathi : c.bParent}`}
                            data-live={!done || undefined}
                          >
                            <span className={c.bubbleWho}>{t.who === 'saathi' ? 'Saathi' : 'Amma'}</span>
                            <p lang={lang}>
                              {words.map((w, i) => (
                                <span key={i} data-on={i < upTo || undefined}>{w}{i < words.length - 1 ? ' ' : ''}</span>
                              ))}
                            </p>
                            {lang !== 'en' && <small className={c.bubbleEn} data-on={done || undefined}>{line.text.en}</small>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={c.controls} aria-hidden="true">
                    {CONTROLS.map((b) => (
                      <span key={b.label} className={`${c.ctl} ${b.end ? c.ctlEnd : ''}`}>
                        <i><b.icon /></i>
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>

                <span className={c.homeBar} aria-hidden="true" />
                <span className={c.glare} aria-hidden="true" />
              </div>
            </div>
          </div>
          {/* Timeline: where the call is, and a way to jump to any part */}
          <div className={c.timeline}>
            <div className={c.tlTrack} role="group" aria-label="Parts of the example call">
              {PARTS.map((part, i) => {
                const state = !started || i > stage ? 'todo' : i < stage ? 'done' : 'now';
                // How full this part's bar is: the call follows its own clock, the ring a timed fill.
                const fill = state === 'done' || (state === 'now' && (reduce || i === 2)) ? 1
                  : state === 'now' && i === 1 ? ms / CALL_MS
                  : 0;
                const timed = state === 'now' && i === 0 && !reduce;
                return (
                  <button
                    key={part.title}
                    type="button"
                    className={c.tlPart}
                    data-state={state}
                    aria-current={state === 'now' ? 'step' : undefined}
                    onClick={() => jump(i)}
                  >
                    <span className={c.tlBar} aria-hidden="true">
                      <i
                        key={timed ? `ring-${run}` : 'bar'}
                        data-timed={timed || undefined}
                        style={timed ? ({ '--dur': `${RING_MS}ms` } as React.CSSProperties) : { transform: `scaleX(${fill})` }}
                      />
                    </span>
                    <span className={c.tlLabel}><part.icon size={14} /> {part.title}</span>
                  </button>
                );
              })}
            </div>
            <p className={c.hint}>
              {hint}
              {phase === 'ended' && !ringsAgain && (
                <button type="button" className={c.replay} onClick={replay}>
                  <RotateCcw size={13} /> Ring again
                </button>
              )}
            </p>
          </div>
          <p className="sr-only" aria-live="polite">
            {lastDone ? `${lastDone.who === 'saathi' ? 'Saathi' : 'Amma'}: ${lastDone.text[lang]}` : ''}
          </p>
        </div>

        {/* Right: what lands on your dashboard */}
        <div className={c.colRight}>
          <div className={`${c.card} ${c.result}`} data-state={phase === 'ended' ? 'sent' : 'noting'}>
            <div className={c.resultHead}>
              <span className={c.kicker}><LayoutDashboard size={14} /> {phase === 'ended' ? 'On your dashboard' : 'Saathi is noting'}</span>
              <span className={c.statusChip} data-status={phase === 'ended' ? 'sent' : phase === 'talk' ? 'listening' : 'waiting'}>
                {phase === 'ended'
                  ? <><Check size={12} strokeWidth={3} /> Sent</>
                  : phase === 'talk'
                    ? <><span className={c.liveDot} data-on /> Listening</>
                    : 'Waiting'}
              </span>
            </div>
            <div className={c.who}>
              <span className={c.whoAvatar} aria-hidden="true">A</span>
              <span>
                <b>Amma</b>
                <small>Morning check-in · 8:30 AM</small>
              </span>
            </div>
            <ul className={c.rows}>
              {NOTES.map((n) => {
                const on = phase === 'ended' || finished > n.after;
                return (
                  <li key={n.label} data-on={on || undefined}>
                    <span className={c.noteIcon} data-tone={n.tone}><n.icon size={14} /></span>
                    <span className={c.noteText}>
                      {n.label}
                      {n.sub && <small>{n.sub}</small>}
                    </span>
                    {on
                      ? <b className={c.pill} data-tone={n.tone}>{n.value}</b>
                      : <span className={c.skeleton}><span className="sr-only">Not yet</span></span>}
                  </li>
                );
              })}
            </ul>
            <p className={c.resultFoot}>
              {phase === 'ended'
                ? lang === 'en'
                  ? `Call ${formatCallTime(CALL_MS)} · Sent right after the call`
                  : `Amma spoke ${langName} · You read it in English`
                : 'Fills in as Amma answers'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
