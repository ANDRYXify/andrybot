// AndryBot — punto di ingresso.
// Avvia web (dashboard su bot.andryxify.it) e, se la configurazione
// è completa, il bot vero e proprio (chat, eventi, IA, clip).
import { config, missingConfig } from './config.js';
import { log } from './logger.js';
import './db.js';                       // inizializza lo schema
import { TwitchAuth } from './twitch/auth.js';
import { Helix } from './twitch/helix.js';
import { BotManager } from './bot.js';
import { EffectsEngine } from './features/effects.js';
import { ModulesEngine } from './features/modules.js';
import { PluginBus, caricaPlugin } from './features/plugins.js';
import { startWeb } from './web/server.js';
import { startApprovalSync } from './web/gate.js';

const missing = missingConfig();
if (missing.length) {
  log.warn('Configurazione incompleta (modalità setup). Mancano:', missing.join(', '));
  log.warn('Compila il file .env e riavvia. La dashboard parte comunque.');
}

const auth = new TwitchAuth();
const helix = new Helix({ auth });
// Il motore "Effetti & Suoni" è UNICO e condiviso: la dashboard (upload,
// registro overlay SSE) e il bot (trigger dei comandi in chat) usano la
// stessa istanza, così un !airhorn scritto in chat raggiunge l'overlay aperto.
const effects = new EffectsEngine();
// Motore "Moduli": automazioni QUANDO→SE→ALLORA per streamer (solo dati, mai
// codice arbitrario). Condiviso tra bot (trigger da chat/eventi/timer) e
// dashboard (CRUD, prova, ingresso API esterna).
const modules = new ModulesEngine({ effects, helix });
// Event-bus dei plugin OPERATORE (server-side, fidati): il say usa il manager.
const bus = new PluginBus({ say: (ch, t) => manager.say(ch, t) });
const manager = new BotManager({ auth, helix, effects, modules, bus });

// dashboard sempre attiva (serve anche per il primo setup / OAuth)
startWeb({ auth, helix, manager, effects, modules });

// plugin dell'operatore dalla cartella plugins/ (assente in dev → no-op)
caricaPlugin({ bus }).catch(e => log.warn('Caricamento plugin fallito:', e?.message || e));

// keepalive delle connessioni SSE degli overlay (evita che il reverse proxy
// chiuda le connessioni inattive). unref: non tiene in vita il processo.
setInterval(() => effects.ping(), 15_000).unref();

// allineamento periodico con andryxify.it: revoca chi non è più abilitato
startApprovalSync({ manager });

// il bot parte solo a configurazione completa
if (!missing.length) {
  manager.start()
    .then(() => modules.start({ manager }))   // avvia il timer dei moduli a tempo
    .catch(e => log.error('Avvio bot fallito:', e?.message || e));
} else {
  log.info('Bot in attesa: completa la configurazione dalla dashboard o nel .env');
}

// spegnimento pulito
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    log.info('Arresto in corso...');
    manager.stop().finally(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
process.on('unhandledRejection', e => log.error('unhandledRejection:', e?.message || e));
process.on('uncaughtException', e => log.error('uncaughtException:', e?.message || e));
