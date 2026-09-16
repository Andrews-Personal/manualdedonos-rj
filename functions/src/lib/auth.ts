import type { CallableRequest } from 'firebase-functions/https';

import { HttpsError } from 'firebase-functions/https';

import { db } from './admin';

export type CallerMember = {
  uid: string;
  displayName: string;
  email: string;
  role: number;
  approved: boolean;
  data: FirebaseFirestore.DocumentData;
};

/**
 * Resolve quem está chamando e confirma que é um membro liberado.
 *
 * A regra do Firestore protege o banco, mas não protege uma Cloud Function:
 * ela roda com o Admin SDK e ignora as regras por definição. Quem chama uma
 * função é, portanto, verificado aqui — e "autenticado" não basta, porque
 * qualquer pessoa consegue criar uma conta. O portão é `approved`.
 */
export async function requireActiveMember(request: CallableRequest<unknown>): Promise<CallerMember> {
  const uid = request.auth?.uid;

  if (!uid)
    throw new HttpsError('unauthenticated', 'Entre na sua conta para usar esta função.');

  const snapshot = await db.collection('members').doc(uid).get();

  if (!snapshot.exists)
    throw new HttpsError('permission-denied', 'Seu perfil ainda não foi criado.');

  const data = snapshot.data() ?? {};
  const role = Number(data.role ?? 0);
  const approved = data.approved === true;

  if (!approved || role < 1)
    throw new HttpsError('permission-denied', 'Seu acesso ainda não foi liberado pela organização.');

  return {
    uid,
    displayName: String(data.displayName ?? ''),
    email: String(data.email ?? ''),
    role,
    approved,
    data,
  };
}
