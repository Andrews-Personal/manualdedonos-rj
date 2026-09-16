// Fonte única de locale e fuso horário do app. O grupo se encontra no Rio,
// então toda data exibida e toda conta de "hoje" acontece em horário de
// Brasília — independente do fuso do navegador de quem está olhando.
//
// O ESLint proíbe estes literais em qualquer outro arquivo (ver eslint.config.js):
// uma data de encontro renderizada no fuso do visitante é como um membro em
// viagem enxerga o jantar de quinta marcado para quarta.

export const APP_LOCALE = 'pt-BR';
export const APP_TIMEZONE = 'America/Sao_Paulo';
export const DAYJS_LOCALE = 'pt-br';
