import { readFileSync } from 'node:fs';
import { openDatabase } from '../src/database.mjs';
const db = openDatabase(process.env.DB_PATH || 'var/papers.sqlite');
const papers = JSON.parse(readFileSync(new URL('../data/papers.json', import.meta.url), 'utf8'));
let added = 0;
for (const paper of papers) if (db.save(paper).created) added++;
console.log(`Added ${added} papers. Total: ${db.list().length}. Existing records retained.`);
db.close();
