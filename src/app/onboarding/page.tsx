'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { getEffectivePlan } from '@/lib/plans';
import { Medicine, EmergencyContact, MedicineTimingSlot, ExtractedMedicineCandidate, ScheduledCallSlot, FoodRelation } from '@/lib/types';
import {
  Heart,
  Pill,
  Clock,
  PhoneCall,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Volume2,
  AlertCircle,
  Play,
  UserPlus,
  UploadCloud,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckSquare,
  Square,
  RefreshCw,
  HelpCircle,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Check,
  Utensils
} from 'lucide-react';
import { SAMPLE_PRESCRIPTIONS } from '@/lib/medicineExtractor';
import {
  generateProposedSchedule,
  formatScheduleSummary,
  DEFAULT_SLOT_TIMES,
  SLOT_DISPLAY_NAMES,
  getSelectableCallTimes
} from '@/lib/scheduleGenerator';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const currentPlan = getEffectivePlan(user?.subscription);

  // Step state (1 to 6)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1: Parent Info
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Mother');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('Hindi & English');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)');

  // Step 2: Medicines State
  const [hasMedicines, setHasMedicines] = useState<boolean | null>(null);
  const [medicineEntryMode, setMedicineEntryMode] = useState<'choice' | 'upload' | 'manual'>('choice');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('Analyzing medical report...');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedReportId, setUploadedReportId] = useState<string | null>(null);
  const [extractedCandidates, setExtractedCandidates] = useState<ExtractedMedicineCandidate[]>([]);
  const [batchConfidence, setBatchConfidence] = useState<'high' | 'medium' | 'low'>('high');
  const [batchQualityWarning, setBatchQualityWarning] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const [medicines, setMedicines] = useState<Array<{
    name: string;
    dosage: string;
    timeOfDay: Medicine['timeOfDay'];
    timingSlots?: MedicineTimingSlot[];
    foodRelation?: FoodRelation;
    frequency: Medicine['frequency'];
  }>>([
    { name: '', dosage: '1 tablet after breakfast', timeOfDay: 'morning', timingSlots: ['morning'], foodRelation: 'after_food', frequency: 'daily' }
  ]);

  // Step 3: Call Schedule & Roadmap (Auto-generated from confirmed medicines)
  const [callTime, setCallTime] = useState('08:15 AM');
  const [callSchedule, setCallSchedule] = useState<ScheduledCallSlot[]>([]);
  const [unspecifiedMeds, setUnspecifiedMeds] = useState<Array<{ name: string; dosage?: string; index: number }>>([]);

  // Step 4: Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState<Array<{ name: string; relation: string; phone: string; priority: 'primary' | 'secondary' }>>([
    { name: user?.name || '', relation: 'Son / Primary Caregiver', phone: user?.phone || '', priority: 'primary' }
  ]);

  // Step 5: Consent
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  // Step 6: Confirmation & Test Call State
  const [createdParentId, setCreatedParentId] = useState<string>('');
  const [testCalling, setTestCalling] = useState(false);
  const [testCallResult, setTestCallResult] = useState<{ ok: boolean; message: string } | null>(null);

  // --------------------------------------------------------------------------
  // MEDICINE REPORT EXTRACTION HANDLERS
  // --------------------------------------------------------------------------
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploadLoading(true);
    setExtractionError(null);
    setUploadedFileName(file.name);
    setUploadProgressText('Uploading document & reading prescription...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setTimeout(() => setUploadProgressText('Running medical OCR & entity recognition...'), 700);
      setTimeout(() => setUploadProgressText('Matching candidate medications & dosages...'), 1400);

      const res = await fetch('/api/medicine-reports/extract', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        setExtractionError(data.error || 'Failed to extract medicines from the uploaded report.');
        return;
      }

      setUploadedReportId(data.reportId);
      setBatchConfidence(data.batchConfidence || 'high');
      setBatchQualityWarning(data.batchQualityWarning || null);
      setExtractedCandidates(
        data.extractedMedicines.map((m: ExtractedMedicineCandidate) => ({
          ...m,
          selected: m.selected !== undefined ? m.selected : (m.confidence !== 'low'),
          verifiedByUser: m.confidence === 'high'
        }))
      );
    } catch {
      setExtractionError('Network error while processing report. You can enter medicines manually.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSampleExtract = async (sampleId: string) => {
    setUploadLoading(true);
    setExtractionError(null);
    const sample = SAMPLE_PRESCRIPTIONS.find(s => s.id === sampleId);
    setUploadedFileName(sample ? `${sample.title}.pdf` : 'Sample_Prescription.pdf');
    setUploadProgressText('Analyzing clinical record with medical vision...');

    try {
      setTimeout(() => setUploadProgressText('Extracting candidate medications, dosages & timings...'), 600);

      const res = await fetch('/api/medicine-reports/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samplePreset: sampleId })
      });

      const data = await res.json();
      if (!res.ok) {
        setExtractionError(data.error || 'Failed to extract sample medicines.');
        return;
      }

      setUploadedReportId(data.reportId);
      setBatchConfidence(data.batchConfidence || 'high');
      setBatchQualityWarning(data.batchQualityWarning || null);
      setExtractedCandidates(
        data.extractedMedicines.map((m: ExtractedMedicineCandidate) => ({
          ...m,
          selected: m.selected !== undefined ? m.selected : (m.confidence !== 'low'),
          verifiedByUser: m.confidence === 'high'
        }))
      );
    } catch {
      setExtractionError('Network error while processing sample report.');
    } finally {
      setUploadLoading(false);
    }
  };

  const toggleCandidateSelection = (index: number) => {
    const updated = [...extractedCandidates];
    updated[index].selected = !updated[index].selected;
    updated[index].verifiedByUser = true;
    setExtractedCandidates(updated);
  };

  const updateCandidateField = (index: number, field: keyof ExtractedMedicineCandidate, value: string) => {
    const updated = [...extractedCandidates];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[index] as any)[field] = value;
    updated[index].verifiedByUser = true;
    updated[index].isEditedByUser = true;
    setExtractedCandidates(updated);
  };

  const toggleCandidateSlot = (index: number, slot: MedicineTimingSlot) => {
    const updated = [...extractedCandidates];
    const item = updated[index];
    const currentSlots: MedicineTimingSlot[] = item.timingSlots && item.timingSlots.length > 0
      ? [...item.timingSlots]
      : [item.timeOfDay || 'morning'];

    let newSlots: MedicineTimingSlot[];
    if (slot === 'as_needed') {
      newSlots = currentSlots.includes('as_needed') ? ['morning'] : ['as_needed'];
    } else {
      const withoutAsNeeded = currentSlots.filter((s): s is MedicineTimingSlot => s !== 'as_needed' && s !== 'unspecified');
      if (withoutAsNeeded.includes(slot)) {
        newSlots = withoutAsNeeded.filter(s => s !== slot);
        if (newSlots.length === 0) newSlots = ['morning'];
      } else {
        newSlots = [...withoutAsNeeded, slot];
      }
    }

    item.timingSlots = newSlots;
    item.timeOfDay = (newSlots.includes('morning') ? 'morning' : (newSlots[0] === 'as_needed' ? 'morning' : newSlots[0])) as Medicine['timeOfDay'];
    item.isEditedByUser = true;
    item.verifiedByUser = true;
    setExtractedCandidates(updated);
  };

  const addCandidateRow = () => {
    setExtractedCandidates([
      ...extractedCandidates,
      {
        id: `custom_${Date.now()}`,
        name: '',
        dosage: '1 tablet after food',
        timeOfDay: 'morning',
        timingSlots: ['morning'],
        foodRelation: 'after_food',
        frequency: 'daily',
        confidence: 'high',
        selected: true
      }
    ]);
  };

  const removeCandidateRow = (index: number) => {
    setExtractedCandidates(extractedCandidates.filter((_, i) => i !== index));
  };

  const handleConfirmExtraction = () => {
    const selected = extractedCandidates.filter(c => c.selected && c.name.trim());
    if (selected.length === 0) {
      setErrorMsg('Please select at least one medicine row to confirm, or switch to manual entry.');
      return;
    }

    // Convert to medicines state with multi-slot support and food relations
    setMedicines(
      selected.map(c => ({
        name: c.name.trim(),
        dosage: c.dosage.trim() || '1 tablet',
        timeOfDay: c.timeOfDay,
        timingSlots: c.timingSlots && c.timingSlots.length > 0 ? c.timingSlots : [c.timeOfDay || 'morning'],
        foodRelation: c.foodRelation || 'not_specified',
        frequency: c.frequency || 'daily'
      }))
    );

    // Proceed to Step 3
    setStep(3);
  };

  // Add / remove manual medicine rows
  const addMedicineRow = () => {
    setMedicines([
      ...medicines,
      { name: '', dosage: '1 tablet', timeOfDay: 'morning', timingSlots: ['morning'], foodRelation: 'after_food', frequency: 'daily' }
    ]);
  };

  const removeMedicineRow = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicineField = (index: number, field: string, value: string) => {
    const updated = [...medicines];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[index] as any)[field] = value;
    setMedicines(updated);
  };

  const updateManualMedicineFoodRelation = (index: number, relation: FoodRelation) => {
    const updated = [...medicines];
    updated[index].foodRelation = relation;
    setMedicines(updated);
  };

  const toggleManualMedicineSlot = (index: number, slot: MedicineTimingSlot) => {
    const updated = [...medicines];
    const item = updated[index];
    const currentSlots: MedicineTimingSlot[] = item.timingSlots && item.timingSlots.length > 0
      ? [...item.timingSlots]
      : [item.timeOfDay || 'morning'];

    let newSlots: MedicineTimingSlot[];
    if (slot === 'as_needed') {
      newSlots = currentSlots.includes('as_needed') ? ['morning'] : ['as_needed'];
    } else {
      const withoutAsNeeded = currentSlots.filter((s): s is MedicineTimingSlot => s !== 'as_needed' && s !== 'unspecified');
      if (withoutAsNeeded.includes(slot)) {
        newSlots = withoutAsNeeded.filter(s => s !== slot);
        if (newSlots.length === 0) newSlots = ['morning'];
      } else {
        newSlots = [...withoutAsNeeded, slot];
      }
    }

    item.timingSlots = newSlots;
    item.timeOfDay = (newSlots.includes('morning') ? 'morning' : (newSlots[0] === 'as_needed' ? 'morning' : newSlots[0])) as Medicine['timeOfDay'];
    setMedicines(updated);
  };

  // Auto-generate call schedule roadmap upon entering Step 3
  useEffect(() => {
    if (step === 3) {
      const activeMeds = hasMedicines ? medicines.filter(m => m.name.trim() !== '') : [];
      const res = generateProposedSchedule(activeMeds);
      setCallSchedule(res.schedule);
      setUnspecifiedMeds(res.unspecifiedMedicines);
      if (res.schedule.length > 0) {
        setCallTime(res.schedule[0].time);
      }
    }
  }, [step, medicines, hasMedicines]);

  // Call schedule slot handlers
  const updateCallSlotTime = (index: number, newTime: string) => {
    const updated = [...callSchedule];
    updated[index].time = newTime;
    setCallSchedule(updated);
    if (index === 0) setCallTime(newTime);
  };

  const updateCallSlotLabel = (index: number, newLabel: string) => {
    const updated = [...callSchedule];
    updated[index].label = newLabel;
    setCallSchedule(updated);
  };

  const removeCallSlot = (index: number) => {
    const updated = callSchedule.filter((_, i) => i !== index);
    setCallSchedule(updated);
  };

  const CANDIDATE_CHECKIN_TIMES = [
    { time: '10:30 AM', label: 'Mid-Morning Wellness Check-in' },
    { time: '04:30 PM', label: 'Afternoon Tea & Wellbeing Check-in' },
    { time: '05:30 PM', label: 'Evening Walk & Hydration Check-in' },
    { time: '07:30 PM', label: 'Pre-Dinner Conversation & Mood Check' },
    { time: '02:00 PM', label: 'Post-Lunch Rest & Health Check' },
    { time: '11:30 AM', label: 'Late-Morning Check-in' }
  ];

  const addCustomCallSlot = () => {
    const existingTimes = new Set(callSchedule.map(s => s.time));
    const candidate = CANDIDATE_CHECKIN_TIMES.find(c => !existingTimes.has(c.time));

    let newTime = '04:30 PM';
    let newLabel = 'Custom Check-in Call';

    if (candidate) {
      newTime = candidate.time;
      newLabel = candidate.label;
    } else {
      const customCount = callSchedule.filter(s => s.slot === 'custom').length + 1;
      newTime = '03:30 PM';
      newLabel = `Additional Care Check-in #${customCount}`;
    }

    const newSlot: ScheduledCallSlot = {
      id: `slot_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time: newTime,
      slot: 'custom',
      label: newLabel,
      linkedMedicineNames: [],
      isActive: true
    };
    setCallSchedule(prev => [...prev, newSlot]);
  };

  const resolveUnspecifiedMed = (medIndex: number, newSlot: MedicineTimingSlot) => {
    const updatedMeds = [...medicines];
    if (updatedMeds[medIndex]) {
      updatedMeds[medIndex].timingSlots = [newSlot];
      updatedMeds[medIndex].timeOfDay = (newSlot === 'as_needed' || newSlot === 'unspecified') ? 'morning' : (newSlot as any);
      setMedicines(updatedMeds);
      const res = generateProposedSchedule(updatedMeds);
      setCallSchedule(res.schedule);
      setUnspecifiedMeds(res.unspecifiedMedicines);
    }
  };

  // Add emergency contact row
  const addContactRow = () => {
    setEmergencyContacts([
      ...emergencyContacts,
      { name: '', relation: 'Family Member', phone: '', priority: 'secondary' }
    ]);
  };

  const removeContactRow = (index: number) => {
    if (emergencyContacts.length <= 1) return;
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  // Navigation handlers
  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!name.trim()) {
        setErrorMsg('Please enter parent name');
        return;
      }
      if (!phone || phone.replace(/\D/g, '').length < 10) {
        setErrorMsg('Please enter a valid 10-digit mobile or landline number');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (unspecifiedMeds.length > 0) {
        setErrorMsg('Please assign a timing slot for all medicines before proceeding.');
        return;
      }
      if (callSchedule.filter(s => s.isActive).length === 0) {
        setErrorMsg('Please configure at least one call time for your parent.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!emergencyContacts[0]?.name || !emergencyContacts[0]?.phone) {
        setErrorMsg('At least one primary emergency contact is required');
        return;
      }
      setStep(5);
    }
  };

  // Final Submit Handler
  const handleFinalSubmit = async () => {
    if (!consentConfirmed) {
      setErrorMsg('Parent awareness and consent is mandatory to initiate calls');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const validMeds = hasMedicines ? medicines.filter(m => m.name.trim() !== '') : [];
      const activeSchedule = callSchedule.filter(s => s.isActive);

      const res = await fetch('/api/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          relationship,
          phone,
          language,
          timezone,
          callTime: activeSchedule[0]?.time || callTime,
          callSchedule: activeSchedule,
          consentGiven: true,
          medicines: validMeds,
          emergencyContacts
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create parent profile');
        setSubmitting(false);
        return;
      }

      setCreatedParentId(data.parent.id);
      setStep(6);
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Request a real 1-time test call (reports honestly if calling isn't live yet)
  const triggerTestCall = async () => {
    if (!createdParentId) return;
    setTestCalling(true);
    try {
      const res = await fetch(`/api/parents/${createdParentId}/test-call`, { method: 'POST' });
      const data = await res.json();
      setTestCallResult({ ok: res.ok, message: data.message || data.error || 'Test call unavailable right now.' });
    } catch {
      setTestCallResult({ ok: false, message: 'Could not reach the server to place a test call.' });
    } finally {
      setTestCalling(false);
    }
  };

  return (
    <div className="wrap-checkout" style={{ padding: '36px 20px 80px' }}>
      {/* WIZARD STEPPER BAR */}
      <div style={{ maxWidth: '680px', margin: '0 auto 36px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          {[
            { s: 1, label: 'Parent' },
            { s: 2, label: 'Medicines' },
            { s: 3, label: 'Schedule' },
            { s: 4, label: 'Emergency' },
            { s: 5, label: 'Consent' },
            { s: 6, label: 'Ready' }
          ].map((item, idx) => (
            <React.Fragment key={item.s}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: step === item.s ? 'var(--teal)' : step > item.s ? 'var(--teal-light)' : 'var(--panel)',
                    color: step === item.s ? '#fff' : step > item.s ? 'var(--teal)' : 'var(--ink-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: step === item.s ? '2px solid var(--teal)' : '1px solid var(--line)'
                  }}
                >
                  {step > item.s ? <CheckCircle2 size={16} /> : item.s}
                </div>
                <span style={{ fontSize: '0.74rem', color: step === item.s ? 'var(--teal)' : 'var(--ink-muted)', fontWeight: step === item.s ? 700 : 500 }}>
                  {item.label}
                </span>
              </div>
              {idx < 5 && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    background: step > idx + 1 ? 'var(--teal)' : 'var(--line)',
                    margin: '0 4px',
                    marginBottom: '16px'
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="card" style={{ maxWidth: '640px', margin: '0 auto' }}>
        {errorMsg && (
          <div className="alert-box error" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: PARENT INFO */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="badge badge-teal" style={{ marginBottom: '8px' }}>
                Step 1 of 5 · Profile Details
              </div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Who are we checking in on?</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
                CareCircle will call them with warmth and family-like respect.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">How should the AI assistant address them?</label>
              <input
                type="text"
                placeholder="e.g. Amma, Appa, Dadi, Mr. Sharma, Lakshmi Aunty"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                required
              />
              <span className="form-hint">The AI will use this loving greeting on every single call.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Relationship to you</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="form-input"
                >
                  <option value="Mother">Mother (Amma / Mom / Ma)</option>
                  <option value="Father">Father (Appa / Dad / Papa)</option>
                  <option value="Mother-in-law">Mother-in-law</option>
                  <option value="Father-in-law">Father-in-law</option>
                  <option value="Grandmother">Grandmother (Dadi / Nani / Aaji)</option>
                  <option value="Grandfather">Grandfather (Dada / Nana / Aaja)</option>
                  <option value="Aunt / Uncle">Aunt / Uncle</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="form-input"
                >
                  <option value="Hindi & English">Hindi & English (Bilingual)</option>
                  <option value="Pure Hindi">Hindi (Namaste & Polite)</option>
                  <option value="English">English</option>
                  <option value="Tamil">Tamil (Vanakkam)</option>
                  <option value="Telugu">Telugu (Namaskaram)</option>
                  <option value="Kannada">Kannada (Namaskara)</option>
                  <option value="Bengali">Bengali (Nomoshkar)</option>
                  <option value="Marathi">Marathi (Namaskar)</option>
                  <option value="Gujarati">Gujarati (Namaste)</option>
                  <option value="Malayalam">Malayalam (Namaskaram)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Parent&apos;s Phone Number</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ padding: '13px 14px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px', fontSize: '0.94rem', fontWeight: 600 }}>
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="98450 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <span className="form-hint">Can be a mobile or ordinary landline phone. No smartphone required.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Parent&apos;s Local Time Zone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="form-input"
              >
                <option value="Asia/Kolkata (IST)">India Standard Time (IST — Asia/Kolkata)</option>
                <option value="America/New_York (EST)">US Eastern Time (EST)</option>
                <option value="America/Los_Angeles (PST)">US Pacific Time (PST)</option>
                <option value="Europe/London (GMT)">UK Time (GMT / BST)</option>
                <option value="Asia/Dubai (GST)">Gulf Standard Time (Dubai / UAE)</option>
                <option value="Asia/Singapore (SGT)">Singapore Time (SGT)</option>
              </select>
              <span className="form-hint">Calls will be placed on parent&apos;s local clock, regardless of where you live.</span>
            </div>

            <button onClick={handleNextStep} className="btn btn-primary btn-block btn-lg" style={{ marginTop: '16px' }}>
              Continue to Medicines <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 2: MEDICINES */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="badge badge-teal" style={{ marginBottom: '8px' }}>
                Step 2 of 5 · Medication Tracking
              </div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Does {name || 'your parent'} have daily medicines?</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
                CareCircle gently verifies adherence during calls and alerts family if chronic meds are missed.
              </p>
            </div>

            {/* INITIAL CHOICE: YES VS NO */}
            {hasMedicines === null && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '24px 0' }}>
                <button
                  type="button"
                  onClick={() => {
                    setHasMedicines(true);
                    setMedicineEntryMode('choice');
                  }}
                  style={{
                    padding: '24px 16px',
                    borderRadius: '16px',
                    border: '2px solid var(--teal)',
                    background: 'var(--teal-light)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Pill size={32} color="var(--teal)" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--teal-deep)' }}>
                    Yes, track medications
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '4px' }}>
                    BP, Diabetes, Thyroid, Vitamins, etc.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasMedicines(false);
                    setStep(3);
                  }}
                  style={{
                    padding: '24px 16px',
                    borderRadius: '16px',
                    border: '1px solid var(--line)',
                    background: '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Heart size={32} color="var(--gold)" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>
                    No medicines right now
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '4px' }}>
                    Pure wellness & daily conversation calls
                  </div>
                </button>
              </div>
            )}

            {/* ENTRY METHOD CHOICE: UPLOAD REPORT VS MANUAL */}
            {hasMedicines === true && medicineEntryMode === 'choice' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '20px 0 24px' }}>
                  {/* OPTION 1: UPLOAD REPORT (RECOMMENDED) */}
                  <div
                    onClick={() => setMedicineEntryMode('upload')}
                    style={{
                      border: '2px solid var(--teal)',
                      background: 'var(--teal-light)',
                      borderRadius: '16px',
                      padding: '22px 18px',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ position: 'absolute', top: '-10px', right: '14px' }}>
                      <span className="badge badge-gold" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={12} /> AI Fast Track
                      </span>
                    </div>

                    <div>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--teal)',
                          marginBottom: '14px',
                          border: '1px solid var(--line)'
                        }}
                      >
                        <UploadCloud size={24} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--teal-deep)', marginBottom: '6px' }}>
                        Upload a Report
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', margin: 0, lineHeight: 1.45 }}>
                        Upload a clear photo of a prescription, discharge summary, or pharmacy bill. AI extracts medications for your review.
                      </p>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--teal)', fontWeight: 600, fontSize: '0.88rem' }}>
                      Select or Drop Document <ArrowRight size={16} />
                    </div>
                  </div>

                  {/* OPTION 2: ADD MANUALLY */}
                  <div
                    onClick={() => setMedicineEntryMode('manual')}
                    style={{
                      border: '1px solid var(--line)',
                      background: '#fff',
                      borderRadius: '16px',
                      padding: '22px 18px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: 'var(--panel)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--ink-muted)',
                          marginBottom: '14px',
                          border: '1px solid var(--line)'
                        }}
                      >
                        <Pill size={24} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '6px' }}>
                        Add Manually
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', margin: 0, lineHeight: 1.45 }}>
                        Type medicine names, dosages, and timing schedules into standard text form fields.
                      </p>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink)', fontWeight: 600, fontSize: '0.88rem' }}>
                      Enter Manually <ArrowRight size={16} />
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setHasMedicines(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', fontSize: '0.84rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    ← Change my previous answer
                  </button>
                </div>
              </div>
            )}

            {/* ENTRY MODE: UPLOAD REPORT & AI DRAFT REVIEW */}
            {hasMedicines === true && medicineEntryMode === 'upload' && (
              <div>
                {/* 1. UPLOAD LOADING STATE */}
                {uploadLoading && (
                  <div
                    style={{
                      background: 'var(--panel)',
                      border: '1px solid var(--line)',
                      borderRadius: '16px',
                      padding: '40px 24px',
                      textAlign: 'center',
                      margin: '20px 0'
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'var(--teal-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        color: 'var(--teal)',
                        animation: 'spin 2s linear infinite'
                      }}
                    >
                      <RefreshCw size={28} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '6px' }}>
                      Reading Report with CareCircle AI...
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', margin: 0 }}>
                      {uploadProgressText}
                    </p>
                  </div>
                )}

                {/* 2. DROPZONE (WHEN NO CANDIDATES EXTRACTED YET) */}
                {!uploadLoading && extractedCandidates.length === 0 && (
                  <div>
                    <div
                      style={{
                        border: '2px dashed var(--teal)',
                        background: 'var(--teal-light)',
                        borderRadius: '16px',
                        padding: '36px 20px',
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
                          if (file) handleFileUpload(file);
                        }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          opacity: 0,
                          cursor: 'pointer',
                          width: '100%',
                          height: '100%'
                        }}
                      />
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          background: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 14px',
                          color: 'var(--teal)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                        }}
                      >
                        <UploadCloud size={28} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--teal-deep)', marginBottom: '4px' }}>
                        Drag & Drop or Click to Upload Prescription
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', margin: '0 0 12px' }}>
                        Supports JPG, PNG or WebP photos up to 8 MB
                      </p>
                      <span className="badge badge-teal" style={{ fontSize: '0.78rem' }}>
                        Prescriptions &bull; Discharge Summaries &bull; Pharmacy Invoices
                      </span>
                    </div>

                    {extractionError && (
                      <div className="alert-box error" style={{ marginBottom: '16px' }}>
                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div>{extractionError}</div>
                          <button
                            type="button"
                            onClick={() => setMedicineEntryMode('manual')}
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: '8px', fontSize: '0.8rem' }}
                          >
                            Switch to manual entry →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SAMPLE PRESCRIPTIONS FOR FAST 1-CLICK TESTING */}
                    <div style={{ background: 'var(--panel)', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '0.84rem', fontWeight: 700, color: 'var(--ink)' }}>
                        <FileText size={16} color="var(--teal)" /> Or try with a sample prescription (1-Click Test):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {SAMPLE_PRESCRIPTIONS.map((sample) => (
                          <button
                            key={sample.id}
                            type="button"
                            onClick={() => handleSampleExtract(sample.id)}
                            className="btn btn-ghost btn-sm"
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              textAlign: 'left',
                              background: '#fff',
                              border: '1px solid var(--line)',
                              borderRadius: '8px',
                              padding: '10px 12px'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--ink)' }}>{sample.title}</div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>{sample.subtitle}</div>
                            </div>
                            <span className="badge badge-teal" style={{ fontSize: '0.72rem' }}>Extract AI</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setMedicineEntryMode('choice')}
                        className="btn btn-ghost btn-sm"
                      >
                        ← Back to options
                      </button>
                      <button
                        type="button"
                        onClick={() => setMedicineEntryMode('manual')}
                        style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Type medicines manually instead →
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. EDITABLE DRAFT LIST (WHEN CANDIDATES ARE EXTRACTED) */}
                {!uploadLoading && extractedCandidates.length > 0 && (
                  <div>
                    <div
                      style={{
                        background: 'var(--teal-light)',
                        border: '1px solid var(--teal)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        marginBottom: '18px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sparkles size={20} color="var(--teal)" />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--teal-deep)' }}>
                            {extractedCandidates.length} Medicines Extracted from {uploadedFileName || 'Prescription'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                            Review and edit candidate rows below. Check or uncheck medicines before saving.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setExtractedCandidates([]);
                          setUploadedFileName(null);
                          setBatchQualityWarning(null);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Upload another
                      </button>
                    </div>

                    {/* BATCH QUALITY / CLARITY NOTICE */}
                    {batchQualityWarning && (
                      <div
                        style={{
                          background: '#fffbeb',
                          border: '1px solid #f59e0b',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}
                      >
                        <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.84rem', color: '#92400e', lineHeight: 1.45 }}>
                          <strong>Handwriting / Verification Notice:</strong> {batchQualityWarning}
                        </div>
                      </div>
                    )}

                    {/* DRAFT ROWS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                      {extractedCandidates.map((candidate, idx) => {
                        const isLowConf = candidate.confidence === 'low';
                        return (
                          <div
                            key={candidate.id || idx}
                            style={{
                              background: candidate.selected ? '#fff' : 'var(--panel)',
                              border: isLowConf && candidate.selected
                                ? '2px solid #f59e0b'
                                : candidate.selected
                                ? '1px solid var(--teal)'
                                : '1px solid var(--line)',
                              borderRadius: '14px',
                              padding: '14px',
                              opacity: candidate.selected ? 1 : 0.65,
                              transition: 'all 0.15s ease',
                              boxShadow: candidate.selected ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={candidate.selected}
                                  onChange={() => toggleCandidateSelection(idx)}
                                  style={{ width: '18px', height: '18px', accentColor: 'var(--teal)', cursor: 'pointer' }}
                                />
                                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: candidate.selected ? 'var(--teal-deep)' : 'var(--ink-muted)' }}>
                                  Medicine #{idx + 1} {candidate.selected ? '(Included in Schedule)' : '(Discarded)'}
                                </span>
                              </label>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {candidate.category && (
                                  <span className="badge badge-teal" style={{ fontSize: '0.72rem' }}>
                                    {candidate.category}
                                  </span>
                                )}
                                {isLowConf ? (
                                  <span className="badge badge-gold" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                                    <AlertTriangle size={12} /> Please Verify
                                  </span>
                                ) : (
                                  <span className="badge" style={{ fontSize: '0.72rem', background: '#eaf1ef', color: 'var(--teal)' }}>
                                    ✓ Verified Match
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeCandidateRow(idx)}
                                  style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' }}
                                  title="Remove row"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {/* WARNING BANNER FOR LOW CONFIDENCE */}
                            {candidate.flagReason && (
                              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '6px 10px', marginBottom: '10px', fontSize: '0.78rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                                <span>{candidate.flagReason}</span>
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr 1.6fr 1.4fr', gap: '10px', alignItems: 'start' }}>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}>Medicine Name</label>
                                <input
                                  type="text"
                                  value={candidate.name}
                                  onChange={(e) => updateCandidateField(idx, 'name', e.target.value)}
                                  className="form-input"
                                  placeholder="e.g., Tab. Augmentin 625mg"
                                  style={{ fontSize: '0.88rem', padding: '8px 10px' }}
                                />
                              </div>

                              <div>
                                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}>Dosage</label>
                                <input
                                  type="text"
                                  value={candidate.dosage}
                                  onChange={(e) => updateCandidateField(idx, 'dosage', e.target.value)}
                                  className="form-input"
                                  placeholder="e.g., 1 tab BD (1-0-1)"
                                  style={{ fontSize: '0.88rem', padding: '8px 10px' }}
                                />
                              </div>

                              <div>
                                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Timing Schedule</span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--teal)', fontWeight: 600 }}>
                                    {candidate.timingSlots?.includes('as_needed') ? 'SOS / As Needed' : `${candidate.timingSlots?.length || 1} slot${(candidate.timingSlots?.length || 1) > 1 ? 's' : ''}`}
                                  </span>
                                </label>
                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                  {[
                                    { slot: 'morning' as const, label: 'Morn' },
                                    { slot: 'afternoon' as const, label: 'Noon' },
                                    { slot: 'evening' as const, label: 'Eve' },
                                    { slot: 'bedtime' as const, label: 'Night' },
                                    { slot: 'as_needed' as const, label: 'SOS' }
                                  ].map((opt) => {
                                    const isSelected = candidate.timingSlots?.includes(opt.slot) || (opt.slot === candidate.timeOfDay && (!candidate.timingSlots || candidate.timingSlots.length === 0));
                                    return (
                                      <button
                                        key={opt.slot}
                                        type="button"
                                        onClick={() => toggleCandidateSlot(idx, opt.slot)}
                                        style={{
                                          padding: '4px 6px',
                                          borderRadius: '6px',
                                          fontSize: '0.72rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          border: isSelected ? '1px solid var(--teal)' : '1px solid var(--line)',
                                          background: isSelected
                                            ? (opt.slot === 'as_needed' ? '#fef3c7' : 'var(--teal)')
                                            : '#fff',
                                          color: isSelected
                                            ? (opt.slot === 'as_needed' ? '#92400e' : '#fff')
                                            : 'var(--ink-muted)',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        {isSelected ? '✓ ' : '+ '}{opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div>
                                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Food Relation</span>
                                  <span style={{ fontSize: '0.7rem', color: candidate.foodRelation === 'before_food' ? '#d97706' : candidate.foodRelation === 'after_food' ? 'var(--teal)' : 'var(--ink-muted)', fontWeight: 600 }}>
                                    {candidate.foodRelation === 'before_food' ? 'Before Food' : candidate.foodRelation === 'after_food' ? 'After Food' : candidate.foodRelation === 'with_food' ? 'With Food' : 'Anytime'}
                                  </span>
                                </label>
                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                  {[
                                    { val: 'before_food' as const, label: 'Before' },
                                    { val: 'after_food' as const, label: 'After' },
                                    { val: 'with_food' as const, label: 'With' },
                                    { val: 'not_specified' as const, label: 'N/A' }
                                  ].map((opt) => {
                                    const isSelected = candidate.foodRelation === opt.val || (!candidate.foodRelation && opt.val === 'not_specified');
                                    return (
                                      <button
                                        key={opt.val}
                                        type="button"
                                        onClick={() => updateCandidateField(idx, 'foodRelation', opt.val)}
                                        style={{
                                          padding: '4px 6px',
                                          borderRadius: '6px',
                                          fontSize: '0.72rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          border: isSelected ? '1px solid var(--teal)' : '1px solid var(--line)',
                                          background: isSelected
                                            ? (opt.val === 'before_food' ? '#fef3c7' : 'var(--teal-light)')
                                            : '#fff',
                                          color: isSelected
                                            ? (opt.val === 'before_food' ? '#92400e' : 'var(--teal-deep)')
                                            : 'var(--ink-muted)',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        {isSelected ? '✓ ' : ''}{opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* ADD MISSED MEDICINE BUTTON */}
                    <button
                      type="button"
                      onClick={addCandidateRow}
                      className="btn btn-ghost btn-block"
                      style={{ border: '1px dashed var(--line)', marginBottom: '20px', padding: '10px' }}
                    >
                      <Plus size={16} /> + Add medicine we missed
                    </button>

                    {/* MANDATORY VERIFICATION CONFIRMATION BAR */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setMedicineEntryMode('choice')}
                        className="btn btn-ghost"
                      >
                        <ArrowLeft size={16} /> Back
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmExtraction}
                        disabled={extractedCandidates.filter(c => c.selected && c.name.trim().length >= 3).length === 0}
                        className="btn btn-primary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <CheckCircle2 size={18} /> Confirm {extractedCandidates.filter(c => c.selected && c.name.trim().length >= 3).length} Medicine{extractedCandidates.filter(c => c.selected && c.name.trim().length >= 3).length > 1 ? 's' : ''} & Continue <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ENTRY MODE: MANUAL MEDICINE ENTRY */}
            {hasMedicines === true && medicineEntryMode === 'manual' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--teal)' }}>
                    Manual Medication Form
                  </div>
                  <button
                    type="button"
                    onClick={() => setMedicineEntryMode('upload')}
                    style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <UploadCloud size={14} /> Upload prescription instead
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
                  {medicines.map((med, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--panel)',
                        padding: '16px',
                        borderRadius: '14px',
                        border: '1px solid var(--line)',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--teal)' }}>
                          Medicine #{idx + 1}
                        </span>
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMedicineRow(idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <input
                          type="text"
                          placeholder="Medicine name (e.g. Telmisartan, Metformin, Eltroxin)"
                          value={med.name}
                          onChange={(e) => updateMedicineField(idx, 'name', e.target.value)}
                          className="form-input"
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr 1.2fr', gap: '10px', alignItems: 'start' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: '3px' }}>Dosage</label>
                          <input
                            type="text"
                            placeholder="e.g. 40mg (1-0-1)"
                            value={med.dosage}
                            onChange={(e) => updateMedicineField(idx, 'dosage', e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.86rem', padding: '8px 10px' }}
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Schedule</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--teal)', fontWeight: 600 }}>
                              {med.timingSlots?.includes('as_needed') ? 'SOS' : `${med.timingSlots?.length || 1} slot${(med.timingSlots?.length || 1) > 1 ? 's' : ''}`}
                            </span>
                          </label>
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
                                  onClick={() => toggleManualMedicineSlot(idx, opt.slot)}
                                  style={{
                                    padding: '4px 6px',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    border: isSelected ? '1px solid var(--teal)' : '1px solid var(--line)',
                                    background: isSelected
                                      ? (opt.slot === 'as_needed' ? '#fef3c7' : 'var(--teal)')
                                      : '#fff',
                                    color: isSelected
                                      ? (opt.slot === 'as_needed' ? '#92400e' : '#fff')
                                      : 'var(--ink-muted)',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {isSelected ? '✓ ' : '+ '}{opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Food Relation</span>
                            <span style={{ fontSize: '0.7rem', color: med.foodRelation === 'before_food' ? '#d97706' : med.foodRelation === 'after_food' ? 'var(--teal)' : 'var(--ink-muted)', fontWeight: 600 }}>
                              {med.foodRelation === 'before_food' ? 'Before' : med.foodRelation === 'after_food' ? 'After' : med.foodRelation === 'with_food' ? 'With' : 'N/A'}
                            </span>
                          </label>
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
                                  onClick={() => updateManualMedicineFoodRelation(idx, opt.val)}
                                  style={{
                                    padding: '4px 6px',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    border: isSelected ? '1px solid var(--teal)' : '1px solid var(--line)',
                                    background: isSelected
                                      ? (opt.val === 'before_food' ? '#fef3c7' : 'var(--teal-light)')
                                      : '#fff',
                                    color: isSelected
                                      ? (opt.val === 'before_food' ? '#92400e' : 'var(--teal-deep)')
                                      : 'var(--ink-muted)',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {isSelected ? '✓ ' : ''}{opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addMedicineRow}
                  className="btn btn-ghost btn-block"
                  style={{ marginBottom: '24px' }}
                >
                  <Plus size={16} /> Add Another Medicine
                </button>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setMedicineEntryMode('choice')} className="btn btn-ghost">
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button onClick={handleNextStep} className="btn btn-primary" style={{ flex: 1 }}>
                    Continue to Call Timing <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: AUTO-GENERATED CALL SCHEDULE & ROADMAP */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="badge badge-teal" style={{ marginBottom: '8px' }}>
                Step 3 of 5 · Call Schedule Roadmap
              </div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>
                Daily Call Schedule for {name || 'Parent'}
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', maxWidth: '540px', margin: '0 auto' }}>
                {hasMedicines && medicines.filter(m => m.name.trim()).length > 0
                  ? `CareCircle auto-generated reminder calls timed 15–30 mins before ${name || 'your parent'}'s confirmed medicines. Adjust any time below.`
                  : `CareCircle generated a daily wellness conversation call for ${name || 'your parent'}. You can adjust the time or add extra check-in calls below.`}
              </p>
            </div>

            {/* UNRESOLVED / UNSPECIFIED MEDICINES WARNING */}
            {unspecifiedMeds.length > 0 && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #f59e0b',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: 700, fontSize: '0.92rem', marginBottom: '6px' }}>
                  <AlertTriangle size={18} color="#d97706" />
                  <span>Action Required: Set timing for {unspecifiedMeds.length} medicine{unspecifiedMeds.length > 1 ? 's' : ''}</span>
                </div>
                <p style={{ fontSize: '0.84rem', color: '#92400e', margin: '0 0 12px' }}>
                  Please assign each medicine to Morning, Afternoon, Evening, or Bedtime so CareCircle can place it into the daily call schedule.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {unspecifiedMeds.map((u) => (
                    <div
                      key={u.index}
                      style={{
                        background: '#fff',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #fde68a',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--ink)' }}>{u.name}</strong>
                        {u.dosage && <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginLeft: '6px' }}>({u.dosage})</span>}
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {(['morning', 'afternoon', 'evening', 'bedtime', 'as_needed'] as const).map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => resolveUnspecifiedMed(u.index, slot)}
                            className="btn btn-ghost btn-sm"
                            style={{
                              fontSize: '0.78rem',
                              padding: '4px 10px',
                              background: 'var(--panel)',
                              border: '1px solid var(--line)',
                              textTransform: 'capitalize'
                            }}
                          >
                            + {slot === 'as_needed' ? 'SOS / As Needed' : slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GENERATED CALL ROADMAP CARDS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {callSchedule.map((slot, idx) => {
                const getSlotIcon = () => {
                  if (slot.slot === 'morning') return <Sun size={18} color="#d97706" />;
                  if (slot.slot === 'afternoon') return <Coffee size={18} color="#0284c7" />;
                  if (slot.slot === 'evening') return <Sunset size={18} color="#ea580c" />;
                  if (slot.slot === 'bedtime') return <Moon size={18} color="#6366f1" />;
                  return <Heart size={18} color="var(--teal)" />;
                };

                const getSlotBadgeStyle = () => {
                  if (slot.slot === 'morning') return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
                  if (slot.slot === 'afternoon') return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
                  if (slot.slot === 'evening') return { background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' };
                  if (slot.slot === 'bedtime') return { background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' };
                  return { background: '#eaf1ef', color: 'var(--teal)', border: '1px solid var(--teal)' };
                };

                // Check for duplicate times
                const isDuplicateTime = callSchedule.filter(s => s.time === slot.time).length > 1;

                return (
                  <div
                    key={slot.id || idx}
                    style={{
                      background: '#fff',
                      border: isDuplicateTime ? '1.5px solid #f59e0b' : '1px solid var(--line)',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...getSlotBadgeStyle() }}>
                          {getSlotIcon()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge" style={{ ...getSlotBadgeStyle(), fontSize: '0.74rem', padding: '2px 8px' }}>
                            {SLOT_DISPLAY_NAMES[slot.slot] || 'Scheduled Call'} #{idx + 1}
                          </span>
                          {isDuplicateTime && (
                            <span className="badge badge-gold" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <AlertTriangle size={11} /> Same time as another call
                            </span>
                          )}
                        </div>
                      </div>

                      {callSchedule.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCallSlot(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', padding: '4px' }}
                          title="Remove this call"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 2fr', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
                      {/* CALL TIME SELECTOR */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} color="var(--teal)" /> Call Time
                        </label>
                        <select
                          value={slot.time}
                          onChange={(e) => updateCallSlotTime(idx, e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.92rem', fontWeight: 700, padding: '9px 12px', color: 'var(--teal-deep)', background: 'var(--panel)' }}
                        >
                          {getSelectableCallTimes(slot.time).map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* PURPOSE LABEL */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                          Call Purpose & Focus
                        </label>
                        <input
                          type="text"
                          value={slot.label}
                          onChange={(e) => updateCallSlotLabel(idx, e.target.value)}
                          className="form-input"
                          placeholder="e.g. Morning Medicine Reminder & Mood Check"
                          style={{ fontSize: '0.88rem', padding: '9px 12px' }}
                        />
                      </div>
                    </div>

                    {/* COVERED MEDICINES & FOOD RELATION TAGS */}
                    {((slot.linkedMedicines && slot.linkedMedicines.length > 0) || (slot.linkedMedicineNames && slot.linkedMedicineNames.length > 0)) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px dashed var(--line)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                            Medicines & Food Timing:
                          </span>
                          {slot.linkedMedicines && slot.linkedMedicines.length > 0 ? (
                            slot.linkedMedicines.map((lm, mIdx) => {
                              const relLabel = lm.foodRelation === 'before_food'
                                ? 'Before food'
                                : lm.foodRelation === 'after_food'
                                ? 'After food'
                                : lm.foodRelation === 'with_food'
                                ? 'With food'
                                : 'Anytime';
                              const relBg = lm.foodRelation === 'before_food'
                                ? '#fef3c7'
                                : lm.foodRelation === 'after_food'
                                ? '#eaf1ef'
                                : lm.foodRelation === 'with_food'
                                ? '#e0f2fe'
                                : 'var(--panel)';
                              const relColor = lm.foodRelation === 'before_food'
                                ? '#92400e'
                                : lm.foodRelation === 'after_food'
                                ? 'var(--teal-deep)'
                                : lm.foodRelation === 'with_food'
                                ? '#0369a1'
                                : 'var(--ink-muted)';

                              return (
                                <span
                                  key={mIdx}
                                  className="badge"
                                  style={{
                                    fontSize: '0.74rem',
                                    padding: '3px 8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: relBg,
                                    color: relColor,
                                    border: `1px solid ${relColor}33`
                                  }}
                                >
                                  <Pill size={11} />
                                  <strong>{lm.name}</strong>
                                  <span style={{ opacity: 0.85, fontSize: '0.7rem' }}>• {relLabel}</span>
                                </span>
                              );
                            })
                          ) : (
                            slot.linkedMedicineNames?.map((medName, mIdx) => (
                              <span
                                key={mIdx}
                                className="badge badge-teal"
                                style={{ fontSize: '0.74rem', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Pill size={11} /> {medName}
                              </span>
                            ))
                          )}
                        </div>

                        {/* AI CONVERSATION SCRIPT PREVIEW */}
                        {slot.linkedMedicines && slot.linkedMedicines.length > 0 && (
                          <div style={{ background: 'var(--panel)', borderRadius: '10px', padding: '10px 14px', border: '1px solid var(--line)' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--ink-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Volume2 size={13} color="var(--teal)" /> AI Check-in Question Phrasing:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {slot.linkedMedicines.map((lm, mIdx) => (
                                <div key={mIdx} style={{ fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--teal-deep)' }}>
                                  &ldquo;{lm.questionScript || `Did you take your ${lm.name}?`}&rdquo;
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ADD ANOTHER CALL BUTTON */}
            <button
              type="button"
              onClick={addCustomCallSlot}
              className="btn btn-ghost btn-block"
              style={{ border: '1px dashed var(--line)', marginBottom: '20px', padding: '12px' }}
            >
              <Plus size={16} /> + Add another check-in call (e.g. Afternoon Tea or Wellness)
            </button>

            {/* LIVE SCHEDULE SUMMARY BAR */}
            <div
              style={{
                background: 'var(--teal-light)',
                border: '1px solid var(--teal)',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={18} color="var(--teal)" />
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--teal-deep)' }}>
                  {formatScheduleSummary(callSchedule)}
                </div>
              </div>
              <span className="badge badge-gold" style={{ fontSize: '0.74rem' }}>
                AI Automated Routine
              </span>
            </div>

            {/* SMART LEARNING REASSURANCE NOTE */}
            <div
              style={{
                background: 'var(--panel)',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid var(--line)',
                marginBottom: '24px',
                fontSize: '0.84rem',
                color: 'var(--ink-muted)'
              }}
            >
              <strong style={{ display: 'block', color: 'var(--ink)', marginBottom: '3px' }}>
                ✨ Smart Call-Time Learning Included
              </strong>
              If {name || 'your parent'} consistently answers calls slightly earlier or later (for example, after their morning prayer or walk), CareCircle detects this pattern and suggests optimal schedule refinements on your caregiver dashboard.
            </div>

            {/* NAVIGATION BUTTONS */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(2)} className="btn btn-ghost">
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={handleNextStep}
                disabled={unspecifiedMeds.length > 0 || callSchedule.filter(s => s.isActive).length === 0}
                className="btn btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                Looks good, continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: EMERGENCY CONTACTS */}
        {step === 4 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="badge badge-teal" style={{ marginBottom: '8px' }}>
                Step 4 of 5 · Emergency Contacts
              </div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Who should we alert in an emergency?</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
                If {name} reports feeling unwell or calls go repeatedly unanswered, these contacts receive instant high-priority alerts.
              </p>
            </div>

            <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
              {emergencyContacts.map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--panel)',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '1px solid var(--line)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className="badge badge-teal">
                      {idx === 0 ? 'Primary Contact (Notified First)' : 'Secondary Contact'}
                    </span>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => removeContactRow(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder="Contact name (e.g. Sathwik Rao)"
                      value={c.name}
                      onChange={(e) => {
                        const updated = [...emergencyContacts];
                        updated[idx].name = e.target.value;
                        setEmergencyContacts(updated);
                      }}
                      className="form-input"
                      required
                    />

                    <input
                      type="text"
                      placeholder="Relationship (e.g. Son, Daughter, Doctor)"
                      value={c.relation}
                      onChange={(e) => {
                        const updated = [...emergencyContacts];
                        updated[idx].relation = e.target.value;
                        setEmergencyContacts(updated);
                      }}
                      className="form-input"
                    />
                  </div>

                  <input
                    type="tel"
                    placeholder="Mobile number for instant WhatsApp & SMS alerts"
                    value={c.phone}
                    onChange={(e) => {
                      const updated = [...emergencyContacts];
                      updated[idx].phone = e.target.value;
                      setEmergencyContacts(updated);
                    }}
                    className="form-input"
                    required
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addContactRow}
              className="btn btn-ghost btn-block"
              style={{ marginBottom: '24px' }}
            >
              <Plus size={16} /> Add Secondary Contact (Doctor, Sibling)
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(3)} className="btn btn-ghost">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={handleNextStep} className="btn btn-primary" style={{ flex: 1 }}>
                Continue to Consent <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: CONSENT STEP */}
        {step === 5 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="badge badge-gold" style={{ marginBottom: '8px' }}>
                Step 5 of 5 · Parent Awareness & Consent
              </div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Respecting {name}&apos;s privacy</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
                CareCircle maintains a strict ethics-first standard for elder care.
              </p>
            </div>

            <div
              style={{
                background: 'var(--panel)',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid var(--line)',
                marginBottom: '24px',
                lineHeight: 1.6,
                fontSize: '0.92rem'
              }}
            >
              <p style={{ marginBottom: '12px' }}>
                Because CareCircle speaks directly to aging parents regarding their daily routine and well-being, we require confirmation that the family has introduced CareCircle beforehand.
              </p>
              <p style={{ color: 'var(--teal-deep)', fontWeight: 600 }}>
                💡 Recommendation: Tell {name}: <em>&quot;A polite automated companion named CareCircle will call your phone every morning around {callTime} to ask about your medicines and say Namaste.&quot;</em>
              </p>
            </div>

            <label
              onClick={() => setConsentConfirmed(!consentConfirmed)}
              className="checkbox-group"
              style={{ background: 'var(--panel-elevated)', padding: '16px', borderRadius: '12px', border: '1.5px solid var(--teal)' }}
            >
              <div className={`checkbox-custom ${consentConfirmed ? 'checked' : ''}`}>
                {consentConfirmed && <CheckCircle2 size={16} />}
              </div>
              <div>
                <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '2px' }}>
                  I confirm that {name} is aware and has agreed to receive daily calls from CareCircle.
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                  Calls will be placed with care and respect. {name} can end or pause any call at any time.
                </span>
              </div>
            </label>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setStep(4)} className="btn btn-ghost">
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={submitting || !consentConfirmed}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {submitting ? 'Setting up schedule...' : `Confirm & Activate Calls for ${name}`} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: CONFIRMATION & TEST CALL */}
        {step === 6 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--green-soft)',
                color: 'var(--green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '2px solid #bbf7d0'
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>
              {name} is ready for care!
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--ink-muted)', marginBottom: '24px' }}>
              Daily check-ins are set up for <strong>{formatScheduleSummary(callSchedule.filter(s => s.isActive))}</strong> in {language}.
            </p>

            {/* TEST CALL CARD */}
            <div
              style={{
                background: 'var(--panel)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--line)',
                marginBottom: '28px',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Volume2 size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', margin: 0 }}>Hear how the call sounds</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', margin: 0 }}>Place a 1-time instant test call right now to verify the voice</p>
                </div>
              </div>

              {testCallResult ? (
                <div className={`alert-box ${testCallResult.ok ? 'success' : 'warning'}`} style={{ margin: 0 }}>
                  <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                  <span>{testCallResult.message}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={triggerTestCall}
                  disabled={testCalling}
                  className="btn btn-ghost btn-block"
                  style={{ background: '#fff' }}
                >
                  <Play size={16} fill="currentColor" /> {testCalling ? 'Dialing test call...' : `Send 1-Time Test Call to ${phone}`}
                </button>
              )}
            </div>

            {/* ACTION OPTIONS: ADD ANOTHER OR GO TO DASHBOARD */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link href="/dashboard" className="btn btn-primary btn-lg btn-block">
                Go to Parent Dashboard <ArrowRight size={18} />
              </Link>

              {currentPlan.parentsIncluded > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setName('');
                    setPhone('');
                    setHasMedicines(null);
                    setConsentConfirmed(false);
                    setStep(1);
                  }}
                  className="btn btn-ghost btn-block"
                >
                  <UserPlus size={16} /> Add Another Parent ({currentPlan.name} allows up to {currentPlan.parentsIncluded})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px' }}>Loading onboarding wizard...</div>}>
          <OnboardingContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
