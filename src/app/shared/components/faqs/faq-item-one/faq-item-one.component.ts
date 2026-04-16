import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-faq-item-one',
  imports: [CommonModule],
  templateUrl: './faq-item-one.component.html',
})
export class FaqItemOneComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) content!: string;
  @Input() isOpen = false;
  @Input() toggleAccordion: () => void = () => {};
}
