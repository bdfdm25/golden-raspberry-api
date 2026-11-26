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

  it('splits on "and" as a whole word, never inside a word', () => {
    expect(parseProducers('Alexander Sandro')).toEqual(['Alexander Sandro']);
  });

  // Known limit, asserted on purpose: "and" inside a jointly credited name is
  // indistinguishable from "and" as a separator. The provided dataset has one
  // such row ("Sid and Marty Krofft and Jimmy Miller"), which yields "Sid".
  // Splitting is still the right default: a co-credited producer must earn the
  // award individually, as Joel Silver does for "Steven Perry and Joel Silver".
  it('also splits names that are credited jointly', () => {
    expect(parseProducers('Sid and Marty Krofft and Jimmy Miller')).toEqual([
      'Sid',
      'Marty Krofft',
      'Jimmy Miller',
    ]);
  });
});
