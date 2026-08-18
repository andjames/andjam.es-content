/** Creates a disposable, upload-ready directory containing only manifest-owned files. */
import { cp, mkdir, readFile, rm, access, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const project = resolve('.');
const dist = join(project, 'dist');
const deploy = join(project, 'deploy');
const manifestPath = 'content/deployment-manifest.json';
const allowedRoots = new Set(['writing', 'projects', 'experiments', 'notebook', 'content', '_astro', 'images', 'audio', 'data', 'static']);
const forbidden = new Set(['index.html', 'llms.txt']);
const manifest = JSON.parse(await readFile(join(dist, manifestPath), 'utf8'));
const previousSitemap = join(deploy, 'sitemap.xml');
const hasPreviousSitemap = await access(previousSitemap).then(() => true).catch(() => false);
const sitemapContents = hasPreviousSitemap ? await readFile(previousSitemap) : undefined;

if (basename(deploy) !== 'deploy') throw new Error('Refusing to clear an unexpected destination.');
for (const file of manifest.files) {
  const root = file.path.split('/')[0];
  if (file.path.includes('..') || forbidden.has(file.path) || !allowedRoots.has(root)) {
    throw new Error(`Manifest contains a forbidden deployment path: ${file.path}`);
  }
}

// deploy/ is generated, gitignored, and intentionally rebuilt from scratch.
await rm(deploy, { recursive: true, force: true });
for (const file of manifest.files) {
  const source = join(dist, file.path);
  const destination = join(deploy, file.path);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { force: true });
}
await mkdir(join(deploy, 'content'), { recursive: true });
await cp(join(dist, manifestPath), join(deploy, manifestPath), { force: true });
if (sitemapContents) await writeFile(join(deploy, 'sitemap.xml'), sitemapContents);
console.log(`Prepared ${deploy} with ${manifest.files.length} allowlisted files for upload.`);
