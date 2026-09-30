'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Eye, EyeOff } from 'lucide-react';
import { Brand } from '@/components/Navbar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PHONE_COUNTRIES } from '@/lib/phone';

type AuthShellProps = {
  children: React.ReactNode;
  /** Optional heading for the side panel; defaults to the brand promise. */
  asideTitle?: React.ReactNode;
  asidePoints?: string[];
};

const DEFAULT_POINTS = [
  'A short call in their language, at the times you choose',
  'Works on any phone, no app for your parents',
  'Every call and medicine on one calm dashboard',
];

/** Split-screen layout used by login, signup and password reset. */
export function AuthShell({ children, asideTitle, asidePoints = DEFAULT_POINTS }: AuthShellProps) {
  return (
    <div className="auth-shell">
      <main id="main" className="auth-main">
        <div className="auth-top">
          <Brand />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ThemeToggle />
            <Link href="/" className="btn btn-quiet btn-sm">
              <ArrowLeft size={15} /> Home
            </Link>
          </div>
        </div>
        <div className="auth-body animate-fade-in">{children}</div>
      </main>

      <aside className="auth-aside" aria-hidden="true">
        <div>
          <span className="eyebrow" style={{ color: '#7dd3fc' }}>Aaptha</span>
          <h2>{asideTitle ?? <>Stay close to your parents, <em>even from far away.</em></>}</h2>
        </div>

        <ExampleCallCard />

        <ul className="auth-points">
          {asidePoints.map((p) => (
            <li key={p}><Check size={16} /> {p}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function ExampleCallCard() {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 'var(--r-lg)',
        padding: '20px',
        maxWidth: '400px',
        backdropFilter: 'blur(6px)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(145deg, #60a5fa, #1d4ed8)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-serif)', fontWeight: 600
            }}
          >
            A
          </span>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.92rem' }}>Amma · Morning check-in</div>
            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.55)' }}>Example · 8:30 AM · Telugu</div>
          </div>
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#86d9a8', background: 'rgba(134,217,168,0.12)', padding: '4px 10px', borderRadius: '999px' }}>
          Taken
        </span>
      </div>
      <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
        “Took my BP tablet after breakfast. Feeling well, went for a short walk.”
      </p>
    </div>
  );
}

type PasswordFieldProps = {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  autoComplete?: string;
};

export function PasswordField({ id, value, onChange, show, onToggle, placeholder, autoComplete = 'current-password' }: PasswordFieldProps) {
  return (
    <div className="input-affix">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        style={{ borderRadius: 'var(--r-md) 0 0 var(--r-md)' }}
      />
      <button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

type PhoneFieldProps = {
  id: string;
  /** Full number as typed, e.g. "+91 98765 43210" (a bare Indian number is also fine). */
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  /** Fixed +91 prefix and no country picker (the parent's phone: Saathi calls numbers in India). */
  indiaOnly?: boolean;
};

export function PhoneField({ id, value, onChange, autoFocus, indiaOnly = false }: PhoneFieldProps) {
  const [selected, setSelected] = React.useState('IN');

  if (indiaOnly) {
    return (
      <div className="input-affix">
        <span>+91</span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98765 43210"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          required
        />
      </div>
    );
  }

  const picked = PHONE_COUNTRIES.find(c => c.code === selected) ?? PHONE_COUNTRIES[0];
  // If the value already carries a country code (pasted, prefilled or typed as +44...), show that country.
  const fromValue = value.startsWith('+')
    ? [...PHONE_COUNTRIES]
        .filter(c => c.dial && value.startsWith(`+${c.dial}`))
        .sort((a, b) => b.dial.length - a.dial.length)[0]
    : undefined;
  const active = picked.dial && value.startsWith(`+${picked.dial}`) ? picked : fromValue ?? picked;
  const prefix = active.dial ? `+${active.dial}` : '';
  const national = prefix && value.startsWith(prefix) ? value.slice(prefix.length).trimStart() : value;

  const emit = (raw: string, dial: string) => {
    if (raw.trim() === '') return onChange('');
    if (raw.trim().startsWith('+') || !dial) return onChange(raw); // they typed the whole international number
    // Indian numbers are sometimes written with a leading 0 (STD prefix); it is not part of the number.
    return onChange(`+${dial}${dial === '91' ? raw.replace(/^\s*0+/, '') : raw}`);
  };

  return (
    <div className="input-affix">
      <select
        aria-label="Country code"
        value={active.code}
        onChange={(e) => {
          const next = PHONE_COUNTRIES.find(c => c.code === e.target.value) ?? PHONE_COUNTRIES[0];
          setSelected(next.code);
          emit(national, next.dial);
        }}
      >
        {PHONE_COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>
            {c.dial ? `${c.name} +${c.dial}` : c.name}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={active.code === 'IN' ? '98765 43210' : active.dial ? 'Phone number' : '+49 151 2345 6789'}
        value={national}
        onChange={(e) => emit(e.target.value, active.dial)}
        autoFocus={autoFocus}
        required
      />
    </div>
  );
}

export function passwordStrength(password: string) {
  if (!password) return { label: '', score: 0, color: 'var(--line-subtle)' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { label: 'Weak', score: 1, color: 'var(--red)' };
  if (score <= 3) return { label: 'Good', score: 2, color: 'var(--gold)' };
  return { label: 'Strong', score: 3, color: 'var(--green)' };
}

export function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const s = passwordStrength(password);
  return (
    <div className="strength" aria-live="polite">
      <div className="strength-bars">
        {[1, 2, 3].map((level) => (
          <i key={level} style={{ background: s.score >= level ? s.color : undefined }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: s.color }}>
        <span>{s.label}</span>
        {s.score < 3 && <span style={{ color: 'var(--ink-subtle)', fontWeight: 500 }}>Mix letters, numbers & symbols</span>}
      </div>
    </div>
  );
}

export { Modal } from '@/components/ui/Modal';
