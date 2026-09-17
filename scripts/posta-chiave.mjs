#!/usr/bin/env node
// La chiave DKIM della posta di casa, i record DNS da copiare, e la prova che
// quello che sta nel DNS e' davvero quello che il server firma.
//
// Uso: node scripts/posta-chiave.mjs [--ip 1.2.3.4]
//   · senza una chiave in DATA_DIR/dkim.pem la genera (2048 bit, permessi 600);
//   · con una chiave gia' presente non la tocca (ruotare = cancellare il file
//     e cambiare MAIL_DKIM_SELETTORE, cosi' il record vecchio non mente);
//   · stampa i tre record TXT: SPF (con l'IP se lo passi), DKIM, DMARC.
//
// Uso: node scripts/posta-chiave.mjs --verifica [--ip 1.2.3.4]
//   Non tocca niente: guarda com'e' messo il server ADESSO. Guarda le tre cose
//   che vanno storte davvero, e che una lista scritta a mano non puo' garantire:
//     · il record DKIM pubblicato si confronta con la chiave VERA, non si
//       guarda solo se «c'e'»: una `p=` tagliata a meta' dal pannello DNS e' il
//       guasto piu' comune, e da fuori sembra tutto a posto;
//     · la porta 25 in uscita si prova aprendola per davvero verso uno
//       scambiatore vero, perche' un firewall che la chiude non risponde
//       «chiusa»: resta muto, e la mail muore in silenzio venti secondi dopo;
//     · il reverse DNS si legge dall'IP, che e' il verso in cui lo legge chi
//       riceve la posta.
// Il resto della lista sta in docs/POSTA.md.
import { existsSync } from 'node:fs';
import dns from 'node:dns/promises';
import net from 'node:net';
import * as posta from '../src/features/posta.js';

const argv = process.argv.slice(2);
const ip = (argv.indexOf('--ip') >= 0 ? argv[argv.indexOf('--ip') + 1] : '') || '';
const dom = posta.dominio();
if (!dom) { console.error('Manca il dominio: imposta MAIL_DOMINIO o BASE_URL nel .env.'); process.exit(1); }

const sel = posta.selettore();

function stampaChiaveERecord() {
  let pubblica;
  if (existsSync(posta.CHIAVE_FILE)) {
    pubblica = posta.pubblicaDi(posta.chiavePrivata());
    console.log(`Chiave gia' presente: ${posta.CHIAVE_FILE}`);
  } else {
    ({ pubblica } = posta.generaChiave());
    console.log(`Chiave generata: ${posta.CHIAVE_FILE}`);
  }
  console.log(`Mittente: ${posta.mittente()}   dominio: ${dom}   selettore: ${sel}\n`);
  console.log('Record DNS da creare (tipo TXT):');
  for (const r of posta.recordDns({ dom, sel, ip, pubblica })) {
    console.log(`\n  ${r.nome}\n  ${r.cosa}\n  ${r.valore}`);
  }
  if (!ip) console.log('\nSPF senza IP: rilancia con --ip <IP del server> per un record completo.');
  console.log('\nPoi: reverse DNS dell\'IP → ' + dom + ' (console del fornitore), porta 25 in uscita aperta,');
  console.log('e `node scripts/posta-chiave.mjs --verifica --ip <IP>` per sapere se e\' tutto a posto.');
}

// ── La verifica ─────────────────────────────────────────────────────────────
const esiti = [];
const dice = (ok, cosa, dettaglio = '') => { esiti.push({ ok, cosa, dettaglio }); return ok; };

// Un TXT lungo torna a pezzi (il DNS spezza le stringhe a 255 caratteri): si
// riuniscono, se no la chiave pubblica non combacerebbe mai.
async function txt(nome) {
  try { return (await dns.resolveTxt(nome)).map((parti) => parti.join('')); }
  catch (e) { return null; }
}

async function verifica() {
  console.log(`Dominio ${dom} · selettore ${sel} · mittente ${posta.mittente()}\n`);

  const pem = existsSync(posta.CHIAVE_FILE) ? posta.chiavePrivata() : '';
  const pubblica = pem ? posta.pubblicaDi(pem) : '';
  dice(!!pem, `la chiave c'e' e il bot la legge (${posta.CHIAVE_FILE})`,
    'senza chiave la posta resta spenta: `node scripts/posta-chiave.mjs --ip <IP>`');
  dice(posta.attiva(), 'la posta e\' accesa',
    posta.spenta() ? 'MAIL=no nel .env la tiene spenta apposta' : 'manca la chiave o il dominio');

  const spf = await txt(dom);
  const riga = (spf || []).find((r) => r.toLowerCase().startsWith('v=spf1'));
  if (dice(!!riga, 'SPF pubblicato', `nessun TXT "v=spf1" su ${dom}`) && ip) {
    dice(riga.includes(`ip4:${ip}`), `SPF autorizza ${ip}`, `c'e' scritto: ${riga}`);
  }

  const dkim = await txt(`${sel}._domainkey.${dom}`);
  const rigaD = (dkim || []).find((r) => r.toLowerCase().includes('p='));
  if (dice(!!rigaD, `DKIM pubblicato su ${sel}._domainkey.${dom}`,
    'il record non si risolve: nome sbagliato, oppure non ancora propagato')) {
    const pubDns = (/p=([A-Za-z0-9+/=]+)/.exec(rigaD) || [])[1] || '';
    if (pubblica) {
      dice(pubDns === pubblica, 'la chiave pubblicata e\' la chiave vera',
        pubDns.length !== pubblica.length
          ? `nel DNS ce ne sono ${pubDns.length} caratteri, la chiave ne ha ${pubblica.length}: il record e' stato troncato, ricopialo intero`
          : 'stessa lunghezza ma contenuto diverso: e\' la chiave di un\'altra installazione');
    }
  }

  const dmarc = await txt(`_dmarc.${dom}`);
  dice((dmarc || []).some((r) => r.toLowerCase().startsWith('v=dmarc1')), `DMARC pubblicato su _dmarc.${dom}`,
    'senza, chi riceve decide da se\' cosa fare di una mail che non passa');

  // IL CERCHIO. Chi riceve posta lo chiude cosi': il nome detto nell'EHLO deve
  // puntare all'IP da cui arriva la mail, e quell'IP deve dichiarare quello
  // stesso nome nel suo reverse DNS. Guardare i tre pezzi separatamente lascia
  // passare il caso vero: rDNS `mail.<dominio>` e EHLO `<dominio>`, tutti e due
  // "giusti" da soli, e il cerchio aperto.
  const helo = posta.nomeHelo();
  if (ip) {
    let nomi = null;
    try { nomi = (await dns.reverse(ip)).map((n) => n.toLowerCase().replace(/\.$/, '')); } catch (e) { nomi = null; }
    if (dice(!!nomi?.length, `l'IP ${ip} dice come si chiama (reverse DNS)`,
      'nessun reverse DNS: si imposta dalla console del fornitore, e senza quello la posta finisce nello spam')) {
      const detto = nomi[0];
      let torna = [];
      try { torna = await dns.resolve4(detto); } catch (e) { torna = []; }
      dice(torna.includes(ip), `«${detto}» torna a ${ip}`,
        torna.length ? `«${detto}» punta a ${torna.join(', ')}` : `«${detto}» non ha un record A: il nome del reverse DNS deve esistere davvero`);
      dice(nomi.includes(helo), `il cerchio si chiude: mi presento come «${helo}», e l'IP dice di chiamarsi cosi'`,
        `mi presento come «${helo}» ma l'IP dice «${nomi.join(', ')}». Metti MAIL_HELO=${detto} nel .env (oppure cambia il reverse DNS in ${helo}).`);
    }
  } else {
    console.log('(senza --ip non posso controllare ne\' SPF ne\' il reverse DNS)\n');
  }

  const porta = await provaPorta25();
  dice(porta.ok, 'la porta 25 in uscita e\' aperta', porta.perche);

  // BIMI: il logo accanto al mittente. E' FACOLTATIVO, quindi non averlo non e'
  // un difetto e non deve diventare una riga rossa. Ma se il record c'e' deve
  // essere giusto, e soprattutto il logo deve rispondere davvero: un indirizzo
  // che non si apre e' peggio di nessun record, perche' chi lo controlla lo
  // legge come un mittente che dice il falso.
  const bimi = ((await txt(`default._bimi.${dom}`)) || []).find((r) => /^v=BIMI1/i.test(r.trim()));
  if (!bimi) {
    // Non basta dire «manca»: la riga da incollare la sappiamo gia', e scriverla
    // qui evita il giro per la documentazione e un indirizzo ricopiato a mano.
    const sito = (process.env.BASE_URL || `https://${dom}`).replace(/\/$/, '');
    console.log('(BIMI non e\' pubblicato: e\' facoltativo. La versione senza certificato non costa niente,');
    console.log(' e la mostrano pochi programmi — Gmail e Apple vogliono il certificato. Il record e\' questo:');
    console.log(`   default._bimi.${dom}  TXT`);
    console.log(`   v=BIMI1; l=${sito}/bimi/socialbot.svg`);
    console.log(' Il resto sta in docs/POSTA.md)\n');
  } else {
    const l = (/\bl=([^;]+)/i.exec(bimi) || [])[1]?.trim() || '';
    const a = (/\ba=([^;]+)/i.exec(bimi) || [])[1]?.trim() || '';
    if (dice(!!l, 'BIMI: il record dice dove sta il logo', 'manca la parte «l=»')) {
      dice(/^https:\/\//.test(l), 'e il logo sta in https', `c'e' scritto: ${l}`);
      let risposta = null;
      try {
        const c = await fetch(l, { redirect: 'follow', signal: AbortSignal.timeout(10_000) });
        risposta = { stato: c.status, tipo: (c.headers.get('content-type') || '').split(';')[0], quanti: (await c.arrayBuffer()).byteLength };
      } catch (e) { risposta = { errore: e?.message || String(e) }; }
      dice(risposta?.stato === 200, 'e il logo risponde',
        risposta?.errore ? risposta.errore : `risponde ${risposta?.stato}`);
      if (risposta?.stato === 200) {
        dice(risposta.tipo === 'image/svg+xml', 'ed e\' un SVG', `lo serve come ${risposta.tipo || 'niente'}`);
        dice(risposta.quanti <= 32 * 1024, `il logo sta in ${(risposta.quanti / 1024).toFixed(1)} kB`, 'il certificato ne accetta al massimo 32');
      }
    }
    if (!a) console.log('(BIMI senza «a=»: il record vale, ma Gmail e Apple il logo non lo mostrano — vogliono il certificato)\n');
  }

  const rossi = esiti.filter((e) => !e.ok);
  for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.cosa + (e.ok || !e.dettaglio ? '' : `\n      → ${e.dettaglio}`));
  console.log(rossi.length
    ? `\n${rossi.length} cose da sistemare. La lista per esteso: docs/POSTA.md.`
    : '\nLa posta di casa e\' in regola. Prova vera: scrivi il tuo indirizzo nella scheda Dirette. ✓');
  return rossi.length ? 1 : 0;
}

// Aprire davvero la porta 25 verso uno scambiatore vero. Un firewall che la
// blocca non dice «no»: lascia cadere i pacchetti. Percio' la prova e' il
// banner 220 che arriva entro il tempo, non «la connessione non e' fallita».
function provaPorta25(host = '', timeoutMs = 12000) {
  return new Promise((si) => {
    (async () => {
      let dove = host;
      if (!dove) {
        try { dove = (await dns.resolveMx('gmail.com')).sort((a, b) => a.priority - b.priority)[0]?.exchange || ''; }
        catch (e) { return si({ ok: false, perche: 'non riesco nemmeno a risolvere un MX: il DNS del server non funziona' }); }
      }
      const s = net.createConnection({ host: dove, port: 25 });
      let deciso = false;
      const fine = (ok, perche) => { if (!deciso) { deciso = true; try { s.destroy(); } catch { /* gia' chiuso */ } si({ ok, perche }); } };
      s.setTimeout(timeoutMs);
      s.on('timeout', () => fine(false, `${dove} non risponde entro ${timeoutMs / 1000} s: la porta 25 in uscita e' chiusa (Hetzner la apre su richiesta)`));
      s.on('error', (e) => fine(false, `${dove}: ${e?.message || e}`));
      s.on('data', (b) => {
        const banner = String(b).split('\r\n')[0];
        fine(banner.startsWith('220'), `${dove} risponde: ${banner}`);
      });
    })();
  });
}

// La scelta sta in fondo: le due strade sono scritte sopra per intero, e cosi'
// nessuna delle due puo' partire prima che il file sia finito di leggere.
if (argv.includes('--verifica')) process.exit(await verifica());
else stampaChiaveERecord();
