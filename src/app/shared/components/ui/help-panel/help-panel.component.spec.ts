import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { HelpPanelComponent } from './help-panel.component';

function render() {
  const fixture = TestBed.createComponent(HelpPanelComponent);
  fixture.componentRef.setInput('title', '¿Para qué sirve?');
  fixture.componentRef.setInput('storageKey', 'prueba');
  fixture.detectChanges();
  return fixture;
}

describe('HelpPanelComponent', () => {
  beforeEach(() => localStorage.clear());

  it('empieza cerrada, se abre y recuerda la elección', () => {
    const first = render();
    const root = first.nativeElement as HTMLElement;
    expect(root.querySelector('app-alert')).toBeNull();
    root.querySelector('button')!.click();
    first.detectChanges();
    expect(root.querySelector('app-alert')).not.toBeNull();

    const again = render();
    expect((again.nativeElement as HTMLElement).querySelector('app-alert')).not.toBeNull();
  });
});
