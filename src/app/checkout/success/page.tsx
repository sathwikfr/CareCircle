'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CheckoutStepper } from '@/components/CheckoutStepper';
import { getPlan } from '@/lib/plans';
import { PlanId } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  ArrowRight,
  UserPlus,
  ShieldCheck,
  CreditCard,
  X
} from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const planParam = (searchParams.get('plan') as PlanId) || 'family';
  const subId = searchParams.get('sub_id') || 'sub_cc_' + Math.random().toString(36).substring(2, 8);
  const payId = searchParams.get('pay_id') || 'pay_cc_' + Math.random().toString(36).substring(2, 8);

  const plan = getPlan(planParam);
  const { user, refreshUser } = useAuth();

  // State for interactive Parent Onboarding Modal
  const [showParentModal, setShowParentModal] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [callTime, setCallTime] = useState('09:00 AM');
  const [language, setLanguage] = useState('Hindi');
  const [parentAdded, setParentAdded] = useState(false);

  useEffect(() => {
    // Trigger festive celebratory confetti
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // safe fallback if canvas is unavailable
    }
    refreshUser();
  }, []);

  const handleAddParentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParentAdded(true);
  };

  return (
    <div className="wrap-checkout" style={{ padding: '36px 20px 80px' }}>
      <CheckoutStepper currentStep={4} />

      <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
        {/* CELEBRATION BADGE & TITLE */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--green-soft)',
            color: 'var(--green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            border: '2px solid #bbf7d0'
          }}
        >
          <CheckCircle2 size={36} />
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 3.4vw, 2.6rem)', marginBottom: '12px' }}>
          {plan.hasTrial ? 'Your 14-day free trial is active!' : 'Welcome to CareCircle!'}
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--ink-muted)', marginBottom: '32px' }}>
          You’re all set with the <strong>{plan.name}</strong>. Now let’s take the final 2 minutes to introduce your first parent so daily calls can start.
        </p>

        {/* SUBSCRIPTION DETAILS CARD */}
        <div className="card" style={{ textAlign: 'left', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--line-subtle)' }}>
            <div>
              <span className="badge badge-teal" style={{ marginBottom: '6px' }}>
                {plan.hasTrial ? 'Trialing Active' : 'Free Active'}
              </span>
              <h3 style={{ fontSize: '1.25rem' }}>{plan.name}</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong style={{ fontSize: '1.2rem', color: 'var(--teal)' }}>
                {plan.currency}{plan.priceMonthly}/mo
              </strong>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                {plan.hasTrial ? 'Next billing in 14 days' : 'No monthly fee'}
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 0', display: 'grid', gap: '10px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-muted)' }}>Subscription ID:</span>
              <code style={{ background: 'var(--panel)', padding: '2px 8px', borderRadius: '4px' }}>{subId}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-muted)' }}>Payment Reference:</span>
              <code style={{ background: 'var(--panel)', padding: '2px 8px', borderRadius: '4px' }}>{payId}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-muted)' }}>First charge:</span>
              <strong>
                {plan.hasTrial
                  ? `₹${plan.priceMonthly} on ${new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : '₹0 (Free Starter Plan)'}
              </strong>
            </div>
          </div>

          {/* SIMULATED RECEIPT NOTICE */}
          <div
            style={{
              background: 'var(--panel)',
              borderRadius: '12px',
              padding: '14px 16px',
              fontSize: '0.84rem',
              color: 'var(--ink-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Mail size={18} color="var(--teal)" style={{ flexShrink: 0 }} />
            <span>
              A confirmation receipt and subscription summary have been dispatched to <strong>{user?.email || 'your registered email'}</strong> and WhatsApp/SMS.
            </span>
          </div>
        </div>

        {/* PRIMARY CTA & ONBOARDING PROMPT */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, var(--panel-elevated), var(--teal-light))',
            borderColor: 'var(--teal)',
            textAlign: 'center',
            padding: '36px 24px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--teal)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <UserPlus size={24} />
          </div>

          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
            Next step: Add your first parent profile
          </h3>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-muted)', maxWidth: '44ch', margin: '0 auto 24px' }}>
            Tell us who to call (Amma, Appa, etc.), their phone number, and what time of morning suits them best.
          </p>

          <Link
            href="/onboarding"
            className="btn btn-primary btn-lg"
            style={{ margin: '0 auto', display: 'inline-flex' }}
          >
            Launch Guided Setup Wizard <ArrowRight size={18} />
          </Link>
        </div>

        <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.88rem' }}>
          <Link href="/account/billing" style={{ color: 'var(--teal)', fontWeight: 600 }}>
            View Account & Billing Portal →
          </Link>
          <Link href="/" style={{ color: 'var(--ink-muted)' }}>
            Return to Homepage
          </Link>
        </div>
      </div>

      {/* PARENT PROFILE ONBOARDING MODAL */}
      {showParentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px'
          }}
        >
          <div className="card" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
            <button
              onClick={() => setShowParentModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-muted)'
              }}
            >
              <X size={20} />
            </button>

            {parentAdded ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--green-soft)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{parentName || 'Parent Profile'} Added!</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', marginBottom: '24px' }}>
                  CareCircle will place the first welcome check-in call tomorrow at {callTime} in {language}.
                </p>
                <Link href="/account/billing" className="btn btn-primary btn-block">
                  Go to Subscription & Family Dashboard
                </Link>
              </div>
            ) : (
              <form onSubmit={handleAddParentSubmit}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Add Parent Profile</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: '22px' }}>
                  Configure your parent&apos;s routine so CareCircle calls with kindness and familiarity.
                </p>

                <div className="form-group">
                  <label className="form-label">How should we address them?</label>
                  <input
                    type="text"
                    placeholder="e.g. Amma, Appa, Dadi, Mrs. Rao"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Parent&apos;s Phone Number</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ padding: '13px 14px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px', fontSize: '0.94rem', fontWeight: 600 }}>
                      +91
                    </span>
                    <input
                      type="tel"
                      placeholder="98450 12345"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Preferred Call Time</label>
                    <select
                      value={callTime}
                      onChange={(e) => setCallTime(e.target.value)}
                      className="form-input"
                    >
                      <option value="08:30 AM">08:30 AM (Breakfast)</option>
                      <option value="09:00 AM">09:00 AM (Morning)</option>
                      <option value="11:30 AM">11:30 AM (Mid-day)</option>
                      <option value="08:00 PM">08:00 PM (Dinner / Night)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Preferred Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="form-input"
                    >
                      <option value="Hindi">Hindi</option>
                      <option value="English">English</option>
                      <option value="Tamil">Tamil</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Kannada">Kannada</option>
                      <option value="Bengali">Bengali</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '14px' }}>
                  Save & Schedule First Call
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px' }}>Loading success details...</div>}>
          <SuccessContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
