import type { MatchResult } from '@/types/match-type';
import { doc, getDoc } from 'firebase/firestore';

import { httpsCallable } from 'firebase/functions';

import { db, functions } from '@/config/firebase';
import { toMillis } from '@/helpers/firestore';
import { matchResultSchema } from '@/types/match-type';

type SuggestRequest = { focus?: string };
type SuggestResponse = { result: unknown };

/**
 * O cruzamento de negócios roda numa Cloud Function, nunca no navegador.
 *
 * Duas razões, e as duas são intransigentes: a chave do Gemini não pode ir
 * para o bundle público (de lá qualquer um a copia e gasta a cota do grupo),
 * e o prompt precisa enxergar o perfil de TODOS os membros — inclusive
 * telefone e faturamento — que o cliente de um membro só não tem direito de
 * ler em massa. Quem lê tudo é o Admin SDK, no servidor, e o que volta para a
 * tela é só a sugestão.
 */
const callSuggestMatches = httpsCallable<SuggestRequest, SuggestResponse>(
  functions,
  'suggestBusinessMatches',
);

function parseResult(uid: string, data: unknown): MatchResult | null {
  if (!data)
    return null;

  const raw = data as Record<string, unknown>;
  const result = matchResultSchema.safeParse({
    ...raw,
    uid,
    generatedAt: toMillis(raw.generatedAt) ?? Date.now(),
  });

  if (!result.success) {
    console.error('[matchmakingService] resultado fora do schema', { uid, issues: result.error.issues });
    return null;
  }

  // A IA ordena por afinidade, mas a ordem é dela; reordenar aqui garante que
  // a tela sempre mostre a melhor sugestão primeiro.
  return { ...result.data, matches: [...result.data.matches].sort((a, b) => b.score - a.score) };
}

export const matchmakingService = {
  /** Última geração salva. Abrir a tela não deve custar uma chamada ao modelo. */
  async getCached(uid: string): Promise<MatchResult | null> {
    const snapshot = await getDoc(doc(db, 'matches', uid));
    return parseResult(uid, snapshot.data());
  },

  /** Dispara uma nova análise. A função aplica o intervalo mínimo entre chamadas. */
  async generate(uid: string, focus?: string): Promise<MatchResult | null> {
    const response = await callSuggestMatches({ focus: focus?.trim() || undefined });
    return parseResult(uid, response.data?.result);
  },
};
