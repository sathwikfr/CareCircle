'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CheckoutStepper } from '@/components/CheckoutStepper';
import { useAuth } from '@/context/AuthContext';
import { getPlan } from '@/lib/plans';
import { PlanId } from '@/lib/types';
import { Eye, EyeOff, AlertCircle, ArrowRight, X, Phone, UserCheck, ShieldCheck } from 'lucide-react';

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get('plan') as PlanId) || 'family';
  const selectedPlan = getPlan(planParam);
  const identifierParam = searchParams.get('identifier') || '';

  const { signup, signupWithGoogle, loginWithOtp } = useAuth();

  const [signupMode, setSignupMode] = useState<'standard' | 'otp'>('standard');

  // Standard signup form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState(identifierParam.includes('@') ? identifierParam : '');
  const [phone, setPhone] = useState(!identifierParam.includes('@') ? identifierParam : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP signup form state
  const [otpName, setOtpName] = useState('');
  const [otpPhone, setOtpPhone] = useState(!identifierParam.includes('@') ? identifierParam : '');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  // Google signup state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');

  // Error handling
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);

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

  // 1. Standard Signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setErrorCode(null);
    setAccountExists(false);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const result = await signup({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: `+91 ${cleanPhone}`,
      password,
      planId: planParam
    });
    setLoading(false);

    if (result.success) {
      router.push(`/checkout/confirm?plan=${planParam}`);
    } else {
      setErrorMessage(result.error || 'Failed to create account. Please try again.');
      setErrorCode(result.code || null);
      if (result.code === 'ACCOUNT_EXISTS') {
        setAccountExists(true);
      }
    }
  };

  // 2. Send OTP for signup
  const handleSendOtpSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setErrorCode(null);
    setAccountExists(false);
    setDevOtpNotice(null);

    if (!otpName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

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
        body: JSON.stringify({ phone: cleanPhone, purpose: 'signup' })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to send OTP.');
        setErrorCode(data.code || null);
        if (data.code === 'ACCOUNT_EXISTS') {
          setAccountExists(true);
        }
        return;
      }

      setOtpSent(true);
      if (data.devOtp) {
        setDevOtpNotice(`[Dev SMS Simulation] Your verification code is: ${data.devOtp}`);
      }
    } catch {
      setErrorMessage('Network error while requesting verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // 3. Verify OTP for signup
  const handleVerifyOtpSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setErrorCode(null);

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit code sent to your phone.');
      return;
    }

    setOtpLoading(true);
    const cleanPhone = otpPhone.replace(/\D/g, '');
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          code: otpCode.trim(),
          purpose: 'signup',
          name: otpName.trim()
        })
      });
      const data = await res.json();
      setOtpLoading(false);

      if (!res.ok) {
        setErrorMessage(data.error || 'Verification failed.');
        setErrorCode(data.code || null);
        return;
      }

      router.push(`/checkout/confirm?plan=${planParam}`);
    } catch {
      setOtpLoading(false);
      setErrorMessage('Network connection error while verifying code.');
    }
  };

  // 4. Google Signup Direct
  const handleGoogleSignupDirect = async (emailToUse: string, nameToUse: string) => {
    setGoogleLoading(true);
    setErrorMessage('');
    setErrorCode(null);
    setAccountExists(false);

    const result = await signupWithGoogle(emailToUse, nameToUse || 'Google User');
    setGoogleLoading(false);
    setShowGoogleModal(false);

    if (result.success) {
      router.push(`/checkout/confirm?plan=${planParam}`);
    } else {
      setErrorMessage(result.error || 'Google sign-up failed.');
      setErrorCode(result.code || null);
      if (result.code === 'ACCOUNT_EXISTS') {
        setAccountExists(true);
      }
    }
  };

  return (
    <div className="wrap-narrow" style={{ padding: '40px 20px 80px' }}>
      <CheckoutStepper currentStep={1} />

      <div className="card" style={{ maxWidth: '520px', margin: '0 auto', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="badge badge-teal" style={{ marginBottom: '10px' }}>
            Selected: {selectedPlan.name} {selectedPlan.priceMonthly > 0 ? `(₹${selectedPlan.priceMonthly}/mo)` : '(₹0)'}
          </div>
          <h2 style={{ fontSize: '1.9rem', marginBottom: '8px', color: 'var(--ink)' }}>Create your CareCircle account</h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-muted)' }}>
            Start your setup to bring daily loving check-in calls to your parents.
          </p>
        </div>

        {/* GOOGLE SIGN UP BUTTON */}
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
          {googleLoading ? 'Setting up Google account...' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '18px 0', color: 'var(--ink-subtle)', fontSize: '0.84rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
          <span>or sign up with email / phone</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
        </div>

        {/* SIGNUP TABS */}
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
              setSignupMode('standard');
              setErrorMessage('');
              setAccountExists(false);
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
              background: signupMode === 'standard' ? '#fff' : 'transparent',
              color: signupMode === 'standard' ? 'var(--ink)' : 'var(--ink-muted)',
              boxShadow: signupMode === 'standard' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <UserCheck size={16} /> Email & Password
          </button>
          <button
            type="button"
            onClick={() => {
              setSignupMode('otp');
              setErrorMessage('');
              setAccountExists(false);
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
              background: signupMode === 'otp' ? '#fff' : 'transparent',
              color: signupMode === 'otp' ? 'var(--ink)' : 'var(--ink-muted)',
              boxShadow: signupMode === 'otp' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Phone size={16} /> Quick Mobile OTP
          </button>
        </div>

        {/* ACCOUNT ALREADY EXISTS ALERT */}
        {accountExists && (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #3b82f6',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}
          >
            <ShieldCheck size={22} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.94rem', marginBottom: '4px' }}>
                Account Already Exists
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.86rem', color: '#1e3a8a', lineHeight: 1.45 }}>
                {errorMessage || 'An account with this email or phone number is already registered.'}
              </p>
              <Link
                href={`/login?identifier=${encodeURIComponent(email || phone || otpPhone)}&redirect=/checkout/confirm?plan=${planParam}`}
                className="btn btn-primary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.84rem'
                }}
              >
                Log In to Your Account <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* GENERAL ERROR MESSAGE */}
        {errorMessage && !accountExists && (
          <div className="alert-box error" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* MODE 1: STANDARD EMAIL & PASSWORD SIGNUP */}
        {signupMode === 'standard' && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Sathwik Rao"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Mobile Number</span>
                <span className="form-hint">For urgent care alerts & call summaries</span>
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Create Password</label>
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

            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', margin: '18px 0 24px', lineHeight: 1.5 }}>
              By creating an account, you agree to CareCircle&apos;s{' '}
              <a href="#" style={{ color: 'var(--teal)', textDecoration: 'underline' }}>Terms of Service</a> and{' '}
              <a href="#" style={{ color: 'var(--teal)', textDecoration: 'underline' }}>Privacy Policy</a>.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-block btn-lg"
            >
              {loading ? 'Creating your account...' : 'Continue to Plan Confirmation'} <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* MODE 2: QUICK MOBILE OTP SIGNUP */}
        {signupMode === 'otp' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtpSignup}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sathwik Rao"
                    value={otpName}
                    onChange={(e) => setOtpName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Mobile Number</span>
                    <span className="form-hint">We&apos;ll send an instant verification code</span>
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

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="btn btn-primary btn-block btn-lg"
                  style={{ marginTop: '12px' }}
                >
                  {otpLoading ? 'Sending verification code...' : 'Send Verification Code'} <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpSignup}>
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
                    Change number
                  </button>
                </div>

                {devOtpNotice && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.84rem', color: '#065f46', fontWeight: 600 }}>
                    {devOtpNotice}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Enter 6-Digit Code</label>
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
                  {otpLoading ? 'Verifying & creating account...' : 'Verify & Continue'} <ArrowRight size={18} />
                </button>
              </form>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
          Already have a CareCircle account?{' '}
          <Link href={`/login?redirect=/checkout/confirm?plan=${planParam}`} style={{ color: 'var(--teal)', fontWeight: 600 }}>
            Log in here
          </Link>
        </div>
      </div>

      {/* GOOGLE SIGN UP MODAL */}
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

            <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Google One-Click Sign Up</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: '18px' }}>
              Create a new CareCircle account linked to your Google identity.
            </p>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                placeholder="Your Full Name"
                value={googleNameInput}
                onChange={(e) => setGoogleNameInput(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Google Email</label>
              <input
                type="email"
                placeholder="your.google@gmail.com"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                className="form-input"
              />
            </div>

            <button
              type="button"
              disabled={!googleEmailInput.includes('@') || googleLoading}
              onClick={() => handleGoogleSignupDirect(googleEmailInput, googleNameInput)}
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: '14px' }}
            >
              {googleLoading ? 'Creating account...' : 'Create Account with Google'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignUpPage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>}>
          <SignUpContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
