import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { MoviePage } from '../core/movie';
import { MoviesPage } from './movies-page';

function pageWith(overrides: Partial<MoviePage['pagination']> = {}): MoviePage {
  return {
    data: [
      {
        id: 36,
        year: 1986,
        title: 'Howard the Duck',
        studios: 'Universal Studios',
        producers: ['Gloria Katz'],
        winner: true,
      },
    ],
    pagination: { page: 1, limit: 20, total: 206, totalPages: 11, ...overrides },
  };
}

describe('MoviesPage', () => {
  let fixture: ComponentFixture<MoviesPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MoviesPage);
    fixture.detectChanges();
    // MoviesApi exposes a single shared health resource, so every page triggers it.
    http.expectOne('/api/health').flush({ status: 'ok', movies: 206 });
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function expectMoviesRequest(): ReturnType<HttpTestingController['expectOne']> {
    return http.expectOne((request) => request.url === '/api/movies');
  }

  async function change(selector: string, value: string): Promise<void> {
    const field = element().querySelector(selector) as HTMLInputElement | HTMLSelectElement;
    field.value = value;
    field.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await Promise.resolve();
  }

  it('starts on the first page with the default page size', () => {
    const request = expectMoviesRequest().request;

    expect(request.params.get('page')).toBe('1');
    expect(request.params.get('limit')).toBe('20');
    expect(request.params.has('year')).toBe(false);
    expect(request.params.has('winner')).toBe(false);
  });

  it('shows the loading state while the request is pending', () => {
    expectMoviesRequest();

    expect(element().textContent).toContain('carregando filmes');
    expect(element().textContent).not.toContain('Nenhum filme encontrado');
  });

  it('renders the returned movies and the range', async () => {
    expectMoviesRequest().flush(pageWith());
    await fixture.whenStable();

    expect(element().textContent).toContain('Howard the Duck');
    expect(element().textContent).toContain('1-20');
    expect(element().textContent).toContain('206');
  });

  it('sends the year filter and goes back to the first page', async () => {
    expectMoviesRequest().flush(pageWith({ page: 2 }));
    await fixture.whenStable();

    await change('#year', '1986');

    const pending = expectMoviesRequest();
    expect(pending.request.params.get('year')).toBe('1986');
    expect(pending.request.params.get('page')).toBe('1');
    pending.flush(pageWith({ total: 2, totalPages: 1 }));
  });

  it('sends the winner filter as a boolean string', async () => {
    expectMoviesRequest().flush(pageWith());
    await fixture.whenStable();

    await change('#winner', 'true');

    const pending = expectMoviesRequest();
    expect(pending.request.params.get('winner')).toBe('true');
    pending.flush(pageWith({ total: 42, totalPages: 3 }));
  });

  it('asks for the next page when the pager is used', async () => {
    expectMoviesRequest().flush(pageWith());
    await fixture.whenStable();

    const next = [...element().querySelectorAll('nav button')].find(
      (button) => button.textContent?.trim() === 'próxima',
    ) as HTMLButtonElement;
    next.click();
    fixture.detectChanges();

    const pending = expectMoviesRequest();
    expect(pending.request.params.get('page')).toBe('2');
    pending.flush(pageWith({ page: 2 }));
  });

  it('changes the page size and returns to the first page', async () => {
    expectMoviesRequest().flush(pageWith({ page: 3 }));
    await fixture.whenStable();

    await change('#limit', '50');

    const pending = expectMoviesRequest();
    expect(pending.request.params.get('limit')).toBe('50');
    expect(pending.request.params.get('page')).toBe('1');
    pending.flush(pageWith({ limit: 50, totalPages: 5 }));
  });

  it('goes back to the previous page', async () => {
    expectMoviesRequest().flush(pageWith());
    await fixture.whenStable();

    const next = [...element().querySelectorAll('nav button')].find(
      (button) => button.textContent?.trim() === 'próxima',
    ) as HTMLButtonElement;
    next.click();
    fixture.detectChanges();
    expectMoviesRequest().flush(pageWith({ page: 2 }));
    await fixture.whenStable();

    const previous = [...element().querySelectorAll('nav button')].find(
      (button) => button.textContent?.trim() === 'anterior',
    ) as HTMLButtonElement;
    previous.click();
    fixture.detectChanges();

    const pending = expectMoviesRequest();
    expect(pending.request.params.get('page')).toBe('1');
    pending.flush(pageWith());
  });

  it('clears every filter at once', async () => {
    expectMoviesRequest().flush(pageWith());
    await fixture.whenStable();

    await change('#year', '1986');
    expectMoviesRequest().flush(pageWith({ total: 2, totalPages: 1 }));
    await fixture.whenStable();

    const clear = [...element().querySelectorAll('form button')].find(
      (button) => button.textContent?.trim() === 'Limpar',
    ) as HTMLButtonElement;
    clear.click();
    fixture.detectChanges();

    const pending = expectMoviesRequest();
    expect(pending.request.params.has('year')).toBe(false);
    pending.flush(pageWith());
  });

  it('explains an empty result instead of showing an empty table', async () => {
    expectMoviesRequest().flush({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    await fixture.whenStable();

    expect(element().textContent).toContain('Nenhum filme encontrado');
    expect(element().querySelector('table')).toBeNull();
  });

  it('reports an unexpected payload instead of freezing on the loading state', async () => {
    expectMoviesRequest().flush({ unexpected: 'shape', items: [] });
    await fixture.whenStable();

    expect(element().textContent).toContain('formato que este painel não reconhece');
    expect(element().textContent).not.toContain('carregando filmes');
    expect(element().querySelector('table')).toBeNull();
  });

  it('never sends a non-numeric year to the API', async () => {
    expectMoviesRequest().flush(pageWith());
    await fixture.whenStable();

    await change('#year', 'abc');

    const pending = expectMoviesRequest();
    expect(pending.request.params.has('year')).toBe(false);
    pending.flush(pageWith());
  });

  it('shows the parameter the API rejected', async () => {
    expectMoviesRequest().flush(
      {
        error: {
          message: 'Invalid query parameters',
          details: [{ field: 'year', message: 'year must be an integer between 1 and 9999' }],
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();

    expect(element().textContent).toContain('year must be an integer between 1 and 9999');
  });
});
