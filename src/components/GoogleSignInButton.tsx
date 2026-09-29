'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Official Google Identity Services button. The credential it returns is a
 * Google-signed ID token that the server verifies (/api/auth/google).
 * Renders nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.
 */
interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (resp: GoogleCredentialResponse) => void; ux_mode?: string }) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

function loadGsiScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.google?.accounts?.id) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>('script[data-gsi]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.gsi = 'true';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton({
  mode,
  onCredential,
  disabled
}: {
  mode: 'signin' | 'signup';
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGsiScript().then(ok => {
      if (cancelled || !containerRef.current) return;
      if (!ok || !window.google?.accounts?.id) {
        setFailed(true);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: resp => {
          if (resp.credential) callbackRef.current(resp.credential);
        }
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 320,
        text: mode === 'signup' ? 'signup_with' : 'continue_with'
      });
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (!CLIENT_ID) return null;

  return (
    <div style={{ marginBottom: '18px', opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }} />
      {failed && (
        <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', textAlign: 'center', marginTop: '6px' }}>
          Google sign-in couldn&apos;t load. Please use email and password.
        </p>
      )}
    </div>
  );
}

export const isGoogleSignInEnabled = Boolean(CLIENT_ID);
