import { describe, expect, it } from 'vitest';
import { calculateAwardIntervals } from '../../src/producers/award-interval-calculator.js';

describe('calculateAwardIntervals', () => {
  it('returns empty lists when there are no wins', () => {
    expect(calculateAwardIntervals([])).toEqual({ min: [], max: [] });
  });

  it('ignores producers awarded only once', () => {
    const summary = calculateAwardIntervals([
      { producer: 'Solo', year: 1999 },
      { producer: 'Repeat', year: 2000 },
      { producer: 'Repeat', year: 2004 },
    ]);

    expect(summary).toEqual({
      min: [{ producer: 'Repeat', interval: 4, previousWin: 2000, followingWin: 2004 }],
      max: [{ producer: 'Repeat', interval: 4, previousWin: 2000, followingWin: 2004 }],
    });
  });

  it('uses consecutive wins only, not the first and last year', () => {
    const summary = calculateAwardIntervals([
      { producer: 'Repeat', year: 1990 },
      { producer: 'Repeat', year: 1991 },
      { producer: 'Repeat', year: 2000 },
    ]);

    expect(summary.min).toEqual([
      { producer: 'Repeat', interval: 1, previousWin: 1990, followingWin: 1991 },
    ]);
    expect(summary.max).toEqual([
      { producer: 'Repeat', interval: 9, previousWin: 1991, followingWin: 2000 },
    ]);
  });

  it('sorts unordered input before computing intervals', () => {
    const summary = calculateAwardIntervals([
      { producer: 'Repeat', year: 2000 },
      { producer: 'Repeat', year: 1990 },
      { producer: 'Repeat', year: 1991 },
    ]);

    expect(summary.min[0]).toEqual({
      producer: 'Repeat',
      interval: 1,
      previousWin: 1990,
      followingWin: 1991,
    });
  });

  it('deduplicates repeated years so a double win in one year is not a zero interval', () => {
    const summary = calculateAwardIntervals([
      { producer: 'Repeat', year: 2000 },
      { producer: 'Repeat', year: 2000 },
      { producer: 'Repeat', year: 2003 },
    ]);

    expect(summary.min).toEqual([
      { producer: 'Repeat', interval: 3, previousWin: 2000, followingWin: 2003 },
    ]);
  });

  it('returns all producers tied on the extreme intervals, sorted by producer', () => {
    const summary = calculateAwardIntervals([
      { producer: 'Zoe', year: 2000 },
      { producer: 'Zoe', year: 2001 },
      { producer: 'Ana', year: 2010 },
      { producer: 'Ana', year: 2011 },
    ]);

    expect(summary.min.map((entry) => entry.producer)).toEqual(['Ana', 'Zoe']);
    expect(summary.max.map((entry) => entry.producer)).toEqual(['Ana', 'Zoe']);
  });

  it('keeps ties of the same producer in chronological order', () => {
    const summary = calculateAwardIntervals([
      { producer: 'Repeat', year: 2010 },
      { producer: 'Repeat', year: 2012 },
      { producer: 'Repeat', year: 2000 },
      { producer: 'Repeat', year: 2002 },
    ]);

    expect(summary.min.map((entry) => entry.previousWin)).toEqual([2000, 2010]);
  });
});
