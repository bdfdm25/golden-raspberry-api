import { describe, expect, it } from 'vitest';
import { splitCsvLine } from '../../src/csv/csv-line-splitter.js';

describe('splitCsvLine', () => {
  it('splits plain fields', () => {
    expect(splitCsvLine('1980;Title;Studio', ';')).toEqual(['1980', 'Title', 'Studio']);
  });

  it('keeps the delimiter inside quoted fields', () => {
    expect(splitCsvLine('1980;"A;B";Studio', ';')).toEqual(['1980', 'A;B', 'Studio']);
  });

  it('unescapes doubled quotes inside quoted fields', () => {
    expect(splitCsvLine('1980;"The ""Best"" Movie"', ';')).toEqual(['1980', 'The "Best" Movie']);
  });

  it('keeps empty trailing fields', () => {
    expect(splitCsvLine('1980;Title;;', ';')).toEqual(['1980', 'Title', '', '']);
  });

  it('supports other delimiters', () => {
    expect(splitCsvLine('a,b,c', ',')).toEqual(['a', 'b', 'c']);
  });
});
