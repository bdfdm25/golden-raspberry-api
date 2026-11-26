import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { AwardIntervalSummary } from '../core/movie';
import { IntervalsPage } from './intervals-page';

const summary: AwardIntervalSummary = {
  min: [{ producer: 'Joel Silver', interval: 1, previousWin: 1990, followingWin: 1991 }],
  max: [{ producer: 'Matthew Vaughn', interval: 13, previousWin: 2002, followingWin: 2015 }],
};

describe('IntervalsPage', () => {
  let fixture: ComponentFixture<IntervalsPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(IntervalsPage);
    fixture.detectChanges();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function answerHealth(): void {
    http.expectOne('/api/health').flush({ status: 'ok', movies: 206 });
  }

  it('asks the API for the intervals and for the dataset size', () => {
    expect(http.expectOne('/api/producers/intervals').request.method).toBe('GET');
    answerHealth();
    http.verify();
  });

  it('renders both extremes once the API answers', async () => {
    http.expectOne('/api/producers/intervals').flush(summary);
    answerHealth();
    await fixture.whenStable();

    expect(element().textContent).toContain('Joel Silver');
    expect(element().textContent).toContain('Matthew Vaughn');
    expect(element().textContent).toContain('206');
    http.verify();
  });

  it('shows the message the API reported and retries on demand', async () => {
    http
      .expectOne('/api/producers/intervals')
      .flush({ error: { message: 'Internal server error' } }, { status: 500, statusText: 'Error' });
    answerHealth();
    await fixture.whenStable();

    expect(element().textContent).toContain('Internal server error');

    element().querySelector('button')?.click();
    fixture.detectChanges();
    http.expectOne('/api/producers/intervals').flush(summary);
    // The retry refreshes the health indicator too, so the badge recovers with the content.
    answerHealth();
    await fixture.whenStable();

    expect(element().textContent).toContain('Joel Silver');
    http.verify();
  });
});
