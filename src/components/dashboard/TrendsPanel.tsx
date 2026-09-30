'use client';

import React from 'react';
import { Download, LineChart } from 'lucide-react';
import { CallStats, moodLabel } from './helpers';

export function TrendsPanel({ parentName, stats, onExport }: { parentName: string; stats: CallStats; onExport: () => void }) {
  const { completedCalls, adherencePct, reachabilityPct, answered30, last30, confirmed30, moodBreakdown, last7Days } = stats;

  if (completedCalls.length === 0) {
    return (
      <div className="panel empty">
        <span className="icon-tile"><LineChart size={24} /></span>
        <h3>No trends yet</h3>
        <p>Medicine, mood and pickup trends appear here after {parentName}&apos;s first few check-in calls.</p>
      </div>
    );
  }

  const topMood = moodBreakdown[0];

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <span className="panel-label">Medicines taken</span>
          <div className="stat-value" style={{ color: 'var(--teal)' }}>{adherencePct === null ? '—' : `${adherencePct}%`}</div>
          <p>{confirmed30} of {answered30.length} answered calls, last 30 days</p>
          <div className="meter" aria-hidden="true"><i style={{ width: `${adherencePct ?? 0}%` }} /></div>
        </div>

        <div className="stat">
          <span className="panel-label">Picked up</span>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{reachabilityPct === null ? '—' : `${reachabilityPct}%`}</div>
          <p>{answered30.length} of {last30.length} calls, last 30 days</p>
          <div className="meter" aria-hidden="true"><i style={{ width: `${reachabilityPct ?? 0}%`, background: 'var(--green)' }} /></div>
        </div>

        <div className="stat">
          <span className="panel-label">Usual mood</span>
          <div className="stat-value" style={{ color: 'var(--gold)', fontSize: '2rem', margin: '14px 0 10px' }}>
            {topMood ? moodLabel(topMood.mood) : '—'}
          </div>
          <p>
            {moodBreakdown.length
              ? moodBreakdown.map(m => `${m.pct}% ${moodLabel(m.mood).toLowerCase()}`).join(' · ')
              : 'No answered calls yet'}
          </p>
        </div>
      </div>

      <section className="panel" aria-labelledby="week-title">
        <div className="panel-head">
          <div>
            <h3 id="week-title">The last 7 days</h3>
            <p>Share of calls each day where medicines were confirmed</p>
          </div>
          <button onClick={onExport} className="btn btn-ghost btn-sm">
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="bars" role="img" aria-label="Medicines confirmed per day, last 7 days">
          {last7Days.map((bar, i) => (
            <div key={i} className="bar-col">
              <span className="pct">{bar.total ? `${bar.pct}%` : ''}</span>
              <div
                className={`bar ${!bar.total ? 'none' : bar.concern ? 'warn' : ''}`}
                style={{ height: bar.total ? `${Math.max(bar.pct, 6) * 1.5}px` : '4px' }}
              />
            </div>
          ))}
        </div>
        <div className="bar-days">
          {last7Days.map((bar, i) => (
            <div key={i}>
              <strong>{bar.day}</strong>
              <span>{bar.total ? (bar.mood ? moodLabel(bar.mood) : 'No answer') : 'No call'}</span>
            </div>
          ))}
        </div>

        <div className="legend" style={{ marginTop: '18px' }}>
          <span><i style={{ background: 'var(--teal)' }} />All good</span>
          <span><i style={{ background: 'var(--gold)' }} />Missed call or low mood</span>
          <span><i style={{ background: 'var(--line-subtle)' }} />No call</span>
        </div>
      </section>
    </>
  );
}
