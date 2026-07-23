// SocialBot — logica della dashboard (single-page, zero dipendenze).
// Stato globale caricato da GET /api/me, funzioni di render per sezione,
// fetch con gestione errori e toast di conferma.

'use strict';

// ------------------------------------------------------------------ stato
let stato = null;          // risposta di /api/me
let schedaAttiva = 'stato';

// Modalità DEMO: dashboard interattiva con dati d'esempio, per far vedere il bot
// senza login. Attiva con /?demo=1 (link dalla vetrina). Nessuna API reale: le
// chiamate sono simulate lato client (vedi apiDemo), i salvataggi non persistono.
const DEMO = (() => {
  try { return new URLSearchParams(location.search).get('demo') === '1' || /^\/demo\/?$/.test(location.pathname); }
  catch { return false; }
})();
const gruppiChiusi = new Set();   // id delle sezioni della sidebar richiuse

// stato locale della scheda "Moduli"
let datiModuli = null;        // { moduli, effettiDisponibili, apiKey, apiUrl }
let moduloInModifica = null;  // oggetto aperto nell'editor (per conservare id/attivo)
let campoAttivoModulo = null; // ultimo campo di testo a fuoco (per le pillole variabili)
let apiKeyVisibile = false;   // se la chiave API è mostrata in chiaro

const app = document.getElementById('app');
const areaUtente = document.getElementById('area-utente');

// ------------------------------------------------------------------ utilità

// escape HTML: tutto ciò che viene dal server/utente passa da qui
function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function dataIt(ts) {
  let n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) n = Date.parse(ts);   // accetta anche date ISO
  if (!Number.isFinite(n) || n <= 0) return '—';
  return new Date(n).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

// notifica a scomparsa
function toast(msg, tipo = 'ok') {
  const box = document.getElementById('toast-box');
  const el = document.createElement('div');
  el.className = 'toast' + (tipo === 'errore' ? ' errore' : '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// fetch verso le API: JSON in/out, errori → eccezione con messaggio leggibile
async function api(percorso, opzioni = {}) {
  if (DEMO) return apiDemo(percorso, opzioni);   // demo: nessuna chiamata reale
  const opts = { headers: {}, ...opzioni };
  if (opts.body !== undefined && typeof opts.body !== 'string') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(percorso, opts);
  let dati = null;
  try { dati = await res.json(); } catch { /* risposta non JSON */ }
  if (!res.ok) throw new Error(dati?.errore || `errore ${res.status}`);
  return dati;
}

// impostazioni correnti con i valori di default del bot
function impostazioni() {
  const s = stato?.streamer?.settings || {};
  return {
    tono: ['scherzoso', 'amichevole', 'serio'].includes(s.tono) ? s.tono : 'scherzoso',
    spontaneita: typeof s.spontaneita === 'number' ? s.spontaneita : 0.03,
    rispostaMenzioni: s.rispostaMenzioni !== false,
    modalita: ['sempre', 'live', 'manuale'].includes(s.modalita) ? s.modalita : 'sempre',
    iaLocale: s.iaLocale !== false,
    proattivo: s.proattivo !== false,
    adattaCanale: s.adattaCanale !== false,
    giochi: s.giochi !== false,
    promoSocial: s.promoSocial !== false,
    nomeMonete: (typeof s.nomeMonete === 'string' && s.nomeMonete.trim()) || 'monete',
    premioVip: (s.premioVip && typeof s.premioVip === 'object') ? s.premioVip : { attivo: false, periodo: 'settimana', quanti: 1 },
    antispam: (s.antispam && typeof s.antispam === 'object') ? s.antispam : {},
    tiktok: (s.tiktok && typeof s.tiktok === 'object') ? s.tiktok : { username: '', attivo: false, annunciaChat: false, messaggio: '' },
    giochiSito: (s.giochiSito && typeof s.giochiSito === 'object') ? s.giochiSito : { attivo: false, collegato: false },
    frasi: Array.isArray(s.frasi) ? s.frasi : [],
    clipAuto: s.clipAuto !== false,
    clipAutoSoglia: typeof s.clipAutoSoglia === 'number' ? s.clipAutoSoglia : 25,
    paroleVietate: Array.isArray(s.paroleVietate) ? s.paroleVietate : [],
    ascoltoLive: s.ascoltoLive === true,
    ascoltoSensibilita: typeof s.ascoltoSensibilita === 'number' ? s.ascoltoSensibilita : 5,
  };
}

// salva un sottoinsieme di impostazioni e aggiorna lo stato locale
async function salvaImpostazioni(parziale, msgOk = 'Impostazioni salvate 💜') {
  await api('/api/streamer/impostazioni', { method: 'POST', body: parziale });
  if (stato?.streamer) {
    stato.streamer.settings = { ...(stato.streamer.settings || {}), ...parziale };
  }
  toast(msgOk);
}

// ------------------------------------------------------------------ avvio

// app installata (standalone)? Serve per lo sblocco rapido con passkey.
function inApp() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

async function caricaStato() {
  if (DEMO) { stato = statoDemo(); render(); montaDemo(); return; }
  try {
    stato = await api('/api/me');
  } catch (e) {
    // Nell'app installata una sessione scaduta non deve mostrare un errore:
    // si va allo sblocco con passkey (che, se serve, rimanda al sito).
    if (inApp()) { location.href = '/sblocca'; return; }
    app.innerHTML = `<div class="carta"><h2>Ops!</h2><p>Impossibile contattare il server: ${esc(e.message)}</p></div>`;
    return;
  }
  render();
}

// ------------------------------------------------------------------ modalità demo
// Tutta la logica della demo interattiva. Vive qui, isolata: se DEMO è falso
// niente di questo viene mai eseguito. I dati sono di fantasia (streamer
// "andryx_demo") e servono solo a far vedere com'è fatta e come funziona la
// dashboard, con una spiegazione per ogni sezione.

// Stato finto: uno streamer approvato, permessi ok, con impostazioni e Telegram
// già configurati così ogni scheda ha qualcosa da mostrare.
function statoDemo() {
  return {
    user: { login: 'andryx_demo', display: 'Andryx', avatar: '' },
    ruolo: 'proprietario',
    isAdmin: false,
    permessiOk: true, vipOk: true, moderazioneOk: true,
    knowledgeCount: 3,
    status: { channels: ['andryx_demo'] },   // "in chat adesso"
    preaddestramento: { preaddestramento_ts: '2026-05-01T20:00:00Z', preaddestramento_esito: 'pagina profilo letta ("Andryx — creator e streamer da Genova · Twitch, YouTube, gaming"), 5 link social; gioco recente: Fortnite; profilo Twitch letto' },
    telegram: { configurato: true, gruppoOk: true, attivo: true, pinLive: true,
      interattivo: true, botUsername: 'andryx_live_bot', gruppo: 'Community di Andryx', messaggio: '' },
    streamer: {
      status: 'approved',
      botEnabled: true,
      settings: {
        tono: 'scherzoso', spontaneita: 0.05, rispostaMenzioni: true, modalita: 'sempre',
        iaLocale: true, proattivo: true, adattaCanale: true, giochi: true, promoSocial: true,
        nomeMonete: 'scudi', clipAuto: true, clipAutoSoglia: 25, ascoltoLive: false, ascoltoSensibilita: 5,
        premioVip: { attivo: true, periodo: 'settimana', quanti: 2 },
        paroleVietate: ['spoiler', 'link-truffa'],
        frasi: ['Benvenuto nel canale! 💜', 'Ricordati di seguire per non perderti le live!'],
        tiktok: { username: 'andryxify', attivo: true, annunciaChat: true, messaggio: '' },
        giochiSito: { attivo: true, collegato: true },
        antispam: { maiuscole: true, link: true, flood: true },
      },
    },
  };
}

// Risposte finte alle API. Le GET restituiscono dati d'esempio; le scritture
// tornano un esito benevolo (la barra demo chiarisce che non si salva nulla).
function apiDemo(percorso, opzioni = {}) {
  const metodo = (opzioni.method || 'GET').toUpperCase();
  const via = percorso.split('?')[0];
  if (metodo === 'GET') return Promise.resolve(_demoGet(via));
  // scritture: qualche endpoint restituisce dati usati a schermo → li simuliamo.
  if (via === '/api/me') return Promise.resolve(statoDemo());
  if (via === '/api/moderatori') return Promise.resolve({ invito: 'https://bot.andryxify.it/mod?token=demo' });
  if (via === '/api/streamer/apikey') return Promise.resolve({ apikey: 'demo_' + 'x'.repeat(24) });
  if (via.endsWith('/prova')) { toast('In demo non invio davvero in chat 😊'); return Promise.resolve({ ok: true }); }
  return Promise.resolve({ ok: true, demo: true });
}

function _demoGet(via) {
  const F = {
    '/api/me': statoDemo(),
    '/api/streamer/knowledge': [
      { id: 1, domanda: 'Che PC usi?', risposta: 'Ryzen 7 + RTX 4070, trovi tutto su andryxify.it 🖥️', fonte: 'manuale', ts: '2026-05-02T18:00:00Z' },
      { id: 2, domanda: 'Da dove streammi?', risposta: 'Da Genova, quasi ogni sera verso le 21 💜', fonte: 'auto', ts: '2026-05-01T20:00:00Z' },
      { id: 3, domanda: 'Come ti seguo ovunque?', risposta: 'Tutti i miei link li trovi su andryxify.it/u/andryx', fonte: 'chat', ts: '2026-05-05T22:10:00Z' },
    ],
    '/api/streamer/citazioni': [
      { n: 1, text: '"Oggi si vince o si impara, mai si perde." — Andryx' },
      { n: 2, text: '"La chat è la vera protagonista." — un mod a caso' },
      { n: 3, text: '"Un altro boss, un altro tentativo." — Andryx alle 2 di notte' },
    ],
    '/api/streamer/classifica': {
      monete: [
        { user: 'lucaplays', monete: 4820 }, { user: 'giada_ttv', monete: 3910 },
        { user: 'marco99', monete: 2740 }, { user: 'sara_gg', monete: 1980 }, { user: 'il_nonno', monete: 1450 },
      ],
      vip: [
        { user: 'lucaplays', display: 'lucaplays', until: null, motivo: 'top chatter del mese' },
        { user: 'giada_ttv', display: 'giada_ttv', until: '2026-09-01T00:00:00Z', motivo: 'vincitrice del quiz' },
      ],
    },
    '/api/streamer/effetti': {
      overlayUrl: 'https://bot.andryxify.it/overlay/andryx_demo',
      effetti: [
        { id: 1, comando: 'applausi', tipo: 'audio', tier: 'tutti', cooldown: 10, volume: 80, durata: 3000 },
        { id: 2, comando: 'tromba', tipo: 'audio', tier: 'sub', cooldown: 15, volume: 70, durata: 2000 },
        { id: 3, comando: 'coriandoli', tipo: 'video', tier: 'vip', cooldown: 30, volume: 60, durata: 4000 },
      ],
    },
    '/api/streamer/statistiche': {
      messaggi7g: 12840, messaggiBot7g: 1620, clipTotali: 96,
      topChatters: [
        { user: 'lucaplays', c: 1820 }, { user: 'giada_ttv', c: 1390 }, { user: 'marco99', c: 980 },
        { user: 'sara_gg', c: 640 }, { user: 'il_nonno', c: 410 },
      ],
    },
    '/api/streamer/memoria': {
      clip: [
        { url: 'https://clips.twitch.tv/demo1', clip_id: 'demo1', reason: 'hype: +25 msg/min', ts: '2026-06-20T21:15:00Z' },
        { url: 'https://clips.twitch.tv/demo2', clip_id: 'demo2', reason: 'reazione al jumpscare 😱', ts: '2026-06-18T22:40:00Z' },
      ],
      lezioni: [
        { text: 'La community ama i boss-fight e le serate chiacchiera.', ts: '2026-06-10T21:00:00Z' },
        { text: 'Meglio non fare spoiler prima delle 22.', ts: '2026-06-12T20:30:00Z' },
      ],
      fatti: [
        { key: 'Gioco preferito', value: 'GDR e soulslike' },
        { key: 'Orario tipico', value: 'quasi ogni sera verso le 21' },
        { key: 'Città', value: 'Genova' },
      ],
    },
    '/api/streamer/moduli': [
      { id: 'social', nome: 'Social', attivo: true, tipo: 'comando',
        trigger: { tipo: 'comando', comando: 'social' },
        azioni: [{ tipo: 'messaggio', testo: 'I miei social: andryxify.it/u/$canale ✨' }] },
      { id: 'pc', nome: 'Setup PC', attivo: true, tipo: 'comando',
        trigger: { tipo: 'comando', comando: 'pc' },
        azioni: [{ tipo: 'messaggio', testo: 'Ryzen 7 + RTX 4070. Dettagli su andryxify.it 🖥️' }] },
      { id: 'benvenuto', nome: 'Benvenuto', attivo: true, tipo: 'evento',
        trigger: { tipo: 'evento', evento: 'primo-messaggio' },
        azioni: [{ tipo: 'messaggio', testo: 'Benvenuto $user! Mettiti comodo 💜' }] },
      { id: 'dado', nome: 'Tiro di dado', attivo: false, tipo: 'comando',
        trigger: { tipo: 'comando', comando: 'dado' },
        azioni: [{ tipo: 'messaggio', testo: '$user tira il dado e fa... $random(1,6)! 🎲' }] },
    ],
    '/api/streamer/telegram/compleanni': {
      membri: [
        { tg_user_id: '1', nome: 'Luca', username: 'lucaplays' },
        { tg_user_id: '2', nome: 'Giada', username: 'giada_ttv' },
      ],
      compleanni: [
        { id: 1, nome: 'Luca', giorno: 14, mese: 3, tg_user_id: '1' },
        { id: 2, nome: 'Giada', giorno: 2, mese: 9, tg_user_id: '2' },
      ],
    },
    '/api/moderatori': [ { login: 'lucaplays', display: 'lucaplays', stato: 'attivo' } ],
    '/api/passkey': [ { id: 'demo', nome: 'iPhone di Andryx', quando: '2026-04-10' } ],
  };
  return F[via] !== undefined ? F[via] : {};
}

// Spiegazione mostrata in cima ad ogni scheda durante la demo ("le varie sezioni,
// spiegate"). Chiave = id scheda.
const SPIEGA_DEMO = {
  stato: 'Il quadro di comando: accendi/spegni il bot, controlli i permessi Twitch e vedi se è connesso alla chat. Da qui inviti anche i tuoi moderatori.',
  personalita: 'Decidi il carattere del bot: tono (scherzoso, amichevole, serio), quanto è spontaneo, se risponde alle menzioni e quando può parlare.',
  conoscenza: 'Insegni al bot cosa sa di te: domande e risposte pronte (PC, social, orari…) che userà quando qualcuno chiede in chat.',
  memoria: 'Le statistiche del canale e ciò che il bot ricorda: clip salvate, note sulla community, sintesi di com\'è andata.',
  moduli: 'Il cuore del bot: crei comandi e automazioni. Trigger da parola, frase, evento, voce o timer e azioni con variabili $ (come $user o $random).',
  regole: 'La moderazione automatica: filtri anti-spam, parole vietate e limiti, per tenere la chat pulita senza pensarci.',
  giochi: 'Mini-giochi, monete e classifiche per la community: qui vedi la leaderboard e gestisci le citazioni.',
  effetti: 'Suoni ed effetti da lanciare in chat o in overlay: un comando e parte l\'applauso, la tromba o i coriandoli.',
  clip: 'Le clip automatiche nei momenti di hype, così non perdi mai il momento migliore della live.',
  ascolto: 'Comandi il bot a voce mentre streammi: parli e lui esegue, senza toccare la tastiera.',
  notifiche: 'Gli avvisi quando vai in diretta: Telegram (con messaggio fissato e auguri di compleanno ai membri) e TikTok.',
};

// Monta gli elementi fissi della demo (barra in alto + striscia di spiegazione)
// e li tiene aggiornati sulla scheda attiva.
function montaDemo() {
  const cont = document.querySelector('.contenuto');
  const header = document.getElementById('pagina-testata');
  if (!cont || document.getElementById('demo-barra')) { aggiornaSpiegazioneDemo(); return; }

  const barra = document.createElement('div');
  barra.id = 'demo-barra';
  barra.innerHTML =
    `<span class="demo-punto"></span>
     <span class="demo-testo"><strong>Demo di SocialBot</strong> — stai esplorando la dashboard con dati d'esempio. Puoi cliccare ovunque; niente viene salvato.</span>
     <span class="demo-azioni">
       <a class="btn mini" href="https://andryxify.it">Attiva su andryxify.it</a>
       <a class="btn mini secondario" href="/">Esci dalla demo</a>
     </span>`;
  cont.insertBefore(barra, header);

  const spiega = document.createElement('div');
  spiega.id = 'demo-spiega';
  spiega.className = 'carta demo-spiega';
  cont.insertBefore(spiega, document.getElementById('app'));

  aggiornaSpiegazioneDemo();
}

// Aggiorna la striscia di spiegazione in base alla scheda attiva.
function aggiornaSpiegazioneDemo() {
  const el = document.getElementById('demo-spiega');
  if (!el) return;
  const testo = SPIEGA_DEMO[schedaAttiva];
  if (!testo) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = `<span class="demo-spiega-ico" aria-hidden="true">💡</span><p><strong>Cos'è questa sezione — </strong>${esc(testo)}</p>`;
}

// ------------------------------------------------------------------ render principale

function render() {
  renderAreaUtente();
  const navLat = document.getElementById('nav-lat');

  // "vetrina": la landing pubblica per chi non è loggato (nessun dato privato).
  document.body.classList.toggle('vetrina', !stato.user);

  if (!stato.user) {
    document.body.classList.remove('con-nav');
    if (navLat) navLat.innerHTML = '';
    renderHero();
    return;
  }

  let html = '';
  const st = stato.streamer;
  const conPiattaforma = st?.status === 'approved';

  if (!st) {
    html += vistaRichiesta();
  } else if (st.status === 'pending') {
    html += vistaPending();
  } else if (st.status === 'disabled') {
    html += vistaDisabilitato();
  } else if (st.status === 'approved') {
    html += vistaPiattaforma();
  }

  // L'admin con un canale approvato ha l'area "Admin" tra le schede (dentro
  // vistaPiattaforma). Se è admin ma senza canale approvato, non ci sono schede:
  // in quel caso mostriamo il pannello admin da solo, come prima.
  if (stato.isAdmin && !conPiattaforma) html += `<hr class="separatore">${vistaAdminContenuto()}`;

  app.innerHTML = html;

  // La sidebar (con la navigazione) c'è solo quando esiste la piattaforma a
  // schede; negli altri stati (login, richiesta, ecc.) resta nascosta.
  document.body.classList.toggle('con-nav', conPiattaforma);
  if (navLat) navLat.innerHTML = conPiattaforma ? navLateraleHtml() : '';
  aggiornaTestataPagina();

  if (conPiattaforma) attivaPiattaforma();
  if (stato.isAdmin) { caricaTabellaAdmin(); caricaAnima(); }

  rivelaCarte();   // scroll-reveal delle carte appena disegnate
}

// ------------------------------------------------------------------ scroll-reveal
// Le carte entrano morbide quando compaiono (al cambio scheda o scorrendo),
// stile Awwwards. Un solo IntersectionObserver, riusato ad ogni render.
const _menoMoto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Esegue `fn` (che modifica il DOM) dentro una View Transition: il browser anima
// morbidamente il passaggio — morph del corpo pagina e scorrimento della pillola
// del menu. Niente transizione con "meno movimento", dove l'API non c'è, o in
// modalità drawer (≤860px): lì la sidebar scorre via e l'elemento condiviso
// "volerebbe" attraverso lo schermo → meglio un cambio netto.
function transizione(fn) {
  const drawer = window.matchMedia && window.matchMedia('(max-width: 860px)').matches;
  if (_menoMoto || drawer || !document.startViewTransition) { fn(); return { finished: Promise.resolve() }; }
  return document.startViewTransition(fn);
}

let _rivObs = null;
function _osservatore() {
  if (!_rivObs) {
    _rivObs = new IntersectionObserver((voci) => {
      for (const v of voci) if (v.isIntersecting) { v.target.classList.add('dentro'); _rivObs.unobserve(v.target); }
    }, { threshold: 0.05, rootMargin: '0px 0px -6% 0px' });
  }
  return _rivObs;
}
// Prepara (nasconde) e osserva le carte dentro `scope`. Quelle già in vista si
// rivelano subito con una piccola cascata; le altre quando ci scorri sopra.
function rivelaCarte(scope = document) {
  const carte = [...scope.querySelectorAll('.carta')];
  if (_menoMoto) { carte.forEach((c) => c.classList.add('rivela', 'dentro')); return; }
  const obs = _osservatore();
  let inVista = 0;
  for (const c of carte) {
    c.classList.remove('dentro');
    c.classList.add('rivela');
    const r = c.getBoundingClientRect();
    const visibile = r.top < window.innerHeight * 0.92;   // già a schermo → cascata
    c.style.setProperty('--rev-delay', visibile ? Math.min(inVista++, 5) * 70 + 'ms' : '0ms');
    obs.observe(c);
  }
}

function renderAreaUtente() {
  if (!stato.user) { areaUtente.innerHTML = ''; return; }

  // Moderatore: mostra il suo nome + il canale che sta gestendo, con lo switcher
  // se ne gestisce più d'uno (come il selettore canale di Nightbot).
  if (stato.ruolo === 'moderatore') {
    const canali = stato.mieiCanali || [];
    const switcher = canali.length > 1
      ? `<select class="chip-utente" id="switch-canale" title="Cambia canale gestito">
           ${canali.map((c) => `<option value="${esc(c.canale)}" ${c.canale === stato.user.login ? 'selected' : ''}>gestisci @${esc(c.display)}</option>`).join('')}
         </select>`
      : `<span class="chip-utente">gestisci <strong>@${esc(stato.gestisce?.streamer || stato.user.login)}</strong></span>`;
    areaUtente.innerHTML = `
      <span class="chip-utente">${esc(stato.user.modDisplay || 'moderatore')} · <strong>mod</strong></span>
      ${switcher}
      <a class="btn secondario mini" href="/auth/logout">Esci</a>`;
    document.getElementById('switch-canale')?.addEventListener('change', (ev) => conErrore(async () => {
      await api('/api/mod/cambia-canale', { method: 'POST', body: { channel: ev.target.value } });
      stato = await api('/api/me'); render();
      toast('Ora gestisci @' + (stato.gestisce?.streamer || stato.user.login));
    }));
    return;
  }

  areaUtente.innerHTML = `
    <span class="chip-utente">ciao, <strong>${esc(stato.user.display)}</strong></span>
    <a class="btn secondario mini" href="/auth/logout">Esci</a>`;
}

// ------------------------------------------------------------------ viste "semplici"

function renderHero() {
  const errore = new URLSearchParams(location.search).get('errore');
  const msgErrore = {
    'access_denied': 'Hai annullato l’accesso su Twitch.',
    'state': 'Sessione di accesso scaduta, riprova.',
    'validazione': 'Twitch non ha confermato il tuo accesso, riprova.',
    'account-diverso': 'Hai autorizzato un account diverso da quello con cui sei loggato: usa lo stesso account.',
  }[errore] || (errore ? `Errore di accesso: ${errore}` : null);

  // Icone a tratto per la vetrina (coerenti con quelle della sidebar).
  const vi = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const FEAT = [
    [vi('<path d="M8 12h8"/><path d="M12 8v8"/><rect x="3" y="4" width="18" height="16" rx="3"/>'),
      'Parla col tuo account', 'Niente bot anonimi: SocialBot scrive in chat con il tuo nome. Sei sempre tu.'],
    [vi('<path d="M12 3c.35 3.8 1.4 4.85 5 5.2-3.6.35-4.65 1.4-5 5.2-.35-3.8-1.4-4.85-5-5.2 3.6-.35 4.65-1.4 5-5.2Z"/>'),
      'Si addestra da solo', 'Al primo accesso impara chi sei dal tuo profilo e cresce con la tua chat.'],
    [vi('<rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="M7.5 9.5 10.5 12l-3 2.5"/><path d="M13 15h4"/>'),
      'Comandi & moduli', 'Crea comandi, frasi e automazioni infinite — anche a partire da una frase o una domanda.'],
    [vi('<rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="M8 5v14"/><path d="M16 5v14"/>'),
      'Clip automatiche', 'Cattura i momenti di hype senza muovere un dito.'],
    [vi('<path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5 2 6H4c.5-1 2-2 2-6"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>'),
      'Notifiche live', 'Avvisi automatici su Telegram e TikTok quando vai in diretta.'],
    [vi('<rect x="9" y="3" width="6" height="10.5" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><path d="M12 17v4"/>'),
      'Comandi a voce', 'Piloti il bot parlando, mentre streammi, senza toccare la tastiera.'],
  ];
  const STEP = [
    ['1', 'Accedi con Twitch', 'Un click, con lo stesso account con cui streammi.'],
    ['2', 'Richiedi l’abilitazione', 'andryxify ti approva e sblocca la tua dashboard.'],
    ['3', 'Personalizza e vai live', 'Tono, comandi, notifiche: tutto tuo, in pochi minuti.'],
  ];

  app.innerHTML = `
    ${msgErrore ? `<div class="carta avviso"><p>⚠️ ${esc(msgErrore)}</p></div>` : ''}

    <section class="vetrina-hero">
      <span class="vetrina-occhiello">SocialBot · il bot di andryxify.it</span>
      <h1 class="vetrina-titolo">${titoloParole('Il bot Twitch che parla')} <span class="acc">${titoloParole('con la tua voce', 4)}</span></h1>
      <p class="vetrina-sub">Vive nella tua chat e scrive <strong>con il tuo account</strong> — niente bot anonimi.
      Impara chi sei, crea comandi su misura e cresce con la tua community.</p>
      <div class="vetrina-azioni">
        <a class="btn grande" href="/?demo=1">▶ Prova la demo</a>
        <a class="btn grande secondario" href="https://andryxify.it">Attiva su andryxify.it →</a>
      </div>
      <p class="nota">🔒 Per attivare SocialBot sul tuo canale devi essere uno streamer verificato e abilitato su <a href="https://andryxify.it">andryxify.it</a>: da lì entri nella tua dashboard.</p>
    </section>

    <section class="vetrina-features">
      ${FEAT.map(([ic, t, d]) => `
        <div class="carta rivela vetrina-feat">
          <span class="vetrina-feat-ico">${ic}</span>
          <h3>${t}</h3>
          <p>${d}</p>
        </div>`).join('')}
    </section>

    <section class="carta rivela vetrina-come">
      <h2>Come si attiva</h2>
      <div class="vetrina-passi">
        ${STEP.map(([n, t, d]) => `
          <div class="vetrina-passo">
            <span class="vetrina-passo-n">${n}</span>
            <div><strong>${t}</strong><p>${d}</p></div>
          </div>`).join('')}
      </div>
    </section>

    <section class="carta rivela vetrina-cta">
      <div>
        <h2>Fai parte di andryxify.it</h2>
        <p>SocialBot è uno dei tasselli del mondo andryxify: profili, giochi e community in un unico posto.</p>
      </div>
      <a class="btn grande secondario" href="https://andryxify.it">Vai al sito principale →</a>
    </section>`;

  rivelaCarte();   // scroll-reveal delle carte della vetrina
}

function vistaRichiesta() {
  return `
    <div class="carta evidenziata">
      <h2>Porta SocialBot nel tuo canale 🚀</h2>
      <p>Chiedi l'abilitazione: andryxify riceverà la tua richiesta e, una volta approvata,
      potrai configurare il tuo bot da qui.</p>
      <p class="spazio-sopra">
        <button class="btn grande" id="btn-richiesta">Richiedi SocialBot</button>
      </p>
    </div>`;
}

function vistaPending() {
  return `
    <div class="carta">
      <h2>Richiesta inviata! ⏳</h2>
      <p>andryxify deve approvarti. Torna qui più tardi: quando sarai abilitato
      troverai la tua dashboard completa.</p>
    </div>`;
}

function vistaDisabilitato() {
  return `
    <div class="carta">
      <h2>Accesso disabilitato 😴</h2>
      <p>Il tuo accesso ad SocialBot è al momento disabilitato da andryxify.
      Se pensi sia un errore, contattalo.</p>
    </div>`;
}

// ------------------------------------------------------------------ piattaforma streamer

// Le schede raggruppate per area logica: invece di 11 bottoni in fila (troppo
// dispersivi) mostriamo poche categorie chiare e, dentro ognuna, le sue schede.
// NB: gli id delle schede restano identici a prima (li usano i pannelli).
const GRUPPI = [
  { id: 'panoramica', nome: 'Panoramica', icona: '🏠', schede: [
    ['stato', 'Stato'],
  ] },
  { id: 'personaggio', nome: 'Il personaggio', icona: '🧠', schede: [
    ['personalita', 'Personalità'],
    ['conoscenza', 'Conoscenza'],
    ['memoria', 'Memoria'],
  ] },
  { id: 'chat', nome: 'Chat & comandi', icona: '💬', schede: [
    ['moduli', 'Comandi'],
    ['regole', 'Regole'],
    ['giochi', 'Giochi'],
    ['effetti', 'Effetti & suoni'],
  ] },
  { id: 'diretta', nome: 'Durante la diretta', icona: '🔴', schede: [
    ['clip', 'Clip'],
    ['ascolto', 'Ascolto vocale'],
  ] },
  { id: 'notifiche', nome: 'Notifiche', icona: '🔔', schede: [
    ['notifiche', 'Notifiche'],
  ] },
];

// Area riservata all'operatore (andryxify): compare come scheda a sé SOLO per
// l'admin, così il pannello "Anima" non è più sempre in fondo a ogni scheda.
const GRUPPO_ADMIN = { id: 'admin', nome: 'Admin', icona: '👑', schede: [['admin', 'Admin']] };

// L'elenco effettivo dei gruppi: aggiunge l'area Admin se sei l'operatore.
function elencoGruppi() {
  return stato.isAdmin ? GRUPPI.concat([GRUPPO_ADMIN]) : GRUPPI;
}

// Icone della navigazione: SVG a tratto (stile "line icon"), una per scheda.
// Niente emoji: monocromatiche, ereditano il colore del testo → look pulito.
const _ico = (d) => `<svg class="lat-svg" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONA = {
  stato:       _ico('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11h14V9"/><path d="M9.5 20v-6h5v6"/>'),
  personalita: _ico('<path d="M12 3c.35 3.8 1.4 4.85 5 5.2-3.6.35-4.65 1.4-5 5.2-.35-3.8-1.4-4.85-5-5.2 3.6-.35 4.65-1.4 5-5.2Z"/><path d="M18.5 15c.15 1.6.6 2.05 2.2 2.2-1.6.15-2.05.6-2.2 2.2-.15-1.6-.6-2.05-2.2-2.2 1.6-.15 2.05-.6 2.2-2.2Z"/>'),
  conoscenza:  _ico('<path d="M5 4.5h11a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2Z"/><path d="M9 4.5v15"/>'),
  memoria:     _ico('<path d="M4 21V4"/><path d="M4 21h16"/><path d="M8.5 21v-6"/><path d="M13 21V9"/><path d="M17.5 21v-9"/>'),
  moduli:      _ico('<rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="M7.5 9.5 10.5 12l-3 2.5"/><path d="M13 15h4"/>'),
  regole:      _ico('<path d="M12 3.2 19 6v5c0 4.8-3.4 7.8-7 8.8-3.6-1-7-4-7-8.8V6z"/>'),
  giochi:      _ico('<rect x="2" y="7.5" width="20" height="9" rx="4.5"/><path d="M7 11v3"/><path d="M5.5 12.5h3"/><circle cx="16" cy="11.5" r=".9" fill="currentColor" stroke="none"/><circle cx="18" cy="13.5" r=".9" fill="currentColor" stroke="none"/>'),
  effetti:     _ico('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9.5a4 4 0 0 1 0 5"/>'),
  clip:        _ico('<rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="M8 5v14"/><path d="M16 5v14"/><path d="M3 9.5h5"/><path d="M16 9.5h5"/><path d="M3 14.5h5"/><path d="M16 14.5h5"/>'),
  ascolto:     _ico('<rect x="9" y="3" width="6" height="10.5" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><path d="M12 17v4"/>'),
  notifiche:   _ico('<path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5 2 6H4c.5-1 2-2 2-6"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>'),
  admin:       _ico('<path d="M4 8.5 7.5 16h9L20 8.5l-4.3 3L12 5 8.3 11.5z"/><path d="M7.5 19h9"/>'),
};

// Descrizioni brevi mostrate nell'intestazione di pagina di ogni sezione.
const DESC = {
  stato: 'Accendi il bot e controlla che sia connesso alla tua chat.',
  personalita: 'Il tono e il carattere con cui il bot parla in chat.',
  conoscenza: 'Cosa sa il bot su di te e sui tuoi contenuti.',
  memoria: 'Le statistiche della chat e cosa il bot ricorda.',
  moduli: 'Crea comandi e automazioni per la tua community.',
  regole: 'Moderazione automatica: filtri e antispam.',
  giochi: 'Mini-giochi, monete e classifiche per la chat.',
  effetti: 'Suoni ed effetti da lanciare in chat o in overlay.',
  clip: 'Clip automatiche nei momenti di hype.',
  ascolto: 'Comanda il bot a voce mentre streammi.',
  notifiche: 'Avvisi su Telegram e TikTok quando vai in diretta.',
  admin: 'Gestione streamer e anima condivisa del bot.',
};

// Ritrova area + titolo di una scheda per l'intestazione di pagina. Per le aree
// a scheda singola (Panoramica, Notifiche, Admin) il titolo è il nome dell'area
// stessa e non mostriamo l'occhiello (combacia con la voce del menu).
function infoScheda(id) {
  for (const g of elencoGruppi()) {
    const s = g.schede.find(([sid]) => sid === id);
    if (s) return g.schede.length === 1 ? { area: '', titolo: g.nome } : { area: g.nome, titolo: s[1] };
  }
  return { area: '', titolo: id };
}

// Freccetta delle sezioni richiudibili (ruota quando la sezione è chiusa).
const CHEVRON = '<svg class="lat-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

// Costruisce la navigazione della sidebar: ogni voce ha icona + nome. Le aree a
// scheda singola sono voci dirette; quelle con più schede diventano una SEZIONE
// richiudibile (l'etichetta apre/chiude con animazione). Tutte cliccabili.
function navLateraleHtml() {
  const voce = (id, nome) => {
    const att = id === schedaAttiva;
    // la voce attiva porta la "pillola" (elemento condiviso della view transition)
    return `<button class="lat-item${att ? ' attiva' : ''}" data-scheda="${id}">${att ? '<span class="lat-pill"></span>' : ''}${ICONA[id] || ''}<span>${nome}</span></button>`;
  };
  return elencoGruppi().map((g) => {
    if (g.schede.length === 1) return voce(g.schede[0][0], g.nome);
    const chiuso = gruppiChiusi.has(g.id);
    const voci = g.schede.map(([id, nome]) => voce(id, nome)).join('');
    return `<div class="lat-gruppo${chiuso ? ' chiuso' : ''}" data-gruppo="${g.id}">
      <button class="lat-label" data-toggle="${g.id}" aria-expanded="${chiuso ? 'false' : 'true'}">${g.nome}${CHEVRON}</button>
      <div class="lat-voci"><div>${voci}</div></div>
    </div>`;
  }).join('');
}

// Aggiorna l'intestazione di pagina (occhiello area + titolo + descrizione)
// in base alla scheda attiva. Vuota se non c'è navigazione.
function aggiornaTestataPagina() {
  const el = document.getElementById('pagina-testata');
  if (!el) return;
  if (!document.body.classList.contains('con-nav')) { el.innerHTML = ''; return; }
  const { area, titolo } = infoScheda(schedaAttiva);
  const desc = DESC[schedaAttiva] || '';
  el.innerHTML =
    `${area ? `<div class="pt-occhiello">${esc(area)}</div>` : ''}` +
    `<h1>${titoloParole(titolo)}</h1>` +
    `${desc ? `<p>${esc(desc)}</p>` : ''}`;
}

// Divide il titolo in parole avvolte per la rivelazione "parola per parola":
// ognuna scivola dal basso con un ritardo progressivo (--wd). `off` sfasa il
// ritardo per continuare la cascata su più segmenti (es. titolo + accento).
function titoloParole(t, off = 0) {
  return esc(t).split(/\s+/).filter(Boolean)
    .map((w, i) => `<span class="pt-parola" style="--wd:${40 + (off + i) * 60}ms"><i>${w}</i></span>`)
    .join(' ');
}

function vistaPiattaforma() {
  return `
    ${pannelloStato()}
    ${pannelloPersonalita()}
    ${pannelloConoscenza()}
    ${pannelloClip()}
    ${pannelloAscolto()}
    ${pannelloEffetti()}
    ${pannelloGiochi()}
    ${pannelloNotifiche()}
    ${pannelloModuli()}
    ${pannelloRegole()}
    ${pannelloMemoria()}
    ${stato.isAdmin ? pannello('admin', vistaAdminContenuto()) : ''}`;
}

function pannello(id, contenuto) {
  return `<section class="pannello-scheda${id === schedaAttiva ? ' visibile' : ''}" id="scheda-${id}">${contenuto}</section>`;
}

// --- scheda Stato -------------------------------------------------------

function pannelloStato() {
  const login = stato.user.login;
  const inChat = (stato.status?.channels || []).includes(login);
  const pre = stato.preaddestramento || {};
  const sImp = impostazioni();
  const proprietario = stato.ruolo !== 'moderatore';

  // Banner per i moderatori: chiarisce cosa possono fare e cosa no.
  const bannerMod = proprietario ? '' : `
    <div class="carta evidenziata">
      <h2>Stai gestendo il canale di @${esc(stato.gestisce?.streamer || login)} 🛠️</h2>
      <p>Sei entrato come <strong class="primo-piano">moderatore</strong>: puoi occuparti di comandi, moduli,
      effetti, giochi, notifiche, regole e memoria. Le cose da proprietario — permessi Twitch, elenco moderatori
      e passkey — restano a chi possiede il canale.</p>
    </div>`;

  // La card "concedi permessi" la vede solo il proprietario (un mod non li tocca).
  const cardPermessi = (!proprietario || stato.permessiOk) ? '' : `
    <div class="carta evidenziata">
      <h2>Attiva il bot: concedi i permessi 🔑</h2>
      <p>Per funzionare, SocialBot <strong class="primo-piano">leggerà e scriverà nella tua chat
      con il tuo account</strong>, creerà clip e vedrà follow e sub. Nient'altro.</p>
      <p class="spazio-sopra"><a class="btn grande" href="/auth/permessi">Concedi i permessi su Twitch</a></p>
    </div>`;

  return pannello('stato', `
    ${bannerMod}${cardPermessi}
    <div class="carta">
      <h2>Il tuo bot</h2>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="toggle-bot" ${stato.streamer.botEnabled ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-bot">${stato.streamer.botEnabled ? 'Bot acceso' : 'Bot spento'}</span>
        ${inChat
          ? '<span class="badge verde">● in chat adesso</span>'
          : '<span class="badge">○ non connesso</span>'}
        ${stato.permessiOk ? '<span class="badge viola">permessi ok</span>' : '<span class="badge rosso">permessi mancanti</span>'}
      </div>

      ${proprietario ? `
      <p class="spazio-sopra"><strong class="primo-piano">Permessi:</strong>
        ${stato.permessiOk ? '<span class="badge verde">✓ chat</span>' : '<span class="badge rosso">✗ chat</span>'}
        ${stato.vipOk ? '<span class="badge verde">✓ VIP</span>' : '<span class="badge giallo">VIP da concedere</span>'}
        ${stato.moderazioneOk ? '<span class="badge verde">✓ moderazione</span>' : '<span class="badge giallo">moderazione da concedere</span>'}
        ${(!stato.permessiOk || !stato.vipOk || !stato.moderazioneOk)
          ? '<a class="btn secondario mini" href="/auth/permessi">Concedi i permessi</a>'
          : ''}
      </p>
      <p class="suggerimento">La <strong class="primo-piano">chat</strong> serve per far parlare il bot,
      <strong class="primo-piano">VIP</strong> per assegnarli a voce/premi, <strong class="primo-piano">moderazione</strong>
      per l'antispam. Concedendoli abiliti anche VIP e antispam in un colpo solo.</p>` : `
      <p class="suggerimento spazio-sopra">Permessi del bot: ${stato.permessiOk ? '<span class="badge verde">✓ chat attiva</span>' : '<span class="badge rosso">chat non attiva</span>'} — li gestisce il proprietario del canale.</p>`}

      <p class="suggerimento spazio-sopra">Spegnerlo non cancella nulla: quando lo riaccendi riparte da dove era rimasto.</p>

      <label class="campo spazio-sopra" for="sel-modalita">Quando dev'essere attivo</label>
      <select id="sel-modalita">
        <option value="sempre" ${sImp.modalita === 'sempre' ? 'selected' : ''}>Sempre (24/7)</option>
        <option value="live" ${sImp.modalita === 'live' ? 'selected' : ''}>Solo quando sei in diretta</option>
        <option value="manuale" ${sImp.modalita === 'manuale' ? 'selected' : ''}>Manuale (decidi tu con l'interruttore)</option>
      </select>
      <p class="suggerimento">
        <strong class="primo-piano">24/7</strong>: sempre in chat. ·
        <strong class="primo-piano">Quando sei live</strong>: entra da solo quando parte la diretta ed esce a fine stream. ·
        <strong class="primo-piano">Manuale</strong>: comandi tu con l'interruttore qui sopra.
      </p>
      <p><button class="btn secondario" id="btn-salva-modalita">Salva modalità</button></p>
    </div>
    <div class="carta">
      <h2>Pre-addestramento 📚</h2>
      <p>SocialBot legge il tuo profilo su andryxify.it per conoscerti prima ancora di entrare in chat.</p>
      <p class="spazio-sopra">
        Ultima lettura: <strong class="primo-piano">${esc(dataIt(pre.preaddestramento_ts))}</strong>
        · voci di conoscenza: <strong class="primo-piano">${stato.knowledgeCount}</strong>
      </p>
      ${pre.preaddestramento_esito ? `<p class="nota-lettura">${esc(pre.preaddestramento_esito)}</p>` : ''}
      <p class="spazio-sopra">
        <button class="btn secondario" id="btn-pretrain">Ri-leggi il mio profilo andryxify.it</button>
        <span id="esito-pretrain" class="suggerimento"></span>
      </p>
    </div>
    ${proprietario ? `
    <div class="carta">
      <h2>App installabile & Passkey 📱🔑</h2>
      <p>Installa la dashboard <strong class="primo-piano">come app</strong> sul telefono o sul PC, e crea una
      <strong class="primo-piano">passkey</strong> (impronta, volto o PIN): così rientri al volo, in modo sicuro,
      <strong class="primo-piano">senza ripassare ogni volta dal sito</strong>.</p>
      <p class="spazio-sopra">
        <button class="btn secondario" id="btn-installa">Installa l'app</button>
        <button class="btn" id="btn-crea-passkey">Crea una passkey</button>
      </p>
      <p class="suggerimento">Su iPhone/iPad: apri in Safari → Condividi → “Aggiungi a Home”. Su Android/PC (Chrome):
      usa il bottone qui sopra o l’icona “installa” nella barra indirizzi.</p>
      <h3>Le tue passkey</h3>
      <ul class="lista-voci" id="lista-passkey"><li class="vuoto">Caricamento…</li></ul>
    </div>
    <div class="carta">
      <h2>Moderatori 👥</h2>
      <p>Fai aiutare qualcuno di cui ti fidi a gestire il bot. Gli mandi un <strong class="primo-piano">link
      d'invito</strong>: accede con Twitch (così sappiamo che è davvero lui) e può occuparsi di tutto,
      <strong class="primo-piano">tranne</strong> le cose da proprietario — permessi Twitch, questo elenco e le passkey.</p>
      <label class="campo" for="inp-mod-login">Username Twitch del moderatore</label>
      <div class="riga-flessibile">
        <span class="suggerimento">@</span>
        <input type="text" id="inp-mod-login" placeholder="nomeutente" autocomplete="off">
        <button class="btn" id="btn-invita-mod">Crea invito</button>
      </div>
      <div id="invito-creato"></div>
      <h3>I tuoi moderatori</h3>
      <ul class="lista-voci" id="lista-moderatori"><li class="vuoto">Caricamento…</li></ul>
    </div>` : ''}`);
}

// --- scheda Personalità -------------------------------------------------

function pannelloPersonalita() {
  const s = impostazioni();
  const perc = Math.round(s.spontaneita * 100);
  return pannello('personalita', `
    <div class="carta">
      <h2>Personalità 🎭</h2>
      <p>Decidi come parla il bot: ricorda che in chat appare <strong class="primo-piano">a nome tuo</strong>.</p>

      <label class="campo" for="sel-tono">Tono</label>
      <select id="sel-tono">
        <option value="scherzoso" ${s.tono === 'scherzoso' ? 'selected' : ''}>Scherzoso — battute e ironia</option>
        <option value="amichevole" ${s.tono === 'amichevole' ? 'selected' : ''}>Amichevole — caloroso e tranquillo</option>
        <option value="serio" ${s.tono === 'serio' ? 'selected' : ''}>Serio — sobrio e diretto</option>
      </select>

      <label class="campo" for="rng-spontaneita">Chat autonoma: <span id="val-spontaneita">${perc}%</span></label>
      <input type="range" id="rng-spontaneita" min="0" max="50" step="1" value="${perc}">
      <p class="suggerimento">Quanto partecipa da sola alla conversazione, come una persona.
      0 = solo se la chiami; alto = molto chiacchierona.</p>

      <div class="riga-check">
        <input type="checkbox" id="chk-menzioni" ${s.rispostaMenzioni ? 'checked' : ''}>
        <label for="chk-menzioni">Rispondi quando mi nominano in chat</label>
      </div>

      <div class="riga-check">
        <input type="checkbox" id="chk-proattivo" ${s.proattivo ? 'checked' : ''}>
        <label for="chk-proattivo">Personalità proattiva — ogni tanto si fa vivo da solo</label>
      </div>

      <div class="riga-check">
        <input type="checkbox" id="chk-adatta" ${s.adattaCanale ? 'checked' : ''}>
        <label for="chk-adatta">Adatta la personalità al mio canale (in automatico)</label>
      </div>
      <p class="suggerimento">SocialBot ha un carattere suo condiviso, ma qui puoi renderlo coerente
      con il tuo canale: col tono qui sopra (a mano) e lasciandolo adattare da solo al tuo stile.</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-ialocale" ${s.iaLocale ? 'checked' : ''}>
        <label for="chk-ialocale">Risposte intelligenti (IA locale auto-addestrata)</label>
      </div>
      <p class="suggerimento">Un piccolo modello che gira <strong class="primo-piano">sul server, senza servizi a pagamento</strong>:
      impara dalla tua chat, capisce le domande anche se scritte in modo diverso e risponde in modo naturale —
      così devi scrivere molte meno risposte a mano. Più la chat vive, più migliora.</p>

      <label class="campo" for="txt-frasi">Le tue frasi / battute (una per riga)</label>
      <textarea id="txt-frasi" placeholder="es. GG raga, si vola!&#10;chi non segue il canale paga da bere">${esc(s.frasi.join('\n'))}</textarea>
      <p class="suggerimento">Il bot le userà ogni tanto per suonare davvero come te. Max 50 frasi da 200 caratteri.</p>

      <p class="spazio-sopra"><button class="btn" id="btn-salva-personalita">Salva</button></p>
    </div>`);
}

// --- scheda Conoscenza --------------------------------------------------

function pannelloConoscenza() {
  return pannello('conoscenza', `
    <div class="carta">
      <h2>Insegnagli qualcosa ✍️</h2>
      <p>Domanda (o parole chiave) e risposta: quando in chat spunta l'argomento, il bot saprà cosa dire.</p>
      <label class="campo" for="inp-domanda">Domanda / parole chiave</label>
      <input type="text" id="inp-domanda" placeholder="es. che pc usi? / setup / configurazione">
      <label class="campo" for="inp-risposta">Risposta</label>
      <input type="text" id="inp-risposta" placeholder="es. Gioco su un Ryzen 7 con una 4070, trovi tutto su andryxify.it!">
      <p class="spazio-sopra"><button class="btn" id="btn-aggiungi-conoscenza">Aggiungi</button></p>
    </div>
    <div class="carta">
      <h2>Cosa sa il bot 🧠</h2>
      <p>🌐 dal sito &nbsp;·&nbsp; ✍️ tua &nbsp;·&nbsp; 💬 imparata dalla chat</p>
      <ul class="lista-voci" id="lista-conoscenza"><li class="vuoto">Caricamento…</li></ul>
    </div>`);
}

// --- scheda Clip --------------------------------------------------------

function pannelloClip() {
  const s = impostazioni();
  return pannello('clip', `
    <div class="carta">
      <h2>Clip automatiche 🎬</h2>
      <div class="riga-check">
        <input type="checkbox" id="chk-clip" ${s.clipAuto ? 'checked' : ''}>
        <label for="chk-clip">Crea clip da solo nei momenti di hype</label>
      </div>
      <label class="campo" for="num-soglia">Soglia di hype (messaggi al minuto)</label>
      <div class="riga-flessibile">
        <input type="number" id="num-soglia" min="5" max="200" value="${s.clipAutoSoglia}">
        <span class="suggerimento">Quando la chat supera questo ritmo, il bot capisce che sta succedendo
        qualcosa di bello e salva una clip. Più bassa = più clip.</span>
      </div>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-clip">Salva</button></p>
    </div>
    <div class="carta">
      <h2>Ultime clip</h2>
      <ul class="lista-voci" id="lista-clip"><li class="vuoto">Caricamento…</li></ul>
    </div>`);
}

// --- scheda Ascolto live ------------------------------------------------
// Due strade per creare clip "a voce": dal server (audio della live) e dal PC (microfono).

function pannelloAscolto() {
  const s = impostazioni();
  let sens = Number(s.ascoltoSensibilita);
  sens = Number.isFinite(sens) ? Math.min(10, Math.max(1, Math.round(sens))) : 5;
  const inAscolto = (stato.status?.ascoltando || []).includes(stato.user.login);

  return pannello('ascolto', `
    <div class="carta">
      <h2>Momenti salienti (dal server) 🎧</h2>
      <p>Il bot ascolta l'audio della tua live e crea una clip da solo quando "esplode": urla, risate, hype.</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="toggle-ascolto" ${s.ascoltoLive ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-ascolto">${s.ascoltoLive ? 'Ascolto acceso' : 'Ascolto spento'}</span>
        ${inAscolto
          ? '<span class="badge verde">● in ascolto ora</span>'
          : '<span class="badge">○ non in ascolto</span>'}
      </div>
      <label class="campo" for="rng-ascolto">Sensibilità: <span id="val-ascolto">${sens}</span></label>
      <input type="range" id="rng-ascolto" min="1" max="10" step="1" value="${sens}">
      <p class="suggerimento">Più alto = più clip (prende anche i momenti meno intensi). Più basso = solo i picchi veri.</p>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-ascolto">Salva</button></p>
      <p class="suggerimento spazio-sopra">Consuma risorse del server: è limitato a pochi canali live insieme.
      C'è un piccolo ritardo (~15-30s) dovuto a Twitch, ma le clip prendono comunque il momento.</p>
    </div>

    <div class="carta">
      <h2>Comando vocale 🎙️</h2>
      <p>I comandi vocali funzionano <strong class="primo-piano">nel browser</strong>, senza installare niente:
      apri la pagina di ascolto, premi Avvia, e quando dici una parola chiave il bot fa quello che hai impostato
      nei Moduli.</p>
      <p class="spazio-sopra">
        <a class="btn grande" href="/voce.html" target="_blank" rel="noopener">🎙️ Apri l'ascolto vocale</a>
      </p>
      <p class="suggerimento spazio-sopra">Tienila aperta mentre streammi. Funziona su Chrome o Edge (Mac e Windows).</p>
      <p class="suggerimento">I comandi vocali si creano e modificano in
      <strong class="primo-piano">Chat &amp; comandi → Comandi</strong> (innesco "Comando vocale").</p>
    </div>`);
}

// --- scheda Effetti & Suoni ---------------------------------------------

function pannelloEffetti() {
  return pannello('effetti', `
    <div class="carta">
      <h2>Overlay per OBS 🖥️</h2>
      <p>Aggiungi questo indirizzo in OBS come <strong class="primo-piano">Sorgenti → Browser</strong>,
      con larghezza <strong class="primo-piano">1920</strong>, altezza <strong class="primo-piano">1080</strong> e sfondo trasparente.</p>
      <div class="riga-flessibile spazio-sopra">
        <input type="text" id="inp-overlay-url" class="campo-largo" readonly value="" placeholder="caricamento…">
        <button class="btn secondario" id="btn-copia-overlay">Copia</button>
      </div>
      <p class="suggerimento">Tienilo per te: chi ha questo link può far comparire effetti nel tuo overlay.</p>
    </div>

    <div class="carta">
      <h2>Carica un effetto ✨</h2>
      <p>Audio, immagini o brevi video. Ogni file viene <strong class="primo-piano">super-compresso</strong>
      in automatico, così l'overlay resta leggero.</p>

      <label class="campo" for="eff-file">File (audio / immagine / video)</label>
      <input type="file" id="eff-file" accept="audio/*,image/*,video/*">

      <label class="campo" for="eff-comando">Comando in chat</label>
      <div class="riga-flessibile">
        <span class="prefisso-cmd">!</span>
        <input type="text" id="eff-comando" class="campo-largo" placeholder="airhorn" maxlength="24">
      </div>
      <p class="suggerimento">Solo lettere minuscole, numeri e "_". Chi lo scrive in chat fa partire l'effetto.</p>

      <div class="griglia-campi spazio-sopra">
        <div>
          <label class="campo" for="eff-tier">Chi può usarlo</label>
          <select id="eff-tier">
            <option value="tutti">Tutti</option>
            <option value="sub">Solo sub</option>
            <option value="vip">Solo VIP</option>
            <option value="mod">Solo mod</option>
          </select>
        </div>
        <div>
          <label class="campo" for="eff-cooldown">Cooldown (s)</label>
          <input type="number" id="eff-cooldown" min="0" max="3600" value="10">
        </div>
        <div>
          <label class="campo" for="eff-volume">Volume (%)</label>
          <input type="number" id="eff-volume" min="0" max="100" value="80">
        </div>
        <div>
          <label class="campo" for="eff-durata">Durata a schermo (ms)</label>
          <input type="number" id="eff-durata" min="500" max="15000" value="5000">
        </div>
      </div>
      <p class="spazio-sopra">
        <button class="btn" id="btn-carica-effetto">Carica effetto</button>
        <span id="esito-effetto" class="suggerimento"></span>
      </p>
    </div>

    <div class="carta">
      <h2>I tuoi effetti 🎛️</h2>
      <ul class="lista-voci" id="lista-effetti"><li class="vuoto">Caricamento…</li></ul>
    </div>`);
}

// --- scheda Moduli ------------------------------------------------------
// Automazioni componibili col modello QUANDO → SE → ALLORA.

function pannelloModuli() {
  const chipsRapido = ['$user', '$touser', '$canale', '$uptime', '$gioco', '$count(morti)', '$random(1,100)']
    .map((v) => `<button type="button" class="chip-var" data-qc="${esc(v)}">${esc(v)}</button>`).join('');
  return pannello('moduli', `
    <div class="carta">
      <h2>Comando rapido ⚡</h2>
      <p>Il modo più veloce: scrivi il <strong class="primo-piano">nome</strong> e <strong class="primo-piano">cosa
      deve rispondere</strong>. Fatto — niente altro da compilare.</p>
      <div class="riga-flessibile">
        <span class="prefisso-cmd">!</span>
        <input type="text" id="qc-nome" class="campo-largo" placeholder="social" maxlength="24">
      </div>
      <label class="campo" for="qc-risposta">Risposta</label>
      <textarea id="qc-risposta" placeholder="es. I miei social li trovi su andryxify.it/u/$canale ✨"></textarea>
      <div class="chip-vars" id="qc-chips">${chipsRapido}</div>
      <p class="spazio-sopra">
        <button class="btn" id="btn-qc">Aggiungi comando</button>
        <span class="suggerimento">Per condizioni, eventi, timer, effetti o webhook usa <strong>Nuovo modulo</strong> qui sotto.</span>
      </p>
    </div>

    <div class="carta">
      <h2>Moduli 🧩</h2>
      <p>Automazioni avanzate: <strong class="primo-piano">QUANDO</strong> succede qualcosa,
      <strong class="primo-piano">SE</strong> valgono certe condizioni, <strong class="primo-piano">ALLORA</strong>
      il bot fa una o più azioni.</p>
      <p class="spazio-sopra"><button class="btn secondario" data-nuovo-modulo>➕ Nuovo modulo (avanzato)</button></p>
      <p class="suggerimento spazio-sopra">Non sai da dove partire? Scegli un modello pronto e modificalo:</p>
      <div class="modelli-pronti">
        <button class="modello-pronto" data-modello="saluto">Saluto</button>
        <button class="modello-pronto" data-modello="timer">Timer annuncio</button>
        <button class="modello-pronto" data-modello="social">Social</button>
        <button class="modello-pronto" data-modello="morti">Contatore morti</button>
        <button class="modello-pronto" data-modello="voce">Comando vocale: clippa</button>
        <button class="modello-pronto" data-modello="webhook">Collega il mio bot (webhook)</button>
      </div>
    </div>

    <div class="carta">
      <h2>I tuoi moduli 📋</h2>
      <ul id="lista-moduli" class="lista-moduli"><li class="vuoto">Caricamento…</li></ul>
    </div>

    <div id="editor-modulo"></div>

    <div class="carta">
      <h2>Connettori avanzati 🔌</h2>
      <p>Per far dire o fare qualcosa ad SocialBot <strong class="primo-piano">da un tuo servizio esterno</strong>
      (il bot custom che già hai): chiama l'URL qui sotto con la tua chiave.</p>
      <div id="connettori-moduli"><p class="vuoto">Caricamento…</p></div>
    </div>`);
}

// modelli pronti: precompilano l'editor, l'utente poi salva
function modelloPronto(nome) {
  const cond = () => ({ tier: 'tutti', cooldown: 0, probabilita: 100, soloLive: false, soloOffline: false });
  switch (nome) {
    case 'saluto':
      return { id: null, nome: 'Saluto', attivo: true,
        trigger: { tipo: 'comando', comando: 'ciao', alias: [] }, condizioni: cond(),
        azioni: [{ tipo: 'messaggio', testo: 'Ciao $user! 👋' }] };
    case 'timer':
      return { id: null, nome: 'Timer annuncio', attivo: true,
        trigger: { tipo: 'timer', minuti: 15, minMessaggi: 10 }, condizioni: cond(),
        azioni: [{ tipo: 'messaggio', testo: 'Ricordati di seguire il canale! 💜' }] };
    case 'social':
      return { id: null, nome: 'Social', attivo: true,
        trigger: { tipo: 'comando', comando: 'social', alias: [] }, condizioni: cond(),
        azioni: [{ tipo: 'messaggio', testo: 'I miei social li trovi su andryxify.it/u/$canale ✨' }] };
    case 'morti':
      return { id: null, nome: 'Contatore morti', attivo: true,
        trigger: { tipo: 'comando', comando: 'morte', alias: [] }, condizioni: { ...cond(), tier: 'mod' },
        azioni: [
          { tipo: 'contatore', nome: 'morti', op: 'incrementa', valore: 0 },
          { tipo: 'messaggio', testo: 'Morti oggi: $count(morti) 💀' },
        ] };
    case 'voce':
      return { id: null, nome: 'Comando vocale: clippa', attivo: true,
        trigger: { tipo: 'voce', frasi: ['clippa', 'salva la clip'] }, condizioni: cond(),
        azioni: [{ tipo: 'clip' }] };
    case 'webhook':
      return { id: null, nome: 'Collega il mio bot', attivo: true,
        trigger: { tipo: 'comando', comando: 'chiedi', alias: [] }, condizioni: cond(),
        azioni: [{ tipo: 'webhook', url: '', usaRisposta: true }] };
    default:
      return null;
  }
}

// --- scheda Giochi ------------------------------------------------------

function pannelloGiochi() {
  const s = impostazioni();
  return pannello('giochi', `
    <div class="carta">
      <h2>Minigiochi 🎮</h2>
      <p>Giochi in chat per la tua community, con delle <strong class="primo-piano">monete</strong>
      (punti fedeltà) che si guadagnano chiacchierando.</p>

      <div class="riga-check">
        <input type="checkbox" id="chk-giochi" ${s.giochi ? 'checked' : ''}>
        <label for="chk-giochi">Attiva i minigiochi in chat</label>
      </div>

      <label class="campo" for="inp-monete">Come si chiamano le monete</label>
      <input type="text" id="inp-monete" maxlength="20" value="${esc(s.nomeMonete)}" placeholder="es. monete, punti, gemme…">

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-promo" ${s.promoSocial ? 'checked' : ''}>
        <label for="chk-promo">Promo social automatica — ogni tanto condivide da solo i tuoi link</label>
      </div>
      <p class="suggerimento">Nei momenti giusti (chat viva, dopo un raid/sub) il bot ricorda i tuoi social
      presi dal profilo andryxify.it — con calma, mai spam.</p>

      <p class="spazio-sopra"><button class="btn" id="btn-salva-giochi">Salva</button></p>
    </div>
    <div class="carta">
      <h2>Comandi dei giochi</h2>
      <ul class="lista-voci">
        <li><div class="testo-voce"><span class="domanda">!dado</span> <span class="risposta">tira un dado (anche !dado 2d20)</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!moneta</span> <span class="risposta">testa o croce</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!8ball &lt;domanda&gt;</span> <span class="risposta">la palla magica risponde</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!slot</span> <span class="risposta">slot machine (costa qualche moneta)</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!duello @nome</span> <span class="risposta">sfida un altro utente</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!trivia</span> <span class="risposta">domanda a sorpresa, il primo che risponde vince</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!monete</span> <span class="risposta">quante monete hai</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!classifica</span> <span class="risposta">i più ricchi del canale</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!giochi</span> <span class="risposta">elenco dei giochi</span></div></li>
      </ul>
    </div>
    <div class="carta">
      <h2>Classifica & VIP 🏆</h2>
      ${stato.vipOk ? '' : `<p class="suggerimento">⚠️ Per assegnare i VIP serve un permesso in più (aggiunto dopo).
        <a class="btn secondario mini" href="/auth/permessi">Concedi i permessi</a></p>`}
      <div class="riga-check">
        <input type="checkbox" id="chk-premiovip" ${s.premioVip.attivo ? 'checked' : ''}>
        <label for="chk-premiovip">Premio VIP automatico ai più affezionati</label>
      </div>
      <div class="riga-flessibile">
        <span class="suggerimento">Ogni</span>
        <select id="sel-premio-periodo">
          <option value="settimana" ${s.premioVip.periodo === 'settimana' ? 'selected' : ''}>settimana</option>
          <option value="mese" ${s.premioVip.periodo === 'mese' ? 'selected' : ''}>mese</option>
        </select>
        <span class="suggerimento">ai primi</span>
        <input type="number" id="num-premio-quanti" min="1" max="5" value="${Number(s.premioVip.quanti) || 1}">
      </div>
      <p class="suggerimento">Il bot dà il VIP (per la stessa durata) ai top ${esc(s.nomeMonete)}. Puoi anche darlo
      <strong class="primo-piano">a voce</strong> (Ascolto vocale → "vip a nome", default 1 settimana; di' "mese" per un mese)
      o in chat con <code>!vip @nome</code>.</p>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-premio">Salva premio</button></p>
      <h3>Classifica ${esc(s.nomeMonete)}</h3>
      <ul class="lista-voci" id="lista-classifica"><li class="vuoto">Caricamento…</li></ul>
      <h3>VIP a tempo attivi</h3>
      <ul class="lista-voci" id="lista-vip"><li class="vuoto">Caricamento…</li></ul>
    </div>

    <div class="carta">
      <h2>Giochi del sito andryxify.it 🎯</h2>
      <p>I giochi di andryxify.it (come <strong class="primo-piano">AGENTify</strong>) possono girare
      <strong class="primo-piano">direttamente dalla tua chat</strong> tramite SocialBot: i tuoi viewer scrivono i
      comandi (es. <code>!ag …</code>) e il bot risponde. Un solo bot in chat, niente da installare.</p>
      ${s.giochiSito.collegato
        ? '<p class="suggerimento"><span class="badge verde">✓ collegato al sito</span></p>'
        : '<p class="suggerimento"><span class="badge giallo">non ancora collegato</span> — entra nella dashboard passando da andryxify.it e il collegamento si attiva da solo.</p>'}
      <div class="riga-check">
        <input type="checkbox" id="chk-giochisito" ${s.giochiSito.attivo ? 'checked' : ''} ${s.giochiSito.collegato ? '' : 'disabled'}>
        <label for="chk-giochisito">Fai giocare la chat ai giochi del sito</label>
      </div>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-giochisito" ${s.giochiSito.collegato ? '' : 'disabled'}>Salva</button></p>
    </div>

    <div class="carta">
      <h2>Citazioni 💬</h2>
      <p>Le frasi memorabili della chat. In chat: <code>!cita</code> (a caso), <code>!cita 12</code> (una precisa),
      <code>!cita aggiungi &lt;testo&gt;</code> e <code>!cita rimuovi 12</code> (mod/streamer). Le gestisci anche da qui.</p>
      <div class="riga-flessibile">
        <input type="text" id="inp-citazione" maxlength="400" placeholder="una frase memorabile…">
        <button class="btn" id="btn-aggiungi-citazione">Aggiungi</button>
      </div>

      <details class="spazio-sopra">
        <summary style="cursor:pointer">📥 Importa citazioni (da x.la o altro)</summary>
        <p class="suggerimento">Il modo più sicuro: copia le tue citazioni e incollale qui, <strong class="primo-piano">una
        per riga</strong> — funziona da qualsiasi fonte (la tua pagina x.la, StreamElements, un file…). I doppioni li
        salto da solo.</p>
        <textarea id="txt-import-citazioni" rows="5" placeholder="una citazione per riga…"></textarea>
        <div class="riga-flessibile">
          <input type="text" id="inp-import-url" placeholder="…oppure incolla un link e provo a estrarle">
          <button class="btn secondario" id="btn-estrai-citazioni">Estrai dal link</button>
        </div>
        <p class="spazio-sopra"><button class="btn" id="btn-importa-citazioni">Importa quelle qui sopra</button></p>
      </details>

      <ul class="lista-voci" id="lista-citazioni"><li class="vuoto">Caricamento…</li></ul>
    </div>`);
}

// --- scheda Notifiche (Telegram) ---------------------------------------

function pannelloNotifiche() {
  const tg = stato.telegram || { configurato: false, gruppoOk: false, attivo: false, messaggio: '', botUsername: '', gruppo: '', pinLive: true };
  const tkc = impostazioni().tiktok || {};
  const msgDefault = '🔴 {nome} è in diretta!\n\n{titolo}\n🎮 {gioco}\n\n👉 {link}';
  return pannello('notifiche', `
    <div class="carta">
      <h2>Avviso "sono in diretta" su Telegram 📣</h2>
      <p>Collega il <strong class="primo-piano">tuo</strong> bot Telegram e il tuo gruppo: quando vai live,
      il bot avvisa i tuoi follower nel gruppo. Le chiavi sono tue e restano tue.</p>

      <ol class="passi">
        <li><strong>Crea il bot</strong>: su Telegram apri <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a>,
          scrivi <code>/newbot</code>, segui le istruzioni e copia il <em>token</em> che ti dà.</li>
        <li><strong>Incolla il token</strong> qui sotto e premi <em>Collega</em>.</li>
        <li><strong>Aggiungi il bot al tuo gruppo</strong>, scrivici <code>/collega</code> dentro, poi premi <em>Rileva gruppo</em>.</li>
      </ol>

      <label class="campo" for="inp-tg-token">Token del bot Telegram</label>
      <div class="riga-flessibile">
        <input type="text" id="inp-tg-token" placeholder="123456789:AA..." autocomplete="off"
          value="" ${tg.configurato ? 'disabled' : ''}>
        <button class="btn" id="btn-tg-token">${tg.configurato ? 'Collegato ✓' : 'Collega'}</button>
      </div>
      ${tg.configurato ? `<p class="suggerimento">Bot collegato: <strong class="primo-piano">@${esc(tg.botUsername || '?')}</strong></p>` : ''}

      ${tg.configurato ? `
      <div class="riga-flessibile spazio-sopra">
        <button class="btn secondario" id="btn-tg-rileva">Rileva gruppo</button>
        <span class="suggerimento">${tg.gruppoOk
          ? `Gruppo collegato: <strong class="primo-piano">${esc(tg.gruppo || '(gruppo)')}</strong> ✓`
          : 'Nessun gruppo ancora collegato.'}</span>
      </div>

      <label class="campo spazio-sopra" for="txt-tg-messaggio">Messaggio dell'avviso</label>
      <textarea id="txt-tg-messaggio" rows="5" placeholder="${esc(msgDefault)}">${esc(tg.messaggio || '')}</textarea>
      <p class="suggerimento">Segnaposto: <code>{nome}</code> <code>{titolo}</code> <code>{gioco}</code>
        <code>{spettatori}</code> <code>{link}</code>. Lascia vuoto per usare quello standard.</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-tg-attivo" ${tg.attivo ? 'checked' : ''} ${tg.gruppoOk ? '' : 'disabled'}>
        <label for="chk-tg-attivo">Avvisa il gruppo quando vado in diretta</label>
      </div>

      <div class="riga-check">
        <input type="checkbox" id="chk-tg-pin" ${tg.pinLive ? 'checked' : ''} ${tg.gruppoOk ? '' : 'disabled'}>
        <label for="chk-tg-pin">Fissa l'avviso in cima durante la live e rimuovilo quando stacco</label>
      </div>
      <p class="suggerimento">Per fissare l'avviso il bot dev'essere <strong>amministratore</strong> del gruppo
        con il permesso di <em>fissare i messaggi</em>. L'eliminazione a fine live funziona comunque.</p>

      <p class="spazio-sopra">
        <button class="btn" id="btn-tg-salva">Salva</button>
        <button class="btn secondario" id="btn-tg-prova" ${tg.gruppoOk ? '' : 'disabled'}>Manda una prova</button>
        <button class="btn pericolo mini" id="btn-tg-scollega">Scollega</button>
      </p>
      ` : ''}
    </div>

    ${tg.configurato ? `
    <div class="carta">
      <h2>Bot interattivo su Telegram 🤖</h2>
      <p>Con la <strong class="primo-piano">modalità interattiva</strong> il bot <strong>legge i messaggi</strong> del
      gruppo e risponde ai comandi. I comandi si creano in <strong>Chat &amp; comandi → Comandi</strong>:
      crea un modulo con innesco <em>Comando</em> e spunta <strong>«Abilita anche su Telegram»</strong>
      (su Telegram funziona anche senza <code>!</code>). Valgono anche a voce dall'ascolto vocale.</p>

      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore"><input type="checkbox" id="chk-tg-interattivo" ${tg.interattivo ? 'checked' : ''}><span class="levetta"></span></label>
        <span class="etichetta-stato">Bot interattivo nel gruppo</span>
        ${tg.interattivo ? '<span class="badge verde">attivo</span>' : ''}
      </div>
      <p class="suggerimento">Il bot dev'essere <strong>nel gruppo</strong>. Da attivo, il gruppo si collega da solo:
      scrivi un messaggio qualsiasi nel gruppo e viene rilevato. Il tasto «Rileva gruppo» funziona solo da spento.
      Per far leggere al bot <strong>tutti</strong> i messaggi (comandi senza <code>/</code> e roster membri) disattiva la
      <em>privacy</em> su <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a>
      (<code>/setprivacy → Disable</code>); coi comandi <code>/comando</code> funziona comunque.</p>
    </div>

    <div class="carta">
      <h2>Auguri di compleanno 🎂</h2>
      <p>Il bot fa gli <strong class="primo-piano">auguri automatici</strong> nel gruppo il giorno del compleanno dei
      membri. Loro possono registrarsi da soli scrivendo <code>/compleanno 25/12</code> nel gruppo (serve il bot
      interattivo qui sopra), oppure li aggiungi tu qui sotto.</p>
      <div id="box-compleanni"><p class="vuoto">Caricamento…</p></div>
    </div>
    ` : ''}

    <div class="carta">
      <h2>Notifica live TikTok 🎵</h2>
      <p>Quando vai in diretta su <strong class="primo-piano">TikTok</strong>, avviso il gruppo Telegram
      (e, se vuoi, la chat Twitch). Su TikTok non esiste una chat-bot come su Twitch: qui facciamo la notifica.</p>

      <label class="campo" for="inp-tk-user">Il tuo username TikTok</label>
      <div class="riga-flessibile">
        <span class="suggerimento">@</span>
        <input type="text" id="inp-tk-user" placeholder="tuonome" value="${esc(tkc.username || '')}">
      </div>

      <label class="campo spazio-sopra" for="txt-tk-messaggio">Messaggio dell'avviso TikTok</label>
      <textarea id="txt-tk-messaggio" rows="4" placeholder="${esc('🎵 {nome} è in diretta su TikTok!\n\n👉 {link}')}">${esc(tkc.messaggio || '')}</textarea>
      <p class="suggerimento">Segnaposto: <code>{nome}</code> <code>{link}</code> <code>{username}</code>. Lascia vuoto per usare quello standard.
        Se hai attivato <em>«Fissa l'avviso…»</em> qui sopra, l'avviso TikTok viene fissato a live attiva ed eliminato quando stacchi.</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-tk-attivo" ${tkc.attivo ? 'checked' : ''}>
        <label for="chk-tk-attivo">Rileva in automatico quando vado live su TikTok</label>
      </div>
      <p class="suggerimento">⚠️ Il rilevamento automatico è <em>best-effort</em> (TikTok non ha un'API ufficiale):
      può non essere sempre puntuale. Per la massima affidabilità usa il webhook qui sotto.</p>

      <div class="riga-check">
        <input type="checkbox" id="chk-tk-chat" ${tkc.annunciaChat ? 'checked' : ''}>
        <label for="chk-tk-chat">Annuncia anche nella chat Twitch</label>
      </div>

      <p class="spazio-sopra">
        <button class="btn" id="btn-tk-salva">Salva</button>
        <button class="btn secondario" id="btn-tk-prova">Manda una prova</button>
      </p>

      <hr class="separatore">
      <p class="suggerimento"><strong class="primo-piano">Via affidabile (webhook):</strong> collega una tua automazione
      (IFTTT/Zapier/Shortcut) all'evento "vado live su TikTok" e falle chiamare in POST:</p>
      <p><code>POST ${esc(location.origin)}/api/ext/${esc(stato.user.login)}</code></p>
      <p class="suggerimento">con header <code>Authorization: Bearer LA-TUA-CHIAVE-API</code> e corpo
      <code>{"azione":"tiktok-live"}</code>. La chiave API la trovi in <strong>Chat &amp; comandi → Comandi</strong>.</p>
    </div>`);
}

// --- scheda Regole ------------------------------------------------------

function pannelloRegole() {
  const s = impostazioni();
  const a = s.antispam || {};
  const sel = (v, def) => v === undefined ? def : v;   // default "acceso" per i booleani
  return pannello('regole', `
    <div class="carta">
      <h2>Parole vietate 🚫</h2>
      <p>Una per riga. Il bot <strong class="primo-piano">non le dirà mai</strong> e richiama chi le usa in chat.</p>
      <label class="campo" for="txt-vietate">Elenco parole vietate</label>
      <textarea id="txt-vietate" placeholder="una parola per riga">${esc(s.paroleVietate.join('\n'))}</textarea>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-regole">Salva</button></p>
    </div>

    <div class="carta">
      <h2>Antispam automatico 🛡️</h2>
      ${stato.moderazioneOk
        ? '<p class="suggerimento"><span class="badge verde">✓ permessi di moderazione attivi</span></p>'
        : `<p class="suggerimento">⚠️ Per eliminare i messaggi servono i permessi di moderazione (aggiunti dopo).
        <a class="btn secondario mini" href="/auth/permessi">Concedi i permessi</a></p>`}
      <p>Elimina da solo lo spam e, a chi insiste, dà un timeout crescente.
      <strong class="primo-piano">Mod, VIP e broadcaster sono sempre esenti.</strong></p>

      <div class="riga-check">
        <input type="checkbox" id="chk-as-attivo" ${a.attivo ? 'checked' : ''}>
        <label for="chk-as-attivo">Attiva l'antispam</label>
      </div>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-as-link" ${sel(a.link, true) ? 'checked' : ''}>
        <label for="chk-as-link">Blocca i link non autorizzati</label>
      </div>
      <div class="riga-flessibile">
        <span class="suggerimento">Possono postare link:</span>
        <select id="sel-as-linktier">
          <option value="mod" ${a.linkTier === 'mod' ? 'selected' : ''}>solo mod</option>
          <option value="vip" ${a.linkTier === 'vip' ? 'selected' : ''}>VIP e mod</option>
          <option value="sub" ${(a.linkTier || 'sub') === 'sub' ? 'selected' : ''}>sub, VIP e mod</option>
          <option value="tutti" ${a.linkTier === 'tutti' ? 'selected' : ''}>tutti (non bloccare)</option>
        </select>
      </div>
      <label class="campo" for="txt-as-whitelist">Domini sempre permessi (uno per riga)</label>
      <textarea id="txt-as-whitelist" placeholder="es. youtube.com&#10;instagram.com/tuonome">${esc((Array.isArray(a.whitelist) ? a.whitelist : []).join('\n'))}</textarea>
      <p class="suggerimento">Il tuo canale, le clip di Twitch e andryxify.it sono già permessi.</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-as-ripet" ${sel(a.ripetizioni, true) ? 'checked' : ''}>
        <label for="chk-as-ripet">Blocca copypasta / messaggi ripetuti</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-as-flood" ${sel(a.flood, true) ? 'checked' : ''}>
        <label for="chk-as-flood">Blocca il flood (troppi messaggi di fila)</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-as-caps" ${sel(a.maiuscole, true) ? 'checked' : ''}>
        <label for="chk-as-caps">Blocca i messaggi TUTTI MAIUSCOLI</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-as-menz" ${sel(a.menzioni, true) ? 'checked' : ''}>
        <label for="chk-as-menz">Blocca le valanghe di @menzioni</label>
      </div>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-as-timeout" ${sel(a.timeoutRecidivi, true) ? 'checked' : ''}>
        <label for="chk-as-timeout">Timeout crescente ai recidivi (1ª volta solo cancella, poi 1m, 5m, 10m)</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-as-avvisa" ${sel(a.avvisa, true) ? 'checked' : ''}>
        <label for="chk-as-avvisa">Avvisa in chat quando elimina</label>
      </div>

      <p class="spazio-sopra"><button class="btn" id="btn-salva-antispam">Salva antispam</button></p>
    </div>`);
}

// --- scheda Memoria & Statistiche --------------------------------------

function pannelloMemoria() {
  return pannello('memoria', `
    <div class="carta">
      <h2>Statistiche degli ultimi 7 giorni 📊</h2>
      <div class="griglia-stat" id="griglia-stat"><div class="vuoto">Caricamento…</div></div>
      <h3>Top chatters</h3>
      <ul class="lista-voci" id="lista-chatters"><li class="vuoto">Caricamento…</li></ul>
    </div>
    <div class="carta">
      <h2>La memoria del bot 🧠</h2>
      <p>Le "lezioni" che ha imparato osservando la tua chat e i fatti stabili che ricorda sul canale.</p>
      <p class="spazio-sopra"><button class="btn secondario" id="btn-carica-memoria">Mostra la memoria</button></p>
      <div id="contenitore-memoria"></div>
      <hr class="separatore">
      <p><strong class="primo-piano">Zona pericolosa.</strong> Azzera lezioni, ricordi sugli utenti, fatti
      e conoscenza imparata dalla chat. La conoscenza dal sito e quella scritta da te restano.</p>
      <p class="spazio-sopra"><button class="btn pericolo" id="btn-reset">Azzera ciò che ha imparato</button></p>
    </div>`);
}

// ------------------------------------------------------------------ eventi della piattaforma

// aggancia tutti i listener dopo il render della vista "approved"
function attivaPiattaforma() {
  // la navigazione (sidebar) è gestita da initGuscio(), una volta sola: qui
  // agganciamo solo i controlli dei pannelli appena (ri)disegnati.

  // interruttore acceso/spento
  document.getElementById('toggle-bot')?.addEventListener('change', async (ev) => {
    const acceso = ev.target.checked;
    try {
      await api('/api/streamer/toggle', { method: 'POST', body: { enabled: acceso } });
      stato.streamer.botEnabled = acceso;
      document.getElementById('etichetta-bot').textContent = acceso ? 'Bot acceso' : 'Bot spento';
      toast(acceso ? 'Bot acceso! 💜' : 'Bot spento.');
    } catch (e) {
      ev.target.checked = !acceso;
      toast('Errore: ' + e.message, 'errore');
    }
  });

  // installazione dell'app (PWA)
  document.getElementById('btn-installa')?.addEventListener('click', async () => {
    if (promptInstall) {
      promptInstall.prompt();
      const scelta = await promptInstall.userChoice.catch(() => null);
      if (scelta?.outcome === 'accepted') toast('App installata! 📱');
      promptInstall = null;
    } else if (window.matchMedia('(display-mode: standalone)').matches) {
      toast('L\'app è già installata 💜');
    } else {
      toast('Usa il menu del browser: “Installa app” / “Aggiungi a Home”.');
    }
  });

  // invito di un moderatore (crea il link da mandargli)
  document.getElementById('btn-invita-mod')?.addEventListener('click', () => conErrore(async () => {
    const login = (document.getElementById('inp-mod-login').value || '').trim().replace(/^@/, '');
    if (!login) { toast('Scrivi l’username Twitch del moderatore.', 'errore'); return; }
    const r = await api('/api/moderatori', { method: 'POST', body: { login } });
    document.getElementById('inp-mod-login').value = '';
    mostraInvito(r.invito);
    toast('Invito creato: copia il link e mandaglielo 👍');
    caricaModeratori();
  }));

  // creazione di una passkey
  document.getElementById('btn-crea-passkey')?.addEventListener('click', (ev) => conErrore(async () => {
    const btn = ev.currentTarget; btn.disabled = true;
    try { await creaPasskey(); toast('Passkey creata! Ora puoi rientrare senza pass 🔑'); caricaPasskey(); }
    catch (e) {
      if (e?.name === 'NotAllowedError') toast('Operazione annullata.', 'errore');
      else toast('Passkey non creata: ' + (e.message || e), 'errore');
    } finally { btn.disabled = false; }
  }));

  // pre-addestramento manuale con spinner e risultato
  document.getElementById('btn-pretrain')?.addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    const out = document.getElementById('esito-pretrain');
    btn.disabled = true;
    const testoOrig = btn.textContent;
    btn.textContent = 'Sto leggendo il tuo profilo… ⏳';
    out.textContent = '';
    try {
      const esito = await api('/api/streamer/preaddestra', { method: 'POST', body: {} });
      const riassunto = typeof esito === 'object' && esito
        ? (esito.esito || esito.messaggio || `voci: ${esito.voci ?? esito.count ?? '?'}`)
        : String(esito);
      out.textContent = '✅ Fatto! ' + riassunto;
      toast('Profilo riletto, conoscenza aggiornata 💜');
      // ricarica lo stato per aggiornare timestamp e contatore conoscenza
      stato = await api('/api/me');
      render();
    } catch (e) {
      out.textContent = '❌ ' + e.message;
      toast('Pre-addestramento fallito: ' + e.message, 'errore');
      btn.disabled = false;
      btn.textContent = testoOrig;
    }
  });

  // salvataggi per sezione
  document.getElementById('btn-salva-personalita')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      tono: document.getElementById('sel-tono').value,
      spontaneita: Number(document.getElementById('rng-spontaneita').value) / 100,
      rispostaMenzioni: document.getElementById('chk-menzioni').checked,
      proattivo: document.getElementById('chk-proattivo').checked,
      adattaCanale: document.getElementById('chk-adatta').checked,
      iaLocale: document.getElementById('chk-ialocale').checked,
      frasi: righe(document.getElementById('txt-frasi').value),
    }, 'Personalità salvata 🎭');
  }));

  document.getElementById('btn-salva-clip')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      clipAuto: document.getElementById('chk-clip').checked,
      clipAutoSoglia: Number(document.getElementById('num-soglia').value),
    }, 'Impostazioni clip salvate 🎬');
  }));

  document.getElementById('btn-salva-regole')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      paroleVietate: righe(document.getElementById('txt-vietate').value),
    }, 'Regole salvate 🚫');
  }));

  document.getElementById('btn-salva-antispam')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      antispam: {
        attivo: document.getElementById('chk-as-attivo').checked,
        link: document.getElementById('chk-as-link').checked,
        linkTier: document.getElementById('sel-as-linktier').value,
        whitelist: righe(document.getElementById('txt-as-whitelist').value),
        ripetizioni: document.getElementById('chk-as-ripet').checked,
        flood: document.getElementById('chk-as-flood').checked,
        maiuscole: document.getElementById('chk-as-caps').checked,
        menzioni: document.getElementById('chk-as-menz').checked,
        timeoutRecidivi: document.getElementById('chk-as-timeout').checked,
        avvisa: document.getElementById('chk-as-avvisa').checked,
      },
    }, 'Antispam salvato 🛡️');
  }));

  document.getElementById('btn-salva-giochi')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      giochi: document.getElementById('chk-giochi').checked,
      nomeMonete: document.getElementById('inp-monete').value.trim(),
      promoSocial: document.getElementById('chk-promo').checked,
    }, 'Giochi salvati 🎮');
  }));

  // ponte "giochi del sito": solo l'interruttore (endpoint/segreto arrivano dal sito)
  document.getElementById('btn-salva-giochisito')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({ giochiSito: { attivo: document.getElementById('chk-giochisito').checked } }, 'Giochi del sito salvati 🎯');
  }));

  // citazioni: aggiunta dalla dashboard
  document.getElementById('btn-aggiungi-citazione')?.addEventListener('click', () => conErrore(async () => {
    const inp = document.getElementById('inp-citazione');
    const testo = (inp.value || '').trim();
    if (!testo) { toast('Scrivi la citazione.', 'errore'); return; }
    const r = await api('/api/streamer/citazioni', { method: 'POST', body: { testo } });
    inp.value = '';
    toast('Citazione #' + r.n + ' aggiunta 💬');
    caricaCitazioni();
  }));

  // citazioni: estrai da un link → riempie la textarea (da curare prima di importare)
  document.getElementById('btn-estrai-citazioni')?.addEventListener('click', (ev) => conErrore(async () => {
    const url = (document.getElementById('inp-import-url').value || '').trim();
    if (!url) { toast('Incolla un link.', 'errore'); return; }
    const btn = ev.currentTarget; btn.disabled = true; const orig = btn.textContent; btn.textContent = 'Estraggo…';
    try {
      const r = await api('/api/streamer/citazioni/da-url', { method: 'POST', body: { url } });
      const ta = document.getElementById('txt-import-citazioni');
      const esistenti = ta.value.trim();
      ta.value = (esistenti ? esistenti + '\n' : '') + (r.citazioni || []).join('\n');
      toast(r.citazioni?.length ? `Trovate ${r.citazioni.length} possibili citazioni — controllale e importa 👀` : 'Nessuna citazione trovata in quel link 🤔', r.citazioni?.length ? 'ok' : 'errore');
    } finally { btn.disabled = false; btn.textContent = orig; }
  }));

  // citazioni: importa in blocco quelle nella textarea (una per riga)
  document.getElementById('btn-importa-citazioni')?.addEventListener('click', () => conErrore(async () => {
    const testi = righe(document.getElementById('txt-import-citazioni').value);
    if (!testi.length) { toast('Incolla o estrai prima qualche citazione.', 'errore'); return; }
    const r = await api('/api/streamer/citazioni/importa', { method: 'POST', body: { testi } });
    document.getElementById('txt-import-citazioni').value = '';
    toast(`Importate ${r.aggiunte} citazioni` + (r.saltate ? ` (${r.saltate} doppioni saltati)` : '') + ' 💬');
    caricaCitazioni();
  }));

  // premio VIP automatico (top monete → VIP ogni settimana/mese)
  document.getElementById('btn-salva-premio')?.addEventListener('click', () => conErrore(async () => {
    const quanti = Math.min(5, Math.max(1, Number(document.getElementById('num-premio-quanti').value) || 1));
    await salvaImpostazioni({
      premioVip: {
        attivo: document.getElementById('chk-premiovip').checked,
        periodo: document.getElementById('sel-premio-periodo').value === 'mese' ? 'mese' : 'settimana',
        quanti,
      },
    }, 'Premio VIP salvato 🏆');
  }));

  // modalità di attivazione (24/7 · quando live · manuale)
  document.getElementById('btn-salva-modalita')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({ modalita: document.getElementById('sel-modalita').value }, 'Modalità salvata ⏱️');
  }));

  // --- Notifiche Telegram ---
  document.getElementById('btn-tg-token')?.addEventListener('click', () => conErrore(async () => {
    const inp = document.getElementById('inp-tg-token');
    if (inp?.disabled) return;   // già collegato
    const token = (inp?.value || '').trim();
    if (!token) { toast('Incolla il token del bot (te lo dà @BotFather).', 'errore'); return; }
    const r = await api('/api/streamer/telegram/token', { method: 'POST', body: { token } });
    toast('Bot collegato: @' + (r.botUsername || '?') + ' ✅');
    stato = await api('/api/me'); render();
  }));

  document.getElementById('btn-tg-rileva')?.addEventListener('click', () => conErrore(async () => {
    const r = await api('/api/streamer/telegram/rileva', { method: 'POST', body: {} });
    toast(r.privato ? 'Collegata la chat privata col bot.' : 'Gruppo collegato: ' + (r.gruppo || '✓'));
    stato = await api('/api/me'); render();
  }));

  document.getElementById('btn-tg-salva')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/streamer/telegram/impostazioni', { method: 'POST', body: {
      attivo: document.getElementById('chk-tg-attivo').checked,
      messaggio: document.getElementById('txt-tg-messaggio').value,
      pinLive: document.getElementById('chk-tg-pin')?.checked ?? true,
    } });
    toast('Notifiche Telegram salvate 📣');
    stato = await api('/api/me');   // aggiorna lo stato senza perdere la scheda
  }));

  document.getElementById('btn-tg-prova')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/streamer/telegram/prova', { method: 'POST', body: {} });
    toast('Messaggio di prova inviato nel gruppo 🧪');
  }));

  document.getElementById('btn-tg-scollega')?.addEventListener('click', () => conErrore(async () => {
    if (!confirm('Scollegare il bot Telegram? Dovrai reincollare il token per riattivarlo.')) return;
    await api('/api/streamer/telegram', { method: 'DELETE' });
    toast('Telegram scollegato.');
    stato = await api('/api/me'); render();
  }));

  // --- Bot interattivo su Telegram (webhook + comandi) ---
  document.getElementById('chk-tg-interattivo')?.addEventListener('change', (ev) => {
    const chk = ev.target;
    conErrore(async () => {
      await api('/api/streamer/telegram/interattivo', { method: 'POST', body: { attivo: chk.checked } });
      toast(chk.checked ? 'Bot interattivo attivato 🤖' : 'Bot interattivo spento.');
      stato = await api('/api/me'); render();
    }).catch(() => { chk.checked = !chk.checked; });   // in caso di errore, rimetti lo switch
  });

  // --- Auguri di compleanno (delega sul contenitore, ricaricato via JS) ---
  document.getElementById('box-compleanni')?.addEventListener('click', (ev) => {
    if (ev.target.closest('#btn-compleanni-salva')) return conErrore(async () => {
      await api('/api/streamer/telegram/compleanni', { method: 'POST', body: {
        attivo: document.getElementById('chk-compleanni-attivo')?.checked,
        messaggio: document.getElementById('txt-compleanni-msg')?.value || '',
      } });
      toast('Auguri di compleanno salvati 🎂');
      caricaCompleanni();
    });
    if (ev.target.closest('#btn-comple-aggiungi')) return conErrore(async () => {
      await api('/api/streamer/telegram/compleanni/aggiungi', { method: 'POST', body: {
        nome: document.getElementById('inp-comple-nome')?.value || '',
        giorno: document.getElementById('inp-comple-giorno')?.value || '',
        mese: document.getElementById('inp-comple-mese')?.value || '',
      } });
      toast('Compleanno aggiunto 🎂');
      caricaCompleanni();
    });
    if (ev.target.closest('#btn-membri-aggiorna')) return conErrore(async () => {
      const r = await api('/api/streamer/telegram/membri/aggiorna', { method: 'POST', body: {} });
      toast(`Caricati ${r.aggiunti || 0} amministratori 👥`);
      caricaCompleanni();
    });
    const add = ev.target.closest('[data-membro-add]');
    if (add) {
      const riga = add.closest('.membro-riga');
      return conErrore(async () => {
        await api('/api/streamer/telegram/compleanni/aggiungi', { method: 'POST', body: {
          id: riga.dataset.membroId,
          nome: riga.dataset.membroNome,
          giorno: riga.querySelector('.mem-gg')?.value || '',
          mese: riga.querySelector('.mem-mm')?.value || '',
        } });
        toast('Compleanno aggiunto 🎂 (verrà taggato)');
        caricaCompleanni();
      });
    }
    const rim = ev.target.closest('[data-comple-rimuovi]');
    if (rim) return conErrore(async () => {
      await api('/api/streamer/telegram/compleanni/' + encodeURIComponent(rim.dataset.compleRimuovi), { method: 'DELETE' });
      caricaCompleanni();
    });
  });

  // --- Notifica TikTok ---
  document.getElementById('btn-tk-salva')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      tiktok: {
        username: (document.getElementById('inp-tk-user').value || '').trim(),
        attivo: document.getElementById('chk-tk-attivo').checked,
        annunciaChat: document.getElementById('chk-tk-chat').checked,
        messaggio: document.getElementById('txt-tk-messaggio')?.value || '',
      },
    }, 'TikTok salvato 🎵');
  }));

  document.getElementById('btn-tk-prova')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/streamer/tiktok/prova', { method: 'POST', body: {} });
    toast('Prova TikTok inviata nel gruppo Telegram 🎵');
  }));

  // Comando rapido: inserimento variabili (senza perdere il focus) + crea al volo
  document.getElementById('qc-chips')?.addEventListener('mousedown', (ev) => {
    const chip = ev.target.closest('[data-qc]');
    if (!chip) return;
    ev.preventDefault();
    const ta = document.getElementById('qc-risposta');
    if (!ta) return;
    const v = chip.dataset.qc;
    const s = ta.selectionStart ?? ta.value.length;
    const e = ta.selectionEnd ?? ta.value.length;
    ta.value = ta.value.slice(0, s) + v + ta.value.slice(e);
    ta.focus();
    const pos = s + v.length;
    ta.setSelectionRange(pos, pos);
  });

  document.getElementById('btn-qc')?.addEventListener('click', () => conErrore(async () => {
    const comando = (document.getElementById('qc-nome').value || '')
      .trim().toLowerCase().replace(/^!/, '').replace(/[^a-z0-9_]/g, '');
    const risposta = (document.getElementById('qc-risposta').value || '').trim();
    if (!comando) { toast('Scrivi il nome del comando (senza !).', 'errore'); return; }
    if (!risposta) { toast('Scrivi cosa deve rispondere il bot.', 'errore'); return; }
    await api('/api/streamer/moduli', { method: 'POST', body: {
      nome: 'Comando !' + comando, attivo: true,
      trigger: { tipo: 'comando', comando, alias: [] },
      condizioni: { tier: 'tutti', cooldown: 0, probabilita: 100, soloLive: false, soloOffline: false },
      azioni: [{ tipo: 'messaggio', testo: risposta }],
    } });
    document.getElementById('qc-nome').value = '';
    document.getElementById('qc-risposta').value = '';
    toast('Comando !' + comando + ' creato ⚡');
    caricaModuli();
  }));

  // slider spontaneità: percentuale in tempo reale
  document.getElementById('rng-spontaneita')?.addEventListener('input', (ev) => {
    document.getElementById('val-spontaneita').textContent = ev.target.value + '%';
  });

  // --- scheda Ascolto live: interruttore, slider e salvataggio ---
  // l'interruttore salva subito (come il bot acceso/spento), aggiornando l'etichetta
  document.getElementById('toggle-ascolto')?.addEventListener('change', (ev) => {
    const acceso = ev.target.checked;
    const et = document.getElementById('etichetta-ascolto');
    conErrore(async () => {
      try {
        await salvaImpostazioni({ ascoltoLive: acceso }, acceso ? 'Ascolto live acceso 🎧' : 'Ascolto live spento.');
        if (et) et.textContent = acceso ? 'Ascolto acceso' : 'Ascolto spento';
      } catch (e) {
        ev.target.checked = !acceso; // ripristino in caso di errore
        throw e;
      }
    });
  });

  // slider sensibilità: solo valore mostrato in tempo reale (salva col bottone)
  document.getElementById('rng-ascolto')?.addEventListener('input', (ev) => {
    const out = document.getElementById('val-ascolto');
    if (out) out.textContent = ev.target.value;
  });

  // Salva: interruttore + sensibilità insieme
  document.getElementById('btn-salva-ascolto')?.addEventListener('click', () => conErrore(async () => {
    const ascoltoLive = document.getElementById('toggle-ascolto').checked;
    const ascoltoSensibilita = Number(document.getElementById('rng-ascolto').value) || 5;
    await salvaImpostazioni({ ascoltoLive, ascoltoSensibilita }, 'Ascolto live salvato 🎧');
    const et = document.getElementById('etichetta-ascolto');
    if (et) et.textContent = ascoltoLive ? 'Ascolto acceso' : 'Ascolto spento';
  }));

  // conoscenza: aggiunta manuale
  document.getElementById('btn-aggiungi-conoscenza')?.addEventListener('click', () => conErrore(async () => {
    const domanda = document.getElementById('inp-domanda').value.trim();
    const risposta = document.getElementById('inp-risposta').value.trim();
    if (!domanda || !risposta) { toast('Compila domanda e risposta.', 'errore'); return; }
    await api('/api/streamer/knowledge', { method: 'POST', body: { domanda, risposta } });
    document.getElementById('inp-domanda').value = '';
    document.getElementById('inp-risposta').value = '';
    toast('Il bot ha imparato qualcosa di nuovo ✍️');
    caricaConoscenza();
  }));

  // copia URL overlay OBS
  document.getElementById('btn-copia-overlay')?.addEventListener('click', async () => {
    const inp = document.getElementById('inp-overlay-url');
    if (!inp?.value) { toast('URL non ancora pronto, riprova tra un attimo.', 'errore'); return; }
    try {
      await navigator.clipboard.writeText(inp.value);
      toast('URL dell\'overlay copiato 📋');
    } catch {
      inp.select();
      try { document.execCommand('copy'); toast('URL selezionato: premi Ctrl+C'); }
      catch { toast('Copia manualmente l\'URL selezionato.', 'errore'); }
    }
  });

  // caricamento di un effetto (multipart, con spinner)
  document.getElementById('btn-carica-effetto')?.addEventListener('click', caricaEffettoUpload);

  // memoria on-demand
  document.getElementById('btn-carica-memoria')?.addEventListener('click', () => caricaMemoria(true));

  // reset con conferma
  document.getElementById('btn-reset')?.addEventListener('click', () => conErrore(async () => {
    if (!confirm('Sicuro? Il bot dimenticherà lezioni, ricordi sugli utenti e conoscenza imparata dalla chat. Non si torna indietro.')) return;
    await api('/api/streamer/memoria/reset', { method: 'POST', body: {} });
    toast('Memoria azzerata. Il bot riparte da zero (ma la tua conoscenza resta).');
    document.getElementById('contenitore-memoria').innerHTML = '';
  }));

  // --- scheda Moduli: intro + modelli pronti (delega sul pannello) ---
  document.getElementById('scheda-moduli')?.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-nuovo-modulo]')) { apriEditor(null); return; }
    const mod = ev.target.closest('[data-modello]');
    if (mod) apriEditor(modelloPronto(mod.dataset.modello));
  });

  // --- scheda Moduli: editor (delega sul contenitore persistente) ---
  const ed = document.getElementById('editor-modulo');
  if (ed) {
    // tiene il focus sul campo di testo quando si clicca una pillola
    ed.addEventListener('mousedown', (ev) => {
      if (ev.target.closest('[data-inserisci]')) ev.preventDefault();
    });
    // ricorda l'ultimo campo di testo a fuoco (per inserire le variabili)
    ed.addEventListener('focusin', (ev) => {
      if (ev.target.matches('[data-var-target]')) campoAttivoModulo = ev.target;
    });
    // digitazione → aggiorna il riassunto vivo
    ed.addEventListener('input', aggiornaRiassunto);
    // cambi di select (tipo trigger / tipo azione / condizioni) e checkbox
    ed.addEventListener('change', (ev) => {
      if (ev.target.matches('[data-trigger-tipo]')) {
        const box = document.getElementById('campi-quando');
        if (box) box.innerHTML = disegnaCampiQuando({ tipo: ev.target.value });
      } else if (ev.target.matches('[data-azione-tipo]')) {
        const riga = ev.target.closest('.azione-riga');
        if (riga) riga.outerHTML = disegnaAzione({ tipo: ev.target.value });
      }
      aggiornaRiassunto();
    });
    // bottoni dell'editor + pillole variabili
    ed.addEventListener('click', gestisciClicEditor);
  }

  // dati della scheda visibile al primo caricamento
  caricaDatiScheda(schedaAttiva);
}

// click dentro l'editor: pillole, riordino/rimozione azioni, salva/prova/annulla
function gestisciClicEditor(ev) {
  const chip = ev.target.closest('[data-inserisci]');
  if (chip) {
    let campo = campoAttivoModulo;
    const ed = document.getElementById('editor-modulo');
    if (!campo || !ed?.contains(campo)) {
      campo = chip.closest('.azione-riga')?.querySelector('[data-var-target]') || null;
    }
    if (campo) inserisciNelCampo(campo, chip.getAttribute('data-inserisci'));
    aggiornaRiassunto();
    return;
  }
  if (ev.target.closest('[data-aggiungi-azione]')) {
    ev.preventDefault();
    document.getElementById('lista-azioni')?.insertAdjacentHTML('beforeend', disegnaAzione({ tipo: 'messaggio', testo: '' }));
    aggiornaRiassunto();
    return;
  }
  const rim = ev.target.closest('[data-rimuovi-azione]');
  if (rim) { ev.preventDefault(); rim.closest('.azione-riga')?.remove(); aggiornaRiassunto(); return; }
  // caselle delle frasi-trigger (trigger 'parola'): aggiungi / rimuovi
  if (ev.target.closest('[data-aggiungi-frase]')) {
    ev.preventDefault();
    document.getElementById('lista-frasi-trigger')?.insertAdjacentHTML('beforeend',
      '<div class="frase-trigger riga-flessibile" style="margin-bottom:.4rem">'
      + '<input type="text" class="mod-testo-trigger campo-largo" placeholder="es. come stai?">'
      + '<button type="button" class="btn pericolo mini" data-rimuovi-frase title="Rimuovi">×</button></div>');
    aggiornaRiassunto();
    return;
  }
  const rimF = ev.target.closest('[data-rimuovi-frase]');
  if (rimF) { ev.preventDefault(); rimF.closest('.frase-trigger')?.remove(); aggiornaRiassunto(); return; }
  const su = ev.target.closest('[data-su]');
  if (su) {
    ev.preventDefault();
    const riga = su.closest('.azione-riga');
    const prec = riga?.previousElementSibling;
    if (prec) riga.parentNode.insertBefore(riga, prec);
    aggiornaRiassunto();
    return;
  }
  const giu = ev.target.closest('[data-giu]');
  if (giu) {
    ev.preventDefault();
    const riga = giu.closest('.azione-riga');
    const succ = riga?.nextElementSibling;
    if (succ) riga.parentNode.insertBefore(succ, riga);
    aggiornaRiassunto();
    return;
  }
  if (ev.target.closest('[data-annulla-editor]')) {
    ev.preventDefault();
    moduloInModifica = null;
    const cont = document.getElementById('editor-modulo');
    if (cont) cont.innerHTML = '';
    return;
  }
  if (ev.target.closest('[data-salva-modulo]')) {
    ev.preventDefault();
    conErrore(async () => {
      const id = await salvaModuloCorrente();
      if (id == null) return;
      toast('Modulo salvato 💜');
      moduloInModifica = null;
      const cont = document.getElementById('editor-modulo');
      if (cont) cont.innerHTML = '';
      caricaModuli();
    });
    return;
  }
  if (ev.target.closest('[data-prova-editor]')) {
    ev.preventDefault();
    conErrore(async () => {
      const id = await salvaModuloCorrente();
      if (id == null) return;
      await api('/api/streamer/moduli/' + encodeURIComponent(id) + '/prova', { method: 'POST', body: {} });
      toast('Salvato e provato: guarda chat/overlay 👀');
      caricaModuli(); // aggiorna la lista, l'editor resta aperto per continuare a modificare
    });
  }
}

// textarea → array di righe pulite
function righe(testo) {
  return String(testo || '').split('\n').map((r) => r.trim()).filter(Boolean);
}

// esegue un'azione async mostrando eventuali errori come toast
async function conErrore(fn) {
  try { await fn(); } catch (e) { toast('Errore: ' + e.message, 'errore'); }
}

// carica i dati "pigri" della scheda selezionata
function caricaDatiScheda(id) {
  if (id === 'stato') { caricaPasskey(); caricaModeratori(); }
  if (id === 'conoscenza') caricaConoscenza();
  if (id === 'clip') caricaClip();
  if (id === 'effetti') caricaEffetti();
  if (id === 'moduli') caricaModuli();
  if (id === 'memoria') caricaStatistiche();
  if (id === 'giochi') { caricaClassifica(); caricaCitazioni(); }
  if (id === 'notifiche') caricaCompleanni();
  if (id === 'admin' && stato.isAdmin) { caricaTabellaAdmin(); caricaAnima(); }
}


// --- auguri di compleanno (scheda Notifiche) ----------------------------
const fmtGiornoMese = (g, m) => String(g).padStart(2, '0') + '/' + String(m).padStart(2, '0');

async function caricaCompleanni() {
  const box = document.getElementById('box-compleanni');
  if (!box) return;
  let d;
  try { d = await api('/api/streamer/telegram/compleanni'); }
  catch { box.innerHTML = '<p class="vuoto">Impossibile caricare.</p>'; return; }
  const lista = (d.lista || []).map((c) => `
    <li><div class="testo-voce"><span class="domanda">🎂 ${esc(c.nome || '—')}</span>
      <span class="meta"> — ${fmtGiornoMese(c.giorno, c.mese)}${c.manuale ? ' · aggiunto a mano' : ''}</span></div>
      <button class="btn pericolo mini" data-comple-rimuovi="${esc(c.id)}">Rimuovi</button></li>`).join('');
  const roster = (d.membri || []).map((m) => `
    <div class="riga-flessibile membro-riga" data-membro-id="${esc(m.id)}" data-membro-nome="${esc(m.nome || '')}" style="margin-bottom:.4rem">
      <span class="campo-largo">${esc(m.nome || '—')}${m.username ? ` <span class="meta">@${esc(m.username)}</span>` : ''}</span>
      <input type="number" class="mem-gg" min="1" max="31" placeholder="GG" style="width:72px">
      <input type="number" class="mem-mm" min="1" max="12" placeholder="MM" style="width:72px">
      <button class="btn secondario mini" data-membro-add>Aggiungi</button>
    </div>`).join('');
  box.innerHTML = `
    <div class="riga-interruttore">
      <label class="interruttore"><input type="checkbox" id="chk-compleanni-attivo" ${d.attivo ? 'checked' : ''}><span class="levetta"></span></label>
      <span class="etichetta-stato">Auguri automatici ${d.attivo ? 'accesi' : 'spenti'}</span>
    </div>
    <label class="campo spazio-sopra" for="txt-compleanni-msg">Messaggio di auguri</label>
    <textarea id="txt-compleanni-msg" rows="3" placeholder="🎂 Tanti auguri {menzione}! 🎉">${esc(d.messaggio || '')}</textarea>
    <p class="suggerimento">Segnaposto: <code>{menzione}</code> (tag del festeggiato) <code>{nome}</code>. Vuoto = messaggio standard.</p>
    <p><button class="btn" id="btn-compleanni-salva">Salva impostazioni</button></p>

    <hr class="separatore">
    <h3>Compleanni registrati (${(d.lista || []).length})</h3>
    <ul class="lista-voci">${lista || '<li class="vuoto">Nessuno ancora.</li>'}</ul>

    <hr class="separatore">
    <h3>Membri del gruppo (${(d.membri || []).length})</h3>
    <p class="suggerimento">L'elenco si riempie da chi <strong>scrive</strong> nel gruppo (Telegram non lascia leggere l'intera lista).
    <button class="btn secondario mini" id="btn-membri-aggiorna">Carica amministratori</button>
    Per vedere tutti quelli che scrivono, disattiva la <em>privacy</em> del bot su
    <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> (<code>/setprivacy → Disable</code>).</p>
    ${roster || '<p class="vuoto">Ancora nessun membro. Falli scrivere nel gruppo o carica gli amministratori.</p>'}

    <hr class="separatore">
    <label class="campo">Aggiungi un compleanno a mano (senza tag)</label>
    <div class="riga-flessibile">
      <input type="text" id="inp-comple-nome" class="campo-largo" placeholder="Nome">
      <input type="number" id="inp-comple-giorno" min="1" max="31" placeholder="GG" style="width:80px">
      <input type="number" id="inp-comple-mese" min="1" max="12" placeholder="MM" style="width:80px">
      <button class="btn secondario" id="btn-comple-aggiungi">Aggiungi</button>
    </div>`;
}

// --- caricamenti dati ---------------------------------------------------

async function caricaConoscenza() {
  const ul = document.getElementById('lista-conoscenza');
  if (!ul) return;
  try {
    const voci = await api('/api/streamer/knowledge');
    if (!voci.length) { ul.innerHTML = '<li class="vuoto">Il bot non sa ancora niente: insegnagli qualcosa qui sopra!</li>'; return; }
    const badge = { auto: '🌐 dal sito', manuale: '✍️ tua', chat: '💬 dalla chat' };
    ul.innerHTML = voci.map((v) => `
      <li>
        <div class="testo-voce">
          <div class="domanda">${esc(v.domanda)}</div>
          <div class="risposta">${esc(v.risposta)}</div>
          <div class="meta"><span class="badge">${badge[v.fonte] || esc(v.fonte)}</span> · ${esc(dataIt(v.ts))}</div>
        </div>
        <button class="btn secondario mini" data-elimina="${v.id}">Elimina</button>
      </li>`).join('');
    // eliminazione singola voce (delega sull'elenco)
    ul.onclick = (ev) => {
      const btn = ev.target.closest('[data-elimina]');
      if (!btn) return;
      conErrore(async () => {
        await api('/api/streamer/knowledge/' + btn.dataset.elimina, { method: 'DELETE' });
        toast('Voce dimenticata.');
        caricaConoscenza();
      });
    };
  } catch (e) {
    ul.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`;
  }
}

async function caricaClip() {
  const ul = document.getElementById('lista-clip');
  if (!ul) return;
  try {
    const { clip } = await api('/api/streamer/memoria');
    if (!clip.length) { ul.innerHTML = '<li class="vuoto">Nessuna clip ancora: arriveranno nei momenti di hype!</li>'; return; }
    ul.innerHTML = clip.map((c) => `
      <li>
        <div class="testo-voce">
          <div class="domanda"><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.url || c.clip_id)}</a></div>
          <div class="meta">${esc(c.reason || '')} · ${esc(dataIt(c.ts))}</div>
        </div>
      </li>`).join('');
  } catch (e) {
    ul.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`;
  }
}

// classifica monete + VIP a tempo attivi (scheda Giochi)
async function caricaClassifica() {
  const ulCl = document.getElementById('lista-classifica');
  const ulVip = document.getElementById('lista-vip');
  if (!ulCl && !ulVip) return;
  const nome = esc(impostazioni().nomeMonete || 'monete');
  try {
    const d = await api('/api/streamer/classifica');
    if (ulCl) {
      const monete = d.monete || [];
      ulCl.innerHTML = monete.length
        ? monete.map((m, i) => `
          <li>
            <div class="testo-voce">
              <span class="domanda">${medaglia(i)} ${esc(m.user)}</span>
              <span class="risposta">${Number(m.monete).toLocaleString('it-IT')} ${nome}</span>
            </div>
          </li>`).join('')
        : `<li class="vuoto">Ancora nessuno ha ${nome}: si guadagnano chiacchierando e giocando!</li>`;
    }
    if (ulVip) {
      const vip = d.vip || [];
      ulVip.innerHTML = vip.length
        ? vip.map((v) => {
            const quando = v.until ? `fino al ${dataIt(v.until)}` : 'per sempre';
            return `
          <li>
            <div class="testo-voce">
              <span class="domanda">👑 ${esc(v.display || v.user)}</span>
              <span class="risposta">${esc(quando)}${v.motivo ? ' · ' + esc(v.motivo) : ''}</span>
            </div>
          </li>`;
          }).join('')
        : '<li class="vuoto">Nessun VIP a tempo assegnato dal bot. Dallo a voce ("vip a nome") o con !vip @nome.</li>';
    }
  } catch (e) {
    if (ulCl) ulCl.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`;
    if (ulVip) ulVip.innerHTML = '';
  }
}

function medaglia(i) { return ['🥇', '🥈', '🥉'][i] || `${i + 1}°`; }

async function caricaCitazioni() {
  const ul = document.getElementById('lista-citazioni');
  if (!ul) return;
  try {
    const voci = await api('/api/streamer/citazioni');
    ul.innerHTML = voci.length
      ? voci.map((q) => `<li>
          <div class="testo-voce"><span class="domanda">#${q.n}</span> <span class="risposta">${esc(q.text)}</span></div>
          <button class="btn secondario mini" data-cita-rimuovi="${q.n}">Rimuovi</button>
        </li>`).join('')
      : '<li class="vuoto">Ancora nessuna citazione. Aggiungine una qui sopra o con !cita aggiungi in chat 💬</li>';
    ul.onclick = (ev) => {
      const b = ev.target.closest('[data-cita-rimuovi]');
      if (!b) return;
      conErrore(async () => { await api('/api/streamer/citazioni/' + b.dataset.citaRimuovi, { method: 'DELETE' }); toast('Citazione rimossa.'); caricaCitazioni(); });
    };
  } catch (e) { ul.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`; }
}

// --- effetti & suoni ----------------------------------------------------

async function caricaEffetti() {
  const ul = document.getElementById('lista-effetti');
  if (!ul) return;
  const inpUrl = document.getElementById('inp-overlay-url');
  try {
    const dati = await api('/api/streamer/effetti');
    if (inpUrl) inpUrl.value = dati.overlayUrl || '';

    const etTipo = { audio: '🔊 audio', immagine: '🖼️ immagine', video: '🎬 video' };
    const etTier = { tutti: 'tutti', sub: 'sub', vip: 'VIP', mod: 'mod' };

    if (!dati.effetti.length) {
      ul.innerHTML = '<li class="vuoto">Nessun effetto ancora: caricane uno qui sopra e provalo!</li>';
      return;
    }
    ul.innerHTML = dati.effetti.map((e) => `
      <li>
        <div class="testo-voce">
          <div class="domanda">!${esc(e.comando)} <span class="badge viola">${etTipo[e.tipo] || esc(e.tipo)}</span></div>
          <div class="meta">chi: ${esc(etTier[e.tier] || e.tier)} · cooldown ${e.cooldown}s · volume ${e.volume}% · ${e.durata}ms</div>
        </div>
        <div class="azioni-voce">
          <button class="btn secondario mini" data-prova="${esc(e.comando)}">Prova</button>
          <button class="btn pericolo mini" data-elimina-eff="${e.id}">Elimina</button>
        </div>
      </li>`).join('');

    // Prova / Elimina (delega sull'elenco)
    ul.onclick = (ev) => {
      const prova = ev.target.closest('[data-prova]');
      const del = ev.target.closest('[data-elimina-eff]');
      if (prova) {
        conErrore(async () => {
          await api('/api/streamer/effetti/test', { method: 'POST', body: { comando: prova.dataset.prova } });
          toast('Effetto inviato all\'overlay ✨ (aprilo per vederlo)');
        });
      } else if (del) {
        conErrore(async () => {
          if (!confirm('Eliminare questo effetto? Il file verrà cancellato.')) return;
          await api('/api/streamer/effetti/' + del.dataset.eliminaEff, { method: 'DELETE' });
          toast('Effetto eliminato 🗑️');
          caricaEffetti();
        });
      }
    };
  } catch (e) {
    ul.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`;
  }
}

// invio multipart del form di caricamento effetto (non passa da api(): usa FormData)
async function caricaEffettoUpload(ev) {
  if (DEMO) { toast('In demo non si caricano file 😊 — accedi per farlo davvero.'); return; }
  const btn = ev.currentTarget;
  const out = document.getElementById('esito-effetto');
  const fileInput = document.getElementById('eff-file');
  const comando = document.getElementById('eff-comando').value.trim();
  const file = fileInput.files[0];
  if (out) out.textContent = '';

  if (!file) { toast('Scegli un file da caricare.', 'errore'); return; }
  if (!comando) { toast('Scrivi il comando (senza !).', 'errore'); return; }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('comando', comando);
  fd.append('tier', document.getElementById('eff-tier').value);
  fd.append('cooldown', document.getElementById('eff-cooldown').value);
  fd.append('volume', document.getElementById('eff-volume').value);
  fd.append('durata', document.getElementById('eff-durata').value);

  btn.disabled = true;
  const testoOrig = btn.textContent;
  btn.textContent = 'Comprimo e carico… ⏳';
  try {
    // niente header Content-Type: lo imposta il browser col boundary multipart
    const res = await fetch('/api/streamer/effetti', { method: 'POST', body: fd });
    let dati = null;
    try { dati = await res.json(); } catch { /* risposta non JSON */ }
    if (!res.ok) throw new Error(dati?.errore || `errore ${res.status}`);
    toast('Effetto caricato e compresso! ✨');
    fileInput.value = '';
    document.getElementById('eff-comando').value = '';
    caricaEffetti();
  } catch (e) {
    if (out) out.textContent = '❌ ' + e.message;
    toast('Caricamento fallito: ' + e.message, 'errore');
  } finally {
    btn.disabled = false;
    btn.textContent = testoOrig;
  }
}

// Conteggio animato: fa "salire" i numeri delle statistiche da 0 al valore.
// Rispetta prefers-reduced-motion e ripristina sempre il testo esatto finale.
function animaNumeri(root) {
  const els = (root || document).querySelectorAll('.stat .numero');
  const fermo = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  els.forEach((el) => {
    if (el.dataset.animato) return;
    el.dataset.animato = '1';
    const finale = el.textContent.trim();
    const n = parseInt(finale.replace(/[^\d]/g, ''), 10);
    if (fermo || !Number.isFinite(n) || n <= 0) return;   // niente da animare
    const durata = 900;
    const start = performance.now();
    const passo = (ora) => {
      const t = Math.min(1, (ora - start) / durata);
      const eased = 1 - Math.pow(1 - t, 3);               // easeOutCubic
      el.textContent = Math.round(n * eased).toLocaleString('it-IT');
      if (t < 1) requestAnimationFrame(passo);
      // fine: stessa formattazione dell'animazione (niente scatto del puntino)
      else el.textContent = /^\d+$/.test(finale) ? n.toLocaleString('it-IT') : finale;
    };
    requestAnimationFrame(passo);
  });
}

async function caricaStatistiche() {
  const griglia = document.getElementById('griglia-stat');
  const chatters = document.getElementById('lista-chatters');
  if (!griglia) return;
  try {
    const s = await api('/api/streamer/statistiche');
    griglia.innerHTML = `
      <div class="stat"><div class="numero">${s.messaggi7g}</div><div class="etichetta">messaggi in chat (7g)</div></div>
      <div class="stat"><div class="numero">${s.messaggiBot7g}</div><div class="etichetta">interventi del bot (7g)</div></div>
      <div class="stat"><div class="numero">${s.clipTotali}</div><div class="etichetta">clip totali</div></div>`;
    animaNumeri(griglia);   // conteggio animato da 0 al valore
    chatters.innerHTML = s.topChatters.length
      ? s.topChatters.map((c, i) => `
          <li><div class="testo-voce"><span class="domanda">${['🥇', '🥈', '🥉', '4°', '5°'][i] || ''} ${esc(c.user)}</span>
          <span class="meta"> — ${c.c} messaggi</span></div></li>`).join('')
      : '<li class="vuoto">Ancora nessun chatter registrato.</li>';
  } catch (e) {
    griglia.innerHTML = `<div class="vuoto">Errore: ${esc(e.message)}</div>`;
  }
}

async function caricaMemoria(mostraToast = false) {
  const box = document.getElementById('contenitore-memoria');
  if (!box) return;
  box.innerHTML = '<p class="vuoto">Caricamento…</p>';
  try {
    const m = await api('/api/streamer/memoria');
    box.innerHTML = `
      <h3>Lezioni imparate (${m.lezioni.length})</h3>
      <ul class="lista-voci">${m.lezioni.length
        ? m.lezioni.map((l) => `<li><div class="testo-voce">${esc(l.text)}<div class="meta">${esc(dataIt(l.ts))}</div></div></li>`).join('')
        : '<li class="vuoto">Nessuna lezione ancora: il bot impara osservando la chat.</li>'}</ul>
      <h3>Fatti sul canale (${m.fatti.length})</h3>
      <ul class="lista-voci">${m.fatti.length
        ? m.fatti.map((f) => `<li><div class="testo-voce"><span class="domanda">${esc(f.key)}</span>
            <span class="risposta"> ${esc(String(f.value).slice(0, 200))}</span></div></li>`).join('')
        : '<li class="vuoto">Nessun fatto memorizzato.</li>'}</ul>`;
    if (mostraToast) toast('Memoria caricata 🧠');
  } catch (e) {
    box.innerHTML = `<p class="vuoto">Errore: ${esc(e.message)}</p>`;
  }
}

// ------------------------------------------------------------------ moduli (automazioni)

// mappe testo per rendere leggibili trigger, eventi e azioni
const EVENTI = [
  ['follow', 'Nuovo follow'],
  ['subscribe', 'Sub / resub'],
  ['raid', 'Raid'],
  ['cheer', 'Bits / cheer'],
  ['redemption', 'Riscatto punti canale'],
  ['first', 'Primo messaggio di un utente'],
  ['online', 'Sei andato in live'],
  ['offline', 'Fine live'],
];
const EVENTI_TXT = {
  follow: 'arriva un nuovo follow', subscribe: 'qualcuno si abbona', raid: 'parte un raid',
  cheer: 'arrivano dei bits', redemption: 'riscattano un premio coi punti',
  first: 'un utente scrive per la prima volta', online: 'vai in live', offline: 'finisce la live',
};
const TRIGGER = [
  ['comando', 'Un comando in chat'],
  ['parola', 'Una parola, frase o domanda in chat'],
  ['voce', 'Comando vocale (dal tuo PC)'],
  ['evento', 'Un evento del canale'],
  ['timer', 'A tempo (timer)'],
  ['manuale', 'Manuale / da un mio servizio'],
];
const AZIONI = [
  ['messaggio', '💬 Scrivi in chat'],
  ['effetto', '✨ Fai partire un effetto'],
  ['clip', '🎬 Crea una clip'],
  ['contatore', '🔢 Contatore'],
  ['webhook', '🔗 Chiama un webhook'],
  ['attendi', '⏱️ Aspetta'],
  ['overlayTesto', '🖥️ Mostra testo sull\'overlay'],
  ['timeout', '🚫 Timeout in chat'],
];
// pillole variabili cliccabili (testo inserito = etichetta)
const VARIABILI = [
  // contesto
  '$user', '$touser', '$args', '$arg1', '$canale', '$uptime', '$gioco', '$titolo',
  // generatori parametrici (combinazioni infinite)
  '$random(1,100)', '$random(6)', '$decimale(1,2)', '$misura(1,50,cm)', '$pick(a|b|c)', '$count(nome)',
  // numeri & percentuali
  '$random', '$numero', '$percentuale', '$dado', '$moneta', '$sino', '$livello',
  // metriche / misure a caso
  '$altezza', '$peso', '$lunghezza', '$grandezza', '$eta', '$temperatura', '$velocita', '$distanza', '$soldi',
  // colore / fantasia
  '$colore', '$emoji', '$animale',
];

// traduce un modulo in una frase italiana leggibile: "QUANDO … SE … → azioni"
function riassuntoModulo(m) {
  if (!m) return '';
  const t = riassuntoQuando(m.trigger || {});
  const c = riassuntoSe(m.condizioni || {});
  const az = (m.azioni || []).map(riassuntoAzione).filter(Boolean);
  const azTxt = az.length ? az.join(', ') : 'non fa ancora niente';
  return `QUANDO ${t}${c ? ' · SE ' + c : ''} → ${azTxt}`;
}
function riassuntoQuando(t) {
  switch (t.tipo) {
    case 'comando': {
      if (!t.comando) return 'scrivono un comando';
      const a = Array.isArray(t.alias) ? t.alias : (typeof t.alias === 'string' ? t.alias.split(/[\s,]+/) : []);
      const alist = a.map((x) => String(x).trim().replace(/^!/, '')).filter(Boolean);
      const bang = t.senzaBang ? '' : '!';
      return `scrivono ${bang}${t.comando}` + (alist.length ? ` (o ${alist.map((x) => bang + x).join(', ')})` : '')
        + (t.senzaBang ? ' (anche senza !)' : '');
    }
    case 'parola': {
      const modo = { contiene: 'compare', esatto: 'è esattamente', inizia: 'inizia con' }[t.modo] || 'compare';
      const frasi = (Array.isArray(t.testi) && t.testi.length) ? t.testi : (t.testo ? [t.testo] : []);
      if (!frasi.length) return 'compare una parola';
      const primi = frasi.slice(0, 2).map((x) => `"${x}"`).join(' o ');
      const extra = frasi.length > 2 ? ` (+${frasi.length - 2})` : '';
      return `in chat ${modo} ${primi}${extra}`;
    }
    case 'voce': {
      const f = (Array.isArray(t.frasi) ? t.frasi : []).filter(Boolean);
      if (!f.length) return 'dici una frase al microfono';
      const primi = f.slice(0, 2).map((x) => `"${x}"`).join(' o ');
      return `dici ${primi}`;
    }
    case 'evento': return EVENTI_TXT[t.evento] || 'succede un evento del canale';
    case 'timer': {
      let s = `ogni ${t.minuti || 0} min`;
      if (t.minMessaggi) s += ` e almeno ${t.minMessaggi} messaggi`;
      return s;
    }
    case 'manuale': return 'lo attivi tu (Prova o servizio esterno)';
    default: return 'succede qualcosa';
  }
}
function riassuntoSe(c) {
  const parti = [];
  const chi = { sub: 'solo i sub', vip: 'solo i VIP', mod: 'solo i mod' }[c.tier];
  if (chi) parti.push(chi);
  if (c.cooldown > 0) parti.push(`max ogni ${c.cooldown}s`);
  if (typeof c.probabilita === 'number' && c.probabilita >= 0 && c.probabilita < 100) parti.push(`${c.probabilita}% delle volte`);
  if (c.soloLive) parti.push('solo in live');
  if (c.soloOffline) parti.push('solo offline');
  return parti.join(', ');
}
function riassuntoAzione(a) {
  switch (a.tipo) {
    case 'messaggio': return 'invia un messaggio';
    case 'effetto': return a.comando ? `fai partire l'effetto !${a.comando}` : 'fai partire un effetto';
    case 'contatore': {
      const n = a.nome || 'contatore';
      if (a.operazione === 'azzera') return `azzera "${n}"`;
      if (a.operazione === 'imposta') return `imposta "${n}" a ${a.valore ?? 0}`;
      return `aumenta "${n}"`;
    }
    case 'webhook': return 'chiama un webhook';
    case 'clip': return 'crea una clip';
    case 'attendi': return `aspetta ${a.secondi || 0}s`;
    case 'overlayTesto': return 'mostra un testo sull\'overlay';
    case 'timeout': return `timeout di ${a.secondi || 0}s`;
    default: return '';
  }
}

// carica dati della scheda (lazy) e disegna lista + connettori
async function caricaModuli() {
  const ul = document.getElementById('lista-moduli');
  if (!ul) return;
  try {
    datiModuli = await api('/api/streamer/moduli');
  } catch (e) {
    ul.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`;
    return;
  }
  disegnaListaModuli();
  disegnaConnettori();
}

function disegnaListaModuli() {
  const ul = document.getElementById('lista-moduli');
  if (!ul) return;
  const moduli = datiModuli?.moduli || [];
  if (!moduli.length) {
    ul.innerHTML = '<li class="vuoto">Nessun modulo ancora: parti da un modello qui sopra 👆</li>';
    return;
  }
  ul.innerHTML = moduli.map((m) => `
    <li class="modulo">
      <label class="interruttore">
        <input type="checkbox" data-toggle-modulo="${esc(m.id)}" ${m.attivo ? 'checked' : ''}>
        <span class="levetta"></span>
      </label>
      <div class="testo-voce">
        <div class="nome-modulo">${esc(m.nome || 'Senza nome')}</div>
        <div class="riassunto-lista">${esc(riassuntoModulo(m))}</div>
      </div>
      <div class="azioni-voce">
        <button class="btn secondario mini" data-prova-modulo="${esc(m.id)}">Prova</button>
        <button class="btn secondario mini" data-modifica-modulo="${esc(m.id)}">Modifica</button>
        <button class="btn pericolo mini" data-elimina-modulo="${esc(m.id)}">Elimina</button>
      </div>
    </li>`).join('');

  // interruttore attivo/spento
  ul.onchange = (ev) => {
    const tog = ev.target.closest('[data-toggle-modulo]');
    if (!tog) return;
    const id = tog.dataset.toggleModulo;
    const acceso = tog.checked;
    conErrore(async () => {
      try {
        await api('/api/streamer/moduli/' + encodeURIComponent(id) + '/toggle', { method: 'POST', body: { attivo: acceso } });
        const m = (datiModuli.moduli || []).find((x) => String(x.id) === String(id));
        if (m) m.attivo = acceso;
        toast(acceso ? 'Modulo acceso 💜' : 'Modulo spento.');
      } catch (e) {
        tog.checked = !acceso;
        throw e;
      }
    });
  };

  // Prova / Modifica / Elimina (delega sull'elenco)
  ul.onclick = (ev) => {
    const prova = ev.target.closest('[data-prova-modulo]');
    const modifica = ev.target.closest('[data-modifica-modulo]');
    const elimina = ev.target.closest('[data-elimina-modulo]');
    if (prova) {
      conErrore(async () => {
        await api('/api/streamer/moduli/' + encodeURIComponent(prova.dataset.provaModulo) + '/prova', { method: 'POST', body: {} });
        toast('Modulo provato: guarda chat/overlay 👀');
      });
    } else if (modifica) {
      const m = (datiModuli.moduli || []).find((x) => String(x.id) === String(modifica.dataset.modificaModulo));
      if (m) apriEditor(m);
    } else if (elimina) {
      conErrore(async () => {
        if (!confirm('Eliminare questo modulo? Non si torna indietro.')) return;
        await api('/api/streamer/moduli/' + encodeURIComponent(elimina.dataset.eliminaModulo), { method: 'DELETE' });
        toast('Modulo eliminato 🗑️');
        caricaModuli();
      });
    }
  };
}

// --- editor QUANDO / SE / ALLORA ---------------------------------------

function apriEditor(modulo) {
  const cont = document.getElementById('editor-modulo');
  if (!cont) return;
  // clona per non modificare la lista finché non si salva; null = nuovo
  moduloInModifica = modulo ? JSON.parse(JSON.stringify(modulo)) : {
    id: null, nome: '', attivo: true,
    trigger: { tipo: 'comando', comando: '', alias: [] },
    condizioni: { tier: 'tutti', cooldown: 0, probabilita: 100, soloLive: false, soloOffline: false },
    azioni: [{ tipo: 'messaggio', testo: '' }],
  };
  const m = moduloInModifica;
  const c = m.condizioni || {};
  const seAperto = c.tier && c.tier !== 'tutti' || c.cooldown > 0 ||
    (typeof c.probabilita === 'number' && c.probabilita < 100) || c.soloLive || c.soloOffline;

  cont.innerHTML = `
    <div class="carta">
      <h2>${m.id ? 'Modifica modulo ✏️' : 'Nuovo modulo ✨'}</h2>
      <div class="riassunto-modulo">${esc(riassuntoModulo(m))}</div>

      <label class="campo" for="mod-nome">Nome del modulo</label>
      <input type="text" id="mod-nome" placeholder="es. Saluto di benvenuto" value="${esc(m.nome || '')}">

      <div class="blocco-quando">
        <div class="etichetta-blocco">Quando</div>
        <label class="campo" for="mod-trigger-tipo">Cosa fa scattare il modulo</label>
        <select id="mod-trigger-tipo" data-trigger-tipo>
          ${TRIGGER.map(([v, t]) => `<option value="${v}" ${m.trigger?.tipo === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}
        </select>
        <div id="campi-quando">${disegnaCampiQuando(m.trigger || {})}</div>
      </div>

      <details class="blocco-se" ${seAperto ? 'open' : ''}>
        <summary class="etichetta-blocco">Se (facoltativo) — aggiungi condizioni</summary>
        <div class="griglia-campi spazio-sopra">
          <div>
            <label class="campo" for="mod-chipuo">Chi può attivarlo</label>
            <select id="mod-chipuo">
              <option value="tutti" ${c.tier === 'tutti' ? 'selected' : ''}>Tutti</option>
              <option value="sub" ${c.tier === 'sub' ? 'selected' : ''}>Solo sub</option>
              <option value="vip" ${c.tier === 'vip' ? 'selected' : ''}>Solo VIP</option>
              <option value="mod" ${c.tier === 'mod' ? 'selected' : ''}>Solo mod</option>
            </select>
          </div>
          <div>
            <label class="campo" for="mod-cooldown">Cooldown (s)</label>
            <input type="number" id="mod-cooldown" min="0" max="86400" value="${Number(c.cooldown) || 0}">
          </div>
          <div>
            <label class="campo" for="mod-probabilita">Probabilità (%)</label>
            <input type="number" id="mod-probabilita" min="0" max="100" value="${typeof c.probabilita === 'number' ? c.probabilita : 100}">
          </div>
        </div>
        <div class="riga-check"><input type="checkbox" id="mod-solo-live" ${c.soloLive ? 'checked' : ''}><label for="mod-solo-live">Solo se sono in live</label></div>
        <div class="riga-check"><input type="checkbox" id="mod-solo-offline" ${c.soloOffline ? 'checked' : ''}><label for="mod-solo-offline">Solo se sono offline</label></div>
      </details>

      <div class="blocco-allora">
        <div class="etichetta-blocco">Allora</div>
        <div id="lista-azioni">${(m.azioni || []).map(disegnaAzione).join('')}</div>
        <p class="spazio-sopra"><button class="btn secondario mini" data-aggiungi-azione>+ Aggiungi azione</button></p>
      </div>

      <p class="spazio-sopra">
        <button class="btn" data-salva-modulo>Salva</button>
        <button class="btn secondario" data-prova-editor>Prova</button>
        <button class="btn secondario" data-annulla-editor>Annulla</button>
      </p>
    </div>`;

  cont.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('mod-nome')?.focus();
}

// campi contestuali del blocco QUANDO in base al tipo di innesco
function disegnaCampiQuando(t) {
  switch (t.tipo) {
    case 'comando':
      return `
        <label class="campo" for="mod-comando">Comando (senza !)</label>
        <div class="riga-flessibile">
          <span class="prefisso-cmd">!</span>
          <input type="text" id="mod-comando" class="campo-largo" placeholder="ciao" value="${esc(t.comando || '')}">
        </div>
        <label class="campo" for="mod-alias">Alias (facoltativi, separati da spazio)</label>
        <input type="text" id="mod-alias" placeholder="salve buongiorno" value="${esc(Array.isArray(t.alias) ? t.alias.join(' ') : (t.alias || ''))}">
        <div class="riga-check" style="margin-top:.5rem">
          <input type="checkbox" id="mod-senza-bang" ${t.senzaBang ? 'checked' : ''}>
          <label for="mod-senza-bang">Attiva anche <b>senza !</b> — basta scrivere la parola esatta (es. <code>disc</code>)</label>
        </div>
        <div class="riga-check" style="margin-top:.4rem">
          <input type="checkbox" id="mod-telegram" ${moduloInModifica?.telegram ? 'checked' : ''}>
          <label for="mod-telegram">Abilita anche su <b>Telegram</b> — risponde nel gruppo anche se la parola è <b>dentro una frase</b> (il <code>!</code> non serve). Attiva il <em>bot interattivo</em> in Notifiche.</label>
        </div>`;
    case 'parola': {
      const frasi = (Array.isArray(t.testi) && t.testi.length) ? t.testi : (t.testo ? [t.testo] : ['']);
      const caselle = frasi.map((f) => `
        <div class="frase-trigger riga-flessibile" style="margin-bottom:.4rem">
          <input type="text" class="mod-testo-trigger campo-largo" placeholder="es. come stai? · buonanotte · a che ora inizi?" value="${esc(f)}">
          <button type="button" class="btn pericolo mini" data-rimuovi-frase title="Rimuovi">×</button>
        </div>`).join('');
      return `
        <label class="campo">Parole, frasi o domande che fanno scattare il modulo</label>
        <p class="suggerimento" style="margin-top:0">Una per casella. Possono essere frasi intere (niente più divisione a virgole). Basta che <b>una</b> combaci.</p>
        <div id="lista-frasi-trigger">${caselle}</div>
        <p><button type="button" class="btn secondario mini" data-aggiungi-frase>+ Aggiungi frase</button></p>
        <label class="campo" for="mod-modo">Come confrontarle</label>` + `
        <select id="mod-modo">
          <option value="contiene" ${t.modo === 'contiene' ? 'selected' : ''}>Compare dentro il messaggio</option>
          <option value="esatto" ${t.modo === 'esatto' ? 'selected' : ''}>È esattamente il messaggio</option>
          <option value="inizia" ${t.modo === 'inizia' ? 'selected' : ''}>Il messaggio inizia così</option>
        </select>
        <div class="riga-check" style="margin-top:.5rem">
          <input type="checkbox" id="mod-punt" ${t.ignoraPunt !== false ? 'checked' : ''}>
          <label for="mod-punt">Ignora la <b>punteggiatura</b> (così “come stai?” combacia con “come stai”)</label>
        </div>
        <div class="riga-check">
          <input type="checkbox" id="mod-case" ${t.maiuscole ? 'checked' : ''}>
          <label for="mod-case">Rispetta <b>maiuscole/minuscole</b> (di solito conviene lasciarlo spento)</label>
        </div>
        <div class="riga-check">
          <input type="checkbox" id="mod-telegram" ${moduloInModifica?.telegram ? 'checked' : ''}>
          <label for="mod-telegram">Abilita anche su <b>Telegram</b> — reagisce anche nel gruppo. Attiva il <em>bot interattivo</em> in Notifiche.</label>
        </div>`;
    }
    case 'voce': {
      const frasi = (Array.isArray(t.frasi) && t.frasi.length) ? t.frasi : ['clippa', 'salva la clip'];
      return `
        <label class="campo" for="mod-frasi-voce">Frasi da ascoltare (una per riga)</label>
        <textarea id="mod-frasi-voce" placeholder="clippa&#10;salva la clip">${esc(frasi.join('\n'))}</textarea>
        <p class="suggerimento">Quando al microfono dici una di queste frasi, il modulo scatta. Scrivile in minuscolo,
        una per riga. L'ascolto si avvia dalla pagina "Apri l'ascolto vocale" in <strong>Durante la diretta → Ascolto vocale</strong>.</p>
        <div class="riga-check" style="margin-top:.4rem">
          <input type="checkbox" id="mod-telegram" ${moduloInModifica?.telegram ? 'checked' : ''}>
          <label for="mod-telegram">Manda il messaggio anche su <b>Telegram</b> quando lo dico a voce (serve il bot interattivo).</label>
        </div>`;
    }
    case 'evento':
      return `
        <label class="campo" for="mod-evento">Quale evento</label>
        <select id="mod-evento">
          ${EVENTI.map(([v, t2]) => `<option value="${v}" ${t.evento === v ? 'selected' : ''}>${esc(t2)}</option>`).join('')}
        </select>`;
    case 'timer':
      return `
        <div class="griglia-campi spazio-sopra">
          <div>
            <label class="campo" for="mod-minuti">Ogni quanti minuti</label>
            <input type="number" id="mod-minuti" min="1" max="1440" value="${Number(t.minuti) || 15}">
          </div>
          <div>
            <label class="campo" for="mod-min-messaggi">Solo se almeno N messaggi</label>
            <input type="number" id="mod-min-messaggi" min="0" max="1000" value="${Number(t.minMessaggi) || 0}">
          </div>
        </div>
        <p class="suggerimento">Metti 0 messaggi per farlo partire comunque a tempo.</p>`;
    case 'manuale':
      return `<p class="suggerimento spazio-sopra">Nessun campo: questo modulo si attiva dal bottone "Prova" o dai
        Connettori avanzati (API in ingresso) qui sotto.</p>`;
    default:
      return '';
  }
}

// una riga azione del blocco ALLORA
function disegnaAzione(a) {
  a = a || { tipo: 'messaggio' };
  const tipo = a.tipo || 'messaggio';
  const selTipo = `
    <select data-azione-tipo>
      ${AZIONI.map(([v, t]) => `<option value="${v}" ${tipo === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}
    </select>`;
  return `
    <div class="azione-riga" data-tipo="${esc(tipo)}">
      <div class="azione-testata">
        ${selTipo}
        <div class="azione-controlli">
          <button class="btn secondario mini" data-su title="Sposta su">↑</button>
          <button class="btn secondario mini" data-giu title="Sposta giù">↓</button>
          <button class="btn pericolo mini" data-rimuovi-azione title="Rimuovi">×</button>
        </div>
      </div>
      ${disegnaCampiAzione(a)}
    </div>`;
}

// campi contestuali di un'azione
function disegnaCampiAzione(a) {
  const tipo = a.tipo || 'messaggio';
  const pillole = `<div class="chip-vars">${VARIABILI.map((v) =>
    `<button type="button" class="chip-var" data-inserisci="${esc(v)}">${esc(v)}</button>`).join('')}</div>`;
  switch (tipo) {
    case 'messaggio':
      return `
        <textarea data-campo="testo" data-var-target placeholder="es. Ciao $user! 👋">${esc(a.testo || '')}</textarea>
        ${pillole}`;
    case 'effetto': {
      const eff = datiModuli?.effettiDisponibili || [];
      if (!eff.length) {
        return `<p class="suggerimento">Non hai ancora effetti: carica prima un effetto in <strong>Chat &amp; comandi → Effetti &amp; suoni</strong>.</p>
          <input type="hidden" data-campo="comando" value="${esc(a.comando || '')}">`;
      }
      return `
        <label class="campo">Quale effetto</label>
        <select data-campo="comando">
          ${eff.map((e) => {
            const cmd = typeof e === 'string' ? e : (e.comando || '');
            return `<option value="${esc(cmd)}" ${a.comando === cmd ? 'selected' : ''}>!${esc(cmd)}</option>`;
          }).join('')}
        </select>`;
    }
    case 'contatore':
      return `
        <div class="griglia-campi">
          <div>
            <label class="campo">Nome contatore</label>
            <input type="text" data-campo="nome" placeholder="morti" value="${esc(a.nome || '')}">
          </div>
          <div>
            <label class="campo">Operazione</label>
            <select data-campo="op">
              <option value="incrementa" ${a.op === 'incrementa' ? 'selected' : ''}>Incrementa (+1)</option>
              <option value="azzera" ${a.op === 'azzera' ? 'selected' : ''}>Azzera</option>
              <option value="imposta" ${a.op === 'imposta' ? 'selected' : ''}>Imposta a…</option>
            </select>
          </div>
          <div>
            <label class="campo">Valore (se "imposta")</label>
            <input type="number" data-campo="valore" value="${Number(a.valore) || 0}">
          </div>
        </div>`;
    case 'webhook':
      return `
        <label class="campo">URL del tuo servizio (https)</label>
        <input type="text" data-campo="url" placeholder="https://" value="${esc(a.url || '')}">
        <div class="riga-check">
          <input type="checkbox" data-campo="usaRisposta" ${a.usaRisposta ? 'checked' : ''}>
          <label>Usa la risposta come messaggio in chat</label>
        </div>
        <p class="suggerimento">L'URL è il <strong class="primo-piano">tuo</strong> servizio: la tua logica resta sul tuo
        server e SocialBot ne pubblica la risposta.</p>`;
    case 'clip':
      return `
        <p class="suggerimento">Crea una clip del momento su Twitch. Utile con l'innesco vocale
        ("clippa!") o su un evento. Nessun campo da compilare.</p>`;
    case 'attendi':
      return `
        <label class="campo">Secondi da aspettare</label>
        <input type="number" data-campo="secondi" min="0" max="60" value="${Number(a.secondi) || 2}">`;
    case 'overlayTesto':
      return `
        <textarea data-campo="testo" data-var-target placeholder="Testo da mostrare sull'overlay">${esc(a.testo || '')}</textarea>
        ${pillole}
        <label class="campo">Durata a schermo (ms)</label>
        <input type="number" data-campo="durata" min="500" max="30000" value="${Number(a.durata) || 5000}">`;
    case 'timeout':
      return `
        <label class="campo">Timeout (secondi)</label>
        <input type="number" data-campo="secondi" min="1" max="1209600" value="${Number(a.secondi) || 600}">`;
    default:
      return '';
  }
}

// ricostruisce l'oggetto modulo dallo stato del form
function leggiForm() {
  if (!document.getElementById('mod-trigger-tipo')) return null;
  const g = (id) => document.getElementById(id);
  const tipoT = g('mod-trigger-tipo').value;
  const trigger = { tipo: tipoT };
  if (tipoT === 'comando') {
    trigger.comando = (g('mod-comando')?.value || '').trim().replace(/^!/, '');
    trigger.alias = (g('mod-alias')?.value || '').split(/[\s,]+/).map((x) => x.trim().replace(/^!/, '')).filter(Boolean);
    trigger.senzaBang = !!g('mod-senza-bang')?.checked;
  } else if (tipoT === 'parola') {
    // una casella per frase: NIENTE split su virgole → le frasi restano intere
    trigger.testi = [...document.querySelectorAll('#lista-frasi-trigger .mod-testo-trigger')]
      .map((i) => i.value.trim()).filter(Boolean);
    trigger.modo = g('mod-modo')?.value || 'contiene';
    trigger.maiuscole = !!g('mod-case')?.checked;          // rispetta maiuscole/minuscole
    trigger.ignoraPunt = g('mod-punt') ? !!g('mod-punt').checked : true;   // ignora la punteggiatura (default sì)
  } else if (tipoT === 'voce') {
    trigger.frasi = righe((g('mod-frasi-voce')?.value || '').toLowerCase());
  } else if (tipoT === 'evento') {
    trigger.evento = g('mod-evento')?.value || 'follow';
  } else if (tipoT === 'timer') {
    trigger.minuti = Number(g('mod-minuti')?.value) || 0;
    trigger.minMessaggi = Number(g('mod-min-messaggi')?.value) || 0;
  }
  const condizioni = {
    tier: g('mod-chipuo')?.value || 'tutti',
    cooldown: Number(g('mod-cooldown')?.value) || 0,
    probabilita: g('mod-probabilita') ? Number(g('mod-probabilita').value) : 100,
    soloLive: !!g('mod-solo-live')?.checked,
    soloOffline: !!g('mod-solo-offline')?.checked,
  };
  const azioni = [...document.querySelectorAll('#lista-azioni .azione-riga')].map(leggiAzioneRiga);
  return {
    id: moduloInModifica?.id ?? null,
    nome: (g('mod-nome')?.value || '').trim(),
    attivo: moduloInModifica ? moduloInModifica.attivo !== false : true,
    telegram: !!g('mod-telegram')?.checked,   // risponde/invia anche nel gruppo Telegram
    trigger, condizioni, azioni,
  };
}

function leggiAzioneRiga(riga) {
  const tipo = riga.querySelector('[data-azione-tipo]').value;
  const v = (campo) => riga.querySelector(`[data-campo="${campo}"]`);
  switch (tipo) {
    case 'messaggio': return { tipo, testo: v('testo')?.value || '' };
    case 'effetto': return { tipo, comando: v('comando')?.value || '' };
    case 'contatore': return {
      tipo, nome: (v('nome')?.value || '').trim(),
      op: v('op')?.value || 'incrementa', valore: Number(v('valore')?.value) || 0,
    };
    case 'webhook': return { tipo, url: (v('url')?.value || '').trim(), usaRisposta: !!v('usaRisposta')?.checked };
    case 'clip': return { tipo };
    case 'attendi': return { tipo, secondi: Number(v('secondi')?.value) || 0 };
    case 'overlayTesto': return { tipo, testo: v('testo')?.value || '', durata: Number(v('durata')?.value) || 5000 };
    case 'timeout': return { tipo, secondi: Number(v('secondi')?.value) || 0 };
    default: return { tipo };
  }
}

// aggiorna il riassunto vivo in cima all'editor
function aggiornaRiassunto() {
  const el = document.querySelector('#editor-modulo .riassunto-modulo');
  if (!el) return;
  const m = leggiForm();
  if (m) el.textContent = riassuntoModulo(m);
}

// inserisce una variabile nel campo di testo attivo (o in coda)
function inserisciNelCampo(campo, testo) {
  const s = campo.selectionStart, e = campo.selectionEnd;
  if (typeof s === 'number' && typeof e === 'number') {
    const val = campo.value;
    campo.value = val.slice(0, s) + testo + val.slice(e);
    const pos = s + testo.length;
    campo.focus();
    try { campo.setSelectionRange(pos, pos); } catch { /* input non selezionabile */ }
  } else {
    campo.value += testo;
    campo.focus();
  }
}

// salva il modulo corrente; ritorna l'id (nuovo o esistente) o null in caso di stop
async function salvaModuloCorrente() {
  const m = leggiForm();
  if (!m) return null;
  if (!m.nome) { toast('Dai un nome al modulo.', 'errore'); return null; }
  if (!m.azioni.length) { toast('Aggiungi almeno un\'azione.', 'errore'); return null; }
  const res = await api('/api/streamer/moduli', { method: 'POST', body: m });
  const id = res?.id ?? m.id;
  if (moduloInModifica) moduloInModifica.id = id;
  return id;
}

// --- connettori avanzati (API in ingresso) -----------------------------

function disegnaConnettori() {
  const box = document.getElementById('connettori-moduli');
  if (!box) return;
  const apiKey = datiModuli?.apiKey || null;
  const apiUrl = datiModuli?.apiUrl || '';
  const chiaveMostrata = apiKey ? (apiKeyVisibile ? apiKey : '••••••••••••••••') : 'nessuna chiave';

  const esempio = `curl -X POST ${apiUrl || 'https://bot.andryxify.it/api/ext/<login>'} \\
  -H "Authorization: Bearer LA_TUA_CHIAVE" \\
  -H "Content-Type: application/json" \\
  -d '{"azione":"messaggio","testo":"Ciao dalla mia app!"}'`;

  box.innerHTML = `
    <label class="campo">Chiave API in ingresso</label>
    <div class="riga-flessibile">
      <input type="text" class="campo-largo" readonly value="${esc(chiaveMostrata)}">
      ${apiKey ? `<button class="btn secondario mini" data-apikey="mostra">${apiKeyVisibile ? 'Nascondi' : 'Mostra'}</button>` : ''}
      ${apiKey ? '<button class="btn secondario mini" data-apikey="copia">Copia</button>' : ''}
      <button class="btn secondario mini" data-apikey="rigenera">${apiKey ? 'Rigenera' : 'Genera chiave'}</button>
    </div>
    <p class="suggerimento">Tienila segreta: chi ha questa chiave può far parlare o agire il tuo bot.</p>

    <label class="campo">URL a cui inviare le richieste</label>
    <div class="riga-flessibile">
      <input type="text" class="campo-largo" readonly value="${esc(apiUrl)}" placeholder="—">
      <button class="btn secondario mini" data-apikey="copia-url">Copia</button>
    </div>

    <label class="campo">Esempio d'uso</label>
    <pre class="blocco-codice">${esc(esempio)}</pre>`;

  box.onclick = (ev) => {
    const btn = ev.target.closest('[data-apikey]');
    if (!btn) return;
    const azione = btn.dataset.apikey;
    if (azione === 'mostra') {
      apiKeyVisibile = !apiKeyVisibile;
      disegnaConnettori();
    } else if (azione === 'copia') {
      copiaTesto(datiModuli?.apiKey || '', 'Chiave copiata 📋');
    } else if (azione === 'copia-url') {
      copiaTesto(datiModuli?.apiUrl || '', 'URL copiato 📋');
    } else if (azione === 'rigenera') {
      conErrore(async () => {
        const nuova = !!datiModuli?.apiKey;
        if (nuova && !confirm('Rigenerare la chiave? Quella vecchia smetterà subito di funzionare.')) return;
        const res = await api('/api/streamer/apikey', { method: 'POST', body: {} });
        if (datiModuli) datiModuli.apiKey = res.apiKey;
        apiKeyVisibile = true;
        disegnaConnettori();
        toast(nuova ? 'Nuova chiave generata 🔑' : 'Chiave creata 🔑');
      });
    }
  };
}

// copia negli appunti con fallback
async function copiaTesto(testo, msgOk) {
  if (!testo) { toast('Niente da copiare.', 'errore'); return; }
  try {
    await navigator.clipboard.writeText(testo);
    toast(msgOk);
  } catch {
    toast('Copia non riuscita, fallo a mano.', 'errore');
  }
}

// ------------------------------------------------------------------ pannello admin

// Contenuto del pannello admin (senza wrapper): usato sia come scheda "Admin"
// per l'operatore con canale approvato, sia da solo se non ha un canale.
function vistaAdminContenuto() {
  const avviso = stato.missing?.length ? `
    <div class="carta avviso">
      <h2>⚠️ Configurazione incompleta</h2>
      <p>Mancano nel file <code>.env</code>: ${stato.missing.map((m) => `<code>${esc(m)}</code>`).join(', ')}.
      Il bot non parte finché non le compili.</p>
    </div>` : '';

  const st = stato.status || {};
  return `
    <div class="carta">
      <h2>Pannello andryxify 👑</h2>
      <p class="spazio-sopra">
        Bot: ${st.running ? '<span class="badge verde">● in esecuzione</span>' : '<span class="badge rosso">○ fermo</span>'}
        &nbsp; Canali attivi: ${st.channels?.length
          ? st.channels.map((c) => `<span class="badge viola">#${esc(c)}</span>`).join(' ')
          : '<span class="badge">nessuno</span>'}
        &nbsp; Streamer registrati: <strong class="primo-piano">${st.streamers ?? 0}</strong>
      </p>
    </div>
    ${avviso}
    <div class="carta">
      <h2>Streamer</h2>
      <div class="scorrevole">
        <table class="tabella">
          <thead><tr><th>Streamer</th><th>Login</th><th>Stato</th><th>Permessi</th><th>Conoscenza</th><th>Azioni</th></tr></thead>
          <tbody id="tabella-streamer"><tr><td colspan="6" class="vuoto">Caricamento…</td></tr></tbody>
        </table>
      </div>
    </div>
    <div class="carta">
      <h2>Anima di SocialBot 🫀</h2>
      <p>La personalità <strong class="primo-piano">condivisa</strong>: un solo carattere, coerente su tutti
      i canali (in chat indossa poi il nome e il tono di ognuno). Gli utenti restano a compartimenti stagni:
      qui vedi solo <em>quanti amici</em> e i più affini, mai cosa hanno scritto o dove.</p>
      <div id="anima-box"><p class="vuoto">Caricamento…</p></div>
    </div>`;
}

// carica e disegna il pannello Anima (solo operatore)
async function caricaAnima() {
  const box = document.getElementById('anima-box');
  if (!box) return;
  try {
    const d = await api('/api/admin/anima');
    const p = d.profilo || {};
    const amici = d.amici || { totale: 0, top: [] };
    box.innerHTML = `
      <label class="campo" for="an-nome">Nome</label>
      <input type="text" id="an-nome" value="${esc(p.nome || 'SocialBot')}" maxlength="40">

      <label class="campo" for="an-tono">Tono di base</label>
      <select id="an-tono">
        <option value="scherzoso" ${p.tono === 'scherzoso' ? 'selected' : ''}>Scherzoso</option>
        <option value="amichevole" ${p.tono === 'amichevole' ? 'selected' : ''}>Amichevole</option>
        <option value="serio" ${p.tono === 'serio' ? 'selected' : ''}>Serio</option>
      </select>

      <label class="campo" for="an-tratti">Tratti (uno per riga)</label>
      <textarea id="an-tratti" placeholder="curioso&#10;ironico&#10;empatico">${esc((p.tratti || []).join('\n'))}</textarea>

      <label class="campo" for="an-valori">Valori / linee guida (uno per riga)</label>
      <textarea id="an-valori" placeholder="rispetto&#10;community prima di tutto">${esc((p.valori || []).join('\n'))}</textarea>

      <label class="campo" for="an-tormentoni">Tormentoni / frasi-firma (uno per riga)</label>
      <textarea id="an-tormentoni" placeholder="si vola!&#10;GG raga">${esc((p.tormentoni || []).join('\n'))}</textarea>

      <p class="spazio-sopra">Stato d'animo ora:
        <span class="badge viola">umore ${p.umore ?? 50}/100</span>
        <span class="badge viola">energia ${p.energia ?? 60}/100</span>
        <span class="suggerimento">— cambia da solo con gli eventi (raid, sub…) e col tempo.</span>
      </p>
      <p><strong class="primo-piano">${amici.totale}</strong> persone conosciute in tutta la rete.
        ${amici.top.length ? 'Più affini: ' + amici.top.map((f) =>
          `<span class="badge">${esc(f.user)} · ${f.affinita}</span>`).join(' ') : ''}</p>

      <p class="spazio-sopra"><button class="btn" id="btn-salva-anima">Salva l'anima</button></p>`;

    document.getElementById('btn-salva-anima')?.addEventListener('click', () => conErrore(async () => {
      await api('/api/admin/anima', { method: 'POST', body: {
        nome: document.getElementById('an-nome').value.trim(),
        tono: document.getElementById('an-tono').value,
        tratti: righe(document.getElementById('an-tratti').value),
        valori: righe(document.getElementById('an-valori').value),
        tormentoni: righe(document.getElementById('an-tormentoni').value),
      } });
      toast('Anima aggiornata 🫀');
    }));
  } catch (e) {
    box.innerHTML = `<p class="vuoto">Errore: ${esc(e.message)}</p>`;
  }
}

async function caricaTabellaAdmin() {
  const tbody = document.getElementById('tabella-streamer');
  if (!tbody) return;
  try {
    const lista = await api('/api/admin/streamers');
    if (!lista.length) { tbody.innerHTML = '<tr><td colspan="6" class="vuoto">Nessuno streamer ancora.</td></tr>'; return; }

    const badgeStato = {
      pending: '<span class="badge giallo">in attesa</span>',
      approved: '<span class="badge verde">approvato</span>',
      disabled: '<span class="badge rosso">disabilitato</span>',
    };
    tbody.innerHTML = lista.map((s) => `
      <tr>
        <td>${esc(s.display || s.login)}</td>
        <td><code>${esc(s.login)}</code></td>
        <td>${badgeStato[s.status] || esc(s.status)}</td>
        <td>${s.permessiOk ? '✔' : '✘'}</td>
        <td>${s.knowledgeCount}</td>
        <td>
          ${s.status !== 'approved' ? `<button class="btn mini" data-azione="approved" data-login="${esc(s.login)}">Approva</button>` : ''}
          ${s.status === 'approved' ? `<button class="btn secondario mini" data-azione="disabled" data-login="${esc(s.login)}">Disabilita</button>` : ''}
          <button class="btn pericolo mini" data-azione="rimuovi" data-login="${esc(s.login)}">Rimuovi</button>
        </td>
      </tr>`).join('');

    // azioni admin (delega sul tbody)
    tbody.onclick = (ev) => {
      const btn = ev.target.closest('[data-azione]');
      if (!btn) return;
      const { azione, login } = btn.dataset;
      conErrore(async () => {
        if (azione === 'rimuovi') {
          if (!confirm(`Rimuovere del tutto ${login}? Verranno eliminati anche i suoi permessi.`)) return;
          await api('/api/admin/rimuovi', { method: 'POST', body: { login } });
          toast(`${login} rimosso.`);
        } else {
          if (azione === 'disabled' && !confirm(`Disabilitare ${login}? Il bot uscirà dal suo canale.`)) return;
          await api('/api/admin/stato', { method: 'POST', body: { login, status: azione } });
          toast(azione === 'approved' ? `${login} approvato! Il bot si sta pre-addestrando.` : `${login} disabilitato.`);
        }
        // ricarica stato globale (canali attivi) e tabella
        stato = await api('/api/me');
        render();
      });
    };
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="vuoto">Errore: ${esc(e.message)}</td></tr>`;
  }
}

// ------------------------------------------------------------------ listener globali

// bottone "richiedi SocialBot" (vista senza richiesta) — delega sul documento
document.addEventListener('click', (ev) => {
  if (ev.target.id === 'btn-richiesta') {
    conErrore(async () => {
      await api('/api/richiesta', { method: 'POST', body: {} });
      toast('Richiesta inviata! 🎉');
      stato = await api('/api/me');
      render();
    });
  }
});

// ------------------------------------------------------------------ PWA + Passkey

// installazione: cattura l'evento del browser per poterla offrire col bottone
let promptInstall = null;
window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); promptInstall = ev; });

// service worker (rende l'app installabile + guscio base)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

// --- helper WebAuthn lato client ---
const b64urlToBuf = (s) => {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
};
const bufToB64url = (buf) => {
  let bin = ''; const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// registra una nuova passkey per l'utente loggato
async function creaPasskey() {
  if (!window.PublicKeyCredential) { toast('Questo dispositivo non supporta le passkey.', 'errore'); return; }
  const opt = await api('/api/passkey/registra/inizio', { method: 'POST', body: {} });
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: b64urlToBuf(opt.challenge),
    rp: opt.rp,
    user: { id: b64urlToBuf(opt.user.id), name: opt.user.name, displayName: opt.user.displayName },
    pubKeyCredParams: opt.pubKeyCredParams,
    authenticatorSelection: opt.authenticatorSelection,
    excludeCredentials: (opt.excludeCredentials || []).map((c) => ({ id: b64urlToBuf(c.id), type: 'public-key' })),
    timeout: opt.timeout,
    attestation: opt.attestation,
  } });
  const nome = (navigator.userAgentData?.platform || navigator.platform || 'Passkey');
  await api('/api/passkey/registra/fine', { method: 'POST', body: {
    attestationObject: bufToB64url(cred.response.attestationObject),
    clientDataJSON: bufToB64url(cred.response.clientDataJSON),
    nome,
  } });
}

// mostra il link d'invito appena creato, pronto da copiare e mandare
function mostraInvito(invito) {
  const box = document.getElementById('invito-creato');
  if (!box || !invito) return;
  box.innerHTML = `
    <p class="suggerimento spazio-sopra">Manda questo link a <strong class="primo-piano">@${esc(invito.login)}</strong>
      (vale fino al ${esc(dataIt(invito.scade))}); accederà con Twitch e potrà gestire il bot:</p>
    <div class="riga-flessibile">
      <input type="text" id="url-invito" readonly value="${esc(invito.url)}">
      <button class="btn" id="btn-copia-invito">Copia</button>
    </div>`;
  document.getElementById('btn-copia-invito')?.addEventListener('click', () => copiaTesto(invito.url, 'Link d’invito copiato 📋'));
}

async function caricaModeratori() {
  const ul = document.getElementById('lista-moderatori');
  if (!ul) return;                       // per i moderatori la card non esiste: si salta
  try {
    const lista = await api('/api/moderatori');
    if (!lista.length) { ul.innerHTML = '<li class="vuoto">Ancora nessun moderatore. Invitane uno qui sopra 👥</li>'; return; }
    const links = {};
    ul.innerHTML = lista.map((m) => {
      if (m.invito) links[m.id] = m.invito.url;
      const stato = m.status === 'attivo'
        ? '<span class="badge verde">attivo</span>'
        : '<span class="badge giallo">invito in attesa</span>';
      const meta = m.status === 'attivo'
        ? (m.last_seen ? 'ultimo accesso ' + esc(dataIt(m.last_seen)) : 'mai entrato')
        : (m.invito ? 'invito valido fino al ' + esc(dataIt(m.invito.scade)) : 'invito scaduto');
      const azioni = m.status === 'attivo'
        ? `<button class="btn secondario mini" data-mod-rimuovi="${m.id}">Rimuovi</button>`
        : `<button class="btn secondario mini" data-mod-link="${m.id}">Copia link</button>
           <button class="btn secondario mini" data-mod-reinvita="${m.id}">Rigenera</button>
           <button class="btn secondario mini" data-mod-rimuovi="${m.id}">Annulla</button>`;
      return `<li>
        <div class="testo-voce">
          <span class="domanda">👤 ${esc(m.display || m.login)} ${stato}</span>
          <span class="meta">@${esc(m.login)} · ${meta}</span>
        </div>
        <div class="azioni-voce">${azioni}</div>
      </li>`;
    }).join('');
    ul.onclick = (ev) => {
      const b = ev.target.closest('[data-mod-rimuovi],[data-mod-reinvita],[data-mod-link]');
      if (!b) return;
      if (b.dataset.modLink) { if (links[b.dataset.modLink]) copiaTesto(links[b.dataset.modLink], 'Link d’invito copiato 📋'); return; }
      if (b.dataset.modReinvita) return conErrore(async () => {
        const r = await api('/api/moderatori/' + b.dataset.modReinvita + '/reinvita', { method: 'POST', body: {} });
        mostraInvito(r.invito); toast('Nuovo link generato.'); caricaModeratori();
      });
      if (b.dataset.modRimuovi) return conErrore(async () => {
        if (!confirm('Rimuovere questo moderatore / annullare l’invito?')) return;
        await api('/api/moderatori/' + b.dataset.modRimuovi, { method: 'DELETE' });
        toast('Fatto.'); caricaModeratori();
      });
    };
  } catch (e) { ul.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`; }
}

async function caricaPasskey() {
  const ul = document.getElementById('lista-passkey');
  if (!ul) return;
  try {
    const lista = await api('/api/passkey');
    ul.innerHTML = lista.length
      ? lista.map((p) => `<li><div class="testo-voce"><span class="domanda">🔑 ${esc(p.nome || 'Passkey')}</span>
          <span class="meta">creata ${esc(dataIt(p.created_at))}${p.last_used ? ' · usata ' + esc(dataIt(p.last_used)) : ''}</span></div>
          <button class="btn secondario mini" data-pk="${p.id}">Rimuovi</button></li>`).join('')
      : '<li class="vuoto">Nessuna passkey ancora. Creane una per rientrare al volo 🔑</li>';
    ul.onclick = (ev) => {
      const btn = ev.target.closest('[data-pk]');
      if (!btn) return;
      conErrore(async () => { await api('/api/passkey/' + btn.dataset.pk, { method: 'DELETE' }); toast('Passkey rimossa.'); caricaPasskey(); });
    };
  } catch (e) { ul.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`; }
}

// Chiude il drawer della sidebar su mobile.
function chiudiMenuMobile() {
  document.body.classList.remove('menu-aperto');
  document.getElementById('apri-menu')?.setAttribute('aria-expanded', 'false');
}

// Aggancia UNA VOLTA SOLA i comportamenti del guscio (sidebar + drawer mobile).
// Il contenuto della sidebar viene ridisegnato ad ogni render, ma questi
// elementi/handler restano fissi, quindi si delega sull'elemento persistente.
function initGuscio() {
  // navigazione: click su una voce della sidebar → apre quella scheda
  document.getElementById('nav-lat')?.addEventListener('click', (ev) => {
    // click sull'etichetta di una sezione → apre/chiude con animazione
    const tog = ev.target.closest('[data-toggle]');
    if (tog) {
      const gid = tog.dataset.toggle;
      const chiuso = gruppiChiusi.has(gid);
      if (chiuso) gruppiChiusi.delete(gid); else gruppiChiusi.add(gid);
      tog.closest('.lat-gruppo')?.classList.toggle('chiuso', !chiuso);
      tog.setAttribute('aria-expanded', chiuso ? 'true' : 'false');
      return;
    }
    const btn = ev.target.closest('[data-scheda]');
    if (!btn) return;
    const id = btn.dataset.scheda;
    chiudiMenuMobile();                       // su mobile chiude il drawer
    if (id === schedaAttiva) return;
    schedaAttiva = id;
    const pannello = document.getElementById('scheda-' + id);
    // le mutazioni del DOM entrano nella view transition: corpo che morpha e
    // pillola del menu che scorre sulla nuova voce (elemento condiviso "navpill").
    transizione(() => {
      const pill = document.querySelector('#nav-lat .lat-pill') || document.createElement('span');
      pill.className = 'lat-pill';
      document.querySelectorAll('#nav-lat .lat-item').forEach((b) =>
        b.classList.toggle('attiva', b.dataset.scheda === id));
      const nuova = document.querySelector(`#nav-lat .lat-item[data-scheda="${id}"]`);
      if (nuova) nuova.insertBefore(pill, nuova.firstChild);
      document.querySelectorAll('.pannello-scheda').forEach((p) =>
        p.classList.toggle('visibile', p === pannello));
      aggiornaTestataPagina();
      if (pannello) rivelaCarte(pannello);   // reveal fresco delle carte della scheda
    });
    caricaDatiScheda(id);
    if (DEMO) aggiornaSpiegazioneDemo();   // aggiorna la spiegazione della scheda
    window.scrollTo({ top: 0, behavior: _menoMoto ? 'auto' : 'smooth' });
  });

  // hamburger (solo mobile): apre/chiude la sidebar
  document.getElementById('apri-menu')?.addEventListener('click', () => {
    const aperto = document.body.classList.toggle('menu-aperto');
    document.getElementById('apri-menu').setAttribute('aria-expanded', aperto ? 'true' : 'false');
  });
  document.getElementById('backdrop')?.addEventListener('click', chiudiMenuMobile);

  // bottoni "magnetici": quando il cursore è sopra un .btn, il bottone si sposta
  // di poco verso il puntatore (stile Awwwards). Su touch/meno-movimento: niente.
  if (!_menoMoto && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    let magBtn = null;
    const smagnetizza = (b) => { if (b) { b.style.removeProperty('--mx'); b.style.removeProperty('--my'); } };
    document.addEventListener('pointermove', (ev) => {
      const b = ev.target.closest?.('.btn');
      if (b !== magBtn) { smagnetizza(magBtn); magBtn = b; }
      if (!b || b.disabled) return;
      const r = b.getBoundingClientRect();
      const dx = ev.clientX - (r.left + r.width / 2);
      const dy = ev.clientY - (r.top + r.height / 2);
      b.style.setProperty('--mx', (dx * 0.22).toFixed(1) + 'px');
      b.style.setProperty('--my', (dy * 0.32).toFixed(1) + 'px');
    }, { passive: true });
    document.addEventListener('pointerdown', () => smagnetizza(magBtn), { passive: true });
  }
}

// via!
initGuscio();
caricaStato();
