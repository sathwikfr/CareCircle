'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pill, HeartHandshake, Siren, Clock, PhoneCall, Check, Mail, Smile, Languages } from 'lucide-react';
import s from './home.module.css';

type Row = { title: string; body: string; chips?: { icon: React.ReactNode; text: string }[]; tone?: 'good' | 'warn' | 'bad' };

const FLOWS: { id: string; label: string; icon: React.ReactNode; rows: Row[] }[] = [
  {
    id: 'medicine',
    label: 'Medicine calls',
    icon: <Pill size={16} />,
    rows: [
      { title: '8:30 AM, time for her BP tablet', body: 'Amlodipine 5mg · after breakfast', chips: [{ icon: <Clock size={12} />, text: 'On her clock, not yours' }] },
      { title: 'Saathi calls Amma', body: 'Picked up in Telugu · 1 minute 12 seconds', chips: [{ icon: <Languages size={12} />, text: '9 languages' }, { icon: <PhoneCall size={12} />, text: 'Any phone' }] },
      { title: 'Taken. It’s on your dashboard.', body: 'If she hadn’t taken it, you’d see that too', tone: 'good' },
    ],
  },
  {
    id: 'wellbeing',
    label: 'Wellbeing calls',
    icon: <HeartHandshake size={16} />,
    rows: [
      { title: '6:00 PM, evening check-in', body: 'No medicines due, just a chat' },
      { title: 'Saathi asks how she’s feeling', body: '“Thoda thakaan hai, beta. Baaki sab theek.”', chips: [{ icon: <Smile size={12} />, text: 'One gentle question' }] },
      { title: 'Mood noted: a little tired', body: 'Trends show you if tiredness keeps coming up', tone: 'warn' },
    ],
  },
  {
    id: 'alert',
    label: 'When something’s wrong',
    icon: <Siren size={16} />,
    rows: [
      { title: 'Amma says she feels dizzy', body: 'During her 8:30 AM check-in' },
      { title: 'Saathi stays calm', body: 'Suggests she sits down and calls you or her doctor. It never gives medical advice.' },
      { title: 'You get an email straight away', body: 'Health concern · level 3 alert', tone: 'bad', chips: [{ icon: <Mail size={12} />, text: 'Also on your dashboard' }] },
    ],
  },
];

export function FlowTabs() {
  const [active, setActive] = useState(FLOWS[0].id);
  const flow = FLOWS.find((f) => f.id === active)!;

  return (
    <div style={{ textAlign: 'center' }}>
      <div className={s.tabs} role="tablist" aria-label="Kinds of check-in">
        {FLOWS.map((f) => (
          <button key={f.id} role="tab" aria-selected={active === f.id} onClick={() => setActive(f.id)} className={s.tabBtn}>
            {active === f.id && <motion.span layoutId="flow-tab-pill" className={s.tabPill} />}
            <span className={s.tabLabel}>{f.icon} {f.label}</span>
          </button>
        ))}
      </div>

      <motion.div layout className={s.flowCard} role="tabpanel" style={{ textAlign: 'left' }}>
        <AnimatePresence mode="wait" initial={false}>
        <motion.ol
          className={s.flowList}
          key={active}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
        >
          {flow.rows.map((r, i) => (
            <li key={r.title} className={`${s.flowRow} ${r.tone ? s[r.tone] : ''}`}>
              <span className={s.flowNum}>{r.tone ? <Check size={18} strokeWidth={3} /> : i + 1}</span>
              <div>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
                {r.chips && (
                  <div className={s.flowChips}>
                    {r.chips.map((c) => (
                      <span key={c.text}>{c.icon} {c.text}</span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </motion.ol>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
