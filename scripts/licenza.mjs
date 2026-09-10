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
//       (permessi 600) e stampa la pubblica da incollare in src/licenza.js.
//
//   node scripts/licenza.mjs --firma --dominio socialbot.live --mesi 12
//       firma una licenza per quel dominio. Opzioni: --macchina <hostname>,
//       --proprietario "<nome>", --chiave <percorso della privata>.
//
// La licenza che esce e' UNA RIGA: si mette in `.env` come LICENZA=... oppure in
// un file `licenza.txt` accanto al progetto.
import { generateKeyPairSync, createPrivateKey, sign } from 'node:crypto';
import { writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

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
  console.log('Ora incolla questa in src/licenza.js, dentro CHIAVE_PUBBLICA:\n');
  console.log(JSON.stringify(pub));
  console.log('\n(la pubblica puo\' stare al sole: serve a verificare, non a firmare)\n');
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
