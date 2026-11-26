import { httpResource, type HttpResourceRef } from '@angular/common/http';
import { inject, Injectable, type Signal } from '@angular/core';
import { API_BASE_URL } from './api';
import type { AwardIntervalSummary, Health, MovieFilters, MoviePage } from './movie';

@Injectable({ providedIn: 'root' })
export class MoviesApi {
  private readonly baseUrl = inject(API_BASE_URL);

  health(): HttpResourceRef<Health | undefined> {
    return httpResource<Health>(() => `${this.baseUrl}/health`);
  }

  awardIntervals(): HttpResourceRef<AwardIntervalSummary | undefined> {
    return httpResource<AwardIntervalSummary>(() => `${this.baseUrl}/producers/intervals`);
  }

  /** Re-fetches whenever the filters signal changes, which is what drives the table. */
  movies(filters: Signal<MovieFilters>): HttpResourceRef<MoviePage | undefined> {
    return httpResource<MoviePage>(() => ({
      url: `${this.baseUrl}/movies`,
      params: toQueryParams(filters()),
    }));
  }
}

function toQueryParams(filters: MovieFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: filters.page,
    limit: filters.limit,
  };

  if (filters.year !== undefined) {
    params['year'] = filters.year;
  }

  if (filters.winner !== undefined) {
    params['winner'] = String(filters.winner);
  }

  return params;
}
