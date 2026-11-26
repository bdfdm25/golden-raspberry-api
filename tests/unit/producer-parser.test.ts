import { describe, expect, it } from 'vitest';
import { parseProducers } from '../../src/csv/producer-parser.js';

describe('parseProducers', () => {
  it.each([
    ['Allan Carr', ['Allan Carr']],
    ['Ted Field and Robert W. Cort', ['Ted Field', 'Robert W. Cort']],
    [
      'Bob Cavallo, Joe Ruffalo and Steve Fargnoli',
      ['Bob Cavallo', 'Joe Ruffalo', 'Steve Fargnoli'],
    ],
    ['Jon Peters & Peter Guber', ['Jon Peters', 'Peter Guber']],
    ['  Spaced  ,  Names  ', ['Spaced', 'Names']],
    ['', []],
    [' , , ', []],
  ])('parses %s', (raw, expected) => {
    expect(parseProducers(raw)).toEqual(expected);
  });

  it('does not split names that merely contain "and"', () => {
    expect(parseProducers('Alexander Sandro')).toEqual(['Alexander Sandro']);
  });
});
