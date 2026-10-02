'use client';

import React, { useRef, useState } from 'react';
import { SaathiOrb, type OrbMode, type SaathiOrbHandle } from './SaathiOrb';
import { SaathiSphere } from './SaathiSphere';
import { SaathiBlob } from './SaathiBlob';

/** Dev-only page for tuning the voice visuals (blob, sheet or ring): every mode, plus a spoken demo call that pulses per word. */
const LOOKS = ['blob', 'sheet', 'ring'] as const;
const MODES: { mode: OrbMode; label: string }[] = [
  { mode: 'idle', label: 'Idle' },
  { mode: 'ringing', label: 'Ringing' },
  { mode: 'saathi', label: 'Saathi speaks' },
  { mode: 'family', label: 'Amma speaks' },
  { mode: 'ended', label: 'Ended' },
];

const SCRIPT: { who: 'saathi' | 'family'; text: string; lang: string; pitch: number }[] = [
  { who: 'saathi', text: 'Namaskaram Ammagaru! Nenu Saathi. Tiffin ayyinda? BP tablet vesukunnara?', lang: 'en-IN', pitch: 1.05 },
  { who: 'family', text: 'Haa, vesukunna. Thank you.', lang: 'en-IN', pitch: 0.85 },
  { who: 'saathi', text: 'Chala manchidi. Take care, Ammagaru.', lang: 'en-IN', pitch: 1.05 },
];

export function OrbPlayground() {
  const orb = useRef<SaathiOrbHandle>(null);
  const [mode, setMode] = useState<OrbMode>('idle');
  const [day, setDay] = useState(false);
  const [look, setLook] = useState<(typeof LOOKS)[number]>('blob');
  const [caption, setCaption] = useState('');
  const run = useRef(0);

  const choose = (m: OrbMode) => {
    run.current++;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setCaption('');
    setMode(m);
  };

  const demo = () => {
    const id = ++run.current;
    const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
    synth?.cancel();
    setMode('ringing');
    setCaption('Calling Amma…');
    window.setTimeout(() => {
      if (id !== run.current) return;
      const voices = synth?.getVoices() ?? [];
      const voice = voices.find((v) => /en-IN/i.test(v.lang)) ?? voices.find((v) => v.lang.startsWith('en'));
      const say = (i: number) => {
        if (id !== run.current) return;
        if (i >= SCRIPT.length) { setMode('ended'); setCaption('Call ended'); return; }
        const line = SCRIPT[i];
        setMode(line.who);
        setCaption(line.text);
        if (!synth) { window.setTimeout(() => say(i + 1), line.text.length * 70); return; }
        const u = new SpeechSynthesisUtterance(line.text);
        u.lang = line.lang;
        if (voice) u.voice = voice;
        u.pitch = line.pitch;
        u.rate = 0.95;
        u.onboundary = (e) => orb.current?.say(/^\S+/.exec(line.text.slice(e.charIndex))?.[0] ?? '');
        u.onend = () => window.setTimeout(() => say(i + 1), 350);
        u.onerror = () => say(i + 1);
        synth.speak(u);
      };
      say(0);
    }, 2400);
  };

  return (
    <main style={{ minHeight: '100svh', background: day ? '#e9e6e0' : '#05060a', color: day ? '#151413' : '#f4efe6', display: 'grid', gridTemplateRows: '1fr auto', fontFamily: 'var(--font-sans)' }}>
      <div style={{ position: 'relative', minHeight: 520 }}>
        {look === 'blob' && <SaathiBlob ref={orb} mode={mode} variant={day ? 'day' : 'night'} />}
        {look === 'sheet' && <SaathiSphere ref={orb} mode={mode} variant={day ? 'day' : 'night'} />}
        {look === 'ring' && <SaathiOrb ref={orb} mode={mode} variant={day ? 'day' : 'night'} />}
        <p style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', textAlign: 'center', padding: '0 30%', fontSize: 18, lineHeight: 1.45, opacity: 0.9, color: '#f4efe6' }}>
          {caption || 'Saathi'}
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', padding: 24 }}>
        {MODES.map((m) => (
          <button key={m.mode} type="button" onClick={() => choose(m.mode)} aria-pressed={mode === m.mode}
            style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid rgba(244,239,230,0.25)', background: mode === m.mode ? 'rgba(244,239,230,0.15)' : 'transparent', color: 'inherit', cursor: 'pointer' }}>
            {m.label}
          </button>
        ))}
        <button type="button" onClick={() => orb.current?.pulse('saathi')} style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid #4d7dff', background: 'transparent', color: '#9db8ff', cursor: 'pointer' }}>Signal ↑</button>
        <button type="button" onClick={() => orb.current?.pulse('family')} style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid #ff5a3c', background: 'transparent', color: '#ff9a85', cursor: 'pointer' }}>Signal ↓</button>
        <button type="button" onClick={() => setLook((l) => LOOKS[(LOOKS.indexOf(l) + 1) % LOOKS.length])} style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid rgba(128,128,128,0.4)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>Look: {look}</button>
        <button type="button" onClick={() => setDay((d) => !d)} style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid rgba(128,128,128,0.4)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>{day ? 'Dark page' : 'Light page'}</button>
        <button type="button" onClick={demo} style={{ padding: '10px 18px', borderRadius: 999, border: 0, background: '#f4efe6', color: '#0b0c10', fontWeight: 700, cursor: 'pointer' }}>▶ Demo call (sound)</button>
      </div>
    </main>
  );
}
