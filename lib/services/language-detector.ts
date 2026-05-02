// ============================================================
// VitaVoice — Language Detection Service
// ============================================================
// Detects the language of user input to enable multilingual responses.
// Supports English, Hindi, Kannada, Tamil, Telugu, Malayalam, Bengali.

export type SupportedLanguage =
  | 'en'    // English
  | 'hi'    // Hindi
  | 'kn'    // Kannada
  | 'ta'    // Tamil
  | 'te'    // Telugu
  | 'ml'    // Malayalam
  | 'bn';   // Bengali

export interface LanguageDetection {
  language: SupportedLanguage;
  confidence: number;
  name: string;
  nativeName: string;
}

// Language signatures - common words and character patterns
const LANGUAGE_SIGNATURES: Record<SupportedLanguage, { words: string[]; patterns: RegExp[] }> = {
  en: {
    words: ['the', 'and', 'is', 'are', 'help', 'pain', 'emergency', 'doctor', 'hospital'],
    patterns: [/^[a-zA-Z\s\d]+$/],
  },
  hi: {
    words: ['है', 'हैं', 'मैं', 'मदद', 'दर्द', 'डॉक्टर', 'अस्पताल', 'आपातकाल', 'कहां', 'कैसे'],
    patterns: [/[\u0900-\u097F]/],
  },
  kn: {
    words: ['ಹುಷಾರ್', 'ನೋವು', 'ವೈದ್ಯರು', 'ಆಸ್ಪತ್ರೆ', 'ತುರ್ತು', 'ಎಲ್ಲಿ', 'ಹೇಗೆ', 'ನಾನು'],
    patterns: [/[\u0C80-\u0CFF]/],
  },
  ta: {
    words: ['வலி', 'மருத்துவர்', 'மருத்துவமனை', 'அவசர', 'எங்கே', 'எப்படி', 'நான்', 'உதவி'],
    patterns: [/[\u0B80-\u0BFF]/],
  },
  te: {
    words: ['నొప్పి', 'వైద్యుడు', 'ఆసుపత్రి', 'అత్యవసర', 'ఎక్కడ', 'ఎలా', 'నేను', 'సహాయం'],
    patterns: [/[\u0C00-\u0C7F]/],
  },
  ml: {
    words: ['വേദന', 'ഡോക്ടര്‍', 'ആശുപത്രി', 'അടിയന്തര', 'എവിടെ', 'എങ്ങനെ', 'ഞാന്‍', 'സഹായം'],
    patterns: [/[\u0D00-\u0D7F]/],
  },
  bn: {
    words: ['ব্যাথা', 'ডাক্তার', 'হাসপাতাল', 'জরুরি', 'কোথায়', 'কিভাবে', 'আমি', 'সাহায্য'],
    patterns: [/[\u0980-\u09FF]/],
  },
};

const LANGUAGE_NAMES: Record<SupportedLanguage, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்' },
  te: { name: 'Telugu', nativeName: 'తెలుగు' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം' },
  bn: { name: 'Bengali', nativeName: 'বাংলা' },
};

/**
 * Detect the language of input text.
 */
export function detectLanguage(text: string): LanguageDetection {
  if (!text || text.trim().length === 0) {
    return { language: 'en', confidence: 1, name: 'English', nativeName: 'English' };
  }

  const normalized = text.toLowerCase().trim();
  const scores: Record<SupportedLanguage, number> = {
    en: 0, hi: 0, kn: 0, ta: 0, te: 0, ml: 0, bn: 0,
  };

  // Check character patterns (strongest signal)
  for (const [lang, signature] of Object.entries(LANGUAGE_SIGNATURES)) {
    for (const pattern of signature.patterns) {
      if (pattern.test(normalized)) {
        scores[lang as SupportedLanguage] += 0.5;
      }
    }
  }

  // Check for common words
  for (const [lang, signature] of Object.entries(LANGUAGE_SIGNATURES)) {
    for (const word of signature.words) {
      if (normalized.includes(word.toLowerCase())) {
        scores[lang as SupportedLanguage] += 0.3;
      }
    }
  }

  // Find the language with highest score
  let bestLang: SupportedLanguage = 'en';
  let bestScore = 0;

  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang as SupportedLanguage;
    }
  }

  // If no strong signal, default to English
  if (bestScore === 0) {
    // Check if it looks like English (Latin characters)
    if (/^[a-zA-Z\s\d\p{P}]+$/u.test(normalized)) {
      bestLang = 'en';
      bestScore = 0.3;
    }
  }

  const langInfo = LANGUAGE_NAMES[bestLang];
  return {
    language: bestLang,
    confidence: Math.min(bestScore + 0.3, 1),
    name: langInfo.name,
    nativeName: langInfo.nativeName,
  };
}

/**
 * Get a greeting in the detected language.
 */
export function getGreeting(language: SupportedLanguage): string {
  const greetings: Record<SupportedLanguage, string> = {
    en: 'Hello, this is VitaVoice Emergency Assistant. How can I help you today?',
    hi: 'नमस्ते, मैं VitaVoice आपातकालीन सहायक हूं। मैं आज आपकी कैसे मदद कर सकता हूं?',
    kn: 'ಹಲೋ, ನಾನು VitaVoice ತುರ್ತು ಸಹಾಯಕ. ನಾನು ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
    ta: 'வணக்கம், நான் VitaVoice அவசர உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?',
    te: 'హలో, నేను VitaVoice అత్యవసర సహాయకుడిని. నేను ఈరోజు మీకు ఎలా సహాయం చేయగలను?',
    ml: 'ഹലോ, ഞാൻ VitaVoice അടിയന്തര സഹായക്കാരനാണ്. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?',
    bn: 'হ্যালো, আমি VitaVoice জরুরি সহায়ক। আমি আজ আপনাকে কীভাবে সাহায্য করতে পারি?',
  };
  return greetings[language] || greetings.en;
}

/**
 * Get a response phrase indicating language switch.
 */
export function getLanguageSwitchPhrase(toLanguage: SupportedLanguage): string {
  const phrases: Record<SupportedLanguage, string> = {
    en: "I'll continue in English.",
    hi: 'मैं हिंदी में जारी रखूंगा।',
    kn: 'ನಾನು ಕನ್ನಡದಲ್ಲಿ ಮುಂದುವರಿಸುತ್ತೇನೆ.',
    ta: 'நான் தமிழில் தொடர்வேன்.',
    te: 'నేను తెలుగులో కొనసాగిస్తాను.',
    ml: 'ഞാൻ മലയാളത്തിൽ തുടരും.',
    bn: 'আমি বাংলায় চালিয়ে যাব।',
  };
  return phrases[toLanguage] || phrases.en;
}

/**
 * Get instructions for the user to speak clearly.
 */
export function getClarityInstructions(language: SupportedLanguage): string {
  const instructions: Record<SupportedLanguage, string> = {
    en: 'Please speak clearly and slowly. I am listening.',
    hi: 'कृपया साफ और धीरे बोलें। मैं सुन रहा हूं।',
    kn: 'ದಯವಿಟ್ಟು ಸ್ಪಷ್ಟವಾಗಿ ಮತ್ತು ನಿಧಾನವಾಗಿ ಮಾತನಾಡಿ. ನಾನು ಕೇಳುತ್ತಿದ್ದೇನೆ.',
    ta: 'தெளிவாகவும் மெதுவாகவும் பேசவும். நான் கேட்கிறேன்.',
    te: 'దయచేసి స్పష్టంగా మరియు నెమ్మదిగా మాట్లాడండి. నేను వింటున్నాను.',
    ml: 'വ്യക്തമായിയും മന്ദമായി സംസാരിക്കുക. ഞാൻ ശ്രദ്ധിക്കുന്നു.',
    bn: 'স্পষ্টভাবে এবং ধীরে ধীরে কথা বলুন। আমি শুনছি।',
  };
  return instructions[language] || instructions.en;
}

/**
 * Add language instruction to system prompt for Retell agent.
 */
export function getMultilingualPrompt(language: SupportedLanguage): string {
  const prompts: Record<SupportedLanguage, string> = {
    en: `LANGUAGE: Respond in English only.`,
    hi: `LANGUAGE: Respond in Hindi (हिन्दी) only. Use Devanagari script.`,
    kn: `LANGUAGE: Respond in Kannada (ಕನ್ನಡ) only. Use Kannada script.`,
    ta: `LANGUAGE: Respond in Tamil (தமிழ்) only. Use Tamil script.`,
    te: `LANGUAGE: Respond in Telugu (తెలుగు) only. Use Telugu script.`,
    ml: `LANGUAGE: Respond in Malayalam (മലയാളം) only. Use Malayalam script.`,
    bn: `LANGUAGE: Respond in Bengali (বাংলা) only. Use Bengali script.`,
  };
  return prompts[language] || prompts.en;
}
