import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  initializeAuth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

import { env } from './env';

export const app = initializeApp(env.firebase);

// `initializeAuth` fixa a persistência no construtor, de forma síncrona.
//
// A alternativa comum — `getAuth(app)` seguido de um `setPersistence(...)` sem
// await — deixa uma janela em que o SDK ainda usa o armazenamento padrão
// (IndexedDB na web). Um login que resolve dentro dessa janela é gravado lá e
// só depois migrado: onde a sessão foi parar vira questão de timing, e um
// membro já logado reaparece como visitante no refresh seguinte.
//
// `popupRedirectResolver` precisa ser passado explicitamente: `initializeAuth`
// não instala o resolver padrão, e o login com Google (`signInWithPopup`)
// falha com `auth/argument-error` sem ele.
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, env.functionsRegion);

if (env.useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
