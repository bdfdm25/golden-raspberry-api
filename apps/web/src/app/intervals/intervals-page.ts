import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { describeApiError } from '../core/api-error';
import { isAwardIntervalSummary } from '../core/movie-guards';
import { MoviesApi } from '../core/movies-api';
import { StatCard } from '../ui/stat-card';
import { StatePanel } from '../ui/state-panel';
import { IntervalCard } from './interval-card';

@Component({
  selector: 'app-intervals-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IntervalCard, StatCard, StatePanel],
  templateUrl: './intervals-page.html',
})
export class IntervalsPage {
  private readonly api = inject(MoviesApi);

  protected readonly intervals = this.api.awardIntervals();
  protected readonly health = this.api.health;

  protected readonly summary = computed(() => {
    const value = this.intervals.hasValue() ? this.intervals.value() : undefined;
    return isAwardIntervalSummary(value) ? value : undefined;
  });

  protected readonly errorMessage = computed(() => {
    const error = this.intervals.error();
    if (error !== undefined) {
      return describeApiError(error);
    }

    return this.intervals.hasValue() && this.summary() === undefined
      ? 'A API respondeu em um formato que este painel não reconhece.'
      : undefined;
  });

  // hasValue() guards the read: value() throws when the request failed.
  protected readonly movieCount = computed(() =>
    this.health.hasValue() ? this.health.value().movies : 0,
  );

  /** The health indicator has to recover too, or the badge keeps saying the API is down. */
  protected reload(): void {
    this.intervals.reload();
    this.health.reload();
  }
}
