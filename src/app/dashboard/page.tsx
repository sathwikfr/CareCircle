'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { Medicine, FoodRelation, ExtractedMedicineCandidate, ParentProfile } from '@/lib/types';
import { Heart, Pause, Plus, ArrowRight, Sparkles, CheckCircle2, AlertTriangle, Info, X, Phone, Languages, CalendarClock } from 'lucide-react';
import { SAMPLE_PRESCRIPTIONS } from '@/lib/medicineExtractor';
import { formatScheduleSummary } from '@/lib/scheduleGenerator';
import { getEffectivePlan } from '@/lib/plans';
import {
  ParentDetails, Toast, computeCallStats, formatCallTime, initial, downloadFile, safeFileName
} from '@/components/dashboard/helpers';
import { OverviewPanel } from '@/components/dashboard/OverviewPanel';
import { TrendsPanel } from '@/components/dashboard/TrendsPanel';
import { CallHistoryPanel } from '@/components/dashboard/CallHistoryPanel';
import { MedicinesPanel } from '@/components/dashboard/MedicinesPanel';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { SettingsPanel } from '@/components/dashboard/SettingsPanel';
import { AddMedicineModal, PauseModal, InviteModal, DeleteParentModal, UploadReportModal } from '@/components/dashboard/DashboardModals';

type TabId = 'overview' | 'trends' | 'calls' | 'medicines' | 'alerts' | 'settings';

function DashboardContent() {
  const { user } = useAuth();

  const [parentsList, setParentsList] = useState<ParentProfile[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Detailed parent data state
  const [parentData, setParentData] = useState<ParentDetails | null>(null);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<Toast | null>(null);

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
  const [pauseReason, setPauseReason] = useState('');
  const [pauseDays, setPauseDays] = useState('7');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [caregiverName, setCaregiverName] = useState('');

  const [testCalling, setTestCalling] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toasts dismiss themselves after a few seconds.
  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(null), toastMessage.type === 'error' ? 8000 : 5000);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

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

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setExtractedMeds([]);
    setUploadFileName(null);
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
        setToastMessage({ text: `${currentParent.name}'s profile has been removed.`, type: 'info' });
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
    downloadFile(`carecircle_${safeFileName(currentParent.name)}_archive.txt`, report, 'text/plain');
  };

  if (loading) {
    return (
      <div className="wrap dash-page" aria-busy="true">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '28px' }}>
          <div className="skeleton" style={{ width: '56px', height: '56px', borderRadius: '18px' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: '220px', height: '28px', marginBottom: '10px' }} />
            <div className="skeleton" style={{ width: '320px', maxWidth: '100%', height: '14px' }} />
          </div>
        </div>
        <div className="panel-grid">
          <div className="skeleton" style={{ height: '280px', borderRadius: 'var(--r-xl)' }} />
          <div className="skeleton" style={{ height: '280px', borderRadius: 'var(--r-xl)' }} />
        </div>
      </div>
    );
  }

  // EMPTY STATE: NO PARENTS ADDED YET
  if (parentsList.length === 0) {
    return (
      <div className="wrap dash-page">
        <div className="panel empty" style={{ maxWidth: '560px', margin: '48px auto 0', padding: '56px 32px' }}>
          <span className="icon-tile gold"><Heart size={26} /></span>
          <h3 style={{ fontSize: '1.7rem', letterSpacing: '-0.02em' }}>
            {user?.name ? `Welcome, ${user.name.split(' ')[0]}` : 'Welcome to CareCircle'}
          </h3>
          <p style={{ marginBottom: '28px' }}>
            Add your parent, their medicines and the times that suit them. It takes a few minutes, and Saathi takes it from there.
          </p>
          <Link href="/onboarding" className="btn btn-primary btn-lg">
            Add your first parent <ArrowRight size={18} className="arrow" />
          </Link>
        </div>
      </div>
    );
  }

  const currentParent = parentData?.parent || parentsList.find(p => p.id === selectedParentId) || parentsList[0];
  const pendingSuggestion = parentData?.suggestions?.find(s => s.status === 'pending');
  const stats = computeCallStats(parentData?.callLogs || [], currentParent?.callSchedule || []);
  const { activeSlots, completedCalls } = stats;
  const dailyCallCap = getEffectivePlan(user?.subscription).callsPerDay;
  const dailyCallCapExceeded = activeSlots.length > dailyCallCap;
  const openAlerts = (parentData?.alerts || []).filter(a => a.status !== 'resolved' && a.level >= 2).length;

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
    downloadFile(`carecircle_${safeFileName(currentParent.name)}_calls.csv`, csv, 'text/csv');
  };

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Today' },
    { id: 'trends', label: 'Trends' },
    { id: 'calls', label: 'Calls' },
    { id: 'medicines', label: 'Medicines' },
    { id: 'alerts', label: 'Alerts', count: openAlerts },
    { id: 'settings', label: 'Settings' }
  ];

  const ToastIcon = toastMessage?.type === 'error' ? AlertTriangle : toastMessage?.type === 'info' ? Info : CheckCircle2;

  return (
    <div className="wrap dash-page">
      {/* TOAST */}
      <div className="toast-wrap" aria-live="polite">
        {toastMessage && (
          <div className={`toast ${toastMessage.type}`} role={toastMessage.type === 'error' ? 'alert' : 'status'}>
            <ToastIcon size={18} />
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* HEADER & PARENT SWITCHER */}
      <header className="dash-head">
        <div className="dash-who">
          <span className="parent-avatar" aria-hidden="true">{initial(currentParent.name)}</span>
          <div style={{ minWidth: 0 }}>
            <h1 className="dash-title">
              {currentParent.name}
              {currentParent.isPaused ? (
                <span className="badge badge-amber"><Pause size={12} /> Paused</span>
              ) : (
                <span className="badge badge-green"><span className="dot live" /> Active</span>
              )}
            </h1>
            <div className="dash-meta">
              <span><Phone size={14} /> {currentParent.phone}</span>
              <span><Languages size={14} /> {currentParent.language}</span>
              <span><CalendarClock size={14} /> {activeSlots.length > 0 ? formatScheduleSummary(activeSlots) : 'No calls scheduled'}</span>
            </div>
          </div>
        </div>

        <div className="parent-switch">
          {parentsList.length > 1 && (
            <div className="segmented" role="tablist" aria-label="Choose parent">
              {parentsList.map((p) => (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={p.id === selectedParentId}
                  className={p.id === selectedParentId ? 'active' : ''}
                  onClick={() => setSelectedParentId(p.id)}
                >
                  <span className="parent-avatar sm" aria-hidden="true">{initial(p.name)}</span>
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
          <Link href="/onboarding" className="btn btn-ghost btn-sm">
            <Plus size={15} /> Add parent
          </Link>
        </div>
      </header>

      {/* BANNERS */}
      {currentParent.isPaused && (
        <div className="banner amber" role="status">
          <Pause size={20} />
          <div>
            <strong>Calls are paused{currentParent.pauseReason ? `: ${currentParent.pauseReason}` : ''}</strong>
            <span>
              {currentParent.pauseUntil
                ? `They restart on ${new Date(currentParent.pauseUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`
                : 'They restart when you resume them.'}
            </span>
          </div>
          <button onClick={() => handleTogglePause(false)} className="btn btn-primary btn-sm">Resume now</button>
        </div>
      )}

      {dailyCallCapExceeded && (
        <div className="banner amber" role="status">
          <AlertTriangle size={20} />
          <div>
            <strong>Your plan includes {dailyCallCap} call{dailyCallCap === 1 ? '' : 's'} a day</strong>
            <span>
              {currentParent.name} has {activeSlots.length} scheduled, so only {activeSlots.slice(0, dailyCallCap).map(s => s.time).join(', ')} will be placed.
            </span>
          </div>
          <Link href="/account/billing" className="btn btn-ghost btn-sm">View plans</Link>
        </div>
      )}

      {pendingSuggestion && (
        <div className="banner gold">
          <span className="icon-tile gold"><Sparkles size={20} /></span>
          <div>
            <strong>{currentParent.name} usually picks up around {pendingSuggestion.suggestedTime}</strong>
            <span style={{ color: 'var(--ink-muted)' }}>
              {pendingSuggestion.reason} Based on {pendingSuggestion.sampleSize} calls; the current time is {pendingSuggestion.currentCallTime}.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleSuggestionAction(pendingSuggestion.id, 'accepted')} className="btn btn-primary btn-sm">
              Move to {pendingSuggestion.suggestedTime}
            </button>
            <button onClick={() => handleSuggestionAction(pendingSuggestion.id, 'dismissed')} className="btn btn-quiet btn-sm">
              Not now
            </button>
          </div>
        </div>
      )}

      {/* TABS */}
      <nav className="tabbar" role="tablist" aria-label="Dashboard sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className="tab"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {!!tab.count && <span className="count">{tab.count}</span>}
          </button>
        ))}
      </nav>

      <div key={`${currentParent.id}-${activeTab}`} className="animate-fade-in" role="tabpanel">
        {activeTab === 'overview' && (
          <OverviewPanel
            parent={currentParent}
            medicines={parentData?.medicines || []}
            stats={stats}
            testCalling={testCalling}
            onTestCall={handleTestCall}
            onPause={() => setShowPauseModal(true)}
            onResume={() => handleTogglePause(false)}
            onInvite={() => setShowInviteModal(true)}
            onAddMedicine={() => setShowAddMedModal(true)}
            onOpenMedicines={() => setActiveTab('medicines')}
          />
        )}

        {activeTab === 'trends' && (
          <TrendsPanel parentName={currentParent.name} stats={stats} onExport={handleExportCallHistory} />
        )}

        {activeTab === 'calls' && (
          <CallHistoryPanel parentName={currentParent.name} callLogs={parentData?.callLogs || []} onExport={handleExportCallHistory} />
        )}

        {activeTab === 'medicines' && (
          <MedicinesPanel
            parentName={currentParent.name}
            medicines={parentData?.medicines || []}
            onUpload={() => setShowUploadModal(true)}
            onAdd={() => setShowAddMedModal(true)}
            onToggle={handleToggleMed}
          />
        )}

        {activeTab === 'alerts' && <AlertsPanel parentName={currentParent.name} alerts={parentData?.alerts || []} />}

        {activeTab === 'settings' && (
          <SettingsPanel
            parent={currentParent}
            stats={stats}
            caregivers={parentData?.caregivers || []}
            contacts={parentData?.emergencyContacts || []}
            onPause={() => setShowPauseModal(true)}
            onResume={() => handleTogglePause(false)}
            onInvite={() => setShowInviteModal(true)}
            onDelete={() => setShowDeleteModal(true)}
          />
        )}
      </div>

      {/* MODALS */}
      <AddMedicineModal
        open={showAddMedModal}
        onClose={() => setShowAddMedModal(false)}
        parentName={currentParent.name}
        name={newMedName}
        setName={setNewMedName}
        dosage={newMedDosage}
        setDosage={setNewMedDosage}
        timing={newMedTiming}
        setTiming={setNewMedTiming}
        food={newMedFoodRelation}
        setFood={setNewMedFoodRelation}
        onSubmit={handleAddMedicineSubmit}
      />

      <PauseModal
        open={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        parentName={currentParent.name}
        reason={pauseReason}
        setReason={setPauseReason}
        days={pauseDays}
        setDays={setPauseDays}
        onConfirm={() => handleTogglePause(true)}
      />

      <InviteModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        parentName={currentParent.name}
        name={caregiverName}
        setName={setCaregiverName}
        email={caregiverEmail}
        setEmail={setCaregiverEmail}
        onSubmit={handleInviteCaregiver}
      />

      <DeleteParentModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        parentName={currentParent.name}
        phone={currentParent.phone}
        loading={deleteLoading}
        onExport={handleExportData}
        onConfirm={handleDeleteParent}
      />

      <UploadReportModal
        open={showUploadModal}
        onClose={closeUploadModal}
        parentName={currentParent.name}
        loading={uploadLoading}
        fileName={uploadFileName}
        meds={extractedMeds}
        setMeds={setExtractedMeds}
        onFile={handleDashboardFileUpload}
        onSample={handleDashboardSampleExtract}
        onReset={() => {
          setExtractedMeds([]);
          setUploadFileName(null);
        }}
        confirming={confirmingUpload}
        onConfirm={handleConfirmDashboardExtraction}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main id="main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<div className="wrap dash-page"><div className="skeleton" style={{ height: '320px' }} /></div>}>
          <DashboardContent />
        </Suspense>
      </main>
    </>
  );
}
