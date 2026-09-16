# Deploy automático com GitHub Actions

Como configurar o repositório para que **todo push aceito em `main` publique
sozinho no Firebase**, sem ninguém rodar `firebase deploy` da própria máquina.

Se você seguir este documento do início ao fim, ao final terá:

- um PR que roda lint e build antes de poder ser mergeado;
- uma URL de preview por PR, para revisar a tela e não só o diff;
- um deploy de produção disparado pelo merge em `main`.

---

## Índice

1. [O que já vem pronto no repositório](#1-o-que-já-vem-pronto-no-repositório)
2. [Por que uma service account](#2-por-que-uma-service-account)
3. [Criar a service account](#3-criar-a-service-account)
4. [Cadastrar os secrets no GitHub](#4-cadastrar-os-secrets-no-github)
5. [O segredo do Gemini](#5-o-segredo-do-gemini)
6. [Proteger o branch main](#6-proteger-o-branch-main)
7. [Primeiro deploy](#7-primeiro-deploy)
8. [Quando algo falha](#8-quando-algo-falha)
9. [Anatomia do workflow](#9-anatomia-do-workflow)

---

## 1. O que já vem pronto no repositório

Três workflows, em `.github/workflows/`:

| Arquivo                    | Dispara em                    | O que faz                                                                            |
| -------------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| `ci.yml`                   | todo PR e todo push em `main` | lint, compila as functions e faz o build do frontend com valores de placeholder      |
| `firebase-preview-pr.yml`  | abertura/atualização de PR    | publica o PR em um canal temporário do Hosting, com URL própria e validade de 7 dias |
| `firebase-deploy-main.yml` | push em `main`                | lint → build → deploy de hosting, regras, índices e Cloud Functions                  |

Nada disso funciona antes de os secrets existirem. É o que os passos a seguir
resolvem.

## 2. Por que uma service account

O GitHub Actions não tem como fazer `firebase login` — não há ninguém para
clicar em "autorizar". A autenticação precisa ser não interativa, e a forma
oficial é uma **service account**: uma identidade do Google Cloud que existe
para robôs, com uma chave em JSON e apenas as permissões que você conceder.

Guardar essa chave como _secret_ do GitHub significa que ela fica cifrada, nunca
aparece nos logs e não é exposta a workflows de PRs vindos de forks.

> ⚠️ A chave em JSON é o equivalente a uma senha de administrador do projeto.
> Ela nunca entra no repositório — o `.gitignore` já bloqueia
> `service-account.json` e `*-firebase-adminsdk-*.json`. Se vazar, revogue
> imediatamente em **IAM e administrador → Contas de serviço → Chaves**.

### Atalho, se você só for publicar o site

Se por enquanto o deploy for **só de hosting** (sem functions nem regras), o
Firebase CLI monta tudo sozinho:

```bash
firebase init hosting:github
```

Ele cria a service account, gera a chave, cadastra o secret no GitHub e escreve
os workflows. Depois disso, pule para a [seção 4](#4-cadastrar-os-secrets-no-github)
e cadastre apenas as variáveis `VITE_*`, que o assistente não conhece.

O atalho **não basta** para este projeto se você for publicar as Cloud Functions
e as regras pela pipeline, porque a conta criada por ele recebe permissão só de
Hosting. Nesse caso siga a seção 3.

## 3. Criar a service account

### 3.1 Pelo console

1. Console do Google Cloud → **IAM e administrador → Contas de serviço**
   (confira no topo que o projeto selecionado é o certo).
2. **Criar conta de serviço**
   - Nome: `github-actions-deploy`
   - Descrição: `Deploy automático a partir do branch main`
3. Em **Conceder acesso**, adicione os papéis da tabela abaixo.
4. Criada a conta, abra-a → aba **Chaves** → **Adicionar chave → Criar nova
   chave → JSON**. O arquivo baixa uma única vez.

### 3.2 Papéis necessários

| Papel                         | ID                                        | Para quê                                                                      |
| ----------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| Firebase Admin                | `roles/firebase.admin`                    | Hosting, regras do Firestore e do Storage, índices                            |
| Cloud Functions Admin         | `roles/cloudfunctions.admin`              | publicar as Cloud Functions                                                   |
| Usuário da conta de serviço   | `roles/iam.serviceAccountUser`            | necessário junto com o anterior — a função roda _como_ outra conta de serviço |
| Administrador do Cloud Run    | `roles/run.admin`                         | functions de 2ª geração rodam sobre o Cloud Run                               |
| Editor do Cloud Build         | `roles/cloudbuild.builds.editor`          | é o Cloud Build que compila a imagem da função                                |
| Gravador do Artifact Registry | `roles/artifactregistry.writer`           | onde a imagem compilada é armazenada                                          |
| Acessador de secrets          | `roles/secretmanager.secretAccessor`      | vincular a `GEMINI_API_KEY` à função                                          |
| Consumidor do Service Usage   | `roles/serviceusage.serviceUsageConsumer` | habilitar APIs sob demanda no deploy                                          |

> A documentação do Firebase é explícita quanto ao par **Cloud Functions Admin +
> Service Account User**: nenhum dos dois sozinho publica uma função HTTP.
> Os quatro papéis seguintes existem porque uma função de 2ª geração é, por
> baixo, um serviço do Cloud Run construído pelo Cloud Build — um deploy que
> falha com `PERMISSION_DENIED` em `run.googleapis.com` ou
> `artifactregistry.googleapis.com` está sentindo falta deles.

### 3.3 Pelo gcloud (equivalente, e mais rápido de auditar)

```bash
PROJETO="manualdedonos-rj"          # seu Project ID
CONTA="github-actions-deploy"
EMAIL="${CONTA}@${PROJETO}.iam.gserviceaccount.com"

gcloud config set project "$PROJETO"

gcloud iam service-accounts create "$CONTA" \
  --display-name="Deploy automático via GitHub Actions"

for PAPEL in \
  roles/firebase.admin \
  roles/cloudfunctions.admin \
  roles/iam.serviceAccountUser \
  roles/run.admin \
  roles/cloudbuild.builds.editor \
  roles/artifactregistry.writer \
  roles/secretmanager.secretAccessor \
  roles/serviceusage.serviceUsageConsumer
do
  gcloud projects add-iam-policy-binding "$PROJETO" \
    --member="serviceAccount:${EMAIL}" \
    --role="$PAPEL" \
    --condition=None \
    --quiet
done

# Gera a chave. Este arquivo é o conteúdo do secret FIREBASE_SERVICE_ACCOUNT.
gcloud iam service-accounts keys create ./service-account.json \
  --iam-account="$EMAIL"
```

Confira o resultado antes de seguir:

```bash
gcloud projects get-iam-policy "$PROJETO" \
  --flatten="bindings[].members" \
  --filter="bindings.members:${EMAIL}" \
  --format="table(bindings.role)"
```

## 4. Cadastrar os secrets no GitHub

No repositório: **Settings → Secrets and variables → Actions**.

### 4.1 Secrets (aba _Secrets_ → _New repository secret_)

| Nome                                | Valor                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT`          | o **conteúdo inteiro** do `service-account.json`, incluindo as chaves `{ }` |
| `FIREBASE_PROJECT_ID`               | o Project ID, ex.: `manualdedonos-rj`                                       |
| `VITE_FIREBASE_API_KEY`             | do `firebaseConfig`                                                         |
| `VITE_FIREBASE_AUTH_DOMAIN`         | do `firebaseConfig`                                                         |
| `VITE_FIREBASE_PROJECT_ID`          | do `firebaseConfig`                                                         |
| `VITE_FIREBASE_STORAGE_BUCKET`      | do `firebaseConfig`                                                         |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | do `firebaseConfig`                                                         |
| `VITE_FIREBASE_APP_ID`              | do `firebaseConfig`                                                         |
| `VITE_FIREBASE_MEASUREMENT_ID`      | do `firebaseConfig` (opcional)                                              |
| `VITE_APP_URL`                      | URL pública final, ex.: `https://manualdedonos-rj.web.app`                  |

Para colar o JSON:

```bash
# macOS
pbcopy < service-account.json
# Linux
xclip -selection clipboard < service-account.json
```

Cole o conteúdo **sem reformatar** — uma quebra de linha a mais e a
autenticação falha com "invalid JWT signature", um erro que não diz nada sobre
a verdadeira causa.

Depois de cadastrar, apague a cópia local:

```bash
rm service-account.json
```

> **Por que as `VITE_*` são secrets se são públicas?**
> Não é sigilo, é conveniência: o GitHub não tem um cofre "semi-público", e
> mantê-las no mesmo lugar evita ter a configuração do Firebase espalhada entre
> secrets e o YAML. Elas continuam sendo compiladas no bundle e legíveis por
> qualquer visitante — é assim que o Firebase Web funciona.

### 4.2 Variável opcional (aba _Variables_)

| Nome               | Valor padrão         | Para quê                                                                   |
| ------------------ | -------------------- | -------------------------------------------------------------------------- |
| `FUNCTIONS_REGION` | `southamerica-east1` | região das functions; o workflow usa esse padrão se a variável não existir |

Esta região precisa ser **a mesma** em que as funções foram implantadas. Se
divergir, o navegador tenta chamar um endpoint que não existe — e reporta o 404
resultante como erro de CORS, o que manda qualquer um investigar o lado errado
do problema.

## 5. O segredo do Gemini

A `GEMINI_API_KEY` **não** entra nos secrets do GitHub. Ela vive no Secret
Manager do próprio projeto, e a função a lê em tempo de execução:

```bash
firebase functions:secrets:set GEMINI_API_KEY
# cole a chave quando pedir
```

A diferença importa. Um secret do GitHub estaria disponível durante o build, e
qualquer alteração no workflow poderia imprimi-lo. No Secret Manager, o valor só
é materializado dentro da função que o declara em `secrets: [...]` — está assim
em `functions/src/matchmaking/suggest-business-matches.ts`.

Para trocar a chave depois, rode o mesmo comando: ele cria uma nova versão, e o
próximo deploy passa a usá-la.

## 6. Proteger o branch main

Sem isso, "deploy ao dar push em main" quer dizer literalmente qualquer push —
inclusive um direto, sem revisão. Em **Settings → Branches → Add branch
protection rule**, para `main`:

- ☑ **Require a pull request before merging** (1 aprovação)
- ☑ **Require status checks to pass** → selecione o check **`Lint e build`**
- ☑ **Require branches to be up to date before merging**
- ☑ **Do not allow bypassing the above settings**

### Aprovação manual antes de publicar (opcional)

O workflow de produção declara `environment: production`. Em **Settings →
Environments → New environment → `production`**, marque **Required reviewers** e
escolha quem aprova. A partir daí, o merge em `main` deixa o deploy _pausado_
esperando um clique — útil quando a turma está em aula e ninguém quer o site
mudando no meio do encontro.

## 7. Primeiro deploy

```bash
git checkout -b configura-deploy
git add .github/ docs/
git commit -m "ci: deploy automático no Firebase ao mergear em main"
git push -u origin configura-deploy
```

Abra o PR. Você deve ver:

1. o check **`Lint e build`** rodando;
2. um comentário do bot com a **URL de preview**.

Ao mergear, acompanhe em **Actions → Deploy para o Firebase (main)**. Ao final,
o site está em `https://SEU_PROJECT_ID.web.app`.

### O que o deploy publica

```
--only hosting,firestore:rules,firestore:indexes,storage,functions
```

O `--only` é deliberado: sem ele, `firebase deploy` tentaria publicar toda a
configuração do projeto, incluindo produtos que este repositório não gerencia.

E o preview de PR publica **somente hosting**. Regras e functions são únicas por
projeto — um canal de preview que as sobrescrevesse estaria alterando produção
antes de o PR ser aprovado.

## 8. Quando algo falha

| Sintoma no log                                                                  | Causa provável                                                              | Correção                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Failed to authenticate, have you run firebase login?`                          | secret `FIREBASE_SERVICE_ACCOUNT` ausente, com JSON truncado ou reformatado | recadastre colando o arquivo inteiro                                                                                                                                                                           |
| `HTTP Error: 403, The caller does not have permission`                          | faltam papéis na service account                                            | revise a [seção 3.2](#32-papéis-necessários)                                                                                                                                                                   |
| `PERMISSION_DENIED` em `run.googleapis.com` / `artifactregistry.googleapis.com` | papéis de 2ª geração ausentes, ou APIs não habilitadas                      | conceda `run.admin`, `cloudbuild.builds.editor`, `artifactregistry.writer`; habilite as APIs uma vez com `gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com` |
| `Error: Failed to load function definition`                                     | as functions não compilaram                                                 | rode `pnpm func:build` localmente e corrija o TypeScript                                                                                                                                                       |
| `Secret GEMINI_API_KEY not found`                                               | o segredo não existe no projeto                                             | `firebase functions:secrets:set GEMINI_API_KEY`                                                                                                                                                                |
| O site publica, mas abre em branco                                              | as `VITE_*` não estavam definidas **no passo de build**                     | elas precisam estar no `env:` do passo _Build do frontend_; defini-las no passo de deploy não tem efeito, o JS já foi gerado                                                                                   |
| O preview não roda em PR de fora                                                | é o comportamento esperado                                                  | PRs de forks não recebem secrets; o workflow já se autodesativa nesse caso                                                                                                                                     |
| Dois deploys ao mesmo tempo                                                     | dois merges seguidos                                                        | já tratado pelo bloco `concurrency`; o segundo espera o primeiro terminar                                                                                                                                      |

Para reproduzir o deploy localmente, com a mesma credencial:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
pnpm run build
firebase deploy --project SEU_PROJECT_ID \
  --only hosting,firestore:rules,firestore:indexes,storage,functions \
  --non-interactive
```

## 9. Anatomia do workflow

Trecho comentado de `.github/workflows/firebase-deploy-main.yml`:

```yaml
on:
  push:
    branches: [main]        # só main. Nenhum outro branch publica.

concurrency:
  group: firebase-deploy-production
  cancel-in-progress: false # dois merges seguidos publicam em fila, não em paralelo
```

Sem `concurrency`, dois merges próximos disparam dois deploys simultâneos e
**vence o que terminar por último** — que não é necessariamente o commit mais
novo. Com `cancel-in-progress: false`, o segundo espera: cancelar um deploy pela
metade é pior do que atrasá-lo.

```yaml
      - name: Build do frontend
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          # … demais VITE_*
        run: pnpm run build
```

As variáveis estão no passo de **build**, não no de deploy. O Vite substitui
cada `import.meta.env.VITE_X` pelo valor literal durante a compilação; uma
variável definida depois disso não chega a lugar nenhum, e o resultado é um site
que sobe normalmente e abre em branco.

```yaml
      - name: Autenticar no Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
```

Essa action escreve a credencial em um arquivo temporário e exporta
`GOOGLE_APPLICATION_CREDENTIALS`. O `firebase-tools` lê essa variável sozinho —
por isso o passo de deploy não precisa de `--token`, que além de tudo está
descontinuado.

---

## Resumo

```
push em main
   │
   ├─ ci.yml ─────────────── lint + build (também roda em todo PR)
   │
   └─ firebase-deploy-main.yml
         ├─ instala dependências (frontend + functions)
         ├─ lint
         ├─ build do frontend com as VITE_* dos secrets
         ├─ compila as Cloud Functions
         ├─ autentica com a service account
         └─ firebase deploy --only hosting,firestore:rules,firestore:indexes,storage,functions
```
