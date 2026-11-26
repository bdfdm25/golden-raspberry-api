import { TestBed } from '@angular/core/testing';
import type { ProducerAwardInterval } from '../core/movie';
import { IntervalCard } from './interval-card';

function render(entries: ProducerAwardInterval[]): HTMLElement {
  const fixture = TestBed.createComponent(IntervalCard);
  fixture.componentRef.setInput('label', 'Menor intervalo');
  fixture.componentRef.setInput('entries', entries);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const joelSilver: ProducerAwardInterval = {
  producer: 'Joel Silver',
  interval: 1,
  previousWin: 1990,
  followingWin: 1991,
};

describe('IntervalCard', () => {
  it('shows the interval, the producer and both years', () => {
    const element = render([joelSilver]);

    expect(element.textContent).toContain('Joel Silver');
    expect(element.textContent).toContain('1990');
    expect(element.textContent).toContain('1991');
    expect(element.textContent).toContain('ano');
  });

  it('pluralises the unit for intervals longer than a year', () => {
    const element = render([{ ...joelSilver, interval: 13 }]);

    expect(element.textContent).toContain('anos');
  });

  it('lists every tied producer and counts them', () => {
    const element = render([
      joelSilver,
      { producer: 'Allan Carr', interval: 1, previousWin: 1980, followingWin: 1981 },
    ]);

    expect(element.querySelectorAll('li')).toHaveLength(2);
    expect(element.textContent).toContain('2 empatados');
  });

  it('does not announce a tie for a single producer', () => {
    expect(render([joelSilver]).textContent).not.toContain('empatados');
  });

  it('explains an empty result instead of rendering an empty card', () => {
    const element = render([]);

    expect(element.textContent).toContain('Nenhum produtor premiado mais de uma vez');
    expect(element.querySelectorAll('li')).toHaveLength(0);
  });
});
