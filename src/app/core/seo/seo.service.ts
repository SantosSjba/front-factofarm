import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import { resolveSeoConfig } from './seo.config';
import type { SeoConfig } from './seo.types';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly doc = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly router = inject(Router);

  private jsonLdEl: HTMLScriptElement | null = null;
  private canonicalEl: HTMLLinkElement | null = null;

  init(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.applyForCurrentRoute());
    this.applyForCurrentRoute();
  }

  apply(config: SeoConfig, path = this.router.url): void {
    const siteUrl = environment.siteUrl.replace(/\/$/, '');
    const canonicalPath = config.canonicalPath ?? (path.split('?')[0].split('#')[0] || '/');
    const canonicalUrl = `${siteUrl}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
    const pageTitle = config.title.includes('FactoFarm') ? config.title : `${config.title} | FactoFarm`;

    this.title.setTitle(pageTitle);
    this.setMetaTag('name', 'description', config.description);
    this.setMetaTag('name', 'robots', config.robots ?? 'noindex, nofollow');
    this.setMetaTag('name', 'author', 'FactoFarm');
    this.setMetaTag('name', 'language', 'es-PE');
    this.setMetaTag('name', 'geo.region', 'PE');
    this.setMetaTag('name', 'geo.placename', 'Perú');

    if (config.keywords) {
      this.setMetaTag('name', 'keywords', config.keywords);
    } else {
      this.meta.removeTag('name="keywords"');
    }

    this.setMetaTag('property', 'og:site_name', 'FactoFarm');
    this.setMetaTag('property', 'og:title', pageTitle);
    this.setMetaTag('property', 'og:description', config.description);
    this.setMetaTag('property', 'og:type', config.ogType ?? 'website');
    this.setMetaTag('property', 'og:url', canonicalUrl);
    this.setMetaTag('property', 'og:locale', 'es_PE');
    this.setMetaTag('property', 'og:image', `${siteUrl}/images/logo/logo-icon.svg`);

    this.setMetaTag('name', 'twitter:card', 'summary_large_image');
    this.setMetaTag('name', 'twitter:title', pageTitle);
    this.setMetaTag('name', 'twitter:description', config.description);
    this.setMetaTag('name', 'twitter:image', `${siteUrl}/images/logo/logo-icon.svg`);

    this.setCanonical(canonicalUrl);
    this.setJsonLd(config.jsonLd ?? null);
  }

  private applyForCurrentRoute(): void {
    const path = this.router.url.split('?')[0].split('#')[0] || '/';
    this.apply(resolveSeoConfig(path), path);
  }

  private setMetaTag(attr: 'name' | 'property', key: string, content: string): void {
    const selector = `${attr}="${key}"`;
    if (this.meta.getTag(selector)) {
      this.meta.updateTag({ [attr]: key, content });
    } else {
      this.meta.addTag({ [attr]: key, content });
    }
  }

  private setCanonical(href: string): void {
    if (!this.canonicalEl) {
      this.canonicalEl = this.doc.createElement('link');
      this.canonicalEl.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(this.canonicalEl);
    }
    this.canonicalEl.setAttribute('href', href);
  }

  private setJsonLd(data: Record<string, unknown> | Record<string, unknown>[] | null): void {
    if (this.jsonLdEl) {
      this.jsonLdEl.remove();
      this.jsonLdEl = null;
    }
    if (!data) return;

    this.jsonLdEl = this.doc.createElement('script');
    this.jsonLdEl.type = 'application/ld+json';
    this.jsonLdEl.text = JSON.stringify(data);
    this.doc.head.appendChild(this.jsonLdEl);
  }
}
