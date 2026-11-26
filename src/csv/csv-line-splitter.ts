const QUOTE = '"';

/**
 * Splits a single CSV line honouring double-quoted fields and escaped quotes ("").
 * Quoted fields spanning multiple lines are not supported.
 */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line.charAt(index);

    if (char === QUOTE) {
      const isEscapedQuote = insideQuotes && line.charAt(index + 1) === QUOTE;
      if (isEscapedQuote) {
        current += QUOTE;
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      fields.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields;
}
