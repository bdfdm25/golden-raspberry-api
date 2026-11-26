import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { describeApiError } from '../core/api-error';
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
  protected readonly health = this.api.health();

  protected readonly errorMessage = computed(() => {
    const error = this.intervals.error();
    return error === undefined ? undefined : describeApiError(error);
  });

  // hasValue() guards the read: value() throws when the request failed.
  protected readonly movieCount = computed(() =>
    this.health.hasValue() ? this.health.value().movies : 0,
  );

  protected reload(): void {
    this.intervals.reload();
  }
}
