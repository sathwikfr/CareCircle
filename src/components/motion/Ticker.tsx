import React from 'react';

/** Endless horizontal ticker. Content is duplicated so the loop is seamless. */
export function Ticker({ items }: { items: { icon?: React.ReactNode; text: string }[] }) {
  const row = (hidden: boolean) =>
    items.map((it, i) => (
      <span key={`${hidden ? 'b' : 'a'}${i}`} className="ticker-item" aria-hidden={hidden || undefined}>
        {it.icon}
        {it.text}
      </span>
    ));
  return (
    <div className="ticker" role="region" aria-label="Highlights">
      <div className="ticker-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
