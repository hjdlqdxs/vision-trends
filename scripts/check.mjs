import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
let count = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'var'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(mjs|js)$/.test(path)) {
      execFileSync(process.execPath, ['--check', path], { stdio: 'inherit' });
      count++;
    }
  }
}
walk('.');
console.log(`Syntax checked ${count} JavaScript files.`);
