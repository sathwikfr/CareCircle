'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell, PasswordField, StrengthMeter } from '@/components/auth/AuthUI';
import { CheckCircle2, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token) {
      setErrorMessage('Reset token is missing or malformed. Please request a new password reset link.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to reset password.');
        return;
      }

      setIsSuccess(true);
    } catch {
      setLoading(false);
      setErrorMessage('Network error. Please try again.');
    }
  };

  if (isSuccess) {
    return (
      <div style={{ textAlign: 'center' }}>
        <span className="icon-tile" style={{ width: '64px', height: '64px', borderRadius: '50%', marginBottom: '20px', background: 'var(--green-soft)', color: 'var(--green)' }}>
          <CheckCircle2 size={32} />
        </span>
        <h1 className="auth-title">Password updated</h1>
        <p className="auth-sub">
          Your password has been changed. For your security, you&apos;ve been logged out on all devices.
        </p>
        <Link
          href={`/login${email ? `?identifier=${encodeURIComponent(email)}` : ''}`}
          className="btn btn-primary btn-block btn-lg"
        >
          Log in with your new password <ArrowRight size={18} className="arrow" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <span className="icon-tile" style={{ marginBottom: '20px' }}>
        <KeyRound size={22} />
      </span>
      <h1 className="auth-title">Choose a new password</h1>
      <p className="auth-sub">
        {email ? <>For <b style={{ color: 'var(--ink)' }}>{email}</b></> : 'Pick something you haven’t used before.'}
      </p>

      {!token && (
        <div className="alert-box error" role="alert">
          <AlertCircle size={18} />
          <div>
            This link is incomplete. Please open the exact link from your email, or{' '}
            <Link href="/login" className="link">request a new one</Link>.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="alert-box error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="new-password">New password</label>
          <PasswordField
            id="new-password"
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <StrengthMeter password={password} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Type it again"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`form-input${confirmPassword && confirmPassword !== password ? ' error' : ''}`}
            autoComplete="new-password"
            required
          />
          {confirmPassword && confirmPassword !== password && (
            <span className="form-error">Passwords don&apos;t match yet</span>
          )}
        </div>

        <button type="submit" disabled={loading || !token} className="btn btn-primary btn-block btn-lg" style={{ marginTop: '8px' }}>
          {loading ? <><span className="spinner" /> Saving…</> : <>Save new password <ArrowRight size={18} className="arrow" /></>}
        </button>
      </form>

      <p className="auth-foot">
        Remembered it? <Link href="/login" className="link">Back to login</Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="skeleton" style={{ height: '380px' }} />}>
        <ResetPasswordContent />
      </Suspense>
    </AuthShell>
  );
}
