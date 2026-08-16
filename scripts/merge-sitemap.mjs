/**
 * Merges published content URLs into an explicitly supplied current site sitemap.
 * Usage: npm run deploy:with-sitemap -- /path/to/downloaded/sitemap.xml
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Provide the current live sitemap: npm run deploy:with-sitemap -- /path/to/sitemap.xml');
const sourceXml = await readFile(resolve(source), 'utf8');
if (!/<urlset\b/.test(sourceXml)) throw new Error('The supplied file does not appear to be a sitemap urlset.');

const project = resolve('.');
const entries = JSON.parse(await readFile(join(project, 'dist/content/all.json'), 'utf8'));
const existingBlocks = sourceXml.match(/<url>\s*[\s\S]*?<\/url>/g) ?? [];
const existingUrls = new Set();
const retained = [];
for (const block of existingBlocks) {
  const loc = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1];
  if (!loc || existingUrls.has(loc)) continue;
  existingUrls.add(loc);
  retained.push(block.trim());
}

const today = new Date().toISOString().slice(0, 10);
const latestByType = new Map();
for (const entry of entries) {
  const prior = latestByType.get(entry.type);
  if (!prior || entry.date > prior) latestByType.set(entry.type, entry.date);
}
const sectionUrls = [
  { url: '/writing/', date: latestByType.get('writing') },
  { url: '/projects/', date: latestByType.get('project') },
  { url: '/experiments/', date: latestByType.get('experiment') },
  { url: '/notebook/', date: entries[0]?.date },
];
const additions = [...sectionUrls, ...entries.map(entry => ({ url: entry.url, date: entry.date }))];
let added = 0;
for (const item of additions) {
  const url = new URL(item.url, 'https://andjam.es').toString();
  if (existingUrls.has(url)) continue;
  retained.push(`<url>\n  <loc>${url}</loc>\n  <lastmod>${item.date ?? today}</lastmod>\n  <changefreq>monthly</changefreq>\n  <priority>${item.url.split('/').filter(Boolean).length === 1 ? '0.6' : '0.7'}</priority>\n</url>`);
  existingUrls.add(url);
  added += 1;
}

const declaration = sourceXml.match(/<\?xml[^>]*\?>/)?.[0] ?? '<?xml version="1.0" encoding="UTF-8"?>';
const open = sourceXml.match(/<urlset\b[^>]*>/)?.[0] ?? '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
await writeFile(join(project, 'deploy/sitemap.xml'), `${declaration}\n${open}\n${retained.join('\n')}\n</urlset>\n`);
console.log(`Prepared deploy/sitemap.xml: retained ${retained.length - added} existing URLs and added ${added} published content URLs.`);
