import { z } from 'zod';

/**
 * Resultado do cruzamento de negócios feito pelo Gemini.
 *
 * O schema é o MESMO usado pela Cloud Function como `responseSchema` do
 * modelo e como validação da resposta. Um modelo de linguagem devolve texto:
 * tratar isso como dado confiável é o caminho curto para uma tela quebrada
 * quando ele decidir renderizar um campo a mais.
 */
export const businessMatchSchema = z.object({
  memberUid: z.string(),
  memberName: z.string(),
  company: z.string().default(''),
  /** 0–100. Ordena a lista; não é promessa de nada. */
  score: z.number().min(0).max(100),
  /** Tipo de oportunidade: fornecimento, parceria, cliente, indicação... */
  opportunityType: z.string().default(''),
  /** Por que estas duas empresas se encaixam — em uma frase verificável. */
  rationale: z.string().default(''),
  /** Como abrir a conversa no próximo encontro. */
  suggestedApproach: z.string().default(''),
});

export const matchResultSchema = z.object({
  uid: z.string(),
  generatedAt: z.number(),
  model: z.string().default(''),
  /** Foco textual pedido pelo membro naquela geração, se houve. */
  focus: z.string().default(''),
  matches: z.array(businessMatchSchema).default([]),
  /** Leitura geral do modelo sobre o posicionamento do membro no grupo. */
  summary: z.string().default(''),
});

export type BusinessMatch = z.infer<typeof businessMatchSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;
