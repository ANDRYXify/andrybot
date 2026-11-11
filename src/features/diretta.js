// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL TRAMITE DELLA DIRETTA (docs/DIRETTA.md, «La beta»).
//
// L'invariante: il video lo codifica il dispositivo, qui non si decodifica e
// non si ricodifica mai. Il server riceve pacchetti H.264 gia' pronti, li scrive
// in un flusso Matroska e li passa a UN ffmpeg che li copia verso tutte le
// destinazioni insieme (`-c:v copy`, `-f tee`). L'unica conversione ammessa e'
// l'audio Opus in AAC, perche' le piattaforme non accettano Opus.
//
// La riserva: prima di partire il dispositivo consegna due secondi della sua
// immagine «torno subito» e un secondo di silenzio, codificati con lo stesso
// codificatore. Quando una traccia smette di arrivare, qui la si riempie con la
// riserva, nel tempo giusto, e la diretta non cade. Al ritorno il video
// riprende solo da un fotogramma chiave.
//
// Il margine (docs/DIRETTA.md, «Il margine: un intoppo non e' un "torno
// subito"»): i pacchetti stanno in una coda per traccia e escono quando
// l'orologio d'uscita arriva al loro tempo piu' il margine. La riserva entra
// solo a margine vuoto: un intoppo della linea o del server piu' corto del
// margine chi guarda non lo vede.
//
// Lo scudo: ogni diretta e' un permesso della classe `diretta` (src/risorse.js),
// entra solo se la banda dichiarata del server la regge, e chi manda piu' di
// quanto ha dichiarato viene fermato.
import { randomBytes } from 'node:crypto';
import { risorse as risorseDiSerie } from '../risorse.js';
import { testata, creaScrittore, TRACCIA, leggiPacchi } from './diretta-mkv.js';

// Il margine, scelto dallo streamer prima di partire: di serie 3 secondi, da 1
// a 8. Piu' margine, piu' ritardo per chi guarda, meno intoppi.
export const MARGINE_MS = 3_000;
export const MARGINE_MIN_S = 1;
export const MARGINE_MAX_S = 8;
// Quello che arriva dal pannello, in secondi: un valore che non e' un numero
// vale quello di serie, gli altri si arrotondano dentro i confini.
export function normalizzaMargine(secondi) {
  const n = typeof secondi === 'string' && !secondi.trim() ? NaN : Number(secondi);
  if (secondi == null || !Number.isFinite(n)) return MARGINE_MS;
  return Math.min(MARGINE_MAX_S, Math.max(MARGINE_MIN_S, Math.round(n))) * 1000;
}
// Un buco nei tempi del video del dispositivo (un fotogramma saltato, la pagina
// inceppata un attimo) sotto il secondo resta un fotogramma fermo; sopra, va la
// riserva. Con la coda vuota invece basta un passo: il margine e' finito.
export const SALTO_VIDEO_MS = 1_000;
// Il ritardo di base di una traccia segue il pacchetto piu' puntuale dell'ultimo
// mezzo minuto, al piu' di 1 ms al secondo: tiene dietro alla deriva degli
// orologi (decine di parti per milione), non agli intoppi.
export const SCIVOLO = 0.001;
export const FINESTRA_PUNTUALE_MS = 10_000;
// Il giro del tramite: un giro che arriva tardi di piu' di un giro vuol dire
// che il server era fermo (sordo) da quando doveva arrivare.
export const PERIODO_GIRO_MS = 100;
export const ASSENZA_MAX_MS = 10 * 60_000;
export const FINESTRA_BYTE_MS = 10_000;
export const BITRATE_MAX_KBPS = 12_000;
export const CODA_MAX_BYTE = 16 * 1024 * 1024;

const TEE_VIETATI = /[|[\]\s\\]/;
export function indirizzoBuono(url) {
  const u = String(url || '');
  return /^rtmps?:\/\/[^/]+\/.+/i.test(u) && !TEE_VIETATI.test(u) && u.length <= 600;
}

// LA TRACCIA DEL VOD (docs/DIRETTA.md, «Tracce audio e VOD»). Twitch prende
// al piu' due tracce audio: la prima, classica, e' il live; la seconda, in FLV
// «enhanced» con numero di traccia 1, e' quella che finisce nel VOD. E' la
// stessa disposizione della «Twitch VOD Track» di OBS. ffmpeg la scrive cosi'
// dalla 7.1; prima scriverebbe due tracce classiche mischiate, e l'audio si
// romperebbe: per questo la traccia del VOD c'e' solo se ffmpeg e' abbastanza
// nuovo. Le altre piattaforme ricevono solo il live.
export const VOD_DESTINAZIONI = Object.freeze(['twitch']);
export function ffmpegMultitraccia(testoVersione) {
  const m = /ffmpeg version n?(\d+)\.(\d+)/i.exec(String(testoVersione || ''));
  return !!m && (Number(m[1]) > 7 || (Number(m[1]) === 7 && Number(m[2]) >= 1));
}
// La versione si chiede dalla porta dei processi (src/risorse.js), come ogni
// altro processo del bot.
const sondaDiSerie = (risorse, ffmpeg) => () => new Promise((ok) => {
  let p, out = '';
  try { p = risorse.avvia(ffmpeg, ['-version'], { stdio: ['ignore', 'pipe', 'ignore'] }); } catch { ok(false); return; }
  if (!p?.stdout?.on || !p.on) { ok(false); return; }
  p.stdout.on('data', (d) => { out += d; });
  p.on('error', () => ok(false));
  p.on('close', (codice) => ok(codice === 0 && ffmpegMultitraccia(out)));
});

// ffmpeg legge il Matroska dallo stdin e copia il video; l'audio si copia se
// e' AAC, si converte se e' Opus. Mai un codificatore video. Con la traccia
// del VOD, ogni destinazione sceglie i suoi flussi: Twitch tutti, le altre il
// video e il live.
export function argomenti(destinazioni, audioCodec, vod = false) {
  const scelta = (d) => (vod ? `:select=\\'${VOD_DESTINAZIONI.includes(d.id) ? 'v,a' : 'v,a:0'}\\'` : '');
  const tee = destinazioni.map((d) => `[f=flv:onfail=ignore:flvflags=no_duration_filesize${scelta(d)}]${d.url}`).join('|');
  return [
    '-hide_banner', '-loglevel', 'warning', '-nostats',
    '-f', 'matroska', '-i', 'pipe:0',
    '-map', '0:v:0', '-map', '0:a:0', ...(vod ? ['-map', '0:a:1'] : []),
    '-c:v', 'copy',
    ...(audioCodec === 'aac' ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '160k', '-ar', '48000']),
    '-f', 'tee', tee,
  ];
}

// UNA DESTINAZIONE CADUTA (docs/DIRETTA.md, «Partire senza sorprese»): con
// `onfail=ignore` ffmpeg va avanti con le altre e lo scrive cosi':
// «Slave muxer #1 failed: Connection refused, continuing with 1/2 slaves.».
// Il numero e' quello della destinazione nell'elenco del tee.
export function cadutaIn(riga) {
  const m = /Slave muxer #(\d+) failed: (.*?)(?:, continuing with \d+\/\d+ slaves)?\.?\s*$/.exec(String(riga || ''));
  return m ? { i: Number(m[1]), motivo: motivoCaduta(m[2]) } : null;
}
// Il motivo in parole: la piattaforma non risponde, ha chiuso (di solito la
// chiave), la connessione sicura non va, il nome non esiste, ffmpeg non sa
// quel protocollo.
export function motivoCaduta(testo) {
  const t = String(testo || '');
  if (/Protocol not found|Protocol not supported/i.test(t)) return 'protocollo';
  if (/resolve hostname|Name or service not known|name resolution|nodename nor servname/i.test(t)) return 'nome';
  if (/TLS|SSL|certificate|handshake|GnuTLS|OpenSSL/i.test(t)) return 'tls';
  if (/Connection refused|timed out|unreachable|No route to host/i.test(t)) return 'irraggiungibile';
  if (/Input\/output error|Broken pipe|End of file|reset by peer|Server error|Operation not permitted|Invalid data/i.test(t)) return 'rifiutata';
  return 'altro';
}

// COSA SA FARE QUESTO FFMPEG: le sue liste (-protocols, -muxers, -demuxers,
// -encoders) dicono se il tramite puo' partire e se sa l'RTMPS.
export function capacitaDa({ protocolli = '', muxer = '', demuxer = '', encoder = '' } = {}) {
  const uscite = (String(protocolli).split(/^Output:\s*$/m)[1] || '').split(/\s+/).filter(Boolean);
  const voce = (testo, flag, nome) => String(testo).split('\n').some((r) => { const m = /^\s*([A-Z.]{1,8})\s+(\S+)/.exec(r); return !!m && m[1].includes(flag) && m[2].split(',').includes(nome); });
  const serve = { rtmp: uscite.includes('rtmp'), tee: voce(muxer, 'E', 'tee'), flv: voce(muxer, 'E', 'flv'), matroska: voce(demuxer, 'D', 'matroska'), aac: voce(encoder, 'A', 'aac') };
  const manca = Object.keys(serve).filter((k) => !serve[k]);
  return { pronta: !manca.length, rtmps: uscite.includes('rtmps'), manca };
}
const sondaCapacitaDiSerie = (risorse, ffmpeg) => async () => {
  const leggi = (arg) => new Promise((ok) => {
    let out = '';
    let p;
    try { p = risorse.avvia(ffmpeg, ['-hide_banner', arg], { stdio: ['ignore', 'pipe', 'ignore'] }); } catch { ok(''); return; }
    p.stdout.on('data', (d) => { out += d; });
    p.on('error', () => ok(''));
    p.on('close', () => ok(out));
  });
  const [protocolli, muxer, demuxer, encoder] = [await leggi('-protocols'), await leggi('-muxers'), await leggi('-demuxers'), await leggi('-encoders')];
  return capacitaDa({ protocolli, muxer, demuxer, encoder });
};

const mascherato = (s, destinazioni) => destinazioni.reduce((t, d) => t.split(d.url).join(`[${d.nome || d.id}]`), String(s));

// I motivi per cui una diretta si chiude buttando la coda: chi manda troppo, o
// un ffmpeg che non c'e' piu'. In tutti gli altri la coda esce prima.
const SENZA_CODA = new Set(['troppo', 'coda', 'uscita-lenta', 'ffmpeg', 'uscita']);
const CAUSE = ['linea', 'server', 'dispositivo'];
const TRACCE = ['video', 'audio'];

export function creaTramite({ risorse = risorseDiSerie, ffmpeg = 'ffmpeg', ora = () => Date.now(), bandaMbps = 300, log = null, ogniMs = PERIODO_GIRO_MS, alCambio = null, sondaVod = sondaDiSerie(risorse, ffmpeg), sondaCapacita = sondaCapacitaDiSerie(risorse, ffmpeg) } = {}) {
  const sessioni = new Map();
  let giro = null, vodPossibile = false, capacita = null;
  Promise.resolve().then(sondaVod).then((si) => { vodPossibile = !!si; }, () => {});
  Promise.resolve().then(sondaCapacita).then((c) => { capacita = c || null; if (capacita && !capacita.pronta) log?.warn?.(`diretta: a ffmpeg manca ${capacita.manca.join(', ')}`); }, () => {});

  const kbpsImpegnati = () => [...sessioni.values()].reduce((n, s) => n + s.kbps * s.destinazioni.length, 0);

  // IL SERVER SORDO. Il giro batte ogni `periodo`; chi guarda il tempo (il giro
  // stesso o un pacchetto che arriva) e lo trova in ritardo di piu' di un giro
  // sa che il processo era fermo da quando il giro doveva battere: in quel
  // tempo non si leggeva niente dalla rete. I fermi si tengono due minuti.
  const periodo = ogniMs || PERIODO_GIRO_MS;
  let ultimoGiro = null;
  const fermi = [];
  function registraFermo(da, a) {
    const u = fermi[fermi.length - 1];
    if (u && da <= u.a) u.a = Math.max(u.a, a); else fermi.push({ da, a });
    while (fermi.length && fermi[0].a < a - 120_000) fermi.shift();
  }
  function osservaCiclo() {
    if (ultimoGiro == null) return;
    const adesso = ora();
    if (adesso - ultimoGiro > 2 * periodo) registraFermo(ultimoGiro + periodo, adesso);
  }
  const sordoFra = (da, a) => fermi.reduce((t, f) => t + Math.max(0, Math.min(a, f.a) - Math.max(da, f.da)), 0);
  function battito() {
    osservaCiclo();
    ultimoGiro = ora();
    for (const s of [...sessioni.values()]) curaTempo(s);
  }

  function accendiGiro() {
    if (giro || !ogniMs) return;
    ultimoGiro = ora();
    giro = setInterval(battito, ogniMs);
    giro.unref?.();
  }
  function spegniGiroSeVuoto() { if (!sessioni.size && giro) { clearInterval(giro); giro = null; ultimoGiro = null; } }

  function scrivi(s, buf) {
    const w = s.ff.stdin;
    if (s.finita || !w || w.destroyed || !w.writable) return;
    if (w.writableLength > CODA_MAX_BYTE) { fine(s, 'uscita-lenta'); return; }
    try { w.write(buf); } catch { /* ffmpeg gia' chiuso: lo dice l'uscita */ }
  }

  // L'orologio d'uscita: millisecondi di diretta, presi dal muro del server
  // dal primo fotogramma chiave in poi.
  const orologio = (s) => (s.muro0 == null ? 0 : ora() - s.muro0);
  // Il tempo di diretta che tocca mandare adesso, per traccia.
  const tocca = (s, tipo) => orologio(s) - s.margine - s.base[tipo];
  const passoDi = (s, tipo) => (tipo === 'video' ? (s.riserva?.durataV || 1000 / s.fps) : (s.riserva?.durataA || (s.audio === 'aac' ? 1024 / 48 : 20)));
  // L'ultimo tempo mandato; prima del primo, il punto d'aggancio.
  const ultimoDi = (s, tipo) => (Number.isFinite(s.ultimo[tipo]) ? s.ultimo[tipo] : s.aggancio - passoDi(s, tipo));

  // Un pacchetto esce solo se va avanti nei tempi della sua traccia.
  function esce(s, tipo, ms, chiave, dati, fuori) {
    if (ms <= s.ultimo[tipo]) return false;
    s.ultimo[tipo] = ms;
    fuori.push({ tipo, ms, chiave, dati });
    return true;
  }
  // La riserva dell'audio va in tutte e due le tracce, allo stesso istante: il
  // VOD non ha mai un buco che il live non ha.
  function esceRiserva(s, tipo, fuori) {
    const ms = ultimoDi(s, tipo) + passoDi(s, tipo);
    if (tipo === 'video') {
      const p = s.riserva.video[s.giroV++ % s.riserva.video.length];
      esce(s, 'video', ms, p.chiave, p.dati, fuori);
    } else {
      const p = s.riserva.audio[s.giroA++ % s.riserva.audio.length];
      if (esce(s, 'audio', ms, true, p.dati, fuori) && s.vod) esce(s, 'vod', ms, true, p.dati, fuori);
    }
    if (s.episodio) s.episodio.fine = Math.max(s.episodio.fine, ms);
  }
  // La riserva fino a `fino` compreso.
  function riempi(s, tipo, fino, fuori) {
    const passo = passoDi(s, tipo);
    while (ultimoDi(s, tipo) + passo <= fino) esceRiserva(s, tipo, fuori);
  }

  // GLI EPISODI DI RISERVA (docs/DIRETTA.md, «Le scelte fatte»): ognuno si
  // conta quando comincia, con la sua causa; la durata e' il tempo di diretta
  // coperto dalla riserva, e si somma quando tutte le tracce sono tornate vere.
  function entraRiserva(s, tipo, causa) {
    s.inRiserva[tipo] = true;
    if (tipo === 'video') s.giroV = 0; else s.giroA = 0;
    if (s.episodio) return;
    const da = ultimoDi(s, tipo) + passoDi(s, tipo);
    s.episodio = { causa, da, fine: da };
    s.conti.n++;
    s.conti.cause[causa].n++;
    log?.info?.(`diretta #${s.login}: riserva (${causa})`);
  }
  function chiudiEpisodio(s) {
    const e = s.episodio;
    if (!e) return;
    s.episodio = null;
    const ms = Math.max(0, e.fine - e.da);
    s.conti.ms += ms;
    s.conti.cause[e.causa].ms += ms;
    s.conti.ultima = { causa: e.causa, ms };
  }
  function esciRiserva(s, tipo, ms) {
    s.inRiserva[tipo] = false;
    if (s.episodio) s.episodio.fine = Math.max(s.episodio.fine, ms);
    if (!s.inRiserva.video && !s.inRiserva.audio) chiudiEpisodio(s);
  }
  // Di chi era il buco: del server se, mentre il pacchetto che manca doveva
  // arrivare, il server e' stato sordo; del dispositivo se il buco e' nei suoi
  // tempi, se l'altra traccia arriva (solo audio voluto) o se sta riprendendo;
  // altrimenti della linea.
  function causaDi(s, tipo, nelDispositivo) {
    const atteso = ultimoDi(s, tipo) + passoDi(s, tipo) + s.base[tipo];
    if (sordoFra(s.muro0 + atteso, ora()) > 0) return 'server';
    const altro = tipo === 'video' ? 'audio' : 'video';
    if (nelDispositivo || s.riancora || (!s.inRiserva[altro] && ora() - s.arrivo[altro] < s.margine / 2)) return 'dispositivo';
    return 'linea';
  }

  // Una traccia, al momento di mandare: esce quello che e' pronto, nell'ordine;
  // dalla riserva si torna solo con un pacchetto che va avanti (e per il video
  // con un fotogramma chiave). Poi, se non c'e' niente di pronto, si decide se
  // il margine e' finito.
  function scorri(s, tipo, limite, fuori, decide) {
    const coda = s.coda[tipo], video = tipo === 'video';
    while (coda.length && coda[0].ms <= limite) {
      const p = coda.shift();
      s.codaByte -= p.peso;
      if (p.ms <= s.ultimo[tipo]) continue;
      if (s.inRiserva[tipo]) {
        // gia' coperto dalla riserva (anche solo in parte): si scarta
        if ((video && !p.chiave) || p.ms < s.ultimo[tipo] + passoDi(s, tipo) / 2) continue;
        if (s.riserva) riempi(s, tipo, p.ms - passoDi(s, tipo) / 2 - 1e-6, fuori);
        esciRiserva(s, tipo, p.ms);
      }
      if (esce(s, tipo, p.ms, p.chiave, p.dati, fuori) && p.vod && s.vod) esce(s, 'vod', p.ms, true, p.vod, fuori);
    }
    if (!decide || !s.riserva) return;
    const passo = passoDi(s, tipo), ultimo = ultimoDi(s, tipo);
    if (!s.inRiserva[tipo]) {
      if (ultimo + passo > limite) return;
      let nelDispositivo = false;
      if (coda.length) {
        // un buco nei tempi del dispositivo: il prossimo pacchetto c'e' gia'
        if (coda[0].ms - ultimo <= (video ? SALTO_VIDEO_MS : passo * 1.5)) return;
        nelDispositivo = true;
      } else {
        // coda vuota: il margine e' finito se la linea ha avuto un margine
        // intero di tempo in cui il server ascoltava
        const atteso = ultimo + passo + s.base[tipo];
        if (orologio(s) - atteso - sordoFra(s.muro0 + atteso, ora()) <= s.margine) return;
      }
      entraRiserva(s, tipo, causaDi(s, tipo, nelDispositivo));
    }
    riempi(s, tipo, limite, fuori);
  }

  // Il ritardo di base di una traccia (docs/DIRETTA.md, «Le scelte fatte»):
  // il ritardo d'arrivo piu' piccolo dell'ultimo mezzo minuto, in cassetti di
  // dieci secondi, e la base gli va incontro al piu' di SCIVOLO al millisecondo.
  function osservaRitardo(s, tipo, ritardo, oro) {
    const k = Math.floor(oro / FINESTRA_PUNTUALE_MS), m = s.minimi[tipo];
    const u = m[m.length - 1];
    if (u && u.k === k) { if (ritardo < u.min) u.min = ritardo; return; }
    m.push({ k, min: ritardo });
    while (m.length && m[0].k <= k - 3) m.shift();
  }
  function scivola(s, dt) {
    for (const tipo of TRACCE) {
      const m = s.minimi[tipo];
      if (!m.length) continue;
      const meta = m.reduce((x, c) => Math.min(x, c.min), Infinity), max = dt * SCIVOLO;
      s.base[tipo] += Math.max(-max, Math.min(max, meta - s.base[tipo]));
    }
  }

  function curaTempo(s, { tutto = false } = {}) {
    if (s.finita) return;
    if (!tutto) {
      osservaCiclo();
      const adesso = ora();
      if (Math.min(adesso - s.arrivo.video, adesso - s.arrivo.audio) > s.assenzaMax) { fine(s, 'assente'); return; }
    }
    if (s.muro0 == null) return;
    const oro = orologio(s);
    if (s.ultimaCura != null && oro > s.ultimaCura) scivola(s, oro - s.ultimaCura);
    s.ultimaCura = Math.max(s.ultimaCura ?? oro, oro);
    const fuori = [];
    for (const tipo of TRACCE) scorri(s, tipo, tutto ? Infinity : tocca(s, tipo), fuori, !tutto);
    // le tracce si intrecciano nei tempi, come le vuole il Matroska
    fuori.sort((a, b) => a.ms - b.ms);
    for (const u of fuori) scrivi(s, s.blocco(TRACCIA[u.tipo], u.ms, u.chiave, u.dati));
  }

  // Chi trasmette lo si dice a chi aspetta per riavviare (src/in-onda.js), nello
  // stesso giro in cui la sessione nasce o finisce.
  // Dentro un avvio che sostituisce la diretta di prima si dice una volta sola,
  // alla fine: in mezzo il canale non c'e', e chi legge in quell'istante
  // crederebbe che nessuno trasmetta.
  let rinvio = 0, daDire = false;
  const cambiato = () => {
    if (rinvio) { daDire = true; return; }
    daDire = false;
    try { alCambio?.(); } catch { /* chi ascolta non ferma la diretta */ }
  };

  function fine(s, motivo) {
    if (s.finita) return;
    // la coda esce prima di chiudere: chi guarda vede fino all'ultimo secondo
    if (!SENZA_CODA.has(motivo)) curaTempo(s, { tutto: true });
    if (s.finita) return;
    s.finita = true;
    s.motivo = motivo;
    chiudiEpisodio(s);
    s.coda = { video: [], audio: [] };
    s.codaByte = 0;
    try { s.ff.stdin?.end(); } catch { /* niente */ }
    const ff = s.ff;
    setTimeout(() => { try { if (ff.exitCode == null) ff.kill('SIGKILL'); } catch { /* niente */ } }, 3_000).unref?.();
    s.rendi();
    if (sessioni.get(s.login) === s) { sessioni.delete(s.login); cambiato(); }
    s.ultimaFine = { motivo, alle: ora(), errore: s.errore };
    finite.set(s.login, s.ultimaFine);
    spegniGiroSeVuoto();
    log?.info?.(`diretta #${s.login} finita: ${motivo}`);
  }
  const finite = new Map();

  // Una diretta ha un mittente solo: il turno dell'ultimo avvio. Chi riprende
  // con la stessa codifica continua la stessa diretta (le piattaforme non
  // vedono interruzioni); con una codifica diversa il flusso gia' annunciato non
  // la potrebbe portare, e la diretta di prima si chiude per lasciare il posto.
  const stessaCodifica = (s, video, audio, vod) => s.vod === vod && s.audio === audio?.codec && s.fps === video?.fps
    && s.misure === `${video?.larghezza}x${video?.altezza}` && Buffer.from(video?.config || []).equals(s.config.video)
    && Buffer.from(audio?.config || []).equals(s.config.audio);

  function avvia(login, opzioni) {
    rinvio++;
    try { return avviaDavvero(login, opzioni); } finally { rinvio--; if (daDire) cambiato(); }
  }
  function avviaDavvero(login, { destinazioni, video, audio, kbps, assenzaMaxMs = ASSENZA_MAX_MS, margineMs = MARGINE_MS, riprendi = false, vod: vodChiesto = false } = {}) {
    const ch = String(login || '').toLowerCase();
    if (!ch) return { ok: false, motivo: 'chi' };
    const prima = sessioni.get(ch);
    if (prima && !riprendi) return { ok: false, motivo: 'gia' };
    const vod = !!vodChiesto && vodPossibile && (destinazioni || []).some((d) => VOD_DESTINAZIONI.includes(d.id) && indirizzoBuono(d.url));
    if (prima && stessaCodifica(prima, video, audio, vod)) {
      prima.turno = randomBytes(8).toString('hex');
      prima.riancora = true;
      prima.serveChiave = true;
      prima.ultimoN = -1;
      prima.assenzaMax = assenzaMaxMs;
      // la pagina si e' ricaricata: il buco in corso e' del dispositivo
      if (prima.episodio && prima.episodio.causa !== 'dispositivo') {
        prima.conti.cause[prima.episodio.causa].n--;
        prima.conti.cause.dispositivo.n++;
        prima.episodio.causa = 'dispositivo';
      }
      log?.info?.(`diretta #${ch} ripresa`);
      return { ok: true, turno: prima.turno, ripresa: true, vod, margineMs: prima.margine };
    }
    const dest = (destinazioni || []).filter((d) => indirizzoBuono(d.url));
    if (!dest.length) return { ok: false, motivo: 'destinazioni' };
    // quello che questo ffmpeg non sa fare si dice prima, non dopo
    if (capacita && !capacita.pronta) return { ok: false, motivo: 'ffmpeg', manca: capacita.manca };
    const senzaTls = capacita && !capacita.rtmps ? dest.filter((d) => /^rtmps:/i.test(d.url)) : [];
    if (senzaTls.length) return { ok: false, motivo: 'rtmps', quali: senzaTls.map((d) => d.nome || d.id) };
    if (video?.codec !== 'avc1' || !video?.config?.length || !(video.larghezza > 0) || !(video.altezza > 0) || !(video.fps > 0)) return { ok: false, motivo: 'video' };
    if (!['aac', 'opus'].includes(audio?.codec) || !(audio.frequenza > 0) || !(audio.canali > 0) || (audio.codec === 'aac' && !audio.config?.length)) return { ok: false, motivo: 'audio' };
    const k = Math.min(BITRATE_MAX_KBPS, Math.max(300, Math.round(Number(kbps) || 0)));
    if (kbpsImpegnati() + k * dest.length > bandaMbps * 1000 * 0.8) return { ok: false, motivo: 'banda' };
    if (prima) fine(prima, 'sostituita');
    const rendi = risorse.prova('diretta', ch);
    if (!rendi) return { ok: false, motivo: 'carico' };
    let ff;
    try { ff = risorse.avvia(ffmpeg, argomenti(dest, audio.codec, vod), { stdio: ['pipe', 'ignore', 'pipe'] }); }
    catch { rendi(); return { ok: false, motivo: 'ffmpeg' }; }
    const margine = Math.min(MARGINE_MAX_S * 1000, Math.max(MARGINE_MIN_S * 1000, Number(margineMs) || MARGINE_MS));
    const s = {
      login: ch, ff, rendi, destinazioni: dest, kbps: k, audio: audio.codec, fps: video.fps, vod, margine,
      misure: `${video.larghezza}x${video.altezza}`, turno: randomBytes(8).toString('hex'), riancora: false,
      config: { video: Buffer.from(video.config), audio: Buffer.from(audio.config || []) }, inizio: ora(), muro0: null, offset: null, aggancio: 0,
      ultimo: { video: -Infinity, audio: -Infinity, vod: -Infinity }, arrivo: { video: ora(), audio: ora() },
      coda: { video: [], audio: [] }, codaByte: 0, base: { video: 0, audio: 0 }, minimi: { video: [], audio: [] }, ultimaCura: null,
      inRiserva: { video: false, audio: false }, serveChiave: true, riserva: null, giroV: 0, giroA: 0, episodio: null,
      conti: { n: 0, ms: 0, ultima: null, cause: Object.fromEntries(CAUSE.map((c) => [c, { n: 0, ms: 0 }])) },
      blocco: creaScrittore(), byte: 0, finestra: [], ultimoN: -1, assenzaMax: assenzaMaxMs, finita: false, errore: '', cadute: new Map(),
    };
    sessioni.set(ch, s);
    finite.delete(ch);
    cambiato();
    let err = '', riga = '';
    ff.stderr?.on('data', (d) => {
      err = (err + d).slice(-2000);
      s.errore = mascherato(err.trim().split('\n').pop() || '', dest).slice(0, 300);
      const righe = (riga + d).split('\n');
      riga = righe.pop().slice(-2000);
      for (const r of righe) {
        const c = cadutaIn(r);
        if (c && dest[c.i] && !s.cadute.has(c.i)) { s.cadute.set(c.i, { motivo: c.motivo, quando: ora() }); log?.warn?.(`diretta #${ch}: ${dest[c.i].nome || dest[c.i].id} caduta (${c.motivo})`); }
      }
    });
    ff.stdin?.on('error', () => {});
    ff.on('error', () => fine(s, 'ffmpeg'));
    ff.on('exit', () => fine(s, s.finita ? s.motivo : 'uscita'));
    scrivi(s, testata({ video: { ...video, config: s.config.video }, audio: { ...audio, config: audio.config ? Buffer.from(audio.config) : null }, vod }));
    accendiGiro();
    log?.info?.(`diretta #${ch} partita verso ${dest.map((d) => d.nome || d.id).join(', ')} (margine ${margine / 1000} s)`);
    return { ok: true, turno: s.turno, vod, margineMs: margine };
  }

  // La riserva: pacchetti della stessa codifica, il primo video e' chiave.
  function riserva(login, buf, turno) {
    const s = sessioni.get(String(login || '').toLowerCase());
    if (!s) return { ok: false, motivo: 'nessuna' };
    if (turno !== s.turno) return { ok: false, motivo: 'altrove' };
    let pacchi;
    try { pacchi = leggiPacchi(buf); } catch { return { ok: false, motivo: 'pacchi' }; }
    const v = pacchi.filter((p) => p.tipo === 'video'), a = pacchi.filter((p) => p.tipo === 'audio');
    if (!v.length || !v[0].chiave || !a.length) return { ok: false, motivo: 'riserva' };
    const passo = (xs, ripiego) => (xs.length > 1 ? Math.max(1, (xs[xs.length - 1].us - xs[0].us) / 1000 / (xs.length - 1)) : ripiego);
    s.riserva = {
      video: v.map((p) => ({ chiave: p.chiave, dati: Buffer.from(p.dati) })), audio: a.map((p) => ({ dati: Buffer.from(p.dati) })),
      durataV: passo(v, 1000 / s.fps), durataA: passo(a, s.audio === 'aac' ? 1024 / 48 : 20),
    };
    return { ok: true };
  }

  // Il video aspetta una chiave (al via, alla ripresa, in riserva) e in coda non
  // ce n'e' una che vada avanti: la si chiede al dispositivo.
  const chiedeChiave = (s) => s.serveChiave || (s.inRiserva.video && !s.coda.video.some((p) => p.chiave && p.ms > s.ultimo.video));

  function pacchi(login, n, buf, turno) {
    const s = sessioni.get(String(login || '').toLowerCase());
    if (!s) return { ok: false, motivo: 'nessuna' };
    if (turno !== s.turno) return { ok: false, motivo: 'altrove' };
    const seq = Number(n);
    if (Number.isFinite(seq) && seq <= s.ultimoN) return { ok: true, doppio: true };
    let lista;
    try { lista = leggiPacchi(buf); } catch { return { ok: false, motivo: 'pacchi' }; }
    if (Number.isFinite(seq)) s.ultimoN = seq;
    osservaCiclo();
    const adesso = ora();
    s.byte += buf.length;
    s.finestra.push([adesso, buf.length]);
    while (s.finestra.length && adesso - s.finestra[0][0] > FINESTRA_BYTE_MS) s.finestra.shift();
    const inFinestra = s.finestra.reduce((t, [, b]) => t + b, 0);
    if (adesso - s.inizio > FINESTRA_BYTE_MS && inFinestra * 8 / FINESTRA_BYTE_MS > (s.kbps * 1.5 + 256)) { fine(s, 'troppo'); return { ok: false, motivo: 'troppo' }; }
    for (const p of lista) {
      // Il pacco del VOD e' il gemello dell'audio appena messo in coda (il
      // dispositivo li manda a coppie, stesso tempo): esce con lui, o non esce.
      if (p.tipo === 'vod') {
        const a = s.coda.audio[s.coda.audio.length - 1];
        if (s.vod && a && a.us === p.us && !a.vod) { a.vod = p.dati; a.peso += p.dati.length; s.codaByte += p.dati.length; }
        continue;
      }
      // Il tempo del dispositivo si aggancia all'orologio d'uscita sul primo
      // fotogramma chiave: all'inizio, e di nuovo quando un dispositivo riprende
      // col suo orologio che riparte da capo.
      if (s.offset == null || s.riancora) {
        if (p.tipo !== 'video' || !p.chiave) continue;
        if (s.muro0 == null) s.muro0 = adesso;
        s.offset = (adesso - s.muro0) - p.us / 1000;
        // la chiave nuova va dopo tutto il video gia' preso, anche se il
        // dispositivo di prima aveva l'orologio avanti
        const coda = s.coda.video, dopo = Math.max(s.ultimo.video, coda.length ? coda[coda.length - 1].ms : -Infinity);
        if (p.us / 1000 + s.offset <= dopo) s.offset += dopo - (p.us / 1000 + s.offset) + 1000 / s.fps;
        if (!Number.isFinite(s.ultimo.video) && !coda.length) s.aggancio = p.us / 1000 + s.offset;
        s.minimi = { video: [], audio: [] };
        s.riancora = false;
      }
      const ms = p.us / 1000 + s.offset;
      if (p.tipo === 'video' && s.serveChiave) {
        if (!p.chiave) continue;
        s.serveChiave = false;
      }
      osservaRitardo(s, p.tipo, (adesso - s.muro0) - ms, adesso - s.muro0);
      s.arrivo[p.tipo] = adesso;
      const peso = p.dati.length;
      s.coda[p.tipo].push({ us: p.us, ms, chiave: p.chiave, dati: p.dati, peso, vod: null });
      s.codaByte += peso;
    }
    if (s.codaByte > CODA_MAX_BYTE) { fine(s, 'coda'); return { ok: false, motivo: 'coda' }; }
    curaTempo(s);
    if (s.finita) return { ok: false, motivo: s.motivo };
    return { ok: true, chiave: chiedeChiave(s) };
  }

  function stato(login) {
    const ch = String(login || '').toLowerCase();
    const s = sessioni.get(ch);
    if (!s) return { live: false, ultimaFine: finite.get(ch) || null };
    const adesso = ora();
    const inFinestra = s.finestra.filter(([t]) => adesso - t <= FINESTRA_BYTE_MS).reduce((t, [, b]) => t + b, 0);
    // quanto margine c'e' adesso: la diretta gia' arrivata e non ancora mandata
    const scorta = s.muro0 == null ? 0 : Math.max(0, ...TRACCE.map((t) => { const c = s.coda[t]; return c.length ? c[c.length - 1].ms - tocca(s, t) : 0; }));
    const e = s.episodio, inCorso = e ? Math.max(0, e.fine - e.da) : 0;
    return {
      live: true, da: s.inizio, byte: s.byte, kbpsVeri: Math.round(inFinestra * 8 / FINESTRA_BYTE_MS), kbpsDichiarati: s.kbps,
      destinazioni: s.destinazioni.map((d) => d.nome || d.id), ids: s.destinazioni.map((d) => d.id), riserva: !!s.riserva, inRiserva: { ...s.inRiserva }, errore: s.errore, vod: !!s.vod,
      stati: s.destinazioni.map((d, i) => ({ id: d.id, nome: d.nome || d.id, ok: !s.cadute.has(i), motivo: s.cadute.get(i)?.motivo || '' })),
      margine: s.margine, scorta: Math.round(Math.min(scorta, s.margine + 1000)),
      riserve: {
        n: s.conti.n, ms: Math.round(s.conti.ms + inCorso),
        cause: Object.fromEntries(CAUSE.map((c) => [c, { n: s.conti.cause[c].n, ms: Math.round(s.conti.cause[c].ms + (e?.causa === c ? inCorso : 0)) }])),
        ultima: e ? { causa: e.causa, ms: Math.round(inCorso), inCorso: true } : s.conti.ultima ? { ...s.conti.ultima, ms: Math.round(s.conti.ultima.ms), inCorso: false } : null,
      },
    };
  }

  return {
    avvia, riserva, pacchi, stato,
    ferma: (login, motivo = 'fermata', turno = null) => { const s = sessioni.get(String(login || '').toLowerCase()); if (!s || (turno && turno !== s.turno)) return false; fine(s, motivo); return true; },
    attiva: (login) => sessioni.has(String(login || '').toLowerCase()),
    vodPossibile: () => vodPossibile,
    // cosa sa fare il suo ffmpeg (null finche' non l'ha letto)
    capacita: () => capacita,
    // I canali in diretta dallo Studio, in un formato o nell'altro.
    canali: () => [...new Set([...sessioni.keys()].map((k) => k.replace(/#v$/, '')))],
    chiudiTutto: () => { for (const s of [...sessioni.values()]) fine(s, 'spegnimento'); },
    curaTempo: (login) => { const s = sessioni.get(String(login || '').toLowerCase()); if (s) curaTempo(s); },
    // un giro del tramite, come lo batte il suo timer (per le prove senza timer)
    battito,
  };
}
