import fs from 'node:fs/promises';
import { renderHtml } from '../src/render.js';
const fixture = JSON.parse(await fs.readFile(new URL('../fixtures/newsletter.json', import.meta.url), 'utf8'));
const destination = new URL('../output/', import.meta.url);
await fs.mkdir(destination, { recursive: true });
await fs.writeFile(new URL('newsletter.html', destination), renderHtml(fixture, {}, { date: '2026-10-06' }));
console.log('Local sample written to output/newsletter.html. No models, sending, or publishing were called.');
