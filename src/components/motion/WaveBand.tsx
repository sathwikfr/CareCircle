import React from 'react';

/** Decorative audio-wave silhouette. Heights are fixed so server and client markup match. */
const HEIGHTS = [30, 55, 40, 75, 50, 90, 60, 45, 80, 35, 65, 95, 50, 70, 40, 85, 55, 30, 75, 60, 45, 90, 65, 40, 80, 50, 70, 35, 60, 85, 45, 75, 55, 30, 65, 90, 50, 40, 70, 60];

export function WaveBand() {
  return (
    <div className="wave-band" aria-hidden="true">
      {HEIGHTS.map((h, i) => (
        <i key={i} style={{ '--h': `${h}%`, '--d': `${1.2 + (i % 5) * 0.25}s`, '--o': `${-(i % 7) * 0.2}s` } as React.CSSProperties} />
      ))}
    </div>
  );
}
