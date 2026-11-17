import { Component, ElementRef, PLATFORM_ID, afterNextRender, inject, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';
import { SeoService } from './core/seo/seo.service';
import { TableCardsService } from './shared/components/ui/table/table-cards.service';
import { TopLayerService } from './shared/services/top-layer.service';
import { AppVersionService } from './core/services/app-version.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSonnerToaster],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly tableCards = inject(TableCardsService);
  private readonly appVersion = inject(AppVersionService);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    // Los toasts siguen al <dialog> abierto: fuera de él quedarían tapados e inertes.
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const topLayer = inject(TopLayerService);
    afterNextRender(() => {
      const toaster = host.querySelector<HTMLElement>('ngx-sonner-toaster');
      if (toaster) topLayer.register(toaster);
    });
  }

  ngOnInit(): void {
    // Metadatos SEO también al prerenderizar (van en el HTML que leen buscadores y vistas previas).
    this.seo.init();
    // Lo demás escucha eventos del navegador: no aplica al prerenderizar en el build.
    if (!isPlatformBrowser(this.platformId)) return;
    this.tableCards.start();
    // Tras un deploy, el siguiente cambio de pantalla carga la versión nueva (sin errores de chunks).
    this.appVersion.start();
  }
}
