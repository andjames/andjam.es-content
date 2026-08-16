import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const manifestPath = 'content/deployment-manifest.json';
const allowedRoots = new Set(['writing', 'projects', 'experiments', 'notebook', 'content', '_astro', 'images', 'audio', 'data', 'static']);

async function files(directory) {
  const children = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(children.map(async child => {
    const path = join(directory, child.name);
    return child.isDirectory() ? files(path) : [path];
  }))).flat();
}

const output = await files(dist);
const entries = await Promise.all(output.map(async file => {
  const path = relative(dist, file);
  if (path === manifestPath || !allowedRoots.has(path.split('/')[0])) return undefined;
  const bytes = await readFile(file);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}));

const manifest = { version: 1, generatedAt: new Date().toISOString(), files: entries.filter(Boolean).sort((a, b) => a.path.localeCompare(b.path)) };
await writeFile(join(dist, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated deployment manifest for ${manifest.files.length} files.`);
