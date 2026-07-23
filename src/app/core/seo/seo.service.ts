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
    this.ensureFavicons();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.applyForCurrentRoute());
    this.applyForCurrentRoute();
  }

  /** Garantiza favicons FactoFarm (Safari pide /favicon.ico por defecto). */
  private ensureFavicons(): void {
    const icons: Array<{ rel: string; href: string; type?: string; sizes?: string }> = [
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'icon', href: '/images/logo/logo-icon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/images/logo/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { rel: 'icon', href: '/images/logo/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { rel: 'apple-touch-icon', href: '/images/logo/apple-touch-icon.png' },
    ];

    for (const icon of icons) {
      const selector = icon.type
        ? `link[rel="${icon.rel}"][type="${icon.type}"]`
        : icon.sizes === 'any'
          ? `link[rel="${icon.rel}"][href="${icon.href}"]`
          : `link[rel="${icon.rel}"][sizes="${icon.sizes ?? ''}"]`;
      let el = this.doc.head.querySelector(selector) as HTMLLinkElement | null;
      if (!el) {
        el = this.doc.createElement('link');
        el.setAttribute('rel', icon.rel);
        this.doc.head.appendChild(el);
      }
      el.setAttribute('href', icon.href);
      if (icon.type) el.setAttribute('type', icon.type);
      else el.removeAttribute('type');
      if (icon.sizes) el.setAttribute('sizes', icon.sizes);
      else el.removeAttribute('sizes');
    }
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
    this.setMetaTag('property', 'og:image', `${siteUrl}/images/logo/logo.png`);

    this.setMetaTag('name', 'twitter:card', 'summary_large_image');
    this.setMetaTag('name', 'twitter:title', pageTitle);
    this.setMetaTag('name', 'twitter:description', config.description);
    this.setMetaTag('name', 'twitter:image', `${siteUrl}/images/logo/logo.png`);

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

    // Safari lanza TypeError si el root de ld+json es un Array (busca @context en el array).
    // Usar @graph con un único @context evita r["@context"].toLowerCase sobre undefined.
    const payload = Array.isArray(data)
      ? {
          '@context': 'https://schema.org',
          '@graph': data.map((item) => {
            const { ['@context']: _ctx, ...rest } = item;
            return rest;
          }),
        }
      : data;

    this.jsonLdEl = this.doc.createElement('script');
    this.jsonLdEl.type = 'application/ld+json';
    this.jsonLdEl.text = JSON.stringify(payload);
    this.doc.head.appendChild(this.jsonLdEl);
  }
}
