// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE PAGINE DIETRO I PANNELLI (docs/STRUMENTI.md, «La pagina dietro il
// pannello»), senza browser:
//  · una pagina per pannello, chiave il canale col pannello, e la colonna del
//    canale tutta sua: esportazione e cancellazione dell'account la trovano
//    come trovano il resto;
//  · i pezzi vivi (programma, comandi) si scrivono dai dati di adesso;
//  · i comandi pubblici sono quelli che chiunque puo' usare, e la risposta si
//    mostra solo se e' una frase fissa;
//  · la pagina ha il suo indirizzo e non si offre ai motori di ricerca;
//  · e la sua informativa: quella della pagina link puo' essere spenta, e
//    parla di un'altra pagina e di un contatore che qui non c'e'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('pagine-pannelli-');
const { paginaPannello, streamers } = await import('../../src/db.js');
const { tabelleDiCanale } = await import('../../src/features/esporta.js');
const { cancella } = await import('../../src/features/cancella.js');
const { renderLinkPage, renderInformativa } = await import('../../src/features/linkpagina.js');
const { comandiPubblici, normPannelli, portaAllaPagina } = await import('../../src/features/pannelli.js');
test.after(() => casa.pulisci());

const BASE = 'https://socialbot.live';
const testo = (h) => h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('una pagina per pannello, e un canale non vede quelle di un altro', () => {
  paginaPannello.salva('alfa', 'programma', { headline: 'Quando ci sono', blocchi: [{ tipo: 'programma' }] });
  paginaPannello.salva('alfa', 'regole', { headline: 'Le regole', blocchi: [{ tipo: 'testo', testo: 'Rispetto' }] });
  paginaPannello.salva('beta', 'programma', { headline: 'Di beta', blocchi: [] });
  assert.equal(paginaPannello.get('alfa', 'programma').headline, 'Quando ci sono');
  assert.equal(paginaPannello.get('alfa', 'regole').headline, 'Le regole');
  assert.equal(paginaPannello.get('beta', 'programma').headline, 'Di beta');
  assert.deepEqual(paginaPannello.get('alfa', 'programma').blocchi, [{ tipo: 'programma', titolo: '', prossima: true, larghezza: 'piena', entrata: 'auto', allinea: 'auto' }]);
  assert.equal(paginaPannello.get('alfa', 'boh'), null);
  assert.deepEqual(paginaPannello.accese('alfa').map((r) => r.pannello).sort(), ['programma', 'regole']);
  paginaPannello.salva('alfa', 'regole', { ...paginaPannello.get('alfa', 'regole'), attiva: false });
  assert.deepEqual(paginaPannello.accese('alfa').map((r) => r.pannello), ['programma'], 'una pagina spenta non e\' accesa');
  assert.equal(paginaPannello.get('alfa', 'regole').headline, 'Le regole', 'e resta salvata com\'era');
});

test('un id che non e\' di un pannello non entra', () => {
  for (const id of ['', 'A', '../x', 'a b', 'x'.repeat(25), "o'", 'p/q']) {
    assert.equal(paginaPannello.idOk(id), false, id);
    assert.equal(paginaPannello.salva('alfa', id, { headline: 'no' }), null, `${id}: non si salva`);
  }
  for (const id of normPannelli({ voci: [{ tipo: 'chi' }, { tipo: 'chi' }, { tipo: 'libero', id: 'Il Mio-Pannello!!' }] }).voci.map((v) => v.id)) {
    assert.ok(paginaPannello.idOk(id), `l'id di un pannello vero (${id}) e' un id di pagina`);
  }
});

test('esportazione e cancellazione dell\'account trovano le pagine dei pannelli', () => {
  const t = tabelleDiCanale().find((x) => x.tabella === 'pagina_pannello');
  assert.ok(t, 'la tabella e\' fra quelle del canale');
  assert.equal(t.colonna, 'channel', 'per la colonna del canale, non per una chiave composta');
  streamers.upsertApproved('gamma', 'gamma', '9');
  paginaPannello.salva('gamma', 'chi', { headline: 'io' });
  cancella('gamma', { conferma: 'gamma' });
  assert.equal(paginaPannello.get('gamma', 'chi'), null, 'cancellato l\'account, la pagina non c\'e\' piu\'');
  assert.ok(paginaPannello.get('alfa', 'programma'), 'e quelle degli altri restano');
});

test('i comandi pubblici: chiunque li puo\' usare, e si dice cosa fanno solo se e\' una frase fissa', () => {
  const m = (comando, extra = {}) => ({ attivo: true, trigger: { tipo: 'comando', comando, ...(extra.trigger || {}) }, condizioni: extra.condizioni || {}, azioni: extra.azioni || [] });
  const lista = comandiPubblici([
    m('!Discord', { trigger: { alias: 'dc, disc  !dc' }, azioni: [{ tipo: 'messaggio', testo: '  Il server:   discord.gg/x ' }] }),
    m('saluta', { azioni: [{ tipo: 'messaggio', testo: 'Ciao $user!' }] }),
    m('so', { condizioni: { tier: 'mod' } }),
    m('vip', { condizioni: { tier: 'vip' } }),
    m('tutti', { condizioni: { tier: 'tutti' }, azioni: [{ tipo: 'effetto', comando: 'x' }, { tipo: 'messaggio', testo: 'Tutti {qui}' }] }),
    { ...m('spento'), attivo: false },
    { attivo: true, trigger: { tipo: 'evento', comando: 'follow' } },
    m('discord'),
    m('alias', { trigger: { alias: ['a1', '!a2', 'alias'] } }),
  ]);
  assert.deepEqual(lista.map((x) => x.comando), ['alias', 'discord', 'saluta', 'tutti'], 'solo chi non chiede un ruolo, accesi, una volta sola, in ordine');
  const d = lista.find((x) => x.comando === 'discord');
  assert.deepEqual(d.alias, ['dc', 'disc'], 'gli alias senza «!» e senza ripetizioni');
  assert.equal(d.cosa, 'Il server: discord.gg/x', 'la frase fissa, pulita');
  assert.equal(lista.find((x) => x.comando === 'saluta').cosa, '', 'con una variabile dentro, niente: si leggerebbe il segnaposto');
  assert.equal(lista.find((x) => x.comando === 'tutti').cosa, '', 'anche con le graffe');
  assert.deepEqual(lista.find((x) => x.comando === 'alias').alias, ['a1', 'a2']);
  assert.equal(comandiPubblici(Array.from({ length: 60 }, (_, i) => m(`c${String(i).padStart(2, '0')}`))).length, 40, 'al massimo quaranta');
});

const pagina = (blocchi) => ({ headline: 'Programma', tagline: '', template: 'minimal', tema: {}, blocchi });
const SETT = { giorni: [{ ora: '21:00', att: 'Elden Ring' }, { off: true, ora: '20:00' }, {}, { ora: '18:30', att: '' }, {}, {}, {}], fuso: 'Europe/Rome', prossima: { giorno: 3 } };

test('il programma si scrive dalla settimana di adesso: solo i giorni in onda, e la prossima segnata', () => {
  const h = renderLinkPage(pagina([{ tipo: 'programma', titolo: 'Quando ci sono', prossima: true }]), { login: 'alfa', display: 'Alfa', baseUrl: BASE, vivi: { programma: SETT } });
  const t = testo(h);
  assert.match(t, /Lunedì 21:00 Elden Ring/);
  assert.match(t, /Giovedì 18:30 la prossima/);
  assert.ok(!/Martedì/.test(t), 'un giorno di riposo non compare, anche con un\'ora');
  assert.ok(/Orari: /.test(t), 'e dice di che fuso sono le ore');
  assert.equal((h.match(/class="prog-r pross"/g) || []).length, 1, 'una sola e\' la prossima');
  const senza = renderLinkPage(pagina([{ tipo: 'programma', prossima: false }]), { login: 'alfa', baseUrl: BASE, vivi: { programma: SETT } });
  assert.ok(!/class="prog-r pross"/.test(senza), 'si puo\' non segnare la prossima');
  const vuota = renderLinkPage(pagina([{ tipo: 'programma' }]), { login: 'alfa', baseUrl: BASE, vivi: { programma: { giorni: [], fuso: 'Europe/Rome' } } });
  assert.ok(!/class="prog/.test(vuota), 'senza giorni in onda in pagina non c\'e\' niente');
  const ant = renderLinkPage(pagina([{ tipo: 'programma' }]), { login: 'alfa', baseUrl: BASE, anteprima: true, vivi: {} });
  assert.match(ant, /programma: nella scheda «La tua settimana» non c'è ancora un giorno in onda/, 'l\'anteprima dice perche\' non si vede');
});

test('i comandi in pagina: i nomi, gli alias, e cosa fanno se si vuole', () => {
  const vivi = { comandi: [{ comando: 'discord', alias: ['dc'], cosa: 'Il server' }, { comando: 'lurk', alias: [], cosa: '' }] };
  const h = renderLinkPage(pagina([{ tipo: 'comandi', titolo: 'I comandi', risposte: true }]), { login: 'alfa', baseUrl: BASE, vivi });
  assert.match(testo(h), /!discord anche !dc Il server/);
  assert.match(testo(h), /!lurk/);
  const zitti = renderLinkPage(pagina([{ tipo: 'comandi', risposte: false }]), { login: 'alfa', baseUrl: BASE, vivi });
  assert.ok(!/<dd>/.test(zitti), 'senza le risposte, solo i comandi');
  const esc = renderLinkPage(pagina([{ tipo: 'comandi' }]), { login: 'alfa', baseUrl: BASE, vivi: { comandi: [{ comando: '<b>', alias: [], cosa: '<script>x</script>' }] } });
  assert.ok(!esc.includes('<script>x') && !esc.includes('!<b>'), 'tutto passa da esc');
});

test('la pagina dietro un pannello ha il suo indirizzo, non si offre ai motori di ricerca, e porta ai link del canale', () => {
  const url = `${BASE}/u/alfa/p/programma`;
  const h = renderLinkPage(pagina([{ tipo: 'testo', testo: 'ciao' }]), { login: 'alfa', display: 'Alfa', baseUrl: BASE, dietro: { url }, urlLink: `${BASE}/u/alfa` });
  assert.match(h, new RegExp(`<link rel="canonical" href="${url}">`));
  assert.match(h, /<meta name="robots" content="noindex, follow">/);
  assert.match(h, /<title>Programma · Alfa<\/title>/);
  assert.match(h, new RegExp(`href="${BASE}/u/alfa">I link di Alfa</a>`));
  const link = renderLinkPage(pagina([]), { login: 'alfa', baseUrl: BASE });
  assert.match(link, /content="index, follow"/, 'la pagina link resta da trovare');
});

test('la pagina si apre solo se un pannello salvato ci porta', () => {
  const serie = { voci: [{ id: 'programma', tipo: 'programma', pagina: true }, { id: 'regole', tipo: 'regole', pagina: false, link: 'https://x.it' }, { id: 'dona', tipo: 'dona', pagina: true }] };
  assert.equal(portaAllaPagina(serie, 'programma'), true);
  assert.equal(portaAllaPagina(serie, 'regole'), false, 'un pannello che porta a un indirizzo non apre la sua pagina');
  assert.equal(portaAllaPagina(serie, 'chi'), false, 'un pannello tolto (o mai salvato) neanche');
  assert.equal(portaAllaPagina(serie, 'dona'), false, '«Sostienimi» porta alle donazioni');
  assert.equal(portaAllaPagina(null, 'programma'), false, 'senza pannelli salvati, nessuna pagina');
});

test('la pagina dietro un pannello ha la sua informativa, che dice il vero: niente contatore', () => {
  const url = `${BASE}/u/alfa/p/regole`;
  const h = renderLinkPage(pagina([{ tipo: 'testo', testo: 'ciao' }]), { login: 'alfa', display: 'Alfa', baseUrl: BASE, dietro: { url } });
  assert.match(h, new RegExp(`href="${url}/privacy"`), 'il piede porta alla privacy di questa pagina');
  assert.ok(!h.includes('href="/u/alfa/privacy"'), 'non a quella della pagina link');
  const inf = renderInformativa({ login: 'alfa', display: 'Alfa', baseUrl: BASE, pagina: { headline: 'Le regole', tema: {}, blocchi: [] }, quale: 'dietro', urlTorna: url });
  assert.match(inf, /<title>Privacy · Alfa · Le regole<\/title>/);
  assert.match(testo(inf), /non conta le visite/);
  assert.ok(!/contatore/.test(testo(inf)), 'nessun contatore, perche\' la pagina non conta visite');
  assert.match(inf, new RegExp(`<a class="torna" href="${url}">`), 'e riporta alla pagina da cui si arriva');
  const link = renderInformativa({ login: 'alfa', display: 'Alfa', baseUrl: BASE, pagina: { tema: {}, blocchi: [] } });
  assert.match(testo(link), /contatore giornaliero/, 'la pagina link il contatore ce l\'ha, e lo dice ancora');
});
