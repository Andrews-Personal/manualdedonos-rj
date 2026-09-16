import { db } from '../lib/admin';

export type CandidateProfile = {
  uid: string;
  name: string;
  company: string;
  segment: string;
  position: string;
  city: string;
  headcount: string;
  bio: string;
  offers: string[];
  needs: string[];
};

/**
 * Limite de perfis enviados ao modelo por chamada. Uma turma de master class
 *  não passa disso, e o corte evita que um crescimento inesperado da base
 *  transforme cada análise em um prompt gigante (caro e pior de ler).
 */
const MAX_CANDIDATES = 120;

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value))
    return [];
  return value.map(item => String(item).trim()).filter(Boolean).slice(0, 12);
}

function toProfile(uid: string, data: FirebaseFirestore.DocumentData): CandidateProfile {
  const company = (data.company ?? {}) as Record<string, unknown>;

  return {
    uid,
    name: String(data.displayName ?? '').trim(),
    company: String(company.name ?? '').trim(),
    segment: String(company.segment ?? '').trim(),
    position: String(company.position ?? '').trim(),
    city: String(company.city ?? '').trim(),
    headcount: String(company.headcount ?? '').trim(),
    bio: String(data.bio ?? '').trim().slice(0, 400),
    offers: toStringArray(data.offers),
    needs: toStringArray(data.needs),
  };
}

/**
 * Perfis elegíveis para o cruzamento.
 *
 * Três filtros, todos deliberados:
 *   - `approved == true`: um cadastro pendente não é da turma;
 *   - `aiOptOut != true`: quem pediu para ficar de fora fica de fora das
 *     sugestões dos outros (o opt-out precisa valer aqui, no servidor — o
 *     cliente nunca vê esta lista);
 *   - sem o próprio solicitante, que não se conecta consigo mesmo.
 *
 * Faturamento e telefone NÃO entram no prompt: não melhoram a sugestão e
 * seriam dados sensíveis saindo do projeto sem necessidade.
 */
export async function loadCandidates(excludeUid: string): Promise<CandidateProfile[]> {
  const snapshot = await db
    .collection('members')
    .where('approved', '==', true)
    .limit(MAX_CANDIDATES + 1)
    .get();

  return snapshot.docs
    .filter(doc => doc.id !== excludeUid && doc.data().aiOptOut !== true)
    .map(doc => toProfile(doc.id, doc.data()))
    // Um perfil sem empresa e sem oferta/necessidade não dá ao modelo nada
    // sobre o que raciocinar; incluí-lo só produz sugestão inventada.
    .filter(profile => profile.company || profile.offers.length > 0 || profile.needs.length > 0)
    .slice(0, MAX_CANDIDATES);
}

export function loadRequesterProfile(uid: string, data: FirebaseFirestore.DocumentData): CandidateProfile {
  return toProfile(uid, data);
}
