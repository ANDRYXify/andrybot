// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I MEDIA DEGLI EFFETTI (docs/ARCHIVIO.md): l'unico posto da cui passano i file
// di un effetto (il media e il suono abbinato), qualunque cosa li usi.
//
//  · ENTRANO nell'archivio (features/archivio.js): un file per contenuto,
//    cifrato, segnato nel registro col suo peso.
//  · SI SERVONO solo al canale che li richiama: un nome dell'archivio da solo
//    non apre niente; serve una riga di QUEL canale che lo usi.
//  · SI LIBERANO solo quando nessuna riga, di nessun canale, li usa piu': lo
//    stesso file puo' essere di due canali (uno l'ha preso dalla libreria
//    dell'altro) e togliere l'effetto a uno non lo toglie all'altro.
//  · I file di prima (un nome qualunque nella cartella del canale) passano
//    all'archivio un po' alla volta (`migra`): una riga si sposta solo se e'
//    ancora quella di prima, e il file vecchio se ne va solo dopo.
import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import crypto from 'node:crypto';
import { eNomeArchivio, servi as serviArchivio } from './archivio.js';

const NOME_SEMPLICE = /^[A-Za-z0-9._-]+$/;

export function creaMediaEffetti({ archivio, effetti, registro, cartellaDi, temp, log = null }) {
  const estDi = (f) => extname(String(f || '')).slice(1).toLowerCase();

  // Un file appena preparato (compresso, nella cartella del canale) entra
  // nell'archivio. Torna il nome da scrivere nella riga.
  async function entra(percorso, fileOriginale) {
    const r = await archivio.metti(percorso, estDi(fileOriginale));
    registro.segna(r.nome, r.byte);
    return r.nome;
  }

  // Un file che una riga non usa piu' (tolta, o sostituita).
  async function libera(channel, nome) {
    if (!nome) return;
    if (eNomeArchivio(nome)) {
      if (registro.usato(nome)) return;
      await archivio.togli(nome);
      registro.togli(nome);
      return;
    }
    if (NOME_SEMPLICE.test(nome) && !nome.includes('..')) await unlink(join(cartellaDi(channel), nome)).catch(() => {});
  }

  // Serve un file di un effetto di `channel`. false (e 404) se non e' suo.
  async function servi(req, res, channel, nome, { maxAge = 300 } = {}) {
    const ch = String(channel || '').toLowerCase();
    if (!nome || !NOME_SEMPLICE.test(nome) || nome.includes('..')) { res.status(404).end(); return false; }
    if (eNomeArchivio(nome)) {
      if (!effetti.usaFile(ch, nome)) { res.status(404).end(); return false; }
      return serviArchivio(archivio, nome, req, res, { maxAge });
    }
    return new Promise((ok) => {
      res.sendFile(join(cartellaDi(ch), nome), { maxAge: maxAge * 1000 }, (err) => {
        if (err && !res.headersSent) res.status(404).end();
        ok(!err);
      });
    });
  }

  // I byte in chiaro di un file di un effetto di `channel` (per chi lo deve
  // rilavorare, come la firma): null se non e' suo o non c'e'.
  async function leggi(channel, nome) {
    const ch = String(channel || '').toLowerCase();
    if (eNomeArchivio(nome)) return effetti.usaFile(ch, nome) ? archivio.leggi(nome).catch(() => null) : null;
    const p = join(cartellaDi(ch), String(nome || ''));
    if (!NOME_SEMPLICE.test(String(nome || '')) || !existsSync(p)) return null;
    const { readFile } = await import('node:fs/promises');
    return readFile(p).catch(() => null);
  }

  // Sposta nell'archivio i file di una riga ancora fuori. Il file vecchio si
  // copia (l'archivio si prende la copia), la riga si aggiorna solo se e' ancora
  // quella di prima, e solo allora il vecchio se ne va. Torna quanti ne ha spostati.
  async function migraRiga(riga) {
    let n = 0;
    for (const colonna of ['file', 'suono_file']) {
      const vecchio = String(riga[colonna] || '');
      if (!vecchio || eNomeArchivio(vecchio) || !NOME_SEMPLICE.test(vecchio)) continue;
      const p = join(cartellaDi(riga.channel), vecchio);
      if (!existsSync(p)) continue;
      mkdirSync(temp, { recursive: true });
      const copia = join(temp, `migra-${crypto.randomBytes(6).toString('hex')}`);
      try {
        copyFileSync(p, copia);
        const nome = await entra(copia, vecchio);
        if (effetti.rinomina(riga.id, colonna, vecchio, nome)) { await unlink(p).catch(() => {}); n++; }
      } catch (e) {
        await unlink(copia).catch(() => {});
        log?.warn?.(`archivio: ${riga.channel}/${vecchio} non spostato:`, e?.message || e);
      }
    }
    return n;
  }
  async function migra(limite = 50) {
    let n = 0, dopo = 0, righe;
    do {
      righe = effetti.fuoriArchivio(dopo, limite);
      for (const r of righe) { n += await migraRiga(r); dopo = r.id; }
    } while (righe.length === limite);
    return n;
  }

  // I file del registro che nessuno usa piu' (una sostituzione interrotta, una
  // migrazione ripetuta): via.
  async function pulisci() {
    let n = 0;
    for (const nome of registro.orfani()) {
      if (registro.usato(nome)) continue;
      await archivio.togli(nome);
      registro.togli(nome);
      n++;
    }
    return n;
  }

  return { entra, libera, servi, leggi, migra, migraRiga, pulisci };
}
