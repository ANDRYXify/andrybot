// IL MURO DELLE EMOTE, la parte del bot.
//
// Il muro vola nell'overlay (src/web/public/muro.js): qui si decide solo COSA
// gli arriva. Tre regole.
//
//  · CHI PASSA LO DECIDE IL BOT. Il livello (tutti, abbonati, VIP, moderatori)
//    e gli esclusi si guardano qui, dove il messaggio ha ancora i suoi ruoli:
//    l'overlay non li riceve, e non deve riceverli.
//  · I COMANDI NON VOLANO. Un messaggio che comincia con «!» e' un comando, e
//    le sue parole non sono emote da lanciare: `!esplodi Kappa` fa esplodere
//    Kappa una volta, non la lancia anche come emote singola.
//  · UN EVENTO, UN'ESPLOSIONE. I sub regalati arrivano due volte (la raffica e
//    un `channel.subscribe` per ognuno, come negli alert): esplode la raffica,
//    non ognuno dei venti abbonamenti.
//
// Il ragionamento sta in docs/MURO-EMOTE.md.
import { streamers } from '../db.js';
import { normMuro } from '../web/stile.js';
import { puoUsare } from './comandi-registro.js';
import * as emote from './emotes.js';
import { makeLog } from '../logger.js';

const log = makeLog('muro');

// I bot di chat piu' diffusi: scrivono emote nei loro annunci, e un muro che
// vola a ogni annuncio di un bot non e' la chat che reagisce.
export const BOT_NOTI = new Set(['nightbot', 'streamelements', 'streamlabs', 'moobot', 'fossabot', 'wizebot',
  'soundalerts', 'sery_bot', 'botrixoficial', 'kofistreambot', 'pokemoncommunitygame', 'streamstickers', 'blerp',
  'frostytoolsdotcom', 'own3d', 'tangiabot', 'deepbot', 'coebot', 'phantombot', 'streamcaptainbot']);

const MAX_PAROLE = 20;
// Il nome canonico del comando: in chat lo si chiama come lo streamer l'ha
// rinominato, e il vaglio dei comandi lo riporta a questo.
export const COMANDO = 'esplodi';

const cfgDi = (channel) => normMuro(streamers.get(channel)?.settings?.overlayMuro);
const chiE = (msg) => String(msg?.user || '').toLowerCase().replace(/^@/, '');

export function passa(msg, cfg) {
  if (!cfg?.attivo || !msg || msg.isSelf) return false;
  const u = chiE(msg);
  if (cfg.escludiBot && BOT_NOTI.has(u)) return false;
  if (cfg.esclusiPersone.includes(u)) return false;
  return puoUsare(cfg.chi, msg);
}

// Quanti abbonamenti porta un evento, contati una volta sola.
export function abbonamentiDi(type, data) {
  if (type === 'channel.subscription.gift') return Math.max(1, Number(data?.total) || 1);
  if (type === 'channel.subscribe') return data?.is_gift ? 0 : 1;
  if (type === 'channel.subscription.message') return 1;
  return 0;
}

// Da un evento del canale all'esplosione che gli spetta, o a niente.
export function esplosioneDi(cfg, type, data) {
  if (!cfg?.attivo) return null;
  const ev = cfg.eventi;
  const ok = (k, quanto) => ev[k].attivo && (ev[k].soglia == null || quanto >= ev[k].soglia) ? { evento: k, figura: ev[k].figura } : null;
  if (type === 'channel.raid') return ok('raid', Number(data?.viewers) || 0);
  if (type === 'channel.cheer') return ok('bit', Number(data?.bits) || 0);
  if (type === 'channel.hype_train.begin') return ok('trenoParte', 1);
  if (type === 'channel.hype_train.end') return ok('trenoFine', 1);
  const subs = abbonamentiDi(type, data);
  return subs ? ok('sub', subs) : null;
}

const parole = (testo) => String(testo || '').trim().split(/\s+/).filter(Boolean).slice(0, MAX_PAROLE);

export class MuroEmote {
  constructor({ effects, helix } = {}) {
    this.effects = effects || null;
    this.helix = helix || null;
    this.ultimoComando = new Map();
  }

  _manda(channel, p) {
    try { this.effects?.emit?.(channel, p); } catch (e) { log.debug('muro:', e?.message || e); }
  }

  esplodi(channel, figura, extra = {}) {
    this._manda(channel, { tipo: 'muro-esplodi', figura, ...extra });
  }

  suChat(channel, msg) {
    try {
      const cfg = cfgDi(channel);
      const testo = String(msg?.text || '').trim();
      if (!cfg.attivo || !testo || testo[0] === '!' || !passa(msg, cfg)) return;
      this._manda(channel, {
        tipo: 'muro',
        chi: chiE(msg),
        testo: testo.slice(0, 300),
        emotiTwitch: emote.twitchInMessaggio(msg?.tags?.emotes, msg?.text),
      });
    } catch (e) { log.debug('suChat:', e?.message || e); }
  }

  // «!esplodi Kappa PogChamp»: le emote del messaggio esplodono nella figura
  // scelta. Chi puo' scriverlo e come si chiama lo decide la scheda dei comandi;
  // qui l'attesa per tutti, che tiene il muro una festa e non un rumore.
  tryComando(msg, parla, ora = Date.now()) {
    const testo = String(msg?.text || '').trim();
    const [parola, ...resto] = testo.split(/\s+/);
    if (String(parola || '').toLowerCase() !== '!' + COMANDO) return false;
    const channel = msg.channel;
    const cfg = cfgDi(channel);
    if (!cfg.attivo) return true;
    const ultimo = this.ultimoComando.get(channel);
    if (ultimo != null && ora - ultimo < cfg.comando.attesa * 1000) return true;
    this.ultimoComando.set(channel, ora);
    this.esplodi(channel, cfg.comando.figura, {
      da: 'comando',
      parole: parole(resto.join(' ')),
      emotiTwitch: emote.twitchInMessaggio(msg?.tags?.emotes, msg?.text),
    });
    return true;
  }

  async suEvento(ev) {
    try {
      const { channel, type, data } = ev || {};
      const cfg = cfgDi(channel);
      const e = esplosioneDi(cfg, type, data);
      if (!e) return;
      let emoti = [];
      if (e.evento === 'raid') {
        const mappa = await emote.soloCanale(this.helix, data?.from_broadcaster_user_login);
        emoti = Object.entries(mappa).slice(0, 40).map(([nome, url]) => ({ nome, url }));
      }
      this.esplodi(channel, e.figura, { da: e.evento, emoti });
    } catch (err) { log.debug('suEvento:', err?.message || err); }
  }

  suDono(channel, importo) {
    const cfg = cfgDi(channel);
    const ev = cfg.eventi.dono;
    if (cfg.attivo && ev.attivo && Number(importo) >= ev.soglia) this.esplodi(channel, ev.figura, { da: 'dono' });
  }

  suPremio(channel, data) {
    const cfg = cfgDi(channel);
    if (!cfg.attivo) return;
    const id = String(data?.reward?.id || '');
    const p = cfg.premi.find((x) => x.id === id);
    if (p) this.esplodi(channel, p.figura, { da: 'premio', parole: parole(data?.user_input) });
  }

  prova(channel, figura) {
    const cfg = cfgDi(channel);
    this.esplodi(channel, figura || cfg.comando.figura, { da: 'prova' });
    return true;
  }
}
