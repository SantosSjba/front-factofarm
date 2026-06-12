import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
} from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  private permissionCode = '';

  @Input()
  set appHasPermission(code: string) {
    this.permissionCode = code;
    this.render();
  }

  constructor() {
    effect(() => {
      this.auth.user();
      this.render();
    });
  }

  private render(): void {
    this.viewContainer.clear();
    if (!this.permissionCode || this.auth.hasPermission(this.permissionCode)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
