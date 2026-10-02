'use client';

import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { NOISE, syllables, type OrbMode, type SaathiOrbHandle } from './SaathiOrb';

/**
 * Saathi's voice sphere: a glass ball with a sheet of fine wave lines curled up
 * inside it, teal and magenta, with a thin pink glass rim.
 *
 * The sheet is what makes it 3D: its left side turns away from you, so the lines
 * crowd into a tight bright zigzag there; in the middle it faces you and the
 * lines spread out; at the bottom it curls toward you. Where the sheet turns
 * edge-on the lines glow brightest, in teal, with a soft sheen; where it faces you
 * they are calmer and magenta, so captions over the middle stay readable.
 *
 * The lines are the voice. When calm they sway gently. While someone talks they
 * ripple harder, every word sends a ripple along them toward the listener (left
 * to right for Saathi, right to left for the family), and the lines lean to the
 * speaker's colour: teal for Saathi, magenta for the family. Ringing sends echo
 * rings out from the rim.
 *
 * Same controls as SaathiOrb (`mode`, `variant`, and the ref handle: setMode,
 * pulse, say, level, echo), so the two are interchangeable. Raw WebGL, two
 * programs: the lines (points, plus a soft sheen pass on dark pages) and one
 * full-canvas pass for the rim, halo and echoes.
 */

// Where the sheet faces you (magenta) and where it turns edge-on (teal); the glass rim
// is pink with a blue side. Saathi's voice leans teal, the family's magenta.
const MAGENTA = [0.86, 0.3, 0.95];
const TEAL = [0.25, 0.95, 0.86];
const PINK = [1.0, 0.45, 0.85];
const RIM_BLUE = [0.35, 0.55, 1.0];
// On a light page the same hues as ink: deeper, so they hold their colour.
const MAGENTA_DAY = [0.62, 0.12, 0.62];
const TEAL_DAY = [0.0, 0.52, 0.5];
const PINK_DAY = [0.8, 0.16, 0.56];
const RIM_BLUE_DAY = [0.16, 0.32, 0.86];

/* ---------- The lines: a curled sheet of wave lines inside the ball ---------- */

const LINE_VERT = `
precision highp float;
attribute vec3 aL;                 // along the line (0..1), which line (0..1), seed
uniform float uTime; uniform float uScale; uniform float uAspect; uniform float uSize; uniform float uAlpha;
uniform float uAmp; uniform float uFlow; uniform float uSway; uniform float uCurl;
uniform float uWord; uniform float uWordAge; uniform float uDir;
uniform vec3 uFace; uniform vec3 uTurn; uniform vec3 uSpeak; uniform float uSpeakMix;
uniform float uCentre;             // how much of the lines shows behind the captions (less on light pages)
uniform float uSheen;              // 1 = add a pale highlight where the sheet turns edge-on (dark pages)
uniform float uGlowPass;           // 1 = the soft sheen pass: big faint dots, only where the sheet is edge-on
varying vec3 vCol; varying float vA;
${NOISE}

// Where along its arc a line is: it wraps around the inside of the ball, past both
// edges (further on the left), so its ends tuck away behind.
float arcAngle(float s) {
  return mix(-2.05, 1.65, s * 0.5 + 0.5) + uCurl;
}

// A point on the sheet. s runs along a line (-1..1), t across the lines (-1..1).
vec3 sheet(float s, float t) {
  float th = arcAngle(s);
  // The voice: waves along each line, a slow fold drifting through them.
  float n = snoise(vec3(s * 1.2 + uFlow, t * 1.1, uTime * 0.08));
  float wave = sin(th * 3.0 - uFlow * 5.0 + t * 1.8 + n * 1.4);
  float lift = uAmp * (0.75 * wave + 0.7 * n);
  // Each word sends a ripple along the lines, toward the listener.
  float front = (-1.2 + uWordAge * 2.4) * uDir;
  lift += uWord * 0.06 * exp(-pow(s - front, 2.0) * 8.0) * exp(-uWordAge * 2.2) * sin(s * 16.0 - uWordAge * 20.0 * uDir);

  // Around an upright axis, narrower toward the top and bottom like the ball.
  float rr = 0.93 * sqrt(1.0 - 0.5 * t * t);
  vec3 p = vec3(rr * sin(th), t * 0.95 + lift, rr * cos(th) + uAmp * 0.4 * n);
  // Tip the top away from you and lean it a little, so the lines read as arcs round the ball.
  float ax = -0.32 + uSway * 0.3;
  float cx = cos(ax), sx = sin(ax);
  p = vec3(p.x, cx * p.y - sx * p.z, sx * p.y + cx * p.z);
  float az = 0.2 + uSway * 0.4;
  float cz = cos(az), sz = sin(az);
  p = vec3(cz * p.x - sz * p.y, sz * p.x + cz * p.y, p.z);
  float ay = uSway;
  float cy = cos(ay), sy = sin(ay);
  return vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
}

void main() {
  float s = aL.x * 2.0 - 1.0;
  float t = aL.y * 2.0 - 1.0;
  vec3 p = sheet(s, t);
  // How edge-on the sheet is here (1 = edge-on, 0 = facing you), from its local normal.
  vec3 nrm = normalize(cross(sheet(s + 0.01, t) - p, sheet(s, t + 0.01) - p));
  float edgeOn = 1.0 - abs(nrm.z);
  float th = arcAngle(s);

  vec2 q = p.xy * (1.0 + p.z * 0.18);                  // perspective: nearer is larger
  float r = length(q);

  // Brightest where the sheet turns edge-on; the far side faint; quieter behind the captions;
  // the line ends (tucked behind) and the top and bottom lines fade out, so there is no hard edge.
  float a = 0.35 + 1.3 * pow(edgeOn, 1.6);
  a *= mix(0.2, 1.0, smoothstep(-0.25, 0.2, p.z));
  a *= smoothstep(-2.05, -1.75, th) * smoothstep(1.65, 1.35, th);
  a *= smoothstep(1.0, 0.8, abs(t));
  a *= mix(uCentre, 1.0, smoothstep(0.12, 0.7, r) * (1.0 - edgeOn) + edgeOn);
  a *= 1.0 - smoothstep(0.93, 0.985, r);               // the glass cuts the sheet at the rim
  a *= 0.85 + 0.3 * aL.z;

  // Magenta where the sheet faces you, teal where it turns; the speaker's colour leans in
  // while they talk; a pale sheen on the edge-on parts.
  vec3 col = mix(uFace, uTurn, smoothstep(0.15, 0.85, edgeOn));
  col = mix(col, uSpeak, uSpeakMix);
  col = mix(col, vec3(1.0, 0.95, 1.0), uSheen * 0.4 * pow(edgeOn, 2.0));

  float size = uSize * (0.8 + 0.5 * smoothstep(-0.5, 0.6, p.z));
  if (uGlowPass > 0.5) {
    size *= 5.0;
    a *= 0.05 * pow(edgeOn, 2.0);
  }
  gl_Position = vec4(q.x * uScale / uAspect, q.y * uScale, 0.0, 1.0);
  gl_PointSize = size;
  vCol = col;
  vA = a * uAlpha;
}`;

const LINE_FRAG = `
precision mediump float;
varying vec3 vCol; varying float vA;
uniform float uInk;                // 1 = coloured ink on a light page, 0 = light on a dark page
void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float l = length(pc);
  if (l > 0.5) discard;
  float s = smoothstep(0.5, 0.0, l) * vA;
  if (uInk > 0.5) {
    s = clamp(s, 0.0, 1.0);
    gl_FragColor = vec4(vCol * s, s);
  } else {
    vec3 c = vCol * s;
    gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));  // premultiplied: faint light never paints black
  }
}`;

/* ---------- Rim, halo and echo rings: one full-canvas pass ---------- */

const RIM_VERT = `
attribute vec2 aQ;
uniform float uScale; uniform float uAspect;
varying vec2 vP;
void main() {
  vP = vec2(aQ.x * uAspect, aQ.y) / uScale;            // ball space: the rim sits at r = 1
  gl_Position = vec4(aQ, 0.0, 1.0);
}`;

const RIM_FRAG = `
precision mediump float;
varying vec2 vP;
uniform vec3 uPink; uniform vec3 uBlue; uniform float uTime; uniform float uVoice; uniform float uGlow;
uniform float uTint; uniform float uWob; uniform vec4 uEchoR; uniform vec4 uEchoA;
void main() {
  float r = length(vP);
  float ang = atan(vP.y, vP.x);
  float s = vP.y / max(r, 1e-4);
  vec3 col = mix(uPink, uBlue, smoothstep(0.45, 0.95, vP.x / max(r, 1e-4)) * 0.9);   // pink glass, blue on the right
  // the rim trembles a little with the voice
  float wob = 1.0 + uWob * (0.6 * sin(ang * 5.0 + uTime * 2.3) + 0.4 * sin(ang * 9.0 - uTime * 3.1));
  float d = r - wob;
  float rim = exp(-d * d * 2600.0);
  float halo = d > 0.0 ? exp(-d * 7.0) : 0.5 * exp(d * 14.0);
  float echo = 0.0;
  for (int i = 0; i < 4; i++) {
    float e = r - uEchoR[i];
    echo += exp(-e * e * 900.0) * uEchoA[i];
  }
  float g = (rim * (0.55 + 0.6 * uVoice) + halo * uGlow + echo * 0.6) * smoothstep(1.6, 1.35, r);
  if (uTint > 0.5) {
    // Light pages: laid down as coloured ink, never as light (light can't brighten a light page).
    float a = clamp(g, 0.0, 0.9);
    gl_FragColor = vec4(col * a, a);
    return;
  }
  vec3 c = col * g + vec3(rim * 0.35 * (0.5 + uVoice));   // a white glint in the glass edge
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('SaathiSphere shader:', gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

function link(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = vs && fs ? gl.createProgram() : null;
  if (!prog || !vs || !fs) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('SaathiSphere link:', gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

/** `lines` lines across the sheet, each `dots` points along it: (along, which line, seed). */
function linePoints(lines: number, dots: number) {
  const out = new Float32Array(lines * dots * 3);
  let i = 0;
  for (let k = 0; k < lines; k++) {
    for (let d = 0; d < dots; d++) {
      out[i++] = (d + Math.random() * 0.5) / dots;
      out[i++] = k / (lines - 1);
      out[i++] = Math.random();
    }
  }
  return out;
}

type Props = {
  mode?: OrbMode;
  /** Ball radius as a fraction of the canvas half-height (default 0.655: fills the hero's ring footprint). */
  scale?: number;
  /** 'night' for dark pages (default), 'day' for light pages (ink on the page). */
  variant?: 'night' | 'day';
  className?: string;
  ref?: React.Ref<SaathiOrbHandle>;
};

export function SaathiSphere({ mode = 'idle', scale = 0.655, variant = 'night', className, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef(scale);
  const dayRef = useRef(variant === 'day');
  const engine = useRef({
    mode: 'idle' as OrbMode,
    echoes: [] as number[],
    lastPulse: -10,
    now: 0,
    word: { at: -10, dur: 0, syl: 1 },   // the word being said: the lines swell once per syllable
    levelAt: -10,
    level: 0,
    redraw: null as null | (() => void),  // set while reduced motion keeps the loop off
  });

  useImperativeHandle(ref, () => ({
    setMode: (m) => { engine.current.mode = m; engine.current.redraw?.(); },
    pulse: () => { engine.current.lastPulse = engine.current.now; },
    say: (word, seconds) => {
      const e = engine.current;
      const syl = syllables(word);
      e.word = { at: e.now, dur: seconds ?? Math.min(1.1, 0.1 + 0.17 * syl), syl };
      e.lastPulse = e.now;
    },
    level: (v) => {
      const e = engine.current;
      e.level = Math.max(0, Math.min(1, v));
      e.levelAt = e.now;
    },
    echo: () => {
      const e = engine.current;
      e.echoes.push(e.now);
      if (e.echoes.length > 4) e.echoes.shift();
    },
  }));

  useEffect(() => { engine.current.mode = mode; engine.current.redraw?.(); }, [mode]);
  useEffect(() => { scaleRef.current = scale; engine.current.redraw?.(); }, [scale]);
  useEffect(() => { dayRef.current = variant === 'day'; engine.current.redraw?.(); }, [variant]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
    const lineProg = gl && link(gl, LINE_VERT, LINE_FRAG);
    const rimProg = gl && link(gl, RIM_VERT, RIM_FRAG);
    if (!gl || !lineProg || !rimProg) {
      canvas.dataset.fallback = 'true';
      return;
    }

    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    const lineData = linePoints(small ? 30 : 38, small ? 820 : 1100);
    const lineBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.STATIC_DRAW);
    const lineCount = lineData.length / 3;
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const L = (n: string) => gl.getUniformLocation(lineProg, n);
    const lu = {
      time: L('uTime'), scale: L('uScale'), aspect: L('uAspect'), size: L('uSize'), alpha: L('uAlpha'),
      amp: L('uAmp'), flow: L('uFlow'), sway: L('uSway'), curl: L('uCurl'), sheen: L('uSheen'), glowPass: L('uGlowPass'),
      word: L('uWord'), wordAge: L('uWordAge'), dir: L('uDir'),
      face: L('uFace'), turn: L('uTurn'), speak: L('uSpeak'), speakMix: L('uSpeakMix'),
      ink: L('uInk'), centre: L('uCentre'),
    };
    const aL = gl.getAttribLocation(lineProg, 'aL');

    const Q = (n: string) => gl.getUniformLocation(rimProg, n);
    const qu = {
      scale: Q('uScale'), aspect: Q('uAspect'), pink: Q('uPink'), blue: Q('uBlue'), time: Q('uTime'),
      voice: Q('uVoice'), glow: Q('uGlow'), tint: Q('uTint'), wob: Q('uWob'), echoR: Q('uEchoR'), echoA: Q('uEchoA'),
    };
    const aQ = gl.getAttribLocation(rimProg, 'aQ');

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

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

    // The lines flow toward the listener: `dir` flips with who is talking.
    const st = {
      voice: 0.05, amp: 0.06, flow: 0, phase: 0, dir: 1, glow: 0.22, speakMix: 0, wob: 0.004,
      speak: [...TEAL], nextRing: 0, ringStep: 0, lastT: 0,
    };
    const e = engine.current;
    const start = performance.now();
    const echoR = new Float32Array(4), echoA = new Float32Array(4);

    const draw = (nowMs: number) => {
      const t = (nowMs - start) / 1000;
      const dt = Math.min(0.05, Math.max(0, t - st.lastT));
      // Easing follows real time (same feel at 60 fps, and no slow-motion on a slow phone).
      const step = Math.min(1, Math.max(0, t - st.lastT));
      const ease = (rate: number) => 1 - Math.exp(-rate * step);
      st.lastT = t;
      e.now = t;
      const m = e.mode;
      const speaking = m === 'saathi' || m === 'family';
      const day = dayRef.current;

      // The voice: real loudness if it's being fed, else one swell per syllable of the word
      // being said (quiet between words), else a generic talking rhythm.
      const sinceWord = t - e.lastPulse;
      let talk: number;
      if (t - e.levelAt < 0.25) talk = 0.2 + 0.75 * e.level;
      else if (t - e.word.at < e.word.dur) {
        const k = ((t - e.word.at) / e.word.dur) * e.word.syl;
        talk = 0.25 + 0.6 * Math.pow(Math.sin(Math.PI * (k - Math.floor(k))), 0.7) * (k < 1 ? 1 : 0.8);
      } else if (sinceWord < 0.9) talk = 0.2;
      else talk = 0.35 + 0.5 * Math.abs(Math.sin(t * 7.1) * Math.sin(t * 2.7)) * (Math.sin(t * 1.7) > -0.55 ? 1 : 0.15);
      const vTarget = speaking ? talk : m === 'ringing' ? 0.15 : m === 'ended' ? 0 : 0.05;
      st.voice += (vTarget - st.voice) * ease(vTarget > st.voice ? 14 : 8);

      const ring = m === 'ringing' ? Math.max(0, Math.sin(t * 9)) : 0;
      const ampT = speaking ? 0.07 + 0.16 * st.voice : m === 'ringing' ? 0.07 + 0.03 * ring : m === 'ended' ? 0.035 : 0.06;
      st.amp += (ampT - st.amp) * ease(6);
      if (m === 'family') st.dir = -1;
      else if (m === 'saathi') st.dir = 1;
      st.flow += dt * (0.05 + 0.5 * st.voice) * st.dir;
      st.phase += dt * (0.2 + 0.25 * st.voice);
      const glowT = speaking ? 0.35 + 0.35 * st.voice : m === 'ringing' ? 0.3 + 0.2 * ring : m === 'ended' ? 0.12 : 0.22;
      st.glow += (glowT - st.glow) * ease(3.7);
      st.wob += ((speaking ? 0.004 + 0.02 * st.voice : 0.004) - st.wob) * ease(8);
      // The lines lean to the speaker's colour while they talk (Saathi teal, the family magenta).
      st.speakMix += ((speaking ? 0.5 : 0) - st.speakMix) * ease(5);
      const speakT = m === 'family' ? (day ? MAGENTA_DAY : MAGENTA) : (day ? TEAL_DAY : TEAL);
      if (speaking) for (let i = 0; i < 3; i++) st.speak[i] += (speakT[i] - st.speak[i]) * ease(6);

      if (m === 'ringing' && t > st.nextRing) {            // ring-ring … pause
        e.echoes.push(t);
        st.ringStep = (st.ringStep + 1) % 2;
        st.nextRing = t + (st.ringStep === 1 ? 0.32 : 1.4);
      }
      e.echoes = e.echoes.filter((s0) => t - s0 < 1.6).slice(-4);
      for (let i = 0; i < 4; i++) {
        const s0 = e.echoes[i];
        const age = s0 === undefined ? 2 : t - s0;
        echoR[i] = s0 === undefined ? 0 : 1 + age * 0.35;
        echoA[i] = s0 === undefined ? 0 : Math.pow(1 - age / 1.6, 2);
      }

      const aspect = width / height;
      const T = reduced ? 3 : t;
      gl.clear(gl.COLOR_BUFFER_BIT);

      // --- rim, halo and echoes ---
      gl.useProgram(rimProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.enableVertexAttribArray(aQ);
      gl.vertexAttribPointer(aQ, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(qu.scale, scaleRef.current);
      gl.uniform1f(qu.aspect, aspect);
      gl.uniform3fv(qu.pink, day ? PINK_DAY : PINK);
      gl.uniform3fv(qu.blue, day ? RIM_BLUE_DAY : RIM_BLUE);
      gl.uniform1f(qu.time, T);
      gl.uniform1f(qu.voice, st.voice);
      gl.uniform1f(qu.glow, st.glow * (day ? 0.8 : 1));
      gl.uniform1f(qu.tint, day ? 1 : 0);
      gl.uniform1f(qu.wob, reduced ? 0.004 : st.wob);
      gl.uniform4fv(qu.echoR, echoR);
      gl.uniform4fv(qu.echoA, echoA);
      gl.blendFunc(gl.ONE, day ? gl.ONE_MINUS_SRC_ALPHA : gl.ONE);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // --- the wave lines ---
      gl.useProgram(lineProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      gl.enableVertexAttribArray(aL);
      gl.vertexAttribPointer(aL, 3, gl.FLOAT, false, 0, 0);
      gl.uniform1f(lu.time, T);
      gl.uniform1f(lu.scale, scaleRef.current);
      gl.uniform1f(lu.aspect, aspect);
      gl.uniform1f(lu.size, 1.9 * dpr);
      gl.uniform1f(lu.alpha, (day ? 1.9 : 1.5) * (m === 'ended' ? 0.7 : 1));
      gl.uniform1f(lu.amp, reduced ? 0.06 : st.amp);
      gl.uniform1f(lu.flow, st.flow);
      gl.uniform1f(lu.sway, reduced ? 0 : 0.14 * Math.sin(st.phase) + 0.05 * Math.sin(st.phase * 2.6));
      gl.uniform1f(lu.curl, reduced ? 0 : 0.12 * Math.sin(st.phase * 0.8 + 1.0));
      gl.uniform1f(lu.sheen, day ? 0 : 1);
      gl.uniform1f(lu.word, speaking && !reduced ? 1 : 0);
      gl.uniform1f(lu.wordAge, sinceWord);
      gl.uniform1f(lu.dir, st.dir);
      gl.uniform3fv(lu.face, day ? MAGENTA_DAY : MAGENTA);
      gl.uniform3fv(lu.turn, day ? TEAL_DAY : TEAL);
      gl.uniform3fv(lu.speak, st.speak);
      gl.uniform1f(lu.speakMix, st.speakMix);
      gl.uniform1f(lu.ink, day ? 1 : 0);
      gl.uniform1f(lu.centre, day ? 0.3 : 0.5);
      gl.blendFunc(gl.ONE, day ? gl.ONE_MINUS_SRC_ALPHA : gl.ONE);
      gl.uniform1f(lu.glowPass, 0);
      gl.drawArrays(gl.POINTS, 0, lineCount);
      // Dark pages: a soft sheen over the parts of the sheet that turn edge-on.
      if (!day) {
        gl.uniform1f(lu.glowPass, 1);
        gl.drawArrays(gl.POINTS, 0, lineCount);
      }
    };

    let raf = 0, onScreen = true;
    const loop = (now: number) => { draw(now); raf = requestAnimationFrame(loop); };
    const startLoop = () => { if (!raf && onScreen && !document.hidden && !reduced) raf = requestAnimationFrame(loop); };
    const stopLoop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const io = new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; if (onScreen) startLoop(); else stopLoop(); });
    const onVis = () => (document.hidden ? stopLoop() : startLoop());
    const ro = new ResizeObserver(() => { resize(); if (reduced) draw(performance.now()); });
    ro.observe(canvas);
    io.observe(canvas);
    document.addEventListener('visibilitychange', onVis);
    // Reduced motion: no loop, one still frame, redrawn when the mode or theme changes.
    if (reduced) {
      e.redraw = () => draw(performance.now());
      draw(performance.now());
    }
    startLoop();

    return () => {
      stopLoop();
      e.redraw = null;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      gl.deleteBuffer(lineBuf);
      gl.deleteBuffer(quadBuf);
      gl.deleteProgram(lineProg);
      gl.deleteProgram(rimProg);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }} />;
}
