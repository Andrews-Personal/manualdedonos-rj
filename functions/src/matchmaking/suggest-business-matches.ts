import { GoogleGenAI } from '@google/genai';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import { z } from 'zod';

import { FUNCTIONS_REGION, GEMINI_API_KEY, geminiModel } from '../config/env';
import { db } from '../lib/admin';
import { requireActiveMember } from '../lib/auth';
import { loadCandidates, loadRequesterProfile } from './profiles';
import { buildUserPrompt, SYSTEM_INSTRUCTION } from './prompt';
import { modelResponseSchema, RESPONSE_SCHEMA } from './schema';

/**
 * Intervalo mínimo entre duas análises do MESMO membro.
 *
 * Cada chamada custa tokens e varre a base inteira. Sem o intervalo, um clique
 * repetido no botão vira uma fatura — e o resultado praticamente não muda,
 * porque os perfis não mudaram nesses segundos.
 */
const COOLDOWN_MS = 3 * 60 * 1000;

const requestSchema = z.object({
  focus: z.string().trim().max(200).optional(),
});

export const suggestBusinessMatches = onCall(
  {
    region: FUNCTIONS_REGION,
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: '512MiB',
    // Uma turma de master class não gera pico de tráfego; o teto evita que um
    // laço acidental no cliente multiplique instâncias (e custo).
    maxInstances: 5,
    cors: true,
  },
  async (request) => {
    const caller = await requireActiveMember(request);

    const parsedRequest = requestSchema.safeParse(request.data ?? {});
    if (!parsedRequest.success)
      throw new HttpsError('invalid-argument', 'Foco inválido. Use no máximo 200 caracteres.');

    const focus = parsedRequest.data.focus;
    const matchRef = db.collection('matches').doc(caller.uid);

    const previous = await matchRef.get();
    if (previous.exists) {
      const generatedAt = previous.data()?.generatedAt;
      const lastMillis = generatedAt?.toMillis?.() ?? 0;
      const waitMs = COOLDOWN_MS - (Date.now() - lastMillis);

      if (waitMs > 0) {
        throw new HttpsError(
          'resource-exhausted',
          `Você acabou de rodar uma análise. Tente de novo em ${Math.ceil(waitMs / 1000)} segundos.`,
        );
      }
    }

    const requester = loadRequesterProfile(caller.uid, caller.data);

    if (!requester.company && requester.offers.length === 0 && requester.needs.length === 0) {
      throw new HttpsError(
        'failed-precondition',
        'Complete seu perfil (empresa, o que oferece e o que procura) antes de rodar a análise.',
      );
    }

    const candidates = await loadCandidates(caller.uid);

    if (candidates.length === 0) {
      throw new HttpsError(
        'failed-precondition',
        'Ainda não há outros membros com perfil preenchido para cruzar.',
      );
    }

    const model = geminiModel();
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });

    let rawText: string;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildUserPrompt(requester, candidates, focus),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          // Temperatura baixa: a tarefa é encontrar encaixes que estão nos
          // dados, não escrever algo interessante.
          temperature: 0.3,
        },
      });

      rawText = response.text ?? '';
    }
    catch (error) {
      logger.error('[suggestBusinessMatches] falha na chamada ao Gemini', { uid: caller.uid, error });
      throw new HttpsError('unavailable', 'O serviço de análise está indisponível agora. Tente novamente em instantes.');
    }

    let parsedModelOutput;

    try {
      parsedModelOutput = modelResponseSchema.parse(JSON.parse(rawText));
    }
    catch (error) {
      logger.error('[suggestBusinessMatches] resposta do modelo fora do formato', {
        uid: caller.uid,
        error,
        preview: rawText.slice(0, 500),
      });
      throw new HttpsError('internal', 'A análise voltou em um formato inesperado. Tente novamente.');
    }

    // Barreira contra alucinação: o modelo só pode sugerir quem realmente
    // está na lista enviada. Um uid inventado viraria um card apontando para
    // um membro que não existe — e nome/empresa são reescritos a partir do
    // perfil real, nunca a partir do que o modelo digitou.
    const byUid = new Map(candidates.map(candidate => [candidate.uid, candidate]));

    const matches = parsedModelOutput.matches
      .flatMap((match) => {
        const candidate = byUid.get(match.memberUid);
        if (!candidate)
          return [];

        return [{
          memberUid: candidate.uid,
          memberName: candidate.name,
          company: candidate.company,
          score: Math.round(match.score),
          opportunityType: match.opportunityType,
          rationale: match.rationale,
          suggestedApproach: match.suggestedApproach,
        }];
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const discarded = parsedModelOutput.matches.length - matches.length;
    if (discarded > 0)
      logger.warn('[suggestBusinessMatches] sugestões descartadas por uid desconhecido', { uid: caller.uid, discarded });

    const result = {
      uid: caller.uid,
      model,
      focus: focus ?? '',
      summary: parsedModelOutput.summary,
      matches,
      candidatesConsidered: candidates.length,
      generatedAt: FieldValue.serverTimestamp(),
    };

    await matchRef.set(result);

    logger.info('[suggestBusinessMatches] análise concluída', {
      uid: caller.uid,
      candidates: candidates.length,
      matches: matches.length,
    });

    // `generatedAt` volta como número: o sentinel do servidor não é
    // serializável na resposta da callable, e o cliente precisa da data para
    // mostrar "gerado há X minutos" sem uma segunda leitura.
    return { result: { ...result, generatedAt: Date.now() } };
  },
);
