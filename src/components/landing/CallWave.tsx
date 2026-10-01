'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, PhoneCall, PhoneOff, Smile, MessageCircle } from 'lucide-react';
import s from './home.module.css';

/**
 * Hero visual: an example Saathi call drawn as a living field of particles.
 * Ringing sends rings out across the field, Saathi's voice swells it in teal,
 * Amma's reply warms it to marigold, and the call ends in a calm sea.
 * Raw WebGL (one points draw) so the landing page doesn't pull in three.js.
 */

type Who = 'saathi' | 'parent';
type Phase =
  | { kind: 'ring'; from: number; to: number }
  | { kind: 'line'; from: number; to: number; line: number }
  | { kind: 'end'; from: number; to: number };

const LINES: { who: Who; text: string; en: string }[] = [
  { who: 'saathi', text: 'Namaste Amma! Nashte ke baad BP ki goli li?', en: 'Did you take your BP tablet after breakfast?' },
  { who: 'parent', text: 'Haan beta, abhi le li.', en: 'Yes, I just took it.' },
  { who: 'saathi', text: 'Bahut accha. Aaj tabiyat kaisi hai?', en: 'Lovely. How are you feeling today?' },
  { who: 'parent', text: 'Theek hoon. Bas ghutne mein thoda dard hai.', en: 'I’m fine. Just a little knee pain.' },
];

const PHASES: Phase[] = [
  { kind: 'ring', from: 0, to: 3.4 },
  { kind: 'line', line: 0, from: 3.7, to: 6.6 },
  { kind: 'line', line: 1, from: 6.9, to: 8.7 },
  { kind: 'line', line: 2, from: 9.0, to: 11.6 },
  { kind: 'line', line: 3, from: 11.9, to: 14.4 },
  { kind: 'end', from: 14.7, to: 18.5 },
];
const LOOP = 18.5;

function phaseIndexAt(t: number) {
  let idx = 0;
  PHASES.forEach((p, i) => { if (t >= p.from) idx = i; });
  return idx;
}

// Our palette, not the reference's green: deep peacock base, teal for Saathi, marigold for the parent.
const BAND = [0.043, 0.141, 0.129];
const COL_LOW = [0.07, 0.3, 0.27];
const COL_COOL = [0.36, 0.76, 0.71];
const COL_WARM = [0.95, 0.64, 0.23];

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
uniform vec3 uLow; uniform vec3 uCool; uniform vec3 uWarmCol;
varying vec3 vColor; varying float vAlpha;
${NOISE}
void main() {
  float x = aGrid.x * 9.0;
  float z = mix(-30.0, 3.2, aGrid.y * aGrid.y * 0.35 + aGrid.y * 0.65);
  float r = length(vec2(x, z) - vec2(0.0, -3.0));   // the call's source: where the phone is

  // A calm sea underneath everything.
  float y = snoise(vec3(x * 0.18, z * 0.18 + uTime * 0.22, uTime * 0.07)) * 0.45;
  y += snoise(vec3(x * 0.42, z * 0.42, uTime * 0.18)) * 0.12;

  // Voice: ripples out from the source while someone is speaking.
  float fall = exp(-r * 0.2);
  y += uVoice * fall * (sin(r * 1.6 - uTime * 5.5) * 0.55 + snoise(vec3(x * 0.5, z * 0.5, uTime * 1.3)) * 0.45) * 1.5;

  // Ringing: two fronts travelling outwards.
  for (int k = 0; k < 2; k++) {
    float ph = fract(uRingPhase + float(k) * 0.5);
    float d = (r - ph * 11.0) * 1.3;
    y += uRing * exp(-d * d) * 0.95 * (1.0 - ph);
  }

  // The pointer lifts the surface where it points.
  float pd = length(vec2(x, z) - uPointer);
  y += uPointerAmt * smoothstep(3.2, 0.0, pd) * 0.7;

  vec3 p = vec3(x, y, z);
  vec4 mv = uView * vec4(p, 1.0);
  gl_Position = uViewProj * vec4(p, 1.0);

  float h = smoothstep(-0.5, 1.4, y);
  float tint = uWarm * clamp(fall * 2.4 + 0.5, 0.0, 1.0);
  vec3 lo = mix(uLow, vec3(0.3, 0.19, 0.06), tint);
  vec3 hi = mix(uCool, uWarmCol, tint);
  vColor = mix(lo, hi, h);
  float edge = smoothstep(1.0, 0.72, abs(aGrid.x)) * smoothstep(0.0, 0.3, aGrid.y) * smoothstep(1.0, 0.9, aGrid.y);
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
  float a = smoothstep(0.5, 0.05, l) * vAlpha * 1.35;
  gl_FragColor = vec4(vColor * a, 1.0);
}`;

/* Tiny column-major mat4 helpers. */
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
    console.warn('CallWave shader:', gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

const FOV = (45 * Math.PI) / 180;

export function CallWave() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(0);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
    const vs = gl && compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl && vs && fs ? gl.createProgram() : null;
    if (gl && prog && vs && fs) {
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
    }
    if (!gl || !prog || !gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      // The overlay still plays the call; only the field is missing.
      const id = window.requestAnimationFrame(() => setFallback(true));
      return () => window.cancelAnimationFrame(id);
    }

    // Grid of points; fewer on small screens.
    const small = window.innerWidth < 700;
    const COLS = small ? 130 : 200, ROWS = small ? 110 : 170;
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
    gl.uniform3fv(U('uLow'), COL_LOW);
    gl.uniform3fv(U('uCool'), COL_COOL);
    gl.uniform3fv(U('uWarmCol'), COL_WARM);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(BAND[0], BAND[1], BAND[2], 1);

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
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Pointer: smoothed NDC + an activity level that fades when it leaves.
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, active: false, activity: 0 };
    const pointerWorld = { x: 0, z: -40 };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.ty = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.active = true;
    };
    const onLeave = () => { mouse.active = false; mouse.tx = 0; mouse.ty = 0; };
    wrap.addEventListener('pointermove', onMove, { passive: true });
    wrap.addEventListener('pointerleave', onLeave);

    // Call state, smoothed per frame.
    const st = { voice: 0, ring: 0, warm: 0, lastPhase: -1 };
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const ct = reduced ? 8.0 : t % LOOP;            // reduced motion: hold mid-reply
      const idx = phaseIndexAt(ct);
      const p = PHASES[idx];
      if (idx !== st.lastPhase) { st.lastPhase = idx; setPhase(idx); }

      const speaking = p.kind === 'line' && ct <= p.to;
      const who: Who | null = p.kind === 'line' ? LINES[p.line].who : null;
      const syl = Math.abs(Math.sin(ct * 7.3) * Math.sin(ct * 2.9 + idx)) * (Math.sin(ct * 1.9 + idx * 2) > -0.6 ? 1 : 0.15);
      const voiceTarget = speaking ? 0.3 + 0.7 * syl : 0;
      st.voice += (voiceTarget - st.voice) * (reduced ? 1 : 0.12);
      st.ring += ((p.kind === 'ring' ? 1 : 0) - st.ring) * (reduced ? 1 : 0.06);
      if (who) st.warm += ((who === 'parent' ? 1 : 0) - st.warm) * (reduced ? 1 : 0.09);
      if (p.kind === 'ring') st.warm += (0 - st.warm) * 0.05;

      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      mouse.activity += ((mouse.active ? 1 : 0) - mouse.activity) * 0.06;

      const aspect = width / height;
      const eye: V3 = [mouse.x * 0.9, 2.4 + mouse.y * 0.3, 6.2];
      const target: V3 = [mouse.x * 0.4, -0.3, -4];
      const cam = lookAt(eye, target);
      const proj = perspective(FOV, aspect, 0.1, 60);

      // Ray from the camera through the pointer, onto the y = 0 plane.
      if (mouse.active) {
        const th = Math.tan(FOV / 2);
        const dir = norm([
          cam.forward[0] + mouse.tx * th * aspect * cam.right[0] + mouse.ty * th * cam.up[0],
          cam.forward[1] + mouse.tx * th * aspect * cam.right[1] + mouse.ty * th * cam.up[1],
          cam.forward[2] + mouse.tx * th * aspect * cam.right[2] + mouse.ty * th * cam.up[2],
        ]);
        if (dir[1] < -1e-3) {
          const tt = -eye[1] / dir[1];
          pointerWorld.x += (eye[0] + dir[0] * tt - pointerWorld.x) * 0.15;
          pointerWorld.z += (eye[2] + dir[2] * tt - pointerWorld.z) * 0.15;
        }
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniformMatrix4fv(u.view, false, cam.view);
      gl.uniformMatrix4fv(u.viewProj, false, multiply(proj, cam.view));
      gl.uniform1f(u.time, reduced ? 4.0 : t);
      gl.uniform1f(u.voice, st.voice);
      gl.uniform1f(u.ring, st.ring);
      gl.uniform1f(u.ringPhase, t * 0.55);
      gl.uniform1f(u.warm, st.warm);
      gl.uniform1f(u.size, 2.8 * dpr);
      gl.uniform1f(u.pointerAmt, mouse.activity);
      gl.uniform2f(u.pointer, pointerWorld.x, pointerWorld.z);
      gl.drawArrays(gl.POINTS, 0, COLS * ROWS);
    };

    // Only animate while on screen and the tab is visible.
    let raf = 0, onScreen = true;
    const loop = (now: number) => { draw(now); raf = requestAnimationFrame(loop); };
    const startLoop = () => { if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(loop); };
    const stopLoop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) startLoop(); else stopLoop(); });
    const onVis = () => (document.hidden ? stopLoop() : startLoop());

    if (reduced) {
      draw(performance.now());
      const onResize = () => draw(performance.now());
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('resize', onResize);
        ro.disconnect();
        wrap.removeEventListener('pointermove', onMove);
        wrap.removeEventListener('pointerleave', onLeave);
      };
    }

    io.observe(canvas);
    document.addEventListener('visibilitychange', onVis);
    startLoop();
    return () => {
      stopLoop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerleave', onLeave);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  const p = PHASES[phase];
  const lastLine = p.kind === 'line' ? p.line : p.kind === 'end' ? LINES.length - 1 : -1;
  const line = lastLine >= 0 && p.kind === 'line' ? LINES[lastLine] : null;
  const status =
    p.kind === 'ring' ? 'Calling…' : p.kind === 'end' ? 'Call ended · 1m 12s' : 'On call';

  return (
    <div ref={wrapRef} className={`${s.callStage} ${fallback ? s.callFallback : ''}`}>
      <canvas ref={canvasRef} className={s.callCanvas} aria-hidden="true" />
      <div className={s.callShade} aria-hidden="true" />

      <span className={s.callExample}>Example call</span>

      <div className={s.callHead}>
        <span className={s.callAvatar}>A</span>
        <div>
          <b>Amma</b>
          <small>
            <span className={`${s.callDot} ${p.kind === 'end' ? s.callDotOff : ''}`} />
            {status}
          </small>
        </div>
      </div>

      <div className={s.callCenter} aria-hidden={p.kind !== 'ring'}>
        {p.kind === 'ring' && (
          <div className={s.callRinging}>
            <span className={s.callRingIcon}><PhoneCall size={22} /></span>
            <b>Saathi is calling Amma</b>
            <small>8:30 AM · Morning medicines · Hindi</small>
          </div>
        )}
      </div>

      <div className={s.callFoot}>
        {line && (
          <div key={lastLine} className={`${s.callCaption} ${line.who === 'parent' ? s.callCaptionWarm : ''}`}>
            <span className={s.callWho}>
              {line.who === 'saathi' ? <><MessageCircle size={13} /> Saathi</> : <><Smile size={13} /> Amma</>}
            </span>
            <p>{line.text}</p>
            <small>{line.en}</small>
          </div>
        )}
        {p.kind === 'end' && (
          <div className={s.callResult}>
            <span className={s.callEnded}><PhoneOff size={14} /> Call ended</span>
            <div className={s.callChips}>
              <span className={s.chipGood}><Check size={14} strokeWidth={3} /> BP tablet taken</span>
              <span><Smile size={14} /> Mood: okay</span>
              <span className={s.chipNote}>Mentioned knee pain</span>
            </div>
            <small>Sent to your dashboard</small>
          </div>
        )}
      </div>
    </div>
  );
}
