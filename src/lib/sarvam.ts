/**
 * Sarvam Voice Agents client (Instant Outbound calls).
 * Docs: https://docs.sarvam.ai/conversations/api/instant-outbound/create
 *
 * Auth is an `X-API-Key` header. Sarvam does not document webhook signing, so
 * our webhook URL carries a secret token that we verify (see SARVAM_WEBHOOK_SECRET).
 */
import { LinkedMedicineDetail } from './types';

export type SarvamLanguage =
  | 'Bengali' | 'Gujarati' | 'Kannada' | 'Malayalam' | 'Tamil' | 'Telugu'
  | 'Punjabi' | 'Sanskrit' | 'Odia' | 'Marathi' | 'Hindi' | 'English' | 'Assamese';

export interface SarvamConfig {
  apiKey: string;
  orgId: string;
  workspaceId: string;
  appId: string;
  appVersion: number;
  connectionId: string;
  agentPhoneNumber: string;
  apiBase: string;
  webhookSecret: string;
  appUrl: string;
}

const DEFAULT_API_BASE = 'https://apps.sarvam.ai/api/outbounds';

/** Returns the config only when every required setting is present. */
export function getSarvamConfig(env: NodeJS.ProcessEnv = process.env): SarvamConfig | null {
  const apiKey = env.SARVAM_API_KEY;
  const orgId = env.SARVAM_ORG_ID;
  const workspaceId = env.SARVAM_WORKSPACE_ID;
  const appId = env.SARVAM_APP_ID;
  const connectionId = env.SARVAM_CONNECTION_ID;
  const agentPhoneNumber = env.SARVAM_AGENT_PHONE_NUMBER;
  const webhookSecret = env.SARVAM_WEBHOOK_SECRET;
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !orgId || !workspaceId || !appId || !connectionId || !agentPhoneNumber || !webhookSecret || !appUrl) {
    return null;
  }
  return {
    apiKey,
    orgId,
    workspaceId,
    appId,
    appVersion: parseInt(env.SARVAM_APP_VERSION || '1', 10) || 1,
    connectionId,
    agentPhoneNumber,
    apiBase: (env.SARVAM_API_BASE || DEFAULT_API_BASE).replace(/\/$/, ''),
    webhookSecret,
    appUrl: appUrl.replace(/\/$/, '')
  };
}

export function isSarvamConfigured(): boolean {
  return getSarvamConfig() !== null;
}

/** Regional languages we recognise in the free-text `ParentProfile.language`. */
const REGIONAL_LANGUAGES: Array<[string, SarvamLanguage]> = [
  ['telugu', 'Telugu'],
  ['tamil', 'Tamil'],
  ['kannada', 'Kannada'],
  ['malayalam', 'Malayalam'],
  ['bengali', 'Bengali'],
  ['marathi', 'Marathi'],
  ['gujarati', 'Gujarati'],
  ['punjabi', 'Punjabi'],
  ['odia', 'Odia'],
  ['assamese', 'Assamese'],
  ['hindi', 'Hindi']
];

/**
 * Maps "Hindi & English", "English & Kannada", "Telugu", … to the language the
 * call should start in. A regional language wins over English so the parent is
 * greeted in their own language; English-only stays English.
 */
export function toSarvamLanguage(language: string | null | undefined): SarvamLanguage {
  const text = (language || '').toLowerCase();
  for (const [needle, value] of REGIONAL_LANGUAGES) {
    if (text.includes(needle)) return value;
  }
  if (text.includes('english')) return 'English';
  return 'Hindi';
}

export interface OutboundCallInput {
  callLogId: string;
  parentId: string;
  slotId?: string | null;
  slot: string;
  slotLabel: string;
  parentName: string;
  parentPhone: string; // E.164
  language: string;
  caregiverName: string;
  relationship: string;
  medicines: LinkedMedicineDetail[];
}

/** Numbered checklist the agent reads from, e.g. "1. Metformin 500 — Did you take …?" */
export function buildMedicineChecklist(medicines: LinkedMedicineDetail[]): string {
  return medicines
    .map((m, i) => `${i + 1}. ${m.name}${m.dosage ? ` (${m.dosage})` : ''} — ${m.questionScript || `Did you take your ${m.name}?`}`)
    .join('\n');
}

export function buildOutboundRequest(cfg: SarvamConfig, input: OutboundCallInput) {
  const webhookUrl = `${cfg.appUrl}/api/calls/sarvam-webhook?token=${encodeURIComponent(cfg.webhookSecret)}`;
  return {
    app_config: {
      app_id: cfg.appId,
      app_version: cfg.appVersion,
      connection_config: {
        connection_id: cfg.connectionId,
        agent_phone_number: cfg.agentPhoneNumber
      },
      // Agent variables are the "input variables" defined on the Sarvam agent.
      agent_variables: {
        call_log_id: input.callLogId,
        parent_name: input.parentName,
        caregiver_name: input.caregiverName,
        relationship: input.relationship,
        slot: input.slot,
        slot_label: input.slotLabel,
        has_medicines: input.medicines.length > 0 ? 'yes' : 'no',
        medicine_count: String(input.medicines.length),
        medicines_checklist: buildMedicineChecklist(input.medicines)
      },
      app_overrides: {
        initial_language_name: toSarvamLanguage(input.language)
      }
    },
    user_config: { user_phone_number: input.parentPhone },
    webhook_config: {
      url: webhookUrl,
      metadata: {
        callLogId: input.callLogId,
        parentId: input.parentId,
        slotId: input.slotId || null
      }
    }
  };
}

export class SarvamApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/**
 * Places an instant outbound call. Returns Sarvam's attempt_id.
 * Errors never include the API key or the webhook token.
 */
export async function createOutboundCall(
  cfg: SarvamConfig,
  input: OutboundCallInput,
  fetchImpl: typeof fetch = fetch
): Promise<{ attemptId: string }> {
  const url = `${cfg.apiBase}/v1/orgs/${encodeURIComponent(cfg.orgId)}/workspaces/${encodeURIComponent(cfg.workspaceId)}/outbounds`;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': cfg.apiKey },
      body: JSON.stringify(buildOutboundRequest(cfg, input)),
      signal: AbortSignal.timeout(15000)
    });
  } catch (err) {
    throw new SarvamApiError(`Network error contacting Sarvam: ${err instanceof Error ? err.name : 'unknown'}`);
  }

  if (!res.ok) {
    throw new SarvamApiError(`Sarvam rejected the call (HTTP ${res.status})`, res.status);
  }

  const data = (await res.json().catch(() => ({}))) as { attempt_id?: string };
  if (!data.attempt_id) {
    throw new SarvamApiError('Sarvam response did not include an attempt_id', res.status);
  }
  return { attemptId: data.attempt_id };
}
