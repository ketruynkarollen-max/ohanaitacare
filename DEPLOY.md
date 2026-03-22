# Deploy do sistema — rodar sem problemas

O sistema está configurado para **PostgreSQL** + **Vercel**. Siga os passos abaixo.

---

## 1. Criar o banco PostgreSQL (gratuito)

Escolha **uma** das opções:

### Opção A — Supabase (recomendado)

1. Acesse [supabase.com](https://supabase.com), crie um projeto e anote a **senha** do banco.
2. Vá em **Project Settings** → **Database**.
3. Em **Connection string**, escolha o formato **URI**.
4. Copie a string e substitua `[YOUR-PASSWORD]` pela senha do banco.

5. No `.env` do projeto (`restaurant/.env`), configure:
   - **`DIRECT_URL`** — sempre a conexão **direta** (host `db.<ref>.supabase.co`, porta **5432**). O Prisma usa isto em `db push` / `migrate`.
   - **`DATABASE_URL`** — pode ser a **mesma** URI que `DIRECT_URL` (mais simples). Na **Vercel**, podes usar o **Transaction pooler** (porta **6543**, com `?pgbouncer=true`) em `DATABASE_URL` para a app, mantendo `DIRECT_URL` só com a conexão direta (para builds que correm migrações).

**Importante**

- O token que começa com `sbp_` (Access Token da conta / CLI) **não** é a URL do Postgres. Não use como `DATABASE_URL`.
- Se usares **apenas** uma URI direta (5432), repete o mesmo valor em **`DATABASE_URL`** e **`DIRECT_URL`** (como no `.env.example`).

### Opção B — Vercel Postgres

1. No painel da [Vercel](https://vercel.com), vá em **Storage** → **Create Database** → **Postgres**.
2. Crie o banco e vincule ao seu projeto.
3. A Vercel preenche automaticamente a variável `POSTGRES_URL` (ou similar). Use como `DATABASE_URL` no projeto.

### Opção C — Neon

1. Acesse [neon.tech](https://neon.tech) e crie uma conta (pode usar GitHub).
2. Crie um novo projeto e copie a **connection string** da dashboard.
3. Use como `DATABASE_URL` (mantenha `?sslmode=require` se vier na string).

---

## 2. Configurar variáveis de ambiente

### No seu computador (desenvolvimento)

Na pasta `restaurant`, crie ou edite o arquivo `.env`:

```env
# Obrigatório: URL do PostgreSQL (Supabase, Neon ou Vercel Postgres)
DATABASE_URL="postgresql://postgres.[REF]:SENHA@db.[REF].supabase.co:5432/postgres"

# Se usar autenticação (NextAuth, JWT etc.), adicione as que o projeto já usa
# NEXTAUTH_SECRET=...
# NEXTAUTH_URL=http://localhost:3000
```

### Na Vercel (produção)

1. No projeto na Vercel, vá em **Settings** → **Environment Variables**.
2. Adicione:
   - **DATABASE_URL** — Postgres (ex.: pooler na Vercel, se usar).
   - **DIRECT_URL** — conexão direta Supabase `:5432` (igual à local ou só direta). Necessária para o Prisma nas migrações no build.
   - **JWT_SECRET** — string aleatória longa: `openssl rand -base64 64` (obrigatório).
   - **NEXTAUTH_SECRET** — string aleatória: `openssl rand -base64 32`.
   - **NEXTAUTH_URL** — URL do projeto (ex.: `https://ohanaitacare.vercel.app` ou seu domínio).
3. Confirme que nenhuma variável obrigatória está vazia antes do deploy.

---

## 3. Criar as tabelas no banco (primeira vez)

No seu computador, com o `.env` já configurado com `DATABASE_URL` apontando para o Postgres:

```bash
cd restaurant
npm install
npx prisma db push
```

Isso cria todas as tabelas no banco em nuvem.

(Opcional) Para popular com usuário admin e dados iniciais:

```bash
npm run db:seed
```

---

## 4. Deploy na Vercel

1. Faça push do projeto para um repositório no **GitHub** (se ainda não tiver).
2. Acesse [vercel.com](https://vercel.com) → **Add New** → **Project**.
3. Importe o repositório do GitHub.
4. **Root Directory:** se o Next.js estiver dentro de `restaurant`, defina `restaurant` como raiz.
5. **Build Command:** deixe o padrão (`npm run build`). O `package.json` já chama `prisma generate` antes do build.
6. **Environment Variables:** confira se `DATABASE_URL` (e as demais) estão preenchidas.
7. Clique em **Deploy**.

Após o deploy, a URL ficará no formato `https://seu-projeto.vercel.app`.

---

## 5. Após o primeiro deploy

- Acesse a URL do site e teste login/fluxos.
- Se usou seed, entre com `admin@restaurant.com` / `admin123` e troque a senha.
- Em **Settings** → **Domains** na Vercel você pode apontar um domínio próprio (ex.: `painel.seudominio.com.br`).

---

## Resumo do que foi alterado no projeto

- **Prisma:** banco alterado de `sqlite` para `postgresql` em `prisma/schema.prisma`.
- **Build:** o comando `npm run build` executa `prisma generate` antes do `next build`, para o Vercel gerar o Prisma Client corretamente.

Assim o sistema roda em produção **sem problemas**, com banco persistente e deploy automático a cada push.

---

## 6. Para o cliente que você vende (acesso ao sistema)

O cliente **não instala nada** no computador ou celular. O sistema roda 100% na nuvem e é acessado pelo **navegador**.

**O que você entrega ao cliente:**
- **URL do painel** — ex.: `https://brasa.vercel.app` ou um domínio que você configurou (ex.: `painel.brasa.com.br`).
- **Login e senha** — o usuário que você criou para ele (ou as credenciais que ele definiu nas configurações).

**O que o cliente faz:**
1. Abre o link no navegador (Chrome, Edge, Firefox ou Safari).
2. Informa e-mail e senha na tela de login.
3. Usa o sistema normalmente (PDV, pedidos, cozinha, relatórios, etc.).

**Recomendações para o cliente:**
- Usar **Chrome** ou **Edge** (melhor compatibilidade).
- Manter o navegador atualizado.
- Em computadores compartilhados, fazer **Sair** ao terminar.
- Acesso por celular/tablet: usar o mesmo link no navegador; o layout é responsivo.

Um resumo em uma página para você enviar ao cliente está no arquivo **ACESSO_CLIENTE.md**.
