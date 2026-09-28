import {
  User,
  UserSubscription,
  Invoice,
  PlanId,
  ParentProfile,
  Medicine,
  EmergencyContact,
  CallLog,
  AlertRecord,
  ScheduleSuggestion,
  CaregiverInvite,
  NotificationPreferences,
  MedicineReport,
  ExtractedMedicineCandidate,
  ScheduledCallSlot
} from './types';
import { PLANS } from './plans';
import { prisma } from './prisma';

interface DBUser extends User {
  passwordHash?: string;
}

// Global in-memory storage preserved across hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var __carecircle_users: Map<string, DBUser> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_invoices: Map<string, Invoice[]> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_parents: Map<string, ParentProfile> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_medicines: Map<string, Medicine[]> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_contacts: Map<string, EmergencyContact[]> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_calls: Map<string, CallLog[]> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_alerts: Map<string, AlertRecord[]> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_suggestions: Map<string, ScheduleSuggestion[]> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_caregivers: Map<string, CaregiverInvite[]> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_notif_prefs: Map<string, NotificationPreferences> | undefined;
  // eslint-disable-next-line no-var
  var __carecircle_medicine_reports: Map<string, MedicineReport> | undefined;
}

const users: Map<string, DBUser> = global.__carecircle_users || new Map();
const invoices: Map<string, Invoice[]> = global.__carecircle_invoices || new Map();
const parents: Map<string, ParentProfile> = global.__carecircle_parents || new Map();
const medicines: Map<string, Medicine[]> = global.__carecircle_medicines || new Map();
const contacts: Map<string, EmergencyContact[]> = global.__carecircle_contacts || new Map();
const calls: Map<string, CallLog[]> = global.__carecircle_calls || new Map();
const alerts: Map<string, AlertRecord[]> = global.__carecircle_alerts || new Map();
const suggestions: Map<string, ScheduleSuggestion[]> = global.__carecircle_suggestions || new Map();
const caregivers: Map<string, CaregiverInvite[]> = global.__carecircle_caregivers || new Map();
const notifPrefs: Map<string, NotificationPreferences> = global.__carecircle_notif_prefs || new Map();
const medicineReports: Map<string, MedicineReport> = global.__carecircle_medicine_reports || new Map();

if (!global.__carecircle_users) global.__carecircle_users = users;
if (!global.__carecircle_invoices) global.__carecircle_invoices = invoices;
if (!global.__carecircle_parents) global.__carecircle_parents = parents;
if (!global.__carecircle_medicines) global.__carecircle_medicines = medicines;
if (!global.__carecircle_contacts) global.__carecircle_contacts = contacts;
if (!global.__carecircle_calls) global.__carecircle_calls = calls;
if (!global.__carecircle_alerts) global.__carecircle_alerts = alerts;
if (!global.__carecircle_suggestions) global.__carecircle_suggestions = suggestions;
if (!global.__carecircle_caregivers) global.__carecircle_caregivers = caregivers;
if (!global.__carecircle_notif_prefs) global.__carecircle_notif_prefs = notifPrefs;
if (!global.__carecircle_medicine_reports) global.__carecircle_medicine_reports = medicineReports;

export function ensureDemoDataSeeded() {
  // No automatic fake parent seeding - database starts completely clean
}

// USER REPOSITORY
export function getUserByEmail(email: string): DBUser | null {
  const normalized = email.toLowerCase().trim();
  for (const u of users.values()) {
    if (u.email.toLowerCase() === normalized) {
      return u;
    }
  }
  return null;
}

export function getUserByPhone(phone: string): DBUser | null {
  const clean = phone.replace(/\D/g, '');
  if (!clean || clean.length < 5) return null;
  for (const u of users.values()) {
    const userClean = (u.phone || '').replace(/\D/g, '');
    if (userClean && (userClean.endsWith(clean) || clean.endsWith(userClean))) {
      return u;
    }
  }
  return null;
}

export function getUserByEmailOrPhone(identifier: string): DBUser | null {
  if (!identifier) return null;
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return getUserByEmail(trimmed);
  }
  return getUserByPhone(trimmed);
}

// Async background sync to Prisma PostgreSQL
export async function syncUserToPrisma(user: DBUser) {
  try {
    const email = user.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      user.id = existing.id;
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: user.name,
          phone: user.phone,
          avatar: user.avatar,
          passwordHash: user.passwordHash || existing.passwordHash,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified
        }
      });
    } else {
      await prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          email,
          phone: user.phone,
          avatar: user.avatar,
          passwordHash: user.passwordHash,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          createdAt: new Date(user.createdAt)
        }
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Prisma Sync User Error]:', msg);
  }
}

export async function syncParentToPrisma(parent: ParentProfile) {
  try {
    let resolvedUserId = parent.userId;
    const user = users.get(parent.userId);
    if (user) {
      await syncUserToPrisma(user);
      resolvedUserId = user.id;
    } else {
      const dbUser = await prisma.user.findUnique({ where: { id: parent.userId } });
      if (dbUser) resolvedUserId = dbUser.id;
    }

    await prisma.parentProfile.upsert({
      where: { id: parent.id },
      create: {
        id: parent.id,
        userId: resolvedUserId,
        name: parent.name,
        relationship: parent.relationship,
        phone: parent.phone,
        language: parent.language,
        timezone: parent.timezone,
        callTime: parent.callTime,
        isPaused: parent.isPaused,
        pauseReason: parent.pauseReason,
        pauseUntil: parent.pauseUntil ? new Date(parent.pauseUntil) : undefined,
        consentGiven: parent.consentGiven,
        consentDate: new Date(parent.consentDate),
        isDeleted: Boolean(parent.isDeleted),
        createdAt: new Date(parent.createdAt)
      },
      update: {
        userId: resolvedUserId,
        name: parent.name,
        relationship: parent.relationship,
        phone: parent.phone,
        language: parent.language,
        timezone: parent.timezone,
        callTime: parent.callTime,
        isPaused: parent.isPaused,
        pauseReason: parent.pauseReason,
        pauseUntil: parent.pauseUntil ? new Date(parent.pauseUntil) : undefined,
        consentGiven: parent.consentGiven,
        isDeleted: Boolean(parent.isDeleted)
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Prisma Sync Parent Error]:', msg);
  }
}

export async function syncMedicineToPrisma(parentId: string, med: Medicine) {
  try {
    const parent = parents.get(parentId);
    if (parent) {
      await syncParentToPrisma(parent);
    }
    await prisma.medicine.upsert({
      where: { id: med.id },
      create: {
        id: med.id,
        parentId,
        name: med.name,
        dosage: med.dosage,
        timeOfDay: med.timeOfDay,
        timingSlots: med.timingSlots || [],
        foodRelation: med.foodRelation || 'not_specified',
        frequency: med.frequency || 'daily',
        isActive: true
      },
      update: {
        name: med.name,
        dosage: med.dosage,
        timeOfDay: med.timeOfDay,
        timingSlots: med.timingSlots || [],
        foodRelation: med.foodRelation || 'not_specified',
        frequency: med.frequency || 'daily',
        isActive: med.isActive
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Prisma Sync Medicine Error]:', msg);
  }
}

export function createUser(userData: {
  name: string;
  email: string;
  phone: string;
  passwordHash?: string;
  planId?: PlanId;
}): User {
  const id = 'usr_' + Math.random().toString(36).substring(2, 10);
  const now = new Date();

  let initialSubscription: UserSubscription | undefined = undefined;
  if (userData.planId === 'free') {
    initialSubscription = {
      id: 'sub_' + Math.random().toString(36).substring(2, 10),
      planId: 'free',
      status: 'free',
      startDate: now.toISOString(),
      currentPeriodEnd: new Date(now.getTime() + 365 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      amount: 0
    };
  }

  const initials = userData.name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'CC';

  const newUser: DBUser = {
    id,
    name: userData.name,
    email: userData.email.toLowerCase().trim(),
    phone: userData.phone,
    avatar: initials,
    emailVerified: true,
    phoneVerified: false,
    createdAt: now.toISOString(),
    passwordHash: userData.passwordHash,
    subscription: initialSubscription
  };

  users.set(id, newUser);
  syncUserToPrisma(newUser);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...user } = newUser;
  return user;
}

export function getUserById(id: string): User | null {
  const u = users.get(id);
  if (!u) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...user } = u;
  if (!user.notificationPreferences) {
    user.notificationPreferences = notifPrefs.get(id) || {
      whatsapp: true,
      sms: true,
      email: true,
      push: false,
      minimumAlertLevel: 1
    };
  }
  return user;
}

export function getUserPasswordHash(userId: string): string | null {
  const u = users.get(userId);
  return u?.passwordHash || null;
}

export function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    notificationPreferences?: NotificationPreferences;
  }
): { user: User; emailChanged: boolean } | null {
  const u = users.get(userId);
  if (!u) return null;

  let emailChanged = false;
  if (updates.email && updates.email.toLowerCase().trim() !== u.email.toLowerCase().trim()) {
    const existing = getUserByEmail(updates.email.toLowerCase().trim());
    if (existing && existing.id !== userId) {
      throw new Error('An account with this email already exists.');
    }
    u.email = updates.email.toLowerCase().trim();
    u.emailVerified = false; // Trigger re-verification
    emailChanged = true;
  }

  if (updates.name && updates.name.trim()) {
    u.name = updates.name.trim();
    if (!updates.avatar && (!u.avatar || u.avatar.length <= 3)) {
      u.avatar = u.name
        .split(' ')
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .substring(0, 2) || 'CC';
    }
  }

  if (updates.phone !== undefined) {
    u.phone = updates.phone.trim();
  }

  if (updates.avatar !== undefined) {
    u.avatar = updates.avatar.trim();
  }

  if (updates.notificationPreferences) {
    u.notificationPreferences = updates.notificationPreferences;
    notifPrefs.set(userId, updates.notificationPreferences);
  }

  users.set(userId, u);
  syncUserToPrisma(u);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...sanitized } = u;
  return { user: sanitized, emailChanged };
}

export function updateUserPasswordHash(userId: string, newHash: string): boolean {
  const user = users.get(userId);
  if (!user) return false;
  user.passwordHash = newHash;
  users.set(userId, user);
  syncUserToPrisma(user);
  return true;
}

export function updateUserSubscription(
  userId: string,
  details: {
    planId: PlanId;
    razorpaySubscriptionId?: string;
    razorpayPaymentId?: string;
    paymentMethodLast4?: string;
    paymentMethodBrand?: string;
  }
): UserSubscription | null {
  const user = users.get(userId);
  if (!user) return null;

  const plan = PLANS[details.planId];
  const now = new Date();
  const trialEnd = plan.hasTrial ? new Date(now.getTime() + plan.trialDays * 86400000) : undefined;
  const periodEnd = trialEnd || new Date(now.getTime() + 30 * 86400000);

  const sub: UserSubscription = {
    id: details.razorpaySubscriptionId || 'sub_' + Math.random().toString(36).substring(2, 10),
    planId: details.planId,
    status: plan.hasTrial ? 'trialing' : (plan.priceMonthly === 0 ? 'free' : 'active'),
    startDate: now.toISOString(),
    trialEndsAt: trialEnd ? trialEnd.toISOString() : undefined,
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    amount: plan.priceMonthly,
    paymentMethodLast4: details.paymentMethodLast4 || '4242',
    paymentMethodBrand: details.paymentMethodBrand || 'Card / UPI',
    razorpaySubscriptionId: details.razorpaySubscriptionId,
    razorpayPaymentId: details.razorpayPaymentId
  };

  user.subscription = sub;
  users.set(userId, user);

  prisma.userSubscription.upsert({
    where: { userId },
    create: {
      id: sub.id,
      userId,
      planId: sub.planId,
      status: sub.status,
      startDate: new Date(sub.startDate),
      trialEndsAt: sub.trialEndsAt ? new Date(sub.trialEndsAt) : undefined,
      currentPeriodEnd: new Date(sub.currentPeriodEnd),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      amount: sub.amount,
      paymentMethodLast4: sub.paymentMethodLast4,
      paymentMethodBrand: sub.paymentMethodBrand,
      razorpaySubscriptionId: sub.razorpaySubscriptionId,
      razorpayPaymentId: sub.razorpayPaymentId
    },
    update: {
      planId: sub.planId,
      status: sub.status,
      currentPeriodEnd: new Date(sub.currentPeriodEnd),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      amount: sub.amount
    }
  }).catch(err => console.warn('[Prisma Sub Error]:', err.message));

  const userInvoices = invoices.get(userId) || [];
  userInvoices.unshift({
    id: 'inv_' + Math.random().toString(36).substring(2, 8),
    invoiceNumber: `CC-${now.getFullYear()}-${String(userInvoices.length + 1).padStart(3, '0')}`,
    date: now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
    amount: plan.hasTrial ? 0 : plan.priceMonthly,
    planName: `${plan.name} (${plan.hasTrial ? '14-Day Free Trial Auth' : 'Monthly'})`,
    status: 'paid',
    paymentMethod: `${details.paymentMethodBrand || 'UPI'} •••• ${details.paymentMethodLast4 || '4242'}`
  });
  invoices.set(userId, userInvoices);

  return sub;
}

export function cancelSubscription(userId: string): boolean {
  const user = users.get(userId);
  if (!user || !user.subscription) return false;

  user.subscription.cancelAtPeriodEnd = true;
  user.subscription.status = 'cancelled';
  users.set(userId, user);
  prisma.userSubscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: true, status: 'cancelled' }
  }).catch(err => console.warn('[Prisma Cancel Sub Error]:', err.message));
  return true;
}

export function reactivateSubscription(userId: string): boolean {
  const user = users.get(userId);
  if (!user || !user.subscription) return false;

  user.subscription.cancelAtPeriodEnd = false;
  user.subscription.status = 'active';
  users.set(userId, user);
  prisma.userSubscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: false, status: 'active' }
  }).catch(err => console.warn('[Prisma Reactivate Sub Error]:', err.message));
  return true;
}

export function getUserInvoices(userId: string): Invoice[] {
  return invoices.get(userId) || [];
}

// PARENT REPOSITORY
export function getParentsForUser(userId: string): ParentProfile[] {
  ensureDemoDataSeeded();
  const list: ParentProfile[] = [];
  for (const p of parents.values()) {
    if (!p.isDeleted && p.userId === userId) {
      list.push(p);
    }
  }
  return list;
}

export function getParentById(id: string): ParentProfile | null {
  const p = parents.get(id);
  if (!p || p.isDeleted) return null;
  return p;
}

export function createParent(data: {
  userId: string;
  name: string;
  relationship: string;
  phone: string;
  language: string;
  timezone?: string;
  callTime?: string;
  callSchedule?: ScheduledCallSlot[];
  consentGiven: boolean;
}): ParentProfile {
  const id = 'parent_' + Math.random().toString(36).substring(2, 10);
  const newParent: ParentProfile = {
    id,
    userId: data.userId,
    name: data.name,
    relationship: data.relationship,
    phone: data.phone,
    language: data.language || 'Hindi & English',
    timezone: data.timezone || 'Asia/Kolkata (IST)',
    callTime: data.callTime || (data.callSchedule && data.callSchedule[0]?.time) || '08:15 AM',
    callSchedule: data.callSchedule || (data.callTime ? [{ id: 'slot_1', time: data.callTime, slot: 'morning', label: 'Daily Call', isActive: true }] : undefined),
    isPaused: false,
    consentGiven: data.consentGiven,
    consentDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  parents.set(id, newParent);
  syncParentToPrisma(newParent);

  medicines.set(id, []);
  contacts.set(id, []);
  calls.set(id, []);
  alerts.set(id, [
    {
      id: 'alt_' + Math.random().toString(36).substring(2, 8),
      parentId: id,
      level: 1,
      title: 'Profile Created & Scheduled',
      message: `Parent profile for ${data.name} created. First check-in call scheduled for tomorrow at ${newParent.callTime}.`,
      channel: 'whatsapp',
      timestamp: 'Just now',
      status: 'sent'
    }
  ]);
  suggestions.set(id, []);
  caregivers.set(id, []);
  notifPrefs.set(id, {
    whatsapp: true,
    sms: true,
    email: true,
    push: false,
    minimumAlertLevel: 1
  });

  return newParent;
}

export function updateParent(
  id: string,
  updates: Partial<ParentProfile>
): ParentProfile | null {
  const p = parents.get(id);
  if (!p) return null;
  const updated = { ...p, ...updates };
  parents.set(id, updated);
  syncParentToPrisma(updated);
  return updated;
}

export function pauseParentCalls(
  id: string,
  isPaused: boolean,
  pauseReason?: string,
  pauseUntil?: string
): ParentProfile | null {
  const p = parents.get(id);
  if (!p) return null;
  p.isPaused = isPaused;
  p.pauseReason = pauseReason;
  p.pauseUntil = pauseUntil;
  parents.set(id, p);
  syncParentToPrisma(p);
  return p;
}

export function deleteParentSoft(id: string): boolean {
  const p = parents.get(id);
  if (!p) return false;
  p.isDeleted = true;
  parents.delete(id);
  medicines.delete(id);
  contacts.delete(id);
  calls.delete(id);
  alerts.delete(id);
  suggestions.delete(id);
  caregivers.delete(id);
  notifPrefs.delete(id);

  prisma.parentProfile.delete({ where: { id } }).catch(err => console.warn('[Prisma Delete Parent Error]:', err.message));
  return true;
}

// MEDICINES REPOSITORY
export function getMedicinesForParent(parentId: string): Medicine[] {
  return medicines.get(parentId) || [];
}

export function setMedicinesForParent(parentId: string, meds: Medicine[]): Medicine[] {
  medicines.set(parentId, meds);
  meds.forEach(m => syncMedicineToPrisma(parentId, m));
  return meds;
}

export function addMedicine(parentId: string, medData: Omit<Medicine, 'id' | 'parentId'>): Medicine {
  const current = medicines.get(parentId) || [];
  const newMed: Medicine = {
    id: 'med_' + Math.random().toString(36).substring(2, 9),
    parentId,
    ...medData
  };
  current.push(newMed);
  medicines.set(parentId, current);
  syncMedicineToPrisma(parentId, newMed);
  return newMed;
}

export function toggleMedicineStatus(parentId: string, medicineId: string): Medicine | null {
  const current = medicines.get(parentId) || [];
  const med = current.find(m => m.id === medicineId);
  if (!med) return null;
  med.isActive = !med.isActive;
  medicines.set(parentId, current);
  return med;
}

// MEDICINE REPORTS & AI EXTRACTION AUDIT
export function createMedicineReport(reportData: {
  parentId?: string;
  userId?: string;
  fileName: string;
  fileType: string;
  fileUrl?: string;
  rawExtractionJson: ExtractedMedicineCandidate[];
  batchConfidence?: 'high' | 'medium' | 'low';
  batchQualityWarning?: string;
}): MedicineReport {
  const id = 'mrep_' + Math.random().toString(36).substring(2, 10);
  const record: MedicineReport = {
    id,
    parentId: reportData.parentId,
    userId: reportData.userId,
    fileName: reportData.fileName,
    fileType: reportData.fileType,
    fileUrl: reportData.fileUrl,
    uploadedAt: new Date().toISOString(),
    rawExtractionJson: reportData.rawExtractionJson,
    batchConfidence: reportData.batchConfidence || 'high',
    batchQualityWarning: reportData.batchQualityWarning,
    status: 'draft'
  };
  medicineReports.set(id, record);
  return record;
}

export function getMedicineReportById(reportId: string): MedicineReport | null {
  return medicineReports.get(reportId) || null;
}

export function getMedicineReportsForParent(parentId: string): MedicineReport[] {
  const list: MedicineReport[] = [];
  for (const r of medicineReports.values()) {
    if (r.parentId === parentId) {
      list.push(r);
    }
  }
  return list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export function confirmMedicineReport(
  reportId: string,
  confirmedMedicineIds: string[]
): MedicineReport | null {
  const r = medicineReports.get(reportId);
  if (!r) return null;
  r.status = 'confirmed';
  r.confirmedAt = new Date().toISOString();
  r.confirmedMedicineIds = confirmedMedicineIds;
  medicineReports.set(reportId, r);
  return r;
}

// EMERGENCY CONTACTS
export function getEmergencyContacts(parentId: string): EmergencyContact[] {
  return contacts.get(parentId) || [];
}

export function setEmergencyContacts(parentId: string, list: EmergencyContact[]): EmergencyContact[] {
  contacts.set(parentId, list);
  return list;
}

export function addEmergencyContact(parentId: string, contactData: Omit<EmergencyContact, 'id' | 'parentId'>): EmergencyContact {
  const current = contacts.get(parentId) || [];
  const newContact: EmergencyContact = {
    id: 'emg_' + Math.random().toString(36).substring(2, 9),
    parentId,
    ...contactData
  };
  current.push(newContact);
  contacts.set(parentId, current);
  return newContact;
}

// CALL LOGS
export function getCallLogsForParent(parentId: string): CallLog[] {
  return calls.get(parentId) || [];
}

export function addCallLog(parentId: string, log: Omit<CallLog, 'id' | 'parentId'>): CallLog {
  const current = calls.get(parentId) || [];
  const newLog: CallLog = {
    id: 'call_' + Math.random().toString(36).substring(2, 9),
    parentId,
    ...log
  };
  current.unshift(newLog);
  calls.set(parentId, current);
  return newLog;
}

// SCHEDULE SUGGESTIONS
export function getScheduleSuggestionsForParent(parentId: string): ScheduleSuggestion[] {
  return suggestions.get(parentId) || [];
}

export function updateScheduleSuggestionStatus(
  parentId: string,
  suggestionId: string,
  status: 'accepted' | 'dismissed'
): { success: boolean; updatedCallTime?: string } {
  const list = suggestions.get(parentId) || [];
  const item = list.find(s => s.id === suggestionId);
  if (!item) return { success: false };

  item.status = status;
  suggestions.set(parentId, list);

  if (status === 'accepted') {
    const parent = parents.get(parentId);
    if (parent) {
      parent.callTime = item.suggestedTime;
      parents.set(parentId, parent);
      return { success: true, updatedCallTime: item.suggestedTime };
    }
  }

  return { success: true };
}

// ALERTS
export function getAlertsForParent(parentId: string): AlertRecord[] {
  return alerts.get(parentId) || [];
}

// CAREGIVERS
export function getCaregiversForParent(parentId: string): CaregiverInvite[] {
  return caregivers.get(parentId) || [];
}

export function inviteCaregiver(parentId: string, email: string, name: string, role: 'viewer' | 'co_manager'): CaregiverInvite {
  const list = caregivers.get(parentId) || [];
  const newInvite: CaregiverInvite = {
    id: 'cg_' + Math.random().toString(36).substring(2, 9),
    parentId,
    email,
    name,
    role,
    status: 'pending',
    invitedAt: new Date().toISOString()
  };
  list.push(newInvite);
  caregivers.set(parentId, list);
  return newInvite;
}

// NOTIFICATION PREFERENCES
export function getNotificationPreferences(parentId: string): NotificationPreferences {
  return notifPrefs.get(parentId) || {
    whatsapp: true,
    sms: true,
    email: true,
    push: false,
    minimumAlertLevel: 1
  };
}

export function updateNotificationPreferences(parentId: string, prefs: NotificationPreferences): NotificationPreferences {
  notifPrefs.set(parentId, prefs);
  return prefs;
}


