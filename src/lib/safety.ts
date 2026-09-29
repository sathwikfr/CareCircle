/**
 * Code-level safety net. After every call the transcript is scanned for
 * emergency phrases in all supported languages, independently of whatever the
 * voice agent concluded. When in doubt this errs toward raising the alert.
 *
 * Only the PARENT's turns are scanned: the agent may itself say things like
 * "if you have chest pain, call your family" that must not trigger an alarm.
 */

export interface TranscriptTurn {
  role: string;
  text: string;
}

/** English phrases that can be negated ("no chest pain") — skipped when negated in the same clause. */
const ENGLISH_NEGATABLE = [
  'chest pain',
  'chest pains',
  'pain in my chest',
  'pain in the chest',
  'severe pain',
  'bleeding',
  'coughing blood',
  'coughing up blood',
  'vomiting blood',
  'vomited blood',
  'blood in',
  'emergency'
];

/** Phrases that already carry their own meaning (never suppressed). */
const ENGLISH_DIRECT = [
  "can't breathe",
  'cant breathe',
  'cannot breathe',
  'can not breathe',
  'unable to breathe',
  'trouble breathing',
  'difficulty breathing',
  'difficulty in breathing',
  'short of breath',
  'shortness of breath',
  'struggling to breathe',
  'i fell',
  'i have fallen',
  "i've fallen",
  'fell down',
  'fallen down',
  'passed out',
  'fainted',
  'unconscious',
  'heart attack',
  'having a stroke',
  'call an ambulance',
  'call the ambulance',
  'need an ambulance',
  "i'm dying",
  'i am dying',
  'want to die',
  'end my life',
  'kill myself'
];

/** Native-script and romanised phrases by language (matched as substrings, never suppressed). */
export const EMERGENCY_TERMS: Record<string, string[]> = {
  hindi: [
    'सीने में दर्द', 'छाती में दर्द', 'सांस नहीं', 'साँस नहीं', 'सांस लेने में तकलीफ', 'साँस लेने में तकलीफ',
    'गिर गया', 'गिर गई', 'गिर गयी', 'बेहोश', 'दिल का दौरा', 'हार्ट अटैक', 'एम्बुलेंस', 'एंबुलेंस', 'बचाओ',
    'seene mein dard', 'chhati mein dard', 'saans nahi', 'saans lene mein', 'gir gaya', 'gir gayi', 'behosh',
    'bachao', 'ambulance bulao'
  ],
  telugu: [
    'ఛాతీ నొప్పి', 'ఛాతి నొప్పి', 'గుండె నొప్పి', 'ఊపిరి ఆడటం లేదు', 'ఊపిరి ఆడడం లేదు', 'శ్వాస తీసుకోలేకపోతున్నా',
    'కింద పడ్డాను', 'పడిపోయాను', 'స్పృహ తప్పి', 'గుండెపోటు', 'అంబులెన్స్', 'కాపాడండి',
    'chaati noppi', 'gunde noppi', 'oopiri aadatam ledu', 'padipoyanu', 'kindha paddanu'
  ],
  tamil: [
    'நெஞ்சு வலி', 'நெஞ்சு வலிக்கிறது', 'மூச்சு விட முடியவில்லை', 'மூச்சு திணறல்', 'கீழே விழுந்தேன்',
    'மயங்கி', 'மாரடைப்பு', 'ஆம்புலன்ஸ்', 'காப்பாற்றுங்கள்',
    'nenju vali', 'moochu vida mudiyala', 'keezhe vizhundhen', 'mayanghi'
  ],
  kannada: [
    'ಎದೆ ನೋವು', 'ಉಸಿರಾಡಲು ಆಗುತ್ತಿಲ್ಲ', 'ಉಸಿರು ಕಟ್ಟುತ್ತಿದೆ', 'ಬಿದ್ದುಬಿಟ್ಟೆ', 'ಬಿದ್ದೆ', 'ಪ್ರಜ್ಞೆ ತಪ್ಪಿ',
    'ಹೃದಯಾಘಾತ', 'ಆಂಬ್ಯುಲೆನ್ಸ್', 'ಕಾಪಾಡಿ',
    'ede novu', 'usiraadalu aagtilla', 'biddu bitte'
  ],
  bengali: [
    'বুকে ব্যথা', 'বুকের ব্যথা', 'শ্বাস নিতে পারছি না', 'শ্বাসকষ্ট', 'পড়ে গেছি', 'অজ্ঞান', 'হার্ট অ্যাটাক',
    'অ্যাম্বুলেন্স', 'বাঁচাও',
    'buke byatha', 'shash nite parchi na', 'pore gechi', 'bachao'
  ],
  marathi: [
    'छातीत दुखतंय', 'छातीत दुखत आहे', 'छातीत दुखणे', 'श्वास घेता येत नाही', 'श्वास घेण्यास त्रास', 'पडलो', 'पडले',
    'बेशुद्ध', 'हृदयविकाराचा झटका', 'रुग्णवाहिका', 'वाचवा',
    'chhatit dukhtay', 'shwas gheta yet nahi', 'padlo'
  ],
  gujarati: [
    'છાતીમાં દુખાવો', 'શ્વાસ લઈ શકતો નથી', 'શ્વાસ લઈ શકતી નથી', 'શ્વાસ લેવામાં તકલીફ', 'પડી ગયો', 'પડી ગઈ',
    'બેભાન', 'હાર્ટ એટેક', 'એમ્બ્યુલન્સ', 'બચાવો',
    'chhati ma dukhavo', 'padi gayo', 'padi gai'
  ],
  malayalam: [
    'നെഞ്ചുവേദന', 'നെഞ്ച് വേദന', 'ശ്വാസം കിട്ടുന്നില്ല', 'ശ്വാസം മുട്ടൽ', 'വീണു', 'ബോധം പോയി', 'ഹൃദയാഘാതം',
    'ആംബുലൻസ്', 'രക്ഷിക്കൂ',
    'nenju vedana', 'shwasam kittunnilla', 'veenu'
  ]
};

function normalise(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** True if the text before `index` (same clause, last 3 words) contains a negation. */
function isNegated(text: string, index: number): boolean {
  const clauseStart = Math.max(
    text.lastIndexOf('.', index - 1),
    text.lastIndexOf('!', index - 1),
    text.lastIndexOf('?', index - 1),
    text.lastIndexOf(',', index - 1),
    text.lastIndexOf(';', index - 1)
  );
  const words = text.slice(clauseStart + 1, index).trim().split(' ').filter(Boolean).slice(-3);
  return words.some(w => /^(no|not|without|never|nothing|none|neither|nor)$/.test(w) || /n't$/.test(w));
}

export interface EmergencyScanResult {
  hit: boolean;
  matches: string[];
}

export function scanForEmergency(turns: TranscriptTurn[]): EmergencyScanResult {
  const matches = new Set<string>();

  for (const turn of turns) {
    if (turn.role !== 'user') continue;
    const text = normalise(turn.text || '');
    if (!text) continue;

    for (const phrase of ENGLISH_DIRECT) {
      if (text.includes(phrase)) matches.add(phrase);
    }

    for (const phrase of ENGLISH_NEGATABLE) {
      let from = 0;
      let idx = text.indexOf(phrase, from);
      while (idx !== -1) {
        if (!isNegated(text, idx)) {
          matches.add(phrase);
          break;
        }
        from = idx + phrase.length;
        idx = text.indexOf(phrase, from);
      }
    }

    for (const phrases of Object.values(EMERGENCY_TERMS)) {
      for (const phrase of phrases) {
        if (text.includes(normalise(phrase))) matches.add(phrase);
      }
    }
  }

  return { hit: matches.size > 0, matches: [...matches] };
}
