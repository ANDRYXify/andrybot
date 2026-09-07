// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL PUNTEGGIO: quanto un account somiglia a una macchina.
//
// Perché non è una somma piatta. Lo schema ovvio è «un punto per ogni indizio,
// e se la somma supera la soglia è un bot». Applicato a chi vogliamo
// PROTEGGERE dà questo:
//
//   spettatore nuovo e timido (10 giorni, guarda e non scrive) → 7
//   follow-bot vero                                            → 7
//
// Stesso numero. La causa non è la taratura dei pesi, è che età, avatar di
// default e bio vuota NON SONO TRE PROVE: sono una sola. Un account creato
// ieri ha per forza l'avatar di default e la bio vuota. Sommarli è contare tre
// volte lo stesso fatto, e chi ne paga il prezzo è il pubblico nuovo — proprio
// quello che uno streamer non può permettersi di perdere.
//
// Quindi gli indizi stanno in QUATTRO FAMIGLIE, e ogni famiglia ha un tetto.
// Tre fatti che dicono la stessa cosa contano una volta sola.
//
//   A · IL PROFILO (tetto 3)      cosa dice l'anagrafica dell'account
//   B · IL NOME (tetto 5)         come si chiama
//   C · LA PRESENZA (tetto 6)     in quanti canali sta nello stesso momento
//   D · IL COMPORTAMENTO (tetto 3) cosa fa, e cosa non fa
//
// E una regola che vale sopra il numero: **si agisce solo con una famiglia
// forte**. Le famiglie forti sono il nome (B) e la presenza (C). Profilo e
// comportamento, da soli, descrivono benissimo una persona appena arrivata:
// possono far SEGNALARE, non possono far agire. È la differenza fra «guarda
// questo» e «togli questo», e va tenuta dalla struttura, non dall'attenzione.
//
// PERCHÉ LA PRESENZA È IL SEGNALE FORTE. Un lurker-bot serve a gonfiare i
// numeri, quindi deve stare in molti canali insieme: è l'unica cosa che una
// persona non può produrre. Non serve crawlare tutto Twitch per vederlo — basta
// guardare i canali che il bot già serve, e la lista di chi c'è la chiediamo
// GIÀ ogni cinque minuti per contare le ore guardate. Il segnale costa zero
// chiamate nuove.
//
// E degrada da solo: con pochi canali serviti la soglia alta non scatta mai, e
// il segnale semplicemente non contribuisce. Non produce falsi positivi quando
// non ha dati — resta zitto.
//
// Il modello per esteso, coi conti: docs/PUNTEGGIO.md.

const norm = (s) => String(s || '').toLowerCase().trim();

// ── A · IL PROFILO ──────────────────────────────────────────────────────────
// Tetto 3: un account nuovissimo e spoglio vale quanto un account nuovissimo,
// perché è la stessa notizia detta tre volte.
const TETTO_PROFILO = 3;

export function famigliaProfilo(u) {
  const motivi = [];
  let p = 0;
  if (!u) return { punti: 0, motivi };
  const giorni = u.created_at ? (Date.now() - new Date(u.created_at).getTime()) / 86400000 : Infinity;
  if (giorni < 1) { p += 3; motivi.push('account di oggi'); }
  else if (giorni < 3) { p += 2; motivi.push(`account di ${Math.floor(giorni)} giorni`); }
  else if (giorni < 14) { p += 1; motivi.push('account recente'); }
  if (/user-default-pictures/i.test(u.profile_image_url || '')) { p += 1; motivi.push('foto di default'); }
  if (!String(u.description || '').trim()) { p += 1; motivi.push('bio vuota'); }
  return { punti: Math.min(TETTO_PROFILO, p), motivi };
}

// ── B · IL NOME ─────────────────────────────────────────────────────────────
// Famiglia FORTE. Chi giudica il nome sta altrove (antibot.js, che tiene la
// lista pubblica e i pattern): qui arriva il verdetto già preso, così questo
// modulo resta una funzione pura e non si crea un anello fra i due file.
const TETTO_NOME = 5;

export function famigliaNome({ nomeNoto = false, nomePattern = false, nomeGenerato = false } = {}) {
  const motivi = [];
  let p = 0;
  if (nomeNoto) { p += 5; motivi.push('nome in lista come bot'); }
  else if (nomePattern) { p += 4; motivi.push('nome da bot promozionale'); }
  else if (nomeGenerato) { p += 2; motivi.push('nome che sembra generato'); }
  return { punti: Math.min(TETTO_NOME, p), motivi };
}

// Un nome «generato»: niente vocali per lunghi tratti, oppure una coda di cifre
// lunga attaccata a poche lettere. Vale POCO (2) apposta: fra le persone vere
// ci sono nomi strani, e questo indizio da solo non deve poter fare niente.
export function nomeGenerato(login) {
  const l = norm(login);
  if (l.length < 6) return false;
  if (/^[a-z]{2,6}\d{6,}$/.test(l)) return true;                 // abc123456789
  const soloLettere = l.replace(/[^a-z]/g, '');
  if (soloLettere.length >= 8) {
    const vocali = (soloLettere.match(/[aeiou]/g) || []).length;
    if (vocali / soloLettere.length < 0.15) return true;         // muro di consonanti
  }
  return false;
}

// ── C · LA PRESENZA IN PIÙ CANALI ───────────────────────────────────────────
// Famiglia FORTE, ed è la sola cosa che una persona non può produrre.
const TETTO_PRESENZA = 6;
const SCALINI_PRESENZA = [[12, 6], [6, 4], [3, 2]];

export function famigliaPresenza(canaliInsieme = 0) {
  const k = Math.max(0, Number(canaliInsieme) || 0);
  for (const [quanti, punti] of SCALINI_PRESENZA) {
    if (k >= quanti) return { punti: Math.min(TETTO_PRESENZA, punti), motivi: [`in ${k} canali nello stesso momento`] };
  }
  return { punti: 0, motivi: [] };
}

// ── D · IL COMPORTAMENTO ────────────────────────────────────────────────────
// Tetto 3. Da solo non condanna nessuno: «guarda e non scrive» è la
// definizione della maggior parte del pubblico.
const TETTO_COMPORTAMENTO = 3;

export function famigliaComportamento({ maiScritto = false, nonSegue = false, ondataIngressi = false } = {}) {
  const motivi = [];
  let p = 0;
  if (ondataIngressi) { p += 2; motivi.push('entrato insieme a molti account nuovi'); }
  if (maiScritto) { p += 1; motivi.push('non ha mai scritto'); }
  if (nonSegue) { p += 1; motivi.push('guarda ma non segue'); }
  return { punti: Math.min(TETTO_COMPORTAMENTO, p), motivi };
}

// ── Il giudizio ─────────────────────────────────────────────────────────────
export const SOGLIA_SEGNALA = 5;

// La soglia per AGIRE non e' un numero scelto: e' il punto esatto in cui le
// famiglie deboli, tutte al massimo, non bastano piu'. Profilo al tetto piu'
// comportamento al tetto fanno sei; sette vuol dire che almeno un punto arriva
// per forza da un nome o dalla presenza. Cosi' la regola «serve una famiglia
// forte» non e' una toppa appoggiata sopra al numero, e' il numero.
//
// E se domani qualcuno alza un tetto, la soglia si alza da sola con lui.
export const SOGLIA_AGISCI = TETTO_PROFILO + TETTO_COMPORTAMENTO + 1;
export const MASSIMO = TETTO_PROFILO + TETTO_NOME + TETTO_PRESENZA + TETTO_COMPORTAMENTO;

export function punteggio(dati = {}) {
  const a = famigliaProfilo(dati.utente);
  const b = famigliaNome(dati);
  const c = famigliaPresenza(dati.canaliInsieme);
  const d = famigliaComportamento(dati);
  const punti = a.punti + b.punti + c.punti + d.punti;
  // Una famiglia forte non e' «qualche punto in piu'»: e' la condizione per
  // poter toccare qualcuno. Senza, il punteggio serve solo a far guardare.
  //
  // Il nome GENERATO non conta come forte, pur stando nella famiglia del nome:
  // e' un'euristica sulla forma delle lettere, non un fatto. Fra le persone
  // vere ci sono nomi strani, e un nome strano non deve poter far agire nessuno
  // nemmeno quando si somma a un account nuovo che guarda e non scrive.
  const forte = !!(dati.nomeNoto || dati.nomePattern) || c.punti > 0;
  return {
    punti,
    forte,
    famiglie: { profilo: a.punti, nome: b.punti, presenza: c.punti, comportamento: d.punti },
    motivi: [...b.motivi, ...c.motivi, ...a.motivi, ...d.motivi],
    segnala: punti >= SOGLIA_SEGNALA,
    agisci: punti >= SOGLIA_AGISCI && forte,
  };
}

// Il vecchio mondo parla in centesimi (le impostazioni salvate degli streamer
// hanno «soglia: 70»), il nuovo in punti. La conversione sta qui, in un posto
// solo, cosi' nessuno si mette a convertire a mano da qualche altra parte.
//
// E non si rapporta al massimo teorico: si rapporta alla SOGLIA. Il massimo
// include la presenza in molti canali, che per la maggior parte degli account
// vale zero, quindi rapportarsi a quello schiaccerebbe ogni giudizio in basso e
// il 70 che gli streamer hanno gia' salvato non lo raggiungerebbe piu' nessuno.
// Cosi' invece il 70 del pannello resta esattamente quello che era: il punto in
// cui il motore agisce.
export const inCentesimi = (punti) => Math.min(100, Math.round((punti / SOGLIA_AGISCI) * 70));

// ── Il censimento: chi c'è, e in quanti posti ───────────────────────────────
// Vive in memoria e non ha bisogno di una casa: si ricostruisce da solo al
// primo giro dopo un riavvio, cioe' in cinque minuti.
//
// E si tiene SOLO IL CONTEGGIO, mai l'elenco dei canali in cui uno e' stato:
// quello sarebbe un registro di chi guarda cosa, e non e' roba nostra.
const FINESTRA_MS = 12 * 60 * 1000;      // due giri di censimento
const MAX_CENSITI = 60000;
const visti = new Map();                 // login → { canali:Set, ts }

export function censisci(canale, logins = []) {
  const ch = norm(canale);
  const ora = Date.now();
  if (!ch) return 0;
  for (const l of logins) {
    const k = norm(l);
    if (!k) continue;
    const v = visti.get(k);
    if (v && ora - v.ts < FINESTRA_MS) { v.canali.add(ch); v.ts = ora; }
    else visti.set(k, { canali: new Set([ch]), ts: ora });
  }
  if (visti.size > MAX_CENSITI) potaCensimento(ora);
  return visti.size;
}

export function canaliInsieme(login) {
  const v = visti.get(norm(login));
  if (!v || Date.now() - v.ts > FINESTRA_MS) return 0;
  return v.canali.size;
}

export function potaCensimento(ora = Date.now()) {
  for (const [k, v] of visti) if (ora - v.ts > FINESTRA_MS) visti.delete(k);
  return visti.size;
}

export function statoCensimento() {
  let inPiuCanali = 0;
  for (const v of visti.values()) if (v.canali.size >= 3) inPiuCanali++;
  return { censiti: visti.size, inPiuCanali };
}

// Solo per le prove: il censimento e' stato globale, e una prova non deve
// ereditare quello di un'altra.
export function azzeraCensimento() { visti.clear(); }

// ── Misurare i propri errori ────────────────────────────────────────────────
//
// «I pesi li tari tu sui tuoi falsi positivi.» Giusto — ma i falsi positivi
// bisogna poterli CONTARE, sennò tarare vuol dire indovinare con più passaggi.
//
// Qui il conto si fa da solo, e senza etichettare niente a mano. Ogni giudizio
// abbastanza alto da valere qualcosa viene segnato con la data. Poi si guarda
// una cosa sola: quel tale, DOPO, ha parlato in chat? Una macchina che gonfia i
// numeri non scrive; una persona prima o poi dice qualcosa. Chi scrive dopo
// essere stato segnato è un errore nostro, e finisce nel conto degli errori.
//
// Non intercetta niente nel percorso dei messaggi: la domanda si fa al momento
// del rapporto, guardando la memoria della chat che c'è già.
export const GIUDIZI_CHIAVE = 'giudizi';
const GIUDIZI_MAX = 400;
const GIUDIZI_VECCHI_MS = 21 * 24 * 60 * 60 * 1000;

export function segnaGiudizio(elenco, { login, punti, agito }) {
  const arr = Array.isArray(elenco) ? elenco.slice() : [];
  const l = norm(login);
  if (!l || !Number.isFinite(punti)) return arr;
  const ora = Date.now();
  const tenuti = arr.filter((v) => v && ora - (v.ts || 0) < GIUDIZI_VECCHI_MS && norm(v.login) !== l);
  tenuti.push({ login: l, punti, agito: !!agito, ts: ora });
  return tenuti.slice(-GIUDIZI_MAX);
}

// Incrocia i giudizi con quello che è successo dopo. `haParlato(login, da)` la
// passa chi chiama, così questo modulo non tocca il database.
export function erroriDi(elenco, haParlato) {
  const arr = Array.isArray(elenco) ? elenco : [];
  let segnalati = 0, agiti = 0, sbagliati = 0, sbagliatiAgiti = 0;
  const chi = [];
  for (const v of arr) {
    if (!v?.login) continue;
    segnalati++;
    if (v.agito) agiti++;
    if (!haParlato(v.login, v.ts)) continue;
    sbagliati++;
    if (v.agito) sbagliatiAgiti++;
    chi.push({ login: v.login, punti: v.punti, agito: !!v.agito });
  }
  return {
    segnalati, agiti, sbagliati, sbagliatiAgiti,
    // La percentuale che conta davvero e' la seconda: sbagliare un «guarda
    // questo» costa uno sguardo, sbagliare un «togli questo» costa una persona.
    percSegnalati: segnalati ? +(sbagliati / segnalati * 100).toFixed(1) : 0,
    percAgiti: agiti ? +(sbagliatiAgiti / agiti * 100).toFixed(1) : 0,
    chi: chi.slice(-20),
  };
}
