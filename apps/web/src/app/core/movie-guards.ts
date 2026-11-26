import type { AwardIntervalSummary, MoviePage } from './movie';

/**
 * The API is contract-tested on its own side, but a 200 carrying an unexpected body would
 * otherwise reach the template and throw inside a computed, freezing the page with no error
 * shown. These guards turn that into the error state.
 */
export function isMoviePage(value: unknown): value is MoviePage {
  if (!isObject(value)) {
    return false;
  }

  const page = value as Partial<MoviePage>;
  return Array.isArray(page.data) && typeof page.pagination?.total === 'number';
}

export function isAwardIntervalSummary(value: unknown): value is AwardIntervalSummary {
  if (!isObject(value)) {
    return false;
  }

  const summary = value as Partial<AwardIntervalSummary>;
  return Array.isArray(summary.min) && Array.isArray(summary.max);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
