// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO SCUDO ALL'INGRESSO DEL GRUPPO: chi chiede di entrare passa da una pagina.
//
// Il cancello (tg-ingresso.js) lavora DOPO: chi e' gia' dentro resta muto
// finche' non preme un tasto. Lo scudo lavora PRIMA: chi chiede di entrare non
// e' nel gruppo finche' la pagina di verifica non dice «passato». Telegram lo
// permette in due modi, e la pagina e' la stessa per tutti e due:
//
//  · col GUARDIANO (Bot API 10.1): il bot e' scelto nel gruppo come guardiano
//    delle richieste, Telegram gli passa la richiesta con un query_id e la
//    pagina si apre SUBITO, dentro Telegram, a chi ha chiesto. Il bot ha dieci
//    secondi per mostrarla.
//  · in PRIVATO: il gruppo chiede l'approvazione (o si entra dal nostro link,
//    che la chiede), il bot riceve la richiesta e scrive a chi l'ha fatta, in
//    privato, un messaggio con un tasto che apre la pagina.
//
// Qui sta solo il RAGIONAMENTO: cosa fare di una richiesta, come si giudica un
// invio della pagina, cosa serve perche' lo scudo funzioni. Telegram, il
// database e il disegno della prova stanno fuori, cosi' questo si prova senza
// rete e senza un gruppo vero.
//
// Per costruzione:
//  · NESSUNO ENTRA SE LA PAGINA NON DICE «PASSATO». `esitoInvio` e' l'unico
//    posto che dice 'passa', e lo dice solo con la prova giusta, le regole
//    accettate e le risposte giuste. Ogni altra strada (errore, scadenza, prova
//    sbagliata) finisce in un no o in mano agli amministratori: non c'e' un
//    ramo che apra per difetto.
//  · IL CODICE DELLA PROVA NON ESCE MAI. Si confronta qui, a tempo costante;
//    fuori vanno solo fotogrammi di rumore in movimento, dove le lettere
//    esistono solo nel moto e nessun fotogramma da solo dice niente
//    (tg-scudo-prova.js).
//  · CHI SBAGLIA ASPETTA. Dopo un rifiuto, la stessa persona per lo stesso
//    gruppo e' rifiutata subito per mezz'ora: provare a raffica costa account
//    Telegram, non tentativi gratis.
//  · LE RISPOSTE GIUSTE NON ESCONO. Alla pagina vanno le domande e le voci,
//    mai quale voce e' quella giusta.
//  · LE DOMANDE CHE SI GIUDICANO SONO QUELLE CHE SI SONO VISTE. La pagina
//    porta l'impronta delle domande che ha mostrato: se nel frattempo lo
//    streamer le ha cambiate, non si giudica una risposta a una domanda diversa.
import { randomInt, timingSafeEqual, createHash } from 'node:crypto';

export const MINUTI_DEF = 10;
export const MINUTI_MIN = 2;
export const MINUTI_MAX = 60;

// Chi non passa: si rifiuta la richiesta, oppure si lascia agli amministratori
// del gruppo (in coda, come se il bot non ci fosse). Chi dice «non riesco a
// leggere la prova» va SEMPRE agli amministratori: non lo si rifiuta per una
// cosa che non dipende da lui.
export const ESITI_NO = ['rifiuta', 'admin'];

export const LIMITI = { regole: 1500, domande: 3, opzioni: 4, domanda: 160, opzione: 80 };

// La prova: un codice che si vede solo in movimento. Tre tentativi per
// prova, tre prove; dopo, non passa. Le lettere che si confondono fra loro (0 e O, 1 e I, 5 e S,
// 2 e Z, 8 e B, D e O, Q e O, G e 6, L e 1) non ci sono: chi sbaglia deve
// sbagliare perche' non ha letto, non perche' il disegno era ambiguo.
export const ALFABETO = 'ACEFHJKMNPRTUVWXY3469';
export const ATTESA_DOPO_NO = 30 * 60_000;
// La prova sulla porta: il link personale di chi la supera vale mezz'ora, per
// una persona; da uno stesso indirizzo si aprono al massimo tante prove l'ora.
export const VITA_LINK_PORTA = 30 * 60_000;
export const PROVE_PORTA_ORA = 12;
export const LUNGHEZZA = 5;
export const TENTATIVI = 3;
export const IMMAGINI = 3;

const GRUPPI = new Set(['group', 'supergroup']);
export const LINGUE = ['it', 'en', 'es'];

const riga = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const testo = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);

export function inMinuti(n) {
  const m = Math.round(Number(n) || 0);
  return Math.max(MINUTI_MIN, Math.min(MINUTI_MAX, m || MINUTI_DEF));
}

// Una domanda vale se ha un testo, almeno due voci e una giusta fra quelle. Una
// domanda storta non si «aggiusta» indovinando: si toglie, e il pannello la
// rimostra com'e' stata salvata.
function normDomanda(d) {
  if (!d || typeof d !== 'object') return null;
  const t = riga(d.testo, LIMITI.domanda);
  const voci = (Array.isArray(d.opzioni) ? d.opzioni : []).map((o) => riga(o, LIMITI.opzione));
  const giusta = Number.isInteger(Number(d.giusta)) ? Number(d.giusta) : -1;
  if (!t) return null;
  // la voce giusta si segue mentre si tolgono le vuote
  const tenute = [];
  let nuovaGiusta = -1;
  voci.slice(0, LIMITI.opzioni).forEach((o, i) => {
    if (!o) return;
    if (i === giusta) nuovaGiusta = tenute.length;
    tenute.push(o);
  });
  if (tenute.length < 2 || nuovaGiusta < 0) return null;
  return { testo: t, opzioni: tenute, giusta: nuovaGiusta };
}

const HEX = /^#[0-9a-f]{6}$/i;
const esa = (v, def) => (HEX.test(String(v || '')) ? String(v).toLowerCase() : def);

export function normScudo(x) {
  const s = x && typeof x === 'object' ? x : {};
  const r = s.regole && typeof s.regole === 'object' ? s.regole : {};
  const regole = { attivo: !!r.attivo, testo: testo(r.testo, LIMITI.regole) };
  if (!regole.testo) regole.attivo = false;
  const c = s.colori && typeof s.colori === 'object' ? s.colori : {};
  return {
    attivo: !!s.attivo,
    minuti: inMinuti(s.minuti),
    no: ESITI_NO.includes(String(s.no)) ? String(s.no) : 'rifiuta',
    regole,
    domande: (Array.isArray(s.domande) ? s.domande : []).map(normDomanda).filter(Boolean).slice(0, LIMITI.domande),
    // i colori della prova: quelli della pagina, o due scelti dallo streamer
    colori: { modo: c.modo === 'miei' ? 'miei' : 'pagina', punti: esa(c.punti, '#1d1a26'), fondo: esa(c.fondo, '#f6f3ee') },
  };
}

// ── i colori della prova ────────────────────────────────────────────────────
//
// Le lettere della prova sono fatte di puntini che si muovono: per vederle i
// puntini devono staccarsi dal fondo. Il contrasto minimo e' quello che si
// chiede alle forme grafiche (WCAG 1.4.11, 3:1). Due colori scelti che non ci
// arrivano non si usano: si torna ai colori della pagina, e se nemmeno quelli
// ci arrivano, a inchiostro su carta. La prova non esce mai illeggibile per un
// colore.
const lineare = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
export function luminanza(hex) {
  const h = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * lineare(r) + 0.7152 * lineare(g) + 0.0722 * lineare(b);
}
export function contrasto(a, b) {
  const [x, y] = [luminanza(a), luminanza(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
export const CONTRASTO_PROVA = 3;
export const PROVA_DI_SERIE = { punti: '#1d1a26', fondo: '#f6f3ee' };

// `pagina` sono i colori della pagina della porta (vesteDi in linkpagina.js):
// i puntini col colore del testo, il fondo con quello della pagina.
export function coloriProva(scudo, pagina = {}) {
  const s = normScudo(scudo);
  const ok = (p, f) => HEX.test(p || '') && HEX.test(f || '') && contrasto(p, f) >= CONTRASTO_PROVA;
  if (s.colori.modo === 'miei' && ok(s.colori.punti, s.colori.fondo)) return { punti: s.colori.punti, fondo: s.colori.fondo, da: 'miei' };
  if (ok(pagina.testo, pagina.bg)) return { punti: pagina.testo.toLowerCase(), fondo: pagina.bg.toLowerCase(), da: 'pagina' };
  return { ...PROVA_DI_SERIE, da: 'serie' };
}

// L'impronta delle domande (testi, voci, giuste): cambia appena cambia una
// cosa che decide l'esito.
export function firmaDomande(scudo) {
  const d = normScudo(scudo).domande;
  return createHash('sha256').update(JSON.stringify(d)).digest('hex').slice(0, 16);
}

// Alla pagina: le domande e le voci, senza la giusta.
export const domandePubbliche = (scudo) => normScudo(scudo).domande.map((d) => ({ testo: d.testo, opzioni: d.opzioni.slice() }));

export function linguaDi(codice, ripiego = 'it') {
  const c = String(codice || '').slice(0, 2).toLowerCase();
  if (LINGUE.includes(c)) return c;
  const r = String(ripiego || '').slice(0, 2).toLowerCase();
  return LINGUE.includes(r) ? r : 'it';
}

// ── la richiesta ────────────────────────────────────────────────────────────

// Chi chiede di entrare, letto dall'update `chat_join_request`. La bio non si
// legge: non serve a decidere, quindi non si tocca.
export function chiChiede(update) {
  const q = update?.chat_join_request;
  const chat = q?.chat;
  const u = q?.from;
  if (!chat?.id || !u?.id) return null;
  return {
    chatId: String(chat.id),
    gruppo: GRUPPI.has(String(chat.type || '')),
    titolo: riga(chat.title, 128),
    userId: String(u.id),
    nome: riga(u.first_name || u.username, 64),
    lingua: String(u.language_code || '').slice(0, 2).toLowerCase(),
    userChatId: q.user_chat_id ? String(q.user_chat_id) : '',
    queryId: q.query_id ? String(q.query_id) : '',
    // il link da cui ha chiesto: uno della porta dice com'e' gia' andata
    link: q.invite_link?.invite_link ? String(q.invite_link.invite_link) : '',
  };
}

// Cosa fare di una richiesta. Una richiesta portata a un GUARDIANO va risposta
// sempre, entro dieci secondi: se lo scudo e' spento o non e' un gruppo, la si
// passa agli amministratori ('coda'), che e' quello che succederebbe senza bot.
// Senza guardiano, una richiesta che non tocca a noi la si lascia com'e'.
// `prima` e' com'e' finita l'ultima richiesta della stessa persona per lo
// stesso gruppo: rifiutata da meno di mezz'ora vuol dire rifiutata di nuovo,
// senza pagina.
export function azioneRichiesta({ acceso, chi, prima = null, ora = Date.now() } = {}) {
  if (!chi) return 'niente';
  const nostra = !!acceso && chi.gruppo;
  if (nostra && prima?.stato === 'bocciata' && ora - (Number(prima.fine) || 0) < ATTESA_DOPO_NO) return 'rifiuta';
  if (chi.queryId) return nostra ? 'guardiano' : 'coda';
  if (nostra && chi.userChatId) return 'privato';
  return 'niente';
}

// ── la prova ────────────────────────────────────────────────────────────────

export function codiceNuovo(caso = randomInt) {
  let c = '';
  for (let i = 0; i < LUNGHEZZA; i++) c += ALFABETO[caso(0, ALFABETO.length)];
  return c;
}

const pulito = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);

// Uguali? A tempo costante: il tempo della risposta non dice quante lettere
// erano giuste.
export function confronta(dato, codice) {
  const a = Buffer.from(pulito(dato).padEnd(16, '-'));
  const b = Buffer.from(pulito(codice).padEnd(16, '-'));
  return !!pulito(codice) && timingSafeEqual(a, b);
}

// ── l'invio della pagina ────────────────────────────────────────────────────
//
// Un invio porta: le regole accettate, il codice letto, le risposte (l'indice
// della voce scelta per ogni domanda) e l'impronta delle domande che ha visto.
// L'ordine dei controlli conta: prima cio' che non costa niente sbagliare
// (regole non spuntate, domande cambiate), poi la prova (che consuma un
// tentativo), poi le risposte (che decidono).
export function esitoInvio({ riga: r, scudo, regoleOk, codice, risposte, firma, ora = Date.now() } = {}) {
  if (!r || r.stato !== 'attesa') return { esito: 'chiusa' };
  if (Number(r.scad) > 0 && ora > Number(r.scad)) return { esito: 'scaduta' };
  const s = normScudo(scudo);
  if (String(firma || '') !== firmaDomande(s)) return { esito: 'cambiato' };
  if (s.regole.attivo && !regoleOk) return { esito: 'regole' };
  // Un codice speso (tentativi finiti su quell'immagine) non c'e' piu': non si
  // confronta niente finche' non si chiede l'immagine dopo. Cosi' i tentativi
  // per immagine sono tre per davvero, anche per chi non chiede l'immagine nuova
  // e rimanda lo stesso modulo.
  if (!r.codice) return altraImmagine(r) ? { esito: 'immagine' } : { esito: 'no', motivo: 'prova' };
  if (!confronta(codice, r.codice)) {
    const tentativi = (Number(r.tentativi) || 0) + 1;
    if (tentativi < TENTATIVI) return { esito: 'riprova', tentativi, restano: TENTATIVI - tentativi };
    return altraImmagine(r) ? { esito: 'nuova', tentativi } : { esito: 'no', motivo: 'prova', tentativi };
  }
  const rs = Array.isArray(risposte) ? risposte : [];
  const sbagliate = s.domande.filter((d, i) => Number(rs[i]) !== d.giusta).length;
  if (sbagliate) return { esito: 'no', motivo: 'domande' };
  return { esito: 'passa' };
}

// Un'immagine nuova si puo' chiedere finche' ce ne sono: chi le ha finite non
// ne riceve un'altra (e la pagina gli dice cosa resta da fare).
export const altraImmagine = (r) => !!r && r.stato === 'attesa' && (Number(r.immagini) || 0) < IMMAGINI;

// Cosa si dice a Telegram per un «no»: rifiuto, oppure in mano agli
// amministratori. Per chi chiede aiuto e' sempre la seconda.
export const decisioneNo = (scudo, motivo) => (motivo === 'aiuto' || normScudo(scudo).no === 'admin' ? 'admin' : 'rifiuta');

// ── cosa serve perche' funzioni ─────────────────────────────────────────────
//
// Lo scudo non si accende se non puo' lavorare: un interruttore acceso che poi
// non fa niente e' peggio di uno che rifiuta e dice perche'. L'elenco torna
// tutto (il pannello lo mostra come una lista di spunte), e `blocco` e' il
// primo guaio che impedisce di accenderlo.
export function controlli({ https, interattivo, gruppo, admin, invitare, disegnabile, richieste, guardiano, pubblico, approvazione } = {}) {
  const lista = [
    { k: 'https', ok: !!https, grave: true },
    { k: 'interattivo', ok: !!interattivo, grave: true },
    { k: 'gruppo', ok: !!gruppo, grave: true },
    { k: 'admin', ok: !!admin, grave: true },
    { k: 'invitare', ok: !!invitare, grave: true },
    { k: 'prova', ok: !!disegnabile, grave: true },
    // Il guardiano non e' obbligatorio: senza, la pagina arriva in privato.
    { k: 'guardiano', ok: !!(richieste && guardiano), grave: false },
    // Un gruppo pubblico senza approvazione si apre col suo nome, senza
    // chiedere: lo scudo li' non vede nessuno. Lo si dice, non lo si nasconde.
    { k: 'porta', ok: !(pubblico && !approvazione), grave: false },
  ];
  const blocco = lista.find((x) => x.grave && !x.ok)?.k || '';
  return { lista, blocco, modo: richieste && guardiano ? 'guardiano' : 'privato' };
}
