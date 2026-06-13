export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string;
  robots?: string;
  ogType?: string;
  canonicalPath?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}
