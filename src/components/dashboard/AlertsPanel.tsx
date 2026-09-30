'use client';

import React from 'react';
import { Bell, BellRing, Siren, Info } from 'lucide-react';
import { AlertRecord } from '@/lib/types';
import { formatCallTime } from './helpers';

const LEVEL_LABEL: Record<number, string> = {
  0: 'All fine',
  1: 'For your information',
  2: 'Needs attention',
  3: 'Urgent',
  4: 'Emergency'
};

export function AlertsPanel({ parentName, alerts }: { parentName: string; alerts: AlertRecord[] }) {
  if (alerts.length === 0) {
    return (
      <div className="panel empty">
        <span className="icon-tile" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Bell size={24} /></span>
        <h3>Nothing to worry about</h3>
        <p>If a call with {parentName} raises a concern, like a missed medicine, a low mood or a mention of feeling unwell, it will show up here.</p>
      </div>
    );
  }

  return (
    <section className="panel" aria-labelledby="alerts-title">
      <div className="panel-head">
        <div>
          <h3 id="alerts-title">Alerts</h3>
          <p>Raised from {parentName}&apos;s calls. Anything that needs attention is also emailed to you.</p>
        </div>
      </div>

      <div className="list">
        {alerts.map((alt) => {
          const tone = alt.level >= 3 ? 'critical' : alt.level >= 2 ? 'urgent' : '';
          const Icon = alt.level >= 3 ? Siren : alt.level >= 2 ? BellRing : Info;
          return (
            <article key={alt.id} className={`alert-item ${tone}`}>
              <span className="level-orb"><Icon size={19} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <strong style={{ fontWeight: 600 }}>{alt.title}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-subtle)' }}>{formatCallTime(alt.createdAt || alt.timestamp)}</span>
                </div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--ink)' }}>{alt.message}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <span className={`badge ${alt.level >= 3 ? 'badge-red' : alt.level >= 2 ? 'badge-amber' : 'badge-neutral'}`}>
                    Level {alt.level} · {LEVEL_LABEL[alt.level] || 'Alert'}
                  </span>
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {alt.level >= 2 && alt.channel === 'email' ? 'Emailed · ' : ''}{alt.status}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
