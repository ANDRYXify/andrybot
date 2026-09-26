// I PICCOLI AVVISI: cosa manca al canale, detto una cosa per volta.
//
// Chi usa SocialBot spesso non sa che una cosa esiste, o che le manca un passo
// perche' funzioni. Un avviso non e' un giro guidato a tempo: e' UNA COSA CHE
// MANCA, ricavata dallo stato vero del canale. Esiste finche' manca; fatta la
// cosa, sparisce da se', senza bisogno di segnarla come letta.
//
// DI CHI SONO. Le cose che mancano sono del proprietario del canale: collegare
// Spotify, pubblicare la pagina link, rimettere i permessi. Quindi gli avvisi li
// vede solo lui, e solo lui ci risponde. Un moderatore non ne riceve e non ne
// puo' togliere: se lo potesse, chi modera un canale altrui (magari streamer a
// sua volta) spegnerebbe al proprietario proprio gli avvisi che contano. La
// risposta si scrive nelle impostazioni del canale di chi ha risposto, e chi ha
// risposto e' per forza il proprietario (server.js: `isOwner`, `requireOwner`).
//
// LE RISPOSTE. «Ricordamelo domani», «fra una settimana», «non mostrare piu'».
// Restano nel server, non nel browser: una risposta tenuta nel browser torna a
// galla sul telefono o sull'altro computer.

// Il catalogo, nell'ordine in cui conta: prima quello che rompe qualcosa che
// c'e' gia', poi quello che non si scopre da soli. `scheda` e' dove si rimedia.
// Ogni `manca` guarda un fatto solo, e dice di si' solo se il fatto e' noto: un
// fatto che il server non ha saputo leggere (undefined) non accende niente.
export const AVVISI = [
  { id: 'permessi', scheda: 'stato', manca: (f) => f.permessiMancanti > 0 },
  { id: 'bot-spento', scheda: 'stato', manca: (f) => f.botSpento === true },
  { id: 'musica', scheda: 'musica', manca: (f) => f.musica === true && f.spotify === false },
  { id: 'overlay', scheda: 'alert', manca: (f) => f.overlayVisto === false },
  { id: 'comandi', scheda: 'moduli', manca: (f) => f.comandi === 0 },
  { id: 'pagina', scheda: 'pagina', manca: (f) => f.paginaPubblicata === false },
  { id: 'settimana', scheda: 'settimana', manca: (f) => f.settimanaVuota === true },
];
export const AVVISI_ID = AVVISI.map((a) => a.id);

// «HAI GIA' PROVATO...?» Un invito per una funzione che il canale non ha mai
// usato. Non e' una cosa che manca: il canale funziona lo stesso. Percio' viene
// DOPO gli avvisi, e con piu' garbo:
//   · solo se non c'e' niente che manca (prima si sistema quello che serve);
//   · solo dopo GIORNI_PRIMA giorni dall'ingresso: i primi giorni sono per
//     mettere in piedi il canale, non per scoprire il resto;
//   · uno ogni PAUSA_PROVE, contata dall'ultima risposta a un invito;
//   · ognuno una volta sola: «Fammi vedere» e «Non mi interessa» lo chiudono,
//     «Piu' avanti» lo rimanda di una settimana.
// Il fatto e' `provato[id]`: true se la funzione e' stata usata, false se mai,
// undefined se non si sa, o se il piano del canale non la comprende (un invito
// a una cosa che non si puo' aprire sarebbe una vendita, non un invito).
export const PROVE = [
  { id: 'grafiche', scheda: 'grafiche' },
  { id: 'effetti', scheda: 'effetti' },
  { id: 'muro', scheda: 'alert' },
  { id: 'consolify', scheda: 'consolify' },
  { id: 'discord', scheda: 'ruoli' },
  { id: 'telegram', scheda: 'telegram' },
  { id: 'donazioni', scheda: 'donazioni' },
  { id: 'giochi', scheda: 'giochi' },
  { id: 'conoscenza', scheda: 'conoscenza' },
  { id: 'emote', scheda: 'emote' },
];
export const PROVE_ID = PROVE.map((p) => p.id);
export const eProva = (id) => PROVE_ID.includes(id);
const TUTTI_ID = [...AVVISI_ID, ...PROVE_ID];
export const GIORNI_PRIMA = 7;
export const PAUSA_PROVE = 3 * 86_400_000;

export const RIMANDI = { domani: 86_400_000, settimana: 7 * 86_400_000 };
export const RISPOSTE = [...Object.keys(RIMANDI), 'mai'];

// Le risposte come stanno nelle impostazioni: si tiene solo quello che ha forma.
export function risposteDi(v) {
  const out = {};
  if (!v || typeof v !== 'object') return out;
  for (const id of TUTTI_ID) {
    const r = v[id];
    if (r?.mai === true) out[id] = { mai: true };
    else if (Number.isFinite(Number(r?.dopo)) && Number(r.dopo) > 0) out[id] = { dopo: Number(r.dopo) };
  }
  return out;
}

// Gli avvisi da mostrare a questa persona, adesso. Chi non e' il proprietario
// non ne ha: la regola sta qui, dentro la funzione, e non in chi la chiama.
// dal: quando il canale e' entrato; provaUltima: l'ultima risposta a un invito.
export function avvisiAperti({ proprietario, spenti = false, fatti = {}, risposte = {}, adesso = Date.now(), dal, provaUltima }) {
  if (proprietario !== true || spenti) return [];
  const r = risposteDi(risposte);
  const aperto = (id) => !r[id]?.mai && !(r[id]?.dopo > adesso);
  const manca = AVVISI.filter((a) => a.manca(fatti) && aperto(a.id)).map((a) => a.id);
  if (manca.length) return manca;
  const entrato = Number(dal);
  if (!(entrato > 0) || adesso - entrato < GIORNI_PRIMA * 86_400_000) return [];
  if (Number(provaUltima) > adesso - PAUSA_PROVE) return [];
  const provato = fatti.provato || {};
  return PROVE.filter((p) => provato[p.id] === false && aperto(p.id)).map((p) => p.id);
}

// Una risposta: torna le risposte nuove, o null se non si capisce.
export function rispondi(risposte, id, come, adesso = Date.now()) {
  if (!TUTTI_ID.includes(id) || !RISPOSTE.includes(come)) return null;
  const r = risposteDi(risposte);
  r[id] = come === 'mai' ? { mai: true } : { dopo: adesso + RIMANDI[come] };
  return r;
}
