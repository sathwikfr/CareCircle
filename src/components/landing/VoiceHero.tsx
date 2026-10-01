'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Play, Square, Volume2, RotateCcw } from 'lucide-react';
import s from './voiceHero.module.css';

/**
 * Landing hero: a dark panel with a circular window onto a living particle
 * field. Tap the circle and Saathi greets Amma out loud (browser speech
 * synthesis); the field swells with the voice and the words appear as
 * captions in the card on the right.
 *
 * The field is raw WebGL (one points draw) so the page doesn't load three.js.
 */

type LangKey = 'te' | 'hi' | 'en';

const LANGS: Record<LangKey, {
  label: string;
  voice: string;           // BCP-47 prefix we look for
  native: string;          // spoken when the browser has a voice for it
  roman: string;           // spoken (in English voice) when it doesn't
  en: string;
}> = {
  te: {
    label: 'తెలుగు',
    voice: 'te',
    native: 'నమస్కారం అమ్మగారు! నేను సాథీ. టిఫిన్ అయ్యిందా? బీపీ టాబ్లెట్ వేసుకున్నారా?',
    roman: 'Namaskaram Ammagaru! Nenu Saathi. Tiffin ayyinda? BP tablet vesukunnara?',
    en: 'Hello Ammagaru! I’m Saathi. Have you had breakfast? Did you take your BP tablet?',
  },
  hi: {
    label: 'हिंदी',
    voice: 'hi',
    native: 'नमस्ते अम्मा जी! मैं साथी हूँ। नाश्ता हो गया? बीपी की गोली ली?',
    roman: 'Namaste Amma ji! Main Saathi hoon. Nashta ho gaya? BP ki goli li?',
    en: 'Hello Amma ji! I’m Saathi. Have you had breakfast? Did you take your BP tablet?',
  },
  en: {
    label: 'English',
    voice: 'en',
    native: 'Hello Amma! This is Saathi. Have you had breakfast? Did you take your BP tablet?',
    roman: 'Hello Amma! This is Saathi. Have you had breakfast? Did you take your BP tablet?',
    en: '',
  },
};

const TO_YOU = 'And hello to you too. I’m Saathi. Every day, I’ll call your mother like this, in her own language, and let you know how she is.';

type Line = { text: string; lang: string; voice?: SpeechSynthesisVoice; en: string; to: 'parent' | 'you' };
type Status = 'idle' | 'speaking' | 'done';

function pickVoice(voices: SpeechSynthesisVoice[], prefix: string) {
  const match = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix));
  return match.find((v) => /-in$/i.test(v.lang.replace('_', '-'))) ?? match[0];
}

function buildScript(lang: LangKey, voices: SpeechSynthesisVoice[]) {
  const L = LANGS[lang];
  const english = pickVoice(voices, 'en');
  const own = lang === 'en' ? english : pickVoice(voices, L.voice);
  const hasOwn = !!own || lang === 'en';
  const lines: Line[] = [
    hasOwn
      ? { text: L.native, lang: own?.lang ?? `${L.voice}-IN`, voice: own, en: L.en, to: 'parent' }
      : { text: L.roman, lang: english?.lang ?? 'en-IN', voice: english, en: L.en, to: 'parent' },
    { text: TO_YOU, lang: english?.lang ?? 'en-IN', voice: english, en: '', to: 'you' },
  ];
  return { lines, missingVoice: !hasOwn };
}

/* ---------- The particle field ---------- */

const NOISE = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0; vec4 s1 = floor(b1) * 2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const VERT = `
attribute vec2 aGrid;
uniform mat4 uViewProj; uniform mat4 uView;
uniform float uTime; uniform float uVoice; uniform float uRing; uniform float uRingPhase;
uniform float uWarm; uniform float uSize; uniform float uPointerAmt; uniform vec2 uPointer;
varying vec3 vColor; varying float vAlpha;
${NOISE}
void main() {
  float x = aGrid.x * 16.0;
  float z = mix(-30.0, 4.0, aGrid.y * aGrid.y * 0.35 + aGrid.y * 0.65);
  float r = length(vec2(x, z) - vec2(0.0, -2.0));

  // Calm swell, always moving.
  float y = snoise(vec3(x * 0.16, z * 0.16 + uTime * 0.25, uTime * 0.07)) * 0.5;
  y += snoise(vec3(x * 0.38, z * 0.38, uTime * 0.18)) * 0.14;

  // Saathi's voice ripples out from under the circle.
  float fall = exp(-r * 0.17);
  y += uVoice * fall * (sin(r * 1.5 - uTime * 6.0) * 0.6 + snoise(vec3(x * 0.5, z * 0.5, uTime * 1.4)) * 0.4) * 1.6;

  // A ring or two as the "call" connects.
  for (int k = 0; k < 2; k++) {
    float ph = fract(uRingPhase + float(k) * 0.5);
    float d = (r - ph * 12.0) * 1.3;
    y += uRing * exp(-d * d) * 0.9 * (1.0 - ph);
  }

  float pd = length(vec2(x, z) - uPointer);
  y += uPointerAmt * smoothstep(3.2, 0.0, pd) * 0.7;

  vec3 p = vec3(x, y, z);
  vec4 mv = uView * vec4(p, 1.0);
  gl_Position = uViewProj * vec4(p, 1.0);

  float h = smoothstep(-0.5, 1.4, y);
  float tint = uWarm * clamp(fall * 2.4 + 0.4, 0.0, 1.0);
  vec3 lo = mix(vec3(0.07, 0.3, 0.27), vec3(0.3, 0.19, 0.06), tint);
  vec3 hi = mix(vec3(0.36, 0.78, 0.72), vec3(0.95, 0.64, 0.23), tint);
  vColor = mix(lo, hi, h);
  float edge = smoothstep(0.0, 0.3, aGrid.y) * smoothstep(1.0, 0.9, aGrid.y) * smoothstep(1.0, 0.85, abs(aGrid.x));
  vAlpha = edge * (0.45 + 0.55 * h);
  gl_PointSize = clamp(uSize * 8.0 / -mv.z, 1.0, uSize * 3.0);
}`;

const FRAG = `
precision mediump float;
varying vec3 vColor; varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float l = length(c);
  if (l > 0.5) discard;
  gl_FragColor = vec4(vColor * smoothstep(0.5, 0.05, l) * vAlpha * 1.3, 1.0);
}`;

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

function lookAt(eye: V3, target: V3) {
  const zA = norm(sub(eye, target));
  const xA = norm(cross([0, 1, 0], zA));
  const yA = cross(zA, xA);
  return {
    view: new Float32Array([xA[0], yA[0], zA[0], 0, xA[1], yA[1], zA[1], 0, xA[2], yA[2], zA[2], 0, -dot(xA, eye), -dot(yA, eye), -dot(zA, eye), 1]),
    right: xA, up: yA, forward: [-zA[0], -zA[1], -zA[2]] as V3,
  };
}

function multiply(a: Float32Array, b: Float32Array) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let v = 0;
    for (let k = 0; k < 4; k++) v += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = v;
  }
  return o;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('VoiceHero shader:', gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

type Drive = { speaking: boolean; to: 'parent' | 'you'; pulse: number; ring: number };

/** Runs the field on `canvas`; reads the live call state from `drive` every frame. */
function useVoiceField(canvasRef: React.RefObject<HTMLCanvasElement | null>, hostRef: React.RefObject<HTMLElement | null>, drive: React.RefObject<Drive>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    const vs = gl && compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl && vs && fs ? gl.createProgram() : null;
    if (gl && prog && vs && fs) {
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
    }
    if (!gl || !prog || !gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.style.display = 'none';   // the panel's own gradient stands in
      return;
    }

    const small = window.innerWidth < 760;
    const COLS = small ? 150 : 260, ROWS = small ? 110 : 170;
    const grid = new Float32Array(COLS * ROWS * 2);
    for (let j = 0, i = 0; j < ROWS; j++) for (let k = 0; k < COLS; k++) {
      grid[i++] = (k / (COLS - 1)) * 2 - 1;
      grid[i++] = j / (ROWS - 1);
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
    gl.useProgram(prog);
    const aGrid = gl.getAttribLocation(prog, 'aGrid');
    gl.enableVertexAttribArray(aGrid);
    gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, 0, 0);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = {
      viewProj: U('uViewProj'), view: U('uView'), time: U('uTime'), voice: U('uVoice'), ring: U('uRing'),
      ringPhase: U('uRingPhase'), warm: U('uWarm'), size: U('uSize'), pointerAmt: U('uPointerAmt'), pointer: U('uPointer'),
    };

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0.035, 0.11, 0.1, 1);

    let width = 1, height = 1, dpr = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };
    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduced) draw(performance.now()); });
    ro.observe(canvas);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0, active: false, activity: 0 };
    const pw = { x: 0, z: -40 };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.ty = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.active = true;
    };
    const onLeave = () => { mouse.active = false; mouse.tx = 0; mouse.ty = 0; };
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);

    const st = { voice: 0.08, ring: 0, warm: 0 };
    const start = performance.now();
    const FOV = (42 * Math.PI) / 180;

    function draw(now: number) {
      const t = (now - start) / 1000;
      const d = drive.current;
      const syl = Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.9)) * (Math.sin(t * 1.9) > -0.6 ? 1 : 0.2);
      const target = d.speaking ? 0.35 + 0.45 * syl + d.pulse * 0.5 : 0.08;   // a faint idle "listening" ripple
      d.pulse *= 0.9;
      st.voice += (target - st.voice) * (reduced ? 1 : 0.14);
      st.ring += (d.ring - st.ring) * (reduced ? 1 : 0.08);
      st.warm += ((d.speaking && d.to === 'you' ? 1 : 0) - st.warm) * (reduced ? 1 : 0.05);

      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      mouse.activity += ((mouse.active ? 1 : 0) - mouse.activity) * 0.06;

      const aspect = width / height;
      const eye: V3 = [mouse.x * 0.9, 2.3 + mouse.y * 0.3, 6.6];
      const tgt: V3 = [mouse.x * 0.4, -0.2, -3];
      const cam = lookAt(eye, tgt);
      const proj = perspective(FOV, aspect, 0.1, 70);

      if (mouse.active) {
        const th = Math.tan(FOV / 2);
        const dir = norm([0, 1, 2].map((i) => cam.forward[i] + mouse.tx * th * aspect * cam.right[i] + mouse.ty * th * cam.up[i]) as V3);
        if (dir[1] < -1e-3) {
          const tt = -eye[1] / dir[1];
          pw.x += (eye[0] + dir[0] * tt - pw.x) * 0.15;
          pw.z += (eye[2] + dir[2] * tt - pw.z) * 0.15;
        }
      }

      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.uniformMatrix4fv(u.view, false, cam.view);
      gl!.uniformMatrix4fv(u.viewProj, false, multiply(proj, cam.view));
      gl!.uniform1f(u.time, reduced ? 4 : t);
      gl!.uniform1f(u.voice, st.voice);
      gl!.uniform1f(u.ring, st.ring);
      gl!.uniform1f(u.ringPhase, t * 0.6);
      gl!.uniform1f(u.warm, st.warm);
      gl!.uniform1f(u.size, 2.6 * dpr);
      gl!.uniform1f(u.pointerAmt, mouse.activity);
      gl!.uniform2f(u.pointer, pw.x, pw.z);
      gl!.drawArrays(gl!.POINTS, 0, COLS * ROWS);
    }

    // Animate only while visible. With reduced motion, draw once (and on resize).
    let raf = 0, onScreen = true;
    const loop = (now: number) => { draw(now); raf = requestAnimationFrame(loop); };
    const startLoop = () => { if (!raf && onScreen && !document.hidden && !reduced) raf = requestAnimationFrame(loop); };
    const stopLoop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) startLoop(); else stopLoop(); });
    const onVis = () => (document.hidden ? stopLoop() : startLoop());
    io.observe(canvas);
    document.addEventListener('visibilitychange', onVis);
    if (reduced) draw(performance.now());
    startLoop();

    return () => {
      stopLoop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [canvasRef, hostRef, drive]);
}

/* ---------- The hero ---------- */

export function VoiceHero({ primaryHref, primaryLabel, trialDays }: { primaryHref: string; primaryLabel: string; trialDays: number }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drive = useRef<Drive>({ speaking: false, to: 'parent', pulse: 0, ring: 0 });
  useVoiceField(canvasRef, panelRef, drive);

  const [lang, setLang] = useState<LangKey>('te');
  const [status, setStatus] = useState<Status>('idle');
  const [lineIdx, setLineIdx] = useState(0);
  const [spokenTo, setSpokenTo] = useState(-1);     // char index reached in the current line
  const [script, setScript] = useState<Line[]>([]);
  const [missingVoice, setMissingVoice] = useState(false);
  const [noSpeech, setNoSpeech] = useState(false);
  const timers = useRef<number[]>([]);
  const runId = useRef(0);

  const clearTimers = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };

  const stop = useCallback(() => {
    runId.current++;
    clearTimers();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    drive.current.speaking = false;
    drive.current.ring = 0;
    setStatus('idle');
  }, []);

  useEffect(() => () => stop(), [stop]);

  // Voices load asynchronously in Chrome; touching getVoices() early starts that.
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.getVoices();
  }, []);

  const play = useCallback((which: LangKey) => {
    stop();
    const id = ++runId.current;
    const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
    const { lines, missingVoice: missing } = buildScript(which, synth ? synth.getVoices() : []);
    setScript(lines);
    setMissingVoice(!!synth && missing);
    setNoSpeech(!synth);
    setLineIdx(0);
    setSpokenTo(-1);
    setStatus('speaking');

    // A short "connecting" ring before the first word.
    drive.current.ring = 1;
    const begin = (i: number) => {
      if (id !== runId.current) return;
      drive.current.ring = 0;
      drive.current.speaking = true;
      drive.current.to = lines[i].to;
      setLineIdx(i);
      setSpokenTo(-1);
    };
    const finish = () => {
      if (id !== runId.current) return;
      drive.current.speaking = false;
      setSpokenTo(Number.MAX_SAFE_INTEGER);
      setStatus('done');
    };

    timers.current.push(window.setTimeout(() => {
      if (id !== runId.current) return;
      if (!synth) {
        // No speech in this browser: play the captions on a timer instead.
        let at = 0;
        lines.forEach((l, i) => {
          timers.current.push(window.setTimeout(() => begin(i), at));
          at += Math.max(2200, l.text.length * 62);
        });
        timers.current.push(window.setTimeout(finish, at));
        return;
      }
      synth.cancel();
      lines.forEach((l, i) => {
        const u = new SpeechSynthesisUtterance(l.text);
        u.lang = l.lang;
        if (l.voice) u.voice = l.voice;
        u.rate = 0.95;
        u.pitch = 1.05;
        u.onstart = () => begin(i);
        u.onboundary = (e) => {
          if (id !== runId.current) return;
          drive.current.pulse = 1;
          setSpokenTo(e.charIndex + (e.charLength || 0));
        };
        u.onend = () => { if (i === lines.length - 1) finish(); };
        u.onerror = () => { if (id === runId.current) finish(); };
        synth.speak(u);
      });
    }, 900));
  }, [stop]);

  const onCircle = () => (status === 'speaking' ? stop() : play(lang));
  const chooseLang = (k: LangKey) => { setLang(k); if (status !== 'idle') play(k); };

  const line = script[lineIdx];
  const spoken = line && spokenTo >= 0 ? line.text.slice(0, spokenTo) : '';
  const rest = line ? line.text.slice(spoken.length) : '';

  return (
    <section className={s.hero} aria-label="Meet Saathi">
      <div ref={panelRef} className={s.panel}>
        <canvas ref={canvasRef} className={s.field} aria-hidden="true" />
        <div className={s.scrim} aria-hidden="true" />
        <svg className={s.ring} viewBox="0 0 841 841" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="vhRing" x1="420.5" y1="0" x2="420.5" y2="841" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f4efe6" stopOpacity="0.3" />
              <stop offset="1" stopColor="#f4efe6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="420.5" cy="420.5" r="420" stroke="url(#vhRing)" />
        </svg>

        <div className={s.giant} aria-hidden="true">
          {'AAPTHA'.split('').map((c, i) => <span key={i}>{c}</span>)}
        </div>

        {/* The window: tap to hear Saathi */}
        <button
          type="button"
          className={`${s.circle} ${status === 'speaking' ? s.live : ''}`}
          onClick={onCircle}
          aria-pressed={status === 'speaking'}
          aria-label={status === 'speaking' ? 'Stop Saathi' : 'Hear how Saathi greets Amma (plays sound)'}
        >
          <span className={s.circleHint}>
            {status === 'speaking'
              ? <><Square size={14} fill="currentColor" /> Stop</>
              : status === 'done'
                ? <><RotateCcw size={15} /> Hear it again</>
                : <><Play size={15} fill="currentColor" /> Tap to hear Saathi</>}
          </span>
        </button>

        <div className={s.copy}>
          <span className={`${s.tagline} anim-load d1`}><span className={s.mark} aria-hidden="true" />Saathi · a voice companion for parents</span>
          <h1 className={`${s.h1} anim-load d2`}>A daily call for your parents. <em>Peace of mind</em> for you.</h1>
          <p className={`${s.proof} anim-load d3`}>{trialDays}-day free trial · 9 Indian languages · no app for your parents</p>
        </div>

        <div className={`${s.ctas} anim-load d4`}>
          <Link href={primaryHref} className={s.btnSolid}>{primaryLabel} <ArrowRight size={18} /></Link>
          <Link href="#how" className={s.btnGhost}>See how it works</Link>
        </div>

        {/* Live captions */}
        <div className={`${s.card} anim-load d5`}>
          <div className={s.cardTop}>
            <span className={s.cardLabel}><Volume2 size={14} /> Live preview</span>
            <div className={s.langs} role="group" aria-label="Greeting language">
              {(Object.keys(LANGS) as LangKey[]).map((k) => (
                <button key={k} type="button" aria-pressed={lang === k} onClick={() => chooseLang(k)}>{LANGS[k].label}</button>
              ))}
            </div>
          </div>

          <div className={s.caption} aria-live="polite">
            {status === 'idle' && (
              <>
                <p className={s.idleTitle}>Tap the circle to hear how Saathi greets Amma.</p>
                <small>Turn your sound on. Saathi speaks first in her language, then says hello to you.</small>
              </>
            )}
            {status !== 'idle' && line && (
              <div key={`${lineIdx}-${lang}`} className={s.line}>
                <span className={`${s.who} ${line.to === 'you' ? s.whoWarm : ''}`}>
                  {line.to === 'parent' ? 'Saathi → Amma' : 'Saathi → you'}
                </span>
                <p><mark>{spoken}</mark>{rest}</p>
                {line.en && <small>{line.en}</small>}
              </div>
            )}
          </div>

          {(missingVoice || noSpeech) && status !== 'idle' && (
            <p className={s.note}>
              {noSpeech
                ? 'Your browser can’t play speech, so this preview shows the words only.'
                : `Your browser has no ${LANGS[lang].label} voice, so this preview reads it in English. Real calls use Saathi’s own voice.`}
            </p>
          )}
          {!missingVoice && !noSpeech && status !== 'idle' && (
            <p className={s.note}>Preview uses your browser’s voice. Real calls use Saathi’s own voice.</p>
          )}
        </div>

        <Link href="#how" className={`${s.plate} anim-load d6`}>
          <span><b>Example call</b><i>Amma · 8:30 AM</i></span>
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </section>
  );
}
