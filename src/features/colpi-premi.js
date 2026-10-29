// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I PREMI A PUNTI CANALE DEI COLPI (docs/COLPI.md, «I tre modi di pagare» e
// «I premi su Twitch: dentro il tetto, e da soli»).
//
// Un premio non dice quale colpo, dice quanto si paga: il colpo lo dice la mira.
// Quindi un premio puo' servire piu' voci, e i premi si contano prima di
// crearli: Twitch ne tiene 50 per canale, contati tutti. Uno per colpo («Colpo:
// <nome>») se ci stanno, se no uno per prezzo («Colpo da <punti>»), o come
// sceglie lo streamer. E il premio del modo misto coi punti, «… + monete»,
// che vale solo con le monete gia' pagate.
//
// Lo stato si confronta col listino SALVATO, non con quello di prima: una
// riconciliazione che parte due volte trova la seconda volta tutto a posto.
import { normalizza, titoloPremio, titoloPremioMisto, titoloPremioPrezzo, titoloPremioPrezzoMisto } from './colpi.js';
import { monetaDa } from './moneta.js';

export const TETTO_PREMI = 50;
const TITOLO_MAX = 45;

// Le due piattaforme: la stessa passata, coi campi suoi sulla voce. Kick non
// dice un tetto di premi (si conta quando dice di no) e non ha il misto coi
// punti, che e' di Twitch.
export const SU = Object.freeze({
  twitch: Object.freeze({ prezzo: 'punti', premio: 'premio', costo: 'premioCosto', nome: 'premioNome', misto: true, errori: 'premiErrori', tetto: TETTO_PREMI }),
  kick: Object.freeze({ prezzo: 'puntiKick', premio: 'premioKick', costo: 'premioKickCosto', nome: 'premioKickNome', misto: false, errori: 'premiKickErrori', tetto: Infinity }),
});

// Il piano, puro: quali premi servono, con che titolo e per quali voci.
// `liberi`: i posti che restano su Twitch tolti i premi non nostri (Infinity
// se non si sa); `presi`: i loro titoli, che non si possono riusare.
// → { forma: 'colpo' | 'prezzo', voluti: [{ chiave, tipo, costo, titolo, voci, monete? }], fuori: [...] }
export function pianoPremi(cfg, { liberi = Infinity, modo = 'auto', presi = [], su = SU.twitch } = {}) {
  const vive = cfg.attivo ? cfg.voci.filter((v) => v.attiva) : [];
  const perColpo = [], perPrezzo = new Map();
  for (const v of vive) {
    const mi = su.misto ? v.misti?.punti : null;
    const prezzo = v[su.prezzo];
    if (prezzo > 0) perColpo.push({ chiave: 'p:' + v.id, tipo: 'punti', costo: prezzo, titolo: titoloPremio(v), voci: [v.id] });
    if (mi?.punti > 0) perColpo.push({ chiave: 'm:' + v.id, tipo: 'misto', costo: mi.punti, titolo: titoloPremioMisto(v), voci: [v.id], monete: mi.monete });
    for (const [tipo, costo, titolo] of [['punti', prezzo, titoloPremioPrezzo], ['misto', mi?.punti, titoloPremioPrezzoMisto]]) {
      if (!(costo > 0)) continue;
      const k = (tipo === 'punti' ? 'P:' : 'M:') + costo;
      if (!perPrezzo.has(k)) perPrezzo.set(k, { chiave: k, tipo, costo, titolo: titolo(costo), voci: [] });
      perPrezzo.get(k).voci.push(v.id);
    }
  }
  const forma = modo === 'colpo' || modo === 'prezzo' ? modo : perColpo.length <= liberi ? 'colpo' : 'prezzo';
  // i piu' economici prima: se i posti non bastano restano fuori i piu' cari,
  // che si riscattano di meno
  const tutti = (forma === 'colpo' ? perColpo : [...perPrezzo.values()]).sort((a, b) => a.costo - b.costo || (a.chiave < b.chiave ? -1 : 1));
  // un titolo gia' preso (da un premio non nostro, o da un altro dei nostri:
  // due nomi lunghi tagliati a 45 possono coincidere) prende un numero
  const usati = new Set(presi.map((t) => String(t).toLowerCase()));
  for (const p of tutti) {
    let t = p.titolo;
    for (let n = 2; usati.has(t.toLowerCase()); n++) t = p.titolo.slice(0, TITOLO_MAX - String(n).length - 3) + ' · ' + n;
    usati.add(t.toLowerCase());
    p.titolo = t;
  }
  const posti = Number.isFinite(liberi) ? Math.max(0, liberi) : tutti.length;
  return { forma, voluti: tutti.slice(0, posti), fuori: tutti.slice(posti) };
}

// Un errore di Twitch, detto per quello che e'.
export function motivoTwitch(e) {
  const t = String(e?.message || e || '');
  if (/TOO_MANY_REWARDS/i.test(t)) return 'pieno';
  if (/DUPLICATE_REWARD/i.test(t)) return 'doppio';
  if (/partner|affiliate/i.test(t)) return 'affiliato';
  if (e?.status === 401 || /scope|unauthori[sz]ed/i.test(t)) return 'permesso';
  return 'twitch';
}

// `helix` e' chi crea i premi su quella piattaforma: helix, o premiKick con la sua forma.
export async function riconciliaPremi({ login, prima, helix, streamers, pagina, log = null, piattaforma = 'twitch' }, forzata = '') {
  const su = SU[piattaforma] || SU.twitch;
  const cfg = normalizza(streamers.get(login)?.settings?.colpi);
  const moneta = monetaDa(streamers.get(login)?.settings).nome;
  // i nostri premi: quelli scritti sulle voci, prima e adesso
  const nostri = new Map();
  for (const v of [...normalizza(prima).voci, ...cfg.voci]) {
    if (v[su.premio]) nostri.set(v[su.premio], { titolo: v[su.nome], costo: v[su.costo] });
    if (su.misto && v.premioMisto) nostri.set(v.premioMisto, { titolo: v.premioMistoNome, costo: v.premioMistoCosto });
  }
  // i posti: 50 meno i premi del canale che non sono nostri. Se l'elenco non
  // si legge non si indovina: si va avanti, e Twitch confermera'
  let liberi = Infinity, altri = null, presi = [];
  try {
    const tutti = await helix.listaRewardsTutti?.(login);
    if (Array.isArray(tutti)) {
      altri = tutti.filter((r) => !nostri.has(r.id));
      liberi = su.tetto - altri.length;
      presi = altri.map((r) => r.title);
      const vivi = new Set(tutti.map((r) => r.id));
      // quello che dice Twitch vince su quello che ricordiamo; uno tolto a
      // mano su Twitch non c'e' piu', e si rifa'
      for (const id of [...nostri.keys()]) if (!vivi.has(id)) nostri.delete(id);
      for (const r of tutti) if (nostri.has(r.id)) nostri.set(r.id, { titolo: r.title, costo: r.cost, testo: r.richiedeTesto, prompt: r.descrizione });
    }
  } catch (e) { log?.debug?.(`premi del canale #${login}:`, e?.message || e); }
  const piano = pianoPremi(cfg, { liberi, modo: forzata || cfg.premiModo, presi, su });
  // cosa chiede e cosa dice il premio (docs/COLPI.md, «I premi a punti canale
  // finiscono nello zaino»): con la strada dello zaino niente codice, il colpo
  // va nello zaino di chi riscatta; il misto chiede sempre la mira
  const chiede = (p) => p.tipo === 'misto' || cfg.flusso !== 'zaino';
  const promptDi = (p) => String(p.tipo === 'misto'
    ? `Prima paga ${p.monete ? p.monete + ' ' : 'le '}${moneta} su ${pagina} (o in chat col codice e «punti»), poi scrivi qui il codice del colpo`
    : cfg.flusso === 'zaino'
      ? (p.chiave.startsWith('P:') ? `Un colpo da ${p.costo} punti nel tuo zaino: lo scegli e lo lanci da ${pagina}` : 'Il colpo va nel tuo zaino: lo lanci quando vuoi da ' + pagina)
        + ' (entra con lo stesso account). Se lì hai già mirato, parte subito'
      : `Mira su ${pagina} e scrivi qui il codice del colpo (con l'accesso a Twitch fatto sulla pagina va bene qualunque testo)`).slice(0, 200);

  // prima si tolgono i nostri che non servono piu' (liberano posti); un premio
  // gia' giusto, titolo e costo, si tiene, anche se passa a un'altra voce
  const tenuti = new Map();
  for (const [id, r] of nostri) {
    // un premio che chiede il testo sbagliato, o dice la cosa vecchia, si rifa' (se si sa)
    const p = piano.voluti.find((x) => !tenuti.has(x.chiave) && x.titolo === r.titolo && x.costo === r.costo
      && (r.testo === undefined || (r.testo === chiede(x) && r.prompt === promptDi(x))));
    if (p) { tenuti.set(p.chiave, id); continue; }
    try { await helix.eliminaReward(login, id); } catch (e) { log?.debug?.(`premio colpo via #${login}:`, e?.message || e); }
  }

  const errori = [];
  const fuori = [...piano.fuori];
  let pieno = false;
  for (const p of piano.voluti) {
    if (tenuti.has(p.chiave)) continue;
    if (pieno) { fuori.push(p); continue; }
    try {
      const r = await helix.creaReward(login, { titolo: p.titolo, costo: p.costo, prompt: promptDi(p), userInput: chiede(p) });
      if (r?.id) tenuti.set(p.chiave, r.id);
      else errori.push({ motivo: 'twitch', titoli: [p.titolo] });
    } catch (e) {
      const motivo = motivoTwitch(e);
      if (motivo !== 'pieno') { errori.push({ motivo, titoli: [p.titolo], dettaglio: motivo === 'twitch' ? String(e?.message || e).slice(0, 160) : '' }); continue; }
      // l'elenco non si era letto, o un premio e' arrivato nel frattempo: per
      // colpo non ci stanno, e la stessa passata riparte per prezzo (una volta)
      if (piano.forma === 'colpo' && !forzata && cfg.premiModo === 'auto') {
        await scriviPremi({ login, streamers, helix, piano, tenuti, errori: [], log, su });
        return riconciliaPremi({ login, prima, helix, streamers, pagina, log, piattaforma }, 'prezzo');
      }
      pieno = true; fuori.push(p);
    }
  }
  if (fuori.length) errori.unshift({ motivo: 'pieno', titoli: fuori.map((p) => p.titolo), altri: altri ? altri.length : null, mancano: fuori.length, tetto: Number.isFinite(su.tetto) ? su.tetto : null });
  if (piattaforma !== 'twitch') for (const e of errori) e.piattaforma = piattaforma;
  await scriviPremi({ login, streamers, helix, piano, tenuti, errori, log, su });
  return { errori, forma: piano.forma };
}

// Si scrive solo il pezzo dei premi, sulle impostazioni di adesso: fra la
// lettura e la scrittura non c'e' nessuna attesa, cosi' un salvataggio
// arrivato nel frattempo non si perde.
async function scriviPremi({ login, streamers, helix, piano, tenuti, errori, log, su = SU.twitch }) {
  const assegna = (id, tipo) => {
    const p = piano.voluti.find((x) => x.tipo === tipo && x.voci.includes(id) && tenuti.has(x.chiave));
    return p ? [tenuti.get(p.chiave), p.costo, p.titolo] : ['', 0, ''];
  };
  const s = streamers.get(login);
  const c = s?.settings?.colpi;
  const voci = Array.isArray(c?.voci) ? c.voci.map((v) => {
    const [premio, costo, nome] = assegna(v.id, 'punti');
    const misto = su.misto ? (([premioMisto, premioMistoCosto, premioMistoNome]) => ({ premioMisto, premioMistoCosto, premioMistoNome }))(assegna(v.id, 'misto')) : {};
    return { ...v, [su.premio]: premio, [su.costo]: costo, [su.nome]: nome, ...misto };
  }) : [];
  if (c && Array.isArray(c.voci)) streamers.setSettings(login, { ...s.settings, colpi: { ...c, voci, [su.errori]: errori } });
  // un premio che nessuna voce di adesso usa (una voce tolta da un salvataggio
  // arrivato nel frattempo) non resta orfano
  const usati = new Set(voci.flatMap((v) => [v[su.premio], su.misto ? v.premioMisto : '']).filter(Boolean));
  for (const id of tenuti.values()) {
    if (!usati.has(id)) { try { await helix.eliminaReward(login, id); } catch (e) { log?.debug?.(`premio colpo via #${login}:`, e?.message || e); } }
  }
}
