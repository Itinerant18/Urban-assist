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

    // 5s (the default) is too tight for the *.db.test.ts suites. They share one local
    // Postgres and run alongside each other, so a query that takes 200ms in isolation can
    // take seconds under load. training-filter.db.test.ts failed roughly half the time in the
    // full run with "Test timed out in 5000ms" while passing 14/14 on its own — a budget
    // problem, not a logic one, and one that got misdiagnosed twice before the timeout
    // message was actually read.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
