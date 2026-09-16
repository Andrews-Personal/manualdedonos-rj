#!/usr/bin/env node
/* eslint-disable no-console -- a saída no terminal é o produto deste script. */
import process from 'node:process';
/**
 * Promove uma conta a SuperAdmin.
 *
 * Existe para resolver o problema do primeiro acesso: só um admin pode liberar
 * cadastros, e no projeto recém-criado não existe nenhum. Este script quebra
 * esse ciclo uma vez; daí em diante a liberação é feita pela tela de
 * Administração.
 *
 * Uso (produção):
 *   export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
 *   node scripts/bootstrap-admin.mjs voce@empresa.com.br
 *
 * Uso (emulador — não precisa de credencial):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   GCLOUD_PROJECT=manualdedonos-rj \
 *   node scripts/bootstrap-admin.mjs voce@empresa.com.br
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const email = process.argv[2];

if (!email) {
  console.error('Uso: node scripts/bootstrap-admin.mjs <email-da-conta>');
  process.exit(1);
}

initializeApp();

const auth = getAuth();
const db = getFirestore();

try {
  const user = await auth.getUserByEmail(email);
  const ref = db.collection('members').doc(user.uid);
  const existing = await ref.get();

  // `merge: true`: se a pessoa já se cadastrou pelo app, o perfil preenchido
  // não pode ser sobrescrito — só os dois campos de privilégio mudam.
  await ref.set({
    uid: user.uid,
    email: user.email ?? email,
    displayName: existing.data()?.displayName ?? user.displayName ?? email,
    role: 99,
    approved: true,
    updatedAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  }, { merge: true });

  console.log(`✅ ${email} agora é SuperAdmin (uid: ${user.uid}).`);
}
catch (error) {
  if (error?.code === 'auth/user-not-found')
    console.error(`❌ Nenhuma conta com o e-mail ${email}. Cadastre-se pelo app primeiro.`);
  else
    console.error('❌ Falhou:', error);

  process.exit(1);
}
