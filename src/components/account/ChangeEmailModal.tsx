'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { User } from '@/lib/types';
import { AlertCircle, ArrowRight, CheckCircle2, MailCheck } from 'lucide-react';

/**
 * Two steps: send a code to the new address, then enter it. The account keeps
 * its current email until the code is confirmed (POST /api/account/email).
 */
export function ChangeEmailModal({
  open, onClose, currentEmail, onChanged
}: {
  open: boolean;
  onClose: () => void;
  currentEmail: string;
  onChanged: (user: User, message: string) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="change-email-title" width={460}>
      {/* Lives inside the modal so its state resets every time it closes. */}
      <ChangeEmailForm currentEmail={currentEmail} onChanged={onChanged} />
    </Modal>
  );
}

function ChangeEmailForm({ currentEmail, onChanged }: { currentEmail: string; onChanged: (user: User, message: string) => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devNotice, setDevNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const cleanEmail = newEmail.trim().toLowerCase();

  const sendCode = async (): Promise<boolean> => {
    setError('');
    setDevNotice(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return false;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/account/email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send the verification code.');
        return false;
      }
      setResendIn(30);
      if (data.devCode) setDevNotice(`[Dev email simulation] Your verification code is: ${data.devCode}`);
      return true;
    } catch {
      setError('Network error while sending the verification code.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await sendCode()) {
      setCode('');
      setStep('code');
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit code we emailed you.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/account/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not change your email.');
        if (data.code === 'EMAIL_TAKEN') setStep('email');
        return;
      }
      onChanged(data.user, data.message);
    } catch {
      setError('Network error while confirming the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 id="change-email-title" style={{ fontSize: '1.5rem', marginBottom: '8px', paddingRight: '32px' }}>Change your email</h2>
      <p style={{ fontSize: '0.92rem', color: 'var(--ink-muted)', marginBottom: '22px' }}>
        We&apos;ll send a code to the new address. Until you enter it, sign-in, receipts and alerts stay with <b>{currentEmail}</b>.
      </p>

      {error && (
        <div className="alert-box error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={handleSend} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="new-email">New email</label>
            <input
              id="new-email"
              type="email"
              placeholder="you@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="form-input"
              autoComplete="email"
              autoFocus
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ marginTop: '6px' }}>
            {loading ? <><span className="spinner" /> Sending code…</> : <>Send code <ArrowRight size={16} className="arrow" /></>}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirm} noValidate>
          <div className="notice teal">
            <MailCheck size={20} />
            <div>
              We emailed a 6-digit code to <b>{cleanEmail}</b>. It can take a minute; check spam too.{' '}
              <button type="button" className="link-btn" onClick={() => { setStep('email'); setCode(''); setDevNotice(null); setError(''); }}>
                Use a different email
              </button>
            </div>
          </div>

          {devNotice && (
            <div className="alert-box success" style={{ fontWeight: 600 }}>
              <CheckCircle2 size={18} />
              <span>{devNotice}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email-change-code">6-digit code</label>
            <input
              id="email-change-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="form-input otp-input"
              required
              autoFocus
            />
          </div>

          <button type="submit" disabled={loading || code.length !== 6} className="btn btn-primary btn-block" style={{ marginTop: '6px' }}>
            {loading ? <><span className="spinner" /> Confirming…</> : 'Confirm new email'}
          </button>

          <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)', marginTop: '14px', textAlign: 'center' }}>
            Didn&apos;t get it?{' '}
            {resendIn > 0 ? (
              <span>Send a new code in {resendIn}s</span>
            ) : (
              <button type="button" className="link-btn" disabled={loading} onClick={() => { setCode(''); sendCode(); }}>
                Send a new code
              </button>
            )}
          </p>
        </form>
      )}
    </>
  );
}
