import { z } from 'zod';

// `import.meta.env` é uma fronteira não confiável: é o que o build injetou, e
// um build mal configurado injeta `undefined`. Por isso ele é lido UMA vez,
// aqui, validado por Zod, e em nenhum outro lugar do app.
//
// O padrão antigo `import.meta.env.VITE_X || ''` é justamente o que se evita:
// uma variável faltando virava string vazia e o erro aparecia três telas
// adiante, como "permission-denied" ou uma tela branca. Aqui ela estoura no
// boot, com o nome da variável que falta.

const nonEmpty = z.string().trim().min(1);

const envSchema = z.object({
  // Config do Firebase Web — pública por design, mas obrigatória para o app subir.
  VITE_FIREBASE_API_KEY: nonEmpty,
  VITE_FIREBASE_AUTH_DOMAIN: nonEmpty,
  VITE_FIREBASE_PROJECT_ID: nonEmpty,
  VITE_FIREBASE_STORAGE_BUCKET: nonEmpty,
  VITE_FIREBASE_MESSAGING_SENDER_ID: nonEmpty,
  VITE_FIREBASE_APP_ID: nonEmpty,
  VITE_FIREBASE_MEASUREMENT_ID: z.string().trim().optional(),

  VITE_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('production'),
  VITE_APP_URL: z.string().trim().url().default('http://localhost:5173'),
  VITE_FUNCTIONS_REGION: nonEmpty.default('southamerica-east1'),
  VITE_USE_EMULATORS: z
    .union([z.boolean(), z.string()])
    .default(false)
    .transform(value => value === true || value === 'true'),
});

export type RawEnv = Record<string, string | boolean | undefined>;
export type ParsedEnv = z.infer<typeof envSchema>;

/**
 * Valida um saco de variáveis cru. Lança UM erro agregado listando tudo que
 * falta — nunca uma variável por vez, que obriga a rodar o build seis vezes
 * para descobrir as seis que faltavam.
 */
export function parseEnv(raw: RawEnv): ParsedEnv {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map(issue => `  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Configuração de ambiente inválida (veja .env.example):\n${details}`,
    );
  }

  return result.data;
}

// Cada variável é lida explicitamente para que o Vite consiga substituí-la
// estaticamente no bundle. Um `import.meta.env[chave]` dinâmico não é inlinado
// e chega como undefined em produção.
function readRawEnv(): RawEnv {
  return {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
    VITE_APP_URL: import.meta.env.VITE_APP_URL,
    VITE_FUNCTIONS_REGION: import.meta.env.VITE_FUNCTIONS_REGION,
    VITE_USE_EMULATORS: import.meta.env.VITE_USE_EMULATORS,
  };
}

const parsed = parseEnv(readRawEnv());

export const env = {
  firebase: {
    apiKey: parsed.VITE_FIREBASE_API_KEY,
    authDomain: parsed.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: parsed.VITE_FIREBASE_PROJECT_ID,
    storageBucket: parsed.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: parsed.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: parsed.VITE_FIREBASE_APP_ID,
    measurementId: parsed.VITE_FIREBASE_MEASUREMENT_ID,
  },
  environment: parsed.VITE_ENVIRONMENT,
  appUrl: parsed.VITE_APP_URL,
  functionsRegion: parsed.VITE_FUNCTIONS_REGION,
  useEmulators: parsed.VITE_USE_EMULATORS,
} as const;
