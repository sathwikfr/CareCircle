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
  ScheduledCallSlot,
  MedicineTimingSlot,
  FoodRelation
} from './types';
import { PLANS } from './plans';
import { prisma } from './prisma';

export interface DBUser extends User {
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
  // Database starts clean
}

// Helper to map Prisma user to DBUser
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPrismaUser(pUser: any): DBUser {
  let sub: UserSubscription | undefined = undefined;
  if (pUser.subscription) {
    sub = {
      id: pUser.subscription.id,
      planId: (pUser.subscription.planId || 'family') as PlanId,
      status: (pUser.subscription.status || 'active') as any,
      startDate: pUser.subscription.startDate ? new Date(pUser.subscription.startDate).toISOString() : new Date().toISOString(),
      trialEndsAt: pUser.subscription.trialEndsAt ? new Date(pUser.subscription.trialEndsAt).toISOString() : undefined,
      currentPeriodEnd: pUser.subscription.currentPeriodEnd ? new Date(pUser.subscription.currentPeriodEnd).toISOString() : new Date().toISOString(),
      cancelAtPeriodEnd: Boolean(pUser.subscription.cancelAtPeriodEnd),
      amount: pUser.subscription.amount ?? 399,
      paymentMethodLast4: pUser.subscription.paymentMethodLast4 || undefined,
      paymentMethodBrand: pUser.subscription.paymentMethodBrand || undefined,
      razorpaySubscriptionId: pUser.subscription.razorpaySubscriptionId || undefined,
      razorpayPaymentId: pUser.subscription.razorpayPaymentId || undefined
    };
  }

  let notif: NotificationPreferences | undefined = undefined;
  if (pUser.notificationPreferences) {
    notif = {
      whatsapp: Boolean(pUser.notificationPreferences.whatsapp),
      sms: Boolean(pUser.notificationPreferences.sms),
      email: Boolean(pUser.notificationPreferences.email),
      push: Boolean(pUser.notificationPreferences.push),
      minimumAlertLevel: pUser.notificationPreferences.minimumAlertLevel ?? 1
    };
  }

  const dbUser: DBUser = {
    id: pUser.id,
    name: pUser.name,
    email: pUser.email,
    phone: pUser.phone || '',
    avatar: pUser.avatar || pUser.name.substring(0, 2).toUpperCase(),
    emailVerified: Boolean(pUser.emailVerified),
    phoneVerified: Boolean(pUser.phoneVerified),
    createdAt: pUser.createdAt ? new Date(pUser.createdAt).toISOString() : new Date().toISOString(),
    passwordHash: pUser.passwordHash || undefined,
    subscription: sub,
    notificationPreferences: notif
  };

  users.set(dbUser.id, dbUser);
  if (notif) notifPrefs.set(dbUser.id, notif);
  return dbUser;
}

// USER REPOSITORY (Async Prisma-backed with in-memory caching)
export async function getUserByEmail(email: string): Promise<DBUser | null> {
  const normalized = email.toLowerCase().trim();
  for (const u of users.values()) {
    if (u.email.toLowerCase() === normalized) {
      return u;
    }
  }

  try {
    const pUser = await prisma.user.findUnique({
      where: { email: normalized },
      include: { subscription: true, notificationPreferences: true }
    });
    if (pUser) {
      return mapPrismaUser(pUser);
    }
  } catch (err) {
    console.error('[DB getUserByEmail Error]:', err);
  }

  return null;
}

export async function getUserByPhone(phone: string): Promise<DBUser | null> {
  const clean = phone.replace(/\D/g, '');
  if (!clean || clean.length < 5) return null;

  for (const u of users.values()) {
    const userClean = (u.phone || '').replace(/\D/g, '');
    if (userClean && (userClean.endsWith(clean) || clean.endsWith(userClean))) {
      return u;
    }
  }

  try {
    const allUsers = await prisma.user.findMany({
      include: { subscription: true, notificationPreferences: true }
    });
    for (const pUser of allUsers) {
      const userClean = (pUser.phone || '').replace(/\D/g, '');
      if (userClean && (userClean.endsWith(clean) || clean.endsWith(userClean))) {
        return mapPrismaUser(pUser);
      }
    }
  } catch (err) {
    console.error('[DB getUserByPhone Error]:', err);
  }

  return null;
}

export async function getUserByEmailOrPhone(identifier: string): Promise<DBUser | null> {
  if (!identifier) return null;
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return getUserByEmail(trimmed);
  }
  return getUserByPhone(trimmed);
}

export async function getUserById(id: string): Promise<User | null> {
  const cached = users.get(id);
  if (cached) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...user } = cached;
    return user;
  }

  try {
    const pUser = await prisma.user.findUnique({
      where: { id },
      include: { subscription: true, notificationPreferences: true }
    });
    if (pUser) {
      const dbUser = mapPrismaUser(pUser);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...user } = dbUser;
      return user;
    }
  } catch (err) {
    console.error('[DB getUserById Error]:', err);
  }

  return null;
}

export async function getUserPasswordHash(userId: string): Promise<string | null> {
  const cached = users.get(userId);
  if (cached?.passwordHash) return cached.passwordHash;

  try {
    const pUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true }
    });
    if (pUser?.passwordHash) {
      if (cached) cached.passwordHash = pUser.passwordHash;
      return pUser.passwordHash;
    }
  } catch (err) {
    console.error('[DB getUserPasswordHash Error]:', err);
  }

  return null;
}

export async function createUser(userData: {
  name: string;
  email: string;
  phone: string;
  passwordHash?: string;
  planId?: PlanId;
}): Promise<User> {
  const id = 'usr_' + Math.random().toString(36).substring(2, 10);
  const now = new Date();
  const email = userData.email.toLowerCase().trim();

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
    email,
    phone: userData.phone,
    avatar: initials,
    emailVerified: true,
    phoneVerified: false,
    createdAt: now.toISOString(),
    passwordHash: userData.passwordHash,
    subscription: initialSubscription,
    notificationPreferences: {
      whatsapp: true,
      sms: true,
      email: true,
      push: false,
      minimumAlertLevel: 1
    }
  };

  users.set(id, newUser);

  try {
    await prisma.user.create({
      data: {
        id,
        name: userData.name,
        email,
        phone: userData.phone,
        avatar: initials,
        passwordHash: userData.passwordHash,
        emailVerified: true,
        phoneVerified: false,
        createdAt: now,
        subscription: initialSubscription
          ? {
              create: {
                id: initialSubscription.id,
                planId: 'free',
                status: 'free',
                startDate: now,
                currentPeriodEnd: new Date(now.getTime() + 365 * 86400000),
                amount: 0
              }
            }
          : undefined,
        notificationPreferences: {
          create: {
            whatsapp: true,
            sms: true,
            email: true,
            push: false,
            minimumAlertLevel: 1
          }
        }
      }
    });
  } catch (err) {
    console.error('[Prisma Create User Error]:', err);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...user } = newUser;
  return user;
}

export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    notificationPreferences?: NotificationPreferences;
  }
): Promise<{ user: User; emailChanged: boolean } | null> {
  const existing = await getUserByEmail(updates.email || '') || users.get(userId);
  let u = users.get(userId);
  if (!u && existing?.id === userId) u = existing;
  if (!u) {
    const pUser = await prisma.user.findUnique({ where: { id: userId }, include: { subscription: true, notificationPreferences: true } });
    if (pUser) u = mapPrismaUser(pUser);
  }
  if (!u) return null;

  let emailChanged = false;
  if (updates.email && updates.email.toLowerCase().trim() !== u.email.toLowerCase().trim()) {
    const conflict = await getUserByEmail(updates.email.toLowerCase().trim());
    if (conflict && conflict.id !== userId) {
      throw new Error('An account with this email already exists.');
    }
    u.email = updates.email.toLowerCase().trim();
    u.emailVerified = false;
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

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: u.name,
        email: u.email,
        phone: u.phone,
        avatar: u.avatar,
        emailVerified: u.emailVerified
      }
    });

    if (updates.notificationPreferences) {
      await prisma.notificationPreferences.upsert({
        where: { userId },
        create: {
          userId,
          whatsapp: updates.notificationPreferences.whatsapp,
          sms: updates.notificationPreferences.sms,
          email: updates.notificationPreferences.email,
          push: updates.notificationPreferences.push,
          minimumAlertLevel: updates.notificationPreferences.minimumAlertLevel
        },
        update: {
          whatsapp: updates.notificationPreferences.whatsapp,
          sms: updates.notificationPreferences.sms,
          email: updates.notificationPreferences.email,
          push: updates.notificationPreferences.push,
          minimumAlertLevel: updates.notificationPreferences.minimumAlertLevel
        }
      });
    }
  } catch (err) {
    console.error('[Prisma Update User Error]:', err);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...sanitized } = u;
  return { user: sanitized, emailChanged };
}

export async function updateUserPasswordHash(userId: string, newHash: string): Promise<boolean> {
  const user = users.get(userId) || (await getUserById(userId));
  if (user) {
    const cached = users.get(userId);
    if (cached) cached.passwordHash = newHash;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });
    return true;
  } catch (err) {
    console.error('[Prisma Update Password Error]:', err);
    return false;
  }
}

export async function updateUserSubscription(
  userId: string,
  details: {
    planId: PlanId;
    razorpaySubscriptionId?: string;
    razorpayPaymentId?: string;
    paymentMethodLast4?: string;
    paymentMethodBrand?: string;
  }
): Promise<UserSubscription | null> {
  const user = users.get(userId) || (await getUserByEmailOrPhone(userId));
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

  if (user) {
    user.subscription = sub;
    users.set(userId, user as DBUser);
  }

  try {
    await prisma.userSubscription.upsert({
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
        amount: sub.amount,
        paymentMethodLast4: sub.paymentMethodLast4,
        paymentMethodBrand: sub.paymentMethodBrand,
        razorpaySubscriptionId: sub.razorpaySubscriptionId,
        razorpayPaymentId: sub.razorpayPaymentId
      }
    });

    await prisma.invoice.create({
      data: {
        id: 'inv_' + Math.random().toString(36).substring(2, 8),
        userId,
        invoiceNumber: `CC-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        date: now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: plan.hasTrial ? 0 : plan.priceMonthly,
        planName: `${plan.name} (${plan.hasTrial ? '14-Day Free Trial Auth' : 'Monthly'})`,
        status: 'paid',
        paymentMethod: `${details.paymentMethodBrand || 'UPI'} •••• ${details.paymentMethodLast4 || '4242'}`
      }
    });
  } catch (err) {
    console.error('[Prisma Update Subscription Error]:', err);
  }

  return sub;
}

export async function cancelSubscription(userId: string): Promise<boolean> {
  const user = users.get(userId);
  if (user?.subscription) {
    user.subscription.cancelAtPeriodEnd = true;
    user.subscription.status = 'cancelled';
  }
  try {
    await prisma.userSubscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true, status: 'cancelled' }
    });
    return true;
  } catch (err) {
    console.error('[Prisma Cancel Sub Error]:', err);
    return false;
  }
}

export async function reactivateSubscription(userId: string): Promise<boolean> {
  const user = users.get(userId);
  if (user?.subscription) {
    user.subscription.cancelAtPeriodEnd = false;
    user.subscription.status = 'active';
  }
  try {
    await prisma.userSubscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: false, status: 'active' }
    });
    return true;
  } catch (err) {
    console.error('[Prisma Reactivate Sub Error]:', err);
    return false;
  }
}

export async function getUserInvoices(userId: string): Promise<Invoice[]> {
  try {
    const pInvoices = await prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return pInvoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      amount: inv.amount,
      planName: inv.planName,
      status: inv.status as any,
      downloadUrl: inv.downloadUrl || undefined,
      paymentMethod: inv.paymentMethod
    }));
  } catch (err) {
    console.error('[Prisma Invoices Error]:', err);
    return invoices.get(userId) || [];
  }
}

// PARENT REPOSITORY
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPrismaParent(p: any): ParentProfile {
  const parentObj: ParentProfile = {
    id: p.id,
    userId: p.userId,
    name: p.name,
    relationship: p.relationship,
    phone: p.phone,
    language: p.language || 'Hindi & English',
    timezone: p.timezone || 'Asia/Kolkata (IST)',
    callTime: p.callTime || '08:15 AM',
    callSchedule: p.callSchedule?.map((cs: any) => ({
      id: cs.id,
      time: cs.time,
      slot: cs.slot,
      label: cs.label,
      linkedMedicineNames: cs.linkedMedicineNames || [],
      linkedMedicines: cs.linkedMedicinesJson ? JSON.parse(cs.linkedMedicinesJson) : undefined,
      isActive: cs.isActive
    })),
    isPaused: Boolean(p.isPaused),
    pauseReason: p.pauseReason || undefined,
    pauseUntil: p.pauseUntil ? new Date(p.pauseUntil).toISOString() : undefined,
    consentGiven: Boolean(p.consentGiven),
    consentDate: p.consentDate ? new Date(p.consentDate).toISOString() : new Date().toISOString(),
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    isDeleted: Boolean(p.isDeleted)
  };

  parents.set(parentObj.id, parentObj);

  if (p.medicines) {
    const mappedMeds: Medicine[] = p.medicines.map((m: any) => ({
      id: m.id,
      parentId: parentObj.id,
      name: m.name,
      dosage: m.dosage,
      timeOfDay: m.timeOfDay as any,
      timingSlots: m.timingSlots as MedicineTimingSlot[],
      foodRelation: m.foodRelation as FoodRelation,
      frequency: m.frequency as any,
      isActive: m.isActive
    }));
    medicines.set(parentObj.id, mappedMeds);
  }

  if (p.emergencyContacts) {
    const mappedContacts: EmergencyContact[] = p.emergencyContacts.map((c: any) => ({
      id: c.id,
      parentId: parentObj.id,
      name: c.name,
      relation: c.relation,
      phone: c.phone,
      priority: c.priority as any
    }));
    contacts.set(parentObj.id, mappedContacts);
  }

  if (p.callLogs) {
    const mappedCalls: CallLog[] = p.callLogs.map((cl: any) => ({
      id: cl.id,
      parentId: parentObj.id,
      scheduledTime: cl.scheduledTime,
      actualAnswerTime: cl.actualAnswerTime || undefined,
      status: cl.status as any,
      durationSeconds: cl.durationSeconds,
      medicationConfirmed: Boolean(cl.medicationConfirmed),
      mood: cl.mood as any,
      summary: cl.summary,
      notes: cl.notes || undefined
    }));
    calls.set(parentObj.id, mappedCalls);
  }

  if (p.alerts) {
    const mappedAlerts: AlertRecord[] = p.alerts.map((al: any) => ({
      id: al.id,
      parentId: parentObj.id,
      level: al.level as any,
      title: al.title,
      message: al.message,
      channel: al.channel as any,
      timestamp: al.timestamp,
      status: al.status as any
    }));
    alerts.set(parentObj.id, mappedAlerts);
  }

  if (p.suggestions) {
    const mappedSugg: ScheduleSuggestion[] = p.suggestions.map((sg: any) => ({
      id: sg.id,
      parentId: parentObj.id,
      currentCallTime: sg.currentCallTime,
      suggestedTime: sg.suggestedTime,
      confidencePct: sg.confidencePct,
      sampleSize: sg.sampleSize,
      reason: sg.reason,
      status: sg.status as any,
      createdAt: sg.createdAt ? new Date(sg.createdAt).toISOString() : new Date().toISOString()
    }));
    suggestions.set(parentObj.id, mappedSugg);
  }

  if (p.caregivers) {
    const mappedCg: CaregiverInvite[] = p.caregivers.map((cg: any) => ({
      id: cg.id,
      parentId: parentObj.id,
      email: cg.email,
      name: cg.name,
      role: cg.role as any,
      status: cg.status as any,
      invitedAt: cg.invitedAt ? new Date(cg.invitedAt).toISOString() : new Date().toISOString()
    }));
    caregivers.set(parentObj.id, mappedCg);
  }

  return parentObj;
}

export async function getParentsForUser(userId: string): Promise<ParentProfile[]> {
  try {
    const prismaParents = await prisma.parentProfile.findMany({
      where: { userId, isDeleted: false },
      include: {
        medicines: true,
        emergencyContacts: true,
        callSchedule: true,
        callLogs: true,
        alerts: true,
        suggestions: true,
        caregivers: true
      },
      orderBy: { createdAt: 'asc' }
    });

    if (prismaParents.length > 0) {
      return prismaParents.map(mapPrismaParent);
    }
  } catch (err) {
    console.error('[Prisma getParentsForUser Error]:', err);
  }

  const list: ParentProfile[] = [];
  for (const p of parents.values()) {
    if (!p.isDeleted && p.userId === userId) {
      list.push(p);
    }
  }
  return list;
}

export async function getParentById(id: string): Promise<ParentProfile | null> {
  try {
    const p = await prisma.parentProfile.findUnique({
      where: { id },
      include: {
        medicines: true,
        emergencyContacts: true,
        callSchedule: true,
        callLogs: true,
        alerts: true,
        suggestions: true,
        caregivers: true
      }
    });
    if (p && !p.isDeleted) {
      return mapPrismaParent(p);
    }
  } catch (err) {
    console.error('[Prisma getParentById Error]:', err);
  }

  const cached = parents.get(id);
  if (!cached || cached.isDeleted) return null;
  return cached;
}

export async function createParent(data: {
  userId: string;
  name: string;
  relationship: string;
  phone: string;
  language: string;
  timezone?: string;
  callTime?: string;
  callSchedule?: ScheduledCallSlot[];
  consentGiven: boolean;
}): Promise<ParentProfile> {
  const id = 'parent_' + Math.random().toString(36).substring(2, 10);
  const now = new Date();
  const callTime = data.callTime || (data.callSchedule && data.callSchedule[0]?.time) || '08:15 AM';

  const newParent: ParentProfile = {
    id,
    userId: data.userId,
    name: data.name,
    relationship: data.relationship,
    phone: data.phone,
    language: data.language || 'Hindi & English',
    timezone: data.timezone || 'Asia/Kolkata (IST)',
    callTime,
    callSchedule: data.callSchedule || [{ id: 'slot_1', time: callTime, slot: 'morning', label: 'Daily Call', isActive: true }],
    isPaused: false,
    consentGiven: data.consentGiven,
    consentDate: now.toISOString(),
    createdAt: now.toISOString()
  };

  parents.set(id, newParent);

  try {
    await prisma.parentProfile.create({
      data: {
        id,
        userId: data.userId,
        name: data.name,
        relationship: data.relationship,
        phone: data.phone,
        language: newParent.language,
        timezone: newParent.timezone,
        callTime: newParent.callTime,
        consentGiven: true,
        consentDate: now,
        callSchedule: {
          create: (newParent.callSchedule || []).map(slot => ({
            id: slot.id,
            time: slot.time,
            slot: slot.slot,
            label: slot.label,
            linkedMedicineNames: slot.linkedMedicineNames || [],
            linkedMedicinesJson: slot.linkedMedicines ? JSON.stringify(slot.linkedMedicines) : undefined,
            isActive: slot.isActive
          }))
        },
        alerts: {
          create: {
            id: 'alt_' + Math.random().toString(36).substring(2, 8),
            level: 1,
            title: 'Profile Created & Scheduled',
            message: `Parent profile for ${data.name} created. First check-in call scheduled for tomorrow at ${newParent.callTime}.`,
            channel: 'whatsapp',
            timestamp: 'Just now',
            status: 'sent'
          }
        }
      }
    });
  } catch (err) {
    console.error('[Prisma Create Parent Error]:', err);
  }

  return newParent;
}

export async function updateParent(
  id: string,
  updates: Partial<ParentProfile>
): Promise<ParentProfile | null> {
  const p = await getParentById(id);
  if (!p) return null;
  const updated = { ...p, ...updates };
  parents.set(id, updated);

  try {
    await prisma.parentProfile.update({
      where: { id },
      data: {
        name: updates.name,
        relationship: updates.relationship,
        phone: updates.phone,
        language: updates.language,
        timezone: updates.timezone,
        callTime: updates.callTime,
        isPaused: updates.isPaused,
        pauseReason: updates.pauseReason,
        pauseUntil: updates.pauseUntil ? new Date(updates.pauseUntil) : undefined
      }
    });
  } catch (err) {
    console.error('[Prisma Update Parent Error]:', err);
  }

  return updated;
}

export async function pauseParentCalls(
  id: string,
  isPaused: boolean,
  pauseReason?: string,
  pauseUntil?: string
): Promise<ParentProfile | null> {
  return updateParent(id, { isPaused, pauseReason, pauseUntil });
}

export async function deleteParentSoft(id: string): Promise<boolean> {
  const p = parents.get(id);
  if (p) p.isDeleted = true;
  parents.delete(id);

  try {
    await prisma.parentProfile.update({
      where: { id },
      data: { isDeleted: true }
    });
    return true;
  } catch (err) {
    console.error('[Prisma Delete Parent Error]:', err);
    return false;
  }
}

// MEDICINES
export async function getMedicinesForParent(parentId: string): Promise<Medicine[]> {
  try {
    const pMeds = await prisma.medicine.findMany({
      where: { parentId, isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    if (pMeds.length > 0) {
      const mapped = pMeds.map(m => ({
        id: m.id,
        parentId,
        name: m.name,
        dosage: m.dosage,
        timeOfDay: m.timeOfDay as any,
        timingSlots: m.timingSlots as MedicineTimingSlot[],
        foodRelation: m.foodRelation as FoodRelation,
        frequency: m.frequency as any,
        isActive: m.isActive
      }));
      medicines.set(parentId, mapped);
      return mapped;
    }
  } catch (err) {
    console.error('[Prisma getMedicines Error]:', err);
  }

  return medicines.get(parentId) || [];
}

export async function setMedicinesForParent(parentId: string, meds: Medicine[]): Promise<Medicine[]> {
  medicines.set(parentId, meds);

  try {
    for (const med of meds) {
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
          isActive: med.isActive
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
    }
  } catch (err) {
    console.error('[Prisma setMedicines Error]:', err);
  }

  return meds;
}

export async function addMedicine(parentId: string, medData: Omit<Medicine, 'id' | 'parentId'>): Promise<Medicine> {
  const id = 'med_' + Math.random().toString(36).substring(2, 9);
  const newMed: Medicine = {
    id,
    parentId,
    ...medData
  };

  const current = medicines.get(parentId) || [];
  current.push(newMed);
  medicines.set(parentId, current);

  try {
    await prisma.medicine.create({
      data: {
        id,
        parentId,
        name: medData.name,
        dosage: medData.dosage,
        timeOfDay: medData.timeOfDay,
        timingSlots: medData.timingSlots || [],
        foodRelation: medData.foodRelation || 'not_specified',
        frequency: medData.frequency || 'daily',
        isActive: true
      }
    });
  } catch (err) {
    console.error('[Prisma Add Medicine Error]:', err);
  }

  return newMed;
}

export async function toggleMedicineStatus(parentId: string, medicineId: string): Promise<Medicine | null> {
  const current = medicines.get(parentId) || (await getMedicinesForParent(parentId));
  const med = current.find(m => m.id === medicineId);
  if (!med) return null;

  med.isActive = !med.isActive;
  medicines.set(parentId, current);

  try {
    await prisma.medicine.update({
      where: { id: medicineId },
      data: { isActive: med.isActive }
    });
  } catch (err) {
    console.error('[Prisma Toggle Medicine Error]:', err);
  }

  return med;
}

// EMERGENCY CONTACTS
export async function getEmergencyContacts(parentId: string): Promise<EmergencyContact[]> {
  try {
    const list = await prisma.emergencyContact.findMany({ where: { parentId } });
    if (list.length > 0) {
      const mapped = list.map(c => ({
        id: c.id,
        parentId,
        name: c.name,
        relation: c.relation,
        phone: c.phone,
        priority: c.priority as any
      }));
      contacts.set(parentId, mapped);
      return mapped;
    }
  } catch (err) {
    console.error('[Prisma Contacts Error]:', err);
  }
  return contacts.get(parentId) || [];
}

export async function setEmergencyContacts(parentId: string, list: EmergencyContact[]): Promise<EmergencyContact[]> {
  contacts.set(parentId, list);
  try {
    for (const c of list) {
      await prisma.emergencyContact.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          parentId,
          name: c.name,
          relation: c.relation,
          phone: c.phone,
          priority: c.priority
        },
        update: {
          name: c.name,
          relation: c.relation,
          phone: c.phone,
          priority: c.priority
        }
      });
    }
  } catch (err) {
    console.error('[Prisma setContacts Error]:', err);
  }
  return list;
}

// CALL LOGS
export async function getCallLogsForParent(parentId: string): Promise<CallLog[]> {
  try {
    const list = await prisma.callLog.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' }
    });
    if (list.length > 0) {
      const mapped = list.map(cl => ({
        id: cl.id,
        parentId,
        scheduledTime: cl.scheduledTime,
        actualAnswerTime: cl.actualAnswerTime || undefined,
        status: cl.status as any,
        durationSeconds: cl.durationSeconds,
        medicationConfirmed: Boolean(cl.medicationConfirmed),
        mood: cl.mood as any,
        summary: cl.summary,
        notes: cl.notes || undefined
      }));
      calls.set(parentId, mapped);
      return mapped;
    }
  } catch (err) {
    console.error('[Prisma CallLogs Error]:', err);
  }
  return calls.get(parentId) || [];
}

export async function addCallLog(parentId: string, log: Omit<CallLog, 'id' | 'parentId'>): Promise<CallLog> {
  const id = 'call_' + Math.random().toString(36).substring(2, 9);
  const newLog: CallLog = {
    id,
    parentId,
    ...log
  };

  const current = calls.get(parentId) || [];
  current.unshift(newLog);
  calls.set(parentId, current);

  try {
    await prisma.callLog.create({
      data: {
        id,
        parentId,
        scheduledTime: log.scheduledTime,
        actualAnswerTime: log.actualAnswerTime,
        status: log.status,
        durationSeconds: log.durationSeconds,
        medicationConfirmed: log.medicationConfirmed,
        mood: log.mood,
        summary: log.summary,
        notes: log.notes
      }
    });
  } catch (err) {
    console.error('[Prisma addCallLog Error]:', err);
  }

  return newLog;
}

// SCHEDULE SUGGESTIONS
export async function getScheduleSuggestionsForParent(parentId: string): Promise<ScheduleSuggestion[]> {
  try {
    const list = await prisma.scheduleSuggestion.findMany({ where: { parentId } });
    if (list.length > 0) {
      const mapped = list.map(sg => ({
        id: sg.id,
        parentId,
        currentCallTime: sg.currentCallTime,
        suggestedTime: sg.suggestedTime,
        confidencePct: sg.confidencePct,
        sampleSize: sg.sampleSize,
        reason: sg.reason,
        status: sg.status as any,
        createdAt: sg.createdAt.toISOString()
      }));
      suggestions.set(parentId, mapped);
      return mapped;
    }
  } catch (err) {
    console.error('[Prisma Suggestions Error]:', err);
  }
  return suggestions.get(parentId) || [];
}

export async function updateScheduleSuggestionStatus(
  parentId: string,
  suggestionId: string,
  status: 'accepted' | 'dismissed'
): Promise<{ success: boolean; updatedCallTime?: string }> {
  try {
    const item = await prisma.scheduleSuggestion.findUnique({ where: { id: suggestionId } });
    if (!item) return { success: false };

    await prisma.scheduleSuggestion.update({
      where: { id: suggestionId },
      data: { status }
    });

    if (status === 'accepted') {
      await prisma.parentProfile.update({
        where: { id: parentId },
        data: { callTime: item.suggestedTime }
      });
      return { success: true, updatedCallTime: item.suggestedTime };
    }

    return { success: true };
  } catch (err) {
    console.error('[Prisma Update Suggestion Error]:', err);
    return { success: false };
  }
}

// ALERTS
export async function getAlertsForParent(parentId: string): Promise<AlertRecord[]> {
  try {
    const list = await prisma.alertRecord.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' }
    });
    if (list.length > 0) {
      const mapped = list.map(al => ({
        id: al.id,
        parentId,
        level: al.level as any,
        title: al.title,
        message: al.message,
        channel: al.channel as any,
        timestamp: al.timestamp,
        status: al.status as any
      }));
      alerts.set(parentId, mapped);
      return mapped;
    }
  } catch (err) {
    console.error('[Prisma Alerts Error]:', err);
  }
  return alerts.get(parentId) || [];
}

// CAREGIVERS
export async function getCaregiversForParent(parentId: string): Promise<CaregiverInvite[]> {
  try {
    const list = await prisma.caregiverInvite.findMany({ where: { parentId } });
    if (list.length > 0) {
      const mapped = list.map(cg => ({
        id: cg.id,
        parentId,
        email: cg.email,
        name: cg.name,
        role: cg.role as any,
        status: cg.status as any,
        invitedAt: cg.invitedAt.toISOString()
      }));
      caregivers.set(parentId, mapped);
      return mapped;
    }
  } catch (err) {
    console.error('[Prisma Caregivers Error]:', err);
  }
  return caregivers.get(parentId) || [];
}

export async function inviteCaregiver(parentId: string, email: string, name: string, role: 'viewer' | 'co_manager'): Promise<CaregiverInvite> {
  const id = 'cg_' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const newInvite: CaregiverInvite = {
    id,
    parentId,
    email,
    name,
    role,
    status: 'pending',
    invitedAt: now.toISOString()
  };

  const list = caregivers.get(parentId) || [];
  list.push(newInvite);
  caregivers.set(parentId, list);

  try {
    await prisma.caregiverInvite.create({
      data: {
        id,
        parentId,
        email,
        name,
        role,
        status: 'pending',
        invitedAt: now
      }
    });
  } catch (err) {
    console.error('[Prisma inviteCaregiver Error]:', err);
  }

  return newInvite;
}

// NOTIFICATION PREFERENCES
export async function getNotificationPreferences(userIdOrParentId: string): Promise<NotificationPreferences> {
  try {
    const pref = await prisma.notificationPreferences.findUnique({
      where: { userId: userIdOrParentId }
    });
    if (pref) {
      return {
        whatsapp: Boolean(pref.whatsapp),
        sms: Boolean(pref.sms),
        email: Boolean(pref.email),
        push: Boolean(pref.push),
        minimumAlertLevel: pref.minimumAlertLevel
      };
    }
  } catch (err) {
    console.error('[Prisma getNotifPrefs Error]:', err);
  }

  return notifPrefs.get(userIdOrParentId) || {
    whatsapp: true,
    sms: true,
    email: true,
    push: false,
    minimumAlertLevel: 1
  };
}

// MEDICINE REPORTS
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
