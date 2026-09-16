# Modelo de dados e regras de segurança

Referência das coleções do Firestore, das pastas do Storage e de quem pode ler
e escrever o quê.

Os schemas ficam em `src/types/` como objetos Zod: o mesmo schema que descreve o
tipo em TypeScript é o que valida o documento na leitura. Um documento fora do
formato é registrado no console e **descartado**, em vez de derrubar a tela.

---

## Coleções

### `members/{uid}`

Perfil do empresário. O ID do documento é o `uid` do Firebase Auth — o que torna
impossível alguém ter dois perfis ou escrever no perfil de outra pessoa.

| Campo                    | Tipo               | Observação                                                                 |
| ------------------------ | ------------------ | -------------------------------------------------------------------------- |
| `uid`                    | string             | igual ao ID do documento                                                   |
| `email`                  | string             |                                                                            |
| `displayName`            | string             |                                                                            |
| `photoURL`               | string             | URL de download do Storage                                                 |
| `phone`                  | string             |                                                                            |
| `role`                   | 0 \| 1 \| 90 \| 99 | Visitante, Membro, Admin, SuperAdmin                                       |
| `approved`               | boolean            | liberado por um admin                                                      |
| `bio`                    | string             |                                                                            |
| `company`                | objeto             | `name`, `segment`, `position`, `site`, `revenueRange`, `headcount`, `city` |
| `offers`                 | string[]           | o que a empresa entrega                                                    |
| `needs`                  | string[]           | o que a empresa procura                                                    |
| `linkedin`, `instagram`  | string             |                                                                            |
| `aiOptOut`               | boolean            | remove o perfil das sugestões dos outros                                   |
| `createdAt`, `updatedAt` | Timestamp          | `serverTimestamp()`                                                        |

`offers` e `needs` são **texto livre**, não categorias de uma lista fixa. Uma
lista fixa empobreceria exatamente o insumo do cruzamento por IA: o modelo
raciocina muito melhor sobre "armazenagem refrigerada em Duque de Caxias" do que
sobre "Logística".

### `events/{auto}`

| Campo                                      | Tipo                                     | Observação                                    |
| ------------------------------------------ | ---------------------------------------- | --------------------------------------------- |
| `title`, `description`, `topic`, `speaker` | string                                   |                                               |
| `startsAt`                                 | string                                   | **ISO 8601 com offset `-03:00`** — ver abaixo |
| `durationMinutes`                          | number                                   | só para exibir o horário de término           |
| `location`                                 | objeto                                   | `name`, `address`, `mapsUrl`                  |
| `coverUrl`                                 | string                                   |                                               |
| `capacity`                                 | number \| null                           | `null` = sem limite                           |
| `status`                                   | `agendado` \| `realizado` \| `cancelado` |                                               |

**Sobre o `startsAt`.** Uma data sem fuso (`2026-10-15T19:30:00`) é lida como um
instante diferente em cada relógio: as Cloud Functions rodam em UTC e o
navegador roda no fuso de quem está olhando — um membro em viagem veria o jantar
de quinta marcado para quarta. Com o offset explícito, o instante é único.

E como o Brasil não adota mais horário de verão, o offset é constante, o que dá
um segundo benefício: a ordenação alfabética da string coincide com a ordem
cronológica. `orderBy('startsAt')` funciona sem conversão nenhuma.

### `rsvps/{eventId}_{uid}`

| Campo                         | Tipo                                  | Observação                         |
| ----------------------------- | ------------------------------------- | ---------------------------------- |
| `eventId`, `uid`              | string                                |                                    |
| `memberName`, `memberCompany` | string                                | desnormalizados                    |
| `status`                      | `confirmado` \| `talvez` \| `ausente` |                                    |
| `guests`                      | number                                | 0–10, convidados que o membro leva |
| `note`                        | string                                |                                    |

**O ID é derivado, não sorteado.** Com `addDoc`, o mesmo membro confirmaria o
mesmo encontro duas vezes — dois cliques, dois aparelhos — e a contagem do
anfitrião passaria a mentir. Com `{eventId}_{uid}` e `setDoc`, a segunda resposta
sobrescreve a primeira. A regra do Firestore **exige** esse formato na criação,
então nem uma escrita feita fora do app burla a restrição.

Nome e empresa ficam duplicados aqui de propósito: a lista de presença de um
encontro renderiza com uma consulta, sem N leituras em `members`.

### `photos/{auto}`

| Campo                          | Tipo   | Observação                  |
| ------------------------------ | ------ | --------------------------- |
| `eventId`, `eventTitle`        | string | vazio = foto avulsa         |
| `caption`                      | string |                             |
| `downloadUrl`                  | string |                             |
| `storagePath`                  | string | caminho do objeto no bucket |
| `uploadedBy`, `uploadedByName` | string |                             |

`storagePath` é o que permite apagar o arquivo junto com o documento. Sem ele,
remover a foto do mural deixaria um objeto no bucket que ninguém mais consegue
endereçar — invisível na tela e presente na fatura.

### `services/{auto}`

Anúncios da vitrine: `ownerUid`, `ownerName`, `ownerCompany`, `title`,
`description`, `category`, `memberBenefit`, `priceHint`, `whatsapp`, `email`,
`site`, `coverUrl`, `active`.

`memberBenefit` é a condição especial para quem é do grupo. É o campo que separa
a vitrine de um classificado qualquer.

### `matches/{uid}`

Cache da última análise da IA: `model`, `focus`, `summary`, `matches[]`,
`candidatesConsidered`, `generatedAt`.

**Somente leitura para o cliente.** A escrita acontece pelo Admin SDK dentro da
Cloud Function, que ignora as regras por definição. A regra
`allow write: if false` existe para que nenhum caminho do cliente consiga
escrever: se pudesse, o cache da IA viraria um campo de texto livre editável
pelo próprio interessado.

---

## Índices compostos

Declarados em `firestore.indexes.json`. O Firestore exige um índice sempre que
uma consulta filtra por um campo e ordena por outro.

| Coleção    | Campos                                  | Consulta que o exige         |
| ---------- | --------------------------------------- | ---------------------------- |
| `events`   | `status` ↑, `startsAt` ↑                | próximos encontros agendados |
| `photos`   | `eventId` ↑, `createdAt` ↓              | fotos de um encontro         |
| `services` | `active` ↑, `createdAt` ↓               | vitrine                      |
| `services` | `active` ↑, `category` ↑, `createdAt` ↓ | vitrine filtrada             |
| `rsvps`    | `eventId` ↑, `status` ↑                 | presenças por resposta       |
| `members`  | `approved` ↑, `displayName` ↑           | diretório                    |

Nem toda ordenação vira índice. A lista de presença de um encontro e os anúncios
de um membro são ordenados **no cliente**: são dezenas de linhas, e um índice
composto custaria mais em manutenção do que aquele `sort` custa em CPU.

---

## Matriz de permissões (Firestore)

| Coleção             | Anônimo | Cadastro pendente | Membro                            | Admin         |
| ------------------- | ------- | ----------------- | --------------------------------- | ------------- |
| `members` (próprio) | —       | ler, editar¹      | ler, editar¹                      | ler, editar   |
| `members` (outros)  | —       | —                 | ler                               | ler, editar   |
| `events`            | —       | —                 | ler                               | ler, escrever |
| `rsvps`             | —       | —                 | ler todos, escrever o próprio     | ler, escrever |
| `photos`            | —       | —                 | ler, publicar, apagar as próprias | tudo          |
| `services`          | —       | —                 | ler, publicar, editar os próprios | tudo          |
| `matches` (próprio) | —       | —                 | ler                               | ler           |
| `matches` (outros)  | —       | —                 | —                                 | ler           |

¹ `role`, `approved` e `createdAt` ficam de fora: são os campos que uma conta
recém-criada tentaria alterar para virar administradora.

**Regra de criação do perfil.** O Firestore só aceita a criação de
`members/{uid}` se o documento vier com `uid == request.auth.uid`, `role == 0` e
`approved == false`. Mandar outro payload direto pelo SDK não adianta — a
fronteira de segurança é a regra, não o formulário.

---

## Storage

| Caminho                      | Leitura | Escrita                 |
| ---------------------------- | ------- | ----------------------- |
| `photos/{eventId}/{arquivo}` | membro  | membro (imagem, < 8 MB) |
| `members/{uid}/{arquivo}`    | membro  | o próprio dono          |
| `services/{uid}/{arquivo}`   | membro  | o próprio dono          |
| `events/{arquivo}`           | membro  | admin                   |
| qualquer outro               | —       | —                       |

**Não existe `allow read: if true` em lugar nenhum**, nem recursivo. As regras do
Storage são combinadas com OU: uma leitura pública concedida em
`/{allPaths=**}` não pode ser retirada por nenhuma regra mais específica depois.
Enquanto uma regra dessas estivesse no arquivo, qualquer cliente anônimo
conseguiria listar e baixar o bucket inteiro — inclusive as fotos dos encontros,
que mostram quem estava na sala.

---

## Verificando as regras

```bash
pnpm emulators:start   # terminal 1 (projeto demo-manualdedonos-rj)
pnpm seed:dev-data     # terminal 2 — cria os membros que os casos usam
pnpm test:rules        # terminal 2
```

`scripts/check-rules.mjs` faz 14 afirmações contra a API REST do emulador, com
tokens reais do Auth emulado — o mesmo caminho que o app percorre, não uma
simulação. Cada caso declara "permite" ou "nega"; uma regra que passar a liberar
demais falha aqui antes de chegar a produção.

Ao alterar `firestore.rules`, acrescente o caso correspondente ao script.
