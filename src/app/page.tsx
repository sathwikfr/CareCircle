'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { VoiceHero } from '@/components/landing/VoiceHero';
import { LiveCallPhone } from '@/components/landing/LiveCallPhone';
import { SetupSteps } from '@/components/landing/SetupSteps';
import { AfterCallSection } from '@/components/landing/AfterCallSection';
import { SafetySection } from '@/components/landing/SafetySection';
import { CompareSection } from '@/components/landing/CompareSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { ScrollProgress } from '@/components/motion/ScrollProgress';
import { Ticker } from '@/components/motion/Ticker';
import { WordReveal } from '@/components/motion/WordReveal';
import s from '@/components/landing/home.module.css';
import { FREE_TRIAL_DAYS } from '@/lib/plans';
import { PlanId } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { PhoneCall, Languages } from 'lucide-react';

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

        {/* AFTER EVERY CALL: the dashboard and WhatsApp, side by side */}
        <AfterCallSection />

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
