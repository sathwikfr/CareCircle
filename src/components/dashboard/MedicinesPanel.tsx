'use client';

import React from 'react';
import { Camera, Plus, Pill } from 'lucide-react';
import { Medicine } from '@/lib/types';
import { foodRelationLabel } from './helpers';

const FREQUENCY: Record<Medicine['frequency'], string> = {
  daily: 'Daily',
  twice_daily: 'Twice a day',
  as_needed: 'As needed'
};

type Props = {
  parentName: string;
  medicines: Medicine[];
  onUpload: () => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
};

export function MedicinesPanel({ parentName, medicines, onUpload, onAdd, onToggle }: Props) {
  const actions = (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <button onClick={onUpload} className="btn btn-ghost btn-sm">
        <Camera size={15} /> Scan prescription
      </button>
      <button onClick={onAdd} className="btn btn-primary btn-sm">
        <Plus size={15} /> Add medicine
      </button>
    </div>
  );

  return (
    <section className="panel" aria-labelledby="medicines-title">
      <div className="panel-head">
        <div>
          <h3 id="medicines-title">{parentName}&apos;s medicines</h3>
          <p>Saathi asks about each active medicine on the matching call.</p>
        </div>
        {actions}
      </div>

      {medicines.length === 0 ? (
        <div className="empty" style={{ padding: '32px 16px' }}>
          <span className="icon-tile"><Pill size={24} /></span>
          <h3>No medicines yet</h3>
          <p>Add them by hand or scan a prescription, and Saathi will start asking about them.</p>
        </div>
      ) : (
        <div className="list">
          {medicines.map((m) => {
            const food = foodRelationLabel(m.foodRelation);
            return (
              <div key={m.id} className={`list-row${m.isActive ? '' : ' dim'}`}>
                <div className="row-main" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <span className="icon-tile" style={{ width: '40px', height: '40px' }}><Pill size={18} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="row-title">
                      {m.name}
                      {!m.isActive && <span className="badge badge-neutral">Paused</span>}
                    </div>
                    <div className="row-sub" style={{ textTransform: 'none' }}>
                      {[m.dosage, m.timeOfDay.charAt(0).toUpperCase() + m.timeOfDay.slice(1), food, FREQUENCY[m.frequency]].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
                <button onClick={() => onToggle(m.id)} className={`btn btn-sm ${m.isActive ? 'btn-ghost' : 'btn-primary'}`}>
                  {m.isActive ? 'Pause' : 'Resume'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
