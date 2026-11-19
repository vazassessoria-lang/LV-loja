# CLAUDE.md — LV Loja (loja própria da Leticia Vaz Store)

Leia também o `README.md`. Empresa: **Nicole Riccio Vaz Ltda** (LV Store). Usa **somente o Bling Nicole** —
nunca o Bling Luciana (Ateliê, outra empresa; o repositório `atelie-ecommerce` é do Ateliê, não misturar).

## Regras de ouro
- **Nunca verde** (nem botão de WhatsApp). Cores: preto/branco/cinza da loja atual; rosa `#FFA1CD` de destaque;
  erro `#e74c3c`.
- **Nunca alterar preço** pelo sistema. A loja só lê preço (Nuvemshop/Bling); quem define é o Alexandre.
- **Fuso America/Sao_Paulo.** Workers rodam em UTC: use `hojeBrt()` / `somarDiasUteis()` de `src/util.js`.
- **Enquanto em paralelo:** `LOJA_NOINDEX="1"` (noindex + robots Disallow). Só tirar na virada, com o Alexandre.
- **Rotas iguais às da Nuvemshop** (`/produtos/{handle}/`, `/{cat}/`, `/{cat}/{sub}/`). Não inventar outro padrão.
- Fotos da Nuvemshop: tamanhos `-240/-320/-480/-640-0` e o grande `-1024-1024` (o `-1024-0` NÃO existe).
- Sem segredo no repositório. Chave do painel: `env.DASHBOARD_KEY` (secret); hoje cai no padrão do
  Sistema de Produção — trocar junto com a rotação da SCHEDULER_KEY.

## Deploy (sessão do Claude na nuvem)
Branch → PR → merge na `main` (o Claude faz o merge) → GitHub Actions publica → conferir
`https://lv-loja.vazassessoria.workers.dev/health` (versão) e a página mexida.

## Antes de mexer na vitrine
Teste com o JS rodando (Playwright) no celular e no computador; `tests/servidor_local.mjs` sobe a loja local
com o catálogo real.
