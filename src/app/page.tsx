'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PLANS } from '@/lib/plans';
import { Check, Shield, Clock, Phone, Sparkles, AlertCircle, ArrowRight, Play, Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioStep, setAudioStep] = useState(0);

  const simulateCall = () => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    setAudioStep(1);

    setTimeout(() => setAudioStep(2), 1400);
    setTimeout(() => setAudioStep(3), 3200);
    setTimeout(() => setAudioStep(4), 5000);
    setTimeout(() => setAudioStep(5), 6800);
    setTimeout(() => {
      setIsPlayingAudio(false);
      setAudioStep(5);
    }, 8500);
  };

  const getPlanLink = (planId: string) => {
    return user ? `/checkout/confirm?plan=${planId}` : `/signup?plan=${planId}`;
  };

  return (
    <>
      <Navbar />

      <main>
        {/* HERO SECTION */}
        <section style={{ padding: '80px 0 96px', position: 'relative', overflow: 'hidden' }}>
          <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '60px', alignItems: 'center' }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  borderRadius: '9999px',
                  background: 'var(--panel-elevated)',
                  border: '1px solid var(--line)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--teal)',
                  marginBottom: '22px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--teal)' }}></span>
                AI Voice Companion for Indian Families
              </div>

              <h1 style={{ fontSize: 'clamp(2.4rem, 4.4vw, 3.6rem)', lineHeight: 1.15, marginBottom: '20px' }}>
                A daily call for your parents. <br />
                <span style={{ color: 'var(--teal)' }}>Peace of mind</span> for you.
              </h1>

              <p style={{ fontSize: '1.14rem', color: 'var(--ink-muted)', lineHeight: 1.6, maxWidth: '46ch', marginBottom: '32px' }}>
                CareCircle checks in on aging parents every single day by phone — medicine, health, and how they&apos;re truly doing — and alerts family instantly only when something needs attention.
              </p>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Link href="#plans" className="btn btn-primary btn-lg">
                  See plans & pricing <ArrowRight size={18} />
                </Link>
                <Link href="#how" className="btn btn-ghost btn-lg">
                  How it works
                </Link>
              </div>

              <div style={{ marginTop: '36px', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                <div style={{ display: 'flex' }}>
                  {['RK', 'SP', 'AN'].map((initials, idx) => (
                    <span
                      key={idx}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: idx === 0 ? 'var(--gold)' : idx === 1 ? 'var(--teal)' : '#3b82f6',
                        color: '#fff',
                        border: '2px solid var(--paper)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: idx === 0 ? '0' : '-8px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      {initials}
                    </span>
                  ))}
                </div>
                <div>
                  <strong>Trusted by 1,200+ Indian families</strong> living in Bengaluru, Delhi, Mumbai & abroad.
                </div>
              </div>
            </div>

            {/* CALL CARD SIMULATION */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                className="card"
                style={{
                  width: '100%',
                  maxWidth: '430px',
                  padding: '28px',
                  borderRadius: '24px',
                  position: 'relative',
                  border: '1px solid var(--line)',
                  boxShadow: 'var(--card-hover-shadow)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid var(--line-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--gold), #eab308)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '1.05rem',
                        position: 'relative'
                      }}
                    >
                      A
                      <span
                        className="pulse-circle"
                        style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: '#10b981',
                          border: '2px solid #fff'
                        }}
                      />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', margin: 0 }}>Amma (Bangalore)</h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', margin: 0 }}>Daily Morning Call · Hindi / English</p>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--teal)', background: 'var(--teal-light)', padding: '4px 10px', borderRadius: '9999px' }}>
                    {isPlayingAudio ? '● Active Call' : '● 02:14'}
                  </div>
                </div>

                {/* CONVERSATION BUBBLES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '220px', justifyContent: 'center' }}>
                  {audioStep === 0 && (
                    <>
                      <div style={{ background: 'var(--teal-light)', padding: '12px 14px', borderRadius: '14px 14px 14px 4px', fontSize: '0.88rem', color: 'var(--teal-deep)' }}>
                        <strong style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '2px', color: 'var(--teal)' }}>Saathi AI</strong>
                        Namaste Amma! Good morning. Did you take your BP tablet after breakfast today?
                      </div>
                      <div style={{ background: 'var(--panel)', padding: '12px 14px', borderRadius: '14px 14px 4px 14px', fontSize: '0.88rem', alignSelf: 'flex-end', textAlign: 'right' }}>
                        <strong style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '2px', color: 'var(--ink-muted)' }}>Amma</strong>
                        Namaste beta. Haan, I took it just 10 minutes ago with warm water.
                      </div>
                      <div style={{ background: 'var(--teal-light)', padding: '12px 14px', borderRadius: '14px 14px 14px 4px', fontSize: '0.88rem', color: 'var(--teal-deep)' }}>
                        <strong style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '2px', color: 'var(--teal)' }}>Saathi AI</strong>
                        Wonderful. And how are your knees feeling? Any pain or dizziness?
                      </div>
                    </>
                  )}

                  {audioStep === 1 && (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--teal)' }}>
                      <Phone size={24} style={{ animation: 'bounce 1s infinite', margin: '0 auto 10px' }} />
                      <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Connecting live phone call to Amma...</p>
                    </div>
                  )}

                  {audioStep >= 2 && (
                    <div className="animate-fade-in" style={{ background: 'var(--teal-light)', padding: '12px 14px', borderRadius: '14px 14px 14px 4px', fontSize: '0.88rem', color: 'var(--teal-deep)' }}>
                      <strong style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '2px', color: 'var(--teal)' }}>Saathi AI</strong>
                      Namaste Amma! Good morning. Did you take your BP tablet after breakfast today?
                    </div>
                  )}

                  {audioStep >= 3 && (
                    <div className="animate-fade-in" style={{ background: 'var(--panel)', padding: '12px 14px', borderRadius: '14px 14px 4px 14px', fontSize: '0.88rem', alignSelf: 'flex-end', textAlign: 'right' }}>
                      <strong style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '2px', color: 'var(--ink-muted)' }}>Amma</strong>
                      Namaste beta. Haan, I took it just 10 minutes ago with warm water.
                    </div>
                  )}

                  {audioStep >= 4 && (
                    <div className="animate-fade-in" style={{ background: 'var(--teal-light)', padding: '12px 14px', borderRadius: '14px 14px 14px 4px', fontSize: '0.88rem', color: 'var(--teal-deep)' }}>
                      <strong style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '2px', color: 'var(--teal)' }}>Saathi AI</strong>
                      Wonderful! Did you go for your balcony morning walk as well?
                    </div>
                  )}

                  {audioStep >= 5 && (
                    <div className="animate-fade-in" style={{ background: 'var(--panel)', padding: '12px 14px', borderRadius: '14px 14px 4px 14px', fontSize: '0.88rem', alignSelf: 'flex-end', textAlign: 'right' }}>
                      <strong style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '2px', color: 'var(--ink-muted)' }}>Amma</strong>
                      Yes, 15 minutes! Tell Sathwik not to worry, I am feeling cheerful.
                    </div>
                  )}
                </div>

                <div
                  style={{
                    margin: '18px 0 16px',
                    background: 'var(--green-soft)',
                    border: '1px solid #bbf7d0',
                    color: 'var(--green)',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Check size={16} />
                  <span>BP Tablet Confirmed · Mood: Cheerful & Active</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--line-subtle)', fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                  <span>Scheduled: Daily at 9:00 AM</span>
                  <button
                    onClick={simulateCall}
                    disabled={isPlayingAudio}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    <Play size={12} fill="currentColor" /> {isPlayingAudio ? 'Simulating...' : 'Replay call'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHY PHONE CALLS SECTION */}
        <section id="problem" style={{ padding: '80px 0', background: 'var(--panel)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          <div className="wrap">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 'clamp(2rem, 3.2vw, 2.7rem)', marginBottom: '18px' }}>
                  You can&apos;t call three times a day. We can.
                </h2>
                <p style={{ fontSize: '1.05rem', color: 'var(--ink-muted)', marginBottom: '18px', lineHeight: 1.6 }}>
                  Reminder apps require elderly parents to unlock smartphones, open notifications, and tap tiny buttons. Most seniors find them stressful or ignore them completely.
                </p>
                <p style={{ fontSize: '1.05rem', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
                  CareCircle uses an ordinary telephone call — something every parent has known how to pick up and answer with a simple swipe or button for fifty years.
                </p>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div className="card" style={{ display: 'flex', gap: '20px', padding: '24px', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', fontWeight: 600, color: 'var(--teal)', minWidth: '90px' }}>
                    72%
                  </div>
                  <div style={{ fontSize: '0.92rem', color: 'var(--ink-muted)' }}>
                    of adult children working in metros or overseas experience persistent anxiety about parents living alone back home.
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', gap: '20px', padding: '24px', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', fontWeight: 600, color: 'var(--gold)', minWidth: '90px' }}>
                    1 in 3
                  </div>
                  <div style={{ fontSize: '0.92rem', color: 'var(--ink-muted)' }}>
                    seniors accidentally skip or double-dose vital chronic medications (BP, diabetes) at least once every week without realizing.
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', gap: '20px', padding: '24px', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', fontWeight: 600, color: 'var(--red)', minWidth: '90px' }}>
                    4 Calls
                  </div>
                  <div style={{ fontSize: '0.92rem', color: 'var(--ink-muted)' }}>
                    is the average number of unanswered calls before distant family members realize something urgent happened.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" style={{ padding: '96px 0' }}>
          <div className="wrap">
            <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 56px' }}>
              <div className="badge badge-teal" style={{ marginBottom: '12px' }}>Simple 3-Minute Setup</div>
              <h2 style={{ fontSize: 'clamp(2rem, 3.2vw, 2.6rem)', marginBottom: '14px' }}>
                How CareCircle Works
              </h2>
              <p style={{ color: 'var(--ink-muted)', fontSize: '1.05rem' }}>
                You set up their medication schedule once. The daily voice check-ins and WhatsApp summaries happen seamlessly.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
              <div className="card" style={{ padding: '34px 28px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--teal-light)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 600, marginBottom: '20px' }}>
                  1
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Set up their routine</h3>
                <p style={{ fontSize: '0.94rem', color: 'var(--ink-muted)', lineHeight: 1.55 }}>
                  Add your parent&apos;s morning/night medicine schedule, preferred call timings, and native language (Hindi, Tamil, Telugu, English).
                </p>
              </div>

              <div className="card" style={{ padding: '34px 28px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--teal-light)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 600, marginBottom: '20px' }}>
                  2
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Saathi AI calls their phone</h3>
                <p style={{ fontSize: '0.94rem', color: 'var(--ink-muted)', lineHeight: 1.55 }}>
                  Saathi AI calls directly with a warm, caring voice in their native language. No smartphone or internet required on their end.
                </p>
              </div>

              <div className="card" style={{ padding: '34px 28px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--teal-light)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 600, marginBottom: '20px' }}>
                  3
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>You stay informed quietly</h3>
                <p style={{ fontSize: '0.94rem', color: 'var(--ink-muted)', lineHeight: 1.55 }}>
                  Receive a gentle WhatsApp summary after each call. If medication was missed or your parent felt unwell, you get alerted immediately.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="plans" style={{ padding: '96px 0', background: 'var(--panel)', borderTop: '1px solid var(--line)' }}>
          <div className="wrap">
            <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 56px' }}>
              <div className="badge badge-gold" style={{ marginBottom: '12px' }}>Simple, Honest Pricing</div>
              <h2 style={{ fontSize: 'clamp(2rem, 3.2vw, 2.7rem)', marginBottom: '14px' }}>
                Choose the right care for your family
              </h2>
              <p style={{ color: 'var(--ink-muted)', fontSize: '1.05rem' }}>
                Start with a 14-day free trial on paid plans or test the Free Starter tier. Cancel anytime with a single click.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', alignItems: 'stretch' }}>
              {/* PLAN 1: FREE */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.35rem', marginBottom: '6px' }}>{PLANS.free.name}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', minHeight: '40px' }}>{PLANS.free.tagline}</p>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.8rem', fontWeight: 600, margin: '16px 0 20px', color: 'var(--ink)' }}>
                  ₹0
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'grid', gap: '12px', fontSize: '0.92rem', flex: 1 }}>
                  {PLANS.free.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'var(--ink-muted)' }}>
                      <Check size={16} color="var(--teal)" style={{ marginTop: '3px', flexShrink: 0 }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={getPlanLink('free')} className="btn btn-ghost btn-block">
                  Get started free
                </Link>
              </div>

              {/* PLAN 2: FAMILY CARE (POPULAR) */}
              <div
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  border: '2px solid var(--teal)',
                  boxShadow: '0 0 0 1px var(--teal), var(--card-hover-shadow)',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    right: '24px',
                    background: 'var(--teal)',
                    color: '#fff',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '4px 14px',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em'
                  }}
                >
                  Most Popular
                </div>

                <h3 style={{ fontSize: '1.35rem', marginBottom: '6px' }}>{PLANS.family.name}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', minHeight: '40px' }}>{PLANS.family.tagline}</p>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.8rem', fontWeight: 600, margin: '16px 0 4px', color: 'var(--ink)' }}>
                  ₹399<span style={{ fontSize: '0.94rem', fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--ink-muted)' }}> / month</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--teal)', fontWeight: 600, marginBottom: '16px' }}>
                  ✨ 14-day free trial, then ₹399/mo · Cancel anytime
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'grid', gap: '12px', fontSize: '0.92rem', flex: 1 }}>
                  {PLANS.family.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'var(--ink-muted)' }}>
                      <Check size={16} color="var(--teal)" style={{ marginTop: '3px', flexShrink: 0 }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={getPlanLink('family')} className="btn btn-primary btn-block">
                  Start 14-day free trial
                </Link>
              </div>

              {/* PLAN 3: EXTENDED FAMILY */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.35rem', marginBottom: '6px' }}>{PLANS.extended.name}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', minHeight: '40px' }}>{PLANS.extended.tagline}</p>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.8rem', fontWeight: 600, margin: '16px 0 4px', color: 'var(--ink)' }}>
                  ₹699<span style={{ fontSize: '0.94rem', fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--ink-muted)' }}> / month</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--teal)', fontWeight: 600, marginBottom: '16px' }}>
                  ✨ 14-day free trial, then ₹699/mo · Cancel anytime
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'grid', gap: '12px', fontSize: '0.92rem', flex: 1 }}>
                  {PLANS.extended.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'var(--ink-muted)' }}>
                      <Check size={16} color="var(--teal)" style={{ marginTop: '3px', flexShrink: 0 }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={getPlanLink('extended')} className="btn btn-ghost btn-block">
                  Start 14-day free trial
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
