// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
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
// Per i FILE col nome del canale dentro cartelle condivise, invece, l'elenco
// delle cartelle c'e', ed e' tenuto legato al codice da una prova
// (CARTELLE_DI_FILE, piu' sotto, dice perche').
//
// Cosa NON si cancella: `anima` (e' una riga sola, condivisa da tutto il bot, e
// non contiene niente di questa persona). Tutto il resto va via.

import fs from 'node:fs';
import path from 'node:path';
import { db, tgConf, tokens } from '../db.js';
import { config } from '../config.js';
import { tabelleDiCanale } from './esporta.js';
import { diCanale as attacchiDiCanale, dimenticaCanale as dimenticaAttacchi } from './incidenti.js';
import { registro as registroScudo, dimenticaRegistro } from './antibot.js';
import { dimentica as dimenticaFollower } from './follower.js';
import { eLoginNostro, nomeSu } from '../identita.js';

// Un canale valido e' quello che identita.js chiama nostro: con il suo
// prefisso (kick., yt., dc.) o senza. Un'espressione scritta qui a parte
// lasciava fuori tutti i canali che non sono su Twitch, e a loro la
// cancellazione rispondeva «canale non valido».
//
// La parola che conferma e' il nome del canale come lo vede chi lo ha: sulla
// sua piattaforma, senza il prefisso che usiamo noi. Va bene anche il nome
// intero, prefisso compreso.
export const parolaDiConferma = (login) => nomeSu(login);
export function confermaValida(login, conferma) {
  const chi = String(login || '').trim().toLowerCase();
  const scritto = String(conferma || '').trim().toLowerCase();
  return !!scritto && (scritto === chi || scritto === parolaDiConferma(chi));
}

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

// I FILE di un canale, non cartelle: stanno in una cartella condivisa e portano
// il suo nome (lo stato delle automatiche, «automatiche/<login>.json»; la
// storia della diretta e il suo stato, «storie-live/<login>.jpg» e «.json»).
// Restavano sul disco dopo la cancellazione, perche' si cercavano solo le
// cartelle «<dati>/<qualcosa>/<login>».
//
// Qui l'elenco delle cartelle e' SCRITTO, non indovinato dai nomi: in una
// cartella come «campagne» i file hanno il nome di una citta', e un canale che
// si chiamasse «milano» porterebbe via la campagna di Milano. Perche' l'elenco
// non invecchi, una prova cerca nel codice chi scrive file col nome di un
// canale e pretende che la sua cartella sia qui.
//
// Del canale e' il file «<login>.<estensione>», con una sola estensione (piu'
// il «.tmp» di una scrittura a meta'): «kick.foo.json» e' del canale kick.foo,
// non del canale «kick».
export const CARTELLE_DI_FILE = ['automatiche', 'storie-live'];
export function fileDiCanale(login) {
  const out = [];
  for (const c of CARTELLE_DI_FILE) {
    let nomi = [];
    try { nomi = fs.readdirSync(path.join(config.dataDir, c), { withFileTypes: true }); } catch { continue; }
    for (const f of nomi) {
      if (!f.isFile() || !f.name.startsWith(login + '.')) continue;
      if (/^[a-z0-9]+(\.tmp)?$/.test(f.name.slice(login.length + 1))) out.push(path.join(config.dataDir, c, f.name));
    }
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
  if (!eLoginNostro(chi)) throw new Error('canale non valido');
  if (!confermaValida(chi, conferma)) throw new Error('la conferma non combacia');

  // Prima di togliere le righe: un giro o un lavoro sui follower ancora in
  // volo le riscriverebbe alla prossima pagina letta da Twitch.
  dimenticaFollower(chi);

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
  for (const f of fileDiCanale(chi)) {
    try { fs.rmSync(f, { force: true }); cartelle.push(path.relative(config.dataDir, f)); }
    catch { /* come sopra */ }
  }

  // Gli attacchi e il registro dello scudo: due file per tutti, con dentro i
  // nomi di chi c'era. Restavano dopo la cancellazione dell'account.
  try {
    const n = dimenticaAttacchi(chi);
    if (n) righe.attacchi = n;
    if (dimenticaRegistro(chi)) righe.registro_scudo = 1;
  } catch { /* lo scudo potrebbe non essere caricato */ }

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
  try {
    const a = attacchiDiCanale(chi).length;
    if (a) resti.attacchi = a;
    const r = registroScudo(chi, { limite: 1 }).length;
    if (r) resti.registro_scudo = r;
  } catch { /* niente */ }
  const cartelle = [...cartelleDiCanale(chi), ...fileDiCanale(chi)].map((d) => path.relative(config.dataDir, d));
  return { righe: resti, cartelle };
}

// I CANALI DI PROVA RIMASTI NEI DATI VERI. Fino al 2026-10-14 un cancello
// (scripts/verifica-scudo-tg.mjs) apriva il database prima di scegliersi una
// cartella usa e getta, e sul server — dove aggiorna.sh fa girare prove e
// cancelli — creava `prova`, `proven` e `spento` nei dati veri, a ogni
// aggiornamento. La causa e' chiusa (scripts/_dati-usa-e-getta.mjs e la guardia
// in config.js); qui si toglie quello che ha lasciato.
//
// Si riconoscono dall'impronta, non dal nome: un token Telegram che Telegram
// non da' mai (il suo e' «numero:35 caratteri») sul gruppo finto del cancello.
// Il nome da solo non basta, perche' «prova» puo' essere un canale vero. E per
// stare doppiamente dalla parte giusta: un canale che ha collegato Twitch o
// Kick e' di una persona, e non si tocca qualunque cosa ci sia nel Telegram.
export const IMPRONTA_DI_COLLAUDO = Object.freeze({ token: '1:finto', chatId: '-100900' });

export function canaliDiCollaudo() {
  let righe = [];
  try { righe = db.prepare('SELECT channel FROM telegram WHERE chat_id=?').all(IMPRONTA_DI_COLLAUDO.chatId); }
  catch { return []; }
  return righe.map((r) => r.channel).filter((ch) =>
    tgConf.get(ch)?.token === IMPRONTA_DI_COLLAUDO.token
    && !tokens.get('broadcaster', ch)?.accessToken
    && !tokens.get('kick', ch)?.accessToken);
}

// All'avvio. La conferma e' il nome stesso: a chiederla e' l'impronta, non un
// bottone premuto per sbaglio.
export function togliCanaliDiCollaudo() {
  return canaliDiCollaudo().map((ch) => cancella(ch, { conferma: ch }));
}
