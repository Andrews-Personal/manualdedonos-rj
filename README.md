# Manual de Donos — Empresários do Rio

Área de membros da master class **Manual de Donos — Empresários do Rio**: agenda
dos encontros, confirmação de presença, mural de fotos, vitrine de serviços
entre os participantes e cruzamento de oportunidades de negócio com IA.

O app inteiro é privado. Não existe página pública com conteúdo do grupo: quem
não estiver autenticado **e** liberado por um administrador não lê a agenda, não
vê as fotos e não acessa a lista de contatos.

---

## Índice

1. [O que o app faz](#1-o-que-o-app-faz)
2. [Stack](#2-stack)
3. [Pré-requisitos](#3-pré-requisitos)
4. [Instalação](#4-instalação)
5. [Rodando localmente](#5-rodando-localmente)
6. [Primeiro administrador](#6-primeiro-administrador)
7. [Publicando em produção](#7-publicando-em-produção)
8. [Guia de uso](#8-guia-de-uso)
9. [Comandos disponíveis](#9-comandos-disponíveis)
10. [Estrutura do projeto](#10-estrutura-do-projeto)
11. [Modelo de dados](#11-modelo-de-dados)
12. [Papéis e permissões](#12-papéis-e-permissões)
13. [Solução de problemas](#13-solução-de-problemas)
14. [Documentação adicional](#14-documentação-adicional)

---

## 1. O que o app faz

| Área                           | O que resolve                                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Login e controle de acesso** | Cadastro por e-mail/senha ou Google. Todo cadastro nasce pendente e só entra no grupo depois que um administrador libera.                                |
| **Agenda**                     | Datas, horário, local e tema de cada módulo da master class. Sempre no fuso de Brasília.                                                                 |
| **Confirmação de presença**    | Tela dedicada ao próximo encontro: vou / talvez / não vou, com convidados e observação. O anfitrião vê a contagem real da sala e exporta a lista em CSV. |
| **Mural de fotos**             | Registro dos encontros. Qualquer membro publica; cada um remove as próprias fotos; o admin remove qualquer uma.                                          |
| **Vitrine de serviços**        | O que cada empresa entrega e a condição especial oferecida a quem é da turma, com contato direto por WhatsApp, e-mail ou site.                           |
| **Conexões com IA**            | O Gemini lê os perfis do grupo e aponta com quem cada membro tem encaixe comercial real, com a justificativa e uma sugestão de abordagem.                |
| **Diretório de membros**       | Quem está na turma, o que oferece, o que procura e como falar com a pessoa.                                                                              |
| **Administração**              | Publicar encontros, liberar cadastros, promover administradores e acompanhar presenças.                                                                  |

## 2. Stack

| Camada    | Tecnologia                                                                  |
| --------- | --------------------------------------------------------------------------- |
| Frontend  | React 19, TypeScript 5.9, Vite 7                                            |
| Estilo    | Tailwind CSS 4, ícones Lucide                                               |
| Backend   | Firebase — Authentication, Firestore, Storage, Cloud Functions (2ª geração) |
| IA        | Gemini via `@google/genai`, executado **apenas** no servidor                |
| Validação | Zod, no frontend e nas functions                                            |
| CI/CD     | GitHub Actions → Firebase Hosting                                           |

## 3. Pré-requisitos

**Para rodar localmente** — é só isto, e não precisa de conta no Firebase:

| Item         | Versão | Observação                                                   |
| ------------ | ------ | ------------------------------------------------------------ |
| Node.js      | ≥ 22   | a versão exata está em `.nvmrc`; com nvm, `nvm use`          |
| pnpm         | ≥ 10   | `corepack enable && corepack prepare pnpm@latest --activate` |
| Firebase CLI | ≥ 13   | `npm i -g firebase-tools` — **sem** `firebase login`         |
| Java JDK     | ≥ 17   | só para os emuladores de Firestore e Storage                 |

O ambiente local sobe com um projeto de mentira (`demo-manualdedonos-rj`). O
prefixo `demo-` faz o Firebase CLI pular toda chamada a produção: dá para
desenvolver, popular dados e testar as regras antes de existir projeto nenhum.

**Para publicar**, acrescente:

| Item               | Observação                                       |
| ------------------ | ------------------------------------------------ |
| `firebase login`   | autenticação da CLI                              |
| Conta Google Cloud | com faturamento ativo (plano Blaze) — ver abaixo |

> **Por que o plano Blaze?** Cloud Functions de 2ª geração e Secret Manager não
> existem no plano Spark. A cobrança só começa acima da cota gratuita, que é
> generosa para o volume de uma turma — mas o cartão precisa estar cadastrado.
> Sem Functions, tudo funciona **menos** a página de Conexões com IA.

## 4. Instalação

### 4.1 Clonar e instalar dependências

```bash
git clone <url-do-repositório> manualdedonos-rj
cd manualdedonos-rj

nvm use                          # opcional, garante o Node 22
pnpm install                     # dependências do frontend
pnpm --prefix functions install  # dependências das Cloud Functions
```

### 4.2 Variáveis de ambiente

São **dois** arquivos, com propósitos diferentes:

```bash
cp .env.example .env                      # frontend
cp functions/.env.example functions/.env  # backend
```

**`.env` (frontend).** O arquivo de exemplo já vem preenchido para rodar com os
emuladores — não precisa mexer em nada agora:

```ini
VITE_FIREBASE_PROJECT_ID=demo-manualdedonos-rj
VITE_USE_EMULATORS=true
# … demais VITE_* com valores de placeholder
```

Nenhuma dessas chaves é validada enquanto `VITE_USE_EMULATORS=true`. Quando for
publicar, troque pelos valores reais — o próprio `.env.example` traz o bloco do
**Cenário B** comentado, com o passo a passo.

> ⚠️ **Tudo que começa com `VITE_` é compilado dentro do JavaScript público** e
> pode ser lido por qualquer visitante. Mesmo com o projeto real, esses são
> identificadores públicos por design — quem protege os dados são as regras do
> Firestore, não o sigilo da API key. **Nenhum segredo vai neste arquivo.**

> O `VITE_FIREBASE_PROJECT_ID` precisa bater **exatamente** com o projeto com
> que os emuladores sobem. Se divergir, o app conversa com um namespace
> diferente do que o seed populou: tudo carrega vazio, sem erro nenhum.

**`functions/.env` (backend).** Aqui sim mora um segredo:

```ini
GEMINI_API_KEY=sua-chave-do-google-ai-studio
GEMINI_MODEL=gemini-2.5-flash
```

Gere a chave em [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
Este arquivo nunca é versionado e nunca chega ao navegador. Sem ele, tudo
funciona menos a página de Conexões com IA.

**Pronto.** Para desenvolver, pule para a [seção 5](#5-rodando-localmente). Os
passos abaixo só são necessários quando você for publicar.

### 4.3 Criar o projeto no Firebase

No [console do Firebase](https://console.firebase.google.com):

1. **Criar projeto** — anote o _Project ID_ (ex.: `manualdedonos-rj`).
2. **Faturamento** — mude para o plano **Blaze**.
3. **Authentication → Sign-in method** — habilite **E-mail/senha** e **Google**.
4. **Firestore Database** — crie no modo **produção**, região `southamerica-east1`.
5. **Storage** — crie o bucket, mesma região.
6. **Configurações do projeto → Seus apps → Web (`</>`)** — registre um app e
   copie o objeto `firebaseConfig`. É com esses valores que você preenche o
   Cenário B do `.env`.

Aponte o repositório para o seu projeto:

```bash
firebase login
firebase use --add   # escolha o projeto e dê o apelido "default"
```

Ou edite `.firebaserc` diretamente — ele já traz dois apelidos: `default`
(produção) e `demo` (o projeto de mentira dos emuladores).

### 4.4 Publicar regras e índices

```bash
pnpm run deploy:rules
```

## 5. Rodando localmente

O ambiente local usa os **emuladores do Firebase** com o projeto
`demo-manualdedonos-rj`. Nada toca produção — na verdade, nada nem sequer
_existe_ em produção nesse momento: o prefixo `demo-` faz a CLI pular qualquer
chamada externa, então isto funciona sem projeto criado e sem `firebase login`.

Em dois terminais:

```bash
# Terminal 1 — emuladores (Auth, Firestore, Storage, Functions, Hosting)
pnpm emulators:start

# Terminal 2 — servidor de desenvolvimento
pnpm dev
```

Abra <http://localhost:5173>. O painel dos emuladores fica em
<http://localhost:4000>.

Os dados são exportados para `./seed-data` ao encerrar (Ctrl-C) e reimportados
na próxima subida, então o que você cadastrar sobrevive ao restart. Para
começar do zero, `pnpm emulators:clean`.

Para apontar os emuladores ao ID do projeto real em vez do demo:

```bash
FIREBASE_PROJECT=seu-projeto pnpm emulators:start
```

Nesse caso ajuste também o `VITE_FIREBASE_PROJECT_ID` do `.env` — os dois
precisam ser o mesmo.

### Popular com dados de demonstração

Com os emuladores no ar, em um terceiro terminal:

```bash
pnpm seed:dev-data
```

Isso cria uma turma fictícia — 6 empresários com perfis completos, 4 encontros
(dois já realizados, dois futuros), confirmações de presença variadas e 4
anúncios na vitrine. Os perfis são plausíveis de propósito: são eles que fazem
o cruzamento por IA devolver algo verificável em vez de generalidades.

| Login                        | Papel      |
| ---------------------------- | ---------- |
| `admin@manualdedonos.com.br` | SuperAdmin |
| `carlos@friopremium.com.br`  | Membro     |
| `juliana@sabordacasa.com.br` | Membro     |
| `rafael@contafacil.com.br`   | Membro     |
| `marina@pulsodigital.com.br` | Membro     |
| `pedro@embalarj.com.br`      | Membro     |

Senha de todos: `Donos@2026`

> O mural começa vazio — fotos precisam ser enviadas pela interface, porque
> passam por compressão no navegador antes do upload.

### Conferir as regras de segurança

```bash
pnpm test:rules
```

Roda 14 verificações contra o emulador, usando tokens reais do Auth emulado:
membro aprovado lê a agenda, anônimo não lê nada, cadastro pendente não vê o
grupo, ninguém eleva o próprio papel, só admin publica encontro. Exige os
emuladores rodando e o `seed:dev-data` já executado.

## 6. Primeiro administrador

Só um administrador consegue liberar cadastros — e no projeto recém-criado não
existe nenhum. Há duas formas de quebrar esse ciclo, uma vez:

**Opção A — pelo console (mais simples).**
Cadastre-se normalmente pelo app, depois no console do Firebase abra
**Firestore → `members` → o documento com o seu uid** e edite dois campos:

```
role     → 99
approved → true
```

**Opção B — pelo script.**

```bash
# Baixe a chave em: Configurações do projeto → Contas de serviço → Gerar nova chave
export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
node scripts/bootstrap-admin.mjs voce@empresa.com.br
```

> O arquivo `service-account.json` dá poder total sobre o projeto e já está no
> `.gitignore`. Não o versione, não o suba para lugar nenhum.

A partir daí, tudo é feito pela tela **Administração → Membros**.

## 7. Publicando em produção

### 7.1 Deploy manual

```bash
pnpm run build                              # gera dist/
firebase deploy                             # tudo
# ou, separadamente:
pnpm run deploy:hosting                     # só o site
pnpm run deploy:rules                       # só regras e índices
pnpm run func:deploy                        # só as Cloud Functions
```

Antes do primeiro deploy das functions, registre o segredo do Gemini no Secret
Manager (o `functions/.env` local **não** vai junto no deploy):

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

### 7.2 Deploy automático

Todo push aceito em `main` publica sozinho, via GitHub Actions.
A configuração completa — criar a service account, cadastrar os secrets e
proteger o branch — está em
**[docs/deploy-github-actions.md](docs/deploy-github-actions.md)**.

## 8. Guia de uso

### Para o participante

1. **Entrar.** Acesse o link do grupo e crie a conta com o e-mail usado na
   inscrição da master class. O acesso fica pendente até a organização liberar
   — a tela avisa e se atualiza sozinha no momento da aprovação.
2. **Completar o perfil.** Em **Meu perfil**, preencha empresa, segmento, e
   principalmente **o que você oferece** e **o que você procura**. Escreva com
   as palavras que usaria numa conversa ("armazenagem refrigerada em Duque de
   Caxias"), não em categorias genéricas ("logística") — é esse texto que
   alimenta o cruzamento de negócios.
3. **Confirmar presença.** A tela **Confirmar presença** já abre no próximo
   encontro. Informe se vai, quantos convidados leva e qualquer observação. Dá
   para mudar a resposta até o dia.
4. **Publicar no mural.** Em **Mural de fotos**, envie até 12 imagens por vez,
   associando-as a um encontro. As fotos são comprimidas no navegador antes do
   upload — não é preciso reduzir nada antes.
5. **Divulgar um serviço.** Em **Vitrine**, publique o que sua empresa entrega e
   a condição especial para quem é do grupo. É esse benefício que diferencia a
   vitrine de um anúncio qualquer.
6. **Buscar conexões.** Em **Conexões (IA)**, rode a análise. Opcionalmente
   indique um foco ("quero fornecedores de embalagem"). O resultado traz cada
   encaixe com nota, justificativa e como puxar o assunto no próximo encontro.
   Há um intervalo mínimo de 3 minutos entre análises.

### Para a organização

1. **Liberar cadastros.** **Administração → Membros** lista os pendentes.
   "Liberar" promove Visitante → Membro. O seletor ao lado promove a Admin ou
   SuperAdmin quando necessário.
2. **Publicar encontros.** **Administração → Encontros → Novo encontro.** Data e
   hora são informadas no horário de Brasília e gravadas com o fuso explícito —
   um membro em viagem vê o mesmo horário que você.
3. **Acompanhar presenças.** **Administração → Presenças**, escolha o encontro:
   confirmados, "talvez", ausentes e o total real de pessoas na sala
   (confirmados + convidados). O botão **CSV** exporta a lista pronta para a
   portaria, já com acentuação correta no Excel.
4. **Moderar.** Administradores removem qualquer foto do mural e qualquer
   anúncio da vitrine.

## 9. Comandos disponíveis

### Desenvolvimento

```bash
pnpm dev               # servidor Vite em http://localhost:5173
pnpm emulators:start   # compila as functions e sobe os emuladores
pnpm emulators:clean   # idem, sem importar dados salvos
pnpm seed:dev-data     # popula o emulador com a turma de demonstração
```

### Qualidade

```bash
pnpm lint              # ESLint
pnpm lint:fix          # ESLint corrigindo o que dá
pnpm typecheck         # TypeScript, sem gerar arquivos
pnpm test:rules        # regras do Firestore contra o emulador
```

### Build e deploy

```bash
pnpm build             # TypeScript + Vite → dist/
pnpm func:build        # compila as Cloud Functions
pnpm deploy            # build + deploy completo
pnpm deploy:hosting    # só o site
pnpm deploy:rules      # só regras e índices do Firestore/Storage
pnpm func:deploy       # só as Cloud Functions
```

## 10. Estrutura do projeto

```
.
├── .github/workflows/          # CI e deploy automático
│   ├── ci.yml                  # lint + build em todo PR e push
│   ├── firebase-deploy-main.yml   # deploy de produção ao mergear em main
│   └── firebase-preview-pr.yml    # canal de preview por PR
├── docs/                       # documentação de apoio
├── functions/                  # Cloud Functions (backend)
│   └── src/
│       ├── config/env.ts       # segredos e região (Secret Manager)
│       ├── lib/                # Admin SDK e verificação de quem chama
│       ├── matchmaking/        # cruzamento de negócios com Gemini
│       └── index.ts            # o que é exportado para o deploy
├── scripts/
│   ├── bootstrap-admin.mjs     # promove a primeira conta a SuperAdmin
│   ├── check-rules.mjs         # testa as regras contra o emulador
│   └── seed-dev-data.mjs       # turma de demonstração
├── src/
│   ├── app/app.tsx             # rotas e providers
│   ├── components/
│   │   ├── admin/              # encontros, membros, presenças
│   │   ├── agenda/             # card de encontro, painel de presença
│   │   ├── layout/             # cabeçalho, menu, rodapé
│   │   ├── mural/              # grade e envio de fotos
│   │   ├── ui/                 # botão, card, campo, modal, estados
│   │   └── vitrine/            # card e formulário de serviço
│   ├── config/                 # env (Zod), Firebase, dayjs, locale
│   ├── context/                # sessão e perfil do membro
│   ├── helpers/                # datas, Firestore, erros
│   ├── hooks/                  # useUser, useAsyncResource
│   ├── libs/authorization/     # singleton do Firebase Auth
│   ├── pages/                  # uma tela por rota
│   ├── routes/                 # catálogo de rotas e guarda de acesso
│   ├── services/               # CRUD do Firestore e chamada das functions
│   └── types/                  # schemas Zod e tipos do domínio
├── firebase.json               # hosting, regras, emuladores
├── firestore.rules             # quem lê e escreve o quê
├── firestore.indexes.json      # índices compostos
└── storage.rules               # quem lê e escreve arquivos
```

## 11. Modelo de dados

| Coleção    | Documento         | Conteúdo                                                                                        |
| ---------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `members`  | `{uid}`           | Perfil do empresário: dados pessoais, empresa, o que oferece, o que procura, papel e aprovação. |
| `events`   | auto              | Encontros da agenda. `startsAt` é ISO 8601 **com o offset `-03:00`**.                           |
| `rsvps`    | `{eventId}_{uid}` | Confirmação de presença. O ID é derivado, não sorteado.                                         |
| `photos`   | auto              | Metadados das fotos do mural; o arquivo fica no Storage.                                        |
| `services` | auto              | Anúncios da vitrine.                                                                            |
| `matches`  | `{uid}`           | Última análise da IA para aquele membro. **Escrita só pela Cloud Function.**                    |
| `config`   | livre             | Parâmetros gerais da turma (reservado).                                                         |

Duas decisões que valem explicação:

**O ID do RSVP é `{eventId}_{uid}`.** Com um ID sorteado, o mesmo membro
confirmaria o mesmo encontro duas vezes — dois cliques, dois aparelhos — e a
contagem do anfitrião passaria a mentir. Com o ID derivado, a segunda resposta
sobrescreve a primeira. A regra do Firestore exige esse formato, então nem uma
escrita feita fora do app consegue burlar.

**`events.startsAt` carrega o fuso.** Uma data "solta" (`2026-10-15T19:30:00`) é
lida como um horário diferente em cada relógio: o Cloud Functions roda em UTC, o
navegador roda no fuso de quem está olhando. Com `-03:00` explícito, o horário é
o mesmo em todos — e, como o Brasil não tem mais horário de verão, a ordenação
alfabética da string coincide com a ordem cronológica, o que faz o
`orderBy('startsAt')` do Firestore funcionar sem nenhuma conversão.

Detalhes em **[docs/modelo-de-dados.md](docs/modelo-de-dados.md)**.

## 12. Papéis e permissões

| Papel      | Valor | Pode                                                                  |
| ---------- | ----- | --------------------------------------------------------------------- |
| Visitante  | `0`   | Nada além do próprio perfil. É o estado de todo cadastro novo.        |
| Membro     | `1`   | Tudo do grupo: agenda, presença, mural, vitrine, conexões, diretório. |
| Admin      | `90`  | Tudo acima + publicar encontros, liberar cadastros, moderar conteúdo. |
| SuperAdmin | `99`  | Tudo acima + excluir perfis.                                          |

Dois pontos de projeto:

- **O cadastro nasce pendente.** As regras do Firestore exigem `role: 0` e
  `approved: false` na criação do perfil. Enviar um payload diferente pelo SDK
  não adianta: a barreira é a regra, não o formulário.
- **O menu escondido não é segurança.** Quem esconde o link de administração é
  o layout; quem barra uma URL digitada à mão é o `ProtectedRoute`, e quem barra
  a escrita de fato são as regras do Firestore. As três camadas existem porque
  as duas primeiras podem ser contornadas pelo navegador.

## 13. Solução de problemas

**`Error: Could not start Emulator UI, port taken` (e vários "Port N is not open").**
Uma execução anterior dos emuladores ficou viva. É comum quando o terminal foi
fechado sem Ctrl-C: o processo perde o pai e continua segurando as portas.

```bash
# Ver quem está segurando
lsof -nP -iTCP:4000,4400,5001,8080,9099,9199 -sTCP:LISTEN

# Encerrar a suíte inteira (o processo pai derruba os filhos Java junto)
pkill -f "emulators:start"
```

Se algum PID sobreviver, `kill <pid>`. Depois confira que 4000, 4400, 4500,
5001, 8080, 9099, 9150 e 9199 estão livres antes de subir de novo.

**`Unable to look up project number for <projeto>`.**
A CLI tentou falar com produção. Ou você não fez `firebase login`, ou o projeto
ainda não existe. Para desenvolvimento local isso não deveria acontecer:
`pnpm emulators:start` usa `demo-manualdedonos-rj`, e o prefixo `demo-` faz a
CLI pular essas consultas. Se o aviso apareceu, é sinal de que o script foi
chamado com outro projeto (por `FIREBASE_PROJECT` no ambiente, por exemplo).

**Tudo carrega vazio no emulador, sem nenhum erro — mesmo depois do seed.**
O `VITE_FIREBASE_PROJECT_ID` do `.env` está diferente do projeto com que os
emuladores subiram. Cada projeto é um namespace separado dentro do emulador: o
app está lendo um banco vazio, que é uma resposta legítima. Os dois valores
precisam ser idênticos.

**`⚠ Unexpected rules runtime error: WARNING: ... sun.misc.Unsafe ...`.**
Ruído, não erro. É um aviso de depreciação do JDK 24+ emitido pelo runtime de
regras do Storage, que o firebase-tools classifica como erro por não reconhecer
o formato. Os emuladores sobem normalmente. Some com um JDK 17 ou 21.

**Tela branca ao rodar `pnpm dev`, com erro no console sobre variáveis de ambiente.**
Falta o `.env` (ou alguma variável dentro dele). O app valida a configuração no
boot e falha alto de propósito — é preferível a um erro confuso três telas
adiante. A mensagem lista exatamente quais variáveis faltam.

**`permission-denied` ao ler qualquer coisa.**
Seu usuário existe no Auth mas o perfil em `members` ainda não foi aprovado.
Libere em **Administração → Membros**, ou siga a [seção 6](#6-primeiro-administrador)
se ainda não houver nenhum admin.

**A página de Conexões devolve erro de indisponibilidade.**
Três causas, nesta ordem de probabilidade: a `GEMINI_API_KEY` não foi definida
(`firebase functions:secrets:set GEMINI_API_KEY`); o projeto não está no plano
Blaze; ou o `VITE_FUNCTIONS_REGION` do frontend aponta para uma região diferente
daquela onde a função foi implantada.

**O navegador reporta erro de CORS ao chamar a function.**
Quase sempre não é CORS: é um 404. O emulador serve o código **compilado** em
`functions/lib`, nunca `functions/src`. Rode `pnpm func:build` — o
`pnpm emulators:start` já faz isso, mas um `firebase emulators:start` avulso não.

**`Cannot find module` ou erro de tipos depois de trocar de branch.**
`pnpm install && pnpm --prefix functions install`.

**Os emuladores não sobem.**
Firestore e Storage precisam de Java 17+. Confira com `java -version`.

**O deploy pelo GitHub Actions falha na autenticação.**
Veja a seção de diagnóstico em
[docs/deploy-github-actions.md](docs/deploy-github-actions.md#8-quando-algo-falha).

## 14. Documentação adicional

| Assunto                                       | Arquivo                                                        |
| --------------------------------------------- | -------------------------------------------------------------- |
| Deploy automático com GitHub Actions          | [docs/deploy-github-actions.md](docs/deploy-github-actions.md) |
| Modelo de dados e regras de segurança         | [docs/modelo-de-dados.md](docs/modelo-de-dados.md)             |
| Como funciona o cruzamento de negócios com IA | [docs/ia-gemini.md](docs/ia-gemini.md)                         |
| Convenções de arquitetura e código            | [CLAUDE.md](CLAUDE.md)                                         |
