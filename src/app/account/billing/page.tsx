'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { PLANS, getEffectivePlan } from '@/lib/plans';
import { PlanId, Invoice, UserSubscription } from '@/lib/types';
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Download,
  ArrowUpRight,
  Shield,
  HelpCircle,
  X,
  HeartCrack,
  Check
} from 'lucide-react';

export default function AccountBillingPage() {
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [selectedNewPlan, setSelectedNewPlan] = useState<PlanId>('extended');
  const [switchLoading, setSwitchLoading] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Parent moved in with me');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Fetch billing data
  const fetchBillingData = async () => {
    try {
      const res = await fetch('/api/account/billing');
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription || user?.subscription || null);
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [user]);

  const currentPlan = getEffectivePlan(subscription);

  // Handle Plan Upgrade/Downgrade
  const handleSwitchPlan = async () => {
    setSwitchLoading(true);
    try {
      const res = await fetch('/api/account/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch-plan', newPlanId: selectedNewPlan })
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        // Paid plans go through Razorpay checkout; they can't be switched on directly.
        window.location.href = data.checkoutUrl;
        return;
      }
      if (res.ok) {
        setNotification({ type: 'success', message: data.message || 'Plan updated successfully!' });
        setShowSwitchModal(false);
        await refreshUser();
        await fetchBillingData();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to change plan' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error while updating plan.' });
    } finally {
      setSwitchLoading(false);
    }
  };

  // Handle Self-Service Cancellation
  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch('/api/account/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason: cancelReason })
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
        setShowCancelModal(false);
        await refreshUser();
        await fetchBillingData();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to cancel subscription' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error while cancelling.' });
    } finally {
      setCancelLoading(false);
    }
  };

  // Handle Reactivate Subscription
  const handleReactivate = async () => {
    try {
      const res = await fetch('/api/account/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate' })
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
        await refreshUser();
        await fetchBillingData();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to reactivate.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to reactivate.' });
    }
  };

  // Mock Invoice PDF download
  const handleDownloadInvoice = (inv: Invoice) => {
    const text = `=====================================\nCARECIRCLE TAX INVOICE\n=====================================\nInvoice: ${inv.invoiceNumber}\nDate: ${inv.date}\nAmount: ₹${inv.amount}\nPlan: ${inv.planName}\nPayment Method: ${inv.paymentMethod}\nStatus: ${inv.status.toUpperCase()}\n=====================================\nThank you for choosing CareCircle for your parents!\n`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoiceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Navbar />

      <main style={{ padding: '48px 0 96px' }}>
        <div className="wrap-checkout">
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: 'clamp(1.9rem, 3.2vw, 2.4rem)', marginBottom: '8px' }}>
              Subscription & Billing
            </h1>
            <p style={{ fontSize: '0.96rem', color: 'var(--ink-muted)' }}>
              Manage your CareCircle tier, billing frequency, payment methods, and tax receipts.
            </p>
          </div>

          {notification && (
            <div className={`alert-box ${notification.type}`} style={{ marginBottom: '24px' }}>
              {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              <span>{notification.message}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', marginBottom: '36px' }}>
            {/* CURRENT SUBSCRIPTION CARD */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span
                      className={`badge ${
                        subscription?.status === 'cancelled'
                          ? 'badge-red'
                          : subscription?.status === 'trialing'
                          ? 'badge-gold'
                          : 'badge-teal'
                      }`}
                    >
                      {subscription?.status === 'cancelled'
                        ? 'Cancels at Period End'
                        : subscription?.status === 'trialing'
                        ? '14-Day Free Trial'
                        : subscription?.status === 'free'
                        ? 'Free Starter'
                        : 'Active Subscription'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.4rem' }}>{currentPlan.name}</h3>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 600, color: 'var(--teal)' }}>
                    {currentPlan.currency}{currentPlan.priceMonthly}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>monthly billing</div>
                </div>
              </div>

              <div style={{ background: 'var(--panel)', padding: '16px', borderRadius: '12px', margin: '16px 0', display: 'grid', gap: '8px', fontSize: '0.86rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>Next billing date:</span>
                  <strong>
                    {subscription?.currentPeriodEnd
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>Parents included:</span>
                  <strong>Up to {currentPlan.parentsIncluded} parent profiles</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>AutoPay mandate:</span>
                  <strong>{subscription?.razorpaySubscriptionId || 'sub_cc_active_mandate'}</strong>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px' }}>
                <button
                  onClick={() => setShowSwitchModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  Change Plan <ArrowUpRight size={14} />
                </button>

                {subscription?.status === 'cancelled' ? (
                  <button
                    onClick={handleReactivate}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--teal)' }}
                  >
                    Resume Subscription
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)' }}
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>

            {/* PAYMENT METHOD ON FILE */}
            <div className="card">
              <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="var(--teal)" />
                Payment Method on File
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', border: '1px solid var(--line)', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)' }}>
                  <CreditCard size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.94rem', fontWeight: 600 }}>
                    {subscription?.paymentMethodBrand || 'UPI AutoPay / HDFC Bank'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                    Mandate ending in •••• {subscription?.paymentMethodLast4 || '4242'}
                  </div>
                </div>
                <span className="badge badge-teal">Primary</span>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                🔒 Card & mandate authorization tokens are encrypted and handled directly by Razorpay under RBI AutoPay recurring subscription guidelines.
              </div>
            </div>
          </div>

          {/* BILLING HISTORY / INVOICES TABLE */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '18px' }}>Billing History & Invoices</h3>

            {invoices.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>No past invoices found.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--ink-muted)' }}>
                      <th style={{ padding: '12px 14px' }}>Invoice ID</th>
                      <th style={{ padding: '12px 14px' }}>Date</th>
                      <th style={{ padding: '12px 14px' }}>Plan Description</th>
                      <th style={{ padding: '12px 14px' }}>Amount</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--line-subtle)' }}>
                        <td style={{ padding: '14px', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                        <td style={{ padding: '14px', color: 'var(--ink-muted)' }}>{inv.date}</td>
                        <td style={{ padding: '14px' }}>{inv.planName}</td>
                        <td style={{ padding: '14px', fontWeight: 600 }}>₹{inv.amount}</td>
                        <td style={{ padding: '14px' }}>
                          <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDownloadInvoice(inv)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--teal)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.82rem',
                              fontWeight: 600
                            }}
                          >
                            <Download size={14} /> Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* CHANGE PLAN MODAL */}
        {showSwitchModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999,
              padding: '20px'
            }}
          >
            <div className="card" style={{ maxWidth: '520px', width: '100%', position: 'relative' }}>
              <button
                onClick={() => setShowSwitchModal(false)}
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

              <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Change your CareCircle plan</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: '20px' }}>
                Your existing parent check-ins will smoothly transfer to the updated tier.
              </p>

              <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
                {(['free', 'family', 'extended'] as PlanId[]).map((pid) => {
                  const p = PLANS[pid];
                  const isSelected = selectedNewPlan === pid;
                  return (
                    <div
                      key={pid}
                      onClick={() => setSelectedNewPlan(pid)}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid var(--teal)' : '1px solid var(--line)',
                        background: isSelected ? 'var(--teal-light)' : '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                          {p.tagline} · {p.parentsIncluded} {p.parentsIncluded === 1 ? 'Parent' : 'Parents'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--teal)' }}>
                          {p.currency}{p.priceMonthly}/mo
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowSwitchModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={switchLoading}
                  onClick={handleSwitchPlan}
                  className="btn btn-primary"
                >
                  {switchLoading ? 'Updating Plan...' : 'Confirm Plan Switch'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SELF-SERVICE CANCELLATION MODAL (WITH RETENTION COPY AS MANDATED) */}
        {showCancelModal && (
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
            <div className="card" style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
              <button
                onClick={() => setShowCancelModal(false)}
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

              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gold-soft)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <HeartCrack size={26} />
              </div>

              <h3 style={{ fontSize: '1.35rem', marginBottom: '8px' }}>
                Are you sure you want to cancel?
              </h3>

              {/* EMPATHETIC RETENTION MESSAGE */}
              <div
                style={{
                  background: 'var(--panel)',
                  padding: '14px',
                  borderRadius: '10px',
                  fontSize: '0.86rem',
                  color: 'var(--ink-muted)',
                  lineHeight: 1.5,
                  marginBottom: '18px'
                }}
              >
                Amma & Appa’s daily scheduled medicine check-ins and mood summaries will discontinue at the end of your current cycle on{' '}
                <strong>
                  {subscription?.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'the billing cycle'}
                </strong>.
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Help us improve: Why are you cancelling?</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="form-input"
                >
                  <option value="Parent moved in with me">Parent moved in with me / living together</option>
                  <option value="Timing of calls didn't suit">Timing of calls didn&apos;t suit parent</option>
                  <option value="Temporary financial reason">Temporary pause</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="btn btn-ghost"
                >
                  Keep My Plan
                </button>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={handleCancelSubscription}
                  className="btn btn-danger"
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm Self-Service Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
