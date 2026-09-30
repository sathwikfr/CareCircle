'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PLANS, getPlan } from '@/lib/plans';
import { PlanId } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Check, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { CheckoutShell, PageTitle, CheckRow, SummaryRow } from '@/components/checkout/CheckoutUI';

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
  const [today] = useState(() => Date.now());
  const formattedTrialEnd = new Date(today + plan.trialDays * 86400000).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleProceed = async () => {
    setErrorNotice('');

    if (!parentConsentChecked) {
      setErrorNotice('Please confirm that your parent knows about the calls and has agreed to them.');
      return;
    }

    if (!termsChecked) {
      setErrorNotice('Please confirm you understand CareCircle is not a medical or emergency service.');
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
    <CheckoutShell step={2}>
      <PageTitle title="Choose your plan" sub="You can switch or cancel any time from your billing page." />

      <div className="checkout-grid">
        {/* PLAN */}
        <section className="panel" aria-labelledby="plan-title">
          <div className="plan-options" role="radiogroup" aria-label="Plan" style={{ marginBottom: '24px' }}>
            {(['free', 'family', 'extended'] as PlanId[]).map((pid) => {
              const p = PLANS[pid];
              return (
                <button
                  key={pid}
                  type="button"
                  role="radio"
                  aria-checked={p.id === selectedPlanId}
                  className="plan-option"
                  onClick={() => setSelectedPlanId(pid)}
                >
                  <strong>{p.name}</strong>
                  <span>{p.priceMonthly === 0 ? 'Free' : `₹${p.priceMonthly}/month`}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '6px' }}>
            <div>
              <h2 id="plan-title" style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}>{plan.name}</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', marginTop: '2px' }}>{plan.tagline}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>
                ₹{plan.priceMonthly}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '4px' }}>
                {plan.priceMonthly === 0 ? 'forever' : 'per month'}
              </div>
            </div>
          </div>

          <div className="divider" style={{ margin: '20px 0' }} />

          <ul className="feature-list">
            {plan.features.map((feat) => (
              <li key={feat}>
                <span><Check size={12} strokeWidth={3} /></span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* SUMMARY + CONSENT */}
        <section className="panel" aria-labelledby="summary-title">
          <h3 id="summary-title" style={{ fontSize: '1.2rem', marginBottom: '14px' }}>Summary</h3>

          <div className="summary" style={{ marginBottom: '14px' }}>
            {plan.hasTrial ? (
              <>
                <SummaryRow label={`Due today (${plan.trialDays}-day trial)`} value="₹0" tone="green" strong />
                <SummaryRow label={`First charge on ${formattedTrialEnd}`} value={`₹${plan.priceMonthly}`} />
                <SummaryRow label="After that" value={`₹${plan.priceMonthly} every month`} />
              </>
            ) : (
              <>
                <SummaryRow label="Due today" value="₹0" tone="green" strong />
                <SummaryRow label="Payment details" value="Not needed" />
              </>
            )}
          </div>

          {plan.hasTrial && (
            <p className="fine-print" style={{ marginBottom: '20px' }}>
              <ShieldCheck size={16} />
              <span>Cancel from your billing page before {formattedTrialEnd} and you won&apos;t be charged anything.</span>
            </p>
          )}

          <CheckRow checked={parentConsentChecked} onChange={(v) => { setParentConsentChecked(v); setErrorNotice(''); }} title="My parent knows and has agreed">
            I&apos;ve told my parent(s) about Saathi and they&apos;re happy to receive check-in calls on their phone.
          </CheckRow>
          <CheckRow checked={termsChecked} onChange={(v) => { setTermsChecked(v); setErrorNotice(''); }} title="Not a medical service">
            I understand CareCircle is a family check-in companion, not a doctor or an emergency service.
            {' '}By continuing I agree to the <Link href="/terms" target="_blank">Terms of Service</Link> and <Link href="/privacy" target="_blank">Privacy Policy</Link>.
          </CheckRow>

          {errorNotice && (
            <div className="alert-box error" role="alert" style={{ marginTop: '14px', marginBottom: 0 }}>
              <AlertCircle size={18} />
              <span>{errorNotice}</span>
            </div>
          )}

          <button onClick={handleProceed} disabled={loading} className="btn btn-primary btn-block btn-lg" style={{ marginTop: '18px' }}>
            {loading ? (
              <><span className="spinner" /> Setting up…</>
            ) : plan.id === 'free' ? (
              <>Start with Free <ArrowRight size={18} className="arrow" /></>
            ) : (
              <>Continue to payment <ArrowRight size={18} className="arrow" /></>
            )}
          </button>
        </section>
      </div>
    </CheckoutShell>
  );
}

export default function CheckoutConfirmPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ paddingTop: '120px' }}><div className="skeleton" style={{ height: '420px', maxWidth: '1000px', margin: '0 auto' }} /></div>}>
      <ConfirmContent />
    </Suspense>
  );
}
