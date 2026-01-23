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

## Adicionando Novos Produtos

1. Edite `src/lib/products.ts`:
```typescript
{
  id: 'novo-produto',
  name: 'Novo Produto',
  description: 'Descrição',
  icon: '🎯',
  color: 'blue',
  url: process.env.NOVO_PRODUTO_URL || 'http://localhost:3002',
  price: 39.90,
  duration_months: 3,
  features: ['Feature 1', 'Feature 2'],
  active: true,
}
```

2. Adicione a URL no `.env.local`:
```
NOVO_PRODUTO_URL=http://localhost:3002
```

3. Gere códigos de ativação:
```sql
SELECT * FROM generate_activation_codes('novo-produto', 10);
```

4. Configure o produto para aceitar JWT do Hub (mesmo `JWT_SECRET`)

## Licença

Projeto privado - Todos os direitos reservados.
