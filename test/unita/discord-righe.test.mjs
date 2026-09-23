// LE RIGHE DELLA PRIMA SCHERMATA: i difetti che non devono esistere.
//
// Il ragionamento sta in docs/DISCORD-INGRESSO.md («Le righe della prima
// schermata»). Qui le cose che devono restare vere:
//  · ogni canale che una traccia del catalogo puo' mettere in mostra ha la sua
//    riga, dal nome, e la porta di partenza nasce con le righe scritte;
//  · la riga parla la lingua del nome, e le parole neutre quella di chi scrive;
//  · vince la parola che dice di piu', e quelle della piattaforma contano solo
//    da sole;
//  · se non si sa, non si inventa;
//  · le righe della prova del pannello sono le stesse del server.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rigaPer, RIGHE, MAX_RIGA } from '../../src/features/discord-righe.js';
import { CATALOGO, portaPronta } from '../../src/features/discord-catalogo.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

// I canali che una porta puo' mettere in mostra: di testo, annunci, forum o
// media, e che tutti vedono.
const nascosto = (p) => (p || []).some((r) => String(r?.chi?.ruolo || r?.chi || '') === 'tutti' && (r?.nega || []).includes('vedere'));
const inMostra = (t) => (t.categorie || []).filter((c) => !nascosto(c.permessi))
  .flatMap((c) => (c.canali || []).filter((x) => ['testo', 'annunci', 'forum', 'media'].includes(x.tipo || 'testo') && !nascosto(x.permessi)));

test('ogni canale che il catalogo puo\' mettere in mostra ha la sua riga, dal nome', () => {
  let visti = 0;
  for (const t of CATALOGO) {
    for (const c of inMostra(t)) {
      visti++;
      const r = rigaPer(c, 'it');
      assert.ok(r, `${t.id}: #${c.nome} senza riga`);
      assert.ok(r.emoji, `${t.id}: #${c.nome} ha preso la riga dall'argomento, non dal nome`);
      assert.equal(r.lingua, 'it', `${t.id}: #${c.nome} e' un nome italiano`);
    }
  }
  assert.ok(visti >= 15, 'le tracce del catalogo hanno i loro canali');
});

test('la porta di partenza nasce con le righe scritte, in tutte le tracce', () => {
  for (const t of CATALOGO) {
    const righe = t.ingresso?.benvenuto?.canali || [];
    assert.ok(righe.length, `${t.id}: la prima schermata non mette niente in mostra`);
    for (const r of righe) {
      assert.ok(r.testo, `${t.id}: #${r.canale} senza descrizione`);
      assert.ok(r.emoji, `${t.id}: #${r.canale} senza faccina`);
    }
  }
});

test('ogni riga sta su una riga: sotto i 42 caratteri, in tutte e tre le lingue', () => {
  for (const v of RIGHE) {
    for (const l of ['it', 'en', 'es']) {
      assert.ok(v.testo[l] && v.testo[l].length <= 42, `«${v.testo[l]}» (${l}) e' lunga ${v.testo[l]?.length}`);
      assert.ok(v.testo[l].length <= MAX_RIGA);
    }
    assert.ok(v.faccina, 'ogni voce ha la sua faccina');
  }
});

test('la riga parla la lingua del nome, e le parole neutre quella di chi scrive', () => {
  assert.deepEqual([rigaPer('regole', 'en').lingua, rigaPer('rules', 'it').lingua, rigaPer('reglas', 'it').lingua], ['it', 'en', 'es']);
  assert.equal(rigaPer('rules', 'it').testo, 'Read these before you post.');
  assert.equal(rigaPer('reportes', 'it').lingua, 'es', 'fra «report» e «reporte» vince la parola piu\' lunga');
  assert.equal(rigaPer('presentaciones', 'it').lingua, 'es');
  assert.equal(rigaPer('supporto', 'en').lingua, 'it', '«supporto» e\' italiano anche se comincia come «support»');
  for (const lingua of ['it', 'en', 'es']) {
    assert.equal(rigaPer('general', lingua).lingua, lingua, '«general» e\' inglese e spagnolo: decide chi scrive');
    assert.equal(rigaPer('meme', lingua).lingua, lingua);
  }
});

test('vince la parola che dice di piu\', e quelle della piattaforma contano solo da sole', () => {
  const chat = rigaPer('generale', 'it').testo;
  const clip = rigaPer('clip', 'it').testo;
  const avviso = rigaPer('sono-in-onda', 'it').testo;
  assert.equal(rigaPer('clip-e-schermate', 'it').testo, 'Clip e schermate delle vostre partite.');
  assert.equal(rigaPer('chat-generale', 'it').testo, chat);
  assert.equal(rigaPer('live-chat', 'it').testo, chat, '«live-chat» e\' una chat');
  assert.equal(rigaPer('twitch-clips', 'it').testo, clip, '«twitch-clips» e\' un canale di clip');
  assert.equal(rigaPer('annunci-twitch', 'it').testo, rigaPer('annunci', 'it').testo);
  assert.equal(rigaPer('live', 'it').testo, avviso, '«live» da solo e\' l\'avviso della diretta');
  assert.equal(rigaPer('\u{1F4E2}│Annunci', 'it').testo, rigaPer('annunci', 'it').testo, 'le decorazioni del nome non contano');
  assert.equal(rigaPer('sregolati', 'it'), null, 'una parola vale dall\'inizio di un pezzo del nome');
});

test('se non si sa, non si inventa: prima il tipo, poi l\'argomento, poi niente', () => {
  assert.equal(rigaPer({ nome: 'taverna', tipo: 'forum' }, 'it').testo, 'Le discussioni, un argomento alla volta.');
  assert.equal(rigaPer({ nome: 'taverna', tipo: 'annunci' }, 'it').testo, rigaPer('annunci', 'it').testo);
  const arg = rigaPer({ nome: 'taverna', argomento: 'Qui si beve. Tutto il resto viene dopo, e dopo ancora.' }, 'it');
  assert.deepEqual([arg.testo, arg.emoji], ['Qui si beve.', ''], 'la prima frase dell\'argomento, e nessuna faccina inventata');
  assert.equal(rigaPer({ nome: 'taverna', argomento: 'x'.repeat(MAX_RIGA + 1) }, 'it'), null, 'un argomento lungo non si taglia a meta\'');
  assert.equal(rigaPer('taverna', 'it'), null);
});

test('la porta di partenza scritta per chi usa il pannello in un\'altra lingua', () => {
  const preset = { categorie: [{ nome: 'Start', canali: [{ nome: 'rules' }, { nome: 'general' }] }] };
  const en = portaPronta(preset, { lingua: 'en' });
  assert.equal(en.benvenuto.testo, 'Start here. Below you’ll find what goes where.');
  assert.equal(en.domande[0].titolo, 'What do you feel like talking about?');
  assert.deepEqual(en.benvenuto.canali.map((c) => c.testo), ['Read these before you post.', 'Chat with everyone.']);
  const it = portaPronta(preset, {});
  assert.equal(it.benvenuto.canali[1].testo, 'Due chiacchiere con tutti.', '«general» nel pannello italiano');
});

test('le righe della prova del pannello sono le stesse del server', () => {
  const i = APP.indexOf('const _DEMO_RIGHE = {');
  assert.ok(i >= 0, 'la prova del pannello non ha le sue righe');
  const j = APP.indexOf('\n};', i);
  // eslint-disable-next-line no-new-func
  const demo = new Function(`return ${APP.slice(i + 'const _DEMO_RIGHE = '.length, j + 2)}`)();
  for (const [nome, [emoji, testo]] of Object.entries(demo)) {
    const r = rigaPer(nome, 'it');
    assert.deepEqual([emoji, testo], [r.emoji, r.testo], `#${nome}: la prova scrive un'altra riga`);
  }
  for (const t of CATALOGO) {
    for (const c of inMostra(t)) assert.ok(demo[c.nome], `#${c.nome} manca nelle righe della prova`);
  }
});
