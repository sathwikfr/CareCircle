'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { label: '', score: 0, color: '#e5e7eb' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { label: 'Weak', score: 1, color: '#ef4444' };
    if (score <= 3) return { label: 'Good', score: 2, color: 'var(--gold)' };
    return { label: 'Strong', score: 3, color: 'var(--green)' };
  };

  const strength = getPasswordStrength();

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
      <div className="wrap-narrow" style={{ padding: '60px 20px 90px' }}>
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--teal-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'var(--teal)'
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '10px', color: 'var(--ink)' }}>Password Reset Complete</h2>
          <p style={{ fontSize: '0.94rem', color: 'var(--ink-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
            Your password has been successfully changed. All active sessions have been signed out for security.
          </p>

          <Link
            href={`/login${email ? `?identifier=${encodeURIComponent(email)}` : ''}`}
            className="btn btn-primary btn-block btn-lg"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            Log in with your new password <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap-narrow" style={{ padding: '60px 20px 90px' }}>
      <div className="card" style={{ maxWidth: '480px', margin: '0 auto', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'var(--panel)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--teal)'
            }}
          >
            <KeyRound size={26} />
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', color: 'var(--ink)' }}>Create a New Password</h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-muted)' }}>
            {email ? `For your account: ${email}` : 'Enter your new secure password below.'}
          </p>
        </div>

        {!token && (
          <div className="alert-box error" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Missing reset token:</strong> Please use the exact link sent to your email address, or request a new reset link.
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="alert-box error" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingRight: '44px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink-muted)'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* PASSWORD STRENGTH METER */}
            {password && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '6px' }}>
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      style={{
                        flex: 1,
                        borderRadius: '2px',
                        background: strength.score >= level ? strength.color : '#e2e8f0',
                        transition: 'background 0.2s ease'
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: strength.color, fontWeight: 600 }}>
                  <span>Password strength: {strength.label}</span>
                  {strength.score < 3 && <span style={{ color: 'var(--ink-muted)' }}>Include letters, numbers & symbols</span>}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="btn btn-primary btn-block btn-lg"
            style={{ marginTop: '16px' }}
          >
            {loading ? 'Updating password...' : 'Save New Password & Log In'} <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
          Remembered your password?{' '}
          <Link href="/login" style={{ color: 'var(--teal)', fontWeight: 600 }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>}>
          <ResetPasswordContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
