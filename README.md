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

## Status (19/11/2026, v0.1)
Pronto: vitrine (home com banners, categorias, busca, produto com cor/tamanho), cálculo de frete e prazo.
Falta: sacola, checkout (Appmax), conta da cliente, pedido no Bling, trocas (TroqueCommerce), fotos no R2, SEO/sitemap.
