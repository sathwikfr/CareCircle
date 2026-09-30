@AGENTS.md

# CareCircle — project guide for Claude sessions

> Full audit + bug/security pass + Sarvam call pipeline: 2026-09-30. Calling is fully built and tested against a fake Sarvam;
> it is switched OFF until the `SARVAM_*` env vars are set (see `docs/sarvam-agent.md`).
> When code and this file disagree, **trust the code** and update this file.

## 1. Rules for working in this repo (read first)

1. **Never run destructive DB operations.** No `prisma migrate reset`, no `prisma db push --accept-data-loss`, no bulk `deleteMany` on user data, and never run `scripts/clear-database.ts` (it wipes every table). There is **no `prisma/migrations` folder**; the schema has been synced with `prisma db push`, so schema changes must be **additive only** (new nullable columns / new tables). Take a Supabase backup and show the user the diff first.
2. **Never touch Groq vision internals** (`src/lib/groqVision.ts`, `src/lib/medicineExtractor.ts`) unless the user explicitly asks. Extraction is always an **editable draft the user confirms**; manual entry stays as the fallback.
3. **Never print secrets.** Read env files only for key *names*. Never commit env files.
4. **Ask before deleting any file.**
5. This is **Next.js 16**: read `node_modules/next/dist/docs/` before framework code. `middleware.ts` is deprecated → **`src/proxy.ts`**.
6. User data is soft-deleted (`ParentProfile.isDeleted`). Never hard-delete parents, call logs, alerts, medicines.
7. Don't reintroduce Twilio or Groq into the calling pipeline (see §9).
8. Every `/api/parents/[id]/*` route must use `requireOwnedParent()` from `src/lib/access.ts`; every other private route uses `requireUser()`.
9. Never fabricate data shown to families (no fake call logs, demo stats, or sample medicines presented as real).
10. Testing on localhost writes to the **real Supabase DB** (there is no separate dev DB). Use a throwaway `claude-e2e-*@example.com` account and delete only that account's rows afterwards.

## 2. Product summary

- **CareCircle**: platform for adult children in India to look after elderly parents living apart. Paying customer = the child.
- **Saathi AI**: voice companion that phones the parent on schedule: medicine confirmation, one wellbeing question, reminders; results update the child's dashboard and raise alerts.
- Core loop: call → ask 2–3 questions → record answers → update dashboard → alert if needed. Alert levels 0 (fine) … 4 (emergency).
- Plans (`src/lib/plans.ts`): Free ₹0 (1 parent, 1 call/day), Family ₹1,299 (2 parents, 14-day trial, 3 calls/day), Extended ₹2,999 (5 parents, 14-day trial, 3 calls/day). Cost model + margins are in the comment at the top of `plans.ts`. `getEffectivePlan()` decides which limits apply.
- Parked, do not build: wearable integration.

## 3. AI safety rules (non-negotiable)

- Saathi never diagnoses, never acts like a doctor, never panics the parent; defers to a real doctor or family member.
- **Code-level safety net**: after every call, scan the final transcript for emergency words in all supported languages (Hindi, Telugu, Tamil, Kannada, Bengali, Marathi, Gujarati, Malayalam, English) and raise an alert independently of the voice provider.
- Medicine data from AI extraction is never saved without explicit user confirmation. On extraction failure the user gets an error, never substitute medicines.

## 4. Tech stack (as found in code)

| Area | Reality |
|---|---|
| Framework | Next.js **16.3.6** App Router, React 19.2, TypeScript strict. |
| Styling | Plain CSS design system in `src/app/globals.css` (tokens on `:root`, dark theme under `[data-theme='dark']`, shared classes: `.btn`, `.panel`, `.form-input`, `.segmented`, `.badge`, `.notice`, …) + CSS module for the landing page + `lucide-react`. Use tokens (`var(--teal)`, `--on-teal`, `--teal-text`), never raw hex. Dark mode: inline `<head>` script from `lib/theme.ts` + `ThemeToggle`. **No Tailwind / shadcn.** |
| DB | Prisma 6 + Supabase Postgres. `db push`, no migrations history. |
| Data layer | `src/lib/db.ts` is **Prisma-only** (no caches); write helpers throw on failure. |
| Auth | Custom. bcrypt passwords; opaque DB sessions (`sess_…` in cookie `carecircle_session`), checked against `DBSession` on every request; no JWT. Google = Google Identity Services ID token verified server-side (needs `GOOGLE_CLIENT_ID`). OTP = DB-stored hashed codes; **no SMS provider**, so phone OTP only works under `next dev` (503 elsewhere). Master OTP `123456` works only under `next dev`. |
| Payments | Razorpay Checkout + server signature verification + subscription ownership check (notes.carecircle_user_id). Without real keys: local sandbox **only under `next dev`**; production returns 503. Webhook requires valid signature. |
| Email | Resend. Default sender `onboarding@resend.dev` only delivers to the Resend account owner (warning logged); needs a verified domain in `RESEND_FROM_EMAIL`. |
| AI | Groq vision via `fetch` (images only; PDFs rejected with a clear message). |
| Calling | **Built** on Sarvam Voice Agents: `lib/sarvam.ts` (client), `lib/callDispatch.ts` (scheduler/retries), `lib/callResults.ts` (webhook), `lib/alerts.ts` + `lib/safety.ts` (alerts + emergency scan). Inactive until `SARVAM_*` are set; then `/api/cron/dispatch` (external cron) places calls. Twilio/Groq-calling removed. |
| Page guards | `src/proxy.ts` redirects signed-out users away from /dashboard, /onboarding, /account, /checkout. |
| Deploy | Target Vercel, not deployed. Cron = any external scheduler hitting `/api/cron/dispatch` every ~5 min (Vercel Cron needs a paid plan for that interval; no `vercel.json`). |

Env keys (names only): `DATABASE_URL`, `DIRECT_URL`, `GROQ_API_KEY`, `GROQ_VISION_MODEL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_ID_FAMILY`, `RAZORPAY_PLAN_ID_EXTENDED`, `GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `CRON_SECRET`, `SARVAM_API_KEY`, `SARVAM_ORG_ID`, `SARVAM_WORKSPACE_ID`, `SARVAM_APP_ID`, `SARVAM_APP_VERSION`, `SARVAM_CONNECTION_ID`, `SARVAM_AGENT_PHONE_NUMBER`, `SARVAM_WEBHOOK_SECRET` (generated locally), optional `SARVAM_API_BASE`. Removed: `GROQ_CALL_MODEL`, `TWILIO_*`, `JWT_SECRET`. As of 2026-09-30 the local Razorpay keys are placeholders and Google is not configured.

## 5. Folder map

```
prisma/schema.prisma        16 models (see §6); prisma/seed.ts (demo data, NOT applied to live DB)
scripts/                    tsx scripts. `test-call-pipeline.ts` = 121-check suite (see §9); clear-database.ts = DANGEROUS
docs/sarvam-agent.md        how to build the Saathi agent in Sarvam: prompt, input/output variables, tool, cron, live test
src/proxy.ts                optimistic page guard (cookie presence) → /login?redirect=…
src/lib/
  prisma.ts                 PrismaClient singleton
  db.ts                     Prisma-only repository (users, parents, slots, medicines, logs, alerts, reports…)
                            incl. linkMedicinesIntoSchedule() and newId()
  access.ts                 requireUser(), requireOwnedParent() for API routes
  security.ts               in-memory rate limits (best-effort); OTP, sessions, reset tokens in DB
  auth.ts                   bcrypt helpers, getSessionUser(), getSessionToken()
  razorpay.ts               config detection, create/verify/cancel subscription, webhook signature
  medicineReportIntake.ts   shared upload parsing + extraction (no sample fallback)
  redirect.ts               safeRedirectPath() (client-safe)
  types.ts, plans.ts        domain types; plans + getEffectivePlan()
  email.ts                  Resend templates
  groqVision.ts, medicineExtractor.ts   extraction internals (don't touch)
  scheduleGenerator.ts      medicines → call slots + per-medicine question scripts
  phone.ts                  E.164 normaliser
  ist.ts                    IST (UTC+5:30) date/time helpers, slot-due logic
  sarvam.ts                 Sarvam Instant Outbound client, config, language mapping, request builder
  callDispatch.ts           runDispatch() (due slots, plan cap, retries, stale cleanup), placeManualCall()
  callResults.ts            processSarvamWebhook() (idempotent), raiseToolEscalation(), retry rules
  callInterpretation.ts     pure: Sarvam output variables -> per-medicine results, mood, alert decisions
  safety.ts                 multilingual emergency-phrase scan (parent turns only)
  alerts.ts                 raiseAlert() (dedupe per call+title, email via Resend), raiseUnreachableAlert()
  secrets.ts                timing-safe secret compare, Bearer/header reader
src/components/GoogleSignInButton.tsx   GIS button (hidden when not configured)
src/components/               Navbar (+Brand), Footer, Reveal, ThemeToggle, ui/Modal (portal),
                              auth/AuthUI (AuthShell, PasswordField, PhoneField, StrengthMeter),
                              onboarding/WizardUI (WizardShell, StepHeader, SlotPicker, FoodPicker),
                              checkout/CheckoutUI, account/AccountUI, landing/* (CallDemo, DashboardPreview),
                              dashboard/* (helpers.computeCallStats, 6 panels, DashboardModals)
src/app/                    pages: landing, login, signup, reset-password, onboarding (6 steps),
                            dashboard (6 tabs; panels in components/dashboard), account/profile, account/billing,
                            checkout/confirm → payment → success
```

## 6. Data model (prisma/schema.prisma)

User · DBSession · OTPRecord · PasswordResetRecord · OAuthAccount (Google links) · UserSubscription · Invoice · **ParentProfile** · **ScheduledCallSlot** · **Medicine** · EmergencyContact · **CallLog** · **AlertRecord** · ScheduleSuggestion · CaregiverInvite · NotificationPreferences · MedicineReport (now persisted).

Call-relevant fields:
- `ParentProfile`: phone (E.164), `language` (free text; **no `preferredLanguage` yet**), timezone, `callTime` (legacy display), isPaused, pauseReason, pauseUntil (real Date), consentGiven, isDeleted.
- `ScheduledCallSlot`: time ("08:30 AM", IST), slot (morning/afternoon/evening/bedtime/wellness/custom), label, linkedMedicineNames[], `linkedMedicinesJson` (name, dosage, foodRelation, questionScript), isActive. **Slot ids are always generated server-side.**
- `CallLog`: scheduledTime, actualAnswerTime, status (`scheduled` -> `placed` -> `answered` | `unanswered` | `busy` | `failed`), durationSeconds, medicationConfirmed, mood, summary, notes, createdAt, plus (added 2026-09-30, all optional) slotId, slot, callDate (IST YYYY-MM-DD), attemptNumber (default 1), providerAttemptId (unique), interactionId, failureReason, transcriptJson (English), resultJson (`{medicines, medicineResults, ...}`), startedAt, endedAt, nextRetryAt, processedAt. **Unique (parentId, slotId, callDate, attemptNumber)** = double-dial guard. `slot` is `test`/`manual` for owner-requested calls (slotId null, never retried).
- `AlertRecord`: level 0–4, title, message, channel (only `email` is real), timestamp (ISO string), status, callLogId (dedupe per call+title).

Live DB baseline (2026-09-30): 2 users, 5 parents (2 soft-deleted), 9 slots, 19 medicines, 3 emergency contacts, 3 call logs (old Twilio/simulated tests), 6 alerts, 2 subscriptions, 0 NotificationPreferences rows (defaults are returned when missing).

## 7. API routes

All private routes: **S** = `requireUser`, **O** = `requireOwnedParent` (404 for other users' parents).

| Route | Method | Purpose | Auth |
|---|---|---|---|
| /api/auth/signup | POST | email + password + E.164 phone (unique) → user, session | — |
| /api/auth/login | POST | email or phone + password, rate-limited | — |
| /api/auth/otp/send, /verify | POST | phone OTP (dev only until an SMS provider exists) | — |
| /api/auth/google | POST | verifies Google ID token (`credential`), login/signup | — |
| /api/auth/logout | POST | revokes DB session + clears cookie | — |
| /api/auth/me | GET | current user | S |
| /api/auth/forgot-password, /reset-password | POST | single-use 20-min token; reset revokes all sessions | — |
| /api/account/profile | GET/PATCH | profile + notification prefs (phone must be unique) | S |
| /api/account/password | POST | change password (min 8) | S |
| /api/account/billing | GET/POST | invoices; cancel (also cancels Razorpay at cycle end), reactivate (only before period end), switch-plan (**Free only**; paid → 402 + checkoutUrl; blocked if over parent limit) | S |
| /api/razorpay/create-subscription | POST | Razorpay subscription for the logged-in user (sandbox only under dev) | S |
| /api/razorpay/verify | POST | signature + ownership verification → activate | S |
| /api/razorpay/webhook | POST | signed events → active / past_due / cancelled | signature |
| /api/parents | GET/POST | list; create parent + slots + meds + contacts (validated first; soft-deletes on partial failure) | S |
| /api/parents/[id] | GET/PATCH/DELETE | details; pause (future ISO date), resume (clears reason/until), update (whitelisted), archive | O |
| /api/parents/[id]/medicines | POST/PATCH | add (+ links into call slots, may create a slot) / toggle | O |
| /api/parents/[id]/caregivers | POST | pending invite row (no email yet; says so) | O |
| /api/parents/[id]/suggestions | POST | accept (moves matching slot times) / dismiss | O |
| /api/parents/[id]/test-call | POST | real 1-time Saathi call to the parent (2/hour, 5/day); 503 until Sarvam is configured; never fakes logs | O |
| /api/parents/[id]/medicine-reports | GET/POST | persisted draft extraction | O |
| /api/parents/[id]/medicine-reports/[reportId]/confirm | POST | save confirmed meds, link into schedule, mark report confirmed (once) | O |
| /api/medicine-reports/extract | GET/POST | samples list / onboarding extraction | GET —, POST S |
| /api/calls/trigger | POST | owner "call now" (rate-limited, no retry) | S |
| /api/cron/dispatch | GET/POST | `runDispatch()`; `x-cron-secret` or `Bearer CRON_SECRET`; no-op when Sarvam not configured | cron secret |
| /api/calls/sarvam-webhook | POST | end-of-call result; `?token=SARVAM_WEBHOOK_SECRET`; idempotent | token |
| /api/calls/escalate | POST | Sarvam API tool: mid-call emergency -> level-4 alert; `Bearer SARVAM_WEBHOOK_SECRET` | secret |
| /api/dev/emails | GET/POST | dev outbox; **404 outside `next dev`** | dev only |

## 8. Status (plan vs reality)

| Item | Status |
|---|---|
| Auth: password, sessions, remember-me, reset | DONE (DB-authoritative) |
| Google sign-in | DONE in code; needs `GOOGLE_CLIENT_ID` + `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to appear |
| Phone OTP | PARTIAL: needs an SMS provider (MSG91/Twilio Verify/etc.) before production |
| Email verification | NOT BUILT: email signups are marked verified; the "verify" link just opens the dashboard |
| Razorpay subscriptions | DONE in code; needs real keys, plan ids and webhook secret; untested against live Razorpay |
| Groq vision draft → confirm | DONE; reports persisted; no sample fallback; PDFs rejected |
| Onboarding wizard | DONE (meds keep timing/food relation; Malayalam added; honest test-call) |
| Dashboard | Today card, Trends, call history from real data; CSV export. Split into `components/dashboard/*` (DONE 2026-09-30) |
| Pause/resume | DONE (real dates) |
| Caregiver invites | PARTIAL: row only; no email, no invitee access |
| Smart call-time suggestions | PARTIAL: accept/dismiss works; **no generator** |
| Alert engine + family email | DONE (levels 1–4, dedupe, prefs, co-managers). WhatsApp/SMS NOT built |
| Saathi voice calling (Sarvam) | BUILT + tested with a fake Sarvam (121 checks). NOT live: needs Sarvam account, KYC, agent, `SARVAM_*` env, public URL, cron |
| Cron dispatcher | DONE (`/api/cron/dispatch`); an external scheduler still has to be set up |
| `preferredLanguage` | NOT STARTED |
| Calls per day vs plan | ENFORCED at dispatch: `callsPerDay` Free 1 / Family 3 / Extended 3 (earliest slots win); dashboard warns when a schedule exceeds it |
| Replace legacy db.ts with Prisma | DONE (same exports, Prisma-only) |
| E.164 phone normalisation | DONE |

## 9. Sarvam call pipeline (built 2026-09-30)

```
external cron (~5 min) -> /api/cron/dispatch -> runDispatch()
   due = IST slot time passed within 90 min; parent active/consented/not paused (auto-resume); plan callsPerDay cap
   claim CallLog (unique index) -> Sarvam Instant Outbound (X-API-Key) -> status `placed`
Sarvam agent calls the parent (rented number, Vobiz underneath)
   mid-call emergency -> tool -> /api/calls/escalate -> level-4 alert
   end of call -> /api/calls/sarvam-webhook?token= -> processSarvamWebhook()
       connected -> answered; per-medicine results; mood; summary; alerts (2 missed med, 3 health/unwell, 4 emergency, 1 low mood)
       no_answer/busy -> retry +15 min (max 3 attempts, same IST day, scheduled slots only) -> level-2 "couldn't reach"
       failed -> no retry, level-2 alert (DND reason kept)
   no result within 45 min -> closed as failed `result_not_received` (a late webhook still applies)
```
Rules baked in: wellness-only calls count as "medication confirmed"; alerts dedupe per call+title (webhook, tool and scan never double-alert);
emergency scan reads **parent turns only** (Sarvam supplies English `en_text`); a newly added parent is first called the next day;
a 401/403 from Sarvam (our config) never alerts families; failed test calls never alert families.
The agent contract (variable names, prompt, tool) is in **`docs/sarvam-agent.md`** and must stay in sync with `lib/sarvam.ts` / `lib/callInterpretation.ts`.

**Tests:** `npx tsx scripts/test-call-pipeline.ts` (121 checks; pure logic + full pipeline on throwaway DB rows with a fake Sarvam,
fake clock and fake email; every dispatch is scoped with `parentIds` so real parents are never touched; cleans up after itself).

Unverified against real Sarvam: per-minute price, DND/NDNC handling, webhook retry behaviour, exact webhook `interaction_transcript` shape in practice, API tool bearer-auth setup. Do the live test in `docs/sarvam-agent.md` §8 first.

## 10. Known remaining issues

- Calling is not live: needs Sarvam account/KYC, agent, `SARVAM_*`, public HTTPS URL (ngrok locally), and an external cron.
- No SMS provider (phone OTP dev-only), no email verification flow, no caregiver invite emails/access, no WhatsApp/SMS alerts.
- Rate limits are per-process memory (weak on serverless). All parent times are treated as IST (single timezone).
- Pricing (set 2026-09-30 at ₹1,299 / ₹2,999): ~55% margin at typical use, ~8–14% at the 3-calls/day cap, loses money only if Sarvam charges ~₹5/min AND every call is used. Free costs ~₹180/user/month (plan: make it a 7-day trial). Re-check when Sarvam quotes real prices. GST not included in prices.
- Razorpay plans for the new prices must be created: `npx tsx scripts/create-razorpay-plans.ts` (dry run) then `--confirm`, with real keys; put the printed ids in `RAZORPAY_PLAN_ID_FAMILY` / `_EXTENDED`. Plans are immutable in Razorpay, so a price change needs new plans.
- Razorpay live path and Google sign-in are implemented but untested with real credentials.
- 3 old CallLogs in the DB are from earlier tests (left untouched). `db push` is used, not migrations (the call-pipeline columns were applied as reviewed additive SQL; never `--accept-data-loss`).
- A dev server started before a schema change keeps a stale Prisma client: restart `next dev` after schema changes. On Windows `prisma generate` can fail with EPERM while a dev server holds the engine DLL.
- Lint: 8 pre-existing errors (react-hooks set-state-in-effect in data-loading effects, one `any` in onboarding, `prefer-const` in medicineExtractor).
- UI shows sample prescriptions only under `next dev`. Privacy policy / Terms pages do not exist yet (signup text mentions them).
- `scripts/cleanup-e2e-account.ts <claude-e2e-…@example.com> [--confirm]` removes one throwaway test account (dry run by default).

## 11. Open questions for the user
- Free plan → 7-day trial (agreed for next session).
- `preferredLanguage`: not added; `toSarvamLanguage()` derives it from the free-text `language`. Add a column later if needed.
- Hosting/cron provider (Vercel vs other).
- Adopt `prisma migrate` (baseline the current DB)?
