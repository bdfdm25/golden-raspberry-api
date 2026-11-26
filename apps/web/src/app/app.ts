import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MoviesApi } from './core/movies-api';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  private readonly api = inject(MoviesApi);

  protected readonly health = this.api.health;

  // resource.value() throws while the resource is in an error state, which is precisely
  // the state this indicator exists to report. hasValue() is the guard.
  protected readonly isUp = computed(
    () => this.health.hasValue() && this.health.value().status === 'ok',
  );
  protected readonly movieCount = computed(() =>
    this.health.hasValue() ? this.health.value().movies : undefined,
  );
}
