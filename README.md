# Hub - Central de Produtos 🚀

Portal central para gerenciamento de acesso a múltiplos produtos.

## Funcionalidades

- 🔐 **Autenticação**: Login com Google OAuth (Supabase Auth)
- 🎫 **Códigos de Ativação**: Usuários inserem códigos para liberar produtos
- 📦 **Catálogo de Produtos**: Visualização de produtos disponíveis
- 🔗 **Redirecionamento JWT**: Acesso seguro aos produtos via token

## Produtos Integrados

| Produto | Status | Descrição |
|---------|--------|-----------|
| Festa Mágica | ✅ Ativo | Kits de festa infantil com IA |
| Produto 2 | 🔜 Em breve | Placeholder |
| Produto 3 | 🔜 Em breve | Placeholder |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **JWT**: jose

## Início Rápido

### 1. Instalar dependências

```bash
cd hub
npm install
```

### 2. Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute o schema SQL em `supabase/schema.sql`
3. Copie as credenciais para `.env.local`

### 3. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (URL do Hub, ex: http://localhost:3001)
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (mesmo secret usado nos produtos)
- `FESTA_MAGICA_URL` (URL do Festa Mágica)
- `HOTMART_HOTTOK` (token enviado no header `X-HOTMART-HOTTOK`)

### 4. Gerar códigos de ativação

No SQL Editor do Supabase:
```sql
SELECT * FROM generate_activation_codes('festa-magica', 10);
```

### 5. Executar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3001

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/           # Login e registro
│   ├── dashboard/        # Dashboard principal
│   └── api/
│       ├── auth/         # Endpoints de autenticação
│       └── products/     # Ativação e redirecionamento
├── components/ui/        # Componentes base
├── lib/
│   ├── supabase/         # Cliente Supabase
│   ├── products.ts       # Catálogo de produtos
│   ├── jwt.ts            # Geração de tokens
│   └── utils.ts          # Utilitários
├── stores/               # Zustand
└── types/                # TypeScript interfaces
```

## Fluxo de Ativação

```
1. Usuário faz login no Hub
2. Insere código de ativação (ex: FM-XXXX-XXXX-XXXX)
3. Sistema valida código e ativa produto
4. Usuário clica em "Acessar"
5. Hub gera JWT e redireciona para o produto
6. Produto valida JWT e cria sessão local
```

## API Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/google` | GET | Iniciar login com Google |
| `/api/auth/callback` | GET | Callback do OAuth |
| `/api/auth/verify` | GET | Verificar sessão |
| `/api/auth/logout` | POST | Logout |
| `/api/products/activate` | POST | Ativar código |
| `/api/products/redirect` | GET | Redirecionar para produto |
| `/api/webhooks/hotmart` | POST | Receber eventos de compra Hotmart |
| `/api/admin/hotmart/mappings` | GET/POST/PUT/DELETE | Gerenciar mapeamento Hotmart `product.ucode` -> `products.id` |

## Integração Hotmart (Webhook) - Scaffold

### Migração

Execute no Supabase:

- `supabase/migrations/003_hotmart_webhook_scaffold.sql`

Essa migração cria:

- `hotmart_product_mappings`
- `hotmart_webhook_events`
- `hotmart_grants`

### Fluxo automático implementado

1. Hotmart envia evento para `/api/webhooks/hotmart`
2. Hub valida `X-HOTMART-HOTTOK`
3. Hub grava payload bruto em `hotmart_webhook_events` (idempotência por `hotmart_event_id`)
4. Hub resolve o produto por `data.product.ucode` em `hotmart_product_mappings`
5. Hub encontra/cria usuário por email do comprador (`data.buyer.email`)
6. Hub concede ou revoga acesso no `user_products` conforme evento

### Eventos considerados no scaffold

- Concede acesso: `PURCHASE_APPROVED`, `PURCHASE_COMPLETE`
- Revoga acesso: `PURCHASE_CANCELED`, `PURCHASE_REFUNDED`, `PURCHASE_CHARGEBACK`, `PURCHASE_EXPIRED`
- Ignora (sem mudança de acesso): `PURCHASE_DELAYED`, `PURCHASE_BILLET_PRINTED`, `PURCHASE_PROTEST`

### Importante para produção

- Configure mapeamentos de produto antes de ativar o webhook no Hotmart.
- Use HTTPS e monitore a tabela `hotmart_webhook_events` para falhas.
- Eventos desconhecidos ficam como `ignored` (não quebram o endpoint).

## Painel Admin

Admins podem gerenciar produtos diretamente pelo painel web.

### Configurar Admins

Edite `src/lib/admin.ts` e adicione os emails dos administradores:

```typescript
const ADMIN_EMAILS: string[] = [
  'seu-email@gmail.com',
  'outro-admin@gmail.com',
];
```

### Acessar Painel Admin

1. Faça login com um email de admin
2. Clique no botão "Admin" no header
3. Gerencie produtos (criar, editar, excluir)

### Funcionalidades do Admin

- ✅ Criar novos produtos
- ✅ Editar produtos existentes
- ✅ Ativar/desativar produtos
- ✅ Configurar acesso vitalício
- ✅ Gerenciar recursos/features

## Adicionando Novos Produtos

### Via Painel Admin (Recomendado)

1. Acesse `/admin` com uma conta de admin
2. Clique em "Novo Produto"
3. Preencha os campos e salve

### Via SQL (Alternativo)

```sql
INSERT INTO products (id, name, description, icon_name, url, duration_months, is_lifetime, features, active)
VALUES (
  'novo-produto',
  'Novo Produto',
  'Descrição do produto',
  'sparkles',
  'https://seu-produto.vercel.app',
  3,
  FALSE,
  '["Feature 1", "Feature 2"]'::jsonb,
  TRUE
);
```

## Acesso Vitalício

Produtos podem ser configurados como vitalícios:

- No painel admin, marque "Acesso Vitalício"
- Usuários com acesso vitalício não têm data de expiração
- Exibido como "∞ Vitalício" na interface

