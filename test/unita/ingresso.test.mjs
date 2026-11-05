// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ACCESSO SICURO (docs/ACCESSO-SICURO.md): le garanzie, provate dove stanno.
//
//  · una sfida di ingresso vale una volta, e scade (la chiave primaria);
//  · la famiglia del browser e la rete abbreviata, e il loro giudizio: cambiare
//    rete o versione non e' un'anomalia, cambiare motore o sistema si';
//  · l'app dei codici: i numeri dell'RFC, un passo una volta sola;
//  · un codice per mail vale una volta, scade, e regge cinque tentativi;
//  · i codici di riserva valgono una volta, e si conservano come impronta;
//  · il segreto dell'app e la mail della prova stanno nella busta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-ingresso-');
const { db, ingressoDb } = await import('../../src/db.js');
const P = await import('../../src/features/ingresso-prova.js');
const I = await import('../../src/features/ingresso-impronta.js');
const T = await import('../../src/features/ingresso-totp.js');
const { creaIngresso, azzeraTetti, tetto } = await import('../../src/features/ingresso.js');
test.after(() => usaEGetta.pulisci());

const CHIAVE = Buffer.alloc(32, 7);
const UA = {
  chromeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  chromeWinNuovo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  edgeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  firefoxWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  chromeIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
  iphoneDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  androidDesktop: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  curl: 'curl/8.5.0',
  headless: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36',
};

test('una sfida vale una volta: la seconda volta lo schema dice di no', () => {
  const brucia = (s, scade) => ingressoDb.brucia(s, scade);
  const { sfida, bit } = P.creaSfida({ chiave: CHIAVE, scopo: 'mail', bit: P.BIT_BASE });
  const numero = P.risolvi(sfida, bit);
  assert.deepEqual(P.verificaSfida({ sfida, numero, chiave: CHIAVE, scopo: 'mail', brucia }), { ok: true });
  assert.equal(P.verificaSfida({ sfida, numero, chiave: CHIAVE, scopo: 'mail', brucia }).motivo, 'usata', 'la stessa sfida, risolta bene, non passa due volte');
  assert.equal(db.prepare('SELECT COUNT(*) c FROM ingresso_sfide WHERE sfida=?').get(sfida).c, 1, 'ed e\' scritta una volta sola');
});

test('una sfida scade, e una sfida toccata, di un altro scopo o senza lavoro non passa', () => {
  const brucia = (s, scade) => ingressoDb.brucia(s, scade);
  const ora = Date.now();
  const s = P.creaSfida({ chiave: CHIAVE, scopo: 'mail', ora });
  const n = P.risolvi(s.sfida, s.bit);
  assert.equal(P.verificaSfida({ sfida: s.sfida, numero: n, chiave: CHIAVE, scopo: 'mail', brucia, ora: ora + P.VALIDA_MS + 1 }).motivo, 'scaduta');
  assert.equal(P.verificaSfida({ sfida: s.sfida, numero: n, chiave: CHIAVE, scopo: 'password', brucia, ora }).motivo, 'scopo');
  assert.equal(P.verificaSfida({ sfida: s.sfida, numero: n, chiave: Buffer.alloc(32, 8), scopo: 'mail', brucia, ora }).motivo, 'firma', 'con un\'altra chiave la firma non torna');
  const [dati, firma] = s.sfida.split('.');
  const facile = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(dati, 'base64url')), b: 1 })).toString('base64url');
  assert.equal(P.verificaSfida({ sfida: facile + '.' + firma, numero: '0', chiave: CHIAVE, scopo: 'mail', brucia, ora }).motivo, 'firma', 'la difficolta\' non si abbassa da fuori');
  let sbagliato = 0;
  while (P.lavoroFatto(s.sfida, String(sbagliato), s.bit)) sbagliato++;
  assert.equal(P.verificaSfida({ sfida: s.sfida, numero: String(sbagliato), chiave: CHIAVE, scopo: 'mail', brucia, ora }).motivo, 'lavoro');
  assert.equal(P.verificaSfida({ sfida: s.sfida, numero: n, chiave: CHIAVE, scopo: 'mail', brucia, ora }).ok, true, 'e i tentativi sbagliati non l\'hanno bruciata');
});

test('i segnali alzano la difficolta\', fino a un tetto, e non bloccano mai', () => {
  assert.equal(P.bitPer({}, UA.chromeWin), P.BIT_BASE);
  assert.equal(P.bitPer({ webdriver: true }, UA.chromeWin), P.BIT_BASE + P.BIT_SEGNALE);
  assert.equal(P.bitPer({}, 'Mozilla/5.0 HeadlessChrome/130'), P.BIT_BASE + P.BIT_SEGNALE, 'il nome del browser lo vede anche il server');
  assert.equal(P.bitPer({ webdriver: true, senzaTesta: true, senzaLingue: true, senzaMotore: true }, ''), P.BIT_BASE + P.BIT_MAX_IN_PIU);
  assert.equal(P.bitPer({ webdriver: 'si' }, ''), P.BIT_BASE, 'solo un vero si\' conta');
});

test('la famiglia e\' il motore e il gruppo del sistema: la «versione desktop» non cambia famiglia', () => {
  const f = (u) => `${I.motoreDi(u)}/${I.sistemaDi(u)}`;
  assert.equal(f(UA.chromeWin), 'chromium/windows');
  assert.equal(f(UA.edgeWin), 'chromium/windows');
  assert.equal(f(UA.firefoxWin), 'gecko/windows');
  assert.equal(f(UA.safariIphone), 'webkit/apple');
  assert.equal(f(UA.chromeIphone), 'webkit/apple', 'su iPhone ogni browser e\' WebKit');
  assert.equal(f(UA.iphoneDesktop), f(UA.safariIphone), 'Safari su iPhone in versione desktop resta della stessa famiglia');
  assert.equal(f(UA.androidDesktop), f(UA.chromeAndroid), 'Chrome su Android col sito per computer resta della stessa famiglia');
  assert.equal(f(UA.headless), 'chromium/linux-android', 'Chrome senza testa e\' Chrome: il nome attaccato non lo fa diventare Safari');
  assert.equal(f(UA.curl), 'altro/altro');
});

test('la rete abbreviata: /16 e /48, mai l\'indirizzo intero', () => {
  assert.equal(I.reteDi('93.41.207.12'), '93.41.0.0/16');
  assert.equal(I.reteDi('::ffff:93.41.207.12'), '93.41.0.0/16');
  assert.equal(I.reteDi('2a01:4f8:c17:1234::1'), '2a01:4f8:c17::/48');
  assert.equal(I.reteDi('2a01:04f8:0c17:1234:0000:0000:0000:0001'), '2a01:4f8:c17::/48');
  assert.equal(I.reteDi('fe80::1%eth0'), 'fe80:0:0::/48');
  assert.equal(I.reteDi('niente'), '');
});

test('il giudizio: cambiare rete o versione non e\' un\'anomalia, cambiare motore o sistema si\'', () => {
  const riga = { ...I.improntaDi({ ua: UA.chromeWin, ip: '93.41.207.12' }) };
  assert.equal(I.giudica(riga, I.improntaDi({ ua: UA.chromeWin, ip: '151.20.1.1' })).anomalia, false, 'dal Wi-Fi ai dati');
  assert.equal(I.giudica(riga, I.improntaDi({ ua: UA.chromeWinNuovo, ip: '93.41.1.1' })).anomalia, false, 'il browser aggiornato');
  assert.equal(I.giudica(riga, I.improntaDi({ ua: UA.edgeWin, ip: '93.41.1.1' })).anomalia, false, 'Chrome ed Edge sono lo stesso motore');
  assert.equal(I.giudica(riga, I.improntaDi({ ua: UA.firefoxWin, ip: '93.41.207.12' })).perche, 'motore');
  assert.equal(I.giudica(riga, I.improntaDi({ ua: UA.androidDesktop, ip: '93.41.207.12' })).perche, 'sistema');
  assert.equal(I.giudica(riga, I.improntaDi({ ua: UA.curl, ip: '93.41.207.12' })).anomalia, true, 'un programma col cookie di un browser');
});

test('l\'app dei codici: i numeri dell\'RFC 6238, e il passo storto di uno', () => {
  const segreto = T.base32(Buffer.from('12345678901234567890'));
  assert.equal(segreto, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  assert.equal(T.codiceAlPasso(segreto, T.passoDi(59_000)), '287082');
  assert.equal(T.codiceAlPasso(segreto, T.passoDi(1_111_111_109_000)), '081804');
  assert.equal(T.codiceAlPasso(segreto, T.passoDi(1_234_567_890_000)), '005924');
  const ora = 1_234_567_890_000;
  assert.equal(T.passoCheCombacia(segreto, '005924', ora), T.passoDi(ora));
  assert.equal(T.passoCheCombacia(segreto, T.codiceAlPasso(segreto, T.passoDi(ora) - 1), ora), T.passoDi(ora) - 1, 'l\'orologio indietro di un passo');
  assert.equal(T.passoCheCombacia(segreto, T.codiceAlPasso(segreto, T.passoDi(ora) - 2), ora), 0, 'due passi no');
  assert.equal(T.passoCheCombacia(segreto, 'abcdef', ora), 0);
  assert.match(T.indirizzoOtp({ segreto, conto: 'Luna' }), /^otpauth:\/\/totp\/SocialBot:Luna\?secret=GEZD.*&period=30$/);
});

const mandate = [];
const postaFinta = { attiva: () => true, invia: async (m) => { mandate.push(m); return { ok: true }; } };
let adesso = Date.now();
const servizio = creaIngresso({ store: ingressoDb, identitaDi: (u) => String(u?.identita || u?.login || ''), passkeyQuante: () => 0, posta: postaFinta, ora: () => adesso });
const codiceDa = (m) => /(\d{3}) (\d{3})/.exec(m.testo).slice(1).join('');

test('lo stesso codice dell\'app vale una volta sola, e solo confermato', () => {
  const s = servizio.preparaTotp('rita');
  assert.equal(servizio.usaTotp('rita', T.codiceAlPasso(s, T.passoDi(adesso))), false, 'un\'app in prova non vale ancora');
  assert.equal(servizio.confermaTotp('rita', T.codiceAlPasso(s, T.passoDi(adesso))), true);
  assert.equal(servizio.usaTotp('rita', T.codiceAlPasso(s, T.passoDi(adesso))), false, 'il codice usato per confermare non vale di nuovo');
  adesso += 30_000;
  const c = T.codiceAlPasso(s, T.passoDi(adesso));
  assert.equal(servizio.usaTotp('rita', c), true);
  assert.equal(servizio.usaTotp('rita', c), false, 'lo stesso codice, due volte: la seconda no');
  const grezzo = db.prepare('SELECT segreto FROM ingresso_fattori WHERE login=\'rita\'').get().segreto;
  assert.ok(grezzo.startsWith('enc:2:') && !grezzo.includes(s), 'il segreto dell\'app sta nella busta');
});

test('un codice per mail vale una volta, scade in dieci minuti, regge cinque tentativi', async () => {
  servizio.preparaMail('sara', 'Sara@Esempio.it');
  assert.equal(servizio.confermaMail('sara'), 'ok');
  const grezzo = db.prepare('SELECT segreto, impronta FROM ingresso_fattori WHERE login=\'sara\'').get();
  assert.ok(grezzo.segreto.startsWith('enc:2:') && !grezzo.segreto.includes('esempio'), 'l\'indirizzo sta nella busta');
  assert.equal(servizio.fattoriDi('sara').mail, 'sa***@esempio.it', 'fuori esce solo nascosto');

  await servizio.mandaCodice('sara', 'sara@esempio.it', 'prova', 'it');
  const c1 = codiceDa(mandate.at(-1));
  assert.ok(!JSON.stringify(db.prepare('SELECT * FROM ingresso_codici WHERE login=\'sara\'').all()).includes(c1), 'il codice non si conserva: solo la sua impronta');
  assert.equal(servizio.usaCodiceMail('sara', 'attiva', c1), false, 'un codice vale per il suo scopo');
  assert.equal(servizio.usaCodiceMail('sara', 'prova', c1), true);
  assert.equal(servizio.usaCodiceMail('sara', 'prova', c1), false, 'una volta sola');

  await servizio.mandaCodice('sara', 'sara@esempio.it', 'prova', 'en');
  const c2 = codiceDa(mandate.at(-1));
  assert.match(mandate.at(-1).oggetto, /Your code/, 'nella lingua di chi lo chiede');
  adesso += 10 * 60_000 + 1;
  assert.equal(servizio.usaCodiceMail('sara', 'prova', c2), false, 'dopo dieci minuti non vale');

  await servizio.mandaCodice('sara', 'sara@esempio.it', 'prova', 'it');
  const c3 = codiceDa(mandate.at(-1));
  await servizio.mandaCodice('sara', 'sara@esempio.it', 'prova', 'it');
  const c4 = codiceDa(mandate.at(-1));
  if (c3 !== c4) assert.equal(servizio.usaCodiceMail('sara', 'prova', c3), false, 'chiederne uno nuovo brucia il vecchio');
  const sbagliato = c4 === '000000' ? '000001' : '000000';
  for (let i = 0; i < 4; i++) assert.equal(servizio.usaCodiceMail('sara', 'prova', sbagliato), false);
  assert.equal(servizio.usaCodiceMail('sara', 'prova', sbagliato), false);
  assert.equal(servizio.usaCodiceMail('sara', 'prova', c4), false, 'dopo cinque tentativi sbagliati anche quello giusto e\' bruciato');
});

test('i codici di riserva: dieci, una volta ciascuno, rifarli butta i vecchi', () => {
  const codici = servizio.nuoveRiserve('ugo');
  assert.equal(codici.length, 10);
  assert.equal(new Set(codici).size, 10);
  for (const c of codici) assert.match(c, /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  const righe = JSON.stringify(db.prepare('SELECT * FROM ingresso_codici WHERE login=\'ugo\'').all());
  assert.ok(codici.every((c) => !righe.includes(c) && !righe.includes(c.replace('-', ''))), 'si conservano solo come impronta');
  assert.equal(servizio.usaRiserva('ugo', codici[3].toLowerCase().replace('-', ' ')), true, 'si scrive come viene');
  assert.equal(servizio.usaRiserva('ugo', codici[3]), false, 'una volta sola');
  assert.equal(servizio.fattoriDi('ugo').riserve, 9);
  const nuovi = servizio.nuoveRiserve('ugo');
  assert.equal(servizio.usaRiserva('ugo', codici[4]), false, 'i vecchi non valgono piu\'');
  assert.equal(servizio.usaRiserva('ugo', nuovi[0]), true);
});

test('l\'ultimo fattore non si toglie', () => {
  servizio.preparaMail('vera', 'vera@esempio.it');
  servizio.confermaMail('vera');
  assert.equal(servizio.puoTogliere('vera', 'mail'), false, 'e\' l\'unico');
  const s = servizio.preparaTotp('vera');
  servizio.confermaTotp('vera', T.codiceAlPasso(s, T.passoDi(adesso)));
  assert.equal(servizio.puoTogliere('vera', 'mail'), true, 'con l\'app accanto si puo\'');
});

test('i tetti contano per finestra', () => {
  azzeraTetti();
  for (let i = 0; i < 3; i++) assert.equal(tetto('x', 3, 1000, 0), true);
  assert.equal(tetto('x', 3, 1000, 10), false);
  assert.equal(tetto('x', 3, 1000, 1000), true, 'la finestra dopo riparte');
});

test('le sfide scadute, le sessioni finite e il registro oltre i 90 giorni se ne vanno da soli', () => {
  const ora = Date.now();
  ingressoDb.brucia('sfida-vecchia', ora - 1);
  ingressoDb.brucia('sfida-viva', ora + 60_000);
  ingressoDb.apriSessione({ sid: 'finita', login: 'zeno', motore: 'gecko', sistema: 'windows', rete: '1.2.0.0/16', via: 'twitch', ora: ora - 10, scade: ora - 1 });
  ingressoDb.annota('zeno', 'ingresso', {}, ora - 91 * 86_400_000);
  ingressoDb.annota('zeno', 'ingresso', {}, ora);
  ingressoDb.pulisci(ora);
  const sfide = db.prepare('SELECT sfida FROM ingresso_sfide WHERE sfida LIKE \'sfida-%\'').all().map((r) => r.sfida);
  assert.deepEqual(sfide, ['sfida-viva']);
  assert.equal(ingressoDb.sessione('finita'), null);
  assert.equal(ingressoDb.registro('zeno').length, 1, 'il registro tiene 90 giorni');
});

const PW = await import('../../src/features/ingresso-password.js');
const D = await import('../../src/features/ingresso-domande.js');
const { contoApribile } = await import('../../src/features/ingresso.js');
const ID = await import('../../src/identita.js');

test('una password non si salva mai in chiaro: solo il calco scrypt, col suo sale', async () => {
  const p = 'cavallo batteria graffetta';
  const c1 = await PW.calco(p), c2 = await PW.calco(p);
  assert.ok(PW.eCalco(c1) && !c1.includes(p) && !c1.includes('cavallo'), 'il calco non contiene la password');
  assert.notEqual(c1, c2, 'ogni calco ha il suo sale');
  assert.equal(await PW.combacia(p, c1), true);
  assert.equal(await PW.combacia(p + ' ', c1), false);
  assert.equal(await PW.combacia(p, 'qualcosa'), false, 'un salvato che non e\' un calco non combacia mai');
  await assert.rejects(() => PW.calco('corta'), 'meno di 8 no');
  assert.equal(PW.lunghezzaOk('x'.repeat(128)), true);
  assert.equal(PW.lunghezzaOk('x'.repeat(129)), false);
  assert.equal(PW.lunghezzaOk('🔑🔑🔑🔑🔑🔑🔑🔑'), true, 'si contano i caratteri, non i byte');
  assert.equal(PW.lunghezzaOk('abcdefgh'), true, 'nessuna regola su maiuscole e simboli');
  await servizio.mettiPassword('tina', p);
  const grezzo = db.prepare('SELECT segreto FROM ingresso_fattori WHERE login=\'tina\' AND tipo=\'password\'').get().segreto;
  assert.ok(grezzo.startsWith('enc:2:') && !grezzo.includes(p), 'e il calco sta a sua volta nella busta');
  assert.equal(await servizio.usaPassword('tina', p), true);
  assert.equal(await servizio.usaPassword('tina', 'sbagliata!'), false);
});

test('un conto nato con la mail apre il pannello solo approvato', () => {
  assert.equal(ID.piattaformaDi('ml.ab12cd34ef'), 'mail');
  assert.equal(ID.conDiretta('mail'), false);
  assert.equal(ID.urlCanale('ml.ab12cd34ef'), '');
  assert.equal(contoApribile('ml.ab12cd34ef', { status: 'pending' }), false);
  assert.equal(contoApribile('ml.ab12cd34ef', null), false);
  assert.equal(contoApribile('ml.ab12cd34ef', { status: 'approved' }), true);
  assert.equal(contoApribile('andryx', null), true, 'per gli altri non cambia niente');
});

test('le domande del primo ingresso vanno nelle impostazioni che ci sono, ripulite', () => {
  const strumenti = { schedaPulita: (x) => Object.fromEntries(Object.entries(x).filter(([, v]) => v)), normVoce: (v) => ({ ...v, momenti: v.momenti || {} }), toni: ['scherzoso', 'amichevole', 'serio'], generi: ['neutro', 'femminile', 'maschile'], lingue: ['it', 'en', 'es'] };
  const prima = { tono: 'serio', scheda: { chi: 'gia\' scritto' }, voce: { momenti: { saluto: { modo: 'mie' } } } };
  const r = D.impostazioniDaDomande(prima, { nome: '  Il Canale  ', argomento: 'giochi horror', tono: 'scherzoso', genere: 'femminile', community: 'ciurma', lingua: 'en', evita: 'spoiler' }, strumenti);
  assert.equal(r.display, 'Il Canale');
  assert.deepEqual(r.settings.scheda, { chi: 'gia\' scritto', faccio: 'giochi horror', evita: 'spoiler' });
  assert.equal(r.settings.tono, 'scherzoso');
  assert.equal(r.settings.genere, 'femminile');
  assert.equal(r.settings.voce.community, 'ciurma');
  assert.deepEqual(r.settings.voce.momenti, { saluto: { modo: 'mie' } }, 'le frasi gia\' scelte restano');
  assert.equal(r.settings.preferenze.lingua, 'en');
  const vuote = D.impostazioniDaDomande(prima, { tono: 'cattivo', lingua: 'de' }, strumenti);
  assert.equal(vuote.settings.tono, 'serio', 'una risposta che non c\'e\' nell\'elenco non tocca niente');
  assert.equal(vuote.settings.preferenze, undefined);
});
