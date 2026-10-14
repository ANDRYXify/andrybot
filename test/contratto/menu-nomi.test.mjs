// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL MENU E LE SOTTOSEZIONI: UN NOME, UNA BARRA, UN MOVIMENTO.
//
// Il difetto da cui nasce (docs/MENU.md): la stessa cosa aveva fino a quattro
// nomi (menu «Giochi», titolo «Giochi», barra «Giochi & classifiche», manuale
// «Chat e pubblico → Giochi»), una pagina poteva avere tre barre impilate di
// cui una ripeteva il menu, le famiglie mettevano insieme cose diverse
// (Sondaggi «dentro» Giochi, Musica «dentro» Regia) e cambiare sottosezione
// faceva rientrare di nuovo tutte le carte.
//
// Qui non si cercano frasi: si leggono le tabelle vere del pannello e si
// controllano le regole su quello che ne esce.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const CSS = readFileSync(join(RAD, 'src/web/public/style.css'), 'utf8');

function valore(inizio, fine) {
  const i = APP.indexOf(inizio);
  assert.ok(i >= 0, `manca ${inizio}`);
  const testo = APP.slice(i + inizio.length - 1, APP.indexOf(fine, i) + fine.length);
  return new Function(`return (${testo});`)();
}
function corpo(nome) {
  const i = APP.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `manca ${nome}`);
  return APP.slice(i, APP.indexOf('\n}\n', i) + 2);
}

const FAMIGLIE = valore('const FAMIGLIE = [', '\n]');
const GRUPPI = valore('const GRUPPI = [', '\n]');
const ADMIN = valore('const GRUPPO_ADMIN = {', '] }');
const T_GRUPPO = valore('const T_GRUPPO = {', '\n}');
const T_FAMIGLIA = valore('const T_FAMIGLIA = {', '\n}');
const T_SCHEDA = valore('const T_SCHEDA = {', '\n}');
const SOTTO = APP.slice(APP.indexOf('const SOTTO_SCHEDE = {'), APP.indexOf('\n};', APP.indexOf('const SOTTO_SCHEDE = {')));
const CON_PARTI = [...SOTTO.matchAll(/^ {2}([a-z]+): \{$/gm)].map((m) => m[1]);

const famigliaDi = (id) => FAMIGLIE.find((f) => f.parti.includes(id)) || null;
const nomeNelMenu = (id, lingua) => { const f = famigliaDi(id); return f ? T_FAMIGLIA[f.id][lingua] : T_SCHEDA[id][lingua]; };
const VOCI = [...GRUPPI, ADMIN].flatMap((g) => g.schede.map(([id, nome]) => ({ id, nome, g })));

test('ogni voce del menu si chiama come la sua pagina, nelle tre lingue', () => {
  assert.ok(VOCI.length >= 30 && CON_PARTI.length >= 4, `voci ${VOCI.length}, pagine con le parti ${CON_PARTI.length}`);
  for (const { id, nome } of VOCI) {
    for (let l = 0; l < 3; l++) assert.ok(nomeNelMenu(id, l), `«${id}» senza nome nella lingua ${l}`);
    assert.equal(nome, nomeNelMenu(id, 0), `«${id}»: il menu dice «${nome}», la tabella dei nomi «${nomeNelMenu(id, 0)}»`);
  }
  for (const f of FAMIGLIE) for (const p of f.parti) assert.ok(T_SCHEDA[p]?.length === 3, `la parte «${p}» senza i tre nomi`);
  for (const g of GRUPPI) assert.ok(T_GRUPPO[g.id]?.length === 3 && T_GRUPPO[g.id][0] === g.nome, `il gruppo «${g.id}» ha un nome solo`);
});

test('nessun nome si ripete: un gruppo non si chiama come una sua voce, due voci non si chiamano uguali', () => {
  for (let l = 0; l < 3; l++) {
    const visti = new Map();
    for (const { id, g } of VOCI) {
      const n = nomeNelMenu(id, l);
      assert.ok(!visti.has(n), `«${n}» due volte nel menu (${visti.get(n)} e ${id})`);
      visti.set(n, id);
      if (g.schede.length > 1) assert.notEqual(n, T_GRUPPO[g.id][l], `il gruppo «${T_GRUPPO[g.id][l]}» ripete la sua voce`);
    }
    for (const f of FAMIGLIE) {
      const nomi = f.parti.map((p) => T_SCHEDA[p][l]);
      assert.equal(new Set(nomi).size, nomi.length, `due parti di «${f.id}» con lo stesso nome`);
    }
  }
});

test('i nomi del menu non hanno articoli ne\' possessivi, e in italiano si scrive «e»', () => {
  const nomi = [...GRUPPI.filter((g) => g.schede.length > 1).map((g) => g.nome), ...VOCI.filter((v) => !famigliaDi(v.id)).map((v) => v.nome),
    ...FAMIGLIE.flatMap((f) => f.parti.map((p) => T_SCHEDA[p][0]))];
  for (const n of nomi) {
    assert.doesNotMatch(n, /^(Il|Lo|La|I|Gli|Le|Il tuo|La tua|I tuoi|Le tue) /, `«${n}»`);
    assert.doesNotMatch(n, /&/, `«${n}»: in italiano «e»`);
  }
});

test('un gruppo con una voce sola e\' una voce, col nome della voce', () => {
  assert.ok(corpo('navDrawerHtml').includes('if (g.schede.length === 1) return `<div class="drawer-grp drawer-solo">${voci}</div>`;'));
  for (const g of GRUPPI.filter((x) => x.schede.length === 1)) {
    assert.equal(g.nome, g.schede[0][1], `il gruppo «${g.id}» da una voce sola porta il nome della voce`);
  }
});

test('una famiglia sono le parti di UNA cosa: la apre una voce sola, e le parti non stanno anche nel menu', () => {
  const nelMenu = new Set(VOCI.map((v) => v.id));
  const viste = new Set();
  for (const f of FAMIGLIE) {
    assert.ok(nelMenu.has(f.parti[0]), `la famiglia «${f.id}» si apre dalla sua prima parte`);
    for (const p of f.parti.slice(1)) assert.ok(!nelMenu.has(p), `«${p}» sta nel menu e nella barra di «${f.id}»`);
    for (const p of f.parti) { assert.ok(!viste.has(p), `«${p}» in due famiglie`); viste.add(p); }
  }
  const voci = VOCI.map((v) => v.id);
  assert.equal(new Set(voci).size, voci.length, 'una voce in due gruppi');
});

test('al massimo una barra per pagina, e mai una che ripete il menu a schermo', () => {
  for (const p of CON_PARTI) assert.ok(!famigliaDi(p), `«${p}» ha le sue parti e anche una famiglia: due barre`);
  assert.match(corpo('sorelleDi'), /if \(SOTTO_SCHEDE\[id\]\) return null;/, 'una pagina con le parti non ha anche le sorelle del gruppo');
  assert.match(CSS, /\.fam-barra\.dal-gruppo \{ display: none; \}/, 'le sorelle del gruppo col menu a schermo ripetono il menu');
  assert.match(CSS, /@media \(max-width: 720px\) \{\n {2}\.fam-barra\.dal-gruppo \{ display: flex; \}/, 'sul telefono il menu e\' chiuso: li\' servono');
  assert.match(CSS, /body\.tutto-schermo \.fam-barra\.dal-gruppo \{ display: flex; \}/, 'e a tutto schermo il menu non c\'e\'');
});

test('ogni scheda di prima si apre ancora: i link, le novita\' e i manuali restano buoni', () => {
  const PRIMA = ['stato', 'personalita', 'conoscenza', 'memoria', 'ascolto', 'moduli', 'regole', 'giochi', 'sondaggi', 'giveaway',
    'penitenze', 'negozio', 'statistiche', 'scudo', 'attacchi', 'follower', 'registro', 'regia', 'clip', 'musica', 'dirette', 'consolify',
    'alert', 'effetti', 'emote', 'pagina', 'donazioni', 'settimana', 'grafiche', 'notifiche', 'telegram', 'ruoli', 'dcavvisi', 'dcserver',
    'dcentra', 'dcfiltro', 'qr', 'misure', 'kit', 'pannelli', 'account', 'sottoscrizione'];
  const ora = new Set([...VOCI.map((v) => v.id), ...FAMIGLIE.flatMap((f) => f.parti)]);
  for (const id of PRIMA) assert.ok(ora.has(id), `«${id}» non si apre piu'`);
});

test('la testata: in alto dove sei, nel titolo il nome della pagina', () => {
  const info = corpo('infoScheda');
  assert.match(info, /if \(f\) return \{ area: tFamiglia\(f\.id, f\.nome\), titolo: tScheda\(id\) \};/);
  assert.match(info, /area: g\.schede\.length === 1 \? '' : tGruppo\(g\.id, g\.nome\), titolo: tScheda\(id\)/);
});

test('un cambio, un movimento: cambiare parte o sorella non fa rientrare le carte', () => {
  const sotto = corpo('scegliSotto');
  const sorella = corpo('_scambiaScheda');
  for (const [nome, c] of [['scegliSotto', sotto], ['_scambiaScheda', sorella]]) {
    assert.ok(!c.includes('rivelaCarte('), `${nome} ridisegna tutte le carte`);
    assert.ok(c.includes('mostraFerme('), `${nome} scambia il contenuto con una dissolvenza sola`);
  }
  assert.match(sorella, /_titoloFermo = true;\n\s+aggiornaTestataPagina\(\);\n\s+_titoloFermo = false;/, 'e il titolo non rientra parola per parola');
  const ferme = corpo('mostraFerme');
  assert.match(ferme, /c\.classList\.remove\('rivela'\); c\.classList\.add\('dentro'\);/);
  assert.match(ferme, /if \(_menoMoto\) return;/, 'chi chiede meno movimento non ha neanche la dissolvenza');
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\) \{\n {2}\.pannello-scheda\.scambio \{ animation: none; \}/);
});

test('i percorsi scritti nel pannello e nei manuali sono quelli del menu di oggi', () => {
  assert.match(APP, /function percorso\(id\) \{/);
  const vecchi = ['Chat e pubblico', 'Chat & audience', 'Chat y público', 'Giochi & classifiche', 'Effetti & suoni', 'Scena & overlay',
    'Durante la diretta', 'Le tue community', 'Your communities', 'La tua vetrina', '«Il tuo account»', '«I tuoi social»', '«La tua settimana»',
    '«Lo scudo»', '«Gli attacchi»', '«I tuoi follower»', 'Registro dello scudo', 'Filtri e regole', 'Sondaggi & predizioni'];
  const file = ['src/web/public/app.js', 'src/web/public/voce.js', 'src/web/public/tgapp.js', 'src/web/guide/it.js',
    ...readdirSync(join(RAD, 'src/web/manuali/it')).map((f) => 'src/web/manuali/it/' + f)];
  for (const f of file) {
    const t = readFileSync(join(RAD, f), 'utf8');
    for (const v of vecchi) assert.ok(!t.includes(v), `${f}: «${v}» e' un nome che il menu non ha piu'`);
  }
});
