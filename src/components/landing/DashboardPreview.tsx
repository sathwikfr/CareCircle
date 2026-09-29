import React from 'react';
import { Check, Clock, PhoneMissed } from 'lucide-react';
import styles from './landing.module.css';

const WEEK: { d: string; dots: ('ok' | 'miss' | 'todo')[]; today?: boolean }[] = [
  { d: 'Mon', dots: ['ok', 'ok'] },
  { d: 'Tue', dots: ['ok', 'ok'] },
  { d: 'Wed', dots: ['ok', 'miss'] },
  { d: 'Thu', dots: ['ok', 'ok'] },
  { d: 'Fri', dots: ['ok', 'ok'] },
  { d: 'Sat', dots: ['ok', 'todo'], today: true },
  { d: 'Sun', dots: ['todo', 'todo'] },
];

/** Static, clearly-labelled example of the family dashboard. */
export function DashboardPreview() {
  return (
    <div className={styles.dash} aria-label="Example of the CareCircle dashboard">
      <span className={styles.exampleTag}>Example</span>
      <div className={styles.dashTop}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 500 }}>Amma</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--ink-subtle)' }}>Saturday · 2 check-ins a day · Telugu</div>
        </div>
        <span className="badge badge-green"><span className="dot" style={{ background: 'var(--green)' }} /> All good today</span>
      </div>

      <div className={styles.week}>
        {WEEK.map((w) => (
          <div key={w.d} className={`${styles.day} ${w.today ? styles.today : ''}`}>
            {w.d}
            <div className={styles.dayDots}>
              {w.dots.map((dot, i) => (
                <i key={i} className={dot === 'miss' ? styles.miss : dot === 'todo' ? styles.todo : ''} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.slot}>
        <span className={styles.slotTime}>8:30 AM</span>
        <div>
          <strong>Morning check-in</strong>
          <span>Amlodipine 5mg · after breakfast · feeling well</span>
        </div>
        <span className="badge badge-green"><Check size={12} /> Taken</span>
      </div>
      <div className={styles.slot}>
        <span className={styles.slotTime}>9:00 PM</span>
        <div>
          <strong>Bedtime check-in</strong>
          <span>Metformin 500mg · after dinner</span>
        </div>
        <span className="badge badge-neutral"><Clock size={12} /> Tonight</span>
      </div>
      <div className={styles.slot}>
        <span className={styles.slotTime}>Wed</span>
        <div>
          <strong>Bedtime check-in</strong>
          <span>Didn&apos;t pick up · Metformin not confirmed</span>
        </div>
        <span className="badge badge-amber"><PhoneMissed size={12} /> Missed</span>
      </div>
    </div>
  );
}
