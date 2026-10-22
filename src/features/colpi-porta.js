// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PORTA DELLA PAGINA DEI COLPI (docs/COLPI.md, «La pagina»): quello che le
// rotte pubbliche rispondono, senza Express. Il server ci mette davanti i tetti
// alle richieste e le intestazioni; il cancello verifica-colpi.mjs serve la
// pagina vera con questa stessa porta, cosi' quello che si collauda e' quello
// che gira.
import { normalizza, voceDi, metodiDi, titoloPremio } from './colpi.js';
import { MIRABILE } from './colpi-servizio.js';
import { normLancio, oggettoDi, disegnoDi } from './lanci.js';

const spriteLancio = (eff) => { let g = {}; try { g = JSON.parse(eff.disegno || '{}'); } catch { g = {}; } return disegnoDi(oggettoDi(normLancio(g).oggetto)); };

export const ID_MIRA = /^[0-9a-f]{18}$/;

export function creaPortaColpi({ servizio, registro, streamers, effettoDi, mezziEuro, apriPagamento, inOnda = () => false, overlay = () => false, ora = () => Date.now() }) {
  const aperti = (login) => {
    const s = streamers.get(login);
    const cfg = normalizza(s?.settings?.colpi);
    return s && cfg.attivo ? { s, cfg } : null;
  };
  const valutaDi = (s) => s?.settings?.donazioni?.valuta || 'EUR';
  // quello che la voce si lascia pagare adesso: gli euro col conto pronto, i
  // punti col premio creato su Twitch, i Bit sempre
  const metodiVivi = (v, euro) => metodiDi(v).filter((m) => (m === 'euro' ? euro.length > 0 : m === 'punti' ? !!v.premio : true));
  // `pagabile`: la pagina mostra i modi di pagare solo finche' e' vero, e li
  // toglie appena la diretta o l'overlay vanno via (servizio.consegnabile)
  const statoMira = (m) => {
    const fermo = m.stato === 'attesa' ? servizio.consegnabile(m.login, m.voce) : '';
    return { id: m.id, stato: m.stato, codice: m.codice, voce: m.voce, nome: m.nome, x: m.x, y: m.y, prezzi: m.prezzi, versati: m.versati || 0,
      scade: m.scade, metodo: m.metodo || '', inPagamento: m.stato === 'attesa' && m.riferimento !== '',
      pagabile: m.stato === 'attesa' && !fermo && (m.scade > ora() || (m.versati || 0) > 0), fermo, mia: !!m.spettatore };
  };

  function dati(login) {
    const k = aperti(login);
    if (!k) return null;
    const euro = mezziEuro(k.s, login);
    const voci = [];
    for (const v of k.cfg.voci) {
      const eff = v.attiva ? effettoDi(login, v.comando) : null;
      const metodi = eff && MIRABILE(eff) ? metodiVivi(v, euro) : [];
      if (!metodi.length) continue;
      // un lancio mostra il suo disegno: lo stesso file che l'overlay tira, quindi
      // l'ombra della pagina e' grande come il colpo (docs/LANCI.md)
      const disegno = eff.tipo === 'lancio' ? spriteLancio(eff) : '';
      voci.push({ id: v.id, nome: v.nome, tipo: eff.tipo === 'lancio' ? 'immagine' : eff.tipo, scala: v.scala, anteprima: disegno || `/u/${login}/colpo/anteprima/${encodeURIComponent(v.id)}`,
        metodi, prezzi: { euro: metodi.includes('euro') ? v.euro : 0, punti: metodi.includes('punti') ? v.punti : 0, bit: metodi.includes('bit') ? v.bit : 0 },
        premio: metodi.includes('punti') ? (v.premioNome || titoloPremio(v)) : '' });
    }
    return { live: !!inOnda(login), overlay: !!overlay(login), pausa: k.cfg.pausa, zone: k.cfg.zone, conNome: k.cfg.conNome, valuta: valutaDi(k.s), mezzi: euro, voci };
  }

  // il file dell'anteprima di una voce accesa: solo un nome semplice, mai un percorso
  function anteprima(login, idVoce) {
    const k = aperti(login);
    const v = k ? voceDi(k.cfg, String(idVoce || '')) : null;
    const eff = v ? effettoDi(login, v.comando) : null;
    const file = String(eff?.file || '');
    return eff && MIRABILE(eff) && /^[A-Za-z0-9._-]+$/.test(file) && !file.includes('..') ? file : null;
  }

  // `io`: lo spettatore che ha fatto l'accesso ({ id, nome }): la mira e' sua,
  // col suo nome, e il suo cheer o il suo riscatto la pagano senza codice
  function mira(login, corpo = {}, chiave = '', io = null) {
    const k = aperti(login);
    if (!k) return { ok: false, motivo: 'spento' };
    const v = voceDi(k.cfg, String(corpo.voce || ''));
    if (!v || !metodiVivi(v, mezziEuro(k.s, login)).length) return { ok: false, motivo: 'voce' };
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
  async function paga(login, id, mezzoChiesto) {
    const k = aperti(login);
    const m = k && ID_MIRA.test(String(id || '')) ? registro.getDi(login, String(id)) : null;
    if (!m || m.stato !== 'attesa' || !(Number(m.prezzi?.euro) > 0)) return { errore: 'mira' };
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

  return { aperti, dati, anteprima, mira, stato, paga };
}
