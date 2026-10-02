'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { VoiceHero } from '@/components/landing/VoiceHero';
import { LiveCallPhone } from '@/components/landing/LiveCallPhone';
import { SetupSteps } from '@/components/landing/SetupSteps';
import { CALL_MS, formatCallTime } from '@/components/landing/callScript';
import { ScrollProgress } from '@/components/motion/ScrollProgress';
import { FloatingCta } from '@/components/motion/FloatingCta';
import { Ticker } from '@/components/motion/Ticker';
import { WordReveal } from '@/components/motion/WordReveal';
import { TiltCard } from '@/components/motion/TiltCard';
import styles from '@/components/landing/landing.module.css';
import s from '@/components/landing/home.module.css';
import { PLANS, FREE_TRIAL_DAYS } from '@/lib/plans';
import { PlanId } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import {
  Check, PhoneCall, Languages, ShieldCheck, Stethoscope, Siren, HeartHandshake,
  ClipboardCheck, Plus, Sparkles, Minus, Heart, Reply, ExternalLink, CheckCheck, MessageCircle
} from 'lucide-react';

const LANGS = [
  { native: 'हिंदी', en: 'Hindi' },
  { native: 'తెలుగు', en: 'Telugu' },
  { native: 'தமிழ்', en: 'Tamil' },
  { native: 'ಕನ್ನಡ', en: 'Kannada' },
  { native: 'മലയാളം', en: 'Malayalam' },
  { native: 'বাংলা', en: 'Bengali' },
  { native: 'मराठी', en: 'Marathi' },
  { native: 'ગુજરાતી', en: 'Gujarati' },
  { native: 'English', en: 'or a mix' },
];

const SAFETY = [
  { icon: Stethoscope, title: 'Never plays doctor', body: 'Saathi doesn’t diagnose or advise. For anything health-related it points your parent to their doctor or to you.' },
  { icon: Siren, title: 'Listens for warning signs', body: 'A fall, chest pain, feeling faint: Saathi stays calm, asks them to get help, and flags it to you.' },
  { icon: HeartHandshake, title: 'Consent comes first', body: 'Calls only start once your parent has agreed. Pause or stop them any time.' },
  { icon: ClipboardCheck, title: 'You confirm every medicine', body: 'We draft the list from a prescription photo, but nothing is saved until you’ve checked it.' },
];

type Cell = true | false | string;
const COMPARE: { label: string; us: Cell; self: Cell; carer: Cell; app: Cell }[] = [
  { label: 'Asks about every medicine, every day', us: true, self: 'When you remember', carer: true, app: 'If they open it' },
  { label: 'Works on any phone, nothing to install', us: true, self: true, carer: true, app: false },
  { label: 'In their own language', us: true, self: true, carer: 'Depends', app: false },
  { label: 'A written record you can look back on', us: true, self: false, carer: false, app: 'Partly' },
  { label: 'Tells you when something seems off', us: true, self: false, carer: 'Depends', app: false },
  { label: 'Cost', us: 'Free to start', self: 'Your time, daily', carer: 'A monthly salary', app: 'Free' },
];

const FAQ = [
  { q: 'Does my parent need a smartphone or an app?', a: 'No. Saathi calls an ordinary phone number. If it rings and they can answer it, it works, including basic keypad phones and landlines.' },
  { q: 'Which languages does Saathi speak?', a: 'Hindi, English, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati and Malayalam. You pick the language when you add your parent, and you can change it later.' },
  { q: 'What does Saathi actually ask?', a: 'Each call is short. Saathi asks whether they have taken the medicines due at that time, asks one gentle question about how they are feeling, and passes on any reminder you have added.' },
  { q: 'What happens if they don’t pick up?', a: 'The call shows up as missed on your dashboard, along with the medicines that were not confirmed, so you know to check in yourself.' },
  { q: 'Is Aaptha a medical or emergency service?', a: 'No. Aaptha is a family check-in companion. It does not replace a doctor, a caregiver or emergency services. In an emergency, call 112.' },
  { q: 'Can I pause or cancel?', a: 'Yes. Pause calls for a trip or a hospital stay and they resume on the date you choose. Paid plans can be cancelled from your billing page at any time.' },
];

function CompareCell({ v }: { v: Cell }) {
  if (v === true) return <Check size={18} className={s.yes} aria-label="Yes" />;
  if (v === false) return <Minus size={18} className={s.no} aria-label="No" />;
  return <span className={s.meh}>{v}</span>;
}

export default function LandingPage() {
  const { user } = useAuth();

  const getPlanLink = (planId: PlanId) => (user ? `/checkout/confirm?plan=${planId}` : `/signup?plan=${planId}`);
  const primaryHref = user ? '/dashboard' : '/signup?plan=free';
  const primaryLabel = user ? 'Go to your dashboard' : 'Start free';

  return (
    <>
      <ScrollProgress />
      <FloatingCta href={primaryHref} label={user ? 'Open dashboard' : 'Start free'} />
      <Navbar />

      <main id="main">
        {/* HERO */}
        <VoiceHero primaryHref={primaryHref} primaryLabel={primaryLabel} trialDays={FREE_TRIAL_DAYS} />

        {/* HOW IT WORKS: live phone */}
        <section id="how" className={`section ${s.alt}`}>
          <div className="wrap">
            <Reveal className={s.head}>
              <span className={s.pill}><PhoneCall size={14} /> How it works</span>
              <WordReveal>Set it up once. <span className={s.grad}>Saathi does the rest.</span></WordReveal>
              <p>A few minutes to set up. After that, Saathi calls on time and you see how every call went.</p>
            </Reveal>
            <Reveal delay={120}>
              <SetupSteps />
            </Reveal>
            <Reveal variant="scale">
              <LiveCallPhone />
            </Reveal>
          </div>
        </section>

        {/* LANGUAGES */}
        <section className={`section ${s.alt}`}>
          <div className="wrap">
            <Reveal className={s.head}>
              <span className={s.pill}><Languages size={14} /> Their language</span>
              <WordReveal>Speaks the way <span className={s.grad}>Amma speaks.</span></WordReveal>
              <p>
                Saathi talks in the language your parent thinks in, and understands when they mix in a little English. Switch the example call above to Telugu or Hindi to see it.
              </p>
            </Reveal>
          </div>
          {/* The nine languages drift past, each in its own script */}
          <Reveal variant="fade">
            <Ticker items={LANGS.map((l) => ({ text: l.native, sub: l.en }))} label="Languages Saathi speaks" className={s.langBand} />
          </Reveal>
        </section>

        {/* SUMMARY + ALERTS */}
        <section className="section">
          <div className="wrap">
            <Reveal className={s.head}>
              <span className={s.pill}><ClipboardCheck size={14} /> After every call</span>
              <WordReveal>Know how she is <span className={s.grad}>in ten seconds.</span></WordReveal>
              <p>Every call is summed up on your dashboard and sent to your WhatsApp. When something needs you, act on it with one tap.</p>
            </Reveal>

            <div className="grid-2" style={{ alignItems: 'center' }}>
              <Reveal variant="left">
                <div className={s.summaryWrap}>
                  <div className={s.syncPill}><span><Check size={16} strokeWidth={3} /></span> On your dashboard</div>
                  <div className={s.summaryCard}>
                    <span className={s.exampleTag}>Example</span>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-subtle)' }}>
                      Morning check-in · 8:30 AM
                    </div>
                    <p style={{ fontSize: '1rem', lineHeight: 1.55, marginTop: '10px' }}>
                      Amma took her BP tablet after breakfast. She said she’s feeling okay but her knee has been hurting since yesterday.
                    </p>
                    <div className={s.kv}>
                      <div><span>Amlodipine 5mg</span><b style={{ color: 'var(--green)' }}>✓ Taken</b></div>
                      <div><span>Mood</span><b>Calm</b></div>
                      <div><span>Mentioned</span><b>Knee pain</b></div>
                      <div><span>Call length</span><b>{formatCallTime(CALL_MS)}</b></div>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* The same call as it reaches you on WhatsApp. The wording is the real
                  'aaptha_call_alert' template (lib/whatsapp.ts) and its buttons. */}
              <Reveal variant="right" delay={120}>
                <div className={s.waWrap}>
                  <div className={`${s.syncPill} ${s.waPill}`}><span><MessageCircle size={16} strokeWidth={2.5} /></span> On your WhatsApp</div>
                  <div className={s.waChat} aria-label="Example WhatsApp update">
                    <div className={s.waHead}>
                      <span className={s.waAvatar}><Heart size={15} fill="currentColor" /></span>
                      <div><b>Aaptha</b><small>Call updates</small></div>
                    </div>
                    <div className={s.waBody}>
                      <div className={s.waIn}>
                        <p>
                          Your scheduled check-in call with Amma needs your attention. Details: Amma mentioned not feeling well:
                          “knee pain since yesterday”. Please check in with them today. Call details: Answered the morning call
                          at 8:31 AM. Medicines: Amlodipine taken. Mood: calm.
                        </p>
                        <p className={s.waNote}>This alert is part of the care plan you set up on Aaptha.</p>
                        <time>8:31 AM</time>
                        <div className={s.waBtns}>
                          <span><Reply size={14} /> I’ll handle it</span>
                          <span><Reply size={14} /> Call again</span>
                          <span><ExternalLink size={14} /> Open Aaptha</span>
                        </div>
                      </div>
                      <div className={s.waOut}>
                        <p>I’ll handle it</p>
                        <time>8:33 AM <CheckCheck size={14} /></time>
                      </div>
                      <div className={s.waIn}>
                        <p>Thanks. We have marked this as handled on your Aaptha dashboard.</p>
                        <time>8:33 AM</time>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* SAFETY */}
        <section id="safety" className="section">
          <div className="wrap">
            <Reveal className={s.head}>
              <span className={s.pill}><ShieldCheck size={14} /> Built with care</span>
              <WordReveal>A companion, <span className={s.grad}>not a doctor.</span></WordReveal>
              <p>Saathi is gentle and knows its limits. It helps your parents stay connected to you, never replaces the people who care for them.</p>
            </Reveal>
            <div className={s.safetyGrid}>
              {SAFETY.map((x, i) => (
                <Reveal key={x.title} delay={i * 90}>
                  <TiltCard className={s.safetyCard}>
                    <span className="icon-tile"><x.icon size={20} /></span>
                    <h3>{x.title}</h3>
                    <p>{x.body}</p>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARE (the nav's "Why a phone call" lands here) */}
        <section id="why" className={`section ${s.alt}`}>
          <div className="wrap">
            <Reveal className={s.head}>
              <span className={s.pill}><Sparkles size={14} /> Compare</span>
              <WordReveal>Same worry. <span className={s.grad}>Much less effort.</span></WordReveal>
              <p>How a daily Saathi call compares with the usual ways families keep an eye on their parents.</p>
            </Reveal>
            <Reveal variant="scale">
              <div className={s.compare}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col"><span className="sr-only">Feature</span></th>
                      <th scope="col" className={s.us}>Aaptha</th>
                      <th scope="col">Calling yourself</th>
                      <th scope="col">A hired caretaker</th>
                      <th scope="col">Reminder app</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE.map((r) => (
                      <tr key={r.label}>
                        <th scope="row">{r.label}</th>
                        <td className={s.us}><CompareCell v={r.us} /></td>
                        <td><CompareCell v={r.self} /></td>
                        <td><CompareCell v={r.carer} /></td>
                        <td><CompareCell v={r.app} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </section>

        {/* PRICING */}
        <section id="plans" className="section">
          <div className="wrap">
            <Reveal className={s.head}>
              <span className={s.pill}><Check size={14} /> Pricing</span>
              <WordReveal>Simple plans. <span className={s.grad}>Cancel anytime.</span></WordReveal>
              <p>Try it free for {FREE_TRIAL_DAYS} days, no card needed. Then pick the plan that fits your family.</p>
            </Reveal>

            <div className={styles.plans}>
              {(['solo', 'family', 'extended'] as PlanId[]).map((id, i) => {
                const plan = PLANS[id];
                const featured = !!plan.popular;
                return (
                  <Reveal key={id} delay={i * 100} className={`${styles.plan} ${featured ? styles.featured : ''}`}>
                    {featured && <span className={styles.planBadge}>Most popular</span>}
                    <h3>{plan.name}</h3>
                    <p className={styles.planTag}>{plan.tagline}</p>
                    <div className={styles.price}>
                      ₹{plan.priceMonthly.toLocaleString('en-IN')}
                      <span>{plan.priceMonthly === 0 ? 'for 7 days' : '/ month'}</span>
                    </div>
                    <p className={styles.priceNote}>{plan.hasTrial ? `${plan.trialDays}-day free trial` : ''}</p>
                    <ul className={styles.planFeatures}>
                      {plan.features.map((f) => (
                        <li key={f}><Check size={15} /> <span>{f}</span></li>
                      ))}
                    </ul>
                    <Link href={getPlanLink(id)} className={`btn btn-block ${featured ? 'btn-primary' : 'btn-ghost'}`}>
                      {plan.hasTrial ? 'Start free trial' : 'Start free'}
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={`section ${s.alt}`}>
          <div className="wrap">
            <Reveal className={s.head}>
              <span className={s.pill}><Plus size={14} /> Questions</span>
              <WordReveal>What families <span className={s.grad}>usually ask.</span></WordReveal>
            </Reveal>
            <Reveal className={styles.faq}>
              {FAQ.map((item) => (
                <details key={item.q}>
                  <summary>
                    {item.q}
                    <Plus size={20} />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
