// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
export const INTERO_FINO_A = 64 * 1024 * 1024;
export const PEZZO = 4 * 1024 * 1024;
export const MAX_FILE = 2 * 1024 * 1024 * 1024;
const NEGOZIO = 'media';
export const nomeDb = (chi) => 'socialbot-studio:' + String(chi || 'anon').toLowerCase().replace(/[^a-z0-9_#-]/g, '').slice(0, 40);

const esadecimale = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');

export async function impronta(blob, { subtle = globalThis.crypto.subtle } = {}) {
  const n = blob.size;
  let dati;
  if (n <= INTERO_FINO_A) dati = await blob.arrayBuffer();
  else {
    const testa = new TextEncoder().encode(`campione:${n}:`);
    const parti = [blob.slice(0, PEZZO), blob.slice(Math.floor(n / 2) - PEZZO / 2, Math.floor(n / 2) + PEZZO / 2), blob.slice(n - PEZZO, n)];
    const buf = await Promise.all(parti.map((p) => p.arrayBuffer()));
    const tot = new Uint8Array(testa.length + buf.reduce((s, b) => s + b.byteLength, 0));
    let i = 0;
    tot.set(testa, i); i += testa.length;
    for (const b of buf) { tot.set(new Uint8Array(b), i); i += b.byteLength; }
    dati = tot.buffer;
  }
  return esadecimale(await subtle.digest('SHA-256', dati));
}

function apri(idb = globalThis.indexedDB, chi = '') {
  return new Promise((ok, ko) => {
    if (!idb) { ko(new Error('indexeddb')); return; }
    const r = idb.open(nomeDb(chi), 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(NEGOZIO)) r.result.createObjectStore(NEGOZIO, { keyPath: 'impronta' }); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error || new Error('indexeddb'));
  });
}

function giro(modo, fare, opz) {
  return apri(opz?.idb, opz?.chi).then((db) => new Promise((ok, ko) => {
    const tx = db.transaction(NEGOZIO, modo);
    const st = tx.objectStore(NEGOZIO);
    let esito;
    Promise.resolve(fare(st, (v) => { esito = v; })).catch(ko);
    tx.oncomplete = () => { db.close(); ok(esito); };
    tx.onerror = () => { db.close(); ko(tx.error || new Error('indexeddb')); };
    tx.onabort = () => { db.close(); ko(tx.error || new Error('indexeddb')); };
  }));
}

export async function conserva(file, opz) {
  if (!file || !(file.size > 0)) throw new Error('vuoto');
  if (file.size > MAX_FILE) throw new Error('troppo');
  const imp = await impronta(file, opz);
  const voce = { impronta: imp, blob: file, nome: String(file.name || '').slice(0, 80), mime: String(file.type || '').slice(0, 60), byte: file.size, quando: Date.now() };
  await giro('readwrite', (st) => { st.put(voce); }, opz);
  return { impronta: imp, nome: voce.nome, mime: voce.mime, byte: voce.byte };
}

export function prendi(imp, opz) {
  return giro('readonly', (st, fine) => { const r = st.get(imp); r.onsuccess = () => fine(r.result ? r.result.blob : null); }, opz);
}

export function elenco(opz) {
  return giro('readonly', (st, fine) => { const r = st.getAll(); r.onsuccess = () => fine((r.result || []).map((v) => ({ impronta: v.impronta, nome: v.nome, mime: v.mime, byte: v.byte, quando: v.quando }))); }, opz);
}

export async function togliTranne(usate, opz) {
  const tutti = await elenco(opz);
  const via = tutti.filter((v) => !usate.has(v.impronta)).map((v) => v.impronta);
  if (!via.length) return 0;
  await giro('readwrite', (st) => { for (const k of via) st.delete(k); }, opz);
  return via.length;
}

export async function chiediDiTenere(nav = globalThis.navigator) {
  try { if (nav?.storage?.persisted && await nav.storage.persisted()) return true; return !!(await nav?.storage?.persist?.()); } catch { return false; }
}

export async function spazio(nav = globalThis.navigator) {
  try { const s = await nav?.storage?.estimate?.(); return s ? { usato: s.usage || 0, quota: s.quota || 0 } : null; } catch { return null; }
}
