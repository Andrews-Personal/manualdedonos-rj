/**
 * Cloud Functions — Manual de Donos, Empresários do Rio.
 *
 * Só existe backend onde o cliente não pode ir: a chave do Gemini não pode ir
 * para o bundle, e o cruzamento precisa ler o perfil de todos os membros de
 * uma vez, o que as regras do Firestore corretamente proíbem a um cliente.
 * Todo o resto (agenda, mural, vitrine, presenças) é Firestore direto, com as
 * regras como fronteira.
 */
export { suggestBusinessMatches } from './matchmaking/suggest-business-matches';
