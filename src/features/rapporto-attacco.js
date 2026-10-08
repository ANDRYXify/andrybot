// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL RAPPORTO DI UN ATTACCO (docs/INCIDENTI.md, «Il rapporto dell'attacco»).
//
// L'incidente (incidenti.js) e' quello che e' successo, scritto mentre
// succedeva. Il rapporto e' lo stesso fatto messo in ordine per chi lo legge
// dopo: quando, quanto forte, per quanto, quanti sono arrivati e quanti sono
// stati tolti, chi c'era dentro e cosa gli e' stato fatto. Si costruisce QUI,
// in un posto solo, e lo leggono il pannello, Telegram e la mail: tre rapporti
// scritti tre volte sarebbero tre rapporti che col tempo dicono cose diverse.
//
// Tutto e' puro: entra l'incidente con le sue righe di registro, esce un
// oggetto. Niente disco, niente Twitch, niente orologio che non sia passato.
//
// E qui sta anche la regola di QUANDO avvisare lo streamer. Un incidente si
// apre a ogni salita, anche al primo gradino («sto guardando»): avvisare per
// ognuno vorrebbe dire svegliarlo per niente dieci volte al giorno, e il
// giorno dell'attacco vero non leggerebbe piu' niente. Si avvisa dal livello
// che sceglie lui (di serie «sotto attacco»), una volta per gradino.
import { cellaCsv } from './csv.js';
import { N as LIVELLO_N } from './livelli.js';
import { guscioHtml, numeriHtml, sezioneHtml, tastoHtml, codiceTesto } from './posta.js';

// Le scelte stanno con le altre impostazioni dello scudo
// (impostazioni-moderazione.js): una regola sola per il pannello e per il bot.
export { SOGLIA_DI_SERIE, LIVELLI_AVVISO, AVVISI_DI_SERIE, avvisiDi } from '../web/impostazioni-moderazione.js';
import { SOGLIA_DI_SERIE } from '../web/impostazioni-moderazione.js';

export const almenoSoglia = (livello, soglia = SOGLIA_DI_SERIE) =>
  (LIVELLO_N[livello] ?? -1) >= (LIVELLO_N[soglia] ?? LIVELLO_N[SOGLIA_DI_SERIE]);

// Si avvisa salendo a un gradino sopra la soglia, e solo se di questo attacco
// non si e' gia' avvisato quel gradino o uno piu' alto: un attacco che fa su e
// giu' fra «attacco» e «difesa» non manda un messaggio a ogni oscillazione.
export function devoAvvisare({ livello, soglia = SOGLIA_DI_SERIE, giaAvvisato = '' } = {}) {
  if (!almenoSoglia(livello, soglia)) return false;
  return (LIVELLO_N[livello] ?? -1) > (LIVELLO_N[giaAvvisato] ?? -1);
}

// Il rapporto si manda per gli attacchi che sono arrivati alla soglia. Quelli
// piu' piccoli restano nel pannello, senza bussare.
export const meritaRapporto = (inc, soglia = SOGLIA_DI_SERIE) => !!inc && almenoSoglia(inc.picco?.livello, soglia);

// ── Le parole ───────────────────────────────────────────────────────────────
// Etichette, nelle tre lingue del sito. Il pannello ha le sue (le stesse), il
// server queste per Telegram e la mail, nella lingua del canale.
export const NOMI_LIVELLO = {
  calma: ['in pace', 'at peace', 'en calma'],
  osservo: ['sto guardando', 'watching', 'observando'],
  allerta: ['in allerta', 'on alert', 'en alerta'],
  difesa: ['in difesa', 'defending', 'defendiendo'],
  attacco: ['sotto attacco', 'under attack', 'bajo ataque'],
  serrata: ['serrata', 'shuttered', 'cerrado'],
};
export const NOMI_TIPO = {
  'ondata-follow': ['Ondata di follow', 'Follow wave', 'Oleada de follows'],
  'onda-lenta': ['Follow a goccia', 'Slow follow drip', 'Follows a cuentagotas'],
  coro: ['Lo stesso messaggio da tanti account', 'The same message from many accounts', 'El mismo mensaje de muchas cuentas'],
  misto: ['Attacco misto', 'Mixed attack', 'Ataque mixto'],
  ignoto: ['Movimento sospetto', 'Suspicious activity', 'Actividad sospechosa'],
};
const IDX = { it: 0, en: 1, es: 2 };
const lin = (lingua) => IDX[lingua] ?? 0;
export const nomeLivello = (l, lingua = 'it') => (NOMI_LIVELLO[l] || [l, l, l])[lin(lingua)];
export const nomeTipo = (t, lingua = 'it') => (NOMI_TIPO[t] || NOMI_TIPO.ignoto)[lin(lingua)];

// ── Il rapporto ─────────────────────────────────────────────────────────────
const CURVA_PUNTI_MAX = 720;

// La curva come serie continua: i minuti senza niente valgono zero, e si vedono
// come zero. Un grafico che salta i buchi disegna un attacco che non c'e'.
// Oltre i dodici ore si raggruppa per piu' minuti, e il passo si dice.
export function curvaDi(inc, { fine = 0 } = {}) {
  const c = inc?.curva || {};
  const chiavi = Object.keys(c).map(Number).filter(Number.isFinite);
  const inizio = Math.floor((Number(inc?.aperto) || 0) / 60000);
  const ultimo = Math.max(Math.floor((Number(fine || inc?.chiuso || inc?.aperto) || 0) / 60000), ...(chiavi.length ? chiavi : [inizio]));
  const da = Math.min(inizio, ...(chiavi.length ? chiavi : [inizio]));
  const minuti = Math.max(1, ultimo - da + 1);
  const passo = Math.max(1, Math.ceil(minuti / CURVA_PUNTI_MAX));
  const punti = [];
  for (let m = da; m <= ultimo; m += passo) {
    let f = 0, t = 0;
    for (let k = m; k < m + passo; k++) { const v = c[k]; if (v) { f += Number(v[0]) || 0; t += Number(v[1]) || 0; } }
    punti.push({ ts: m * 60000, follow: f, tolti: t });
  }
  return { passo, punti };
}

// La scala: ogni gradino con quanto e' durato. L'ultimo dura fino alla
// chiusura, o fino a adesso se l'attacco e' ancora in corso.
export function scalaDi(inc, ora = Date.now()) {
  const s = Array.isArray(inc?.livelli) ? inc.livelli : [];
  const fine = Number(inc?.chiuso) || ora;
  return s.map((g, i) => {
    const a = i + 1 < s.length ? s[i + 1].ts : fine;
    return { livello: g.livello, da: g.ts, a, durata: Math.max(0, Math.round((a - g.ts) / 1000)) };
  });
}

const AZIONI_TOLGONO = new Set(['blocca', 'ban', 'timeout']);
const PESO_AZIONE = { ban: 5, blocca: 4, timeout: 3, cancella: 2, limita: 1 };

// Chi c'era: il giudizio dello scudo, e cosa gli e' successo davvero (l'ultima
// azione del registro col suo esito). Prima i certi, poi i sospetti, poi i
// legittimi; dentro, per primi quelli arrivati prima.
export function coinvoltiDi(inc, registro = []) {
  const fatto = new Map();
  for (const r of registro) {
    const l = String(r?.login || '').toLowerCase();
    if (!l || !PESO_AZIONE[r.azione]) continue;
    const gia = fatto.get(l);
    if (!gia || (PESO_AZIONE[r.azione] > PESO_AZIONE[gia.azione]) || (r.azione === gia.azione && r.ts > gia.ts)) {
      fatto.set(l, { azione: r.azione, esito: r.esito, ts: r.ts });
    }
  }
  const ordine = { certo: 0, sospetto: 1, legittimo: 2 };
  return Object.entries(inc?.coinvolti || {})
    .map(([login, v]) => ({ login, userId: String(v?.userId || ''), giudizio: v?.giudizio || 'sospetto', punti: Number(v?.punti) || 0, ts: Number(v?.ts) || 0, fatto: fatto.get(login) || null }))
    .sort((a, b) => (ordine[a.giudizio] ?? 3) - (ordine[b.giudizio] ?? 3) || a.ts - b.ts);
}

export function numeriDi(inc, registro = []) {
  let follow = 0, tolti = 0;
  for (const v of Object.values(inc?.curva || {})) { follow += Number(v?.[0]) || 0; tolti += Number(v?.[1]) || 0; }
  const az = inc?.azioni || {};
  const fatte = (a) => Number(az[a]?.fatte) || 0;
  let falliti = 0, aVuoto = 0;
  for (const v of Object.values(az)) { falliti += Number(v?.fallite) || 0; aVuoto += Number(v?.aVuoto) || 0; }
  const per = { certo: 0, sospetto: 0, legittimo: 0 };
  for (const v of Object.values(inc?.coinvolti || {})) if (per[v?.giudizio] !== undefined) per[v.giudizio]++;
  return {
    follow, tolti,
    bloccati: fatte('blocca'), ban: fatte('ban'), timeout: fatte('timeout'),
    cancellati: fatte('cancella'), trattenuti: fatte('limita'),
    falliti, aVuoto,
    taciuti: Number(inc?.taciuti) || 0,
    coinvolti: Object.keys(inc?.coinvolti || {}).length, ...per,
    raid: (inc?.raid || []).length,
    righe: registro.length,
  };
}

export function rapportoAttacco(inc, { registro = [], ora = Date.now() } = {}) {
  if (!inc) return null;
  const fine = Number(inc.chiuso) || ora;
  return {
    id: inc.id, canale: inc.canale, tipo: inc.tipo || 'ignoto', motivo: inc.motivo || primoMotivo(inc),
    aperto: inc.aperto, chiuso: inc.chiuso || null, inCorso: !inc.chiuso,
    durata: Math.max(0, Math.round((fine - inc.aperto) / 1000)),
    riaperture: Number(inc.riaperture) || 0,
    picco: { livello: inc.picco?.livello || '', ts: inc.picco?.ts || inc.aperto, punti: Number(inc.picco?.punti) || 0, segnali: inc.picco?.segnali || null },
    scala: scalaDi(inc, ora),
    curva: curvaDi(inc, { fine }),
    numeri: numeriDi(inc, registro),
    raid: (inc.raid || []).slice(),
    coinvolti: coinvoltiDi(inc, registro),
    timeline: (inc.timeline || []).slice(),
    avvisato: inc.avvisato || '',
  };
}

// Il motivo dei vecchi incidenti, che non lo tenevano a parte: stava nella
// prima riga, «aperto: …».
function primoMotivo(inc) {
  const p = (inc?.timeline || [])[0]?.cosa || '';
  return p.startsWith('aperto: ') ? p.slice(8) : '';
}

// ── Il racconto, per chi non apre il pannello ───────────────────────────────
const durataTesto = (sec, lingua) => {
  const m = Math.round((Number(sec) || 0) / 60);
  if (m < 1) return ['meno di un minuto', 'under a minute', 'menos de un minuto'][lin(lingua)];
  if (m < 60) return `${m} ${['minuti', 'minutes', 'minutos'][lin(lingua)]}`;
  const h = Math.round(m / 6) / 10;
  return `${h} ${['ore', 'hours', 'horas'][lin(lingua)]}`;
};

// Le frasi del rapporto, una per riga, senza HTML: chi le manda sa come
// vestirle (Telegram, mail, testo semplice).
export function racconto(r, lingua = 'it') {
  if (!r) return [];
  const i = lin(lingua);
  const n = r.numeri || {};
  const f = [];
  f.push([
    `${nomeTipo(r.tipo, 'it')}: ${r.inCorso ? 'ancora in corso' : `durato ${durataTesto(r.durata, 'it')}`}, fino a «${nomeLivello(r.picco.livello, 'it')}».`,
    `${nomeTipo(r.tipo, 'en')}: ${r.inCorso ? 'still going on' : `it lasted ${durataTesto(r.durata, 'en')}`}, up to “${nomeLivello(r.picco.livello, 'en')}”.`,
    `${nomeTipo(r.tipo, 'es')}: ${r.inCorso ? 'todavía en curso' : `duró ${durataTesto(r.durata, 'es')}`}, hasta «${nomeLivello(r.picco.livello, 'es')}».`,
  ][i]);
  if (n.follow) f.push([`Follow arrivati: ${n.follow}. Tolti dallo scudo: ${n.tolti}.`, `Follows that came in: ${n.follow}. Removed by the shield: ${n.tolti}.`, `Follows recibidos: ${n.follow}. Quitados por el escudo: ${n.tolti}.`][i]);
  if (n.coinvolti) f.push([`Account coinvolti: ${n.coinvolti} (${n.certo} bot certi, ${n.sospetto} sospetti, ${n.legittimo} persone vere lasciate stare).`, `Accounts involved: ${n.coinvolti} (${n.certo} certain bots, ${n.sospetto} suspects, ${n.legittimo} real people left alone).`, `Cuentas implicadas: ${n.coinvolti} (${n.certo} bots seguros, ${n.sospetto} sospechosas, ${n.legittimo} personas reales sin tocar).`][i]);
  if (n.cancellati || n.trattenuti) f.push([`Messaggi tolti: ${n.cancellati}, trattenuti: ${n.trattenuti}.`, `Messages removed: ${n.cancellati}, held: ${n.trattenuti}.`, `Mensajes quitados: ${n.cancellati}, retenidos: ${n.trattenuti}.`][i]);
  if (n.taciuti) f.push([`Follow senza alert: ${n.taciuti}.`, `Follows without an alert: ${n.taciuti}.`, `Follows sin alerta: ${n.taciuti}.`][i]);
  if (n.raid) f.push([`Raid arrivati nel frattempo: ${n.raid}.`, `Raids that came in meanwhile: ${n.raid}.`, `Raids recibidos mientras tanto: ${n.raid}.`][i]);
  if (n.falliti) f.push([`Azioni non riuscite: ${n.falliti}. Le trovi fra quelle in sospeso.`, `Actions that failed: ${n.falliti}. You will find them among the pending ones.`, `Acciones fallidas: ${n.falliti}. Las encuentras entre las pendientes.`][i]);
  if (n.aVuoto) f.push([`Lo scudo era in sola osservazione: ${n.aVuoto} azioni solo scritte, non fatte.`, `The shield was in watch-only mode: ${n.aVuoto} actions only written down, not done.`, `El escudo estaba solo observando: ${n.aVuoto} acciones solo anotadas, no hechas.`][i]);
  return f;
}

const escHtml = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// L'avviso che arriva in privato quando lo scudo sale. Corto: si legge sul
// telefono durante la diretta.
export function testoAvviso(a = {}, { lingua = 'it', link = '' } = {}) {
  const i = lin(lingua);
  if (a.tipo === 'raid') {
    const da = a.da ? ` ${['da', 'from', 'de'][i]} ${a.da}` : '';
    return [`🛡️ <b>Raid da ${a.quanti} spettatori</b>${escHtml(da)}: controlla che sia genuino.`,
      `🛡️ <b>Raid with ${a.quanti} viewers</b>${escHtml(da)}: check that it is genuine.`,
      `🛡️ <b>Raid de ${a.quanti} espectadores</b>${escHtml(da)}: comprueba que sea genuino.`][i] + (link ? `\n${link}` : '');
  }
  const liv = nomeLivello(a.livello, lingua);
  const testa = [`🛡️ <b>Scudo alzato: ${liv}</b>`, `🛡️ <b>Shield raised: ${liv}</b>`, `🛡️ <b>Escudo alzado: ${liv}</b>`][i];
  const perche = a.motivo ? `\n${escHtml(String(a.motivo).slice(0, 180))}` : '';
  const dove = link ? `\n${['Segui l’attacco qui', 'Follow the attack here', 'Sigue el ataque aquí'][i]}: ${link}` : '';
  return testa + perche + dove;
}

// Il rapporto in privato su Telegram, a attacco finito.
export function testoRapporto(r, { lingua = 'it', link = '' } = {}) {
  const i = lin(lingua);
  const testa = [`🛡️ <b>Rapporto dell’attacco</b>`, `🛡️ <b>Attack report</b>`, `🛡️ <b>Informe del ataque</b>`][i];
  const righe = racconto(r, lingua).map(escHtml);
  const dove = link ? [`Il rapporto intero`, `The full report`, `El informe completo`][i] + `: ${link}` : '';
  return [testa, ...righe, dove].filter(Boolean).join('\n');
}

export function oggettoRapporto(r, lingua = 'it') {
  const i = lin(lingua);
  return [`Rapporto dell’attacco: ${nomeTipo(r.tipo, 'it')}`, `Attack report: ${nomeTipo(r.tipo, 'en')}`, `Informe del ataque: ${nomeTipo(r.tipo, 'es')}`][i];
}

// Il CSV dei coinvolti: si scarica e si porta dove si vuole (una segnalazione
// a Twitch, un foglio). Le celle si disinnescano in csv.js: un nome come
// «=HYPERLINK(...)» non deve diventare un comando aprendo il file.
export function csvCoinvolti(r) {
  const testa = ['login', 'user_id', 'giudizio', 'punti', 'quando', 'azione', 'esito'];
  const righe = (r?.coinvolti || []).map((c) => [c.login, c.userId, c.giudizio, c.punti, c.ts ? new Date(c.ts).toISOString() : '', c.fatto?.azione || '', c.fatto?.esito || ''].map(cellaCsv).join(','));
  return [testa.join(','), ...righe].join('\n') + '\n';
}

// La mail del rapporto: gli stessi numeri e le stesse frasi, vestiti da mail.
export function htmlRapporto(r, { lingua = 'it', link = '', display = '', codice = '' } = {}) {
  const i = lin(lingua);
  const n = r?.numeri || {};
  const corpo = [
    numeriHtml([
      { n: n.follow || 0, che: ['follow arrivati', 'follows in', 'follows recibidos'][i] },
      { n: n.tolti || 0, che: ['tolti', 'removed', 'quitados'][i] },
      { n: n.legittimo || 0, che: ['persone vere salve', 'real people kept', 'personas reales a salvo'][i] },
    ]),
    sezioneHtml(['Com’è andata', 'How it went', 'Cómo fue'][i]),
    racconto(r, lingua).map((f) => `<p style="margin:0 0 8px;">${escHtml(f)}</p>`).join(''),
    link ? `<p style="margin:18px 0 0;">${tastoHtml(['Apri il rapporto intero', 'Open the full report', 'Abre el informe completo'][i], link)}</p>` : '',
  ].join('');
  return guscioHtml({ titolo: oggettoRapporto(r, lingua), corpo, occhiello: racconto(r, lingua)[0] || '', cappello: display, codice });
}

export function testoPianoRapporto(r, { lingua = 'it', link = '', codice = '' } = {}) {
  return [oggettoRapporto(r, lingua), '', ...racconto(r, lingua), '', link].filter((x) => x !== undefined).join('\n').trim() + codiceTesto(codice);
}

export { AZIONI_TOLGONO };
