'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CheckoutStepper } from '@/components/CheckoutStepper';
import { PLANS, getPlan } from '@/lib/plans';
import { PlanId } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Check, Shield, AlertCircle, ArrowRight, HeartHandshake, FileText, Calendar, Sparkles } from 'lucide-react';

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get('plan') as PlanId) || 'family';

  const { user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(initialPlan);
  const [parentConsentChecked, setParentConsentChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const plan = getPlan(selectedPlanId);

  // Calculate trial and first billing dates
  const today = new Date();
  const trialEndDate = new Date(today.getTime() + 14 * 86400000);
  const formattedTrialEnd = trialEndDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleProceed = async () => {
    setErrorNotice('');

    if (!parentConsentChecked) {
      setErrorNotice('Please confirm that you have your parent’s consent and awareness.');
      return;
    }

    if (!termsChecked) {
      setErrorNotice('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    if (plan.id === 'free') {
      // Free plan skips payment step completely
      setLoading(true);
      try {
        if (user) {
          await fetch('/api/account/billing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'switch-plan', newPlanId: 'free' })
          });
        }
        router.push('/checkout/success?plan=free');
      } catch {
        router.push('/checkout/success?plan=free');
      } finally {
        setLoading(false);
      }
    } else {
      router.push(`/checkout/payment?plan=${plan.id}`);
    }
  };

  return (
    <div className="wrap-checkout" style={{ padding: '36px 20px 80px' }}>
      <CheckoutStepper currentStep={2} />

      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 36px' }}>
        <h1 style={{ fontSize: 'clamp(1.9rem, 3.2vw, 2.4rem)', marginBottom: '10px' }}>
          Confirm your subscription
        </h1>
        <p style={{ fontSize: '0.96rem', color: 'var(--ink-muted)' }}>
          Review your selected plan and setup details before finalizing. No surprise charges.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' }}>
        {/* LEFT COLUMN: PLAN SWITCHER & SUMMARY */}
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <span className="badge badge-teal" style={{ marginBottom: '8px' }}>
                  {plan.id === 'free' ? 'Free Forever' : '14-Day Free Trial Included'}
                </span>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--ink)' }}>{plan.name}</h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginTop: '4px' }}>{plan.tagline}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--teal)' }}>
                  {plan.currency}{plan.priceMonthly}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>billed monthly</div>
              </div>
            </div>

            {/* SWITCH PLAN SELECTOR */}
            <div style={{ background: 'var(--panel)', padding: '16px', borderRadius: '14px', margin: '18px 0' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '10px' }}>
                Switch plan:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(['free', 'family', 'extended'] as PlanId[]).map((pid) => {
                  const p = PLANS[pid];
                  const isSelected = p.id === selectedPlanId;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => setSelectedPlanId(pid)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid var(--teal)' : '1px solid var(--line)',
                        background: isSelected ? 'var(--panel-elevated)' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: isSelected ? '0 2px 8px var(--teal-soft)' : 'none'
                      }}
                    >
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: isSelected ? 'var(--teal)' : 'var(--ink)' }}>
                        {p.name.split(' ')[0]}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        {p.currency}{p.priceMonthly}/mo
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PLAN FEATURES LIST */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-muted)' }}>
                Included in this plan:
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}>
                {plan.features.map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem', color: 'var(--ink)' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <Check size={12} color="var(--teal)" strokeWidth={3} />
                    </div>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TRIAL TIMELINE, CONSENT, & PROCEED */}
        <div>
          {/* TRIAL / BILLING BREAKDOWN */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--teal)" />
              Billing summary
            </h3>

            {plan.hasTrial ? (
              <div style={{ background: 'var(--teal-light)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.92rem' }}>
                  <span>Due today (14-day trial)</span>
                  <strong style={{ color: 'var(--green)' }}>₹0</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: 'var(--ink-muted)' }}>
                  <span>First charge ({formattedTrialEnd})</span>
                  <strong>₹{plan.priceMonthly}</strong>
                </div>
                <div style={{ borderTop: '1px solid rgba(47, 74, 69, 0.15)', marginTop: '12px', paddingTop: '10px', fontSize: '0.8rem', color: 'var(--teal-deep)' }}>
                  ✨ <strong>Zero surprise policy:</strong> You can cancel self-service from your billing settings anytime before {formattedTrialEnd} with 1 click and you won&apos;t be charged a single rupee.
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--panel)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
                  <span>Due today</span>
                  <strong style={{ color: 'var(--green)' }}>₹0 (Free Starter Plan)</strong>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  No payment details required. Skips straight into adding your first parent profile.
                </p>
              </div>
            )}

            {/* MANDATORY CONSENT CHECKBOXES */}
            <div style={{ borderTop: '1px solid var(--line-subtle)', paddingTop: '18px' }}>
              {/* 1. Parent Consent */}
              <label
                onClick={() => setParentConsentChecked(!parentConsentChecked)}
                className="checkbox-group"
              >
                <div className={`checkbox-custom ${parentConsentChecked ? 'checked' : ''}`}>
                  {parentConsentChecked && <Check size={14} strokeWidth={3} />}
                </div>
                <div>
                  <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '2px' }}>
                    Parent Awareness & Consent (Mandatory)
                  </strong>
                  <span>
                    I confirm that I have informed my parent(s) and have their consent for CareCircle to call their phone number for daily wellness check-ins.
                  </span>
                </div>
              </label>

              {/* 2. Terms & Privacy */}
              <label
                onClick={() => setTermsChecked(!termsChecked)}
                className="checkbox-group"
              >
                <div className={`checkbox-custom ${termsChecked ? 'checked' : ''}`}>
                  {termsChecked && <Check size={14} strokeWidth={3} />}
                </div>
                <div>
                  <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '2px' }}>
                    Terms of Service & Health Data Disclaimer
                  </strong>
                  <span>
                    I accept the <a href="#" style={{ color: 'var(--teal)', textDecoration: 'underline' }}>Terms of Service</a> and understand CareCircle is a wellness companion and not a licensed medical emergency service.
                  </span>
                </div>
              </label>
            </div>

            {errorNotice && (
              <div className="alert-box error" style={{ marginTop: '16px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorNotice}</span>
              </div>
            )}

            <button
              onClick={handleProceed}
              disabled={loading}
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: '20px' }}
            >
              {loading ? (
                'Processing...'
              ) : plan.id === 'free' ? (
                <>Activate Free Plan & Add Parents <ArrowRight size={18} /></>
              ) : (
                <>Proceed to Secure Payment <ArrowRight size={18} /></>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
              🔒 256-bit SSL encrypted checkout
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutConfirmPage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px' }}>Loading confirmation...</div>}>
          <ConfirmContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
