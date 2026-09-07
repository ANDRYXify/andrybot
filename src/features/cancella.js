// ANDARSENE DAVVERO.
//
// L'esportazione c'era, la cancellazione no: si poteva portare via la propria
// roba, non toglierla di mezzo. In Europa e' un diritto (GDPR art. 17), ma anche
// senza legge e' la meta' mancante della stessa promessa — «i tuoi dati sono
// tuoi» vuol dire anche «se te ne vai, se ne vanno con te».
//
// COME SI EVITA CHE INVECCHI. Un elenco di tabelle scritto a mano si stacca dal
// database alla prima tabella nuova, e una cancellazione incompleta e' peggio
// del niente: la persona crede di essere sparita e invece e' rimasta a meta'.
// Quindi l'elenco si RICAVA dallo schema, esattamente come l'esportazione, e da
// quello stesso posto: `tabelleDiCanale()`. Una tabella nuova viene cancellata
// da sola, senza che nessuno se ne debba ricordare.
//
// Stessa idea per i file: non c'e' un elenco di cartelle da tenere aggiornato.
// Si guarda dentro la cartella dei dati e si prende ogni `data/<qualcosa>/<login>`
// che esiste — oggi sono gli effetti e gli sfondi, domani quello che sara'.
//
// Cosa NON si cancella: `anima` (e' una riga sola, condivisa da tutto il bot, e
// non contiene niente di questa persona). Tutto il resto va via.

import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';
import { config } from '../config.js';
import { tabelleDiCanale } from './esporta.js';

const LOGIN_BUONO = /^[a-z0-9_]{2,30}$/;

// Le cartelle di file che appartengono a un canale, trovate guardando invece
// che ricordando. Il login e' gia' stato validato: nessun ".." puo' entrare qui.
export function cartelleDiCanale(login) {
  const out = [];
  let dentro = [];
  try { dentro = fs.readdirSync(config.dataDir, { withFileTypes: true }); } catch { return out; }
  for (const d of dentro) {
    if (!d.isDirectory()) continue;
    const p = path.join(config.dataDir, d.name, login);
    try { if (fs.statSync(p).isDirectory()) out.push(p); } catch { /* non c'e' */ }
  }
  return out;
}

// Cancella tutto quello che e' di questo canale. `conferma` deve essere il nome
// del canale scritto a mano: una cosa che non si annulla non si fa per sbaglio,
// e un bottone da solo si preme per sbaglio.
//
// Ritorna il conto di cosa e' andato via — serve a chi cancella per sapere che
// e' successo davvero, e al collaudo per pretendere che non sia rimasto niente.
export function cancella(login, { conferma } = {}) {
  const chi = String(login || '').trim().toLowerCase();
  if (!LOGIN_BUONO.test(chi)) throw new Error('canale non valido');
  if (String(conferma || '').trim().toLowerCase() !== chi) throw new Error('la conferma non combacia');

  const righe = {};
  const tabelle = tabelleDiCanale();
  const tx = db.transaction(() => {
    for (const { tabella, colonna } of tabelle) {
      const info = db.prepare(`DELETE FROM "${tabella}" WHERE "${colonna}"=?`).run(chi);
      if (info.changes) righe[tabella] = info.changes;
    }
    // `friends` non ha una colonna di canale: e' l'affinita' con la PERSONA,
    // e la persona se ne sta andando.
    try {
      const f = db.prepare('DELETE FROM friends WHERE user=?').run(chi);
      if (f.changes) righe.friends = f.changes;
    } catch { /* la tabella potrebbe non esserci in un database di prova */ }
  });
  tx();

  const cartelle = [];
  for (const d of cartelleDiCanale(chi)) {
    try { fs.rmSync(d, { recursive: true, force: true }); cartelle.push(path.relative(config.dataDir, d)); }
    catch { /* se un file resta bloccato, il resto e' comunque andato */ }
  }

  return { canale: chi, quando: new Date().toISOString(), righe, cartelle, tabelleGuardate: tabelle.length };
}

// Cosa resterebbe di questo canale dopo la cancellazione. Serve al collaudo, e
// a chi vuole guardare prima di premere.
export function restiDi(login) {
  const chi = String(login || '').trim().toLowerCase();
  const resti = {};
  for (const { tabella, colonna } of tabelleDiCanale()) {
    const n = db.prepare(`SELECT COUNT(*) c FROM "${tabella}" WHERE "${colonna}"=?`).get(chi).c;
    if (n) resti[tabella] = n;
  }
  try {
    const n = db.prepare('SELECT COUNT(*) c FROM friends WHERE user=?').get(chi).c;
    if (n) resti.friends = n;
  } catch { /* niente */ }
  const cartelle = cartelleDiCanale(chi).map((d) => path.relative(config.dataDir, d));
  return { righe: resti, cartelle };
}
