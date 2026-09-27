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
