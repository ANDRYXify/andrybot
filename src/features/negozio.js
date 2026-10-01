// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL NEGOZIO DEL CANALE (docs/NEGOZIO.md).
//
// Si paga solo con le monete del canale, cioe' col tempo passato in chat e in
// diretta. Lo streamer decide cosa c'e', quanto costa e chi lo puo' comprare;
// lo spettatore compra dalla chat (!compra), vede quello che ha (!borsa) e
// quello che c'e' (!negozio).
//
// UN ACQUISTO E' UNA COSA SOLA: le monete tolte, la scorta scalata e l'effetto
// partono insieme, o non parte niente. Si fa cosi', in quest'ordine:
//
//  1. si guarda tutto quello che puo' dire di no SENZA toccare niente: che
//     l'articolo ci sia, che sia il suo momento, le scorte, le attese, i
//     requisiti (letti da dove stanno davvero), le monete, e se il suo effetto
//     adesso puo' partire. Chi riceve un no non ha perso niente;
//  2. la parte che sta nel database e' UNA transazione (db.js, negozio.prenota):
//     monete, scorta e riga dello storico insieme, e dentro si ricontrolla
//     quello che nel frattempo puo' essere cambiato. Due acquisti dell'ultima
//     scorta arrivano qui uno dopo l'altro, e il secondo trova zero;
//  3. l'effetto parte (negozio-tipi.js). Se non parte, le monete e la scorta
//     tornano, e lo storico lo scrive col perche': un rimborso esplicito, non
//     un acquisto che sparisce.
//
// Il negozio di un canale non vede niente degli altri: ogni lettura e ogni
// scrittura porta il canale, e un articolo si trova solo dentro il suo.
import { negozio as negozioDb, streamers, effects as effectsDb, modules as modulesDb, dcRuoli } from '../db.js';
import { normRegole, ruoliNostri } from './discord-ruoli.js';
import { preferenzeDi, numero, durata, data } from './preferenze.js';
import { monetaDi, accordaMoneta, NOME_BASE } from './moneta.js';
import { canaleHa } from './accesso.js';
import { nomeIn } from './comandi-registro.js';
import { aChi, spazioPer, inMessaggi } from './risposte.js';
import * as requisiti from './negozio-requisiti.js';
import * as tipi from './negozio-tipi.js';
import { makeLog } from '../logger.js';
import { config } from '../config.js';

const log = makeLog('negozio');

// L'INDIRIZZO DELLA PAGINA DEL NEGOZIO (docs/NEGOZIO.md, «La pagina»): quello
// corto, negozio.<dominio>/<canale>, quando il server l'ha acceso (dal .env o
// dalla sonda, come le donazioni); se no quello lungo, che vale sempre. Chi lo
// scrive da qualche parte lo chiede qui: la chat, il pannello, la pagina.
export function urlPaginaNegozio(canale) {
  const ch = String(canale || '').toLowerCase();
  return config.negozioHost ? `https://${config.negozioHost}/${ch}` : `${config.baseUrl}/u/${ch}/negozio`;
}

export const MAX_ARTICOLI = 60;
export const SI_VEDE = ['sempre', 'chi_puo'];
export const QUANDO = ['sempre', 'diretta', 'date'];
export const SCORTE = ['illimitate', 'tutto', 'persona'];
export const MAX_ATTESA_S = 7 * 86400;
export const MAX_PREZZO = 10_000_000;
export const MAX_SCORTA = 1_000_000;
// L'immagine di un articolo e' un'immagine della libreria del canale, la
// stessa di effetti, alert e grafiche: «effetto:<comando>». Un magazzino solo.
export const IMMAGINE_OK = /^effetto:[a-z0-9_]{1,30}$/;

// Il negozio e' aperto se lo streamer l'ha aperto, e il suo piano ha i giochi:
// le monete stanno li'.
export const aperto = (canale) => {
  const ch = String(canale || '').toLowerCase();
  return streamers.get(ch)?.settings?.negozio?.attivo === true && canaleHa(ch, 'giochi');
};

// La parola con cui si compra in chat, se lo streamer non ne sceglie una: la
// prima parola vera del nome, senza accenti. «VIP per una diretta» diventa vip,
// «Spada di legno» spada.
const pulisci = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function parolaDa(testo) {
  const parole = pulisci(testo).split(/[^a-z0-9]+/).filter(Boolean);
  const buona = parole.find((p) => p.length >= 3) || parole[0] || '';
  return buona.slice(0, 20);
}
export const parolaOk = (p) => /^[a-z0-9]{1,20}$/.test(String(p || ''));

const intero = (v, lo, hi, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
const riga = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// UN ARTICOLO COME LO SALVA IL NEGOZIO. Pura: entra quello che manda il
// pannello, esce l'articolo pulito oppure il perche' no. Le scorte sono una
// scelta sola, come nel piano: illimitate, N in tutto (quante ne restano) o N a
// persona. Quello che non serve alla scelta fatta non passa.
export function normArticolo(g) {
  const x = g && typeof g === 'object' ? g : {};
  const nome = riga(x.nome, 60);
  if (!nome) return { ok: false, errore: 'nome' };
  const parola = x.parola ? pulisci(x.parola).replace(/[^a-z0-9]/g, '').slice(0, 20) : parolaDa(nome);
  if (!parolaOk(parola)) return { ok: false, errore: 'parola' };
  const tipo = String(x.tipo || '');
  if (!tipi.TIPI.includes(tipo)) return { ok: false, errore: 'tipo' };
  const dati = tipi.normDati(tipo, x.dati);
  const manca = tipi.manca(tipo, dati);
  if (manca) return { ok: false, errore: manca };
  const s = x.scorte && typeof x.scorte === 'object' ? x.scorte : {};
  const modo = SCORTE.includes(s.modo) ? s.modo : 'illimitate';
  const quante = intero(s.n, 0, MAX_SCORTA, 0);
  if (modo === 'persona' && quante < 1) return { ok: false, errore: 'scorte' };
  const quando = QUANDO.includes(x.quando) ? x.quando : 'sempre';
  const dal = quando === 'date' ? intero(x.dal, 0, 8.64e15, 0) : 0;
  const al = quando === 'date' ? intero(x.al, 0, 8.64e15, 0) : 0;
  if (quando === 'date' && !(dal > 0 && al > dal)) return { ok: false, errore: 'date' };
  const immagine = IMMAGINE_OK.test(String(x.immagine || '')) ? String(x.immagine) : '';
  return {
    ok: true,
    articolo: {
      id: intero(x.id, 0, 1e12, 0) || undefined,
      parola, nome, tipo, dati, immagine,
      descrizione: riga(x.descrizione, 300),
      prezzo: intero(x.prezzo, 0, MAX_PREZZO, 0),
      scorta: modo === 'tutto' ? quante : null,
      perPersona: modo === 'persona' ? quante : 0,
      attesaTesta: intero(x.attesaTesta, 0, MAX_ATTESA_S, 0),
      attesaTutti: intero(x.attesaTutti, 0, MAX_ATTESA_S, 0),
      requisiti: requisiti.normRequisiti(x.requisiti),
      siVede: SI_VEDE.includes(x.siVede) ? x.siVede : 'sempre',
      quando, dal, al,
      attivo: x.attivo !== false,
      ordine: intero(x.ordine, 0, 10_000, 0),
    },
  };
}

// Le scorte come le vede chi le sceglie: il contrario di normArticolo.
export const scorteDi = (a) => (a.scorta !== null && a.scorta !== undefined ? { modo: 'tutto', n: a.scorta }
  : a.perPersona > 0 ? { modo: 'persona', n: a.perPersona } : { modo: 'illimitate', n: 0 });

// ------------------------------------------------------------------ le frasi
//
// Tutto quello che il negozio dice in chat sta qui, in un posto solo, nelle
// tre lingue della chat. La lingua, i numeri, le date e le durate sono quelli
// delle preferenze del canale (preferenze.js), come nel resto del bot. Quando
// arrivera' la voce del canale (docs/VOCE.md) queste diventano momenti del suo
// frasario, e il resto del file non se ne accorge: chiama frase() e basta.
const LINGUE = ['it', 'en', 'es'];
const lin = (l) => (LINGUE.includes(l) ? l : 'it');
// Le preferenze da usare: quelle di un canale, oppure solo una lingua (per
// chi deve dire una cosa in una lingua data).
const pref = (p) => (p && typeof p === 'object' ? p : { lingua: lin(p) });
export const cifra = (n, p = 'it') => numero(Math.max(0, Math.trunc(Number(n) || 0)), pref(p));
// Il nome della moneta e come se ne parla li dice moneta.js, per tutto il bot.
// Qui si aggiunge una cosa sola: il nome di serie si dice nella lingua della
// chat, perche' il negozio parla anche inglese e spagnolo.
const MONETA_DI_SERIE = { it: NOME_BASE, en: 'coins', es: 'monedas' };
export function monetaIn(canale, l = 'it') {
  const m = monetaDi(canale);
  return { nome: m.nome === NOME_BASE ? MONETA_DI_SERIE[lin(l)] : m.nome, forma: m.forma };
}
// Quanto manca, arrotondato al secondo in su: «0 secondi» non si dice a nessuno.
export const tempo = (ms, p = 'it') => durata(Math.max(1, Math.ceil((Number(ms) || 0) / 1000)) * 1000, pref(p));

// Un requisito detto a parole, come si finisce una frase che comincia con «è
// per chi», «it's for anyone who», «es para quien».
export function requisitoAParole(r, p = 'it') {
  const l = lin(pref(p).lingua);
  const n = Number(r?.soglia) || 0;
  const c = cifra(n, p);
  const T = {
    it: {
      mesi: n === 1 ? 'è abbonato da almeno un mese' : `è abbonato da almeno ${c} mesi`,
      tier: n <= 1 ? 'è abbonato' : `è abbonato di tier ${n} o più`,
      bit: `ha messo almeno ${c} Bit nel canale`,
      ore: n === 1 ? "ha guardato almeno un'ora" : `ha guardato almeno ${c} ore`,
      serie: `c'è stato ad almeno ${c} dirette di fila`,
      follower: n <= 0 ? 'segue il canale' : n === 1 ? 'segue il canale da almeno un giorno' : `segue il canale da almeno ${c} giorni`,
      ruolo: n >= 2 ? 'è moderatore' : 'è VIP o moderatore',
    },
    en: {
      mesi: n === 1 ? 'has been subscribed for at least a month' : `has been subscribed for at least ${c} months`,
      tier: n <= 1 ? 'is subscribed' : `is subscribed at tier ${n} or higher`,
      bit: `has cheered at least ${c} Bits in the channel`,
      ore: n === 1 ? 'has watched for at least an hour' : `has watched for at least ${c} hours`,
      serie: `has been at ${c} streams in a row or more`,
      follower: n <= 0 ? 'follows the channel' : n === 1 ? 'has followed the channel for at least a day' : `has followed the channel for at least ${c} days`,
      ruolo: n >= 2 ? 'is a moderator' : 'is a VIP or a moderator',
    },
    es: {
      mesi: n === 1 ? 'lleva suscrito al menos un mes' : `lleva suscrito al menos ${c} meses`,
      tier: n <= 1 ? 'está suscrito' : `está suscrito con tier ${n} o superior`,
      bit: `ha puesto al menos ${c} Bits en el canal`,
      ore: n === 1 ? 'ha visto al menos una hora' : `ha visto al menos ${c} horas`,
      serie: `ha estado en al menos ${c} directos seguidos`,
      follower: n <= 0 ? 'sigue el canal' : n === 1 ? 'sigue el canal desde hace al menos un día' : `sigue el canal desde hace al menos ${c} días`,
      ruolo: n >= 2 ? 'es moderador' : 'es VIP o moderador',
    },
  }[lin(l)];
  return T[r?.tipo] || '';
}

// Perche' un acquisto non parte, o e' tornato indietro. Un codice solo per
// ogni perche', lo stesso che lo storico scrive e che il pannello traduce.
export function percheAParole(codice, l = 'it', { cmdDiscord = '!discord' } = {}) {
  const P = {
    it: {
      overlay: "l'overlay in questo momento è spento",
      effetto: "l'effetto non c'è più",
      modulo: 'il modulo è spento',
      'modulo-tier': 'il modulo non è per il tuo ruolo',
      'modulo-piattaforma': 'il modulo non va su questa piattaforma',
      'modulo-live': 'il modulo adesso non va',
      'modulo-cooldown': 'il modulo è in pausa',
      'modulo-cooldownUtente': 'il modulo è in pausa per te',
      soloTwitch: 'si compra solo dalla chat di Twitch',
      twitch: 'Twitch non ha risposto',
      vipStaff: 'Twitch non dà il VIP a un moderatore',
      vipSempre: 'hai già il VIP per sempre',
      vipATempo: 'hai già il VIP fino a una data',
      vipPieni: 'i posti VIP del canale sono pieni',
      vipPermesso: 'Twitch adesso non mi lascia dare il VIP',
      discordSpento: 'i ruoli su Discord qui non sono attivi',
      discordRegola: 'quel ruolo lo danno le regole dei ruoli, non il negozio',
      discordTuo: `prima collega il tuo Discord: scrivi ${cmdDiscord} e ti dico come`,
      discordFuori: 'non sei nel server Discord',
      discordNo: 'Discord non ha dato il ruolo',
      musicaSpenta: 'le richieste musicali qui non sono attive',
      musicaNonTrovata: 'non ho trovato la canzone su Spotify',
      musicaFerma: 'Spotify del canale adesso è fermo',
      musicaNo: 'Spotify non ha preso la canzone',
      evidenzaNo: 'Twitch non ha pubblicato il messaggio',
      riavvio: 'il bot si è riavviato a metà',
      rifiutato: 'lo streamer ha detto di no',
      errore: 'qualcosa è andato storto',
    },
    en: {
      overlay: 'the overlay is off right now',
      effetto: 'the effect is gone',
      modulo: 'the module is off',
      'modulo-tier': 'the module is not for your role',
      'modulo-piattaforma': 'the module does not run on this platform',
      'modulo-live': 'the module does not run right now',
      'modulo-cooldown': 'the module is on cooldown',
      'modulo-cooldownUtente': 'the module is on cooldown for you',
      soloTwitch: 'it can only be bought from the Twitch chat',
      twitch: 'Twitch did not answer',
      vipStaff: 'Twitch does not give VIP to a moderator',
      vipSempre: 'you already have VIP for good',
      vipATempo: 'you already have VIP until a set date',
      vipPieni: 'the channel VIP slots are full',
      vipPermesso: 'Twitch will not let me give VIP right now',
      discordSpento: 'Discord roles are not on here',
      discordRegola: 'that role comes from the role rules, not from the shop',
      discordTuo: `link your Discord first: type ${cmdDiscord} and I will tell you how`,
      discordFuori: 'you are not in the Discord server',
      discordNo: 'Discord did not give the role',
      musicaSpenta: 'music requests are not on here',
      musicaNonTrovata: 'I could not find the song on Spotify',
      musicaFerma: 'the channel Spotify is stopped right now',
      musicaNo: 'Spotify did not take the song',
      evidenzaNo: 'Twitch did not post the message',
      riavvio: 'the bot restarted halfway through',
      rifiutato: 'the streamer said no',
      errore: 'something went wrong',
    },
    es: {
      overlay: 'el overlay está apagado en este momento',
      effetto: 'el efecto ya no existe',
      modulo: 'el módulo está apagado',
      'modulo-tier': 'el módulo no es para tu rol',
      'modulo-piattaforma': 'el módulo no funciona en esta plataforma',
      'modulo-live': 'el módulo ahora no funciona',
      'modulo-cooldown': 'el módulo está en pausa',
      'modulo-cooldownUtente': 'el módulo está en pausa para ti',
      soloTwitch: 'solo se compra desde el chat de Twitch',
      twitch: 'Twitch no ha respondido',
      vipStaff: 'Twitch no da el VIP a un moderador',
      vipSempre: 'ya tienes el VIP para siempre',
      vipATempo: 'ya tienes el VIP hasta una fecha',
      vipPieni: 'los puestos VIP del canal están llenos',
      vipPermesso: 'Twitch ahora no me deja dar el VIP',
      discordSpento: 'los roles de Discord aquí no están activos',
      discordRegola: 'ese rol lo dan las reglas de los roles, no la tienda',
      discordTuo: `primero vincula tu Discord: escribe ${cmdDiscord} y te digo cómo`,
      discordFuori: 'no estás en el servidor de Discord',
      discordNo: 'Discord no ha dado el rol',
      musicaSpenta: 'las peticiones musicales aquí no están activas',
      musicaNonTrovata: 'no he encontrado la canción en Spotify',
      musicaFerma: 'el Spotify del canal está parado ahora',
      musicaNo: 'Spotify no ha aceptado la canción',
      evidenzaNo: 'Twitch no ha publicado el mensaje',
      riavvio: 'el bot se reinició a mitad',
      rifiutato: 'el streamer ha dicho que no',
      errore: 'algo ha salido mal',
    },
  }[lin(l)];
  if (P[codice]) return P[codice];
  if (String(codice || '').startsWith('modulo')) return P.modulo;
  return P.errore;
}

// Le frasi che parlano delle monete le accordano col nome del canale:
// %[le tue|i tuoi|la tua|il tuo]% (moneta.js) si scioglie con la forma scelta
// dallo streamer, e il saldo si dice «I tuoi Semi di girasole: 450», che torna
// con ogni nome e con ogni numero. Le frasi col segno d'accordo si scrivono
// col tag `a`, che lo scioglie solo nei pezzi scritti qui: quello che arriva da
// fuori (il titolo di una canzone, il nome di un articolo) resta com'e'.
// Il nome dell'articolo non ha un genere che il bot conosca: nessuna parola
// intorno gli si accorda («hai comprato Corona», non «Corona è tuo»).
const FRASI = {
  it: {
    come: (d) => `🛒 Si compra così: ${d.cmd} e la parola dell'articolo. Cosa c'è lo vedi con ${d.cmdNegozio}.`,
    nonCe: (d) => `🛒 Nel negozio non c'è «${d.parola}». Cosa c'è lo vedi con ${d.cmdNegozio}.`,
    vuoto: () => '🛒 Il negozio per ora è vuoto.',
    elenco: (d) => `🛒 Nel negozio: ${d.voci}. Si compra con ${d.cmd} e la parola fra parentesi. Tutto il negozio: ${d.url}`,
    voce: (d) => `${d.articolo} (${d.parola}), ${d.prezzo} ${d.moneta}`,
    dettaglio: (d) => `🛒 ${d.articolo} (${d.parola}): ${d.prezzo} ${d.moneta}.${d.descrizione ? ' ' + d.descrizione : ''}${d.requisito ? ' È per chi ' + d.requisito + '.' : ''}${d.scorte ? ' ' + d.scorte : ''}`,
    restano: (d) => (d.n > 1 ? `Ne restano ${d.cifra}.` : d.n === 1 ? 'Ne resta solo 1.' : 'Le scorte sono finite.'),
    aTesta: (d) => (d.n === 1 ? 'Una volta a testa.' : `${d.cifra} volte a testa.`),
    fatto: (d, a) => a`🛒 ${d.nome}, hai comprato ${d.articolo}. %[Le tue|I tuoi|La tua|Il tuo]% ${d.moneta}: ${d.saldo}.`,
    fattoBorsa: (d, a) => a`🎒 ${d.nome}, ${d.articolo} è nella tua borsa (${d.cmdBorsa}). %[Le tue|I tuoi|La tua|Il tuo]% ${d.moneta}: ${d.saldo}.`,
    fattoCoda: (d, a) => a`🛒 ${d.nome}, ${d.articolo} è in coda: alla consegna ci pensa ${d.streamer} in diretta. %[Le tue|I tuoi|La tua|Il tuo]% ${d.moneta}: ${d.saldo}.`,
    fattoMusica: (d, a) => a`🎶 ${d.nome}, in coda su Spotify: ${d.brano}. %[Le tue|I tuoi|La tua|Il tuo]% ${d.moneta}: ${d.saldo}.`,
    fattoVip: (d, a) => a`👑 ${d.nome}, hai il VIP per ${d.direttePer}. %[Le tue|I tuoi|La tua|Il tuo]% ${d.moneta}: ${d.saldo}.`,
    sfortuna: (d) => `🎲 ${d.nome}, hai comprato ${d.articolo}, ma stavolta il dado ha detto di no.`,
    monete: (d) => `💰 ${d.nome}, ${d.articolo} costa ${d.prezzo} ${d.moneta} e tu ne hai ${d.saldo}.`,
    scorte: (d) => `🛒 ${d.articolo}: le scorte sono finite.`,
    persona: (d) => (d.quante === 1
      ? `🛒 ${d.nome}, ${d.articolo} si prende una volta sola a testa, e la tua volta l'hai già usata.`
      : `🛒 ${d.nome}, ${d.articolo} si prende ${d.quante} volte a testa, e le tue le hai già usate tutte.`),
    attesa: (d) => (d.perTutti ? `⏳ ${d.articolo} si può ricomprare fra ${d.tempo}.` : `⏳ ${d.nome}, puoi ricomprare ${d.articolo} fra ${d.tempo}.`),
    requisito: (d) => `🔒 ${d.nome}, ${d.articolo} è per chi ${d.requisito}.`,
    nonSo: (d, a) => a`🔒 ${d.nome}, ${d.articolo} è per chi ${d.requisito}, e adesso non riesco a verificarlo: %[le tue|i tuoi|la tua|il tuo]% ${d.moneta} %[restano dove sono|restano dove sono|resta dov'è|resta dov'è]%.`,
    chiuso: (d) => (d.quando === 'diretta' ? `🕒 ${d.articolo} si compra solo durante la diretta.` : `🕒 ${d.articolo} si compra dal ${d.dal} al ${d.al}.`),
    serveTesto: (d) => (d.tipo === 'musica' ? `🎶 ${d.nome}, scrivi anche la canzone: ${d.cmd} ${d.parola} e il titolo o l'artista.`
      : d.tipo === 'evidenza' ? `📣 ${d.nome}, scrivi anche il messaggio: ${d.cmd} ${d.parola} e il testo.`
        : `🛒 ${d.nome}, ${d.domanda} Rispondi così: ${d.cmd} ${d.parola} e la tua risposta.`),
    nonParte: (d, a) => a`🛒 ${d.nome}, ${d.articolo} adesso non si può comprare: ${d.perche}. %[Le tue|I tuoi|La tua|Il tuo]% ${d.moneta} %[restano dove sono|restano dove sono|resta dov'è|resta dov'è]%.`,
    rimborso: (d) => `🛒 ${d.nome}, l'acquisto di ${d.articolo} non è andato a buon fine: ${d.perche}. Ti ho reso ${d.prezzo} ${d.moneta}.`,
    rifiutato: (d) => `🛒 ${d.nome}, il tuo acquisto di ${d.articolo} non è stato accettato: ti ho reso ${d.prezzo} ${d.moneta}.`,
    borsa: (d) => `🎒 ${d.nome}, nella tua borsa: ${d.lista}.`,
    borsaVuota: (d) => `🎒 ${d.nome}, la tua borsa è vuota. Cosa c'è da comprare lo vedi con ${d.cmdNegozio}.`,
  },
  en: {
    come: (d) => `🛒 This is how you buy: ${d.cmd} and the item word. See what's there with ${d.cmdNegozio}.`,
    nonCe: (d) => `🛒 There's no «${d.parola}» in the shop. See what's there with ${d.cmdNegozio}.`,
    vuoto: () => '🛒 The shop is empty for now.',
    elenco: (d) => `🛒 In the shop: ${d.voci}. Buy with ${d.cmd} and the word in brackets. The whole shop: ${d.url}`,
    voce: (d) => `${d.articolo} (${d.parola}), ${d.prezzo} ${d.moneta}`,
    dettaglio: (d) => `🛒 ${d.articolo} (${d.parola}): ${d.prezzo} ${d.moneta}.${d.descrizione ? ' ' + d.descrizione : ''}${d.requisito ? ' It\'s for anyone who ' + d.requisito + '.' : ''}${d.scorte ? ' ' + d.scorte : ''}`,
    restano: (d) => (d.n > 0 ? `${d.cifra} left.` : 'Sold out.'),
    aTesta: (d) => (d.n === 1 ? 'Once per person.' : `${d.cifra} times per person.`),
    fatto: (d) => `🛒 ${d.nome}, you bought ${d.articolo}. Your ${d.moneta}: ${d.saldo}.`,
    fattoBorsa: (d) => `🎒 ${d.nome}, ${d.articolo} is in your bag (${d.cmdBorsa}). Your ${d.moneta}: ${d.saldo}.`,
    fattoCoda: (d) => `🛒 ${d.nome}, ${d.articolo} is in the queue: ${d.streamer} will deliver it on stream. Your ${d.moneta}: ${d.saldo}.`,
    fattoMusica: (d) => `🎶 ${d.nome}, queued on Spotify: ${d.brano}. Your ${d.moneta}: ${d.saldo}.`,
    fattoVip: (d) => `👑 ${d.nome}, you have VIP for ${d.direttePer}. Your ${d.moneta}: ${d.saldo}.`,
    sfortuna: (d) => `🎲 ${d.nome}, you bought ${d.articolo}, but this time the dice said no.`,
    monete: (d) => `💰 ${d.nome}, ${d.articolo} costs ${d.prezzo} ${d.moneta} and you have ${d.saldo}.`,
    scorte: (d) => `🛒 ${d.articolo} is sold out.`,
    persona: (d) => (d.quante === 1
      ? `🛒 ${d.nome}, ${d.articolo} is once per person, and you already had your turn.`
      : `🛒 ${d.nome}, ${d.articolo} is ${d.quante} times per person, and you already used them all.`),
    attesa: (d) => (d.perTutti ? `⏳ ${d.articolo} can be bought again in ${d.tempo}.` : `⏳ ${d.nome}, you can buy ${d.articolo} again in ${d.tempo}.`),
    requisito: (d) => `🔒 ${d.nome}, ${d.articolo} is for anyone who ${d.requisito}.`,
    nonSo: (d) => `🔒 ${d.nome}, ${d.articolo} is for anyone who ${d.requisito}, and I can't check that right now: you keep your ${d.moneta}.`,
    chiuso: (d) => (d.quando === 'diretta' ? `🕒 ${d.articolo} can only be bought during the stream.` : `🕒 ${d.articolo} can be bought from ${d.dal} to ${d.al}.`),
    serveTesto: (d) => (d.tipo === 'musica' ? `🎶 ${d.nome}, add the song too: ${d.cmd} ${d.parola} and the title or the artist.`
      : d.tipo === 'evidenza' ? `📣 ${d.nome}, add the message too: ${d.cmd} ${d.parola} and the text.`
        : `🛒 ${d.nome}, ${d.domanda} Answer like this: ${d.cmd} ${d.parola} and your answer.`),
    nonParte: (d) => `🛒 ${d.nome}, ${d.articolo} can't be bought right now: ${d.perche}. You keep your ${d.moneta}.`,
    rimborso: (d) => `🛒 ${d.nome}, ${d.articolo} didn't go through: ${d.perche}. I gave you back ${d.prezzo} ${d.moneta}.`,
    rifiutato: (d) => `🛒 ${d.nome}, your purchase of ${d.articolo} wasn't accepted: I gave you back ${d.prezzo} ${d.moneta}.`,
    borsa: (d) => `🎒 ${d.nome}, in your bag: ${d.lista}.`,
    borsaVuota: (d) => `🎒 ${d.nome}, your bag is empty. See what you can buy with ${d.cmdNegozio}.`,
  },
  es: {
    come: (d) => `🛒 Se compra así: ${d.cmd} y la palabra del artículo. Lo que hay lo ves con ${d.cmdNegozio}.`,
    nonCe: (d) => `🛒 En la tienda no hay «${d.parola}». Lo que hay lo ves con ${d.cmdNegozio}.`,
    vuoto: () => '🛒 La tienda por ahora está vacía.',
    elenco: (d) => `🛒 En la tienda: ${d.voci}. Se compra con ${d.cmd} y la palabra entre paréntesis. Toda la tienda: ${d.url}`,
    voce: (d) => `${d.articolo} (${d.parola}), ${d.prezzo} ${d.moneta}`,
    dettaglio: (d) => `🛒 ${d.articolo} (${d.parola}): ${d.prezzo} ${d.moneta}.${d.descrizione ? ' ' + d.descrizione : ''}${d.requisito ? ' Es para quien ' + d.requisito + '.' : ''}${d.scorte ? ' ' + d.scorte : ''}`,
    restano: (d) => (d.n > 1 ? `Quedan ${d.cifra}.` : d.n === 1 ? 'Queda solo 1.' : 'Se ha agotado.'),
    aTesta: (d) => (d.n === 1 ? 'Una vez por persona.' : `${d.cifra} veces por persona.`),
    fatto: (d, a) => a`🛒 ${d.nome}, has comprado ${d.articolo}. %[Tus|Tus|Tu|Tu]% ${d.moneta}: ${d.saldo}.`,
    fattoBorsa: (d, a) => a`🎒 ${d.nome}, ${d.articolo} está en tu bolsa (${d.cmdBorsa}). %[Tus|Tus|Tu|Tu]% ${d.moneta}: ${d.saldo}.`,
    fattoCoda: (d, a) => a`🛒 ${d.nome}, ${d.articolo} está en la cola: de la entrega se encarga ${d.streamer} en directo. %[Tus|Tus|Tu|Tu]% ${d.moneta}: ${d.saldo}.`,
    fattoMusica: (d, a) => a`🎶 ${d.nome}, en la cola de Spotify: ${d.brano}. %[Tus|Tus|Tu|Tu]% ${d.moneta}: ${d.saldo}.`,
    fattoVip: (d, a) => a`👑 ${d.nome}, tienes el VIP durante ${d.direttePer}. %[Tus|Tus|Tu|Tu]% ${d.moneta}: ${d.saldo}.`,
    sfortuna: (d) => `🎲 ${d.nome}, has comprado ${d.articolo}, pero esta vez el dado ha dicho que no.`,
    monete: (d) => `💰 ${d.nome}, ${d.articolo} cuesta ${d.prezzo} ${d.moneta} y tú tienes ${d.saldo}.`,
    scorte: (d) => `🛒 ${d.articolo} se ha agotado.`,
    persona: (d) => (d.quante === 1
      ? `🛒 ${d.nome}, ${d.articolo} se compra una vez por persona, y tu vez ya la has usado.`
      : `🛒 ${d.nome}, ${d.articolo} se compra ${d.quante} veces por persona, y ya las has usado todas.`),
    attesa: (d) => (d.perTutti ? `⏳ ${d.articolo} se puede volver a comprar dentro de ${d.tempo}.` : `⏳ ${d.nome}, puedes volver a comprar ${d.articolo} dentro de ${d.tempo}.`),
    requisito: (d) => `🔒 ${d.nome}, ${d.articolo} es para quien ${d.requisito}.`,
    nonSo: (d, a) => a`🔒 ${d.nome}, ${d.articolo} es para quien ${d.requisito}, y ahora no puedo comprobarlo: %[tus|tus|tu|tu]% ${d.moneta} %[se quedan donde están|se quedan donde están|se queda donde está|se queda donde está]%.`,
    chiuso: (d) => (d.quando === 'diretta' ? `🕒 ${d.articolo} solo se compra durante el directo.` : `🕒 ${d.articolo} se compra del ${d.dal} al ${d.al}.`),
    serveTesto: (d) => (d.tipo === 'musica' ? `🎶 ${d.nome}, escribe también la canción: ${d.cmd} ${d.parola} y el título o el artista.`
      : d.tipo === 'evidenza' ? `📣 ${d.nome}, escribe también el mensaje: ${d.cmd} ${d.parola} y el texto.`
        : `🛒 ${d.nome}, ${d.domanda} Responde así: ${d.cmd} ${d.parola} y tu respuesta.`),
    nonParte: (d, a) => a`🛒 ${d.nome}, ${d.articolo} ahora no se puede comprar: ${d.perche}. %[Tus|Tus|Tu|Tu]% ${d.moneta} %[se quedan donde están|se quedan donde están|se queda donde está|se queda donde está]%.`,
    rimborso: (d) => `🛒 ${d.nome}, la compra de ${d.articolo} no ha salido bien: ${d.perche}. Te he devuelto ${d.prezzo} ${d.moneta}.`,
    rifiutato: (d) => `🛒 ${d.nome}, tu compra de ${d.articolo} no ha sido aceptada: te he devuelto ${d.prezzo} ${d.moneta}.`,
    borsa: (d) => `🎒 ${d.nome}, en tu bolsa: ${d.lista}.`,
    borsaVuota: (d) => `🎒 ${d.nome}, tu bolsa está vacía. Lo que puedes comprar lo ves con ${d.cmdNegozio}.`,
  },
};

export const MOMENTI = Object.keys(FRASI.it);

// Quello che il negozio dice in chat: un momento, i suoi dati, la lingua del
// canale. Il nome della moneta lo mette frase() stessa, da moneta.js: chi
// chiama non lo passa. Un momento che non c'e' e' un errore di chi chiama, e
// torna vuoto.
export function frase(canale, momento, dati = {}) {
  const l = lin(preferenzeDi(canale).lingua);
  const f = FRASI[l][momento] || FRASI.it[momento];
  if (!f) return '';
  const m = monetaIn(canale, l);
  const a = (pezzi, ...valori) => pezzi.reduce((t, p, i) => t + accordaMoneta(p, m.forma) + (i < valori.length ? valori[i] : ''), '');
  return f({ ...dati, moneta: m.nome }, a);
}

// ------------------------------------------------------------------ l'acquisto

const nomeDi = (msg) => String(msg?.display || msg?.user || '').slice(0, 40);
const comandi = (ch) => ({
  cmd: '!' + nomeIn(ch, 'compra'),
  cmdNegozio: '!' + nomeIn(ch, 'negozio'),
  cmdBorsa: '!' + nomeIn(ch, 'borsa'),
  cmdDiscord: '!' + nomeIn(ch, 'discord'),
});

// Un acquisto, dall'inizio alla fine. Torna { ok, momento, dati }: il momento
// e' quello della frase da dire, e `ok` dice se le monete sono state spese.
//
// `fonti` legge i requisiti che stanno su Twitch (negozio-requisiti.js),
// `esecutori` fa partire gli effetti (negozio-tipi.js): arrivano da fuori, cosi'
// l'acquisto si prova senza rete e senza Twitch.
export async function compra({ canale, msg, parola, nota = '', live = false, fonti = {}, esecutori = {}, dire = () => {}, ora = Date.now() } = {}) {
  const ch = String(canale || '').toLowerCase();
  const pf = preferenzeDi(ch);
  const l = lin(pf.lingua);
  const c = comandi(ch);
  const base = { nome: nomeDi(msg), ...c };
  const no = (momento, dati = {}) => ({ ok: false, momento, dati: { ...base, ...dati } });
  const p = pulisci(parola).replace(/[^a-z0-9]/g, '').slice(0, 20);
  if (!p) return no('come');
  const a = negozioDb.perParola(ch, p);
  if (!a || !a.attivo) return no('nonCe', { parola: p });
  const art = { articolo: a.nome, parola: a.parola, prezzo: cifra(a.prezzo, pf), tipo: a.tipo };

  // 1. Tutto quello che puo' dire di no senza toccare niente.
  if (a.quando === 'diretta' && !live) return no('chiuso', { ...art, quando: 'diretta' });
  if (a.quando === 'date' && (ora < a.dal || ora > a.al)) return no('chiuso', { ...art, quando: 'date', dal: data(a.dal, pf), al: data(a.al, pf) });
  const ostacolo = negozioDb.ostacolo(ch, a, msg?.user, ora);
  if (ostacolo && ostacolo.motivo !== 'monete') return no(ostacolo.motivo, datiOstacolo(ostacolo, a, pf));
  const r = await requisiti.verifica(a.requisiti, { canale: ch, msg, fonti, ora });
  if (r) return no(r.esito === 'no' ? 'requisito' : 'nonSo', { ...art, requisito: requisitoAParole(r.req, pf) });
  if (ostacolo) return no('monete', { ...art, saldo: cifra(ostacolo.saldo, pf) });
  const testo = String(nota || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (tipi.serveTesto(a) && !testo) return no('serveTesto', { ...art, domanda: a.dati?.domanda || '' });
  const nasce = tipi.nascita(a.tipo);
  const es = esecutori[a.tipo];
  if (nasce.stato === 'in_corso') {
    if (!es) return no('nonParte', { ...art, perche: percheAParole('errore', l) });
    const perche = es.puoPartire({ canale: ch, a, msg, nota: testo });
    if (perche) return no('nonParte', { ...art, perche: percheAParole(perche, l, c), codice: perche });
  }

  // 2. La parte nel database, tutta insieme.
  const pr = negozioDb.prenota(ch, { articolo: a.id, user: msg?.user, display: nomeDi(msg), nota: testo, ...nasce, ora });
  if (!pr.ok) {
    const quale = pr.articolo || a;
    if (pr.motivo === 'monete') return no('monete', { ...art, saldo: cifra(pr.saldo ?? 0, pf) });
    if (pr.motivo === 'nonCe') return no('nonCe', { parola: p });
    return no(pr.motivo, datiOstacolo(pr, quale, pf));
  }
  const pagato = { ...art, prezzo: cifra(pr.articolo.prezzo, pf), saldo: cifra(pr.saldo, pf), id: pr.id };
  const fatto = (momento, dati = {}) => ({ ok: true, momento, dati: { ...base, ...pagato, ...dati } });
  if (nasce.stato === 'fatto') return fatto('fattoBorsa');
  if (nasce.stato === 'da_consegnare') return fatto('fattoCoda', { streamer: streamers.get(ch)?.display || ch });

  // 3. L'effetto. Se non parte, le monete e la scorta tornano.
  let e;
  try { e = await es.esegui({ canale: ch, a: pr.articolo, msg, nota: testo, dire, lingua: l }); }
  catch (err) { log.warn(`#${ch} ${a.tipo}:`, err?.message || err); e = { ok: false, motivo: 'errore' }; }
  if (e?.ok) {
    negozioDb.conferma(ch, pr.id);
    if (e.dati?.sfortuna) return fatto('sfortuna');
    if (a.tipo === 'musica') return fatto('fattoMusica', { brano: e.dati?.brano || testo });
    if (a.tipo === 'vip') return fatto('fattoVip', { direttePer: e.dati?.direttePer || '' });
    return fatto('fatto');
  }
  const motivo = e?.motivo || 'errore';
  const reso = negozioDb.rimborsa(ch, pr.id, motivo, { da: ['in_corso'] });
  return {
    ok: false,
    momento: 'rimborso',
    dati: { ...base, ...art, perche: percheAParole(motivo, l, c), codice: motivo, prezzo: cifra(pr.articolo.prezzo, pf), saldo: cifra(reso.saldo ?? 0, pf), id: pr.id },
  };
}

function datiOstacolo(o, a, pf) {
  const art = { articolo: a.nome, parola: a.parola, prezzo: cifra(a.prezzo, pf) };
  if (o.motivo === 'persona') return { ...art, quante: a.perPersona };
  if (o.motivo === 'attesa') return { ...art, tempo: tempo(o.resta, pf), perTutti: !!o.perTutti };
  return art;
}

// Gli acquisti rimasti a meta' da prima di un riavvio: il processo e' morto fra
// le monete e l'effetto, e nessuno sa se l'effetto e' partito. Si rendono: fra
// i due sbagli possibili, quello che non toglie niente a chi ha comprato.
export function rimborsaSospesi() {
  const resi = [];
  for (const s of negozioDb.sospesi()) {
    const r = negozioDb.rimborsa(s.channel, s.id, 'riavvio', { da: ['in_corso'] });
    if (r.ok) resi.push({ channel: s.channel, user: s.user, nome: s.nome, prezzo: s.prezzo });
  }
  return resi;
}

// Lo storico si tiene un anno: la pulizia la fa girare il bot.
export const potaStorico = (ora = Date.now()) => negozioDb.pota(ora);

// ------------------------------------------------------------------ in chat

// Gli articoli che si mostrano a tutti, dai piu' comprati. Quelli che si
// vedono solo a chi li puo' comprare non escono in una risposta che legge
// tutta la chat.
export function inVetrina(canale, ora = Date.now()) {
  const ch = String(canale || '').toLowerCase();
  const venduti = negozioDb.venduti(ch);
  return negozioDb.articoli(ch)
    .filter((a) => a.attivo && a.siVede === 'sempre' && !(a.quando === 'date' && (ora < a.dal || ora > a.al)))
    .map((a) => ({ ...a, venduti: venduti.get(a.id) || 0 }))
    .sort((x, y) => y.venduti - x.venduti || x.ordine - y.ordine || x.id - y.id);
}

function rispostaNegozio(ch, msg, args, pf) {
  const l = lin(pf.lingua);
  const c = comandi(ch);
  const base = { nome: nomeDi(msg), ...c };
  const chiesta = pulisci(args[0] || '').replace(/[^a-z0-9]/g, '');
  if (chiesta) {
    const a = negozioDb.perParola(ch, chiesta);
    if (!a || !a.attivo || a.siVede !== 'sempre') return [frase(ch, 'nonCe', { ...base, parola: chiesta })];
    const s = scorteDi(a);
    const scorte = s.modo === 'tutto' ? frase(ch, 'restano', { n: s.n, cifra: cifra(s.n, pf) })
      : s.modo === 'persona' ? frase(ch, 'aTesta', { n: s.n, cifra: cifra(s.n, pf) }) : '';
    const requisito = a.requisiti.map((r) => requisitoAParole(r, pf)).join(l === 'en' ? ' and ' : l === 'es' ? ' y ' : ' e ');
    return [frase(ch, 'dettaglio', { ...base, articolo: a.nome, parola: a.parola, prezzo: cifra(a.prezzo, pf), descrizione: a.descrizione, requisito, scorte })];
  }
  const primi = inVetrina(ch).slice(0, 3);
  if (!primi.length) return [frase(ch, 'vuoto', base)];
  const voci = primi.map((a) => frase(ch, 'voce', { articolo: a.nome, parola: a.parola, prezzo: cifra(a.prezzo, pf) })).join(' · ');
  return [frase(ch, 'elenco', { ...base, voci, url: urlPaginaNegozio(ch) })];
}

function rispostaBorsa(ch, msg, pf) {
  const c = comandi(ch);
  const base = { nome: nomeDi(msg), ...c };
  const b = negozioDb.borsa(ch, msg?.user);
  if (!b.length) return [frase(ch, 'borsaVuota', base)];
  const pezzi = b.map((x) => (x.quanti > 1 ? `${x.nome} (${cifra(x.quanti, pf)})` : x.nome));
  const testa = frase(ch, 'borsa', { ...base, lista: '' }).replace(/\s*\.$/, '');
  return inMessaggi(pezzi, spazioPer(msg), { testa, sep: ', ', coda: '.', primaDellaCoda: '' });
}

// I comandi, gia' nel loro nome di serie (il vaglio di comandi-registro.js ha
// tradotto quello rinominato): 'negozio', 'compra', 'borsa'. `ambiente` porta
// quello che serve per comprare davvero: helix, gli overlay, i Moduli, e se il
// canale e' in diretta. Torna true se il messaggio era suo.
export async function tryComando(msg, parla, ambiente = {}) {
  const testo = String(msg?.text || '').trim();
  if (!testo.startsWith('!')) return false;
  const parti = testo.slice(1).split(/\s+/);
  const cmd = (parti.shift() || '').toLowerCase();
  if (cmd !== 'negozio' && cmd !== 'compra' && cmd !== 'borsa') return false;
  const ch = String(msg?.channel || '').toLowerCase();
  if (!ch || !aperto(ch)) return false;
  const pf = preferenzeDi(ch);
  const risposta = aChi(msg, parla);
  try {
    if (cmd === 'negozio') { rispostaNegozio(ch, msg, parti, pf).forEach(risposta); return true; }
    if (cmd === 'borsa') { rispostaBorsa(ch, msg, pf).forEach(risposta); return true; }
    const esito = await compra({
      canale: ch, msg, parola: parti[0] || '', nota: parti.slice(1).join(' '),
      live: ambiente.live === true,
      fonti: ambiente.fonti || requisiti.fontiTwitch(ambiente.helix),
      esecutori: ambiente.esecutori || tipi.esecutori(ambiente),
      dire: parla,
    });
    if (esito.ok) log.info(`#${ch} ${msg?.user} ha comprato ${esito.dati.articolo} (${esito.momento})`);
    risposta(frase(ch, esito.momento, esito.dati));
  } catch (e) {
    log.error(`#${ch} ${cmd}:`, e?.message || e);
  }
  return true;
}

// ------------------------------------------------------------------ il pannello
//
// Quello che la scheda Negozio legge e scrive. Il server fa solo da porta:
// chi e' entrato, e il canale e' il suo. Tutte le decisioni stanno qui.

// Lo stato del negozio per la scheda: gli articoli con quante volte sono stati
// comprati e in quante borse stanno, la coda da consegnare, lo storico.
export function vistaPannello(canale) {
  const ch = String(canale || '').toLowerCase();
  const venduti = negozioDb.venduti(ch);
  const immagineUrl = (ref) => {
    const m = /^effetto:(.+)$/.exec(ref || '');
    const e = m ? effectsDb.get(ch, m[1]) : null;
    return e && e.tipo === 'immagine' ? `/api/streamer/libreria/media/${e.id}` : '';
  };
  return {
    attivo: streamers.get(ch)?.settings?.negozio?.attivo === true,
    url: urlPaginaNegozio(ch),
    comandi: { negozio: nomeIn(ch, 'negozio'), compra: nomeIn(ch, 'compra'), borsa: nomeIn(ch, 'borsa') },
    max: MAX_ARTICOLI,
    articoli: negozioDb.articoli(ch).map((a) => ({
      ...a, scorte: scorteDi(a), venduti: venduti.get(a.id) || 0,
      inBorse: a.tipo === 'oggetto' ? negozioDb.inQuanteBorse(ch, a.id) : 0,
      immagineUrl: immagineUrl(a.immagine),
    })),
    coda: negozioDb.coda(ch),
    storico: negozioDb.storico(ch),
    // quello che l'editor offre: gli effetti della libreria del canale e i suoi Moduli
    effetti: effectsDb.list(ch).map((e) => ({ comando: e.comando, tipo: e.tipo })),
    moduli: modulesDb.list(ch).map((m) => ({ id: m.id, nome: m.nome, attivo: !!m.attivo })),
  };
}

export function apri(canale, attivo) {
  const ch = String(canale || '').toLowerCase();
  const s = streamers.get(ch);
  if (!s) return false;
  streamers.setSettings(ch, { ...(s.settings || {}), negozio: { ...(s.settings?.negozio || {}), attivo: !!attivo } });
  return !!attivo;
}

// Salva un articolo dal pannello. Quello che normArticolo non puo' sapere da
// solo si guarda qui, nel canale: l'immagine e l'effetto stanno nella sua
// libreria, il modulo e' suo, il ruolo di Discord non lo decide gia' una regola.
export function salvaArticolo(canale, grezzo) {
  const ch = String(canale || '').toLowerCase();
  const n = normArticolo(grezzo);
  if (!n.ok) return n;
  const a = n.articolo;
  if (!a.id && negozioDb.articoli(ch).length >= MAX_ARTICOLI) return { ok: false, errore: 'troppi' };
  if (grezzo?.immagine && !a.immagine) return { ok: false, errore: 'immagine' };
  if (a.immagine && effectsDb.get(ch, a.immagine.slice('effetto:'.length))?.tipo !== 'immagine') return { ok: false, errore: 'immagine' };
  if (a.tipo === 'effetto' && a.dati.effetto && !effectsDb.get(ch, a.dati.effetto)) return { ok: false, errore: 'effetto' };
  if (a.tipo === 'modulo' && !modulesDb.get(ch, a.dati.modulo)) return { ok: false, errore: 'modulo' };
  if (a.tipo === 'discord' && ruoliNostri(normRegole(dcRuoli.get(ch)?.regole)).has(a.dati.ruolo)) return { ok: false, errore: 'ruoloRegola' };
  const r = negozioDb.salva(ch, a);
  if (!r.ok) return { ok: false, errore: r.motivo === 'parola' ? 'parolaUsata' : 'nonCe' };
  return { ok: true, articolo: r.articolo };
}

export const togliArticolo = (canale, id) => negozioDb.togli(canale, id);

// «Fatto»: lo streamer l'ha consegnato.
export const consegna = (canale, id) => ({ ok: negozioDb.consegna(canale, id) });

// «Rifiuta e rimborsa»: le monete tornano, e a chi l'aveva comprato lo si dice
// in chat. Torna la frase da dire, che il server manda con la voce del canale.
export function rifiuta(canale, id) {
  const ch = String(canale || '').toLowerCase();
  const r = negozioDb.rimborsa(ch, id, 'rifiutato', { da: ['da_consegnare'] });
  if (!r.ok) return { ok: false };
  const pf = preferenzeDi(ch);
  return { ok: true, frase: frase(ch, 'rifiutato', { nome: r.display || r.user, articolo: r.nome, prezzo: cifra(r.prezzo, pf) }) };
}
