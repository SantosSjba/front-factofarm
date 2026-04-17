import { Component } from '@angular/core';
import { AuthPageLayoutComponent } from '../../../../shared/layout/auth-page-layout/auth-page-layout.component';
import { SigninFormComponent } from '../../../../shared/components/auth/signin-form/signin-form.component';

/** Pantalla de login del feature `auth`; compone el layout del template + formulario. */
@Component({
  selector: 'app-sign-in',
  imports: [AuthPageLayoutComponent, SigninFormComponent],
  templateUrl: './sign-in.component.html',
})
export class SignInComponent {}
