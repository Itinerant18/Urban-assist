import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const target = path.join(root, 'packages', 'db', 'src', 'types', 'generated.ts');
const temp = `${target}.tmp-${process.pid}`;

try {
  const { stdout } = await execFileAsync(
    'supabase',
    ['gen', 'types', 'typescript', '--local'],
    { cwd: root, maxBuffer: 20 * 1024 * 1024, encoding: 'utf8' },
  );
  if (!stdout.includes('export type Database')) {
    throw new Error('Supabase type generation returned no Database declaration');
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(temp, stdout, 'utf8');
  try {
    await rename(temp, target);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    await rm(target, { force: true });
    await rename(temp, target);
  }
  console.log(`Generated ${path.relative(root, target)}`);
} catch (error) {
  await rm(temp, { force: true });
  console.error(error?.stderr || error?.message || error);
  process.exitCode = 1;
}
