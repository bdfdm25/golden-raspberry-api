import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-line bg-surface px-6 py-5">
      <p class="font-mono text-xs font-medium tracking-widest text-muted uppercase">
        {{ label() }}
      </p>
      <p class="mt-2 font-mono text-2xl font-medium tabular-nums">{{ value() }}</p>
    </div>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
}
