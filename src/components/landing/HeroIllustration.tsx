import React from 'react';

/**
 * Flat illustration: a mother in her armchair, on a phone call, in a bright room.
 * Pure SVG so it stays sharp, themes cleanly and costs nothing to load.
 */
export function HeroIllustration() {
  const skin = '#d49468';
  const skinDark = '#b8744c';
  const saree = '#f97316';
  const sareeLight = '#fdba74';
  const border = '#facc15';
  const blouse = '#6b2d5c';

  return (
    <svg viewBox="0 0 880 440" role="img" aria-label="Illustration of a mother in her armchair talking on the phone">
      <defs>
        <linearGradient id="hi-chair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a8a7f" />
          <stop offset="1" stopColor="#0d5a53" />
        </linearGradient>
        <linearGradient id="hi-window" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#fbeedb" />
        </linearGradient>
        <radialGradient id="hi-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f2a33a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f2a33a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* floor + rug */}
      <rect x="0" y="372" width="880" height="68" fill="#e6dccb" opacity="0.7" />
      <ellipse cx="440" cy="404" rx="260" ry="22" fill="#c9b79c" opacity="0.45" />

      {/* window with sun */}
      <g>
        <rect x="86" y="62" width="176" height="200" rx="18" fill="url(#hi-window)" stroke="#d9c7a8" strokeWidth="6" />
        <circle cx="210" cy="112" r="26" fill="#fde68a" />
        <circle cx="210" cy="112" r="40" fill="#fde68a" opacity="0.25" />
        <line x1="174" y1="66" x2="174" y2="258" stroke="#d9c7a8" strokeWidth="5" />
        <line x1="90" y1="162" x2="258" y2="162" stroke="#d9c7a8" strokeWidth="5" />
        <rect x="76" y="258" width="196" height="12" rx="6" fill="#c9a77a" />
      </g>

      {/* framed photo on the wall */}
      <g>
        <rect x="612" y="86" width="112" height="84" rx="12" fill="#ffffff" stroke="#e3d3b8" strokeWidth="6" />
        <path d="M668 142 C650 128 646 112 658 106 C664 103 668 108 668 112 C668 108 672 103 678 106 C690 112 686 128 668 142 Z" fill="#e0703a" />
      </g>

      {/* plant */}
      <g>
        <ellipse cx="770" cy="272" rx="16" ry="46" fill="#34d399" transform="rotate(-24 770 272)" />
        <ellipse cx="800" cy="266" rx="14" ry="42" fill="#10b981" transform="rotate(20 800 266)" />
        <ellipse cx="786" cy="252" rx="13" ry="48" fill="#059669" />
        <path d="M760 318 L812 318 L804 372 L768 372 Z" fill="#c2552a" />
        <rect x="754" y="310" width="64" height="12" rx="6" fill="#d9683a" />
      </g>

      {/* side table with tea */}
      <g>
        <rect x="598" y="300" width="92" height="12" rx="6" fill="#7a4b2e" />
        <rect x="610" y="312" width="8" height="62" rx="4" fill="#7a4b2e" />
        <rect x="670" y="312" width="8" height="62" rx="4" fill="#7a4b2e" />
        <rect x="628" y="278" width="26" height="22" rx="6" fill="#ffffff" stroke="#c9a77a" strokeWidth="3" />
        <path d="M654 284 q10 0 10 7 t-10 7" fill="none" stroke="#c9a77a" strokeWidth="3" />
        <path className="steam" d="M636 270 q-6 -10 0 -18 t0 -18" fill="none" stroke="#c9a77a" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <path className="steam" d="M646 270 q-6 -10 0 -18 t0 -18" fill="none" stroke="#c9a77a" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      </g>

      {/* armchair */}
      <g>
        <rect x="328" y="146" width="224" height="236" rx="72" fill="url(#hi-chair)" />
        <rect x="318" y="296" width="244" height="84" rx="36" fill="#0d5a53" />
        <rect x="296" y="248" width="66" height="134" rx="33" fill="#15796e" />
        <rect x="518" y="248" width="66" height="134" rx="33" fill="#15796e" />
        <rect x="334" y="376" width="14" height="24" rx="6" fill="#5b3a24" />
        <rect x="532" y="376" width="14" height="24" rx="6" fill="#5b3a24" />
      </g>

      {/* mother */}
      <g>
        {/* lap and saree */}
        <path d="M366 298 Q440 282 514 298 L524 390 Q440 404 356 390 Z" fill={saree} />
        <path d="M358 384 Q440 398 522 384" fill="none" stroke={border} strokeWidth="7" strokeLinecap="round" />
        <ellipse cx="402" cy="400" rx="24" ry="9" fill={skinDark} />
        <ellipse cx="478" cy="400" rx="24" ry="9" fill={skinDark} />

        {/* torso */}
        <path d="M394 206 Q440 190 486 206 L502 306 Q440 320 378 306 Z" fill={saree} />
        {/* pallu drape */}
        <path d="M402 208 L438 198 L500 298 L474 308 Z" fill={sareeLight} />
        <path d="M402 208 L474 308" stroke={border} strokeWidth="5" strokeLinecap="round" />

        {/* resting arm */}
        <path d="M480 216 L494 242" stroke={blouse} strokeWidth="24" strokeLinecap="round" />
        <path d="M492 240 Q504 270 472 292" fill="none" stroke={skin} strokeWidth="18" strokeLinecap="round" />
        <circle cx="468" cy="294" r="10" fill={skin} />
        <circle cx="486" cy="268" r="4" fill={border} />

        {/* neck + head */}
        <rect x="430" y="176" width="20" height="28" rx="8" fill={skinDark} />
        <circle cx="440" cy="148" r="37" fill={skin} />
        {/* hair */}
        <path d="M403 150 Q402 106 440 105 Q478 106 477 150 Q472 122 440 120 Q408 122 403 150 Z" fill="#e2e8f0" />
        <circle cx="476" cy="122" r="17" fill="#e2e8f0" />
        <circle cx="476" cy="122" r="9" fill="#cbd5e1" />
        {/* face */}
        <circle cx="440" cy="133" r="3.4" fill="#dc2626" />
        <circle cx="427" cy="151" r="9" fill="rgba(255,255,255,0.35)" stroke="#1e293b" strokeWidth="2.6" />
        <circle cx="453" cy="151" r="9" fill="rgba(255,255,255,0.35)" stroke="#1e293b" strokeWidth="2.6" />
        <path d="M436 151 L444 151" stroke="#1e293b" strokeWidth="2.6" />
        <circle cx="427" cy="152" r="2.2" fill="#1e293b" />
        <circle cx="453" cy="152" r="2.2" fill="#1e293b" />
        <circle cx="420" cy="166" r="5" fill="#f472b6" opacity="0.35" />
        <circle cx="460" cy="166" r="5" fill="#f472b6" opacity="0.35" />
        <path d="M429 168 Q440 178 451 168" fill="none" stroke="#7c2d12" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="477" cy="160" r="3.2" fill={border} />

        {/* phone arm */}
        <path d="M402 216 L388 242" stroke={blouse} strokeWidth="24" strokeLinecap="round" />
        <path d="M388 240 Q370 250 384 262 Q398 212 404 174" fill="none" stroke={skin} strokeWidth="18" strokeLinecap="round" />
        <circle cx="405" cy="168" r="11" fill={skin} />
        <g transform="rotate(-14 402 152)">
          <rect x="393" y="136" width="18" height="32" rx="5" fill="#0f172a" />
          <rect x="396" y="140" width="12" height="20" rx="2" fill="#f2a33a" />
        </g>
        <circle cx="398" cy="150" r="30" fill="url(#hi-glow)" />
      </g>

      {/* voice waves */}
      <g className="waves" fill="none" stroke="#0d6b63" strokeLinecap="round">
        <path d="M376 136 Q366 152 376 168" strokeWidth="3.5" opacity="0.8" />
        <path d="M362 126 Q346 152 362 178" strokeWidth="3.5" opacity="0.5" />
        <path d="M348 116 Q326 152 348 188" strokeWidth="3.5" opacity="0.25" />
      </g>
    </svg>
  );
}
