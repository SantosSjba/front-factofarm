import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicLegalLayoutComponent } from '../../shared/layout/public-legal-layout/public-legal-layout.component';

@Component({
  selector: 'app-privacy-policy-page',
  standalone: true,
  imports: [PublicLegalLayoutComponent, RouterLink],
  templateUrl: './privacy-policy-page.component.html',
})
export class PrivacyPolicyPageComponent {}
