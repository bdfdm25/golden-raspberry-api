import { describe, expect, it } from 'vitest';
import { CsvFormatError } from '../../src/csv/csv-format-error.js';
import { parseMovieCsv } from '../../src/csv/movie-csv-parser.js';

const HEADER = 'year;title;studios;producers;winner';
const BOM = String.fromCodePoint(0xfeff);

describe('parseMovieCsv', () => {
  it('parses a winner row', () => {
    const movies = parseMovieCsv(`${HEADER}\n1980;Title;Studio;Allan Carr;yes`);

    expect(movies).toEqual([
      { year: 1980, title: 'Title', studios: 'Studio', producers: ['Allan Carr'], winner: true },
    ]);
  });

  it.each([
    ['yes', true],
    ['YES', true],
    ['true', true],
    ['no', false],
    ['false', false],
    ['', false],
  ])('maps the winner column value "%s" to %s', (rawWinner, expected) => {
    const [movie] = parseMovieCsv(`${HEADER}\n1980;Title;Studio;Producer;${rawWinner}`);

    expect(movie?.winner).toBe(expected);
  });

  it('ignores blank, whitespace-only lines, carriage returns and a leading BOM', () => {
    const movies = parseMovieCsv(`${BOM}${HEADER}\r\n1980;A;S;P;yes\r\n   \r\n1981;B;S;P;\r\n`);

    expect(movies.map((movie) => movie.title)).toEqual(['A', 'B']);
  });

  it('trims the header and the row cells', () => {
    const movies = parseMovieCsv(
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
    const movies = parseMovieCsv(
      'year,title,studios,producers,winner\n1980,Title,Studio,"A, B",yes',
    );

    expect(movies[0]?.producers).toEqual(['A', 'B']);
  });

  it('accepts an empty studios or producers cell', () => {
    const [movie] = parseMovieCsv(`${HEADER}\n1980;Title;;;yes`);

    expect(movie).toMatchObject({ studios: '', producers: [] });
  });

  it.each([
    ['', 'CSV file is empty'],
    ['year|title|studios|producers|winner', 'Unable to detect a delimiter'],
    ['year;title;studios;winner', 'Invalid header'],
    ['title;year;studios;producers;winner', 'Invalid header'],
    ['year;title;studios;producers;winner;extra', 'Invalid header'],
  ])('rejects the header %s', (content, expectedMessage) => {
    expect(() => parseMovieCsv(content)).toThrow(expectedMessage);
  });

  it.each([
    ['1980;Title;Studio;Producer', 'Expected 5 columns but found 4'],
    ['1980;Title;Studio;Producer;yes;extra', 'Expected 5 columns but found 6'],
    ['80;Title;Studio;Producer;yes', 'Invalid year "80"'],
    ['19800;Title;Studio;Producer;yes', 'Invalid year "19800"'],
    ['a1980;Title;Studio;Producer;yes', 'Invalid year "a1980"'],
    ['nineteen;Title;Studio;Producer;yes', 'Invalid year "nineteen"'],
    ['1980;;Studio;Producer;yes', 'Column "title" must not be empty'],
    ['1980;Title;Studio;Producer;maybe', 'Invalid winner "maybe"'],
  ])('rejects the row %s', (row, expectedMessage) => {
    expect(() => parseMovieCsv(`${HEADER}\n${row}`)).toThrow(expectedMessage);
  });

  it('lists the accepted winner values in the error message', () => {
    expect(() => parseMovieCsv(`${HEADER}\n1980;Title;Studio;Producer;maybe`)).toThrow(
      'Line 2: Invalid winner "maybe". Expected one of: yes, true, no, false or empty',
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
