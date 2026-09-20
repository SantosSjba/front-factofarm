import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';
import { SeoService } from './core/seo/seo.service';
import { TableCardsService } from './shared/components/ui/table/table-cards.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSonnerToaster],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly tableCards = inject(TableCardsService);

  ngOnInit(): void {
    this.seo.init();
    this.tableCards.start();
  }
}
