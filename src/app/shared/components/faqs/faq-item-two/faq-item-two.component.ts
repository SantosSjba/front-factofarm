import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-faq-item-two',
  imports: [CommonModule],
  templateUrl: './faq-item-two.component.html',
})
export class FaqItemTwoComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) content!: string;
  @Input() isOpen = false;
  @Output() toggle = new EventEmitter<void>();

  onToggle() {
    this.toggle.emit();
  }
}
