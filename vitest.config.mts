import { defineConfig } from 'vitest/config';

// ponytail: one root config for the whole workspace. No per-package configs, no
// coverage thresholds, no setup files — those arrive when something needs them.
// Scope is deliberately narrow: pure domain logic with real branches (pricing,
// matching scores, status transitions). Anything needing a live Supabase client is
// not covered here.
export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/lib/*.test.ts'],
    environment: 'node',
  },
});
