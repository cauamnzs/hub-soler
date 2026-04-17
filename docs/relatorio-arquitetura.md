# Hub Soler — Relatório de Arquitetura

> **Data:** 17/04/2026  
> **Versão do Sistema:** 0.1.0  
> **Stack:** Next.js 15.2.4 + React 19 + TypeScript + Tailwind CSS + Supabase SSR

---

## 1. Árvore do Sistema

### 1.1 Estrutura de Rotas (App Router)

```
src/app/
├── layout.tsx                 # Root layout com ThemeProvider
├── globals.css                # Tailwind + CSS variables
├── login/
│   └── page.tsx               # Página de login (Supabase Auth)
├── (dashboard)/               # Grupo de rotas protegidas (middleware)
│   ├── layout.tsx             # Dashboard layout com sidebar
│   ├── page.tsx               # Dashboard principal (RSC + RPCs)
│   ├── trips/
│   │   ├── page.tsx           # RSC → TripsClient
│   │   ├── trips-client.tsx   # Client Component com modal
│   │   └── actions.ts         # Server Actions (createTrip, etc)
│   ├── trips/[id]/
│   │   ├── page.tsx           # RSC → TripDetailClient
│   │   └── trip-detail-client.tsx
│   ├── products/
│   │   ├── page.tsx           # RSC → ProductsClient
│   │   ├── products-client.tsx
│   │   └── actions.ts
│   ├── inventory/
│   │   ├── page.tsx           # RSC → InventoryClient
│   │   ├── inventory-client.tsx
│   │   └── actions.ts
│   ├── express-sale/
│   │   ├── page.tsx           # RSC → ExpressSaleClient
│   │   ├── express-sale-client.tsx
│   │   └── actions.ts
│   ├── integrations/
│   │   └── page.tsx           # RSC - Bling OAuth status
│   ├── expenses/
│   │   └── page.tsx           # (página existente)
│   └── settings/
│       └── page.tsx           # Configurações
└── api/
    └── bling/
        ├── auth/route.ts      # GET - Inicia OAuth flow
        ├── callback/route.ts  # GET - Recebe code, troca por token
        └── sync/route.ts      # POST - Sincroniza produtos
```

### 1.2 Componentes e Libs

```
src/components/
├── layout/
│   ├── app-sidebar.tsx        # Navegação lateral
│   └── top-bar.tsx            # Header com user menu
├── ui/                        # shadcn/ui components
│   ├── toast.tsx              # Toast notifications (context)
│   ├── button.tsx
│   ├── dialog.tsx
│   └── ...
└── theme-provider.tsx         # NextThemes provider

src/lib/
├── supabase/
│   ├── client.ts              # Browser client (singleton)
│   ├── server.ts              # Server client (cookies)
│   ├── queries.ts             # Query functions (RSC)
│   └── rpc.ts                 # Dashboard RPC wrappers
├── utils.ts                   # cn(), formatBRL(), formatDate()
├── sku.ts                     # SKU generation helpers
└── mock-data.ts               # (legacy - para remoção)
```

### 1.3 Database Schema

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `profiles` | Extensão do auth.users | ✅ |
| `categories` | Categorias de produtos (PERF, COSM, etc) | ✅ |
| `trips` | Viagens de importação (EUA/PY) | ✅ |
| `trip_expenses` | Despesas rateadas por viagem | ✅ |
| `products` | Catálogo (SKU gerado automaticamente) | ✅ |
| `inventory_batches` | Lotes de estoque com custo absorvido | ✅ |
| `bling_sync_log` | Log de sincronização Bling | ✅ |
| `express_sales` | Vendas diretas (PDV) | ✅ |
| `bling_tokens` | OAuth tokens do Bling V3 | ✅ |

### 1.4 Migrations

```
supabase/migrations/
├── 001_initial_schema.sql      # Schema base + triggers SKU + custeio
├── 002_dashboard_rpc.sql       # RPCs: get_trip_summaries, get_dashboard_kpis
├── 003_fix_trips_rls.sql       # Fix RLS + auto-profile trigger
└── 004_bling_oauth.sql         # Tabela bling_tokens
```

---

## 2. Mapa de Bugs & Gambiarras

### 2.1 CRÍTICO — Migrations Não Aplicadas

| Migration | Status | Impacto |
|-----------|--------|---------|
| `002_dashboard_rpc.sql` | ❌ Não aplicada | Dashboard mostra KPIs zerados; RPCs fallback para zeros |
| `003_fix_trips_rls.sql` | ❌ Não aplicada | Erro FK ao criar viagem (perfil não existe) |
| `004_bling_oauth.sql` | ❌ Não aplicada | Não consegue salvar tokens OAuth |

**Solução:** Rodar `supabase migration up` ou executar SQL manual no dashboard.

### 2.2 Gambiarras de Tipagem

```typescript
// Presente em vários arquivos:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const qb = supabase.from("tabela") as any;
```

**Locais afetados:**
- `src/app/(dashboard)/trips/actions.ts:49`
- `src/app/(dashboard)/products/actions.ts:54`
- `src/app/(dashboard)/inventory/actions.ts:54,76`
- `src/app/api/bling/callback/route.ts:81`
- `src/app/api/bling/sync/route.ts:152,173`

**Risco:** Perda de type safety; erros em runtime não pegos em build.

### 2.3 Configuração Incompleta — Bling OAuth

```
.env.local:
├── BLING_CLIENT_ID=❌ (não definido)
├── BLING_CLIENT_SECRET=❌ (não definido)
├── BLING_STATE=❌ (não definido)
└── BLING_API_KEY=your-bling-api-key (placeholder)
```

**Problema:** OAuth flow falha no primeiro passo; API sync usa modo mock.

### 2.4 Lógica de Retry/Antifrágil Ausente

```typescript
// src/lib/supabase/rpc.ts
if (error) {
  console.warn("RPC failed:", error.message);  // Só loga!
  return [];  // Fallback silencioso
}
```

**Problema:** Erros de rede ou schema não são tratados; usuário vê dados vazios sem saber.

### 2.5 Express Sale — Race Condition Potencial

```typescript
// express-sale-client.tsx
// 1. Chama Bling API
// 2. Se sucesso, chama createExpressSale (server action)
// Problema: Se o step 2 falhar, Bling ficou atualizado mas DB não!
```

### 2.6 Middleware — Bypass de API Routes

```typescript
// middleware.ts:44-51
if (pathname.startsWith("/api")) {
  return NextResponse.next();  // Bypass completo!
}
```

**Risco:** API routes não têm CSRF protection do middleware; autenticação deve ser feita individualmente.

### 2.7 Dashboard KPIs — Cálculo Suspeito

```sql
-- 002_dashboard_rpc.sql:116-118
net_profit_brl = sum(ib.final_price_brl * ib.qty_valid) 
                 - sum(ib.real_unit_cost_brl * ib.qty_valid)
```

**Problema:** `final_price_brl` pode ser NULL para batches pendentes; coalesce ausente.

---

## 3. Conexões Externas

### 3.1 Supabase — ✅ Configurado

```
NEXT_PUBLIC_SUPABASE_URL=https://wntkvbwmwcvavvfnyfyx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_***
```

**Status:** Funcionando (auth, queries, RLS aplicado parcialmente).

### 3.2 Bling V3 — ⚠️ Parcial

#### OAuth 2.0 Flow
```
[Hub Soler] → GET /api/bling/auth 
            → Redirect: https://www.bling.com.br/Api/v3/oauth/authorize
            ← Callback: /api/bling/callback?code=...
            → POST https://www.bling.com.br/Api/v3/oauth/token
            → Salva tokens em bling_tokens (id=1)
```

**Status:**
- ✅ Rotas implementadas
- ✅ Callback handler completo
- ❌ Env vars não configuradas
- ❌ Migration 004 não aplicada (tabela não existe)

#### API Sync (Produtos)
```
POST /api/bling/sync
Authorization: Bearer {BLING_API_KEY}  ⚠️ Usa API key legado!
```

**Problema:** Deveria usar `access_token` OAuth da tabela `bling_tokens`, mas usa `BLING_API_KEY` do .env.

**Código afetado:**
```typescript
// src/app/api/bling/sync/route.ts:64
const apiKey = process.env.BLING_API_KEY;  // Legado!
// ...
if (!apiKey) {
  return { mocked: true, ... };  // Modo mock ativado
}
```

### 3.3 Playwright E2E — ✅ Configurado

```typescript
// playwright.config.ts
// tests/e2e/auth.spec.ts
```

**Status:** Funcionando; requer `E2E_AUTH_EMAIL` e `E2E_AUTH_PASSWORD`.

---

## 4. Arquitetura — Pontos Fortes

1. **Server Components por padrão:** Todas as páginas principais são RSC que fazem data fetching server-side
2. **Pattern RSC + Client:** Lógica de dados no server, interatividade no client (boa separação)
3. **Server Actions:** Mutações diretas sem API routes intermediárias
4. **RLS Granular:** Controle de acesso por role (admin/finance/operations/marketing)
5. **Custeio por Absorção:** Implementado no banco via triggers e RPCs
6. **SKU Automático:** Trigger gera SKU no formato `SLR-[CAT]-[MODEL]-[VARIANT]`

---

## 5. Recomendações Prioritárias

| Prioridade | Ação | Impacto |
|------------|------|---------|
| 🔴 P0 | Aplicar migrations 002, 003, 004 | Sistema funcional |
| 🔴 P0 | Configurar BLING_CLIENT_ID/SECRET | Integração Bling |
| 🟡 P1 | Remover `as any` assertions | Type safety |
| 🟡 P1 | Usar bling_tokens.access_token na sync | OAuth completo |
| 🟢 P2 | Adicionar retry logic nas RPCs | Resiliência |
| 🟢 P2 | Implementar refresh token para Bling | Token não expira |

---

## 6. Referência Rápida — Comandos

```bash
# Aplicar migrations
supabase migration up

# Reset (cuidado: apaga dados)
supabase db reset

# Verificar status
supabase migration list
```

---

*Relatório gerado automaticamente a partir da análise de código.*
