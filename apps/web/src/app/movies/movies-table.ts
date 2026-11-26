import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Movie } from '../core/movie';

@Component({
  selector: 'app-movies-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto rounded-xl border border-line">
      <table class="w-full border-collapse text-left text-sm">
        <caption class="sr-only">
          Filmes indicados e vencedores
        </caption>
        <thead class="bg-raised">
          <tr class="font-mono text-xs tracking-widest text-muted uppercase">
            <th scope="col" class="px-4 py-3 font-medium">Ano</th>
            <th scope="col" class="px-4 py-3 font-medium">Título</th>
            <th scope="col" class="px-4 py-3 font-medium">Estúdios</th>
            <th scope="col" class="px-4 py-3 font-medium">Produtores</th>
            <th scope="col" class="px-4 py-3 text-right font-medium">Vencedor</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line bg-surface">
          @for (movie of movies(); track movie.id) {
            <tr class="transition-colors hover:bg-raised">
              <td class="px-4 py-3 font-mono text-muted tabular-nums">{{ movie.year }}</td>
              <td class="px-4 py-3 font-medium">{{ movie.title }}</td>
              <td class="px-4 py-3 text-muted">{{ movie.studios }}</td>
              <td class="px-4 py-3 text-muted" [title]="movie.producers.join(', ')">
                {{ summarise(movie.producers) }}
              </td>
              <td class="px-4 py-3 text-right">
                @if (movie.winner) {
                  <span
                    class="rounded-full bg-brand/15 px-2.5 py-0.5 font-mono text-xs text-brand-ink"
                  >
                    sim
                  </span>
                } @else {
                  <span class="rounded-full bg-muted/10 px-2.5 py-0.5 font-mono text-xs text-muted">
                    não
                  </span>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MoviesTable {
  readonly movies = input.required<Movie[]>();

  /** A movie can carry a hundred producers; the full list stays in the title attribute. */
  protected summarise(producers: string[]): string {
    if (producers.length === 0) {
      return '—';
    }

    return producers.length > 2
      ? `${producers[0] ?? ''} +${String(producers.length - 1)}`
      : producers.join(', ');
  }
}
