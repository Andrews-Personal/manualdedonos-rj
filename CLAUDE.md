# Manual de Donos — Empresários do Rio

Área de membros da master class: agenda, confirmação de presença, mural de
fotos, vitrine de serviços entre participantes e cruzamento de negócios com IA.
Aplicação privada — nada é público.

## Stack

| Camada    | Tecnologia                                                        |
| --------- | ----------------------------------------------------------------- |
| Frontend  | React 19, TypeScript 5.9, Vite 7                                  |
| Estilo    | Tailwind CSS 4 (tokens em `src/index.css`), ícones Lucide         |
| Backend   | Firebase — Auth, Firestore, Storage, Cloud Functions (2ª geração) |
| IA        | Gemini via `@google/genai`, só no servidor                        |
| Validação | Zod, nas duas pontas                                              |
| CI/CD     | GitHub Actions → Firebase Hosting                                 |

## Estrutura

```
src/
├── app/app.tsx            # rotas e providers
├── components/
│   ├── admin/             # encontros, membros, presenças
│   ├── agenda/            # card de encontro, painel de presença
│   ├── home/              # painel da tela inicial de quem é da turma
│   ├── layout/            # cabeçalho, menu, rodapé
│   ├── mural/             # grade e envio de fotos
│   ├── ui/                # primitivos: botão, card, campo, modal, estados
│   └── vitrine/           # card e formulário de serviço
├── config/                # env (Zod), Firebase, dayjs, locale
├── context/               # sessão + perfil do membro
├── helpers/               # datas, Firestore, erros, busca em texto
├── hooks/                 # useUser, useAsyncResource
├── libs/authorization/    # singleton do Firebase Auth
├── pages/                 # uma tela por rota
├── routes/                # catálogo de rotas + guarda de acesso
├── services/              # CRUD do Firestore e chamadas das functions
└── types/                 # schemas Zod + tipos do domínio

functions/src/
├── config/env.ts          # segredos (Secret Manager) e região
├── lib/                   # Admin SDK, verificação de quem chama
└── matchmaking/           # cruzamento com Gemini
```

## Comandos

```bash
pnpm dev               # Vite
pnpm emulators:start   # compila as functions e sobe os emuladores
pnpm emulators:clean   # idem, ignorando os dados exportados
pnpm seed:dev-data     # turma de demonstração no emulador
pnpm lint / lint:fix   # ESLint
pnpm typecheck         # TypeScript
pnpm test:rules        # regras do Firestore contra o emulador
pnpm build             # tsc + vite
pnpm func:build        # compila as functions
pnpm deploy            # build + deploy completo
```

## Arquivos de referência

| Assunto                               | Arquivo                                                 |
| ------------------------------------- | ------------------------------------------------------- |
| Catálogo de rotas                     | `src/routes/routes.ts`                                  |
| Guarda de acesso                      | `src/routes/protected-route.tsx`                        |
| Schema das variáveis de ambiente      | `src/config/env.ts`                                     |
| Inicialização do Firebase             | `src/config/firebase.ts`                                |
| Sessão + perfil                       | `src/context/user-context.tsx`                          |
| Singleton do Auth                     | `src/libs/authorization/auth-service.ts`                |
| Leitura assíncrona com erro explícito | `src/hooks/use-async-resource.ts`                       |
| Datas no fuso de Brasília             | `src/helpers/date.ts`                                   |
| Papéis e aprovação                    | `src/types/member-type.ts`                              |
| Cruzamento com Gemini                 | `functions/src/matchmaking/suggest-business-matches.ts` |
| Regras do Firestore                   | `firestore.rules`                                       |
| Teste das regras                      | `scripts/check-rules.mjs`                               |

## Conceitos do domínio

**Papéis (numéricos).** `0` Visitante, `1` Membro, `90` Admin, `99` SuperAdmin.
Numéricos porque as regras do Firestore comparam com `>=` — "admin ou acima" vira
uma comparação só, sem manter uma lista de rótulos sincronizada em dois lugares.

**Aprovação é o portão.** Todo cadastro nasce `role: 0, approved: false`, e a
regra de criação **exige** exatamente esses valores. Enviar outro payload pelo
SDK não adianta: a fronteira é a regra, não o formulário. O perfil é assinado em
tempo real (`onSnapshot`) no `UserProvider`, então a aprovação de um admin tira o
membro da tela de espera sem ele recarregar nada.

**Três camadas de acesso, e só uma é segurança.** O menu esconde links
(descoberta), o `ProtectedRoute` barra URL digitada à mão (navegação) e as regras
do Firestore barram a escrita (segurança). As duas primeiras podem ser
contornadas pelo navegador; por isso a terceira nunca pode ser esquecida.

**`events.startsAt` carrega o fuso.** ISO 8601 com `-03:00` explícito, sempre.
Uma data solta é lida como um instante diferente em cada relógio — funções rodam
em UTC, navegadores rodam no fuso do usuário. Como o Brasil não tem mais horário
de verão, o offset é constante e a ordenação lexicográfica da string coincide com
a cronológica: `orderBy('startsAt')` funciona sem conversão. A conversão entre os
dois campos do formulário e o valor canônico acontece só em
`toStartsAt` / `fromStartsAt` (`src/helpers/date.ts`).

**O ID do RSVP é derivado.** `{eventId}_{uid}` com `setDoc`, nunca `addDoc`. Com
ID sorteado, o mesmo membro confirmaria o mesmo encontro duas vezes — dois
cliques, dois aparelhos — e a contagem do anfitrião passaria a mentir. A regra do
Firestore exige esse formato na criação.

**Nome e empresa são desnormalizados em `rsvps`.** A lista de presença renderiza
com uma consulta, sem N leituras em `members`.

**O upload de foto limpa o que sujou.** `uploadPhoto` sobe o arquivo e depois
grava o documento; se a gravação falhar, o objeto recém-enviado é apagado. Um
arquivo órfão no bucket é um que ninguém vê na tela nem remove pelo app — ele só
aparece na fatura. Na remoção, o objeto vai primeiro: se o documento sumisse
antes, o `storagePath` iria junto e o arquivo ficaria inalcançável.

**Fotos são comprimidas no navegador.** `browser-image-compression` antes do
upload. Foto de celular chega com 6–12 MB; um encontro inteiro sem isso estoura
a cota do Storage e demora para carregar no 4G.

**Nenhuma leitura pública no Storage.** As regras são combinadas com OU: um
`allow read: if true` recursivo não pode ser retirado por uma regra mais
específica depois. Enquanto existisse, qualquer cliente anônimo listaria o bucket
inteiro — inclusive as fotos dos encontros.

**`matches` é escrito só pela função.** `allow write: if false` no cliente. Se
pudesse escrever, o cache da IA viraria um campo de texto livre editável pelo
próprio interessado.

**O cruzamento por IA roda no servidor.** A chave não pode ir para o bundle e o
prompt precisa de todos os perfis de uma vez. Salvaguardas: `responseSchema` na
chamada, validação Zod na volta, descarte de `memberUid` que não está na lista
enviada, nome e empresa reescritos a partir do perfil real, e intervalo mínimo de
3 minutos por membro. Detalhes em `docs/ia-gemini.md`.

## Convenções

**Ambiente lido em um ponto só.** `src/config/env.ts` parseia `import.meta.env`
com Zod uma vez e exporta o resultado tipado. `import.meta.env.VITE_X` não
aparece em nenhum outro arquivo, e o padrão `|| ''` está banido: uma variável
faltando estoura no boot, com o nome dela, em vez de virar string vazia e falhar
três telas adiante. Cada variável é lida explicitamente na função `readRawEnv`
porque o Vite só inlina acessos estáticos.

**O ambiente local roda em um projeto `demo-`.** `pnpm emulators:start` sobe com
`demo-manualdedonos-rj`; o prefixo faz o firebase-tools pular toda chamada a
produção, então o repositório clonado funciona sem projeto criado e sem
`firebase login`. O `VITE_FIREBASE_PROJECT_ID` do `.env` tem que ser o mesmo
valor — cada projeto é um namespace separado dentro do emulador, e divergir faz
o app ler um banco vazio sem erro nenhum. Para apontar ao projeto real:
`FIREBASE_PROJECT=seu-projeto pnpm emulators:start`.

**Segredos nunca levam prefixo `VITE_`.** Tudo que é `VITE_*` está compilado no
bundle público. Segredo mora em `functions/.env` (dev) ou no Secret Manager
(produção).

**Erro é diferente de vazio.** Toda tela que lê dados ramifica em `error` **antes**
de tratar lista vazia como "não há nada aqui". Uma agenda vazia porque a leitura
caiu e uma agenda vazia porque não há encontros pedem ações opostas de quem está
olhando. `useAsyncResource` expõe `loading`, `error` e `reload`; a renderização
do erro é sempre `<ResourceError onRetry={…} />`.

**Documento fora do schema é descartado, não quebra a tela.** Os `*.service.ts`
validam com `safeParse`, registram o problema no console e filtram o documento.

**Locale e fuso vêm de `src/config/locale.ts`.** O ESLint proíbe os literais
`'pt-BR'` e `'America/Sao_Paulo'` em qualquer outro arquivo.

**Datas via `src/helpers/date.ts`.** Nenhum componente chama `dayjs().format()`
direto; o fuso tem que estar aplicado.

**Serviços são objetos singleton.** `eventService`, `memberService`, etc. Cada um
concentra o acesso a uma coleção. Componente não importa `collection`/`doc` do
Firestore.

**Nomes de arquivo em kebab-case.** Imposto pelo ESLint.

**Tipos com `type`, não `interface`.** Imposto pelo ESLint.

**Cores só por token.** Definidos em `src/index.css` (`@theme` + variáveis em
`:root`, com tema escuro). Componentes usam as classes Tailwind geradas ou
`var(--surface-raised)` e afins — nunca um hex solto.

**Três contextos de superfície, e o componente não escolhe entre eles.** O
sistema é de cartaz: parede verde (`forest`), papel branco por cima, tipo preto
pesado e mostarda de acento. A raiz vale para quem está sobre a parede;
`.surface-card` vale para o papel; `.surface-ink` para a barra preta do
cabeçalho e do rodapé. Cada um **redeclara** `--text-strong`, `--text-muted`,
`--border-subtle` e `--surface-sunken`, e os filhos herdam. É por isso que
`text-muted` e `bg-[var(--surface-sunken)]` funcionam iguais nos três lugares
sem variante por fundo — e por isso nada de cor de texto fixa dentro de um
cartão. Quem põe papel branco no meio da parede por conta própria (um chip
ativo, por exemplo) fica com o texto branco do contexto de fora: use o acento
em vez de inventar a exceção.

**Duas fontes, dois papéis.** `--font-sans` (Archivo) é texto e interface;
`--font-display` (Archivo Black) é título, botão, etiqueta e a assinatura do
cabeçalho, sempre via `.display-type` (caixa alta, entreletra fechada) ou
`.eyebrow` (etiqueta miúda espaçada). Archivo Black só existe no peso 400 —
`font-synthesis-weight: none` está ligado no `body` para que ninguém engorde o
traço por engano; não combine `font-bold` com `display-type`. Brezo, a
referência do desenho, é licenciada e não entra no repositório.

**Contraste do acento muda com o fundo.** `--accent` é o bloco de mostarda;
`--accent-text` é a mesma mostarda ajustada para ser lida — clara sobre o verde
e sobre o preto, `mustard-700` sobre o papel branco. Texto e ícone em mostarda
usam `text-accent`, nunca `text-mustard-400` direto, ou o tom certo de um fundo
vira ilegível no outro.

## Rotas

| Rota                    | Acesso      | Tela                          |
| ----------------------- | ----------- | ----------------------------- |
| `/`                     | pública     | apresentação ou painel da turma |
| `/entrar`               | pública     | login e cadastro              |
| `/aguardando-liberacao` | autenticado | espera pela aprovação         |
| `/agenda`               | membro      | lista de encontros            |
| `/agenda/:eventId`      | membro      | detalhe + presença + fotos    |
| `/confirmar-presenca`   | membro      | próximo encontro              |
| `/mural`                | membro      | mural de fotos                |
| `/vitrine`              | membro      | serviços entre membros        |
| `/conexoes`             | membro      | cruzamento com IA             |
| `/membros`              | membro      | diretório                     |
| `/perfil`               | membro      | edição do próprio perfil      |
| `/admin`                | admin       | encontros, membros, presenças |

## CI/CD

- `ci.yml` — lint + build em todo PR e push em `main`
- `firebase-preview-pr.yml` — canal de preview por PR (só hosting)
- `firebase-deploy-main.yml` — deploy de produção ao mergear em `main`

Configuração em `docs/deploy-github-actions.md`.

## Documentação

| Assunto                  | Arquivo                         |
| ------------------------ | ------------------------------- |
| Instalação e uso         | `README.md`                     |
| Deploy automático        | `docs/deploy-github-actions.md` |
| Modelo de dados e regras | `docs/modelo-de-dados.md`       |
| Cruzamento com IA        | `docs/ia-gemini.md`             |
