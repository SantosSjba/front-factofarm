import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SafeHtmlPipe } from '../../../pipe/safe-html.pipe';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-alert',
  imports: [
    CommonModule,
    SafeHtmlPipe,
    RouterModule,
  ],
  templateUrl: './alert.component.html',
  styles: `
    :host {
      display: block;
    }
  `
})
export class AlertComponent {
  @Input() variant: 'default' | 'success' | 'warning' | 'error' | 'destructive' | 'info' = 'default';
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() showLink: boolean = false;
  @Input() linkHref: string = '#';
  @Input() linkText: string = 'Learn more';

  get variantClasses() {
    const classes = {
      default: {
        container: 'bg-white border-gray-200 text-gray-700 dark:border-gray-800 dark:bg-gray-dark dark:text-gray-300',
        icon: 'text-gray-500 dark:text-gray-400'
      },
      success: {
        container: 'bg-success-50 border-success-500 dark:bg-success-500/10 dark:border-success-500/30',
        icon: 'text-success-500 dark:text-success-400'
      },
      error: {
        container: 'bg-error-50 border-error-500 dark:bg-error-500/10 dark:border-error-500/30',
        icon: 'text-error-500 dark:text-error-400'
      },
      destructive: {
        container: 'bg-error-50 border-error-500 dark:bg-error-500/10 dark:border-error-500/30',
        icon: 'text-error-500 dark:text-error-400'
      },
      warning: {
        container: 'bg-warning-50 border-warning-500 dark:bg-warning-500/10 dark:border-warning-500/30',
        icon: 'text-warning-500 dark:text-warning-400'
      },
      info: {
        container: 'bg-blue-light-50 border-blue-light-500 dark:bg-blue-light-500/10 dark:border-blue-light-500/30',
        icon: 'text-blue-light-500 dark:text-blue-light-400'
      }
    };
    return classes[this.variant] || classes['default'];
  }

  get iconSvg(): string {
    const icons: Record<string, string> = {
      default: (
        `<svg
        class="size-5"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>`
      ),
      success: (
        `<svg
        class="size-5"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M16 9l-5.5 5.5L8 12" />
      </svg>`
      ),
      error: (
        `<svg
        class="size-5"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 16h.01M12 8v4M15.312 2a2 2 0 011.414.586l4.688 4.688A2 2 0 0122 8.688v6.624a2 2 0 01-.586 1.414l-4.688 4.688a2 2 0 01-1.414.586H8.688a2 2 0 01-1.414-.586l-4.688-4.688A2 2 0 012 15.312V8.688a2 2 0 01.586-1.414l4.688-4.688A2 2 0 018.688 2z" />
      </svg>`
      ),
      destructive: (
        `<svg
        class="size-5"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 16h.01M12 8v4M15.312 2a2 2 0 011.414.586l4.688 4.688A2 2 0 0122 8.688v6.624a2 2 0 01-.586 1.414l-4.688 4.688a2 2 0 01-1.414.586H8.688a2 2 0 01-1.414-.586l-4.688-4.688A2 2 0 012 15.312V8.688a2 2 0 01.586-1.414l4.688-4.688A2 2 0 018.688 2z" />
      </svg>`
      ),
      warning: (
        `<svg
        class="size-5"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21.73 18l-8-14a2 2 0 00-3.48 0l-8 14A2 2 0 004 21h16a2 2 0 001.73-3M12 9v4M12 17h.01" />
      </svg>`
      ),
      info: (
        `<svg
        class="size-5"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>`
      ),
    };
    return icons[this.variant] || icons['default'];
  }
}
