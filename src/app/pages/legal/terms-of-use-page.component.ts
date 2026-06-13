import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicLegalLayoutComponent } from '../../shared/layout/public-legal-layout/public-legal-layout.component';

@Component({
  selector: 'app-terms-of-use-page',
  standalone: true,
  imports: [PublicLegalLayoutComponent, RouterLink],
  templateUrl: './terms-of-use-page.component.html',
})
export class TermsOfUsePageComponent {}
