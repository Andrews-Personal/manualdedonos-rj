/**
 * Busca em texto livre, tolerante a acento e a caixa.
 *
 * Quem procura digita "logistica" no celular, com pressa, e espera achar
 * "Logística". Comparar as strings cruas deixaria o resultado dependendo de
 * o dono do perfil ter acentuado igual a quem busca — duas grafias corretas
 * do mesmo mercado, e a empresa não aparece.
 *
 * `NFD` separa a letra do sinal diacrítico; o replace joga fora só o sinal.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * `true` quando o termo aparece em qualquer um dos campos.
 *
 * Termo vazio casa com tudo: é o estado inicial do campo de busca, em que a
 * lista inteira deve aparecer.
 */
export function matchesSearch(fields: (string | undefined | null)[], term: string): boolean {
  const needle = normalizeText(term.trim());

  if (!needle)
    return true;

  return normalizeText(fields.filter(Boolean).join(' ')).includes(needle);
}
