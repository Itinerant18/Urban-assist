// Fan out the canonical service images (apps/customer/public/images/services)
// to the provider and admin apps, so files are dropped in ONE place.
// Usage: pnpm sync:images
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const src = path.join('apps', 'customer', 'public', 'images', 'services');
const targets = ['provider', 'admin'].map((app) =>
  path.join('apps', app, 'public', 'images', 'services'),
);

const files = readdirSync(src);
for (const target of targets) {
  mkdirSync(target, { recursive: true });
  cpSync(src, target, { recursive: true });
  console.log(`synced ${files.length} file(s) -> ${target}`);
}
