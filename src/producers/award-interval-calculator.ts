import type { ProducerWin } from '../database/movie-repository.js';

export interface ProducerAwardInterval {
  producer: string;
  interval: number;
  previousWin: number;
  followingWin: number;
}

export interface AwardIntervalSummary {
  min: ProducerAwardInterval[];
  max: ProducerAwardInterval[];
}

/**
 * Computes, for every producer awarded at least twice, the intervals between
 * consecutive wins, and returns all producers tied on the shortest (min) and
 * longest (max) interval.
 */
export function calculateAwardIntervals(wins: ProducerWin[]): AwardIntervalSummary {
  const intervals = buildConsecutiveIntervals(groupWinYearsByProducer(wins));
  const values = intervals.map((interval) => interval.interval);

  return {
    min: selectByInterval(intervals, Math.min(...values)),
    max: selectByInterval(intervals, Math.max(...values)),
  };
}

function groupWinYearsByProducer(wins: ProducerWin[]): Map<string, number[]> {
  const yearsByProducer = new Map<string, Set<number>>();

  for (const { producer, year } of wins) {
    const years = yearsByProducer.get(producer) ?? new Set<number>();
    years.add(year);
    yearsByProducer.set(producer, years);
  }

  return new Map(
    [...yearsByProducer].map(([producer, years]) => [producer, [...years].sort(compareNumbers)]),
  );
}

function buildConsecutiveIntervals(
  yearsByProducer: Map<string, number[]>,
): ProducerAwardInterval[] {
  const intervals: ProducerAwardInterval[] = [];

  for (const [producer, years] of yearsByProducer) {
    let previousWin: number | undefined;

    for (const followingWin of years) {
      if (previousWin !== undefined) {
        intervals.push({
          producer,
          interval: followingWin - previousWin,
          previousWin,
          followingWin,
        });
      }
      previousWin = followingWin;
    }
  }

  return intervals;
}

function selectByInterval(
  intervals: ProducerAwardInterval[],
  target: number,
): ProducerAwardInterval[] {
  // Sorting is stable, so intervals of the same producer keep their chronological order.
  return intervals
    .filter((interval) => interval.interval === target)
    .sort((first, second) => first.producer.localeCompare(second.producer));
}

function compareNumbers(first: number, second: number): number {
  return first - second;
}
