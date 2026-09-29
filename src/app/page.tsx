'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { CallDemo } from '@/components/landing/CallDemo';
import { DashboardPreview } from '@/components/landing/DashboardPreview';
import styles from '@/components/landing/landing.module.css';
import { PLANS } from '@/lib/plans';
import { PlanId } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRight, Check, X, Phone, Languages, ShieldCheck, Camera, CalendarClock, LineChart,
  PauseCircle, Download, Stethoscope, Siren, HeartHandshake, ClipboardCheck, Plus
} from 'lucide-react';

const COMPARE = [
  { app: 'Needs a smartphone, unlocked and online', call: 'Any phone that rings, even a basic keypad phone' },
  { app: 'Small English notifications', call: 'A warm voice, in the language they think in' },
  { app: 'Swiped away and forgotten', call: 'A short conversation they answer in their own words' },
  { app: 'You never know if it worked', call: 'You see what they said, on your dashboard' },
];

const SAFETY = [
  {
    icon: Stethoscope,
    title: 'Never plays doctor',
    body: 'Saathi does not diagnose or give medical advice. For anything health-related it points your parent to their doctor or to you.',
  },
  {
    icon: Siren,
    title: 'Listens for warning signs',
    body: 'If your parent mentions a fall, chest pain or feeling faint, Saathi stays calm, asks them to get help, and flags it to you.',
  },
  {
    icon: HeartHandshake,
    title: 'Consent comes first',
    body: 'Calls only start once your parent has agreed to them. You can pause or stop the calls at any time.',
  },
  {
    icon: ClipboardCheck,
    title: 'You confirm every medicine',
    body: 'Snap a prescription and we draft the list for you, but nothing is saved until you have checked and confirmed it.',
  },
];

const FAQ = [
  {
    q: 'Does my parent need a smartphone or an app?',
    a: 'No. Saathi calls an ordinary phone number. If it rings and they can answer it, it works, including basic keypad phones and landlines.',
  },
  {
    q: 'Which languages does Saathi speak?',
    a: 'Hindi, English, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati and Malayalam. You pick the language when you add your parent, and you can change it later.',
  },
  {
    q: 'What does Saathi actually ask?',
    a: 'Each call is short. Saathi asks whether they have taken the medicines due at that time, asks one gentle question about how they are feeling, and passes on any reminder you have added.',
  },
  {
    q: 'What happens if they don’t pick up?',
    a: 'The call shows up as missed on your dashboard, along with the medicines that were not confirmed, so you know to check in yourself.',
  },
  {
    q: 'Is CareCircle a medical or emergency service?',
    a: 'No. CareCircle is a family check-in companion. It does not replace a doctor, a caregiver or emergency services. In an emergency, call 112.',
  },
  {
    q: 'Can I pause or cancel?',
    a: 'Yes. Pause calls for a trip or a hospital stay and they resume on the date you choose. Paid plans can be cancelled from your billing page at any time.',
  },
];

export default function LandingPage() {
  const { user } = useAuth();

  const getPlanLink = (planId: PlanId) => (user ? `/checkout/confirm?plan=${planId}` : `/signup?plan=${planId}`);
  const primaryHref = user ? '/dashboard' : '/signup?plan=free';

  return (
    <>
      <Navbar />

      <main id="main">
        {/* HERO */}
        <section className={styles.hero}>
          <div className={`wrap ${styles.heroGrid}`}>
            <div className="animate-fade-in">
              <span className="chip" style={{ marginBottom: '24px' }}>
                <span className="dot live" />
                Meet Saathi, a voice companion for your parents
              </span>

              <h1 className={`h-display ${styles.heroTitle}`}>
                A daily call for your parents. <em>Peace of mind</em> for you.
              </h1>

              <p className={styles.heroLead}>
                Saathi phones your parents at the times you choose, in their own language. It checks on their medicines and how they are feeling, and every call lands on your dashboard.
              </p>

              <div className={styles.heroCtas}>
                <Link href={primaryHref} className="btn btn-primary btn-lg">
                  {user ? 'Go to your dashboard' : 'Start free'} <ArrowRight size={18} className="arrow" />
                </Link>
                <Link href="#how" className="btn btn-ghost btn-lg">
                  See how it works
                </Link>
              </div>

              <div className={styles.proofRow}>
                <span><Phone size={16} /> No app or smartphone needed</span>
                <span><Languages size={16} /> 9 Indian languages</span>
                <span><ShieldCheck size={16} /> Never gives medical advice</span>
              </div>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '120ms' }}>
              <CallDemo />
            </div>
          </div>
        </section>

        {/* WHY A PHONE CALL */}
        <section id="why" className="section section-alt">
          <div className="wrap grid-2">
            <Reveal>
              <span className="eyebrow">Why a phone call</span>
              <h2 className="h-section">Your parents already know how to answer a phone.</h2>
              <p className="lead" style={{ marginBottom: '16px' }}>
                Reminder apps ask a lot of someone who is 75: unlock the phone, find the notification, read small English text, tap the right button.
              </p>
              <p className="lead">
                A phone call asks for nothing new. It rings, they answer, and they talk to someone patient in the language they are most comfortable in.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className={styles.compare}>
                <div className={styles.compareHead}>
                  <div>Reminder apps</div>
                  <div>A Saathi call</div>
                </div>
                {COMPARE.map((row) => (
                  <div key={row.call} className={styles.compareRow}>
                    <div><X size={15} color="var(--ink-subtle)" /> {row.app}</div>
                    <div><Check size={15} color="var(--teal)" /> {row.call}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="section">
          <div className="wrap">
            <Reveal className="section-head">
              <span className="eyebrow">How it works</span>
              <h2 className="h-section">Set it up once. Saathi takes it from there.</h2>
              <p className="lead">You add your parent and their medicines. Saathi calls on schedule, and you see how each call went.</p>
            </Reveal>

            <div className={styles.steps}>
              <Reveal className={styles.step}>
                <span className={styles.stepNum}><b>1</b> You set it up</span>
                <h3>Add their routine</h3>
                <p>Add your parent’s number, language and medicines. Snap a photo of the prescription and check the draft we read from it.</p>
                <div className={styles.stepVisual}>
                  <div className={styles.miniRow}>
                    <div><strong>Amlodipine 5mg</strong><span>Morning · after breakfast</span></div>
                    <Check size={16} color="var(--green)" />
                  </div>
                  <div className={styles.miniRow}>
                    <div><strong>Metformin 500mg</strong><span>Night · after dinner</span></div>
                    <Check size={16} color="var(--green)" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--ink-subtle)', marginTop: '4px' }}>
                    <Camera size={14} /> Read from a prescription photo, confirmed by you
                  </div>
                </div>
              </Reveal>

              <Reveal className={styles.step} delay={100}>
                <span className={styles.stepNum}><b>2</b> Saathi calls</span>
                <h3>A short, kind call</h3>
                <p>At each medicine time Saathi rings their phone, asks if they have taken it and how they are feeling, then says goodbye.</p>
                <div className={styles.stepVisual}>
                  <div className={styles.ringing}>
                    <div className={styles.ringIcon}><Phone size={22} /></div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Saathi is calling Amma</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ink-subtle)' }}>8:30 AM · in Telugu</div>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal className={styles.step} delay={200}>
                <span className={styles.stepNum}><b>3</b> You stay in the loop</span>
                <h3>See how they are</h3>
                <p>Every call lands on your dashboard: medicines taken, mood and a short summary. If something needs you, it is flagged.</p>
                <div className={styles.stepVisual}>
                  <div className={styles.miniRow}>
                    <div><strong>Morning check-in</strong><span>Feeling well</span></div>
                    <span className="badge badge-green">Taken</span>
                  </div>
                  <div className={styles.miniRow}>
                    <div><strong>Bedtime check-in</strong><span>Didn’t pick up</span></div>
                    <span className="badge badge-amber">Missed</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* DASHBOARD */}
        <section className="section section-alt">
          <div className="wrap grid-2">
            <Reveal>
              <span className="eyebrow">Your dashboard</span>
              <h2 className="h-section">Know how Amma’s day went, in ten seconds.</h2>
              <p className="lead">One calm page for each parent. No noise, just what you need to know and when to call them yourself.</p>

              <div className={styles.featureList}>
                <div className={styles.feature}>
                  <span className="icon-tile"><CalendarClock size={20} /></span>
                  <div>
                    <h3>Today at a glance</h3>
                    <p>Which check-ins happened, which medicines were confirmed and what is still to come.</p>
                  </div>
                </div>
                <div className={styles.feature}>
                  <span className="icon-tile"><LineChart size={20} /></span>
                  <div>
                    <h3>Trends over time</h3>
                    <p>Spot a slipping routine or a run of low moods before it becomes a bigger worry.</p>
                  </div>
                </div>
                <div className={styles.feature}>
                  <span className="icon-tile"><PauseCircle size={20} /></span>
                  <div>
                    <h3>Pause when life happens</h3>
                    <p>Travelling, visiting you or in hospital? Pause calls and pick the date they resume.</p>
                  </div>
                </div>
                <div className={styles.feature}>
                  <span className="icon-tile"><Download size={20} /></span>
                  <div>
                    <h3>Share with their doctor</h3>
                    <p>Export the call history as a spreadsheet to bring along to appointments.</p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <DashboardPreview />
            </Reveal>
          </div>
        </section>

        {/* SAFETY */}
        <section id="safety" className={`section ${styles.safety}`}>
          <div className="wrap grid-2" style={{ alignItems: 'start' }}>
            <Reveal>
              <span className="eyebrow" style={{ color: '#e9b877' }}>Built with care</span>
              <h2 className="h-section">A companion, <em>not a doctor.</em></h2>
              <p style={{ fontSize: '1.08rem', lineHeight: 1.65, maxWidth: '44ch' }}>
                Saathi is designed to be gentle and to know its limits. It never tries to replace the people and professionals in your parent’s life. It helps them stay connected to you.
              </p>
            </Reveal>

            <div className={styles.safetyGrid}>
              {SAFETY.map((s, i) => (
                <Reveal key={s.title} delay={i * 80} className={styles.safetyItem}>
                  <span className={styles.safetyIcon}><s.icon size={20} /></span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="plans" className="section">
          <div className="wrap">
            <Reveal className="section-head">
              <span className="eyebrow">Pricing</span>
              <h2 className="h-section">Simple plans, cancel anytime</h2>
              <p className="lead">Start free with one parent. Paid plans come with a 14-day free trial.</p>
            </Reveal>

            <div className={styles.plans}>
              {(['free', 'family', 'extended'] as PlanId[]).map((id, i) => {
                const plan = PLANS[id];
                const featured = !!plan.popular;
                return (
                  <Reveal key={id} delay={i * 100} className={`${styles.plan} ${featured ? styles.featured : ''}`}>
                    {featured && <span className={styles.planBadge}>Most popular</span>}
                    <h3>{plan.name}</h3>
                    <p className={styles.planTag}>{plan.tagline}</p>
                    <div className={styles.price}>
                      ₹{plan.priceMonthly}
                      <span>{plan.priceMonthly === 0 ? 'forever' : '/ month'}</span>
                    </div>
                    <p className={styles.priceNote}>
                      {plan.hasTrial ? `${plan.trialDays}-day free trial` : ''}
                    </p>
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
        <section id="faq" className="section section-alt">
          <div className="wrap">
            <Reveal className="section-head">
              <span className="eyebrow">Questions</span>
              <h2 className="h-section">What families usually ask</h2>
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

        {/* FINAL CTA */}
        <section className="section">
          <div className="wrap">
            <Reveal className={styles.finalCta}>
              <h2 className="h-section" style={{ maxWidth: '18ch', margin: '0 auto 16px' }}>
                Tomorrow morning, someone will ask how she’s doing.
              </h2>
              <p className="lead" style={{ maxWidth: '48ch', margin: '0 auto 32px' }}>
                Setting up takes a few minutes. Start with the free plan and upgrade when you are ready.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href={primaryHref} className="btn btn-primary btn-lg">
                  {user ? 'Go to your dashboard' : 'Start free'} <ArrowRight size={18} className="arrow" />
                </Link>
                <Link href="#plans" className="btn btn-ghost btn-lg">Compare plans</Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
