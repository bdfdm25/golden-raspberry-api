import { CsvFormatError } from './csv-format-error.js';
import { splitCsvLine } from './csv-line-splitter.js';
import { parseProducers } from './producer-parser.js';

export interface ParsedMovie {
  year: number;
  title: string;
  studios: string;
  producers: string[];
  winner: boolean;
}

/** An inconsistency that does not prevent the dataset from being used. */
export interface CsvWarning {
  line: number;
  message: string;
  occurrences: number;
}

export interface ParsedCsv {
  movies: ParsedMovie[];
  warnings: CsvWarning[];
}

const KNOWN_COLUMNS = ['year', 'title', 'studios', 'producers', 'winner'] as const;
type KnownColumn = (typeof KNOWN_COLUMNS)[number];

/** Columns the business rules depend on. The others are tolerated when absent. */
const REQUIRED_COLUMNS = ['year', 'producers', 'winner'] as const;
const OPTIONAL_COLUMNS = ['title', 'studios'] as const;

const SUPPORTED_DELIMITERS = [';', ',', '\t'] as const;
const REPLACEMENT_CHARACTER = '�';
const WINNER_VALUES = new Map<string, boolean>([
  ['yes', true],
  ['true', true],
  ['1', true],
  ['no', false],
  ['false', false],
  ['0', false],
  ['', false],
]);

/** Index of each known column in the header, or -1 when the file does not declare it. */
type ColumnIndexes = Record<KnownColumn, number>;

const ABSENT = -1;

interface WarningCollector {
  add: (line: number, message: string) => void;
  list: () => CsvWarning[];
}

export function parseMovieCsv(content: string): ParsedCsv {
  assertDecodable(content);

  const lines = toLines(content);
  const headerLine = lines[0];

  if (headerLine === undefined) {
    throw new CsvFormatError('CSV file is empty');
  }

  const delimiter = detectDelimiter(headerLine);
  const header = splitCsvLine(headerLine, delimiter).map((column) => column.trim().toLowerCase());
  const columns = mapColumns(header);
  assertRequiredColumns(columns, headerLine);

  const warnings = createWarningCollector();
  collectHeaderWarnings(header, columns, warnings);

  const movies = lines
    .slice(1)
    .map((line, index) =>
      parseMovieLine(line, { delimiter, columns, headerSize: header.length }, index + 2, warnings),
    );

  return { movies, warnings: warnings.list() };
}

function assertDecodable(content: string): void {
  if (content.includes(REPLACEMENT_CHARACTER)) {
    throw new CsvFormatError(
      'The file could not be decoded as UTF-8. Convert it before loading, for example with "iconv -f ISO-8859-1 -t UTF-8"',
    );
  }
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

/** Columns are located by name, so their order in the file does not matter. */
function mapColumns(header: string[]): ColumnIndexes {
  const indexes = {} as ColumnIndexes;

  for (const column of KNOWN_COLUMNS) {
    indexes[column] = header.indexOf(column);
  }

  return indexes;
}

function assertRequiredColumns(columns: ColumnIndexes, headerLine: string): void {
  const missing = REQUIRED_COLUMNS.filter((column) => columns[column] === ABSENT);

  if (missing.length > 0) {
    throw new CsvFormatError(
      `Invalid header. Missing required column(s) "${missing.join(', ')}" in "${headerLine}"`,
      1,
    );
  }
}

function collectHeaderWarnings(
  header: string[],
  columns: ColumnIndexes,
  warnings: WarningCollector,
): void {
  for (const column of OPTIONAL_COLUMNS) {
    if (columns[column] === ABSENT) {
      warnings.add(1, `Column "${column}" is absent and no business rule depends on it`);
    }
  }

  const unknown = header.filter((name) => !KNOWN_COLUMNS.includes(name as KnownColumn));
  if (unknown.length > 0) {
    warnings.add(1, `Ignoring column(s) unknown to the API: ${unknown.join(', ')}`);
  }
}

function createWarningCollector(): WarningCollector {
  const byMessage = new Map<string, CsvWarning>();

  return {
    add: (line, message) => {
      const existing = byMessage.get(message);
      if (existing === undefined) {
        byMessage.set(message, { line, message, occurrences: 1 });
        return;
      }

      existing.occurrences += 1;
    },
    list: () => [...byMessage.values()],
  };
}

interface RowLayout {
  delimiter: string;
  columns: ColumnIndexes;
  headerSize: number;
}

function parseMovieLine(
  line: string,
  layout: RowLayout,
  lineNumber: number,
  warnings: WarningCollector,
): ParsedMovie {
  const fields = splitCsvLine(line, layout.delimiter).map((field) => field.trim());
  // An absent column has index -1, which reads as an empty cell.
  const read = (column: KnownColumn): string => fields[layout.columns[column]] ?? '';

  const title = read('title');
  const titleIsDeclared = layout.columns.title !== ABSENT;
  collectRowWarnings(
    { rowSize: fields.length, headerSize: layout.headerSize, title, titleIsDeclared },
    lineNumber,
    warnings,
  );

  return {
    year: parseYear(read('year'), lineNumber),
    title,
    studios: read('studios'),
    producers: parseProducers(read('producers')),
    winner: parseWinner(read('winner'), lineNumber),
  };
}

interface RowShape {
  rowSize: number;
  headerSize: number;
  title: string;
  titleIsDeclared: boolean;
}

function collectRowWarnings(row: RowShape, lineNumber: number, warnings: WarningCollector): void {
  if (row.rowSize !== row.headerSize) {
    warnings.add(
      lineNumber,
      `Row has ${String(row.rowSize)} column(s) while the header has ${String(row.headerSize)}`,
    );
  }

  // An absent column is already reported once for the whole file by the header check.
  if (row.titleIsDeclared && row.title.length === 0) {
    warnings.add(lineNumber, 'Column "title" is empty and no business rule depends on it');
  }
}

function parseYear(rawYear: string, lineNumber: number): number {
  if (!/^\d{4}$/.test(rawYear)) {
    throw new CsvFormatError(`Invalid year "${rawYear}". Expected a four-digit number`, lineNumber);
  }

  return Number.parseInt(rawYear, 10);
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
