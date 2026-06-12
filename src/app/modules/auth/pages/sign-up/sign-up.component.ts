import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthPageLayoutComponent } from '../../../../shared/layout/auth-page-layout/auth-page-layout.component';

/** Registro público deshabilitado: solo invitación por administrador. */
@Component({
  selector: 'app-sign-up',
  imports: [AuthPageLayoutComponent, RouterModule],
  templateUrl: './sign-up.component.html',
})
export class SignUpComponent {}
