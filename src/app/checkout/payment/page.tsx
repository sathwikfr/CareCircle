'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CheckoutStepper } from '@/components/CheckoutStepper';
import { getPlan } from '@/lib/plans';
import { PlanId } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Lock, ShieldCheck, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get('plan') as PlanId) || 'family';
  const plan = getPlan(planParam);

  const { user, loading: authLoading } = useAuth();

  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [subscriptionData, setSubscriptionData] = useState<{
    subscriptionId: string;
    keyId: string;
    isSandbox: boolean;
  } | null>(null);
  const [initError, setInitError] = useState('');
  // Captured once so render stays pure.
  const [pageLoadedAt] = useState(() => Date.now());

  // Sandbox-only outcome simulator (local development without Razorpay keys)
  const [simulateOutcome, setSimulateOutcome] = useState<'success' | 'declined' | 'network'>('success');

  useEffect(() => {
    if (plan.priceMonthly === 0) {
      router.replace('/checkout/confirm?plan=free');
      return;
    }
    if (authLoading || !user) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/razorpay/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: plan.id })
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.subscriptionId) {
          setSubscriptionData({ subscriptionId: data.subscriptionId, keyId: data.keyId, isSandbox: Boolean(data.isSandbox) });
        } else {
          setInitError(data.error || 'Could not start checkout. Please try again.');
        }
      } catch {
        if (!cancelled) setInitError('Network error while starting checkout. Please retry.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan.id, plan.priceMonthly, user, authLoading, router]);

  const verifyWithServer = async (resp: RazorpaySuccessResponse, brand: string) => {
    const res = await fetch('/api/razorpay/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...resp, planId: plan.id, paymentMethodBrand: brand })
    });
    const verifyData = await res.json();
    if (!res.ok) {
      throw new Error(verifyData.error || 'Payment verification failed. You have not been charged twice — please contact support if money was debited.');
    }
    router.push(`/checkout/success?plan=${plan.id}&sub_id=${encodeURIComponent(resp.razorpay_subscription_id)}`);
  };

  const handleRazorpayCheckout = async () => {
    if (!subscriptionData || !user) return;
    setErrorMessage('');
    setProcessing(true);

    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setProcessing(false);
      setErrorMessage('Could not load Razorpay. Check your connection and try again.');
      return;
    }

    const rzp = new window.Razorpay({
      key: subscriptionData.keyId,
      subscription_id: subscriptionData.subscriptionId,
      name: 'CareCircle',
      description: `${plan.name} — monthly subscription`,
      prefill: { name: user.name, email: user.email, contact: user.phone || '' },
      theme: { color: '#2f4a45' },
      handler: async (resp: RazorpaySuccessResponse) => {
        try {
          await verifyWithServer(resp, 'Razorpay');
        } catch (err) {
          setProcessing(false);
          setErrorMessage(err instanceof Error ? err.message : 'Payment verification failed.');
        }
      },
      modal: {
        ondismiss: () => setProcessing(false)
      }
    });
    rzp.on('payment.failed', resp => {
      setProcessing(false);
      setErrorMessage(resp.error?.description || 'The payment did not go through. Please try again.');
    });
    rzp.open();
  };

  const handleSandboxCheckout = async () => {
    if (!subscriptionData) return;
    setErrorMessage('');
    setProcessing(true);
    await new Promise(r => setTimeout(r, 800));

    if (simulateOutcome === 'declined') {
      setProcessing(false);
      setErrorMessage('Sandbox: your bank declined the transaction.');
      return;
    }
    if (simulateOutcome === 'network') {
      setProcessing(false);
      setErrorMessage('Sandbox: connection timed out while contacting the bank. You have not been charged.');
      return;
    }

    try {
      await verifyWithServer(
        {
          razorpay_payment_id: `pay_sandbox_${Date.now()}`,
          razorpay_subscription_id: subscriptionData.subscriptionId,
          razorpay_signature: 'sig_test_sandbox'
        },
        'Sandbox'
      );
    } catch (err) {
      setProcessing(false);
      setErrorMessage(err instanceof Error ? err.message : 'Sandbox verification failed.');
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="wrap-checkout" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '12px' }}>Please log in to continue</h2>
          <p style={{ color: 'var(--ink-muted)', marginBottom: '20px' }}>You need a CareCircle account before starting a subscription.</p>
          <Link href={`/login?redirect=${encodeURIComponent(`/checkout/payment?plan=${plan.id}`)}`} className="btn btn-primary">
            Log in <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const trialText = plan.hasTrial ? `Start your ${plan.trialDays}-day free trial. ₹0 charged today.` : `₹${plan.priceMonthly} charged today.`;

  return (
    <div className="wrap-checkout" style={{ padding: '36px 20px 80px' }}>
      <CheckoutStepper currentStep={3} />

      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 32px' }}>
        <h1 style={{ fontSize: 'clamp(1.9rem, 3.2vw, 2.4rem)', marginBottom: '8px' }}>Payment & AutoPay Setup</h1>
        <p style={{ fontSize: '0.94rem', color: 'var(--ink-muted)' }}>{trialText}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' }}>
        <div>
          <div className="card">
            {(errorMessage || initError) && (
              <div className="alert-box error" style={{ marginBottom: '22px' }}>
                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>
                    {initError ? 'Checkout unavailable' : 'Payment unsuccessful'}
                  </strong>
                  <span>{errorMessage || initError}</span>
                </div>
              </div>
            )}

            <h4 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-muted)', marginBottom: '10px' }}>
              Billing contact
            </h4>
            <p style={{ marginBottom: '20px', fontSize: '0.94rem' }}>
              <strong>{user?.name}</strong>
              <br />
              <span style={{ color: 'var(--ink-muted)' }}>{user?.email}</span>
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--panel)',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                color: 'var(--ink-muted)',
                marginBottom: '20px'
              }}
            >
              <Lock size={16} color="var(--teal)" style={{ flexShrink: 0 }} />
              <span>
                You&apos;ll choose UPI AutoPay, card, or netbanking in the secure <strong>Razorpay</strong> window.
                CareCircle never sees or stores your card number, UPI PIN, or CVV.
              </span>
            </div>

            {subscriptionData?.isSandbox && (
              <div
                style={{
                  border: '1px dashed var(--gold)',
                  background: 'var(--gold-soft)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '0.8rem'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--gold-hover)', marginBottom: '6px' }}>
                  🛠️ Local sandbox (no Razorpay keys configured) — no real payment happens:
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {(['success', 'declined', 'network'] as const).map(outcome => (
                    <label key={outcome} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="simulateOutcome"
                        value={outcome}
                        checked={simulateOutcome === outcome}
                        onChange={() => setSimulateOutcome(outcome)}
                      />
                      <span>{outcome === 'declined' ? 'Declined' : outcome === 'network' ? 'Network failure' : 'Success'}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={subscriptionData?.isSandbox ? handleSandboxCheckout : handleRazorpayCheckout}
              disabled={processing || !subscriptionData}
              className="btn btn-primary btn-block btn-lg"
            >
              {processing ? (
                <>
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Waiting for Razorpay...
                </>
              ) : !subscriptionData && !initError ? (
                'Preparing secure checkout...'
              ) : (
                <>
                  {plan.hasTrial ? `Authorize ${plan.trialDays}-Day Free Trial (₹0)` : `Pay ₹${plan.priceMonthly}`} <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* ORDER SUMMARY SIDEBAR */}
        <div>
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Order summary</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--line-subtle)' }}>
              <div>
                <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{plan.name}</strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>Recurring Monthly Subscription</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>₹{plan.priceMonthly}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>/mo</span>
              </div>
            </div>

            {plan.hasTrial && (
              <div style={{ padding: '16px 0', borderBottom: '1px solid var(--line-subtle)', display: 'grid', gap: '10px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>Trial duration:</span>
                  <strong>{plan.trialDays} Days Free</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>Due today:</span>
                  <strong style={{ color: 'var(--green)' }}>₹0</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>First charge on:</span>
                  <strong>
                    {new Date(pageLoadedAt + plan.trialDays * 86400000).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>First charge:</span>
                  <strong>₹{plan.priceMonthly}</strong>
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--teal)', fontWeight: 600, marginBottom: '8px' }}>
                <ShieldCheck size={18} />
                <span>Cancel anytime</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Cancel with one click in your account settings before your trial ends and you won&apos;t be charged.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px' }}>Loading payment gateway...</div>}>
          <PaymentContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
