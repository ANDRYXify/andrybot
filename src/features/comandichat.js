// Gestione dei comandi personalizzati DALLA CHAT (per i mod), stile Nightbot:
//   !comando aggiungi !nome <risposta>   (alias: !addcom !nome <risposta>)
//   !comando modifica !nome <risposta>   (alias: !editcom !nome <risposta>)
//   !comando elimina  !nome              (alias: !delcom !nome)
//   !comando lista                       (chiunque)
//
// FILOSOFIA: SocialBot per scelta non ha comandi "calati dall'alto". Questa
// gestione introduce dei comandi riservati (!comando, !addcom, …), quindi è
// OPT-IN: default SPENTA, si accende dalla dashboard. Così chi vuole la comodità
// alla Nightbot ce l'ha, e chi tiene alla purezza non se la trova imposta.
//
// I comandi creati finiscono nella tabella `commands` (testo semplice con {user}),
// gli stessi che il bot già risponde. Per comandi con variabili/effetti/condizioni
// c'è l'editor Moduli.
import { commands, streamers } from '../db.js';
import { makeLog } from '../logger.js';
import { aChi, spazioPer, inMessaggi } from './risposte.js';
import { nomeIn } from './comandi-registro.js';

const log = makeLog('comandi-chat');

const attivo = (channel) => streamers.get(channel)?.settings?.comandiChat?.attivo === true; // default OFF
const puoGestire = (msg) => !!(msg.isMod || msg.isBroadcaster);

// nomi che NON possono essere usati come comando (eviterebbero la gestione stessa)
const RISERVATI = new Set(['comando', 'command', 'cmd', 'comandi', 'commands', 'addcom', 'editcom', 'delcom']);

const nomePulito = (raw) => String(raw || '').replace(/^!/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 25);

// Come si chiama !comando in questo canale: l'esempio che si da' deve funzionare.
const cmd = (ch) => '!' + nomeIn(ch, 'comando');

function aggiungiOModifica(ch, parti, say, msg) {
  const nome = nomePulito(parti.shift());
  const risposta = parti.join(' ').trim();
  if (!nome) { say(`🔧 Si crea così: ${cmd(ch)} aggiungi !saluto Ciao {user}!`); return true; }
  if (RISERVATI.has(nome)) { say(`🔧 "!${nome}" è riservato: scegli un altro nome.`); return true; }
  if (!risposta) { say(`🔧 Manca cosa deve rispondere: ${cmd(ch)} aggiungi !${nome} e poi il testo.`); return true; }
  const esisteva = commands.get(ch, nome) != null;
  commands.set(ch, nome, risposta.slice(0, 400), msg.user);
  say(esisteva ? `✏️ Comando !${nome} aggiornato.` : `✅ Comando !${nome} creato. Usa {user} per il nome di chi lo scrive.`);
  return true;
}

function elimina(ch, parti, say) {
  const nome = nomePulito(parti.shift());
  if (!nome) { say(`🔧 Si toglie così: ${cmd(ch)} elimina !nome.`); return true; }
  if (commands.get(ch, nome) == null) { say(`🔧 !${nome} non esiste.`); return true; }
  commands.remove(ch, nome);
  say(`🗑️ Comando !${nome} eliminato.`);
  return true;
}

// Tutti, in piu' messaggi se non ci stanno: prima si tagliava a 420 caratteri,
// anche a meta' di un nome.
function lista(ch, say, msg) {
  const l = commands.list(ch);
  if (!l.length) { say(`🔧 Qui non ci sono ancora comandi personalizzati. Un mod li crea così: ${cmd(ch)} aggiungi !saluto Ciao {user}!`); return true; }
  inMessaggi(l.map((c) => '!' + c.name), spazioPer(msg), { testa: '🔧 I comandi del canale:', sep: ' ' }).forEach(say);
  return true;
}

// Ritorna true se il messaggio era un comando di gestione (gestito).
export function tryComando(msg, say) {
  try {
    if (!msg) return false;
    const ch = msg.channel;
    if (!attivo(ch)) return false;                 // funzione spenta → non tocca nulla
    const testo = String(msg.text || '').trim();
    if (!testo.startsWith('!')) return false;
    const parti = testo.slice(1).split(/\s+/);
    const parola = (parti.shift() || '').toLowerCase();
    // ogni risposta qui e' per chi ha scritto: agganciata al suo messaggio
    const risposta = aChi(msg, say);

    // forme brevi stile Nightbot
    if (parola === 'addcom' || parola === 'editcom') {
      if (!puoGestire(msg)) return true;
      return aggiungiOModifica(ch, parti, risposta, msg);
    }
    if (parola === 'delcom') {
      if (!puoGestire(msg)) return true;
      return elimina(ch, parti, risposta);
    }

    // forma estesa: !comando <sub> …
    if (['comando', 'command', 'cmd', 'comandi', 'commands'].includes(parola)) {
      const sub = (parti.shift() || '').toLowerCase();
      if (!sub || ['lista', 'list', 'elenco'].includes(sub)) return lista(ch, risposta, msg);
      if (!puoGestire(msg)) return true;             // le modifiche solo ai mod
      if (['aggiungi', 'add', 'nuovo', 'crea', 'modifica', 'edit', 'cambia'].includes(sub)) return aggiungiOModifica(ch, parti, risposta, msg);
      if (['elimina', 'rimuovi', 'del', 'delete', 'cancella'].includes(sub)) return elimina(ch, parti, risposta);
      risposta(`🔧 Si usa così: ${cmd(ch)} aggiungi !nome e il testo, ${cmd(ch)} elimina !nome, ${cmd(ch)} lista.`);
      return true;
    }

    return false;
  } catch (e) { log.debug('tryComando:', e?.message || e); return false; }
}
