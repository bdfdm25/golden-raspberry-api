import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { describeApiError } from '../core/api-error';
import type { MovieFilters } from '../core/movie';
import { MoviesApi } from '../core/movies-api';
import { StatePanel } from '../ui/state-panel';
import { MoviesTable } from './movies-table';

const DEFAULT_FILTERS: MovieFilters = { page: 1, limit: 20, year: undefined, winner: undefined };
const PAGE_SIZES = [20, 50, 100] as const;

@Component({
  selector: 'app-movies-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoviesTable, StatePanel],
  templateUrl: './movies-page.html',
})
export class MoviesPage {
  private readonly api = inject(MoviesApi);

  protected readonly pageSizes = PAGE_SIZES;
  protected readonly filters = signal<MovieFilters>(DEFAULT_FILTERS);
  protected readonly movies = this.api.movies(this.filters);

  protected readonly errorMessage = computed(() => {
    const error = this.movies.error();
    return error === undefined ? undefined : describeApiError(error);
  });

  // Every read goes through hasValue(): value() throws while the resource is in error.
  protected readonly pagination = computed(() =>
    this.movies.hasValue() ? this.movies.value().pagination : undefined,
  );
  protected readonly isEmpty = computed(
    () => this.movies.hasValue() && this.movies.value().data.length === 0,
  );
  protected readonly range = computed(() => {
    const pagination = this.pagination();
    if (pagination === undefined || pagination.total === 0) {
      return '0';
    }

    const first = (pagination.page - 1) * pagination.limit + 1;
    const last = Math.min(pagination.page * pagination.limit, pagination.total);
    return `${String(first)}-${String(last)}`;
  });

  /** Any filter change resets the page: page 7 of a new filter rarely exists. */
  protected applyYear(value: string): void {
    const year = value.trim() === '' ? undefined : Number(value);
    this.filters.update((current) => ({ ...current, year, page: 1 }));
  }

  protected applyWinner(value: string): void {
    const winner = value === '' ? undefined : value === 'true';
    this.filters.update((current) => ({ ...current, winner, page: 1 }));
  }

  protected applyLimit(value: string): void {
    this.filters.update((current) => ({ ...current, limit: Number(value), page: 1 }));
  }

  protected goToPage(page: number): void {
    this.filters.update((current) => ({ ...current, page }));
  }

  protected clear(): void {
    this.filters.set(DEFAULT_FILTERS);
  }
}
