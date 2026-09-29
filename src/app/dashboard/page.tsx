'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import {
  ParentProfile,
  Medicine,
  EmergencyContact,
  CallLog,
  AlertRecord,
  ScheduleSuggestion,
  CaregiverInvite,
  NotificationPreferences,
  FoodRelation
} from '@/lib/types';
import {
  Heart,
  Phone,
  Pill,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  Settings,
  Bell,
  Play,
  Pause,
  Plus,
  ArrowRight,
  TrendingUp,
  Smile,
  Shield,
  Download,
  Trash2,
  X,
  ChevronDown,
  UploadCloud,
  FileText,
  RefreshCw
} from 'lucide-react';
import { ExtractedMedicineCandidate } from '@/lib/types';
import { SAMPLE_PRESCRIPTIONS } from '@/lib/medicineExtractor';
import { timeToMinutes, formatScheduleSummary } from '@/lib/scheduleGenerator';
import { getEffectivePlan } from '@/lib/plans';

function DashboardContent() {
  const { user } = useAuth();

  const [parentsList, setParentsList] = useState<ParentProfile[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'medicines' | 'trends' | 'alerts' | 'settings'>('overview');

  // Detailed parent data state
  const [parentData, setParentData] = useState<{
    parent: ParentProfile;
    medicines: Medicine[];
    emergencyContacts: EmergencyContact[];
    callLogs: CallLog[];
    alerts: AlertRecord[];
    suggestions: ScheduleSuggestion[];
    caregivers: CaregiverInvite[];
    notifPrefs: NotificationPreferences;
  } | null>(null);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Modal states
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('1 tablet');
  const [newMedTiming, setNewMedTiming] = useState<Medicine['timeOfDay']>('morning');
  const [newMedFoodRelation, setNewMedFoodRelation] = useState<FoodRelation>('after_food');

  // Prescription Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [extractedMeds, setExtractedMeds] = useState<ExtractedMedicineCandidate[]>([]);
  const [uploadReportId, setUploadReportId] = useState<string | null>(null);
  const [confirmingUpload, setConfirmingUpload] = useState(false);

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('Visiting family in Pune');
  const [pauseDays, setPauseDays] = useState('7');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [caregiverName, setCaregiverName] = useState('');

  const [testCalling, setTestCalling] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch list of parents
  const fetchParents = async () => {
    try {
      const res = await fetch('/api/parents');
      if (res.status === 401) {
        window.location.href = '/login?redirect=/dashboard';
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setParentsList(data.parents || []);
        if (data.parents && data.parents.length > 0 && !selectedParentId) {
          setSelectedParentId(data.parents[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load parents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParents();
  }, []);

  // Fetch specific parent details when selectedParentId changes
  const fetchParentDetails = async (id: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/parents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setParentData(data);
      }
    } catch (err) {
      console.error('Failed to load parent details:', err);
    }
  };

  useEffect(() => {
    if (selectedParentId) {
      fetchParentDetails(selectedParentId);
    }
  }, [selectedParentId]);

  // Handle Smart Call-time Suggestion
  const handleSuggestionAction = async (suggestionId: string, action: 'accepted' | 'dismissed') => {
    try {
      const res = await fetch(`/api/parents/${selectedParentId}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, action })
      });
      const data = await res.json();
      if (res.ok) {
        setToastMessage({ text: data.message, type: 'success' });
        fetchParentDetails(selectedParentId);
      }
    } catch {
      setToastMessage({ text: 'Failed to process suggestion', type: 'error' });
    }
  };

  // Handle Pause / Resume Calls
  const handleTogglePause = async (isPaused: boolean) => {
    try {
      const res = await fetch(`/api/parents/${selectedParentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isPaused ? 'pause' : 'resume',
          pauseReason: isPaused ? pauseReason : undefined,
          pauseUntil: isPaused ? new Date(Date.now() + Math.max(1, parseInt(pauseDays, 10) || 7) * 86400000).toISOString() : undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowPauseModal(false);
        setToastMessage({ text: data.message, type: 'info' });
        fetchParentDetails(selectedParentId);
        fetchParents();
      } else {
        setToastMessage({ text: data.error || 'Could not update calls', type: 'error' });
      }
    } catch {
      setToastMessage({ text: 'Error updating pause status', type: 'error' });
    }
  };

  // Add Medicine
  const handleAddMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;

    try {
      const res = await fetch(`/api/parents/${selectedParentId}/medicines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMedName.trim(),
          dosage: newMedDosage,
          timeOfDay: newMedTiming,
          foodRelation: newMedFoodRelation,
          frequency: 'daily'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddMedModal(false);
        setNewMedName('');
        setNewMedFoodRelation('after_food');
        const notes: string[] = data.scheduleNotes || [];
        setToastMessage({ text: ['Medicine added to the daily check-in routine.', ...notes].join(' '), type: 'success' });
        fetchParentDetails(selectedParentId);
        fetchParents();
      } else {
        setToastMessage({ text: data.error || 'Failed to add medicine', type: 'error' });
      }
    } catch {
      setToastMessage({ text: 'Failed to add medicine', type: 'error' });
    }
  };

  // Prescription Report Upload Handlers
  const handleDashboardFileUpload = async (file: File) => {
    if (!file || !selectedParentId) return;
    setUploadLoading(true);
    setUploadFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('parentId', selectedParentId);

      const res = await fetch(`/api/parents/${selectedParentId}/medicine-reports`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        setToastMessage({ text: data.error || 'Failed to extract medicines from report', type: 'error' });
        return;
      }

      setUploadReportId(data.reportId);
      setExtractedMeds(data.extractedMedicines.map((m: ExtractedMedicineCandidate) => ({ ...m, selected: true })));
    } catch {
      setToastMessage({ text: 'Network error while analyzing report', type: 'error' });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDashboardSampleExtract = async (sampleId: string) => {
    if (!selectedParentId) return;
    setUploadLoading(true);
    const sample = SAMPLE_PRESCRIPTIONS.find(s => s.id === sampleId);
    setUploadFileName(sample ? `${sample.title}.pdf` : 'Sample_Rx.pdf');

    try {
      const res = await fetch(`/api/parents/${selectedParentId}/medicine-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleId, parentId: selectedParentId })
      });

      const data = await res.json();
      if (!res.ok) {
        setToastMessage({ text: data.error || 'Failed to extract sample medicines', type: 'error' });
        return;
      }

      setUploadReportId(data.reportId);
      setExtractedMeds(data.extractedMedicines.map((m: ExtractedMedicineCandidate) => ({ ...m, selected: true })));
    } catch {
      setToastMessage({ text: 'Network error while analyzing sample', type: 'error' });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleConfirmDashboardExtraction = async () => {
    const selected = extractedMeds.filter(m => m.selected && m.name.trim());
    if (selected.length === 0 || !selectedParentId || !uploadReportId) {
      setToastMessage({ text: 'Please select at least one medicine row', type: 'error' });
      return;
    }

    setConfirmingUpload(true);
    try {
      const res = await fetch(`/api/parents/${selectedParentId}/medicine-reports/${uploadReportId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmedMedicines: selected.map(c => ({
            name: c.name,
            dosage: c.dosage,
            timeOfDay: c.timeOfDay,
            timingSlots: c.timingSlots && c.timingSlots.length > 0 ? c.timingSlots : [c.timeOfDay || 'morning'],
            foodRelation: c.foodRelation || 'not_specified',
            frequency: c.frequency || 'daily'
          }))
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowUploadModal(false);
        setExtractedMeds([]);
        setUploadFileName(null);
        const notes: string[] = data.scheduleNotes || [];
        setToastMessage({ text: [data.message || 'Medicines added to schedule!', ...notes].join(' '), type: 'success' });
        fetchParentDetails(selectedParentId);
        fetchParents();
      } else {
        setToastMessage({ text: data.error || 'Failed to confirm medicines', type: 'error' });
      }
    } catch {
      setToastMessage({ text: 'Network error confirming medicines', type: 'error' });
    } finally {
      setConfirmingUpload(false);
    }
  };

  // Toggle Medicine Active State
  const handleToggleMed = async (medId: string) => {
    try {
      await fetch(`/api/parents/${selectedParentId}/medicines`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineId: medId })
      });
      fetchParentDetails(selectedParentId);
    } catch {
      // safe fallback
    }
  };

  // Invite Caregiver
  const handleInviteCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caregiverEmail.includes('@')) return;

    try {
      const res = await fetch(`/api/parents/${selectedParentId}/caregivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: caregiverEmail, name: caregiverName, role: 'co_manager' })
      });
      const data = await res.json();
      if (res.ok) {
        setShowInviteModal(false);
        setCaregiverEmail('');
        setCaregiverName('');
        setToastMessage({ text: data.message, type: 'success' });
        fetchParentDetails(selectedParentId);
      } else {
        setToastMessage({ text: data.error || 'Failed to invite caregiver', type: 'error' });
      }
    } catch {
      setToastMessage({ text: 'Failed to invite caregiver', type: 'error' });
    }
  };

  // Test Call Trigger
  const handleTestCall = async () => {
    setTestCalling(true);
    try {
      const res = await fetch(`/api/parents/${selectedParentId}/test-call`, { method: 'POST' });
      const data = await res.json();
      setToastMessage({ text: data.message || data.error || 'Test call unavailable', type: res.ok ? 'success' : 'info' });
      fetchParentDetails(selectedParentId);
    } catch {
      setToastMessage({ text: 'Could not reach the server to place a test call.', type: 'error' });
    } finally {
      setTestCalling(false);
    }
  };

  // Handle Delete / Archive Parent Profile
  const handleDeleteParent = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/parents/${selectedParentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' })
      });
      const data = await res.json();
      if (res.ok) {
        setShowDeleteModal(false);
        setToastMessage({ text: `${currentParent.name}'s profile has been deleted.`, type: 'info' });
        const remaining = parentsList.filter(p => p.id !== selectedParentId);
        setParentsList(remaining);
        if (remaining.length > 0) {
          setSelectedParentId(remaining[0].id);
        } else {
          setSelectedParentId('');
          setParentData(null);
        }
      } else {
        setToastMessage({ text: data.error || 'Failed to delete parent', type: 'error' });
      }
    } catch {
      setToastMessage({ text: 'Failed to delete parent profile', type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Export Parent Data Archive before Deletion
  const handleExportData = () => {
    const report = `====================================================\nCARECIRCLE PARENT PROFILE ARCHIVE\n====================================================\nParent: ${currentParent.name}\nRelationship: ${currentParent.relationship}\nPhone: ${currentParent.phone}\nLanguage: ${currentParent.language}\nTimezone: ${currentParent.timezone}\nScheduled Call Time: ${currentParent.callTime}\nExport Date: ${new Date().toLocaleString()}\n\nMEDICINES TRACKED:\n${(parentData?.medicines || []).map(m => `- ${m.name} (${m.dosage}, ${m.timeOfDay})`).join('\n')}\n\nCALL HISTORY SUMMARY:\n${(parentData?.callLogs || []).map(c => `[${c.scheduledTime}] ${c.summary}`).join('\n')}\n====================================================\n`;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carecircle_${currentParent.name.replace(/[^a-zA-Z0-9]/g, '_')}_archive.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 20px' }}>
        <p style={{ fontSize: '1.1rem', color: 'var(--ink-muted)' }}>Loading family dashboard...</p>
      </div>
    );
  }

  // EMPTY STATE: NO PARENTS ADDED YET
  if (parentsList.length === 0) {
    return (
      <div className="wrap-checkout" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '540px', margin: '0 auto', padding: '48px 32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--teal-light)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Heart size={32} />
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>No parent profiles added yet</h2>
          <p style={{ fontSize: '0.94rem', color: 'var(--ink-muted)', marginBottom: '28px', lineHeight: 1.6 }}>
            Set up your parent&apos;s daily medicine routine and preferred morning call timing in 3 minutes.
          </p>
          <Link href="/onboarding" className="btn btn-primary btn-lg">
            Add Your First Parent Profile <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  const currentParent = parentData?.parent || parentsList.find(p => p.id === selectedParentId) || parentsList[0];
  const pendingSuggestion = parentData?.suggestions?.find(s => s.status === 'pending');

  // ---- Real call analytics (no demo numbers) ----
  const now = new Date();
  const callDate = (c: CallLog) => {
    const d = new Date(c.createdAt || c.scheduledTime);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const sameDay = (a: Date | null, b: Date) => !!a && a.toDateString() === b.toDateString();
  // Calls still being placed / waiting for a result are not outcomes yet.
  const completedCalls = (parentData?.callLogs || []).filter(c => c.status !== 'scheduled' && c.status !== 'placed');
  const latestToday = completedCalls.find(c => sameDay(callDate(c), now));
  const activeSlots = [...(currentParent?.callSchedule || [])]
    .filter(s => s.isActive)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const dailyCallCap = getEffectivePlan(user?.subscription).callsPerDay;
  const dailyCallCapExceeded = activeSlots.length > dailyCallCap;
  const nextSlot = activeSlots.find(s => timeToMinutes(s.time) > nowMinutes);
  const last30 = completedCalls.filter(c => {
    const d = callDate(c);
    return !!d && now.getTime() - d.getTime() <= 30 * 86400000;
  });
  const answered30 = last30.filter(c => c.status === 'answered');
  const reachabilityPct = last30.length ? Math.round((answered30.length / last30.length) * 100) : null;
  const adherencePct = answered30.length
    ? Math.round((answered30.filter(c => c.medicationConfirmed).length / answered30.length) * 100)
    : null;
  const moodCounts = answered30.reduce<Record<string, number>>((acc, c) => {
    acc[c.mood] = (acc[c.mood] || 0) + 1;
    return acc;
  }, {});
  const MOOD_LABELS: Record<string, string> = {
    cheerful: 'Cheerful',
    calm: 'Calm',
    neutral: 'Neutral',
    anxious: 'Anxious',
    unwell: 'Unwell'
  };
  const moodSummary = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([mood, count]) => `${Math.round((count / answered30.length) * 100)}% ${MOOD_LABELS[mood] || mood}`)
    .join(' · ');
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const calls = completedCalls.filter(c => sameDay(callDate(c), d));
    const answered = calls.filter(c => c.status === 'answered');
    const confirmed = answered.filter(c => c.medicationConfirmed);
    return {
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      total: calls.length,
      pct: calls.length ? Math.round((confirmed.length / calls.length) * 100) : 0,
      mood: answered[0]?.mood,
      concern: answered.some(c => c.mood === 'unwell' || c.mood === 'anxious') || answered.length < calls.length
    };
  });
  const formatCallTime = (value: string) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? value
      : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  };
  const handleExportCallHistory = () => {
    const rows = [
      ['Date', 'Status', 'Duration (s)', 'Medication confirmed', 'Mood', 'Summary'],
      ...completedCalls.map(c => [
        formatCallTime(c.createdAt || c.scheduledTime),
        c.status,
        String(c.durationSeconds),
        c.medicationConfirmed ? 'yes' : 'no',
        c.mood,
        c.summary.replace(/\s+/g, ' ')
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `carecircle_${currentParent.name.replace(/[^a-zA-Z0-9]/g, '_')}_calls.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="wrap-checkout" style={{ padding: '36px 20px 80px' }}>
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div
          className={`alert-box ${toastMessage.type === 'error' ? 'error' : 'success'}`}
          style={{ marginBottom: '20px', animation: 'fadeIn 0.2s ease' }}
        >
          {toastMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* TOP HEADER & PARENT SWITCHER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.3rem)' }}>
              {currentParent.name}
            </h1>
            {currentParent.isPaused ? (
              <span className="badge badge-gold">Calls Paused</span>
            ) : (
              <span className="badge badge-teal">Daily Active</span>
            )}
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginTop: '4px' }}>
            {currentParent.relationship} · {currentParent.phone} · <strong>{activeSlots.length > 0 ? formatScheduleSummary(activeSlots) : 'No calls scheduled'}</strong> ({currentParent.timezone})
          </p>
        </div>

        {/* PARENT SWITCHER TABS & ADD PARENT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: 'var(--panel)', padding: '4px', borderRadius: '12px', border: '1px solid var(--line)' }}>
            {parentsList.map((p) => {
              const isSelected = p.id === selectedParentId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedParentId(p.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSelected ? 'var(--panel-elevated)' : 'transparent',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.86rem',
                    color: isSelected ? 'var(--teal)' : 'var(--ink-muted)',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 1px 4px rgba(0, 0, 0, 0.05)' : 'none'
                  }}
                >
                  {p.name.split(' ')[0]}
                </button>
              );
            })}
          </div>

          <Link href="/onboarding" className="btn btn-ghost btn-sm" title="Add another parent profile">
            <Plus size={16} /> Add Parent
          </Link>
        </div>
      </div>

      {/* PAUSED BANNER (IF PARENT CALLS ARE TEMPORARILY PAUSED) */}
      {currentParent.isPaused && (
        <div className="alert-box warning" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Pause size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Calls are temporarily paused: {currentParent.pauseReason || 'Traveling'}</strong>
              <div style={{ fontSize: '0.82rem' }}>Automatic daily calls will resume once unpaused.</div>
            </div>
          </div>
          <button onClick={() => handleTogglePause(false)} className="btn btn-primary btn-sm">
            Resume Daily Calls
          </button>
        </div>
      )}

      {/* PLAN CALL CAP NOTICE */}
      {dailyCallCapExceeded && (
        <div className="alert-box warning" style={{ marginBottom: '24px' }}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Your plan includes {dailyCallCap} call{dailyCallCap === 1 ? '' : 's'} a day.</strong>
            <div style={{ fontSize: '0.82rem' }}>
              {currentParent.name} has {activeSlots.length} scheduled, so only the first {dailyCallCap} ({activeSlots
                .slice(0, dailyCallCap)
                .map(s => s.time)
                .join(', ')}) will be placed.{' '}
              <Link href="/account/billing" style={{ color: 'var(--teal)', fontWeight: 600 }}>View plans →</Link>
            </div>
          </div>
        </div>
      )}

      {/* 3. SMART CALL-TIME SUGGESTION CARD (THE FLAGSHIP INTELLIGENT FEATURE) */}
      {pendingSuggestion && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, var(--gold-soft), var(--panel-elevated))',
            borderColor: 'var(--gold)',
            marginBottom: '28px',
            boxShadow: '0 4px 16px rgba(201, 138, 58, 0.12)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--gold)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Sparkles size={22} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-gold">Smart Schedule Learning</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                  {pendingSuggestion.confidencePct}% Pickup Reliability Score · Based on {pendingSuggestion.sampleSize} past calls
                </span>
              </div>

              <h3 style={{ fontSize: '1.18rem', margin: '4px 0 8px', color: 'var(--ink)' }}>
                CareCircle noticed {currentParent.name} answers most reliably around{' '}
                <span style={{ color: 'var(--teal)', textDecoration: 'underline' }}>{pendingSuggestion.suggestedTime}</span>
              </h3>

              <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
                {pendingSuggestion.reason} The current call time is {pendingSuggestion.currentCallTime}. Would you like to update the schedule?
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleSuggestionAction(pendingSuggestion.id, 'accepted')}
                  className="btn btn-primary btn-sm"
                >
                  <CheckCircle2 size={15} /> Update Call Time to {pendingSuggestion.suggestedTime}
                </button>
                <button
                  onClick={() => handleSuggestionAction(pendingSuggestion.id, 'dismissed')}
                  className="btn btn-ghost btn-sm"
                >
                  Dismiss Suggestion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', marginBottom: '28px', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Overview & Today' },
          { id: 'trends', label: 'Monthly Trends & Adherence' },
          { id: 'calls', label: 'Call History Log' },
          { id: 'medicines', label: 'Medicines' },
          { id: 'alerts', label: 'Alerts Inbox' },
          { id: 'settings', label: 'Parent Settings' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--teal)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--teal)' : 'var(--ink-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          {/* TODAY'S STATUS CARD (from real call logs) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '28px' }}>
            <div className="card" style={{ background: 'var(--panel-elevated)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="badge badge-teal">Today&apos;s Status</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                  {now.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {latestToday ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: latestToday.status === 'answered' ? 'var(--green-soft)' : 'var(--gold-soft)',
                        color: latestToday.status === 'answered' ? 'var(--green)' : 'var(--gold-hover)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {latestToday.status === 'answered' ? <CheckCircle2 size={26} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
                        {latestToday.status === 'answered'
                          ? 'Check-in call completed'
                          : latestToday.status === 'busy'
                            ? 'Line was busy'
                            : 'Call not answered'}
                      </h3>
                      <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', margin: 0 }}>
                        {formatCallTime(latestToday.createdAt || latestToday.scheduledTime)}
                        {latestToday.durationSeconds > 0 &&
                          ` · Duration ${Math.floor(latestToday.durationSeconds / 60)}m ${latestToday.durationSeconds % 60}s`}
                      </p>
                    </div>
                  </div>

                  <div style={{ background: 'var(--panel)', padding: '16px', borderRadius: '12px', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '16px' }}>
                    <strong>Summary:</strong> {latestToday.summary}
                  </div>

                  {latestToday.status === 'answered' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ background: 'var(--teal-light)', padding: '10px', borderRadius: '8px', fontSize: '0.82rem' }}>
                        <div style={{ color: 'var(--ink-muted)' }}>Medication</div>
                        <strong style={{ color: latestToday.medicationConfirmed ? 'var(--teal-deep)' : 'var(--red)' }}>
                          {latestToday.medicationConfirmed ? '✓ Confirmed' : '✗ Not confirmed'}
                        </strong>
                      </div>
                      <div style={{ background: 'var(--green-soft)', padding: '10px', borderRadius: '8px', fontSize: '0.82rem' }}>
                        <div style={{ color: 'var(--ink-muted)' }}>Mood / Wellness</div>
                        <strong style={{ color: 'var(--green)' }}>{MOOD_LABELS[latestToday.mood] || latestToday.mood}</strong>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--panel)',
                      color: 'var(--ink-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', margin: 0 }}>No check-in call yet today</h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', margin: 0 }}>
                      {currentParent.isPaused
                        ? 'Calls are paused.'
                        : nextSlot
                          ? `Next scheduled call: ${nextSlot.time} (${nextSlot.label}).`
                          : activeSlots.length > 0
                            ? `Next scheduled call: tomorrow at ${activeSlots[0].time}.`
                            : 'No call times are set up yet.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK ACTIONS & LIVE TEST CALL */}
            <div className="card">
              <h3 style={{ fontSize: '1.25rem', marginBottom: '14px' }}>Assistant Quick Actions</h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)', marginBottom: '20px' }}>
                Verify natural regional voice response or pause calls temporarily when {currentParent.name} is traveling.
              </p>

              <div style={{ display: 'grid', gap: '12px' }}>
                <button
                  onClick={handleTestCall}
                  disabled={testCalling}
                  className="btn btn-ghost btn-block"
                  style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
                >
                  <Play size={16} fill="currentColor" color="var(--teal)" />
                  <span>{testCalling ? 'Dialing test call...' : `Send 1-Time Test Call to ${currentParent.phone}`}</span>
                </button>

                {currentParent.isPaused ? (
                  <button
                    onClick={() => handleTogglePause(false)}
                    className="btn btn-ghost btn-block"
                    style={{ justifyContent: 'flex-start', padding: '12px 16px', color: 'var(--green)' }}
                  >
                    <Play size={16} /> Resume Scheduled Daily Calls
                  </button>
                ) : (
                  <button
                    onClick={() => setShowPauseModal(true)}
                    className="btn btn-ghost btn-block"
                    style={{ justifyContent: 'flex-start', padding: '12px 16px', color: 'var(--gold-hover)' }}
                  >
                    <Pause size={16} /> Pause Calls Temporarily (Travel / Illness)
                  </button>
                )}

                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn btn-ghost btn-block"
                  style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
                >
                  <Users size={16} color="var(--teal)" /> Invite Sibling / Co-Caregiver
                </button>
              </div>
            </div>
          </div>

          {/* MEDICINES QUICK VIEW */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Active Daily Medications</h3>
              <button onClick={() => setShowAddMedModal(true)} className="btn btn-ghost btn-sm">
                <Plus size={14} /> Add Medicine
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              {parentData?.medicines?.map((m) => (
                <div key={m.id} style={{ background: 'var(--panel)', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.96rem' }}>{m.name}</strong>
                    <span className={`badge ${m.isActive ? 'badge-green' : 'badge-gold'}`}>
                      {m.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>{m.dosage}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--teal)', fontWeight: 600, textTransform: 'capitalize' }}>
                      ● {m.timeOfDay} check-in
                    </span>
                    {m.foodRelation && m.foodRelation !== 'not_specified' && (
                      <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 6px', background: m.foodRelation === 'before_food' ? '#fef3c7' : '#eaf1ef', color: m.foodRelation === 'before_food' ? '#92400e' : 'var(--teal-deep)' }}>
                        {m.foodRelation === 'before_food' ? 'Before food' : m.foodRelation === 'after_food' ? 'After food' : 'With food'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY TRENDS & SUMMARY VIEW (JUSTIFIES ₹399/MO PRICE) */}
      {activeTab === 'trends' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '6px' }}>
              Monthly Care & Health Trend Report
            </h2>
            <p style={{ fontSize: '0.94rem', color: 'var(--ink-muted)' }}>
              Synthesized from daily conversations. Identifies medication adherence, energy patterns, and missed calls over time.
            </p>
          </div>

          {completedCalls.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
              <TrendingUp size={28} color="var(--teal)" />
              <h3 style={{ fontSize: '1.2rem', margin: '12px 0 6px' }}>No trends yet</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', maxWidth: '46ch', margin: '0 auto' }}>
                Adherence, mood and reachability trends will appear here after {currentParent.name}&apos;s first check-in calls.
              </p>
            </div>
          ) : (
            <>
              {/* METRIC CARDS (last 30 days) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                <div className="card" style={{ padding: '24px' }}>
                  <span className="badge badge-teal" style={{ marginBottom: '10px' }}>Medication Adherence</span>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.8rem', fontWeight: 600, color: 'var(--teal)', margin: '8px 0' }}>
                    {adherencePct === null ? '—' : `${adherencePct}%`}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                    {answered30.filter(c => c.medicationConfirmed).length} of {answered30.length} answered calls confirmed medicines (last 30 days).
                  </p>
                </div>

                <div className="card" style={{ padding: '24px' }}>
                  <span className="badge badge-gold" style={{ marginBottom: '10px' }}>Mood</span>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--gold)', margin: '8px 0' }}>
                    {moodSummary || '—'}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>From {answered30.length} answered calls in the last 30 days.</p>
                </div>

                <div className="card" style={{ padding: '24px' }}>
                  <span className="badge badge-green" style={{ marginBottom: '10px' }}>Reachability</span>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.8rem', fontWeight: 600, color: 'var(--green)', margin: '8px 0' }}>
                    {reachabilityPct === null ? '—' : `${reachabilityPct}%`}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                    {answered30.length} of {last30.length} calls answered (last 30 days).
                  </p>
                </div>
              </div>

              {/* LAST 7 DAYS */}
              <div className="card" style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Last 7 days: calls with medicines confirmed</h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '12px',
                    alignItems: 'end',
                    minHeight: '160px',
                    padding: '10px 0 20px',
                    borderBottom: '1px solid var(--line-subtle)'
                  }}
                >
                  {last7Days.map((bar, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--ink-muted)' }}>{bar.total ? `${bar.pct}%` : '—'}</span>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '48px',
                          height: `${bar.total ? Math.max(bar.pct, 4) * 1.2 : 0}px`,
                          background: bar.concern ? 'var(--gold)' : 'var(--teal)',
                          borderRadius: '8px 8px 0 0',
                          transition: 'height 0.4s ease'
                        }}
                      />
                      <strong style={{ fontSize: '0.82rem' }}>{bar.day}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)' }}>
                        {bar.total ? (bar.mood ? MOOD_LABELS[bar.mood] || bar.mood : 'No answer') : 'No call'}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '16px',
                    fontSize: '0.84rem',
                    color: 'var(--ink-muted)',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <span>Teal: all good · Gold: missed call or mood concern</span>
                  <button onClick={handleExportCallHistory} className="btn btn-ghost btn-sm">
                    <Download size={14} /> Download call history (CSV)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: CALL HISTORY LOG */}
      {activeTab === 'calls' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.3rem' }}>Past Telephone Call Logs</h3>
            <span style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
              Showing {parentData?.callLogs?.length || 0} recorded check-ins
            </span>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            {parentData?.callLogs?.map((call) => (
              <div
                key={call.id}
                style={{
                  background: 'var(--panel)',
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1px solid var(--line)',
                  display: 'grid',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-teal">{formatCallTime(call.createdAt || call.scheduledTime)}</span>
                    <span className={`badge ${call.status === 'answered' ? 'badge-green' : 'badge-gold'}`} style={{ textTransform: 'capitalize' }}>
                      {call.status === 'placed' ? 'In progress' : call.status}
                    </span>
                    {call.attemptNumber && call.attemptNumber > 1 && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Attempt {call.attemptNumber}</span>
                    )}
                    {call.actualAnswerTime && (
                      <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>Pickup: {call.actualAnswerTime}</span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--teal)' }}>
                    Duration: {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                  </span>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--ink)', margin: '4px 0' }}>
                  {call.summary}
                </p>

                {call.notes && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                    Note: {call.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MEDICINES */}
      {activeTab === 'medicines' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Medication Schedule for {currentParent.name}</h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)', margin: 0 }}>
                CareCircle prompts for these tablets at the designated time of day.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <UploadCloud size={16} /> Upload Prescription Report
              </button>
              <button onClick={() => setShowAddMedModal(true)} className="btn btn-primary btn-sm">
                <Plus size={16} /> Add Manually
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {parentData?.medicines?.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--panel)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--line)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '1.05rem' }}>{m.name}</strong>
                    <span className="badge badge-teal" style={{ textTransform: 'capitalize' }}>
                      {m.timeOfDay}
                    </span>
                    {m.foodRelation && m.foodRelation !== 'not_specified' && (
                      <span className="badge" style={{ fontSize: '0.72rem', background: m.foodRelation === 'before_food' ? '#fef3c7' : '#eaf1ef', color: m.foodRelation === 'before_food' ? '#92400e' : 'var(--teal-deep)' }}>
                        {m.foodRelation === 'before_food' ? 'Before food' : m.foodRelation === 'after_food' ? 'After food' : 'With food'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', marginTop: '4px' }}>
                    Dosage: {m.dosage} · {m.frequency}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleMed(m.id)}
                  className={`btn btn-sm ${m.isActive ? 'btn-ghost' : 'btn-primary'}`}
                >
                  {m.isActive ? 'Pause Tablet' : 'Activate Tablet'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ALERTS INBOX */}
      {activeTab === 'alerts' && (
        <div className="card">
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '6px' }}>Caregiver Alerts Inbox</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)' }}>
              Alerts raised from {currentParent.name}&apos;s check-in calls (Level 1–4). Level 2 and above are also emailed to you.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            {parentData?.alerts?.map((alt) => (
              <div
                key={alt.id}
                style={{
                  background: alt.level >= 2 ? 'var(--gold-soft)' : 'var(--panel)',
                  border: alt.level >= 2 ? '1px solid var(--gold)' : '1px solid var(--line)',
                  padding: '18px',
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${alt.level >= 2 ? 'badge-gold' : 'badge-teal'}`}>
                      Level {alt.level} Alert
                    </span>
                    <strong style={{ fontSize: '0.94rem' }}>{alt.title}</strong>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{formatCallTime(alt.createdAt || alt.timestamp)}</span>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--ink)', margin: 0 }}>
                  {alt.message}
                </p>
                <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  {alt.level >= 2 ? 'Emailed to you · ' : ''}Status: {alt.status.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS FOR THIS PARENT */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Routine & Call Preferences</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Scheduled Calls</label>
                <input
                  type="text"
                  value={activeSlots.length > 0 ? formatScheduleSummary(activeSlots) : 'No calls scheduled'}
                  disabled
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Language</label>
                <input
                  type="text"
                  value={currentParent.language}
                  disabled
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Timezone</label>
                <input
                  type="text"
                  value={currentParent.timezone}
                  disabled
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowPauseModal(true)} className="btn btn-ghost">
                <Pause size={16} /> Pause Daily Calls
              </button>
            </div>
          </div>

          {/* MULTI-CAREGIVER SHARING */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Shared Caregivers & Siblings</h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)', margin: 0 }}>
                  Family members who receive concurrent WhatsApp summaries for {currentParent.name}.
                </p>
              </div>
              <button onClick={() => setShowInviteModal(true)} className="btn btn-ghost btn-sm">
                <Plus size={14} /> Invite Sibling
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {parentData?.caregivers?.map((cg) => (
                <div key={cg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel)', padding: '12px 16px', borderRadius: '10px' }}>
                  <div>
                    <strong>{cg.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{cg.email} · {cg.role}</div>
                  </div>
                  <span className="badge badge-teal">{cg.status}</span>
                </div>
              ))}
            </div>

            {/* DANGER ZONE: DELETE PARENT PROFILE */}
            <div className="card" style={{ borderColor: '#fca5a5', background: 'var(--red-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--red)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trash2 size={18} /> Danger Zone: Delete Parent Profile
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)', maxWidth: '52ch' }}>
                    Permanently cancels daily check-in calls and medicine tracking for {currentParent.name}. You can download an export archive of their past health history before removing.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn-danger btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={14} /> Delete Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD MEDICINE */}
      {showAddMedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
            <button onClick={() => setShowAddMedModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', marginBottom: '8px' }}>Add Medicine for {currentParent.name}</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: '20px' }}>
              CareCircle will verify this medicine during daily telephone check-ins.
            </p>

            <form onSubmit={handleAddMedicineSubmit}>
              <div className="form-group">
                <label className="form-label">Medicine Name</label>
                <input
                  type="text"
                  placeholder="e.g. Amlodipine, Glycomet, Thyronorm"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dosage Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. 5mg with breakfast"
                  value={newMedDosage}
                  onChange={(e) => setNewMedDosage(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Time of Day</label>
                <select
                  value={newMedTiming}
                  onChange={(e) => setNewMedTiming(e.target.value as any)}
                  className="form-input"
                >
                  <option value="morning">Morning (Breakfast)</option>
                  <option value="afternoon">Afternoon (Lunch)</option>
                  <option value="evening">Evening (Dinner)</option>
                  <option value="bedtime">Bedtime</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Relationship to Food</label>
                <select
                  value={newMedFoodRelation}
                  onChange={(e) => setNewMedFoodRelation(e.target.value as FoodRelation)}
                  className="form-input"
                >
                  <option value="after_food">After Food / After Meal (Standard)</option>
                  <option value="before_food">Before Food / Empty Stomach</option>
                  <option value="with_food">With Food / During Meal</option>
                  <option value="not_specified">Not Specified / Bedtime / Anytime</option>
                </select>
                <span className="form-hint">CareCircle tailors reminder call timing and conversation questions according to this.</span>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '16px' }}>
                Save Medicine Routine
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PAUSE CALLS TEMPORARILY */}
      {showPauseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
            <button onClick={() => setShowPauseModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', marginBottom: '8px' }}>Pause Daily Calls for {currentParent.name}</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: '20px' }}>
              Temporarily silence calls while parent is traveling, visiting family, or in medical care.
            </p>

            <div className="form-group">
              <label className="form-label">Reason for Pausing</label>
              <input
                type="text"
                placeholder="e.g. Visiting grandchildren in Pune, Hospital checkup"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pause Duration</label>
              <select
                value={pauseDays}
                onChange={(e) => setPauseDays(e.target.value)}
                className="form-input"
              >
                <option value="3">3 Days</option>
                <option value="7">7 Days (1 Week)</option>
                <option value="14">14 Days (2 Weeks)</option>
                <option value="30">Until I manually resume</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setShowPauseModal(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button onClick={() => handleTogglePause(true)} className="btn btn-primary" style={{ flex: 1 }}>
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: INVITE CAREGIVER */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
            <button onClick={() => setShowInviteModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', marginBottom: '8px' }}>Invite Sibling or Caregiver</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: '20px' }}>
              They will receive WhatsApp summaries and can view {currentParent.name}&apos;s dashboard.
            </p>

            <form onSubmit={handleInviteCaregiver}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Priya Rao"
                  value={caregiverName}
                  onChange={(e) => setCaregiverName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  placeholder="priya@example.com"
                  value={caregiverEmail}
                  onChange={(e) => setCaregiverEmail(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '16px' }}>
                Send Dashboard Invitation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE PARENT CONFIRMATION */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
            <button onClick={() => setShowDeleteModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: '1.35rem', marginBottom: '8px', color: 'var(--ink)' }}>
              Delete {currentParent.name}&apos;s profile?
            </h3>

            <div style={{ background: 'var(--panel)', padding: '14px', borderRadius: '10px', fontSize: '0.86rem', color: 'var(--ink-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
              ⚠️ <strong>Important Notice:</strong> Scheduled daily telephone calls to {currentParent.phone} will be cancelled immediately. In accordance with healthcare privacy standards, past logs will be archived for 30 days.
            </div>

            <div style={{ marginBottom: '20px' }}>
              <button
                type="button"
                onClick={handleExportData}
                className="btn btn-ghost btn-block btn-sm"
                style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Download size={14} /> Download Health & Call Log Archive (.txt)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button
                onClick={handleDeleteParent}
                disabled={deleteLoading}
                className="btn btn-danger"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: UPLOAD PRESCRIPTION REPORT */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button
              onClick={() => {
                setShowUploadModal(false);
                setExtractedMeds([]);
                setUploadFileName(null);
              }}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-teal" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> AI Prescription Scanner
              </span>
            </div>

            <h3 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>Upload Medical Report for {currentParent.name}</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: '20px' }}>
              Upload a prescription or discharge summary. AI will extract candidates into an editable draft list for your explicit review.
            </p>

            {/* LOADING STATE */}
            {uploadLoading && (
              <div style={{ background: 'var(--panel)', padding: '36px 20px', borderRadius: '16px', textAlign: 'center', margin: '20px 0' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--teal-light)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', animation: 'spin 2s linear infinite' }}>
                  <RefreshCw size={24} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>Analyzing prescription document...</div>
                <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', margin: 0 }}>Extracting medicine names, dosages and timing instructions</p>
              </div>
            )}

            {/* DROPZONE */}
            {!uploadLoading && extractedMeds.length === 0 && (
              <div>
                <div
                  style={{
                    border: '2px dashed var(--teal)',
                    background: 'var(--teal-light)',
                    borderRadius: '16px',
                    padding: '30px 20px',
                    textAlign: 'center',
                    marginBottom: '20px',
                    position: 'relative'
                  }}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,text/plain"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDashboardFileUpload(file);
                    }}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                  />
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--teal)' }}>
                    <UploadCloud size={24} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--teal-deep)', marginBottom: '4px' }}>
                    Click or Drag & Drop Prescription / Report
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                    JPG, PNG or WebP photo (Prescription, Discharge Summary, Pharmacy Bill)
                  </div>
                </div>

                <div style={{ background: 'var(--panel)', padding: '14px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} color="var(--teal)" /> Test with a sample prescription:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {SAMPLE_PRESCRIPTIONS.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => handleDashboardSampleExtract(sample.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px', textAlign: 'left' }}
                      >
                        <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{sample.title}</span>
                        <span className="badge badge-teal" style={{ fontSize: '0.7rem' }}>Test Extract</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* DRAFT REVIEW LIST */}
            {!uploadLoading && extractedMeds.length > 0 && (
              <div>
                <div style={{ background: 'var(--teal-light)', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.84rem', color: 'var(--teal-deep)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>✨ <strong>{extractedMeds.length} candidate medicines</strong> detected in {uploadFileName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setExtractedMeds([]);
                      setUploadFileName(null);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Upload another
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '360px', overflowY: 'auto' }}>
                  {extractedMeds.map((med, idx) => (
                    <div
                      key={med.id || idx}
                      style={{
                        background: med.selected ? '#fff' : 'var(--panel)',
                        border: med.selected ? '1px solid var(--teal)' : '1px solid var(--line)',
                        borderRadius: '12px',
                        padding: '12px',
                        opacity: med.selected ? 1 : 0.6
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={med.selected}
                            onChange={() => {
                              const updated = [...extractedMeds];
                              updated[idx].selected = !updated[idx].selected;
                              setExtractedMeds(updated);
                            }}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--teal)' }}
                          />
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: med.selected ? 'var(--teal-deep)' : 'var(--ink-muted)' }}>
                            Row #{idx + 1} {med.selected ? '(Selected)' : '(Discarded)'}
                          </span>
                        </label>

                        {med.confidence === 'low' && (
                          <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                            ⚠️ Double check
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1.4fr 1.2fr', gap: '8px', alignItems: 'start' }}>
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) => {
                            const updated = [...extractedMeds];
                            updated[idx].name = e.target.value;
                            setExtractedMeds(updated);
                          }}
                          className="form-input"
                          placeholder="Medicine name"
                          style={{ fontSize: '0.85rem', padding: '6px 8px' }}
                        />
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => {
                            const updated = [...extractedMeds];
                            updated[idx].dosage = e.target.value;
                            setExtractedMeds(updated);
                          }}
                          className="form-input"
                          placeholder="Dosage"
                          style={{ fontSize: '0.85rem', padding: '6px 8px' }}
                        />
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                          {[
                            { slot: 'morning' as const, label: 'Morn' },
                            { slot: 'afternoon' as const, label: 'Noon' },
                            { slot: 'evening' as const, label: 'Eve' },
                            { slot: 'bedtime' as const, label: 'Night' },
                            { slot: 'as_needed' as const, label: 'SOS' }
                          ].map((opt) => {
                            const isSelected = med.timingSlots?.includes(opt.slot) || (opt.slot === med.timeOfDay && (!med.timingSlots || med.timingSlots.length === 0));
                            return (
                              <button
                                key={opt.slot}
                                type="button"
                                onClick={() => {
                                  const updated = [...extractedMeds];
                                  const cur = updated[idx].timingSlots && updated[idx].timingSlots!.length > 0 ? updated[idx].timingSlots! : [updated[idx].timeOfDay || 'morning'];
                                  let nextSlots: any[];
                                  if (opt.slot === 'as_needed') {
                                    nextSlots = cur.includes('as_needed') ? ['morning'] : ['as_needed'];
                                  } else {
                                    const without = cur.filter(s => s !== 'as_needed');
                                    if (without.includes(opt.slot)) {
                                      nextSlots = without.filter(s => s !== opt.slot);
                                      if (nextSlots.length === 0) nextSlots = ['morning'];
                                    } else {
                                      nextSlots = [...without, opt.slot];
                                    }
                                  }
                                  updated[idx].timingSlots = nextSlots;
                                  updated[idx].timeOfDay = nextSlots.includes('morning') ? 'morning' : (nextSlots[0] === 'as_needed' ? 'morning' : nextSlots[0]);
                                  setExtractedMeds(updated);
                                }}
                                style={{
                                  padding: '4px 6px',
                                  borderRadius: '5px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: isSelected ? '1px solid var(--teal)' : '1px solid var(--line)',
                                  background: isSelected
                                    ? (opt.slot === 'as_needed' ? '#fef3c7' : 'var(--teal)')
                                    : '#fff',
                                  color: isSelected
                                    ? (opt.slot === 'as_needed' ? '#92400e' : '#fff')
                                    : 'var(--ink-muted)'
                                }}
                              >
                                {isSelected ? '✓ ' : '+ '}{opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                          {[
                            { val: 'before_food' as const, label: 'Before' },
                            { val: 'after_food' as const, label: 'After' },
                            { val: 'with_food' as const, label: 'With' },
                            { val: 'not_specified' as const, label: 'N/A' }
                          ].map((opt) => {
                            const isSelected = med.foodRelation === opt.val || (!med.foodRelation && opt.val === 'not_specified');
                            return (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => {
                                  const updated = [...extractedMeds];
                                  updated[idx].foodRelation = opt.val;
                                  setExtractedMeds(updated);
                                }}
                                style={{
                                  padding: '4px 6px',
                                  borderRadius: '5px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: isSelected ? '1px solid var(--teal)' : '1px solid var(--line)',
                                  background: isSelected
                                    ? (opt.val === 'before_food' ? '#fef3c7' : 'var(--teal-light)')
                                    : '#fff',
                                  color: isSelected
                                    ? (opt.val === 'before_food' ? '#92400e' : 'var(--teal-deep)')
                                    : 'var(--ink-muted)'
                                }}
                              >
                                {isSelected ? '✓ ' : ''}{opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setExtractedMeds([]);
                    }}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDashboardExtraction}
                    disabled={confirmingUpload || extractedMeds.filter(m => m.selected && m.name.trim()).length === 0}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {confirmingUpload ? 'Saving to schedule...' : `Confirm & Add ${extractedMeds.filter(m => m.selected && m.name.trim()).length} Medicines`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px' }}>Loading CareCircle dashboard...</div>}>
          <DashboardContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
