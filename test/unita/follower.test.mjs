// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA LISTA DEI FOLLOWER CHE SI MUOVE (src/features/follower.js,
// docs/FOLLOWER.md), su un Twitch finto. Le promesse:
//  · il giro legge tutta la lista a pagine, riprende da dove si era fermato, e
//    tratta ogni errore di Twitch per quello che e';
//  · gli usciti si segnano solo a giro completo;
//  · togliere il follow e' bloccare e sbloccare, mai bannare; se lo sblocco
//    non passa lo si dice;
//  · in massa: conferma col numero giusto, ruoli riletti prima di partire, ogni
//    bersaglio rigiudicato un attimo prima di toccarlo, lo scudo prima di
//    tutto, ripresa dopo un riavvio, e il registro non si allaga;
//  · quello che lo streamer fa dalla lista non finisce nel rapporto di un
//    attacco aperto.
//  · cancellato l'account, un giro, un lavoro o un'azione ancora in volo non
//    riscrivono niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('follower-');
const { streamers, statoVivo, followerElenco } = await import('../../src/db.js');
const F = await import('../../src/features/follower.js');
const ab = await import('../../src/features/antibot.js');
const inc = await import('../../src/features/incidenti.js');
test.after(async () => { await ab.spegniScudo(); casa.pulisci(); });

const ORA = Date.now();
const GIORNO = 86_400_000;
let n = 0;
const canale = () => { const ch = `fol${++n}`; streamers.upsertApproved(ch, ch.toUpperCase(), String(9000 + n)); return ch; };

// Un Twitch finto: la lista a pagine da cento (il segnaposto e' l'indice), i
// profili, i ruoli, il blocco. `guasti` sono gli errori da restituire, in fila.
function twitch({ quanti = 0, nati = (i) => ORA - (400 + i) * GIORNO, totale = null } = {}) {
  const f = {
    follower: Array.from({ length: quanti }, (_, i) => ({ user_id: String(1000 + i), user_login: `utente${i}`, user_name: `Utente${i}`, followed_at: new Date(ORA - i * 3_600_000).toISOString() })),
    chiusi: new Set(), mods: [], vips: [], subs: new Set(), ruoliNo: false,
    guasti: [], pagine: [], sottoAttacco: 0, bloccati: [], sbloccati: [], ordine: [], ban: 0, sbloccoNo: 0, bloccoNo: null,
  };
  const h = {
    f,
    async paginaFollower(_ch, { dopo = '' } = {}) {
      f.pagine.push(dopo);
      const guasto = f.guasti.length ? f.guasti.shift() : null;
      if (guasto) return guasto;
      const i = Number(dopo) || 0;
      const righe = f.follower.slice(i, i + 100);
      const prossimo = i + 100 < f.follower.length ? String(i + 100) : '';
      return { ok: true, righe, cursore: prossimo, totale: totale ?? f.follower.length };
    },
    async profiliPerId(ids) {
      return { ok: true, utenti: ids.filter((id) => !f.chiusi.has(id)).map((id) => ({ id, login: 'x', created_at: new Date(nati(Number(id) - 1000)).toISOString(), profile_image_url: 'https://x/p.png', description: 'ciao', broadcaster_type: '' })) };
    },
    async getModerators() { return f.ruoliNo ? null : f.mods.map((id) => ({ user_id: id })); },
    async getVips() { return f.ruoliNo ? null : f.vips.map((id) => ({ user_id: id })); },
    async elencoAbbonati() { return f.ruoliNo ? null : new Set(f.subs); },
    async bloccaUtente(_ch, id) {
      f.ordine.push('blocca:' + id);
      if (alto) f.sottoAttacco++;
      if (f.bloccoNo) { const r = f.bloccoNo; if (r.unaVolta) f.bloccoNo = null; return r; }
      f.bloccati.push(id); return { ok: true };
    },
    async sbloccaUtente(_ch, id) {
      f.ordine.push('sblocca:' + id);
      if (f.sbloccoNo > 0) { f.sbloccoNo--; return { ok: false, motivo: 'errore Twitch' }; }
      f.sbloccati.push(id); return { ok: true };
    },
    async timeoutUser() { f.ban++; return { ok: true }; },
    async getUserByLogin(login) { return login === 'nessuno' ? null : { id: '77', login, display_name: login, created_at: new Date(ORA - 2 * 3_600_000).toISOString(), profile_image_url: 'https://static-cdn.jtvnw.net/user-default-pictures-uv/x.png', description: '', broadcaster_type: '' }; },
    async seguitoDa() { return { ok: true, segue: true, quando: ORA - 60_000 }; },
  };
  return h;
}
let alto = false;
const usa = (h) => F.configura({ helix: h, attesa: async () => {}, scudoAlto: () => alto });
const finito = async (ch) => { for (let i = 0; i < 200; i++) { const g = F.statoGiro(ch); if (g && g.stato !== 'in corso') return g; await new Promise((r) => setImmediate(r)); } return F.statoGiro(ch); };
const lavoroFinito = async (ch) => { for (let i = 0; i < 2000; i++) { const l = F.statoLavoro(ch); if (l && l.stato !== 'in corso') return l; await new Promise((r) => setImmediate(r)); } return F.statoLavoro(ch); };

test('il giro legge tutta la lista a pagine, coi profili, i chiusi e i ruoli', async () => {
  const ch = canale();
  const h = twitch({ quanti: 250 });
  h.f.chiusi.add('1007');
  h.f.mods = ['1001']; h.f.vips = ['1002']; h.f.subs = new Set(['1003', '1001']);
  usa(h);
  assert.equal(F.avviaGiro(ch).avviato, true);
  assert.equal(F.avviaGiro(ch).gia, true, 'un giro solo per canale');
  const g = await finito(ch);
  assert.deepEqual([g.stato, g.letti, g.totale, g.completo], ['finito', 250, 250, true]);
  assert.deepEqual(h.f.pagine, ['', '100', '200']);
  const tutte = followerElenco.tutte(ch);
  assert.equal(tutte.length, 250);
  assert.equal(followerElenco.una(ch, '1007').creato, -1, 'Twitch non lo trova: chiuso');
  assert.ok(followerElenco.una(ch, '1010').creato > 0);
  assert.equal(followerElenco.una(ch, '1001').ruolo, 'mod', 'moderatore e abbonato: moderatore');
  assert.equal(followerElenco.una(ch, '1002').ruolo, 'vip');
  assert.equal(followerElenco.una(ch, '1003').ruolo, 'sub');
  assert.equal(g.ruoli.tutti, true);
});

test('gli usciti si segnano solo a giro completo', async () => {
  const ch = canale();
  const h = twitch({ quanti: 120 });
  usa(h);
  F.avviaGiro(ch); await finito(ch);
  h.f.follower.splice(5, 1);
  F.avviaGiro(ch); await finito(ch);
  assert.ok(followerElenco.una(ch, '1005').uscito > 0, 'chi non c\'e\' piu\' e\' uscito');
  assert.equal(followerElenco.una(ch, '1006').uscito, 0);

  const ch2 = canale();
  const h2 = twitch({ quanti: 120 });
  usa(h2);
  F.avviaGiro(ch2); await finito(ch2);
  h2.f.follower.splice(5, 1);
  const parziale = twitch({ quanti: 0, totale: 1000 });
  parziale.f.follower = h2.f.follower;
  usa(parziale);
  F.avviaGiro(ch2);
  const g = await finito(ch2);
  assert.equal(g.completo, false, 'letti 119 su 1000: non completo');
  assert.equal(followerElenco.una(ch2, '1005').uscito, 0, 'un giro a meta\' non sa chi e\' uscito');
});

test('gli errori di Twitch: aspetta se chiede di rallentare, riprova se cade, si ferma senza permesso', async () => {
  const ch = canale();
  const h = twitch({ quanti: 150 });
  h.f.guasti = [{ ok: false, motivo: 'troppe', riprova: 0 }, { ok: false, motivo: 'twitch' }, { ok: false, motivo: 'twitch' }];
  usa(h);
  F.avviaGiro(ch);
  const g = await finito(ch);
  assert.equal(g.stato, 'finito', 'rallentare e due cadute non fermano il giro');
  assert.equal(g.letti, 150);

  const ch2 = canale();
  const h2 = twitch({ quanti: 150 });
  h2.f.guasti = Array.from({ length: 4 }, () => ({ ok: false, motivo: 'twitch' }));
  usa(h2);
  F.avviaGiro(ch2);
  assert.deepEqual([(await finito(ch2)).stato, F.statoGiro(ch2).motivo], ['errore', 'twitch'], 'quattro cadute di fila: errore, riprendibile');

  const ch3 = canale();
  const h3 = twitch({ quanti: 150 });
  h3.f.guasti = [{ ok: false, motivo: 'permesso' }];
  usa(h3);
  F.avviaGiro(ch3);
  assert.deepEqual([(await finito(ch3)).stato, F.statoGiro(ch3).motivo], ['errore', 'permesso']);
});

test('un segnaposto scaduto fa ripartire da capo, una volta sola', async () => {
  const ch = canale();
  const h = twitch({ quanti: 250 });
  usa(h);
  statoVivo.scrivi(ch, F.GIRO, { stato: 'fermo', cursore: '100', letti: 100, totale: 250, avvio: ORA - 1000, completo: false });
  h.f.guasti = [{ ok: false, motivo: 'cursore' }];
  F.avviaGiro(ch);
  const g = await finito(ch);
  assert.deepEqual(h.f.pagine, ['100', '', '100', '200']);
  assert.deepEqual([g.stato, g.letti], ['finito', 250]);

  const ch2 = canale();
  const h2 = twitch({ quanti: 250 });
  usa(h2);
  statoVivo.scrivi(ch2, F.GIRO, { stato: 'fermo', cursore: '100', letti: 100, totale: 250, avvio: ORA - 1000, completo: false });
  h2.f.guasti = [{ ok: false, motivo: 'cursore' }, null, { ok: false, motivo: 'cursore' }];
  F.avviaGiro(ch2);
  assert.equal((await finito(ch2)).stato, 'errore', 'scaduto di nuovo: si ferma, non riparte all\'infinito');
  assert.deepEqual(h2.f.pagine, ['100', '', '100']);
});

test('fermato a meta\', riprende dal segnaposto e tiene l\'avvio', async () => {
  const ch = canale();
  const h = twitch({ quanti: 250 });
  let ferma = true;
  const vera = h.paginaFollower;
  h.paginaFollower = async (c, o) => { const r = await vera(c, o); if (ferma && o.dopo === '') { ferma = false; F.fermaGiro(c); } return r; };
  usa(h);
  F.avviaGiro(ch);
  const g1 = await finito(ch);
  assert.deepEqual([g1.stato, g1.cursore, g1.letti], ['fermo', '100', 100]);
  const avvio = g1.avvio;
  assert.equal(F.avviaGiro(ch).ripreso, true);
  const g2 = await finito(ch);
  assert.deepEqual([g2.stato, g2.letti, g2.avvio], ['finito', 250, avvio]);
});

test('un follow che arriva entra subito, e chi era stato tolto e torna non e\' piu\' «tolto»', () => {
  const ch = canale();
  F.arrivato(ch, { user_id: '55', user_login: 'nuova', user_name: 'Nuova', followed_at: new Date(ORA).toISOString() });
  assert.equal(followerElenco.una(ch, '55').login, 'nuova');
  followerElenco.segnaStato(ch, '55', 'tolto', ORA, { uscito: true });
  F.arrivato(ch, { user_id: '55', user_login: 'nuova', followed_at: new Date(ORA + 1000).toISOString() });
  const r = followerElenco.una(ch, '55');
  assert.deepEqual([r.stato, r.uscito], ['', 0]);
  followerElenco.segnaStato(ch, '55', 'apposto', ORA);
  F.arrivato(ch, { user_id: '55', user_login: 'nuova' });
  assert.equal(followerElenco.una(ch, '55').stato, 'apposto', '«a posto» resta');
});

async function listaPronta(quanti = 30, prepara = () => {}) {
  const ch = canale();
  const h = twitch({ quanti });
  prepara(h, ch);
  usa(h);
  F.avviaGiro(ch); await finito(ch);
  return { ch, h };
}

test('togliere il follow e\' bloccare e poi sbloccare, mai bannare, e non finisce nell\'attacco aperto', async () => {
  const { ch, h } = await listaPronta(10);
  const aperto = inc.apri(ch, { livello: 'osservo' });
  const r = await F.azione(ch, { azione: 'togli', userId: '1004' });
  assert.equal(r.ok, true);
  assert.deepEqual(h.f.ordine, ['blocca:1004', 'sblocca:1004']);
  assert.equal(h.f.ban, 0);
  const riga = followerElenco.una(ch, '1004');
  assert.deepEqual([riga.stato, riga.uscito > 0], ['tolto', true], 'uscito subito, senza aspettare il giro');
  const reg = ab.registro(ch, { limite: 5 }).find((v) => v.userId === '1004');
  assert.equal(reg.azione, 'togli');
  assert.equal(reg.incidente, undefined, 'fuori dall\'attacco');
  assert.deepEqual(inc.uno(aperto.id).azioni, {}, 'l\'attacco non lo conta');
  inc.chiudi(ch);
});

test('un blocco dello scudo si vede subito nella lista, e nessun «togli» lo sblocca', async () => {
  const { ch, h } = await listaPronta(10, (h, ch) => { streamers.setSettings(ch, { antibot: { extra: ['utente3', 'utente4'] } }); });
  ab.registra(ch, { login: 'utente3', userId: '1003', azione: 'blocca', motivo: 'ondata', esito: 'fatto' });
  const r = followerElenco.una(ch, '1003');
  assert.deepEqual([r.stato, r.uscito > 0], ['bloccato', true], 'bloccato dallo scudo: non segue piu\'');
  assert.equal(F.bersagli(ch, { azione: 'togli', filtro: { livello: 'noto' } }).tocca.length, 1, 'il bloccato non e\' fra chi si toglie');
  const no = await F.azione(ch, { azione: 'togli', userId: '1003' });
  assert.deepEqual([no.ok, no.errore], [false, 'uscito']);
  assert.equal(h.f.ordine.length, 0, 'e Twitch non viene toccato');
  ab.registra(ch, { login: 'utente3', userId: '1003', azione: 'sblocca', motivo: 'dalla console', esito: 'fatto' });
  assert.equal(followerElenco.una(ch, '1003').stato, '', 'sbloccato dal rapporto di un attacco: non piu\' bloccato');
  ab.registra(ch, { login: 'utente4', userId: '1004', azione: 'blocca', motivo: 'ondata', esito: 'fallito' });
  assert.equal(followerElenco.una(ch, '1004').stato, '', 'un blocco fallito non cambia niente');
  followerElenco.segnaStato(ch, '1005', 'apposto', Date.now());
  ab.registra(ch, { login: 'utente5', userId: '1005', azione: 'sblocca', motivo: 'dalla console', esito: 'fatto' });
  assert.equal(followerElenco.una(ch, '1005').stato, 'apposto', 'uno sblocco tocca solo chi era bloccato');
});

test('se lo sblocco non passa, la persona resta bloccata e lo si dice', async () => {
  const { ch, h } = await listaPronta(10);
  h.f.sbloccoNo = 3;
  const r = await F.azione(ch, { azione: 'togli', userId: '1002' });
  assert.deepEqual([r.ok, r.bloccatoRimasto], [true, true]);
  assert.equal(followerElenco.una(ch, '1002').stato, 'bloccato');
  const s = await F.azione(ch, { azione: 'sblocca', userId: '1002' });
  assert.equal(s.ok, true);
  assert.equal(followerElenco.una(ch, '1002').stato, '');
});

test('un protetto non si tocca senza conferma esplicita', async () => {
  const { ch, h } = await listaPronta(10, (h) => { h.f.subs = new Set(['1003']); });
  const no = await F.azione(ch, { azione: 'togli', userId: '1003' });
  assert.deepEqual([no.ok, no.errore], [false, 'protetto']);
  assert.equal(h.f.ordine.length, 0);
  const si = await F.azione(ch, { azione: 'togli', userId: '1003', forza: true });
  assert.equal(si.ok, true);
});

test('in massa: il numero scritto deve essere quello contato, e i protetti restano fuori', async () => {
  const { ch, h } = await listaPronta(30, (h, ch) => {
    streamers.setSettings(ch, { antibot: { extra: Array.from({ length: 12 }, (_, i) => `utente${i}`) } });
    h.f.subs = new Set(['1001']);
  });
  const conta = F.bersagli(ch, { azione: 'togli', filtro: { livello: 'noto' } });
  assert.equal(conta.tocca.length, 11, 'dodici in «Blocca sempre», uno e\' abbonato');
  const sbagliato = await F.avviaLavoro(ch, { azione: 'togli', filtro: { livello: 'noto' }, conferma: 12 });
  assert.deepEqual([sbagliato.ok, sbagliato.errore, sbagliato.quanti], [false, 'conferma', 11]);
  assert.equal(h.f.ordine.length, 0);
  const via = await F.avviaLavoro(ch, { azione: 'togli', filtro: { livello: 'noto' }, conferma: 11 });
  assert.equal(via.ok, true);
  const l = await lavoroFinito(ch);
  assert.deepEqual([l.stato, l.fatti, l.nFalliti, l.saltati], ['finito', 11, 0, 0]);
  assert.ok(!h.f.bloccati.includes('1001'), 'l\'abbonato no');
  assert.equal(h.f.ban, 0);
  const righe = ab.registro(ch, { limite: 50 }).filter((v) => v.azione === 'pulizia');
  assert.equal(righe.length, 2, 'una riga all\'inizio e una alla fine, non undici');
});

test('in massa: chi diventa abbonato dopo la conferma resta fuori', async () => {
  const { ch, h } = await listaPronta(20, (h, ch) => {
    streamers.setSettings(ch, { antibot: { extra: Array.from({ length: 5 }, (_, i) => `utente${i}`) } });
  });
  h.f.subs = new Set(['1002']);
  await F.avviaLavoro(ch, { azione: 'blocca', filtro: { livello: 'noto' }, conferma: 5 });
  const l = await lavoroFinito(ch);
  assert.deepEqual([l.fatti, l.saltati], [4, 1], 'riletti i ruoli prima di partire, rigiudicato prima di toccare');
  assert.ok(!h.f.bloccati.includes('1002'));
  const b = followerElenco.una(ch, '1000');
  assert.deepEqual([b.stato, b.uscito > 0], ['bloccato', true], 'un bloccato non segue piu\', da subito');
  assert.ok(F.pagina(ch, { livello: 'tolti' }).righe.some((x) => x.user_id === '1000'), 'e sta fra i tolti');
});

test('in massa: senza i ruoli non si parte', async () => {
  const { ch, h } = await listaPronta(20, (h, ch) => {
    streamers.setSettings(ch, { antibot: { extra: ['utente1', 'utente2'] } });
  });
  h.f.ruoliNo = true;
  const r = await F.avviaLavoro(ch, { azione: 'togli', filtro: { livello: 'noto' }, conferma: 2 });
  assert.deepEqual([r.ok, r.errore], [false, 'ruoli']);
  assert.equal(h.f.ordine.length, 0);
});

test('in massa: sotto attacco aspetta, a Twitch che chiede di rallentare ubbidisce, senza permesso si ferma', async () => {
  const { ch, h } = await listaPronta(20, (h, ch) => {
    streamers.setSettings(ch, { antibot: { extra: Array.from({ length: 6 }, (_, i) => `utente${i}`) } });
  });
  alto = true;
  let giri = 0;
  F.configura({ attesa: async () => { if (++giri > 3) alto = false; } });
  h.f.bloccoNo = { ok: false, motivo: 'troppe richieste', riprova: 0, unaVolta: true };
  await F.avviaLavoro(ch, { azione: 'blocca', filtro: { livello: 'noto' }, conferma: 6 });
  const l = await lavoroFinito(ch);
  assert.equal(h.f.sottoAttacco, 0, 'nessuna chiamata a Twitch mentre lo scudo era alto');
  assert.ok(giri > 3, 'ha aspettato');
  assert.deepEqual([l.stato, l.fatti, l.nFalliti], ['finito', 6, 0], 'la richiesta rifiutata per fretta si ripete, non si conta persa');
  F.configura({ attesa: async () => {} });

  const p = await listaPronta(20, (h, ch) => { streamers.setSettings(ch, { antibot: { extra: ['utente1', 'utente2', 'utente3'] } }); });
  p.h.f.bloccoNo = { ok: false, motivo: 'permesso mancante' };
  await F.avviaLavoro(p.ch, { azione: 'blocca', filtro: { livello: 'noto' }, conferma: 3 });
  const l2 = await lavoroFinito(p.ch);
  assert.deepEqual([l2.stato, l2.motivo, l2.fatti], ['errore', 'permesso', 0]);
});

test('un lavoro rimasto a meta\' riparte dopo un riavvio da dove era', async () => {
  const { ch, h } = await listaPronta(20, (h, ch) => {
    streamers.setSettings(ch, { antibot: { extra: Array.from({ length: 4 }, (_, i) => `utente${i}`) } });
  });
  statoVivo.scrivi(ch, F.LAVORO, { id: 'x', azione: 'blocca', ids: ['1000', '1001', '1002', '1003'], i: 2, totale: 4, fatti: 2, nFalliti: 0, falliti: [], saltati: 0, bloccatiRimasti: [], stato: 'in corso', motivo: '', avvio: ORA, fine: 0 });
  F._azzera();
  usa(h);
  const r = F.riprendiTutto();
  assert.ok(r.lavori >= 1);
  const l = await lavoroFinito(ch);
  assert.deepEqual(h.f.bloccati, ['1002', '1003'], 'i primi due erano gia\' fatti');
  assert.deepEqual([l.stato, l.fatti], ['finito', 4]);
});

test('«a posto» in massa vale per chi e\' da guardare, si scrive subito e protegge', async () => {
  const { ch, h } = await listaPronta(10, (h, ch) => { streamers.setSettings(ch, { antibot: { extra: ['utente5'] } }); });
  inc.apri(ch, { livello: 'allerta' });
  inc.coinvolto(ch, 'utente1', inc.GIUDIZI.SOSPETTO, 0, '1001');
  inc.coinvolto(ch, 'utente2', inc.GIUDIZI.SOSPETTO, 0, '1002');
  inc.chiudi(ch);
  assert.equal(F.bersagli(ch, { azione: 'apposto', filtro: {} }).tocca.length, 2, 'sul filtro «tutti» solo i due da guardare, non il bot noto');
  const r = await F.avviaLavoro(ch, { azione: 'apposto', filtro: { livello: 'dubbio' }, conferma: 2 });
  assert.deepEqual([r.ok, r.fatti], [true, 2]);
  assert.equal(h.f.ordine.length, 0, 'Twitch non c\'entra');
  assert.equal(F.vista(ch).viste.find((x) => x.user_id === '1001').livello, 'protetto');
});

test('il CSV segue il filtro e disinnesca i nomi', async () => {
  const { ch } = await listaPronta(5);
  F.arrivato(ch, { user_id: '9', user_login: '=cmd', user_name: '=HYPERLINK("x")' });
  const testo = F.csv(ch, {});
  assert.match(testo, /^login,nome,user_id,seguito,nato,livello,motivi,ruolo,stato,uscito\n/);
  assert.match(testo, /\n'=cmd,"'=HYPERLINK\(""x""\)",9,/);
  assert.equal(testo.trim().split('\n').length, 7);
});

test('chi non segue piu\' da un mese se ne va dalla lista; chi segue resta', async () => {
  const { ch } = await listaPronta(3);
  followerElenco.segnaStato(ch, '1000', 'tolto', ORA - 40 * GIORNO, { uscito: true });
  followerElenco.segnaStato(ch, '1001', 'tolto', ORA - 5 * GIORNO, { uscito: true });
  F.pota(ORA);
  assert.equal(followerElenco.una(ch, '1000'), null);
  assert.ok(followerElenco.una(ch, '1001'));
  assert.ok(followerElenco.una(ch, '1002'));
});

test('«Controlla un nome»: il profilo vivo, se segue, e il giudizio', async () => {
  const { ch } = await listaPronta(5);
  const r = await F.controlla(ch, '@Qualcuno');
  assert.equal(r.trovato, true);
  assert.equal(r.segue, true);
  assert.equal(r.profilo.login, 'qualcuno');
  assert.equal(r.livello, 'pulito', 'un account nuovo e spoglio, da solo, e\' uno spettatore nuovo');
  assert.ok(r.profilo.creato > 0 && /default/.test(r.profilo.foto), 'i fatti del profilo si vedono lo stesso');
  assert.deepEqual(await F.controlla(ch, 'nessuno'), { ok: true, trovato: false, login: 'nessuno' });
  assert.equal((await F.controlla(ch, 'no spazi')).errore, 'nome');
});

test('cancellato l\'account, quello che era in volo non riscrive niente', async () => {
  const { cancella, restiDi } = await import('../../src/features/cancella.js');
  const passa = async (n = 100) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };
  const porta = () => { let apri; const p = new Promise((r) => { apri = r; }); return { p, apri }; };

  // Il giro: la seconda pagina torna da Twitch dopo la cancellazione. Intanto
  // lo stesso nome si iscrive di nuovo e il suo giro parte subito, pulito.
  const ch = canale();
  const h = twitch({ quanti: 250 });
  const g = porta();
  let chieste = 0;
  const pagina = h.paginaFollower;
  h.paginaFollower = async (c, o = {}) => { chieste++; if (o.dopo) await g.p; return pagina(c, o); };
  usa(h);
  F.avviaGiro(ch);
  for (let i = 0; i < 100 && chieste < 2; i++) await passa(1);
  assert.deepEqual([chieste, followerElenco.conta(ch)], [2, 100], 'il giro aspetta la seconda pagina');
  cancella(ch, { conferma: ch });
  assert.deepEqual(restiDi(ch).righe, {});
  streamers.upsertApproved(ch, ch.toUpperCase(), '1');
  const nuovo = twitch({ quanti: 30 });
  usa(nuovo);
  assert.equal(F.avviaGiro(ch).avviato, true, 'il giro vecchio in volo non tiene occupato il canale nuovo');
  assert.equal((await finito(ch)).stato, 'finito');
  g.apri();
  await passa();
  assert.equal(followerElenco.conta(ch), 30, 'solo le righe del giro nuovo');
  assert.equal(F.statoGiro(ch).letti, 30, 'e il suo stato');
  assert.deepEqual([chieste, nuovo.f.pagine], [2, ['']], 'il giro vecchio si e\' fermato: nessuna pagina in piu\', a nessun Twitch');

  // Il lavoro in massa con un bersaglio solo: Twitch risponde al blocco dopo
  // la cancellazione, e il lavoro arriverebbe alla sua riga di fine.
  const l = await listaPronta(10, (h, ch) => { streamers.setSettings(ch, { antibot: { extra: ['utente1'] } }); });
  const b = porta();
  const blocca = l.h.bloccaUtente;
  l.h.bloccaUtente = async (...a) => { await b.p; return blocca(...a); };
  assert.equal((await F.avviaLavoro(l.ch, { azione: 'blocca', filtro: { livello: 'noto' }, conferma: 1 })).ok, true);
  await passa(20);
  cancella(l.ch, { conferma: l.ch });
  b.apri();
  await passa();
  assert.deepEqual(restiDi(l.ch).righe, {}, 'ne\' righe, ne\' stato del lavoro, ne\' registro');

  // Con due bersagli, e lo stesso nome che torna con il secondo ancora fra i
  // follower: il lavoro vecchio non tocca la lista nuova.
  const m = await listaPronta(10, (h, ch) => { streamers.setSettings(ch, { antibot: { extra: ['utente1', 'utente2'] } }); });
  const c = porta();
  const blocca2 = m.h.bloccaUtente;
  m.h.bloccaUtente = async (...a) => { await c.p; return blocca2(...a); };
  assert.equal((await F.avviaLavoro(m.ch, { azione: 'blocca', filtro: { livello: 'noto' }, conferma: 2 })).ok, true);
  await passa(20);
  cancella(m.ch, { conferma: m.ch });
  streamers.upsertApproved(m.ch, m.ch.toUpperCase(), '1');
  streamers.setSettings(m.ch, { antibot: { extra: ['utente1', 'utente2'] } });
  F.arrivato(m.ch, { user_id: '1002', user_login: 'utente2', user_name: 'Utente2', followed_at: new Date(ORA).toISOString() });
  c.apri();
  await passa();
  assert.equal(m.h.f.bloccati.length, 1, 'il blocco gia\' partito arriva a Twitch, il secondo non parte');
  assert.equal(followerElenco.una(m.ch, '1002').stato, '', 'e la riga nuova resta com\'e\'');
  assert.equal(F.statoLavoro(m.ch), null);

  // Un'azione sola: lo stesso.
  const a = await listaPronta(5);
  const s = porta();
  const blocca1 = a.h.bloccaUtente;
  a.h.bloccaUtente = async (...x) => { await s.p; return blocca1(...x); };
  const az = F.azione(a.ch, { azione: 'blocca', userId: '1002' });
  await passa(5);
  cancella(a.ch, { conferma: a.ch });
  s.apri();
  await az;
  assert.deepEqual(restiDi(a.ch).righe, {});
});

test('ogni scrittura del modulo passa dallo scrittore legato all\'epoca', () => {
  // Cosi' la prova sopra vale per ogni strada, non solo per quelle provate.
  const src = readFileSync(new URL('../../src/features/follower.js', import.meta.url), 'utf8').replace(/\/\/[^\n]*/g, '');
  const i = src.indexOf('function scrittore(');
  const j = src.indexOf('\n}\n', i);
  assert.ok(i > 0 && j > i);
  const fuori = src.slice(0, i) + src.slice(j);
  assert.doesNotMatch(fuori, /\bstore\.(?!senzaNascita\(|tutte\(|una\(|conta\(|pota\()\w+\(/, 'nessuna scrittura diretta sulla lista');
  assert.doesNotMatch(fuori, /statoVivo\.scrivi\(/, 'ne\' sullo stato di giri e lavori');
  assert.doesNotMatch(fuori, /(^|[^.\w])registra\(/m, 'ne\' sul registro dello scudo');
  for (const k of F.SCRITTURE) assert.equal(typeof followerElenco[k], 'function', k);
});
