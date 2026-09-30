#!/usr/bin/env node
// Inicia a stack completa de desenvolvimento do LOOP AMBIENTAL.
//
// Uso:
//   pnpm start           # infraestrutura + migrações + API/Web/Worker (hot reload)
//   pnpm start infra     # apenas MySQL, Redis, MinIO e Mailpit
//   pnpm start db        # apenas migrações do banco
//   pnpm start stop      # para os containers (mantém volumes)
//   pnpm start down      # remove os containers (mantém volumes)
//
// Funciona com Docker Compose ou Podman Compose, em Windows, Linux e macOS.

import { spawnSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
process.chdir(rootDir);

const command = (process.argv[2] ?? 'start').toLowerCase();

const paint = (code, text) => `\u001b[${code}m${text}\u001b[0m`;
const log = (message) => console.log(paint(32, `==> ${message}`));
const warn = (message) => console.warn(paint(33, `==> ${message}`));
const fail = (message) => {
  console.error(paint(31, `==> erro: ${message}`));
  process.exit(1);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function run(exe, args, options = {}) {
  const result = spawnSync(exe, args, {
    stdio: 'inherit',
    cwd: rootDir,
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function capture(exe, args) {
  const result = spawnSync(exe, args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? '' };
}

function hasCommand(exe) {
  return capture(exe, ['--version']).status === 0;
}

function resolveCompose() {
  if (process.env.COMPOSE) {
    return process.env.COMPOSE.split(' ');
  }
  if (
    hasCommand('docker') &&
    capture('docker', ['compose', 'version']).status === 0
  ) {
    return ['docker', 'compose'];
  }
  if (
    hasCommand('podman') &&
    capture('podman', ['compose', 'version']).status === 0
  ) {
    if (process.platform === 'darwin' || process.platform === 'win32') {
      warn('Garantindo que a máquina Podman esteja iniciada...');
      run('podman', ['machine', 'start']);
    }
    return ['podman', 'compose'];
  }
  fail(
    'Docker Compose ou Podman Compose não encontrado. Instale um deles e tente de novo.',
  );
}

function ensureEnvFiles() {
  if (!existsSync(join(rootDir, '.env'))) {
    log('Criando .env a partir de .env.example');
    copyFileSync(join(rootDir, '.env.example'), join(rootDir, '.env'));
  }
  if (!existsSync(join(rootDir, 'apps', 'web', '.env.local'))) {
    log('Criando apps/web/.env.local a partir do exemplo');
    copyFileSync(
      join(rootDir, 'apps', 'web', '.env.example'),
      join(rootDir, 'apps', 'web', '.env.local'),
    );
  }
}

function pnpm(args) {
  const status = run('corepack', ['pnpm', ...args]);
  if (status !== 0)
    fail(`"corepack pnpm ${args.join(' ')}" falhou com código ${status}.`);
}

function ensureDependencies() {
  if (!existsSync(join(rootDir, 'node_modules'))) {
    log('Instalando dependências (pnpm install)...');
    pnpm(['install']);
  }
}

async function waitForMysql(compose) {
  log('Aguardando o MySQL ficar saudável...');
  const [exe, ...prefix] = compose;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const { stdout } = capture(exe, [
      ...prefix,
      'ps',
      '--format',
      '{{.Health}}',
      'mysql',
    ]);
    if (stdout.trim() === 'healthy') {
      log('MySQL pronto.');
      return;
    }
    await sleep(2000);
  }
  fail(
    'O MySQL não ficou saudável a tempo. Verifique: docker compose logs mysql',
  );
}

function migrate() {
  log('Gerando o client do Prisma...');
  pnpm(['--filter', '@loopambiental/database', 'generate']);
  log('Aplicando migrações do banco...');
  pnpm(['--filter', '@loopambiental/database', 'db:deploy']);
}

function startInfra(compose) {
  log(
    `Subindo infraestrutura (${compose.join(' ')}: mysql redis minio mailpit)`,
  );
  const [exe, ...prefix] = compose;
  const status = run(exe, [
    ...prefix,
    'up',
    '-d',
    'mysql',
    'redis',
    'minio',
    'mailpit',
  ]);
  if (status !== 0) fail('Não foi possível subir a infraestrutura.');
}

async function start() {
  ensureEnvFiles();
  ensureDependencies();
  const compose = resolveCompose();
  startInfra(compose);
  await waitForMysql(compose);
  migrate();
  log('Iniciando API, Web e Worker com hot reload (Ctrl+C para parar)...');
  const child = spawn('corepack', ['pnpm', 'dev'], {
    stdio: 'inherit',
    cwd: rootDir,
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

async function infra() {
  ensureEnvFiles();
  const compose = resolveCompose();
  startInfra(compose);
  await waitForMysql(compose);
  log(
    'Infraestrutura pronta. Endereços: Mailpit http://localhost:8025 | MinIO http://localhost:9001',
  );
}

async function database() {
  ensureEnvFiles();
  const compose = resolveCompose();
  await waitForMysql(compose);
  migrate();
}

function containers(action) {
  const compose = resolveCompose();
  const [exe, ...prefix] = compose;
  const status = run(exe, [...prefix, action]);
  if (status !== 0) fail(`"${compose.join(' ')} ${action}" falhou.`);
}

switch (command) {
  case 'start':
  case 'dev':
    await start();
    break;
  case 'infra':
    await infra();
    break;
  case 'db':
  case 'migrate':
    await database();
    break;
  case 'stop':
    containers('stop');
    break;
  case 'down':
    containers('down');
    break;
  default:
    fail(
      `Comando desconhecido "${command}". Use: start | infra | db | stop | down.`,
    );
}
