import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

import { Timestamp } from 'firebase/firestore';

/**
 * Normaliza qualquer coisa que o Firestore devolva como data para milissegundos.
 *
 * Um mesmo campo chega em três formas: `Timestamp` (leitura do servidor),
 * `null` (o `serverTimestamp()` ainda não resolveu na escrita otimista local)
 * e `number` (dado já normalizado). Deixar essa decisão para a tela significa
 * repeti-la em todo componente — e esquecê-la em um deles.
 */
export function toMillis(value: unknown): number | null {
  if (value instanceof Timestamp)
    return value.toMillis();
  if (typeof value === 'number')
    return value;
  if (value instanceof Date)
    return value.getTime();
  return null;
}

/** Junta o id do documento com seus dados e normaliza os campos de data. */
export function withId(snapshot: QueryDocumentSnapshot<DocumentData>): DocumentData {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

/**
 * Remove chaves `undefined` antes de escrever.
 *
 * O Firestore rejeita `undefined` com um erro em runtime (ao contrário de
 * `null`, que ele aceita). Formulários produzem `undefined` o tempo todo em
 * campos opcionais não preenchidos.
 */
export function stripUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
