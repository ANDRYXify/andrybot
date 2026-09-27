// I PANNELLI DI TWITCH (src/web/public/pannelli.js e src/features/pannelli.js,
// docs/STRUMENTI.md): si leggono per costruzione, nascono pieni di quello che
// il canale sa, e quello che si salva ha forma. Il disegno vero si guarda nel
// browser; qui una tela finta misura il testo (ogni carattere largo 0,6 volte
// la sua altezza) e ricorda cosa e' stato scritto e dove.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

await import('../../src/web/public/kit.js');
await import('../../src/web/public/pannelli.js');
const K = globalThis.SB_KIT, P = globalThis.SB_PANNELLI;
const S = await import('../../src/features/pannelli.js');
const APP = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/web/public/app.js'), 'utf8');

function tela() {
  return {
    font: '10px x', fillStyle: '', textAlign: 'left', scritte: [], immagini: [],
    measureText(s) { return { width: String(s).length * Number(/(\d+)px/.exec(this.font)[1]) * 0.6 }; },
    fillText(t, x, y) { this.scritte.push({ t, x, y, px: Number(/(\d+)px/.exec(this.font)[1]), colore: this.fillStyle, align: this.textAlign }); },
    drawImage(...a) { this.immagini.push(a); },
    clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, arcTo() {}, closePath() {}, fill() {}, stroke() {},
  };
}
const CAR = { famiglia: 'Archivo', peso: 800, stile: '' };
const COL = { fondo: '#151216', testo: '#f4eef2', accento: '#b8237f' };
const ICONA = { finta: true };

test('motore e server hanno le stesse misure e gli stessi nomi', () => {
  assert.equal(P.W, S.W);
  assert.deepEqual(P.ALTEZZE, S.ALTEZZE);
  assert.deepEqual(P.TEMI, S.TEMI);
  assert.deepEqual(P.FORME, S.FORME);
  assert.deepEqual(P.TIPI, S.TIPI);
  assert.deepEqual(P.ICONE, S.ICONE);
  for (const k of ['voci', 'titolo', 'link', 'testo', 'comandi']) assert.equal(P.MAX[k], S.MAX[k], k);
  assert.equal(P.W, 320, 'Twitch mostra i pannelli larghi 320');
  assert.ok(Math.max(...P.ALTEZZE) <= 600, 'e alti al massimo 600');
});

test('ogni icona che si puo\' scegliere esiste fra quelle del pannello', () => {
  const i = APP.indexOf('const ICO = {');
  const corpo = APP.slice(i, APP.indexOf('\n};', i));
  const chiavi = new Set([...corpo.matchAll(/^ {2}([a-zA-Z_]+):/gm)].map((m) => m[1]));
  for (const k of S.ICONE_SCELTA) assert.ok(chiavi.has(k), `${k} non c'e' in ICO`);
  for (const k of Object.values(S.ICONE)) assert.ok(S.ICONE_SCELTA.includes(k), `l'icona di serie ${k} si deve poter riscegliere`);
});

test('il testo contrasta sempre almeno 4,5 col suo sfondo, qualunque accento', () => {
  const passi = [0, 51, 102, 153, 204, 255];
  let colori = 0;
  for (const r of passi) for (const g of passi) for (const b of passi) {
    const acc = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    for (const tema of P.TEMI) {
      const c = P.tavolozza(tema, { acc }, K);
      assert.ok(K.contrasto(c.testo, c.fondo) >= 4.5, `${tema} ${acc}: testo ${c.testo} su ${c.fondo}`);
      assert.ok(c.accento === c.testo || K.contrasto(c.accento, c.fondo) >= 3, `${tema} ${acc}: accento`);
      colori++;
    }
  }
  assert.equal(colori, 216 * 3);
  assert.equal(P.tavolozza('carta', { acc: '#b8237f' }, K).accento, '#b8237f', 'un accento che contrasta resta suo');
});

test('il titolo parte grande e si rimpicciolisce finche\' ci sta', () => {
  const g = tela();
  const corto = P.disegna(g, { h: 100, titolo: 'Discord', icona: ICONA, colori: COL, forma: 'netta', carattere: CAR });
  assert.equal(corto.px, 40);
  assert.deepEqual(corto.problemi, []);
  const s = g.scritte.at(-1);
  assert.equal(s.colore, COL.testo);
  assert.equal(s.align, 'left');
  // icona da 46, margine interno 16: il testo parte a 6 + 16 + 46 + 12 e finisce entro 6 + 308 - 16
  assert.equal(s.x, 80);
  const lungo = P.disegna(tela(), { h: 100, titolo: 'Quando sono in diretta', icona: ICONA, colori: COL, forma: 'netta', carattere: CAR });
  assert.ok(lungo.px < 40 && lungo.px >= P.MIN_PX);
  assert.ok(lungo.testo === 'Quando sono in diretta' && 'Quando sono in diretta'.length * lungo.px * 0.6 <= 218);
  const g2 = tela();
  P.disegna(g2, { h: 100, titolo: 'Senza icona', colori: COL, forma: 'piena', carattere: CAR });
  assert.equal(g2.scritte.at(-1).align, 'center');
  assert.equal(g2.scritte.at(-1).x, 160, 'senza icona sta nel mezzo');
  assert.equal(g2.immagini.length, 0);
});

test('una serie ha una misura sola: quella che fa stare il titolo piu\' lungo', () => {
  const titoli = ['Chi sono', 'Programma', 'Sostieni le dirette'];
  const px = Math.min(...titoli.map((titolo) => P.misura(tela(), { h: 100, titolo, icona: true, carattere: CAR })));
  assert.ok(px < 40 && px >= P.MIN_PX);
  const disegnati = titoli.map((titolo) => {
    const g = tela();
    P.disegna(g, { h: 100, px, titolo, icona: ICONA, colori: COL, forma: 'netta', carattere: CAR });
    return g.scritte.at(-1);
  });
  assert.deepEqual(disegnati.map((s) => s.px), [px, px, px], 'tutti alla stessa misura');
  assert.equal(disegnati[2].t, titoli[2], 'e il piu\' lungo ci sta intero');
  assert.equal(P.misura(tela(), { h: 100, titolo: 'Chi sono', icona: false, carattere: CAR }), 40);
});

test('solo sotto il carattere minimo si accorcia coi puntini, e lo dice', () => {
  const r = P.disegna(tela(), { h: 80, titolo: 'Un titolo decisamente troppo lungo per un pannello', icona: ICONA, colori: COL, forma: 'netta', carattere: CAR });
  assert.equal(r.px, P.MIN_PX);
  assert.ok(r.testo.endsWith('…'));
  assert.equal(r.problemi[0].tipo, 'titolo');
});

const TESTI = {
  titoli: { chi: 'Chi sono', programma: 'Quando sono in diretta', social: 'Social', discord: 'Discord', dona: 'Sostienimi', comandi: 'Comandi', regole: 'Regole', libero: 'Pannello' },
  giorni: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'],
  fuso: (f) => `Orari: ${f}`, discord: 'Entra nel server.', dona: 'Grazie!', regole: ['Rispetto per tutti', '# niente titoli'],
};
const PIENO = {
  linkPagina: 'https://socialbot.live/u/andryx', linkDona: 'https://dona.socialbot.live/andryx', linkDiscord: 'https://discord.socialbot.live/andryx',
  bio: 'Gioco a *tutto* quello che ha una storia',
  social: [{ icona: 'instagram', url: 'https://instagram.com/andryx' }, { icona: 'x', url: 'https://x.com/a_(b)' }, { icona: 'tiktok', url: 'javascript:alert(1)' }],
  settimana: { fuso: 'Europe/Rome', giorni: [{ ora: '21:00', att: 'Minecraft' }, { off: true }, { ora: '' }, { ora: '18:30' }, {}, {}, {}] },
  comandi: ['discord', 'so-cial', ...Array.from({ length: 20 }, (_, i) => `c${i}`)],
};

test('i pannelli nascono pieni di quello che il canale sa, e solo di quello', () => {
  const v = P.predefiniti(PIENO, TESTI);
  assert.deepEqual(v.map((x) => x.tipo), ['chi', 'programma', 'social', 'discord', 'dona', 'comandi', 'regole']);
  const per = Object.fromEntries(v.map((x) => [x.tipo, x]));
  assert.equal(per.chi.link, PIENO.linkPagina);
  assert.equal(per.chi.testo, 'Gioco a \\*tutto\\* quello che ha una storia', 'il testo di fuori non formatta per sbaglio');
  assert.equal(per.programma.testo, '- **Lunedì** 21:00 · Minecraft\n- **Giovedì** 18:30\n\nOrari: Europe/Rome', 'riposo e giorni senza ora non ci sono');
  assert.equal(per.social.testo, '- [Instagram](https://instagram.com/andryx)\n- [X](https://x.com/a_%28b%29)', 'un indirizzo non web resta fuori, le parentesi non rompono il link');
  assert.equal(per.discord.link, PIENO.linkDiscord);
  assert.equal(per.dona.link, PIENO.linkDona);
  assert.equal(per.comandi.testo.split('\n').length, P.MAX.comandi);
  assert.ok(per.comandi.testo.startsWith('- !discord\n- !social\n'), 'i nomi dei comandi solo con lettere, numeri e trattino basso');
  assert.equal(per.regole.testo, '- Rispetto per tutti\n- \\# niente titoli');
  assert.ok(v.every((x) => x.icona === P.ICONE[x.tipo] && x.id === x.tipo));

  const vuoto = P.predefiniti({ linkDona: 'ftp://x', linkDiscord: '', social: [], settimana: { giorni: [{ off: true, ora: '21:00' }] } }, TESTI);
  assert.deepEqual(vuoto.map((x) => x.tipo), ['chi', 'regole'], 'senza niente da dire, il pannello non si inventa');
  assert.equal(vuoto[0].link, '');
});

test('il Markdown: si spengono solo i segni che cambierebbero la resa', () => {
  assert.equal(P.mdTesto('a *b* _c_ [d] `e` f\\g'), 'a \\*b\\* \\_c\\_ \\[d\\] \\`e\\` f\\\\g');
  assert.equal(P.mdTesto('Ciao! (sì) <3 | 100%'), 'Ciao! (sì) <3 | 100%', 'il resto della punteggiatura resta com\'e\'');
  assert.equal(P.mdTesto('# titolo'), '\\# titolo');
  assert.equal(P.mdTesto('- meno'), '\\- meno');
  assert.equal(P.mdTesto('1. primo'), '1\\. primo');
  assert.equal(P.mdTesto('2026 è l\'anno'), '2026 è l\'anno');
  assert.equal(P.mdTesto('  a\n\n  b  '), 'a b');
  assert.equal(P.mdIndirizzo('https://x.com/a b(c)'), 'https://x.com/a%20b%28c%29');
  for (const u of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x', 'non un indirizzo', '']) assert.equal(P.mdIndirizzo(u), '', u);
  assert.equal(P.mdLink('A]b', 'https://a.it'), '[A\\]b](https://a.it/)');
  assert.equal(P.mdLink('Solo nome', 'javascript:x'), 'Solo nome');
});

test('i file si chiamano in ordine, senza accenti ne\' spazi', () => {
  assert.equal(P.nomeFile(0, 'Chi sono'), 'pannello-01-chi-sono.png');
  assert.equal(P.nomeFile(11, 'Perché? Già!'), 'pannello-12-perche-gia.png');
  assert.equal(P.nomeFile(2, '!!!'), 'pannello-03-pannello.png');
  assert.equal(P.testi([{ titolo: 'Chi sono', link: 'https://a.it', testo: 'ciao' }, { titolo: 'Regole', link: '', testo: '- uno' }]),
    '1. Chi sono\nhttps://a.it\nciao\n\n----\n\n2. Regole\n- uno\n');
});

test('quello che si salva ha forma', () => {
  assert.deepEqual(S.normPannelli(null), { stile: { tema: 'pagina', forma: 'penna', carattere: 'archivo', altezza: 100, icone: true }, voci: [] });
  const n = S.normPannelli({
    stile: { tema: 'rosa', forma: 'netta', carattere: 'serif', altezza: '160', icone: false },
    voci: [
      { id: 'chi', tipo: 'chi', titolo: '  Chi\n   sono  ', icona: 'utente', link: 'javascript:alert(1)', testo: 'riga uno\r\nriga due\n\n\n\nfine' },
      { id: 'chi', tipo: 'boh', titolo: 'x'.repeat(80), icona: 'non-esiste', link: 'https://socialbot.live/u/a', testo: 'y'.repeat(2000) },
      null, 7,
      ...Array.from({ length: 20 }, (_, i) => ({ tipo: 'libero', titolo: `L${i}` })),
    ],
  });
  assert.deepEqual(n.stile, { tema: 'pagina', forma: 'netta', carattere: 'serif', altezza: 160, icone: false });
  assert.equal(n.voci.length, S.MAX.voci);
  assert.deepEqual(n.voci[0], { id: 'chi', tipo: 'chi', titolo: 'Chi sono', icona: 'utente', link: '', testo: 'riga uno\nriga due\n\nfine' });
  assert.equal(n.voci[1].id, 'chi-2', 'lo stesso id due volte: il secondo cambia, e il bordo a penna resta suo');
  assert.equal(n.voci[1].tipo, 'libero');
  assert.equal(n.voci[1].titolo.length, S.MAX.titolo);
  assert.equal(n.voci[1].icona, 'stella', 'un\'icona sconosciuta torna quella del suo tipo');
  assert.equal(n.voci[1].link, 'https://socialbot.live/u/a');
  assert.equal(n.voci[1].testo.length, S.MAX.testo);
  assert.equal(new Set(n.voci.map((v) => v.id)).size, n.voci.length);
  assert.equal(S.normPannelli({ stile: { altezza: 99 } }).stile.altezza, 100, 'un\'altezza fuori dalle tre torna media');
});
