// D1 falso sobre node:sqlite (Node 22+), so pra teste local.
import { DatabaseSync } from 'node:sqlite';
export function d1Falso() {
  const db = new DatabaseSync(':memory:');
  const preparar = (sql) => {
    let a = [];
    const st = {
      bind(...x) { const n = preparar(sql); n._a = x; return n; },
      _a: a,
      first() { return db.prepare(sql).get(...(this._a || [])) || null; },
      all() { return { results: db.prepare(sql).all(...(this._a || [])) }; },
      run() { const r = db.prepare(sql).run(...(this._a || [])); return { meta: { changes: r.changes } }; },
    };
    return st;
  };
  return { _db: db, prepare: preparar, async batch(sts) { const out = []; for (const s of sts) out.push(s.run()); return out; }, exec(s) { db.exec(s); } };
}
