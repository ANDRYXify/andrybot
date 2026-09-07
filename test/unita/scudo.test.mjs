// LO SCUDO: prende i bot e NON prende i fan.
//
// docs/SCUDO.md ha sempre avuto una sezione «Il collaudo» che elencava i casi
// verificati da `t_scudo.mjs`. Quel file non e' mai esistito in nessun commit:
// tutto lo scudo — la soglia tarata sul canale, il giudizio sull'ondata, il
// coro, la firma dei messaggi — non aveva una sola prova. Il documento
// prometteva una rete che non c'era, che e' peggio di non prometterla.
//
// Qui la rete c'e'. La domanda che conta e' sempre la stessa: e' una macchina o
// e' andata bene una clip? Sbagliarla dalla parte sbagliata significa togliere
// il follow a cento fan veri, e un fan vero rimosso non torna.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('scudo-');
const { streamers } = await import('../../src/db.js');
const ab = await import('../../src/features/antibot.js');
const as = await import('../../src/features/antispam.js');
const { checkMessage, checkRisposta } = await import('../../src/features/moderation.js');
test.after(() => casa.pulisci());

// Caso deterministico: le prove non devono dipendere dal dado. Generatore
// lineare con seme fisso, e da li' gli intervalli esponenziali.
function dado(seme) {
  let x = seme >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}
function ondataVera(n, mediaMs, r) {
  const out = []; let t = 0;
  for (let i = 0; i < n; i++) { out.push({ ts: Math.round(t), userId: 'u' + i, login: 'fan' + i }); t += -Math.log(1 - r()) * mediaMs; }
  return out;
}
function ondataMacchina(n, passoMs, jitter, r) {
  const out = []; let t = 0;
  for (let i = 0; i < n; i++) { out.push({ ts: Math.round(t), userId: 'm' + i, login: 'zx' + i + 'qq' }); t += passoMs * (1 + (r() * 2 - 1) * jitter); }
  return out;
}

// ─────────────────────────────────────────── macchina o clip virale?

test('un\'ondata a passo regolare e\' una macchina, e si vede anche se il passo balla', () => {
  const r = dado(7);
  for (const jitter of [0, 0.1, 0.25, 0.4]) {
    for (let i = 0; i < 200; i++) {
      const g = ab.ondataArtificiale(ondataMacchina(20, 300, jitter, r), {});
      assert.equal(g.certo, true, `passo regolare con ballo ${jitter} non riconosciuto: ${g.motivo}`);
    }
  }
});

test('un picco di gente vera NON viene toccato', () => {
  // E' la prova che protegge i fan. Duemila ondate genuine: gli intervalli fra
  // persone sono esponenziali, quindi ballano tanto quanto la loro media.
  const r = dado(1234);
  let scambiate = 0;
  const giri = 2000;
  for (let i = 0; i < giri; i++) {
    const n = 15 + Math.floor(r() * 26);
    if (ab.ondataArtificiale(ondataVera(n, 2500, r), {}).certo) scambiate++;
  }
  const perc = (scambiate / giri) * 100;
  assert.ok(perc <= 0.5, `${perc.toFixed(2)}% di ondate genuine scambiate per macchine (tetto 0,5%)`);
});

test('con pochi follow la risposta e\' «non lo so», non «no»', () => {
  // Prima con sei follow si rispondeva «no» e il giudizio non si rifaceva fino
  // al venticinquesimo. Misurato: con sei campioni l'8,2% delle ondate di gente
  // vera veniva giudicata macchina, e su quel «no» si perdeva l'ondata vera.
  const r = dado(99);
  for (const n of [1, 5, 6, 10, 14]) {
    const g = ab.ondataArtificiale(ondataMacchina(n, 300, 0, r), {});
    assert.equal(g.basta, false, `con ${n} follow non si puo' ancora rispondere`);
    assert.equal(g.certo, false);
  }
  const g = ab.ondataArtificiale(ondataMacchina(15, 300, 0, r), {});
  assert.equal(g.basta, true, 'con quindici si risponde');
  assert.equal(g.certo, true);
});

test('un\'ondata cosi\' veloce da stare in un istante e\' la piu\' evidente di tutte', () => {
  // Prima era l'unica che passava: con tutti i follow nello stesso millisecondo
  // la dispersione non e' definita, e il ragionamento cadeva in silenzio. Piu'
  // l'attacco correva, meno lo scudo lo vedeva.
  // Tutti nello stesso istante, e anche il caso vero: l'orologio arrotonda al
  // millisecondo, quindi una fila di 0 e 1 ha la stessa dispersione di arrivi
  // casuali. Guardare la forma non serve, la velocita' risponde da sola.
  const insieme = Array.from({ length: 16 }, (_, i) => ({ ts: 0, userId: 'b' + i, login: 'zzq' + i }));
  assert.equal(ab.ondataArtificiale(insieme, {}).certo, true);
  const r = dado(31);
  const quasi = Array.from({ length: 16 }, (_, i) => ({ ts: Math.round(i * (r() < 0.5 ? 0 : 1)), userId: 'c' + i, login: 'zzw' + i }));
  const g = ab.ondataArtificiale(quasi, {});
  assert.equal(g.certo, true, `sedici follow in pochi millisecondi: ${g.motivo}`);
  assert.equal(g.basta, true);
});

test('un\'ondata di nomi gia\' noti e\' artificiale anche se arriva a caso', () => {
  const r = dado(5);
  const arr = ondataVera(20, 2500, r);
  for (let i = 0; i < 7; i++) arr[i].login = 'buy_followers_' + i;   // 7 su 20 = 35%
  const g = ab.ondataArtificiale(arr, {});
  assert.equal(g.certo, true, g.motivo);
  assert.match(g.motivo, /nomi/);
});

// ─────────────────────────────────────────── il coro

test('lo stesso messaggio da quattro bocche diverse e\' un coro', async () => {
  const ch = 'coro1';
  streamers.upsertApproved(ch, 'Coro', '11');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false } });
  const tolti = [];
  const scudo = new ab.AntiBot({ helix: { deleteMessage: async (_c, id) => tolti.push(id), chatSoloFollower: async () => ({ ok: true }), chatLenta: async () => ({ ok: true }), shieldMode: async () => ({ ok: true }) } });
  const testo = 'seguimi sul mio canale trovi tutto nel profilo grazie mille';
  let preso = false;
  for (let i = 0; i < 4; i++) {
    preso = await scudo.controllaChat({ channel: ch, user: 'tizio' + i, userId: 'x' + i, id: 'm' + i, text: testo });
  }
  assert.equal(preso, true, 'la quarta bocca fa scattare il coro');
  assert.equal(tolti.length, 1, 'e il messaggio viene tolto');
  assert.equal(ab.assetto(ch).livello, 'attacco');
});

test('venti persone che scrivono «lol» sono una chat viva, non un attacco', async () => {
  const ch = 'coro2';
  streamers.upsertApproved(ch, 'Coro2', '12');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false } });
  const scudo = new ab.AntiBot({ helix: { deleteMessage: async () => {} } });
  for (let i = 0; i < 20; i++) {
    const preso = await scudo.controllaChat({ channel: ch, user: 'gente' + i, userId: 'g' + i, id: 'k' + i, text: 'lol' });
    assert.equal(preso, false, 'una parola sola non entra mai nel confronto');
  }
  // E nemmeno una frase corta: «w andry» ha lo spazio, quindi la difesa che
  // la tiene fuori e' solo la lunghezza. Vanno provate una per una, sennò una
  // delle due puo' cadere senza che nessuno se ne accorga.
  for (let i = 0; i < 20; i++) {
    const preso = await scudo.controllaChat({ channel: ch, user: 'tifo' + i, userId: 't' + i, id: 'j' + i, text: 'w andry' });
    assert.equal(preso, false, 'un coretto di incoraggiamento non e\' un hate-raid');
  }
  assert.equal(ab.assetto(ch).livello, 'calma');
});

test('la firma tiene anche se cambiano accenti, link e punteggiatura', () => {
  const a = ab.firmaMessaggio('Segui il mio canale, trovi tutto qui: https://esempio.it/x');
  const b = ab.firmaMessaggio('SEGUI IL MIO CANÀLE trovi tutto qui!!! http://altro.com/y');
  assert.ok(a && b);
  assert.equal(a, b, 'gli attacchi cambiano proprio quei dettagli');
  assert.equal(ab.firmaMessaggio('lol'), '', 'i messaggi corti non entrano');
  assert.equal(ab.firmaMessaggio('POGGERSPOGGERSPOGGERS'), '', 'una parola sola nemmeno');
});

test('il coro resta acceso anche se lo streamer spegne l\'elenco dei nomi', async () => {
  // Prima le tre difese in chat stavano dietro allo stesso interruttore: chi
  // spegneva «nomi da bot» si portava via anche il coro, che e' la firma
  // dell'hate-raid, e non gliel'aveva detto nessuno.
  const ch = 'coro3';
  streamers.upsertApproved(ch, 'Coro3', '13');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, nomiBot: false } });
  const scudo = new ab.AntiBot({ helix: { deleteMessage: async () => {}, chatSoloFollower: async () => ({ ok: true }), chatLenta: async () => ({ ok: true }), shieldMode: async () => ({ ok: true }) } });
  const testo = 'guarda che roba questo canale merita molti piu spettatori davvero';
  let preso = false;
  for (let i = 0; i < 4; i++) preso = await scudo.controllaChat({ channel: ch, user: 'v' + i, userId: 'w' + i, id: 'q' + i, text: testo });
  assert.equal(preso, true, 'il coro non dipende dall\'elenco dei nomi');
});

// ─────────────────────────────────────────── i nomi

test('i bot buoni non si toccano mai, i follow-bot promozionali si', () => {
  for (const b of ['nightbot', 'streamelements', 'sery_bot', 'commanderroot']) {
    assert.equal(ab.nomeBot(b, {}), false, b + ' e\' un bot buono');
  }
  for (const b of ['buy_followers_now', 'cheapviewers', 'followers4pro', 'streamboo_x']) {
    assert.equal(ab.nomeBot(b, {}), true, b + ' e\' un follow-bot');
  }
  assert.equal(ab.nomeBot('andrea_gamer', {}), false, 'una persona non e\' un bot');
  assert.equal(ab.nomeBot('buy_followers_now', { esenti: ['buy_followers_now'] }), false, 'chi lo streamer esenta resta fuori');
  assert.equal(ab.nomeBot('pippo', { extra: ['pippo'] }), true, 'e chi aggiunge lui entra');
});

test('un account di oggi, vuoto e col nome da bot, e\' sospetto; uno vecchio no', () => {
  const nuovo = ab.valutaAccount({ login: 'buy_followers_now', created_at: new Date().toISOString(), profile_image_url: 'https://x/user-default-pictures/y.png', description: '' }, {});
  assert.ok(nuovo.rischio >= 70, `rischio ${nuovo.rischio}`);
  const vero = ab.valutaAccount({ login: 'andrea_gamer', created_at: '2019-04-02T10:00:00Z', profile_image_url: 'https://x/foto.png', description: 'gioco e rido' }, {});
  assert.ok(vero.rischio < 20, `rischio ${vero.rischio}`);
});

// ─────────────────────────────────────────── i link dell'antispam

const cfgSpam = { ...as.ANTISPAM_DEFAULT, attivo: true, whitelist: ['youtube.com'] };
const spam = (testo, i) => as.valuta({ text: testo, channel: 'andryxify', user: 'anon' + i }, cfgSpam);

test('un link permesso in mezzo al messaggio non assolve tutto il resto', () => {
  // Cinque modi banali di aggirare il filtro, tutti misurati funzionanti prima:
  // bastava nominare un dominio permesso da qualche parte.
  const bugie = [
    'guarda qui bit.ly/malware (niente a che vedere con andryxify.it)',
    'twitch.tv/andryxify ah e anche bit.ly/malware',
    'iscriviti su clips.twitch.tv-truffa.com/xyz',
    'vai su bit.ly/x?ref=clips.twitch.tv',
    'youtube.com.evil.net/x',
  ];
  bugie.forEach((t, i) => assert.ok(spam(t, 'b' + i), `passa ancora: ${t}`));
});

test('i link del canale e quelli permessi passano', () => {
  const buoni = ['twitch.tv/andryxify', 'clips.twitch.tv/BraveCode', 'https://www.andryxify.it/u/andryxify',
    'twitch.tv/andryxify/clip/xyz', 'il video su youtube.com/watch?v=abc', 'niente link qui'];
  buoni.forEach((t, i) => assert.equal(spam(t, 'g' + i), null, `bloccato per sbaglio: ${t}`));
});

test('«lascia stare.io ci provo» non e\' un link', () => {
  // In chat italiana il punto si scrive attaccato. Misurato prima: dieci frasi
  // normali su quindici finivano cancellate, e proprio ai non abbonati.
  const chat = ['ma quanto sei forte.io non ci riuscirei', 'lascia stare.io ci ho provato', 'non lo so.me lo diceva ieri',
    'ok.it sembra facile ma non lo e', 'bravissimo.live da due ore', 'te lo dico.info utile', 'stasera niente.top comunque',
    'che ansia.app aperta e non parte', 'niente da fare.club dei perdenti', 'guarda che roba.link nella descrizione? no'];
  chat.forEach((t, i) => assert.equal(spam(t, 'c' + i), null, `cancellato un messaggio normale: ${t}`));
});

test('l\'host si legge come host, non come pezzo di testo', () => {
  assert.equal(as.hostDi('https://www.twitch.tv/tizio?x=1'), 'twitch.tv');
  assert.equal(as.hostDi('clips.twitch.tv/abc'), 'clips.twitch.tv');
  assert.equal(as.hostDi('http://utente:pw@cattivo.com/x'), 'cattivo.com');
  assert.equal(as.hostDi('non un link'), '');
  assert.equal(as.linkPermesso('clips.twitch.tv/x', ['clips.twitch.tv']), true);
  assert.equal(as.linkPermesso('clips.twitch.tv-truffa.com/x', ['clips.twitch.tv']), false, 'portarselo dentro nel nome non basta');
  assert.equal(as.linkPermesso('twitch.tv/andryxify2', ['twitch.tv/andryxify']), false, 'il percorso ha un confine');
  assert.equal(as.linkPermesso('twitch.tv/andryxify/clip/x', ['twitch.tv/andryxify']), true);
});

// ─────────────────────────────────────────── le altre difese dell'antispam

test('flood, copypasta, maiuscole e menzioni', () => {
  let e = null;
  for (let i = 0; i < 6; i++) e = as.valuta({ text: 'ciao a tutti ' + i, channel: 'andryxify', user: 'flood1' }, cfgSpam);
  assert.match(e?.motivo || '', /flood/);
  for (let i = 0; i < 3; i++) e = as.valuta({ text: 'compra i miei follower', channel: 'andryxify', user: 'copia1' }, cfgSpam);
  assert.match(e?.motivo || '', /ripetuto/);
  assert.match(spam('SIETE TUTTI QUANTI DEI PERDENTI', 'M')?.motivo || '', /maiuscole/);
  assert.match(spam('@uno @due @tre @quattro venite', 'A')?.motivo || '', /menzioni/);
});

test('mod, VIP e broadcaster non passano mai dall\'antispam', () => {
  for (const chi of [{ isMod: true }, { isVip: true }, { isBroadcaster: true }]) {
    assert.equal(as.valuta({ text: 'GUARDA QUI bit.ly/x', channel: 'andryxify', user: 'capo', ...chi }, cfgSpam), null);
  }
});

// ─────────────────────────────────────────── le parole vietate

test('una parola vietata resta vietata anche con un accento', () => {
  const st = { paroleVietate: ['idiota'], maiDire: ['taliento'] };
  for (const t of ['sei un idiota', 'sei un ìdiota', 'SEI UN IDIOTA']) {
    assert.equal(checkMessage(t, st).ok, false, t);
  }
  assert.equal(checkMessage('tutto bene qui', st).ok, true);
  assert.equal(checkRisposta('mi chiamo Talientò', st).ok, false, 'e vale anche per quello che dice il bot');
  assert.ok(!/taliento/i.test(checkRisposta('sono Taliento', st).reason || ''), 'il motivo non ripete la parola: finisce nei log');
});

// ─────────────────────────────────────────── sotto attacco, dall'inizio alla fine

const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

function helixFinto() {
  const f = { chiuso: {}, bloccati: [], bannati: [], follower: [] };
  return {
    f,
    chatSoloFollower: async (_c, on) => { f.chiuso.follower = on; return { ok: true }; },
    chatLenta: async (_c, on) => { f.chiuso.lenta = on; return { ok: true }; },
    shieldMode: async (_c, on) => { f.chiuso.shield = on; return { ok: true }; },
    bloccaUtente: async (_c, id) => { f.bloccati.push(id); return { ok: true }; },
    timeoutUser: async (_c, id) => { f.bannati.push(id); return { ok: true }; },
    deleteMessage: async () => {},
    getRecentFollowers: async () => { const a = [...f.follower]; a.cursore = ''; a.totale = a.length; return a; },
  };
}

async function codaVuota(ch) {
  for (let i = 0; i < 200 && ab.codaBan(ch).in_attesa; i++) await attesa(50);
}

test('sotto attacco la serranda si alza e l\'ondata viene tolta dal primo', async () => {
  const ch = 'onda1';
  streamers.upsertApproved(ch, 'Onda', '21');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10, rafficaSecondi: 30 } });
  const h = helixFinto();
  const scudo = new ab.AntiBot({ helix: h });

  // sedici follow a passo regolare: una macchina
  for (let i = 0; i < 16; i++) {
    await scudo.onFollow({ channel: ch, data: { user_id: 'bot' + i, user_login: 'zzq' + i } });
  }
  assert.equal(ab.assetto(ch).livello, 'attacco', 'l\'assetto deve salire');
  assert.deepEqual(h.f.chiuso, { follower: true, lenta: true, shield: true }, 'serranda e Shield Mode alzati');

  await codaVuota(ch);
  // Sui follow si BLOCCA, non si banna: il ban lascerebbe il follow finto nella
  // lista, e il numero gonfiato e' il danno vero di un follow-bot.
  assert.ok(h.f.bloccati.length >= 16, `presi ${h.f.bloccati.length} su 16, primo compreso`);
  assert.ok(h.f.bloccati.includes('bot0'), 'anche il primo, quello che ha fatto scattare l\'allarme');
  assert.equal(h.f.bannati.length, 0, 'sui follow il ban non serve: serve il blocco');
});

test('un picco di gente vera alza la serranda ma non tocca nessuno', async () => {
  const ch = 'onda2';
  streamers.upsertApproved(ch, 'Onda2', '22');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, rafficaQuanti: 10, rafficaSecondi: 30 } });
  const h = helixFinto();
  const scudo = new ab.AntiBot({ helix: h });
  const r = dado(2026);
  // arrivi a caso, come le persone: si aspetta davvero fra un follow e l'altro
  for (let i = 0; i < 16; i++) {
    await scudo.onFollow({ channel: ch, data: { user_id: 'fan' + i, user_login: 'andrea' + i } });
    await attesa(Math.round(-Math.log(1 - r()) * 25));
  }
  assert.equal(ab.assetto(ch).livello, 'attacco', 'la serranda si alza lo stesso: e\' prudenza, non condanna');
  await attesa(300);
  assert.equal(h.f.bloccati.length, 0, 'ma non si toglie il follow a nessuno');
  assert.equal(h.f.bannati.length, 0);
});

test('al rientro in calma si rimette a posto solo cio\' che aveva mosso lui', async () => {
  const ch = 'onda3';
  streamers.upsertApproved(ch, 'Onda3', '23');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false } });
  const h = helixFinto();
  const scudo = new ab.AntiBot({ helix: h });
  await scudo._alza(ch, 'attacco', 'prova', scudo.cfg(ch));
  assert.deepEqual(h.f.chiuso, { follower: true, lenta: true, shield: true });
  await scudo._abbassa(ch);
  assert.deepEqual(h.f.chiuso, { follower: false, lenta: false, shield: false }, 'tutto riaperto');
  assert.equal(ab.assetto(ch).livello, 'calma');
});

test('in chat si banna, sui follow si blocca', async () => {
  const ch = 'azione1';
  streamers.upsertApproved(ch, 'Azione', '24');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false } });
  const h = helixFinto();
  const scudo = new ab.AntiBot({ helix: h });
  await scudo.onFollow({ channel: ch, data: { user_id: 'f1', user_login: 'buy_followers_now' } });
  assert.deepEqual(h.f.bloccati, ['f1'], 'sul follow: blocco, che toglie il follow');
  await scudo.controllaChat({ channel: ch, user: 'cheapviewers', userId: 'c1', id: 'x', text: 'ciao' });
  assert.deepEqual(h.f.bannati, ['c1'], 'in chat: ban, che e\' moderazione');
});

test('la pulizia in prova non tocca niente, quella vera prende solo i bot', async () => {
  const ch = 'pulizia1';
  streamers.upsertApproved(ch, 'Pulizia', '25');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false } });
  const h = helixFinto();
  h.f.follower = [
    { user_id: '1', user_login: 'andrea_gamer' },
    { user_id: '2', user_login: 'buy_followers_now' },
    { user_id: '3', user_login: 'nightbot' },
    { user_id: '4', user_login: 'cheapviewers' },
    { user_id: '5', user_login: 'lucia98' },
  ];
  const scudo = new ab.AntiBot({ helix: h });
  const prova = await scudo.pulisciFollower(ch, { prova: true });
  assert.equal(prova.trovati.length, 2, 'in prova si dice chi, e basta');
  assert.equal(h.f.bloccati.length, 0, 'in prova non si tocca niente');
  const vero = await scudo.pulisciFollower(ch, {});
  assert.equal(vero.bloccati, 2);
  assert.deepEqual(h.f.bloccati.sort(), ['2', '4'], 'i fan veri e Nightbot non si sfiorano');
});

test('un inciampo di rete non spegne per sempre il controllo di un account', async () => {
  // La data di nascita e' un fatto e si ricorda. «Non ho potuto chiedere» non
  // e' un fatto: ricordarlo vorrebbe dire non controllare mai piu' proprio
  // l'account che stava scrivendo.
  const ch = 'nati1';
  streamers.upsertApproved(ch, 'Nati', '26');
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { antibot: { attivo: true, avvisa: false, chatNuovi: true, chatMinOre: 24 } });
  const h = helixFinto();
  let giro = 0;
  h.getUserByLogin = async () => {
    giro++;
    if (giro === 1) throw new Error('rete storta');
    return { login: 'nuovo1', created_at: new Date(Date.now() - 3600_000).toISOString() };
  };
  const scudo = new ab.AntiBot({ helix: h });
  const msg = { channel: ch, user: 'nuovo1', userId: 'n1', id: 'a', text: 'ciao a tutti quanti' };
  assert.equal(await scudo.controllaChat(msg), false, 'col primo inciampo non si trattiene nessuno');
  assert.equal(await scudo.controllaChat({ ...msg, id: 'b' }), true, 'ma al messaggio dopo si richiede, e si vede');
});

test('la soglia si tara sul canale, non e\' un numero calato dall\'alto', () => {
  const ch = 'ritmo1';
  const base = ab.sogliaRaffica(ch, { rafficaQuanti: 10, rafficaSecondi: 30 });
  assert.equal(base, 10, 'senza storia si usa il numero dichiarato: senza dati non si inventa una statistica');
  assert.ok(ab.sogliaRaffica(ch, { rafficaQuanti: 3 }) >= 3);
});
