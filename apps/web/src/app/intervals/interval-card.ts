import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ProducerAwardInterval } from '../core/movie';

@Component({
  selector: 'app-interval-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="h-full rounded-xl border border-line bg-surface p-6">
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="font-mono text-xs font-medium tracking-widest text-muted uppercase">
          {{ label() }}
        </h2>
        @if (entries().length > 1) {
          <span class="font-mono text-xs text-muted">{{ entries().length }} empatados</span>
        }
      </div>

      @if (interval(); as years) {
        <p class="mt-4 flex items-baseline gap-2">
          <span class="font-mono text-5xl font-medium tabular-nums" [class]="accentClass()">
            {{ years }}
          </span>
          <span class="text-sm text-muted">{{ years === 1 ? 'ano' : 'anos' }}</span>
        </p>

        <ul class="mt-6 divide-y divide-line">
          @for (entry of entries(); track entry.producer + entry.previousWin) {
            <li class="py-3 first:pt-0 last:pb-0">
              <p class="text-[17px] font-semibold">{{ entry.producer }}</p>
              <p class="mt-1 font-mono text-xs text-muted tabular-nums">
                {{ entry.previousWin }} <span class="text-line">———</span> {{ entry.followingWin }}
              </p>
            </li>
          }
        </ul>
      } @else {
        <p class="mt-4 text-sm text-muted">
          Nenhum produtor premiado mais de uma vez neste conjunto de dados.
        </p>
      }
    </article>
  `,
})
export class IntervalCard {
  readonly label = input.required<string>();
  readonly entries = input.required<ProducerAwardInterval[]>();
  readonly accent = input<'brand' | 'accent'>('brand');

  protected readonly interval = computed(() => this.entries()[0]?.interval);
  protected readonly accentClass = computed(() =>
    this.accent() === 'brand' ? 'text-brand' : 'text-accent',
  );
}
