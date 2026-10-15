// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I DISPOSITIVI DELLO STUDIO (docs/DIRETTA.md, «Più dispositivi, una regia»).
// Il salotto dei segnali: chi parla con chi, quanto vale un invito, cosa
// succede a una chiave tolta, e che una regia in diretta non si ruba.
import test from 'node:test';
import assert from 'node:assert/strict';
import { creaSalotto, credenzialiTurn, improntaChiave, LIMITI_DISPOSITIVI, STUN_PUBBLICI } from '../../src/features/studio-dispositivi.js';

function archivioFinto() {
  const righe = new Map();
  const k = (l, id) => l + '/' + id;
  return {
    righe,
    elenco: (l) => [...righe.values()].filter((r) => r.login === l).map((r) => ({ ...r })),
    trova: (l, id) => { const r = righe.get(k(l, id)); return r ? { ...r } : null; },
    salva: (l, r) => righe.set(k(l, r.id), { ...r, login: l }),
    aggiorna: (l, id, c) => { const r = righe.get(k(l, id)); if (r) Object.assign(r, c); },
    visto: (l, id, t) => { const r = righe.get(k(l, id)); if (r) r.visto = t; },
    togli: (l, id) => righe.delete(k(l, id)),
  };
}

function banco() {
  let t = 1_000_000;
  const archivio = archivioFinto();
  const s = creaSalotto({ archivio, ora: () => t });
  const orecchio = () => { const sentito = []; const f = (ev, d) => sentito.push([ev, d]); f.sentito = sentito; return f; };
  return { s, archivio, avanza: (ms) => { t += ms; }, orecchio, ora: () => t };
}

test('un invito vale una volta e per dieci minuti; il codice di sei cifre fa lo stesso', () => {
  const { s, avanza } = banco();
  const i = s.invita('Andrea');
  assert.match(i.codice, /^\d{6}$/);
  assert.equal(s.invito(i.token).login, 'andrea');
  const d = s.entra({ token: i.token, nome: 'iPhone' });
  assert.ok(d.ok && d.login === 'andrea' && /^[a-z0-9]{10}$/.test(d.id) && d.chiave.length >= 30);
  assert.equal(s.entra({ token: i.token, nome: 'Altro' }).motivo, 'invito', 'una volta sola');
  const j = s.invita('andrea');
  assert.ok(s.entra({ codice: j.codice }).ok, 'col codice');
  const k = s.invita('andrea');
  avanza(LIMITI_DISPOSITIVI.invitoMs + 1);
  assert.equal(s.entra({ token: k.token }).motivo, 'invito', 'scaduto');
  assert.equal(s.entra({ codice: 'abc' }).motivo, 'invito');
});

test('la chiave non si conserva: se ne tiene l\'impronta, e solo la chiave giusta riconosce il dispositivo', () => {
  const { s, archivio } = banco();
  const d = s.entra({ token: s.invita('andrea').token, nome: 'Telefono' });
  const riga = archivio.trova('andrea', d.id);
  assert.equal(riga.impronta, improntaChiave(d.chiave));
  assert.ok(!JSON.stringify(riga).includes(d.chiave), 'la chiave non e\' nell\'archivio');
  assert.ok(s.riconosci('andrea', d.id, d.chiave));
  assert.equal(s.riconosci('andrea', d.id, d.chiave + 'x'), null);
  assert.equal(s.riconosci('altro', d.id, d.chiave), null, 'non vale per un altro canale');
  assert.equal(s.riconosci('andrea', '../x', d.chiave), null);
});

test('il telefono dello streamer entrato col suo account comanda; chi entra col QR solo inquadra, finche\' la regia non decide', () => {
  const { s } = banco();
  const mio = s.entra({ login: 'andrea', nome: 'Il mio' });
  const amico = s.entra({ token: s.invita('andrea').token, nome: 'Amico' });
  const el = s.elenco('andrea');
  assert.equal(el.find((r) => r.id === mio.id).comanda, true);
  assert.equal(el.find((r) => r.id === amico.id).comanda, false);
  assert.equal(s.cambia('andrea', amico.id, { comanda: true }).comanda, true);
});

test('i segnali passano solo fra la regia e i dispositivi del suo canale', () => {
  const { s, orecchio } = banco();
  const regiaA = orecchio(), regiaB = orecchio(), telA = orecchio(), telB = orecchio();
  const a = s.entra({ login: 'andrea', nome: 'A' }), b = s.entra({ login: 'bruno', nome: 'B' });
  s.apriRegia('andrea', { id: 'r1', scrivi: regiaA });
  s.apriRegia('bruno', { id: 'r2', scrivi: regiaB });
  assert.ok(s.apriDispositivo('andrea', a.id, telA).ok);
  assert.ok(s.apriDispositivo('bruno', b.id, telB).ok);
  assert.deepEqual(s.dalDispositivo('andrea', a.id, { tipo: 'offerta', dati: { sdp: 'v=0' } }), { ok: true });
  assert.ok(regiaA.sentito.some(([e, d]) => e === 'segnale' && d.da === a.id && d.dati.sdp === 'v=0'));
  assert.ok(!regiaB.sentito.some(([e]) => e === 'segnale'), 'l\'altro canale non sente niente');
  assert.equal(s.dallaRegia('andrea', 'r1', { a: b.id, tipo: 'risposta', dati: {} }).motivo, 'scollegato', 'la regia di A non parla al telefono di B');
  assert.equal(s.dallaRegia('bruno', 'r1', { a: b.id, tipo: 'risposta', dati: {} }).motivo, 'non-regia');
  assert.equal(s.dalDispositivo('andrea', b.id, { tipo: 'offerta', dati: {} }).motivo, 'scollegato');
  assert.ok(s.dallaRegia('andrea', 'r1', { a: a.id, tipo: 'risposta', dati: { sdp: 'x' } }).ok);
  assert.ok(telA.sentito.some(([e, d]) => e === 'segnale' && d.tipo === 'risposta'));
  assert.ok(!telB.sentito.some(([e]) => e === 'segnale'));
});

test('messaggi strani o troppo grandi non passano', () => {
  const { s, orecchio } = banco();
  const r = orecchio(), t = orecchio(), d = s.entra({ login: 'andrea' });
  s.apriRegia('andrea', { id: 'r1', scrivi: r }); s.apriDispositivo('andrea', d.id, t);
  assert.equal(s.dalDispositivo('andrea', d.id, { tipo: 'comanda-tutto', dati: {} }).motivo, 'messaggio');
  assert.equal(s.dalDispositivo('andrea', d.id, { tipo: 'offerta', dati: 'x'.repeat(LIMITI_DISPOSITIVI.segnaleByte + 10) }).motivo, 'messaggio');
  assert.equal(s.dallaRegia('andrea', 'r1', { a: d.id, tipo: 'offerta', dati: {} }).motivo, 'messaggio', 'la regia risponde, non offre');
  let ok = 0;
  for (let i = 0; i < LIMITI_DISPOSITIVI.messaggiMinuto + 5; i++) if (s.dalDispositivo('andrea', d.id, { tipo: 'ice', dati: {} }).ok) ok++;
  assert.equal(ok, LIMITI_DISPOSITIVI.messaggiMinuto, 'chi manda troppo in un minuto si ferma');
});

test('una regia in diretta non si ruba; una regia ferma passa all\'ultima finestra, e la vecchia lo sa', () => {
  const { s, orecchio } = banco();
  const r1 = orecchio(), r2 = orecchio(), r3 = orecchio();
  assert.ok(s.apriRegia('andrea', { id: 'r1', scrivi: r1 }).ok);
  assert.ok(s.apriRegia('andrea', { id: 'r2', scrivi: r2 }).ok);
  assert.ok(r1.sentito.some(([e]) => e === 'altrove'));
  assert.equal(s.dallaRegia('andrea', 'r1', { a: 'x', tipo: 'ice' }).motivo, 'non-regia', 'la vecchia non comanda piu\'');
  assert.ok(s.statoRegia('andrea', 'r2', { live: true }));
  assert.equal(s.apriRegia('andrea', { id: 'r3', scrivi: r3 }).motivo, 'occupata');
  assert.deepEqual(s.presenza('andrea'), { regia: true, live: true, collegati: 0 });
  assert.equal(s.chiudiRegia('andrea', 'r1'), false, 'chi non e\' la regia non la chiude');
  assert.ok(s.chiudiRegia('andrea', 'r2'));
  assert.ok(s.apriRegia('andrea', { id: 'r3', scrivi: r3 }).ok);
});

test('collegati insieme al massimo 4; lo stesso dispositivo da un\'altra scheda prende il posto della prima', () => {
  const { s, orecchio } = banco();
  const disp = Array.from({ length: 5 }, (_, i) => s.entra({ login: 'andrea', nome: 'T' + i }));
  const orecchie = disp.map(() => orecchio());
  for (let i = 0; i < 4; i++) assert.ok(s.apriDispositivo('andrea', disp[i].id, orecchie[i]).ok);
  assert.equal(s.apriDispositivo('andrea', disp[4].id, orecchie[4]).motivo, 'troppi');
  const nuovaScheda = orecchio();
  assert.ok(s.apriDispositivo('andrea', disp[0].id, nuovaScheda).ok, 'la stessa fotocamera non conta due volte');
  assert.ok(orecchie[0].sentito.some(([e]) => e === 'altrove'), 'la scheda vecchia sa che e\' passata altrove');
  assert.equal(s.presenza('andrea').collegati, 4);
  assert.equal(s.chiudiDispositivo('andrea', disp[0].id, orecchie[0]), false, 'la scheda vecchia che si chiude non stacca la nuova');
  assert.equal(s.presenza('andrea').collegati, 4);
  assert.ok(s.chiudiDispositivo('andrea', disp[1].id, orecchie[1]));
  assert.ok(s.apriDispositivo('andrea', disp[4].id, orecchie[4]).ok, 'liberato un posto, il quinto entra');
});

test('il nono dispositivo prende il posto di quello visto meno di recente e non collegato', () => {
  const { s, avanza, orecchio } = banco();
  const tutti = [];
  for (let i = 0; i < LIMITI_DISPOSITIVI.ricordati; i++) { tutti.push(s.entra({ login: 'andrea', nome: 'T' + i })); avanza(1000); }
  s.apriDispositivo('andrea', tutti[0].id, orecchio());
  const nono = s.entra({ login: 'andrea', nome: 'Nono' });
  assert.ok(nono.ok);
  const ids = s.elenco('andrea').map((r) => r.id);
  assert.equal(ids.length, LIMITI_DISPOSITIVI.ricordati);
  assert.ok(ids.includes(tutti[0].id), 'il collegato resta, anche se e\' il piu\' vecchio');
  assert.ok(!ids.includes(tutti[1].id), 'esce il meno recente fra i non collegati');
});

test('la regia sa chi c\'e\': chi entra, chi esce, chi c\'era gia\' quando arriva', () => {
  const { s, orecchio } = banco();
  const d1 = s.entra({ login: 'andrea', nome: 'Uno' }), d2 = s.entra({ login: 'andrea', nome: 'Due' });
  const t1 = orecchio(), t2 = orecchio(), r = orecchio();
  assert.equal(s.apriDispositivo('andrea', d1.id, t1).regia, false, 'senza regia il telefono lo sa');
  s.apriRegia('andrea', { id: 'r1', scrivi: r });
  assert.ok(r.sentito.some(([e, d]) => e === 'presenza' && d.id === d1.id && d.collegato), 'chi c\'era gia\'');
  assert.ok(t1.sentito.some(([e, d]) => e === 'regia' && d.c), 'e il telefono sa che la regia e\' arrivata');
  s.apriDispositivo('andrea', d2.id, t2);
  assert.ok(r.sentito.some(([e, d]) => e === 'presenza' && d.id === d2.id && d.collegato && d.nome === 'Due'));
  assert.ok(s.chiudiDispositivo('andrea', d2.id, t2));
  assert.ok(r.sentito.some(([e, d]) => e === 'presenza' && d.id === d2.id && !d.collegato));
  s.chiudiRegia('andrea', 'r1');
  assert.ok(t1.sentito.some(([e, d]) => e === 'regia' && !d.c));
});

test('togliere un dispositivo lo spegne subito: la chiave non vale piu\' e il telefono lo sente', () => {
  const { s, orecchio } = banco();
  const d = s.entra({ login: 'andrea', nome: 'Via' }), t = orecchio(), r = orecchio();
  s.apriRegia('andrea', { id: 'r1', scrivi: r }); s.apriDispositivo('andrea', d.id, t);
  s.togli('andrea', d.id);
  assert.ok(t.sentito.some(([e]) => e === 'tolto'));
  assert.equal(s.riconosci('andrea', d.id, d.chiave), null);
  assert.equal(s.dalDispositivo('andrea', d.id, { tipo: 'ice', dati: {} }).motivo, 'scollegato');
  assert.ok(r.sentito.some(([e, x]) => e === 'presenza' && x.id === d.id && !x.collegato));
});

test('il biglietto per ascoltare vale una volta e un minuto', () => {
  const { s, avanza } = banco();
  const b = s.biglietto('andrea', 'abcdefghij');
  assert.deepEqual(s.usaBiglietto(b), { login: 'andrea', id: 'abcdefghij' });
  assert.equal(s.usaBiglietto(b), null);
  const c = s.biglietto('andrea', 'abcdefghij');
  avanza(LIMITI_DISPOSITIVI.bigliettoMs + 1);
  assert.equal(s.usaBiglietto(c), null);
});

test('il ponte TURN usa credenziali a tempo, mai la parola fissa', () => {
  const c = credenzialiTurn({ url: 'turn:ponte.esempio:3478,turns:ponte.esempio:5349', segreto: 's3greto', ttlS: 3600 }, 'Andrea', 1_000_000_000);
  assert.deepEqual(c.urls, ['turn:ponte.esempio:3478', 'turns:ponte.esempio:5349']);
  assert.equal(c.username, `${1_000_000 + 3600}:andrea`);
  assert.ok(c.credential && c.credential !== 's3greto');
  assert.equal(credenzialiTurn({ url: 'http://x', segreto: 's' }, 'a', 0), null);
  assert.equal(credenzialiTurn(null, 'a', 0), null);
  const { s } = banco();
  assert.deepEqual(s.ice('andrea'), { iceServers: [{ urls: [...STUN_PUBBLICI] }], turn: false });
});

test('cancellare l\'account dimentica tutto: inviti, biglietti, collegamenti', () => {
  const { s, orecchio } = banco();
  const i = s.invita('andrea'), d = s.entra({ login: 'andrea' }), t = orecchio();
  s.apriDispositivo('andrea', d.id, t);
  const b = s.biglietto('andrea', d.id);
  s.dimentica('andrea');
  assert.equal(s.invito(i.token), null);
  assert.equal(s.usaBiglietto(b), null);
  assert.ok(t.sentito.some(([e]) => e === 'tolto'));
  assert.deepEqual(s.presenza('andrea'), { regia: false, live: false, collegati: 0 });
});

test('ogni regia ha il suo giro: la stessa finestra che torna lo tiene, una finestra nuova ne ha uno nuovo e i dispositivi lo sentono', () => {
  const { s, orecchio } = banco();
  const d = s.entra({ token: s.invita('andrea').token });
  const tel = orecchio();
  s.apriDispositivo('andrea', d.id, tel);
  const a = s.apriRegia('andrea', { id: 'finestra0001', scrivi: orecchio() });
  assert.ok(a.ok && a.giro);
  assert.deepEqual(tel.sentito.at(-1), ['regia', { c: true, giro: a.giro }]);
  s.chiudiRegia('andrea', 'finestra0001');
  const b = s.apriRegia('andrea', { id: 'finestra0001', scrivi: orecchio() });
  assert.equal(b.giro, a.giro, 'un buco dei segnali non cambia il giro: il video da pari a pari resta');
  const c = s.apriRegia('andrea', { id: 'finestra0002', scrivi: orecchio() });
  assert.notEqual(c.giro, a.giro, 'una finestra nuova va ricollegata da capo');
  assert.deepEqual(tel.sentito.at(-1), ['regia', { c: true, giro: c.giro }]);
  const tel2 = orecchio();
  assert.equal(s.apriDispositivo('andrea', d.id, tel2).giro, c.giro, 'chi arriva dopo lo sa subito');
  const dopo = creaSalotto({ archivio: archivioFinto() });
  assert.equal(dopo.apriRegia('andrea', { id: 'finestra0002', scrivi: orecchio() }).giro, c.giro, 'anche dopo un riavvio del server (un aggiornamento) la stessa finestra ha lo stesso giro');
  assert.notEqual(dopo.apriRegia('altro', { id: 'finestra0002', scrivi: orecchio() }).giro, c.giro, 'e un altro canale ne ha un altro');
});

test('i codici sbagliati hanno un tetto anche fra mille indirizzi; l\'invito col link passa lo stesso', () => {
  const { s, avanza } = banco();
  const vero = s.invita('andrea');
  const sbagliato = String((Number(vero.codice) + 1) % 1_000_000).padStart(6, '0');
  for (let i = 0; i < LIMITI_DISPOSITIVI.codiciSbagliatiMinuto; i++) assert.equal(s.entra({ codice: sbagliato }).motivo, 'invito');
  assert.equal(s.entra({ codice: vero.codice }).motivo, 'fretta', 'oltre il tetto non si prova neanche quello giusto');
  assert.ok(s.entra({ token: s.invita('andrea').token }).ok, 'il link non e\' un codice: passa');
  avanza(60_001);
  assert.ok(s.entra({ codice: vero.codice }).ok, 'passato il minuto il codice giusto entra');
});

test('anche la regia ha il suo tetto di segnali, uno solo per tutti i dispositivi', () => {
  const { s, orecchio } = banco();
  const d = s.entra({ token: s.invita('andrea').token });
  s.apriDispositivo('andrea', d.id, orecchio());
  s.apriRegia('andrea', { id: 'finestra0001', scrivi: orecchio() });
  let ok = 0;
  for (let i = 0; i < LIMITI_DISPOSITIVI.messaggiRegiaMinuto + 5; i++) if (s.dallaRegia('andrea', 'finestra0001', { a: d.id, tipo: 'ice', dati: { s: 'x', c: {} } }).ok) ok++;
  assert.equal(ok, LIMITI_DISPOSITIVI.messaggiRegiaMinuto);
  assert.equal(s.dallaRegia('andrea', 'finestra0001', { a: d.id, tipo: 'ice', dati: {} }).motivo, 'fretta');
});
