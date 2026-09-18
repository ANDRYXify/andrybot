// I GIOCHI CHE LO DICONO DA SOLI.
//
// Qualche gioco pubblica il proprio stato: gli metti un file di configurazione
// nella sua cartella e da li' in poi e' LUI a mandare un messaggio a un indirizzo
// che gli hai dato, con dentro anche quante volte sei morto. Counter-Strike lo fa
// ufficialmente (si chiama Game State Integration), Dota 2 di fatto.
//
// Dove c'e', e' la strada giusta: non si riconosce niente, non si indovina
// niente. E non serve nemmeno il pannello aperto, perche' a parlare col nostro
// server e' il gioco.
//
// Qui sta SOLO il ragionamento: cosa c'e' scritto nel messaggio, e quante morti
// nuove sono. La porta, il database e la chiave stanno fuori.
//
// DUE COSE NON POSSONO ESISTERE, E NON PERCHE' QUALCUNO SE NE RICORDI:
//
//  · NON SI CONTANO LE MORTI DI UN ALTRO. Quando guardi una partita da spettatore
//    o riguardi un replay, il giocatore dentro al messaggio non sei tu: e' quello
//    inquadrato. Percio' il numero si legge solo quando il giocatore del messaggio
//    e' il giocatore SEDUTO A QUEL COMPUTER, che il gioco dichiara a parte. Non e'
//    un controllo aggiunto dopo: senza quella prova il numero non si legge affatto.
//
//  · IL NUMERO E' UN TOTALE, NON UN EVENTO. Il gioco non dice «sei morto»: dice
//    «finora sei morto tre volte», e a ogni partita nuova riparte da zero. Quindi
//    conta il SALTO IN SU, e ogni altra cosa (sceso, partita cambiata, salto
//    impossibile) ribasa e non conta niente. Un ribaseline che sbaglia perde una
//    morte; un ribaseline che manca ne conta trenta in un colpo.

// Piu' di cosi' non si muore fra due messaggi: il gioco ne manda uno ogni mezzo
// secondo. Un salto piu' grosso e' una partita cambiata che nessuno ha
// dichiarato, non una serie di morti.
import crypto from 'node:crypto';
import { streamers } from '../db.js';

export const MAX_SALTO = 5;

// Il gioco manda un messaggio ogni mezzo secondo, piu' un battito al minuto.
// Centoventi al minuto e' la vita normale; oltre il triplo non e' piu' un gioco.
export const MAX_AL_MINUTO = 400;

export const GIOCHI = [
  { id: 'cs2', nome: 'Counter-Strike 2', appid: 730, cartella: 'game/csgo/cfg' },
  { id: 'dota2', nome: 'Dota 2', appid: 570, cartella: 'game/dota/cfg/gamestate_integration' },
];

export const gioco = (id) => GIOCHI.find((g) => g.id === String(id || '')) || null;

const testo = (v) => (typeof v === 'string' || typeof v === 'number') ? String(v) : '';
const intero = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 0 ? n : null; };

// Counter-Strike. `provider.steamid` e' chi e' seduto al computer; `player` e'
// chi si sta guardando. Coincidono solo quando stai giocando tu.
function daCS(p) {
  const appid = Number(p?.provider?.appid);
  if (appid !== 730) return null;
  const io = testo(p?.provider?.steamid);
  const chi = testo(p?.player?.steamid);
  const morti = intero(p?.player?.match_stats?.deaths);
  return {
    gioco: 'cs2',
    tuo: !!io && !!chi && io === chi,
    morti,
    // Il gioco fa parte della partita: passare da Counter-Strike a Dota e'
    // cambiare partita, e deve ribasare come tutte le altre volte.
    // Counter-Strike non da' un numero di partita. La mappa e la modalita' sono
    // quello che cambia fra una partita e l'altra, ed e' abbastanza: quando non
    // cambiano, a cambiare partita ci pensa comunque il numero che scende.
    partita: ['cs2', testo(p?.map?.mode), testo(p?.map?.name)].join('|'),
  };
}

// Dota 2. Da spettatore la forma cambia: `player` non ha piu' `deaths`, ha
// dentro le squadre. Una forma che non e' la tua non si legge nemmeno.
function daDota(p) {
  const chi = testo(p?.provider?.name);
  const morti = intero(p?.player?.deaths);
  if (!/dota/i.test(chi) && morti === null) return null;
  const daSpettatore = !!p?.player && typeof p.player === 'object'
    && Object.keys(p.player).some((k) => /^team\d+$/.test(k));
  return {
    gioco: 'dota2',
    tuo: !daSpettatore && morti !== null,
    morti,
    partita: ['dota2', testo(p?.map?.matchid)].join('|'),
  };
}

// Cosa c'e' scritto nel messaggio. Null quando non e' un gioco che conosciamo:
// meglio non capire che capire male.
export function leggi(payload) {
  const p = (payload && typeof payload === 'object') ? payload : null;
  if (!p) return null;
  const r = daCS(p) || daDota(p);
  if (!r || r.morti === null) return null;
  return r;
}

// Quante morti nuove sono, e cosa ricordarsi per la prossima volta.
//
// `prima` e' quello che si ricordava (puo' essere niente: e' la prima volta, o
// il bot e' appena ripartito). Alla prima lettura non si conta MAI: non si sa
// da dove si veniva, e tutte le morti della partita in corso non sono successe
// adesso.
export function salto(prima, ora) {
  const zero = (stato) => ({ morti: 0, stato });
  if (!ora || ora.morti === null) return zero(prima || null);
  if (!ora.tuo) return zero(prima || null);

  const nuovo = { partita: ora.partita, morti: ora.morti };
  if (!prima || typeof prima.morti !== 'number') return zero(nuovo);
  if (prima.partita !== ora.partita) return zero(nuovo);

  const d = ora.morti - prima.morti;
  if (d <= 0) return zero(nuovo);
  if (d > MAX_SALTO) return zero(nuovo);
  return { morti: d, stato: nuovo };
}

// Il file da mettere nella cartella del gioco. E' il formato di Valve, non JSON:
// chiavi e valori fra virgolette, graffe annidate.
//
// Dentro ci sono l'indirizzo e la chiave. Chi ruba il file puo' far salire un
// numero, e basta: per questo la chiave si rigenera con un tasto.
export function configurazione({ gioco: id, indirizzo, chiave }) {
  const g = gioco(id);
  if (!g || !indirizzo || !chiave) return '';
  const vir = (s) => String(s).replace(/["\\]/g, '');
  const dati = id === 'dota2'
    ? ['provider', 'map', 'player']
    : ['provider', 'map', 'player_id', 'player_state', 'player_match_stats'];
  return `"SocialBot"\n{\n`
    + `  "uri"       "${vir(indirizzo)}"\n`
    + `  "timeout"   "5.0"\n`
    + `  "buffer"    "0.1"\n`
    + `  "throttle"  "0.5"\n`
    + `  "heartbeat" "60.0"\n`
    + `  "auth"\n  {\n    "token" "${vir(chiave)}"\n  }\n`
    + `  "data"\n  {\n${dati.map((d) => `    "${d}" "1"`).join('\n')}\n  }\n`
    + `}\n`;
}

export const nomeFile = (id) => `gamestate_integration_socialbot_${gioco(id)?.id || 'x'}.cfg`;

// ── La chiave, e il tetto ───────────────────────────────────────────────────
//
// E' una chiave A PARTE da quella della consolle, e non per ordine: questa
// finisce scritta in chiaro dentro un file sul disco di chi gioca, in una
// cartella che condividono i mod, le guide e i pacchetti di configurazione che
// girano in rete. Una chiave che sta li' non puo' essere la stessa che accende
// gli effetti, cambia scena e muove ogni contatore. Questa fa una cosa sola:
// portare un numero. Chi la ruba fa salire un contatore, e basta.
function scrivi(login, k) {
  const s = streamers.get(login);
  if (!s) return null;
  streamers.setSettings(login, { ...(s.settings || {}), gsiKey: k });
  return streamers.get(login)?.settings?.gsiKey === k ? k : null;
}

export function chiave(channel) {
  const login = String(channel || '').toLowerCase();
  const s = streamers.get(login);
  if (!s) return null;
  if (s.settings?.gsiKey) return s.settings.gsiKey;
  return scrivi(login, crypto.randomBytes(24).toString('hex'));
}

export function revoca(channel) {
  return scrivi(String(channel || '').toLowerCase(), crypto.randomBytes(24).toString('hex'));
}

// A tempo costante: due chiavi sbagliate devono metterci lo stesso tempo a
// essere rifiutate, se no la differenza racconta quanti caratteri erano giusti.
export function chiaveOk(channel, data) {
  const k = chiave(channel);
  if (!k) return false;
  const vera = Buffer.from(k);
  const arrivata = Buffer.from(String(data || ''));
  if (vera.length !== arrivata.length) return false;
  return crypto.timingSafeEqual(vera, arrivata);
}

const _colpi = new Map();
export function troppiColpi(channel) {
  const login = String(channel || '').toLowerCase();
  const adesso = Date.now();
  const suoi = (_colpi.get(login) || []).filter((t) => adesso - t < 60_000);
  suoi.push(adesso);
  _colpi.set(login, suoi);
  return suoi.length > MAX_AL_MINUTO;
}
