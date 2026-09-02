// «Quello che ti sei costruito vince.»
//
// Il bot porta in dote un mucchio di comandi pronti — i minigiochi, le ore
// guardate, i sorteggi, !uptime, !followage, !cita, i contatori. Sono comodi
// finché non ti servono diversi: nel momento in cui lo streamer si costruisce
// il SUO `!slot`, il comando pronto e il suo Modulo rispondono tutti e due, e
// nel caso dei giochi toccano anche la stessa moneta due volte.
//
// La regola c'era già, ma scritta dentro un file solo (i comandi base la
// rispettavano, i giochi no). Adesso è una sola, e sta PRIMA dello smistamento:
// se il messaggio è un comando che lo streamer ha già suo, i comandi pronti non
// lo vedono nemmeno. Vale per quelli di oggi e per quelli che verranno.
import { commands, modules as modulesDb, revisioneComandi } from '../db.js';

// La chat è fitta: rileggere il database a ogni riga non si può. Ma una copia a
// scadenza lascerebbe una finestra in cui, appena salvato un comando, risponde
// ancora la vecchia versione. Quindi non si tiene una scadenza: si confronta il
// numero di revisione, che il database alza dentro le uniche funzioni capaci di
// cambiare i comandi. Salvi, e la riga dopo è già giusta.
const cache = new Map();            // canale → { rev, nomi:Set }

// Il nome del comando in un messaggio, senza '!' e in minuscolo. '' se non è un comando.
export function comandoDi(testo) {
  const t = String(testo || '').trim();
  if (!t.startsWith('!')) return '';
  const primo = t.slice(1).split(/\s+/)[0] || '';
  return primo.toLowerCase();
}

// I comandi che lo streamer si è fatto: comandi semplici + Moduli attivi con
// innesco "comando" (compresi gli alias, che sono lo stesso comando con un
// altro nome e devono vincere allo stesso modo).
function suoi(channel) {
  const ch = String(channel || '').toLowerCase();
  const rev = revisioneComandi(ch);
  const hit = cache.get(ch);
  if (hit && hit.rev === rev) return hit.nomi;
  const nomi = new Set();
  try {
    for (const c of commands.list?.(ch) || []) {
      const n = String(c?.name || '').toLowerCase().replace(/^!/, '');
      if (n) nomi.add(n);
    }
    for (const m of modulesDb.list(ch) || []) {
      if (!m.attivo || m.trigger?.tipo !== 'comando') continue;
      const base = String(m.trigger.comando || '').toLowerCase().replace(/^!/, '');
      if (base) nomi.add(base);
      const alias = Array.isArray(m.trigger.alias) ? m.trigger.alias
        : String(m.trigger.alias || '').split(/[\s,]+/);
      for (const a of alias) {
        const n = String(a || '').toLowerCase().replace(/^!/, '').trim();
        if (n) nomi.add(n);
      }
    }
  } catch { /* in dubbio non si blocca niente: i comandi pronti restano */ }
  cache.set(ch, { rev, nomi });
  return nomi;
}

// Questo comando lo streamer ce l'ha già suo?
export function personalizzato(channel, cmd) {
  const n = String(cmd || '').toLowerCase().replace(/^!/, '');
  return !!n && suoi(channel).has(n);
}

// Comodo per il vaglio in cima alla catena: true se il messaggio è un comando
// che lo streamer ha già suo.
export function suoComando(channel, testo) {
  const c = comandoDi(testo);
  return !!c && personalizzato(channel, c);
}

// Per i collaudi: la cache si rinfresca da sola col numero di revisione.
export function scorda(channel) {
  if (channel) cache.delete(String(channel).toLowerCase());
  else cache.clear();
}
