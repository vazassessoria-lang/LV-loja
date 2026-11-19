// Conta da cliente por CPF — mesma base e mesmo modelo do LV Club (no painel):
// CPF -> link de acesso no e-mail (sem senha) -> aparelho lembrado 180 dias (cookie lv_conta).
import { painelPost } from './catalogo.js';
import { lerCookie } from './sacola.js';

export const COOKIE_CONTA = 'lv_conta';

export function cpfValido(c) {
  const d = String(c || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (base) => { let s = 0; for (let i = 0; i < base.length; i++) s += Number(base[i]) * (base.length + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(d.slice(0, 9)) === Number(d[9]) && dv(d.slice(0, 10)) === Number(d[10]);
}

export function cpfMascarado(c) {
  const d = String(c || '');
  return d.length === 11 ? '***.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-**' : '';
}

// Dados da cliente logada (ou null). Sessao invalida -> null.
export async function clienteLogada(env, request) {
  const dev = lerCookie(request, COOKIE_CONTA);
  if (!dev) return null;
  try {
    const r = await painelPost(env, '/api/loja/conta/dados', { device: dev });
    return r && r.ok ? Object.assign({ device: dev }, r) : null;
  } catch (_) { return null; }
}
