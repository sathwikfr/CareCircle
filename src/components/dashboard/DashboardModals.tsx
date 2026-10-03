'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, Pause, Pencil, Pill, Sparkles, Trash2, UploadCloud, Users, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SlotPicker, FoodPicker } from '@/components/onboarding/WizardUI';
import { ExtractedMedicineCandidate, FoodRelation, Medicine, MedicineTimingSlot, ParentProfile } from '@/lib/types';
import { PhoneField } from '@/components/auth/AuthUI';
import { normalizePhone } from '@/lib/phone';
import { PARENT_LANGUAGES } from '@/lib/parentLanguages';
import { SAMPLE_PRESCRIPTIONS } from '@/lib/medicineExtractor';

function ModalTitle({ id, icon, title, sub }: { id: string; icon: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '22px', paddingRight: '32px' }}>
      <span className="icon-tile" style={{ marginBottom: '14px' }}>{icon}</span>
      <h2 id={id} style={{ fontSize: '1.45rem', letterSpacing: '-0.02em', marginBottom: '6px' }}>{title}</h2>
      {sub && <p style={{ fontSize: '0.92rem', color: 'var(--ink-muted)' }}>{sub}</p>}
    </div>
  );
}

/* ---------------- Add medicine ---------------- */

type AddMedicineProps = {
  open: boolean;
  onClose: () => void;
  parentName: string;
  name: string;
  setName: (v: string) => void;
  dosage: string;
  setDosage: (v: string) => void;
  timing: Medicine['timeOfDay'];
  setTiming: (v: Medicine['timeOfDay']) => void;
  food: FoodRelation;
  setFood: (v: FoodRelation) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function AddMedicineModal(p: AddMedicineProps) {
  return (
    <Modal open={p.open} onClose={p.onClose} labelledBy="add-med-title">
      <ModalTitle id="add-med-title" icon={<Pill size={20} />} title={`Add a medicine for ${p.parentName}`} sub="Saathi will ask about it on the matching call." />
      <form onSubmit={p.onSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="add-med-name">Medicine name</label>
          <input id="add-med-name" type="text" placeholder="e.g. Amlodipine, Glycomet, Thyronorm" value={p.name} onChange={(e) => p.setName(e.target.value)} className="form-input" autoFocus required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="add-med-dose">Dose</label>
          <input id="add-med-dose" type="text" placeholder="e.g. 5mg, 1 tablet" value={p.dosage} onChange={(e) => p.setDosage(e.target.value)} className="form-input" required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="add-med-time">When is it taken?</label>
          <select id="add-med-time" value={p.timing} onChange={(e) => p.setTiming(e.target.value as Medicine['timeOfDay'])} className="form-input">
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="bedtime">Bedtime</option>
          </select>
        </div>
        <div className="form-group">
          <span className="form-label">With food?</span>
          <FoodPicker value={p.food} onChange={p.setFood} />
        </div>
        <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '8px' }}>
          Add medicine
        </button>
      </form>
    </Modal>
  );
}

/* ---------------- Pause ---------------- */

type PauseProps = {
  open: boolean;
  onClose: () => void;
  parentName: string;
  reason: string;
  setReason: (v: string) => void;
  days: string;
  setDays: (v: string) => void;
  onConfirm: () => void;
};

export function PauseModal(p: PauseProps) {
  return (
    <Modal open={p.open} onClose={p.onClose} labelledBy="pause-title">
      <ModalTitle id="pause-title" icon={<Pause size={20} />} title={`Pause calls to ${p.parentName}`} sub="For a trip, a hospital stay or a visit to you. Calls restart on their own." />
      <div className="form-group">
        <label className="form-label" htmlFor="pause-reason">Reason <span className="form-hint">Optional</span></label>
        <input id="pause-reason" type="text" placeholder="e.g. Visiting us in Pune" value={p.reason} onChange={(e) => p.setReason(e.target.value)} className="form-input" />
      </div>
      <div className="form-group">
        <span className="form-label">For how long?</span>
        <div className="segmented" role="radiogroup" aria-label="Pause length">
          {[
            { v: '3', l: '3 days' },
            { v: '7', l: '1 week' },
            { v: '14', l: '2 weeks' },
            { v: '30', l: '30 days' }
          ].map((o) => (
            <button key={o.v} type="button" role="radio" aria-checked={p.days === o.v} className={p.days === o.v ? 'active' : ''} onClick={() => p.setDays(o.v)}>
              {o.l}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button onClick={p.onClose} className="btn btn-ghost">Cancel</button>
        <button onClick={p.onConfirm} className="btn btn-primary" style={{ flex: 1 }}>Pause calls</button>
      </div>
    </Modal>
  );
}

/* ---------------- Invite ---------------- */

type InviteProps = {
  open: boolean;
  onClose: () => void;
  parentName: string;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function InviteModal(p: InviteProps) {
  return (
    <Modal open={p.open} onClose={p.onClose} labelledBy="invite-title">
      <ModalTitle id="invite-title" icon={<Users size={20} />} title="Invite a sibling or caregiver" sub={`Share the care of ${p.parentName}. We’ll save the invite now; email invitations are coming soon.`} />
      <form onSubmit={p.onSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="invite-name">Their name</label>
          <input id="invite-name" type="text" placeholder="e.g. Priya Rao" value={p.name} onChange={(e) => p.setName(e.target.value)} className="form-input" autoFocus required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="invite-email">Their email</label>
          <input id="invite-email" type="email" placeholder="priya@example.com" value={p.email} onChange={(e) => p.setEmail(e.target.value)} className="form-input" required />
        </div>
        <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '8px' }}>
          Save invite
        </button>
      </form>
    </Modal>
  );
}

/* ---------------- Delete ---------------- */

type DeleteProps = {
  open: boolean;
  onClose: () => void;
  parentName: string;
  phone: string;
  loading: boolean;
  onExport: () => void;
  onConfirm: () => void;
};

export function DeleteParentModal(p: DeleteProps) {
  return (
    <Modal open={p.open} onClose={p.onClose} labelledBy="delete-title">
      <div style={{ marginBottom: '20px', paddingRight: '32px' }}>
        <span className="icon-tile" style={{ marginBottom: '14px', background: 'var(--red-soft)', color: 'var(--red)' }}><Trash2 size={20} /></span>
        <h2 id="delete-title" style={{ fontSize: '1.45rem', letterSpacing: '-0.02em', marginBottom: '6px' }}>Remove {p.parentName}?</h2>
        <p style={{ fontSize: '0.92rem', color: 'var(--ink-muted)' }}>
          Calls to {p.phone} stop straight away and {p.parentName} disappears from your dashboard.
        </p>
      </div>
      <button type="button" onClick={p.onExport} className="action" style={{ marginBottom: '20px' }}>
        <span className="icon-tile"><Download size={17} /></span>
        <span>
          Download their history first
          <small>Medicines and call summaries as a text file</small>
        </span>
      </button>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button onClick={p.onClose} className="btn btn-ghost">Keep profile</button>
        <button onClick={p.onConfirm} disabled={p.loading} className="btn btn-danger">
          {p.loading ? <><span className="spinner" /> Removing…</> : 'Remove profile'}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- Prescription upload ---------------- */

function toggleSlot(med: ExtractedMedicineCandidate, slot: MedicineTimingSlot): ExtractedMedicineCandidate {
  const cur = med.timingSlots && med.timingSlots.length > 0 ? med.timingSlots : [med.timeOfDay || 'morning'];
  let next: MedicineTimingSlot[];
  if (slot === 'as_needed') {
    next = cur.includes('as_needed') ? ['morning'] : ['as_needed'];
  } else {
    const without = cur.filter(s => s !== 'as_needed');
    if (without.includes(slot)) {
      next = without.filter(s => s !== slot);
      if (next.length === 0) next = ['morning'];
    } else {
      next = [...without, slot];
    }
  }
  const first = next[0];
  const timeOfDay = next.includes('morning') || first === 'as_needed' || first === 'unspecified' ? 'morning' : first;
  return { ...med, timingSlots: next, timeOfDay };
}

type UploadProps = {
  open: boolean;
  onClose: () => void;
  parentName: string;
  loading: boolean;
  fileName: string | null;
  meds: ExtractedMedicineCandidate[];
  setMeds: (m: ExtractedMedicineCandidate[]) => void;
  onFile: (f: File) => void;
  onSample: (id: string) => void;
  onReset: () => void;
  confirming: boolean;
  onConfirm: () => void;
};

export function UploadReportModal(p: UploadProps) {
  const selectedCount = p.meds.filter(m => m.selected && m.name.trim()).length;
  const update = (idx: number, patch: Partial<ExtractedMedicineCandidate> | ((m: ExtractedMedicineCandidate) => ExtractedMedicineCandidate)) => {
    p.setMeds(p.meds.map((m, i) => (i === idx ? (typeof patch === 'function' ? patch(m) : { ...m, ...patch }) : m)));
  };
  const showSamples = process.env.NODE_ENV === 'development';

  return (
    <Modal open={p.open} onClose={p.onClose} labelledBy="upload-title" width={680}>
      <ModalTitle
        id="upload-title"
        icon={<Sparkles size={20} />}
        title={`Scan a prescription for ${p.parentName}`}
        sub="We read the photo and draft the medicine list. You check every line; nothing is saved until you confirm."
      />

      {p.loading && (
        <div className="dropzone" style={{ borderStyle: 'solid', borderColor: 'var(--teal)', background: 'var(--teal-light)' }} role="status">
          <span className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 14px', color: 'var(--teal)', display: 'block' }} />
          <div style={{ fontWeight: 600 }}>Reading the prescription…</div>
          <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)' }}>Finding medicine names, doses and timings</p>
        </div>
      )}

      {!p.loading && p.meds.length === 0 && (
        <>
          <div className="dropzone" style={{ marginBottom: showSamples ? '16px' : 0 }}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,text/plain"
              aria-label="Upload a prescription photo"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) p.onFile(file);
              }}
            />
            <span className="icon-tile" style={{ width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 12px', background: 'var(--panel-elevated)', boxShadow: 'var(--shadow-sm)' }}>
              <UploadCloud size={24} />
            </span>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Drop a photo here, or <span style={{ color: 'var(--teal)' }}>browse</span></div>
            <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>Prescription, discharge summary or pharmacy bill · JPG, PNG or WebP</p>
          </div>

          {showSamples && (
            <div className="card-flat" style={{ background: 'var(--paper)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.84rem', fontWeight: 600 }}>
                <FileText size={15} color="var(--teal)" /> Sample prescriptions <span className="badge badge-neutral">Dev only</span>
              </div>
              <div style={{ display: 'grid', gap: '6px' }}>
                {SAMPLE_PRESCRIPTIONS.map((sample) => (
                  <button key={sample.id} type="button" onClick={() => p.onSample(sample.id)} className="action" style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{sample.title}</span>
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!p.loading && p.meds.length > 0 && (
        <>
          <div className="notice teal" style={{ alignItems: 'center' }}>
            <Sparkles size={18} />
            <div style={{ flex: 1 }}>
              <b>{p.meds.length} medicine{p.meds.length === 1 ? '' : 's'} found</b>{p.fileName ? ` in ${p.fileName}` : ''}. Please check each one.
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={p.onReset}>Start over</button>
          </div>

          <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
            {p.meds.map((med, idx) => (
              <div key={med.id || idx} className={`row-card${!med.selected ? ' muted' : med.confidence === 'low' ? ' flagged' : ''}`} style={{ padding: '14px' }}>
                <div className="row-card-head" style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
                    <input
                      type="checkbox"
                      checked={med.selected}
                      onChange={() => update(idx, { selected: !med.selected })}
                      style={{ width: '17px', height: '17px', accentColor: 'var(--teal)' }}
                    />
                    {med.selected ? 'Include' : 'Skipped'}
                  </label>
                  {med.confidence === 'low' && <span className="badge badge-amber"><AlertTriangle size={12} /> Please check</span>}
                </div>
                <div className="row-grid" style={{ gap: '10px 12px' }}>
                  <input
                    type="text"
                    value={med.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    className="form-input"
                    placeholder="Medicine name"
                    aria-label="Medicine name"
                  />
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={(e) => update(idx, { dosage: e.target.value })}
                    className="form-input"
                    placeholder="Dose"
                    aria-label="Dose"
                  />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <SlotPicker
                      isSelected={(s) => !!med.timingSlots?.includes(s) || (s === med.timeOfDay && (!med.timingSlots || med.timingSlots.length === 0))}
                      onToggle={(s) => update(idx, (m) => toggleSlot(m, s))}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <FoodPicker value={med.foodRelation} onChange={(v) => update(idx, { foodRelation: v })} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={p.onClose} className="btn btn-ghost">Cancel</button>
            <button type="button" onClick={p.onConfirm} disabled={p.confirming || selectedCount === 0} className="btn btn-primary" style={{ flex: 1 }}>
              {p.confirming ? <><span className="spinner" /> Saving…</> : <><CheckCircle2 size={17} /> Confirm {selectedCount} medicine{selectedCount === 1 ? '' : 's'}</>}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ---------------- Edit parent details ---------------- */

export type ParentEdits = { name: string; phone: string; language: string };

type EditParentProps = {
  open: boolean;
  onClose: () => void;
  parent: ParentProfile;
  saving: boolean;
  onSave: (edits: ParentEdits) => void;
};

export function EditParentModal({ open, onClose, parent, saving, onSave }: EditParentProps) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="edit-parent-title">
      {/* Remounts on every open so the form starts from the saved details. */}
      {open && <EditParentForm parent={parent} saving={saving} onSave={onSave} />}
    </Modal>
  );
}

function EditParentForm({ parent, saving, onSave }: Omit<EditParentProps, 'open' | 'onClose'>) {
  const [name, setName] = React.useState(parent.name);
  const [phone, setPhone] = React.useState(parent.phone.replace(/^\+91/, ''));
  const [language, setLanguage] = React.useState(parent.language);
  const [error, setError] = React.useState('');

  const phoneResult = normalizePhone(phone);
  const phoneChanged = phoneResult.ok && phoneResult.e164 !== parent.phone;
  const languages = PARENT_LANGUAGES.some(l => l.value === parent.language)
    ? PARENT_LANGUAGES
    : [{ value: parent.language, label: parent.language }, ...PARENT_LANGUAGES];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please enter a name.');
    if (!phoneResult.ok) return setError(phoneResult.reason);
    if (!phoneResult.e164.startsWith('+91')) return setError('Saathi can only call Indian numbers (+91).');
    setError('');
    onSave({ name: name.trim(), phone: phoneResult.e164, language });
  };

  return (
    <>
      <ModalTitle
        id="edit-parent-title"
        icon={<Pencil size={20} />}
        title="Edit details"
        sub={`Fix a typo or update ${parent.name}’s number. Call times and medicines stay as they are.`}
      />
      <form onSubmit={submit} noValidate>
        {error && (
          <div className="alert-box error" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}
        <div className="form-group">
          <label className="form-label" htmlFor="edit-parent-name">What do you call them?</label>
          <input id="edit-parent-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input" maxLength={60} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="edit-parent-phone">Their phone number</label>
          <PhoneField id="edit-parent-phone" value={phone} onChange={setPhone} indiaOnly />
          {phoneChanged && (
            <span className="form-hint" style={{ color: 'var(--gold)' }}>
              From the next call, Saathi will ring this new number. A test call is a quick way to check it.
            </span>
          )}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="edit-parent-language">Call language</label>
          <select id="edit-parent-language" value={language} onChange={(e) => setLanguage(e.target.value)} className="form-input">
            {languages.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary btn-block btn-lg" style={{ marginTop: '8px' }}>
          {saving ? <><span className="spinner" /> Saving…</> : 'Save changes'}
        </button>
      </form>
    </>
  );
}
