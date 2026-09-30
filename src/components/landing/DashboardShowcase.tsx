import React from 'react';
import { Users, PhoneCall, Pill, Bell, Check, PhoneMissed } from 'lucide-react';
import { CountUp } from '@/components/motion/CountUp';
import s from './home.module.css';

/** Example of the family dashboard in a browser frame. Clearly labelled; no real data. */
export function DashboardShowcase() {
  return (
    <div className={s.browser}>
      <span className={s.exampleTag} style={{ top: '10px' }}>Example</span>
      <div className={s.browserBar} aria-hidden="true">
        <i /><i /><i />
        <span>aaptha · dashboard</span>
      </div>
      <div className={s.browserBody}>
        <div className={s.welcome}>
          <h3>Namaste Priya 👋 Here’s how your parents are today</h3>
          <p><span className="dot live" /> Next check-in: Appa at 9:00 PM</p>
          <div className={s.statRow}>
            <div className={s.statTile}><Users size={18} /><b><CountUp value={2} /></b><span>Parents</span></div>
            <div className={s.statTile}><PhoneCall size={18} /><b><CountUp value={3} /></b><span>Calls today</span></div>
            <div className={s.statTile}><Pill size={18} /><b><CountUp value={4} /></b><span>Medicines confirmed</span></div>
            <div className={s.statTile}><Bell size={18} /><b><CountUp value={1} /></b><span>Needs a look</span></div>
          </div>
        </div>

        <div className={s.teamHead}>Your parents</div>
        <div className={s.teamRow}>
          <span className="parent-avatar sm" style={{ width: '40px', height: '40px', borderRadius: '13px', fontSize: '1rem' }}>A</span>
          <div>
            <b>Amma</b>
            <small>Telugu · 2 check-ins a day</small>
          </div>
          <span className="badge badge-green"><Check size={12} /> All good today</span>
        </div>
        <div className={s.teamRow} style={{ marginBottom: 0 }}>
          <span className="parent-avatar sm" style={{ width: '40px', height: '40px', borderRadius: '13px', fontSize: '1rem', background: 'linear-gradient(145deg, #818cf8, #4338ca)' }}>A</span>
          <div>
            <b>Appa</b>
            <small>Hindi · 1 check-in a day</small>
          </div>
          <span className="badge badge-amber"><PhoneMissed size={12} /> Missed the 8 AM call</span>
        </div>
      </div>
    </div>
  );
}
