'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { NotificationPreferences } from '@/lib/types';
import {
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  Bell,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Save,
  Clock,
  Heart,
  ExternalLink,
  MessageSquare,
  Smartphone
} from 'lucide-react';

export default function EditProfilePage() {
  const { user, refreshUser, setUserDirectly } = useAuth();

  // Active sub-tab: 'profile' | 'security' | 'notifications'
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');

  // Profile Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Notification Preferences state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    whatsapp: true,
    sms: true,
    email: true,
    push: false,
    minimumAlertLevel: 1
  });
  const [notifSaving, setNotifSaving] = useState(false);

  // Feedback Notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Load initial data from user object
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || '');
      if (user.notificationPreferences) {
        setNotifPrefs({
          whatsapp: user.notificationPreferences.whatsapp ?? true,
          sms: user.notificationPreferences.sms ?? true,
          email: user.notificationPreferences.email ?? true,
          push: user.notificationPreferences.push ?? false,
          minimumAlertLevel: user.notificationPreferences.minimumAlertLevel ?? 1
        });
      }
    }
  }, [user]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!name.trim()) {
      setNotification({ type: 'error', message: 'Full name cannot be empty.' });
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setNotification({ type: 'error', message: 'Please provide a valid email address.' });
      return;
    }

    setProfileSaving(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          avatar: avatar.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.user) {
          setUserDirectly(data.user);
        }
        await refreshUser();
        setNotification({
          type: 'success',
          message: data.message || 'Profile changes saved successfully!'
        });
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to update profile.'
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Network error occurred while saving profile.'
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!currentPassword) {
      setNotification({ type: 'error', message: 'Please enter your current password.' });
      return;
    }

    if (newPassword.length < 6) {
      setNotification({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotification({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: data.message || 'Password updated successfully!'
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to change password.'
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Network error occurred while updating password.'
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Handle Save Notifications
  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    setNotifSaving(true);

    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationPreferences: notifPrefs
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.user) {
          setUserDirectly(data.user);
        }
        await refreshUser();
        setNotification({
          type: 'success',
          message: 'Notification channels and delivery preferences saved!'
        });
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to update notification preferences.'
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Network error occurred while saving preferences.'
      });
    } finally {
      setNotifSaving(false);
    }
  };

  // Compute initials preview
  const displayInitials = (avatar || name || 'Caregiver')
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'CC';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '40px 16px 80px' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          
          {/* Breadcrumb Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: 'var(--ink-muted)', marginBottom: '20px' }}>
            <Link href="/" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <Link href="/dashboard" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>Dashboard</Link>
            <span>/</span>
            <span style={{ color: 'var(--teal)', fontWeight: 600 }}>Edit Account Profile</span>
          </div>

          {/* Page Header */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
            marginBottom: '32px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(47, 74, 69, 0.1)',
                  color: 'var(--teal)',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase'
                }}>
                  <ShieldCheck size={13} /> Account Holder Settings
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  Caregiver Profile Only
                </span>
              </div>
              <h1 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2.2rem',
                fontWeight: 600,
                color: 'var(--ink)',
                margin: '0 0 6px 0',
                letterSpacing: '-0.02em'
              }}>
                Edit Profile & Security
              </h1>
              <p style={{ fontSize: '0.96rem', color: 'var(--ink-muted)', margin: 0, maxWidth: '620px' }}>
                Manage your personal caregiver details, login credentials, and notification delivery channels. Parent health profiles and daily reminder schedules remain managed under the Parent Dashboard.
              </p>
            </div>

            {/* Quick Links */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link
                href="/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--panel-elevated)',
                  border: '1px solid var(--line)',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--teal)',
                  textDecoration: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <Heart size={15} color="var(--teal)" />
                Parent Dashboard
              </Link>
              <Link
                href="/account/billing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--panel-elevated)',
                  border: '1px solid var(--line)',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                Subscription & Billing
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Feedback Notification Banner */}
          {notification && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 18px',
              borderRadius: '12px',
              marginBottom: '24px',
              background: notification.type === 'success' ? '#f0fdf4' : notification.type === 'error' ? '#fef2f2' : '#eff6ff',
              border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : notification.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
              color: notification.type === 'success' ? '#166534' : notification.type === 'error' ? '#991b1b' : '#1e40af'
            }}>
              {notification.type === 'success' ? (
                <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div style={{ flex: 1, fontSize: '0.92rem', lineHeight: '1.4' }}>
                {notification.message}
              </div>
              <button
                onClick={() => setNotification(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  padding: 0,
                  fontSize: '1.1rem',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Two-Column Workspace Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr',
            gap: '28px',
            alignItems: 'start'
          }}>

            {/* LEFT COLUMN: Profile Overview Card & Navigation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Account Identity Card */}
              <div style={{
                background: 'var(--panel-elevated)',
                border: '1px solid var(--line)',
                borderRadius: '18px',
                padding: '24px',
                boxShadow: 'var(--card-shadow)',
                textAlign: 'center'
              }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--teal) 0%, #1f3330 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    margin: '0 auto',
                    boxShadow: '0 8px 16px rgba(47, 74, 69, 0.2)'
                  }}>
                    {displayInitials}
                  </div>
                  <span style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: user?.emailVerified ? '#10b981' : '#f59e0b',
                    border: '3px solid var(--panel-elevated)'
                  }} title={user?.emailVerified ? 'Email Verified' : 'Pending Verification'} />
                </div>

                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px 0' }}>
                  {user?.name || 'Caregiver User'}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', margin: '0 0 16px 0', wordBreak: 'break-all' }}>
                  {user?.email || 'user@carecircle.in'}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'var(--bg-subtle, #f5f1eb)',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  color: 'var(--ink-muted)',
                  marginBottom: '16px'
                }}>
                  <ShieldCheck size={14} color="var(--teal)" />
                  Primary Account Holder
                </div>

                <div style={{
                  borderTop: '1px solid var(--line-subtle)',
                  paddingTop: '16px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '0.82rem',
                  color: 'var(--ink-muted)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Email Status:</span>
                    <strong style={{ color: user?.emailVerified ? '#166534' : '#b45309' }}>
                      {user?.emailVerified ? '✓ Verified' : '⚠ Unverified'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Phone:</span>
                    <strong style={{ color: 'var(--ink)' }}>{user?.phone || 'Not set'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Plan:</span>
                    <strong style={{ color: 'var(--teal)', textTransform: 'capitalize' }}>
                      {user?.subscription?.planId || 'Family'} Care
                    </strong>
                  </div>
                </div>
              </div>

              {/* Sidebar Tabs */}
              <div style={{
                background: 'var(--panel-elevated)',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                padding: '8px',
                boxShadow: 'var(--card-shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => { setActiveTab('profile'); setNotification(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: activeTab === 'profile' ? 'var(--teal)' : 'transparent',
                    color: activeTab === 'profile' ? '#fff' : 'var(--ink)',
                    fontWeight: activeTab === 'profile' ? 700 : 500,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <UserIcon size={17} color={activeTab === 'profile' ? '#fff' : 'var(--teal)'} />
                  <span>Personal Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('security'); setNotification(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: activeTab === 'security' ? 'var(--teal)' : 'transparent',
                    color: activeTab === 'security' ? '#fff' : 'var(--ink)',
                    fontWeight: activeTab === 'security' ? 700 : 500,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Lock size={17} color={activeTab === 'security' ? '#fff' : 'var(--teal)'} />
                  <span>Password & Security</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('notifications'); setNotification(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: activeTab === 'notifications' ? 'var(--teal)' : 'transparent',
                    color: activeTab === 'notifications' ? '#fff' : 'var(--ink)',
                    fontWeight: activeTab === 'notifications' ? 700 : 500,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Bell size={17} color={activeTab === 'notifications' ? '#fff' : 'var(--teal)'} />
                  <span>Alert & Notif Preferences</span>
                </button>
              </div>

              {/* Data Scope Guidance Note */}
              <div style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '14px',
                padding: '16px',
                fontSize: '0.82rem',
                color: '#64748b',
                lineHeight: 1.5
              }}>
                <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#334155' }}>
                  Looking to update parent details?
                </p>
                To edit parent contact numbers, daily medicine lists, or call timings, visit the{' '}
                <Link href="/dashboard" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'underline' }}>
                  Parent Dashboard
                </Link>.
              </div>

            </div>

            {/* RIGHT COLUMN: Tab Content Panes */}
            <div>

              {/* TAB 1: PERSONAL DETAILS */}
              {activeTab === 'profile' && (
                <div style={{
                  background: 'var(--panel-elevated)',
                  border: '1px solid var(--line)',
                  borderRadius: '18px',
                  padding: '32px',
                  boxShadow: 'var(--card-shadow)'
                }}>
                  <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--line-subtle)', paddingBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px 0' }}>
                      Personal Caregiver Details
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', margin: 0 }}>
                      Update your name, contact email, and phone number used for login and emergency escalation.
                    </p>
                  </div>

                  <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    
                    {/* Full Name */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
                        Full Name <span style={{ color: 'var(--red)' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <UserIcon size={18} color="var(--ink-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Sathwik Rao"
                          required
                          style={{
                            width: '100%',
                            padding: '12px 14px 12px 42px',
                            border: '1px solid var(--line)',
                            borderRadius: '10px',
                            fontSize: '0.94rem',
                            color: 'var(--ink)',
                            background: 'var(--panel)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)' }}>
                          Email Address <span style={{ color: 'var(--red)' }}>*</span>
                        </label>
                        {user?.emailVerified ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
                            <CheckCircle2 size={13} /> Email Verified
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#b45309', fontWeight: 600 }}>
                            <AlertCircle size={13} /> Verification Required
                          </span>
                        )}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Mail size={18} color="var(--ink-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="sathwik.fr@gmail.com"
                          required
                          style={{
                            width: '100%',
                            padding: '12px 14px 12px 42px',
                            border: '1px solid var(--line)',
                            borderRadius: '10px',
                            fontSize: '0.94rem',
                            color: 'var(--ink)',
                            background: 'var(--panel)'
                          }}
                        />
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '6px' }}>
                        Note: If you change your email address, an instant verification link will be sent to the new address to confirm ownership.
                      </p>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
                        Phone Number (for SMS & WhatsApp Alerts)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={18} color="var(--ink-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          style={{
                            width: '100%',
                            padding: '12px 14px 12px 42px',
                            border: '1px solid var(--line)',
                            borderRadius: '10px',
                            fontSize: '0.94rem',
                            color: 'var(--ink)',
                            background: 'var(--panel)'
                          }}
                        />
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '6px' }}>
                        Used for urgent caregiver escalation alerts and OTP logins.
                      </p>
                    </div>

                    {/* Avatar Initials Customizer */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
                        Avatar Initials / Badge Label
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <input
                          type="text"
                          maxLength={3}
                          value={avatar}
                          onChange={(e) => setAvatar(e.target.value.toUpperCase())}
                          placeholder={displayInitials}
                          style={{
                            width: '100px',
                            padding: '10px 14px',
                            border: '1px solid var(--line)',
                            borderRadius: '10px',
                            fontSize: '0.94rem',
                            color: 'var(--ink)',
                            background: 'var(--panel)',
                            textAlign: 'center',
                            fontWeight: 700,
                            letterSpacing: '2px'
                          }}
                        />
                        <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
                          Displayed in the top navigation bar and caregiver cards. Default: First letter of each name.
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div style={{ paddingTop: '12px', borderTop: '1px solid var(--line-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="btn btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 24px',
                          borderRadius: '10px',
                          fontWeight: 600,
                          fontSize: '0.94rem'
                        }}
                      >
                        <Save size={16} />
                        {profileSaving ? 'Saving Changes...' : 'Save Profile Details'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: PASSWORD & SECURITY */}
              {activeTab === 'security' && (
                <div style={{
                  background: 'var(--panel-elevated)',
                  border: '1px solid var(--line)',
                  borderRadius: '18px',
                  padding: '32px',
                  boxShadow: 'var(--card-shadow)'
                }}>
                  <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--line-subtle)', paddingBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px 0' }}>
                      Password & Account Security
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', margin: 0 }}>
                      Change your account login password. Please provide your current password for security verification.
                    </p>
                  </div>

                  <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    
                    {/* Current Password */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
                        Current Password <span style={{ color: 'var(--red)' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={18} color="var(--ink-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          required
                          style={{
                            width: '100%',
                            padding: '12px 42px 12px 42px',
                            border: '1px solid var(--line)',
                            borderRadius: '10px',
                            fontSize: '0.94rem',
                            color: 'var(--ink)',
                            background: 'var(--panel)'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          style={{
                            position: 'absolute',
                            right: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--ink-muted)'
                          }}
                        >
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
                        New Password <span style={{ color: 'var(--red)' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <KeyRound size={18} color="var(--ink-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          required
                          minLength={6}
                          style={{
                            width: '100%',
                            padding: '12px 42px 12px 42px',
                            border: '1px solid var(--line)',
                            borderRadius: '10px',
                            fontSize: '0.94rem',
                            color: 'var(--ink)',
                            background: 'var(--panel)'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          style={{
                            position: 'absolute',
                            right: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--ink-muted)'
                          }}
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
                        Confirm New Password <span style={{ color: 'var(--red)' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <KeyRound size={18} color="var(--ink-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-type new password"
                          required
                          style={{
                            width: '100%',
                            padding: '12px 14px 12px 42px',
                            border: '1px solid var(--line)',
                            borderRadius: '10px',
                            fontSize: '0.94rem',
                            color: 'var(--ink)',
                            background: 'var(--panel)'
                          }}
                        />
                      </div>
                      {newPassword && confirmPassword && newPassword !== confirmPassword && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--red)', marginTop: '6px' }}>
                          Passwords do not match.
                        </p>
                      )}
                    </div>

                    {/* Password Strength / Tips */}
                    <div style={{
                      background: 'rgba(47, 74, 69, 0.04)',
                      border: '1px solid var(--line-subtle)',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      fontSize: '0.82rem',
                      color: 'var(--ink-muted)'
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                        Password security guidelines:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <li>Must be at least 6 characters in length</li>
                        <li>Recommended: Include a combination of letters, numbers, and symbols</li>
                        <li>Do not share your password with other family members (use Caregiver Invites instead)</li>
                      </ul>
                    </div>

                    {/* Submit Button */}
                    <div style={{ paddingTop: '12px', borderTop: '1px solid var(--line-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={passwordSaving}
                        className="btn btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 24px',
                          borderRadius: '10px',
                          fontWeight: 600,
                          fontSize: '0.94rem'
                        }}
                      >
                        <Lock size={16} />
                        {passwordSaving ? 'Updating Password...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: NOTIFICATION PREFERENCES */}
              {activeTab === 'notifications' && (
                <div style={{
                  background: 'var(--panel-elevated)',
                  border: '1px solid var(--line)',
                  borderRadius: '18px',
                  padding: '32px',
                  boxShadow: 'var(--card-shadow)'
                }}>
                  <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--line-subtle)', paddingBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px 0' }}>
                      Caregiver Notification & Alert Channels
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', margin: 0 }}>
                      Choose how and when you receive daily check-in call summaries, missed medicine alerts, and emergency notifications.
                    </p>
                  </div>

                  <form onSubmit={handleSaveNotifications} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Delivery Channels */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <label style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink)' }}>
                        Delivery Channels for Daily Summaries & Alerts
                      </label>

                      {/* WhatsApp */}
                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '16px',
                        borderRadius: '12px',
                        border: notifPrefs.whatsapp ? '1.5px solid var(--teal)' : '1px solid var(--line)',
                        background: notifPrefs.whatsapp ? 'rgba(47, 74, 69, 0.04)' : 'var(--panel)',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={notifPrefs.whatsapp}
                          onChange={(e) => setNotifPrefs({ ...notifPrefs, whatsapp: e.target.checked })}
                          style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--teal)' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--ink)' }}>
                            <MessageSquare size={16} color="#25D366" />
                            WhatsApp Instant Summaries (Recommended)
                          </div>
                          <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
                            Receive a brief WhatsApp message right after each call confirming if your parent took their medicine and how their mood was.
                          </p>
                        </div>
                      </label>

                      {/* SMS */}
                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '16px',
                        borderRadius: '12px',
                        border: notifPrefs.sms ? '1.5px solid var(--teal)' : '1px solid var(--line)',
                        background: notifPrefs.sms ? 'rgba(47, 74, 69, 0.04)' : 'var(--panel)',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={notifPrefs.sms}
                          onChange={(e) => setNotifPrefs({ ...notifPrefs, sms: e.target.checked })}
                          style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--teal)' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--ink)' }}>
                            <Smartphone size={16} color="var(--teal)" />
                            SMS Critical Alert Backup
                          </div>
                          <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
                            High-priority SMS dispatch if an unanswered call occurs or when WhatsApp is unreachable.
                          </p>
                        </div>
                      </label>

                      {/* Email */}
                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '16px',
                        borderRadius: '12px',
                        border: notifPrefs.email ? '1.5px solid var(--teal)' : '1px solid var(--line)',
                        background: notifPrefs.email ? 'rgba(47, 74, 69, 0.04)' : 'var(--panel)',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={notifPrefs.email}
                          onChange={(e) => setNotifPrefs({ ...notifPrefs, email: e.target.checked })}
                          style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--teal)' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--ink)' }}>
                            <Mail size={16} color="var(--teal)" />
                            Email Digests & Billing Invoices
                          </div>
                          <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
                            Weekly wellness reports, medication adherence graphs, and payment receipts sent to your inbox.
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Minimum Alert Sensitivity Level */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
                        Minimum Alert Notification Threshold
                      </label>
                      <select
                        value={notifPrefs.minimumAlertLevel}
                        onChange={(e) => setNotifPrefs({ ...notifPrefs, minimumAlertLevel: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid var(--line)',
                          borderRadius: '10px',
                          fontSize: '0.94rem',
                          color: 'var(--ink)',
                          background: 'var(--panel)',
                          cursor: 'pointer'
                        }}
                      >
                        <option value={1}>Level 1: All Calls (Routine Check-ins, Medicine Confirmed, & Wellness Summaries)</option>
                        <option value={2}>Level 2: Minor Concerns & Retries (Mild symptoms noted or 1st missed attempt)</option>
                        <option value={3}>Level 3: Significant Issues (Confirmed missed medication or unanswered 2nd call)</option>
                        <option value={4}>Level 4: Urgent Emergencies Only (Immediate SOS trigger)</option>
                      </select>
                      <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '6px' }}>
                        We recommend Level 1 so you stay fully informed of every daily check-in.
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div style={{ paddingTop: '12px', borderTop: '1px solid var(--line-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={notifSaving}
                        className="btn btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 24px',
                          borderRadius: '10px',
                          fontWeight: 600,
                          fontSize: '0.94rem'
                        }}
                      >
                        <Save size={16} />
                        {notifSaving ? 'Saving Preferences...' : 'Save Notification Preferences'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
