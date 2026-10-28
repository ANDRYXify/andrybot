// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PORTA DELLA PAGINA DEI COLPI (docs/COLPI.md, «La pagina»): quello che le
// rotte pubbliche rispondono, senza Express. Il server ci mette davanti i tetti
// alle richieste e le intestazioni; il cancello verifica-colpi.mjs serve la
// pagina vera con questa stessa porta, cosi' quello che si collauda e' quello
// che gira.
import { normalizza, voceDi, metodiDi, mistiDi, titoloPremio, titoloPremioMisto, categoriaDi, quandoScade } from './colpi.js';
import { monetaDa } from './moneta.js';
import { MIRABILE } from './colpi-servizio.js';
import { normLancio, oggettoDi, disegnoDi, payloadLancio, durataLancio } from './lanci.js';
import { chromaDi } from './chroma.js';

const grezzoDi = (eff) => { try { return JSON.parse(eff.disegno || '{}') || {}; } catch { return {}; } };
const spriteLancio = (eff) => disegnoDi(oggettoDi(normLancio(grezzoDi(eff)).oggetto));
// il tipo di un colpo, per la sua categoria di serie: lanci, adesivi, spaventi, media
const tipoDi = (eff) => {
  if (eff.tipo !== 'lancio') return 'media';
  const o = oggettoDi(normLancio(grezzoDi(eff)).oggetto);
  return o?.libreria === 'adesivi' || o?.libreria === 'spaventi' ? o.libreria : 'lanci';
};
const FILE_SEMPLICE = (f) => /^[A-Za-z0-9._-]+$/.test(f) && !f.includes('..');

export const ID_MIRA = /^[0-9a-f]{18}$/;

export function creaPortaColpi({ servizio, registro, streamers, effettoDi, mezziEuro, apriPagamento, inOnda = () => false, overlay = () => false, fusoDi = () => 'Europe/Rome', ora = () => Date.now() }) {
  const aperti = (login) => {
    const s = streamers.get(login);
    const cfg = normalizza(s?.settings?.colpi);
    return s && cfg.attivo ? { s, cfg } : null;
  };
  const valutaDi = (s) => s?.settings?.donazioni?.valuta || 'EUR';
  // quello che la voce si lascia pagare adesso: gli euro col conto pronto, i
  // punti col premio creato su Twitch, i Bit sempre
  const metodiVivi = (v, euro) => metodiDi(v).filter((m) => (m === 'euro' ? euro.length > 0 : m === 'punti' ? !!v.premio : m === 'monete' ? !!servizio.conMonete : true));
  // `pagabile`: la pagina mostra i modi di pagare solo finche' e' vero, e li
  // toglie appena la diretta o l'overlay vanno via (servizio.consegnabile)
  const statoMira = (m) => {
    const fermo = m.stato === 'attesa' ? servizio.consegnabile(m.login, m.voce) : '';
    return { id: m.id, stato: m.stato, codice: m.codice, voce: m.voce, nome: m.nome, x: m.x, y: m.y, prezzi: m.prezzi, versati: m.versati || 0,
      scade: m.scade, metodo: m.metodo || '', inPagamento: m.stato === 'attesa' && m.riferimento !== '',
      pagabile: m.stato === 'attesa' && !fermo && (m.scade > ora() || (m.versati || 0) > 0), fermo, mia: !!m.spettatore,
      // le monete gia' pagate di un modo misto: si aspetta il resto (senza chi e la ricevuta)
      acconto: m.acconto ? { modo: m.acconto.modo, monete: m.acconto.monete, resto: m.acconto.resto } : null };
  };

  function dati(login) {
    const k = aperti(login);
    if (!k) return null;
    const euro = mezziEuro(k.s, login);
    const voci = [];
    for (const v of k.cfg.voci) {
      const eff = v.attiva ? effettoDi(login, v.comando) : null;
      const metodi = eff && MIRABILE(eff) ? metodiVivi(v, euro) : [];
      // un modo misto si offre solo se si puo' finire: le monete del canale ci
      // sono, e per i punti il premio misto e' su Twitch
      const misti = eff && MIRABILE(eff) && servizio.conMonete ? mistiDi(v).filter((x) => x.modo === 'bit' || !!v.premioMisto) : [];
      if (!metodi.length && !misti.length) continue;
      // un lancio mostra il suo disegno: lo stesso file che l'overlay tira, quindi
      // l'ombra della pagina e' grande come il colpo (docs/LANCI.md)
      const disegno = eff.tipo === 'lancio' ? spriteLancio(eff) : '';
      voci.push({ id: v.id, nome: v.nome, tipo: eff.tipo === 'lancio' ? 'immagine' : eff.tipo, scala: v.scala, anteprima: disegno || `/u/${login}/colpo/anteprima/${encodeURIComponent(v.id)}`,
        metodi, prezzi: Object.fromEntries(['euro', 'punti', 'bit', 'monete'].map((x) => [x, metodi.includes(x) ? v[x] : 0])),
        premio: metodi.includes('punti') ? (v.premioNome || titoloPremio(v)) : '', prova: provaDi(login, v, eff), categoria: categoriaDi(k.cfg, v, tipoDi(eff)),
        misti: misti.map((x) => ({ ...x, premio: x.modo === 'punti' ? (v.premioMistoNome || titoloPremioMisto(v)) : '' })) });
    }
    // le categorie che hanno almeno un colpo, nell'ordine dello streamer
    const categorie = k.cfg.categorie.filter((c) => voci.some((v) => v.categoria === c.id));
    return { live: !!inOnda(login), overlay: !!overlay(login), pausa: k.cfg.pausa, zone: k.cfg.zone, conNome: k.cfg.conNome, valuta: valutaDi(k.s), mezzi: euro, voci,
      categorie, comando: k.cfg.comando, moneta: monetaDa(k.s.settings).nome, bitPew: !!servizio.conBitPew?.(login) };
  }

  // L'ANTEPRIMA DI UN COLPO (docs/COLPI.md, «L'anteprima»): quello che l'overlay
  // riceverebbe, per rifarlo uguale sulla pagina. Il lancio e' il suo payload
  // (lo stesso disegnatore, public/lanci.js); un media e' il file dell'anteprima.
  // I suoni caricati dallo streamer passano dall'anteprima anche loro: gli
  // indirizzi dell'overlay portano la sua chiave, e non escono.
  function provaDi(login, v, eff) {
    const suono = suonoDi(login, eff) ? `/u/${login}/colpo/anteprima/${encodeURIComponent(v.id)}/suono` : '';
    const volume = eff.volume == null || eff.volume === '' ? 100 : Math.max(0, Math.min(100, Number(eff.volume) || 0));
    if (eff.tipo === 'lancio') {
      const lancio = payloadLancio(grezzoDi(eff));
      if (lancio.audio && suono) lancio.suono = suono;
      lancio.audio = '';
      return { lancio, volume, durata: durataLancio(lancio) };
    }
    return { suono, volume, durata: Number(eff.durata) > 0 ? Number(eff.durata) : 0, chroma: eff.tipo === 'video' ? chromaDi(eff) : null };
  }
  // il file del suono di un colpo: quello abbinato a un media, o l'audio del
  // canale scelto per un lancio
  function suonoDi(login, eff) {
    let f = '';
    if (eff.tipo === 'lancio') {
      const audio = payloadLancio(grezzoDi(eff)).audio;
      const a = audio ? effettoDi(login, audio) : null;
      f = a && a.tipo === 'audio' ? String(a.file || '') : '';
    } else f = String(eff.suono_file || '');
    return f && FILE_SEMPLICE(f) ? f : '';
  }

  // il file dell'anteprima di una voce accesa (o del suo suono, con `parte`):
  // solo un nome semplice, mai un percorso
  function anteprima(login, idVoce, parte = '') {
    const k = aperti(login);
    const v = k ? voceDi(k.cfg, String(idVoce || '')) : null;
    const eff = v ? effettoDi(login, v.comando) : null;
    if (!eff || !MIRABILE(eff)) return null;
    if (parte === 'suono') return suonoDi(login, eff) || null;
    const file = String(eff.file || '');
    return FILE_SEMPLICE(file) ? file : null;
  }

  // `io`: lo spettatore che ha fatto l'accesso ({ id, nome }): la mira e' sua,
  // col suo nome, e il suo cheer o il suo riscatto la pagano senza codice
  function mira(login, corpo = {}, chiave = '', io = null) {
    const k = aperti(login);
    if (!k) return { ok: false, motivo: 'spento' };
    const v = voceDi(k.cfg, String(corpo.voce || ''));
    if (!v || (!metodiVivi(v, mezziEuro(k.s, login)).length && !(servizio.conMonete && mistiDi(v).length))) return { ok: false, motivo: 'voce' };
    const r = servizio.mira(login, { voce: v.id, x: Number(corpo.x), y: Number(corpo.y), chi: io?.nome || String(corpo.chi || ''), chiave, spettatore: io?.id || '' });
    return r.ok ? { ok: true, mira: statoMira(registro.get(r.mira.id)) } : r;
  }

  function stato(login, id) {
    const m = ID_MIRA.test(String(id || '')) ? registro.getDi(login, String(id)) : null;
    return m ? statoMira(m) : null;
  }

  // Paga in euro: una mira apre UN pagamento. La presa «apre:» si prende prima
  // di chiamare Stripe o Satispay, cosi' un doppio tocco non ne apre due; se il
  // pagamento non si apre, la presa si rilascia e la mira torna pagabile.
  // Con le monete del canale serve l'accesso a Twitch (le monete sono di chi
  // scrive in chat), e la mira dev'essere sua o di nessuno.
  async function paga(login, id, mezzoChiesto, io = null, modo = '') {
    const k = aperti(login);
    // i Bit da spendere sono di chi ha fatto l'accesso: si conoscono per id Twitch
    if (mezzoChiesto === 'bitpew') {
      const mb = k && ID_MIRA.test(String(id || '')) ? registro.getDi(login, String(id)) : null;
      if (!mb) return { errore: 'mira' };
      if (!io?.id) return { errore: 'accesso' };
      if (mb.spettatore && mb.spettatore !== String(io.id)) return { errore: 'mira' };
      const r = servizio.daBitPew(login, { id: mb.id, chi: io.id, nome: io.login });
      if (r.esito === 'pagato') return { ok: true, esito: r.esito, saldo: r.saldo };
      return { errore: r.esito === 'fermo' ? r.motivo : r.esito, serve: r.serve, saldo: r.saldo };
    }
    if (mezzoChiesto === 'monete') {
      const mm = k && ID_MIRA.test(String(id || '')) ? registro.getDi(login, String(id)) : null;
      if (!mm) return { errore: 'mira' };
      if (!io?.login) return { errore: 'accesso' };
      if (mm.spettatore && mm.spettatore !== String(io.id)) return { errore: 'mira' };
      const r = servizio.daMonete(login, { id: mm.id, user: io.login, modo: modo === 'bit' || modo === 'punti' ? modo : '' });
      if (r.esito === 'pagato' || r.esito === 'acconto') return { ok: true, esito: r.esito };
      return { errore: r.esito === 'fermo' ? r.motivo : r.esito, serve: r.serve, saldo: r.saldo };
    }
    const m = k && ID_MIRA.test(String(id || '')) ? registro.getDi(login, String(id)) : null;
    if (!m || m.stato !== 'attesa' || !(Number(m.prezzi?.euro) > 0)) return { errore: 'mira' };
    if (m.acconto) return { errore: 'gia' };
    if (m.scade <= ora()) return { errore: 'scaduta' };
    // si paga solo un colpo che adesso si puo' consegnare
    const fermo = servizio.consegnabile(login, m.voce);
    if (fermo) return { errore: fermo };
    const mezzi = mezziEuro(k.s, login);
    const mezzo = mezzi.includes(String(mezzoChiesto || '')) ? String(mezzoChiesto) : mezzi[0];
    if (!mezzo) return { errore: 'pagamento' };
    const presa = 'apre:' + m.id;
    if (!registro.lega(m.id, presa)) return { errore: 'gia' };
    let r;
    try {
      r = await apriPagamento(mezzo, { login, display: k.s.display || login, importoCent: Number(m.prezzi.euro), valuta: valutaDi(k.s),
        nome: m.chi || '', messaggio: 'Colpo: ' + m.nome, ritorno: 'colpo' });
    } catch { r = { errore: 'rete' }; }
    if (!r || r.errore || !r.id) { registro.rilega(m.id, presa, ''); return { errore: 'pagamento' }; }
    registro.rilega(m.id, presa, (mezzo === 'satispay' ? 'satispay:' : 'stripe:') + r.id);
    return { url: r.url };
  }

  // il saldo di chi ha fatto l'accesso: i Bit da spendere qui (e quelli che
  // scadono presto, detti nella lingua di chi legge) e le monete del canale
  function saldi(login, io, lingua = 'it') {
    if (!aperti(login) || !io?.id) return null;
    const conBit = !!servizio.conBitPew?.(login);
    const sc = conBit ? servizio.scadonoBit?.(login, io.id) : null;
    return {
      bit: conBit ? servizio.saldoBit(login, io.id) : null,
      monete: servizio.conMonete && io.login ? servizio.saldoMonete(login, io.login) : null,
      ...(sc ? { scadono: { quanti: sc.quanti, quando: quandoScade(sc.scade, lingua, fusoDi(login)) } } : {}),
    };
  }

  // UN TOCCO (docs/COLPI.md, «Con l'accesso, un tocco»): la mira e il
  // pagamento col saldo insieme, senza codice. Prima si guarda il saldo, cosi'
  // un tocco che non puo' riuscire non apre nemmeno la mira.
  const CON = ['bit', 'monete', 'misto-bit'];
  function lancia(login, corpo = {}, chiave = '', io = null) {
    const k = aperti(login);
    if (!k) return { ok: false, motivo: 'spento' };
    if (!io?.id || !io.login) return { ok: false, motivo: 'accesso' };
    const con = String(corpo.con || '');
    const v = voceDi(k.cfg, String(corpo.voce || ''));
    const misto = v ? mistiDi(v).find((x) => x.modo === 'bit') : null;
    if (!v || !CON.includes(con)) return { ok: false, motivo: 'voce' };
    const s = saldi(login, io) || {};
    const serve = con === 'bit' ? { bit: v.bit } : con === 'monete' ? { monete: v.monete } : misto ? { monete: misto.monete, bit: misto.resto } : null;
    if (!serve || Object.values(serve).some((n) => !(n > 0))) return { ok: false, motivo: 'voce' };
    if ((serve.bit && s.bit == null) || (serve.monete && s.monete == null)) return { ok: false, motivo: 'spento' };
    for (const [quale, n] of Object.entries(serve)) if (s[quale] < n) return { ok: false, motivo: 'pochi', serve: n, saldo: s[quale], quale };
    const r = mira(login, corpo, chiave, io);
    if (!r.ok) return r;
    const p = servizio.subito(login, r.mira.id, { con, user: io.login, chi: io.id, nome: io.login });
    if (p.esito !== 'pagato') return { ok: false, motivo: p.esito === 'fermo' ? p.motivo : p.esito, serve: p.serve, saldo: p.saldo };
    return { ok: true, mira: statoMira(registro.get(r.mira.id)) };
  }

  return { aperti, dati, anteprima, mira, stato, paga, saldi, lancia };
}
