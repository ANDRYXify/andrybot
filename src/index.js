// SocialBot — punto di ingresso.
// Avvia web (dashboard su socialbot.live) e, se la configurazione
// è completa, il bot vero e proprio (chat, eventi, IA, clip).
import { config, missingConfig } from './config.js';
import { log } from './logger.js';
import { migraTokenCifratura } from './db.js';   // inizializza lo schema
import { TwitchAuth } from './twitch/auth.js';
import { Helix } from './twitch/helix.js';
import { BotManager } from './bot.js';
import { EffectsEngine } from './features/effects.js';
import { ModulesEngine } from './features/modules.js';
import { PluginBus, caricaPlugin } from './features/plugins.js';
import { startWeb } from './web/server.js';
import { startApprovalSync } from './web/gate.js';
import { contaRifiuto, avviaVigilanza } from './salute.js';

const missing = missingConfig();
if (missing.length) {
  log.warn('Configurazione incompleta (modalità setup). Mancano:', missing.join(', '));
  log.warn('Compila il file .env e riavvia. La dashboard parte comunque.');
}

// Cifra a riposo i token ancora in chiaro (una-tantum, idempotente): un DB/backup
// rubato senza il segreto del server non serve a nulla.
try { const n = migraTokenCifratura(); if (n) log.info(`sicurezza: cifrati a riposo i token di ${n} account`); } catch (e) { log.warn('cifratura token:', e?.message || e); }

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

// vigilanza: se il database smette di essere scrivibile e non torna, il
// processo se ne va e il supervisore ne fa ripartire uno sano.
avviaVigilanza({ manager, log });

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
// Una promessa rifiutata e non gestita è un difetto, non una catastrofe: si
// annota e si conta (il conteggio si vede in /api/admin/salute), ma il processo
// tira dritto — farlo morire per ogni fetch andato storto lo renderebbe fragile.
process.on('unhandledRejection', (e) => { contaRifiuto(); log.error('unhandledRejection:', e?.stack || e?.message || e); });

// Un'eccezione non catturata è un'altra cosa: da lì in poi lo stato del processo
// è indefinito per definizione. Prima si logava e si tirava dritto — cioè si
// restava MEZZO VIVI: chat connessa, magari il database a pezzi, e nessuno che
// se ne accorge. Meglio morire in modo pulito: il supervisore (docker compose,
// restart: unless-stopped) fa ripartire un processo sano.
let _giaMorendo = false;
process.on('uncaughtException', (e) => {
  log.error('uncaughtException:', e?.stack || e?.message || e);
  if (_giaMorendo) return;
  _giaMorendo = true;
  log.error('stato del processo non piu\' affidabile: esco, il supervisore mi riavvia');
  const fine = () => process.exit(1);
  try { manager.stop().finally(fine); } catch { fine(); }
  setTimeout(fine, 2000).unref();
});
