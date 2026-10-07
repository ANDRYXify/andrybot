// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I FILI DEI PREMI A TEMPO (docs/PREMI-A-TEMPO.md). Il motore lo provano le
// prove di unita'; qui si guarda che i pezzi siano attaccati dove servono:
//  · il riscatto passa dal tempo prima di festeggiare, e la penitenza ha il suo;
//  · le modalita' della chat avvisano chi mostra i tempi, e il bot riprende
//    dopo un riavvio;
//  · !tempi vale su ogni piattaforma, non solo su Twitch;
//  · il server sceglie la piattaforma dall'id del premio, non dal pannello, e
//    toglie l'avviso di un premio senza toglierne il tempo;
//  · il pezzo dell'overlay sta in tutti gli elenchi dove sta un pezzo;
//  · la fine e' un evento dei Moduli, e il pannello lo sa offrire.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const BOT = leggi('src/bot.js');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const OVL = leggi('src/web/public/overlay-app.js');
const ALR = leggi('src/features/alerts.js');
const MOD = leggi('src/features/modules.js');
const tra = (testo, da, a) => { const i = testo.indexOf(da); assert.ok(i >= 0, `manca: ${da}`); const j = testo.indexOf(a, i + da.length); return testo.slice(i, j < 0 ? undefined : j); };

test('il riscatto: prima il tempo e la penitenza, poi la festa; senza tempo come prima', () => {
  const r = tra(BOT, '  _riscatto(channel, data) {', '\n  }\n');
  const iTempo = r.indexOf('premiTempo.tempoDelRiscatto(channel, data)');
  const iPen = r.indexOf('this.penitenze?.daRiscatto(channel, data, { secondi: tempo?.durata })');
  const iMotore = r.indexOf('this.premiTempo.daRiscatto(channel, data, tempo,');
  assert.ok(iTempo > 0 && iPen > iTempo && iMotore > iPen, 'il tempo si legge una volta, la penitenza dura quanto il premio, poi il motore');
  assert.match(r, /if \(tempo && !penitenza\) \{/, 'una penitenza ha la sua carta: il tempo generico non parte');
  assert.match(r, /avviso: \(o\) => this\._premioRiscattato\(channel, data, dire, premiatore, o\)/, 'effetto e messaggio li fa partire il motore, dopo');
  assert.match(r, /\} else this\._premioRiscattato\(channel, data, dire, premiatore\);/);
  const p = tra(BOT, '  _premioRiscattato(channel, data,', '\n  }\n');
  assert.match(p, /\{ chiudi = true, durata = '' \} = \{\}/);
  assert.match(p, /if \(chiudi\) Promise\.resolve\(premiatore\?\.aggiornaRedemption/, 'un riscatto si chiude una volta sola');
  assert.match(p, /\.replace\(\/\\\{durata\\\}\/g, durata\)/, '{durata} nel messaggio del premio');
});

test('il motore e\' acceso, ascolta le modalita\' della chat, riprende e si spegne', () => {
  assert.match(BOT, /this\.premiTempo = new premiTempo\.PremiATempo\(\{[\s\S]*?modalita: this\.modalita,[\s\S]*?vip: \(ch, login, ms, doppio\) => vip\.vipPerPremio\(this\.helix, ch, login, ms, doppio\),/);
  assert.match(BOT, /this\.modalita\.quandoCambia = \(ch\) => this\.premiTempo\.manda\(ch\);\n\s*this\.premiTempo\.riprendi\(\);/);
  assert.match(BOT, /type: 'premio\.tempo\.fine'/, 'la fine e\' un evento');
  assert.match(BOT, /this\.premiTempo\?\.spegni\(\);/);
});

test('!tempi vale anche su Kick: sta fuori dal blocco solo Twitch', () => {
  const blocco = tra(BOT, "    if (!msg.piattaforma || msg.piattaforma === 'twitch') {\n      this.antibot?.tryComando", '\n    }\n');
  assert.doesNotMatch(blocco, /premiTempo\.tryComando/);
  assert.match(BOT, /premiTempo\.tryComando\(this\.premiTempo, cmdMsg, parla\)/);
});

test('il server: la piattaforma la dice l\'id, una scelta di serie non si scrive, l\'avviso si toglie senza il tempo', () => {
  const r = tra(SRV, "app.post('/api/streamer/premi/tempi',", '}));');
  assert.match(r, /const piattaforma = kickApi\.eIdKick\(rewardId\) \? 'kick' : 'twitch';/);
  assert.match(r, /premiTempo\.normTempo\(r\?\.tempo, piattaforma\)/);
  assert.match(r, /tempo: premiTempo\.eDiSerie\(n\.tempo\) \? null : n\.tempo/);
  assert.match(r, /return res\.status\(400\)\.json\(\{ errore: ERRORI_TEMPO\[n\.errore\][^}]*codice: n\.errore/, 'il pannello riceve il codice e lo dice nella sua lingua');
  const f = tra(SRV, "app.post('/api/streamer/premi/tempi/ferma',", '}));');
  assert.match(f, /\^\(p:\[A-Za-z0-9-\]\{1,64\}\|m:\(emote\|unici\|sub\)\)\$/);
  assert.match(f, /manager\.premiTempo\?\.ferma\(login, chiave\)/);
  const g = tra(SRV, "app.get('/api/streamer/premi',", '}));');
  assert.match(g, /tempi: tempiDeiPremi\(login, tutti\),\n\s*inCorso: premiTempo\.inCorso\(login\),/);
  const s = tra(SRV, "app.post('/api/streamer/premi/suono',", '}));');
  assert.match(s, /pointAlerts\.togliAvviso\(login, rewardId\)/);
  assert.doesNotMatch(s, /pointAlerts\.remove\(/);
});

test('il pezzo dell\'overlay sta dove sta ogni pezzo', () => {
  assert.match(SRV, /const ELEM_OVERLAY = \[[^\]]*'tempi'/);
  assert.match(APP, /const ELEM_OVL = \[[^\]]*'tempi'/);
  assert.match(APP, /\['tempi', '#sez-tempi'\]/);
  assert.match(APP, /tempi: _vestiTempi,/);
  assert.match(APP, /tempi: _defTempi,/);
  assert.match(APP, /out\.push\(\{ k: 'tempi', ico: ICO\.orologio,[^}]*cfg: 'overlayTempi' \}\);/);
  assert.match(APP, /for \(const k of new Set\(\[\.\.\.document\.querySelectorAll\('\[data-cfg\]'\)\]\.map\(\(n\) => n\.dataset\.cfg\)\)\) riempiCfgForm\(k\);/, 'il suo modulo si riempie come ogni modulo che c\'e\'');
  assert.match(APP, /data-cfg="tempi"/);
  assert.match(SRV, /if \(b\.overlayTempi !== undefined\) out\.overlayTempi = normTempi\(b\.overlayTempi\);/);
  assert.match(SRV, /'overlayPubblicita', 'overlayTempi', 'overlayTreno'/, 'cambiarlo ricarica gli overlay aperti');
  assert.match(ALR, /tempi: \(s\.overlayTempi && typeof s\.overlayTempi === 'object'\) \? \{ \.\.\.s\.overlayTempi, elenco: tempiInCorso\(channel\) \} : null,/);
  assert.match(OVL, /else if \(dati\.tipo === 'tempi'\) \{ MIO\.tempiElenco = /);
  assert.match(OVL, /MIO\.tempi = t\.tempi \|\| null;/);
});

test('la fine e\' un evento dei Moduli, e il pannello lo offre', () => {
  assert.match(MOD, /'premio\.tempo\.fine': 'finetempo',/);
  assert.match(APP, /\['finetempo', 'Finisce il tempo di un premio',/);
  assert.match(APP, /finetempo: \['finisce il tempo di un premio/);
});

test('la carta del pannello: un salva, il rimedio della piattaforma, e si ridisegna coi dati del server', () => {
  assert.match(APP, /<div class="carta" data-zona="punti" id="carta-tempi">/);
  assert.match(APP, /id="btn-salva-tempi"/);
  const d = tra(APP, 'function _disegnaTempiPremi(d) {', '\nfunction _modoTempo(');
  assert.match(d, /_premiFuoriDaTwitch\(d\) \? /);
  assert.match(d, /api\('\/api\/streamer\/premi\/tempi', \{ method: 'POST', body: \{ premi \} \}\)/);
  assert.match(d, /_ERRORI_TEMPO\(\)\[cod\]/);
  assert.match(APP, /_disegnaTempiPremi\(d\);/, 'si disegna dalla stessa lettura della carta dei suoni: Twitch si chiama una volta');
  const leggiT = tra(APP, 'function _leggiTempo(li) {', '\n}\n');
  assert.match(leggiT, /spento: modo === 'no' && Number\(li\.dataset\.dalNome\) > 0/, '«non e\' a tempo» si scrive solo se il nome dice un tempo');
});
