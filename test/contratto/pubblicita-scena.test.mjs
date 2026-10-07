// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL CONTO ALLA PUBBLICITA' E' UN ELEMENTO DELLA SCENA (docs/PUBBLICITA.md, «Il
// conto sull'overlay»). Si mette, si sposta e si veste come il conto alla
// rovescia; i tempi invece non li sceglie nessuno: li dice Twitch, e il bot li
// porta all'overlay.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normPubblicita } from '../../src/web/stile.js';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const OVL = leggi('src/web/public/overlay-app.js');
const ALERTS = leggi('src/features/alerts.js');

const oggetto = (testo, inizio) => {
  const i = testo.indexOf(inizio);
  assert.ok(i >= 0, `manca ${inizio}`);
  const da = testo.indexOf('return {', i) + 7;
  let d = 0;
  for (let j = da; j < testo.length; j++) { if (testo[j] === '{') d++; else if (testo[j] === '}') { d--; if (!d) return new Function('VESTE_DEF', 'return (' + testo.slice(da, j + 1) + ')'); } }
  return null;
};

test('il pannello e il server partono dallo stesso conto', () => {
  const def = oggetto(APP, 'function _defPubblicita()')(() => normPubblicita({}).stile);
  assert.deepEqual(def, normPubblicita({}), 'spento, in alto a destra, sempre visibile, anche durante la pausa');
  assert.equal(normPubblicita({ mostraDa: 999 }).mostraDa, 60, 'al massimo un\'ora prima');
  assert.equal(normPubblicita({ mostraDa: -3 }).mostraDa, 0);
  assert.equal(normPubblicita({ pausa: false }).pausa, false, 'durante la pausa si puo\' togliere');
  assert.equal(normPubblicita({ titolo: 'x'.repeat(200) }).titolo.length, 60);
  assert.equal(normPubblicita({ attivo: 'si' }).attivo, false, 'acceso solo se lo si accende davvero');
});

test('e\' un elemento come gli altri, di qua e di la\' dal filo', () => {
  assert.ok(/const ELEM_OVERLAY = \[[^\]]*'pubblicita'/.test(SRV) && /const ELEM_OVL = \[[^\]]*'pubblicita'/.test(APP), 'nell\'elenco, da tutte e due le parti');
  assert.ok(/out\.push\(\{ k: 'pubblicita', ico: ICO\.megafono, n: L\('Conto alla pubblicità'[^}]*cfg: 'overlayPubblicita' \}\);/.test(APP), 'nella colonna dei livelli, con la sua configurazione');
  assert.ok(/const VESTITORE = \{[^}]*\bpubblicita: _vestiPubblicita\b/.test(APP), 'sulla tela c\'e\' la sua carta');
  assert.ok(/const _DEF_EL = \{[^\n]*\bpubblicita: _defPubblicita\b/.test(APP), 'e i suoi valori di partenza');
  assert.ok(/\['pubblicita', '#sez-pubblicita'\]/.test(APP) && /<div class="asp-blocco" data-asp="pubblicita" data-cfg-di="pubblicita">/.test(APP), 'e nell\'ispettore il suo blocco');
  assert.ok(/for \(const k of new Set\(\[\.\.\.document\.querySelectorAll\('\[data-cfg\]'\)\]\.map\(\(n\) => n\.dataset\.cfg\)\)\) riempiCfgForm\(k\);/.test(APP)
    && /data-cfg="pubblicita"/.test(APP) && /data-salva-cfg="pubblicita"/.test(APP), 'la carta si riempie (come ogni modulo che c\'e\') e si salva');
  assert.ok(/if \(b\.overlayPubblicita !== undefined\) out\.overlayPubblicita = normPubblicita\(b\.overlayPubblicita\);/.test(SRV), 'il server ripulisce quello che arriva');
  assert.ok(/\['overlayCss'[^\]]*'overlayPubblicita'[^\]]*\]\.some\(\(k\) => k in out\)/.test(SRV), 'salvarlo avvisa gli overlay aperti');
});

test('in diretta conta da solo, fra un messaggio e l\'altro', () => {
  assert.ok(OVL.includes("else if (dati.tipo === 'pubblicita') { MIO.pubblStato = { prossima: Number(dati.prossima) || 0, pausaFino: Number(dati.pausaFino) || 0 }; disegnaPubblicita(); }"),
    'il bot manda gli istanti, non i secondi che mancano: il conto lo fa l\'overlay');
  assert.ok(/function giro\(\) \{[^]*?if \(MIO\.pubbl && MIO\.pubbl\.attivo\) disegnaPubblicita\(\);/.test(OVL) && /setTimeout\(giroSecondo, dopo\);/.test(OVL), 'ogni secondo, a meta\' del secondo del server');
  assert.ok(/MIO\.pubblStato = \(MIO\.pubbl && MIO\.pubbl\.stato\) \|\| \{ prossima: 0, pausaFino: 0 \};/.test(OVL), 'un overlay che si apre a pausa in corso parte dallo stato del tema');
  assert.ok(/vestiElemento\(el, cfg, 'nessuna', 'pubblicita'\);/.test(OVL), 'la posa passa dalla porta di tutti, con la sua chiave');
  assert.ok(/!mostra\('pubblicita'\)/.test(OVL.slice(OVL.indexOf('function disegnaPubblicita('), OVL.indexOf('function togliPubblicita('))), 'e un overlay che non lo mostra non lo mostra');
});

test('i titoli di base sono gli stessi di qua e di la\', e nella lingua della chat', () => {
  const titoli = (testo, nome) => {
    const m = new RegExp(`const ${nome} = (?:\\(\\) => \\()?(\\{ it: [^\\n]*?\\] \\})`).exec(testo);
    assert.ok(m, `manca ${nome}`);
    return new Function('return (' + m[1] + ')')();
  };
  assert.deepEqual(titoli(APP, '_TITOLI_PUBBLICITA'), titoli(ALERTS, 'TITOLI_PUBBLICITA'), 'lo Studio mostra quello che l\'overlay scrivera\'');
  assert.ok(/_TITOLI_PUBBLICITA\(\)\[\['it', 'en', 'es'\]\.includes\(stato\?\.linguaChat\) \? stato\.linguaChat : 'it'\]/.test(APP), 'la lingua e\' quella della chat, che dice il server');
  assert.ok(/linguaChat: user \? linguaChat\(user\.login\) : 'it',/.test(SRV), 'e il server la legge dal posto solo');
  assert.ok(/textContent = cfg\.titolo \|\| _titoliPubblicita\(\)\[0\];/.test(APP), 'sulla tela');
  assert.ok(/placeholder="\$\{esc\(_titoliPubblicita\(\)\[0\]\)\}"/.test(APP) && /placeholder="\$\{esc\(_titoliPubblicita\(\)\[1\]\)\}"/.test(APP), 'e nelle caselle vuote');
});
