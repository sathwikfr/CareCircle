'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Heart, User as UserIcon, LogOut, CreditCard, ChevronDown, Edit3 } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="app-header">
      <div className="wrap app-nav">
        <Link href="/" className="brand-link">
          <span className="brand-heart">
            <Heart size={16} fill="white" />
          </span>
          Care<span>Circle</span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '0.94rem', fontWeight: 500 }}>
          <Link href="/#how" style={{ color: 'var(--ink-muted)' }}>How it works</Link>
          <Link href="/#problem" style={{ color: 'var(--ink-muted)' }}>Why phone calls</Link>
          <Link href="/#plans" style={{ color: 'var(--ink-muted)' }}>Plans</Link>
          {user && (
            <>
              <Link href="/dashboard" style={{ color: 'var(--teal)', fontWeight: 700 }}>
                Parent Dashboard
              </Link>
              <Link href="/account/billing" style={{ color: 'var(--ink-muted)' }}>
                Subscription
              </Link>
            </>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--panel-elevated)',
                  border: '1px solid var(--line)',
                  borderRadius: '9999px',
                  padding: '6px 14px 6px 8px',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'var(--teal)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 600
                  }}
                >
                  {user.avatar || 'CC'}
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown size={14} color="var(--ink-muted)" />
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '115%',
                    width: '210px',
                    background: 'var(--panel-elevated)',
                    border: '1px solid var(--line)',
                    borderRadius: '14px',
                    boxShadow: 'var(--card-shadow)',
                    padding: '8px',
                    zIndex: 200
                  }}
                  onClick={() => setDropdownOpen(false)}
                >
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line-subtle)' }}>
                    <p style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--ink)' }}>{user.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.email}</p>
                  </div>
                  <Link
                    href="/account/profile"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      fontSize: '0.88rem',
                      color: 'var(--ink)',
                      fontWeight: 600,
                      borderRadius: '8px',
                      marginTop: '4px'
                    }}
                  >
                    <Edit3 size={16} color="var(--teal)" />
                    Edit Profile
                  </Link>
                  <Link
                    href="/dashboard"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      fontSize: '0.88rem',
                      color: 'var(--teal)',
                      fontWeight: 600,
                      borderRadius: '8px'
                    }}
                  >
                    <Heart size={16} color="var(--teal)" />
                    Parent Dashboard
                  </Link>
                  <Link
                    href="/onboarding"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      fontSize: '0.88rem',
                      color: 'var(--ink)',
                      borderRadius: '8px'
                    }}
                  >
                    <UserIcon size={16} color="var(--teal)" />
                    Add Another Parent
                  </Link>
                  <Link
                    href="/account/billing"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      fontSize: '0.88rem',
                      color: 'var(--ink)',
                      borderRadius: '8px'
                    }}
                  >
                    <CreditCard size={16} color="var(--ink-muted)" />
                    Subscription & Billing
                  </Link>
                  <button
                    onClick={() => logout()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      fontSize: '0.88rem',
                      color: 'var(--red)',
                      background: 'none',
                      border: 'none',
                      width: '100%',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link href="/#plans" className="btn btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
