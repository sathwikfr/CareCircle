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
import {
  Lock,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Building,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get('plan') as PlanId) || 'family';
  const plan = getPlan(planParam);

  const { user } = useAuth();

  // Billing form state (prefilled from logged in user)
  const [billingName, setBillingName] = useState(user?.name || 'Sathwik Rao');
  const [billingEmail, setBillingEmail] = useState(user?.email || 'sathwik@carecircle.in');
  const [billingPhone, setBillingPhone] = useState(user?.phone || '+91 98765 43210');

  // Selected payment method tab
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');

  // UPI fields
  const [vpa, setVpa] = useState('sathwik@oksbi');

  // Card fields
  const [cardNumber, setCardNumber] = useState('4532 8901 2345 4242');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('888');

  // Netbanking field
  const [bank, setBank] = useState('HDFC Bank');

  // Processing & Error states
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [subscriptionData, setSubscriptionData] = useState<{ subscriptionId: string; keyId: string } | null>(null);

  // Simulation mode selection (Success, Card Declined, Expired, Network Error)
  const [simulateOutcome, setSimulateOutcome] = useState<'success' | 'declined' | 'expired' | 'network'>('success');

  // Automatically fetch / create subscription ID on mount
  useEffect(() => {
    async function initSubscription() {
      try {
        const res = await fetch('/api/razorpay/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: plan.id,
            customerEmail: billingEmail,
            customerName: billingName,
            customerPhone: billingPhone
          })
        });
        const data = await res.json();
        if (res.ok && data.subscriptionId) {
          setSubscriptionData({
            subscriptionId: data.subscriptionId,
            keyId: data.keyId
          });
        }
      } catch (err) {
        console.error('Failed to init subscription:', err);
      }
    }
    if (plan.priceMonthly > 0) {
      initSubscription();
    }
  }, [plan.id, plan.priceMonthly, billingEmail, billingName, billingPhone]);

  // Handle payment execution
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setProcessing(true);

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1400));

    // Evaluate simulated outcome
    if (simulateOutcome === 'declined') {
      setProcessing(false);
      setErrorMessage('That payment didn’t go through — your bank declined the transaction. Please check your card balance or try UPI AutoPay.');
      return;
    }

    if (simulateOutcome === 'expired') {
      setProcessing(false);
      setErrorMessage('This card has expired. Please verify the expiry month/year and try again.');
      return;
    }

    if (simulateOutcome === 'network') {
      setProcessing(false);
      setErrorMessage('Connection timed out while contacting your bank gateway. Your account has not been charged — please retry.');
      return;
    }

    // Success outcome: Call server-side verification endpoint
    try {
      const last4 = paymentMethod === 'card' ? cardNumber.replace(/\D/g, '').slice(-4) : '4242';
      const brand = paymentMethod === 'upi' ? 'UPI AutoPay' : paymentMethod === 'card' ? 'Visa' : bank;

      const subId = subscriptionData?.subscriptionId || `sub_rzp_${Date.now()}`;
      const fakePaymentId = `pay_${Date.now()}`;

      const res = await fetch('/api/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: fakePaymentId,
          razorpay_subscription_id: subId,
          razorpay_signature: `sig_test_${Date.now()}`,
          planId: plan.id,
          customerEmail: billingEmail,
          paymentMethodBrand: brand,
          paymentMethodLast4: last4
        })
      });

      const verifyData = await res.json();
      if (!res.ok) {
        setProcessing(false);
        setErrorMessage(verifyData.error || 'Signature verification failed. Please try again.');
        return;
      }

      router.push(`/checkout/success?plan=${plan.id}&sub_id=${subId}&pay_id=${fakePaymentId}`);
    } catch {
      setProcessing(false);
      setErrorMessage('A network error occurred while finalizing your subscription. Please click retry.');
    }
  };

  return (
    <div className="wrap-checkout" style={{ padding: '36px 20px 80px' }}>
      <CheckoutStepper currentStep={3} />

      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 32px' }}>
        <h1 style={{ fontSize: 'clamp(1.9rem, 3.2vw, 2.4rem)', marginBottom: '8px' }}>
          Payment & AutoPay Setup
        </h1>
        <p style={{ fontSize: '0.94rem', color: 'var(--ink-muted)' }}>
          Start your 14-day free trial. ₹0 charged today.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' }}>
        {/* PAYMENT METHOD FORM */}
        <div>
          <div className="card">
            {/* PAYMENT METHOD SELECTION TABS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                style={{
                  padding: '12px 8px',
                  borderRadius: '12px',
                  border: paymentMethod === 'upi' ? '2px solid var(--teal)' : '1px solid var(--line)',
                  background: paymentMethod === 'upi' ? 'var(--teal-light)' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Smartphone size={20} color={paymentMethod === 'upi' ? 'var(--teal)' : 'var(--ink-muted)'} />
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: paymentMethod === 'upi' ? 'var(--teal)' : 'var(--ink)' }}>
                  UPI AutoPay
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                style={{
                  padding: '12px 8px',
                  borderRadius: '12px',
                  border: paymentMethod === 'card' ? '2px solid var(--teal)' : '1px solid var(--line)',
                  background: paymentMethod === 'card' ? 'var(--teal-light)' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CreditCard size={20} color={paymentMethod === 'card' ? 'var(--teal)' : 'var(--ink-muted)'} />
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: paymentMethod === 'card' ? 'var(--teal)' : 'var(--ink)' }}>
                  Card
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('netbanking')}
                style={{
                  padding: '12px 8px',
                  borderRadius: '12px',
                  border: paymentMethod === 'netbanking' ? '2px solid var(--teal)' : '1px solid var(--line)',
                  background: paymentMethod === 'netbanking' ? 'var(--teal-light)' : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Building size={20} color={paymentMethod === 'netbanking' ? 'var(--teal)' : 'var(--ink-muted)'} />
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: paymentMethod === 'netbanking' ? 'var(--teal)' : 'var(--ink)' }}>
                  Netbanking
                </span>
              </button>
            </div>

            {/* ERROR ALERT DISPLAY (INLINE WITH RETRY) */}
            {errorMessage && (
              <div className="alert-box error" style={{ marginBottom: '22px' }}>
                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>Payment Unsuccessful</strong>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handlePaymentSubmit}>
              {/* BILLING INFO */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-muted)', marginBottom: '14px' }}>
                  Billing Contact
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* UPI INPUT */}
              {paymentMethod === 'upi' && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-muted)', marginBottom: '14px' }}>
                    UPI ID / VPA for AutoPay
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Virtual Payment Address</label>
                    <input
                      type="text"
                      placeholder="e.g. mobile@okhdfcbank or user@paytm"
                      value={vpa}
                      onChange={(e) => setVpa(e.target.value)}
                      className="form-input"
                      required
                    />
                    <span className="form-hint">
                      Supported: Google Pay, PhonePe, Paytm, BHIM & all major UPI bank apps
                    </span>
                  </div>
                </div>
              )}

              {/* CARD INPUTS */}
              {paymentMethod === 'card' && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-muted)', marginBottom: '14px' }}>
                    Card Details (Credit or Debit)
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Card Number</label>
                    <input
                      type="text"
                      placeholder="4532 8901 2345 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Expiry (MM/YY)</label>
                      <input
                        type="text"
                        placeholder="08/29"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">CVV</label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* NETBANKING INPUT */}
              {paymentMethod === 'netbanking' && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-muted)', marginBottom: '14px' }}>
                    Select Bank for Recurring e-Mandate
                  </h4>
                  <div className="form-group">
                    <select
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      className="form-input"
                    >
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="State Bank of India">State Bank of India (SBI)</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    </select>
                  </div>
                </div>
              )}

              {/* SECURITY NOTE (EXPLICIT REQUIREMENT) */}
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
                  Payments are processed securely by <strong>Razorpay</strong>. CareCircle never stores your card number, UPI PIN, or CVV.
                </span>
              </div>

              {/* TEST GATEWAY RESPONSE SWITCHER (FOR TESTING ALL PRD ERROR STATES) */}
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
                  🛠️ Gateway Test Control (Try Error & Success flows):
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(['success', 'declined', 'expired', 'network'] as const).map((outcome) => (
                    <label key={outcome} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="simulateOutcome"
                        value={outcome}
                        checked={simulateOutcome === outcome}
                        onChange={() => setSimulateOutcome(outcome)}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{outcome === 'declined' ? 'Card Declined' : outcome === 'expired' ? 'Card Expired' : outcome === 'network' ? 'Network Failure' : 'Success'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="btn btn-primary btn-block btn-lg"
              >
                {processing ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Verifying with Razorpay...
                  </>
                ) : (
                  <>
                    Authorize 14-Day Free Trial (₹0) <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
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

            <div style={{ padding: '16px 0', borderBottom: '1px solid var(--line-subtle)', display: 'grid', gap: '10px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Trial duration:</span>
                <strong>14 Days Free</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Due today:</span>
                <strong style={{ color: 'var(--green)' }}>₹0</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Next billing date:</span>
                <strong>
                  {new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-IN', {
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

            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--teal)', fontWeight: 600, marginBottom: '8px' }}>
                <ShieldCheck size={18} />
                <span>100% Risk Free Commitment</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Cancel anytime with one click in your account settings before your trial period concludes. You won&apos;t be charged.
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
