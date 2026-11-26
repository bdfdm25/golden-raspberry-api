const DIACRITICS = /\p{Diacritic}/gu;
const WHITESPACE_RUN = /\s+/g;

/**
 * Key used to decide whether two producer strings name the same person.
 * Case, accents and repeated whitespace are irrelevant for that decision:
 * "José  Silva", "JOSE SILVA" and "jose silva" are one producer.
 * Punctuation is kept on purpose, so "J. Smith" and "J Smith" stay distinct.
 */
export function normalizeProducerName(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(WHITESPACE_RUN, ' ')
    .trim()
    .toLowerCase();
}
