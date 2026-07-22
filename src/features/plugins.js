// Plugin dell'OPERATORE (solo andryxify): estensioni server-side FIDATE.
//
// ATTENZIONE — differenza fondamentale con i "Moduli":
//   • I Moduli degli streamer sono DATI (JSON), mai codice: girano dentro una
//     sandbox di azioni predefinite e non possono eseguire nulla di arbitrario.
//   • I Plugin QUI sono veri file .js caricati dalla cartella `plugins/` e
//     girano SUL SERVER con pieni privilegi del processo. Li mette SOLO
//     l'operatore (andryxify), MAI gli streamer. Non esporre mai questa
//     cartella a input esterni.
//
// Un plugin rotto non blocca gli altri né l'avvio del bot: ogni caricamento è
// isolato in try/catch.
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { makeLog } from '../logger.js';

// Mini event-bus: i plugin si iscrivono con on('message'|'event', handler) e
// bot.js li alimenta con emit(...). Espone anche say(channel, text).
export class PluginBus {
  constructor({ say } = {}) {
    this._handlers = new Map();     // evento → Set<fn>
    this._say = typeof say === 'function' ? say : (() => {});
    this._log = makeLog('plugin');
  }

  on(evento, handler) {
    if (typeof handler !== 'function') return;
    const ev = String(evento || '');
    let set = this._handlers.get(ev);
    if (!set) { set = new Set(); this._handlers.set(ev, set); }
    set.add(handler);
  }

  // Alimenta gli handler iscritti. Non lancia mai: un handler rotto viene solo
  // loggato (in debug) e non ferma gli altri.
  emit(evento, payload) {
    const set = this._handlers.get(String(evento || ''));
    if (!set || !set.size) return;
    for (const h of set) {
      try {
        Promise.resolve(h(payload)).catch((e) => this._log.debug('handler plugin:', e?.message || e));
      } catch (e) {
        this._log.debug('handler plugin:', e?.message || e);
      }
    }
  }

  say(channel, text) {
    try { this._say(channel, text); } catch { /* ignora */ }
  }
}

// Carica i plugin *.js dalla cartella `plugins/` nella root del progetto (se
// esiste). Per ognuno chiama la funzione esportata (default o { setup }) con
// un'API stabile { on, say, log }. Ritorna { caricati }.
export async function caricaPlugin({ bus } = {}) {
  const log = makeLog('plugin');
  const dir = resolve(process.cwd(), 'plugins');

  if (!existsSync(dir)) {
    log.debug('cartella plugins/ assente: nessun plugin da caricare');
    return { caricati: 0 };
  }

  let files;
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.js'));
  } catch (e) {
    log.warn('lettura cartella plugins/ fallita:', e?.message || e);
    return { caricati: 0 };
  }
  if (!files.length) { log.debug('nessun plugin .js in plugins/'); return { caricati: 0 }; }

  // API stabile passata a ogni plugin (piccola e prevedibile)
  const api = {
    on: (evento, handler) => bus?.on?.(evento, handler),
    say: (channel, text) => bus?.say?.(channel, text),
    log,
  };

  let caricati = 0;
  for (const f of files) {
    try {
      const mod = await import(pathToFileURL(join(dir, f)).href);
      const setup =
        typeof mod.default === 'function' ? mod.default
        : (mod.default && typeof mod.default.setup === 'function' ? mod.default.setup
        : (typeof mod.setup === 'function' ? mod.setup : null));
      if (!setup) {
        log.warn(`plugin ${f}: nessun default()/setup() esportato, salto`);
        continue;
      }
      await setup(api);
      caricati++;
      log.info(`plugin caricato: ${f}`);
    } catch (e) {
      log.error(`plugin ${f} non caricato:`, e?.message || e);
    }
  }
  log.info(`plugin caricati: ${caricati}/${files.length}`);
  return { caricati };
}
