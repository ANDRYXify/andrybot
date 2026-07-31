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

const log = makeLog('comandi-chat');

const attivo = (channel) => streamers.get(channel)?.settings?.comandiChat?.attivo === true; // default OFF
const puoGestire = (msg) => !!(msg.isMod || msg.isBroadcaster);

// nomi che NON possono essere usati come comando (eviterebbero la gestione stessa)
const RISERVATI = new Set(['comando', 'command', 'cmd', 'comandi', 'commands', 'addcom', 'editcom', 'delcom']);

const nomePulito = (raw) => String(raw || '').replace(/^!/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 25);

function aggiungiOModifica(ch, parti, say, msg) {
  const nome = nomePulito(parti.shift());
  const risposta = parti.join(' ').trim();
  if (!nome) { say('🔧 Uso: !comando aggiungi !nome <risposta>'); return true; }
  if (RISERVATI.has(nome)) { say(`🔧 "!${nome}" è riservato: scegli un altro nome.`); return true; }
  if (!risposta) { say(`🔧 Serve anche la risposta: !comando aggiungi !${nome} <testo>`); return true; }
  const esisteva = commands.get(ch, nome) != null;
  commands.set(ch, nome, risposta.slice(0, 400), msg.user);
  say(esisteva ? `✏️ Comando !${nome} aggiornato.` : `✅ Comando !${nome} creato. Usa {user} per il nome di chi lo scrive.`);
  return true;
}

function elimina(ch, parti, say) {
  const nome = nomePulito(parti.shift());
  if (!nome) { say('🔧 Uso: !comando elimina !nome'); return true; }
  if (commands.get(ch, nome) == null) { say(`🔧 !${nome} non esiste.`); return true; }
  commands.remove(ch, nome);
  say(`🗑️ Comando !${nome} eliminato.`);
  return true;
}

function lista(ch, say) {
  const l = commands.list(ch);
  if (!l.length) { say('🔧 Nessun comando personalizzato ancora. Creane uno: !comando aggiungi !nome <risposta>'); return true; }
  const nomi = l.map((c) => '!' + c.name).join(' ');
  say('🔧 Comandi: ' + nomi.slice(0, 420));
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
    const cmd = (parti.shift() || '').toLowerCase();

    // forme brevi stile Nightbot
    if (cmd === 'addcom' || cmd === 'editcom') {
      if (!puoGestire(msg)) return true;
      return aggiungiOModifica(ch, parti, say, msg);
    }
    if (cmd === 'delcom') {
      if (!puoGestire(msg)) return true;
      return elimina(ch, parti, say);
    }

    // forma estesa: !comando <sub> …
    if (['comando', 'command', 'cmd', 'comandi', 'commands'].includes(cmd)) {
      const sub = (parti.shift() || '').toLowerCase();
      if (!sub || ['lista', 'list', 'elenco'].includes(sub)) return lista(ch, say);
      if (!puoGestire(msg)) return true;             // le modifiche solo ai mod
      if (['aggiungi', 'add', 'nuovo', 'crea', 'modifica', 'edit', 'cambia'].includes(sub)) return aggiungiOModifica(ch, parti, say, msg);
      if (['elimina', 'rimuovi', 'del', 'delete', 'cancella'].includes(sub)) return elimina(ch, parti, say);
      say('🔧 Uso: !comando aggiungi !nome <risposta> · !comando elimina !nome · !comando lista');
      return true;
    }

    return false;
  } catch (e) { log.debug('tryComando:', e?.message || e); return false; }
}
