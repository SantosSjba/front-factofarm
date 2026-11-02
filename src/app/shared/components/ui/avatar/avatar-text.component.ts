import { AsyncPipe } from '@angular/common';
import { Component, computed, effect, input, signal } from '@angular/core';
import { AuthFilePipe } from '../../../pipes/auth-file.pipe';

const PALETTE = [
  'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
  'bg-blue-light-100 text-blue-light-700 dark:bg-blue-light-500/20 dark:text-blue-light-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
];

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-20 text-2xl',
} as const;

/**
 * Iniciales de una persona. Con 4+ palabras (2 nombres + 2 apellidos, costumbre peruana)
 * toma primer nombre + apellido paterno: "Santos Jesús Bernui Acevedo" → "SB".
 * Con 2–3 palabras, las dos primeras: "Leidy Bernui Baltazar" → "LB". Una sola: dos letras.
 */
export function nameInitials(name: string | null | undefined): string {
  const words = (name ?? '')
    .replace(/\(.*?\)/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const second = words.length >= 4 ? words[2] : words[1];
  return (words[0][0] + second[0]).toUpperCase();
}

/** Color estable por persona: el mismo nombre siempre da el mismo tono. */
export function avatarColorClass(seed: string | null | undefined): string {
  const value = seed ?? '';
  let hash = 0;
  for (const ch of value) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/**
 * Avatar de usuario: foto de perfil si existe y carga; si no, sus iniciales sobre un color estable.
 * `photoUrl` acepta `/api/v1/files/:id` (se descarga con el token) o URLs normales.
 */
@Component({
  selector: 'app-avatar-text',
  standalone: true,
  imports: [AsyncPipe, AuthFilePipe],
  template: `
    <span
      class="inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold"
      [class]="sizeClass() + ' ' + (showPhoto() ? 'bg-gray-100 dark:bg-white/10' : colorClass()) + ' ' + className()"
      [attr.title]="name() || null"
      [attr.aria-label]="ariaLabel()"
      role="img"
    >
      @if (photoUrl() && !failed()) {
        @if (photoUrl() | authFile | async; as src) {
          <img [src]="src" alt="" class="h-full w-full object-cover" (error)="failed.set(true)" />
        } @else {
          <span aria-hidden="true">{{ initials() }}</span>
        }
      } @else {
        <span aria-hidden="true">{{ initials() }}</span>
      }
    </span>
  `,
  host: { class: 'inline-flex' },
})
export class AvatarTextComponent {
  readonly name = input<string | null | undefined>('');
  readonly photoUrl = input<string | null | undefined>(null);
  readonly size = input<keyof typeof SIZES>('md');
  readonly className = input('');

  protected readonly failed = signal(false);
  protected readonly initials = computed(() => nameInitials(this.name()));
  protected readonly colorClass = computed(() => avatarColorClass(this.name()));
  protected readonly sizeClass = computed(() => SIZES[this.size()]);
  protected readonly showPhoto = computed(() => !!this.photoUrl() && !this.failed());
  protected readonly ariaLabel = computed(() => (this.name() ? `Avatar de ${this.name()}` : 'Avatar'));

  constructor() {
    // Una foto nueva vuelve a intentarse aunque la anterior haya fallado.
    effect(() => {
      this.photoUrl();
      this.failed.set(false);
    });
  }
}
