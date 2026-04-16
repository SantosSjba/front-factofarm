import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-sidebar-history',
  imports: [CommonModule],
  templateUrl: './ai-sidebar-history.component.html',
})
export class AiSidebarHistoryComponent {
  @Input() isSidebarOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  onClose() {
    this.closeSidebar.emit();
  }
}
