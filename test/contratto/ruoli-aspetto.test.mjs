// L'ASPETTO DEI RUOLI, dal modello alla pagina pubblica.
//
// Una cosa fatta a metà è una cosa che il modello sa fare e nessuno trova: il
// comando non c'è nel pannello, la traccia non lo propone, la vetrina non lo
// racconta. Qui si controlla che i pezzi ci siano tutti e che dicano la stessa
// cosa — non COME sono scritti, che cambia, ma che ci siano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CATALOGO } from '../../src/features/discord-catalogo.js';
import { CON_SEGNO, CON_TINTE } from '../../src/features/discord-preset.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const VISTA = leggi('src/web/vetrina-vista.js');

test('il pannello ha i comandi per tutte e due le cose, e li spegne dove non si può', () => {
  for (const q of ['r-modo', 'r-segno', 'r-emoji', 'r-icona', 'r-sfuma', 'r-colore']) {
    assert.ok(APP.includes(`data-dcs="${q}"`), `manca il comando «${q}»`);
  }
  // Spenti con la ragione scritta: un comando che c'è e viene rifiutato da
  // Discord è peggio di un comando che non c'è.
  assert.match(APP, /_dcs\?\.aspetto \|\| \{ segni: false, tinte: false \}/, 'il pannello guarda cosa sa fare il server');
  assert.match(APP, /a\.tinte \? '' : ' disabled'/);
  assert.match(APP, /a\.segni \? '' : ' disabled'/);
});

test('e il server gli dice cosa questo server sa fare, con i nomi di Discord', () => {
  assert.match(SRV, /segni: car\.includes\(dcCatalogo\.CON_SEGNO\), tinte: car\.includes\(dcCatalogo\.CON_TINTE\)/);
  assert.equal(CON_SEGNO, 'ROLE_ICONS');
  assert.equal(CON_TINTE, 'ENHANCED_ROLE_COLORS');
});

test('l’immagine entra solo dalla richiesta di costruire, e solo nei formati che Discord prende', () => {
  assert.match(SRV, /const immagini = immaginiRuoli\(req\.body\?\.immagini\);/);
  assert.match(SRV, /data:image\\\/\(png\|jpeg\|gif\);base64,/, 'niente webp: Discord non lo prende');
  // L'anteprima deve vedere le stesse immagini del fare: se no mostra una cosa
  // e ne succede un'altra.
  assert.equal((SRV.match(/anteprima\(token, guild, preset, \{ togliere: true, immagini \}\)/g) || []).length, 1);
  // E nella traccia che si salva i byte non ci arrivano.
  assert.ok(!/immagini/.test(SRV.slice(SRV.indexOf("app.post('/api/streamer/dcserver'"), SRV.indexOf("app.post('/api/streamer/dcserver'") + 600)),
    'la porta che salva la traccia non sa niente delle immagini');
});

test('il pannello non tiene i byte: li manda e li butta', () => {
  assert.match(APP, /let _dcsIcone = \{\};/);
  assert.match(APP, /corpo\.immagini = \{ \.\.\._dcsIcone \};/);
  assert.match(APP, /_dcsIcone = \{\};/, 'dopo aver costruito non resta niente');
  // E quello che resta e' l'impronta: e' quello che serve per non rimandarla.
  assert.match(APP, /r\.segno = \{ tipo: 'immagine', emoji: '', icona: x\.icona \};/);
});

test('l’immagine si sistema prima di partire, invece di essere rifiutata dopo', () => {
  assert.match(APP, /tela\.toDataURL\('image\/png'\)/, 'qualunque cosa scelga, parte in png');
  assert.match(APP, /accept="image\/png,image\/jpeg,image\/gif"/);
});

test('le tracce propongono un segno, se no la novità la trova solo chi la cerca', () => {
  const conSegno = CATALOGO.flatMap((t) => t.ruoli || []).filter((r) => r.segno?.tipo === 'emoji' && r.segno.emoji);
  assert.ok(conSegno.length >= 4, `ruoli con un segno nelle tracce: ${conSegno.length}`);
  // E nessuno ne ha due: sul modello è impossibile, qui si controlla che le
  // tracce scritte a mano non ci abbiano provato lo stesso.
  for (const r of CATALOGO.flatMap((t) => t.ruoli || [])) {
    if (r.segno?.tipo === 'emoji') assert.ok(!r.segno.icona, `«${r.nome}» ha due segni`);
  }
});

test('l’anteprima dice cosa cambia dell’aspetto, e cosa il server non sa fare', () => {
  assert.match(APP, /x\.segno !== undefined \?/, 'un ruolo a cui cambia solo il segno non può comparire senza niente scritto');
  assert.match(APP, /\(d\.manca \|\| \[\]\)\.length/);
  assert.match(SRV, /manca: a\.manca \|\| \[\],/);
});

test('e la pagina pubblica lo racconta', () => {
  assert.match(VISTA, /scheda: 'dcserver'/, 'la scheda dei ruoli è in vetrina');
  const dettaglio = /olografic|sfumatur|gradient|degradado/i.test(VISTA);
  assert.ok(dettaglio, 'quello che si può fare adesso non si vede da fuori: va scritto in vetrina-vista.js');
});
