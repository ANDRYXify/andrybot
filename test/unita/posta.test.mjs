// LA POSTA DI CASA: il messaggio si compone, si firma (DKIM) e si consegna in
// SMTP a un server finto sulla porta locale; senza chiave la posta e' spenta.
import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import crypto from 'node:crypto';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-posta-');
// LA PROVA NON DEVE SAPERE SU CHE MACCHINA GIRA. Sul server vero il .env ha
// MAIL_HELO, MAIL_DA, MAIL_NOME: se la prova li leggesse, direbbe «rotto» su
// una configurazione giusta e il deploy si fermerebbe per niente. E' successo.
// Percio' si sgombera TUTTA la famiglia MAIL, e si mette solo cio' che serve
// qui: cosi' vale anche per le variabili che aggiungeremo domani.
for (const k of Object.keys(process.env)) if (k === 'MAIL' || k.startsWith('MAIL_')) delete process.env[k];
process.env.MAIL_DOMINIO = 'prova.example';
process.env.MAIL_DA = 'rapporti@prova.example';
const p = await import('../../src/features/posta.js');
process.on('exit', () => usaEGetta.pulisci());

function serverFinto({ rifiutaRcpt = false } = {}) {
  const st = { messaggi: [], comandi: [] };
  const srv = net.createServer((s) => {
    let inData = false, buf = '', corpo = '';
    s.write('220 finto.example ESMTP\r\n');
    s.on('data', (d) => {
      buf += d.toString('utf8');
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const riga = buf.slice(0, i); buf = buf.slice(i + 2);
        if (inData) {
          if (riga === '.') { inData = false; st.messaggi.push(corpo); corpo = ''; s.write('250 2.0.0 ok: queued as 42\r\n'); }
          else corpo += (riga.startsWith('..') ? riga.slice(1) : riga) + '\r\n';
          continue;
        }
        st.comandi.push(riga);
        const cmd = riga.split(' ')[0].toUpperCase();
        if (cmd === 'EHLO') s.write('250-finto.example saluta\r\n250 8BITMIME\r\n');
        else if (cmd === 'MAIL') s.write('250 2.1.0 ok\r\n');
        else if (cmd === 'RCPT') s.write(rifiutaRcpt ? '550 5.1.1 nessuna casella\r\n' : '250 2.1.5 ok\r\n');
        else if (cmd === 'DATA') { inData = true; s.write('354 vai\r\n'); }
        else if (cmd === 'QUIT') { s.write('221 ciao\r\n'); s.end(); }
        else s.write('500 boh\r\n');
      }
    });
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({ st, via: { host: '127.0.0.1', port: srv.address().port }, chiudi: () => srv.close() })));
}
const decodifica = (grezzo) => Buffer.from(grezzo.replace(/\s+/g, ''), 'base64').toString('utf8');

test('il messaggio: intestazioni giuste, oggetto in UTF-8, due parti in base64', () => {
  const m = p.componi({ da: 'rapporti@prova.example', a: 'io@altro.example', oggetto: 'Diretta finita: 2h 14m', testo: 'ciao', html: '<b>ciao</b>', data: new Date(Date.UTC(2026, 8, 17, 7, 0, 0)), id: 'abc' });
  const h = Object.fromEntries(m.intestazioni);
  assert.equal(h.Subject, 'Diretta finita: 2h 14m', 'un oggetto ASCII resta com\'e\'');
  assert.equal(h.Date, 'Thu, 17 Sep 2026 07:00:00 +0000');
  assert.equal(h['Message-ID'], '<abc@prova.example>');
  assert.match(h['Content-Type'], /^multipart\/alternative; boundary="sb-[0-9a-f]{16}"$/);
  assert.equal(p.oggettoCodificato('È finita'), '=?UTF-8?B?w4ggZmluaXRh?=');
  const parti = m.corpo.split(/--sb-[0-9a-f]{16}/).filter((x) => x.trim() && x.trim() !== '--');
  assert.equal(parti.length, 2);
  assert.equal(decodifica(parti[0].split('\r\n\r\n')[1]), 'ciao');
  assert.equal(decodifica(parti[1].split('\r\n\r\n')[1]), '<b>ciao</b>');
  assert.ok(p.serializza(m).startsWith('From: rapporti@prova.example\r\nTo: io@altro.example\r\n'));
});

test('DKIM: canonizzazione rilassata e una firma che la chiave pubblica verifica', () => {
  assert.equal(p.corpoRilassato('a  b \r\n\r\n\r\n'), 'a b\r\n');
  assert.equal(p.corpoRilassato(''), '');
  assert.equal(p.intestazioneRilassata('Subject', ' Ciao\r\n  mondo '), 'subject:Ciao mondo');
  assert.equal(p.attiva(), false, 'senza chiave la posta e\' spenta');
  const { pubblica } = p.generaChiave({ bits: 1024 });
  assert.equal(p.attiva(), true);
  const pem = p.chiavePrivata();
  const m = p.componi({ da: 'rapporti@prova.example', a: 'io@altro.example', oggetto: 'prova', testo: 'x', dom: 'prova.example' });
  const [nome, valore] = p.firmaDkim({ intestazioni: m.intestazioni, corpo: m.corpo, dom: 'prova.example', sel: 'sb1', pem, ora: 1_800_000_000_000 });
  assert.equal(nome, 'DKIM-Signature');
  assert.match(valore, /^v=1; a=rsa-sha256; c=relaxed\/relaxed; d=prova\.example; s=sb1; t=1800000000; h=from:to:subject:date:message-id:mime-version:content-type; bh=[A-Za-z0-9+/=]+; b=[A-Za-z0-9+/=]+$/);
  const bh = /bh=([^;]+);/.exec(valore)[1];
  assert.equal(bh, crypto.createHash('sha256').update(p.corpoRilassato(m.corpo)).digest('base64'));
  const b = /b=(.*)$/.exec(valore)[1];
  const testa = valore.slice(0, valore.length - b.length);
  const scelte = p.FIRMATE.map((n) => m.intestazioni.find(([k]) => k.toLowerCase() === n)).filter(Boolean);
  const chiavePubblica = crypto.createPublicKey({ key: Buffer.from(pubblica, 'base64'), format: 'der', type: 'spki' });
  assert.equal(crypto.verify('sha256', Buffer.from(p.daFirmare(scelte, testa), 'utf8'), chiavePubblica, Buffer.from(b, 'base64')), true);
  const rec = p.recordDns({ dom: 'prova.example', sel: 'sb1', ip: '1.2.3.4', pubblica });
  assert.deepEqual(rec.map((r) => [r.nome, r.tipo]), [['prova.example', 'TXT'], ['sb1._domainkey.prova.example', 'TXT'], ['_dmarc.prova.example', 'TXT']]);
  assert.equal(rec[0].valore, 'v=spf1 ip4:1.2.3.4 -all');
  assert.ok(rec[1].valore.startsWith('v=DKIM1; k=rsa; p=' + pubblica.slice(0, 20)));
});

test('SMTP: consegna a un server finto, con i punti raddoppiati e la sequenza giusta', async () => {
  const f = await serverFinto();
  try {
    const msg = 'From: a@prova.example\r\nTo: b@altro.example\r\nSubject: x\r\n\r\nriga\r\n.punto\r\nfine';
    const r = await p.consegna({ a: 'b@altro.example', da: 'a@prova.example', messaggio: msg, helo: 'prova.example', via: f.via });
    assert.equal(r.ok, true); assert.match(r.risposta, /queued as 42/);
    await new Promise((ok) => setTimeout(ok, 50));
    assert.deepEqual(f.st.comandi, ['EHLO prova.example', 'MAIL FROM:<a@prova.example>', 'RCPT TO:<b@altro.example>', 'DATA', 'QUIT']);
    assert.equal(f.st.messaggi[0], msg + '\r\n', 'il punto a inizio riga arriva com\'era');
  } finally { f.chiudi(); }
  const g = await serverFinto({ rifiutaRcpt: true });
  try {
    await assert.rejects(() => p.consegna({ a: 'nessuno@altro.example', da: 'a@prova.example', messaggio: 'x', helo: 'prova.example', via: g.via }), (e) => e.permanente === true && /550/.test(e.message));
  } finally { g.chiudi(); }
  const chiuso = await serverFinto(); chiuso.chiudi();
  await new Promise((ok) => setTimeout(ok, 30));
  await assert.rejects(() => p.consegna({ a: 'x@altro.example', messaggio: 'x', via: chiuso.via, timeoutMs: 2000 }), (e) => e.passo === 'rete' && /porta 25/.test(e.message));
});

test('invia: composta, firmata e consegnata; senza chiave si rifiuta; gli indirizzi si controllano', async () => {
  assert.equal(p.indirizzoOk('io@altro.example'), true);
  for (const x of ['', 'senza', 'a@b', 'a b@c.it', '<a@b.it>', 'a@b.it'.padStart(300, 'x')]) assert.equal(p.indirizzoOk(x), false, x);
  const f = await serverFinto();
  try {
    const r = await p.invia({ a: 'io@altro.example', oggetto: 'Diretta finita: 1h', testo: 'ciao', html: '<p>ciao</p>', via: f.via });
    assert.equal(r.ok, true); assert.match(r.id, /^[0-9a-f]{24}$/);
    await new Promise((ok) => setTimeout(ok, 50));
    const m = f.st.messaggi[0];
    assert.ok(m.startsWith('DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=prova.example; s=sb1;'), 'firmata, e la firma sta in cima');
    // Nell'elenco della posta si legge il NOME, non il pezzo prima della
    // chiocciola: senza, Gmail scrive «rapporti». La busta invece resta il solo
    // indirizzo, come vuole SMTP, se no il destinatario la rifiuta.
    assert.ok(m.includes('\r\nFrom: SocialBot <rapporti@prova.example>\r\nTo: io@altro.example\r\nSubject: Diretta finita: 1h\r\n'));
    assert.ok(f.st.comandi.includes('MAIL FROM:<rapporti@prova.example>'), 'la busta porta il solo indirizzo');
    await assert.rejects(() => p.invia({ a: 'non-valido', oggetto: 'x', via: f.via }), /indirizzo non valido/);
  } finally { f.chiudi(); }
  process.env.MAIL = 'no';
  assert.equal(p.attiva(), false);
  await assert.rejects(() => p.invia({ a: 'io@altro.example', oggetto: 'x' }), /non e' configurata/);
  delete process.env.MAIL;
});

test('il guscio HTML: i colori del tema, il testo protetto, un tasto', () => {
  const h = p.guscioHtml({ titolo: 'Diretta <finita>', corpo: '<p>x</p>', piede: 'piede' });
  assert.ok(h.includes('Diretta &lt;finita&gt;') && h.includes('<p>x</p>') && h.includes('piede'));
  assert.ok(/#ba007a/i.test(h), 'l\'accento del marchio, letto da tema.css');
  assert.ok(p.tastoHtml('Conferma', 'https://x.example/c?t=1').includes('href="https://x.example/c?t=1"'));
  assert.ok(p.rigaHtml('Picco', 48).includes('>48<'));
});

test('il nome con cui ci si presenta e\' una cosa che si dice, e la mail lo usa', async () => {
  // Il cerchio che chiude chi riceve: EHLO → A → l'IP che manda → reverse DNS →
  // lo stesso nome. Il dominio del sito va bene finche' l'IP dichiara proprio
  // quello; quando l'IP si chiama `mail.<dominio>` — il caso normale — il nome
  // va detto, se no il cerchio resta aperto e la mail perde punti.
  assert.equal(p.nomeHelo(), 'prova.example', 'di serie e\' il dominio');
  process.env.MAIL_HELO = 'Mail.Prova.Example';
  try {
    assert.equal(p.nomeHelo(), 'mail.prova.example', 'e si scrive come si vuole');
    const f = await serverFinto();
    try {
      await p.invia({ a: 'io@altro.example', oggetto: 'x', testo: 'y', via: f.via });
      await new Promise((ok) => setTimeout(ok, 50));
      assert.equal(f.st.comandi[0], 'EHLO mail.prova.example', 'una mail vera si presenta con quel nome');
    } finally { f.chiudi(); }
  } finally { delete process.env.MAIL_HELO; }
  assert.equal(p.nomeHelo(), 'prova.example');
});

test('il codice della settimana: per canale, per settimana, e senza lettere che si confondono', () => {
  const lun = Date.UTC(2026, 8, 14, 9, 0);      // lunedì
  const dom = Date.UTC(2026, 8, 20, 23, 0);     // domenica della stessa settimana
  const poi = Date.UTC(2026, 8, 21, 0, 30);     // lunedì dopo

  assert.equal(p.settimanaDi(lun), '2026-W38');
  assert.equal(p.settimanaDi(dom), '2026-W38', 'la settimana finisce la domenica');
  assert.equal(p.settimanaDi(poi), '2026-W39');
  assert.equal(p.settimanaDi(Date.UTC(2027, 0, 1)), '2026-W53', 'il primo gennaio puo\' stare nell\'anno prima');

  const c = p.codiceDi('canale', lun);
  assert.match(c, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/, 'niente 0/O e 1/I/L: si confondono a occhio');
  assert.equal(p.codiceDi('canale', dom), c, 'dentro la settimana non cambia');
  assert.equal(p.codiceDi('CANALE', lun), c, 'e il nome del canale non e\' sensibile alle maiuscole');
  assert.notEqual(p.codiceDi('canale', poi), c, 'la settimana dopo e\' un altro');
  assert.notEqual(p.codiceDi('altro', lun), c, 'e un altro canale ha il suo');
});

test('i codici del mese: quelli gia\' usati, il piu\' recente segnato, nessuno futuro', () => {
  const ora = Date.UTC(2026, 8, 17, 12, 0);
  const m = p.codiciDelMese('canale', ora);
  assert.ok(m.length >= 2 && m.length <= 6, `settimane del mese: ${m.length}`);
  assert.deepEqual(m.map((x) => x.settimana), [...new Set(m.map((x) => x.settimana))], 'nessuna ripetuta');
  assert.ok(m.every((x) => x.dal <= ora), 'nessuna settimana che deve ancora cominciare');
  assert.equal(m.filter((x) => x.corrente).length, 1, 'una sola e\' quella di adesso');
  assert.equal(m[m.length - 1].corrente, true, 'ed e\' l\'ultima');
  assert.equal(m[m.length - 1].codice, p.codiceDi('canale', ora));
  for (const x of m) assert.equal(new Date(x.dal).getUTCDay(), 1, 'ogni settimana comincia di lunedì');
});

test('il codice sta in fondo a ogni mail, in tutte e due le forme', () => {
  const h = p.guscioHtml({ titolo: 'x', corpo: '<p>y</p>', codice: 'AB23-CD45' });
  assert.ok(h.includes('AB23-CD45') && h.includes('Codice di verifica di questa settimana'));
  assert.ok(h.includes('scheda Stato'), 'e dice dove ritrovarlo');
  assert.ok(!p.guscioHtml({ titolo: 'x', corpo: 'y' }).includes('Codice di verifica'), 'senza codice non si inventa un riquadro vuoto');
  assert.ok(p.codiceTesto('AB23-CD45').includes('AB23-CD45'), 'anche per chi legge in solo testo');
  assert.equal(p.codiceTesto(''), '');
  const conf = p.mailConferma({ display: 'Tizio', link: 'https://x.example/c', codice: 'AB23-CD45' });
  assert.ok(conf.html.includes('AB23-CD45') && conf.testo.includes('AB23-CD45'));
});
