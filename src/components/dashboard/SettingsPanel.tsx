'use client';

import React from 'react';
import { Pause, Pencil, Play, Plus, Trash2, UserRound } from 'lucide-react';
import { ParentProfile, CaregiverInvite, EmergencyContact } from '@/lib/types';
import { formatScheduleSummary } from '@/lib/scheduleGenerator';
import { CallStats, formatPhone } from './helpers';

type Props = {
  parent: ParentProfile;
  stats: CallStats;
  caregivers: CaregiverInvite[];
  contacts: EmergencyContact[];
  onPause: () => void;
  onResume: () => void;
  onInvite: () => void;
  onDelete: () => void;
  onEdit: () => void;
};

export function SettingsPanel({ parent, stats, caregivers, contacts, onPause, onResume, onInvite, onDelete, onEdit }: Props) {
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <section className="panel" aria-labelledby="routine-title">
        <div className="panel-head">
          <div>
            <h3 id="routine-title">Calls</h3>
            <p>How and when Saathi calls {parent.name}.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={onEdit} className="btn btn-ghost btn-sm"><Pencil size={14} /> Edit details</button>
            {parent.isPaused ? (
              <button onClick={onResume} className="btn btn-primary btn-sm"><Play size={15} /> Resume calls</button>
            ) : (
              <button onClick={onPause} className="btn btn-ghost btn-sm"><Pause size={15} /> Pause calls</button>
            )}
          </div>
        </div>
        <div className="kv">
          <div>
            <span>Schedule</span>
            <strong>{stats.activeSlots.length > 0 ? formatScheduleSummary(stats.activeSlots) : 'No calls scheduled'}</strong>
          </div>
          <div>
            <span>Language</span>
            <strong>{parent.language}</strong>
          </div>
          <div>
            <span>Time zone</span>
            <strong>{parent.timezone}</strong>
          </div>
          <div>
            <span>Phone</span>
            <strong>{formatPhone(parent.phone)}</strong>
          </div>
        </div>
      </section>

      {contacts.length > 0 && (
        <section className="panel" aria-labelledby="contacts-title">
          <div className="panel-head">
            <div>
              <h3 id="contacts-title">Family contacts</h3>
              <p>Who to reach if something is wrong, in order.</p>
            </div>
          </div>
          <div className="list">
            {contacts.map((c, i) => (
              <div key={c.id || i} className="list-row">
                <div className="row-main" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span className="icon-tile" style={{ width: '38px', height: '38px' }}><UserRound size={17} /></span>
                  <div>
                    <div className="row-title">{c.name}</div>
                    <div className="row-sub">{[c.relation, c.phone].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
                <span className={`badge ${i === 0 ? 'badge-teal' : 'badge-neutral'}`}>{i === 0 ? 'First' : `Backup ${i}`}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel" aria-labelledby="family-title">
        <div className="panel-head">
          <div>
            <h3 id="family-title">Siblings & caregivers</h3>
            <p>Family you&apos;ve invited to help look after {parent.name}. Email invitations are coming soon.</p>
          </div>
          <button onClick={onInvite} className="btn btn-ghost btn-sm"><Plus size={14} /> Invite</button>
        </div>
        {caregivers.length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>No one invited yet.</p>
        ) : (
          <div className="list">
            {caregivers.map((cg) => (
              <div key={cg.id} className="list-row">
                <div className="row-main">
                  <div className="row-title">{cg.name}</div>
                  <div className="row-sub">{cg.email}</div>
                </div>
                <span className={`badge ${cg.status === 'accepted' ? 'badge-green' : 'badge-neutral'}`} style={{ textTransform: 'capitalize' }}>
                  {cg.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel danger-zone" aria-labelledby="danger-title">
        <div className="panel-head" style={{ marginBottom: 0 }}>
          <div style={{ maxWidth: '56ch' }}>
            <h3 id="danger-title" style={{ color: 'var(--red)' }}>Remove {parent.name}</h3>
            <p>Stops all calls and removes {parent.name} from your dashboard. You can download their history first.</p>
          </div>
          <button onClick={onDelete} className="btn btn-danger-ghost btn-sm"><Trash2 size={14} /> Remove profile</button>
        </div>
      </section>
    </div>
  );
}
