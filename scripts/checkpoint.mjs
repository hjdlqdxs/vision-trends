// Record real, incremental AI work without impersonating the student's identity.
import { execFileSync } from 'node:child_process';
const message = process.argv.slice(2).join(' ');
if (!message) throw new Error('A concrete commit message is required');
execFileSync(process.execPath, ['scripts/check.mjs'], { stdio: 'inherit' });
execFileSync('git', ['add', '-A'], { stdio: 'inherit' });
execFileSync('git', ['-c', 'user.name=Codex AI', '-c', 'user.email=codex-ai@local.invalid',
  'commit', '-m', message, '-m', 'AI-generated implementation. Student review is recorded separately; no human review is implied.'], { stdio: 'inherit' });
