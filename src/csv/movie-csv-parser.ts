import { CsvFormatError } from './csv-format-error.js';
import { splitCsvLine } from './csv-line-splitter.js';
import { parseProducers } from './producer-parser.js';

type MovieRowColumns = [string, string, string, string, string];

export interface ParsedMovie {
  year: number;
  title: string;
  studios: string;
  producers: string[];
  winner: boolean;
}

const EXPECTED_HEADER = ['year', 'title', 'studios', 'producers', 'winner'] as const;
const SUPPORTED_DELIMITERS = [';', ',', '\t'] as const;
const WINNER_VALUES = new Map<string, boolean>([
  ['yes', true],
  ['true', true],
  ['no', false],
  ['false', false],
  ['', false],
]);

export function parseMovieCsv(content: string): ParsedMovie[] {
  const lines = toLines(content);
  const headerLine = lines[0];

  if (headerLine === undefined) {
    throw new CsvFormatError('CSV file is empty');
  }

  const delimiter = detectDelimiter(headerLine);
  assertValidHeader(headerLine, delimiter);

  return lines.slice(1).map((line, index) => parseMovieLine(line, delimiter, index + 2));
}

function toLines(content: string): string[] {
  return content.split(/\r?\n/).filter((line) => line.trim().length > 0);
}

function detectDelimiter(headerLine: string): string {
  const delimiter = SUPPORTED_DELIMITERS.find((candidate) => headerLine.includes(candidate));

  if (delimiter === undefined) {
    throw new CsvFormatError(
      `Unable to detect a delimiter in the header. Supported delimiters: ${SUPPORTED_DELIMITERS.join(' ')}`,
      1,
    );
  }

  return delimiter;
}

function assertValidHeader(headerLine: string, delimiter: string): void {
  const header = splitCsvLine(headerLine, delimiter).map((column) => column.trim().toLowerCase());
  const matchesExpected =
    header.length === EXPECTED_HEADER.length &&
    EXPECTED_HEADER.every((column, index) => header[index] === column);

  if (!matchesExpected) {
    throw new CsvFormatError(
      `Invalid header. Expected "${EXPECTED_HEADER.join(delimiter)}" but received "${headerLine}"`,
      1,
    );
  }
}

function parseMovieLine(line: string, delimiter: string, lineNumber: number): ParsedMovie {
  const fields = splitCsvLine(line, delimiter).map((field) => field.trim());

  if (fields.length !== EXPECTED_HEADER.length) {
    throw new CsvFormatError(
      `Expected ${String(EXPECTED_HEADER.length)} columns but found ${String(fields.length)}`,
      lineNumber,
    );
  }

  // Safe after the length check above: the row has exactly EXPECTED_HEADER.length columns.
  const [rawYear, title, studios, rawProducers, rawWinner] = fields as MovieRowColumns;

  return {
    year: parseYear(rawYear, lineNumber),
    title: requireNonEmpty(title, 'title', lineNumber),
    studios,
    producers: parseProducers(rawProducers),
    winner: parseWinner(rawWinner, lineNumber),
  };
}

function parseYear(rawYear: string, lineNumber: number): number {
  if (!/^\d{4}$/.test(rawYear)) {
    throw new CsvFormatError(`Invalid year "${rawYear}". Expected a four-digit number`, lineNumber);
  }

  return Number.parseInt(rawYear, 10);
}

function requireNonEmpty(value: string, column: string, lineNumber: number): string {
  if (value.length === 0) {
    throw new CsvFormatError(`Column "${column}" must not be empty`, lineNumber);
  }

  return value;
}

function parseWinner(rawWinner: string, lineNumber: number): boolean {
  const winner = WINNER_VALUES.get(rawWinner.toLowerCase());

  if (winner === undefined) {
    throw new CsvFormatError(
      `Invalid winner "${rawWinner}". Expected one of: ${[...WINNER_VALUES.keys()].filter(Boolean).join(', ')} or empty`,
      lineNumber,
    );
  }

  return winner;
}
