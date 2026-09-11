// LA LINGUA DISEGNATA DEL SITO: contorno d'inchiostro, ombra dura, retino,
// pennarello sui titoli. E' una grammatica, quindi si puo' controllare.
//
// Due regole reggono tutto il resto, e sono quelle che si perdono per prime:
//
// 1. L'OMBRA DICE L'ALTEZZA. Se la targhetta, il bottone, la carta e il
//    pannello che si apre hanno tutti la stessa ombra dura, non c'e' piu'
//    gerarchia: e' tutto appiccicato allo stesso piano e la pagina diventa
//    rumore. Misurato sulle pagine vere: prima carta e bottone stavano
//    entrambi a 4px, cioe' un bottone non sembrava POSATO sulla carta.
// 2. IL CORPO DEL TESTO E' NOIOSO. Il pennarello e' per i titoli e per le
//    scritte corte. Un paragrafo scritto a pennarello non si legge, e il gesto
//    smette di valere qualcosa proprio perche' e' dappertutto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const tema = readFileSync(join(RAD, 'src/web/public/tema.css'), 'utf8');
const stile = readFileSync(join(RAD, 'src/web/public/style.css'), 'utf8');
const anime = readFileSync(join(RAD, 'src/web/public/anime.css'), 'utf8');

const SCALA = ['--ombra-ink-timbro', '--ombra-ink', '--ombra-ink-alta', '--ombra-ink-salto'];

function scostamenti(blocco) {
  const i = tema.indexOf(blocco);
  const testo = tema.slice(i, tema.indexOf('}', i));
  const out = {};
  for (const n of SCALA) {
    const m = testo.match(new RegExp(`${n}:\\s*(-?\\d+(?:\\.\\d+)?)px`));
    if (m) out[n] = Number(m[1]);
  }
  return out;
}

for (const [nome, blocco] of [['chiaro', ':root {'], ['scuro', ':root[data-theme="dark"]']]) {
  test(`tema ${nome}: la scala delle ombre sale davvero, senza gradini doppi`, () => {
    const s = scostamenti(blocco);
    for (const n of SCALA) assert.ok(typeof s[n] === 'number', `${n} c'e' nel tema ${nome}`);
    const v = SCALA.map((n) => s[n]);
    assert.deepEqual(v, [...v].sort((a, b) => a - b), `in ordine: ${v.join(' < ')}`);
    assert.equal(new Set(v).size, v.length, `quattro gradini distinti, non ${JSON.stringify(v)}`);
  });
}

test('la carta, il bottone e quello che galleggia stanno su tre gradini diversi', () => {
  const tutto = stile + '\n' + anime;
  const ombraDi = (sel) => {
    const re = new RegExp(`${sel.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\{[^}]*box-shadow:\\s*([^;]+);`, 'g');
    const trovate = [...tutto.matchAll(re)].map((m) => m[1].trim());
    return trovate[trovate.length - 1] || null;
  };
  const carta = ombraDi('\n.carta');
  const drawer = ombraDi('.drawer');
  assert.ok(carta, 'la carta ha la sua ombra');
  assert.match(carta, /--ombra-ink-alta/, `la carta sta sul gradino delle carte, non su ${carta}`);
  assert.match(String(drawer), /--ombra-ink-salto/, `quello che si apre sopra tutto sta piu' in alto, non ${drawer}`);
  assert.ok(!/^var\(--ombra-ink\)$/.test(carta), 'la carta non divide il gradino col bottone');
  const bottone = stile.match(/\.btn\s*\{[^}]*box-shadow:\s*([^;]+);/);
  if (bottone) assert.doesNotMatch(bottone[1], /--ombra-ink-alta|--ombra-ink-salto/, 'il bottone sta sotto la carta');
});

test('il pennarello non finisce nel corpo del testo', () => {
  const tutto = stile + '\n' + anime;
  for (const sel of ['body', 'p', 'li', '.carta p', '.suggerimento']) {
    const re = new RegExp(`(^|[,}])\\s*${sel.replace('.', '\\\\.')}\\s*\\{[^}]*font-family:\\s*var\\(--mano\\)`, 'm');
    assert.doesNotMatch(tutto, re, `${sel} resta in Archivo`);
  }
});

test('il bianco scritto a mano non scavalca il tema', () => {
  // Un `color: #fff` dentro una regola di stato non cambia col tema, e nel tema
  // scuro finisce su un fondo chiaro: e' cosi' che il bottone del «cancella
  // tutto» era sceso a 3.37:1.
  const righe = (stile + '\n' + anime).split('\n')
    .filter((r) => /\.btn[.\w-]*\s*[,{:]/.test(r) || /^\s*(background|color):/.test(r))
    .filter((r) => /color:\s*(#fff\b|#ffffff\b|white)\s*;/i.test(r) && /pericolo|avviso|attenzione/.test(r));
  assert.deepEqual(righe, [], 'nessun bianco fisso sui bottoni di stato');
});
