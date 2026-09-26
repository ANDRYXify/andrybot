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

export const RIMANDI = { domani: 86_400_000, settimana: 7 * 86_400_000 };
export const RISPOSTE = [...Object.keys(RIMANDI), 'mai'];

// Le risposte come stanno nelle impostazioni: si tiene solo quello che ha forma.
export function risposteDi(v) {
  const out = {};
  if (!v || typeof v !== 'object') return out;
  for (const id of AVVISI_ID) {
    const r = v[id];
    if (r?.mai === true) out[id] = { mai: true };
    else if (Number.isFinite(Number(r?.dopo)) && Number(r.dopo) > 0) out[id] = { dopo: Number(r.dopo) };
  }
  return out;
}

// Gli avvisi da mostrare a questa persona, adesso. Chi non e' il proprietario
// non ne ha: la regola sta qui, dentro la funzione, e non in chi la chiama.
export function avvisiAperti({ proprietario, spenti = false, fatti = {}, risposte = {}, adesso = Date.now() }) {
  if (proprietario !== true || spenti) return [];
  const r = risposteDi(risposte);
  return AVVISI.filter((a) => a.manca(fatti) && !r[a.id]?.mai && !(r[a.id]?.dopo > adesso)).map((a) => a.id);
}

// Una risposta: torna le risposte nuove, o null se non si capisce.
export function rispondi(risposte, id, come, adesso = Date.now()) {
  if (!AVVISI_ID.includes(id) || !RISPOSTE.includes(come)) return null;
  const r = risposteDi(risposte);
  r[id] = come === 'mai' ? { mai: true } : { dopo: adesso + RIMANDI[come] };
  return r;
}
