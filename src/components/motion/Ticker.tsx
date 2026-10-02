import React from 'react';

type TickerItem = { icon?: React.ReactNode; text: string; sub?: string };

/** Endless horizontal ticker. Content is duplicated so the loop is seamless. `sub` adds a small second line under an item. */
export function Ticker({ items, label = 'Highlights', className }: { items: TickerItem[]; label?: string; className?: string }) {
  const row = (hidden: boolean) =>
    items.map((it, i) => (
      <span key={`${hidden ? 'b' : 'a'}${i}`} className="ticker-item" aria-hidden={hidden || undefined}>
        {it.icon}
        {it.sub ? <span className="ticker-text">{it.text}<small>{it.sub}</small></span> : it.text}
      </span>
    ));
  return (
    <div className={`ticker${className ? ` ${className}` : ''}`} role="region" aria-label={label}>
      <div className="ticker-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
