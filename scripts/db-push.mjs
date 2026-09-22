// Applies supabase/migrations to the database in SUPABASE_DB_URL (read from .env.local).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('Set SUPABASE_DB_URL in .env.local (Supabase: Connect -> Session pooler).');
  process.exit(1);
}
const args = ['supabase', 'db', 'push', '--db-url', url, ...process.argv.slice(2)];
const res = spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(res.status ?? 1);
