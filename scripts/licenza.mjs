// La chiave del proprietario, e le licenze che ne nascono.
//
// LA CHIAVE PRIVATA NON ENTRA MAI IN UN REPOSITORY. Si genera sulla macchina del
// proprietario, resta li', e serve solo a firmare. Quella pubblica si incolla nel
// sorgente e puo' stare al sole: con la pubblica si VERIFICA una firma, non se ne
// fabbrica una. E' la stessa asimmetria di una firma autografa, ma senza il
// problema che qualcuno impari a imitarla.
//
//   node scripts/licenza.mjs --chiavi
//       genera la coppia. Scrive la privata in ~/.socialbot-chiave-privata.pem
//       (permessi 600) e INCOLLA DA SE' la pubblica in src/licenza.js. Con
//       --niente-incolla la stampa soltanto.
//
//   node scripts/licenza.mjs --pubblica
//       la chiave privata c'e' gia': ne ricava la pubblica e la mette in
//       src/licenza.js. Non genera niente, non tocca la privata.
//
//   node scripts/licenza.mjs --firma --dominio socialbot.live --mesi 12
//       firma una licenza per quel dominio. Opzioni: --macchina <hostname>,
//       --proprietario "<nome>", --chiave <percorso della privata>.
//
// La licenza che esce e' UNA RIGA: si mette in `.env` come LICENZA=... oppure in
// un file `licenza.txt` accanto al progetto.
import { generateKeyPairSync, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');

const arg = (nome, dif = '') => {
  const i = process.argv.indexOf(`--${nome}`);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dif;
};
const c_e = (nome) => process.argv.includes(`--${nome}`);
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const DOVE = join(homedir(), '.socialbot-chiave-privata.pem');

if (c_e('chiavi')) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const priv = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const pub = publicKey.export({ type: 'spki', format: 'pem' });
  writeFileSync(DOVE, priv, { mode: 0o600 });
  try { chmodSync(DOVE, 0o600); } catch { /* niente */ }
  console.log(`\nChiave privata scritta in ${DOVE} (solo tu la puoi leggere).`);
  console.log('NON metterla in git, non mandarla a nessuno, e tienine una copia al sicuro:');
  console.log('persa quella, non puoi piu\' firmare nuove licenze.\n');

  // LA COSTANTE LA SCRIVE LA MACCHINA. Chiedere a una persona di incollare a mano
  // una chiave con dentro dei \n e' chiedere un errore: va a capo davvero, la
  // stringa si spezza a meta', e il file non si carica piu' — non per la licenza,
  // per la sintassi. E' successo. Il modo giusto e' che quella riga non la scriva
  // nessuno a mano.
  const riga = `export const CHIAVE_PUBBLICA = ${JSON.stringify(pub)};`;
  if (!c_e('niente-incolla')) {
    const f = join(RAD, 'src', 'licenza.js');
    const src = readFileSync(f, 'utf8');
    const re = /^export const CHIAVE_PUBBLICA = .*$/m;
    if (!re.test(src)) {
      console.error(`Non trovo la riga CHIAVE_PUBBLICA in ${f}. Incollala tu, tutta su una riga:\n`);
      console.error(riga);
      process.exit(1);
    }
    writeFileSync(f, src.replace(re, riga));
    console.log('Chiave pubblica messa in src/licenza.js — nessun copia-incolla, nessuna riga spezzata.');
    console.log('DA ADESSO IL CANCELLO E\' ATTIVO: senza una LICENZA valida nel .env il bot non parte.');
    console.log('Se non l\'hai ancora firmata:  node scripts/licenza.mjs --firma --dominio <dominio>\n');
  } else {
    console.log('Incolla questa riga in src/licenza.js, TUTTA SU UNA RIGA SOLA:\n');
    console.log(riga + '\n');
  }
  console.log('(la pubblica puo\' stare al sole: serve a verificare, non a firmare)\n');
  process.exit(0);
}

// LA PUBBLICA SI RICAVA DALLA PRIVATA, sempre. Serve quando la chiave c'e' gia' —
// per esempio perche' la si e' generata con una versione vecchia di questo script,
// che la pubblica la stampava soltanto. Senza questo, l'unico modo per rimettere
// la riga a posto sarebbe buttare la coppia e rifarne una: perdere una chiave
// buona per un dettaglio di trascrizione sarebbe assurdo.
if (c_e('pubblica')) {
  const percorso = arg('chiave', DOVE);
  let priv;
  try { priv = createPrivateKey(readFileSync(percorso, 'utf8')); }
  catch (e) {
    console.error(`Non riesco a leggere la chiave privata in ${percorso}: ${e?.message || e}`);
    console.error('Se non ne hai ancora una: node scripts/licenza.mjs --chiavi');
    process.exit(1);
  }
  const pub = createPublicKey(priv).export({ type: 'spki', format: 'pem' });
  const riga = `export const CHIAVE_PUBBLICA = ${JSON.stringify(pub)};`;
  if (c_e('niente-incolla')) {
    console.log('\nIncolla questa riga in src/licenza.js, TUTTA SU UNA RIGA SOLA:\n');
    console.log(riga + '\n');
    process.exit(0);
  }
  const f = join(RAD, 'src', 'licenza.js');
  const src = readFileSync(f, 'utf8');
  const re = /^export const CHIAVE_PUBBLICA = .*$/m;
  if (!re.test(src)) {
    console.error(`Non trovo la riga CHIAVE_PUBBLICA in ${f}. Incollala tu, tutta su una riga:\n`);
    console.error(riga);
    process.exit(1);
  }
  writeFileSync(f, src.replace(re, riga));
  console.log(`\nChiave pubblica ricavata da ${percorso} e messa in src/licenza.js.`);
  console.log('DA ADESSO IL CANCELLO E\' ATTIVO: senza una LICENZA valida nel .env il bot non parte.');
  console.log('Se non l\'hai ancora firmata:  node scripts/licenza.mjs --firma --dominio <dominio>\n');
  process.exit(0);
}

if (c_e('firma')) {
  const percorso = arg('chiave', DOVE);
  let priv;
  try { priv = createPrivateKey(readFileSync(percorso, 'utf8')); }
  catch (e) {
    console.error(`Non riesco a leggere la chiave privata in ${percorso}: ${e?.message || e}`);
    console.error('Se non l\'hai ancora fatta: node scripts/licenza.mjs --chiavi');
    process.exit(1);
  }
  const mesi = Math.max(1, parseInt(arg('mesi', '12'), 10) || 12);
  const scade = new Date(Date.now() + mesi * 30 * 24 * 3600_000).toISOString().slice(0, 10);
  const dati = {
    proprietario: arg('proprietario', 'Andrea Taliento (ANDRYXify)'),
    dominio: arg('dominio', ''),
    macchina: arg('macchina', ''),
    rilasciata: new Date().toISOString().slice(0, 10),
    scade,
  };
  for (const k of Object.keys(dati)) if (!dati[k]) delete dati[k];
  const corpo = b64u(JSON.stringify(dati));
  const firma = b64u(sign(null, Buffer.from(corpo), priv));
  console.log('\nLicenza per:', JSON.stringify(dati));
  console.log('\nMettila nel .env del server (una riga sola):\n');
  console.log(`LICENZA=${corpo}.${firma}\n`);
  process.exit(0);
}

console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(0, 18).join('\n').replace(/^\/\/ ?/gm, ''));
