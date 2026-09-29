'use client';

import React, { useEffect, Suspense } from 'react';
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
  Mail,
  ArrowRight,
  UserPlus
} from 'lucide-react';

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
          {plan.hasTrial ? `Your ${plan.trialDays}-day free trial is active!` : 'Welcome to CareCircle!'}
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
                {plan.priceMonthly === 0 ? 'No monthly fee' : plan.hasTrial ? `Next billing in ${plan.trialDays} days` : 'Billed monthly'}
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 0', display: 'grid', gap: '10px', fontSize: '0.88rem' }}>
            {subId && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Subscription ID:</span>
                <code style={{ background: 'var(--panel)', padding: '2px 8px', borderRadius: '4px' }}>{subId}</code>
              </div>
            )}
            {payId && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Payment Reference:</span>
                <code style={{ background: 'var(--panel)', padding: '2px 8px', borderRadius: '4px' }}>{payId}</code>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-muted)' }}>First charge:</span>
              <strong>
                {plan.priceMonthly === 0
                  ? '₹0 (Free Starter Plan)'
                  : firstChargeDate
                    ? `₹${plan.priceMonthly} on ${new Date(firstChargeDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : `₹${plan.priceMonthly}/month`}
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
