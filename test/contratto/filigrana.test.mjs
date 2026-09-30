// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LA FIRMA IN OGNI PAGINA.
// Ogni pagina che il sito serve porta la proprieta' in tre modi: il meta
// «copyright», il commento con la proprieta' per esteso, e la firma invisibile
// a larghezza zero. Le pagine scritte come file ce l'hanno dentro; quelle che il
// server compone al momento (la pagina link di ognuno, le guide, la 404) la
// ricevono uscendo, da un passaggio solo montato prima di ogni rotta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const W = await import('../../src/watermark.js');
const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');

const treStrati = (html, chi) => {
  assert.match(html, /<meta\s+name="copyright"\s+content="© 2024–2026 Andrea Taliento \(ANDRYXify\)/, `${chi}: il meta copyright`);
  assert.ok(html.includes(W.FIRMA) && html.includes('Andrea Taliento'), `${chi}: la proprieta' per esteso`);
  assert.ok(W.leggiZeroWidth(html).includes(W.FIRMA), `${chi}: la firma invisibile, che si rilegge`);
};

const PAGINA = '<!doctype html>\n<html lang="it">\n<head>\n<meta charset="utf-8">\n<title>x</title>\n</head>\n<body>\n<p>ciao</p>\n</body>\n</html>';

test('una pagina passata dalla firma ha i tre strati, e passata due volte non li raddoppia', () => {
  const una = W.iniettaHtml(PAGINA);
  treStrati(una, 'pagina');
  assert.equal(W.iniettaHtml(una), una, 'la seconda volta non cambia niente');
  assert.ok(una.startsWith('<!doctype html>'), 'il doctype resta il primo: senza, il browser va in modalita\' quirks');
  assert.equal((una.match(/name="copyright"/g) || []).length, 1);
  assert.ok(!/style="display:none"/.test(una.slice(PAGINA.length - 20)), 'nascosta con hidden, senza uno stile scritto nel tag');
  assert.equal(W.iniettaHtml('{"a":1}'), '{"a":1}', 'quello che non e\' una pagina resta com\'e\'');
});

test('ogni pagina che esce da res.send riceve la firma; JSON e file passano come sono', () => {
  const prova = (tipo, corpo) => {
    let uscito;
    const res = { get: (h) => (h === 'Content-Type' ? tipo : undefined), send: (c) => { uscito = c; return 'ok'; } };
    W.firmaLePagine({}, res, () => {});
    assert.equal(res.send(corpo), 'ok');
    return uscito;
  };
  treStrati(prova('text/html; charset=utf-8', PAGINA), 'una pagina con il tipo');
  treStrati(prova(undefined, PAGINA), 'una pagina senza tipo, che Express fara\' html');
  assert.equal(prova('application/json', '{"x":"</body>"}'), '{"x":"</body>"}');
  const b = Buffer.from(PAGINA);
  assert.equal(prova('text/html', b), b, 'un file letto come Buffer non si tocca');
});

test('il server monta la firma prima di ogni rotta', () => {
  const S = leggi('src/web/server.js');
  const monta = S.indexOf('app.use(filigrana.firmaLePagine)');
  assert.ok(monta > 0, 'il passaggio e\' montato');
  const prima = S.search(/\n\s*app\.(get|post|put|delete|all)\(/);
  assert.ok(monta < prima, 'e prima della prima rotta: una rotta montata prima uscirebbe senza firma');
});

test('ogni pagina scritta come file ha i tre strati', () => {
  const cartella = new URL('../../src/web/public/', import.meta.url);
  const pagine = readdirSync(cartella).filter((n) => n.endsWith('.html'));
  assert.ok(pagine.length >= 15, `pagine: ${pagine.length}`);
  for (const n of pagine) treStrati(leggi('src/web/public/' + n), n);
});

test('le pagine di servizio, composte o scritte per Caddy, hanno i tre strati', async () => {
  const P = await import('../../src/web/pagine-servizio.js');
  treStrati(P.paginaManutenzione(), 'manutenzione');
  treStrati(leggi('pagine-servizio/manutenzione.html'), 'il file della manutenzione servito da Caddy');
});
