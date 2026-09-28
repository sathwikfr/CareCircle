import React from 'react';
import Link from 'next/link';
import { Heart, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer style={{ marginTop: 'auto', background: 'var(--panel-elevated)', borderTop: '1px solid var(--line)', padding: '52px 0 36px' }}>
      <div className="wrap">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '36px', marginBottom: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>
              <span className="brand-heart" style={{ width: '24px', height: '24px' }}>
                <Heart size={14} fill="white" />
              </span>
              Care<span style={{ color: 'var(--gold)' }}>Circle</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', lineHeight: 1.6, maxWidth: '32ch' }}>
              Gentle AI daily telephone check-ins for aging parents in India. Warm Hindi, Tamil, Telugu, and English conversations.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-muted)' }}>
              Product
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: 'var(--ink)' }}>
              <Link href="/#how">How Daily Calls Work</Link>
              <Link href="/#problem">Why Phone Calls Win</Link>
              <Link href="/#plans">Plans & Pricing</Link>
              <Link href="/account/billing">Subscription Portal</Link>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-muted)' }}>
              Trust & Safety
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: 'var(--ink)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--teal)' }}>
                <ShieldCheck size={16} /> 256-bit Encrypted Audio
              </span>
              <span>Parent Consent First Policy</span>
              <span>Razorpay PCI-DSS Level 1</span>
              <span>Made with love for Indian Families</span>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-muted)' }}>
              Emergency Disclaimer
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', lineHeight: 1.55 }}>
              CareCircle is a family wellness and check-in companion. It is NOT an emergency response service or replacement for professional medical diagnosis or 112 emergency services.
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--line-subtle)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', fontSize: '0.84rem', color: 'var(--ink-subtle)' }}>
          <div>
            © {new Date().getFullYear()} CareCircle Health Technologies Pvt. Ltd. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="#" style={{ color: 'var(--ink-muted)' }}>Privacy Policy</a>
            <a href="#" style={{ color: 'var(--ink-muted)' }}>Terms of Service</a>
            <a href="#" style={{ color: 'var(--ink-muted)' }}>Caregiver Ethics Guide</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
