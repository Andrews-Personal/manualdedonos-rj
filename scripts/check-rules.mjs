#!/usr/bin/env node
/* eslint-disable no-console -- o relatório no terminal é o produto deste script. */
/**
 * Verificação das regras de segurança do Firestore contra o emulador.
 *
 * Bate na API REST do emulador com um token de verdade do Auth emulado, então
 * exercita exatamente o caminho que o app percorre — e não uma simulação das
 * regras. Cada caso afirma "permite" ou "nega": uma regra que passa a liberar
 * demais falha aqui antes de chegar a produção.
 *
 * Pré-requisitos, nesta ordem:
 *   1. pnpm emulators:start   (em outro terminal)
 *   2. pnpm seed:dev-data     (cria os membros que os casos usam)
 *   3. pnpm test:rules
 */
import process from 'node:process';

const PROJECT = process.env.GCLOUD_PROJECT || 'demo-manualdedonos-rj';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;

async function signIn(email, password) {
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await r.json();
  if (!body.idToken)
    throw new Error(`signIn falhou: ${JSON.stringify(body)}`);
  return { idToken: body.idToken, uid: body.localId };
}

async function signUp(email, password) {
  const r = await fetch(`${AUTH}/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await r.json();
  if (!body.idToken)
    throw new Error(`signUp falhou: ${JSON.stringify(body)}`);
  return { idToken: body.idToken, uid: body.localId };
}

async function req(method, path, token, body) {
  const r = await fetch(`${FS}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return r.status;
}

const results = [];
function check(name, expected, actual) {
  const ok = expected === 'allow' ? actual < 400 : actual === 403;
  results.push({ name, expected, status: actual, ok });
}

// 1. membro aprovado
const membro = await signIn('carlos@friopremium.com.br', 'Donos@2026');
check('membro aprovado lê events', 'allow', await req('GET', '/events', membro.idToken));
check('membro aprovado lê members', 'allow', await req('GET', '/members', membro.idToken));
check('membro aprovado lê photos', 'allow', await req('GET', '/photos', membro.idToken));

// membro tentando virar admin em si mesmo
check(
  'membro NÃO consegue elevar o próprio role',
  'deny',
  await req('PATCH', `/members/${membro.uid}?updateMask.fieldPaths=role`, membro.idToken, {
    fields: { role: { integerValue: '99' } },
  }),
);

// membro tentando escrever no cache da IA de outra pessoa
check(
  'ninguém escreve em matches (só a Cloud Function)',
  'deny',
  await req('PATCH', `/matches/${membro.uid}?updateMask.fieldPaths=summary`, membro.idToken, {
    fields: { summary: { stringValue: 'injetado' } },
  }),
);

// membro tentando criar evento (só admin)
check(
  'membro NÃO cria evento',
  'deny',
  await req('POST', '/events', membro.idToken, {
    fields: { title: { stringValue: 'Evento pirata' }, startsAt: { stringValue: '2026-01-01T19:00:00-03:00' } },
  }),
);

// 2. anônimo
check('anônimo NÃO lê events', 'deny', await req('GET', '/events', null));
check('anônimo NÃO lê members', 'deny', await req('GET', '/members', null));

// 3. recém-cadastrado, sem perfil ainda
const novo = await signUp(`novo-${Date.now()}@teste.com`, 'Teste@12345');
check(
  'novo usuário cria o próprio perfil como visitante',
  'allow',
  await req('POST', `/members?documentId=${novo.uid}`, novo.idToken, {
    fields: {
      uid: { stringValue: novo.uid },
      email: { stringValue: 'novo@teste.com' },
      role: { integerValue: '0' },
      approved: { booleanValue: false },
    },
  }),
);

const novo2 = await signUp(`novo2-${Date.now()}@teste.com`, 'Teste@12345');
check(
  'novo usuário NÃO cria o próprio perfil já como admin',
  'deny',
  await req('POST', `/members?documentId=${novo2.uid}`, novo2.idToken, {
    fields: {
      uid: { stringValue: novo2.uid },
      email: { stringValue: 'novo2@teste.com' },
      role: { integerValue: '99' },
      approved: { booleanValue: true },
    },
  }),
);

// 4. cadastrado mas não aprovado não vê nada do grupo
check('cadastro pendente NÃO lê events', 'deny', await req('GET', '/events', novo.idToken));
check('cadastro pendente NÃO lê a vitrine', 'deny', await req('GET', '/services', novo.idToken));

// 5. admin
const admin = await signIn('admin@manualdedonos.com.br', 'Donos@2026');
check(
  'admin cria evento',
  'allow',
  await req('POST', '/events', admin.idToken, {
    fields: { title: { stringValue: 'Evento de teste' }, startsAt: { stringValue: '2026-01-01T19:00:00-03:00' } },
  }),
);
check(
  'admin aprova um cadastro pendente',
  'allow',
  await req('PATCH', `/members/${novo.uid}?updateMask.fieldPaths=approved&updateMask.fieldPaths=role`, admin.idToken, {
    fields: { approved: { booleanValue: true }, role: { integerValue: '1' } },
  }),
);

let failed = 0;
for (const r of results) {
  if (!r.ok)
    failed++;
  console.log(`${r.ok ? '✅' : '❌'} ${r.name}  (esperado: ${r.expected}, HTTP ${r.status})`);
}
console.log(`\n${results.length - failed}/${results.length} verificações passaram.`);
process.exit(failed > 0 ? 1 : 0);
