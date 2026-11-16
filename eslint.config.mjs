import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.angular/**', 'coverage/**', 'src/environments/env.overrides.ts'] },
  {
    files: ['src/**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...angular.configs.tsRecommended, prettier],
    languageOptions: { globals: { ...globals.browser } },
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // `_` / `_algo`: valor ignorado a propósito (convención habitual).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  { files: ['src/**/*.spec.ts'], languageOptions: { globals: { ...globals.vitest } } },
  {
    files: ['src/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    // `x != null` es el modismo para "ni null ni undefined"; el resto de comparaciones, estrictas.
    rules: { '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }] },
  },
);
