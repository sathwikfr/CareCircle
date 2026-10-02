import React from 'react';
import { UserRound, Pill, Clock, PhoneCall } from 'lucide-react';
import c from './liveCallPhone.module.css';

/**
 * "Set it up once": the three things a family does at signup (the same order as
 * the onboarding wizard), then Saathi takes over. Sits between the "How it works"
 * heading and the phone, which shows the "does the rest" part.
 */
const STEPS = [
  { icon: UserRound, title: 'Add your parent', note: 'Name, number, language' },
  { icon: Pill, title: 'Add their medicines', note: 'Snap the prescription' },
  { icon: Clock, title: 'Choose call times', note: 'Morning, evening, bedtime' },
];

export function SetupSteps() {
  return (
    <ol className={c.setup} aria-label="Setting up">
      {STEPS.map((st, i) => (
        <li key={st.title} className={c.setupStep}>
          <span className={c.setupIcon}><st.icon size={17} /></span>
          <span className={c.setupText}>
            <b><span className={c.setupNum}>{i + 1}</span>{st.title}</b>
            <small>{st.note}</small>
          </span>
        </li>
      ))}
      <li className={`${c.setupStep} ${c.setupDone}`}>
        <span className={c.setupIcon}><PhoneCall size={17} /></span>
        <span className={c.setupText}>
          <b>Saathi takes over</b>
          <small>Calls on time, every day</small>
        </span>
      </li>
    </ol>
  );
}
