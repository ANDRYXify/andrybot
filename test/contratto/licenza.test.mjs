// QUESTO SOFTWARE GIRA DOVE DICE IL PROPRIETARIO.
//
// Detto prima quello che NON si può fare, perché il resto sarebbe fumo: se
// qualcuno ha il sorgente, non esiste modo di rendere il codice ineseguibile.
// Qualunque controllo si legge e si cancella. Non è un limite di come è scritto
// questo file: è una proprietà del sorgente.
//
// Quello che si può fare, e che qui si difende:
//
//  · NON FORGIABILE. La licenza è firmata con una chiave privata che non sta in
//    nessun repository. Nessuno può FABBRICARSENE una — è matematica, non
//    offuscamento. Può solo togliere il controllo, che è un atto deliberato e
//    dimostrabile;
//  · LEGATA AL POSTO. Nomina il dominio e scade. Copiata altrove non vale;
//  · E SE LA TOLGONO, non ottengono un software pulito. Il nome con cui il bot
//    si presenta esce dalla stessa funzione, e senza licenza quel nome dice di
//    chi è. Non c'è una riga da cancellare: c'è una sorgente da cui il software
//    prende una cosa che gli serve.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { generateKeyPairSync, sign } from 'node:crypto';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');

// Una coppia di chiavi NASCE QUI e muore qui: nessun segreto vero entra in una
// prova, e la prova non dipende dalla chiave del proprietario.
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const PUB = publicKey.export({ type: 'spki', format: 'pem' });
const b64u = (b) => Buffer.from(b).toString('base64url');
const firmaCon = (dati, chiave = privateKey) => {
  const corpo = b64u(JSON.stringify(dati));
  return `${corpo}.${b64u(sign(null, Buffer.from(corpo), chiave))}`;
};

// il modulo vero, con dentro la chiave pubblica di prova
const cartella = mkdtempSync(join(tmpdir(), 'lic-'));
const percorso = join(cartella, 'licenza.mjs');
writeFileSync(percorso, readFileSync(join(RAD, 'src/licenza.js'), 'utf8')
  .replace("export const CHIAVE_PUBBLICA = '';", `export const CHIAVE_PUBBLICA = ${JSON.stringify(PUB)};`)
  .replace("from './watermark.js'", `from ${JSON.stringify(join(RAD, 'src/watermark.js'))}`));

let giro = 0;
async function esamina(licenzaTesto, dominio = 'socialbot.live') {
  process.env.LICENZA = licenzaTesto;
  const m = await import(`${percorso}?${++giro}`);
  return { ...m.verifica({ dominio }), firma: m.firma({ dominio }), stop: m.motivoPerNonPartire({ dominio }) };
}

const BUONA = { proprietario: 'Andrea Taliento (ANDRYXify)', dominio: 'socialbot.live', scade: '2099-01-01' };

test('la licenza del proprietario, sul suo dominio, vale', async () => {
  const e = await esamina(firmaCon(BUONA));
  assert.equal(e.stato, 'valida');
  assert.equal(e.stop, '', 'e il software parte');
});

test('nessuno puo\' fabbricarsene una: e\' matematica, non offuscamento', async () => {
  const altra = generateKeyPairSync('ed25519').privateKey;
  const e = await esamina(firmaCon({ ...BUONA, proprietario: 'Un Ladro' }, altra));
  assert.equal(e.stato, 'falsa', 'una firma fatta con un\'altra chiave non regge');
  assert.ok(e.stop, 'e il software non parte');
});

test('e non se ne puo\' riciclare una cambiando cosa c\'e\' scritto', async () => {
  const vera = firmaCon(BUONA);
  const corpoNuovo = b64u(JSON.stringify({ proprietario: 'Un Ladro', dominio: 'bot-di-un-altro.it', scade: '2099-01-01' }));
  const e = await esamina(`${corpoNuovo}.${vera.split('.')[1]}`, 'bot-di-un-altro.it');
  assert.equal(e.stato, 'falsa');
});

test('un solo byte girato, e non vale piu\'', async () => {
  const [corpo, f] = firmaCon(BUONA).split('.');
  const b = Buffer.from(f, 'base64url'); b[10] ^= 1;
  assert.equal((await esamina(`${corpo}.${b.toString('base64url')}`)).stato, 'falsa');
});

test('una firma ritoccata nella coda non passa per «uguale»', async () => {
  // Qui c'era un buco vero, trovato provando: il base64 di Node ignora la coda
  // che avanza, quindi due testi DIVERSI davano gli stessi byte e una licenza
  // ritoccata risultava «valida». Ora la scrittura dev'essere l'unica possibile.
  const vera = firmaCon(BUONA);
  const e = await esamina(vera.replace(/.$/, 'X'));
  assert.notEqual(e.stato, 'valida', 'una scrittura diversa non e\' la stessa firma');
});

test('una firma troncata non arriva nemmeno alla verifica', async () => {
  const [corpo, f] = firmaCon(BUONA).split('.');
  assert.equal((await esamina(`${corpo}.${f.slice(0, 40)}`)).stato, 'rotta');
});

test('la licenza di un posto non vale in un altro', async () => {
  const e = await esamina(firmaCon(BUONA), 'bot-di-un-altro.it');
  assert.equal(e.stato, 'altrove');
  assert.match(e.motivo, /socialbot\.live/);
  assert.ok(e.stop);
});

test('scaduta e\' scaduta', async () => {
  const e = await esamina(firmaCon({ ...BUONA, scade: '2020-01-01' }));
  assert.equal(e.stato, 'scaduta');
  assert.ok(e.stop);
});

test('senza licenza non parte', async () => {
  const e = await esamina('');
  assert.equal(e.stato, 'assente');
  assert.ok(e.stop);
});

test('e chi togliesse il cancello non otterrebbe un software pulito', async () => {
  // La parte che conta. Il nome con cui il software si presenta esce dalla
  // stessa funzione della licenza: senza, dice di chi e'. Non c'e' una riga da
  // cancellare, c'e' una sorgente da cui il programma prende una cosa che usa.
  const senza = await esamina('');
  assert.match(senza.firma, /SENZA LICENZA/);
  assert.match(senza.firma, /Andrea Taliento/);
  assert.match(senza.firma, /socialbot\.live/);

  const con = await esamina(firmaCon(BUONA));
  assert.ok(!/SENZA LICENZA/.test(con.firma), 'con la licenza valida si presenta normalmente');

  // e quel nome viaggia con ogni risposta del server
  const web = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');
  assert.match(web, /res\.setHeader\('X-Licenza', licenza\.firma\(\)\)/,
    'la firma esce a ogni risposta, non solo all\'avvio');
});

test('la chiave PRIVATA non e\' in nessun file del progetto', async () => {
  // La sola cosa che renderebbe tutto questo inutile.
  const { execFileSync } = await import('node:child_process');
  // `git grep` esce con 1 quando NON trova niente, che qui e' il caso buono:
  // leggerlo come errore vorrebbe dire una prova che fallisce proprio quando va
  // tutto bene, e passa quando c'e' una chiave dentro.
  let uscita = '';
  try {
    uscita = execFileSync('git', ['grep', '-lE', 'BEGIN (PRIVATE|OPENSSH PRIVATE|EC PRIVATE|RSA PRIVATE) KEY'], {
      cwd: RAD, encoding: 'utf8',
    });
  } catch (e) {
    if (e?.status !== 1) throw e;            // 1 = nessuna corrispondenza
    uscita = '';
  }
  const trovati = uscita.trim().split('\n').filter(Boolean).filter((f) => !/^test\//.test(f));
  assert.deepEqual(trovati, [], `chiavi private nel repository: ${trovati.join(', ')}`);
});
