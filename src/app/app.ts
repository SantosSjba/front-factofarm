import { Component, ElementRef, afterNextRender, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';
import { SeoService } from './core/seo/seo.service';
import { TableCardsService } from './shared/components/ui/table/table-cards.service';
import { TopLayerService } from './shared/services/top-layer.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSonnerToaster],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly tableCards = inject(TableCardsService);

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
    this.seo.init();
    this.tableCards.start();
  }
}
