// I TESTI DI TELEGRAM E DISCORD DICONO IL VERO.
//
// Frasi che il pannello diceva e che il codice smentiva: «Rileva gruppo» che
// «funziona solo da spento» (legge anche i posti visti dal bot acceso), un
// rimando ad «Admin → Anima» che lo streamer non puo' aprire, il nome vecchio
// del gruppo dei comandi, un interruttore chiamato con parole che non ha, una
// mini-guida che fa premere un tasto che non c'e', i moderatori che «passano
// sempre» il filtro anche quando il loro ruolo non e' spuntato. Qui si fissano
// contro i nomi veri, letti dal pannello stesso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');

const corpo = (nome) => {
  const i = APP.search(new RegExp(`(async )?function ${nome}\\(`));
  assert.ok(i >= 0, `c'e' ${nome}`);
  return APP.slice(i, APP.indexOf('\n}\n', i));
};
const tre = (blocco, chiave) => {
  const m = new RegExp(`\\b${chiave}: \\['([^']+)', '([^']+)', '([^']+)'\\]`).exec(blocco);
  assert.ok(m, `trovo ${chiave}`);
  return [m[1], m[2], m[3]];
};
const guida = (id) => {
  const i = APP.indexOf(`\n  ${id}: { serve:`);
  assert.ok(i >= 0, `c'e' la guida di ${id}`);
  const fine = APP.slice(i + 5).search(/\n  [a-z]+: \{ serve:|\n\};/);
  return APP.slice(i, i + 5 + fine);
};
const TG = corpo('pannelloTelegram');

test('«Rileva gruppo» non si dice spento solo: legge anche i posti visti dal bot acceso', () => {
  assert.ok(!TG.includes('funziona solo da spento'));
  assert.ok(!TG.includes('only works when off'));
  const i = SRV.indexOf("app.post('/api/streamer/telegram/rileva'");
  assert.match(SRV.slice(i, i + 800), /await chatViste\(login, c\)/, 'e il server usa la stessa lettura per tutte e due le strade');
});

test('niente rimandi a schede che lo streamer non apre', () => {
  assert.ok(!TG.includes('Admin → Anima'));
});

test('il gruppo dei comandi si chiama come nel menù, nelle tre lingue', () => {
  const g = tre(APP.slice(APP.indexOf('const T_GRUPPO')), 'pubblico');
  const s = tre(APP.slice(APP.indexOf('const T_SCHEDA')), 'moduli');
  const amp = (x) => x.replace(/&/g, '&amp;');
  for (let i = 0; i < 3; i++) assert.ok(TG.includes(`<strong>${amp(g[i])} → ${s[i]}</strong>`), `${g[i]} → ${s[i]}`);
});

test('l\'interruttore del bot interattivo si chiama come si chiama, ovunque lo si nomini', () => {
  const nome = /etichetta-stato">\$\{L\('([^']+)', '([^']+)', '([^']+)'\)\}<\/span>\n\s*\$\{tg\.interattivo/.exec(TG);
  assert.ok(nome, 'trovo l\'interruttore');
  assert.equal(nome[1], 'Bot interattivo nel gruppo');
  const dest = corpo('caricaTgDestinazioni');
  for (let i = 1; i <= 3; i++) assert.ok(dest.includes(`«${nome[i]}»`), `il rimando dice «${nome[i]}»`);
  assert.ok(SRV.includes(`Spegni e riaccendi «${nome[1]}»`), 'e anche il messaggio del server');
  assert.ok(!/«(il|the|el) bot (risponde|replies|responde)/.test(dest + SRV));
});

test('la mini-guida di Telegram fa premere il tasto che c\'e\', dopo /collega', () => {
  const g = guida('telegram');
  assert.ok(g.includes('\\u00abRileva gruppo\\u00bb'));
  assert.ok(g.includes('/collega'));
  assert.ok(TG.includes("L('Rileva gruppo', 'Detect group', 'Detectar grupo')"), 'il tasto si chiama così');
});

test('la mini-guida dei Ruoli dice cosa mostra Discord: i permessi che il bot chiede', () => {
  const g = guida('ruoli');
  assert.ok(!g.includes('confermare un permesso'));
  assert.ok(g.includes('ti mostra i permessi che il bot chiede'));
});

test('la mini-guida del Filtro non promette che i moderatori passano sempre', () => {
  const g = guida('dcfiltro');
  assert.ok(!g.includes('passano sempre'));
  assert.ok(g.includes('«Questi ruoli passano»'));
  assert.ok(APP.includes("L('Questi ruoli passano', 'These roles get through', 'Estos roles pasan')"), 'la casella si chiama così');
});

test('niente lineetta lunga nelle etichette di Telegram e Discord', () => {
  for (const f of ['_dcOpzioniRuolo', 'caricaDcAvvisi', 'fasciaDistruttiva', '_dcsOpzioniChi', 'caricaCompleanni', 'pannelloDcAvvisi', 'caricaTgDestinazioni', 'pannelloTelegram', 'pannelloRuoli', 'pannelloDcServer', 'pannelloChiEntra', 'pannelloFiltro', '_dcsDiffHtml']) {
    assert.ok(!corpo(f).includes('—'), `${f} usa «—»`);
  }
  const temi = leggi('src/features/carta-disegno.js');
  assert.ok(!/nome: '[^']*—/.test(temi), 'i nomi dei temi della locandina');
});
