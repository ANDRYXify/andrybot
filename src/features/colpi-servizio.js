// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL SERVIZIO DEI COLPI (docs/COLPI.md): la mira, il pagamento, la consegna.
// Le regole stanno nel modello (colpi.js); qui si mettono insieme registro,
// effetti e impostazioni, che arrivano da fuori: cosi' le prove lo fanno
// girare senza database e senza rete.
//
// CHI PAGA VEDE IL SUO COLPO, O RIAVE I SOLDI. Per costruzione:
//  · si paga solo un colpo CONSEGNABILE adesso (diretta in onda, un overlay
//    che ha detto di mostrare gli effetti, l'effetto che c'e'): la mira, il
//    tasto «Paga» e il riscatto lo controllano, e la pagina toglie i modi di
//    pagare appena smette di esserlo;
//  · pagato non vuol dire visto: la mira resta «pagata» finche' un overlay non
//    dice di averla MOSTRATA (`visto`); fino ad allora la ronda la rimanda;
//  · se in CONSEGNA_MS non si vede, euro e punti tornano indietro da soli (il
//    rimborso sul conto dello streamer, il riscatto CANCELED). I Bit non li
//    puo' rimborsare nessuno fuori da Twitch: per questo la pagina li chiede
//    solo quando il colpo e' consegnabile, e un colpo a Bit pagato resta in
//    coda finche' un overlay non lo mostra.
import { normalizza, puntoBuono, voceDi, metodiDi, nuovoCodice, codiceIn, nomeChi, bastaPer, frasePresenza, SCADENZA_MS } from './colpi.js';
import { randomBytes } from 'node:crypto';

// Gli effetti che si possono mirare: quelli che si posano in un punto. Un'immagine
// o un video (non a tutto schermo), e un lancio (docs/LANCI.md), che per come e'
// fatto arriva col centro nel punto. I disegni girano a tutto schermo, senza un punto.
export const MIRABILE = (eff) => !!eff && (eff.tipo === 'lancio' || ((eff.tipo === 'immagine' || eff.tipo === 'video') && eff.schermo !== 'riempi' && eff.schermo !== 'intero'));
// quanto si aspetta che un overlay mostri un colpo pagato, prima di rimborsarlo
export const CONSEGNA_MS = 10 * 60_000;
// ogni quanto si rimanda un colpo non ancora visto (l'overlay riconosce quelli
// che ha gia' in fila: un rinvio non lo mostra due volte)
export const RINVIO_MS = 20_000;
// una presenza che l'overlay non mostra in tre minuti non si mostra piu': il
// momento e' passato (come per chi arriva in chat), e lo spettatore la puo' rifare
export const PRESENZA_MS = 3 * 60_000;
// la voce di una presenza: non e' una voce del listino (quelle sono [a-z0-9])
export const VOCE_PRESENZA = '@presenza';

// `monete`: le monete del canale (economia.js): `punta` (tutte o niente:
// { tolte, ricevuta } o null), `rendi` (la ricevuta torna com'era) e `saldo`. Senza, i colpi non
// si pagano in monete.
export function creaServizioColpi({ registro, effects, effettoDi, impostazioni, inOnda = () => true, overlay = () => true,
  rimborsaEuro = async () => ({ errore: 'nessun conto' }), chiudiPremio = async () => true, monete = null, ora = () => Date.now(), log = null }) {
  const ultimaDi = new Map();
  const cfgDi = (login) => normalizza(impostazioni(login));

  // Consegnabile adesso: la stessa domanda per la mira, per «Paga» e per il
  // riscatto. Torna '' se si', se no il motivo.
  function consegnabile(login, idVoce) {
    const ch = String(login || '').toLowerCase();
    const cfg = cfgDi(ch);
    if (!cfg.attivo) return 'spento';
    if (cfg.pausa) return 'pausa';
    if (!inOnda(ch)) return 'offline';
    if (!overlay(ch)) return 'overlay';
    const voce = voceDi(cfg, idVoce);
    if (!voce || !metodiDi(voce).length) return 'voce';
    if (!MIRABILE(effettoDi(ch, voce.comando))) return 'effetto';
    return '';
  }

  // La mira: il punto si controlla adesso, il prezzo si scrive adesso.
  function mira(login, { voce: idVoce, x, y, chi = '', chiave = '', spettatore = '' } = {}) {
    const ch = String(login || '').toLowerCase();
    const no = consegnabile(ch, idVoce);
    if (no) return { ok: false, motivo: no };
    const cfg = cfgDi(ch);
    const voce = voceDi(cfg, idVoce);
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
      prezzi: { euro: voce.euro, punti: voce.punti, bit: voce.bit, monete: voce.monete }, creata: adesso, scade: adesso + SCADENZA_MS,
      spettatore: String(spettatore || ''),
    };
    for (let i = 0; i < 12; i++) { m.codice = nuovoCodice(); if (registro.apri(m)) { ultimaDi.set(k, adesso); return { ok: true, mira: { ...m, metodi: metodiDi(voce) } }; } }
    return { ok: false, motivo: 'codice' };
  }

  // Manda all'overlay un colpo pagato. Non lo segna visto: lo fa l'overlay.
  function manda(m) {
    const ch = m.login;
    if (!inOnda(ch) || !overlay(ch) || !MIRABILE(effettoDi(ch, m.comando))) return false;
    registro.tentata(m.id, ora());
    return !!effects.fireConOpzioni(ch, m.comando, { xy: { x: m.x, y: m.y, s: m.scala, r: 0, centro: true }, attacco: { id: m.id, chi: m.chi, nome: m.nome } });
  }

  // Il pagamento e' arrivato: una volta sola, qualunque cosa lo paghi.
  function incassa(m, metodo, riferimento = '', premio = '', ancheScaduta = false, ricevuta = null) {
    if (!m || !registro.paga(m.id, metodo, riferimento, ora(), premio, ancheScaduta, ricevuta)) return false;
    const fatto = manda(registro.get(m.id));
    log?.info?.(`colpo ${m.nome} pagato su #${m.login} (${metodo})${fatto ? '' : ': in coda, nessun overlay pronto'}`);
    return true;
  }

  async function chiudi(m, stato) {
    const [premio, riscatto] = String(m.premio || '').split(':');
    try { return !!(await chiudiPremio(m.login, premio, riscatto, stato)); } catch (e) { log?.warn?.(`riscatto del colpo #${m.login}:`, e?.message || e); return false; }
  }

  // LA PRESENZA dalla chat (docs/COLPI.md, «La presenza»). Le stesse domande di
  // un colpo (pagina accesa, non in pausa, in onda, un overlay, l'effetto che
  // c'e', il punto fuori dalle zone), un tetto suo al minuto, e una sola per
  // spettatore per diretta: `occasione` e' la diretta (arrivi.occasioneDiretta),
  // `chiave` chi e' (piattaforma e id). Il resto e' la strada dei colpi: l'overlay
  // la mostra in fila e dice «visto», la ronda la rimanda.
  function presenza(login, { chiave = '', nome = '', occasione = '', lingua = 'it' } = {}) {
    const ch = String(login || '').toLowerCase();
    const cfg = cfgDi(ch);
    const p = cfg.presenza;
    if (!cfg.attivo || !p.attiva) return { esito: 'spenta' };
    if (!chiave || !occasione) return { esito: 'spenta' };
    if (cfg.pausa) return { esito: 'fermo', motivo: 'pausa' };
    if (!inOnda(ch)) return { esito: 'fermo', motivo: 'offline' };
    if (!overlay(ch)) return { esito: 'fermo', motivo: 'overlay' };
    if (!MIRABILE(effettoDi(ch, p.comando))) return { esito: 'fermo', motivo: 'effetto' };
    const punto = puntoBuono(cfg, p.x, p.y);
    if (!punto.ok) return { esito: 'fermo', motivo: punto.motivo };
    const chi = frasePresenza(cfg, nome, lingua);
    if (!chi) return { esito: 'spenta' };
    const adesso = ora();
    if (registro.presenzeDa(ch, adesso - 60_000) >= p.alMinuto) return { esito: 'troppe' };
    const m = { id: randomBytes(9).toString('hex'), login: ch, voce: VOCE_PRESENZA, comando: p.comando, nome: 'Presenza',
      x: punto.x, y: punto.y, scala: p.scala, chi, riferimento: `presenza:${occasione}:${chiave}` };
    if (!registro.presenza(m, adesso)) return { esito: 'gia' };
    const fatto = manda(registro.get(m.id));
    log?.info?.(`presenza su #${ch}${fatto ? '' : ': in coda, nessun overlay pronto'}`);
    return { esito: 'partita' };
  }

  // La prova dal pannello: la stessa presenza, subito, senza registro (non e'
  // di nessuno e non conta), col nome dello streamer. L'effetto deve esserci.
  function provaPresenza(login, { nome = '', lingua = 'it', presenza: bozza = null } = {}) {
    const ch = String(login || '').toLowerCase();
    const cfg = cfgDi(ch);
    const p = bozza ? normalizza({ presenza: { ...bozza, attiva: true } }).presenza : cfg.presenza;
    if (!MIRABILE(effettoDi(ch, p.comando))) return { ok: false, motivo: 'effetto' };
    const punto = puntoBuono(cfg, p.x, p.y);
    if (!punto.ok) return { ok: false, motivo: punto.motivo };
    const chi = frasePresenza({ presenza: p }, nome, lingua);
    const ok = !!effects.fireConOpzioni(ch, p.comando, { xy: { x: punto.x, y: punto.y, s: p.scala, r: 0, centro: true }, attacco: { id: '', chi, nome: 'Presenza' } });
    return ok ? { ok: true } : { ok: false, motivo: 'overlay' };
  }

  // L'overlay l'ha mostrato. Coi punti canale il riscatto si chiude adesso.
  async function visto(login, id) {
    const m = registro.getDi(String(login || '').toLowerCase(), String(id || ''));
    if (!m || !registro.consegnata(m.id, ora())) return false;
    if (m.metodo === 'punti' && m.premio) await chiudi(m, 'FULFILLED');
    return true;
  }

  // La ronda: rimanda quello che non si e' visto, rimborsa quello che non si
  // vedra'. Un rimborso che non riesce si ritenta al giro dopo.
  // Un giro alla volta: due giri insieme potrebbero rimborsare due volte.
  let inGiro = false;
  async function ronda() {
    if (inGiro) return;
    inGiro = true;
    try { await giro(); } finally { inGiro = false; }
  }
  async function giro() {
    const adesso = ora();
    for (const m of registro.daConsegnare()) {
      if (m.metodo === 'presenza') {
        if (adesso - m.pagata_at > PRESENZA_MS) registro.lasciata(m.id);
        else if (adesso - (m.tentata_at || 0) >= RINVIO_MS) manda(m);
        continue;
      }
      if (m.metodo !== 'bit' && adesso - m.pagata_at > CONSEGNA_MS) {
        let ok = false;
        if (m.metodo === 'punti') ok = await chiudi(m, 'CANCELED');
        else if (m.metodo === 'monete') { try { ok = !!monete && !!m.ricevuta && (monete.rendi(m.login, String(m.riferimento).replace(/^monete:/, ''), m.ricevuta), true); } catch { ok = false; } }
        else if (m.metodo === 'euro') { try { ok = !!(await rimborsaEuro(m.login, m.riferimento))?.ok; } catch { ok = false; } }
        if (ok && registro.rimborsata(m.id)) log?.info?.(`colpo ${m.nome} su #${m.login} non mostrato: rimborsato (${m.metodo})`);
        else if (!ok) log?.warn?.(`colpo ${m.nome} su #${m.login} non mostrato, rimborso non riuscito (${m.metodo}): riprovo`);
        continue;
      }
      if (adesso - (m.tentata_at || 0) >= RINVIO_MS) manda(m);
    }
  }

  // I Bit: il cheer porta il codice nel messaggio. Chi ha mirato con l'accesso
  // a Twitch non ha bisogno del codice: un suo cheer che da solo copre quello
  // che manca paga la sua ultima mira aperta. Solo da solo: un cheer piu'
  // piccolo, fatto magari per altro, non si somma di nascosto (col codice si').
  function daCheer(login, { bits, message, user_login = '', user_id = '' } = {}) {
    const ch = String(login || '').toLowerCase();
    const codice = codiceIn(message);
    let m = codice ? registro.perCodice(ch, codice, ora()) : null;
    if (!m && !codice && user_id) {
      const sua = registro.apertaDi(ch, String(user_id), ora());
      const manca = sua ? (Number(sua.prezzi.bit) || 0) - (Number(sua.versati) || 0) : 0;
      if (sua && manca > 0 && Number(bits) >= manca) m = sua;
    }
    if (!m) return codice ? { esito: 'sconosciuto', codice } : { esito: 'nessuno' };
    if (!(Number(m.prezzi.bit) > 0)) return { esito: 'sconosciuto', codice };
    // i Bit si sommano: chi ne manda meno del prezzo completa col cheer dopo
    const totale = registro.versa(m.id, bits);
    if (totale == null) return { esito: 'sconosciuto', codice };
    if (!bastaPer(m, 'bit', totale)) return { esito: 'pochi', codice, serve: Number(m.prezzi.bit), mancano: Number(m.prezzi.bit) - totale, nome: m.nome };
    if (!incassa(m, 'bit', `cheer:${user_login}:${ora()}`)) return { esito: 'gia', codice, nome: m.nome };
    return { esito: 'pagato', codice, nome: m.nome, inCoda: !!consegnabile(ch, m.voce) };
  }

  // I punti canale: il premio della voce, col codice scritto nel riscatto.
  // `stato` e' quello da dare SUBITO al riscatto: CANCELED (i punti tornano) se
  // il codice non vale o se il colpo adesso non si puo' consegnare; null se il
  // colpo e' pagato: il riscatto si chiude quando l'overlay lo mostra
  // (FULFILLED) o, se non succede, alla scadenza della consegna (CANCELED).
  // Chi ha mirato con l'accesso a Twitch puo' scrivere quello che vuole: vale la
  // sua ultima mira aperta su quella voce.
  function daRiscatto(login, { reward_id, user_input = '', id = '', user_id = '' } = {}) {
    const ch = String(login || '').toLowerCase();
    const cfg = cfgDi(ch);
    const voce = (cfg.voci || []).find((v) => v.premio && v.premio === reward_id);
    if (!voce) return { esito: 'non-mio' };
    const codice = codiceIn(user_input);
    let m = codice ? registro.perCodice(ch, codice, ora()) : null;
    if ((!m || m.voce !== voce.id) && user_id) {
      const sua = registro.apertaDi(ch, String(user_id), ora());
      if (sua && sua.voce === voce.id) m = sua;
    }
    if (!m || m.voce !== voce.id || !(Number(m.prezzi.punti) > 0)) return { esito: 'sconosciuto', stato: 'CANCELED', codice };
    const no = consegnabile(ch, m.voce);
    if (no) return { esito: 'fermo', stato: 'CANCELED', motivo: no };
    return incassa(m, 'punti', `premio:${id}`, `${reward_id}:${id}`) ? { esito: 'pagato', stato: null, nome: m.nome } : { esito: 'gia', stato: 'CANCELED' };
  }

  // LE MONETE DEL CANALE. Dalla pagina (con l'accesso a Twitch: `id` della mira,
  // `user` chi paga) o dalla chat («!pew K7QX3»: `codice`). Si spendono tutte o
  // niente, prima si guarda che il colpo si possa consegnare, e se la mira nel
  // frattempo e' gia' pagata la ricevuta torna subito: nessuno paga due volte.
  function daMonete(login, { id = '', codice = '', user = '' } = {}) {
    const ch = String(login || '').toLowerCase();
    const u = String(user || '').toLowerCase();
    if (!monete || !u) return { esito: 'spento' };
    const m = id ? registro.getDi(ch, String(id)) : codice ? registro.perCodice(ch, codice, ora()) : null;
    if (!m || m.stato !== 'attesa' || !(Number(m.prezzi?.monete) > 0)) return { esito: 'sconosciuto', codice };
    if (m.riferimento) return { esito: 'gia', codice };
    const no = consegnabile(ch, m.voce);
    if (no) return { esito: 'fermo', motivo: no, nome: m.nome };
    const n = Number(m.prezzi.monete);
    const presa = monete.punta(ch, u, n);
    if (!presa) return { esito: 'pochi', serve: n, saldo: Number(monete.saldo?.(ch, u)) || 0, nome: m.nome };
    const ricevuta = presa.ricevuta;
    if (!incassa(m, 'monete', 'monete:' + u, '', false, ricevuta)) { monete.rendi(ch, u, ricevuta); return { esito: 'gia', codice }; }
    return { esito: 'pagato', nome: m.nome, monete: n };
  }

  // Gli euro: la donazione pagata che era stata aperta per una mira.
  function daPagamento(donazioneId) {
    const m = registro.perRiferimento(donazioneId);
    if (!m) return { esito: 'non-mio' };
    // anche se la mira nel frattempo e' scaduta: i soldi sono arrivati, quindi o il colpo o il rimborso
    return { esito: incassa(m, 'euro', donazioneId, '', true) ? 'pagato' : 'gia', nome: m.nome, login: m.login };
  }

  return { mira, consegnabile, daCheer, daRiscatto, daPagamento, daMonete, presenza, provaPresenza, visto, ronda, cfgDi, conMonete: !!monete };
}
