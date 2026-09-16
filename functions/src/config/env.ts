import process from 'node:process';

import { defineSecret } from 'firebase-functions/params';

/**
 * Chave da API do Gemini.
 *
 * Declarada como secret (Secret Manager), não como variável de ambiente
 * comum: o valor só é materializado dentro das funções que a listam em
 * `secrets: [...]`, e nunca aparece em `firebase functions:config:get`, no
 * painel do Cloud Run nem em um log de deploy.
 *
 * Para definir:  firebase functions:secrets:set GEMINI_API_KEY
 * No emulador, um `functions/.env` com GEMINI_API_KEY=... resolve.
 */
export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

/** Modelo usado no cruzamento. Sobrescrevível por env para trocar sem deploy de código. */
export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
}

/**
 * Região das funções. São Paulo reduz a latência para um grupo inteiramente
 * carioca — e o frontend precisa apontar para a MESMA região
 * (VITE_FUNCTIONS_REGION), senão a chamada bate em um endpoint inexistente e
 * o navegador reporta isso como erro de CORS.
 */
export const FUNCTIONS_REGION = 'southamerica-east1';
