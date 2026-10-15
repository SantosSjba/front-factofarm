import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SwitchComponent } from './switch.component';

describe('SwitchComponent', () => {
  it('expone su estado y bloquea cambios cuando está deshabilitado', async () => {
    await TestBed.configureTestingModule({ imports: [SwitchComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SwitchComponent);
    fixture.componentRef.setInput('label', 'Activo');
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!;
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    button.click();
    expect(fixture.componentInstance.isChecked).toBe(true);
    expect(button.disabled).toBe(true);
  });
});
