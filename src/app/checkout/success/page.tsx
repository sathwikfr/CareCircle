'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getPlan } from '@/lib/plans';
import { PlanId } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import confetti from 'canvas-confetti';
import { CheckCircle2, Mail, ArrowRight, UserPlus } from 'lucide-react';
import { CheckoutShell, SummaryRow } from '@/components/checkout/CheckoutUI';

function SuccessContent() {
  const searchParams = useSearchParams();
  const planParam = (searchParams.get('plan') as PlanId) || 'free';
  const { user, refreshUser } = useAuth();

  // Show what the account actually has, not what the URL claims.
  const sub = user?.subscription;
  const plan = sub ? getPlan(sub.planId) : getPlan(planParam);
  const subId = sub?.razorpaySubscriptionId;
  const payId = sub?.razorpayPaymentId;
  const firstChargeDate = sub?.trialEndsAt || sub?.currentPeriodEnd;

  useEffect(() => {
    try {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ['#2f4a45', '#c2822f', '#e9b877', '#6fb0a4'] });
      }
    } catch {
      // safe fallback if canvas is unavailable
    }
    refreshUser();
  }, []);

  return (
    <CheckoutShell step={4} wide={false}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div className="success-burst">
          <CheckCircle2 size={38} />
        </div>
        <h1 style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)', letterSpacing: '-0.03em', marginBottom: '10px' }}>
          {plan.hasTrial ? `Your ${plan.trialDays}-day free trial has started` : 'Welcome to CareCircle'}
        </h1>
        <p style={{ fontSize: '1.02rem', color: 'var(--ink-muted)', maxWidth: '46ch', margin: '0 auto' }}>
          You&apos;re on <strong style={{ color: 'var(--ink)' }}>{plan.name}</strong>. One last step: tell us about your parent so Saathi can start calling.
        </p>
      </div>

      <section className="panel" style={{ background: 'linear-gradient(160deg, var(--teal-light), var(--panel-elevated) 65%)', borderColor: 'var(--teal-soft)', textAlign: 'center', padding: '32px 24px' }}>
        <span className="icon-tile" style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--teal)', color: 'var(--on-teal)', marginBottom: '14px' }}>
          <UserPlus size={24} />
        </span>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '6px' }}>Add your first parent</h2>
        <p style={{ fontSize: '0.92rem', color: 'var(--ink-muted)', maxWidth: '42ch', margin: '0 auto 22px' }}>
          Their name, phone number, language and medicines. It takes a few minutes.
        </p>
        <Link href="/onboarding" className="btn btn-primary btn-lg">
          Start setup <ArrowRight size={18} className="arrow" />
        </Link>
      </section>

      <section className="panel" aria-labelledby="sub-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <h3 id="sub-title" style={{ fontSize: '1.1rem' }}>Your subscription</h3>
          <span className="badge badge-green">{plan.hasTrial ? 'Trial active' : 'Active'}</span>
        </div>
        <div className="summary">
          <SummaryRow label="Plan" value={plan.name} />
          <SummaryRow
            label={plan.priceMonthly === 0 ? 'Price' : 'First charge'}
            value={
              plan.priceMonthly === 0
                ? 'Free'
                : firstChargeDate
                  ? `₹${plan.priceMonthly} on ${new Date(firstChargeDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : `₹${plan.priceMonthly}/month`
            }
          />
          {subId && <SummaryRow label="Subscription ID" value={<span className="mono">{subId}</span>} />}
          {payId && <SummaryRow label="Payment reference" value={<span className="mono">{payId}</span>} />}
        </div>
        {plan.priceMonthly > 0 && (
          <p className="fine-print" style={{ marginTop: '14px' }}>
            <Mail size={16} />
            <span>We&apos;ve emailed a receipt to <strong style={{ color: 'var(--ink)' }}>{user?.email || 'your email address'}</strong>.</span>
          </p>
        )}
      </section>

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.9rem', flexWrap: 'wrap' }}>
        <Link href="/account/billing" className="link">Billing & subscription</Link>
        <Link href="/dashboard" style={{ color: 'var(--ink-muted)' }}>Go to dashboard</Link>
      </div>
    </CheckoutShell>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ paddingTop: '120px' }}><div className="skeleton" style={{ height: '420px', maxWidth: '640px', margin: '0 auto' }} /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
