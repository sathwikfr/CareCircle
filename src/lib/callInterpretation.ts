/**
 * Turns Sarvam's end-of-call data into Aaptha's call record and alert
 * decisions. Pure functions: no database or network access.
 *
 * The Sarvam agent's OUTPUT variables (docs/sarvam-agent.md) are the contract:
 *   all_medicines_taken   yes | no | partial | not_asked
 *   medicines_taken       comma-separated names
 *   medicines_missed      comma-separated names
 *   mood                  cheerful | calm | neutral | anxious | unwell
 *   health_concern        free text, empty / "none" when nothing
 *   emergency             yes | no
 *   feedback              free text (what the parent wants the family to know)
 *   call_summary          1-2 sentence English summary
 */
import { LinkedMedicineDetail, CallLog } from './types';
import { scanForEmergency, TranscriptTurn } from './safety';

export type SarvamStatus = 'connected' | 'no_answer' | 'busy' | 'failed';
export const SARVAM_STATUSES: SarvamStatus[] = ['connected', 'no_answer', 'busy', 'failed'];

export interface SarvamWebhookPayload {
  attempt_id?: unknown;
  status?: unknown;
  duration?: unknown;
  interaction_id?: unknown;
  failure_reason?: unknown;
  final_agent_variables?: unknown;
  interaction_transcript?: unknown;
  webhook_config?: unknown;
}

export interface MedicineResult {
  name: string;
  status: 'taken' | 'missed' | 'unknown';
}

export interface Interpretation {
  medicationConfirmed: boolean;
  medicineResults: MedicineResult[];
  mood: CallLog['mood'];
  healthConcern: string | null;
  emergencyFlag: boolean;
  feedback: string | null;
  summary: string;
  transcript: TranscriptTurn[];
  /** The line connected but the parent never answered (nothing said, nothing confirmed): treated like a missed call. */
  noResponse: boolean;
}

export interface AlertDecision {
  level: 1 | 2 | 3 | 4;
  title: string;
  message: string;
}

export const ALERT_TITLES = {
  emergency: 'Possible emergency reported during call',
  health: 'Health concern mentioned',
  missed: 'Missed medicine',
  mood: 'Parent seemed low during call',
  unreachable: "Couldn't reach your parent",
  failed: 'Call could not be placed'
} as const;

const NO_CONCERN = new Set(['', 'none', 'no', 'nil', 'n/a', 'na', 'nothing', 'no concern', 'no concerns', 'null', 'not applicable']);

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function asVariables(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function parseTranscript(value: unknown): TranscriptTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: TranscriptTurn[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const role = asText(rec.role).toLowerCase();
    const text = asText(rec.en_text) || asText(rec.text);
    if (role && text) turns.push({ role, text });
  }
  return turns;
}

function splitList(value: string): string[] {
  return value
    .split(/[,;\n|]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

/** "Telmisartan (BP Tablet) 40mg" → "telmisartan" (drop brackets, doses and filler words). */
function medicineKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b\d+(\.\d+)?\s*(mg|mcg|ml|g|iu)\b/g, ' ')
    .replace(/\b(tab|tablet|cap|capsule|syp|syrup|inj)\b\.?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mentions(list: string[], medicine: string): boolean {
  const key = medicineKey(medicine);
  if (!key) return false;
  return list.some(item => {
    const other = medicineKey(item);
    return other && (other.includes(key) || key.includes(other));
  });
}

function normaliseMood(value: string): CallLog['mood'] {
  const v = value.toLowerCase();
  if (!v) return 'neutral';
  if (/(cheer|happy|joy|good|great|positive|energetic|active)/.test(v)) return 'cheerful';
  if (/(unwell|sick|ill|pain|poor|bad|weak|tired|unhealthy)/.test(v)) return 'unwell';
  if (/(anx|worr|sad|low|stress|upset|lonely|nervous|depress)/.test(v)) return 'anxious';
  if (/(calm|relax|fine|ok|okay|peace|content|normal)/.test(v)) return 'calm';
  return 'neutral';
}

export function interpretCallResult(
  payload: SarvamWebhookPayload,
  medicines: LinkedMedicineDetail[],
  parentName: string
): Interpretation {
  const vars = asVariables(payload.final_agent_variables);
  const transcript = parseTranscript(payload.interaction_transcript);

  const allTaken = asText(vars.all_medicines_taken).toLowerCase();
  const takenList = splitList(asText(vars.medicines_taken));
  const missedList = splitList(asText(vars.medicines_missed));

  const medicineResults: MedicineResult[] = medicines.map(m => {
    if (mentions(missedList, m.name)) return { name: m.name, status: 'missed' as const };
    if (mentions(takenList, m.name)) return { name: m.name, status: 'taken' as const };
    if (allTaken === 'yes') return { name: m.name, status: 'taken' as const };
    if (allTaken === 'no') return { name: m.name, status: 'missed' as const };
    return { name: m.name, status: 'unknown' as const };
  });

  // A call with nothing to confirm (wellness-only) is not a failed confirmation.
  const medicationConfirmed = medicineResults.every(r => r.status === 'taken');

  const concernText = asText(vars.health_concern);
  const healthConcern = NO_CONCERN.has(concernText.toLowerCase()) ? null : concernText.slice(0, 300);
  const emergencyFlag = ['yes', 'true', '1'].includes(asText(vars.emergency).toLowerCase());
  const feedbackText = asText(vars.feedback);
  const feedback = NO_CONCERN.has(feedbackText.toLowerCase()) ? null : feedbackText.slice(0, 500);
  const mood = normaliseMood(asText(vars.mood));

  const taken = medicineResults.filter(r => r.status === 'taken').map(r => r.name);
  const missed = medicineResults.filter(r => r.status === 'missed').map(r => r.name);
  const agentSummary = asText(vars.call_summary);

  let summary = agentSummary.slice(0, 600);
  if (!summary) {
    const parts: string[] = [`${parentName} answered the check-in call.`];
    if (medicines.length > 0) {
      if (taken.length) parts.push(`Took: ${taken.join(', ')}.`);
      if (missed.length) parts.push(`Not taken: ${missed.join(', ')}.`);
      if (!taken.length && !missed.length) parts.push('Medicine confirmation could not be determined.');
    }
    parts.push(`Mood: ${mood}.`);
    if (healthConcern) parts.push(`Health concern: ${healthConcern}.`);
    summary = parts.join(' ');
  }

  // Picked up but silent: the agent asked, got nothing and hung up. Only applies to calls that had medicines to ask about.
  const parentSpoke = transcript.some(t => t.role === 'user');
  const nothingConfirmed = medicineResults.every(r => r.status === 'unknown');
  const noResponse =
    medicines.length > 0 &&
    nothingConfirmed &&
    !emergencyFlag &&
    !healthConcern &&
    !feedback &&
    (transcript.length > 0 ? !parentSpoke : allTaken === 'not_asked');

  return { medicationConfirmed, medicineResults, mood, healthConcern, emergencyFlag, feedback, summary, transcript, noResponse };
}

/**
 * Which alerts a completed conversation should raise. Level 4 also comes from
 * the independent transcript scan, not only from the agent's own judgement.
 */
export function decideAlerts(interp: Interpretation, parentName: string, slotLabel: string): AlertDecision[] {
  const alerts: AlertDecision[] = [];
  const scan = scanForEmergency(interp.transcript);

  if (interp.emergencyFlag || scan.hit) {
    const heard = scan.hit ? ` (heard: "${scan.matches.slice(0, 3).join('", "')}")` : '';
    alerts.push({
      level: 4,
      title: ALERT_TITLES.emergency,
      message: `During the ${slotLabel} call, ${parentName} may have described an emergency${heard}. Please call ${parentName} right away, and contact their doctor or emergency services if needed.`
    });
  }

  if (interp.healthConcern || interp.mood === 'unwell') {
    alerts.push({
      level: 3,
      title: ALERT_TITLES.health,
      message: `${parentName} mentioned not feeling well${interp.healthConcern ? `: "${interp.healthConcern}"` : ''}. Please check in with them today.`
    });
  }

  const missed = interp.medicineResults.filter(r => r.status === 'missed').map(r => r.name);
  if (missed.length > 0) {
    alerts.push({
      level: 2,
      title: ALERT_TITLES.missed,
      message: `${parentName} had not taken: ${missed.join(', ')} (${slotLabel} call).`
    });
  }

  if (interp.mood === 'anxious') {
    alerts.push({
      level: 1,
      title: ALERT_TITLES.mood,
      message: `${parentName} sounded low or worried during the ${slotLabel} call. A call from family might help.`
    });
  }

  return alerts;
}
