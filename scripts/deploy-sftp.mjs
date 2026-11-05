/**
 * Uploads the allowlisted deploy/ artifact through SFTP without deleting
 * anything on the remote host. Configuration comes from .env.deploy or the
 * environment; credentials are intentionally never stored in this repository.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

const project = resolve('.');
const deploy = join(project, 'deploy');
const envFile = join(project, '.env.deploy');
const manifestPath = join(deploy, 'content/deployment-manifest.json');

async function readDeployEnv() {
  const file = await readFile(envFile, 'utf8').catch(error => error.code === 'ENOENT' ? '' : Promise.reject(error));
  const values = {};
  for (const line of file.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || match[2].startsWith('#')) continue;
    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return { ...values, ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined)) };
}

function requireValue(env, key) {
  const value = env[key];
  if (!value) throw new Error(`Missing ${key}. Copy .env.deploy.example to .env.deploy and set it.`);
  if (/[\r\n]/.test(value)) throw new Error(`${key} cannot contain a newline.`);
  return value;
}

function remotePath(value) {
  if (!value.startsWith('/') || value.includes('..') || !/^[-_./A-Za-z0-9]+$/.test(value)) {
    throw new Error('DEPLOY_PATH must be an absolute path using only letters, numbers, ., _, -, and /.');
  }
  return value.replace(/\/+$/, '') || '/';
}

const env = await readDeployEnv();
const host = requireValue(env, 'DEPLOY_HOST');
const user = requireValue(env, 'DEPLOY_USER');
const destination = remotePath(requireValue(env, 'DEPLOY_PATH'));
const port = env.DEPLOY_PORT || '22';
if (!/^[0-9]+$/.test(port)) throw new Error('DEPLOY_PORT must be a number.');
if (!/^[A-Za-z0-9.-]+$/.test(host) || !/^[A-Za-z0-9._-]+$/.test(user)) throw new Error('DEPLOY_HOST or DEPLOY_USER contains unsupported characters.');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const files = [...new Set([...manifest.files.map(entry => entry.path), 'content/deployment-manifest.json'])];
if (!files.length) throw new Error('The deployment manifest contains no files. Run npm run deploy:prepare first.');

const directories = [...new Set(files.map(file => dirname(file)).filter(directory => directory !== '.'))]
  .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
const batchLines = [`cd ${destination}`];
for (const directory of directories) batchLines.push(`-mkdir ${directory}`);
for (const file of files) batchLines.push(`put ${relative(project, join(deploy, file))} ${file}`);

const temporaryDirectory = await mkdtemp(join(tmpdir(), 'andjames-sftp-'));
const batchFile = join(temporaryDirectory, 'upload.batch');
await writeFile(batchFile, `${batchLines.join('\n')}\n`);

const args = ['-P', port, '-b', batchFile];
if (env.DEPLOY_SSH_KEY) args.push('-i', env.DEPLOY_SSH_KEY);
args.push(`${user}@${host}`);

console.log(`Uploading ${files.length} approved files to ${user}@${host}:${destination}`);
try {
  await new Promise((resolvePromise, reject) => {
    const child = spawn('sftp', args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolvePromise() : reject(new Error(`sftp exited with status ${code}.`)));
  });
  console.log('Deployment complete. No remote files were deleted.');
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
