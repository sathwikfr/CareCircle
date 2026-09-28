'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, X, Phone, KeyRound, ShieldAlert } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || searchParams.get('callbackUrl') || '/dashboard';

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
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');

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

  // 4. Google Login
  const handleGoogleLoginDirect = async (emailToUse: string) => {
    setGoogleLoading(true);
    setErrorMessage('');
    setErrorCode(null);
    setAccountNotFound(false);

    const result = await loginWithGoogle(emailToUse, rememberMe);
    setGoogleLoading(false);
    setShowGoogleModal(false);

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

  const handleDemoFill = () => {
    setActiveTab('password');
    setEmailOrPhone('demo@carecircle.in');
    setPassword('Password123');
    setAccountNotFound(false);
    setErrorMessage('');
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

  return (
    <div className="wrap-narrow" style={{ padding: '50px 20px 80px' }}>
      <div className="card" style={{ maxWidth: '480px', margin: '0 auto', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.9rem', marginBottom: '8px', color: 'var(--ink)' }}>Welcome back</h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-muted)' }}>
            Log in to manage your parents&apos; CareCircle check-in routines.
          </p>
        </div>

        {/* DEMO FILL SHORTCUT */}
        <div
          onClick={handleDemoFill}
          style={{
            background: 'var(--teal-light)',
            border: '1px dashed var(--teal)',
            padding: '10px 14px',
            borderRadius: '10px',
            marginBottom: '18px',
            fontSize: '0.82rem',
            color: 'var(--teal-deep)',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>👉 Quick Demo Account: <strong>demo@carecircle.in</strong></span>
          <span style={{ fontWeight: 600, textDecoration: 'underline' }}>Auto-fill</span>
        </div>

        {/* GOOGLE OAUTH BUTTON */}
        <button
          onClick={() => setShowGoogleModal(true)}
          disabled={googleLoading || loading}
          className="btn btn-ghost btn-block"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '12px',
            borderRadius: '12px',
            marginBottom: '18px',
            fontSize: '0.95rem',
            border: '1px solid var(--line)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
            />
          </svg>
          {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '18px 0', color: 'var(--ink-subtle)', fontSize: '0.84rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
          <span>or choose login method</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
        </div>

        {/* AUTH METHOD TABS */}
        <div
          style={{
            display: 'flex',
            background: 'var(--panel)',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '20px',
            border: '1px solid var(--line)'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setErrorMessage('');
              setAccountNotFound(false);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: activeTab === 'password' ? '#fff' : 'transparent',
              color: activeTab === 'password' ? 'var(--ink)' : 'var(--ink-muted)',
              boxShadow: activeTab === 'password' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <KeyRound size={16} /> Password
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('otp');
              setErrorMessage('');
              setAccountNotFound(false);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: activeTab === 'otp' ? '#fff' : 'transparent',
              color: activeTab === 'otp' ? 'var(--ink)' : 'var(--ink-muted)',
              boxShadow: activeTab === 'otp' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Phone size={16} /> Phone OTP
          </button>
        </div>

        {/* EXPLICIT ACCOUNT NOT FOUND REJECTION PROMPT */}
        {accountNotFound && (
          <div
            style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}
          >
            <ShieldAlert size={22} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.94rem', marginBottom: '4px' }}>
                No account found
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.86rem', color: '#78350f', lineHeight: 1.45 }}>
                {errorMessage || 'There is no registered CareCircle account matching this email or phone.'}
              </p>
              <Link
                href={`/signup?identifier=${encodeURIComponent(enteredIdentifier)}&plan=family`}
                className="btn btn-primary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#92400e',
                  borderColor: '#92400e',
                  color: '#fff',
                  padding: '7px 14px',
                  fontSize: '0.84rem'
                }}
              >
                Sign up for CareCircle now <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* GENERAL ERROR / WRONG PASSWORD */}
        {errorMessage && !accountNotFound && (
          <div className="alert-box error" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, fontSize: '0.88rem' }}>
              <div>{errorMessage}</div>
              {errorCode === 'INCORRECT_PASSWORD' && (
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(emailOrPhone.includes('@') ? emailOrPhone : '');
                    setShowForgotModal(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--teal)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    padding: 0,
                    marginTop: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Forgot your password? Reset it here →
                </button>
              )}
              {errorCode === 'AUTH_METHOD_MISMATCH' && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleGoogleLoginDirect(emailOrPhone)}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                  >
                    Log in with Google →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(emailOrPhone.includes('@') ? emailOrPhone : '');
                      setShowForgotModal(true);
                    }}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.82rem', padding: '6px 12px', background: '#fff' }}
                  >
                    Set a Password →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: PASSWORD LOGIN FORM */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label">Email or Phone Number</label>
              <input
                type="text"
                placeholder="e.g. demo@carecircle.in or 9876543210"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(emailOrPhone.includes('@') ? emailOrPhone : '');
                    setShowForgotModal(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--teal)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
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
            </div>

            {/* REMEMBER ME CHECKBOX */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0 20px' }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--teal)', cursor: 'pointer' }}
              />
              <label htmlFor="rememberMe" style={{ fontSize: '0.86rem', color: 'var(--ink-muted)', cursor: 'pointer', userSelect: 'none' }}>
                Remember me on this browser (30 days)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-block btn-lg"
            >
              {loading ? 'Verifying account...' : 'Log in with Password'} <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* TAB 2: PHONE OTP LOGIN FORM */}
        {activeTab === 'otp' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <div className="form-group">
                  <label className="form-label">
                    <span>Registered Mobile Number</span>
                    <span className="form-hint">Must belong to an existing account</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span
                      style={{
                        padding: '13px 14px',
                        background: 'var(--panel)',
                        border: '1px solid var(--line)',
                        borderRadius: '12px',
                        fontSize: '0.94rem',
                        fontWeight: 600,
                        color: 'var(--ink)'
                      }}
                    >
                      +91
                    </span>
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0 20px' }}>
                  <input
                    type="checkbox"
                    id="rememberMeOtp"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--teal)', cursor: 'pointer' }}
                  />
                  <label htmlFor="rememberMeOtp" style={{ fontSize: '0.86rem', color: 'var(--ink-muted)', cursor: 'pointer', userSelect: 'none' }}>
                    Remember me on this browser (30 days)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="btn btn-primary btn-block btn-lg"
                >
                  {otpLoading ? 'Checking account & sending code...' : 'Send Verification Code'} <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ background: 'var(--teal-light)', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.86rem', color: 'var(--teal-deep)' }}>
                  Verification code sent to <strong>+91 {otpPhone}</strong>.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      setDevOtpNotice(null);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--teal)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Change
                  </button>
                </div>

                {devOtpNotice && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.84rem', color: '#065f46', fontWeight: 600 }}>
                    {devOtpNotice}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Enter 6-Digit OTP Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="form-input"
                    style={{ fontSize: '1.4rem', letterSpacing: '6px', textAlign: 'center', fontWeight: 700 }}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  className="btn btn-primary btn-block btn-lg"
                  style={{ marginTop: '12px' }}
                >
                  {otpLoading ? 'Verifying session...' : 'Verify OTP & Log In'} <ArrowRight size={18} />
                </button>
              </form>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
          Don&apos;t have an account yet?{' '}
          <Link href={`/signup${enteredIdentifier ? `?identifier=${encodeURIComponent(enteredIdentifier)}` : ''}`} style={{ color: 'var(--teal)', fontWeight: 600 }}>
            Sign up now
          </Link>
        </div>
      </div>

      {/* GOOGLE SIMULATION / SELECTOR MODAL */}
      {showGoogleModal && (
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
          <div
            className="card"
            style={{
              maxWidth: '440px',
              width: '100%',
              position: 'relative',
              animation: 'fadeIn 0.2s ease',
              background: '#fff'
            }}
          >
            <button
              onClick={() => setShowGoogleModal(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-muted)'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Google Sign-In</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: '18px' }}>
              Select an account to log into CareCircle. Logging in will only succeed for accounts that already exist.
            </p>

            {/* Quick pre-seeded Google account buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => handleGoogleLoginDirect('demo@carecircle.in')}
                className="btn btn-ghost"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  border: '1px solid var(--line)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Demo Account</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>demo@carecircle.in</div>
                </div>
                <span className="badge badge-teal" style={{ fontSize: '0.75rem' }}>Registered</span>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleLoginDirect('sathwik.fr@gmail.com')}
                className="btn btn-ghost"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  border: '1px solid var(--line)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Sathwik Family Account</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>sathwik.fr@gmail.com</div>
                </div>
                <span className="badge badge-teal" style={{ fontSize: '0.75rem' }}>Registered</span>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleLoginDirect('unregistered.test@gmail.com')}
                className="btn btn-ghost"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  border: '1px dashed #f59e0b',
                  background: '#fef3c7'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#92400e' }}>Test Unregistered Account</div>
                  <div style={{ fontSize: '0.8rem', color: '#b45309' }}>unregistered.test@gmail.com</div>
                </div>
                <span className="badge" style={{ background: '#f59e0b', color: '#fff', fontSize: '0.75rem' }}>Should Reject</span>
              </button>
            </div>

            {/* Custom Google Email Input */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>Or enter any Google email to test:</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  placeholder="your-google-email@gmail.com"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.88rem' }}
                />
                <button
                  type="button"
                  disabled={!googleEmailInput.includes('@') || googleLoading}
                  onClick={() => handleGoogleLoginDirect(googleEmailInput)}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
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
          <div
            className="card"
            style={{
              maxWidth: '440px',
              width: '100%',
              position: 'relative',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <button
              onClick={() => {
                setShowForgotModal(false);
                setForgotSuccess('');
                setForgotError('');
              }}
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

            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Reset your password</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: '20px' }}>
              Enter your email address and we&apos;ll send you a secure link to create a new password.
            </p>

            {forgotSuccess ? (
              <div className="alert-box success">
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{forgotSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit}>
                {forgotError && (
                  <div className="alert-box error" style={{ marginBottom: '14px' }}>
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{forgotError}</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn btn-primary btn-block"
                  style={{ marginTop: '10px' }}
                >
                  {forgotLoading ? 'Sending link...' : 'Send reset link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>}>
          <LoginContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
