# Saathi AI on Sarvam Voice Agents — setup guide

Aaptha's code is finished on its side (scheduler, call placement, webhook, alerts). This guide is the
**agent you build in the Sarvam dashboard** and the settings that connect the two. The variable names below are a
contract: `src/lib/sarvam.ts` sends the *input* variables and `src/lib/callInterpretation.ts` reads the *output* variables.

## 1. What runs where

```
external cron ──every 5 min──► POST /api/cron/dispatch  (x-cron-secret)
                                   │ due slots, plan cap, retries
                                   ▼
             Sarvam Instant Outbound API  (X-API-Key)  ──► rented number rings the parent
                                                              │  Saathi talks (STT → LLM → TTS)
   mid-call emergency ──► API tool  POST /api/calls/escalate  (Bearer SARVAM_WEBHOOK_SECRET)
   end of call        ──► POST /api/calls/sarvam-webhook?token=SARVAM_WEBHOOK_SECRET
                                   ▼
                     CallLog + per-medicine results + AlertRecord + email to the family
```

## 2. Sarvam dashboard steps

1. **Deploy → Phone Numbers → Add Connection → Rent from Sarvam** (KYC required), buy a number.
   Note the **connection id** and the number → `SARVAM_CONNECTION_ID`, `SARVAM_AGENT_PHONE_NUMBER`.
2. **Settings → API Key** → create a key → `SARVAM_API_KEY`. Copy `org_id` and `workspace_id` from the dashboard URL.
3. Create the agent (below), publish it, note the **app id** and **version** → `SARVAM_APP_ID`, `SARVAM_APP_VERSION`.
4. Fill the `SARVAM_*` values in `.env.local` (see `.env.example`; `.env.local` wins over `.env`). Calling stays OFF until all are set, and
   `NEXT_PUBLIC_APP_URL` must be the public https URL Sarvam can reach (use ngrok locally).
5. **Ask Sarvam** (not in their docs): per-minute price, whether DND/NDNC-registered numbers can receive
   service calls, whether webhooks are retried, and how unanswered calls are billed.

## 3. Input variables (sent by Aaptha on every call)

| Variable | Example | Use |
|---|---|---|
| `call_log_id` | `call_3f9a1c0b7d2e` | Pass to the escalate tool. Do not read aloud |
| `parent_name` | `Amma (Lakshmi Rao)` | How to address the parent |
| `caregiver_name` | `Sathwik Rao` | The family member who set up the calls |
| `relationship` | `Mother` | Parent's relationship to the caregiver |
| `slot` | `morning` | morning / afternoon / evening / bedtime / wellness / custom |
| `slot_label` | `Morning Medicine Reminder` | Context for the greeting |
| `has_medicines` | `yes` / `no` | If `no`, skip the medicine section |
| `medicine_count` | `2` | |
| `medicines_checklist` | `1. Telmisartan (40mg) — Did you take …?` | Numbered questions to ask, in order |

The call starts in the language Aaptha picks from the parent's profile (`initial_language_name`).

## 4. Output variables (extracted after the call; set the extraction prompts as written)

| Variable | Type | Extraction prompt |
|---|---|---|
| `all_medicines_taken` | Enum: `yes`, `no`, `partial`, `not_asked` | Did the parent confirm taking ALL the listed medicines? `partial` if some but not all, `not_asked` if the checklist was empty or never reached. |
| `medicines_taken` | String | Comma-separated names of the medicines the parent said they took (names as in the checklist). Empty if none. |
| `medicines_missed` | String | Comma-separated names of medicines the parent said they did NOT take or forgot. Empty if none. |
| `mood` | Enum: `cheerful`, `calm`, `neutral`, `anxious`, `unwell` | The parent's overall mood/wellbeing from how they sounded and what they said. |
| `health_concern` | String | Any pain, symptom or health worry the parent mentioned, in one short English sentence. Write `none` if nothing. |
| `emergency` | Enum: `yes`, `no` | `yes` only if the parent described something that may be an emergency (chest pain, trouble breathing, a fall, fainting, heavy bleeding, feeling they may die). |
| `feedback` | String | Anything the parent asked or wants the family to know (e.g. "call me Sunday", "need more tablets"). `none` if nothing. |
| `call_summary` | String | Two short English sentences summarising the call for the family. |

Aaptha also scans the transcript itself for emergency phrases in all supported languages, so a missed
`emergency` flag still raises the alert.

## 5. API tool: `escalate_emergency`

Create an **API tool** (run: *During conversation*):

- Method / URL: `POST https://<your-public-domain>/api/calls/escalate`
- Auth: **bearer token** = the value of `SARVAM_WEBHOOK_SECRET` (stored in Sarvam Secrets)
- Body (JSON): `{ "call_log_id": "@call_log_id", "reason": "<one short sentence of what the parent said>" }`
- Description: "Notify the family immediately when the parent describes a possible emergency."
- If it fails: the agent still stays on the line and repeats that the family will be told.

## 6. Agent instructions (draft — paste and adjust)

```
You are Saathi, a warm, respectful voice companion from Aaptha. You are phoning {{parent_name}}, who is
{{caregiver_name}}'s {{relationship}}. {{caregiver_name}} has asked you to check in. This is a {{slot}} check-in.
Address them the way an affectionate younger relative would, using the respectful forms natural to the language
(for example "ji" in Hindi, "garu" in Telugu).

STYLE: speak slowly and simply, one short question at a time, wait for the answer, be patient and kind. Keep the
whole call under 3 minutes. Speak in the language of the call and follow the parent if they switch language.

FLOW
1. Greet by name, say who you are and that {{caregiver_name}} asked you to check in. Ask how they are feeling.
2. If has_medicines is "yes": go through medicines_checklist one by one, in order. Ask exactly one medicine at a
   time. Note taken / not taken. If they haven't taken one, gently encourage them to take it now if that is
   appropriate for the time, and say the family will be told. Do not tell them to skip, change or double a dose.
3. Ask one caring wellbeing question (sleep, food, walking, mood — vary it).
4. Ask if there is anything they'd like you to tell {{caregiver_name}}. Capture it.
5. Close warmly and briefly. Do not keep them on the line.

SAFETY — ALWAYS
- Never diagnose, never name a likely condition, never recommend or change any medicine or dose, never give medical
  advice. For any health question say you will pass it to their family and doctor.
- If they mention chest pain, trouble breathing, a fall, fainting, heavy bleeding, confusion, or say they may die:
  stay calm, call the tool escalate_emergency with call_log_id {{call_log_id}} and what they said, then say
  gently that the family is being informed and they should sit down safely and, if it is serious, call their
  local emergency number or a neighbour. Do not panic or alarm them. Stay on the line until they respond.
- If they seem confused, distressed or unwell, be reassuring and tell the family through `feedback`.
- Never ask for money, OTPs, passwords, Aadhaar or bank details. Never discuss anything unrelated.
```

## 7. Cron

Any scheduler that can send an HTTP request every 5 minutes works (cron-job.org, Vercel Cron on a paid plan,
GitHub Actions). Send `POST https://<domain>/api/cron/dispatch` with header `x-cron-secret: <CRON_SECRET>`
(or `Authorization: Bearer <CRON_SECRET>`). It is safe to overlap or repeat runs: every attempt is claimed with a
database unique index, so a parent is never called twice for the same slot.

Behaviour to know:
- A slot is called when its IST time has passed, for up to 90 minutes. Missed beyond that = skipped for the day.
- Plan cap: Free = 1 call/day (earliest slot), Family/Extended = 3. Change in `src/lib/plans.ts` (`callsPerDay`).
- No answer / busy → retried after 15 minutes, up to 3 attempts the same day, then a level-2 alert.
- A newly added parent is first called the next day.
- Paused parents are skipped; a pause with an end date resumes automatically.
- Test calls (dashboard button) are limited to 2 per hour and 5 per day per parent.

## 8. First live test (do this before real customers)

1. With ngrok running and `.env` filled, use the dashboard's **Send 1-Time Test Call** on a parent whose number is yours.
2. Answer, say you took only one of two medicines and mention "I have a little headache".
   Expect in Call History: status Answered, one medicine missed, and in Alerts: a level-3 health concern and a
   level-2 missed medicine (emailed to the account owner).
3. Call again and say "I have chest pain": expect a level-4 alert and a critical email within seconds.
4. Don't answer a call: expect "Attempt 2" 15 minutes later, and after the 3rd miss a level-2 "couldn't reach" alert.
5. Check the cost per minute in Sarvam against the `durationSeconds` shown in Call History.
