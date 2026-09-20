import { TestBed } from '@angular/core/testing';
import { BodyScrollLockService } from './body-scroll-lock.service';
import { SidebarService } from './sidebar.service';

describe('BodyScrollLockService', () => {
  afterEach(() => {
    document.body.style.overflow = '';
    TestBed.resetTestingModule();
  });

  it('mantiene el bloqueo del modal al cerrar el sidebar y restaura el estilo original', () => {
    document.body.style.overflow = 'auto';
    const lock = TestBed.inject(BodyScrollLockService);
    const sidebar = TestBed.inject(SidebarService);
    const modal = {};
    sidebar.setMobileOpen(true);
    lock.setLocked(modal, true);
    sidebar.setMobileOpen(false);
    expect(document.body.style.overflow).toBe('hidden');
    lock.setLocked(modal, false);
    expect(document.body.style.overflow).toBe('auto');
  });

  it('tolera aperturas repetidas y cierres de componentes que no adquirieron el bloqueo', () => {
    const lock = TestBed.inject(BodyScrollLockService);
    const modal = {};
    lock.setLocked(modal, true);
    lock.setLocked(modal, true);
    lock.setLocked({}, false);
    expect(document.body.style.overflow).toBe('hidden');
    lock.setLocked(modal, false);
    expect(document.body.style.overflow).toBe('');
  });
});
