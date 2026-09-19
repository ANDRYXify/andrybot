// «QUESTO ACCOUNT DISCORD SONO IO»: come si dimostra, e perche' cosi'.
//
// Servono due meta': chi sei su Discord e chi sei su Twitch. La prima la dice
// Discord stesso, con la sua schermata del permesso. La seconda e' il problema.
//
// La strada ovvia — il bot scrive in chat un link personale e tu lo apri — e'
// sbagliata, e si rompe in un modo che non si vede: la chat e' PUBBLICA. Chi
// sta guardando vede il tuo link, lo apre prima di te, autorizza il SUO
// Discord, e da quel momento e' lui a prendersi i tuoi ruoli. Nessuno se ne
// accorge, e il derubato pensa di aver sbagliato qualcosa.
//
// Quindi il codice va nell'altro verso. Parti dal web, dici a Discord chi sei,
// e la pagina ti mostra un CODICE che sta solo sul tuo schermo. Poi lo scrivi
// in chat: quel messaggio dice a noi, con l'autorita' di Twitch, che quel
// codice e' tuo — e il messaggio stesso lo consuma. Chi lo legge in chat lo
// legge gia' bruciato: e' arrivato secondo per costruzione, perche' prima del
// tuo messaggio quel codice non esisteva per nessun altro.
//
// Il resto sono conseguenze: il codice scade, vale per un canale solo, e un
// account Discord non puo' stare appeso a due persone sullo stesso canale —
// sennonche' sarebbe la stessa rapina, fatta piano.
import crypto from 'node:crypto';
import { dcAttesa, dcLink, dcRuoli } from '../db.js';
import { config } from '../config.js';
import { tokenDi } from './discord-api.js';

// Niente 0/O e 1/I: un codice si legge ad alta voce e si ricopia a mano.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const LUNGHEZZA = 6;
export const SCADENZA_MS = 10 * 60_000;

export function nuovoCodice() {
  let s = '';
  for (let i = 0; i < LUNGHEZZA; i++) s += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return s;
}

export const attivo = () => !!config.discordApp?.attivo;

// Il canale accetta collegamenti solo se il gestore dei ruoli c'e' ed e' acceso:
// altrimenti staremmo raccogliendo un consenso per una cosa che non esiste.
export function apertoA(channel) {
  const c = dcRuoli.get(channel);
  return !!(c && c.attivo && c.guild && tokenDi(c));
}

// Dopo che Discord ha detto chi sei: nasce il codice da scrivere in chat.
export function apri(channel, { dcId, dcNome = '', ora = Date.now() } = {}) {
  const ch = String(channel || '').toLowerCase();
  const id = String(dcId || '');
  if (!ch || !id || !apertoA(ch)) return null;
  dcAttesa.pulisci(ora);
  dcAttesa.scordaDi(ch, id);            // un secondo giro sostituisce il primo
  const codice = nuovoCodice();
  dcAttesa.metti({ codice, channel: ch, dcId: id, dcNome, scad: ora + SCADENZA_MS });
  return { codice, scade: ora + SCADENZA_MS };
}

const IL_COMANDO = 'discord';

// L'INDIRIZZO DELLA PORTA. Corto dove c'e' (discord.<dominio>/<canale>), lungo
// dove non c'e': la stessa funzione per tutti e due, perche' un indirizzo
// scritto in due posti e' un indirizzo che un giorno differisce.
export function indirizzo(channel) {
  const ch = String(channel || '').toLowerCase();
  if (config.discordHost) return `https://${config.discordHost}/${ch}`;
  return `${String(config.baseUrl || '').replace(/\/$/, '')}/collega/${ch}`;
}

// LE FRASI SONO DELLO STREAMER, NON NOSTRE.
//
// Queste sono solo quelle di casa: quello che il bot dice in chat lo scrive
// chi ha il canale, col suo tono, e un campo lasciato vuoto ricade qui. Erano
// scritte nel codice, e si vedeva: un bot che parla come il manuale di chi
// l'ha fatto, dentro la chat di un altro.
//
// I segnaposto sono tre e bastano: chi scrive, dove andare, e il codice.
export const FRASI = Object.freeze({
  inizio: '@{nome} ti faccio entrare nel Discord e ti do un codice da riscrivere qui, cosi\' ti sistemo i ruoli. Si comincia qui {link}',
  fatto: '@{nome} collegato ✓ Al prossimo giro ti metto a posto i ruoli su Discord.',
  scaduto: '@{nome} quel codice non vale piu\'. Si riparte da qui {link}',
  via: '@{nome} scollegato. I ruoli che hai adesso restano tuoi: non tocco piu\' niente.',
  estraneo: '@{nome} non risulti collegato.',
});

export const CHIAVI_FRASI = Object.keys(FRASI);
const LUNGA = 300;

// Solo le chiavi che conosciamo, solo testo, e corto abbastanza da entrare in
// un messaggio di chat: quello che arriva dal pannello non decide la forma.
export function normalizzaFrasi(f) {
  const fuori = {};
  for (const k of CHIAVI_FRASI) {
    const v = String(f?.[k] ?? '').trim().replace(/\s+/g, ' ').slice(0, LUNGA);
    if (v) fuori[k] = v;
  }
  return fuori;
}

export function frasiDi(channel) {
  const sue = normalizzaFrasi(dcRuoli.get(String(channel || '').toLowerCase())?.frasi);
  return { ...FRASI, ...sue };
}

// UN LINK FINISCE DOVE FINISCE LO SPAZIO.
//
// «apri {link}: ti faccio entrare» diventava «apri https://…/andryxify: ti» e i
// due punti entravano NELL'INDIRIZZO: chi ci cliccava trovava una pagina che non
// esiste. Non e' un errore di quella frase — e' un errore possibile in ogni
// frase, comprese quelle che scrive lo streamer, e quelle non le rilegge nessuno.
//
// Quindi dopo il link ci va uno spazio, sempre. Brutto e funzionante batte
// elegante e rotto; le frasi di casa non ci arrivano mai, perche' il link sta
// in fondo.
export const riempi = (testo, valori = {}) => String(testo || '')
  .replace(/\{link\}(?=\S)/g, '{link} ')
  .replace(/\{(nome|link|codice)\}/g, (_, k) => String(valori[k] ?? ''));

// In chat: «!discord ABC123» collega, «!discord via» scollega, «!discord» da
// solo spiega dove si comincia.
export function tryComando(msg, parla, { ora = Date.now() } = {}) {
  if (!msg) return false;   // lo streamer scrive col NOSTRO account: scartarlo scarta lui (docs/COMANDI.md)
  const testo = String(msg.text || '').trim();
  if (!testo.startsWith('!')) return false;
  const parti = testo.slice(1).split(/\s+/);
  if ((parti.shift() || '').toLowerCase() !== IL_COMANDO) return false;
  const ch = String(msg.channel || '').toLowerCase();
  const chi = String(msg.user || '').toLowerCase();
  if (!ch || !chi) return false;
  if (!apertoA(ch)) return false;
  const nome = String(msg.display || msg.user || '').slice(0, 60);
  const arg = String(parti.join(' ') || '').trim();
  const dove = indirizzo(ch);
  const frasi = frasiDi(ch);
  const di = (chiave, codice = '') => parla(riempi(frasi[chiave], { nome, link: dove, codice }));

  if (!arg) {
    di('inizio');
    return true;
  }
  if (/^(via|togli|scollega)$/i.test(arg)) {
    const c = dcLink.prendi(ch, chi);
    dcLink.togli(ch, chi);
    di(c ? 'via' : 'estraneo');
    return true;
  }

  const codice = arg.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LUNGHEZZA);
  const att = codice.length === LUNGHEZZA ? dcAttesa.prendi(codice) : null;
  if (!att || att.channel !== ch || att.scad <= ora) {
    if (att) dcAttesa.consuma(codice);
    di('scaduto', codice);
    return true;
  }
  dcAttesa.consuma(codice);
  // Lo stesso account Discord non puo' restare appeso a due persone qui: chi
  // ce l'aveva prima lo perde, e i suoi ruoli smettono di essere gestiti.
  const gia = dcLink.perDc(ch, att.dc_id);
  if (gia && gia.login !== chi) dcLink.togli(ch, gia.login);
  dcLink.metti(ch, { login: chi, userId: String(msg.userId || ''), dcId: att.dc_id, dcNome: att.dc_nome });
  di('fatto', codice);
  return true;
}
