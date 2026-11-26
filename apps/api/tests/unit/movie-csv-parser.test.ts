import { describe, expect, it } from 'vitest';
import { CsvFormatError } from '../../src/csv/csv-format-error.js';
import { parseMovieCsv } from '../../src/csv/movie-csv-parser.js';

const HEADER = 'year;title;studios;producers;winner';
const BOM = String.fromCodePoint(0xfeff);

describe('parseMovieCsv', () => {
  it('parses a winner row without warnings', () => {
    const { movies, warnings } = parseMovieCsv(`${HEADER}\n1980;Title;Studio;Allan Carr;yes`);

    expect(movies).toEqual([
      { year: 1980, title: 'Title', studios: 'Studio', producers: ['Allan Carr'], winner: true },
    ]);
    expect(warnings).toEqual([]);
  });

  it.each([
    ['yes', true],
    ['YES', true],
    ['true', true],
    ['1', true],
    ['no', false],
    ['false', false],
    ['0', false],
    ['', false],
  ])('maps the winner column value "%s" to %s', (rawWinner, expected) => {
    const { movies } = parseMovieCsv(`${HEADER}\n1980;Title;Studio;Producer;${rawWinner}`);

    expect(movies[0]?.winner).toBe(expected);
  });

  it('ignores blank, whitespace-only lines, carriage returns and a leading BOM', () => {
    const { movies } = parseMovieCsv(`${BOM}${HEADER}\r\n1980;A;S;P;yes\r\n   \r\n1981;B;S;P;\r\n`);

    expect(movies.map((movie) => movie.title)).toEqual(['A', 'B']);
  });

  it('trims the header and the row cells', () => {
    const { movies } = parseMovieCsv(
      ' Year ; Title ; Studios ; Producers ; Winner \n 1980 ; A Title ; A Studio ; A Producer ; yes ',
    );

    expect(movies).toEqual([
      {
        year: 1980,
        title: 'A Title',
        studios: 'A Studio',
        producers: ['A Producer'],
        winner: true,
      },
    ]);
  });

  it('accepts a comma-delimited file', () => {
    const { movies } = parseMovieCsv(
      'year,title,studios,producers,winner\n1980,Title,Studio,"A, B",yes',
    );

    expect(movies[0]?.producers).toEqual(['A', 'B']);
  });

  it('accepts an empty studios or producers cell', () => {
    const { movies } = parseMovieCsv(`${HEADER}\n1980;Title;;;yes`);

    expect(movies[0]).toMatchObject({ studios: '', producers: [] });
  });

  it('locates the columns by name, so their order does not matter', () => {
    const { movies, warnings } = parseMovieCsv(
      'winner;producers;year;studios;title\nyes;Allan Carr;1980;Studio;Title',
    );

    expect(movies).toEqual([
      { year: 1980, title: 'Title', studios: 'Studio', producers: ['Allan Carr'], winner: true },
    ]);
    expect(warnings).toEqual([]);
  });

  it('ignores columns it does not know and warns once about them', () => {
    const { movies, warnings } = parseMovieCsv(
      `${HEADER};country;budget\n1980;Title;Studio;Producer;yes;BR;100\n1981;Other;Studio;Producer;yes;US;200`,
    );

    expect(movies.map((movie) => movie.title)).toEqual(['Title', 'Other']);
    expect(warnings).toEqual([
      {
        line: 1,
        message: 'Ignoring column(s) unknown to the API: country, budget',
        occurrences: 1,
      },
    ]);
  });

  it('accepts a dataset without the columns no business rule depends on', () => {
    const { movies, warnings } = parseMovieCsv('year;producers;winner\n1980;Allan Carr;yes');

    expect(movies).toEqual([
      { year: 1980, title: '', studios: '', producers: ['Allan Carr'], winner: true },
    ]);
    expect(warnings.map((warning) => warning.message)).toEqual([
      'Column "title" is absent and no business rule depends on it',
      'Column "studios" is absent and no business rule depends on it',
    ]);
  });

  it('warns instead of failing when a title is empty, counting every occurrence', () => {
    const { movies, warnings } = parseMovieCsv(
      `${HEADER}\n1980;;Studio;Producer;yes\n1981;;Studio;Producer;yes`,
    );

    expect(movies).toHaveLength(2);
    expect(warnings).toEqual([
      {
        line: 2,
        message: 'Column "title" is empty and no business rule depends on it',
        occurrences: 2,
      },
    ]);
  });

  it('warns when a row does not have as many columns as the header', () => {
    const { movies, warnings } = parseMovieCsv(`${HEADER}\n1980;Title;Studio;Producer`);

    expect(movies[0]).toMatchObject({ title: 'Title', winner: false });
    expect(warnings).toContainEqual({
      line: 2,
      message: 'Row has 4 column(s) while the header has 5',
      occurrences: 1,
    });
  });

  it.each([
    ['', 'CSV file is empty'],
    ['year|title|studios|producers|winner', 'Unable to detect a delimiter'],
    ['year;title;studios;winner', 'Missing required column(s) "producers"'],
    ['title;studios\nA;B', 'Missing required column(s) "year, producers, winner"'],
  ])('rejects the header %s', (content, expectedMessage) => {
    expect(() => parseMovieCsv(content)).toThrow(expectedMessage);
  });

  it.each([
    ['80;Title;Studio;Producer;yes', 'Invalid year "80"'],
    ['19800;Title;Studio;Producer;yes', 'Invalid year "19800"'],
    ['a1980;Title;Studio;Producer;yes', 'Invalid year "a1980"'],
    ['nineteen;Title;Studio;Producer;yes', 'Invalid year "nineteen"'],
    [';Title;Studio;Producer;yes', 'Invalid year ""'],
    ['1980;Title;Studio;Producer;maybe', 'Invalid winner "maybe"'],
  ])('rejects the row %s', (row, expectedMessage) => {
    expect(() => parseMovieCsv(`${HEADER}\n${row}`)).toThrow(expectedMessage);
  });

  it('rejects a file that could not be decoded as UTF-8', () => {
    const latin1 = Buffer.from(`${HEADER}\n1980;Café;Studio;José Silva;yes`, 'latin1');

    expect(() => parseMovieCsv(latin1.toString('utf8'))).toThrow(/could not be decoded as UTF-8/);
  });

  it('lists the accepted winner values in the error message', () => {
    expect(() => parseMovieCsv(`${HEADER}\n1980;Title;Studio;Producer;maybe`)).toThrow(
      'Line 2: Invalid winner "maybe". Expected one of: yes, true, 1, no, false, 0 or empty',
    );
  });

  it('lists the supported delimiters in the error message', () => {
    expect(() => parseMovieCsv('year|title|studios|producers|winner')).toThrow(
      'Line 1: Unable to detect a delimiter in the header. Supported delimiters: ; , \t',
    );
  });

  it('reports the line number of the offending row', () => {
    const content = `${HEADER}\n1980;A;S;P;yes\n1981;B;S;P;maybe`;

    expect(() => parseMovieCsv(content)).toThrow(CsvFormatError);
    expect(() => parseMovieCsv(content)).toThrow(/^Line 3: /);
  });

  it('builds a message without a line number when none is provided', () => {
    const error = new CsvFormatError('broken');

    expect(error.message).toBe('broken');
    expect(error.name).toBe('CsvFormatError');
  });
});
