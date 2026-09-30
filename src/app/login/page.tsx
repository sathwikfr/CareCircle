'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell, Modal, PasswordField, PhoneField } from '@/components/auth/AuthUI';
import { useAuth } from '@/context/AuthContext';
import { GoogleSignInButton, isGoogleSignInEnabled } from '@/components/GoogleSignInButton';
import { safeRedirectPath } from '@/lib/redirect';
import { AlertCircle, ArrowRight, CheckCircle2, Phone, KeyRound, SearchX, MessageSquareCode } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = safeRedirectPath(searchParams.get('redirect') || searchParams.get('callbackUrl'));

  const { login, loginWithOtp, loginWithGoogle } = useAuth();

  // Mode: 'password' | 'otp'
  const [activeTab, setActiveTab] = useState<'password' | 'otp'>('password');

  // Password Login state
  const [emailOrPhone, setEmailOrPhone] = useState(searchParams.get('identifier') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // OTP Login state
  const [otpPhone, setOtpPhone] = useState(searchParams.get('identifier') || '');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  // Google Login state
  const [googleLoading, setGoogleLoading] = useState(false);

  // Status & Error messaging
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [accountNotFound, setAccountNotFound] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  // 1. Password Login Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setErrorCode(null);
    setAccountNotFound(false);

    if (!emailOrPhone.trim()) {
      setErrorMessage('Please enter your email or registered phone number.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    const result = await login(emailOrPhone, password, rememberMe);
    setLoading(false);

    if (result.success) {
      router.push(redirectUrl);
    } else {
      setErrorMessage(result.error || 'Invalid credentials. Please try again.');
      setErrorCode(result.code || null);
      if (result.notFound || result.code === 'ACCOUNT_NOT_FOUND') {
        setAccountNotFound(true);
      }
    }
  };

  // 2. OTP Send for Login
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setErrorCode(null);
    setAccountNotFound(false);
    setDevOtpNotice(null);

    const cleanPhone = otpPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, purpose: 'login' })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to send OTP.');
        setErrorCode(data.code || null);
        if (data.notFound || data.code === 'ACCOUNT_NOT_FOUND') {
          setAccountNotFound(true);
        }
        return;
      }

      setOtpSent(true);
      if (data.devOtp) {
        setDevOtpNotice(`[Dev SMS Simulation] Your code is: ${data.devOtp}`);
      }
    } catch {
      setErrorMessage('Network error while requesting OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // 3. OTP Verify for Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setErrorCode(null);
    setAccountNotFound(false);

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setOtpLoading(true);
    const cleanPhone = otpPhone.replace(/\D/g, '');
    const result = await loginWithOtp(cleanPhone, otpCode.trim(), rememberMe);
    setOtpLoading(false);

    if (result.success) {
      router.push(redirectUrl);
    } else {
      setErrorMessage(result.error || 'Failed to verify OTP code.');
      setErrorCode(result.code || null);
      if (result.notFound || result.code === 'ACCOUNT_NOT_FOUND') {
        setAccountNotFound(true);
      }
    }
  };

  // 4. Google Login (verified Google ID token)
  const handleGoogleCredential = async (credential: string) => {
    setGoogleLoading(true);
    setErrorMessage('');
    setErrorCode(null);
    setAccountNotFound(false);

    const result = await loginWithGoogle(credential, rememberMe);
    setGoogleLoading(false);

    if (result.success) {
      router.push(redirectUrl);
    } else {
      setErrorMessage(result.error || 'Google login failed.');
      setErrorCode(result.code || null);
      if (result.notFound || result.code === 'ACCOUNT_NOT_FOUND') {
        setAccountNotFound(true);
      }
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotSuccess(data.message || 'Password reset link sent!');
      } else {
        setForgotError(data.error || 'Failed to send reset link.');
      }
    } catch {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const enteredIdentifier = activeTab === 'password' ? emailOrPhone : otpPhone;

  const switchTab = (tab: 'password' | 'otp') => {
    setActiveTab(tab);
    setErrorMessage('');
    setAccountNotFound(false);
  };

  const openForgot = () => {
    setForgotEmail(emailOrPhone.includes('@') ? emailOrPhone : '');
    setShowForgotModal(true);
  };

  const closeForgot = () => {
    setShowForgotModal(false);
    setForgotSuccess('');
    setForgotError('');
  };

  const rememberCheckbox = (id: string) => (
    <label htmlFor={id} className="checkbox-group" style={{ margin: '4px 0 22px', alignItems: 'center' }}>
      <input
        type="checkbox"
        id={id}
        checked={rememberMe}
        onChange={(e) => setRememberMe(e.target.checked)}
        style={{ width: '18px', height: '18px', accentColor: 'var(--teal)', cursor: 'pointer' }}
      />
      Keep me logged in for 30 days
    </label>
  );

  return (
    <>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-sub">Log in to see how your parents are doing.</p>

      {isGoogleSignInEnabled && (
        <>
          <GoogleSignInButton mode="signin" onCredential={handleGoogleCredential} disabled={googleLoading || loading} />
          <div className="or-divider">or</div>
        </>
      )}

      <div className="segmented" role="group" aria-label="Login method" style={{ marginBottom: '24px' }}>
        <button type="button" aria-pressed={activeTab === 'password'} onClick={() => switchTab('password')}>
          <KeyRound size={15} /> Password
        </button>
        <button type="button" aria-pressed={activeTab === 'otp'} onClick={() => switchTab('otp')}>
          <Phone size={15} /> Phone OTP
        </button>
      </div>

      {accountNotFound && (
        <div className="notice amber" role="alert">
          <SearchX size={20} />
          <div>
            <strong>No account found</strong>
            <p>{errorMessage || 'There is no Aaptha account with this email or phone number.'}</p>
            <Link
              href={`/signup?identifier=${encodeURIComponent(enteredIdentifier)}&plan=family`}
              className="btn btn-primary btn-sm"
            >
              Create an account <ArrowRight size={14} className="arrow" />
            </Link>
          </div>
        </div>
      )}

      {errorMessage && !accountNotFound && (
        <div className="alert-box error" role="alert">
          <AlertCircle size={18} />
          <div style={{ flex: 1 }}>
            <div>{errorMessage}</div>
            {errorCode === 'INCORRECT_PASSWORD' && (
              <button type="button" className="link-btn" onClick={openForgot} style={{ marginTop: '6px', fontSize: '0.84rem' }}>
                Forgot your password? Reset it
              </button>
            )}
            {errorCode === 'AUTH_METHOD_MISMATCH' && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={openForgot} style={{ marginTop: '10px' }}>
                Set a password
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'password' && (
        <form onSubmit={handlePasswordSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="identifier">Email or phone number</label>
            <input
              id="identifier"
              type="text"
              placeholder="you@example.com or 98765 43210"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              className="form-input"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <div className="form-label">
              <label htmlFor="password">Password</label>
              <button type="button" className="link-btn" onClick={openForgot} style={{ fontSize: '0.84rem' }}>
                Forgot password?
              </button>
            </div>
            <PasswordField
              id="password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              placeholder="Your password"
            />
          </div>

          {rememberCheckbox('rememberMe')}

          <button type="submit" disabled={loading} className="btn btn-primary btn-block btn-lg">
            {loading ? <><span className="spinner" /> Logging in…</> : <>Log in <ArrowRight size={18} className="arrow" /></>}
          </button>
        </form>
      )}

      {activeTab === 'otp' && (
        <div>
          {!otpSent ? (
            <form onSubmit={handleSendOtp} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="otpPhone">Mobile number on your account</label>
                <PhoneField id="otpPhone" value={otpPhone} onChange={setOtpPhone} />
              </div>

              {rememberCheckbox('rememberMeOtp')}

              <button type="submit" disabled={otpLoading} className="btn btn-primary btn-block btn-lg">
                {otpLoading ? <><span className="spinner" /> Sending code…</> : <>Send code <ArrowRight size={18} className="arrow" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} noValidate>
              <div className="notice teal">
                <MessageSquareCode size={20} />
                <div>
                  Code sent to <b>+91 {otpPhone}</b>.{' '}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      setDevOtpNotice(null);
                    }}
                  >
                    Change
                  </button>
                </div>
              </div>

              {devOtpNotice && (
                <div className="alert-box success" style={{ fontWeight: 600 }}>
                  <CheckCircle2 size={18} />
                  <span>{devOtpNotice}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="otpCode">6-digit code</label>
                <input
                  id="otpCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="form-input otp-input"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading || otpCode.length !== 6}
                className="btn btn-primary btn-block btn-lg"
                style={{ marginTop: '8px' }}
              >
                {otpLoading ? <><span className="spinner" /> Verifying…</> : <>Verify & log in <ArrowRight size={18} className="arrow" /></>}
              </button>
            </form>
          )}
        </div>
      )}

      <p className="auth-foot">
        New to Aaptha?{' '}
        <Link href={`/signup${enteredIdentifier ? `?identifier=${encodeURIComponent(enteredIdentifier)}` : ''}`} className="link">
          Create an account
        </Link>
      </p>

      <Modal open={showForgotModal} onClose={closeForgot} labelledBy="forgot-title">
        <h2 id="forgot-title" style={{ fontSize: '1.5rem', marginBottom: '8px', paddingRight: '32px' }}>Reset your password</h2>
        <p style={{ fontSize: '0.92rem', color: 'var(--ink-muted)', marginBottom: '22px' }}>
          Enter your email and we&apos;ll send you a link to choose a new password.
        </p>

        {forgotSuccess ? (
          <div className="alert-box success" role="status">
            <CheckCircle2 size={18} />
            <span>{forgotSuccess}</span>
          </div>
        ) : (
          <form onSubmit={handleForgotPasswordSubmit} noValidate>
            {forgotError && (
              <div className="alert-box error" role="alert">
                <AlertCircle size={18} />
                <span>{forgotError}</span>
              </div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="forgotEmail">Email address</label>
              <input
                id="forgotEmail"
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="form-input"
                autoComplete="email"
                autoFocus
                required
              />
            </div>
            <button type="submit" disabled={forgotLoading} className="btn btn-primary btn-block" style={{ marginTop: '6px' }}>
              {forgotLoading ? <><span className="spinner" /> Sending…</> : 'Send reset link'}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="skeleton" style={{ height: '420px' }} />}>
        <LoginContent />
      </Suspense>
    </AuthShell>
  );
}
