// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL SERVIZIO DEI COLPI (docs/COLPI.md): la mira, lo sparo, e le tre strade per
// pagarlo. Le regole stanno nel modello (colpi.js); qui si mettono insieme
// registro, effetti e impostazioni, che arrivano da fuori: cosi' le prove lo
// fanno girare senza database e senza rete.
import { normalizza, puntoBuono, voceDi, metodiDi, nuovoCodice, codiceIn, nomeChi, bastaPer, SCADENZA_MS } from './colpi.js';
import { randomBytes } from 'node:crypto';

// Gli effetti che si possono mirare: quelli con un'immagine o un video, che si
// posano in un punto. I disegni girano a tutto schermo, senza un punto.
export const MIRABILE = (eff) => !!eff && (eff.tipo === 'immagine' || eff.tipo === 'video') && eff.schermo !== 'riempi' && eff.schermo !== 'intero';

export function creaServizioColpi({ registro, effects, effettoDi, impostazioni, inOnda = () => true, ora = () => Date.now(), log = null }) {
  const ultimaDi = new Map();
  const cfgDi = (login) => normalizza(impostazioni(login));

  // La mira: il punto si controlla adesso, il prezzo si scrive adesso.
  function mira(login, { voce: idVoce, x, y, chi = '', chiave = '' } = {}) {
    const ch = String(login || '').toLowerCase();
    const cfg = cfgDi(ch);
    if (!cfg.attivo) return { ok: false, motivo: 'spento' };
    if (cfg.pausa) return { ok: false, motivo: 'pausa' };
    if (!inOnda(ch)) return { ok: false, motivo: 'offline' };
    const voce = voceDi(cfg, idVoce);
    if (!voce || !metodiDi(voce).length) return { ok: false, motivo: 'voce' };
    if (!MIRABILE(effettoDi(ch, voce.comando))) return { ok: false, motivo: 'effetto' };
    const punto = puntoBuono(cfg, x, y);
    if (!punto.ok) return { ok: false, motivo: punto.motivo };
    const adesso = ora();
    const k = ch + '|' + String(chiave || '');
    const prima = ultimaDi.get(k) || 0;
    if (cfg.attesaSec && adesso - prima < cfg.attesaSec * 1000) return { ok: false, motivo: 'attesa', fraSec: Math.ceil((prima + cfg.attesaSec * 1000 - adesso) / 1000) };
    if (registro.aperteDa(ch, adesso - 60_000) >= cfg.alMinuto) return { ok: false, motivo: 'troppi' };
    const m = {
      id: randomBytes(9).toString('hex'), login: ch, voce: voce.id, comando: voce.comando, nome: voce.nome,
      x: punto.x, y: punto.y, scala: voce.scala, chi: cfg.conNome ? nomeChi(chi) : '',
      prezzi: { euro: voce.euro, punti: voce.punti, bit: voce.bit }, creata: adesso, scade: adesso + SCADENZA_MS,
    };
    for (let i = 0; i < 12; i++) { m.codice = nuovoCodice(); if (registro.apri(m)) { ultimaDi.set(k, adesso); return { ok: true, mira: { ...m, metodi: metodiDi(voce) } }; } }
    return { ok: false, motivo: 'codice' };
  }

  // Lo sparo: una volta sola, qualunque cosa lo paghi.
  function spara(m, metodo, riferimento = '') {
    if (!m || !registro.spara(m.id, metodo, riferimento)) return false;
    const fatto = effects.fireConOpzioni(m.login, m.comando, { xy: { x: m.x, y: m.y, s: m.scala, r: 0, centro: true }, attacco: { chi: m.chi, nome: m.nome } });
    log?.info?.(`colpo ${m.nome} su #${m.login} (${metodo})${fatto ? '' : ': effetto non trovato'}`);
    return true;
  }

  // I Bit: il cheer porta il codice nel messaggio.
  function daCheer(login, { bits, message, user_login = '' } = {}) {
    const ch = String(login || '').toLowerCase();
    const codice = codiceIn(message);
    if (!codice) return { esito: 'nessuno' };
    const m = registro.perCodice(ch, codice, ora());
    if (!m) return { esito: 'sconosciuto', codice };
    if (!bastaPer(m, 'bit', bits)) return { esito: 'pochi', codice, serve: Number(m.prezzi.bit) || 0, nome: m.nome };
    return { esito: spara(m, 'bit', `cheer:${user_login}:${ora()}`) ? 'sparato' : 'gia', codice, nome: m.nome };
  }

  // I punti canale: il premio della voce, col codice scritto nel riscatto.
  // Torna lo stato da dare al riscatto: FULFILLED se il colpo e' partito,
  // CANCELED (i punti tornano) se il codice non e' valido.
  function daRiscatto(login, { reward_id, user_input = '', id = '' } = {}) {
    const ch = String(login || '').toLowerCase();
    const cfg = cfgDi(ch);
    const voce = (cfg.voci || []).find((v) => v.premio && v.premio === reward_id);
    if (!voce) return { esito: 'non-mio' };
    const codice = codiceIn(user_input);
    const m = codice ? registro.perCodice(ch, codice, ora()) : null;
    if (!m || m.voce !== voce.id || !(Number(m.prezzi.punti) > 0)) return { esito: 'sconosciuto', stato: 'CANCELED', codice };
    return spara(m, 'punti', `premio:${id}`) ? { esito: 'sparato', stato: 'FULFILLED', nome: m.nome } : { esito: 'gia', stato: 'CANCELED' };
  }

  // Gli euro: la donazione pagata che era stata aperta per una mira.
  function daPagamento(donazioneId) {
    const m = registro.perRiferimento(donazioneId);
    if (!m) return { esito: 'non-mio' };
    return { esito: spara(m, 'euro', donazioneId) ? 'sparato' : 'gia', nome: m.nome, login: m.login };
  }

  return { mira, spara, daCheer, daRiscatto, daPagamento, cfgDi };
}
