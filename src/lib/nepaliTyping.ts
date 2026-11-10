/**
 * Romanized Nepali → Devanagari, e.g. "sachin shrestha" → "सचिन श्रेस्थ".
 * Tips: double vowels for long sounds (raam → राम, deepa → दीपा);
 * inside a word, capitals give retroflex letters (T ट, Th ठ, D ड, Dh ढ, N ण, Sh ष).
 */

const HALANT = "्";
const NEPALI_DIGITS = "०१२३४५६७८९";

type ConsonantRule = readonly [key: string, letter: string];
type VowelRule = readonly [key: string, letter: string, sign: string];

// Longest keys first; capital versions before lowercase ones.
const CONSONANTS: ConsonantRule[] = [
  ["ksh", "क्ष"], ["chh", "छ"],
  ["kh", "ख"], ["gh", "घ"], ["ng", "ङ"], ["ch", "च"], ["jh", "झ"], ["ny", "ञ"], ["gy", "ज्ञ"],
  ["Th", "ठ"], ["Dh", "ढ"], ["Sh", "ष"],
  ["th", "थ"], ["dh", "ध"], ["ph", "फ"], ["bh", "भ"], ["sh", "श"],
  ["T", "ट"], ["D", "ड"], ["N", "ण"],
  ["k", "क"], ["g", "ग"], ["c", "च"], ["j", "ज"], ["t", "त"], ["d", "द"], ["n", "न"], ["p", "प"],
  ["f", "फ"], ["b", "ब"], ["m", "म"], ["y", "य"], ["r", "र"], ["l", "ल"], ["w", "व"], ["v", "व"],
  ["s", "स"], ["h", "ह"], ["x", "क्ष"], ["q", "क"], ["z", "ज"],
];

const VOWELS: VowelRule[] = [
  ["aa", "आ", "ा"], ["ai", "ऐ", "ै"], ["au", "औ", "ौ"], ["ou", "औ", "ौ"],
  ["ee", "ई", "ी"], ["ii", "ई", "ी"], ["oo", "ऊ", "ू"], ["uu", "ऊ", "ू"],
  ["A", "आ", "ा"], ["I", "ई", "ी"], ["U", "ऊ", "ू"],
  ["a", "अ", ""], ["i", "इ", "ि"], ["u", "उ", "ु"], ["e", "ए", "े"], ["o", "ओ", "ो"],
];

const hasCapital = (key: string) => key !== key.toLowerCase();

function findRule<T extends readonly string[]>(
  rules: readonly T[], text: string, lower: string, i: number, caseSensitive: boolean,
): T | undefined {
  return rules.find((rule) =>
    hasCapital(rule[0]) ? caseSensitive && text.startsWith(rule[0], i) : lower.startsWith(rule[0], i),
  );
}

export function toNepali(text: string): string {
  const lower = text.toLowerCase();
  let out = "";
  let i = 0;
  let afterConsonant = false;

  while (i < text.length) {
    // A capital at the start of a word is just a normal capital (Ram, Tara), not a retroflex letter.
    const wordStart = i === 0 || !/[a-z]/i.test(text[i - 1]);

    const consonant = findRule(CONSONANTS, text, lower, i, !wordStart);
    if (consonant) {
      if (afterConsonant) out += HALANT; // two consonants together → joined letter (श्र, स्थ)
      out += consonant[1];
      i += consonant[0].length;
      afterConsonant = true;
      continue;
    }

    const vowel = findRule(VOWELS, text, lower, i, !wordStart);
    if (vowel) {
      out += afterConsonant ? vowel[2] : vowel[1];
      i += vowel[0].length;
      afterConsonant = false;
      continue;
    }

    const ch = text[i];
    out += /[0-9]/.test(ch) ? NEPALI_DIGITS[Number(ch)] : ch;
    afterConsonant = false;
    i += 1;
  }
  return out;
}
