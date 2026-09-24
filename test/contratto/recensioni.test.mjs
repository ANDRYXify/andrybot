// LE RECENSIONI: chi puo' lasciarla, cosa si pubblica e quando, cosa vede la
// pagina iniziale e cosa leggono i motori. Il modello sta in docs/RECENSIONI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-recensioni-');
const { db, streamers, recensioni } = await import('../../src/db.js');
const R = await import('../../src/features/recensioni.js');
const { vetrinaHtml } = await import('../../src/web/vetrina-vista.js');
const leggi = (via) => readFileSync(new URL(`../../${via}`, import.meta.url), 'utf8');
const SERVER = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const VETRINA_CSS = leggi('src/web/public/vetrina.css');

test.after(() => usaEGetta.pulisci());

const GIORNO = 86_400_000;
const ORA = Date.UTC(2026, 8, 24);
const approvato = (giorni, login = 'lucaplays') => ({ login, status: 'approved', approved_at: ORA - giorni * GIORNO, requested_at: ORA - giorni * GIORNO });

test('recensisce il proprietario del canale che lo usa davvero, e mai chi fa SocialBot', () => {
  const base = { proprietario: true, admin: false, dirette: 2, ora: ORA };
  assert.deepEqual(R.puoRecensire({ ...base, streamer: approvato(8) }), { puo: true, perche: '' });
  assert.equal(R.puoRecensire({ ...base, streamer: approvato(8), proprietario: false }).perche, 'proprietario', 'chi modera non recensisce per il canale');
  assert.equal(R.puoRecensire({ ...base, streamer: approvato(8), admin: true }).perche, 'autore', 'chi fa SocialBot non si recensisce da solo');
  assert.equal(R.puoRecensire({ ...base, streamer: approvato(6) }).perche, 'presto', 'prima di una settimana e\' presto');
  assert.equal(R.puoRecensire({ ...base, streamer: approvato(8), dirette: 1 }).perche, 'uso', 'una diretta sola non basta');
  assert.equal(R.puoRecensire({ ...base, streamer: { ...approvato(8), status: 'pending' } }).perche, 'approvato');
  const dc = approvato(8, 'dc.123456789');
  assert.equal(R.puoRecensire({ ...base, streamer: dc, dirette: 0 }).perche, 'uso', 'su Discord conta il lavoro sul server, non le dirette');
  assert.equal(R.puoRecensire({ ...base, streamer: dc, dirette: 0, lavoroDiscord: true }).puo, true);
});

test('il testo si pulisce, e niente link', () => {
  assert.deepEqual(R.validaRecensione({ stelle: 5, testo: '  bello\u0007  davvero \n\n\n\nsi  ', lingua: 'en', conNome: true }),
    { ok: true, dato: { stelle: 5, testo: 'bello davvero\n\nsi', lingua: 'en', conNome: true } });
  assert.equal(R.validaRecensione({ stelle: 0 }).errore, 'stelle');
  assert.equal(R.validaRecensione({ stelle: 6 }).errore, 'stelle');
  assert.equal(R.validaRecensione({ stelle: 3.5 }).errore, 'stelle');
  assert.equal(R.validaRecensione({ stelle: 4, testo: 'guarda qui www.sito-a-caso.com' }).errore, 'link');
  assert.equal(R.validaRecensione({ stelle: 4, testo: 'x'.repeat(R.TESTO_MAX + 1) }).errore, 'lungo');
  assert.equal(R.validaRecensione({ stelle: 4, testo: '', lingua: 'fr' }).dato.lingua, 'it', 'una lingua che non esiste diventa italiano');
  assert.equal(R.validaRecensione({ stelle: 4, conNome: 'si' }).dato.conNome, false, 'il nome si mostra solo se lo si sceglie davvero');
});

test('le stelle da sole si pubblicano, un testo aspetta, e nascondere resta una decisione sul testo', () => {
  assert.equal(R.statoDopo(null, { testo: '' }), 'pubblicata');
  assert.equal(R.statoDopo(null, { testo: 'ciao' }), 'attesa');
  assert.equal(R.statoDopo({ testo: 'ciao', stato: 'pubblicata' }, { testo: 'ciao' }), 'pubblicata', 'cambiare le stelle non rimette in attesa');
  assert.equal(R.statoDopo({ testo: 'ciao', stato: 'pubblicata' }, { testo: 'ciao ciao' }), 'attesa', 'cambiare il testo si');
  assert.equal(R.statoDopo({ testo: 'ciao', stato: 'nascosta' }, { testo: 'ciao' }), 'nascosta', 'cambiare solo il voto non ripubblica un testo nascosto');
  assert.equal(R.statoDopo({ testo: 'ciao', stato: 'nascosta' }, { testo: 'altro' }), 'attesa');
});

test('l\'invito: a chi puo\', non ha recensito, non ha detto mai, non l\'ha rimandato da poco', () => {
  assert.equal(R.invitoAperto({ puo: true, mia: null, invito: {}, ora: ORA }), true);
  assert.equal(R.invitoAperto({ puo: false, mia: null, invito: {}, ora: ORA }), false);
  assert.equal(R.invitoAperto({ puo: true, mia: { stelle: 4 }, invito: {}, ora: ORA }), false);
  assert.equal(R.invitoAperto({ puo: true, mia: null, invito: { mai: true }, ora: ORA }), false);
  assert.equal(R.invitoAperto({ puo: true, mia: null, invito: { rimandaFino: R.rimandaFino(ORA) }, ora: ORA + 29 * GIORNO }), false);
  assert.equal(R.invitoAperto({ puo: true, mia: null, invito: { rimandaFino: R.rimandaFino(ORA) }, ora: ORA + 31 * GIORNO }), true);
});

const voce = (login, stelle, testo, altro = {}) => ({ login, display: login.toUpperCase(), stelle, testo, lingua: 'it', conNome: true, stato: 'pubblicata', ...altro });

test('la pagina iniziale: la media di tutte, la striscia solo con almeno tre testi', () => {
  assert.equal(R.vetrinaDi([voce('a', 5, 'uno'), voce('b', 4, 'due'), voce('c', 5, '')]), null, 'due testi non fanno una striscia');
  const v = R.vetrinaDi([voce('a', 5, 'uno'), voce('b', 4, 'due'), voce('c', 3, 'tre'), voce('d', 2, ''), voce('e', 1, 'quattro', { stato: 'attesa' })]);
  assert.equal(v.quanti, 4, 'contano tutte le pubblicate, anche senza testo; non quelle in attesa');
  assert.equal(v.media, 3.5);
  assert.deepEqual(v.voci.map((x) => x.testo), ['uno', 'due', 'tre'], 'nella striscia vanno quelle con testo');
  const tante = R.vetrinaDi(Array.from({ length: R.MASSIMO_STRISCIA + 5 }, (_, i) => voce('v' + i, 4, 'testo ' + i)));
  assert.equal(tante.voci.length, R.MASSIMO_STRISCIA, 'la striscia tiene le piu\' recenti, fino al tetto');
  assert.equal(tante.voci[0].testo, 'testo 0');
  assert.equal(tante.quanti, R.MASSIMO_STRISCIA + 5, 'il riepilogo le conta tutte');
  const anon = R.vetrinaDi([voce('a', 5, 'uno', { conNome: false }), voce('kick.b', 4, 'due'), voce('c', 3, 'tre')]);
  assert.equal(anon.voci[0].nome, '', 'senza il consenso il nome non esce');
  assert.equal(anon.voci[1].piattaforma, 'Kick');
});

test('i dati strutturati descrivono quello che la pagina mostra', () => {
  assert.equal(R.datiStrutturati(null), null, 'senza striscia, niente dati');
  const v = R.vetrinaDi([voce('a', 5, 'uno'), voce('b', 4, 'due', { conNome: false }), voce('c', 3, 'tre'), voce('d', 4, '')]);
  const ld = R.datiStrutturati(v);
  assert.deepEqual(ld.aggregateRating, { '@type': 'AggregateRating', ratingValue: 4, ratingCount: 4, bestRating: 5, worstRating: 1 });
  assert.deepEqual(ld.review.map((r) => r.author.name), ['A', 'C'], 'un autore senza nome non e\' un autore');
  const brutto = R.jsonSicuro({ t: '</script><script>alert(1)</script>' });
  assert.ok(!brutto.includes('</script>') && !brutto.includes('<'), 'un testo non chiude il blocco dei dati');
  assert.deepEqual(JSON.parse(brutto), { t: '</script><script>alert(1)</script>' });
});

test('nel database si legge solo chi c\'e\' ancora ed e\' approvato', () => {
  streamers.upsertApproved ? streamers.upsertApproved('ok_uno', 'OkUno') : null;
  db.prepare("INSERT OR REPLACE INTO streamers (login, display, status, requested_at, approved_at) VALUES ('ok_uno','OkUno','approved',1,1),('via_due','ViaDue','disabled',1,1)").run();
  recensioni.salva('ok_uno', { stelle: 5, testo: 'bello', lingua: 'it', conNome: true, stato: 'pubblicata' });
  recensioni.salva('via_due', { stelle: 1, testo: 'brutto', lingua: 'it', conNome: true, stato: 'pubblicata' });
  recensioni.salva('fantasma', { stelle: 3, testo: '', lingua: 'it', conNome: false, stato: 'pubblicata' });
  assert.deepEqual(recensioni.pubblicate().map((r) => r.login), ['ok_uno'], 'un canale disattivato o sparito non parla nella pagina iniziale');
  assert.equal(recensioni.pubblicate()[0].display, 'OkUno');
  assert.equal(recensioni.salva('ok_uno', { stelle: 4, testo: 'bello', lingua: 'it', conNome: false, stato: 'pubblicata' }).creata <= Date.now(), true);
  assert.equal(recensioni.di('ok_uno').stelle, 4, 'una per canale: salvare di nuovo la cambia');
  assert.equal(recensioni.togli('ok_uno'), true);
  assert.equal(recensioni.di('ok_uno'), null);
});

test('la striscia: sotto l\'anteprima dell\'overlay, uguale nelle tre lingue, nella lingua di ogni recensione', () => {
  const v = R.vetrinaDi([voce('a', 5, 'uno'), voce('b', 4, 'two', { lingua: 'en', conNome: false }), voce('c', 3, 'tres', { lingua: 'es' })]);
  const pagine = ['it', 'en', 'es'].map((l) => vetrinaHtml(l, { recensioni: v }));
  for (const h of pagine) {
    assert.ok(h.indexOf('class="vt-vetro"') < h.indexOf('class="vt-recensioni"'), 'sotto l\'anteprima dell\'overlay');
    assert.equal((h.match(/class="vt-rec"/g) || []).length, 6, 'il nastro c\'e\' due volte, per scorrere senza strappi');
    assert.equal((h.match(/class="vt-rec" lang="[a-z]+" aria-hidden="true"/g) || []).length, 3, 'e la seconda volta e\' nascosta ai lettori di schermo');
    assert.match(h, /<li class="vt-rec" lang="en">/, 'ogni recensione col suo lang');
  }
  assert.match(pagine[0], /<b>4,0<\/b> su 5 · 3 streamer/);
  assert.match(pagine[0], /aria-label="3 stelle su 5"/);
  const una = vetrinaHtml('en', { recensioni: R.vetrinaDi([voce('a', 1, 'uno'), voce('b', 2, 'due'), voce('c', 3, 'tre')]) });
  assert.match(una, /aria-label="1 star out of 5"/, 'una stella e\' una, non «1 stars»');
  assert.match(APP, /const stelleSu5 = \(i\) => \(i === 1 \? L\('1 stella su 5', '1 star out of 5', '1 estrella de 5'\)/, 'e anche nel pannello');
  assert.match(pagine[1], /<b>4.0<\/b> out of 5 · 3 streamers/);
  assert.match(pagine[1], /a streamer on Twitch/);
  for (const h of ['it', 'en', 'es'].map((l) => vetrinaHtml(l, { recensioni: null }))) assert.ok(!h.includes('vt-recensioni'), 'senza striscia non c\'e\' nemmeno il titolo');
  assert.ok(!/ style="/.test(pagine[0]), 'nella pagina niente stili scritti negli attributi');
  assert.match(pagine[0], /<ul class="vt-rec-nastro" data-n="3">/);
  for (let n = R.MINIMO_STRISCIA; n <= R.MASSIMO_STRISCIA; n++) {
    assert.ok(VETRINA_CSS.includes(`.vt-rec-nastro[data-n="${n}"] { --n: ${n}; }`), `la durata per ${n} carte c'e'`);
  }
  assert.match(VETRINA_CSS, /@media not \(prefers-reduced-motion: reduce\) \{\n  \.vt-rec-nastro \{ animation: vt-rec-scorre/, 'scorre solo per chi non chiede meno movimento');
  assert.match(VETRINA_CSS, /body\.leggero \.vt-rec-nastro, body\.meno-moto \.vt-rec-nastro \{ animation: none; \}/, 'e si ferma anche in modalita\' leggera');
  assert.match(VETRINA_CSS, /\.vt-rec-finestra:focus-within \.vt-rec-nastro \{ animation-play-state: paused; \}/, 'si ferma quando ci entri con la tastiera');
});

test('il server: le regole vengono da un posto solo, e la pagina iniziale si rifa\' subito', () => {
  assert.match(SERVER, /app\.post\('\/api\/recensione', requireOwner,/, 'la scrive il proprietario del canale');
  assert.match(SERVER, /app\.post\('\/api\/admin\/recensioni\/:login', requireAdmin,/, 'la modera chi fa SocialBot');
  assert.match(SERVER, /const mia = recensioniDb\.salva\(user\.login, \{ \.\.\.v\.dato, stato: statoDopo\(st\.mia, v\.dato\) \}\);/);
  assert.match(SERVER, /if \(!st\.puo\) return res\.status\(403\)/, 'chi non puo\' non scrive, qualunque cosa mostri il pannello');
  assert.match(SERVER, /const recensioniCambiate = \(\) => \{\n\s*_recensioni = vetrinaDi\(recensioniDb\.pubblicate\(\)\);\n\s*rifaiGusci\(\);/);
  assert.equal((SERVER.match(/recensioniCambiate\(\);/g) || []).length, 3, 'scrivere, togliere, moderare: tutte e tre rifanno la pagina');
  assert.match(SERVER, /const recLd = datiStrutturati\(_recensioni\);\n\s*if \(recLd\) cambia\('"operatingSystem": "Web",'/, 'i dati strutturati vengono dalla stessa cosa che la striscia mostra');
  assert.match(SERVER, /dirette: contaDirette\(user\.login\), lavoroDiscord: dcGiri\.ultimi\(user\.login, 1\)\.length > 0/);
});

test('il pannello: l\'invito aspetta il suo momento, e non chiede niente in cambio', () => {
  assert.match(APP, /  invito\(\);\n  invitoRecensione\(\);\n\}/, 'parte dopo gli altri inviti');
  assert.match(APP, /if \(DEMO \|\| !stato\?\.recensione\?\.invito\) return;/);
  assert.match(APP, /const RECENSIONE_DOPO_MS = 45000;/);
  assert.match(APP, /if \(occupatoPerInvito\(\)\) \{ _recensioneOrologio = setTimeout\(mostraInvitoRecensione, RECENSIONE_RIPROVA_MS\); return; \}/, 'se c\'e\' gia\' qualcos\'altro sullo schermo, aspetta');
  for (const x of ['dialog[open]', '.bv-velo', '.aiuto-banner', '#cerca-overlay.aperto']) assert.ok(APP.includes(x), `non si mette sopra a ${x}`);
  assert.match(APP, /api\('\/api\/recensione\/invito', \{ method: 'POST', body: \{ azione \} \}\)/, 'piu\' tardi e mai li ricorda il server');
  assert.match(APP, /<input type="checkbox" id="\$\{p\}-nome"\$\{mia\?\.conNome \? ' checked' : ''\}>/, 'il nome del canale non e\' spuntato di partenza');
  assert.doesNotMatch(APP.slice(APP.indexOf('function mostraInvitoRecensione'), APP.indexOf('const PERCHE_RECENSIONE')), /premio|sconto|gratis|reward|discount|5 stelle/i, 'niente in cambio, e niente «lascia 5 stelle»');
});
