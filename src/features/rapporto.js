// IL RAPPORTO DI FINE DIRETTA: com'e' andata, in poche righe, allo streamer in
// privato, appena chiude.
//
// Niente cervello e niente aggettivi: numeri. Quello che il bot ha gia' in casa
// (messaggi, eventi, clip, presenze, donazioni) si legge dal database al momento
// di chiudere, con la finestra della diretta; quello che passa e non resta (gli
// spettatori a ogni giro) si tiene in memoria durante la diretta. Cosi' un
// riavvio del bot a meta' serata perde al massimo il picco, non il rapporto.
//
// L'inizio della diretta e' l'istante in cui il bot l'ha vista partire; se e'
// ripartito a diretta in corso, e' l'inizio della diretta corrente delle
// presenze (dirette_viste), che sopravvive ai riavvii. La fine e' adesso.
import { db, streamers, presenze as store, padroneDi } from '../db.js';
import { config } from '../config.js';
import { guscioHtml, rigaHtml, numeriHtml, podioHtml, sezioneHtml, cartaLinkHtml, tastoHtml, dueColonneHtml, codiceDi, codiceTesto } from './posta.js';

const norm = (s) => String(s || '').toLowerCase().trim();
const sessioni = new Map();   // canale → { inizio, picco, somma, giri }

// Dove va il rapporto: Telegram di serie (se la chat privata c'e'), la mail
// solo se lo streamer l'ha accesa. `attivo` e' il nome della prima versione.
export function cfg(channel) {
  const r = streamers.get(norm(channel))?.settings?.rapporto || {};
  return { telegram: (r.telegram ?? r.attivo) !== false, mail: r.mail === true };
}
export function normalizza(b) {
  const r = (b && typeof b === 'object') ? b : {};
  return { telegram: (r.telegram ?? r.attivo) !== false, mail: r.mail === true };
}

// DA QUANDO E' COMINCIATA non e' una cosa che ci ricordiamo noi: e' una cosa
// che sappiamo. La dice Twitch quando va in onda, e quando non ce l'abbiamo
// sotto mano la sanno le presenze, che quella data la scrivono sul disco. La
// nostra memoria e' l'ultima delle tre, non la prima: se fosse la prima, un
// riavvio farebbe ricominciare la serata da adesso.
function daQuando(ch, inizio, ora) {
  if (inizio > 0 && inizio <= ora) return inizio;
  const vista = Number(store.diretta(ch)?.corrente_ts) || 0;
  return (vista > 0 && vista <= ora) ? vista : ora;
}

export function apri(channel, { ora = Date.now(), inizio = 0 } = {}) {
  const ch = norm(channel);
  if (!ch) return null;
  const da = daQuando(ch, Number(inizio) || 0, ora);
  // Riaprire la STESSA diretta non la ricomincia. Il picco e la media di stasera
  // sono di stasera: un secondo rilevamento della stessa serata — il bot che
  // riparte, il watcher che ripassa — non deve azzerarli. Solo un inizio diverso
  // e' una serata diversa.
  const gia = sessioni.get(ch);
  if (gia && gia.inizio === da) return gia;
  const s = { inizio: da, picco: 0, somma: 0, giri: 0 };
  sessioni.set(ch, s);
  return s;
}

// Un giro da cinque minuti, con gli spettatori di quel momento. Senza una
// sessione aperta (bot ripartito a diretta in corso) se ne apre una che parte
// dall'inizio che le presenze ricordano.
export function osservaGiro(channel, { spettatori = null, ora = Date.now() } = {}) {
  const ch = norm(channel);
  if (!ch) return null;
  let s = sessioni.get(ch);
  if (!s) s = apri(ch, { ora });
  const n = Number(spettatori);
  if (Number.isFinite(n) && n >= 0) { s.picco = Math.max(s.picco, n); s.somma += n; s.giri++; }
  return s;
}

export function chiudi(channel, { ora = Date.now() } = {}) {
  const ch = norm(channel);
  const s = sessioni.get(ch);
  sessioni.delete(ch);
  if (!s) return null;
  return { inizio: s.inizio, fine: ora, durataMs: Math.max(0, ora - s.inizio), picco: s.picco, media: s.giri ? Math.round(s.somma / s.giri) : 0, giri: s.giri };
}

export function aperta(channel) { return sessioni.has(norm(channel)); }

// LA DIRETTA IN CORSO, se ce n'e' una.
//
// Serve a chi fa i numeri del canale: prima una serata esisteva solo dopo che
// era finita — il rapporto si scrive alla chiusura — e mentre eri in onda la
// scheda diceva zero dirette, zero minuti, zero picco. La sessione con dentro
// inizio e picco ce l'ha gia' questo modulo: la si mostra, invece di tenerne un
// secondo conto da qualche altra parte che poi non torna.
export function inCorso(channel, { ora = Date.now() } = {}) {
  const s = sessioni.get(norm(channel));
  if (!s) return null;
  return {
    inizio: s.inizio,
    durataMs: Math.max(0, ora - s.inizio),
    picco: s.picco,
    media: s.giri ? Math.round(s.somma / s.giri) : 0,
  };
}

// Quello che e' successo fra inizio e fine, letto dal database. Pura sui dati.
function evento(testo) {
  const t = String(testo || '');
  const i = t.indexOf(' ');
  const tipo = i > 0 ? t.slice(0, i) : t;
  let dati = {};
  if (i > 0) { try { dati = JSON.parse(t.slice(i + 1)); } catch { dati = {}; } }
  return { tipo, dati };
}

export function raccogli(channel, { inizio, fine, picco = 0 }) {
  const ch = norm(channel);
  const da = Number(inizio) || 0, a = Number(fine) || Date.now();
  const chat = db.prepare(`SELECT COUNT(*) n, COUNT(DISTINCT user) p FROM messages
    WHERE channel=? AND ts>=? AND ts<=? AND from_bot=0 AND user NOT LIKE '[%'`).get(ch, da, a);
  // «chi ha scritto di piu'» e' il pubblico: lo streamer nella classifica della
  // propria serata e' una riga che non dice niente a chi la legge
  const top = db.prepare(`SELECT user, MAX(display) display, COUNT(*) n FROM messages
    WHERE channel=? AND ts>=? AND ts<=? AND from_bot=0 AND user<>? AND user NOT LIKE '[%'
    GROUP BY user ORDER BY n DESC, user LIMIT 3`).all(ch, da, a, padroneDi(ch)).map((r) => ({ user: r.display || r.user, n: r.n }));
  const out = { messaggi: chat.n | 0, persone: chat.p | 0, top, follow: 0, sub: 0, regali: 0, raid: 0, raidSpettatori: 0, treni: 0, trenoLivello: 0, trenoChi: '' };
  for (const r of db.prepare(`SELECT text FROM messages WHERE channel=? AND user='[evento]' AND ts>=? AND ts<=?`).all(ch, da, a)) {
    const { tipo, dati } = evento(r.text);
    if (tipo === 'channel.follow') out.follow++;
    else if (tipo === 'channel.subscribe') { out.sub++; if (dati.is_gift) out.regali++; }
    else if (tipo === 'channel.subscription.gift') { const n = Number(dati.total) || 1; out.sub += n; out.regali += n; }
    else if (tipo === 'channel.raid') { out.raid++; out.raidSpettatori += Number(dati.viewers) || 0; }
    // L'HYPE TRAIN: si conta solo quando FINISCE. Twitch manda un evento a ogni
    // contributo, e il livello che conta e' quello a cui il treno si e' fermato;
    // sommare i passaggi vorrebbe dire raccontare dieci treni al posto di uno.
    else if (tipo === 'channel.hype_train.end') {
      out.treni++;
      const liv = Number(dati.level) || 0;
      if (liv > out.trenoLivello) {
        out.trenoLivello = liv;
        const primo = Array.isArray(dati.top_contributions) ? dati.top_contributions[0] : null;
        out.trenoChi = String(primo?.user_name || primo?.user_login || '').slice(0, 40);
      }
    }
  }
  const d = store.diretta(ch);
  out.presenti = d?.corrente
    ? db.prepare('SELECT COUNT(*) c FROM presenze WHERE channel=? AND ultima=?').get(ch, d.corrente).c
    : db.prepare('SELECT COUNT(*) c FROM presenze WHERE channel=? AND ultima_ts>=? AND ultima_ts<=?').get(ch, da, a).c;
  out.primeVolte = db.prepare('SELECT COUNT(*) c FROM presenze WHERE channel=? AND prima_ts>=? AND prima_ts<=?').get(ch, da, a).c;
  out.clip = db.prepare('SELECT COUNT(*) c FROM clips WHERE channel=? AND ts>=? AND ts<=?').get(ch, da, a).c;
  // LE CLIP PER INTERO, non solo quante. Un numero non si riguarda; un elenco di
  // titoli con il loro link si riapre la sera dopo, ed e' il pezzo del rapporto
  // che vale di piu': l'unico che si puo' rivedere.
  out.clipElenco = db.prepare('SELECT url, reason, ts FROM clips WHERE channel=? AND ts>=? AND ts<=? ORDER BY ts LIMIT 8')
    .all(ch, da, a).map((c) => ({ url: String(c.url || ''), motivo: String(c.reason || ''), ts: Number(c.ts) || 0 }))
    .filter((c) => c.url);
  // Un picco non dice niente da solo: dice qualcosa confrontato con le altre
  // sere. Il massimo di prima si legge dai rapporti gia' salvati, e questo non
  // c'e' ancora fra quelli: percio' non puo' fare da record a se stesso.
  const alto = db.prepare("SELECT MAX(json_extract(dati,'$.picco')) m FROM rapporti WHERE channel=? AND fine<?").get(ch, a)?.m;
  out.piccoRecord = Number(picco) > 0 && Number(picco) > (Number(alto) || 0);
  const don = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(importo),0) s FROM donazioni
    WHERE login=? AND stato='pagata' AND pagata_at>=? AND pagata_at<=? AND rimborsata_at=0`).get(ch, da, a);
  out.donazioni = don.n | 0; out.donazioniCent = don.s | 0;
  return out;
}

export function durata(ms) {
  const min = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(min / 60);
  return h ? `${h}h ${String(min % 60).padStart(2, '0')}m` : `${min}m`;
}
const euro = (cent) => (cent / 100).toFixed(2).replace('.', ',') + ' €';
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------------------------------------------------------------- COME SI RACCONTA
// Un elenco di numeri non e' un racconto: e' un tabulato, e si legge una volta
// sola. Percio' la mail apre con UNA riga che dice la cosa che salta all'occhio
// di quella sera. Non e' un aggettivo buttato li' e non e' un dado: si guarda
// cos'e' successo davvero e si sceglie il fatto piu' notevole, in un ordine
// fisso. La stessa serata darebbe sempre la stessa riga — e serate diverse
// danno righe diverse, che e' esattamente il punto.
const PIU_NOTEVOLE = [
  [(d) => d.piccoRecord, (d) => `Mai visti tanti insieme: ${d.picco} spettatori nello stesso momento.`],
  [(d) => d.raid > 1, (d) => `Sono arrivati ${d.raid} raid, ${d.raidSpettatori} persone in tutto.`],
  [(d) => d.raid === 1, (d) => `È arrivato un raid, con ${d.raidSpettatori} persone al seguito.`],
  [(d) => d.donazioniCent >= 500, (d) => `Qualcuno ha voluto ringraziare: ${euro(d.donazioniCent)} in donazioni.`],
  [(d) => d.primeVolte >= 3, (d) => `${d.primeVolte} facce nuove in chat, mai viste prima.`],
  [(d) => d.follow >= 10, (d) => `${d.follow} persone hanno premuto segui mentre eri in onda.`],
  [(d) => d.sub > 0, (d) => `${d.sub === 1 ? 'Un abbonamento nuovo' : `${d.sub} abbonamenti nuovi`}, stasera.`],
  [(d) => d.messaggi >= 200, () => 'La chat non si è fermata un attimo.'],
  [(d) => d.messaggi > 0, (d) => `${d.messaggi === 1 ? 'Un messaggio' : `${d.messaggi} messaggi`} in chat.`],
  [() => true, () => 'Serata tranquilla.'],
];
// L'hype train, detto come lo direbbe una persona: il livello a cui e'
// arrivato, e chi ce l'ha portato. Se ne sono passati piu' d'uno si dice
// quanti, perche' due treni in una sera sono una sera diversa da una con uno.
export function trenoValore(d) {
  const liv = `livello ${d.trenoLivello || 1}`;
  return d.treni > 1 ? `${d.treni} treni, il migliore al ${liv}` : liv;
}
export function trenoDetto(d) {
  return `Hype train: ${trenoValore(d)}${d.trenoChi ? ` — l'ha spinto ${esc(d.trenoChi)}` : ''}`;
}

export function apertura(dati) {
  const d = dati || {};
  return (PIU_NOTEVOLE.find(([quando]) => quando(d)) || [])[1](d);
}

// La seconda riga tiene insieme la serata: quanto sei stato in onda e quante
// persone sono passate. Sempre quella, perche' e' la cornice, non la notizia.
export function cornice(dati) {
  const d = dati || {};
  const p = d.persone === 1 ? 'una persona' : `${d.persone | 0} persone`;
  return `Sei stato in onda ${durata(d.durataMs || 0)}, e in chat sono passate ${p}.`;
}

// «martedì sera», «domenica pomeriggio»: come lo direbbe uno, non una data.
const PARTI = [[5, 'notte'], [12, 'mattina'], [18, 'pomeriggio'], [24, 'sera']];
export function quandoParlato(ts) {
  const q = new Date(Number(ts) || 0);
  if (!Number.isFinite(q.getTime()) || !ts) return '';
  const giorno = q.toLocaleDateString('it-IT', { weekday: 'long', timeZone: 'Europe/Rome' });
  const ora = Number(q.toLocaleString('it-IT', { hour: 'numeric', hour12: false, timeZone: 'Europe/Rome' }));
  const parte = (PARTI.find(([fino]) => ora < fino) || PARTI[3])[1];
  return `${giorno} ${parte === 'notte' ? 'notte' : parte}`;
}

// L'oggetto E' la riga d'apertura: e' la cosa che si legge nell'elenco della
// posta, ed e' l'unica che decide se la mail si apre. Un «Diretta finita: 3h
// 41m» lo si archivia senza guardarlo.
export const oggetto = (dati) => apertura(dati);

const dominioDi = (u) => { try { return new URL(u).host; } catch { return ''; } };
const ORA_IT = (ts) => new Date(Number(ts) || 0).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

// La mail, col guscio del prodotto. Prima la voce, poi i tre numeri che si
// guardano per primi, poi chi ha scritto, il resto, e in fondo le clip: quelle
// si aprono una per una, ed e' la ragione per cui questa mail si riapre.
export function html(dati, { display = '', quando = '', codice = '' } = {}) {
  const d = dati || {};
  // Le voci corte: in due colonne lo spazio e' poco, e «54, di cui 7 alla prima
  // volta» andrebbe a capo male. Dice la stessa cosa in meta' larghezza.
  const resto = [];
  if (d.giri > 0) resto.push(rigaHtml('In media', `${d.media} spettatori`));
  if (d.sub) resto.push(rigaHtml('Sub', `${d.sub}${d.regali ? ` (${d.regali} regalat${d.regali === 1 ? 'o' : 'i'})` : ''}`));
  if (d.raid) resto.push(rigaHtml('Raid', `${d.raid} (${d.raidSpettatori} person${d.raidSpettatori === 1 ? 'a' : 'e'})`));
  if (d.presenti) resto.push(rigaHtml('Presenti', `${d.presenti}${d.primeVolte ? ` (${d.primeVolte} nuov${d.primeVolte === 1 ? 'o' : 'i'})` : ''}`));
  if (d.treni) resto.push(rigaHtml('Hype train', trenoValore(d)));
  if (d.donazioni) resto.push(rigaHtml('Donazioni', `${d.donazioni} · ${euro(d.donazioniCent || 0)}`));

  const clip = (d.clipElenco || []).filter((c) => c?.url);
  // Quando si e' cominciato, non quando si e' finito: una diretta di martedì
  // sera che chiude alle 00:46 resta «martedì sera», perche' e' cosi' che la
  // chiama chi l'ha fatta. Con la fine diventava «mercoledì notte».
  const quandoDetto = quando || quandoParlato(d.inizio || d.fine);
  const corpo = `<p style="margin:0 0 4px;">${esc(apertura(d))}</p>
<p class="sb-tenue" style="margin:0 0 20px;font-size:15px;">${esc(cornice(d))}</p>
${numeriHtml([
    d.giri > 0 ? { n: d.picco, che: 'al picco' } : null,
    { n: d.messaggi | 0, che: d.messaggi === 1 ? 'messaggio' : 'messaggi' },
    { n: `+${d.follow | 0}`, che: 'follower' },
  ])}
${dueColonneHtml(
    d.top?.length ? sezioneHtml('Chi ha scritto di più') + podioHtml(d.top, { che: 'messaggi' }) : '',
    resto.length ? sezioneHtml('Il resto della serata') + `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${resto.join('')}</table>` : '',
  )}
${clip.length ? sezioneHtml(`${clip.length === 1 ? 'La clip della serata' : `Le clip della serata (${clip.length})`}`)
    + clip.map((c) => cartaLinkHtml({ titolo: c.motivo || 'Clip della diretta', link: c.url, nota: `${ORA_IT(c.ts)} · ${dominioDi(c.url)}` })).join('') : ''}
<div style="margin-top:22px;">${tastoHtml('Apri le tue dirette', `${config.baseUrl}/#dirette`)}</div>`;
  return guscioHtml({
    codice,
    titolo: `Com’è andata${quandoDetto ? ` ${quandoDetto}` : ''}`,
    cappello: display || '',
    occhiello: `${d.giri > 0 ? `${d.picco} al picco, ` : ''}${d.messaggi | 0} messaggi, ${d.follow | 0} follower nuovi`,
    corpo,
    piede: `Ricevi questa mail perché hai confermato l’indirizzo nella scheda Dirette di SocialBot${display ? ` per il canale ${esc(display)}` : ''}. La togli da lì quando vuoi. SocialBot · socialbot.live`,
  });
}

// La versione senza HTML, per chi legge la posta in testo. I link delle clip
// restano per esteso: senza HTML un titolo cliccabile non esiste.
export function testoPiano(dati, { codice = '' } = {}) {
  const d = dati || {};
  const righe = [testo(d).replace(/<a href="([^"]+)">([^<]*)<\/a>/g, '$2: $1').replace(/<[^>]+>/g, '')];
  return righe.join('\n') + codiceTesto(codice);
}

// Il messaggio, in HTML di Telegram. Solo le righe che hanno qualcosa da dire.
export function testo(dati) {
  const d = dati || {};
  const righe = [`<b>${apertura(d)}</b>`, cornice(d)];
  if (d.giri > 0) righe.push(`Spettatori: picco ${d.picco}, in media ${d.media}`);
  righe.push(`Chat: ${d.messaggi | 0} messaggi da ${d.persone | 0} ${d.persone === 1 ? 'persona' : 'persone'}`);
  if (d.top?.length) righe.push('Più attivi: ' + d.top.map((t) => `${esc(t.user)} (${t.n})`).join(', '));
  const conto = [`Nuovi follower: ${d.follow | 0}`, `Sub: ${d.sub | 0}${d.regali ? ` (${d.regali} regalat${d.regali === 1 ? 'o' : 'i'})` : ''}`];
  if (d.raid) conto.push(`Raid: ${d.raid} (${d.raidSpettatori} spettatori)`);
  righe.push(conto.join(' · '));
  if (d.presenti) righe.push(`Presenti: ${d.presenti}${d.primeVolte ? `, di cui ${d.primeVolte} alla prima volta` : ''}`);
  if (d.treni) righe.push(trenoDetto(d));
  const extra = [];
  if (d.clip) extra.push(`Clip: ${d.clip}`);
  if (d.donazioni) extra.push(`Donazioni: ${d.donazioni} (${euro(d.donazioniCent || 0)})`);
  if (extra.length) righe.push(extra.join(' · '));
  // Le clip: qui i link si possono aprire, quindi si aprono. Su Telegram sono
  // la parte che si riguarda, come nella mail.
  for (const c of (d.clipElenco || []).filter((x) => x?.url)) {
    righe.push(`<a href="${esc(c.url)}">${esc(c.motivo || 'Clip della diretta')}</a>`);
  }
  return righe.join('\n');
}
