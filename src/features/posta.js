// LA POSTA IN USCITA, DI CASA. Il bot e' il suo server di posta, solo in uscita.
//
// Niente servizi esterni e niente demone accanto: quando serve mandare una mail
// (il rapporto di fine diretta, la conferma di un indirizzo) il bot cerca gli
// scambiatori (MX) del destinatario, si presenta sulla porta 25, alza TLS se il
// server lo offre (STARTTLS), consegna e chiude. E firma con DKIM, perche' oggi
// una mail senza firma da un server sconosciuto non arriva: va in spam o viene
// rifiutata prima ancora di essere letta.
//
// Quello che deve esistere fuori da qui, e sta scritto in docs/POSTA.md:
//  · la chiave DKIM (`node scripts/posta-chiave.mjs` la genera e stampa il
//    record DNS), che vive in DATA_DIR/dkim.pem con i permessi del solo padrone;
//  · tre record DNS sul dominio: SPF, DKIM, DMARC;
//  · il reverse DNS dell'IP del server sul dominio, e la porta 25 in uscita
//    aperta dal fornitore (Hetzner la chiude sui progetti nuovi).
// Senza la chiave la posta e' spenta e il pannello lo dice: meglio niente che
// una mail che parte e sparisce.
//
// La firma e la composizione sono pure (si collaudano con una chiave finta); la
// consegna parla SMTP e si collauda contro un server finto sulla porta locale.
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import crypto from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';
import { segno } from '../segreti.js';
import { makeLog } from '../logger.js';
import { tinta } from '../web/tavolozza.js';

const log = makeLog('posta');
const env = (k, def = '') => (process.env[k] ?? def).trim();
const CRLF = '\r\n';

export const CHIAVE_FILE = join(config.dataDir, 'dkim.pem');
export const TIMEOUT_MS = 20_000;

export function dominio() {
  const d = env('MAIL_DOMINIO');
  if (d) return d.toLowerCase();
  try { return new URL(config.baseUrl).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}
export function selettore() { return (env('MAIL_DKIM_SELETTORE') || 'sb1').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'sb1'; }
export function mittente() { return env('MAIL_DA') || `rapporti@${dominio()}`; }
// CHI SCRIVE, non solo da dove. Senza un nome, nell'elenco della posta compare
// il pezzo prima della chiocciola: «info». Il nome va nell'intestazione From,
// che e' firmata; la busta (MAIL FROM) resta il solo indirizzo, come vuole SMTP.
export function nomeMittente() { return env('MAIL_NOME') || 'SocialBot'; }
export function mittenteIntestazione() {
  const n = nomeMittente();
  return n ? `${oggettoCodificato(n)} <${mittente()}>` : mittente();
}

// ---------------------------------------------------------------- IL CODICE DELLA SETTIMANA
//
// «Questa mail l'avete scritta voi?» Senza una risposta, l'unica difesa che ha
// chi riceve e' guardare il mittente — e il mittente si falsifica scrivendolo.
// Percio' ogni nostra mail porta in fondo un codice, e quel codice si ritrova
// SOLO dentro il pannello, dove si entra con le proprie credenziali. Chi imita
// la mail non sa cosa scrivere li'.
//
// Il codice e' PER CANALE e per SETTIMANA. Per canale, se no basterebbe
// riceverne una per conoscere quello di tutti. Per settimana, cosi' uno
// rubato invecchia da solo in pochi giorni. Non si conserva da nessuna parte:
// si ricava dal segreto del server, quindi sopravvive a un riavvio e non c'e'
// niente da rubare in piu' nel database.
//
// Le lettere che si confondono (0/O, 1/I/L) non ci sono: un codice serve a
// essere confrontato a occhio, e due caratteri simili farebbero dire «non
// combacia» a una mail buona.
const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const GIORNO = 86_400_000;

// La settimana ISO: comincia di lunedi', e si chiama con l'anno a cui
// appartiene il suo giovedi'. E' l'unico modo di dire «settimana» che non
// cambia significato a cavallo di dicembre.
export function settimanaDi(ora = Date.now()) {
  const t = new Date(Number(ora) || 0);
  const g = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
  g.setUTCDate(g.getUTCDate() + 4 - (g.getUTCDay() || 7));
  const capodanno = Date.UTC(g.getUTCFullYear(), 0, 1);
  const n = Math.ceil(((g.getTime() - capodanno) / GIORNO + 1) / 7);
  return `${g.getUTCFullYear()}-W${String(n).padStart(2, '0')}`;
}

export function lunediDi(ora = Date.now()) {
  const t = new Date(Number(ora) || 0);
  const g = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  return g - ((new Date(g).getUTCDay() || 7) - 1) * GIORNO;
}

export function codiceDi(channel, ora = Date.now()) {
  const b = segno('codice-posta', `${String(channel || '').toLowerCase()}|${settimanaDi(ora)}`);
  let s = '';
  for (let i = 0; i < 8; i++) s += ALFABETO[b[i] % ALFABETO.length];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

// I codici del mese, per chi apre oggi una mail di dieci giorni fa. Solo quelli
// gia' usati: uno futuro, se qualcuno sbircia lo schermo, sarebbe un regalo.
export function codiciDelMese(channel, ora = Date.now()) {
  const q = new Date(Number(ora) || 0);
  const primo = Date.UTC(q.getUTCFullYear(), q.getUTCMonth(), 1);
  const questa = settimanaDi(ora);
  const fuori = [];
  const visti = new Set();
  for (let t = lunediDi(primo); t <= Number(ora); t += 7 * GIORNO) {
    const settimana = settimanaDi(t);
    if (visti.has(settimana)) continue;
    visti.add(settimana);
    fuori.push({ settimana, dal: t, codice: codiceDi(channel, t), corrente: settimana === questa });
  }
  return fuori;
}
// IL NOME CON CUI CI SI PRESENTA (EHLO). Chi riceve posta chiude un cerchio: il
// nome detto nell'EHLO deve puntare all'IP da cui arriva la mail, e quell'IP
// deve dichiarare lo stesso nome nel suo reverse DNS. Il dominio del sito va
// bene finche' l'IP dichiara proprio quello; ma un IP di posta di solito si
// chiama `mail.<dominio>`, e allora il cerchio non si chiude da se'. Percio' il
// nome e' una cosa che si dice, non una che si deduce: MAIL_HELO. Di serie
// resta il dominio, che e' il caso in cui il cerchio si chiude gia'.
export function nomeHelo() { return (env('MAIL_HELO') || dominio()).toLowerCase(); }
export const spenta = () => /^(no|off)$/i.test(env('MAIL'));
export function chiavePrivata(file = CHIAVE_FILE) {
  try { return existsSync(file) ? readFileSync(file, 'utf8') : ''; } catch { return ''; }
}
export function attiva() { return !spenta() && !!dominio() && !!chiavePrivata(); }
export const indirizzoOk = (s) => typeof s === 'string' && s.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[a-z0-9-]{2,}$/i.test(s);

// ---------------------------------------------------------------- la chiave e i record
export function pubblicaDi(pem) {
  return crypto.createPublicKey(crypto.createPrivateKey(pem)).export({ type: 'spki', format: 'der' }).toString('base64');
}
export function generaChiave({ file = CHIAVE_FILE, bits = 2048 } = {}) {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: bits });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  writeFileSync(file, pem, { mode: 0o600 });
  return { file, pubblica: pubblicaDi(pem) };
}
// I tre record che il dominio deve avere. Puro: si legge, si copia nel DNS.
export function recordDns({ dom = dominio(), sel = selettore(), ip = '', pubblica = '' } = {}) {
  return [
    { nome: dom, tipo: 'TXT', valore: `v=spf1 ${ip ? `ip4:${ip} ` : ''}-all`, cosa: 'SPF: chi puo\' mandare posta per questo dominio (l\'IP del server)' },
    { nome: `${sel}._domainkey.${dom}`, tipo: 'TXT', valore: `v=DKIM1; k=rsa; p=${pubblica}`, cosa: 'DKIM: la chiave pubblica con cui chi riceve verifica la firma' },
    { nome: `_dmarc.${dom}`, tipo: 'TXT', valore: 'v=DMARC1; p=quarantine; adkim=s; aspf=s', cosa: 'DMARC: cosa fare di una mail che non passa SPF e DKIM' },
  ];
}

// ---------------------------------------------------------------- DKIM (RFC 6376, relaxed/relaxed)
export function intestazioneRilassata(nome, valore) {
  const v = String(valore).replace(/\r\n[ \t]+/g, ' ').replace(/[ \t]+/g, ' ').trim();
  return `${String(nome).toLowerCase()}:${v}`;
}
export function corpoRilassato(corpo) {
  const righe = String(corpo || '').split(/\r?\n/).map((r) => r.replace(/[ \t]+/g, ' ').replace(/ +$/, ''));
  while (righe.length && righe[righe.length - 1] === '') righe.pop();
  return righe.length ? righe.join(CRLF) + CRLF : '';
}
export const FIRMATE = ['from', 'to', 'subject', 'date', 'message-id', 'mime-version', 'content-type'];
export function firmaDkim({ intestazioni, corpo, dom, sel, pem, ora = Date.now(), firmate = FIRMATE }) {
  const bh = crypto.createHash('sha256').update(corpoRilassato(corpo)).digest('base64');
  const scelte = [];
  for (const nome of firmate) { const h = intestazioni.find(([n]) => String(n).toLowerCase() === nome); if (h) scelte.push(h); }
  const testa = `v=1; a=rsa-sha256; c=relaxed/relaxed; d=${dom}; s=${sel}; t=${Math.floor(ora / 1000)}; h=${scelte.map(([n]) => n.toLowerCase()).join(':')}; bh=${bh}; b=`;
  const b = crypto.sign('sha256', Buffer.from(daFirmare(scelte, testa), 'utf8'), pem).toString('base64');
  return ['DKIM-Signature', testa + b];
}
// La stringa firmata: le intestazioni scelte, canoniche, e la firma stessa con b= vuoto.
export function daFirmare(scelte, testaConBVuoto) {
  return scelte.map(([n, v]) => intestazioneRilassata(n, v)).join(CRLF) + CRLF + intestazioneRilassata('DKIM-Signature', testaConBVuoto);
}

// ---------------------------------------------------------------- il messaggio
const b64righe = (s) => Buffer.from(String(s), 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n').replace(/\r\n$/, '');
export const oggettoCodificato = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`);
export function componi({ da, a, oggetto, testo = '', html = '', dom = dominio(), data = new Date(), id = crypto.randomBytes(12).toString('hex') }) {
  const confine = 'sb-' + crypto.randomBytes(8).toString('hex');
  const intestazioni = [
    ['From', da], ['To', a], ['Subject', oggettoCodificato(String(oggetto || ''))],
    ['Date', data.toUTCString().replace(/GMT$/, '+0000')],
    ['Message-ID', `<${id}@${dom}>`], ['MIME-Version', '1.0'],
    ['Content-Type', `multipart/alternative; boundary="${confine}"`],
  ];
  const parte = (tipo, contenuto) => `--${confine}${CRLF}Content-Type: ${tipo}; charset=utf-8${CRLF}Content-Transfer-Encoding: base64${CRLF}${CRLF}${b64righe(contenuto)}${CRLF}`;
  const corpo = parte('text/plain', testo) + (html ? parte('text/html', html) : '') + `--${confine}--${CRLF}`;
  return { intestazioni, corpo, id };
}
export function serializza({ intestazioni, corpo }) {
  return intestazioni.map(([n, v]) => `${n}: ${v}`).join(CRLF) + CRLF + CRLF + corpo;
}

// ---------------------------------------------------------------- SMTP
function errore(passo, testo, permanente = false) { const e = new Error(`${passo}: ${testo}`); e.passo = passo; e.permanente = permanente; return e; }

// Una linea SMTP: si legge una risposta alla volta (anche su piu' righe
// «250-...»), e si puo' cambiare presa sotto (STARTTLS) senza perdere il filo.
class Linea {
  constructor(socket) { this.resto = ''; this.coda = []; this.errore = null; this.chiusa = false; this.cambia(socket); }
  cambia(socket) {
    this.socket = socket; this.resto = '';
    socket.setEncoding('utf8');
    socket.on('data', (d) => { this.resto += d; this._sveglia(); });
    socket.on('error', (e) => { this.errore = e; this._sveglia(); });
    socket.on('close', () => { this.chiusa = true; this._sveglia(); });
  }
  _risposta() {
    const righe = this.resto.split(CRLF);
    for (let i = 0; i < righe.length - 1; i++) {
      const m = /^(\d{3})(?: |$)/.exec(righe[i]);
      if (!m) continue;
      const blocco = righe.slice(0, i + 1);
      this.resto = righe.slice(i + 1).join(CRLF);
      return { codice: Number(m[1]), righe: blocco.map((r) => r.slice(4)), testo: blocco[blocco.length - 1].slice(4) };
    }
    return null;
  }
  _sveglia() {
    while (this.coda.length) {
      const r = this._risposta();
      if (!r && !this.errore && !this.chiusa) return;
      const w = this.coda.shift();
      if (r) w.risolvi(r);
      else w.rifiuta(this.errore || new Error('connessione chiusa'));
    }
  }
  attendi() { return new Promise((risolvi, rifiuta) => { this.coda.push({ risolvi, rifiuta }); this._sveglia(); }); }
  comanda(riga) { this.socket.write(riga + CRLF); return this.attendi(); }
}

async function scambiatori(dest) {
  let mx = [];
  try { mx = await dns.promises.resolveMx(dest); } catch { mx = []; }
  const lista = mx.filter((m) => m?.exchange && m.exchange !== '.').sort((x, y) => x.priority - y.priority).map((m) => ({ host: m.exchange, port: 25 }));
  return lista.length ? lista : [{ host: dest, port: 25 }];
}

async function consegnaA({ host, port = 25, tls: implicito = false }, { a, da, messaggio, helo, timeoutMs }) {
  const socket = implicito ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
  socket.setTimeout(timeoutMs, () => socket.destroy(new Error('tempo scaduto')));
  const linea = new Linea(socket);
  const attesa = (classi, r, passo) => { if (!classi.includes(Math.floor(r.codice / 100))) throw errore(passo, `${r.codice} ${r.testo}`, r.codice >= 500); return r; };
  try {
    attesa([2], await linea.attendi(), 'saluto');
    let r = attesa([2], await linea.comanda('EHLO ' + helo), 'EHLO');
    if (!implicito && r.righe.some((x) => /^STARTTLS\b/i.test(x))) {
      attesa([2], await linea.comanda('STARTTLS'), 'STARTTLS');
      const sicuro = tls.connect({ socket, servername: host, rejectUnauthorized: false });
      await new Promise((ok, no) => { sicuro.once('secureConnect', ok); sicuro.once('error', no); });
      linea.cambia(sicuro);
      r = attesa([2], await linea.comanda('EHLO ' + helo), 'EHLO');
    }
    attesa([2], await linea.comanda(`MAIL FROM:<${da}>`), 'MAIL FROM');
    attesa([2], await linea.comanda(`RCPT TO:<${a}>`), 'RCPT TO');
    attesa([3], await linea.comanda('DATA'), 'DATA');
    const puntato = messaggio.replace(/\r\n\./g, '\r\n..');
    r = attesa([2], await linea.comanda(puntato + (messaggio.endsWith(CRLF) ? '' : CRLF) + '.'), 'invio');
    linea.comanda('QUIT').catch(() => {});
    return { ok: true, host, risposta: r.testo };
  } finally { socket.destroy(); }
}

// Consegna un messaggio gia' composto. `via` forza un server (i collaudi, o un
// relay di casa); senza, gli MX del destinatario in ordine di priorita'.
export async function consegna({ a, da = mittente(), messaggio, helo = nomeHelo(), via = null, timeoutMs = TIMEOUT_MS }) {
  const dest = String(a || '').split('@')[1];
  if (!dest) throw errore('destinatario', 'indirizzo senza dominio', true);
  const tentativi = via ? [via] : await scambiatori(dest.toLowerCase());
  let ultimo = null;
  for (const mx of tentativi) {
    try { return await consegnaA(mx, { a, da, messaggio, helo, timeoutMs }); }
    catch (e) { ultimo = e; if (e.permanente) throw e; }
  }
  const rete = ultimo && /ECONNREFUSED|ETIMEDOUT|tempo scaduto|EHOSTUNREACH|ENETUNREACH/.test(String(ultimo.message || ultimo.code));
  if (rete) throw errore('rete', `non raggiungo il server di posta di ${dest} sulla porta 25: se succede con tutti, la porta 25 in uscita e' chiusa (il fornitore del server la apre su richiesta)`);
  throw ultimo || errore('mx', `nessun server di posta per ${dest}`);
}

// Una mail, da capo a fondo: composta, firmata, consegnata. Ritorna { ok, host, id }.
export async function invia({ a, oggetto, testo = '', html = '', via = null }) {
  if (!indirizzoOk(a)) throw errore('destinatario', 'indirizzo non valido', true);
  const pem = chiavePrivata();
  if (!via && (spenta() || !dominio() || !pem)) throw errore('spenta', 'la posta non e\' configurata: manca la chiave DKIM o il dominio');
  const da = mittente(), dom = dominio();
  const m = componi({ da: mittenteIntestazione(), a, oggetto, testo, html, dom });
  const intestazioni = pem ? [firmaDkim({ intestazioni: m.intestazioni, corpo: m.corpo, dom, sel: selettore(), pem }), ...m.intestazioni] : m.intestazioni;
  const esito = await consegna({ a, da, messaggio: serializza({ intestazioni, corpo: m.corpo }), helo: nomeHelo(), via });
  log.info(`posta a ${a.replace(/^(.).*@/, '$1…@')}: ${esito.risposta || 'consegnata'} (${esito.host})`);
  return { ...esito, id: m.id };
}

// ---------------------------------------------------------------- il guscio delle mail
// Una mail HTML col tema del prodotto: i colori vengono da tema.css, quindi se
// il marchio cambia cambia anche qui. Stili in linea, tabelle: e' cio' che i
// programmi di posta capiscono.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// I caratteri del sito non si spediscono: un programma di posta ne carica uno da
// fuori quasi mai, e quando non ce la fa mette il suo. Quindi si chiede prima
// quello del sito, per chi ce l'ha, e dietro si mette una fila che gli somiglia.
const PILA_FONT = "Archivo,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif";
const cq = (n, tema = 'chiaro') => { try { return tinta(n, tema); } catch { return tema === 'scuro' ? '#fff' : '#000'; } };

// LO STESSO GUSCIO NEI DUE TEMI. I colori dello scuro non si inventano qui: sono
// quelli di tema.css letti per il tema scuro, gli stessi del sito. Chi legge la
// posta col fondo nero non si prende una carta bianca in faccia. Chi non capisce
// la regola la salta e resta al chiaro: e' un di piu', non una condizione.
function vestiScuro() {
  return `@media (prefers-color-scheme: dark) {
  .sb-fondo { background:${cq('bg', 'scuro')} !important; }
  .sb-carta { background:${cq('surface', 'scuro')} !important; border-color:${cq('contorno', 'scuro')} !important; }
  .sb-testo { color:${cq('testo', 'scuro')} !important; }
  .sb-tenue { color:${cq('testo-2', 'scuro')} !important; }
  .sb-acc, .sb-acc a { color:${cq('acc', 'scuro')} !important; }
  .sb-riquadro { background:${cq('surface-2-tinta', 'scuro')} !important; border-color:${cq('border', 'scuro')} !important; }
  .sb-bordo { border-color:${cq('border', 'scuro')} !important; }
  .sb-tasto { background:${cq('acc', 'scuro')} !important; color:${cq('bg', 'scuro')} !important; }
}`;
}

// `occhiello` e' la riga che si legge NELL'ELENCO della posta, accanto
// all'oggetto: se non gliela si da', il programma si prende le prime parole del
// corpo. `cappello` e' di chi e' il canale, accanto al nome nostro.
export function guscioHtml({ titolo, corpo, piede = '', occhiello = '', cappello = '', codice = '' }) {
  const c = (n) => cq(n);
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${esc(titolo)}</title><style>${vestiScuro()}</style></head>
<body class="sb-fondo" style="margin:0;padding:0;background:${c('bg')};">
${occhiello ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(occhiello)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sb-fondo" style="background:${c('bg')};padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" class="sb-carta sb-testo" style="max-width:640px;width:100%;background:${c('surface')};border:2px solid ${c('contorno')};border-radius:14px;font-family:${PILA_FONT};color:${c('testo')};">
<tr><td style="padding:22px 28px 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;font-weight:bold;"><span class="sb-acc" style="color:${c('acc')};">SocialBot</span>${cappello ? `<span class="sb-tenue" style="color:${c('testo-2')};font-weight:normal;letter-spacing:.04em;"> · ${esc(cappello)}</span>` : ''}</td></tr>
<tr><td class="sb-testo" style="padding:0 28px 6px;font-size:25px;line-height:1.2;font-weight:bold;letter-spacing:-.015em;">${esc(titolo)}</td></tr>
<tr><td class="sb-testo" style="padding:6px 28px 26px;font-size:16px;line-height:1.55;">${corpo}</td></tr>
${codice ? `<tr><td class="sb-bordo" style="padding:14px 28px 0;border-top:1px solid ${c('border')};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sb-riquadro sb-bordo" style="background:${c('surface-2-tinta')};border:1px solid ${c('border')};border-radius:10px;"><tr><td style="padding:10px 14px;">
<div class="sb-tenue" style="font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:${c('testo-2')};">Codice di verifica di questa settimana</div>
<div class="sb-testo" style="margin-top:3px;font-size:19px;font-weight:bold;letter-spacing:.12em;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">${esc(codice)}</div>
<div class="sb-tenue" style="margin-top:4px;font-size:12px;line-height:1.45;color:${c('testo-2')};">Lo ritrovi nel tuo pannello, alla scheda «Il tuo account». Se non combacia, questa mail non l’abbiamo scritta noi: non aprire i collegamenti.</div>
</td></tr></table></td></tr>` : ''}
<tr><td class="sb-tenue sb-bordo" style="padding:14px 28px 20px;${codice ? '' : `border-top:1px solid ${c('border')};`}font-size:12px;line-height:1.5;color:${c('testo-2')};">${piede || 'SocialBot · socialbot.live'}</td></tr>
</table></td></tr></table></body></html>`;
}

// I NUMERI CHE SI GUARDANO PER PRIMI: nel pannello sono riquadri con un numero
// grosso e una parola sotto, e qui sono gli stessi, in tabella perche' e' cio'
// che la posta capisce. Tre: il quarto non si guarda piu', si legge.
export function numeriHtml(voci) {
  const c = (n) => cq(n);
  const v = (voci || []).filter(Boolean).slice(0, 3);
  if (!v.length) return '';
  const largo = Math.floor(100 / v.length);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:2px 0 6px;"><tr>${v.map((x, i) => `<td width="${largo}%" style="padding:0 ${i === v.length - 1 ? 0 : 8}px 0 ${i ? 8 : 0}px;" valign="top">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sb-riquadro sb-bordo" style="background:${c('surface-2-tinta')};border:1px solid ${c('border')};border-radius:10px;"><tr><td align="center" style="padding:14px 4px 12px;">
<div class="sb-testo" style="font-size:30px;line-height:1;font-weight:bold;letter-spacing:-.02em;">${esc(x.n)}</div>
<div class="sb-tenue" style="margin-top:5px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${c('testo-2')};">${esc(x.che)}</div>
</td></tr></table></td>`).join('')}</tr></table>`;
}

// DUE COLONNE CHE SI IMPILANO DA SOLE. Non con una regola condizionale: quelle
// certi programmi non le leggono, e resterebbero in colonna anche su uno schermo
// largo. Due blocchi affiancati con una larghezza massima si mettono uno sotto
// l'altro appena lo spazio non basta, e questo lo sanno fare tutti. Il commento
// per Outlook e' l'unico che serve, perche' lui i blocchi affiancati non li fa.
export function dueColonneHtml(a, b) {
  return `<div style="font-size:0;text-align:left;margin-top:4px;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" valign="top"><![endif]-->
<div style="display:inline-block;width:100%;max-width:280px;vertical-align:top;font-size:16px;padding-right:12px;box-sizing:border-box;">${a}</div>
<!--[if mso]></td><td width="50%" valign="top"><![endif]-->
<div style="display:inline-block;width:100%;max-width:280px;vertical-align:top;font-size:16px;box-sizing:border-box;">${b}</div>
<!--[if mso]></td></tr></table><![endif]-->
</div>`;
}

// Il titoletto di un gruppo: dice che sotto cambia argomento.
export function sezioneHtml(testo) {
  return `<div class="sb-tenue" style="margin:22px 0 8px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;font-weight:bold;color:${cq('testo-2')};">${esc(testo)}</div>`;
}

// Il podio. Una riga di nomi separati da virgole andava a capo male, e chi fosse
// il primo non si capiva.
export function podioHtml(voci, { che = '' } = {}) {
  const c = (n) => cq(n);
  const righe = (voci || []).slice(0, 3).map((v, i) => `<tr>
<td width="28" valign="top" style="padding:5px 0;font-size:15px;font-weight:bold;"><span class="sb-acc" style="color:${c('acc')};">${i + 1}°</span></td>
<td valign="top" class="sb-testo" style="padding:5px 0;font-size:16px;font-weight:bold;">${esc(v.user)}</td>
<td align="right" valign="top" class="sb-tenue" style="padding:5px 0;font-size:14px;color:${c('testo-2')};">${esc(v.n)}${che ? ' ' + esc(che) : ''}</td></tr>`).join('');
  return righe ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${righe}</table>` : '';
}

// Una cosa che si apre: un titolo che e' il link, e sotto da dove viene. Serve
// alle clip, ed e' l'unico pezzo del rapporto che si riguarda.
export function cartaLinkHtml({ titolo, link, nota = '' }) {
  const c = (n) => cq(n);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="sb-riquadro sb-bordo" style="background:${c('surface-2-tinta')};border:1px solid ${c('border')};border-radius:10px;padding:10px 14px;">
<a class="sb-acc" href="${esc(link)}" style="color:${c('acc')};font-weight:bold;font-size:15px;text-decoration:none;">${esc(titolo)}</a>
${nota ? `<div class="sb-tenue" style="margin-top:2px;font-size:12px;color:${c('testo-2')};">${esc(nota)}</div>` : ''}
</td></tr><tr><td height="8"></td></tr></table>`;
}
export function tastoHtml(testo, link) {
  const acc = (() => { try { return tinta('acc'); } catch { return '#ba007a'; } })();
  return `<a class="sb-tasto" href="${esc(link)}" style="display:inline-block;padding:12px 22px;background:${acc};color:#ffffff;text-decoration:none;font-weight:bold;border-radius:8px;font-size:15px;">${esc(testo)}</a>`;
}
export function rigaHtml(etichetta, valore) {
  const t2 = (() => { try { return tinta('testo-2'); } catch { return '#666'; } })();
  return `<tr><td class="sb-tenue" style="padding:5px 0;color:${t2};font-size:14px;width:44%;">${esc(etichetta)}</td><td class="sb-testo" style="padding:5px 0;font-size:16px;font-weight:bold;">${esc(valore)}</td></tr>`;
}

// La stessa cosa per chi la posta la legge in solo testo: senza, sarebbe
// l'unico a non poter verificare niente.
export const codiceTesto = (codice) => (codice
  ? `\n\nCodice di verifica di questa settimana: ${codice}\nLo ritrovi nel tuo pannello, alla scheda «Il tuo account». Se non combacia, questa mail non l’abbiamo scritta noi.`
  : '');

// ---------------------------------------------------------------- le mail che partono
// La mail di conferma dell'indirizzo: chi la riceve deve poter capire in una
// riga perche' e' arrivata e cosa succede se non clicca (niente).
export function mailConferma({ display = '', link, codice = '' }) {
  const corpo = `<p style="margin:0 0 14px;">Qualcuno, dal pannello di SocialBot${display ? ` del canale <b>${esc(display)}</b>` : ''}, ha scritto questo indirizzo per ricevere il rapporto a fine diretta.</p>
<p style="margin:0 0 18px;">Se sei tu, conferma con il tasto qui sotto. Il collegamento vale un giorno.</p>
<p style="margin:0 0 18px;">${tastoHtml('Conferma l’indirizzo', link)}</p>
<p style="margin:0;color:#5c5852;font-size:14px;">Se non sei stato tu, non fare niente: senza il clic questo indirizzo non riceverà mai nulla.</p>`;
  return {
    html: guscioHtml({ titolo: 'Conferma l’indirizzo', cappello: display || '', corpo, codice,
      piede: 'SocialBot · socialbot.live · questa mail arriva una volta sola, per la conferma.' }),
    testo: `Qualcuno, dal pannello di SocialBot${display ? ` del canale ${display}` : ''}, ha scritto questo indirizzo per ricevere il rapporto a fine diretta.\nSe sei tu, conferma qui (vale un giorno): ${link}\nSe non sei stato tu, non fare niente.${codiceTesto(codice)}`,
  };
}

// Un riposo fra due richieste di conferma dello stesso canale: dieci minuti.
const conferme = new Map();
export const RIPOSO_CONFERMA_MS = 10 * 60_000;
export function riposoConferma(channel, ora = Date.now()) {
  const ch = String(channel || '').toLowerCase();
  if (ora - (conferme.get(ch) || 0) < RIPOSO_CONFERMA_MS) return false;
  conferme.set(ch, ora);
  return true;
}
