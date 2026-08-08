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

    // 5s (the default) is too tight for the *.db.test.ts suites: they share one local Postgres
    // and run alongside each other, so a query taking 200ms in isolation can take seconds under
    // load. Headroom only — the flakes that prompted this turned out to be nondeterministic
    // fixture selection (unordered limit(1)) and shared-row contention on
    // profiles.acceptance_rate, both fixed at the source in the suites themselves.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
