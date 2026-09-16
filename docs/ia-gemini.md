# Cruzamento de negócios com IA

Como funciona a página **Conexões (IA)**: o que roda onde, o que o modelo vê, e
quais salvaguardas impedem que uma sugestão inventada chegue à tela.

---

## O caminho de uma análise

```
Membro clica em "Analisar o grupo"
   │
   ▼
src/services/matchmaking.service.ts   httpsCallable('suggestBusinessMatches')
   │
   ▼
functions/src/matchmaking/suggest-business-matches.ts
   ├─ requireActiveMember()     quem chama é membro aprovado?
   ├─ intervalo mínimo          já rodou há menos de 3 minutos?
   ├─ perfil mínimo             tem empresa / oferece / procura?
   ├─ loadCandidates()          perfis aprovados, sem opt-out, sem o solicitante
   ├─ buildUserPrompt()         uma linha por membro
   ├─ Gemini                    JSON estruturado (responseSchema)
   ├─ Zod                       a resposta bate com o formato?
   ├─ filtro anti-alucinação    o uid sugerido existe mesmo?
   └─ grava em matches/{uid}    e devolve para a tela
```

## Por que no servidor, e não no navegador

Duas razões, e nenhuma delas é negociável.

**A chave.** Uma `GEMINI_API_KEY` no bundle é uma chave pública: qualquer
visitante abre o DevTools, copia e passa a gastar a cota do grupo. No servidor
ela vive no Secret Manager e é materializada apenas dentro da função que a
declara em `secrets: [...]`.

**Os dados.** O prompt precisa enxergar o perfil de **todos** os membros de uma
vez. Esse é justamente o tipo de leitura em massa que as regras do Firestore
corretamente permitem — mas que seria imprudente expor como uma consulta que
qualquer cliente pode disparar e exportar. Na função, quem lê é o Admin SDK, e o
que volta para a tela é só a sugestão: nome, empresa e a justificativa.

## O que o modelo vê — e o que ele não vê

Enviado (`functions/src/matchmaking/profiles.ts`):

- nome, empresa, segmento, cargo, cidade, nº de funcionários
- bio (limitada a 400 caracteres)
- `offers` e `needs` (até 12 itens cada)
- o `uid`, como identificador de referência

**Não** enviado:

- telefone e e-mail — não melhoram a sugestão em nada
- faixa de faturamento — dado sensível, sem função no cruzamento
- qualquer coisa de quem marcou `aiOptOut`
- qualquer coisa de cadastro ainda não aprovado

O opt-out é aplicado **no servidor**, em `loadCandidates()`. Um filtro de
interface não serviria: o cliente nunca chega a ver essa lista, então o único
lugar onde a exclusão pode ser garantida é onde a lista é montada.

## As quatro salvaguardas

### 1. Saída estruturada

A chamada usa `responseMimeType: 'application/json'` com um `responseSchema`
explícito (`functions/src/matchmaking/schema.ts`). Isso reduz drasticamente a
variação da resposta — mas não é garantia, e o código não trata como se fosse.

### 2. Validação com Zod

A resposta é parseada e validada. Um campo a mais, um `score` que veio como
string, um JSON truncado: tudo isso vira um erro tratado com mensagem em
português, não uma tela quebrada.

### 3. Filtro anti-alucinação

```ts
const byUid = new Map(candidates.map(c => [c.uid, c]));

const matches = parsedModelOutput.matches.flatMap((match) => {
  const candidate = byUid.get(match.memberUid);
  if (!candidate)
    return [];                 // uid que o modelo inventou: descartado
  return [{
    memberUid: candidate.uid,
    memberName: candidate.name,   // reescrito a partir do perfil real
    company: candidate.company,   // idem
    // …
  }];
});
```

Esta é a salvaguarda que mais importa. Um `memberUid` que não está na lista
enviada é descartado silenciosamente (e registrado no log). E nome e empresa são
reescritos a partir do perfil real — o texto que o modelo digitou nesses campos
nunca chega à tela. Uma sugestão apontando para um membro que não existe seria
pior do que sugestão nenhuma: parece uma resposta.

### 4. Intervalo mínimo

Três minutos entre análises do mesmo membro. Cada chamada custa tokens e varre a
base inteira; sem o intervalo, um clique repetido vira uma fatura — e o
resultado praticamente não muda, porque os perfis não mudaram nesses segundos.

## O prompt

`SYSTEM_INSTRUCTION` (`functions/src/matchmaking/prompt.ts`) fixa oito regras.
As que mais mudam o resultado:

> 3. Prefira 3 a 6 conexões fortes a uma lista longa e fraca. Se não houver
>    encaixe defensável com ninguém, devolva a lista vazia. **Uma lista vazia é
>    uma resposta correta; uma sugestão inventada não é.**

> 6. `rationale`: UMA frase objetiva, citando o que nos dois perfis justifica o
>    encaixe. Nada de elogio genérico ("empresário de sucesso").

A temperatura é `0.3`. A tarefa é achar encaixes que **estão** nos dados, não
escrever algo interessante.

Cada membro vira uma linha:

```
[abc123] Carlos Menezes | Empresa: Frio Premium Logística | Segmento: Logística
refrigerada | Cidade: Duque de Caxias | Oferece: armazenagem refrigerada;
transporte com controle de temperatura | Procura: clientes de food service
```

Formato de linha, não JSON aninhado: gasta menos tokens sem perder informação.

## Configuração

| Item                         | Onde                                              | Padrão               |
| ---------------------------- | ------------------------------------------------- | -------------------- |
| `GEMINI_API_KEY`             | Secret Manager (`firebase functions:secrets:set`) | —                    |
| `GEMINI_MODEL`               | env das functions                                 | `gemini-2.5-flash`   |
| Região                       | `functions/src/config/env.ts`                     | `southamerica-east1` |
| Máx. de perfis por chamada   | `profiles.ts` → `MAX_CANDIDATES`                  | 120                  |
| Máx. de sugestões devolvidas | `suggest-business-matches.ts`                     | 8                    |
| Intervalo mínimo             | `suggest-business-matches.ts` → `COOLDOWN_MS`     | 3 min                |
| Teto de instâncias           | `maxInstances`                                    | 5                    |

Em desenvolvimento, um `functions/.env` com `GEMINI_API_KEY=...` já resolve — o
emulador de Functions lê esse arquivo.

## Erros que o membro pode ver

| Mensagem                                             | Código                | Causa                                   |
| ---------------------------------------------------- | --------------------- | --------------------------------------- |
| "Seu acesso ainda não foi liberado…"                 | `permission-denied`   | cadastro pendente                       |
| "Complete seu perfil…"                               | `failed-precondition` | sem empresa, sem `offers` e sem `needs` |
| "Ainda não há outros membros com perfil preenchido…" | `failed-precondition` | base pequena demais para cruzar         |
| "Você acabou de rodar uma análise…"                  | `resource-exhausted`  | intervalo mínimo                        |
| "O serviço de análise está indisponível agora."      | `unavailable`         | a chamada ao Gemini falhou              |
| "A análise voltou em um formato inesperado."         | `internal`            | a resposta não passou no Zod            |

As duas últimas ficam registradas com contexto em
`firebase functions:log --only suggestBusinessMatches`.

## Limites honestos

As sugestões saem de perfis **autodeclarados**. O modelo não verifica se a
empresa existe, se o faturamento confere ou se o membro entrega o que diz
entregar. A tela diz isso ao usuário, e o texto deve continuar dizendo:

> As sugestões são geradas por IA a partir dos perfis declarados pelos próprios
> membros. Trate-as como ponto de partida para uma conversa, não como due
> diligence.
