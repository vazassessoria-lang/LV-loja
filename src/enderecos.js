// Enderecos da cliente (D1 da loja), presos ao CPF da conta. Ate 10 por CPF; um e o principal.
// CEP preenche rua/bairro/cidade/UF pela API CEP dos Correios (via painel /api/loja/cep).
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const MAX = 10;

export async function garantirSchemaEnderecos(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS enderecos (id INTEGER PRIMARY KEY AUTOINCREMENT, cpf TEXT NOT NULL,
    destinatario TEXT, cep TEXT, rua TEXT, numero TEXT, complemento TEXT, bairro TEXT, cidade TEXT, uf TEXT,
    principal INTEGER DEFAULT 0, criado_em TEXT DEFAULT (datetime('now')), atualizado_em TEXT DEFAULT (datetime('now')))`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_end_cpf ON enderecos(cpf)').run();
}

export async function listar(env, cpf) {
  await garantirSchemaEnderecos(env);
  const r = await env.DB.prepare('SELECT * FROM enderecos WHERE cpf=? ORDER BY principal DESC, id DESC').bind(cpf).all();
  return r.results || [];
}

const limpa = (v, max) => String(v == null ? '' : v).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

export function validar(e) {
  const d = {
    destinatario: limpa(e.destinatario, 120), cep: String(e.cep || '').replace(/\D/g, ''), rua: limpa(e.rua, 160),
    numero: limpa(e.numero, 20), complemento: limpa(e.complemento, 80), bairro: limpa(e.bairro, 80),
    cidade: limpa(e.cidade, 80), uf: limpa(e.uf, 2).toUpperCase(),
  };
  const erros = [];
  if (d.destinatario.length < 3) erros.push('nome de quem recebe');
  if (d.cep.length !== 8) erros.push('CEP');
  if (d.rua.length < 3) erros.push('rua');
  if (!d.numero) erros.push('número (use "s/n" se não tiver)');
  if (d.bairro.length < 2) erros.push('bairro');
  if (d.cidade.length < 2) erros.push('cidade');
  if (UFS.indexOf(d.uf) < 0) erros.push('estado (UF)');
  return { dados: d, erros };
}

export async function salvar(env, cpf, e) {
  const { dados: d, erros } = validar(e);
  if (erros.length) return { ok: false, erro: 'Confira: ' + erros.join(', ') + '.' };
  const lista = await listar(env, cpf);
  const id = Number(e.id) || null;
  if (id && !lista.some((x) => x.id === id)) return { ok: false, erro: 'Endereço não encontrado.' };
  if (!id && lista.length >= MAX) return { ok: false, erro: 'Você já tem ' + MAX + ' endereços. Remova um para adicionar outro.' };
  const principal = e.principal || !lista.length ? 1 : 0;
  if (principal) await env.DB.prepare('UPDATE enderecos SET principal=0 WHERE cpf=?').bind(cpf).run();
  if (id) {
    await env.DB.prepare(`UPDATE enderecos SET destinatario=?, cep=?, rua=?, numero=?, complemento=?, bairro=?, cidade=?, uf=?,
      principal=MAX(principal, ?), atualizado_em=datetime('now') WHERE id=? AND cpf=?`)
      .bind(d.destinatario, d.cep, d.rua, d.numero, d.complemento, d.bairro, d.cidade, d.uf, principal, id, cpf).run();
  } else {
    await env.DB.prepare('INSERT INTO enderecos (cpf, destinatario, cep, rua, numero, complemento, bairro, cidade, uf, principal) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(cpf, d.destinatario, d.cep, d.rua, d.numero, d.complemento, d.bairro, d.cidade, d.uf, principal).run();
  }
  return { ok: true };
}

export async function remover(env, cpf, id) {
  const lista = await listar(env, cpf);
  const alvo = lista.find((x) => x.id === Number(id));
  if (!alvo) return { ok: false, erro: 'Endereço não encontrado.' };
  await env.DB.prepare('DELETE FROM enderecos WHERE id=? AND cpf=?').bind(alvo.id, cpf).run();
  if (alvo.principal) {
    const prox = lista.find((x) => x.id !== alvo.id);
    if (prox) await env.DB.prepare('UPDATE enderecos SET principal=1 WHERE id=?').bind(prox.id).run();
  }
  return { ok: true };
}

export async function tornarPrincipal(env, cpf, id) {
  const lista = await listar(env, cpf);
  if (!lista.some((x) => x.id === Number(id))) return { ok: false, erro: 'Endereço não encontrado.' };
  await env.DB.prepare('UPDATE enderecos SET principal = CASE WHEN id=? THEN 1 ELSE 0 END WHERE cpf=?').bind(Number(id), cpf).run();
  return { ok: true };
}
