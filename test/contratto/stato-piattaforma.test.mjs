// LA SCHEDA STATO DICE IL VERO PER LA PIATTAFORMA DEL CANALE.
//
// I permessi Twitch esistono solo per un canale Twitch: a un canale Kick,
// YouTube o Discord la carta «Attiva il bot» e la riga «Permessi:» mostravano
// un problema che non c'era, con un tasto che portava a Twitch e tornava con
// un errore. E il badge «in chat adesso» guardava la chat di Twitch per tutti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync('src/web/public/app.js', 'utf8');
const SRV = readFileSync('src/web/server.js', 'utf8');

const funzione = (testo, nome) => {
  const i = testo.search(new RegExp(`(async )?function ${nome}\\(`));
  assert.ok(i >= 0, `c'e' ${nome}`);
  return testo.slice(i, testo.indexOf('\n}\n', i));
};
const S = funzione(APP, 'pannelloStato');

test('carta e riga dei permessi solo per un canale Twitch', () => {
  assert.match(S, /const suTwitch = \(stato\.piattaforma \|\| 'twitch'\) === 'twitch';/);
  assert.match(S, /const cardPermessi = \(!proprietario \|\| !suTwitch \|\| stato\.permessiOk\) \? '' :/, 'la carta «Attiva il bot»');
  assert.match(S, /\$\{!suTwitch \? '' : proprietario \? `\n\s*<p class="spazio-sopra"><strong class="primo-piano">\$\{L\('Permessi:'/, 'la riga «Permessi:» e quella del moderatore');
});

test('il badge «in chat adesso» lo dice il server, per la piattaforma del canale', () => {
  assert.match(S, /const inChat = typeof stato\.inChat === 'boolean' \? stato\.inChat : null;/);
  assert.ok(!S.includes('connessi.includes(login)'), 'non piu\' la chat di Twitch per tutti');
  assert.match(S, /\$\{inChat === null \? '' : inChat/, 'dove una chat non c\'e\' (Discord), il badge non c\'e\'');
  assert.match(SRV, /inChat: manager\.inChat \? manager\.inChat\(user\.login\) : null,/);
});

test('la carta dei permessi dice quanti ne chiede davvero', () => {
  const c = S.slice(S.indexOf('const cardPermessi'), S.indexOf('const chatKO'));
  assert.ok(!c.includes('Nient\\\'altro'), 'i permessi sono uno per funzione, non «clip, follow e sub»');
  assert.ok(c.includes('un permesso per ogni funzione'));
});

// «LE TUE PIATTAFORME» E TWITCH. Un canale nato su Kick, YouTube o Discord non
// puo' aggiungere Twitch: i permessi si danno con l'account del canale, e Twitch
// risponde con un altro. La riga diceva «da sistemare», con un «Sistema» che
// tornava con un errore; e tre testi promettevano «collega Twitch: il canale
// resta uno solo».
test('la riga di Twitch dice il vero a un canale di un\'altra piattaforma', () => {
  const i = SRV.indexOf("app.get('/api/streamer/piattaforme'");
  const r = SRV.slice(i, SRV.indexOf('// Kick', i));
  assert.match(r, /const suTwitch = piattaformaDi\(login\) === 'twitch';/);
  assert.match(r, /collegato: suTwitch,/, 'collegata solo a un canale Twitch');
  assert.match(r, /daRifare: suTwitch && /, 'niente «da sistemare» che non si puo\' sistemare');
  assert.match(r, /azione: suTwitch \? '\/auth\/permessi' : '',/, 'e nessun tasto che porta all\'errore');
  assert.match(r, /canaleAParte: !suTwitch,/);
  const riga = funzione(APP, 'rigaPiattaforma');
  assert.ok(riga.includes("(p.azione ? `<a class=\"btn secondario mini\" href=\"${esc(p.azione)}\">"), 'senza azione niente «Collega»');
  assert.ok(riga.includes('p.canaleAParte ?') && riga.includes('_notaCanaleAParte()'), 'e la nota dice come fare');
});

test('nessun testo promette di collegare Twitch a un canale di un\'altra piattaforma', () => {
  for (const frase of ['collega quell’account qui sotto', 'collega quell’account: il canale diventa uno solo', 'Collega le piattaforme dove trasmetti: il canale resta uno solo']) {
    assert.ok(!APP.includes(frase), `«${frase}» non e' vero per un canale Kick`);
  }
  assert.ok(funzione(APP, 'cardKickHtml').includes('entra con il tuo account Twitch: è un canale a sé'));
  assert.ok(funzione(APP, 'paginaSoloTwitch').includes('entra con il tuo account Twitch: è un canale a sé'));
});

test('tornando da Twitch con un altro account il pannello lo dice', () => {
  assert.match(SRV, /if \(v\.login !== u\.login\) return res\.redirect\('\/\?errore=account-diverso'\);/, 'il server rimanda qui');
  const f = funzione(APP, 'esitoPermessiDaIndirizzo');
  assert.ok(f.includes("get('errore') !== 'account-diverso'"));
  assert.ok(f.includes('I permessi non sono passati') && f.includes("location.href = '/auth/permessi'"), 'a un canale Twitch: cosa e\' successo, e riprova');
  assert.ok(f.includes('_notaCanaleAParte()'), 'agli altri: perche\' Twitch non si aggiunge');
  assert.match(APP, /esitoAcquistoDaIndirizzo\(\);\n {2}esitoPermessiDaIndirizzo\(\);/, 'e si guarda all\'apertura');
});
