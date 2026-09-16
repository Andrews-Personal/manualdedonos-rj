import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// `initializeApp` uma única vez por instância. Cada arquivo que precisa do
// Firestore importa `db` daqui — chamar `initializeApp` duas vezes derruba a
// função com "The default Firebase app already exists".
if (getApps().length === 0)
  initializeApp();

export const db = getFirestore();
