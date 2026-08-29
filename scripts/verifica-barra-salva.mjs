// Cancello della BARRA "hai modifiche non salvate".
//
// La barra esiste per una cosa sola: indicare il pulsante di salvataggio che in
// quel momento non vedi. Percio' deve essere legata a UN pulsante — quello
// della zona che stai modificando — e a nessun altro.
//
// I due difetti veri che questo cancello impedisce, trovati sul campo:
//  1. la barra sceglieva il pulsante frugando nel pannello intero. Chi
//     modificava un comando (nell'editor, che non ha un id "salva") si vedeva
//     offrire il salva di «Comodita' in chat»: premerlo salvava la cosa
//     sbagliata e lasciava il comando non salvato.
//  2. si spegneva solo se cliccavi un pulsante col nome giusto nell'id. Il
//     salva dell'editor comandi e' marcato con un attributo, non con un id:
//     salvavi davvero e la barra restava li' a dire che non avevi salvato.
//
// La difesa e' strutturale: una sola definizione di «questo comanda un
// salvataggio», e una REGIONE — la carta che ha il salva — che decide sia
// quale pulsante indicare sia quale clic spegne la barra. Cosi' un salva che
// non riconosciamo produce silenzio, mai un pulsante che mente.
//
// Uso: node scripts/verifica-barra-salva.mjs   (esce 1 se qualcosa non torna)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

const corpoDi = (nome) => {
  const i = app.indexOf(`function ${nome}(`);
  if (i < 0) return null;
  let liv = 0, dentro = false;
  for (let j = app.indexOf('{', i); j < app.length; j++) {
    if (app[j] === '{') { liv++; dentro = true; }
    else if (app[j] === '}') { liv--; if (dentro && liv === 0) return app.slice(i, j + 1); }
  }
  return null;
};

// ---- 1. una sola definizione di «questo comanda un salvataggio» -----------
const def = app.match(/const SEL_SALVA = '([^']+)';/);
dice(!!def, 'SEL_SALVA e\' definito una volta sola');
const senzaDef = def ? app.replace(def[0], '') : app;
const altrove = [...senzaDef.matchAll(/button\[id\*=/g)].length;
dice(altrove === 0,
  'nessuno si riscrive il selettore per conto suo', `${altrove} copie fuori da SEL_SALVA`);
dice(!!def && def[1].includes('[data-salva]'),
  'anche i salva marcati con un attributo sono riconosciuti');
dice(!/data-salva-modulo/.test(app),
  'una marca sola, non due, sullo stesso pulsante');

// ---- 2. il pulsante indicato viene dalla REGIONE, non dal pannello --------
const bottoni = corpoDi('_bottoniSalva') || '';
dice(bottoni.includes('_salvaRegione'), '_bottoniSalva() guarda la regione');
dice(!/pannello-scheda\.visibile'\)\.querySelectorAll|pan\.querySelectorAll/.test(bottoni),
  'non ripiega mai a frugare nel pannello intero');
dice(bottoni.includes('isConnected') && bottoni.includes(".closest('.pannello-scheda.visibile')"),
  'una regione sparita o nascosta non indica piu' + '’ niente');

// ---- 3. la regione e' la carta che HA il salva ---------------------------
const regione = corpoDi('_regioneSalva') || '';
dice(regione.includes(".closest('.carta')"), 'la regione parte dalla carta piu’ vicina');
dice(/length === 1/.test(regione),
  'risale al pannello solo se il salva li’ e’ uno solo (con due, tacere e’ meglio che indovinare)');

// ---- 4. niente regione, niente allarme ----------------------------------
const avvia = corpoDi('avviaBarraSalva') || '';
dice(/const reg = _regioneSalva\(t\);\s*\n\s*if \(!reg\) return;/.test(avvia),
  'un campo senza salvataggio da indicare non accende l\'avviso');

// ---- 5. si spegne per il TUO salva, non per un salva qualsiasi -----------
dice(avvia.includes('!_salvaRegione.contains(b)'),
  'il clic su un salva di un\'altra zona non spegne il tuo avviso');
dice(!/\{\s*\n\s*_salvaSporco = false;\s*\n\s*_mostraBarraSalva\(false\);\s*\n\s*\}, true\);/.test(avvia),
  'lo spegnimento passa da azzeraBarraSalva(), non da mezze pulizie a mano');

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nLa barra indica il salva giusto, e solo quello. ✓');
process.exit(rossi.length ? 1 : 0);
