# LV Loja — loja própria da Leticia Vaz Store

Loja online própria da **Leticia Vaz Store** (Nicole Riccio Vaz Ltda, CNPJ 22.766.280/0001-86), em construção
para substituir a Nuvemshop. Roda **em paralelo** em `https://lv-loja.vazassessoria.workers.dev` (escondida do Google).

## Como funciona
- **Cloudflare Worker** (`src/index.js`) + **D1** `lv-loja-db` + arquivos fixos em `public/`.
- **Catálogo:** a cada 30 min o cron puxa do painel (`lv-dashboard` → `/api/loja/catalogo` e `/api/loja/categorias`):
  fotos, textos, variações e preço da Nuvemshop + saldo e prazo de produção do Bling Nicole. A loja só LÊ.
- **Frete:** `/api/frete` → painel `/api/loja/frete` (Correios, contrato 9912431555, preço do contrato + prazo).
  Prazo mostrado = produção (crossdocking do Bling: 0 pronta entrega, 2 sob encomenda) + Correios, em dias úteis.
  Frete grátis acima de R$ 599 na opção mais barata (regra da loja atual).
- **Rotas iguais às da loja atual:** `/produtos/{handle}/`, `/{categoria}/`, `/{categoria}/{sub}/` — virada sem perder Google.

## Rodar e testar
```bash
node --no-warnings tests/loja.test.mjs          # testes (sem rede)
node --no-warnings tests/servidor_local.mjs     # loja em http://localhost:8787 com o catálogo REAL do painel
```
Deploy: push na `main` → GitHub Actions (`.github/workflows/deploy.yml`) → `wrangler deploy`.
Sincronizar na hora: `POST /api/admin/sync` com `X-Scheduler-Key`.

## Sacola e conta (v0.2, 19/11/2026)
- **Sacola** no servidor (D1 `sacolas`, cookie `lv_sacola`, 90 dias). O navegador só manda produto/variação/quantidade;
  preço e estoque são sempre recalculados do catálogo. Logada, a sacola leva o CPF (base pro carrinho abandonado).
- **Conta por CPF** = mesma conta do LV Club (no painel: `loyalty_customers`/`loyalty_devices`). CPF → link de acesso
  no e-mail (sem senha, 1 h, uso único) → aparelho lembrado 180 dias (cookie `lv_conta`). Cliente nova: cadastro
  (CPF, nome, e-mail, celular) só vira conta depois do clique no e-mail. Conta mostra pontos do LV Club e pedidos.
- Páginas pessoais (`/carrinho/`, `/conta/`) são `private, no-store`.

## Status (19/11/2026, v0.2)
Pronto: vitrine, frete e prazo, sacola, conta da cliente por CPF.
Falta: checkout/pagamento (Appmax), pedido no Bling, trocas (TroqueCommerce), fotos no R2, SEO/sitemap, endereços salvos.
