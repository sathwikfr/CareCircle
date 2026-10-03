'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { VoiceHero } from '@/components/landing/VoiceHero';
import { LiveCallPhone } from '@/components/landing/LiveCallPhone';
import { SetupSteps } from '@/components/landing/SetupSteps';
import { SafetySection } from '@/components/landing/SafetySection';
import { CompareSection } from '@/components/landing/CompareSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { CALL_MS, formatCallTime } from '@/components/landing/callScript';
import { ScrollProgress } from '@/components/motion/ScrollProgress';
import { FloatingCta } from '@/components/motion/FloatingCta';
import { Ticker } from '@/components/motion/Ticker';
import { WordReveal } from '@/components/motion/WordReveal';
import s from '@/components/landing/home.module.css';
import { FREE_TRIAL_DAYS } from '@/lib/plans';
import { PlanId } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import {
  Check, PhoneCall, Languages,
  ClipboardCheck, Heart, Reply, ExternalLink, CheckCheck, MessageCircle
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

        {/* SAFETY: four promises, each shown in action */}
        <SafetySection />

        {/* COMPARE (the nav's "Why a phone call" lands here) */}
        <CompareSection />

        {/* PRICING */}
        <PricingSection planHref={getPlanLink} />

        {/* FAQ */}
        <FaqSection />

      </main>

      <Footer />
    </>
  );
}
