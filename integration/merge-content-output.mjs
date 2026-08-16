/**
 * Additive-only merger for the existing andjam.es build workflow.
 * Usage: node integration/merge-content-output.mjs <content-dist> <existing-site-dist>
 *
 * A new source file may not overwrite a file unless the previous deployment
 * manifest proves that source already owned it. Nothing is deleted.
 */
import { readFile, mkdir, copyFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';

const [contentDist, siteDist] = process.argv.slice(2);
if (!contentDist || !siteDist) throw new Error('Usage: node integration/merge-content-output.mjs <content-dist> <existing-site-dist>');

const manifestPath = 'content/deployment-manifest.json';
const exists = async path => access(path).then(() => true).catch(() => false);
const readManifest = async path => JSON.parse(await readFile(path, 'utf8'));
const next = await readManifest(join(contentDist, manifestPath));
const previousPath = join(siteDist, manifestPath);
const previous = await exists(previousPath) ? await readManifest(previousPath) : { files: [] };
const owned = new Set(previous.files.map(file => file.path));

// Preflight every destination first: no partial copy occurs on a collision.
for (const file of next.files) {
  const destination = join(siteDist, file.path);
  if (await exists(destination) && !owned.has(file.path)) {
    throw new Error(`Refusing to overwrite unmanaged existing-site file: ${file.path}`);
  }
}

for (const file of next.files) {
  const source = join(contentDist, file.path);
  const destination = join(siteDist, file.path);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}
await mkdir(dirname(previousPath), { recursive: true });
await copyFile(join(contentDist, manifestPath), previousPath);
console.log(`Merged ${next.files.length} content-owned files. No files were deleted.`);
