import { TestBed } from '@angular/core/testing';
import type { Movie } from '../core/movie';
import { MoviesTable } from './movies-table';

const movie: Movie = {
  id: 36,
  year: 1986,
  title: 'Howard the Duck',
  studios: 'Universal Studios',
  producers: ['Gloria Katz'],
  winner: true,
};

function render(movies: Movie[]): HTMLElement {
  const fixture = TestBed.createComponent(MoviesTable);
  fixture.componentRef.setInput('movies', movies);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('MoviesTable', () => {
  it('renders one row per movie', () => {
    const element = render([movie, { ...movie, id: 37, title: 'Under the Cherry Moon' }]);

    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.textContent).toContain('Howard the Duck');
  });

  it('marks winners and nominations differently', () => {
    const element = render([movie, { ...movie, id: 2, winner: false }]);
    const badges = [...element.querySelectorAll('tbody tr td:last-child')];

    expect(badges[0]?.textContent?.trim()).toBe('sim');
    expect(badges[1]?.textContent?.trim()).toBe('não');
  });

  it('truncates long producer lists and keeps the full list in the title attribute', () => {
    const producers = ['Bob Cavallo', 'Joe Ruffalo', 'Steve Fargnoli'];
    const element = render([{ ...movie, producers }]);
    const cell = element.querySelector('tbody tr td:nth-child(4)');

    expect(cell?.textContent?.trim()).toBe('Bob Cavallo +2');
    expect(cell?.getAttribute('title')).toBe(producers.join(', '));
  });

  it('keeps two producers readable instead of truncating them', () => {
    const element = render([{ ...movie, producers: ['Steven Perry', 'Joel Silver'] }]);

    expect(element.querySelector('tbody tr td:nth-child(4)')?.textContent?.trim()).toBe(
      'Steven Perry, Joel Silver',
    );
  });

  it('shows a dash when the movie has no registered producer', () => {
    const element = render([{ ...movie, producers: [] }]);

    expect(element.querySelector('tbody tr td:nth-child(4)')?.textContent?.trim()).toBe('—');
  });
});
