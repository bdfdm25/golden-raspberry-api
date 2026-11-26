import { TestBed } from '@angular/core/testing';
import { StatePanel } from './state-panel';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(StatePanel);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture;
}

describe('StatePanel', () => {
  it('renders the title and the description', () => {
    const fixture = render({ title: 'Nada aqui', description: 'Tente outro filtro' });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Nada aqui');
    expect(element.textContent).toContain('Tente outro filtro');
    expect(element.querySelector('button')).toBeNull();
  });

  it('marks the danger tone as an alert for assistive technology', () => {
    const fixture = render({ title: 'Falhou', description: 'motivo', tone: 'danger' });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('emits the action when the button is pressed', () => {
    const fixture = render({
      title: 'Falhou',
      description: 'motivo',
      actionLabel: 'Tentar de novo',
    });
    let emitted = 0;
    fixture.componentInstance.action.subscribe(() => (emitted += 1));

    fixture.nativeElement.querySelector('button').click();

    expect(emitted).toBe(1);
  });
});
