import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MultiSelectComponent } from './multi-select.component';

describe('MultiSelectComponent: interacción accesible', () => {
  it('abre con teclado y el botón de flecha cambia el estado una sola vez', async () => {
    await TestBed.configureTestingModule({ imports: [MultiSelectComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MultiSelectComponent);
    fixture.componentRef.setInput('label', 'Productos');
    fixture.componentRef.setInput('options', [{ value: 'a', text: 'Producto A' }]);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLElement>('[role="combobox"]')!;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.isOpen).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    root.querySelector<HTMLButtonElement>('button[aria-label="Abrir opciones"]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.isOpen).toBe(false);
  });
  it('permite seleccionar y quitar opciones con botones y respeta disabled', async () => {
    await TestBed.configureTestingModule({ imports: [MultiSelectComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MultiSelectComponent);
    fixture.componentRef.setInput('options', [{ value: 'a', text: 'Producto A' }]);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.toggleDropdown();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[role="listbox"] button')!.click();
    fixture.detectChanges();
    expect(component.selectedOptions).toEqual(['a']);
    root.querySelector<HTMLButtonElement>('button[aria-label="Quitar Producto A"]')!.click();
    expect(component.selectedOptions).toEqual([]);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const open = component.isOpen;
    component.toggleDropdown();
    expect(component.isOpen).toBe(open);
    root.querySelector<HTMLButtonElement>('[role="listbox"] button')!.click();
    component.handleSelect('a');
    expect(component.selectedOptions).toEqual([]);
  });
});
