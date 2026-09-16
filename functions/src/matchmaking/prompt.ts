import type { CandidateProfile } from './profiles';

/**
 * Uma linha por membro. Formato compacto e estável — nada de JSON aninhado,
 *  que gasta tokens sem acrescentar informação para o modelo.
 */
function renderProfile(profile: CandidateProfile): string {
  const parts = [
    `[${profile.uid}] ${profile.name || 'Sem nome'}`,
    profile.company && `Empresa: ${profile.company}`,
    profile.segment && `Segmento: ${profile.segment}`,
    profile.position && `Cargo: ${profile.position}`,
    profile.city && `Cidade: ${profile.city}`,
    profile.headcount && `Funcionários: ${profile.headcount}`,
    profile.offers.length > 0 && `Oferece: ${profile.offers.join('; ')}`,
    profile.needs.length > 0 && `Procura: ${profile.needs.join('; ')}`,
    profile.bio && `Sobre: ${profile.bio}`,
  ].filter(Boolean);

  return parts.join(' | ');
}

export const SYSTEM_INSTRUCTION = `
Você é o analista de conexões de negócio do grupo "Manual de Donos — Empresários do Rio",
uma master class de donos de empresas do Rio de Janeiro.

Sua tarefa: dado o perfil de UM empresário e a lista dos demais membros do grupo,
apontar com quem ele tem encaixe comercial REAL e por quê.

Regras invioláveis:
1. Só use membros da lista fornecida. Nunca invente pessoa, empresa ou dado.
   O campo memberUid deve ser copiado EXATAMENTE do identificador entre colchetes.
2. Toda sugestão precisa se apoiar em algo escrito nos perfis. Se o encaixe
   depende de uma suposição sua, não é encaixe — descarte.
3. Prefira 3 a 6 conexões fortes a uma lista longa e fraca. Se não houver
   encaixe defensável com ninguém, devolva a lista vazia. Uma lista vazia é uma
   resposta correta; uma sugestão inventada não é.
4. score (0–100) é a força do encaixe: 80+ quando a oferta de um casa
   diretamente com a necessidade do outro; 50–79 quando o encaixe é plausível
   mas indireto; abaixo de 50, não sugira.
5. opportunityType em uma ou duas palavras: "fornecimento", "parceria",
   "indicação de clientes", "cliente potencial", "troca de canal".
6. rationale: UMA frase objetiva, citando o que nos dois perfis justifica o
   encaixe. Nada de elogio genérico ("empresário de sucesso").
7. suggestedApproach: uma frase prática de como puxar o assunto no próximo
   encontro presencial.
8. Escreva em português do Brasil, com o tratamento direto de quem fala com
   um dono de empresa. Sem jargão de consultoria.
`.trim();

export function buildUserPrompt(
  requester: CandidateProfile,
  candidates: CandidateProfile[],
  focus?: string,
): string {
  return [
    'PERFIL DO EMPRESÁRIO QUE PEDIU A ANÁLISE:',
    renderProfile(requester),
    '',
    focus
      ? `FOCO PEDIDO POR ELE NESTA ANÁLISE (priorize isto): ${focus}`
      : 'Ele não indicou um foco específico — faça uma análise geral.',
    '',
    `DEMAIS MEMBROS DO GRUPO (${candidates.length}):`,
    ...candidates.map(renderProfile),
    '',
    'Devolva as conexões mais promissoras para ele, ordenadas da mais forte para a mais fraca,',
    'e um "summary" de no máximo três frases lendo o posicionamento dele dentro do grupo.',
  ].join('\n');
}
