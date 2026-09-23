// IL FILO CON DISCORD: solo quello che serve per dare e togliere un ruolo.
//
// La REGOLA sta in `discord-ruoli.js` e non sa cosa sia Discord. Qui c'e' il
// contrario: nessuna decisione, solo le chiamate — leggere i ruoli del server,
// leggere un membro, dare un ruolo, toglierlo — e la traduzione degli errori in
// qualcosa che il pannello possa dire a una persona.
//
// Cose che non devono poter succedere, e come sono chiuse:
//
//  · PARLARE CON UN ALTRO HOST. L'indirizzo non arriva mai da fuori: la base e'
//    fissa (`API`), e dentro il percorso ci vanno solo numeri. Un id che non e'
//    fatto di sole cifre non parte nemmeno: e' l'unico modo per uscire dal
//    percorso, e si chiude prima della chiamata, non dopo.
//  · IL TOKEN NEL REGISTRO. Il token del bot e' un segreto dello streamer: non
//    finisce mai in un log, nemmeno in un pezzo. Quando una chiamata va male si
//    scrive cosa e' successo, non con cosa ci si e' autenticati.
//  · RESTARE APPESI. Ogni chiamata ha il suo tempo massimo.
//  · INSISTERE DA SOLI. Se Discord dice «troppe richieste» si aspetta il tempo
//    che dice LUI, una volta sola. Il resto lo decide il giro che chiama: un
//    modulo che riprova per conto suo, in silenzio, e' un modulo che non si
//    riesce piu' a fermare.
//
// «Non e' nel server» NON e' un errore: e' una risposta. Un ruolo non si puo'
// dare a chi non c'e', e va detto cosi', non come un guasto.
import { config } from '../config.js';
import { makeLog } from '../logger.js';
import { livelloDi } from './discord-ruoli.js';

const log = makeLog('discord-api');

const API = 'https://discord.com/api/v10';
const TIMEOUT_MS = 8000;
const ATTESA_MAX_MS = 5000;   // oltre questa, «troppe richieste» si dice e basta
const UA = 'SocialBot (https://socialbot.live, 1.0)';

export const ID_RE = /^[0-9]{5,24}$/;
export const idOk = (v) => ID_RE.test(String(v || ''));

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

// Il messaggio che leggera' una persona. Il codice di Discord conta piu' dello
// stato HTTP: 50013 e' «non ho il permesso», e capita anche con un 403 generico.
// DI COSA PARLAVA LA CHIAMATA, ricavato dalla chiamata stessa.
//
// Questo messaggio e' nato quando il bot faceva solo i ruoli, e diceva «manca
// il permesso Gestire i ruoli» per ogni 403. Poi sono arrivati i canali, e
// quella frase ha continuato a uscire: chi provava a cancellare un canale si
// sentiva parlare di ruoli, e andava a controllare la cosa sbagliata.
//
// Non si corregge ricordandosi di aggiornare la frase quando si aggiunge una
// funzione: si ricava dal percorso, che e' l'unica cosa che sa davvero cosa si
// stava facendo.
// L'elenco sta qui e non sparso: `scripts/verifica-insegne.mjs` prende ogni
// percorso che questo file chiama e pretende che una di queste righe lo
// riconosca. Cosi' una funzione nuova che dimentica la sua riga non passa — e
// «quella cosa» smette di poter essere la risposta per meta' del prodotto.
const INSEGNE = [
  [/\/messages(\/|$)/, 'quel canale', 'Inviare messaggi'],
  [/\/members\//, 'quella persona', 'Gestire i ruoli'],
  [/\/roles(\/|$)/, 'quel ruolo', 'Gestire i ruoli'],
  [/\/channels(\/|$)/, 'quel canale', 'Gestire i canali'],
  [/\/welcome-screen$/, 'la prima schermata del server', 'Gestire il server'],
  [/\/onboarding$/, 'la porta d\'ingresso', 'Gestire il server'],
  [/\/auto-moderation\/rules(\/|$)/, 'il filtro del server', 'Gestire il server'],
  [/\/scheduled-events(\/|$)/, 'gli appuntamenti sul calendario', 'Creare eventi'],
  [/^\/guilds\/\d+$/, 'le impostazioni del server', 'Gestire il server'],
];
const diCosa = (via) => {
  const v = String(via || '').split('?')[0];
  for (const [re, cosa, permesso] of INSEGNE) if (re.test(v)) return { cosa, permesso };
  return { cosa: 'quella cosa', permesso: 'quello che serve' };
};

// QUANDO DISCORD DICE «Invalid Form Body».
//
// E' la sua frase per «il corpo non mi va bene», in inglese e senza soggetto:
// letta in un pannello italiano, in mezzo ad altri errori, non dice ne' cosa
// non andava ne' dove guardare. Il dettaglio vero sta in `errors`, annidato
// quanto il campo che ha sbagliato, e in fondo c'e' sempre un `_errors` con la
// frase che serve. Si scende fino a li' e si riporta quella, col soggetto
// davanti: e' l'unica parte che aiuta chi legge.
function dettaglioForm(corpo) {
  let dentro = corpo?.errors;
  for (let giro = 0; dentro && typeof dentro === 'object' && giro < 8; giro++) {
    if (Array.isArray(dentro._errors)) return String(dentro._errors[0]?.message || '').slice(0, 120);
    const chiavi = Object.keys(dentro);
    if (!chiavi.length) break;
    dentro = dentro[chiavi[0]];
  }
  return '';
}

function spiega(stato, corpo, via) {
  const cod = Number(corpo?.code) || 0;
  const { cosa, permesso } = diCosa(via);
  if (stato === 401) return 'il token del bot non vale piu\': rigeneralo su Discord e rimettilo qui';
  if (cod === 50013 || cod === 50001) {
    return `su ${cosa} il bot non puo\' intervenire: gli manca «${permesso}», oppure quella cosa sta piu' in alto di lui`;
  }
  if (stato === 403) return `Discord non lascia toccare ${cosa} al bot: controlla i suoi permessi e la sua posizione`;
  if (stato === 404) return `non trovato: ${cosa} non c'e' piu'`;
  if (stato === 400) {
    const d = dettaglioForm(corpo);
    return `su ${cosa} Discord ha rifiutato quello che gli abbiamo mandato${d ? ': ' + d : ''}`;
  }
  if (stato >= 500) return 'Discord non sta bene in questo momento';
  return corpo?.message ? String(corpo.message).slice(0, 140) : ('HTTP ' + stato);
}

// IL MOTIVO, per il registro del server.
//
// Discord tiene 45 giorni di registro e accanto a ogni azione puo' scriverci
// PERCHE' e' stata fatta, se chi la fa glielo dice. Senza, chi apre il registro
// di casa sua legge «SocialBot ha dato Abbonati» e non sa in nome di cosa: un
// bot che muove ruoli e non rende conto.
//
// L'intestazione vuole testo gia' sfuggito e sta sotto i 512 caratteri: si
// taglia prima di sfuggire, se no un accento a meta' diventerebbe un mozzicone.
const MOTIVO_MAX = 180;
const motivoPer = (perche) => {
  const t = String(perche || '').replace(/\s+/g, ' ').trim().slice(0, MOTIVO_MAX);
  return t ? { 'X-Audit-Log-Reason': encodeURIComponent('SocialBot · ' + t) } : {};
};

// Una chiamata sola. Torna { ok, dati } oppure { ok:false, errore, stato, assente }.
async function chiama(token, via, { metodo = 'GET', corpo = null, riprova = true, perche = '' } = {}) {
  const t = String(token || '').trim();
  if (!t) return { ok: false, errore: 'manca il token del bot' };
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(API + via, {
      method: metodo,
      signal: ac.signal,
      headers: {
        Authorization: 'Bot ' + t,
        'User-Agent': UA,
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        ...motivoPer(perche),
      },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    });
    if (r.status === 429) {
      const d = await r.json().catch(() => null);
      const ms = Math.round((Number(d?.retry_after) || 1) * 1000);
      if (riprova && ms <= ATTESA_MAX_MS) {
        clearTimeout(to);
        await attendi(ms);
        return chiama(token, via, { metodo, corpo, riprova: false, perche });
      }
      return { ok: false, errore: 'troppe richieste: riprovo piu\' tardi', stato: 429, attesa: ms };
    }
    if (r.status === 204) return { ok: true, dati: null };
    const d = await r.json().catch(() => null);
    if (r.ok) return { ok: true, dati: d };
    if (r.status === 404) return { ok: false, errore: spiega(404, d, via), stato: 404, assente: true };
    log.warn('chiamata', metodo, via.replace(/\d{5,}/g, '#'), '→', r.status);
    return { ok: false, errore: spiega(r.status, d, via), stato: r.status };
  } catch (e) {
    return { ok: false, errore: 'Discord irraggiungibile' };
  } finally { clearTimeout(to); }
}

// I ruoli del server, come li vede il bot. `position` serve a sapere cosa e'
// fuori dalla sua portata, `managed` a riconoscere quelli di un'integrazione
// (il ruolo dei sub di Twitch, per dirne uno) che non si danno a mano.
export async function ruoli(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}/roles`);
  if (!r.ok) return r;
  const lista = (Array.isArray(r.dati) ? r.dati : []).map((x) => ({
    id: String(x?.id || ''),
    nome: String(x?.name || ''),
    position: Number(x?.position) || 0,
    managed: !!x?.managed,
    // `color` e' deprecato e `colors.primary_color` e' la stessa cosa detta
    // bene: si legge il secondo e si ripiega sul primo, cosi' un server che
    // risponde ancora alla vecchia maniera non diventa «tutti i ruoli grigi».
    colore: Number(x?.colors?.primary_color ?? x?.color) || 0,
    // Un ruolo non e' solo quello che puo' fare: e' anche come si vede. Chi sta
    // «a parte» compare in cima all'elenco delle persone col suo nome sopra, ed
    // e' tutto il senso di un ruolo decorativo come «Streamer». Senza questi
    // due, il costruttore ricreerebbe ogni volta un ruolo che sembra diverso.
    separato: !!x?.hoist,
    citabile: !!x?.mentionable,
    // LA SFUMATURA E L'OLOGRAFICO. Il terzo colore non si sceglie: quando c'e',
    // Discord impone la terna esatta, quindi leggerlo come un interruttore e'
    // leggerlo per quello che e'.
    sfuma: x?.colors?.secondary_color == null ? null : Number(x.colors.secondary_color) || 0,
    olografico: x?.colors?.tertiary_color != null,
    // Il segno: l'icona torna come IMPRONTA, non come immagine — e questo
    // decide come si confronta piu' in la'.
    icona: String(x?.icon || ''),
    emoji: String(x?.unicode_emoji || ''),
    permessi: String(x?.permissions || '0'),
  })).filter((x) => x.id);
  return { ok: true, ruoli: lista };
}

// Il server: il nome, per far vedere allo streamer che si e' collegato al suo.
// E con lui i quattro canali che Discord tiene per se' nei server Community: non
// sono un elenco che manteniamo noi, e' il server stesso a dire quali sono, e
// per questo non possono finire fra quelli da togliere.
export async function server(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}`);
  if (!r.ok) return r;
  const d = r.dati || {};
  const forse = (v) => (v ? String(v) : null);
  return {
    ok: true,
    id: String(d.id || guild),
    nome: String(d.name || ''),
    guild: {
      id: String(d.id || guild),
      nome: String(d.name || ''),
      rules_channel_id: forse(d.rules_channel_id),
      public_updates_channel_id: forse(d.public_updates_channel_id),
      safety_alerts_channel_id: forse(d.safety_alerts_channel_id),
      system_channel_id: forse(d.system_channel_id),
      community: (d.features || []).includes('COMMUNITY'),
      // CHI E' IL PROPRIETARIO. Sta nella stessa risposta, quindi non costa
      // niente: serve a dare il ruolo della traccia che e' «tuo» a chi il
      // server ce l'ha — senza chiedergli di collegarsi come uno spettatore.
      proprietario: idOk(String(d.owner_id || '')) ? String(d.owner_id) : '',
    },
    // Le impostazioni vere, lette dalla stessa risposta: non costano una
    // chiamata in piu' e senza di loro la differenza non saprebbe mai dire
    // «qui il livello di verifica non e' quello che hai chiesto».
    impostazioni: impostazioniDa(d),
    caratteristiche: (d.features || []).map(String),
  };
}

// Chi e' il bot e che ruoli ha DENTRO quel server: da qui esce la sua altezza.
export async function io(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const me = await chiama(token, '/users/@me');
  if (!me.ok) return me;
  const id = String(me.dati?.id || '');
  if (!id) return { ok: false, errore: 'Discord non dice chi e\' il bot' };
  const m = await chiama(token, `/guilds/${guild}/members/${id}`);
  if (!m.ok) {
    if (m.assente) return { ok: false, errore: 'il bot non e\' dentro quel server: invitalo prima' };
    return m;
  }
  return { ok: true, id, nome: String(me.dati?.username || ''), ruoli: (m.dati?.roles || []).map(String) };
}

// Un membro. Chi non c'e' non e' un guasto: torna { ok:true, dentro:false }.
export async function membro(token, guild, utente) {
  if (!idOk(guild) || !idOk(utente)) return { ok: false, errore: 'id non valido' };
  const r = await chiama(token, `/guilds/${guild}/members/${utente}`);
  if (r.assente) return { ok: true, dentro: false, ruoli: [] };
  if (!r.ok) return r;
  return {
    ok: true,
    dentro: true,
    ruoli: (r.dati?.roles || []).map(String),
    nome: String(r.dati?.nick || r.dati?.user?.global_name || r.dati?.user?.username || ''),
  };
}

export async function dai(token, guild, utente, ruolo, perche = '') {
  if (!idOk(guild) || !idOk(utente) || !idOk(ruolo)) return { ok: false, errore: 'id non valido' };
  return chiama(token, `/guilds/${guild}/members/${utente}/roles/${ruolo}`, { metodo: 'PUT', perche });
}

// FARLO ENTRARE. Il token del bot dice chi chiede, quello della persona dice
// che lei e' d'accordo: senza il secondo Discord rifiuta, ed e' giusto cosi' —
// nessuno deve poter infilare qualcun altro in un server.
//
// Chi c'e' gia' torna 204 senza corpo, e per noi e' un successo uguale: la cosa
// che volevamo — quella persona dentro quel server — e' vera in tutti e due i
// casi. Distinguere i due esiti servirebbe solo a scrivere due frasi dove ne
// basta una.
export async function entraNelServer(token, guild, utente, accessToken) {
  if (!idOk(guild) || !idOk(utente)) return { ok: false, errore: 'id non valido' };
  if (!String(accessToken || '').trim()) return { ok: false, errore: 'manca il consenso della persona' };
  return chiama(token, `/guilds/${guild}/members/${utente}`, {
    metodo: 'PUT',
    corpo: { access_token: String(accessToken) },
  });
}

export async function togli(token, guild, utente, ruolo, perche = '') {
  if (!idOk(guild) || !idOk(utente) || !idOk(ruolo)) return { ok: false, errore: 'id non valido' };
  return chiama(token, `/guilds/${guild}/members/${utente}/roles/${ruolo}`, { metodo: 'DELETE', perche });
}

// IL TOKEN CON CUI SI PARLA. Il suo, se se n'e' portato uno; sennò il nostro.
// Un campo vuoto non vuol dire «niente bot»: vuol dire «quello della casa».
export const tokenDi = (riga) => String(riga?.token || '').trim() || String(config.discordApp?.botToken || '').trim();

// ------------------------------------------------------------ invitare il bot
// Il giro che toglie di mezzo il tutorial: lo streamer clicca, Discord gli mostra
// LA SUA scelta del server (solo quelli dove e' amministratore), lui conferma il
// permesso e il bot entra.
//
// Chiediamo un permesso solo, «Gestire i ruoli», perche' e' l'unico che serve:
// una lista lunga di permessi su una schermata di conferma e' il modo migliore
// per farsi dire di no, e sarebbe anche potere che non ci serve.
//
// L'ID DEL SERVER NON ARRIVA DALLA QUERY. Discord lo rimanda anche li'
// (`guild_id`), ma quella query passa dal browser di chi autorizza e si
// riscrive: chi volesse potrebbe puntare le proprie regole al server di un
// altro streamer dove il nostro bot e' gia' dentro. Quello buono sta nella
// RISPOSTA dello scambio del codice, che arriva da Discord a noi.
// I permessi che chiediamo all'invito. Erano solo «Gestire i ruoli»; col
// costruttore serve anche «Gestire i canali» — e chi ha gia' invitato il bot
// deve ripassare dal tasto, perche' reinvitare aggiorna i permessi. Non lo si
// lascia scoprire da un errore: `puoCanali()` lo dice prima.
// I PRIVILEGI CHE IL COSTRUTTORE SA DISTRIBUIRE, coi valori di Discord.
//
// Stanno qui, con gli altri numeri, per la ragione che decide tutto il resto:
// Discord dice che «un bot puo' dare a un ruolo soltanto i privilegi che ha
// lui». Quindi questa tabella non e' un dettaglio del catalogo — e' quello che
// il bot deve CHIEDERE all'invito, e chiederlo si fa da qui.
//
// Pochi apposta: Discord ne ha una cinquantina, e un muro di cinquanta
// interruttori non si legge, si spunta a caso. Questi sono quelli per cui un
// ruolo lo si crea davvero.
//
// I valori vengono dalla documentazione, non dalla memoria.
export const PRIVILEGI = Object.freeze({
  moderare: 1n << 40n,      // MODERATE_MEMBERS — mettere in pausa
  cacciare: 1n << 1n,       // KICK_MEMBERS
  bannare: 1n << 2n,        // BAN_MEMBERS
  pulire: 1n << 13n,        // MANAGE_MESSAGES
  soprannomi: 1n << 27n,    // MANAGE_NICKNAMES
  zittire: 1n << 22n,       // MUTE_MEMBERS
  spostare: 1n << 24n,      // MOVE_MEMBERS
  registro: 1n << 7n,       // VIEW_AUDIT_LOG
  eventi: 1n << 33n,        // MANAGE_EVENTS
  chiamareTutti: 1n << 17n, // MENTION_EVERYONE
  emojiAltrui: 1n << 18n,   // USE_EXTERNAL_EMOJIS
  trasmettere: 1n << 9n,    // STREAM
  priorita: 1n << 8n,       // PRIORITY_SPEAKER
});

// LA SOMMA NON SI SCRIVE A MANO. E' quella esatta dei privilegi qui sopra:
// aggiungerne uno lo fa entrare anche nell'invito, e nessuno deve ricordarsene.
// Un numero battuto a mano sarebbe la cosa che un giorno non coincide piu'.
export const DA_DARE = Object.values(PRIVILEGI).reduce((t, v) => t | v, 0n);

export const MANAGE_ROLES = 1n << 28n;      // 268435456
export const MANAGE_CHANNELS = 1n << 4n;    // 16
export const ADMINISTRATOR = 1n << 3n;      // 8
// Far ENTRARE qualcuno nel server. Non e' un invito da copiare: e' la porta
// `PUT /guilds/{server}/members/{persona}`, che Discord apre solo a chi ha
// questo privilegio. Serve al giro della porta d'ingresso — chi apre
// l'indirizzo e dice a Discord che e' lui si ritrova dentro, senza cercare un
// link di invito che magari e' scaduto.
export const CREATE_INSTANT_INVITE = 1n << 0n;   // 1
// I tre che servono al bot per DIRE una cosa. Da quando sta dentro il server,
// l'avviso di diretta non ha piu' bisogno di un webhook creato a mano: lo
// scrive lui nel canale scelto. Per farlo deve vedere il canale, poterci
// scrivere, e poter far comparire il riquadro — un avviso senza anteprima e'
// una riga di testo.
// LE IMPOSTAZIONI DEL SERVER. Con questo si cambiano il livello di verifica,
// il filtro dei contenuti, i canali di sistema, la pausa agli inviti, la
// schermata di benvenuto, le domande d'ingresso e la moderazione automatica —
// cioe' meta' di quello che vuol dire «tenere su un server».
//
// E' un permesso grosso: chi lo ha potrebbe anche cambiare nome e icona del
// server, e cancellare inviti altrui. Il bot non lo fa, e come per gli altri
// non e' una promessa in un commento: `scripts/verifica-poteri.mjs` controlla
// che quelle porte non si chiamino da nessuna parte.
//
// Sta nell'invito NORMALE e non fra i pieni poteri per una ragione sola: chi
// entra col solo Discord non ha altro, e senza questo meta' del prodotto per
// lui non esisterebbe.
export const MANAGE_GUILD = 1n << 5n;       // 32
export const VIEW_CHANNEL = 1n << 10n;      // 1024
export const SEND_MESSAGES = 1n << 11n;     // 2048
export const EMBED_LINKS = 1n << 14n;       // 16384
// CREARE APPUNTAMENTI, e toccare SOLO I PROPRI.
//
// Discord ha due permessi diversi: MANAGE_EVENTS (gia' fra quelli che il bot
// passa ai moderatori) serve a modificare gli appuntamenti DI TUTTI;
// CREATE_EVENTS serve a crearne, e a modificare o cancellare solo quelli che
// hai creato tu. A noi serve il secondo, ed e' anche quello che ci fa un
// regalo: gli appuntamenti scritti a mano dallo streamer non li possiamo
// toccare nemmeno volendo. Non e' una promessa nostra, e' Discord a impedirlo.
export const CREATE_EVENTS = 1n << 44n;
// QUELLO CHE SI CHIEDE ALL'INVITO, e perche' e' piu' di quanto il bot usa.
//
// Quelli con un nome proprio il bot li adopera lui: i ruoli e i canali per
// costruire, i tre per scrivere l'avviso di diretta nel canale, e quello che
// mette gli appuntamenti sul calendario.
//
// `DA_DARE` e' un'altra cosa, e va detta chiara: sono i privilegi che il bot
// NON usa mai e tiene solo per poterli PASSARE ai ruoli che gli chiedi di
// creare. Cacciare, bannare, mettere in pausa. Senza averli non puo' darli —
// non e' una prudenza nostra, e' una regola di Discord — e senza poterli dare
// un ruolo «Moderatori» nascerebbe senza poteri, cioe' un ruolo finto.
//
// Il prezzo e' vero: il bot li detiene su ogni server che lo invita. La
// contropartita non e' una promessa scritta in un commento — e' un cancello
// (`scripts/verifica-poteri.mjs`) che controlla che da nessuna parte, in tutto
// il codice, si chiami una porta di Discord che quei poteri li ESERCITA.
// Distribuirli si', usarli mai.
export const PERMESSI_BOT = String(MANAGE_ROLES | MANAGE_CHANNELS | MANAGE_GUILD | CREATE_INSTANT_INVITE | VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS | CREATE_EVENTS | DA_DARE);

// I PIENI POTERI, e perche' non sono quelli di prima.
//
// Chi vuole governare tutto il server da SocialBot puo' darci l'Amministratore.
// E' una scelta sua, si fa da una porta separata, e non e' mai quello che si
// chiede al primo invito: sulla schermata di Discord quella spunta e' la piu'
// pesante che esista, e chiederla a chi vuole solo i ruoli sarebbe chiedere
// molto piu' del necessario per fare molto meno.
//
// Va detto quello che l'Amministratore fa e quello che NON fa. Fa: scavalca i
// permessi dei singoli canali, quindi il bot vede tutto. Non fa: scavalcare la
// GERARCHIA. Anche da amministratore un bot non tocca i ruoli piu' in alto del
// suo, ne' il proprietario del server — quella e' la regola che gli impedisce
// di promuoversi, e nessun permesso la compra.
//
// La lista di prima resta dentro apposta: se un giorno qualcuno toglie
// l'Amministratore al nostro ruolo, il bot non resta nudo, torna a fare quello
// che faceva. Un solo bit, e quel giorno smetterebbe di funzionare in silenzio.
export const PERMESSI_PIENI = String(ADMINISTRATOR | MANAGE_ROLES | MANAGE_CHANNELS | MANAGE_GUILD | CREATE_INSTANT_INVITE | VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS | CREATE_EVENTS | DA_DARE);

// I permessi che il bot ha nel server: l'unione di quelli dei suoi ruoli. Si
// calcolano da cose che chiediamo GIA' (l'elenco dei ruoli e quelli del bot),
// senza una chiamata in piu'. Chi e' amministratore li ha tutti per definizione,
// ed e' la regola di Discord, non una nostra semplificazione.
export function permessiBot(ruoli, ruoliBot) {
  const miei = new Set((ruoliBot || []).map(String));
  let bits = 0n;
  for (const r of (ruoli || [])) {
    if (!miei.has(String(r?.id))) continue;
    try { bits |= BigInt(r?.permessi ?? r?.permissions ?? 0); } catch { /* niente */ }
  }
  return bits;
}

export const puo = (bits, flag) => {
  const b = typeof bits === 'bigint' ? bits : BigInt(bits || 0);
  return (b & ADMINISTRATOR) === ADMINISTRATOR || (b & flag) === flag;
};
export const puoCanali = (bits) => puo(bits, MANAGE_CHANNELS);
export const puoRuoli = (bits) => puo(bits, MANAGE_ROLES);
export const puoVedere = (bits) => puo(bits, VIEW_CHANNEL);
export const puoServer = (bits) => puo(bits, MANAGE_GUILD);
export const puoScrivere = (bits) => puo(bits, SEND_MESSAGES);
export const puoIncorniciare = (bits) => puo(bits, EMBED_LINKS);
// Puo' far entrare qualcuno dalla porta d'ingresso? Chi ha invitato il bot
// prima che questa porta esistesse non gli ha dato questo privilegio: il giro
// funzionerebbe fino all'ultimo passo e poi non entrerebbe nessuno. Si dice
// prima, e si rimedia reinvitandolo.
export const puoFarEntrare = (bits) => puo(bits, CREATE_INSTANT_INVITE);
// Puo' mettere gli appuntamenti sul calendario del server? Stessa storia, e per
// la stessa ragione: chi ha invitato il bot prima che il calendario esistesse
// non gli ha dato CREATE_EVENTS, e senza questa riga il giro delle sei ore
// busserebbe a una porta chiusa due volte al giorno, in silenzio.
export const puoAppuntamenti = (bits) => puo(bits, CREATE_EVENTS);

// COSA PUO' IL BOT DENTRO UN CANALE, che non e' quello che puo' nel server.
//
// Le regole del singolo canale battono quelle generali: un ruolo che nel
// server puo' scrivere, in un canale dove «tutti» ha il divieto, sta zitto. E'
// il motivo per cui guardare i soli permessi del server direbbe di si' e poi
// l'avviso non partirebbe.
//
// L'ordine qui sotto e' quello di Discord, non uno nostro: si parte dai
// permessi dei ruoli, poi la riga di @everyone (prima il divieto, poi il
// permesso), poi le righe dei ruoli tutte insieme, e in fondo quella della
// persona — che vince su tutto. Chi e' amministratore salta la fila.
export function permessiNelCanale({ ruoli = [], guildId, guild, bot = {}, bits } = {}, canale) {
  // La fotografia dice `guild.id`; chi chiama a mano puo' passare `guildId`.
  // Leggerne una sola vorrebbe dire che l'altra forma passa di qui senza
  // trovare la riga di  — e senza quella il conto torna sbagliato in
  // silenzio, dicendo che il bot puo' fare cose che non puo'.
  const idServer = String(guildId ?? guild?.id ?? '');
  let base = 0n;
  try { base = typeof bits === 'bigint' ? bits : BigInt(bits || 0); } catch { base = 0n; }
  if ((base & ADMINISTRATOR) === ADMINISTRATOR) return base;
  const righe = new Map((canale?.overwrites || []).map((o) => [String(o.id), o]));
  const leggi = (o) => {
    let a = 0n; let d = 0n;
    try { a = BigInt(o?.allow || 0); } catch { a = 0n; }
    try { d = BigInt(o?.deny || 0); } catch { d = 0n; }
    return { a, d };
  };
  const tutti = righe.get(idServer);
  if (tutti) { const { a, d } = leggi(tutti); base = (base & ~d) | a; }
  let nega = 0n; let da = 0n;
  for (const id of (bot.ruoli || []).map(String)) {
    const o = righe.get(id);
    if (!o) continue;
    const { a, d } = leggi(o);
    nega |= d; da |= a;
  }
  base = (base & ~nega) | da;
  const mia = righe.get(String(bot.id));
  if (mia) { const { a, d } = leggi(mia); base = (base & ~d) | a; }
  return base;
}

// ------------------------------------------------------ le impostazioni del server
//
// Quello che su Discord sta in «Impostazioni server». Non lo teniamo noi: vive
// li' dentro, e questa e' la porta per leggerlo e cambiarlo.
//
// Si manda SOLO quello che la traccia ha detto. Un campo assente non e' «zero»:
// e' «non mi interessa», e mandarlo lo stesso riscriverebbe una scelta fatta a
// mano dallo streamer sul suo server, senza che nessuno gliel'abbia chiesto.

// I valori che Discord accetta. Scritti qui e non a numeri sparsi in giro:
// un 3 dentro una chiamata non dice niente a chi rilegge fra sei mesi.
export const VERIFICA = Object.freeze({ nessuna: 0, email: 1, cinqueMinuti: 2, dieciMinuti: 3, telefono: 4 });
export const FILTRO = Object.freeze({ niente: 0, senzaRuoli: 1, tutti: 2 });
export const NOTIFICHE = Object.freeze({ tutto: 0, soloMenzioni: 1 });
// I bit di «cosa NON scrivere nel canale di sistema».
export const ZITTISCI = Object.freeze({
  ingressi: 1 << 0,
  boost: 1 << 1,
  consigli: 1 << 2,
  adesiviIngresso: 1 << 3,
  abbonamentiRuolo: 1 << 4,
  adesiviAbbonamento: 1 << 5,
});
// I minuti di inattivita' prima che Discord sposti nel canale AFK. Sono i
// cinque che accetta: uno diverso lo rifiuta.
export const ATTESE_AFK = Object.freeze([60, 300, 900, 1800, 3600]);

const sommaZittisci = (z) => Object.entries(ZITTISCI)
  .reduce((t, [k, v]) => (z && z[k] ? t | v : t), 0);

export function impostazioniDa(g) {
  const flag = Number(g?.system_channel_flags) || 0;
  return {
    verifica: Number(g?.verification_level) || 0,
    filtro: Number(g?.explicit_content_filter) || 0,
    notifiche: Number(g?.default_message_notifications) || 0,
    canaleSistema: g?.system_channel_id ? String(g.system_channel_id) : '',
    canaleRegole: g?.rules_channel_id ? String(g.rules_channel_id) : '',
    canaleAvvisiStaff: g?.public_updates_channel_id ? String(g.public_updates_channel_id) : '',
    canaleSicurezza: g?.safety_alerts_channel_id ? String(g.safety_alerts_channel_id) : '',
    canaleAfk: g?.afk_channel_id ? String(g.afk_channel_id) : '',
    attesaAfk: Number(g?.afk_timeout) || 300,
    barraBoost: !!g?.premium_progress_bar_enabled,
    lingua: String(g?.preferred_locale || ''),
    zittisci: Object.fromEntries(Object.entries(ZITTISCI).map(([k, v]) => [k, (flag & v) !== 0])),
    // le levette che su Discord sono «caratteristiche» e non campi
    community: (g?.features || []).includes('COMMUNITY'),
    invitiFermi: (g?.features || []).includes('INVITES_DISABLED'),
  };
}

export async function sistemaServer(token, guild, v, perche = '') {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const corpo = {};
  if (v?.verifica !== undefined) corpo.verification_level = Math.max(0, Math.min(4, Number(v.verifica) || 0));
  if (v?.filtro !== undefined) corpo.explicit_content_filter = Math.max(0, Math.min(2, Number(v.filtro) || 0));
  if (v?.notifiche !== undefined) corpo.default_message_notifications = v.notifiche ? 1 : 0;
  if (v?.canaleSistema !== undefined) corpo.system_channel_id = idOk(v.canaleSistema) ? String(v.canaleSistema) : null;
  if (v?.canaleRegole !== undefined) corpo.rules_channel_id = idOk(v.canaleRegole) ? String(v.canaleRegole) : null;
  if (v?.canaleAvvisiStaff !== undefined) corpo.public_updates_channel_id = idOk(v.canaleAvvisiStaff) ? String(v.canaleAvvisiStaff) : null;
  if (v?.canaleSicurezza !== undefined) corpo.safety_alerts_channel_id = idOk(v.canaleSicurezza) ? String(v.canaleSicurezza) : null;
  if (v?.canaleAfk !== undefined) corpo.afk_channel_id = idOk(v.canaleAfk) ? String(v.canaleAfk) : null;
  if (v?.attesaAfk !== undefined) {
    const a = Number(v.attesaAfk) || 300;
    corpo.afk_timeout = ATTESE_AFK.includes(a) ? a : 300;
  }
  if (v?.barraBoost !== undefined) corpo.premium_progress_bar_enabled = !!v.barraBoost;
  if (v?.lingua) corpo.preferred_locale = String(v.lingua).slice(0, 12);
  if (v?.zittisci !== undefined) corpo.system_channel_flags = sommaZittisci(v.zittisci);
  // «metti in pausa tutti gli inviti» e' una caratteristica, non un campo: si
  // accende aggiungendola all'elenco e si spegne togliendola. Serve l'elenco
  // di adesso, se no le altre caratteristiche sparirebbero con lei.
  if (v?.invitiFermi !== undefined && Array.isArray(v.featuresOra)) {
    const f = new Set(v.featuresOra);
    if (v.invitiFermi) f.add('INVITES_DISABLED'); else f.delete('INVITES_DISABLED');
    corpo.features = [...f];
  }
  if (!Object.keys(corpo).length) return { ok: true, dati: null, niente: true };
  return chiama(token, `/guilds/${guild}`, { metodo: 'PATCH', corpo, perche });
}

// ------------------------------------------------------ la schermata di benvenuto
// Fino a cinque canali spiegati a chi entra. Serve che il server sia Community.
export async function benvenuto(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}/welcome-screen`);
  if (!r.ok) return r;
  return {
    ok: true,
    testo: String(r.dati?.description || ''),
    canali: (r.dati?.welcome_channels || []).map((c) => ({
      canale: String(c?.channel_id || ''),
      testo: String(c?.description || ''),
      emoji: String(c?.emoji_name || ''),
    })).filter((c) => c.canale),
  };
}

export async function sistemaBenvenuto(token, guild, v, perche = '') {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const corpo = {};
  if (v?.acceso !== undefined) corpo.enabled = !!v.acceso;
  if (v?.testo !== undefined) corpo.description = String(v.testo || '').slice(0, 140);
  if (Array.isArray(v?.canali)) {
    corpo.welcome_channels = v.canali.slice(0, 5)
      .filter((c) => idOk(c?.canale))
      .map((c) => ({
        channel_id: String(c.canale),
        description: String(c.testo || '').slice(0, 50),
        emoji_name: c.emoji ? String(c.emoji).slice(0, 32) : null,
        emoji_id: null,
      }));
  }
  if (!Object.keys(corpo).length) return { ok: true, dati: null, niente: true };
  return chiama(token, `/guilds/${guild}/welcome-screen`, { metodo: 'PATCH', corpo, perche });
}

// ------------------------------------------------------ le domande d'ingresso
// Chi entra risponde, e ogni risposta gli apre canali e gli da' ruoli. E' la
// cosa che Discord chiama «onboarding», e fatta bene e' meta' del lavoro di un
// server: uno arriva, dice cosa gli interessa, e trova solo quello.
export const DOMANDA = Object.freeze({ scelte: 0, tendina: 1 });

export async function ingresso(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}/onboarding`);
  if (!r.ok) return r;
  return {
    ok: true,
    acceso: !!r.dati?.enabled,
    modo: Number(r.dati?.mode) || 0,
    canaliDiPartenza: (r.dati?.default_channel_ids || []).map(String),
    domande: (r.dati?.prompts || []).map((p) => ({
      id: String(p?.id || ''),
      titolo: String(p?.title || ''),
      tipo: Number(p?.type) || 0,
      unaSola: !!p?.single_select,
      obbligatoria: !!p?.required,
      allIngresso: p?.in_onboarding !== false,
      risposte: (p?.options || []).map((o) => ({
        id: String(o?.id || ''),
        titolo: String(o?.title || ''),
        testo: String(o?.description || ''),
        emoji: String(o?.emoji?.name || ''),
        canali: (o?.channel_ids || []).map(String),
        ruoli: (o?.role_ids || []).map(String),
      })),
    })),
  };
}

export async function sistemaIngresso(token, guild, v, perche = '') {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const corpo = {
    enabled: !!v?.acceso,
    mode: Number(v?.modo) || 0,
    default_channel_ids: (v?.canaliDiPartenza || []).filter(idOk).map(String),
    prompts: (v?.domande || []).slice(0, 10).map((p, i) => ({
      ...(idOk(p?.id) ? { id: String(p.id) } : { id: String(i + 1) }),
      title: String(p?.titolo || '').slice(0, 100),
      type: Number(p?.tipo) === 1 ? 1 : 0,
      single_select: !!p?.unaSola,
      required: !!p?.obbligatoria,
      in_onboarding: p?.allIngresso !== false,
      options: (p?.risposte || []).slice(0, 50).map((o, k) => ({
        ...(idOk(o?.id) ? { id: String(o.id) } : { id: String(k + 1) }),
        title: String(o?.titolo || '').slice(0, 50),
        description: String(o?.testo || '').slice(0, 100) || null,
        ...(o?.emoji ? { emoji: { name: String(o.emoji).slice(0, 32), id: null, animated: false } } : {}),
        channel_ids: (o?.canali || []).filter(idOk).map(String),
        role_ids: (o?.ruoli || []).filter(idOk).map(String),
      })),
    })),
  };
  return chiama(token, `/guilds/${guild}/onboarding`, { metodo: 'PUT', corpo, perche });
}

// ------------------------------------------------------ gli appuntamenti
//
// Un appuntamento e' la riga che su Discord dice «giovedì alle 21». Il nostro e'
// sempre di tipo ESTERNO: la diretta non succede in un canale vocale del
// server, succede sul canale — quindi niente `channel_id`, un LUOGO (il link) e
// una FINE, che per gli esterni Discord pretende.
//
// I GIORNI SI CONTANO DA LUNEDI', sia da noi che da Discord (MONDAY = 0). Non
// e' una coincidenza da sfruttare in silenzio: e' scritto qui perche' il giorno
// che una delle due parti cambiasse, si sappia dove guardare.
export const EVENTO_ESTERNO = 3;
export const RIPETI_SETTIMANA = 2;

const iso = (d) => new Date(d).toISOString();

export async function eventi(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}/scheduled-events`);
  if (!r.ok) return r;
  return {
    ok: true,
    eventi: (Array.isArray(r.dati) ? r.dati : []).map((x) => ({
      id: String(x?.id || ''),
      nome: String(x?.name || ''),
      descrizione: String(x?.description || ''),
      luogo: String(x?.entity_metadata?.location || ''),
      inizio: String(x?.scheduled_start_time || ''),
      fine: String(x?.scheduled_end_time || ''),
      tipo: Number(x?.entity_type) || 0,
      diChi: String(x?.creator_id || ''),
      giorni: (x?.recurrence_rule?.by_weekday || []).map(Number).filter((n) => n >= 0 && n <= 6),
      ogni: Number(x?.recurrence_rule?.frequency),
    })).filter((x) => x.id),
  };
}

function corpoEvento(v) {
  const corpo = {
    name: String(v?.nome || '').slice(0, 100) || 'Diretta',
    description: String(v?.descrizione || '').slice(0, 1000) || undefined,
    privacy_level: 2,                       // GUILD_ONLY: l'unico che Discord accetta
    entity_type: EVENTO_ESTERNO,
    channel_id: null,
    entity_metadata: { location: String(v?.luogo || '').slice(0, 100) },
    scheduled_start_time: iso(v?.inizio),
    scheduled_end_time: iso(v?.fine),
  };
  const giorni = (v?.giorni || []).map(Number).filter((n) => n >= 0 && n <= 6);
  if (giorni.length) {
    corpo.recurrence_rule = {
      start: iso(v?.inizio),
      frequency: RIPETI_SETTIMANA,
      interval: 1,
      by_weekday: [...new Set(giorni)].sort((a, b) => a - b),
    };
  }
  return corpo;
}

export async function creaEvento(token, guild, v, perche = '') {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}/scheduled-events`, { metodo: 'POST', corpo: corpoEvento(v), perche });
  if (!r.ok) return r;
  return { ok: true, id: String(r.dati?.id || '') };
}

export async function sistemaEvento(token, guild, id, v, perche = '') {
  if (!idOk(guild) || !idOk(id)) return { ok: false, errore: 'id non valido' };
  return chiama(token, `/guilds/${guild}/scheduled-events/${id}`, { metodo: 'PATCH', corpo: corpoEvento(v), perche });
}

export async function togliEvento(token, guild, id, perche = '') {
  if (!idOk(guild) || !idOk(id)) return { ok: false, errore: 'id non valido' };
  return chiama(token, `/guilds/${guild}/scheduled-events/${id}`, { metodo: 'DELETE', perche });
}

// ------------------------------------------------------ la moderazione automatica
//
// AutoMod e' di Discord e gira DENTRO Discord: blocca il messaggio prima che
// esista, cosa che un bot in ascolto non puo' fare — lui lo vede dopo, e
// cancellarlo e' un'altra cosa (e un potere che non usiamo).
//
// Quante regole si possono avere, per server: parole chiave 6, spam 1, liste
// pronte 1, menzioni 1, profilo 1. Non e' una nostra prudenza, e' il tetto di
// Discord: chiederne una in piu' torna un errore, e conviene saperlo prima.
export const TIPI_AUTOMOD = Object.freeze({ parole: 1, spam: 3, liste: 4, menzioni: 5, profilo: 6 });
export const TETTO_AUTOMOD = Object.freeze({ parole: 6, spam: 1, liste: 1, menzioni: 1, profilo: 1 });
export const LISTE_PRONTE = Object.freeze({ parolacce: 1, sesso: 2, insulti: 3 });
// Cosa fa quando scatta. `blocca` non chiede niente, `avvisa` vuole un canale,
// `pausa` vuole i secondi e funziona solo su parole e menzioni.
const AZIONI = Object.freeze({ blocca: 1, avvisa: 2, pausa: 3, isola: 4 });
export const PAUSA_MAX = 2419200;   // 28 giorni, il massimo che Discord accetta

const azioniVerso = (a) => {
  const out = [];
  if (a?.blocca) out.push({ type: AZIONI.blocca, metadata: { custom_message: String(a.messaggio || '').slice(0, 150) || undefined } });
  if (idOk(a?.avvisaIn)) out.push({ type: AZIONI.avvisa, metadata: { channel_id: String(a.avvisaIn) } });
  if (Number(a?.pausa) > 0) out.push({ type: AZIONI.pausa, metadata: { duration_seconds: Math.min(PAUSA_MAX, Number(a.pausa)) } });
  if (a?.isola) out.push({ type: AZIONI.isola, metadata: {} });
  return out;
};

const azioniDa = (lista) => {
  const out = {};
  for (const a of (Array.isArray(lista) ? lista : [])) {
    const t = Number(a?.type);
    if (t === AZIONI.blocca) { out.blocca = true; if (a?.metadata?.custom_message) out.messaggio = String(a.metadata.custom_message); }
    if (t === AZIONI.avvisa && a?.metadata?.channel_id) out.avvisaIn = String(a.metadata.channel_id);
    if (t === AZIONI.pausa) out.pausa = Number(a?.metadata?.duration_seconds) || 0;
    if (t === AZIONI.isola) out.isola = true;
  }
  return out;
};

export async function regoleAuto(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}/auto-moderation/rules`);
  if (!r.ok) return r;
  const nomi = Object.fromEntries(Object.entries(TIPI_AUTOMOD).map(([k, v]) => [v, k]));
  return {
    ok: true,
    regole: (Array.isArray(r.dati) ? r.dati : []).map((x) => ({
      id: String(x?.id || ''),
      nome: String(x?.name || ''),
      tipo: nomi[Number(x?.trigger_type)] || '',
      accesa: !!x?.enabled,
      parole: (x?.trigger_metadata?.keyword_filter || []).map(String),
      espressioni: (x?.trigger_metadata?.regex_patterns || []).map(String),
      liste: (x?.trigger_metadata?.presets || []).map((p) => Object.keys(LISTE_PRONTE).find((k) => LISTE_PRONTE[k] === Number(p)) || '').filter(Boolean),
      passano: (x?.trigger_metadata?.allow_list || []).map(String),
      tettoMenzioni: Number(x?.trigger_metadata?.mention_total_limit) || 0,
      raid: !!x?.trigger_metadata?.mention_raid_protection_enabled,
      azioni: azioniDa(x?.actions),
      esentiRuoli: (x?.exempt_roles || []).map(String),
      esentiCanali: (x?.exempt_channels || []).map(String),
    })).filter((x) => x.tipo),
  };
}

function corpoAutomod(v) {
  const tipo = TIPI_AUTOMOD[String(v?.tipo)] || TIPI_AUTOMOD.parole;
  const meta = {};
  if (tipo === TIPI_AUTOMOD.parole || tipo === TIPI_AUTOMOD.profilo) {
    meta.keyword_filter = (v?.parole || []).slice(0, 1000).map((x) => String(x).slice(0, 60)).filter(Boolean);
    meta.regex_patterns = (v?.espressioni || []).slice(0, 10).map((x) => String(x).slice(0, 260)).filter(Boolean);
    meta.allow_list = (v?.passano || []).slice(0, 100).map((x) => String(x).slice(0, 60)).filter(Boolean);
  }
  if (tipo === TIPI_AUTOMOD.liste) {
    meta.presets = (v?.liste || []).map((k) => LISTE_PRONTE[String(k)]).filter(Boolean);
    meta.allow_list = (v?.passano || []).slice(0, 1000).map((x) => String(x).slice(0, 60)).filter(Boolean);
  }
  if (tipo === TIPI_AUTOMOD.menzioni) {
    meta.mention_total_limit = Math.max(1, Math.min(50, Number(v?.tettoMenzioni) || 5));
    meta.mention_raid_protection_enabled = !!v?.raid;
  }
  const corpo = {
    name: String(v?.nome || '').slice(0, 100) || 'SocialBot',
    event_type: String(v?.tipo) === 'profilo' ? 2 : 1,
    trigger_type: tipo,
    enabled: v?.accesa !== false,
    actions: azioniVerso(v?.azioni),
    exempt_roles: (v?.esentiRuoli || []).slice(0, 20).filter(idOk).map(String),
    exempt_channels: (v?.esentiCanali || []).slice(0, 50).filter(idOk).map(String),
  };
  if (Object.keys(meta).length) corpo.trigger_metadata = meta;
  // Una regola senza nessuna azione non fa niente: e' peggio di non averla,
  // perche' sembra accesa. Se non l'hanno detto, almeno blocca.
  if (!corpo.actions.length) corpo.actions = [{ type: AZIONI.blocca, metadata: {} }];
  return corpo;
}

export async function creaRegolaAuto(token, guild, v, perche = '') {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}/auto-moderation/rules`, { metodo: 'POST', corpo: corpoAutomod(v), perche });
  if (!r.ok) return r;
  return { ok: true, id: String(r.dati?.id || '') };
}

export async function sistemaRegolaAuto(token, guild, id, v, perche = '') {
  if (!idOk(guild) || !idOk(id)) return { ok: false, errore: 'id non valido' };
  const corpo = corpoAutomod(v);
  delete corpo.trigger_type;   // il tipo di una regola non si cambia: si rifa'
  return chiama(token, `/guilds/${guild}/auto-moderation/rules/${id}`, { metodo: 'PATCH', corpo, perche });
}

export async function togliRegolaAuto(token, guild, id, perche = '') {
  if (!idOk(guild) || !idOk(id)) return { ok: false, errore: 'id non valido' };
  return chiama(token, `/guilds/${guild}/auto-moderation/rules/${id}`, { metodo: 'DELETE', perche });
}

// QUANDO, da un id. Dentro uno snowflake di Discord c'e' il momento in cui e'
// nato: e' cosi' che si sa «questo canale non parla da otto mesi» SENZA leggere
// un solo messaggio — l'ultimo messaggio di un canale e' un id, e l'id porta la
// sua data. Niente occhi sulle conversazioni di nessuno, e nemmeno il permesso
// per averli.
const EPOCA = 1420070400000n;
export function quandoDa(snowflake) {
  const t = String(snowflake || '');
  if (!/^[0-9]{5,24}$/.test(t)) return 0;
  try { return Number((BigInt(t) >> 22n) + EPOCA); } catch { return 0; }
}

// `pieni` va chiesto: il valore che non si passa e' sempre quello misurato.
export function urlInvitoBot({ clientId, redirectUri, state, pieni = false }) {
  const p = new URLSearchParams({
    client_id: String(clientId || ''),
    scope: 'bot',
    permissions: pieni ? PERMESSI_PIENI : PERMESSI_BOT,
    response_type: 'code',
    redirect_uri: String(redirectUri || ''),
    state: String(state || ''),
  });
  return 'https://discord.com/oauth2/authorize?' + p.toString();
}

export async function scambiaInvito({ clientId, clientSecret, redirectUri, codice }) {
  if (!clientId || !clientSecret || !codice) return { ok: false, errore: 'collegamento non configurato' };
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(API + '/oauth2/token', {
      method: 'POST',
      signal: ac.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
      body: new URLSearchParams({
        client_id: String(clientId),
        client_secret: String(clientSecret),
        grant_type: 'authorization_code',
        code: String(codice),
        redirect_uri: String(redirectUri || ''),
      }).toString(),
    });
    if (!r.ok) return { ok: false, errore: 'Discord non ha riconosciuto il codice' };
    const d = await r.json().catch(() => null);
    const id = String(d?.guild?.id || '');
    if (!idOk(id)) return { ok: false, errore: 'Discord non dice in quale server e\' entrato' };
    return { ok: true, guild: id, nome: String(d?.guild?.name || '').slice(0, 100) };
  } catch (e) {
    log.warn('scambiaInvito:', e?.message || e);
    return { ok: false, errore: 'Discord irraggiungibile' };
  } finally { clearTimeout(to); }
}

// ---------------------------------------------------------------- riconoscere
// L'altra meta' del filo, e ha un'autorita' diversa: qui non parla il bot di
// uno streamer, parla l'applicazione che chiede a una persona «sei tu?». Puo'
// leggere il suo id e il suo nome, e nient'altro: lo scope e' `identify`, e non
// entra in nessun server.
// `entrare` aggiunge il permesso di FAR ENTRARE questa persona nel server.
// Si chiede solo dove si puo' mantenere — cioe' dove il canale ha un server
// collegato — perche' chiedere un permesso e poi non usarlo insegna alla gente
// che le schermate di Discord non vogliono dire niente.
export function urlAutorizzazione({ clientId, redirectUri, state, entrare = false }) {
  const p = new URLSearchParams({
    client_id: String(clientId || ''),
    redirect_uri: String(redirectUri || ''),
    response_type: 'code',
    scope: entrare ? 'identify guilds.join' : 'identify',
    state: String(state || ''),
    prompt: 'none',
  });
  return 'https://discord.com/oauth2/authorize?' + p.toString();
}

// Il codice di ritorno diventa un nome e un id. Il segreto dell'applicazione
// viaggia nel corpo, come vuole Discord, e non esce mai di qui.
// `entraIn` fa ENTRARE la persona nel server, qui dentro e subito.
//
// Sta qui e non in chi chiama per una ragione sola: il permesso che Discord ci
// da' e' SUO, vale qualche minuto e apre il suo account. Se uscisse da questa
// funzione girerebbe per il codice del sito, finirebbe in un log per sbaglio,
// e un giorno qualcuno lo salverebbe «per comodita'». Cosi' invece non esce
// dalla stanza in cui serve: si usa e muore con la richiesta.
export async function scambiaCodice({ clientId, clientSecret, redirectUri, codice, entraIn = null }) {
  if (!clientId || !clientSecret || !codice) return { ok: false, errore: 'collegamento non configurato' };
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(API + '/oauth2/token', {
      method: 'POST',
      signal: ac.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
      body: new URLSearchParams({
        client_id: String(clientId),
        client_secret: String(clientSecret),
        grant_type: 'authorization_code',
        code: String(codice),
        redirect_uri: String(redirectUri || ''),
      }).toString(),
    });
    if (!r.ok) return { ok: false, errore: 'Discord non ha riconosciuto il codice' };
    const d = await r.json().catch(() => null);
    const tok = String(d?.access_token || '');
    if (!tok) return { ok: false, errore: 'Discord non ha dato un permesso' };
    const u = await fetch(API + '/users/@me', {
      signal: ac.signal,
      headers: { Authorization: 'Bearer ' + tok, 'User-Agent': UA },
    });
    if (!u.ok) return { ok: false, errore: 'Discord non dice chi sei' };
    const me = await u.json().catch(() => null);
    const id = String(me?.id || '');
    if (!idOk(id)) return { ok: false, errore: 'Discord non dice chi sei' };
    // Dentro il server. Se non riesce non si butta via il giro: il
    // collegamento dei ruoli vale lo stesso, e chi c'era gia' non se ne
    // accorge. Si dice com'e' andata, e la pagina lo racconta.
    let dentro = false;
    if (entraIn?.guild && entraIn?.botToken) {
      const e = await entraNelServer(entraIn.botToken, entraIn.guild, id, tok);
      dentro = !!e.ok;
      if (!e.ok) log.warn(`porta d'ingresso: non e' entrato nel server — ${e.errore || 'motivo non detto'}`);
    }
    return { ok: true, id, nome: String(me?.global_name || me?.username || ''), dentro };
  } catch (e) {
    log.warn('scambiaCodice:', e?.message || e);
    return { ok: false, errore: 'Discord irraggiungibile' };
  } finally { clearTimeout(to); }
}

// ------------------------------------------------------------ i canali
// Di un canale si prende la FORMA, mai il contenuto: come si chiama, di che
// tipo e', dove sta, che permessi ha scritti sopra. E una data: quella
// dell'ultimo messaggio.
//
// Quella data non arriva da un messaggio letto. Arriva dall'ID dell'ultimo
// messaggio, e dentro un id di Discord c'e' l'istante in cui e' nato. Cosi' il
// costruttore puo' dire «questo canale non parla da otto mesi» senza aprire una
// conversazione di nessuno — e senza chiedere il permesso per poterlo fare.
// Non e' discrezione: e' che quel permesso non ce l'abbiamo proprio.
const pulisciCanale = (x) => ({
  id: String(x?.id || ''),
  nome: String(x?.name || ''),
  tipo: Number(x?.type) || 0,
  parent_id: x?.parent_id ? String(x.parent_id) : null,
  posizione: Number(x?.position) || 0,
  argomento: String(x?.topic || ''),
  // rileggere quel che si e' scritto: senza, la differenza non vedrebbe mai uno
  // scarto su queste cose e il costumore le riscriverebbe a ogni giro
  lento: Number(x?.rate_limit_per_user) || 0,
  adulti: !!x?.nsfw,
  archivia: Number(x?.default_auto_archive_duration) || 0,
  tag: (Array.isArray(x?.available_tags) ? x.available_tags : []).map((t) => String(t?.name || '')).filter(Boolean),
  tagObbligatorio: ((Number(x?.flags) || 0) & (1 << 4)) !== 0,
  overwrites: (Array.isArray(x?.permission_overwrites) ? x.permission_overwrites : []).map((o) => ({
    id: String(o?.id || ''),
    tipo: Number(o?.type) || 0,
    allow: String(o?.allow || '0'),
    deny: String(o?.deny || '0'),
  })).filter((o) => o.id),
  nato: quandoDa(x?.id),
  ultimoMessaggio: quandoDa(x?.last_message_id),
});

export async function canali(token, guild) {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const r = await chiama(token, `/guilds/${guild}/channels`);
  if (!r.ok) return r;
  return { ok: true, canali: (Array.isArray(r.dati) ? r.dati : []).map(pulisciCanale).filter((x) => x.id) };
}

// I permessi come li scrive Discord. Il `tipo` dice se quella riga parla di un
// ruolo (0) o di una persona (1); noi useremo quasi sempre i ruoli, ma la riga
// per la singola persona serve al varco d'ingresso.
const permessiVerso = (p) => (Array.isArray(p) ? p : []).filter((x) => idOk(x?.id)).map((x) => ({
  id: String(x.id),
  type: Number(x.tipo ?? x.type ?? 0) === 1 ? 1 : 0,
  allow: String(x.allow || '0'),
  deny: String(x.deny || '0'),
}));

// I MODI DI UN CANALE, tradotti per Discord.
//
// Stanno in una funzione sola perche' creare e sistemare devono mandare le
// stesse cose: due elenchi separati sono due elenchi che divergono, e il
// difetto che ne esce e' il peggiore da capire — il canale nasce giusto e al
// primo «rimettilo a posto» perde meta' delle sue impostazioni.
//
// Un campo che non c'e' non si manda: `undefined` e «zero» sono due cose
// diverse, e una lentezza a zero e' una scelta («togli il rallentatore»).
function modiCanale(c) {
  const out = {};
  if (c?.lento !== undefined) out.rate_limit_per_user = Math.max(0, Math.min(21600, Number(c.lento) || 0));
  if (c?.adulti !== undefined) out.nsfw = !!c.adulti;
  if (c?.archivia !== undefined) out.default_auto_archive_duration = Number(c.archivia) || 1440;
  if (c?.lentoFili !== undefined) out.default_thread_rate_limit_per_user = Math.max(0, Math.min(21600, Number(c.lentoFili) || 0));
  if (Array.isArray(c?.tag)) {
    out.available_tags = c.tag.slice(0, 20)
      .map((t) => (typeof t === 'object' && t ? { name: String(t.nome ?? t.name ?? '').slice(0, 20), moderated: !!t.soloStaff } : { name: String(t || '').slice(0, 20) }))
      .filter((t) => t.name);
  }
  // Il flag che obbliga a mettere un tag e' un bit, e Discord lo vuole dentro
  // `flags`: 1 << 4. Scritto a mano sarebbe il numero che un giorno non torna.
  if (c?.tagObbligatorio !== undefined) out.flags = c.tagObbligatorio ? (1 << 4) : 0;
  return out;
}

export async function creaCanale(token, guild, c, perche = '') {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const nome = String(c?.nome || '').trim().slice(0, 100);
  if (!nome) return { ok: false, errore: 'un canale senza nome non si crea' };
  const corpo = { name: nome, type: Number(c?.tipo) || 0 };
  if (idOk(c?.dentroId)) corpo.parent_id = String(c.dentroId);
  if (c?.argomento) corpo.topic = String(c.argomento).slice(0, 4096);
  Object.assign(corpo, modiCanale(c));
  const ow = permessiVerso(c?.permessi);
  if (ow.length) corpo.permission_overwrites = ow;
  const r = await chiama(token, `/guilds/${guild}/channels`, { metodo: 'POST', corpo, perche });
  if (!r.ok) return r;
  return { ok: true, id: String(r.dati?.id || ''), nome: String(r.dati?.name || nome) };
}

// Sistemare non e' sovrascrivere: si manda solo quello che cambia. L'unica
// eccezione e' l'elenco dei permessi, che Discord sostituisce sempre per
// intero — per questo chi chiama deve passare l'elenco GIA' fuso con quello di
// adesso, e non solo i permessi nuovi (lo fa `fondiPermessi`).
export async function sistemaCanale(token, id, cambia, perche = '') {
  if (!idOk(id)) return { ok: false, errore: 'id del canale non valido' };
  const corpo = {};
  if (cambia?.nome) corpo.name = String(cambia.nome).trim().slice(0, 100);
  if (cambia?.argomento !== undefined) corpo.topic = String(cambia.argomento || '').slice(0, 4096);
  Object.assign(corpo, modiCanale(cambia));
  if (cambia?.dentroId !== undefined) corpo.parent_id = idOk(cambia.dentroId) ? String(cambia.dentroId) : null;
  if (Array.isArray(cambia?.permessi)) corpo.permission_overwrites = permessiVerso(cambia.permessi);
  if (!Object.keys(corpo).length) return { ok: true, dati: null, niente: true };
  return chiama(token, `/channels/${id}`, { metodo: 'PATCH', corpo, perche });
}

// Il bot dice una cosa in un canale. Niente nome ne' faccia per messaggio:
// quelli erano del webhook, e un bot non li puo' cambiare a ogni riga — parla
// col nome che ha. Va detto a chi ne aveva messo uno, invece di farglielo
// scoprire dalla prima diretta.
export async function mandaMessaggio(token, canale, messaggio) {
  if (!idOk(canale)) return { ok: false, errore: 'id del canale non valido' };
  const corpo = {};
  if (messaggio?.content) corpo.content = String(messaggio.content).slice(0, 2000);
  if (Array.isArray(messaggio?.embeds) && messaggio.embeds.length) corpo.embeds = messaggio.embeds.slice(0, 10);
  if (messaggio?.allowed_mentions) corpo.allowed_mentions = messaggio.allowed_mentions;
  if (!corpo.content && !corpo.embeds) return { ok: false, errore: 'un messaggio vuoto non si manda' };
  const r = await chiama(token, `/channels/${canale}/messages`, { metodo: 'POST', corpo });
  if (!r.ok) return r;
  return { ok: true, id: String(r.dati?.id || '') };
}

// CHIUDERE UN AVVISO SI FA RISCRIVENDOLO, NON CANCELLANDOLO.
//
// Cancellare un messaggio passa da DELETE /channels/{c}/messages/{id}, e quella
// porta con «pulire» in mano cancella il messaggio di CHIUNQUE. Il bot quel
// privilegio ce l'ha — lo tiene per poterlo passare al ruolo «Moderatori» — e
// una porta che c'e' e' una porta che un giorno qualcuno punta altrove, magari
// in buona fede. Vedi scripts/verifica-poteri.mjs: si distribuiscono, non si usano.
//
// Riscrivere invece e' sicuro PER COSTRUZIONE, non per promessa: Discord
// rifiuta sempre la modifica di un messaggio scritto da un altro, qualunque
// permesso si abbia. Questa porta, puntata su chiunque altro, non fa niente.
export async function modificaMessaggio(token, canale, id, messaggio) {
  if (!idOk(canale) || !idOk(id)) return { ok: false, errore: 'id non valido' };
  const corpo = {};
  if (messaggio?.content !== undefined) corpo.content = String(messaggio.content).slice(0, 2000);
  corpo.embeds = Array.isArray(messaggio?.embeds) ? messaggio.embeds.slice(0, 10) : [];
  if (messaggio?.allowed_mentions) corpo.allowed_mentions = messaggio.allowed_mentions;
  return chiama(token, `/channels/${canale}/messages/${id}`, { metodo: 'PATCH', corpo });
}

export async function togliCanale(token, id, perche = '') {
  if (!idOk(id)) return { ok: false, errore: 'id del canale non valido' };
  return chiama(token, `/channels/${id}`, { metodo: 'DELETE', perche });
}

// UN RUOLO SI SCRIVE COME UN CANALE, con una differenza che conta: il colore.
// Discord lo vuole come numero, e 0 non e' «nero», e' «nessun colore» — cioe'
// il grigio di chi non ne ha. Percio' si manda sempre, anche quando e' zero:
// non mandarlo vorrebbe dire «lascia quello di prima», e un ruolo che doveva
// tornare senza colore resterebbe colorato.
// L'OLOGRAFICO NON E' UN COLORE, E' UN INTERRUTTORE.
//
// Discord, alla lettera: «When sending tertiary_color the API enforces the role
// color to be a holographic style with values of: primary_color = 11127295,
// secondary_color = 16759788, and tertiary_color = 16761760». Cioe': i tre
// numeri non si scelgono, si subiscono. Chiedere allo streamer tre colori e poi
// sostituirglieli sarebbe una finta.
//
// Stanno qui e non nel pannello perche' sono un fatto di Discord, non un gusto:
// se un giorno cambiano, cambia questa riga e basta.
export const OLOGRAFICO = { primo: 11127295, secondo: 16759788, terzo: 16761760 };

// QUALE CAMPO PORTA IL COLORE, e perche' non tutti e due.
//
// `color` e' dichiarato deprecato ma funziona su qualunque server; `colors`
// esiste per la sfumatura e l'olografico, che vogliono la caratteristica
// ENHANCED_ROLE_COLORS. Mandarli insieme sarebbe dire la stessa cosa due volte;
// mandare sempre `colors` vorrebbe dire spedire il campo ricco anche dove non
// serve a niente.
//
// Quindi: tinta piatta -> `color`, sfumatura o olografico -> `colors`. Un campo
// solo per richiesta, e quello ricco parte SOLO verso un server che lo capisce.
const tintaRuolo = (r) => {
  if (r?.olografico) {
    return { colors: { primary_color: OLOGRAFICO.primo, secondary_color: OLOGRAFICO.secondo, tertiary_color: OLOGRAFICO.terzo } };
  }
  const primo = Math.max(0, Math.min(0xffffff, Number(r?.colore) || 0));
  if (r?.sfuma === null || r?.sfuma === undefined) return { color: primo };
  return { colors: { primary_color: primo, secondary_color: Math.max(0, Math.min(0xffffff, Number(r.sfuma) || 0)), tertiary_color: null } };
};

// IL SEGNO: o un'emoji, o un'immagine, mai tutti e due.
//
// Discord ne mostra uno. Percio' quando si scrive il segno si scrivono SEMPRE
// tutti e due i campi, e uno dei due e' `null`: mandarne uno solo lascerebbe in
// piedi l'altro, e il ruolo finirebbe con l'emoji nuova e l'icona vecchia —
// cioe' con due segni, che su Discord non si puo'.
const segnoRuolo = (s) => {
  if (s?.tipo === 'emoji' && s.emoji) return { unicode_emoji: String(s.emoji).slice(0, 32), icon: null };
  // I byte dell'immagine non stanno nella traccia: arrivano solo quando si
  // costruisce, e di loro non resta niente da nessuna parte.
  if (s?.tipo === 'immagine' && s.dato) return { icon: String(s.dato), unicode_emoji: null };
  if (s?.tipo === 'immagine') return null;   // gia' li', e non c'e' niente di nuovo da mettere
  if (s?.tipo === 'niente') return { icon: null, unicode_emoji: null };
  return null;
};

const corpoRuolo = (r, { nuovo = false } = {}) => {
  const c = {};
  // `rinomina` vince su `nome`: nelle righe del «cosa cambia», `nome` e' come
  // il ruolo si chiama ADESSO — serve a raccontarlo — e `rinomina` e' come si
  // chiamera'. Mandare il primo vorrebbe dire scrivere di nuovo il nome
  // vecchio, cioe' fare il contrario di quello che si e' promesso.
  if (r?.rinomina !== undefined) c.name = String(r.rinomina || '').trim().slice(0, 100);
  else if (r?.nome !== undefined) c.name = String(r.nome || '').trim().slice(0, 100);
  if (r?.colore !== undefined || r?.sfuma !== undefined || r?.olografico !== undefined || nuovo) Object.assign(c, tintaRuolo(r));
  if (r?.segno !== undefined) Object.assign(c, segnoRuolo(r.segno) || {});
  if (r?.separato !== undefined || nuovo) c.hoist = !!r?.separato;
  if (r?.citabile !== undefined || nuovo) c.mentionable = !!r?.citabile;
  if (r?.permessi !== undefined || nuovo) c.permissions = String(r?.permessi ?? '0');
  return c;
};

export async function creaRuolo(token, guild, r, perche = '') {
  if (!idOk(guild)) return { ok: false, errore: 'id del server non valido' };
  const corpo = corpoRuolo(r, { nuovo: true });
  if (!corpo.name) return { ok: false, errore: 'un ruolo senza nome non si crea' };
  const x = await chiama(token, `/guilds/${guild}/roles`, { metodo: 'POST', corpo, perche });
  if (!x.ok) return x;
  // L'IMPRONTA DELL'ICONA torna indietro da qui. Non la sappiamo calcolare dai
  // byte, quindi e' l'unico momento in cui la si puo' sapere: chi ha messo
  // l'immagine la registra, e da li' in poi «c'e' gia' quella» e' una domanda
  // con una risposta.
  return { ok: true, id: String(x.dati?.id || ''), nome: String(x.dati?.name || corpo.name), icona: String(x.dati?.icon || '') };
}

export async function sistemaRuolo(token, guild, id, cambia, perche = '') {
  if (!idOk(guild) || !idOk(id)) return { ok: false, errore: 'id non valido' };
  const corpo = corpoRuolo(cambia);
  if (!Object.keys(corpo).length) return { ok: true, dati: null, niente: true };
  const x = await chiama(token, `/guilds/${guild}/roles/${id}`, { metodo: 'PATCH', corpo, perche });
  if (!x.ok) return x;
  return { ...x, icona: String(x.dati?.icon || '') };
}

export async function togliRuolo(token, guild, id, perche = '') {
  if (!idOk(guild) || !idOk(id)) return { ok: false, errore: 'id non valido' };
  return chiama(token, `/guilds/${guild}/roles/${id}`, { metodo: 'DELETE', perche });
}

// LA FOTOGRAFIA: com'e' il server adesso, nella forma esatta che il calcolo
// della differenza si aspetta. Quattro letture, una volta sola, e da qui in poi
// nessuno va piu' a chiedere niente a Discord per decidere: si decide su questa.
// Se si leggesse un pezzo alla volta mentre si costruisce, il server potrebbe
// cambiare a meta' strada e la differenza non sarebbe piu' quella mostrata.
export async function fotografia(token, guild) {
  const s = await server(token, guild);
  if (!s.ok) return s;
  const me = await io(token, guild);
  if (!me.ok) return me;
  const r = await ruoli(token, guild);
  if (!r.ok) return r;
  const c = await canali(token, guild);
  if (!c.ok) return c;
  const bits = permessiBot(r.ruoli, me.ruoli);
  // FIN DOVE ARRIVA IL BOT. Discord: un bot tocca solo i ruoli piu' in basso
  // del suo piu' alto. Non e' una cortesia da ricordarsi al momento giusto: e'
  // il numero che tiene fuori dall'elenco delle cose da fare tutto quello che
  // non e' suo da toccare.
  const { livello } = livelloDi(r.ruoli, me.ruoli);
  return {
    ok: true,
    guild: s.guild,
    impostazioni: s.impostazioni,
    caratteristiche: s.caratteristiche,
    ruoli: r.ruoli,
    canali: c.canali,
    bot: { id: me.id, nome: me.nome, ruoli: me.ruoli, livello },
    // I BIT COSI' COME SONO, e non solo i due «puo' / non puo'». Servono a
    // rispondere prima a una domanda che Discord pone e basta: un bot puo'
    // dare a un ruolo SOLO i privilegi che ha lui. Senza i bit in mano, quel
    // limite si scoprirebbe da un errore a meta' costruzione.
    bits: String(bits),
    puoCanali: puoCanali(bits),
    puoRuoli: puoRuoli(bits),
    puoFarEntrare: puoFarEntrare(bits),
  };
}

// La prova che si fa dal pannello: il token vale, il bot e' dentro, e questi
// sono i ruoli che puo' davvero muovere.
export async function prova(token, guild) {
  const s = await server(token, guild);
  if (!s.ok) return s;
  const me = await io(token, guild);
  if (!me.ok) return me;
  const r = await ruoli(token, guild);
  if (!r.ok) return r;
  return { ok: true, server: s.nome, bot: me.nome, ruoliBot: me.ruoli, ruoli: r.ruoli };
}
