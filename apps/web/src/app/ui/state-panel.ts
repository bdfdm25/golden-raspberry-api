import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Empty and error states share the same frame; only the tone and the action change. */
@Component({
  selector: 'app-state-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-xl border px-6 py-12 text-center"
      [class]="
        tone() === 'danger'
          ? 'border-danger/40 bg-danger/5'
          : 'border-dashed border-line bg-surface'
      "
      [attr.role]="tone() === 'danger' ? 'alert' : null"
    >
      <p class="text-base font-semibold" [class.text-danger]="tone() === 'danger'">
        {{ title() }}
      </p>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted">{{ description() }}</p>

      @if (actionLabel()) {
        <button
          type="button"
          class="mt-6 h-10 rounded-md border border-line px-4 text-sm font-medium text-muted transition-colors hover:border-brand hover:text-ink focus:ring-2 focus:ring-brand focus:outline-none"
          (click)="action.emit()"
        >
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
})
export class StatePanel {
  readonly tone = input<'neutral' | 'danger'>('neutral');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input<string>();
  readonly action = output();
}
