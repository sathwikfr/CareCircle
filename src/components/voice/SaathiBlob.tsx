'use client';

import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { NOISE, syllables, type OrbMode, type SaathiOrbHandle } from './SaathiOrb';

/**
 * Saathi's voice orb: a living glass blob, never a fixed circle.
 *
 * - Body: a ball whose surface keeps rolling into soft bumps, drawn as a net of
 *   glowing dots joined by fine lines (a geodesic mesh: no seams, no poles).
 *   Patches of the net light up and drift like signals, and while someone talks
 *   a band of light sweeps across it with every word. The net is brightest where
 *   the surface turns away from you and calm where it faces you, so captions
 *   over the middle stay readable. On desktop it leans gently toward the pointer.
 * - Glass: a see-through skin whose edge glows along the bumpy outline, with a
 *   crisp bright rim, a rainbow shimmer, a soft sheen and a sharp glint that
 *   slide over the bumps, a faint warm light from below, and drifting wisps.
 * - Ribbons: two translucent ribbons of light twist slowly inside the glass, a
 *   cyan one for Saathi and a pink one for the family; the speaker's ribbon
 *   brightens and turns faster.
 * - Glow: the orb is also drawn small offscreen and blurred at two sizes (a tight
 *   glow and a wide halo), behind the crisp, anti-aliased orb.
 * - Dust: twinkling dots drift around it; the nearest are bigger and softer,
 *   like out of focus, and they swirl faster while someone talks.
 *
 * Colours run blue -> violet -> magenta across the ball. The voice drives it:
 * while Saathi talks the bumps grow and roll with every syllable and the colour
 * leans cyan, and each word sends a ripple and a band of light across from left
 * to right; while the family talks it leans pink and runs right to left. Ringing
 * makes it shiver and puff out dust; when the call ends it settles and dims. On
 * light pages ('day') the same orb is laid down as deeper ink with a coloured haze.
 *
 * Same controls as SaathiOrb (`mode`, `variant`, and the ref handle: setMode,
 * pulse, say, level, echo). Raw WebGL1, no libraries.
 */

const PALETTE = {
  night: { blue: [0.22, 0.48, 1.0], violet: [0.52, 0.32, 1.0], magenta: [0.98, 0.3, 0.82], saathi: [0.3, 0.86, 1.0], family: [1.0, 0.38, 0.7] },
  day: { blue: [0.12, 0.3, 0.86], violet: [0.36, 0.18, 0.78], magenta: [0.72, 0.1, 0.55], saathi: [0.0, 0.46, 0.66], family: [0.8, 0.12, 0.42] },
};

// The two ribbons inside the glass: Saathi's (cyan into violet) and the family's (pink into blue).
const RIBBONS = [
  { who: 'saathi' as const, yaw: 0.4, pitch: 0.55, roll: 0.25, spin: 0.07, rad: 0.62, width: 0.16, twist: 1, speed: 0.22, to: 'violet' as const },
  { who: 'family' as const, yaw: -0.9, pitch: -0.45, roll: -0.6, spin: -0.05, rad: 0.52, width: 0.12, twist: 2, speed: -0.16, to: 'blue' as const },
];

/* ---------- The ball: one vertex shader, three looks (glass skin, lines, dots) ---------- */

const MESH_VERT = `
precision highp float;
attribute vec4 aV;                 // direction on the unit ball, seed
uniform mat3 uRot;
uniform float uTime; uniform float uScale; uniform float uAspect;
uniform float uAmp; uniform float uFine; uniform float uFlow; uniform float uBreath;
uniform float uRipple; uniform float uRippleAge; uniform float uDir; uniform float uPoint; uniform float uPx;
uniform vec3 uPointer; uniform float uPull; uniform vec3 uGrad; uniform float uFireAmt;
uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uSpeak; uniform float uSpeakMix;
varying vec3 vCol; varying float vFres; varying float vFront; varying float vSeed; varying float vWisp; varying float vFire; varying vec3 vN;
${NOISE}
// How far out the surface is in direction d: slow big bumps, finer ones, a ripple per word,
// and a gentle lean toward the pointer.
float field(vec3 d) {
  vec3 dv = uRot * d;
  float n = snoise(d * 1.2 + vec3(0.0, uFlow * 0.5, uTime * 0.11));
  float f = snoise(d * 2.6 + vec3(uFlow, 0.0, uTime * 0.19));
  float r = uBreath + uAmp * n + uFine * f;
  float front = (-1.2 + uRippleAge * 2.4) * uDir;
  r += uRipple * 0.07 * exp(-pow(dv.x - front, 2.0) * 6.0) * exp(-uRippleAge * 1.6);
  r += uPull * 0.1 * pow(max(dot(dv, uPointer), 0.0), 6.0);
  return r;
}
void main() {
  vec3 d = aV.xyz;
  vec3 p = d * field(d);
  // The surface normal, from two neighbouring points.
  vec3 up = abs(d.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 t1 = normalize(cross(up, d));
  vec3 t2 = cross(d, t1);
  vec3 d1 = normalize(d + t1 * 0.03);
  vec3 d2 = normalize(d + t2 * 0.03);
  vec3 n = normalize(cross(d1 * field(d1) - p, d2 * field(d2) - p));
  if (dot(n, d) < 0.0) n = -n;

  vec3 pr = uRot * p;
  vec3 nr = normalize(uRot * n);
  float cam = 4.5;
  vec3 view = normalize(vec3(-pr.xy, cam - pr.z));
  float facing = dot(nr, view);
  vFres = 1.0 - abs(facing);                     // 1 where the surface turns away (the outline)
  vFront = smoothstep(-0.2, 0.2, pr.z);          // 1 on the near side
  vN = nr;

  // Blue up and to the left, violet across the middle, magenta down and to the right; held
  // still while the ball turns, like a light (drifting slowly). The speaker's colour leans in.
  float g = clamp(0.5 + 0.5 * dot(normalize(pr), uGrad), 0.0, 1.0);
  vec3 col = mix(uC1, uC2, smoothstep(0.1, 0.55, g));
  col = mix(col, uC3, smoothstep(0.5, 0.95, g));
  vCol = mix(col, uSpeak, uSpeakMix);
  vSeed = aV.w;
  float w = snoise(pr * 1.3 + vec3(0.0, uTime * 0.15, -uTime * 0.1));
  vWisp = exp(-w * w * 9.0);                     // thin drifting bands of light inside the glass

  // Signals over the net: patches of it light up and drift; while someone talks, a band of
  // light sweeps across with every word, toward the listener.
  float act = snoise(d * 2.2 + vec3(uTime * 0.32, -uTime * 0.21, uFlow * 0.7));
  float front = (-1.2 + uRippleAge * 2.4) * uDir;
  float sweep = uRipple * exp(-pow(normalize(pr).x - front, 2.0) * 40.0) * exp(-uRippleAge * 1.4);
  vFire = clamp(smoothstep(0.55, 0.85, act) * uFireAmt + sweep, 0.0, 1.0);

  float k = cam / (cam - pr.z);                  // perspective
  gl_Position = vec4(pr.x * k * uScale / uAspect, pr.y * k * uScale, 0.0, 1.0);
  gl_PointSize = uPoint * uPx * (0.6 + 0.8 * aV.w) * (0.6 + 0.8 * vFres) * k * (1.0 + 1.4 * vFire);
}`;

const MESH_VARYINGS = `
varying vec3 vCol; varying float vFres; varying float vFront; varying float vSeed; varying float vWisp; varying float vFire; varying vec3 vN;`;

// Output: premultiplied colour. Light pages lay colour down like ink; dark pages add light
// (alpha follows brightness, so faint light never paints black over the page).
const OUT = `
  if (uFInk > 0.5) {
    a = clamp(a, 0.0, 1.0);
    gl_FragColor = vec4(col * a, a);
  } else {
    vec3 c = col * a;
    gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
  }`;

const SKIN_FRAG = `
precision mediump float;
${MESH_VARYINGS}
uniform float uFTime; uniform float uFAlpha; uniform float uFInk; uniform float uFVoice; uniform float uFGloss;
void main() {
  float fres = clamp(vFres, 0.0, 1.0);
  vec3 n = normalize(vN);
  float rim = pow(fres, 2.4) * (1.0 + uFVoice * mix(0.35, 0.15, uFInk));   // the glowing edge pulses with the voice
  float edge = pow(fres, 9.0);                                // the crisp bright rim of the glass
  // a rainbow shimmer along the glass edge
  vec3 irid = 0.55 + 0.45 * cos(6.2831 * (fres * 0.9 + vec3(0.0, 0.33, 0.67) + uFTime * 0.04));
  vec3 col = mix(vCol, irid, 0.45 * pow(fres, 3.0) * (1.0 - 0.7 * uFInk));
  float a = 0.03 + 0.75 * rim + vWisp * (0.04 + 0.1 * uFVoice) * (1.0 - rim) + vFire * 0.06;
  // Glass lights: a soft sheen and a sharp glint up and to the left that slide over the bumps,
  // and a faint warm light from down and to the right.
  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  float sheen = pow(max(dot(n, normalize(vec3(-0.45, 0.55, 1.0))), 0.0), 40.0);
  float glint = smoothstep(0.975, 0.992, dot(r, normalize(vec3(-0.5, 0.62, 0.6))));
  float spec = (sheen * 0.5 + glint * 0.8) * vFront * uFGloss;
  float warm = pow(max(dot(n, normalize(vec3(0.75, -0.55, 0.35))), 0.0), 12.0) * uFGloss;
  col = mix(col, mix(irid, vec3(1.0), 0.5), edge * 0.6 * uFGloss);
  col = mix(col, vec3(1.0), clamp(spec, 0.0, 1.0) * 0.7);
  col += warm * vec3(0.5, 0.15, 0.35);
  a = (a + spec * 0.3 + edge * 0.45 + warm * 0.12) * uFAlpha;
${OUT}
}`;

const LINE_FRAG = `
precision mediump float;
${MESH_VARYINGS}
uniform float uFAlpha; uniform float uFInk;
void main() {
  float fres = clamp(vFres, 0.0, 1.0);
  float a = (0.1 + 0.9 * pow(fres, 1.5) + vFire * mix(0.8, 0.4, uFInk)) * mix(0.18, 1.0, vFront) * uFAlpha;
  vec3 col = mix(vCol, vec3(1.0), (0.25 * pow(fres, 4.0) + 0.45 * vFire) * (1.0 - uFInk));
${OUT}
}`;

const NODE_FRAG = `
precision mediump float;
${MESH_VARYINGS}
uniform float uFTime; uniform float uFAlpha; uniform float uFInk;
void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float l = length(pc);
  if (l > 0.5) discard;
  float tw = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(uFTime * (1.0 + vSeed * 2.0) + vSeed * 40.0), 3.0);
  float a = smoothstep(0.5, 0.0, l) * (tw + vFire * mix(1.3, 0.6, uFInk)) * (0.25 + 0.75 * clamp(vFres, 0.0, 1.0)) * mix(0.2, 1.0, vFront) * uFAlpha;
  vec3 col = mix(vCol, vec3(1.0), (0.35 + 0.4 * vFire) * (1.0 - uFInk));
${OUT}
}`;

/* ---------- Ribbons: translucent bands of light twisting inside the glass ---------- */

const RIBBON_VERT = `
precision highp float;
attribute vec2 aR;                 // along the loop (0..1), across the ribbon (-1..1)
uniform mat3 uRot; uniform mat3 uRib;
uniform float uScale; uniform float uAspect;
uniform float uRad; uniform float uWidth; uniform float uTwist; uniform float uPhase; uniform float uWob;
uniform vec3 uCa; uniform vec3 uCb;
varying vec3 vCol; varying float vA;
// The ribbon's centre line: a wavy loop around the inside of the ball.
vec3 loopAt(float a) {
  vec3 c = vec3(cos(a), 0.0, sin(a)) * uRad;
  c.y = 0.22 * sin(a * 2.0 + uPhase) + 0.08 * sin(a * 3.0 - uPhase * 1.3);
  c.xz *= 1.0 + uWob * 0.15 * sin(a * 3.0 + uPhase * 0.7);
  return uRib * c;
}
void main() {
  float a = aR.x * 6.28318530718;
  vec3 c = loopAt(a);
  vec3 T = normalize(loopAt(a + 0.01) - c);
  vec3 N0 = normalize(cross(T, uRib * vec3(0.0, 1.0, 0.0)));
  vec3 B = cross(T, N0);
  float th = a * uTwist + uPhase;                // whole turns, so the loop closes cleanly
  vec3 W = cos(th) * N0 + sin(th) * B;
  float w = uWidth * (0.55 + 0.45 * sin(a * 2.0 - uPhase * 0.8));
  vec3 p = uRot * (c + W * aR.y * w);
  vec3 n = normalize(uRot * cross(T, W));
  float edgeOn = 1.0 - abs(n.z);
  float k = 4.5 / (4.5 - p.z);
  vec2 q = p.xy * k;
  gl_Position = vec4(q.x * uScale / uAspect, q.y * uScale, 0.0, 1.0);
  // Brightest where the ribbon folds edge-on and along its two edges; faint in the middle of
  // the ball (behind the captions) and at the back.
  float side = abs(aR.y);
  vA = (0.05 + 0.55 * pow(edgeOn, 2.0) + 0.4 * pow(side, 6.0))
     * mix(0.3, 1.0, smoothstep(0.12, 0.6, length(q)))
     * (0.6 + 0.4 * smoothstep(-0.5, 0.5, p.z));
  vCol = mix(uCa, uCb, 0.5 + 0.5 * sin(a + uPhase * 0.5));
}`;

const RIBBON_FRAG = `
precision mediump float;
varying vec3 vCol; varying float vA;
uniform float uFAlpha; uniform float uFInk;
void main() {
  float a = vA * uFAlpha;
  vec3 col = vCol;
${OUT}
}`;

/* ---------- Dust: a loose cloud of twinkling dots around the ball ---------- */

const DUST_VERT = `
precision highp float;
attribute vec4 aD;                 // direction, seed
uniform mat3 uRot; uniform float uTime; uniform float uScale; uniform float uAspect;
uniform float uPush; uniform float uPoint; uniform float uPx; uniform float uSwirl;
uniform vec3 uC1; uniform vec3 uC3; uniform vec3 uGrad;
varying vec3 vCol; varying float vA;
void main() {
  float s = aD.w;
  float r = 1.22 + 0.32 * fract(s * 7.13) + uPush * (0.5 + s);
  float sw = uSwirl * (0.4 + s);                 // each dot circles at its own pace
  float cs = cos(sw), sn = sin(sw);
  vec3 d0 = vec3(cs * aD.x + sn * aD.z, aD.y, -sn * aD.x + cs * aD.z);
  vec3 d = normalize(d0 + 0.15 * vec3(sin(uTime * 0.3 + s * 20.0), cos(uTime * 0.27 + s * 13.0), sin(uTime * 0.23 + s * 7.0)));
  vec3 p = uRot * (d * r);
  float k = 4.5 / (4.5 - p.z);
  gl_Position = vec4(p.x * k * uScale / uAspect, p.y * k * uScale, 0.0, 1.0);
  float g = clamp(0.5 + 0.5 * dot(normalize(p), uGrad), 0.0, 1.0);
  vCol = mix(uC1, uC3, g);
  float tw = pow(0.5 + 0.5 * sin(uTime * (0.8 + s * 1.7) + s * 31.0), 4.0);
  float near = smoothstep(0.5, 1.5, p.z);        // the nearest dots: bigger and softer, out of focus
  vA = (0.15 + 0.85 * tw) * smoothstep(1.9, 1.45, r) * (p.z > -0.2 ? 1.0 : 0.45) * (1.0 - 0.6 * near);
  gl_PointSize = uPoint * uPx * (0.6 + 0.9 * fract(s * 3.7)) * k * (1.0 + 2.0 * near);
}`;

const DUST_FRAG = `
precision mediump float;
varying vec3 vCol; varying float vA;
uniform float uFAlpha; uniform float uFInk;
void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float l = length(pc);
  if (l > 0.5) discard;
  float a = smoothstep(0.5, 0.0, l) * vA * uFAlpha;
  vec3 col = vCol;
${OUT}
}`;

/* ---------- Glow: shrink, blur, and add back at two sizes ---------- */

const QUAD_VERT = `
attribute vec2 aQ;
varying vec2 vUv;
void main() {
  vUv = aQ * 0.5 + 0.5;
  gl_Position = vec4(aQ, 0.0, 1.0);
}`;

const DOWN_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex; uniform vec2 uTexel;     // one texel of the bigger source
void main() {
  vec4 c = texture2D(uTex, vUv + uTexel * vec2(-1.0, -1.0));
  c += texture2D(uTex, vUv + uTexel * vec2(1.0, -1.0));
  c += texture2D(uTex, vUv + uTexel * vec2(-1.0, 1.0));
  c += texture2D(uTex, vUv + uTexel * vec2(1.0, 1.0));
  gl_FragColor = c * 0.25;
}`;

const BLUR_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex; uniform vec2 uStep;
void main() {
  vec4 c = texture2D(uTex, vUv) * 0.227;
  c += (texture2D(uTex, vUv + uStep) + texture2D(uTex, vUv - uStep)) * 0.1945;
  c += (texture2D(uTex, vUv + uStep * 2.0) + texture2D(uTex, vUv - uStep * 2.0)) * 0.1216;
  c += (texture2D(uTex, vUv + uStep * 3.0) + texture2D(uTex, vUv - uStep * 3.0)) * 0.054;
  c += (texture2D(uTex, vUv + uStep * 4.0) + texture2D(uTex, vUv - uStep * 4.0)) * 0.0162;
  gl_FragColor = c;
}`;

const GLOW_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTight; uniform sampler2D uWide; uniform float uTightAmt; uniform float uWideAmt;
void main() {
  gl_FragColor = clamp(texture2D(uTight, vUv) * uTightAmt + texture2D(uWide, vUv) * uWideAmt, 0.0, 1.0);
}`;

/* ---------- Helpers ---------- */

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('SaathiBlob shader:', gl.getShaderInfoLog(sh));
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
    console.warn('SaathiBlob link:', gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

/** A geodesic ball: evenly spread points (with a random seed each), its triangles and its unique edges. */
function geodesic(level: number) {
  const g = (1 + Math.sqrt(5)) / 2;
  const unit = (v: number[]) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const pts: number[][] = [
    [-1, g, 0], [1, g, 0], [-1, -g, 0], [1, -g, 0], [0, -1, g], [0, 1, g],
    [0, -1, -g], [0, 1, -g], [g, 0, -1], [g, 0, 1], [-g, 0, -1], [-g, 0, 1],
  ].map(unit);
  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let l = 0; l < level; l++) {
    const cache = new Map<string, number>();
    const mid = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      pts.push(unit([(pts[a][0] + pts[b][0]) / 2, (pts[a][1] + pts[b][1]) / 2, (pts[a][2] + pts[b][2]) / 2]));
      cache.set(key, pts.length - 1);
      return pts.length - 1;
    };
    const next: number[][] = [];
    for (const [a, b, c] of faces) {
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  const verts = new Float32Array(pts.length * 4);
  pts.forEach((p, i) => { verts.set([p[0], p[1], p[2], Math.random()], i * 4); });
  const edgeSet = new Set<string>();
  const edges: number[] = [];
  for (const [a, b, c] of faces) {
    for (const [x, y] of [[a, b], [b, c], [c, a]]) {
      const key = x < y ? `${x}_${y}` : `${y}_${x}`;
      if (!edgeSet.has(key)) { edgeSet.add(key); edges.push(x, y); }
    }
  }
  return { verts, tris: new Uint16Array(faces.flat()), edges: new Uint16Array(edges) };
}

/** A ribbon as a grid: `along` steps around the loop, `across` steps over its width. */
function ribbonGrid(along: number, across: number) {
  const verts = new Float32Array((along + 1) * (across + 1) * 2);
  let i = 0;
  for (let a = 0; a <= along; a++) {
    for (let b = 0; b <= across; b++) { verts[i++] = a / along; verts[i++] = (b / across) * 2 - 1; }
  }
  const at = (a: number, b: number) => a * (across + 1) + b;
  const idx: number[] = [];
  for (let a = 0; a < along; a++) {
    for (let b = 0; b < across; b++) idx.push(at(a, b), at(a + 1, b), at(a, b + 1), at(a, b + 1), at(a + 1, b), at(a + 1, b + 1));
  }
  return { verts, idx: new Uint16Array(idx) };
}

function dustPoints(count: number) {
  const out = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    out.set([r * Math.cos(a), z, r * Math.sin(a), Math.random()], i * 4);
  }
  return out;
}

/** Rotation (yaw about y, then pitch about x, then roll about z) as a column-major mat3. */
function rotation(yaw: number, pitch: number, roll: number) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const mul = (a: number[], b: number[]) => {
    const o = new Array(9).fill(0);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) o[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
    return o;
  };
  const Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const Rx = [1, 0, 0, 0, cp, -sp, 0, sp, cp];
  const Rz = [cr, -sr, 0, sr, cr, 0, 0, 0, 1];
  const m = mul(Rz, mul(Rx, Ry));
  return new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
}

type Target = { fb: WebGLFramebuffer | null; tex: WebGLTexture | null; w: number; h: number; ok: boolean };

function makeTarget(gl: WebGLRenderingContext, w: number, h: number): Target {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fb, tex, w, h, ok };
}

function dropTarget(gl: WebGLRenderingContext, t: Target | null) {
  if (!t) return;
  gl.deleteFramebuffer(t.fb);
  gl.deleteTexture(t.tex);
}

type Props = {
  mode?: OrbMode;
  /** Ball radius as a fraction of the canvas half-height (default 0.6: fills the hero's orb footprint). */
  scale?: number;
  /** 'night' for dark pages (default), 'day' for light pages (ink on the page). */
  variant?: 'night' | 'day';
  className?: string;
  ref?: React.Ref<SaathiOrbHandle>;
};

export function SaathiBlob({ mode = 'idle', scale = 0.6, variant = 'night', className, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef(scale);
  const dayRef = useRef(variant === 'day');
  const engine = useRef({
    mode: 'idle' as OrbMode,
    rings: [] as number[],
    lastPulse: -10,
    now: 0,
    word: { at: -10, dur: 0, syl: 1 },   // the word being said: the bumps swell once per syllable
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
    echo: () => { engine.current.rings.push(engine.current.now); },
  }));

  useEffect(() => { engine.current.mode = mode; engine.current.redraw?.(); }, [mode]);
  useEffect(() => { scaleRef.current = scale; engine.current.redraw?.(); }, [scale]);
  useEffect(() => { dayRef.current = variant === 'day'; engine.current.redraw?.(); }, [variant]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Anti-aliased: the crisp orb is drawn straight onto the canvas (the glow is drawn offscreen).
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
    const skinProg = gl && link(gl, MESH_VERT, SKIN_FRAG);
    const lineProg = gl && link(gl, MESH_VERT, LINE_FRAG);
    const nodeProg = gl && link(gl, MESH_VERT, NODE_FRAG);
    const ribbonProg = gl && link(gl, RIBBON_VERT, RIBBON_FRAG);
    const dustProg = gl && link(gl, DUST_VERT, DUST_FRAG);
    const downProg = gl && link(gl, QUAD_VERT, DOWN_FRAG);
    const blurProg = gl && link(gl, QUAD_VERT, BLUR_FRAG);
    const glowProg = gl && link(gl, QUAD_VERT, GLOW_FRAG);
    if (!gl || !skinProg || !lineProg || !nodeProg || !ribbonProg || !dustProg || !downProg || !blurProg || !glowProg) {
      canvas.dataset.fallback = 'true';
      return;
    }

    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    const ball = geodesic(4);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, ball.verts, gl.STATIC_DRAW);
    const triIbo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triIbo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ball.tris, gl.STATIC_DRAW);
    const edgeIbo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edgeIbo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ball.edges, gl.STATIC_DRAW);
    const nodeCount = ball.verts.length / 4;
    const rib = ribbonGrid(small ? 140 : 200, 6);
    const ribVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ribVbo);
    gl.bufferData(gl.ARRAY_BUFFER, rib.verts, gl.STATIC_DRAW);
    const ribIbo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ribIbo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, rib.idx, gl.STATIC_DRAW);
    const dust = dustPoints(small ? 260 : 460);
    const dustBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
    gl.bufferData(gl.ARRAY_BUFFER, dust, gl.STATIC_DRAW);
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const locs = (prog: WebGLProgram, names: string[]) =>
      Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(prog, n)])) as Record<string, WebGLUniformLocation | null>;
    const MESH_U = ['uRot', 'uTime', 'uScale', 'uAspect', 'uAmp', 'uFine', 'uFlow', 'uBreath', 'uRipple', 'uRippleAge', 'uDir', 'uPoint', 'uPx',
      'uPointer', 'uPull', 'uGrad', 'uFireAmt', 'uC1', 'uC2', 'uC3', 'uSpeak', 'uSpeakMix', 'uFTime', 'uFAlpha', 'uFInk', 'uFVoice', 'uFGloss'];
    const meshProgs = [skinProg, lineProg, nodeProg].map((prog) => ({ prog, u: locs(prog, MESH_U), aV: gl.getAttribLocation(prog, 'aV') }));
    const [skin, lines, nodes] = meshProgs;
    const ru = locs(ribbonProg, ['uRot', 'uRib', 'uScale', 'uAspect', 'uRad', 'uWidth', 'uTwist', 'uPhase', 'uWob', 'uCa', 'uCb', 'uFAlpha', 'uFInk']);
    const aR = gl.getAttribLocation(ribbonProg, 'aR');
    const du = locs(dustProg, ['uRot', 'uTime', 'uScale', 'uAspect', 'uPush', 'uPoint', 'uPx', 'uSwirl', 'uC1', 'uC3', 'uGrad', 'uFAlpha', 'uFInk']);
    const aD = gl.getAttribLocation(dustProg, 'aD');
    const downU = locs(downProg, ['uTex', 'uTexel']);
    const blurU = locs(blurProg, ['uTex', 'uStep']);
    const glowU = locs(glowProg, ['uTight', 'uWide', 'uTightAmt', 'uWideAmt']);
    const quadA = [downProg, blurProg, glowProg].map((p) => gl.getAttribLocation(p, 'aQ'));

    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    // Offscreen: the orb at half size (the glow's source), a quarter-size pair (the tight
    // glow) and an eighth-size pair (the wide halo).
    let width = 1, height = 1, dpr = 1;
    let src: Target | null = null, tA: Target | null = null, tB: Target | null = null, wA: Target | null = null, wB: Target | null = null;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      [src, tA, tB, wA, wB].forEach((t) => dropTarget(gl, t));
      const sized = (div: number) => makeTarget(gl, Math.max(1, Math.round(width / div)), Math.max(1, Math.round(height / div)));
      src = sized(2);
      tA = sized(4);
      tB = sized(4);
      wA = sized(8);
      wB = sized(8);
    };
    resize();

    // Desktop: the surface leans gently toward the mouse.
    const ptr = { dir: [0, 0, 1], pull: 0, target: 0 };
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerType !== 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      const cx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const cy = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
      const bx = (cx * (rect.width / rect.height)) / scaleRef.current;
      const by = cy / scaleRef.current;
      const dist = Math.hypot(bx, by);
      ptr.target = dist < 2.4 ? 1 - Math.max(0, Math.min(1, (dist - 1) / 1.4)) : 0;
      const l = Math.hypot(bx, by, 0.9);
      ptr.dir = [bx / l, by / l, 0.9 / l];
    };
    const onLeave = () => { ptr.target = 0; };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    const st = {
      voice: 0.05, vSaathi: 0, vFamily: 0, amp: 0.13, fine: 0.025, flow: 0, spin: 0, dir: 1, glow: 0.9, push: 0, swirl: 0,
      speakMix: 0, fire: 0.35, speak: [...PALETTE.night.saathi], ribPhase: [0, 2.1], nextRing: 0, ringStep: 0, lastT: 0,
    };
    const e = engine.current;
    const start = performance.now();

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
      const pal = day ? PALETTE.day : PALETTE.night;

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
      st.vSaathi += ((m === 'saathi' ? st.voice : 0) - st.vSaathi) * ease(6);
      st.vFamily += ((m === 'family' ? st.voice : 0) - st.vFamily) * ease(6);

      // Ringing: ring-ring … pause; each ring makes the ball shiver and puff out dust.
      if (m === 'ringing' && t > st.nextRing) {
        e.rings.push(t);
        st.ringStep = (st.ringStep + 1) % 2;
        st.nextRing = t + (st.ringStep === 1 ? 0.32 : 1.4);
      }
      e.rings = e.rings.filter((s0) => t - s0 < 1.2);
      const shiver = e.rings.reduce((acc, s0) => acc + Math.exp(-(t - s0) * 6), 0);

      const ampT = speaking ? 0.15 + 0.12 * st.voice : m === 'ringing' ? 0.14 + 0.05 * shiver : m === 'ended' ? 0.08 : 0.13;
      st.amp += (ampT - st.amp) * ease(6);
      const fineT = speaking ? 0.03 + 0.07 * st.voice : m === 'ringing' ? 0.03 + 0.04 * shiver : 0.025;
      st.fine += (fineT - st.fine) * ease(8);
      if (m === 'family') st.dir = -1;
      else if (m === 'saathi') st.dir = 1;
      st.flow += dt * (0.1 + 0.6 * st.voice) * st.dir;
      st.spin += dt * (0.12 + 0.2 * st.voice);
      st.swirl += dt * (0.04 + 0.5 * st.voice);
      const glowT = speaking ? 0.92 + 0.2 * st.voice : m === 'ringing' ? 0.95 + 0.4 * shiver : m === 'ended' ? 0.55 : 0.85;
      st.glow += (glowT - st.glow) * ease(4);
      const fireT = speaking ? 0.5 + 0.3 * st.voice : m === 'ringing' ? 0.5 + 0.4 * shiver : m === 'ended' ? 0.12 : 0.35;
      st.fire += (fireT - st.fire) * ease(5);
      const pushT = speaking ? 0.12 * st.voice : 0;
      st.push += (pushT + 0.18 * shiver - st.push) * ease(5);
      // the speaker's colour leans in (less on light pages, where it reads as darker ink)
      st.speakMix += ((speaking ? (day ? 0.28 : 0.4) : 0) - st.speakMix) * ease(5);
      const speakT = m === 'family' ? pal.family : pal.saathi;
      if (speaking) for (let i = 0; i < 3; i++) st.speak[i] += (speakT[i] - st.speak[i]) * ease(6);
      ptr.pull += ((reduced ? 0 : ptr.target) - ptr.pull) * ease(4);
      RIBBONS.forEach((r, i) => {
        const v = r.who === 'saathi' ? st.vSaathi : st.vFamily;
        st.ribPhase[i] += dt * r.speed * (1 + 2.5 * v);
      });

      const aspect = width / height;
      const T = reduced ? 3 : t;
      const rot = rotation(reduced ? 0.6 : st.spin, 0.3 + (reduced ? 0 : 0.06 * Math.sin(t * 0.21)), reduced ? 0 : 0.08 * Math.sin(t * 0.17));
      const breath = 1 + (reduced ? 0 : 0.015 * Math.sin(t * 1.3));
      const gAng = -0.72 + (reduced ? 0 : 0.25 * Math.sin(t * 0.07));
      const grad = [Math.cos(gAng) * 0.88, Math.sin(gAng) * 0.88, 0.35];
      const gLen = Math.hypot(grad[0], grad[1], grad[2]);
      const gradN = new Float32Array([grad[0] / gLen, grad[1] / gLen, grad[2] / gLen]);
      const dim = m === 'ended' ? 0.6 : 1;

      // Draws the whole orb into whatever framebuffer is bound. `px` scales point sizes
      // (0.5 for the half-size glow source).
      const renderOrb = (px: number) => {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, day ? gl.ONE_MINUS_SRC_ALPHA : gl.ONE);

        // dust
        gl.useProgram(dustProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
        gl.enableVertexAttribArray(aD);
        gl.vertexAttribPointer(aD, 4, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix3fv(du.uRot, false, rot);
        gl.uniform1f(du.uTime, T);
        gl.uniform1f(du.uScale, scaleRef.current);
        gl.uniform1f(du.uAspect, aspect);
        gl.uniform1f(du.uPush, st.push);
        gl.uniform1f(du.uPoint, 2.2 * dpr);
        gl.uniform1f(du.uPx, px);
        gl.uniform1f(du.uSwirl, reduced ? 0 : st.swirl);
        gl.uniform3fv(du.uC1, pal.blue);
        gl.uniform3fv(du.uC3, pal.magenta);
        gl.uniform3fv(du.uGrad, gradN);
        gl.uniform1f(du.uFAlpha, (day ? 0.55 : 0.7) * (m === 'ended' ? 0.5 : 1));
        gl.uniform1f(du.uFInk, day ? 1 : 0);
        gl.drawArrays(gl.POINTS, 0, dust.length / 4);

        // ribbons, inside the glass
        gl.useProgram(ribbonProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, ribVbo);
        gl.enableVertexAttribArray(aR);
        gl.vertexAttribPointer(aR, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ribIbo);
        gl.uniformMatrix3fv(ru.uRot, false, rot);
        gl.uniform1f(ru.uScale, scaleRef.current);
        gl.uniform1f(ru.uAspect, aspect);
        gl.uniform1f(ru.uFInk, day ? 1 : 0);
        RIBBONS.forEach((r, i) => {
          const v = r.who === 'saathi' ? st.vSaathi : st.vFamily;
          gl.uniformMatrix3fv(ru.uRib, false, rotation(r.yaw + (reduced ? 0 : t * r.spin), r.pitch, r.roll));
          gl.uniform1f(ru.uRad, r.rad);
          gl.uniform1f(ru.uWidth, r.width * (1 + 0.35 * v));
          gl.uniform1f(ru.uTwist, r.twist);
          gl.uniform1f(ru.uPhase, st.ribPhase[i]);
          gl.uniform1f(ru.uWob, 0.4 + 0.8 * v);
          gl.uniform3fv(ru.uCa, pal[r.who]);
          gl.uniform3fv(ru.uCb, pal[r.to]);
          gl.uniform1f(ru.uFAlpha, (day ? 0.32 : 0.42) * (0.75 + (day ? 0.35 : 0.6) * v) * dim);
          gl.drawElements(gl.TRIANGLES, rib.idx.length, gl.UNSIGNED_SHORT, 0);
        });

        // the ball: glass skin, then lines, then the dots at the joints
        const setMesh = (p: (typeof meshProgs)[number], alpha: number) => {
          gl.useProgram(p.prog);
          gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
          gl.enableVertexAttribArray(p.aV);
          gl.vertexAttribPointer(p.aV, 4, gl.FLOAT, false, 0, 0);
          const u = p.u;
          gl.uniformMatrix3fv(u.uRot, false, rot);
          gl.uniform1f(u.uTime, T);
          gl.uniform1f(u.uScale, scaleRef.current);
          gl.uniform1f(u.uAspect, aspect);
          gl.uniform1f(u.uAmp, reduced ? 0.13 : st.amp);
          gl.uniform1f(u.uFine, reduced ? 0.025 : st.fine);
          gl.uniform1f(u.uFlow, st.flow);
          gl.uniform1f(u.uBreath, breath);
          gl.uniform1f(u.uRipple, speaking && !reduced ? 1 : 0);
          gl.uniform1f(u.uRippleAge, sinceWord);
          gl.uniform1f(u.uDir, st.dir);
          gl.uniform1f(u.uPoint, 2.4 * dpr);
          gl.uniform1f(u.uPx, px);
          gl.uniform3fv(u.uPointer, ptr.dir);
          gl.uniform1f(u.uPull, ptr.pull);
          gl.uniform3fv(u.uGrad, gradN);
          gl.uniform1f(u.uFireAmt, reduced ? 0.3 : st.fire * (day ? 0.6 : 1));
          gl.uniform3fv(u.uC1, pal.blue);
          gl.uniform3fv(u.uC2, pal.violet);
          gl.uniform3fv(u.uC3, pal.magenta);
          gl.uniform3fv(u.uSpeak, st.speak);
          gl.uniform1f(u.uSpeakMix, st.speakMix);
          gl.uniform1f(u.uFTime, T);
          gl.uniform1f(u.uFAlpha, alpha);
          gl.uniform1f(u.uFInk, day ? 1 : 0);
          gl.uniform1f(u.uFVoice, st.voice);
          gl.uniform1f(u.uFGloss, day ? 0 : 1);
        };
        setMesh(skin, (day ? 0.7 : 0.55) * dim);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triIbo);
        gl.drawElements(gl.TRIANGLES, ball.tris.length, gl.UNSIGNED_SHORT, 0);
        setMesh(lines, (day ? 0.85 : 0.75) * dim);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edgeIbo);
        gl.drawElements(gl.LINES, ball.edges.length, gl.UNSIGNED_SHORT, 0);
        setMesh(nodes, (day ? 0.9 : 0.8) * dim);
        gl.drawArrays(gl.POINTS, 0, nodeCount);
      };

      const useGlow = !!(src?.ok && tA?.ok && tB?.ok && wA?.ok && wB?.ok);
      if (useGlow) {
        const S = src!, A = tA!, B = tB!, C = wA!, D = wB!;
        // 1. the orb at half size, as the glow's source
        gl.bindFramebuffer(gl.FRAMEBUFFER, S.fb);
        gl.viewport(0, 0, S.w, S.h);
        gl.clear(gl.COLOR_BUFFER_BIT);
        renderOrb(0.5);

        // 2. shrink and blur: a tight glow (quarter size), then a wide halo (eighth size)
        gl.disable(gl.BLEND);
        const quad = (prog: WebGLProgram, a: number) => {
          gl.useProgram(prog);
          gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
          gl.enableVertexAttribArray(a);
          gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
        };
        gl.activeTexture(gl.TEXTURE0);
        const shrink = (from: Target, to: Target) => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, to.fb);
          gl.viewport(0, 0, to.w, to.h);
          quad(downProg, quadA[0]);
          gl.bindTexture(gl.TEXTURE_2D, from.tex);
          gl.uniform1i(downU.uTex, 0);
          gl.uniform2f(downU.uTexel, 1 / from.w, 1 / from.h);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };
        const blur = (a: Target, b: Target, spreads: number[]) => {
          quad(blurProg, quadA[1]);
          gl.uniform1i(blurU.uTex, 0);
          gl.viewport(0, 0, a.w, a.h);
          for (const spread of spreads) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, b.fb);
            gl.bindTexture(gl.TEXTURE_2D, a.tex);
            gl.uniform2f(blurU.uStep, spread / a.w, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb);
            gl.bindTexture(gl.TEXTURE_2D, b.tex);
            gl.uniform2f(blurU.uStep, 0, spread / a.h);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          }
        };
        shrink(S, A);
        blur(A, B, [1, 1.8]);
        shrink(A, C);
        blur(C, D, [1.2, 2.4]);

        // 3. on screen: the glow first, then the crisp orb over it
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        quad(glowProg, quadA[2]);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, A.tex);
        gl.uniform1i(glowU.uTight, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, C.tex);
        gl.uniform1i(glowU.uWide, 1);
        // on light pages the haze doesn't grow while someone talks (it would read as darker)
        const glowAmt = day ? Math.min(st.glow, 0.88) : st.glow;
        gl.uniform1f(glowU.uTightAmt, (day ? 0.32 : 0.7) * glowAmt);
        gl.uniform1f(glowU.uWideAmt, (day ? 0.4 : 0.85) * glowAmt);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.activeTexture(gl.TEXTURE0);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      renderOrb(1);
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
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      [src, tA, tB, wA, wB].forEach((tg) => dropTarget(gl, tg));
      [vbo, triIbo, edgeIbo, ribVbo, ribIbo, dustBuf, quadBuf].forEach((b) => gl.deleteBuffer(b));
      [skinProg, lineProg, nodeProg, ribbonProg, dustProg, downProg, blurProg, glowProg].forEach((p) => gl.deleteProgram(p));
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }} />;
}
