// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL MEDIA KIT (src/features/mediakit.js, docs/STRUMENTI.md): ogni numero dai
// rapporti degli ultimi trenta giorni, la media pesata sul tempo, le soglie
// sotto le quali un numero non esce, le percentuali che sommano a cento.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-mediakit-');
const { streamers, rapporti, memory } = await import('../../src/db.js');
const K = await import('../../src/features/mediakit.js');
process.on('exit', () => usaEGetta.pulisci());

const ORA = Date.parse('2026-09-26T12:00:00Z');
const GIORNO = 86_400_000, ORA_MS = 3_600_000;
streamers.upsertApproved('pieno', 'Pieno');
streamers.upsertApproved('poco', 'Poco');

const diretta = (ch, giorniFa, { ore = 2, media = 0, giri = 0, picco = 0, follow = 0, categorie } = {}) => {
  const fine = ORA - giorniFa * GIORNO;
  rapporti.salva(ch, { inizio: fine - ore * ORA_MS, fine, dati: { durataMs: ore * ORA_MS, media, giri, picco, follow, ...(categorie ? { categorie } : {}) } });
};

test('le percentuali sono intere e sommano esattamente a cento', () => {
  assert.deepEqual(K.percentuali([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(K.percentuali([2, 1]), [67, 33]);
  assert.deepEqual(K.percentuali([0, 0]), [0, 0]);
  for (const pesi of [[7, 3, 5, 11, 2], [1, 2, 3, 4, 5, 6], [999, 1], [13, 13, 13, 13, 13, 13, 13]]) {
    assert.equal(K.percentuali(pesi).reduce((a, b) => a + b, 0), 100, pesi.join(','));
  }
});

test('la media e\' pesata sul tempo, il picco e\' il massimo, le ore e i follow si sommano', () => {
  diretta('pieno', 1, { ore: 6, media: 100, giri: 72, picco: 180, follow: 10, categorie: [{ nome: 'Minecraft', giri: 72 }] });
  diretta('pieno', 5, { ore: 1, media: 30, giri: 12, picco: 45, follow: 2, categorie: [{ nome: 'Just Chatting', giri: 12 }] });
  diretta('pieno', 9, { ore: 2, media: 50, giri: 24, picco: 70, follow: 3, categorie: [{ nome: 'Minecraft', giri: 12 }, { nome: 'Just Chatting', giri: 12 }] });
  diretta('pieno', 40, { ore: 9, media: 9999, giri: 9, picco: 9999, follow: 999 });
  memory.logMessage('pieno', 'marco', 'Marco', 'ciao', false, ORA - 2 * GIORNO);
  memory.logMessage('pieno', 'giada', 'Giada', 'ciao', false, ORA - 3 * GIORNO);
  memory.logMessage('pieno', 'marco', 'Marco', 'ancora', false, ORA - 4 * GIORNO);
  memory.logMessage('pieno', 'pieno', 'Pieno', 'io', false, ORA - 4 * GIORNO);
  memory.logMessage('pieno', 'vecchio', 'Vecchio', 'prima', false, ORA - 45 * GIORNO);
  const n = K.numeri('pieno', { ora: ORA });
  assert.equal(n.dirette, 3, 'la diretta di quaranta giorni fa resta fuori');
  assert.equal(n.ore, 9);
  assert.equal(n.media, Math.round((100 * 72 + 30 * 12 + 50 * 24) / (72 + 12 + 24)), 'sei ore pesano sei volte un\'ora');
  assert.notEqual(n.media, Math.round((100 + 30 + 50) / 3), 'la media delle medie sarebbe un altro numero');
  assert.equal(n.picco, 180);
  assert.equal(n.follow, 15);
  assert.equal(n.persone, 2, 'chi ha scritto nel periodo, senza lo streamer');
  assert.deepEqual(n.categorie, [{ nome: 'Minecraft', quota: 78 }, { nome: 'Just Chatting', quota: 22 }]);
  assert.deepEqual(n.basta, { numeri: true, media: true, categorie: true });
});

test('sotto le tre dirette media, picco e categorie non escono', () => {
  diretta('poco', 2, { ore: 3, media: 40, giri: 36, picco: 60, categorie: [{ nome: 'Fortnite', giri: 36 }] });
  diretta('poco', 4, { ore: 2, media: 20, giri: 24, picco: 30 });
  const n = K.numeri('poco', { ora: ORA });
  assert.equal(n.dirette, 2);
  assert.deepEqual([n.media, n.picco, n.categorie], [null, null, []]);
  assert.deepEqual(n.basta, { numeri: false, media: false, categorie: false });
  diretta('poco', 6, { ore: 1, media: 10, giri: 0, picco: 12 });
  const m = K.numeri('poco', { ora: ORA });
  assert.equal(m.basta.numeri, true);
  assert.equal(m.basta.categorie, false, 'le categorie vogliono tre dirette che le abbiano');
  assert.equal(m.media, Math.round((40 * 36 + 20 * 24) / 60), 'una diretta senza campioni non entra nella media');
});

test('le categorie oltre la quarta vanno in «Altro»', () => {
  const c = K.categorieDi(new Map([['A', 50], ['B', 20], ['C', 10], ['D', 10], ['E', 5], ['F', 5]]));
  assert.deepEqual(c.map((x) => x.nome), ['A', 'B', 'C', 'D', '']);
  assert.equal(c[4].altro, true);
  assert.equal(c.reduce((a, x) => a + x.quota, 0), 100);
});

test('i social vengono dalla pagina link: una volta sola, solo piattaforme, solo indirizzi web', () => {
  const pagina = { blocchi: [
    { tipo: 'social', voci: [{ icona: 'instagram', url: 'https://instagram.com/andryx' }, { icona: 'tiktok', url: 'javascript:alert(1)' }] },
    { tipo: 'link', icona: 'youtube', url: 'https://youtube.com/@andryx', label: 'YouTube' },
    { tipo: 'link', icona: 'caffe', url: 'https://ko-fi.com/andryx', label: 'Un caffè' },
    { tipo: 'link', icona: 'instagram', url: 'https://instagram.com/andryx', label: 'Doppio' },
  ] };
  assert.deepEqual(K.socialDaPagina(pagina), [
    { icona: 'instagram', url: 'https://instagram.com/andryx' },
    { icona: 'youtube', url: 'https://youtube.com/@andryx' },
  ]);
  assert.deepEqual(K.socialDaPagina(null), []);
});

const sez = (k, tipo) => k.sezioni.find((x) => x.tipo === tipo);

test('un kit salvato col modello di prima diventa le stesse sezioni, senza migrare niente', () => {
  const k = K.normKit({ presentazione: '  Gioco   a tutto\n\n\n\ne parlo ', email: 'lavoro@andryx.it', collaborazioni: 'Nebbia Audio, , Pixelforno,Nebbia Audio', mostra: { media: false, social: false }, tema: 'notte', media: 99999 });
  assert.equal(k.tema, 'notte');
  assert.equal(k.sezioni[0].tipo, 'testa', 'la testa per prima');
  assert.equal(k.sezioni.at(-1).tipo, 'contatti', 'i contatti per ultimi');
  assert.equal(sez(k, 'testa').presentazione, 'Gioco a tutto\n\ne parlo');
  assert.equal(sez(k, 'contatti').email, 'lavoro@andryx.it');
  assert.deepEqual(sez(k, 'collaborazioni').voci, [{ nome: 'Nebbia Audio', url: '' }, { nome: 'Pixelforno', url: '' }], 'i marchi una volta sola');
  assert.equal(sez(k, 'numeri').mostra.media, false);
  assert.equal(sez(k, 'numeri').mostra.ore, true);
  assert.equal(sez(k, 'social').visibile, false, 'una spunta spenta e\' una sezione spenta');
  assert.deepEqual(k.sezioni.slice(1, 6).map((x) => [x.tipo, x.larghezza]), [['numeri', 'piena'], ['categorie', 'meta'], ['social', 'meta'], ['settimana', 'meta'], ['collaborazioni', 'meta']], 'la pagina di prima: due colonne sotto i numeri');
  assert.ok(!JSON.stringify(k).includes('99999'), 'un numero non si scrive a mano');
});

test('le sezioni: ognuna una volta, i testi liberi fino a due, testa e contatti al loro posto', () => {
  const k = K.normKit({ sezioni: [
    { tipo: 'contatti', email: 'x@y.it' }, { tipo: 'lavori', voci: [{ titolo: 'Live con Nebbia', url: 'nebbia.it/live' }] },
    { tipo: 'testo', titolo: 'Uno', testo: 'a' }, { tipo: 'testo', testo: 'b' }, { tipo: 'testo', testo: 'c' },
    { tipo: 'lavori' }, { tipo: 'boh' }, { tipo: 'testa', larghezza: 'meta', visibile: false },
  ] });
  assert.equal(k.sezioni[0].tipo, 'testa');
  assert.equal(k.sezioni[0].visibile, true, 'la testa non si spegne');
  assert.equal(k.sezioni[0].larghezza, 'piena', 'e non sta a meta\'');
  assert.equal(k.sezioni.at(-1).tipo, 'contatti');
  assert.equal(k.sezioni.filter((x) => x.tipo === 'testo').length, K.MAX_TESTI);
  assert.equal(k.sezioni.filter((x) => x.tipo === 'lavori').length, 1, 'una volta sola, la prima');
  assert.equal(sez(k, 'lavori').voci[0].url, 'https://nebbia.it/live', 'un indirizzo senza https lo prende');
  for (const t of K.UNICHE) assert.equal(k.sezioni.filter((x) => x.tipo === t).length, 1, `${t} c'e' sempre, al massimo spenta`);
});

test('ogni link e\' uno che il PDF puo\' aprire, e ogni voce ha un tetto', () => {
  for (const u of ['javascript:alert(1)', 'data:text/html,x', 'ftp://a.it', 'mailto:a@b.it', 'localhost', 'http://intranet']) assert.equal(K.urlKit(u), '', u);
  assert.equal(K.urlKit('https://example.com/a b'), 'https://example.com/a%20b');
  const k = K.normKit({ sezioni: [
    { tipo: 'link', voci: [{ etichetta: 'Sito', url: 'javascript:x' }, { etichetta: 'Prenota', url: 'cal.com/andry' }] },
    { tipo: 'collaborazioni', voci: Array.from({ length: 30 }, (_, i) => ({ nome: `M${i}` })) },
    { tipo: 'offerte', voci: [{ nome: 'Integrazione', prezzo: 'da 150 €', testo: 'x'.repeat(500) }] },
    { tipo: 'contatti', email: 'non una mail', altro: { etichetta: 'Call', url: 'javascript:x' } },
  ] });
  assert.deepEqual(sez(k, 'link').voci, [{ etichetta: 'Prenota', url: 'https://cal.com/andry' }], 'un link che non si apre non entra');
  assert.equal(sez(k, 'collaborazioni').voci.length, K.LIMITI.collaborazioni);
  assert.equal(sez(k, 'offerte').voci[0].testo.length, K.LIMITI.offertaTesto);
  assert.equal(sez(k, 'contatti').email, '');
  assert.deepEqual(sez(k, 'contatti').altro, { etichetta: '', url: '' });
});

test('la veste: temi, i miei colori solo esadecimali, il carattere fra quelli che ci sono', () => {
  const k = K.normKit({ tema: 'miei', colori: { fondo: '#000000', testo: 'red', accento: '#FF00AA' }, carattere: 'comic', titoli: 'normale' });
  assert.equal(k.tema, 'miei');
  assert.deepEqual(k.colori, { fondo: '#000000', testo: '#f4f1f8', accento: '#FF00AA' });
  assert.equal(k.carattere, 'archivo');
  assert.equal(k.titoli, 'normale');
  assert.equal(K.normKit({ tema: 'rosa' }).tema, 'pagina');
});

test('il pannello e il server dicono la stessa cosa di un link e di un\'email', async () => {
  // L'anteprima e il PDF si fanno nel pannello prima di salvare: se il pannello
  // tenesse un link che il server poi butta, il kit scaricato e quello salvato
  // sarebbero due cose diverse. Le due funzioni stanno in due file (una gira
  // nel browser), qui si tiene che rispondano uguale.
  await import('../../src/web/public/kit.js');
  const C = globalThis.SB_KIT;
  const indirizzi = ['', '   ', 'miosito.it', 'https://miosito.it/a b', 'http://x.it', 'HTTPS://Esempio.COM/Percorso?q=1#f', 'www.esempio.org/pagina', 'javascript:alert(1)',
    'data:text/html,x', 'ftp://a.it', 'mailto:a@b.it', 'localhost', 'http://intranet', 'https://192.168.0.1', 'cal.com/andry', `https://lungo.it/${'a'.repeat(400)}`, 'https://città.it/via', ' spazio.it '];
  for (const u of indirizzi) assert.equal(C.urlKit(u), K.urlKit(u), JSON.stringify(u));
  const email = ['a@b.it', 'collab@andryx.it', 'non una mail', 'a@b', 'a b@c.it', '<a@b.it>', ' x@y.com ', `${'a'.repeat(130)}@b.it`];
  const server = (e) => K.normKit({ sezioni: [{ tipo: 'contatti', email: e }] }).sezioni.at(-1).email;
  for (const e of email) assert.equal(C.emailKit(e), server(e), JSON.stringify(e));
});
