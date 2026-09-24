// LE PAGINE PUBBLICHE DI UN CANALE VALGONO PER OGNI PIATTAFORMA. Un canale di
// Kick, di YouTube o solo di Discord ha un login col prefisso (kick.nome,
// yt.nome, dc.nome): la pagina link, la pagina delle donazioni, le loro
// informative, le anteprime, i ritorni dei pagamenti e l'avviso di Ko-fi
// rispondevano 404 a quei nomi, perche' ogni rotta si era scritta la sua
// regola con i soli nomi di Twitch. La regola e' una, LOGIN_RE di identita.js,
// e qui si controlla che nessuna rotta se ne scriva un'altra.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eLoginNostro, LOGIN_RE } from '../../src/identita.js';

const SERVER = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');

test('i canali di ogni piattaforma sono nomi nostri, e i percorsi strani no', () => {
  for (const x of ['andryxify', 'kick.nome', 'yt.nome_1', 'dc.nome']) assert.ok(eLoginNostro(x), x);
  for (const x of ['..', 'kick..nome', 'a.b', 'kick.', 'nome/x', '']) assert.ok(!eLoginNostro(x), x);
});

test('nessuna rotta controlla un canale con una regola sua', () => {
  const proprie = [...SERVER.matchAll(/\/\^\[a-z0-9_\]\{\d+,\d+\}\$\/\.test\((login|user|canale)\)/g)].map((m) => m[0]);
  assert.deepEqual(proprie, [], 'un canale si controlla con eLoginNostro');
  const inVia = [...SERVER.matchAll(/\/\^\\\/\(\[a-z0-9_\]\{1,30\}\)/g)].map((m) => m[0]);
  assert.deepEqual(inVia, [], 'un canale in un indirizzo corto si legge con la stessa regola');
  assert.ok(SERVER.includes("const CANALE_IN_VIA = LOGIN_RE.source.replace(/^\\^|\\$$/g, '');"));
});

test('gli indirizzi corti riconoscono i canali di ogni piattaforma', () => {
  const via = LOGIN_RE.source.replace(/^\^|\$$/g, '');
  const dona = new RegExp(`^/(${via})(/privacy)?/?$`, 'i');
  assert.deepEqual(dona.exec('/kick.nome')?.slice(1), ['kick.nome', undefined]);
  assert.deepEqual(dona.exec('/yt.nome/privacy')?.slice(1), ['yt.nome', '/privacy']);
  assert.equal(dona.exec('/../privacy'), null);
});

// E LA FOTO. La pagina link e la sua anteprima mostrano la foto dello
// streamer: di chi entra con Twitch la dava Helix, di chi entra con Kick,
// YouTube o Discord nessuno, e l'anteprima di quei canali usciva senza faccia.
// La foto la dice la piattaforma al login; il server la scarica per ripassarla,
// quindi si tiene solo un indirizzo delle piattaforme.
test('la foto di chi entra con Kick, YouTube o Discord arriva dal login, e solo dalle piattaforme', async () => {
  const risposta = (dati) => async () => ({ ok: true, status: 200, text: async () => JSON.stringify(dati) });
  const kick = await import('../../src/kick/api.js');
  const k = await kick.chiSono('t', { fetchImpl: risposta({ data: [{ user_id: 7, name: 'pippo', profile_picture: 'https://files.kick.com/images/user/7/profile_image/x.webp' }] }) });
  assert.equal(k.foto, 'https://files.kick.com/images/user/7/profile_image/x.webp');
  const yt = await import('../../src/youtube/api.js');
  const y = await yt.chiSono('t', { fetchImpl: risposta({ items: [{ id: 'UC1', snippet: { title: 'P', customUrl: '@p', thumbnails: { high: { url: 'https://yt3.ggpht.com/abc=s800' } } } }] }) });
  assert.equal(y.foto, 'https://yt3.ggpht.com/abc=s800');
  const DC = readFileSync(new URL('../../src/features/discord-api.js', import.meta.url), 'utf8');
  assert.ok(DC.includes('https://cdn.discordapp.com/avatars/${id}/${me.avatar}.png?size=256'), 'Discord: dall\'hash del suo avatar');
  for (const [cosa, via] of [['kick', 'src/kick/rotte.js'], ['youtube', 'src/youtube/rotte.js']]) {
    assert.ok(readFileSync(new URL(`../../${via}`, import.meta.url), 'utf8').includes('foto: io.foto'), `${cosa}: la rotta passa la foto`);
  }
  assert.equal((SERVER.match(/fotoDallaPiattaforma\(login, foto\);/g) || []).length, 3, 'Kick, YouTube e Discord la salvano entrando');
  const re = new RegExp(/const FOTO_DELLE_PIATTAFORME = (\/.*\/i);/.exec(SERVER)[1].slice(1, -2), 'i');
  for (const buona of ['https://static-cdn.jtvnw.net/a.png', 'https://files.kick.com/x.webp', 'https://yt3.ggpht.com/a', 'https://yt3.googleusercontent.com/a', 'https://cdn.discordapp.com/avatars/1/a.png']) assert.ok(re.test(buona), buona);
  for (const cattiva of ['http://files.kick.com/x', 'https://kick.com.evil.io/x', 'https://evil.io/kick.com/x', 'https://169.254.169.254/latest', 'javascript:alert(1)']) assert.ok(!re.test(cattiva), cattiva);
  assert.ok(SERVER.includes("if (piattaformaDi(l) !== 'twitch') return s.avatar || '';"), 'a Helix si chiede solo di Twitch');
});
