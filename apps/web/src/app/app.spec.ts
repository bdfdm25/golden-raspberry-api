import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('reports the API as up and shows how many movies are loaded', async () => {
    http.expectOne('/api/health').flush({ status: 'ok', movies: 206 });
    await fixture.whenStable();

    expect(element().textContent).toContain('API ok');
    expect(element().textContent).toContain('206 filmes');
  });

  it('reports the API as down when health fails, without showing a count', async () => {
    http.expectOne('/api/health').flush(null, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();

    expect(element().textContent).toContain('API fora');
    expect(element().textContent).not.toContain('filmes');
  });

  it('links to both sections', () => {
    http.expectOne('/api/health').flush({ status: 'ok', movies: 206 });
    const links = [...element().querySelectorAll('nav a')].map((link) => link.textContent?.trim());

    expect(links).toEqual(['Intervalos', 'Filmes']);
  });
});
