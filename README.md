# Hub - Área de Membros

Portal central de autenticação, ativação e handoff para os produtos da Allan Fulcher (Festa Mágica, Car Studio, etc.).

## Para administradores

Este README é o ponto de partida para quem precisa operar o Hub. Aqui você encontra os primeiros passos, as variáveis de ambiente obrigatórias, as funcionalidades da página `/admin` e os fluxos mais comuns de suporte.

## Primeiros passos

1. Clone/entre na pasta do projeto:

```bash
cd hub
npm install
cp .env.local.example .env.local
```

2. Preencha `.env.local` com as credenciais (veja tabela abaixo).
3. Configure os emails de admin em `src/lib/admin.ts`.
4. Rode localmente:

```bash
npm run dev
```

Acesse `http://localhost:3001`.

## Variáveis de ambiente (`.env.local`)

### Obrigatórias para o Hub funcionar

| Variável | O que é | Exemplo / Nota |
|----------|---------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase | Começa com `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de service role | Nunca exponha no frontend. Usada nas API routes. |
| `HUB_JWT_SECRET` | Segredo compartilhado com os produtos | Deve ser igual no `.env.local` do Festa Mágica. Mínimo 32 caracteres. |
| `NEXT_PUBLIC_SITE_URL` | URL pública do Hub | `https://membros.seusite.com` |
| `FESTA_MAGICA_URL` | URL do produto Festa Mágica | `https://festamagica.com` |
| `FESTA_CALLBACK_ALLOWLIST` | Domínios permitidos para handoff | `https://festamagica.com,https://localhost:3002` |

### Opcionais / específicas por produto

| Variável | O que é | Quando usar |
|----------|---------|-------------|
| `CAR_STUDIO_URL` | URL base do Car Studio | Se o produto Car Studio estiver ativo. |
| `CAR_STUDIO_URLS` | URLs extras do Car Studio | Lista separada por vírgula. |
| `CAR_STUDIO_CALLBACK_ALLOWLIST` | Domínios permitidos para o Car Studio | Lista separada por vírgula. |
| `HOTMART_HOTTOK` | Token do header `X-HOTMART-HOTTOK` | Obrigatório se usar webhooks da Hotmart. |
| `NEXT_PUBLIC_META_PIXEL_ID` | ID do Meta Pixel | Tracking de marketing. |
| `JWT_SECRET` | Segredo antigo de produto | Legado. Prefira `HUB_JWT_SECRET`. |

## Página de admin (`/admin`)

Apenas emails listados em `src/lib/admin.ts` conseguem acessar.

### Aba **Produtos**

- Lista todos os produtos disponíveis na home.
- Cria ou edita produtos:
  - nome, slug, descrição, imagem, preço, URL do produto;
  - `modal_html`: conteúdo exibido no modal antes de redirecionar;
  - `welcome_html`: conteúdo exibido na primeira vez que o usuário acessa.
- Gera códigos de ativação individualmente ou em lote.
- Define se um produto aparece ou não para o público (`is_public`).

### Aba **Banners**

- Cria e edita slides do carrossel da home.
- Campos: imagem, título, subtítulo, link, ordem e ativo/inativo.
- Banners ativos são cacheados por 60 segundos no frontend.

### Aba **Usuários**

- Lista usuários cadastrados com paginação.
- Mostra os produtos ativos de cada usuário.
- Útil para conferir se uma compra foi ativada corretamente.

### Aba **Hotmart**

- **Mapeamentos**: liga cada `ucode` de produto Hotmart a um produto do Hub e define o modo (`access` ou `credits`).
- **Eventos**: visualiza todos os webhooks recebidos, filtra por status (`processed`, `failed`, `ignored`) e reprocessa eventos falhos.
- **Créditos**: consulta saldo de créditos e histórico de transações por usuário/produto.

## Fluxos de suporte comuns

### Como um usuário ativa um produto

1. Usuário compra no Hotmart ou recebe um código.
2. Faz login em `/login` com Google ou email/senha.
3. Na home, insere o código de ativação.
4. O sistema grava o direito em `user_products`.

### Como um usuário acessa o Festa Mágica

1. Na home, clica em "Acessar Produto" no card do Festa Mágica.
2. Se houver `modal_html`, vê o modal de introdução.
3. O Hub redireciona para o Festa com um token JWT assinado.
4. O Festa valida o token, cria o cookie `fm_session` e leva o usuário para `/criar`.

### Como acompanhar uma compra Hotmart

1. Acesse `/admin` → aba **Hotmart** → **Eventos**.
2. Procure pelo evento pela data ou email do comprador.
3. Verifique o `processing_status`:
   - `processed`: acesso/créditos já concedidos.
   - `ignored`: evento não gera acesso (ex.: boleto impresso).
   - `failed`: erro no processamento. Use o botão **Reprocessar**.
4. Se o evento estiver `processed` mas o usuário não conseguir acessar, confira a aba **Usuários**.

## Tabelas principais do banco (Supabase)

| Tabela | Propósito |
|--------|-----------|
| `hub_users` | Contas sincronizadas do Supabase Auth. |
| `user_products` | Direitos ativos/expirados/cancelados por usuário e produto. |
| `products` | Catálogo de produtos exibidos no Hub. |
| `activation_codes` | Códigos de ativação gerados no admin. |
| `banners` | Slides do carrossel da home. |
| `hotmart_product_mappings` | Ligação entre `ucode` Hotmart e produto do Hub. |
| `hotmart_webhook_events` | Todos os webhooks recebidos da Hotmart. |
| `hotmart_grants` | Histórico de concessão/revogação de acesso/créditos. |
| `user_credit_wallets` | Saldo de créditos por usuário. |
| `credit_ledger` | Log de auditoria de movimentações de crédito. |

## Segurança e boas práticas

- **Admin**: `src/lib/admin.ts` contém os emails com acesso. Altere antes de publicar em produção.
- **Handoff**: `return_to` só aceita URLs na allowlist; `redirect_to` só aceita caminhos relativos (`/criar`).
- **Sessão**: cookie `hub_session` é `httpOnly`, `secure` em produção e `sameSite=lax`.
- **Hotmart**: valide sempre `HOTMART_HOTTOK` e use HTTPS em produção.
- **Segredos**: nunca commit `.env.local`. Use `.env.local.example` como referência.

## Troubleshooting rápido

| Problema | Onde olhar | Solução comum |
|----------|-----------|---------------|
| Usuário não consegue acessar o Festa Mágica | `/admin` → Usuários | Confirme que `user_products` tem `festa-magica` ativo. |
| "Token inválido" no produto | `.env.local` do Hub e do Festa | Certifique-se de que `HUB_JWT_SECRET` é idêntico. |
| Compra Hotmart não liberou acesso | `/admin` → Hotmart → Eventos | Verifique `HOTMART_HOTTOK`, mapeamentos e reprocesse se falhou. |
| Webhook Hotmart retorna 401 | Logs do Vercel/Supabase | Confira se `HOTMART_HOTTOK` bate com o configurado no Hotmart. |
| Banners não atualizam | Tabela `banners` | Banners são cacheados por 60s; aguarde ou verifique `is_active`. |

## Stack e estrutura

- **Framework**: Next.js 16 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v4
- **Banco**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **JWT**: `jose` (HS256)

Para detalhes de arquivos, consulte os cabeçalhos de documentação em cada módulo e a documentação em `docs/`.
