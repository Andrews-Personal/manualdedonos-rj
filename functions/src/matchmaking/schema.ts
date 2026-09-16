import { Type } from '@google/genai';
import { z } from 'zod';

/**
 * Schema entregue ao modelo (`responseSchema`) para que a saída venha como
 * JSON estruturado em vez de texto corrido.
 *
 * Isso reduz drasticamente a variação, mas NÃO é uma garantia: a resposta
 * ainda é validada com Zod do lado de cá antes de virar dado. Um modelo que
 * devolve um campo a mais, um score em string ou um uid inventado não pode
 * derrubar a tela do membro.
 */
export const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Leitura do posicionamento do empresário no grupo, em até três frases.',
    },
    matches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          memberUid: { type: Type.STRING, description: 'Identificador exato entre colchetes na lista.' },
          memberName: { type: Type.STRING },
          company: { type: Type.STRING },
          score: { type: Type.NUMBER, description: 'Força do encaixe, de 0 a 100.' },
          opportunityType: { type: Type.STRING },
          rationale: { type: Type.STRING },
          suggestedApproach: { type: Type.STRING },
        },
        required: ['memberUid', 'memberName', 'score', 'rationale'],
      },
    },
  },
  required: ['matches'],
};

export const modelResponseSchema = z.object({
  summary: z.string().default(''),
  matches: z.array(z.object({
    memberUid: z.string(),
    memberName: z.string().default(''),
    company: z.string().default(''),
    score: z.coerce.number().min(0).max(100).catch(0),
    opportunityType: z.string().default(''),
    rationale: z.string().default(''),
    suggestedApproach: z.string().default(''),
  })).default([]),
});

export type ModelResponse = z.infer<typeof modelResponseSchema>;
