'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Users, PhoneCall, Pill, Bell, Check, PhoneMissed, Pause, Clock, AlertTriangle, Plus, ChevronRight } from 'lucide-react';
import { ParentProfile } from '@/lib/types';
import { timeToMinutes } from '@/lib/scheduleGenerator';
import { CountUp } from '@/components/motion/CountUp';
import { ParentDetails, computeCallStats, displayName, initial } from './helpers';

type Status = { tone: 'green' | 'amber' | 'red' | 'neutral'; text: string; icon: React.ReactNode };

const DAY = 86400000;

function isToday(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
}

function parentStatus(parent: ParentProfile, details?: ParentDetails): Status {
  if (parent.isPaused) return { tone: 'amber', text: 'Calls paused', icon: <Pause size={12} /> };
  const stats = computeCallStats(details?.callLogs || [], parent.callSchedule || []);
  const urgent = (details?.alerts || []).some(a => a.level >= 3 && a.status !== 'resolved' && isToday(a.createdAt || a.timestamp));
  if (urgent) return { tone: 'red', text: 'Needs a look', icon: <AlertTriangle size={12} /> };
  const last = stats.latestToday;
  if (last) {
    const time = new Date(last.createdAt || last.scheduledTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    if (last.status === 'answered') {
      return last.medicationConfirmed
        ? { tone: 'green', text: 'All good today', icon: <Check size={12} /> }
        : { tone: 'amber', text: 'Medicine not confirmed', icon: <Pill size={12} /> };
    }
    return { tone: 'amber', text: `Missed the ${time} call`, icon: <PhoneMissed size={12} /> };
  }
  if (stats.nextSlot) return { tone: 'neutral', text: `Next call ${stats.nextSlot.time}`, icon: <Clock size={12} /> };
  if (stats.activeSlots.length) return { tone: 'neutral', text: `Tomorrow ${stats.activeSlots[0].time}`, icon: <Clock size={12} /> };
  return { tone: 'neutral', text: 'No calls set up', icon: <Clock size={12} /> };
}

type Props = {
  userName?: string;
  parents: ParentProfile[];
  detailsById: Record<string, ParentDetails>;
  selectedId: string;
  onSelect: (id: string) => void;
  canAddMore?: boolean;
  /** Checkout link shown instead of "Add a parent" when the plan is full (none on the biggest plan). */
  upgradeHref?: string;
};

/** Family-level header: greeting, live totals across every parent, and a parent picker with today's status. */
export function FamilyOverview({ userName, parents, detailsById, selectedId, onSelect, canAddMore = true, upgradeHref }: Props) {
  const firstName = userName?.split(' ')[0];
  const [nowMs] = useState(() => Date.now());

  let callsToday = 0;
  let confirmedToday = 0;
  let needsLook = 0;
  let next: { name: string; time: string; mins: number } | null = null;
  const nowMinutes = new Date(nowMs).getHours() * 60 + new Date(nowMs).getMinutes();

  for (const p of parents) {
    const d = detailsById[p.id];
    const stats = computeCallStats(d?.callLogs || [], p.callSchedule || []);
    const today = stats.completedCalls.filter(c => isToday(c.createdAt || c.scheduledTime));
    callsToday += today.length;
    confirmedToday += today.filter(c => c.status === 'answered' && c.medicationConfirmed).length;
    needsLook += (d?.alerts || []).filter(a => a.level >= 2 && a.status !== 'resolved' && nowMs - new Date(a.createdAt || a.timestamp).getTime() < DAY).length;
    if (!p.isPaused && stats.nextSlot) {
      const mins = timeToMinutes(stats.nextSlot.time);
      if (mins > nowMinutes && (!next || mins < next.mins)) next = { name: displayName(p.name), time: stats.nextSlot.time, mins };
    }
  }

  const tiles = [
    { icon: Users, value: parents.length, label: parents.length === 1 ? 'Parent' : 'Parents' },
    { icon: PhoneCall, value: callsToday, label: 'Calls today' },
    { icon: Pill, value: confirmedToday, label: 'Medicines confirmed' },
    { icon: Bell, value: needsLook, label: 'Needs a look', warn: needsLook > 0 },
  ];

  return (
    <section className="family" aria-label="Your family today">
      <div className="family-hero">
        <div className="family-hero-top">
          <div>
            <h1>
              Namaste{firstName ? ` ${firstName}` : ''} <span aria-hidden="true">👋</span>
            </h1>
            <p>
              <span className="dot live" />
              {next ? `Next check-in: ${next.name} at ${next.time}` : 'Here’s how your parents are today'}
            </p>
          </div>
          {canAddMore ? (
            <Link href="/onboarding" className="btn btn-sm family-add">
              <Plus size={15} /> Add a parent
            </Link>
          ) : upgradeHref ? (
            <Link href={upgradeHref} className="btn btn-sm family-add" title="Your plan is full. Upgrade to add another parent.">
              <Plus size={15} /> Upgrade to add a parent
            </Link>
          ) : null}
        </div>

        <div className="family-tiles">
          {tiles.map((t, i) => (
            <motion.div
              key={t.label}
              className={`family-tile${t.warn ? ' warn' : ''}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, type: 'spring', stiffness: 300, damping: 28 }}
            >
              <t.icon size={18} />
              <div className="family-num"><CountUp value={t.value} /></div>
              <span>{t.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="family-list-head">
        <h2>Your parents</h2>
        <span>Tap a parent to see their day</span>
      </div>
      <div className="family-list" role="tablist" aria-label="Choose parent">
        {parents.map((p) => {
          const st = parentStatus(p, detailsById[p.id]);
          const active = p.id === selectedId;
          const slots = (p.callSchedule || []).filter(s => s.isActive).length;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              className="family-row"
              onClick={() => onSelect(p.id)}
            >
              {active && <motion.span layoutId="family-row-ring" className="family-row-ring" aria-hidden="true" />}
              <span className="parent-avatar" style={{ width: '44px', height: '44px', borderRadius: '14px', fontSize: '1.1rem' }}>{initial(p.name)}</span>
              <span className="family-row-main">
                <b>{displayName(p.name)}</b>
                <small>{p.language} · {slots} check-in{slots === 1 ? '' : 's'} a day</small>
              </span>
              <span className={`badge badge-${st.tone === 'neutral' ? 'neutral' : st.tone}`}>{st.icon} {st.text}</span>
              <ChevronRight size={18} className="family-row-chev" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
