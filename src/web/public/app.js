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
    proattivoTg: s.proattivoTg !== false,
    internet: s.internet !== false,
    adattaCanale: s.adattaCanale !== false,
    giochi: s.giochi !== false,
    promoSocial: s.promoSocial !== false,
    nomeMonete: (typeof s.nomeMonete === 'string' && s.nomeMonete.trim()) || 'monete',
    punti: { perMessaggio: 2, ogniSecondi: 60, trivia: 25, duello: 15, slotCosto: 10, slotVinci: 200, slotCoppia: 20, topN: 5, ...(s.punti && typeof s.punti === 'object' ? s.punti : {}) },
    manche: { attivo: false, minMin: 15, maxMin: 45, soloLive: false, ...(s.manche && typeof s.manche === 'object' ? s.manche : {}) },
    premioVip: (s.premioVip && typeof s.premioVip === 'object') ? s.premioVip : { attivo: false, periodo: 'settimana', quanti: 1 },
    antispam: (s.antispam && typeof s.antispam === 'object') ? s.antispam : {},
    tiktok: (s.tiktok && typeof s.tiktok === 'object') ? s.tiktok : { username: '', attivo: false, annunciaChat: false, messaggio: '', postAttivo: false, postAnnunciaChat: false, postMessaggio: '' },
    youtube: (s.youtube && typeof s.youtube === 'object') ? s.youtube : { canale: '', attivo: false, annunciaChat: false, messaggio: '' },
    instagram: (s.instagram && typeof s.instagram === 'object') ? s.instagram : { userId: '', attivo: false, annunciaChat: false, messaggio: '' },
    giochiSito: (s.giochiSito && typeof s.giochiSito === 'object') ? s.giochiSito : { attivo: false, collegato: false },
    frasi: Array.isArray(s.frasi) ? s.frasi : [],
    clipAuto: s.clipAuto !== false,
    clipAutoSoglia: typeof s.clipAutoSoglia === 'number' ? s.clipAutoSoglia : 25,
    clipAutoSensibilita: typeof s.clipAutoSensibilita === 'number' ? s.clipAutoSensibilita
      : (typeof s.clipAutoSoglia === 'number' ? Math.min(10, Math.max(1, Math.round(11 - s.clipAutoSoglia / 5))) : 5),
    paroleVietate: Array.isArray(s.paroleVietate) ? s.paroleVietate : [],
    ascoltoLive: s.ascoltoLive === true,
    ascoltoSensibilita: typeof s.ascoltoSensibilita === 'number' ? s.ascoltoSensibilita : 5,
    cambioCategoria: { attivo: false, trigger: 'categoria', annuncia: true, ...(s.cambioCategoria && typeof s.cambioCategoria === 'object' ? s.cambioCategoria : {}) },
    cambioTitolo: { attivo: false, trigger: 'titolo', annuncia: true, ...(s.cambioTitolo && typeof s.cambioTitolo === 'object' ? s.cambioTitolo : {}) },
    imparaVoce: { attivo: false, ...(s.imparaVoce && typeof s.imparaVoce === 'object' ? s.imparaVoce : {}) },
    penitenze: { attivo: false, premioVieta: '', premioSolo: '', durataMin: 2,
      penitenzeModo: 'lista', penitenze: [], effetto: '', fuzzy: 80,
      overlay: { posizione: 'alto-destra', colore: '#ff2d2d' },
      ...(s.penitenze && typeof s.penitenze === 'object' ? s.penitenze : {}) },
    alerts: (() => {
      const a = (s.alerts && typeof s.alerts === 'object') ? s.alerts : {};
      const ev = (x, d) => ({ attivo: false, testo: '', suono: d.suono, accento: d.colore, volume: 100, minBits: 0, minViewers: 0, ...(x && typeof x === 'object' ? { ...x, accento: x.accento || x.colore || d.colore } : {}) });
      return {
        attivo: a.attivo !== false,
        posizione: ['alto-centro', 'centro', 'basso-centro'].includes(a.posizione) ? a.posizione : 'alto-centro',
        xy: (a.xy && typeof a.xy === 'object') ? a.xy : null,
        durata: typeof a.durata === 'number' ? a.durata : 6000,
        stile: { animazione: 'slide', dimTesto: 27, sfondo: '#0f0f14', opacita: 88, testo: '#ffffff', bordoRaggio: 18, bordoSpessore: 2, glow: true, icona: true, font: 'sistema', ...(a.stile && typeof a.stile === 'object' ? a.stile : {}) },
        follow: ev(a.follow, { suono: 'campanello', colore: '#9146ff' }),
        sub: ev(a.sub, { suono: 'tada', colore: '#ffb020' }),
        cheer: ev(a.cheer, { suono: 'moneta', colore: '#38d39f' }),
        raid: ev(a.raid, { suono: 'trombetta', colore: '#ff4d4d' }),
      };
    })(),
    chatOverlay: (() => {
      const c = (s.chatOverlay && typeof s.chatOverlay === 'object') ? s.chatOverlay : {};
      return {
        attivo: !!c.attivo,
        posizione: ['alto-sinistra', 'alto-destra', 'basso-sinistra', 'basso-destra'].includes(c.posizione) ? c.posizione : 'basso-sinistra',
        xy: (c.xy && typeof c.xy === 'object') ? c.xy : null,
        max: typeof c.max === 'number' ? c.max : 8,
        fadeSec: typeof c.fadeSec === 'number' ? c.fadeSec : 0,
        stile: { dim: 'media', sfondo: '#0f0f14', opacita: 78, testo: '#f2f2f5', username: 'twitch', bordoRaggio: 10, ombra: true, font: 'sistema', larghezza: 30, animazione: 'slide', grassettoUser: true,
          ...(c.stile && typeof c.stile === 'object' ? c.stile : (c.dim ? { dim: c.dim } : {})) },
      };
    })(),
    overlayWidget: (() => {
      const w = (s.overlayWidget && typeof s.overlayWidget === 'object') ? s.overlayWidget : {};
      const wd = (x, testoDef) => ({ attivo: false, posizione: 'basso-destra', testo: testoDef, xy: (x?.xy && typeof x.xy === 'object') ? x.xy : null,
        stile: { dim: 'media', sfondo: '#0f0f14', opacita: 85, testo: '#ffffff', accento: '#9146ff', bordoRaggio: 12, font: 'sistema', ...(x?.stile && typeof x.stile === 'object' ? x.stile : {}) },
        ...(x && typeof x === 'object' ? { attivo: !!x.attivo, posizione: x.posizione || 'basso-destra', testo: x.testo || testoDef } : {}) });
      return { ultimoFollower: wd(w.ultimoFollower, 'Ultimo follower: {nome}'), ultimoSub: wd(w.ultimoSub, 'Ultimo sub: {nome}') };
    })(),
    overlayCss: typeof s.overlayCss === 'string' ? s.overlayCss : '',
    overlayTemplates: Array.isArray(s.overlayTemplates) ? s.overlayTemplates : [],
  };
}

// salva un sottoinsieme di impostazioni e aggiorna lo stato locale
async function salvaImpostazioni(parziale, msgOk = 'Impostazioni salvate') {
  await api('/api/streamer/impostazioni', { method: 'POST', body: parziale });
  if (stato?.streamer) {
    stato.streamer.settings = { ...(stato.streamer.settings || {}), ...parziale };
  }
  if (msgOk) toast(msgOk);   // salvataggi "silenziosi" (msgOk null) non mostrano nulla
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
  // promo "settimana gratis" appena assegnata
  if (new URLSearchParams(location.search).get('promo') === '1') {
    toast(L('Hai ricevuto una settimana Pro gratis — esplora tutto SocialBot!', 'You got a free Pro week — explore all of SocialBot!', 'Tienes una semana Pro gratis — explora todo SocialBot!'));
    try { history.replaceState(null, '', '/'); } catch { /* niente */ }
  }
}

// ------------------------------------------------------------------ modalità demo
// Tutta la logica della demo interattiva. Vive qui, isolata: se DEMO è falso
// niente di questo viene mai eseguito. I dati sono di fantasia (streamer
// "andryx_demo") e servono solo a far vedere com'è fatta e come funziona la
// dashboard, con una spiegazione per ogni sezione.

// Nella demo la persona "Andryx" gestisce il proprio canale (da proprietario) e
// ne modera un altro: così si vede anche lo switcher e il cambio di ruolo.
const _DEMO_CANALI = [
  { canale: 'andryx_demo', display: 'Andryx', role: 'proprietario' },
  { canale: 'lucaplays', display: 'lucaplays', role: 'moderatore' },
];
let _demoCanale = 'andryx_demo';

// Stato finto: una persona con impostazioni e Telegram già configurati, così ogni
// scheda ha qualcosa da mostrare. Riflette il canale/ruolo attualmente scelto.
function statoDemo() {
  const ctx = _DEMO_CANALI.find((c) => c.canale === _demoCanale) || _DEMO_CANALI[0];
  const mod = ctx.role === 'moderatore';
  return {
    user: { login: ctx.canale, display: ctx.display, role: ctx.role, avatar: '',
      identita: 'andryx_demo', identitaDisplay: 'Andryx',
      ...(mod ? { modLogin: 'andryx_demo', modDisplay: 'Andryx' } : {}) },
    ruolo: ctx.role,
    identita: 'andryx_demo', identitaDisplay: 'Andryx',
    tier: 'community', stripeAttivo: false,
    mieiCanali: _DEMO_CANALI,
    gestisce: { canale: ctx.canale, streamer: ctx.display },
    isAdmin: false,
    permessiOk: true, vipOk: true, moderazioneOk: true, canaleOk: true,
    knowledgeCount: 3,
    status: { channels: [ctx.canale] },   // "in chat adesso"
    preaddestramento: { preaddestramento_ts: '2026-05-01T20:00:00Z', preaddestramento_esito: 'pagina profilo letta ("Andryx — creator e streamer da Genova · Twitch, YouTube, gaming"), 5 link social; gioco recente: Fortnite; profilo Twitch letto' },
    telegram: { configurato: true, gruppoOk: true, attivo: true, pinLive: true,
      interattivo: true, botUsername: 'andryx_live_bot', gruppo: 'Community di Andryx', messaggio: '',
      dmModo: 'me', dmCollegato: true, dmNome: 'Andryx' },
    streamer: {
      status: 'approved',
      botEnabled: true,
      settings: {
        tono: 'scherzoso', spontaneita: 0.05, rispostaMenzioni: true, modalita: 'sempre',
        iaLocale: true, proattivo: true, proattivoTg: true, internet: true, adattaCanale: true, giochi: true, promoSocial: true,
        nomeMonete: 'scudi', clipAuto: true, clipAutoSoglia: 25, ascoltoLive: false, ascoltoSensibilita: 5,
        cambioCategoria: { attivo: true, trigger: 'categoria', annuncia: true },
        cambioTitolo: { attivo: false, trigger: 'titolo', annuncia: true },
        imparaVoce: { attivo: false },
        premioVip: { attivo: true, periodo: 'settimana', quanti: 2 },
        manche: { attivo: true, minMin: 20, maxMin: 60, soloLive: false },
        paroleVietate: ['spoiler', 'link-truffa'],
        frasi: ['Benvenuto nel canale!', 'Ricordati di seguire per non perderti le live!'],
        tiktok: { username: 'andryxify', attivo: true, annunciaChat: true, messaggio: '', postAttivo: true, postAnnunciaChat: false, postMessaggio: '' },
        youtube: { canale: '@andryxify', apiKeySet: true, attivo: true, annunciaChat: false, messaggio: '' },
        instagram: { userId: '17841400000000000', tokenSet: true, attivo: true, annunciaChat: false, messaggio: '' },
        giochiSito: { attivo: true, collegato: true },
        antispam: { maiuscole: true, link: true, flood: true },
        penitenze: { attivo: true, premioVieta: 'Vietami una parola', premioSolo: 'Dì solo questa parola',
          durataMin: 2, penitenzeModo: 'lista', penitenze: ['10 flessioni', 'canta la sigla', 'parla in inglese per 1 minuto'],
          effetto: 'airhorn', fuzzy: 80, overlay: { posizione: 'alto-destra', colore: '#ff2d2d' } },
        alerts: { attivo: true, posizione: 'alto-centro', durata: 6000,
          follow: { attivo: true, testo: '{user} ha seguito il canale!', suono: 'campanello', colore: '#9146ff' },
          sub: { attivo: true, testo: '{user} si è abbonato! ({mesi} mesi)', suono: 'tada', colore: '#ffb020' },
          cheer: { attivo: true, testo: '{user} ha lanciato {bits} bit!', suono: 'moneta', colore: '#38d39f', minBits: 100 },
          raid: { attivo: true, testo: '{user} è arrivato in raid con {viewers}!', suono: 'trombetta', colore: '#ff4d4d', minViewers: 2 } },
        chatOverlay: { attivo: false, posizione: 'basso-sinistra', max: 8, fadeSec: 0, dim: 'media' },
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
  if (via === '/api/moderatori') return Promise.resolve({ invito: 'https://socialbot.live/mod?token=demo' });
  if (via === '/api/streamer/apikey') return Promise.resolve({ apikey: 'demo_' + 'x'.repeat(24) });
  if (via === '/api/cambia-canale' || via === '/api/mod/cambia-canale') {
    const ch = opzioni.body?.channel;
    if (_DEMO_CANALI.some((c) => c.canale === ch)) _demoCanale = ch;
    const ctx = _DEMO_CANALI.find((c) => c.canale === _demoCanale);
    return Promise.resolve({ ok: true, ruolo: ctx.role, canale: ctx.canale });
  }
  if (via === '/api/admin/llm/prova') return Promise.resolve({ ok: true, modello: 'mistral-nemo', campione: 'ok' });
  if (via === '/api/streamer/instagram/prova') return Promise.resolve({ ok: true });
  if (via === '/api/tiktok/prova') return Promise.resolve({ ok: true });
  if (via === '/api/tiktok/disconnect') return Promise.resolve({ ok: true });
  if (via === '/api/streamer/citazioni/analizza') return Promise.resolve({ ok: true, citazioni: [
    { testo: 'Tu, molto molto bravo', autore: 'UnicornoFacinoroso', data: '2024-06-09' },
    { testo: 'ti porterò in un brodificio', autore: 'andryxify', data: '2024-06-17' },
  ] });
  if (via === '/api/streamer/citazioni/importa') return Promise.resolve({ ok: true, aggiunte: 2, saltate: 0 });
  if (via.endsWith('/prova')) { toast(L('In demo non invio davvero in chat', 'In demo mode I don\'t really send to chat', 'En demo no envío de verdad al chat')); return Promise.resolve({ ok: true }); }
  return Promise.resolve({ ok: true, demo: true });
}

function _demoGet(via) {
  const F = {
    '/api/me': statoDemo(),
    '/api/tiktok/stato': { appAttiva: true, collegato: true, username: 'andryxify', redirect: 'https://socialbot.live/tiktok/callback' },
    '/api/discord/stato': { configurato: false, attivo: false, messaggio: '', nomeBot: '', avatar: '', anteprima: '' },
    '/api/contatori': { contatori: [{ comando: 'morti', etichetta: 'Morti', emoji: '💀', valore: 3, step: 1, auto_parola: '', reward_id: '', overlayCfg: { mostra: true, x: 6, y: 84, colore: '#ffffff', sfondo: 'transparent', dim: 40, grassetto: true, font: 'system', formato: '{emoji} {etichetta}: {valore}' } }, { comando: 'lol', etichetta: 'Risate', emoji: '😂', valore: 12, step: 1, auto_parola: 'lol', reward_id: '', overlayCfg: { mostra: false, x: 6, y: 84, colore: '#ffffff', sfondo: 'transparent', dim: 40, grassetto: true, font: 'system', formato: '{emoji} {etichetta}: {valore}' } }] },
    '/api/seventv/stato': { collegato: true, username: 'andryxify', setId: 'demo7tvset' },
    '/api/tgapp/login-stato': { attiva: true, oidc: true, bot: 'socialbot', collegato: true, username: 'andryxify', nome: 'Andry' },
    '/api/seventv/emotes': { id: 'demo7tvset', nome: 'andryxify · emotes', capienza: 1000, usate: 4, emotes: [
      { id: '60aeab8df6a2c3b332d92b73', nome: 'peepoHappy', url: 'https://cdn.7tv.app/emote/60aeab8df6a2c3b332d92b73/2x.webp', animato: false },
      { id: '603cb219c20d020014423c34', nome: 'catJAM', url: 'https://cdn.7tv.app/emote/603cb219c20d020014423c34/2x.webp', animato: true },
      { id: '60ae958e229664e8667aea38', nome: 'Clap', url: 'https://cdn.7tv.app/emote/60ae958e229664e8667aea38/2x.webp', animato: true },
      { id: '60aea79b229664e8667a9c99', nome: 'Sadge', url: 'https://cdn.7tv.app/emote/60aea79b229664e8667a9c99/2x.webp', animato: false },
    ] },
    '/api/seventv/cerca': { items: [
      { id: '60aeec1b259ac5a73e56a426', nome: 'EZ', url: 'https://cdn.7tv.app/emote/60aeec1b259ac5a73e56a426/2x.webp', animato: false, autore: '7TV' },
      { id: '60ae65b29627b8f6c5e2dd93', nome: 'PogU', url: 'https://cdn.7tv.app/emote/60ae65b29627b8f6c5e2dd93/2x.webp', animato: false, autore: '7TV' },
      { id: '60b00d1f0d3a78a196f803e3', nome: 'AlienPls', url: 'https://cdn.7tv.app/emote/60b00d1f0d3a78a196f803e3/2x.webp', animato: true, autore: '7TV' },
    ], totale: 3 },
    '/api/admin/llm': {
      scelta: {
        modello: 'gemma-uncensored',
        endpoint: { url: 'http://192.168.1.50:1234/v1', modello: 'mistral-nemo', chiave: '', solo: false },
      },
      modelli: [
        { id: 'auto', nome: 'Automatico (in base alla RAM del server)' },
        { id: 'qwen', nome: 'Qwen 2.5 3B — equilibrato' },
        { id: 'gemma', nome: 'Gemma 2 2B — veloce' },
        { id: 'gemma-uncensored', nome: 'Gemma 2 2B — senza freni (abliterated)' },
      ],
      modelliLocali: [
        { nome: 'lia-forgiata.gguf', mb: 4630 },
        { nome: 'qwen2.5-3b-instruct-q5_k_m.gguf', mb: 2100 },
      ],
      stato: {
        stato: 'pronto', modello: 'gemma-2-2b-it-abliterated-Q4_K_M.gguf',
        endpoint: { configurato: true, url: 'http://192.168.1.50:1234/v1', modello: 'mistral-nemo', solo: false, ok: true, motivo: null },
        rete: { canali: 1, nodi: 128, solidi: 74, curiosita: 0.34, fiducia: 0.61 },
      },
    },
    '/api/streamer/rete': {
      nodi: 128, solidi: 74, corpus: 52, curiosita: 0.34, fiducia: 0.61, lacune: 12,
      non_so: ['come si chiama il tuo gatto?', 'quando esce il prossimo video?'],
      pensiero: 'Mi sono svegliata. So rispondere a 74 cose (fiducia 61%). Oggi voglio capire meglio: «come si chiama il tuo gatto?».',
      ragiona: { fatti: 41, dedotti: 12, contraddizioni: [] },
    },
    '/api/streamer/premi': {
      permessoOk: true,
      effetti: ['airhorn', 'applausi', 'risata'],
      premi: [
        { reward_id: 'r1', titolo: 'Airhorn', costo: 500, effetto: 'airhorn', suono: '', testo: '{user} ha lanciato l\'airhorn!' },
        { reward_id: 'r2', titolo: 'Applauso', costo: 300, effetto: 'applausi', suono: '', testo: '' },
        { reward_id: 'r3', titolo: 'Bevi l\'acqua', costo: 150, effetto: '', suono: 'acqua', testo: '{user} ti ricorda di bere!' },
      ],
      tutti: [
        { id: 'r1', title: 'Airhorn', cost: 500, richiedeTesto: false },
        { id: 'r2', title: 'Applauso', cost: 300, richiedeTesto: false },
        { id: 'r3', title: 'Bevi l\'acqua', cost: 150, richiedeTesto: false },
        { id: 'r4', title: 'Cambia gioco', cost: 2000, richiedeTesto: true },
      ],
    },
    '/api/streamer/guide': {
      guide: [
        { id: 1, testo: 'Non essere mai volgare', dove: 'ovunque', con_chi: 'tutti', ts: '2026-06-01T10:00:00Z' },
        { id: 2, testo: 'Non parlare dei miei progetti', dove: 'ovunque', con_chi: 'tranne-me', ts: '2026-06-02T12:00:00Z' },
        { id: 3, testo: 'Dammi del tu e sii sincera', dove: 'tg-privato', con_chi: 'solo-me', ts: '2026-06-03T09:00:00Z' },
      ],
    },
    '/api/streamer/knowledge': [
      { id: 1, domanda: 'Che PC usi?', risposta: 'Ryzen 7 + RTX 4070, trovi tutto su andryxify.it', fonte: 'manuale', ts: '2026-05-02T18:00:00Z' },
      { id: 2, domanda: 'Da dove streammi?', risposta: 'Da Genova, quasi ogni sera verso le 21', fonte: 'auto', ts: '2026-05-01T20:00:00Z' },
      { id: 3, domanda: 'Come ti seguo ovunque?', risposta: 'Tutti i miei link li trovi su andryxify.it/u/andryx', fonte: 'chat', ts: '2026-05-05T22:10:00Z' },
    ],
    '/api/streamer/citazioni': [
      { n: 1, text: 'Tu, molto molto bravo', autore: 'UnicornoFacinoroso', data: '2024-06-09' },
      { n: 2, text: 'io solo perchè mi andava di uscire', autore: 'chiara_3008', data: '2024-06-10' },
      { n: 3, text: 'ti porterò in un brodificio', autore: 'andryxify', data: '2024-06-17' },
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
      overlayUrl: 'https://socialbot.live/overlay/andryx_demo',
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
        { url: 'https://clips.twitch.tv/demo2', clip_id: 'demo2', reason: 'reazione al jumpscare', ts: '2026-06-18T22:40:00Z' },
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
        azioni: [{ tipo: 'messaggio', testo: 'I miei social: andryxify.it/u/$canale' }] },
      { id: 'pc', nome: 'Setup PC', attivo: true, tipo: 'comando',
        trigger: { tipo: 'comando', comando: 'pc' },
        azioni: [{ tipo: 'messaggio', testo: 'Ryzen 7 + RTX 4070. Dettagli su andryxify.it' }] },
      { id: 'benvenuto', nome: 'Benvenuto', attivo: true, tipo: 'evento',
        trigger: { tipo: 'evento', evento: 'primo-messaggio' },
        azioni: [{ tipo: 'messaggio', testo: 'Benvenuto $user! Mettiti comodo' }] },
      { id: 'dado', nome: 'Tiro di dado', attivo: false, tipo: 'comando',
        trigger: { tipo: 'comando', comando: 'dado' },
        azioni: [{ tipo: 'messaggio', testo: '$user tira il dado e fa... $random(1,6)!' }] },
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
    '/api/streamer/giochi': [
      { id: 1, tipo: 'trivia', nome: 'Trivia gaming', attivo: true, config: { domande: [{ q: 'In che anno è uscito il primo Minecraft?', a: ['2011'] }, { q: 'Chi è la mascotte di PlayStation?', a: ['crash', 'crash bandicoot'] }] } },
      { id: 2, tipo: 'parola', nome: 'Reflex hype', attivo: true, config: { parole: ['pizza', 'combo perfetta', 'gg wp', 'clutch'] } },
    ],
    '/api/penitenze/premi': {
      permessoOk: true, premioVieta: 'Vietami una parola', premioSolo: 'Dì solo questa parola',
      tutti: [
        { id: 'p1', title: 'Vietami una parola', cost: 500, richiedeTesto: true },
        { id: 'p2', title: 'Dì solo questa parola', cost: 800, richiedeTesto: true },
        { id: 'p3', title: 'Airhorn', cost: 200, richiedeTesto: false },
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
     <span class="demo-testo"><strong>${L('Demo di SocialBot', 'SocialBot demo', 'Demo de SocialBot')}</strong> — ${L('stai esplorando la dashboard con dati d\'esempio. Puoi cliccare ovunque; niente viene salvato.', 'you’re exploring the dashboard with sample data. Click anywhere; nothing is saved.', 'estás explorando el panel con datos de ejemplo. Puedes hacer clic en cualquier sitio; no se guarda nada.')}</span>
     <span class="demo-azioni">
       <a class="btn mini" href="https://andryxify.it">${L('Attiva su andryxify.it', 'Activate on andryxify.it', 'Actívalo en andryxify.it')}</a>
       <a class="btn mini secondario" href="/">${L('Esci dalla demo', 'Exit demo', 'Salir de la demo')}</a>
     </span>`;
  cont.insertBefore(barra, header);
  // La spiegazione per-sezione ora è la mini-guida "Come funziona" (guidaSchedaHtml)
  // in cima a ogni scheda: vale sia in demo sia nella dashboard vera, così è una
  // sola, coerente. Niente più striscia demo separata (evita doppioni).
}

// Retrocompat: la spiegazione demo è confluita nella guida di scheda. No-op.
function aggiornaSpiegazioneDemo() { /* sostituita da guidaSchedaHtml() */ }

// ------------------------------------------------------------------ render principale

function render() {
  renderAreaUtente();
  const navTop = document.getElementById('nav-top');
  const navDrawer = document.getElementById('nav-drawer');
  const svuotaNav = () => { if (navTop) navTop.innerHTML = ''; if (navDrawer) navDrawer.innerHTML = ''; };

  // "vetrina": la landing pubblica per chi non è loggato (nessun dato privato).
  document.body.classList.toggle('vetrina', !stato.user);

  if (!stato.user) {
    document.body.classList.remove('con-nav');
    svuotaNav();
    renderHero();
    applicaTema();   // allinea l'etichetta dell'interruttore tema nella vetrina
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
  if (navTop) navTop.innerHTML = conPiattaforma ? navTopHtml() : '';
  if (navDrawer) navDrawer.innerHTML = conPiattaforma ? navDrawerHtml() : '';
  aggiornaTestataPagina();

  if (conPiattaforma) attivaPiattaforma();
  if (stato.isAdmin) { caricaTabellaAdmin(); caricaAnima(); caricaLLM(); }

  // prima le rendo richiudibili (cambia il DOM), poi le rivelo
  if (conPiattaforma) document.querySelectorAll('.pannello-scheda').forEach((p) => rendiCartePieghevoli(p, p.dataset.scheda));
  rivelaCarte();   // scroll-reveal delle carte appena disegnate
}

// ------------------------------------------------------------------ scroll-reveal
// Le carte entrano morbide quando compaiono (al cambio scheda o scorrendo),
// stile Awwwards. Un solo IntersectionObserver, riusato ad ogni render.
const _menoMoto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Esegue `fn` (che modifica il DOM) dentro una View Transition: il browser anima
// morbidamente il passaggio — morph del corpo pagina e scorrimento della pillola
// del menu. Niente transizione con "meno movimento", dove l'API non c'è, o in
// modalità cassetto (≤1200px): lì la nav non è a schermo → meglio un cambio netto.
function transizione(fn) {
  const drawer = window.matchMedia && window.matchMedia('(max-width: 1200px)').matches;
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
    // cascata corta: 4 elementi × 45ms = 180ms al massimo. Con ritardi più lunghi
    // l'ultima carta arrivava mezzo secondo dopo la prima e sembrava un blocco.
    c.style.setProperty('--rev-delay', visibile ? Math.min(inVista++, 4) * 45 + 'ms' : '0ms');
    obs.observe(c);
  }
}

// ------------------------------------------------------- carte richiudibili
// Ogni carta con un <h2> diventa apribile/richiudibile cliccando il titolo. Lo
// facciamo per "arricchimento progressivo" DOPO il render: così non serve
// toccare le decine di template delle carte, e una carta nuova lo eredita
// gratis. Il corpo va in un wrapper a griglia (0fr↔1fr) che si anima senza
// misurare altezze a mano (vedi .carta-corpo nel CSS).
// Lo stato aperto/chiuso si ricorda per scheda+titolo in localStorage.
const _icoChevron = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

// chiave stabile per ricordare lo stato: scheda + titolo normalizzato
function _chiaveCarta(scheda, titolo) {
  return 'carta:' + scheda + ':' + String(titolo || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 50);
}
function _cartaChiusa(k) { try { return localStorage.getItem(k) === '0'; } catch { return false; } }
function _ricordaCarta(k, aperta) { try { localStorage.setItem(k, aperta ? '1' : '0'); } catch { /* niente */ } }

// Riassunto mostrato quando la carta è chiusa: la prima frase del primo <p>.
function _riassuntoCarta(corpo) {
  const p = corpo.querySelector('p');
  const t = (p?.textContent || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const primaFrase = t.split(/(?<=[.!?])\s/)[0] || t;
  return primaFrase.length > 120 ? primaFrase.slice(0, 117).trimEnd() + '…' : primaFrase;
}

// Trasforma le carte di `scope` in carte richiudibili (idempotente).
function rendiCartePieghevoli(scope, scheda) {
  for (const carta of scope.querySelectorAll('.carta')) {
    if (carta.classList.contains('pieghevole')) continue;          // già fatta
    if (carta.tagName === 'DETAILS') continue;                     // già un <details>
    const h2 = carta.querySelector(':scope > h2');
    if (!h2) continue;                                             // senza titolo non si piega
    // tutto ciò che segue l'h2 diventa il "corpo" della carta
    const resto = [];
    for (let n = h2.nextSibling; n; n = n.nextSibling) resto.push(n);
    if (!resto.length) continue;                                   // carta di sola intestazione

    const corpo = document.createElement('div');
    corpo.className = 'carta-corpo';
    const dentro = document.createElement('div');
    dentro.className = 'carta-corpo-in';
    resto.forEach((n) => dentro.appendChild(n));
    corpo.appendChild(dentro);
    carta.appendChild(corpo);

    // titolo = pulsante accessibile (tastiera + screen reader)
    const chev = document.createElement('span');
    chev.className = 'carta-chevron';
    chev.innerHTML = _icoChevron;
    h2.appendChild(chev);
    h2.setAttribute('role', 'button');
    h2.setAttribute('tabindex', '0');

    // riassunto sotto il titolo quando è chiusa
    const testo = _riassuntoCarta(dentro);
    if (testo) {
      const r = document.createElement('p');
      r.className = 'carta-riassunto';
      r.textContent = testo;
      h2.insertAdjacentElement('afterend', r);
    }

    carta.classList.add('pieghevole');
    const k = _chiaveCarta(scheda || schedaAttiva, h2.textContent);
    carta.dataset.ck = k;
    if (_cartaChiusa(k)) carta.classList.add('chiusa');
    h2.setAttribute('aria-expanded', carta.classList.contains('chiusa') ? 'false' : 'true');
  }
}

// Apre/chiude una carta (e ricorda la scelta).
function _piegaCarta(carta, aperta) {
  carta.classList.toggle('chiusa', !aperta);
  carta.querySelector(':scope > h2')?.setAttribute('aria-expanded', aperta ? 'true' : 'false');
  if (carta.dataset.ck) _ricordaCarta(carta.dataset.ck, aperta);
}

// Barra "Apri tutto / Riduci tutto" in cima alla scheda attiva.
function barraCarteHtml() {
  return `<div class="carte-ctrl">
    <button type="button" class="btn secondario mini" data-carte="apri">${L('Apri tutto', 'Expand all', 'Abrir todo')}</button>
    <button type="button" class="btn secondario mini" data-carte="chiudi">${L('Riduci tutto', 'Collapse all', 'Reducir todo')}</button>
    <span class="suggerimento">${L('Clicca il titolo di una scheda per aprirla o ridurla.', 'Click a card’s title to expand or collapse it.', 'Haz clic en el título de una tarjeta para abrirla o reducirla.')}</span>
  </div>`;
}

function renderAreaUtente() {
  const areaMob = document.getElementById('area-utente-mob');
  if (!stato.user) { if (areaUtente) areaUtente.innerHTML = ''; if (areaMob) areaMob.innerHTML = ''; return; }

  // Identità della persona (fissa) + il canale che sta gestendo ora. Se può
  // gestire più canali (il proprio + quelli che modera) mostra uno switcher che
  // riporta il RUOLO per canale: cambiando canale il sito capisce da sé chi sei.
  const canali = stato.mieiCanali || [];
  const ident = esc(stato.identitaDisplay || stato.user.identitaDisplay || stato.user.modDisplay || stato.user.display || 'tu');
  const attuale = stato.user.login;
  const etichetta = (c) => (c.role === 'proprietario' ? 'il mio canale @' : 'moderi @') + c.display;

  // Selettore del canale (o chip "moderi @…"): condiviso tra barra e cassetto.
  let centro = '';
  if (canali.length > 1) {
    centro = `<select class="chip-utente switch-canale" title="Cambia canale">
      ${canali.map((c) => `<option value="${esc(c.canale)}" ${c.canale === attuale ? 'selected' : ''}>${esc(etichetta(c))}</option>`).join('')}
    </select>`;
  } else if (stato.ruolo === 'moderatore') {
    centro = `<span class="chip-utente">moderi <strong>@${esc(stato.user.display || attuale)}</strong></span>`;
  }
  const esci = `<a class="btn secondario mini" href="/auth/logout">${L('Esci', 'Log out', 'Salir')}</a>`;
  const tema = toggleTemaHtml();

  // Barra in alto (desktop): versione compatta — lingua + tema + canale + esci, senza saluto.
  if (areaUtente) areaUtente.innerHTML = `${selettoreLingua('mini')}${tema}${centro}${esci}`;
  // Cassetto (mobile): versione completa — saluto + canale + lingua + tema + esci.
  if (areaMob) areaMob.innerHTML = `<span class="chip-utente">${L('ciao', 'hi', 'hola')}, <strong>${ident}</strong></span>${centro}<div class="drawer-controlli">${selettoreLingua()}${tema}</div>${esci}`;
  applicaTema();

  document.querySelectorAll('.switch-canale').forEach((sel) =>
    sel.addEventListener('change', (ev) => conErrore(async () => {
      await api('/api/cambia-canale', { method: 'POST', body: { channel: ev.target.value } });
      stato = await api('/api/me'); render();
      toast(L('Ora gestisci @', 'Now managing @', 'Ahora gestionas @') + (stato.user.display || stato.user.login) + (stato.ruolo === 'moderatore' ? L(' come moderatore', ' as moderator', ' como moderador') : L(' come proprietario', ' as owner', ' como propietario')));
    })));
}

// ------------------------------------------------------------------ viste "semplici"

// ====================================================================== i18n
// Tre lingue come andryxify.it: italiano, inglese, spagnolo. Fase 1 = landing
// pubblica; la dashboard verrà tradotta in seguito, in fasi. La scelta è
// ricordata in localStorage; L(it, en, es) restituisce la stringa della lingua
// attiva (fallback: italiano).
const LINGUE = ['it', 'en', 'es'];
let LINGUA = (() => {
  try { const s = localStorage.getItem('lingua'); if (LINGUE.includes(s)) return s; } catch (e) { /* niente */ }
  const q = new URLSearchParams(location.search).get('lang');
  if (LINGUE.includes(q)) return q;
  const n = (navigator.language || 'it').slice(0, 2).toLowerCase();
  return LINGUE.includes(n) ? n : 'it';
})();
try { document.documentElement.lang = LINGUA; } catch (e) { /* niente */ }
const L = (it, en, es) => (LINGUA === 'en' ? en : LINGUA === 'es' ? es : it);
function cambiaLingua(l) {
  if (!LINGUE.includes(l) || l === LINGUA) return;
  LINGUA = l;
  try { localStorage.setItem('lingua', l); } catch (e) { /* niente */ }
  try { document.documentElement.lang = l; } catch (e) { /* niente */ }
  render();
}
// Selettore lingua IT/EN/ES (usato nella vetrina).
function selettoreLingua(cls) {
  return `<div class="lingua-sel${cls ? ' ' + cls : ''}" role="group" aria-label="${L('Lingua', 'Language', 'Idioma')}">${LINGUE.map((l) =>
    `<button type="button" class="lingua-btn${l === LINGUA ? ' on' : ''}" data-lingua="${l}" aria-pressed="${l === LINGUA}">${l.toUpperCase()}</button>`).join('')}</div>`;
}

// ====================================================================== tema
// Chiaro/scuro. "auto" segue il sistema (prefers-color-scheme); appena l'utente
// tocca l'interruttore la scelta diventa esplicita e viene salvata — esattamente
// come la lingua. Lo script inline in <head> imposta già data-theme prima del
// primo disegno (niente lampo): qui gestiamo il cambio a runtime.
let TEMA = (() => { try { return localStorage.getItem('tema') || 'auto'; } catch (e) { return 'auto'; } })();
function _sistemaScuro() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) { return false; }
}
function temaScuroAttivo() { return TEMA === 'dark' || (TEMA === 'auto' && _sistemaScuro()); }
function applicaTema() {
  const scuro = temaScuroAttivo();
  try { document.documentElement.setAttribute('data-theme', scuro ? 'dark' : 'light'); } catch (e) { /* niente */ }
  const et = scuro
    ? L('Passa al tema chiaro', 'Switch to light theme', 'Cambiar a tema claro')
    : L('Passa al tema scuro', 'Switch to dark theme', 'Cambiar a tema oscuro');
  document.querySelectorAll('[data-tema-toggle]').forEach((b) => { b.setAttribute('aria-label', et); b.title = et; });
}
function cambiaTema() {
  TEMA = temaScuroAttivo() ? 'light' : 'dark';
  try { localStorage.setItem('tema', TEMA); } catch (e) { /* niente */ }
  applicaTema();
}
// Se l'utente non ha scelto (resta "auto"), segui i cambi di sistema in tempo reale.
try {
  const _mq = window.matchMedia('(prefers-color-scheme: dark)');
  const _onSys = () => { if (TEMA === 'auto') applicaTema(); };
  if (_mq.addEventListener) _mq.addEventListener('change', _onSys);
  else if (_mq.addListener) _mq.addListener(_onSys);
} catch (e) { /* niente */ }
// Delego il click una sola volta: funziona per ogni interruttore, anche ricreato.
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('[data-tema-toggle]');
  if (t) { e.preventDefault(); cambiaTema(); }
});
// Stesso schema per la lingua: un solo handler delegato copre vetrina, barra e cassetto.
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-lingua]');
  if (b) { e.preventDefault(); cambiaLingua(b.dataset.lingua); }
});
// Interruttore sole/luna. Icone a tratto (niente emoji); la CSS mostra il sole
// in tema scuro (per tornare al chiaro) e la luna in tema chiaro.
function toggleTemaHtml(extra) {
  const sole = '<svg class="ico-sole" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const luna = '<svg class="ico-luna" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"/></svg>';
  return `<button type="button" class="tema-toggle${extra ? ' ' + extra : ''}" data-tema-toggle>${sole}${luna}</button>`;
}

// Anteprima "overlay in azione" nell'hero: un fotogramma di diretta stilizzato
// (alert + chat a schermo + webcam) — puro CSS, comunica il prodotto a colpo
// d'occhio. Decorativo (aria-hidden), nessun dato reale.
function heroAnteprima() {
  const star = '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
  const msg = (col, nome, testo, emote) => `<div class="vp-msg"><b style="color:${col}">${nome}</b> ${testo}${emote ? ' <span class="vp-emote"></span>' : ''}</div>`;
  return `<div class="vetrina-preview" aria-hidden="true">
    <div class="vp-frame">
      <span class="vp-scene">${L('SCHERMO / GIOCO', 'SCREEN / GAME', 'PANTALLA / JUEGO')}</span>
      <span class="vp-live">● LIVE</span>
      <div class="vp-alert"><span class="vp-alert-ic">${star}</span><span class="vp-alert-tx"><b>${L('Nuovo follower!', 'New follower!', '¡Nuevo follower!')}</b> MarioRossi</span></div>
      <div class="vp-cam">webcam</div>
      <div class="vp-chat">
        ${msg('#ff5c8a', 'lucaplays', L('ciao a tutti!', 'hi everyone!', '¡hola a todos!'))}
        ${msg('#5b8def', 'giada_ttv', L('che bella live', 'great stream', 'qué buen directo'), true)}
        ${msg('#2fb98a', 'marco99', 'GG!')}
      </div>
    </div>
    <p class="vp-cap">${L("L'overlay in azione: alert, chat a schermo e widget — tutto personalizzabile.", 'The overlay in action: alerts, on-screen chat and widgets — fully customizable.', 'El overlay en acción: alertas, chat en pantalla y widgets — todo personalizable.')}</p>
  </div>`;
}

function renderHero() {
  const errore = new URLSearchParams(location.search).get('errore');
  const msgErrore = {
    'access_denied': L('Hai annullato l’accesso su Twitch.', 'You cancelled the Twitch login.', 'Has cancelado el acceso con Twitch.'),
    'state': L('Sessione di accesso scaduta, riprova.', 'Login session expired, please try again.', 'Sesión de acceso caducada, inténtalo de nuevo.'),
    'validazione': L('Twitch non ha confermato il tuo accesso, riprova.', 'Twitch didn’t confirm your login, please try again.', 'Twitch no confirmó tu acceso, inténtalo de nuevo.'),
    'account-diverso': L('Hai autorizzato un account diverso da quello con cui sei loggato: usa lo stesso account.', 'You authorised a different account than the one you’re logged in with: use the same account.', 'Has autorizado una cuenta distinta a la de tu sesión: usa la misma cuenta.'),
  }[errore] || (errore ? L('Errore di accesso: ', 'Login error: ', 'Error de acceso: ') + errore : null);

  const STEP = [
    ['1', L('Accedi con Twitch', 'Log in with Twitch', 'Entra con Twitch'), L('Un click, con lo stesso account con cui streammi.', 'One click, with the same account you stream with.', 'Un clic, con la misma cuenta con la que haces directo.')],
    ['2', L('Parti con l’Essenziale', 'Start with Essenziale', 'Empieza con Essenziale'), L('Gratis e senza carta: comandi illimitati, moderazione, overlay e contatori sono già tuoi.', 'Free, no card needed: unlimited commands, moderation, overlay and counters are already yours.', 'Gratis y sin tarjeta: comandos ilimitados, moderación, overlay y contadores ya son tuyos.')],
    ['3', L('Aggiungi solo ciò che vuoi', 'Add only what you want', 'Añade solo lo que quieras'), L('Se ti serve di più, scegli i pacchetti uno per uno. Niente di tutto-o-nulla.', 'If you need more, pick packages one by one. No all-or-nothing.', 'Si necesitas más, eliges los paquetes uno a uno. Nada de todo o nada.')],
  ];
  // Domande frequenti: rispecchiano i dati strutturati FAQPage in index.html
  // (Google mostra le FAQ nei risultati solo se sono anche visibili qui).
  const FAQ = [
    [L('Con quale account scrive SocialBot in chat?', 'Which account does SocialBot write with in chat?', '¿Con qué cuenta escribe SocialBot en el chat?'), L('Con il <strong>tuo</strong>: SocialBot usa il tuo account Twitch, non un bot anonimo. In chat compare il tuo nome e sei sempre tu ad avere il controllo.', 'With <strong>yours</strong>: SocialBot uses your Twitch account, not an anonymous bot. Your name shows in chat and you’re always in control.', 'Con la <strong>tuya</strong>: SocialBot usa tu cuenta de Twitch, no un bot anónimo. En el chat aparece tu nombre y siempre tienes el control.')],
    [L('Che cosa sa fare?', 'What can it do?', '¿Qué sabe hacer?'), L('Comandi e automazioni su misura, moderazione della chat, clip automatiche, minigiochi con monete, notifiche live su Telegram e avvisi dei nuovi post su TikTok, YouTube e Instagram. E lo piloti anche a voce.', 'Custom commands and automations, chat moderation, automatic clips, coin minigames, live Telegram notifications and alerts for new posts on TikTok, YouTube and Instagram. And you can drive it by voice too.', 'Comandos y automatizaciones a medida, moderación del chat, clips automáticos, minijuegos con monedas, notificaciones en directo por Telegram y avisos de nuevas publicaciones en TikTok, YouTube e Instagram. Y también lo controlas por voz.')],
    [L('SocialBot è in italiano?', 'Is SocialBot multilingual?', '¿SocialBot está en varios idiomas?'), L('Sì, ed è disponibile in italiano, inglese e spagnolo.', 'Yes: it’s available in Italian, English and Spanish.', 'Sí: está disponible en italiano, inglés y español.')],
    [L('Posso provarlo senza registrarmi?', 'Can I try it without signing up?', '¿Puedo probarlo sin registrarme?'), L('Sì, c’è una <a href="/?demo=1">demo interattiva</a> con dati d’esempio: la apri con un click, senza accesso.', 'Yes, there’s an <a href="/?demo=1">interactive demo</a> with sample data: open it with one click, no login.', 'Sí, hay una <a href="/?demo=1">demo interactiva</a> con datos de ejemplo: la abres con un clic, sin acceso.')],
    [L('Come si attiva sul mio canale?', 'How do I activate it on my channel?', '¿Cómo lo activo en mi canal?'), L('In due modi. Se sei già un membro abilitato della community di <a href="https://andryxify.it">andryxify.it</a>, SocialBot è gratis e completo: accedi con Twitch e attivi la dashboard. Altrimenti scegli un piano — con l’abbonamento entri subito, direttamente da qui.', 'Two ways. If you’re already an enabled member of the <a href="https://andryxify.it">andryxify.it</a> community, SocialBot is free and complete: log in with Twitch and activate the dashboard. Otherwise pick a plan — with a subscription you’re in right away, from here.', 'De dos formas. Si ya eres miembro habilitado de la comunidad de <a href="https://andryxify.it">andryxify.it</a>, SocialBot es gratis y completo: entra con Twitch y activas el panel. Si no, elige un plan — con la suscripción entras al instante, desde aquí.')],
  ];

  app.innerHTML = `
    ${msgErrore ? `<div class="carta avviso"><p>${esc(msgErrore)}</p></div>` : ''}

    <section class="vetrina-hero">
      <div class="vetrina-controlli">${selettoreLingua()}${toggleTemaHtml()}</div>
      <span class="vetrina-occhiello">${L('SocialBot · il bot di andryxify.it', 'SocialBot · the bot by andryxify.it', 'SocialBot · el bot de andryxify.it')}</span>
      <h1 class="vetrina-titolo">${titoloParole(L('Il bot per Twitch che parla', 'The Twitch bot that speaks', 'El bot de Twitch que habla'))} <span class="acc">${titoloParole(L('con la tua voce', 'with your own voice', 'con tu propia voz'), 5)}</span></h1>
      <p class="vetrina-sub">${L('<strong>Bot per Twitch in italiano</strong> che vive nella tua chat e scrive <strong>con il tuo account</strong> — niente bot anonimi. Comandi su misura, moderazione, <strong>overlay per OBS</strong>, clip, musica e persino <strong>dirette dal browser senza OBS</strong>.', '<strong>Twitch bot</strong> that lives in your chat and writes <strong>with your own account</strong> — no anonymous bots. Custom commands, moderation, <strong>OBS overlay</strong>, clips, music and even <strong>going live from the browser without OBS</strong>.', '<strong>Bot para Twitch</strong> que vive en tu chat y escribe <strong>con tu cuenta</strong> — nada de bots anónimos. Comandos a medida, moderación, <strong>overlay para OBS</strong>, clips, música e incluso <strong>directos desde el navegador sin OBS</strong>.')}</p>
      <div class="vetrina-azioni">
        <a class="btn grande" href="/entra">${L('Accedi con Twitch', 'Log in with Twitch', 'Entra con Twitch')}</a>
        <a class="btn grande secondario" href="/?demo=1">▶ ${L('Prova la demo', 'Try the demo', 'Prueba la demo')}</a>
      </div>
      <ul class="vetrina-chip" aria-label="${L('In breve', 'At a glance', 'En breve')}">
        ${[L('In italiano', 'Multilingual', 'Multilingüe'), L('Scrive col tuo account', 'Uses your account', 'Con tu cuenta'), L('Anche senza OBS', 'Even without OBS', 'Incluso sin OBS'), L('Gratis per la community', 'Free for the community', 'Gratis para la comunidad')].map((t) =>
          `<li>${_bIco('<path d="M20 6 9 17l-5-5"/>')}${t}</li>`).join('')}
      </ul>
      ${heroAnteprima()}
      <p class="nota">${L('Con «Accedi con Twitch» entri <strong>subito nella dashboard</strong> se sei uno streamer <strong>abilitato</strong> su <a href="https://andryxify.it">andryxify.it</a> o hai un <strong>abbonamento</strong> — <strong>senza passkey</strong>. Altrimenti da qui scegli un piano.', 'With «Log in with Twitch» you go <strong>straight to the dashboard</strong> if you’re an <strong>enabled</strong> streamer on <a href="https://andryxify.it">andryxify.it</a> or you have a <strong>subscription</strong> — <strong>no passkey</strong>. Otherwise pick a plan from here.', 'Con «Entra con Twitch» accedes <strong>directo al panel</strong> si eres un streamer <strong>habilitado</strong> en <a href="https://andryxify.it">andryxify.it</a> o tienes una <strong>suscripción</strong> — <strong>sin passkey</strong>. Si no, elige un plan desde aquí.')}</p>
      <p class="vetrina-accessi">${L('Preferisci un altro modo?', 'Prefer another way?', '¿Prefieres otra forma?')}
        <a href="/sblocca">${L('Entra con passkey', 'Log in with a passkey', 'Entra con passkey')}</a>
        <span aria-hidden="true">·</span>
        <a href="/mod">${L('Accesso moderatore', 'Moderator access', 'Acceso moderador')}</a>
      </p>
    </section>

    ${capacitaHtml()}

    <section class="carta rivela vetrina-come">
      <h2>${L('Come si attiva', 'How to get started', 'Cómo se activa')}</h2>
      <div class="vetrina-passi">
        ${STEP.map(([n, t, d]) => `
          <div class="vetrina-passo">
            <span class="vetrina-passo-n">${n}</span>
            <div><strong>${t}</strong><p>${d}</p></div>
          </div>`).join('')}
      </div>
    </section>

    <section class="vetrina-piani" id="vetrina-piani" aria-label="${L('Piani', 'Plans', 'Planes')}"></section>

    <section class="carta rivela vetrina-faq" aria-label="${L('Domande frequenti', 'FAQ', 'Preguntas frecuentes')}">
      <h2>${L('Domande frequenti', 'Frequently asked questions', 'Preguntas frecuentes')}</h2>
      ${FAQ.map(([q, a]) => `<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`).join('')}
    </section>

    <section class="carta rivela vetrina-cta">
      <div>
        <h2>${L('Fai parte di andryxify.it', 'Part of andryxify.it', 'Parte de andryxify.it')}</h2>
        <p>${L('SocialBot è uno dei tasselli del mondo andryxify: profili, giochi e community in un unico posto.', 'SocialBot is one piece of the andryxify world: profiles, games and community in one place.', 'SocialBot es una pieza del mundo andryxify: perfiles, juegos y comunidad en un solo lugar.')}</p>
      </div>
      <a class="btn grande secondario" href="https://andryxify.it">${L('Vai al sito principale', 'Go to the main site', 'Ir al sitio principal')} →</a>
    </section>`;

  // il selettore lingua è gestito da un handler delegato a livello di documento
  rivelaCarte();   // scroll-reveal delle carte della vetrina
  caricaPiani();   // riempie la sezione prezzi (tier) dal server
  // esiti del ritorno da Stripe
  const q = new URLSearchParams(location.search);
  if (q.get('abbonato') === '1') toast(L('Abbonamento attivo, benvenuto!', 'Subscription active, welcome!', 'Suscripción activa, ¡bienvenido!'));
  else if (q.get('abbonamento') === 'annullato') toast(L('Checkout annullato — nessun addebito.', 'Checkout canceled — no charge.', 'Pago cancelado — sin cargo.'));
}

// Icone dei piani: SVG in linea (stile Lucide, tratto pulito) invece delle emoji
// — più "disegnate" e in tinta col brand. Stringhe statiche e fidate (nessun
// input utente), quindi si iniettano come HTML senza rischi. `currentColor` così
// ereditano il viola del contenitore.
const SVG_PIANI = {
  base: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  giochi: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
  effetti: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
  notifiche: '<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/><path d="M8 6v8"/>',
  clip: '<path d="m12.296 3.464 3.02 3.956"/><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m6.18 5.276 3.1 3.899"/>',
  voce: '<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
  squadra: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  musica: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
};
const svgPiano = (id) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG_PIANI[id] || SVG_PIANI.base}</svg>`;

// Riempie la sezione "Piani" della vetrina col modello MODULARE "componi il tuo
// bot": una Base + add-on à la carte selezionabili, con totale live. Se gli
// abbonamenti sono spenti mostra comunque tutto, con la CTA "In arrivo".
async function caricaPiani() {
  const box = document.getElementById('vetrina-piani');
  if (!box) return;
  let dati;
  try { dati = await api('/api/abbonamento/piani'); } catch { box.remove(); return; }
  const base = dati.base;
  const addon = dati.addon || [];
  const bundle = dati.bundle || [];
  if (!base) { box.remove(); return; }

  const prezzoIt = (n) => Number(n || 0).toFixed(2).replace('.', ',');
  const perMese = L('/mese', '/month', '/mes');
  // Cosa include la Base (copy curata, non guidata dalla matrice grezza).
  const inclusiBase = [
    L('Comandi & moduli illimitati', 'Unlimited commands & modules', 'Comandos y módulos ilimitados'),
    L('Antispam & moderazione', 'Anti-spam & moderation', 'Antispam y moderación'),
    L('Overlay per OBS', 'OBS overlay', 'Overlay para OBS'),
    L('1 moderatore incluso', '1 moderator included', '1 moderador incluido'),
  ];

  box.innerHTML = `
    <div class="vetrina-piani-testa">
      <h2>${L('Componi il tuo bot', 'Build your bot', 'Compón tu bot')}</h2>
      <p>${dati.attivo
        ? L('Parti dalla Base e aggiungi solo i super-poteri che ti servono.', 'Start from Base and add only the super-powers you need.', 'Empieza por la Base y añade solo los súper-poderes que necesitas.')
        : L('Presto potrai attivarlo — parti dalla Base e aggiungi solo i super-poteri che ti servono.', 'Coming soon — start from Base and add only the super-powers you need.', 'Muy pronto — empieza por la Base y añade solo los súper-poderes que necesitas.')}</p>
    </div>
    <div class="piani-componi">
      <div class="piano-base carta rivela">
        <div class="piano-base-testa">
          <span class="piano-icona">${svgPiano('base')}</span>
          <div>
            <h3>${esc(base.nome)}</h3>
            <p class="piano-somm">${esc(base.sommario)}</p>
          </div>
          <div class="piano-prezzo">€${prezzoIt(base.prezzo)}<span>${perMese}</span></div>
        </div>
        <ul class="piano-funzioni">
          ${inclusiBase.map((t) => `<li><span class="pf-val si">✓</span> ${esc(t)}</li>`).join('')}
        </ul>
      </div>

      ${bundle.length ? (() => {
        const maxSc = Math.round(Math.max(0, ...bundle.map((b) => b.sconto || 0)) * 100);
        return `<div class="bundle-blocco">
        <h4 class="addon-titolo">${L('Bundle pronti', 'Ready-made bundles', 'Packs listos')}${maxSc > 0 ? ` <span>· ${L('fino al', 'up to', 'hasta')} –${maxSc}% ${L('sugli add-on', 'on add-ons', 'en los add-on')}</span>` : ''}</h4>
        <div class="bundle-griglia">
          ${bundle.map((b) => {
            const risp = b.prezzoPieno > b.prezzo;
            return `<button type="button" class="bundle-carta" data-bundle="${esc(b.id)}" aria-pressed="false">
              <span class="bundle-icona">${svgPiano(b.addon[0] || 'base')}</span>
              <span class="bundle-prezzo">${risp ? `<span class="bundle-sconto">–${Math.round(b.sconto * 100)}%</span> <s>+€${prezzoIt(b.prezzoPieno)}</s> ` : ''}<strong>+€${prezzoIt(b.prezzo)}</strong><small>${perMese}</small></span>
              <span class="bundle-testo">
                <span class="bundle-nome">${esc(b.nome)}</span>
                <span class="bundle-somm">${esc(b.sommario)}</span>
              </span>
            </button>`;
          }).join('')}
        </div>
      </div>`;
      })() : ''}

      <div class="addon-blocco">
        <h4 class="addon-titolo">${L('Aggiungi super-poteri', 'Add super-powers', 'Añade súper-poderes')} <span>· à la carte</span></h4>
        <div class="addon-griglia">
          ${addon.map((a) => `
            <button type="button" class="addon-carta" data-addon="${esc(a.id)}" aria-pressed="false">
              <span class="addon-icona">${svgPiano(a.id)}</span>
              <span class="addon-testo">
                <span class="addon-nome">${esc(a.nome)}</span>
                <span class="addon-somm">${esc(a.sommario)}</span>
              </span>
              <span class="addon-prezzo">+€${prezzoIt(a.prezzo)}</span>
            </button>`).join('')}
        </div>
      </div>

      <div class="piani-riepilogo">
        <div class="riepilogo-conto">
          <span class="riepilogo-voce" id="piani-voce">${L('Solo Base', 'Base only', 'Solo Base')}</span>
          <span class="riepilogo-tot" id="piani-totale">€${prezzoIt(base.prezzo)}<span>${perMese}</span></span>
        </div>
        ${dati.attivo
          ? `<button class="btn grande" id="piani-attiva">${L('Attiva SocialBot', 'Activate SocialBot', 'Activa SocialBot')} →</button>`
          : `<button class="btn grande secondario" disabled>${L('In arrivo', 'Coming soon', 'Muy pronto')}</button>`}
      </div>
    </div>
    <div class="piani-community">
      ${L('<strong>Sei già un membro abilitato della community di <a href="https://andryxify.it">andryxify.it</a>?</strong> SocialBot è <strong>gratis e completo</strong> per te — non ti serve nessun piano.', '<strong>Already an enabled member of the <a href="https://andryxify.it">andryxify.it</a> community?</strong> SocialBot is <strong>free and complete</strong> for you — no plan needed.', '<strong>¿Ya eres miembro habilitado de la comunidad de <a href="https://andryxify.it">andryxify.it</a>?</strong> SocialBot es <strong>gratis y completo</strong> para ti — no necesitas ningún plan.')}
    </div>`;
  rivelaCarte(box);

  // Selezione add-on + totale live. Un bundle è attivo quando la selezione
  // coincide ESATTAMENTE con i suoi add-on: allora si applica lo sconto.
  const selezione = new Set();
  const totaleEl = box.querySelector('#piani-totale');
  const voceEl = box.querySelector('#piani-voce');
  const bundleAttivo = () => bundle.find((b) => b.addon.length === selezione.size && b.addon.every((id) => selezione.has(id))) || null;
  const aggiorna = () => {
    const b = bundleAttivo();
    let tot = Number(base.prezzo || 0) + (b ? Number(b.prezzo || 0)
      : [...selezione].reduce((t, id) => t + Number(addon.find((x) => x.id === id)?.prezzo || 0), 0));
    if (totaleEl) totaleEl.innerHTML = `€${prezzoIt(tot)}<span>${perMese}</span>`;
    if (voceEl) voceEl.textContent = b ? `${L('Base + bundle', 'Base + bundle', 'Base + pack')} ${b.nome} (–${Math.round(b.sconto * 100)}%)`
      : (selezione.size ? `Base + ${selezione.size} ${L('add-on', selezione.size === 1 ? 'add-on' : 'add-ons', 'add-on')}` : L('Solo Base', 'Base only', 'Solo Base'));
    // evidenzia la carta bundle corrispondente (o nessuna)
    box.querySelectorAll('[data-bundle]').forEach((el) => {
      const on = !!b && el.dataset.bundle === b.id;
      el.classList.toggle('on', on); el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };
  const segnaAddon = () => box.querySelectorAll('[data-addon]').forEach((el) => {
    const on = selezione.has(el.dataset.addon);
    el.classList.toggle('on', on); el.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  box.querySelectorAll('[data-addon]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.addon;
      if (selezione.has(id)) selezione.delete(id); else selezione.add(id);
      segnaAddon(); aggiorna();
    });
  });
  // click su un bundle: seleziona ESATTAMENTE i suoi add-on (toggle se già attivo)
  box.querySelectorAll('[data-bundle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const b = bundle.find((x) => x.id === btn.dataset.bundle); if (!b) return;
      const giaAttivo = bundleAttivo()?.id === b.id;
      selezione.clear();
      if (!giaAttivo) b.addon.forEach((id) => selezione.add(id));
      segnaAddon(); aggiorna();
    });
  });

  // CTA unica: checkout con il bundle (sconto) se attivo, altrimenti Base + add-on.
  const attivaBtn = box.querySelector('#piani-attiva');
  if (attivaBtn) attivaBtn.addEventListener('click', () => {
    const b = bundleAttivo();
    const pacchetti = [...selezione];
    conErrore(async () => {
      try {
        const body = b ? { bundle: b.id } : { pacchetti };
        const r = await api('/api/abbonamento/checkout', { method: 'POST', body });
        if (r?.url) location.href = r.url; else toast(L('Piano non disponibile al momento.', 'Plan not available right now.', 'Plan no disponible por el momento.'), 'errore');
      } catch (e) {
        // non loggato: prima l'accesso con Twitch, poi si torna dritti al checkout con la scelta
        if (/non autenticato/i.test(e?.message || '')) {
          location.href = b ? '/accedi?bundle=' + encodeURIComponent(b.id)
            : '/accedi?pacchetti=' + encodeURIComponent(pacchetti.join(','));
          return;
        }
        throw e;
      }
    });
  });
}

function vistaRichiesta() {
  return `
    <div class="carta evidenziata">
      <h2>${_hIco(ICO.rocket)}Porta SocialBot nel tuo canale</h2>
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
      <h2>${_hIco(ICO.attesa)}Richiesta inviata!</h2>
      <p>andryxify deve approvarti. Torna qui più tardi: quando sarai abilitato
      troverai la tua dashboard completa.</p>
    </div>`;
}

function vistaDisabilitato() {
  return `
    <div class="carta">
      <h2>${_hIco(ICO.sonno)}Accesso disabilitato</h2>
      <p>Il tuo accesso ad SocialBot è al momento disabilitato da andryxify.
      Se pensi sia un errore, contattalo.</p>
    </div>`;
}

// ------------------------------------------------------------------ piattaforma streamer

// Le schede raggruppate per area logica: invece di 11 bottoni in fila (troppo
// dispersivi) mostriamo poche categorie chiare e, dentro ognuna, le sue schede.
// NB: gli id delle schede restano identici a prima (li usano i pannelli).
const GRUPPI = [
  { id: 'panoramica', nome: 'Panoramica', schede: [
    ['stato', 'Stato'],
  ] },
  { id: 'personaggio', nome: 'Personaggio', schede: [
    ['personalita', 'Personalità'],
    ['conoscenza', 'Conoscenza'],
    ['memoria', 'Memoria'],
  ] },
  { id: 'chat', nome: 'Chat & comandi', schede: [
    ['moduli', 'Comandi'],
    ['regole', 'Moderazione'],
    ['giochi', 'Giochi & classifiche'],
  ] },
  { id: 'diretta', nome: 'Diretta', schede: [
    ['regia', 'Regia'],
    ['studio', 'Studio Web'],
    ['clip', 'Clip'],
    ['ascolto', 'Comandi a voce'],
  ] },
  { id: 'interazione', nome: 'Interazione', schede: [
    ['musica', 'Musica'],
    ['sondaggi', 'Sondaggi & predizioni'],
    ['giveaway', 'Giveaway'],
    ['penitenze', 'Penitenze'],
  ] },
  { id: 'overlay', nome: 'Overlay', schede: [
    ['alert', 'Overlay Studio'],
    ['effetti', 'Effetti & suoni'],
    ['emote', '7TV · Emote'],
  ] },
  { id: 'notifiche', nome: 'Notifiche', schede: [
    ['notifiche', 'Notifiche'],
  ] },
];

// Area riservata all'operatore (andryxify): compare come scheda a sé SOLO per
// l'admin, così il pannello "Anima" non è più sempre in fondo a ogni scheda.
const GRUPPO_ADMIN = { id: 'admin', nome: 'Admin', schede: [['admin', 'Admin']] };

// Etichette TRADOTTE della navigazione (id → [it, en, es]). Gli id restano
// stabili; il testo mostrato si risolve a runtime con L(), così cambia con la
// lingua (i nomi in GRUPPI restano come fallback italiano).
const T_GRUPPO = {
  panoramica: ['Panoramica', 'Overview', 'Resumen'],
  personaggio: ['Personaggio', 'Character', 'Personaje'],
  chat: ['Chat & comandi', 'Chat & commands', 'Chat y comandos'],
  diretta: ['Diretta', 'Live', 'Directo'],
  interazione: ['Interazione', 'Interaction', 'Interacción'],
  overlay: ['Overlay', 'Overlay', 'Overlay'],
  notifiche: ['Notifiche', 'Notifications', 'Notificaciones'],
  admin: ['Admin', 'Admin', 'Admin'],
};
const T_SCHEDA = {
  stato: ['Stato', 'Status', 'Estado'],
  personalita: ['Personalità', 'Personality', 'Personalidad'],
  conoscenza: ['Conoscenza', 'Knowledge', 'Conocimiento'],
  memoria: ['Memoria', 'Memory', 'Memoria'],
  moduli: ['Comandi', 'Commands', 'Comandos'],
  regole: ['Moderazione', 'Moderation', 'Moderación'],
  giochi: ['Giochi & classifiche', 'Games & leaderboards', 'Juegos y clasificaciones'],
  regia: ['Regia', 'Control room', 'Realización'],
  studio: ['Studio Web', 'Web Studio', 'Estudio Web'],
  clip: ['Clip', 'Clips', 'Clips'],
  ascolto: ['Comandi a voce', 'Voice commands', 'Comandos por voz'],
  musica: ['Musica', 'Music', 'Música'],
  sondaggi: ['Sondaggi & predizioni', 'Polls & predictions', 'Encuestas y predicciones'],
  giveaway: ['Giveaway', 'Giveaway', 'Sorteo'],
  penitenze: ['Penitenze', 'Forfeits', 'Penitencias'],
  alert: ['Overlay Studio', 'Overlay Studio', 'Overlay Studio'],
  emote: ['7TV · Emote', '7TV · Emotes', '7TV · Emotes'],
  notifiche: ['Notifiche', 'Notifications', 'Notificaciones'],
  admin: ['Admin', 'Admin', 'Admin'],
};
const tGruppo = (id, fb) => { const t = T_GRUPPO[id]; return t ? L(t[0], t[1], t[2]) : (fb || id); };
const tScheda = (id, fb) => { const t = T_SCHEDA[id]; return t ? L(t[0], t[1], t[2]) : (fb || id); };

// L'elenco effettivo dei gruppi: aggiunge l'area Admin se sei l'operatore.
function elencoGruppi() {
  return stato.isAdmin ? GRUPPI.concat([GRUPPO_ADMIN]) : GRUPPI;
}

// Icone della navigazione: SVG a tratto (stile "line icon"), una per scheda.
// Niente emoji: monocromatiche, ereditano il colore del testo → look pulito.
const _ico = (d) => `<svg class="lat-svg" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONA = {
  stato:       _ico('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11h14V9"/><path d="M9.5 20v-6h5v6"/>'),
  regia:       _ico('<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.48M7.76 16.24a6 6 0 0 1 0-8.48M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/>'),
  studio:      _ico('<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/>'),
  personalita: _ico('<path d="M12 3c.35 3.8 1.4 4.85 5 5.2-3.6.35-4.65 1.4-5 5.2-.35-3.8-1.4-4.85-5-5.2 3.6-.35 4.65-1.4 5-5.2Z"/><path d="M18.5 15c.15 1.6.6 2.05 2.2 2.2-1.6.15-2.05.6-2.2 2.2-.15-1.6-.6-2.05-2.2-2.2 1.6-.15 2.05-.6 2.2-2.2Z"/>'),
  conoscenza:  _ico('<path d="M5 4.5h11a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2Z"/><path d="M9 4.5v15"/>'),
  memoria:     _ico('<path d="M4 21V4"/><path d="M4 21h16"/><path d="M8.5 21v-6"/><path d="M13 21V9"/><path d="M17.5 21v-9"/>'),
  moduli:      _ico('<rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="M7.5 9.5 10.5 12l-3 2.5"/><path d="M13 15h4"/>'),
  regole:      _ico('<path d="M12 3.2 19 6v5c0 4.8-3.4 7.8-7 8.8-3.6-1-7-4-7-8.8V6z"/>'),
  giochi:      _ico('<rect x="2" y="7.5" width="20" height="9" rx="4.5"/><path d="M7 11v3"/><path d="M5.5 12.5h3"/><circle cx="16" cy="11.5" r=".9" fill="currentColor" stroke="none"/><circle cx="18" cy="13.5" r=".9" fill="currentColor" stroke="none"/>'),
  effetti:     _ico('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9.5a4 4 0 0 1 0 5"/>'),
  clip:        _ico('<rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="M8 5v14"/><path d="M16 5v14"/><path d="M3 9.5h5"/><path d="M16 9.5h5"/><path d="M3 14.5h5"/><path d="M16 14.5h5"/>'),
  ascolto:     _ico('<rect x="9" y="3" width="6" height="10.5" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><path d="M12 17v4"/>'),
  musica:      _ico('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  sondaggi:    _ico('<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'),
  giveaway:    _ico('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'),
  penitenze:   _ico('<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  alert:       _ico('<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/><path d="M6 8h4"/><path d="M6 11h2"/>'),
  emote:       _ico('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><line x1="9" x2="9.01" y1="9.5" y2="9.5"/><line x1="15" x2="15.01" y1="9.5" y2="9.5"/>'),
  notifiche:   _ico('<path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5 2 6H4c.5-1 2-2 2-6"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>'),
  admin:       _ico('<path d="M4 8.5 7.5 16h9L20 8.5l-4.3 3L12 5 8.3 11.5z"/><path d="M7.5 19h9"/>'),
};

// Descrizioni brevi mostrate nell'intestazione di pagina di ogni sezione.
// [it, en, es] risolte a runtime con L() (vedi descScheda).
const DESC = {
  stato: ['Accendi il bot e controlla che sia connesso alla tua chat.', 'Turn the bot on and check it’s connected to your chat.', 'Enciende el bot y comprueba que esté conectado a tu chat.'],
  personalita: ['Il tono e il carattere con cui il bot parla in chat.', 'The tone and character the bot uses in chat.', 'El tono y el carácter con que el bot habla en el chat.'],
  conoscenza: ['Cosa sa il bot su di te e sui tuoi contenuti.', 'What the bot knows about you and your content.', 'Lo que el bot sabe sobre ti y tu contenido.'],
  memoria: ['Le statistiche della chat e cosa il bot ricorda.', 'Chat stats and what the bot remembers.', 'Las estadísticas del chat y lo que el bot recuerda.'],
  moduli: ['Crea comandi, automazioni e contatori per la tua chat.', 'Create commands, automations and counters for your chat.', 'Crea comandos, automatizaciones y contadores para tu chat.'],
  regole: ['Moderazione automatica: filtri e antispam.', 'Automatic moderation: filters and anti-spam.', 'Moderación automática: filtros y antispam.'],
  giochi: ['Mini-giochi, monete e classifiche per la chat.', 'Minigames, coins and leaderboards for chat.', 'Minijuegos, monedas y clasificaciones para el chat.'],
  effetti: ['Effetti, suoni, GIF e video da lanciare in chat o in overlay — con libreria condivisa.', 'Effects, sounds, GIFs and videos to trigger in chat or overlay — with a shared library.', 'Efectos, sonidos, GIF y vídeos para lanzar en el chat o en el overlay — con biblioteca compartida.'],
  regia: ['Gestisci la diretta dal bot: titolo, categoria, tag, clip, marker, pubblicità e raid.', 'Run your stream from the bot: title, category, tags, clips, markers, ads and raids.', 'Gestiona el directo desde el bot: título, categoría, etiquetas, clips, marcadores, anuncios y raids.'],
  studio: ['Vai live dal browser, senza OBS: webcam, schermo, overlay e audio in un click.', 'Go live from the browser, no OBS: webcam, screen, overlay and audio in one click.', 'Emite desde el navegador, sin OBS: webcam, pantalla, overlay y audio con un clic.'],
  clip: ['Clip automatiche nei momenti di hype.', 'Automatic clips in the hype moments.', 'Clips automáticos en los momentos de hype.'],
  ascolto: ['Comanda il bot a voce mentre streammi.', 'Control the bot by voice while you stream.', 'Controla el bot por voz mientras haces directo.'],
  musica: ['Richieste musicali: gli spettatori mettono canzoni in coda su Spotify.', 'Music requests: viewers queue songs on Spotify.', 'Peticiones musicales: los espectadores ponen canciones en cola en Spotify.'],
  sondaggi: ['Crea sondaggi e predizioni Twitch al volo.', 'Create Twitch polls and predictions on the fly.', 'Crea encuestas y predicciones de Twitch al vuelo.'],
  giveaway: ['Organizza estrazioni a premi per la community.', 'Run prize giveaways for your community.', 'Organiza sorteos de premios para tu comunidad.'],
  penitenze: ['Con i punti canale la chat ti vieta una parola — o ti obbliga a dire solo quella. Se sbagli, penitenza.', 'With channel points chat bans a word for you — or forces you to say only that one. Slip up and you owe a forfeit.', 'Con los puntos de canal el chat te prohíbe una palabra — o te obliga a decir solo esa. Si fallas, penitencia.'],
  alert: ['Il tuo overlay OBS: alert, chat a schermo, widget e temi, tutto personalizzabile.', 'Your OBS overlay: alerts, on-screen chat, widgets and themes, all customizable.', 'Tu overlay para OBS: alertas, chat en pantalla, widgets y temas, todo personalizable.'],
  emote: ['Gestisci le emote 7TV del tuo canale: aggiungi, togli e rinomina, senza uscire dal bot.', 'Manage your channel’s 7TV emotes: add, remove and rename, without leaving the bot.', 'Gestiona las emotes 7TV de tu canal: añade, quita y renombra, sin salir del bot.'],
  notifiche: ['Avvisi su Telegram e Discord quando vai in diretta, e dei nuovi post su TikTok, YouTube e Instagram.', 'Alerts on Telegram and Discord when you go live, and for new posts on TikTok, YouTube and Instagram.', 'Avisos en Telegram y Discord cuando estás en directo, y de los nuevos posts en TikTok, YouTube e Instagram.'],
  admin: ['Gestione streamer e anima condivisa del bot.', 'Streamer management and the bot’s shared soul.', 'Gestión de streamers y el alma compartida del bot.'],
};
const descScheda = (id) => { const d = DESC[id]; return d ? L(d[0], d[1], d[2]) : ''; };

// --- Sezioni bloccate (upsell) -----------------------------------------
// Alcune schede sono incluse solo in certi pacchetti. Se la funzione non è nel
// piano dello streamer, invece del pannello mostriamo una "pagina bloccata" con
// una demo e il pulsante per aggiungere il pacchetto giusto. La mappa scheda→
// funzione rispecchia ESATTAMENTE il gating del server (esigiFunzione/gateFeature),
// così non blocchiamo mai una scheda che invece funzionerebbe.
// `studio` sta nel pacchetto Base, non in un add-on: FUNZ_ADDON lo manda su
// 'base' così la pagina bloccata dice il nome giusto, e il checkout (che include
// SEMPRE la Base) parte comunque corretto anche se 'base' non è un id di add-on.
const SCHEDA_FUNZ = { giochi: 'giochi', musica: 'musica', ascolto: 'voce', notifiche: 'notifiche', effetti: 'effetti', sondaggi: 'effetti', studio: 'studio' };
const FUNZ_ADDON = { giochi: 'giochi', musica: 'musica', voce: 'voce', notifiche: 'notifiche', effetti: 'effetti', clipAuto: 'clip', studio: 'base' };
// I nomi dei pacchetti restano in ITALIANO in tutte le lingue: sono nomi propri
// del prodotto, come "Spotify Premium". Tradurli confonderebbe chi cerca aiuto.
const NOME_ADDON = {
  base: ['Base', 'Base', 'Base'],
  giochi: ['Giochi & Classifiche', 'Giochi & Classifiche', 'Giochi & Classifiche'],
  musica: ['Richieste Musicali', 'Richieste Musicali', 'Richieste Musicali'],
  voce: ['Comandi Vocali', 'Comandi Vocali', 'Comandi Vocali'],
  notifiche: ['Social & Notifiche', 'Social & Notifiche', 'Social & Notifiche'],
  effetti: ['Effetti & Punti canale', 'Effetti & Punti canale', 'Effetti & Punti canale'],
  clip: ['Clip Automatiche', 'Clip Automatiche', 'Clip Automatiche'],
  squadra: ['Squadra', 'Squadra', 'Squadra'],
};

// La scheda `id` è bloccata per il piano attuale? Mai in demo o per l'operatore.
function schedaBloccata(id) {
  if (DEMO || stato?.isAdmin || !stato?.funzioni) return false;   // fail-open: nel dubbio non blocco
  const funz = SCHEDA_FUNZ[id];
  if (!funz) return false;
  return !stato.funzioni[funz];
}
const addonPerScheda = (id) => FUNZ_ADDON[SCHEDA_FUNZ[id]] || null;

// Contenuto della "pagina bloccata": cosa fa (riuso GUIDE/DESC già tradotti),
// una demo su QUESTA stessa scheda e il pulsante per aggiungere il pacchetto.
function paginaBloccata(id) {
  const addon = addonPerScheda(id);
  const nomeScheda = tScheda(id, id);
  const g = GUIDE[id];
  const cosa = g?.serve ? L(g.serve[0], g.serve[1], g.serve[2]) : descScheda(id);
  const passi = (g?.come || []).map((c) => `<li>${L(c[0], c[1], c[2])}</li>`).join('');
  const na = NOME_ADDON[addon] || ['', '', ''];
  const nomePacchetto = L(na[0], na[1], na[2]);
  const puoComprare = !!stato?.stripeAttivo && !!addon;
  return `<div class="carta blocco-carta">
    <div class="blocco-testa">${_bIco(ICO.lucchetto)}<h2>${esc(nomeScheda)}</h2>
      <span class="badge giallo">${L('Non nel tuo piano', 'Not in your plan', 'No en tu plan')}</span></div>
    <p class="blocco-cosa">${cosa}</p>
    ${passi ? `<ul class="blocco-passi">${passi}</ul>` : ''}
    <div class="blocco-azioni">
      <a class="btn secondario" href="/?demo=1#${esc(id)}" target="_blank" rel="noopener">${_bIco(ICO.occhio)}${L('Guarda la demo', 'See the demo', 'Ver la demo')}</a>
      ${puoComprare
        ? `<button class="btn grande" data-sblocca="${esc(addon)}">${_bIco(ICO.effetti)}${L('Sblocca con', 'Unlock with', 'Desbloquea con')} «${esc(nomePacchetto)}»</button>`
        : `<span class="suggerimento">${L('Questa funzione fa parte del pacchetto', 'This feature is part of the package', 'Esta función forma parte del paquete')} <strong>${esc(nomePacchetto)}</strong>. ${L('Chiedi ad andryxify di abilitarla.', 'Ask andryxify to enable it.', 'Pide a andryxify que la habilite.')}</span>`}
    </div>
    ${puoComprare ? `<p class="suggerimento spazio-sopra"><a href="#stato" data-scheda="stato">${L('Vedi tutti i piani e i pacchetti →', 'See all plans and packages →', 'Ver todos los planes y paquetes →')}</a></p>` : ''}
  </div>`;
}

// Avvia il checkout Stripe per un add-on (dalla pagina bloccata).
function sbloccaAddon(addon) {
  conErrore(async () => {
    try {
      const r = await api('/api/abbonamento/checkout', { method: 'POST', body: { pacchetti: [addon] } });
      if (r?.url) location.href = r.url;
      else toast(L('Checkout non disponibile al momento.', 'Checkout not available right now.', 'Pago no disponible por el momento.'), 'errore');
    } catch (e) {
      if (/non autenticato/i.test(e?.message || '')) { location.href = '/accedi?pacchetti=' + encodeURIComponent(addon); return; }
      throw e;
    }
  });
}

// Mini-guida per scheda: "a cosa serve" + i passi di "come si fa". Mostrata in
// cima a ogni pagina (callout richiudibile), così con tante sezioni si capisce
// sempre cosa fare. Vale anche in demo (usa la stessa testata di pagina).
// serve/come sono tuple [it, en, es] risolte a runtime (vedi guidaSchedaHtml).
const GUIDE = {
  stato: { serve: ['Accendere il bot e controllare che sia connesso alla tua chat.', 'Turn the bot on and check it’s connected to your chat.', 'Encender el bot y comprobar que esté conectado a tu chat.'],
    come: [['Accendi l’interruttore del bot.', 'Flip the bot’s switch.', 'Activa el interruptor del bot.'], ['Controlla il badge “in chat”: verde = sei online.', 'Check the “in chat” badge: green = you’re online.', 'Mira la insignia “en el chat”: verde = estás en línea.'], ['Se manca un permesso, riautorizza con un clic.', 'If a permission is missing, re-authorize with one click.', 'Si falta un permiso, reautoriza con un clic.']] },
  personalita: { serve: ['Dare al bot il tono e il carattere con cui parla in chat.', 'Give the bot the tone and character it speaks with in chat.', 'Darle al bot el tono y el carácter con que habla en el chat.'],
    come: [['Scegli tono e “spontaneità” (quanto interviene da solo).', 'Pick tone and “spontaneity” (how often it chimes in).', 'Elige el tono y la “espontaneidad” (cuánto interviene solo).'], ['Aggiungi regole che rispetterà SEMPRE.', 'Add rules it will ALWAYS follow.', 'Añade reglas que respetará SIEMPRE.'], ['Salva: il nuovo stile parte subito.', 'Save: the new style takes effect right away.', 'Guarda: el nuevo estilo se aplica al instante.']] },
  conoscenza: { serve: ['Insegnare al bot cosa dire su di te (social, orari, PC, regole…).', 'Teach the bot what to say about you (socials, schedule, PC, rules…).', 'Enseñarle al bot qué decir sobre ti (redes, horarios, PC, reglas…).'],
    come: [['Aggiungi una voce: domanda → risposta.', 'Add an entry: question → answer.', 'Añade una entrada: pregunta → respuesta.'], ['In chat richiami la risposta con un !comando o una parola chiave.', 'In chat you trigger the answer with a !command or a keyword.', 'En el chat activas la respuesta con un !comando o una palabra clave.']] },
  moduli: { serve: ['Creare i comandi di chat: comandi/automazioni (QUANDO succede X, ALLORA fai Y) e i contatori (morti, tentativi, parole…) che tu e i mod gestite in chat.', 'Create your chat commands: commands/automations (WHEN X happens, THEN do Y) and counters (deaths, attempts, words…) that you and your mods manage in chat.', 'Crea tus comandos de chat: comandos/automatizaciones (CUANDO pasa X, ENTONCES haz Y) y los contadores (muertes, intentos, palabras…) que tú y los mods gestionáis en el chat.'],
    come: [['“Nuovo comando”: scegli l’innesco (!comando, una parola, un evento o un timer).', '“New command”: choose the trigger (!command, a word, an event or a timer).', '“Nuevo comando”: elige el disparador (!comando, una palabra, un evento o un temporizador).'], ['Aggiungi una o più azioni (scrivi in chat, effetto, clip, musica…) e premi “Prova”.', 'Add one or more actions (write in chat, effect, clip, music…) and hit “Test”.', 'Añade una o varias acciones (escribir en el chat, efecto, clip, música…) y pulsa “Probar”.'], ['Più in basso, in “Contatori”, crei numeri come !morti da mostrare anche in overlay.', 'Further down, in “Counters”, you create numbers like !deaths that can also show in the overlay.', 'Más abajo, en “Contadores”, creas números como !muertes que también puedes mostrar en el overlay.']] },
  memoria: { serve: ['Vedere cosa si ricorda il bot e come sta andando il canale: statistiche, utenti più attivi e cose imparate.', 'See what the bot remembers and how the channel is doing: stats, most active viewers and things it learned.', 'Ver qué recuerda el bot y cómo va el canal: estadísticas, usuarios más activos y cosas aprendidas.'],
    come: [['Scorri le statistiche per capire quando la chat è più viva.', 'Scroll the stats to see when chat is most alive.', 'Repasa las estadísticas para ver cuándo el chat está más vivo.'], ['Controlla i ricordi: puoi cancellare quelli sbagliati.', 'Check the memories: you can delete the wrong ones.', 'Revisa los recuerdos: puedes borrar los equivocados.'], ['Se qualcosa non ti piace, correggilo dalla scheda Conoscenza.', 'If something’s off, fix it from the Knowledge tab.', 'Si algo no te gusta, corrígelo desde la pestaña Conocimiento.']] },
  regia: { serve: ['Gestire la diretta dal pannello: titolo, categoria, marker e le azioni rapide, senza aprire Twitch.', 'Run your stream from the panel: title, category, markers and quick actions, without opening Twitch.', 'Gestionar el directo desde el panel: título, categoría, marcadores y acciones rápidas, sin abrir Twitch.'],
    come: [['Cambia titolo e categoria e salva: si aggiornano su Twitch subito.', 'Change title and category and save: they update on Twitch right away.', 'Cambia título y categoría y guarda: se actualizan en Twitch al instante.'], ['Usa le azioni rapide durante la live (marker, clip, annunci).', 'Use the quick actions during the stream (marker, clip, announcements).', 'Usa las acciones rápidas durante el directo (marcador, clip, anuncios).'], ['Tieni il pannello aperto su un secondo schermo mentre streami.', 'Keep the panel open on a second screen while you stream.', 'Ten el panel abierto en una segunda pantalla mientras emites.']] },
  regole: { serve: ['Moderazione automatica: filtra spam, link e flood e dà timeout ai recidivi.', 'Automatic moderation: filters spam, links and flood, and times out repeat offenders.', 'Moderación automática: filtra spam, enlaces y flood, y da timeout a los reincidentes.'],
    come: [['Attiva l’antispam.', 'Enable anti-spam.', 'Activa el antispam.'], ['Scegli cosa filtrare (link, maiuscole, ripetizioni…).', 'Choose what to filter (links, caps, repetitions…).', 'Elige qué filtrar (enlaces, mayúsculas, repeticiones…).'], ['Salva: il bot modera da solo.', 'Save: the bot moderates on its own.', 'Guarda: el bot modera solo.']] },
  giochi: { serve: ['Minigiochi, monete e classifiche per tenere viva la chat.', 'Minigames, coins and leaderboards to keep chat alive.', 'Minijuegos, monedas y clasificaciones para animar el chat.'],
    come: [['Attiva i giochi.', 'Turn on games.', 'Activa los juegos.'], ['Personalizza il nome della moneta e i premi.', 'Customize the coin name and the prizes.', 'Personaliza el nombre de la moneda y los premios.'], ['Gli spettatori giocano con !slot, !roulette, !pesca, !trivia…', 'Viewers play with !slot, !roulette, !fish, !trivia…', 'Los espectadores juegan con !slot, !roulette, !pesca, !trivia…']] },
  effetti: { serve: ['Suoni ed effetti in overlay OBS, anche riscattabili con i punti canale.', 'Sounds and effects in the OBS overlay, redeemable with channel points too.', 'Sonidos y efectos en el overlay de OBS, también canjeables con puntos de canal.'],
    come: [['Carica un effetto (audio/immagine) e dagli un comando.', 'Upload an effect (audio/image) and give it a command.', 'Sube un efecto (audio/imagen) y asígnale un comando.'], ['Aggiungi l’URL overlay in OBS come sorgente browser.', 'Add the overlay URL in OBS as a browser source.', 'Añade la URL del overlay en OBS como fuente de navegador.'], ['Se vuoi, collega un effetto a un premio a punti canale.', 'If you like, link an effect to a channel-point reward.', 'Si quieres, vincula un efecto a una recompensa de puntos de canal.']] },
  clip: { serve: ['Creare clip automatiche nei momenti di “hype” della diretta.', 'Create automatic clips in the stream’s “hype” moments.', 'Crear clips automáticos en los momentos de “hype” del directo.'],
    come: [['Attiva le clip automatiche.', 'Enable automatic clips.', 'Activa los clips automáticos.'], ['Regola la sensibilità (quanto “hype” serve).', 'Adjust the sensitivity (how much “hype” it takes).', 'Ajusta la sensibilidad (cuánto “hype” hace falta).']] },
  ascolto: { serve: ['Comandare il bot con la VOCE mentre streami (l’audio resta sul tuo PC).', 'Control the bot by VOICE while you stream (audio stays on your PC).', 'Controlar el bot por VOZ mientras haces directo (el audio se queda en tu PC).'],
    come: [['Concedi l’accesso al microfono dal browser.', 'Grant microphone access from the browser.', 'Concede el acceso al micrófono desde el navegador.'], ['Di’ le frasi-chiave dei tuoi moduli vocali (es. “clippa”).', 'Say the key phrases of your voice modules (e.g. “clip it”).', 'Di las frases clave de tus módulos de voz (p. ej. “clipea”).']] },
  musica: { serve: ['Richieste musicali: gli spettatori mettono canzoni in coda su Spotify.', 'Music requests: viewers queue songs on Spotify.', 'Peticiones musicales: los espectadores ponen canciones en cola en Spotify.'],
    come: [['Connetti Spotify (serve Premium + app aperta).', 'Connect Spotify (needs Premium + the app open).', 'Conecta Spotify (necesitas Premium + la app abierta).'], ['Scegli come si “paga” la richiesta: libera, sub, monete, bit o punti canale.', 'Choose how a request is “paid”: free, subs, coins, bits or channel points.', 'Elige cómo se “paga” la petición: libre, subs, monedas, bits o puntos de canal.'], ['Gli spettatori usano !sr <canzone>; !song mostra cosa suona.', 'Viewers use !sr <song>; !song shows what’s playing.', 'Los espectadores usan !sr <canción>; !song muestra qué suena.']] },
  sondaggi: { serve: ['Lanciare sondaggi e predizioni Twitch direttamente da qui.', 'Launch Twitch polls and predictions right from here.', 'Lanzar encuestas y predicciones de Twitch directamente desde aquí.'],
    come: [['Scrivi la domanda e le opzioni (o titolo ed esiti).', 'Write the question and options (or title and outcomes).', 'Escribe la pregunta y las opciones (o título y resultados).'], ['Lancia: gli spettatori votano/puntano dall’app.', 'Launch: viewers vote/bet from the app.', 'Lanza: los espectadores votan/apuestan desde la app.'], ['Chiudi il sondaggio o scegli l’esito vincente della predizione.', 'Close the poll or pick the winning prediction outcome.', 'Cierra la encuesta o elige el resultado ganador de la predicción.']] },
  giveaway: { serve: ['Organizzare estrazioni a premi per la community.', 'Run prize giveaways for your community.', 'Organizar sorteos de premios para tu comunidad.'],
    come: [['Apri il giveaway indicando il premio.', 'Open the giveaway and set the prize.', 'Abre el sorteo indicando el premio.'], ['La community entra scrivendo !join in chat.', 'The community joins by typing !join in chat.', 'La comunidad entra escribiendo !join en el chat.'], ['Estrai il vincitore dal pannello (puoi ripetere).', 'Draw the winner from the panel (you can redo it).', 'Saca al ganador desde el panel (puedes repetir).']] },
  penitenze: { serve: ['Trasformare un premio a punti canale in una sfida a tempo: il bot conta quante volte sbagli (con «+1» a schermo) e alla fine fa partire una penitenza.', 'Turn a channel-point reward into a timed challenge: the bot counts your slip-ups (with an on-screen «+1») and triggers a forfeit at the end.', 'Convertir una recompensa de puntos de canal en un reto cronometrado: el bot cuenta cuántas veces fallas (con un «+1» en pantalla) y al final lanza una penitencia.'],
    come: [['Attiva il riconoscimento vocale (scheda Comandi a voce) e concedi i Punti canale.', 'Enable voice recognition (Voice commands tab) and grant Channel Points.', 'Activa el reconocimiento de voz (pestaña Comandos por voz) y concede los Puntos de canal.'], ['Scegli i due premi: «Vieta la parola» (non dirla) e «Usa solo la parola» (dì solo quella).', 'Choose the two rewards: «Ban the word» (don’t say it) and «Use only the word» (say only that).', 'Elige las dos recompensas: «Prohíbe la palabra» (no la digas) y «Usa solo la palabra» (di solo esa).'], ['Decidi la penitenza (tua lista o inventata dall\'IA) e dove mostrare il contatore nell\'overlay.', 'Decide the forfeit (your list or AI-generated) and where to show the counter in the overlay.', 'Decide la penitencia (tu lista o inventada por la IA) y dónde mostrar el contador en el overlay.']] },
  notifiche: { serve: ['Avvisare le tue community su Telegram e Discord quando vai in diretta, e segnalare i nuovi post/video su TikTok, YouTube e Instagram.', 'Alert your Telegram and Discord communities when you go live, and flag new posts/videos on TikTok, YouTube and Instagram.', 'Avisar a tus comunidades de Telegram y Discord cuando estás en directo, y señalar los nuevos posts/vídeos en TikTok, YouTube e Instagram.'],
    come: [['Collega Telegram (login) e/o incolla il webhook Discord del canale.', 'Connect Telegram (login) and/or paste the channel’s Discord webhook.', 'Conecta Telegram (login) y/o pega el webhook de Discord del canal.'], ['Aggiungi i tuoi profili social per gli avvisi dei nuovi contenuti.', 'Add your social profiles for new-content alerts.', 'Añade tus perfiles sociales para los avisos de nuevo contenido.'], ['Attiva gli avvisi che vuoi e personalizza i messaggi (usa «Prova» per un test).', 'Turn on the alerts you want and customize the messages (use “Test” for a preview).', 'Activa los avisos que quieras y personaliza los mensajes (usa «Probar» para una prueba).']] },
  studio: { serve: ['Andare in diretta su Twitch dal browser, senza installare OBS: componi scene con webcam, schermo, immagini, video, testo e overlay, regola l’audio col mixer e premi «Vai live».', 'Go live on Twitch from the browser, without installing OBS: compose scenes with webcam, screen, images, video, text and overlay, tune the audio with the mixer and hit “Go live”.', 'Emitir en Twitch desde el navegador, sin instalar OBS: compón escenas con webcam, pantalla, imágenes, vídeo, texto y overlay, ajusta el audio con el mezclador y pulsa «Emitir».'],
    come: [['Scegli fotocamera, microfono e qualità in «Ingressi & qualità».', 'Pick camera, microphone and quality in “Inputs & quality”.', 'Elige cámara, micrófono y calidad en «Entradas y calidad».'], ['Aggiungi le fonti e sistemale sul palco (trascina per spostare/ridimensionare), o usa un layout rapido.', 'Add the sources and arrange them on the stage (drag to move/resize), or use a quick layout.', 'Añade las fuentes y colócalas en el escenario (arrastra para mover/redimensionar), o usa un diseño rápido.'], ['Aggiungi la fonte «Overlay» per avere a schermo alert, chat ed effetti a punti canale.', 'Add the “Overlay” source to get alerts, chat and channel-point effects on screen.', 'Añade la fuente «Overlay» para tener en pantalla alertas, chat y efectos de puntos de canal.'], ['Premi «Vai live» e tieni aperta questa scheda mentre trasmetti.', 'Hit “Go live” and keep this tab open while you broadcast.', 'Pulsa «Emitir» y mantén esta pestaña abierta mientras transmites.']] },
  alert: { serve: ['Mostrare nell\'overlay OBS un cartello animato (con suono) per follow, sub, bit e raid, e far scorrere la chat a schermo.', 'Show an animated card (with sound) in the OBS overlay for follows, subs, bits and raids, and scroll the chat on screen.', 'Mostrar en el overlay de OBS un cartel animado (con sonido) para follows, subs, bits y raids, y desplazar el chat en pantalla.'],
    come: [['Aggiungi l\'URL overlay in OBS (scheda Effetti & suoni).', 'Add the overlay URL in OBS (Effects & sounds tab).', 'Añade la URL del overlay en OBS (pestaña Efectos y sonidos).'], ['Attiva gli alert che vuoi e personalizza testo, suono e colore.', 'Enable the alerts you want and customize text, sound and color.', 'Activa las alertas que quieras y personaliza texto, sonido y color.'], ['Premi «Prova» per vederli. Attiva la chat a schermo se la vuoi in sovraimpressione.', 'Hit «Test» to preview them. Enable on-screen chat if you want it as an overlay.', 'Pulsa «Probar» para verlas. Activa el chat en pantalla si lo quieres superpuesto.']] },
  emote: { serve: ['Gestire a 360° le emote 7TV del tuo canale — aggiungerle, toglierle e rinominarle — direttamente dal bot. Le emote 7TV compaiono anche nella chat a schermo dell\'overlay.', 'Fully manage your channel’s 7TV emotes — add, remove and rename them — right from the bot. 7TV emotes also show up in the overlay’s on-screen chat.', 'Gestiona al 100% las emotes 7TV de tu canal — añadirlas, quitarlas y renombrarlas — directamente desde el bot. Las emotes 7TV también aparecen en el chat en pantalla del overlay.'],
    come: [['Collega il tuo account 7TV incollando il token (c\'è la guida qui sotto).', 'Connect your 7TV account by pasting the token (there’s a guide below).', 'Conecta tu cuenta 7TV pegando el token (hay una guía abajo).'], ['Cerca un\'emote nella directory 7TV e premi «Aggiungi» (puoi dargli un alias).', 'Search an emote in the 7TV directory and hit «Add» (you can give it an alias).', 'Busca una emote en el directorio 7TV y pulsa «Añadir» (puedes ponerle un alias).'], ['Nel tuo set puoi rinominare o togliere le emote con un clic.', 'In your set you can rename or remove emotes with one click.', 'En tu set puedes renombrar o quitar emotes con un clic.']] },
};

// ─────────────────────────── "Cosa può fare SocialBot" ───────────────────────
// Catalogo COMPLETO di ciò che il bot sa fare, raggruppato per area, con il
// pacchetto in cui ogni voce è compresa. È la fonte unica per la sezione
// espandibile in vetrina: se una funzione cambia pacchetto, si tocca solo qui.
//   pacc: 'free' = Essenziale (gratuito) · 'base' = Base · gli altri sono id di
//   add-on (giochi, effetti, notifiche, clip, voce, squadra, musica) e devono
//   combaciare con features/abbonamenti.js.
// Titoli e descrizioni sono tuple [it, en, es]; i NOMI DEI PACCHETTI restano in
// italiano in tutte le lingue (vedi NOME_ADDON).
const CAPACITA = [
  { ico: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', area: ['Chat e comandi', 'Chat and commands', 'Chat y comandos'], voci: [
    { pacc: 'free', t: ['Scrive col tuo account', 'Writes with your account', 'Escribe con tu cuenta'], d: ['In chat compare il tuo nome, non un bot anonimo.', 'Your name appears in chat, not an anonymous bot.', 'En el chat aparece tu nombre, no un bot anónimo.'] },
    { pacc: 'free', t: ['Comandi e automazioni illimitati', 'Unlimited commands and automations', 'Comandos y automatizaciones ilimitados'], d: ['Quando succede X, il bot fa Y. Nessun limite di numero.', 'When X happens, the bot does Y. No limit on how many.', 'Cuando pasa X, el bot hace Y. Sin límite de cantidad.'] },
    { pacc: 'free', t: ['Moderazione e antispam', 'Moderation and anti-spam', 'Moderación y antispam'], d: ['Filtra link, maiuscole e ripetizioni, e dà timeout a chi insiste.', 'Filters links, caps and repetition, and times out those who insist.', 'Filtra enlaces, mayúsculas y repeticiones, y da timeout a quien insiste.'] },
    { pacc: 'free', t: ['Contatori a schermo', 'On-screen counters', 'Contadores en pantalla'], d: ['Tipo !morti: li accendi dalla chat e il numero appare nell’overlay.', 'Like !deaths: turn them on from chat and the number shows in the overlay.', 'Tipo !muertes: los enciendes desde el chat y el número aparece en el overlay.'] },
    { pacc: 'free', t: ['Personalità e tono', 'Personality and tone', 'Personalidad y tono'], d: ['Decidi come parla e quanto interviene da solo in chat.', 'You decide how it speaks and how often it chimes in.', 'Decides cómo habla y cuánto interviene solo en el chat.'] },
    { pacc: 'free', t: ['Cosa dire su di te', 'What to say about you', 'Qué decir sobre ti'], d: ['Social, orari, PC, regole: gli insegni le risposte una volta.', 'Socials, schedule, PC, rules: you teach it the answers once.', 'Redes, horarios, PC, reglas: le enseñas las respuestas una vez.'] },
    { pacc: 'squadra', t: ['Fino a 10 moderatori', 'Up to 10 moderators', 'Hasta 10 moderadores'], d: ['I tuoi mod entrano nella dashboard e gestiscono il canale con te.', 'Your mods get into the dashboard and manage the channel with you.', 'Tus mods entran en el panel y gestionan el canal contigo.'] },
  ] },
  { ico: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>', area: ['Overlay per OBS', 'OBS overlay', 'Overlay para OBS'], voci: [
    { pacc: 'free', t: ['Overlay Studio', 'Overlay Studio', 'Overlay Studio'], d: ['Chat a schermo, widget e temi: colori, font, posizione e dimensione. Più overlay, ognuno col suo link.', 'On-screen chat, widgets and themes: colours, fonts, position and size. Multiple overlays, each with its own link.', 'Chat en pantalla, widgets y temas: colores, fuentes, posición y tamaño. Varios overlays, cada uno con su enlace.'] },
    { pacc: 'free', t: ['Emote 7TV', '7TV emotes', 'Emotes 7TV'], d: ['Aggiungi, rinomina e togli le emote del canale dal bot.', 'Add, rename and remove your channel’s emotes from the bot.', 'Añade, renombra y quita las emotes del canal desde el bot.'] },
    { pacc: 'effetti', t: ['Alert follow, sub, bit e raid', 'Follow, sub, bit and raid alerts', 'Alertas de follow, sub, bits y raid'], d: ['Con immagini o video, suoni tuoi o pronti, e il green screen.', 'With images or video, your own or ready-made sounds, and green screen.', 'Con imágenes o vídeo, sonidos tuyos o listos, y croma.'] },
    { pacc: 'effetti', t: ['Effetti sui punti canale', 'Channel-point effects', 'Efectos con puntos de canal'], d: ['Ogni riscatto può lanciare un suono, una GIF o un video a schermo.', 'Every redemption can trigger a sound, a GIF or a video on screen.', 'Cada canje puede lanzar un sonido, un GIF o un vídeo en pantalla.'] },
    { pacc: 'effetti', t: ['Penitenze a tempo', 'Timed forfeits', 'Penitencias cronometradas'], d: ['La chat ti vieta una parola — o ti obbliga a dire solo quella. Se sbagli, penitenza.', 'Chat bans a word for you — or forces you to say only that one. Slip up and you owe a forfeit.', 'El chat te prohíbe una palabra — o te obliga a decir solo esa. Si fallas, penitencia.'] },
  ] },
  { ico: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4V8Z"/>', area: ['La tua diretta', 'Your stream', 'Tu directo'], voci: [
    { pacc: 'free', t: ['Regia della diretta', 'Stream control room', 'Realización del directo'], d: ['Titolo, categoria, tag, marker, pubblicità e raid dal pannello.', 'Title, category, tags, markers, ads and raids from the panel.', 'Título, categoría, etiquetas, marcadores, anuncios y raids desde el panel.'] },
    { pacc: 'base', t: ['Studio Web: live senza OBS', 'Web Studio: live without OBS', 'Estudio Web: directo sin OBS'], d: ['Vai in diretta dal browser: scene, webcam, schermo, mixer audio, fino al 2K.', 'Go live from the browser: scenes, webcam, screen, audio mixer, up to 2K.', 'Emite desde el navegador: escenas, webcam, pantalla, mezclador de audio, hasta 2K.'] },
    { pacc: 'clip', t: ['Clip automatiche', 'Automatic clips', 'Clips automáticos'], d: ['Quando la chat si accende il bot clippa da solo.', 'When chat lights up the bot clips on its own.', 'Cuando el chat se enciende el bot clipea solo.'] },
    { pacc: 'voce', t: ['Comandi a voce', 'Voice commands', 'Comandos por voz'], d: ['Cambi titolo, fai una clip o dai il VIP parlando. L’audio non lascia il tuo PC.', 'Change the title, make a clip or grant VIP by speaking. The audio never leaves your PC.', 'Cambias el título, haces un clip o das el VIP hablando. El audio no sale de tu PC.'] },
  ] },
  { ico: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6C2.6 9.4 2 14.5 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.4-1.4a2 2 0 0 1 1.4-.6h4.4a2 2 0 0 1 1.4.6L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.5-.6-6.6-.7-7.3A4 4 0 0 0 17.3 5z"/>', area: ['Far divertire la chat', 'Entertaining your chat', 'Divertir al chat'], voci: [
    { pacc: 'giochi', t: ['Minigiochi e monete', 'Minigames and coins', 'Minijuegos y monedas'], d: ['Slot, roulette, pesca, trivia: gli spettatori giocano con la moneta del canale.', 'Slots, roulette, fishing, trivia: viewers play with your channel coin.', 'Tragaperras, ruleta, pesca, trivia: los espectadores juegan con la moneda del canal.'] },
    { pacc: 'giochi', t: ['Classifiche e VIP automatico', 'Leaderboards and automatic VIP', 'Clasificaciones y VIP automático'], d: ['Chi partecipa più di tutti sale in classifica e prende il VIP.', 'Whoever takes part the most climbs the leaderboard and gets VIP.', 'Quien más participa sube en la clasificación y recibe el VIP.'] },
    { pacc: 'effetti', t: ['Sondaggi e predizioni', 'Polls and predictions', 'Encuestas y predicciones'], d: ['Lanci sondaggi e predizioni Twitch dal pannello, senza aprire Twitch.', 'Launch Twitch polls and predictions from the panel, without opening Twitch.', 'Lanzas encuestas y predicciones de Twitch desde el panel, sin abrir Twitch.'] },
    { pacc: 'free', t: ['Giveaway', 'Giveaways', 'Sorteos'], d: ['Estrazioni a premi: la community entra con !join e tu estrai.', 'Prize draws: the community joins with !join and you draw.', 'Sorteos: la comunidad entra con !join y tú sorteas.'] },
    { pacc: 'musica', t: ['Richieste musicali', 'Music requests', 'Peticiones musicales'], d: ['Canzoni in coda su Spotify con !sr: libero o a bit, monete o punti canale.', 'Songs queued on Spotify with !sr: free or via bits, coins or channel points.', 'Canciones en cola en Spotify con !sr: libre o con bits, monedas o puntos de canal.'] },
  ] },
  { ico: '<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/>', area: ['Farti trovare', 'Getting you found', 'Que te encuentren'], voci: [
    { pacc: 'notifiche', t: ['Avviso quando vai in diretta', 'Alert when you go live', 'Aviso cuando estás en directo'], d: ['Avvisa il tuo gruppo Telegram e il tuo server Discord.', 'Alerts your Telegram group and your Discord server.', 'Avisa a tu grupo de Telegram y a tu servidor de Discord.'] },
    { pacc: 'notifiche', t: ['Avviso dei nuovi post', 'New-post alerts', 'Aviso de nuevos posts'], d: ['Quando pubblichi su TikTok, YouTube o Instagram lo dice alla community.', 'When you post on TikTok, YouTube or Instagram it tells your community.', 'Cuando publicas en TikTok, YouTube o Instagram se lo dice a tu comunidad.'] },
    { pacc: 'notifiche', t: ['Bot su Telegram', 'Telegram bot', 'Bot en Telegram'], d: ['Gestisci il bot dal telefono e fai gli auguri di compleanno al gruppo.', 'Manage the bot from your phone and send birthday wishes to the group.', 'Gestiona el bot desde el móvil y felicita los cumpleaños al grupo.'] },
    { pacc: 'free', t: ['La tua pagina link', 'Your link page', 'Tu página de enlaces'], d: ['Una pagina con tutti i tuoi social su socialbot.live/u/iltuonome.', 'A page with all your socials at socialbot.live/u/yourname.', 'Una página con todas tus redes en socialbot.live/u/tunombre.'] },
  ] },
];

// HTML della sezione espandibile "Cosa può fare SocialBot" (vetrina).
// Aperta di default la prima area, il resto richiuso: si scorre l'elenco delle
// aree e si apre solo quella che interessa.
function capacitaHtml() {
  const etichetta = (pacc) => {
    if (pacc === 'free') return { testo: L('Essenziale · gratis', 'Essenziale · free', 'Essenziale · gratis'), cls: 'gratis' };
    const na = NOME_ADDON[pacc];
    return { testo: na ? na[0] : pacc, cls: pacc === 'base' ? 'base' : 'addon' };
  };
  const aree = CAPACITA.map((g, i) => {
    const righe = g.voci.map((v) => {
      const e = etichetta(v.pacc);
      return `<li class="cap-voce">
        <div class="cap-testo"><strong>${esc(L(v.t[0], v.t[1], v.t[2]))}</strong>
          <span>${esc(L(v.d[0], v.d[1], v.d[2]))}</span></div>
        <span class="cap-pacc ${e.cls}">${esc(e.testo)}</span>
      </li>`;
    }).join('');
    const ico = g.ico ? `<span class="cap-ico"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${g.ico}</svg></span>` : '';
    return `<details class="cap-area"${i === 0 ? ' open' : ''}>
      <summary>${ico}${esc(L(g.area[0], g.area[1], g.area[2]))} <span class="cap-quante">${g.voci.length}</span></summary>
      <ul class="cap-elenco">${righe}</ul>
    </details>`;
  }).join('');
  const nFree = CAPACITA.reduce((n, g) => n + g.voci.filter((v) => v.pacc === 'free').length, 0);
  const nTot = CAPACITA.reduce((n, g) => n + g.voci.length, 0);
  return `<details class="carta rivela cap-scheda">
    <summary><h2>${L('Cosa può fare SocialBot', 'What SocialBot can do', 'Qué puede hacer SocialBot')}</h2>
      <span class="cap-sommario">${nTot} ${L('funzioni · di cui', 'features · of which', 'funciones · de las cuales')} ${nFree} ${L('gratis', 'free', 'gratis')}</span></summary>
    <div class="cap-corpo">
      <p class="cap-intro">${L('Tutto quello che il bot sa fare, e in quale pacchetto è compreso. Con l’<strong>Essenziale</strong> — gratis, basta registrarsi — il bot funziona già nella tua chat.', 'Everything the bot can do, and which package includes it. With <strong>Essenziale</strong> — free, you just register — the bot already works in your chat.', 'Todo lo que el bot sabe hacer, y en qué paquete está incluido. Con <strong>Essenziale</strong> — gratis, solo registrarse — el bot ya funciona en tu chat.')}</p>
      ${aree}
    </div>
  </details>`;
}

// SVG lampadina (niente emoji): icona della mini-guida.
const _icoGuida = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>';

// Icona SVG "da titolo" (in tinta accento, allineata al testo): niente emoji.
const _hIco = (d) => `<svg class="h-ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICO = {
  musica: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  sliders: '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
  sondaggi: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  predizioni: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  giveaway: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  attesa: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  sonno: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  chiave: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  libro: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
  germoglio: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
  telefono: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  carta: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  utenti: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  persona: '<path d="M12 3c.35 3.8 1.4 4.85 5 5.2-3.6.35-4.65 1.4-5 5.2-.35-3.8-1.4-4.85-5-5.2 3.6-.35 4.65-1.4 5-5.2Z"/><path d="M18.5 15c.15 1.6.6 2.05 2.2 2.2-1.6.15-2.05.6-2.2 2.2-.15-1.6-.6-2.05-2.2-2.2 1.6-.15 2.05-.6 2.2-2.2Z"/>',
  righello: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
  scrivi: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  cervello: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>',
  clip: '<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3 3.9"/>',
  cuffie: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a9 9 0 0 1 18 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
  voce: '<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
  giochi: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  effetti: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
  fulmine: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  moduli: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  lista: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  spina: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  medaglia: '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
  dado: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 8h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/><path d="M16 8h.01"/><path d="M8 16h.01"/>',
  trofeo: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  megafono: '<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/><path d="M8 6v8"/>',
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  torta: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/>',
  tv: '<rect width="20" height="15" x="2" y="7" rx="2"/><polyline points="17 2 12 7 7 2"/>',
  fotocamera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  divieto: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  scudo: '<path d="M12 3.2 19 6v5c0 4.8-3.4 7.8-7 8.8-3.6-1-7-4-7-8.8V6z"/>',
  grafico: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  corona: '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/>',
  cuore: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  pacco: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  avviso: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  penitenza: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  // aggiunte per Regia / Studio / Libreria / Alert
  onda: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>',
  segnaposto: '<path d="M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  freccia: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  aggiorna: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  piu: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  condividi: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/>',
  lucchetto: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/>',
  altoparlante: '<path d="M11 4.7 6.6 8.4H3v7.2h3.6L11 19.3z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
  immagine: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  video: '<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/>',
  carica: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/>',
  globo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>',
  // aggiunte per lo Studio (scene, fonti, mixer)
  occhio: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  occhioNo: '<path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.7 9.7 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
  cestino: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  scene: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m6.08 9.5-3.49 1.58a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.49-1.59"/><path d="m6.08 14.5-3.49 1.58a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.49-1.59"/>',
  testo: '<path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/><path d="M12 4v16"/>',
};

// icona piccola in linea per i bottoni/etichette (16px, stesso stile a tratto)
const _bIco = (d) => `<svg class="b-ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

// HTML della mini-guida di una scheda (vuoto se non prevista).
// serve/come sono tuple [it,en,es]: si risolvono qui con L().
function guidaSchedaHtml(id) {
  const g = GUIDE[id];
  if (!g) return '';
  const serve = Array.isArray(g.serve) ? L(g.serve[0], g.serve[1], g.serve[2]) : g.serve;
  const come = Array.isArray(g.come) ? g.come.map((c) => (Array.isArray(c) ? L(c[0], c[1], c[2]) : c)) : [];
  // aperta per default, ma se l'hai chiusa resta chiusa (anche cambiando scheda)
  let aperta = true;
  try { aperta = localStorage.getItem('guida:' + id) !== '0'; } catch { /* niente */ }
  return `<details class="guida-scheda"${aperta ? ' open' : ''} data-guida="${id}">
    <summary><span class="guida-ico">${_icoGuida}</span> ${L('Come funziona', 'How it works', 'Cómo funciona')}</summary>
    <div class="guida-corpo">
      ${serve ? `<p class="guida-serve"><strong>${L('A cosa serve.', 'What it’s for.', 'Para qué sirve.')}</strong> ${esc(serve)}</p>` : ''}
      ${come.length ? `<p class="guida-titolo">${L('Come si fa', 'How to do it', 'Cómo se hace')}</p><ol class="guida-come">${come.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>` : ''}
    </div>
  </details>`;
}

// Mini-tutorial richiudibile da mettere DENTRO una scheda, accanto a una funzione
// specifica (non in cima alla pagina come guidaSchedaHtml). `serve`, i `passi` e le
// `note` sono già risolti con L() dal chiamante e POSSONO contenere HTML sicuro
// (es. <code>, <strong>): non li passiamo da esc(). `titolo` è testo semplice.
function miniGuida({ titolo, serve = '', passi = [], note = [], aperta = false } = {}) {
  const t = titolo || L('Come funziona', 'How it works', 'Cómo funciona');
  const arr = (x) => (Array.isArray(x) ? x : (x ? [x] : []));
  const P = arr(passi), N = arr(note);
  return `<details class="mini-guida"${aperta ? ' open' : ''}>
    <summary><span class="guida-ico">${_icoGuida}</span> ${esc(t)}</summary>
    <div class="mini-guida-corpo">
      ${serve ? `<p class="guida-serve">${serve}</p>` : ''}
      ${P.length ? `<ol class="guida-come">${P.map((p) => `<li>${p}</li>`).join('')}</ol>` : ''}
      ${N.map((n) => `<p class="suggerimento">${n}</p>`).join('')}
    </div>
  </details>`;
}

// Ritrova area + titolo di una scheda per l'intestazione di pagina. Per le aree
// a scheda singola (Panoramica, Notifiche, Admin) il titolo è il nome dell'area
// stessa e non mostriamo l'occhiello (combacia con la voce del menu).
function infoScheda(id) {
  for (const g of elencoGruppi()) {
    const s = g.schede.find(([sid]) => sid === id);
    if (s) return g.schede.length === 1 ? { area: '', titolo: tGruppo(g.id, g.nome) } : { area: tGruppo(g.id, g.nome), titolo: tScheda(s[0], s[1]) };
  }
  return { area: '', titolo: id };
}

// Freccetta delle sezioni richiudibili (ruota quando la sezione è chiusa).
const CHEVRON = '<svg class="lat-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

// Costruisce la navigazione della sidebar: ogni voce ha icona + nome. Le aree a
// scheda singola sono voci dirette; quelle con più schede diventano una SEZIONE
// richiudibile (l'etichetta apre/chiude con animazione). Tutte cliccabili.
// Id del gruppo che contiene una scheda (per evidenziare il gruppo attivo).
function gruppoDiScheda(id) {
  const g = elencoGruppi().find((x) => x.schede.some(([sid]) => sid === id));
  return g ? g.id : '';
}

// Navigazione in ALTO: ogni gruppo è un pulsante col suo colore-firma. I gruppi
// con più schede aprono un menu a tendina; quelli con una scheda sola vanno
// dritti alla sezione. Il colore del gruppo passa via --gc (variabile CSS).
function navTopHtml() {
  return elencoGruppi().map((g) => {
    const attivo = g.schede.some(([id]) => id === schedaAttiva) ? ' attivo' : '';
    const col = `--gc:var(--g-${g.id})`;
    if (g.schede.length === 1) {
      const [id] = g.schede[0];
      return `<div class="grp${attivo}" data-grp="${g.id}" style="${col}">
        <button class="grp-btn" data-scheda="${id}"><span class="grp-dot"></span>${esc(tGruppo(g.id, g.nome))}</button></div>`;
    }
    const voci = g.schede.map(([id, nome]) =>
      `<button class="menu-voce${id === schedaAttiva ? ' on' : ''}${schedaBloccata(id) ? ' bloccata' : ''}" data-scheda="${id}">${ICONA[id] || ''}<span>${esc(tScheda(id, nome))}</span>${schedaBloccata(id) ? '<span class="voce-lock" aria-hidden="true">🔒</span>' : ''}</button>`).join('');
    return `<div class="grp${attivo}" data-grp="${g.id}" style="${col}">
      <button class="grp-btn" data-menu="${g.id}" aria-expanded="false"><span class="grp-dot"></span>${esc(tGruppo(g.id, g.nome))}${CHEVRON}</button>
      <div class="grp-menu">${voci}</div></div>`;
  }).join('');
}

// Cassetto laterale (schermi stretti): gli stessi gruppi, impilati, con titolo
// colorato per gruppo e le schede come voci cliccabili.
function navDrawerHtml() {
  return elencoGruppi().map((g) => {
    const voci = g.schede.map(([id, nome]) =>
      `<button class="drawer-voce${id === schedaAttiva ? ' on' : ''}${schedaBloccata(id) ? ' bloccata' : ''}" data-scheda="${id}">${ICONA[id] || ''}<span>${esc(tScheda(id, nome))}</span>${schedaBloccata(id) ? '<span class="voce-lock" aria-hidden="true">🔒</span>' : ''}</button>`).join('');
    return `<div class="drawer-grp" style="--gc:var(--g-${g.id})"><div class="drawer-grp-tit">${esc(tGruppo(g.id, g.nome))}</div>${voci}</div>`;
  }).join('');
}

// Aggiorna l'intestazione di pagina (occhiello area + titolo + descrizione)
// in base alla scheda attiva. Vuota se non c'è navigazione.
function aggiornaTestataPagina() {
  const el = document.getElementById('pagina-testata');
  if (!el) return;
  if (!document.body.classList.contains('con-nav')) { el.innerHTML = ''; return; }
  const { area, titolo } = infoScheda(schedaAttiva);
  const desc = descScheda(schedaAttiva);
  // l'occhiello prende il colore-firma del gruppo attivo (coerenza con la nav)
  const gid = gruppoDiScheda(schedaAttiva);
  if (gid) el.style.setProperty('--gc', `var(--g-${gid})`); else el.style.removeProperty('--gc');
  el.innerHTML =
    `${area ? `<div class="pt-occhiello">${esc(area)}</div>` : ''}` +
    `<h1>${titoloParole(titolo)}</h1>` +
    `${desc ? `<p>${esc(desc)}</p>` : ''}` +
    guidaSchedaHtml(schedaAttiva) +
    barraCarteHtml();
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
  // Ordine dei pannelli = ordine del menu (leggibilità del codice; a schermo
  // compare comunque solo la sezione attiva).
  return `
    ${pannelloStato()}
    ${pannelloPersonalita()}
    ${pannelloConoscenza()}
    ${pannelloMemoria()}
    ${pannelloModuli()}
    ${pannelloContatori()}
    ${pannelloRegole()}
    ${pannelloGiochi()}
    ${pannelloRegia()}
    ${pannelloStudio()}
    ${pannelloClip()}
    ${pannelloAscolto()}
    ${pannelloMusica()}
    ${pannelloSondaggi()}
    ${pannelloGiveaway()}
    ${pannelloPenitenze()}
    ${pannelloAlert()}
    ${pannelloEffetti()}
    ${pannello7TV()}
    ${pannelloNotifiche()}
    ${stato.isAdmin ? pannello('admin', vistaAdminContenuto()) : ''}`;
}

function pannello(id, contenuto) {
  const dentro = schedaBloccata(id) ? paginaBloccata(id) : contenuto;
  return `<section class="pannello-scheda${id === schedaAttiva ? ' visibile' : ''}" id="scheda-${id}" data-scheda="${id}">${dentro}</section>`;
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
      <h2>${_hIco(ICO.utenti)}${L('Stai gestendo il canale di', 'You’re managing the channel of', 'Estás gestionando el canal de')} @${esc(stato.gestisce?.streamer || login)}</h2>
      <p>${L('Sei entrato come', 'You’re signed in as a', 'Has entrado como')} <strong class="primo-piano">${L('moderatore', 'moderator', 'moderador')}</strong>: ${L('puoi occuparti di comandi, moduli, effetti, giochi, notifiche, regole e memoria. Le cose da proprietario — permessi Twitch e l\'elenco dei moderatori — restano a chi possiede il canale.', 'you can handle commands, modules, effects, games, notifications, rules and memory. Owner-only things — Twitch permissions and the moderator list — stay with the channel owner.', 'puedes ocuparte de comandos, módulos, efectos, juegos, notificaciones, reglas y memoria. Lo de propietario — permisos de Twitch y la lista de moderadores — es del dueño del canal.')}</p>
    </div>`;

  // La card "concedi permessi" la vede solo il proprietario (un mod non li tocca).
  const cardPermessi = (!proprietario || stato.permessiOk) ? '' : `
    <div class="carta evidenziata">
      <h2>${_hIco(ICO.chiave)}${L('Attiva il bot: concedi i permessi', 'Activate the bot: grant permissions', 'Activa el bot: concede los permisos')}</h2>
      <p>${L('Per funzionare, SocialBot', 'To work, SocialBot', 'Para funcionar, SocialBot')} <strong class="primo-piano">${L('leggerà e scriverà nella tua chat con il tuo account', 'will read and write in your chat with your account', 'leerá y escribirá en tu chat con tu cuenta')}</strong>, ${L('creerà clip e vedrà follow e sub. Nient\'altro.', 'will create clips and see follows and subs. Nothing else.', 'creará clips y verá follows y subs. Nada más.')}</p>
      <p class="spazio-sopra"><a class="btn grande" href="/auth/permessi">${L('Concedi i permessi su Twitch', 'Grant permissions on Twitch', 'Concede los permisos en Twitch')}</a></p>
    </div>`;

  return pannello('stato', `
    ${bannerMod}${cardPermessi}
    <div class="carta">
      <h2>${L('Il tuo bot', 'Your bot', 'Tu bot')}</h2>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="toggle-bot" ${stato.streamer.botEnabled ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-bot">${stato.streamer.botEnabled ? L('Bot acceso', 'Bot on', 'Bot encendido') : L('Bot spento', 'Bot off', 'Bot apagado')}</span>
        ${inChat
          ? `<span class="badge verde">● ${L('in chat adesso', 'in chat now', 'en el chat ahora')}</span>`
          : `<span class="badge">○ ${L('non connesso', 'not connected', 'no conectado')}</span>`}
        ${stato.permessiOk ? `<span class="badge viola">${L('permessi ok', 'permissions ok', 'permisos ok')}</span>` : `<span class="badge rosso">${L('permessi mancanti', 'missing permissions', 'faltan permisos')}</span>`}
      </div>

      ${proprietario ? `
      <p class="spazio-sopra"><strong class="primo-piano">${L('Permessi:', 'Permissions:', 'Permisos:')}</strong>
        ${stato.permessiOk ? `<span class="badge verde">✓ ${L('chat', 'chat', 'chat')}</span>` : `<span class="badge rosso">✗ ${L('chat', 'chat', 'chat')}</span>`}
        ${stato.vipOk ? '<span class="badge verde">✓ VIP</span>' : `<span class="badge giallo">${L('VIP da concedere', 'VIP to grant', 'VIP por conceder')}</span>`}
        ${stato.moderazioneOk ? `<span class="badge verde">✓ ${L('moderazione', 'moderation', 'moderación')}</span>` : `<span class="badge giallo">${L('moderazione da concedere', 'moderation to grant', 'moderación por conceder')}</span>`}
        ${(!stato.permessiOk || !stato.vipOk || !stato.moderazioneOk)
          ? `<a class="btn secondario mini" href="/auth/permessi">${L('Concedi i permessi', 'Grant permissions', 'Concede los permisos')}</a>`
          : ''}
      </p>
      <p class="suggerimento">${L('La', 'The', 'El')} <strong class="primo-piano">${L('chat', 'chat', 'chat')}</strong> ${L('serve per far parlare il bot,', 'lets the bot speak,', 'sirve para que el bot hable,')}
      <strong class="primo-piano">VIP</strong> ${L('per assegnarli a voce/premi,', 'to assign them via voice/rewards,', 'para asignarlos por voz/recompensas,')} <strong class="primo-piano">${L('moderazione', 'moderation', 'moderación')}</strong>
      ${L('per l\'antispam. Concedendoli abiliti anche VIP e antispam in un colpo solo.', 'for anti-spam. Granting them enables VIP and anti-spam in one go.', 'para el antispam. Al concederlos activas también VIP y antispam de una vez.')}</p>` : `
      <p class="suggerimento spazio-sopra">${L('Permessi del bot:', 'Bot permissions:', 'Permisos del bot:')} ${stato.permessiOk ? `<span class="badge verde">✓ ${L('chat attiva', 'chat active', 'chat activo')}</span>` : `<span class="badge rosso">${L('chat non attiva', 'chat not active', 'chat no activo')}</span>`} — ${L('li gestisce il proprietario del canale.', 'the channel owner manages them.', 'los gestiona el dueño del canal.')}</p>`}

      <p class="suggerimento spazio-sopra">${L('Spegnerlo non cancella nulla: quando lo riaccendi riparte da dove era rimasto.', 'Turning it off deletes nothing: when you turn it back on it resumes where it left off.', 'Apagarlo no borra nada: cuando lo vuelves a encender retoma donde estaba.')}</p>

      <label class="campo spazio-sopra" for="sel-modalita">${L('Quando dev\'essere attivo', 'When it should be active', 'Cuándo debe estar activo')}</label>
      <select id="sel-modalita">
        <option value="sempre" ${sImp.modalita === 'sempre' ? 'selected' : ''}>${L('Sempre (24/7)', 'Always (24/7)', 'Siempre (24/7)')}</option>
        <option value="live" ${sImp.modalita === 'live' ? 'selected' : ''}>${L('Solo quando sei in diretta', 'Only when you’re live', 'Solo cuando estás en directo')}</option>
        <option value="manuale" ${sImp.modalita === 'manuale' ? 'selected' : ''}>${L('Manuale (decidi tu con l\'interruttore)', 'Manual (you decide with the switch)', 'Manual (decides tú con el interruptor)')}</option>
      </select>
      <p class="suggerimento">
        <strong class="primo-piano">24/7</strong>: ${L('sempre in chat.', 'always in chat.', 'siempre en el chat.')} ·
        <strong class="primo-piano">${L('Quando sei live', 'When you’re live', 'Cuando estás en directo')}</strong>: ${L('entra da solo quando parte la diretta ed esce a fine stream.', 'joins by itself when the stream starts and leaves at the end.', 'entra solo cuando empieza el directo y sale al final.')} ·
        <strong class="primo-piano">${L('Manuale', 'Manual', 'Manual')}</strong>: ${L('comandi tu con l\'interruttore qui sopra.', 'you control it with the switch above.', 'lo controlas tú con el interruptor de arriba.')}
      </p>
      <p><button class="btn secondario" id="btn-salva-modalita">${L('Salva modalità', 'Save mode', 'Guardar modo')}</button></p>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.libro)}${L('Pre-addestramento', 'Pre-training', 'Preentrenamiento')}</h2>
      <p>${L('SocialBot legge il tuo profilo su andryxify.it per conoscerti prima ancora di entrare in chat.', 'SocialBot reads your andryxify.it profile to get to know you before it even joins chat.', 'SocialBot lee tu perfil en andryxify.it para conocerte antes de entrar al chat.')}</p>
      <p class="spazio-sopra">
        ${L('Ultima lettura:', 'Last read:', 'Última lectura:')} <strong class="primo-piano">${esc(dataIt(pre.preaddestramento_ts))}</strong>
        · ${L('voci di conoscenza:', 'knowledge entries:', 'entradas de conocimiento:')} <strong class="primo-piano">${stato.knowledgeCount}</strong>
      </p>
      ${pre.preaddestramento_esito ? `<p class="nota-lettura">${esc(pre.preaddestramento_esito)}</p>` : ''}
      <p class="spazio-sopra">
        <button class="btn secondario" id="btn-pretrain">${L('Ri-leggi il mio profilo andryxify.it', 'Re-read my andryxify.it profile', 'Volver a leer mi perfil de andryxify.it')}</button>
        <span id="esito-pretrain" class="suggerimento"></span>
      </p>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.germoglio)}${L('La piccola rete che impara', 'The little network that learns', 'La pequeña red que aprende')}</h2>
      <p>${L('Il motore veloce del bot che', 'The bot’s fast engine that', 'El motor rápido del bot que')} <strong class="primo-piano">${L('cresce da solo', 'grows on its own', 'crece solo')}</strong>: ${L('risponde all\'istante a ciò che ha già imparato e, quando incontra qualcosa di nuovo, se lo segna e lo impara dal maestro. Più lo alleni (anche via DM su Telegram), più sa fare da sé.', 'answers instantly to what it already learned and, when it meets something new, notes it and learns it from the teacher. The more you train it (also via Telegram DM), the more it can do on its own.', 'responde al instante a lo que ya aprendió y, cuando encuentra algo nuevo, lo anota y lo aprende del maestro. Cuanto más lo entrenas (también por DM en Telegram), más sabe hacer solo.')}</p>
      <div id="rete-panoramica"><p class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</p></div>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.telefono)}${L('Installa l\'app', 'Install the app', 'Instala la app')}</h2>
      <p>${L('Installa la dashboard', 'Install the dashboard', 'Instala el panel')} <strong class="primo-piano">${L('come app', 'as an app', 'como app')}</strong> ${L('sul telefono o sul PC: la apri a schermo intero come un\'app vera, senza doverla cercare nel browser.', 'on your phone or PC: open it full-screen like a real app, no need to look for it in the browser.', 'en el móvil o el PC: la abres a pantalla completa como una app de verdad, sin buscarla en el navegador.')}</p>
      <p class="spazio-sopra">
        <button class="btn secondario" id="btn-installa">${L('Installa l\'app', 'Install the app', 'Instala la app')}</button>
      </p>
      <p class="suggerimento">${L('Su iPhone/iPad: apri in Safari → Condividi → “Aggiungi a Home”. Su Android/PC (Chrome): usa il bottone qui sopra o l’icona “installa” nella barra indirizzi.', 'On iPhone/iPad: open in Safari → Share → “Add to Home Screen”. On Android/PC (Chrome): use the button above or the “install” icon in the address bar.', 'En iPhone/iPad: abre en Safari → Compartir → “Añadir a inicio”. En Android/PC (Chrome): usa el botón de arriba o el icono “instalar” en la barra de direcciones.')}</p>
    </div>
    ${proprietario ? (() => {
      // nomi dei pacchetti: sempre in italiano, sono nomi propri del prodotto
      const nomi = { community: 'Community', free: 'Essenziale', base: 'Base', pro: 'Pro' };
      const tier = stato.tier || 'community';
      const pagato = tier === 'base' || tier === 'pro';
      return `
    <div class="carta">
      <h2>${_hIco(ICO.carta)}${L('Abbonamento', 'Subscription', 'Suscripción')}</h2>
      <p>${L('Piano attuale:', 'Current plan:', 'Plan actual:')} <strong class="primo-piano">${esc(nomi[tier] || '—')}</strong>${tier === 'community' ? L(' — accesso completo, riservato ai membri abilitati di andryxify.it.', ' — full access, reserved for enabled andryxify.it members.', ' — acceso completo, reservado a los miembros habilitados de andryxify.it.') : ''}</p>
      ${pagato
        ? `<p class="spazio-sopra"><button class="btn secondario" id="btn-portale-abbonamento">${L('Gestisci abbonamento', 'Manage subscription', 'Gestionar suscripción')}</button></p>`
        : (tier === 'community' ? '' : `<p class="suggerimento spazio-sopra">${L('Gli abbonamenti self-service stanno arrivando.', 'Self-service subscriptions are coming soon.', 'Las suscripciones self-service están al llegar.')}</p>`)}
    </div>`;
    })() : ''}
    <div class="carta">
      <h2>${_hIco(ICO.chiave)}Passkey</h2>
      <p>${L('Crea una', 'Create a', 'Crea una')} <strong class="primo-piano">passkey</strong> ${L('(impronta, volto o PIN): così rientri al volo, in modo sicuro,', '(fingerprint, face or PIN): so you get back in fast and securely,', '(huella, rostro o PIN): así vuelves a entrar al vuelo y de forma segura,')} <strong class="primo-piano">${L('senza ripassare ogni volta dal sito', 'without going through the site every time', 'sin pasar cada vez por la web')}</strong>.
      ${proprietario ? '' : L('Vale per il tuo account: ti riporta ai canali che gestisci.', 'It’s tied to your account: it brings you back to the channels you manage.', 'Vale para tu cuenta: te lleva a los canales que gestionas.')}</p>
      <p class="spazio-sopra">
        <button class="btn" id="btn-crea-passkey">${L('Crea una passkey', 'Create a passkey', 'Crea una passkey')}</button>
      </p>
      <h3>${L('Le tue passkey', 'Your passkeys', 'Tus passkeys')}</h3>
      <ul class="lista-voci" id="lista-passkey"><li class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</li></ul>
    </div>
    ${proprietario ? `
    <div class="carta">
      <h2>${_hIco(ICO.utenti)}${L('Moderatori', 'Moderators', 'Moderadores')}</h2>
      <p>${L('Fai aiutare qualcuno di cui ti fidi a gestire il bot. Gli mandi un', 'Let someone you trust help run the bot. You send them an', 'Deja que alguien de confianza te ayude con el bot. Le mandas un')} <strong class="primo-piano">${L('link d\'invito', 'invite link', 'enlace de invitación')}</strong>: ${L('accede con Twitch (così sappiamo che è davvero lui) e può occuparsi di tutto,', 'they sign in with Twitch (so we know it’s really them) and can handle everything,', 'entra con Twitch (así sabemos que es él de verdad) y puede ocuparse de todo,')} <strong class="primo-piano">${L('tranne', 'except', 'excepto')}</strong> ${L('le cose da proprietario — permessi Twitch e questo elenco.', 'owner-only things — Twitch permissions and this list.', 'lo de propietario — permisos de Twitch y esta lista.')}</p>
      <label class="campo" for="inp-mod-login">${L('Username Twitch del moderatore', 'Moderator’s Twitch username', 'Usuario de Twitch del moderador')}</label>
      <div class="riga-flessibile">
        <span class="suggerimento">@</span>
        <input type="text" id="inp-mod-login" placeholder="${L('nomeutente', 'username', 'usuario')}" autocomplete="off">
        <button class="btn" id="btn-invita-mod">${L('Crea invito', 'Create invite', 'Crear invitación')}</button>
      </div>
      <div id="invito-creato"></div>
      <h3>${L('I tuoi moderatori', 'Your moderators', 'Tus moderadores')}</h3>
      <ul class="lista-voci" id="lista-moderatori"><li class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</li></ul>
    </div>` : ''}`);
}

// --- scheda Personalità -------------------------------------------------

function pannelloPersonalita() {
  const s = impostazioni();
  const perc = Math.round(s.spontaneita * 100);
  return pannello('personalita', `
    <div class="carta">
      <h2>${_hIco(ICO.persona)}${L('Personalità', 'Personality', 'Personalidad')}</h2>
      <p>${L('Decidi come parla il bot: ricorda che in chat appare', 'Decide how the bot talks: remember it appears in chat', 'Decide cómo habla el bot: recuerda que en el chat aparece')} <strong class="primo-piano">${L('a nome tuo', 'under your name', 'con tu nombre')}</strong>.</p>

      <label class="campo" for="sel-tono">${L('Tono', 'Tone', 'Tono')}</label>
      <select id="sel-tono">
        <option value="scherzoso" ${s.tono === 'scherzoso' ? 'selected' : ''}>${L('Scherzoso — battute e ironia', 'Playful — jokes and irony', 'Bromista — chistes e ironía')}</option>
        <option value="amichevole" ${s.tono === 'amichevole' ? 'selected' : ''}>${L('Amichevole — caloroso e tranquillo', 'Friendly — warm and calm', 'Amistoso — cálido y tranquilo')}</option>
        <option value="serio" ${s.tono === 'serio' ? 'selected' : ''}>${L('Serio — sobrio e diretto', 'Serious — plain and direct', 'Serio — sobrio y directo')}</option>
      </select>

      <label class="campo" for="rng-spontaneita">${L('Chat autonoma:', 'Autonomous chatting:', 'Chat autónomo:')} <span id="val-spontaneita">${perc}%</span></label>
      <input type="range" id="rng-spontaneita" min="0" max="50" step="1" value="${perc}">
      <p class="suggerimento">${L('Quanto partecipa da sola alla conversazione, come una persona. 0 = solo se la chiami; alto = molto chiacchierona.', 'How much it joins the conversation on its own, like a person. 0 = only when called; high = very chatty.', 'Cuánto participa por sí solo en la conversación, como una persona. 0 = solo si lo llamas; alto = muy hablador.')}</p>

      <div class="riga-check">
        <input type="checkbox" id="chk-menzioni" ${s.rispostaMenzioni ? 'checked' : ''}>
        <label for="chk-menzioni">${L('Rispondi quando mi nominano in chat', 'Reply when I’m mentioned in chat', 'Responde cuando me nombran en el chat')}</label>
      </div>

      <div class="riga-check">
        <input type="checkbox" id="chk-proattivo" ${s.proattivo ? 'checked' : ''}>
        <label for="chk-proattivo">${L('Personalità proattiva — ogni tanto si fa vivo da solo', 'Proactive personality — chimes in on its own now and then', 'Personalidad proactiva — de vez en cuando interviene solo')}</label>
      </div>

      <div class="riga-check">
        <input type="checkbox" id="chk-adatta" ${s.adattaCanale ? 'checked' : ''}>
        <label for="chk-adatta">${L('Adatta la personalità al mio canale (in automatico)', 'Adapt the personality to my channel (automatically)', 'Adapta la personalidad a mi canal (automáticamente)')}</label>
      </div>
      <p class="suggerimento">${L('SocialBot ha un carattere suo condiviso, ma qui puoi renderlo coerente con il tuo canale: col tono qui sopra (a mano) e lasciandolo adattare da solo al tuo stile.', 'SocialBot has its own shared character, but here you can make it fit your channel: with the tone above (manually) and by letting it adapt to your style on its own.', 'SocialBot tiene un carácter propio compartido, pero aquí puedes hacer que encaje con tu canal: con el tono de arriba (a mano) y dejando que se adapte solo a tu estilo.')}</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-ialocale" ${s.iaLocale ? 'checked' : ''}>
        <label for="chk-ialocale">${L('Risposte intelligenti (IA locale auto-addestrata)', 'Smart replies (self-trained local AI)', 'Respuestas inteligentes (IA local autoentrenada)')}</label>
      </div>
      <p class="suggerimento">${L('Un piccolo modello che gira', 'A small model running', 'Un modelo pequeño que corre')} <strong class="primo-piano">${L('sul server, senza servizi a pagamento', 'on the server, no paid services', 'en el servidor, sin servicios de pago')}</strong>: ${L('impara dalla tua chat, capisce le domande anche se scritte in modo diverso e risponde in modo naturale — così devi scrivere molte meno risposte a mano. Più la chat vive, più migliora.', 'it learns from your chat, understands questions even when worded differently and replies naturally — so you write far fewer answers by hand. The more the chat lives, the better it gets.', 'aprende de tu chat, entiende las preguntas aunque estén escritas distinto y responde de forma natural — así escribes muchas menos respuestas a mano. Cuanto más vive el chat, mejor se vuelve.')}</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-internet" ${s.internet ? 'checked' : ''}>
        <label for="chk-internet">${L('Accesso a internet — cerca da sé quando ha un dubbio', 'Internet access — searches on its own when unsure', 'Acceso a internet — busca solo cuando tiene dudas')}</label>
      </div>
      <p class="suggerimento">${L('Se non sa qualcosa (in privato, o se la nomini con una domanda in chat), può fare una ricerca veloce online (fonti gratuite: DuckDuckGo, Wikipedia) e risponderti da sé, invece di dire «non lo so». Tratta ciò che trova con giudizio e non segue istruzioni nascoste nelle pagine.', 'If it doesn’t know something (in private, or if you mention it with a question in chat), it can do a quick online search (free sources: DuckDuckGo, Wikipedia) and answer you itself, instead of saying “I don’t know”. It treats what it finds with judgement and never follows hidden instructions in the pages.', 'Si no sabe algo (en privado, o si lo nombras con una pregunta en el chat), puede hacer una búsqueda rápida en internet (fuentes gratuitas: DuckDuckGo, Wikipedia) y responderte solo, en vez de decir «no lo sé». Trata lo que encuentra con criterio y no sigue instrucciones ocultas en las páginas.')}</p>

      <label class="campo" for="txt-frasi">${L('Le tue frasi / battute (una per riga)', 'Your phrases / one-liners (one per line)', 'Tus frases / ocurrencias (una por línea)')}</label>
      <textarea id="txt-frasi" placeholder="${L('es. GG raga, si vola!&#10;chi non segue il canale paga da bere', 'e.g. GG all, let’s go!&#10;whoever doesn’t follow buys the round', 'p. ej. ¡GG chicos, a volar!&#10;quien no siga el canal paga la ronda')}">${esc(s.frasi.join('\n'))}</textarea>
      <p class="suggerimento">${L('Il bot le userà ogni tanto per suonare davvero come te. Max 50 frasi da 200 caratteri.', 'The bot will use them now and then to really sound like you. Up to 50 phrases of 200 characters.', 'El bot las usará de vez en cuando para sonar de verdad como tú. Máx. 50 frases de 200 caracteres.')}</p>

      <p class="spazio-sopra"><button class="btn" id="btn-salva-personalita">${L('Salva', 'Save', 'Guardar')}</button></p>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.righello)}${L('Linee guida', 'Guidelines', 'Directrices')}</h2>
      <p>${L('I', 'The', 'Los')} <strong class="primo-piano">${L('limiti e le regole', 'limits and rules', 'límites y las reglas')}</strong> ${L('che le dai: lei li', 'you give it: it', 'que le das: las')} <strong>${L('salva', 'saves', 'guarda')}</strong> ${L('e li rispetta', 'and follows them', 'y las respeta')}
      <strong>${L('sempre', 'always', 'siempre')}</strong>, ${L('in ogni chat (privata, pubblica, quando scrive per prima). Es. «non essere mai volgare», «non parlare di politica», «dai del tu a tutti».', 'in every chat (private, public, when it writes first). E.g. “never be rude”, “don’t talk politics”, “keep it informal with everyone”.', 'en cada chat (privado, público, cuando escribe primero). P. ej. «no seas nunca grosero», «no hables de política», «tutea a todos».')}</p>
      <p class="suggerimento">${L('Ogni regola può valere in un', 'Each rule can apply in a specific', 'Cada regla puede valer en un')} <strong>${L('contesto', 'context', 'contexto')}</strong> ${L('preciso: con chi (tutti / solo con te / tutti tranne te) e dove (ovunque / Twitch / Telegram / in privato con te). Così puoi dire «con tutti tranne me non parlare di politica» oppure «solo con me, in privato su Telegram, dammi del tu».', 'precise: with whom (everyone / only you / everyone but you) and where (anywhere / Twitch / Telegram / privately with you). So you can say “with everyone but me don’t talk politics” or “only with me, privately on Telegram, be informal”.', 'preciso: con quién (todos / solo contigo / todos menos tú) y dónde (en cualquier sitio / Twitch / Telegram / en privado contigo). Así puedes decir «con todos menos yo no hables de política» o «solo conmigo, en privado en Telegram, tutéame».')}</p>
      <p class="suggerimento">${L('Puoi dettargliele anche', 'You can also dictate them', 'También puedes dictárselas')} <strong>${L('da Telegram in privato', 'from Telegram in private', 'desde Telegram en privado')}</strong> ${L('(solo tu), a voce tua: scrivi ad es. «d\'ora in poi non essere troppo formale» o «con chi non sono io non parlare dei miei progetti» — capisce da sola il contesto. Comandi:', '(only you), in your own words: type e.g. “from now on don’t be too formal” or “with people who aren’t me don’t talk about my projects” — it figures out the context itself. Commands:', '(solo tú), a tu manera: escribe p. ej. «a partir de ahora no seas demasiado formal» o «con quien no sea yo no hables de mis proyectos» — entiende el contexto solo. Comandos:')} <code>/regola &lt;${L('testo', 'text', 'texto')}&gt;</code>, <code>/regole</code>, <code>/scorda n</code>.</p>
      <label class="campo" for="inp-guida">${L('Nuova linea guida', 'New guideline', 'Nueva directriz')}</label>
      <input type="text" id="inp-guida" placeholder="${L('es. non parlare di politica', 'e.g. don’t talk politics', 'p. ej. no hables de política')}" maxlength="300">
      <div class="riga-flessibile spazio-sopra">
        <select id="sel-guida-conchi" title="${L('Con chi', 'With whom', 'Con quién')}">
          <option value="tutti">${L('con tutti', 'with everyone', 'con todos')}</option>
          <option value="solo-me">${L('solo con me', 'only with me', 'solo conmigo')}</option>
          <option value="tranne-me">${L('con tutti tranne me', 'with everyone but me', 'con todos menos yo')}</option>
        </select>
        <select id="sel-guida-dove" title="${L('Dove', 'Where', 'Dónde')}">
          <option value="ovunque">${L('ovunque', 'anywhere', 'en cualquier sitio')}</option>
          <option value="twitch">${L('in chat Twitch', 'in Twitch chat', 'en el chat de Twitch')}</option>
          <option value="tg">${L('su Telegram', 'on Telegram', 'en Telegram')}</option>
          <option value="tg-privato">${L('in privato su Telegram', 'privately on Telegram', 'en privado en Telegram')}</option>
        </select>
        <button class="btn" id="btn-guida-add">${L('Aggiungi', 'Add', 'Añadir')}</button>
      </div>
      <ul class="lista-voci" id="lista-guide"><li class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</li></ul>
    </div>`);
}

// carica e disegna l'elenco delle linee guida (regole di "lia")
async function caricaGuide() {
  const box = document.getElementById('lista-guide');
  if (!box) return;
  let d;
  try { d = await api('/api/streamer/guide'); } catch { box.innerHTML = `<li class="vuoto">${L('Non disponibile ora.', 'Not available right now.', 'No disponible ahora.')}</li>`; return; }
  const l = d.guide || [];
  const DOVE = { ovunque: L('ovunque', 'anywhere', 'en cualquier sitio'), twitch: L('in chat Twitch', 'in Twitch chat', 'en el chat de Twitch'), tg: L('su Telegram', 'on Telegram', 'en Telegram'), 'tg-privato': L('in privato su Telegram', 'privately on Telegram', 'en privado en Telegram') };
  const CONCHI = { tutti: L('con tutti', 'with everyone', 'con todos'), 'solo-me': L('solo con te', 'only with you', 'solo contigo'), 'tranne-me': L('con tutti tranne te', 'with everyone but you', 'con todos menos tú') };
  const amb = (g) => `${CONCHI[g.con_chi] || CONCHI.tutti}, ${DOVE[g.dove] || DOVE.ovunque}`;
  box.innerHTML = l.length
    ? l.map((g) => `<li><span>${esc(g.testo)} <span class="suggerimento">— ${esc(amb(g))}</span></span> <a href="#" class="rimuovi" data-id="${g.id}" title="${L('Rimuovi', 'Remove', 'Quitar')}">✕</a></li>`).join('')
    : `<li class="vuoto">${L('Nessuna regola ancora. Aggiungine una qui sopra o da Telegram.', 'No rules yet. Add one above or from Telegram.', 'Aún no hay reglas. Añade una arriba o desde Telegram.')}</li>`;
  box.querySelectorAll('.rimuovi').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); conErrore(async () => {
    await api('/api/streamer/guide/' + a.dataset.id, { method: 'DELETE' });
    caricaGuide();
  }); }));
}

// --- scheda Conoscenza --------------------------------------------------

function pannelloConoscenza() {
  return pannello('conoscenza', `
    <div class="carta">
      <h2>${_hIco(ICO.scrivi)}${L('Insegnagli qualcosa', 'Teach it something', 'Enséñale algo')}</h2>
      <p>${L('Domanda (o parole chiave) e risposta: quando in chat spunta l\'argomento, il bot saprà cosa dire.', 'Question (or keywords) and answer: when the topic comes up in chat, the bot knows what to say.', 'Pregunta (o palabras clave) y respuesta: cuando el tema aparece en el chat, el bot sabrá qué decir.')}</p>
      <label class="campo" for="inp-domanda">${L('Domanda / parole chiave', 'Question / keywords', 'Pregunta / palabras clave')}</label>
      <input type="text" id="inp-domanda" placeholder="${L('es. che pc usi? / setup / configurazione', 'e.g. what PC do you use? / setup / config', 'p. ej. ¿qué PC usas? / setup / configuración')}">
      <label class="campo" for="inp-risposta">${L('Risposta', 'Answer', 'Respuesta')}</label>
      <input type="text" id="inp-risposta" placeholder="${L('es. Gioco su un Ryzen 7 con una 4070, trovi tutto su andryxify.it!', 'e.g. I play on a Ryzen 7 with a 4070, find it all on andryxify.it!', 'p. ej. ¡Juego con un Ryzen 7 y una 4070, lo tienes todo en andryxify.it!')}">
      <p class="spazio-sopra"><button class="btn" id="btn-aggiungi-conoscenza">${L('Aggiungi', 'Add', 'Añadir')}</button></p>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.cervello)}${L('Cosa sa il bot', 'What the bot knows', 'Lo que sabe el bot')}</h2>
      <p>${L('dal sito', 'from the site', 'de la web')} &nbsp;·&nbsp; ${L('tua', 'yours', 'tuya')} &nbsp;·&nbsp; ${L('imparata dalla chat', 'learned from chat', 'aprendida del chat')}</p>
      <ul class="lista-voci" id="lista-conoscenza"><li class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</li></ul>
    </div>`);
}

// --- scheda Clip --------------------------------------------------------

function pannelloClip() {
  const s = impostazioni();
  return pannello('clip', `
    <div class="carta">
      <h2>${_hIco(ICO.clip)}${L('Clip automatiche', 'Automatic clips', 'Clips automáticos')}</h2>
      <p>${L('Il bot riconosce i', 'The bot spots', 'El bot reconoce los')} <strong>${L('momenti da clip', 'clip-worthy moments', 'momentos para clip')}</strong> ${L('da solo: non conta solo i messaggi, ma capisce quando la chat', 'on its own: it doesn’t just count messages, it senses when chat', 'solo: no cuenta solo los mensajes, sino que capta cuándo el chat')} <strong>${L('esplode di reazioni', 'explodes with reactions', 'explota de reacciones')}</strong>${L(', ride tutta insieme o arrivano', ', laughs all together, or', ', se ríe a la vez o llegan')} <strong>${L('sub, bit o raid', 'subs, bits or raids', 'subs, bits o raids')}</strong> ${L('arrivano. E si adatta al ritmo del tuo canale (piccolo o grande).', 'come in. And it adapts to your channel’s pace (small or big).', 'And it adapts to your channel’s pace (small or big).')}</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="chk-clip" ${s.clipAuto ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-clip">${s.clipAuto ? L('Clip automatiche accese', 'Automatic clips on', 'Clips automáticos activados') : L('Clip automatiche spente', 'Automatic clips off', 'Clips automáticos desactivados')}</span>
      </div>
      <label class="campo spazio-sopra" for="rng-clip-sens">${L('Sensibilità:', 'Sensitivity:', 'Sensibilidad:')} <span id="val-clip-sens">${s.clipAutoSensibilita}</span></label>
      <input type="range" id="rng-clip-sens" min="1" max="10" value="${s.clipAutoSensibilita}">
      <p class="suggerimento">${L('Più alta = più clip (basta poco). Più bassa = solo i momenti davvero forti.', 'Higher = more clips (little is enough). Lower = only the really strong moments.', 'Más alta = más clips (basta poco). Más baja = solo los momentos realmente fuertes.')}</p>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-clip">${L('Salva', 'Save', 'Guardar')}</button></p>
    </div>
    <div class="carta">
      <h2>${L('Ultime clip', 'Latest clips', 'Últimos clips')}</h2>
      <ul class="lista-voci" id="lista-clip"><li class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</li></ul>
    </div>`);
}

// --- scheda Ascolto live ------------------------------------------------
// Due strade per creare clip "a voce": dal server (audio della live) e dal PC (microfono).

function pannelloAscolto() {
  const s = impostazioni();
  let sens = Number(s.ascoltoSensibilita);
  sens = Number.isFinite(sens) ? Math.min(10, Math.max(1, Math.round(sens))) : 5;
  const inAscolto = (stato.status?.ascoltando || []).includes(stato.user.login);
  const cc = s.cambioCategoria || { attivo: false, trigger: 'categoria', annuncia: true };
  const ct = s.cambioTitolo || { attivo: false, trigger: 'titolo', annuncia: true };
  const iv = s.imparaVoce || { attivo: false };
  const proprietario = stato?.ruolo !== 'moderatore';        // "impara mentre parlo" solo per me
  const mancaPermesso = !DEMO && stato.canaleOk === false;   // serve una ri-autorizzazione

  return pannello('ascolto', `
    <div class="carta">
      <h2>${_hIco(ICO.cuffie)}${L('Momenti salienti (dal server)', 'Highlights (from the server)', 'Momentos destacados (desde el servidor)')}</h2>
      <p>${L('Il bot ascolta l\'audio della tua live e crea una clip da solo quando "esplode": urla, risate, hype.', 'The bot listens to your live audio and clips on its own when it "explodes": shouts, laughter, hype.', 'El bot escucha el audio de tu directo y crea un clip solo cuando "explota": gritos, risas, hype.')}</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="toggle-ascolto" ${s.ascoltoLive ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-ascolto">${s.ascoltoLive ? L('Ascolto acceso', 'Listening on', 'Escucha activada') : L('Ascolto spento', 'Listening off', 'Escucha desactivada')}</span>
        ${inAscolto
          ? `<span class="badge verde">● ${L('in ascolto ora', 'listening now', 'escuchando ahora')}</span>`
          : `<span class="badge">○ ${L('non in ascolto', 'not listening', 'sin escuchar')}</span>`}
      </div>
      <label class="campo" for="rng-ascolto">${L('Sensibilità:', 'Sensitivity:', 'Sensibilidad:')} <span id="val-ascolto">${sens}</span></label>
      <input type="range" id="rng-ascolto" min="1" max="10" step="1" value="${sens}">
      <p class="suggerimento">${L('Più alto = più clip (prende anche i momenti meno intensi). Più basso = solo i picchi veri.', 'Higher = more clips (catches milder moments too). Lower = only the real peaks.', 'Más alto = más clips (coge también los momentos menos intensos). Más bajo = solo los picos reales.')}</p>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-ascolto">${L('Salva', 'Save', 'Guardar')}</button></p>
      <p class="suggerimento spazio-sopra">${L('Consuma risorse del server: è limitato a pochi canali live insieme. C\'è un piccolo ritardo (~15-30s) dovuto a Twitch, ma le clip prendono comunque il momento.', 'It uses server resources: limited to a few live channels at once. There’s a small delay (~15-30s) due to Twitch, but the clips still catch the moment.', 'Consume recursos del servidor: está limitado a pocos canales en directo a la vez. Hay un pequeño retardo (~15-30s) por Twitch, pero los clips igualmente pillan el momento.')}</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.voce)}${L('Comando vocale', 'Voice command', 'Comando por voz')}</h2>
      <p>${L('I comandi vocali funzionano', 'Voice commands work', 'Los comandos por voz funcionan')} <strong class="primo-piano">${L('nel browser', 'in the browser', 'en el navegador')}</strong>, ${L('senza installare niente: apri la pagina di ascolto, premi Avvia, e quando dici una parola chiave il bot fa quello che hai impostato nei Moduli.', 'with nothing to install: open the listening page, press Start, and when you say a keyword the bot does what you set in Modules.', 'sin instalar nada: abre la página de escucha, pulsa Iniciar, y cuando dices una palabra clave el bot hace lo que configuraste en los Módulos.')}</p>
      <p class="spazio-sopra">
        <a class="btn grande" href="/voce.html" target="_blank" rel="noopener">${_bIco(ICO.voce)}${L('Apri l\'ascolto vocale', 'Open voice listening', 'Abre la escucha por voz')}</a>
      </p>
      <p class="suggerimento spazio-sopra">${L('Tienila aperta mentre streammi. Funziona su Chrome o Edge (Mac e Windows).', 'Keep it open while you stream. Works on Chrome or Edge (Mac and Windows).', 'Mantenla abierta mientras haces directo. Funciona en Chrome o Edge (Mac y Windows).')}</p>
      <p class="suggerimento">${L('I comandi vocali si creano e modificano in', 'Voice commands are created and edited in', 'Los comandos por voz se crean y editan en')}
      <strong class="primo-piano">${L('Chat & comandi → Comandi', 'Chat & commands → Commands', 'Chat y comandos → Comandos')}</strong> (${L('innesco "Comando vocale"', '"Voice command" trigger', 'disparador "Comando por voz"')}).</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.giochi)}${L('Cambia categoria a voce', 'Change category by voice', 'Cambia categoría por voz')}</h2>
      <p>${L('Dici', 'Say', 'Di')} <strong class="primo-piano">«<span id="cat-esempio">${esc(cc.trigger || 'categoria')}</span> <em>${L('nome del gioco', 'game name', 'nombre del juego')}</em>»</strong>
      ${L('mentre streammi e il bot cambia la categoria del canale su Twitch. Se ti sente male, prova comunque a indovinare il gioco più somigliante tra le categorie di Twitch.', 'while you stream and the bot changes the channel category on Twitch. If it mishears you, it still tries to guess the closest game among Twitch categories.', 'mientras haces directo y el bot cambia la categoría del canal en Twitch. Si te oye mal, intenta igualmente adivinar el juego más parecido entre las categorías de Twitch.')}</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="chk-categoria" ${cc.attivo ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-categoria">${cc.attivo ? L('Attivo', 'On', 'Activo') : L('Spento', 'Off', 'Apagado')}</span>
      </div>
      <label class="campo" for="inp-cat-trigger">${L('Parola chiave (quella che dici prima del gioco)', 'Keyword (the one you say before the game)', 'Palabra clave (la que dices antes del juego)')}</label>
      <input type="text" id="inp-cat-trigger" class="campo-largo" maxlength="30" value="${esc(cc.trigger || 'categoria')}" placeholder="${L('categoria', 'category', 'categoría')}">
      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-cat-annuncia" ${cc.annuncia !== false ? 'checked' : ''}>
        <label for="chk-cat-annuncia">${L('Annuncia il cambio in chat', 'Announce the change in chat', 'Anuncia el cambio en el chat')}</label>
      </div>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-categoria">${L('Salva', 'Save', 'Guardar')}</button></p>
      ${mancaPermesso ? `<p class="nota-lettura">${L('Per cambiare categoria il bot ha bisogno del permesso', 'To change the category the bot needs the', 'Para cambiar la categoría el bot necesita el permiso')} <strong>${L('Gestione canale', 'Manage Channel', 'Gestión del canal')}</strong> ${L('su Twitch.', 'permission on Twitch.', 'en Twitch.')}
      <a href="/auth/permessi">${L('Concedi il permesso', 'Grant the permission', 'Concede el permiso')}</a> ${L('(ti riporta qui dopo l\'autorizzazione).', '(it brings you back here after authorizing).', '(te devuelve aquí tras autorizar).')}</p>` : ''}
      <p class="suggerimento spazio-sopra">${L('Esempi: «categoria Fortnite», «categoria League of Legends». La parola chiave è a tua scelta (es. «gioco», «passa a»). Funziona dalla stessa pagina di ascolto vocale qui sopra.', 'Examples: “category Fortnite”, “category League of Legends”. The keyword is your choice (e.g. “game”, “switch to”). It works from the same voice-listening page above.', 'Ejemplos: «categoría Fortnite», «categoría League of Legends». La palabra clave la eliges tú (p. ej. «juego», «cambia a»). Funciona desde la misma página de escucha por voz de arriba.')}</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.scrivi)}${L('Cambia titolo a voce', 'Change title by voice', 'Cambia el título por voz')}</h2>
      <p>${L('Dici', 'Say', 'Di')} <strong class="primo-piano">«<span id="tit-esempio">${esc(ct.trigger || 'titolo')}</span> <em>${L('il tuo titolo', 'your title', 'tu título')}</em>»</strong>
      ${L('e il bot aggiorna il titolo dello stream su Twitch (testo libero, come lo dici).', 'and the bot updates the stream title on Twitch (free text, as you say it).', 'y el bot actualiza el título del directo en Twitch (texto libre, como lo dices).')}</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="chk-titolo" ${ct.attivo ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-titolo">${ct.attivo ? L('Attivo', 'On', 'Activo') : L('Spento', 'Off', 'Apagado')}</span>
      </div>
      <label class="campo" for="inp-tit-trigger">${L('Parola chiave (quella che dici prima del titolo)', 'Keyword (the one you say before the title)', 'Palabra clave (la que dices antes del título)')}</label>
      <input type="text" id="inp-tit-trigger" class="campo-largo" maxlength="30" value="${esc(ct.trigger || 'titolo')}" placeholder="${L('titolo', 'title', 'título')}">
      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-tit-annuncia" ${ct.annuncia !== false ? 'checked' : ''}>
        <label for="chk-tit-annuncia">${L('Annuncia il cambio in chat', 'Announce the change in chat', 'Anuncia el cambio en el chat')}</label>
      </div>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-titolo">${L('Salva', 'Save', 'Guardar')}</button></p>
      ${mancaPermesso ? `<p class="nota-lettura">${L('Anche il titolo usa il permesso', 'The title also uses the', 'El título también usa el permiso')} <strong>${L('Gestione canale', 'Manage Channel', 'Gestión del canal')}</strong> ${L('.', ' permission.', '.')}
      <a href="/auth/permessi">${L('Concedilo qui', 'Grant it here', 'Concédelo aquí')}</a> ${L('(vale per categoria e titolo).', '(applies to category and title).', '(vale para categoría y título).')}</p>` : ''}
      <p class="suggerimento spazio-sopra">${L('Esempio: «titolo Si torna su Elden Ring, si punta al boss!». Puoi cambiare la parola chiave (es. «nuovo titolo»). Stessa pagina di ascolto vocale qui sopra.', 'Example: “title Back on Elden Ring, going for the boss!”. You can change the keyword (e.g. “new title”). Same voice-listening page above.', 'Ejemplo: «título ¡Volvemos a Elden Ring, a por el jefe!». Puedes cambiar la palabra clave (p. ej. «nuevo título»). Misma página de escucha por voz de arriba.')}</p>
    </div>
    ${proprietario ? `
    <div class="carta">
      <h2>${_hIco(ICO.cuffie)}${L('Impara mentre parlo', 'Learns while I talk', 'Aprende mientras hablo')}</h2>
      <p>${L('Con la pagina di ascolto aperta, il bot', 'With the listening page open, the bot', 'Con la página de escucha abierta, el bot')} <strong class="primo-piano">${L('ti sente parlare in diretta', 'hears you speak live', 'te oye hablar en directo')}</strong> ${L('e cresce: impara i tuoi modi di dire e il tuo tono, così ti somiglia sempre di più.', 'and grows: it learns your sayings and your tone, so it sounds more and more like you.', 'y crece: aprende tus expresiones y tu tono, así se te parece cada vez más.')} <strong>${L('Solo la tua voce', 'Only your voice', 'Solo tu voz')}</strong> — ${L('mai da altri account.', 'never from other accounts.', 'nunca de otras cuentas.')}</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="chk-impara" ${iv.attivo ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-impara">${iv.attivo ? L('Attivo', 'On', 'Activo') : L('Spento', 'Off', 'Apagado')}</span>
      </div>
      <p class="suggerimento spazio-sopra">${L('L\'audio <strong>non lascia il tuo PC</strong>: la trascrizione avviene nel browser, al bot arriva solo il testo. Funziona dalla stessa pagina di ascolto vocale qui sopra.', 'The audio <strong>never leaves your PC</strong>: transcription happens in the browser, only the text reaches the bot. It works from the same voice-listening page above.', 'El audio <strong>no sale de tu PC</strong>: la transcripción ocurre en el navegador, al bot solo le llega el texto. Funciona desde la misma página de escucha por voz de arriba.')}</p>
    </div>` : ''}`);
}

// --- scheda Musica (richieste via Spotify) ------------------------------

function pannelloMusica() {
  const m = impostazioni().musica || {};
  const modo = ['libero', 'sub', 'monete', 'bit', 'punti'].includes(m.modo) ? m.modo : 'libero';
  const opt = (v, t) => `<option value="${v}" ${modo === v ? 'selected' : ''}>${t}</option>`;
  return pannello('musica', `
    <div class="carta">
      <h2>${_hIco(ICO.musica)}${L('Richieste musicali', 'Music requests', 'Peticiones musicales')}</h2>
      <p>${L('Collega Spotify: gli spettatori mettono canzoni in coda con', 'Connect Spotify: viewers queue songs with', 'Conecta Spotify: los espectadores ponen canciones en cola con')}
      <code>!sr &lt;${L('canzone', 'song', 'canción')}&gt;</code> ${L('e vedono cosa suona con', 'and see what’s playing with', 'y ven qué suena con')} <code>!song</code>.
      ${L('Serve <strong>Spotify Premium</strong> e un dispositivo attivo (l\'app aperta e in riproduzione).', 'Requires <strong>Spotify Premium</strong> and an active device (the app open and playing).', 'Necesita <strong>Spotify Premium</strong> y un dispositivo activo (la app abierta y reproduciendo).')}</p>
      <div id="spotify-box" class="spazio-sopra"><p>${L('Carico…', 'Loading…', 'Cargando…')}</p></div>
    </div>
    <div class="carta">
      <h3>${_hIco(ICO.sliders)}${L('Come si richiede una canzone', 'How to request a song', 'Cómo se pide una canción')}</h3>
      <p>${L('Decidi tu se le richieste sono libere o "a pagamento": non devono per forza essere gratis.', 'You decide whether requests are free or "paid": they don’t have to be free.', 'Tú decides si las peticiones son libres o "de pago": no tienen por qué ser gratis.')}</p>
      <label class="campo" for="musica-modo">${L('Modalità', 'Mode', 'Modo')}</label>
      <select id="musica-modo">
        ${opt('libero', L('Libere — tutti, gratis', 'Free — everyone, free', 'Libres — todos, gratis'))}
        ${opt('sub', L('Solo abbonati (sub)', 'Subscribers only (subs)', 'Solo suscriptores (subs)'))}
        ${opt('monete', L('A monete del bot', 'With bot coins', 'Con monedas del bot'))}
        ${opt('bit', L('A bit (Cheer nel messaggio)', 'With bits (Cheer in the message)', 'Con bits (Cheer en el mensaje)'))}
        ${opt('punti', L('A punti canale (premio)', 'With channel points (reward)', 'Con puntos de canal (recompensa)'))}
      </select>
      <div id="musica-costo-box" class="spazio-sopra" hidden>
        <label class="campo" for="musica-costo">${L('Costo', 'Cost', 'Coste')} (<span id="musica-costo-unita">${L('monete', 'coins', 'monedas')}</span>)</label>
        <input type="number" id="musica-costo" min="0" max="1000000" value="${Number(m.costo) || 0}">
      </div>
      <div id="musica-premio-box" class="spazio-sopra" hidden>
        <input type="hidden" id="musica-premio" value="${esc(m.premio || '')}">
        <p>Gli spettatori richiedono una canzone <strong>riscattando un premio a punti canale</strong> con la "richiesta di testo": scrivono il brano nel riscatto e il bot lo mette in coda.</p>
        <div id="musica-premi-box" class="spazio-sopra"><p>Carico i tuoi premi…</p></div>
      </div>
      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="musica-disambigua" ${m.disambigua !== false ? 'checked' : ''}>
        <label for="musica-disambigua">${L('Se ci sono più canzoni con lo stesso titolo, chiedi in chat quale ("intendi 1, 2 o 3?")', 'If several songs share the same title, ask in chat which one ("do you mean 1, 2 or 3?")', 'Si hay varias canciones con el mismo título, pregunta en el chat cuál ("¿te refieres a 1, 2 o 3?")')}</label>
      </div>
      <button class="btn spazio-sopra" id="musica-salva">${L('Salva', 'Save', 'Guardar')}</button>
    </div>`);
}

// Modulo "credenziali": ogni streamer crea la SUA app Spotify (gratis) e incolla
// qui Client ID/Secret. Così ogni app serve un solo utente e resta in
// Development mode → nessuna approvazione da chiedere a Spotify.
function formCredenzialiSpotify(redirect) {
  return `
    <details class="spotify-guida">
      <summary>${L('Come ottenere le credenziali Spotify (2 min)', 'How to get Spotify credentials (2 min)', 'Cómo obtener las credenciales de Spotify (2 min)')}</summary>
      <ol>
        <li>${L('Vai su', 'Go to', 'Ve a')} <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a> ${L('e accedi.', 'and log in.', 'e inicia sesión.')}</li>
        <li>${L('Clicca', 'Click', 'Haz clic en')} <strong>Create app</strong>: ${L('dai un nome qualsiasi.', 'give it any name.', 'ponle cualquier nombre.')}</li>
        <li>${L('In <strong>Redirect URIs</strong> incolla esattamente:', 'In <strong>Redirect URIs</strong> paste exactly:', 'En <strong>Redirect URIs</strong> pega exactamente:')}<br><code class="spotify-redirect">${esc(redirect || '')}</code></li>
        <li>${L('Salva, poi apri le <strong>Settings</strong> dell\'app: copia <strong>Client ID</strong> e <strong>Client Secret</strong> qui sotto.', 'Save, then open the app <strong>Settings</strong>: copy <strong>Client ID</strong> and <strong>Client Secret</strong> below.', 'Guarda, luego abre los <strong>Settings</strong> de la app: copia <strong>Client ID</strong> y <strong>Client Secret</strong> abajo.')}</li>
      </ol>
    </details>
    <div class="griglia-campi spazio-sopra">
      <div>
        <label class="campo">Client ID</label>
        <input type="text" id="spotify-cid" placeholder="${L('es. 4a1b…', 'e.g. 4a1b…', 'p. ej. 4a1b…')}" autocomplete="off">
      </div>
      <div>
        <label class="campo">Client Secret</label>
        <input type="password" id="spotify-csec" placeholder="${L('incolla il secret', 'paste the secret', 'pega el secret')}" autocomplete="off">
      </div>
    </div>
    <button class="btn spazio-sopra" id="spotify-salva-cred">${L('Salva credenziali', 'Save credentials', 'Guardar credenciales')}</button>`;
}

// Modalità richieste (!sr): mostra il campo giusto per il modo scelto e salva.
function wiraMusicaConfig() {
  const sel = document.getElementById('musica-modo');
  if (!sel) return;
  const costoBox = document.getElementById('musica-costo-box');
  const premioBox = document.getElementById('musica-premio-box');
  const unita = document.getElementById('musica-costo-unita');
  let premiCaricati = false;
  const applica = () => {
    const v = sel.value;
    if (costoBox) costoBox.hidden = !(v === 'monete' || v === 'bit');
    if (premioBox) premioBox.hidden = v !== 'punti';
    if (unita) unita.textContent = v === 'bit' ? 'bit' : 'monete';
    if (v === 'punti' && !premiCaricati) { premiCaricati = true; caricaPremiMusica(); }
  };
  sel.addEventListener('change', applica);
  applica();
  const b = document.getElementById('musica-salva');
  if (b) b.addEventListener('click', () => conErrore(() => salvaMusica()));
}

// Salva la config musica (modo + costo + premio). `silenzioso` = niente toast.
async function salvaMusica(silenzioso) {
  const sel = document.getElementById('musica-modo');
  if (!sel) return;
  const musica = {
    modo: sel.value,
    costo: Number(document.getElementById('musica-costo')?.value) || 0,
    premio: (document.getElementById('musica-premio')?.value || '').trim(),
    disambigua: !!document.getElementById('musica-disambigua')?.checked,
  };
  await api('/api/streamer/impostazioni', { method: 'POST', body: { musica } });
  if (!silenzioso) toast(L('Impostazioni musica salvate', 'Music settings saved', 'Ajustes de música guardados'));
}

// Modalità "punti canale": lascia scegliere UN premio tra quelli con la
// "richiesta di testo" attiva (gli altri non sono usabili → esclusi), oppure
// crearne uno pronto all'uso. Niente più campo-nome da riempire a mano.
async function caricaPremiMusica() {
  const box = document.getElementById('musica-premi-box');
  if (!box) return;
  box.innerHTML = `<p>${L('Carico i tuoi premi a punti canale…', 'Loading your channel-point rewards…', 'Cargando tus recompensas de puntos de canal…')}</p>`;
  let d;
  try { d = await api('/api/musica/premi'); } catch { box.innerHTML = `<p>${L('Impossibile leggere i premi.', 'Couldn’t read the rewards.', 'No se pueden leer las recompensas.')}</p>`; return; }
  if (!d.permessoOk) {
    box.innerHTML = `<div class="riquadro-info">${L('Per usare i premi a punti canale serve il permesso: concedilo da <strong>Chat &amp; comandi → Effetti &amp; suoni</strong> (sezione Premi), poi torna qui.', 'To use channel-point rewards you need the permission: grant it from <strong>Chat &amp; commands → Effects &amp; sounds</strong> (Rewards section), then come back here.', 'Para usar las recompensas de puntos de canal necesitas el permiso: concédelo desde <strong>Chat y comandos → Efectos y sonidos</strong> (sección Recompensas), luego vuelve aquí.')}</div>`;
    return;
  }
  const eleggibili = (d.tutti || []).filter((r) => r.richiedeTesto);
  const esclusi = (d.tutti || []).length - eleggibili.length;
  const inp = document.getElementById('musica-premio');
  const attuale = (inp?.value || d.premio || '').trim();

  const formCrea = `
    <details class="spazio-sopra"${eleggibili.length ? '' : ' open'}>
      <summary>${eleggibili.length ? L('Oppure crea un premio pronto all\'uso', 'Or create a ready-to-use reward', 'O crea una recompensa lista para usar') : L('Crea un premio pronto all\'uso', 'Create a ready-to-use reward', 'Crea una recompensa lista para usar')}</summary>
      <div class="griglia-campi spazio-sopra">
        <div><label class="campo">${L('Nome', 'Name', 'Nombre')}</label><input type="text" id="musica-nuovo-nome" value="${L('Richiesta musicale', 'Music request', 'Petición musical')}"></div>
        <div><label class="campo">${L('Costo (punti canale)', 'Cost (channel points)', 'Coste (puntos de canal)')}</label><input type="number" id="musica-nuovo-costo" min="1" value="500"></div>
      </div>
      <button class="btn secondario spazio-sopra" id="musica-crea-premio">${L('Crea il premio su Twitch', 'Create the reward on Twitch', 'Crea la recompensa en Twitch')}</button>
      <p class="suggerimento">${L('Lo creo io con la "richiesta di testo" già attiva e lo seleziono qui.', 'I create it with "require text" already on and select it here.', 'La creo con "requerir texto" ya activado y la selecciono aquí.')}</p>
    </details>`;

  if (!eleggibili.length) {
    box.innerHTML = `<div class="riquadro-info">${L('Non hai premi a punti canale con la <strong>richiesta di testo</strong> attiva', 'You have no channel-point rewards with <strong>require text</strong> enabled', 'No tienes recompensas de puntos de canal con <strong>requerir texto</strong> activado')}${esclusi ? ` (${esclusi} ${L('non ', 'not ', 'no ')}${esclusi === 1 ? L('adatto', 'suitable', 'apta') : L('adatti', 'suitable', 'aptas')})` : ''}. ${L('Creane uno pronto all\'uso', 'Create a ready-to-use one', 'Crea una lista para usar')}</div>${formCrea}`;
  } else {
    box.innerHTML = `
      <label class="campo" for="musica-premio-sel">${L('Premio usato per le richieste', 'Reward used for requests', 'Recompensa usada para las peticiones')}</label>
      <select id="musica-premio-sel">
        ${eleggibili.map((r) => `<option value="${esc(r.title)}"${r.title === attuale ? ' selected' : ''}>${esc(r.title)} — ${r.cost} ${L('punti', 'points', 'puntos')}</option>`).join('')}
      </select>
      ${esclusi ? `<p class="suggerimento">${esclusi} ${esclusi === 1 ? L('altro premio non ha', 'other reward doesn’t have', 'otra recompensa no tiene') : L('altri premi non hanno', 'other rewards don’t have', 'otras recompensas no tienen')} ${L('la richiesta di testo, quindi', 'require text, so', 'requerir texto, así que')} ${esclusi === 1 ? L('non compare', 'it doesn’t appear', 'no aparece') : L('non compaiono', 'they don’t appear', 'no aparecen')} ${L('qui.', 'here.', 'aquí.')}</p>` : ''}
      ${formCrea}`;
    const selp = document.getElementById('musica-premio-sel');
    if (!eleggibili.some((r) => r.title === attuale)) selp.selectedIndex = 0;
    if (inp) inp.value = selp.value;
    selp.addEventListener('change', () => { if (inp) inp.value = selp.value; conErrore(async () => { await salvaMusica(true); toast(L('Premio impostato ✓', 'Reward set ✓', 'Recompensa fijada ✓')); }); });
  }

  const bc = document.getElementById('musica-crea-premio');
  if (bc) bc.addEventListener('click', () => conErrore(async () => {
    const titolo = (document.getElementById('musica-nuovo-nome')?.value || L('Richiesta musicale', 'Music request', 'Petición musical')).trim();
    const costo = Number(document.getElementById('musica-nuovo-costo')?.value) || 500;
    const r = await api('/api/musica/premio', { method: 'POST', body: { titolo, costo } });
    if (r?.reward) { if (inp) inp.value = r.reward.title; toast(L('Premio creato su Twitch!', 'Reward created on Twitch!', '¡Recompensa creada en Twitch!')); caricaPremiMusica(); }
  }));
}

async function caricaSpotify() {
  wiraMusicaConfig();
  const box = document.getElementById('spotify-box');
  if (!box) return;
  const q = new URLSearchParams(location.search);
  if (q.get('spotify') === 'ok') toast(L('Spotify collegato!', 'Spotify connected!', '¡Spotify conectado!'));
  else if (q.get('spotify') === 'errore') toast(L('Collegamento Spotify non riuscito.', 'Spotify connection failed.', 'Conexión con Spotify fallida.'), 'errore');
  const proprietario = stato?.ruolo !== 'moderatore';
  if (!proprietario) { box.innerHTML = `<p>${L('Solo il proprietario del canale può collegare Spotify.', 'Only the channel owner can connect Spotify.', 'Solo el dueño del canal puede conectar Spotify.')}</p>`; return; }
  let d;
  try { d = await api('/api/spotify/stato'); } catch { box.innerHTML = `<p>${L('Impossibile caricare lo stato.', 'Couldn’t load the status.', 'No se pudo cargar el estado.')}</p>`; return; }

  // 1) già collegato → badge + scollega + possibilità di cambiare app
  if (d.collegato) {
    box.innerHTML = `<div class="riga-interruttore">
        <span class="badge verde">● ${L('Spotify collegato', 'Spotify connected', 'Spotify conectado')}</span>
        <button class="btn secondario" id="spotify-scollega">${L('Scollega', 'Disconnect', 'Desconectar')}</button>
      </div>
      <p class="suggerimento spazio-sopra">${d.proprio ? L('Stai usando la tua app Spotify.', 'You’re using your own Spotify app.', 'Estás usando tu app de Spotify.') : L('Stai usando l\'app condivisa dell\'operatore.', 'You’re using the operator’s shared app.', 'Estás usando la app compartida del operador.')}</p>`;
    document.getElementById('spotify-scollega').addEventListener('click', () => conErrore(async () => {
      await api('/api/spotify/disconnect', { method: 'POST', body: {} });
      toast(L('Spotify scollegato.', 'Spotify disconnected.', 'Spotify desconectado.')); caricaSpotify();
    }));
    return;
  }

  // 2) credenziali presenti (proprie o globali) ma non ancora collegato → Connetti
  //    (+ possibilità di reimpostare le proprie credenziali)
  if (d.attivo) {
    box.innerHTML = `
      <button class="btn" id="spotify-collega">${L('Connetti Spotify', 'Connect Spotify', 'Conectar Spotify')}</button>
      <p class="suggerimento spazio-sopra">${d.proprio
        ? L('Userai la tua app Spotify.', 'You’ll use your own Spotify app.', 'Usarás tu app de Spotify.')
        : L('Basta un clic: userai l\'app di andryxify.it. Solo se preferisci puoi usare una tua app Spotify (opzionale).', 'One click: you’ll use andryxify.it’s app. Only if you prefer, you can use your own Spotify app (optional).', 'Un clic: usarás la app de andryxify.it. Solo si lo prefieres puedes usar tu propia app de Spotify (opcional).')}</p>
      ${d.proprio ? '' : `<details class="spazio-sopra"><summary>${L('Usa una mia app Spotify (avanzato)', 'Use my own Spotify app (advanced)', 'Usar mi propia app de Spotify (avanzado)')}</summary>` + formCredenzialiSpotify(d.redirect) + '</details>'}`;
    document.getElementById('spotify-collega').addEventListener('click', () => conErrore(async () => {
      const r = await api('/api/spotify/connect');
      if (r?.url) location.href = r.url;
    }));
    collegaSalvaCred();
    return;
  }

  // 3) nessuna app: mostra il form credenziali
  box.innerHTML = formCredenzialiSpotify(d.redirect);
  collegaSalvaCred();
}

// Connettore TikTok (Display API) per l'avviso "nuovo post". Riempie #tiktok-post-box
// con lo stato del collegamento OAuth: identico schema del box Spotify.
async function caricaTikTok() {
  const box = document.getElementById('tiktok-post-box');
  if (!box) return;
  const q = new URLSearchParams(location.search);
  if (q.get('tiktok') === 'ok') toast(L('Account TikTok collegato.', 'TikTok account connected.', 'Cuenta de TikTok conectada.'));
  else if (q.get('tiktok') === 'errore') toast(L('Collegamento TikTok non riuscito.', 'TikTok connection failed.', 'Conexión con TikTok fallida.'), 'errore');
  if (q.get('tiktok')) { try { history.replaceState(null, '', location.pathname + '#notifiche'); } catch { /* niente */ } }
  const proprietario = stato?.ruolo !== 'moderatore';
  if (!proprietario) { box.innerHTML = '<p class="suggerimento">Solo il proprietario del canale può collegare TikTok.</p>'; return; }
  let d;
  try { d = await api('/api/tiktok/stato'); } catch { box.innerHTML = '<p class="suggerimento">Impossibile caricare lo stato del connettore TikTok.</p>'; return; }

  // 1) app non configurata dall'operatore (manca Client Key/Secret nel server)
  if (!d.appAttiva) {
    box.innerHTML = '<p class="suggerimento">Il connettore TikTok non è ancora attivo: serve configurare l\'app TikTok (Client Key/Secret) lato server.</p>';
    return;
  }
  // 2) app pronta ma account non collegato → bottone Collega
  if (!d.collegato) {
    box.innerHTML = `<button class="btn" id="tiktok-collega">Collega TikTok</button>
      <p class="suggerimento spazio-sopra">Ti mando su TikTok per autorizzare la lettura dei tuoi video. Nient'altro.</p>`;
    document.getElementById('tiktok-collega').addEventListener('click', () => conErrore(async () => {
      const r = await api('/api/tiktok/connect');
      if (r?.url) location.href = r.url;
    }));
    return;
  }
  // 3) collegato → badge + scollega + prova
  box.innerHTML = `<div class="riga-interruttore">
      <span class="badge verde">● TikTok collegato${d.username ? ' (@' + esc(d.username) + ')' : ''}</span>
      <button class="btn secondario mini" id="tiktok-prova">Prova</button>
      <button class="btn secondario mini" id="tiktok-scollega">Scollega</button>
    </div>`;
  document.getElementById('tiktok-scollega').addEventListener('click', () => conErrore(async () => {
    await api('/api/tiktok/disconnect', { method: 'POST', body: {} });
    toast(L('TikTok scollegato.', 'TikTok disconnected.', 'TikTok desconectado.')); caricaTikTok();
  }));
  document.getElementById('tiktok-prova').addEventListener('click', () => conErrore(async () => {
    const r = await api('/api/tiktok/prova', { method: 'POST', body: {} });
    if (r?.vuoto) toast(L('Collegato, ma non trovo ancora video sul tuo profilo.', 'Connected, but I can\'t find any videos on your profile yet.', 'Conectado, pero aún no encuentro vídeos en tu perfil.'));
    else toast(L('Funziona: leggo il tuo ultimo video.', 'It works: I can read your latest video.', 'Funciona: leo tu último vídeo.'));
  }));
}

// Notifiche Discord (webhook): avviso "sei in diretta" nel canale del server Discord.
async function caricaDiscord() {
  const box = document.getElementById('discord-box'); if (!box) return;
  let d; try { d = await api('/api/discord/stato'); }
  catch { box.innerHTML = `<p class="suggerimento">${L('Impossibile caricare lo stato Discord.', 'Couldn\'t load Discord status.', 'No se pudo cargar el estado de Discord.')}</p>`; return; }
  const wh = !!d.configurato;
  box.innerHTML = `
    <label class="campo" for="inp-dc-webhook">${L('Webhook del canale Discord', 'Discord channel webhook', 'Webhook del canal de Discord')}</label>
    <input type="password" id="inp-dc-webhook" class="campo-largo" placeholder="${wh ? esc(d.anteprima) : 'https://discord.com/api/webhooks/…'}" autocomplete="off">
    <p class="suggerimento">${L('In Discord: <strong>Impostazioni canale → Integrazioni → Webhook → Nuovo webhook → Copia URL</strong>, poi incollalo qui. Per aggiornare messaggio/opzioni lascia questo campo vuoto.', 'In Discord: <strong>Channel settings → Integrations → Webhooks → New webhook → Copy URL</strong>, then paste it here. To update the message/options just leave this field empty.', 'En Discord: <strong>Ajustes del canal → Integraciones → Webhooks → Nuevo webhook → Copiar URL</strong>, y pégalo aquí. Para actualizar mensaje/opciones deja este campo vacío.')}</p>

    <label class="campo spazio-sopra" for="txt-dc-msg">${L('Messaggio dell\'avviso', 'Alert message', 'Mensaje del aviso')}</label>
    <textarea id="txt-dc-msg" rows="3" placeholder="${esc('🔴 {nome} è in diretta ora! 👉 {link}')}">${esc(d.messaggio || '')}</textarea>
    <p class="suggerimento">${L('Segnaposto:', 'Placeholders:', 'Marcadores:')} <code>{nome}</code> <code>{titolo}</code> <code>{gioco}</code> <code>{spettatori}</code> <code>{link}</code>. ${L('Per taggare tutti scrivi <code>@everyone</code> nel messaggio.', 'To ping everyone, write <code>@everyone</code> in the message.', 'Para avisar a todos escribe <code>@everyone</code> en el mensaje.')}</p>

    <div class="griglia-campi spazio-sopra">
      <div><label class="campo" for="inp-dc-nome">${L('Nome del bot', 'Bot name', 'Nombre del bot')} <span class="suggerimento">(${L('facolt.', 'optional', 'opcional')})</span></label>
        <input type="text" id="inp-dc-nome" class="campo-largo" value="${esc(d.nomeBot || '')}" placeholder="SocialBot"></div>
      <div><label class="campo" for="inp-dc-avatar">${L('Avatar (URL)', 'Avatar (URL)', 'Avatar (URL)')} <span class="suggerimento">(${L('facolt.', 'optional', 'opcional')})</span></label>
        <input type="text" id="inp-dc-avatar" class="campo-largo" value="${esc(d.avatar || '')}" placeholder="https://…/logo.png"></div>
    </div>

    <div class="riga-check spazio-sopra">
      <input type="checkbox" id="chk-dc-attivo" ${d.attivo ? 'checked' : ''}>
      <label for="chk-dc-attivo">${L('Avvisami quando vado in diretta', 'Alert me when I go live', 'Avísame cuando voy en directo')}</label>
    </div>
    <p class="spazio-sopra">
      <button class="btn" id="btn-dc-salva">${L('Salva', 'Save', 'Guardar')}</button>
      ${wh ? ` <button class="btn secondario mini" id="btn-dc-prova">${L('Prova', 'Test', 'Probar')}</button> <button class="btn secondario mini" id="btn-dc-scollega">${L('Scollega', 'Disconnect', 'Desconectar')}</button>` : ''}
    </p>`;
  document.getElementById('btn-dc-salva').addEventListener('click', () => conErrore(async () => {
    const webhook = document.getElementById('inp-dc-webhook').value.trim();
    const body = {
      messaggio: document.getElementById('txt-dc-msg').value,
      nomeBot: document.getElementById('inp-dc-nome').value,
      avatar: document.getElementById('inp-dc-avatar').value,
      attivo: document.getElementById('chk-dc-attivo').checked,
    };
    if (webhook) body.webhook = webhook;   // invia il webhook solo se ne è stato messo uno nuovo
    await api('/api/discord', { method: 'POST', body });
    toast(L('Discord salvato ✓', 'Discord saved ✓', 'Discord guardado ✓')); caricaDiscord();
  }));
  const bp = document.getElementById('btn-dc-prova');
  if (bp) bp.addEventListener('click', () => conErrore(async () => { await api('/api/discord/prova', { method: 'POST', body: {} }); toast(L('Messaggio di prova inviato ✓', 'Test message sent ✓', 'Mensaje de prueba enviado ✓')); }));
  const bs = document.getElementById('btn-dc-scollega');
  if (bs) bs.addEventListener('click', () => conErrore(async () => { await api('/api/discord/disconnect', { method: 'POST', body: {} }); toast(L('Discord scollegato.', 'Discord disconnected.', 'Discord desconectado.')); caricaDiscord(); }));
}

// "Accedi da Telegram" (Mini App + OIDC): collega il tuo Telegram al canale così
// puoi rientrare e gestire il bot dalla Mini App dentro Telegram.
async function caricaTgLogin() {
  const box = document.getElementById('box-tglogin');
  if (!box) return;
  // messaggi di ritorno dell'OIDC (?tgapp=...)
  const q = new URLSearchParams(location.search);
  if (q.get('tgapp') === 'collegato') toast(L('Telegram collegato!', 'Telegram linked!', '¡Telegram vinculado!'));
  else if (q.get('tgapp') === 'errore') toast(L('Collegamento Telegram non riuscito.', 'Telegram linking failed.', 'La vinculación de Telegram falló.'), 'errore');
  else if (q.get('tgapp') === 'noncollegato') toast(L('Questo Telegram non è collegato a nessun canale.', 'This Telegram isn’t linked to any channel.', 'Este Telegram no está vinculado a ningún canal.'), 'errore');
  if (q.get('tgapp')) { try { history.replaceState(null, '', location.pathname + '#notifiche'); } catch { /* niente */ } }

  let d;
  try { d = await api('/api/tgapp/login-stato'); } catch { box.hidden = true; return; }
  if (!d.attiva) { box.hidden = true; return; }   // Mini App non configurata dall'operatore
  box.hidden = false;
  const proprietario = stato?.ruolo !== 'moderatore';
  const linkBot = d.bot ? `https://t.me/${esc(d.bot)}` : '';

  const testa = `<h2>${_hIco(ICO.chat)}${L('Accedi e gestisci da Telegram', 'Log in & manage from Telegram', 'Accede y gestiona desde Telegram')}</h2>
    <p>${L('Collega il tuo Telegram al canale: potrai rientrare con un tocco e gestire il bot dalla', 'Link your Telegram to your channel: you’ll get back in with one tap and manage the bot from the', 'Vincula tu Telegram al canal: podrás volver a entrar con un toque y gestionar el bot desde la')} <strong class="primo-piano">Mini App</strong> ${L('dentro Telegram.', 'inside Telegram.', 'dentro de Telegram.')}</p>`;

  if (d.collegato) {
    box.innerHTML = testa + `<div class="riga-interruttore">
        <span class="badge verde">● ${L('Telegram collegato', 'Telegram linked', 'Telegram vinculado')}${d.username ? ' (@' + esc(d.username) + ')' : ''}</span>
        ${proprietario ? `<button class="btn secondario mini" id="tgl-scollega">${L('Scollega', 'Unlink', 'Desvincular')}</button>` : ''}
      </div>
      ${linkBot ? `<p class="suggerimento spazio-sopra">${L('Apri la Mini App:', 'Open the Mini App:', 'Abre la Mini App:')} <a href="${linkBot}" target="_blank" rel="noopener">@${esc(d.bot)}</a></p>` : ''}`;
    document.getElementById('tgl-scollega')?.addEventListener('click', () => conErrore(async () => {
      if (!confirm(L('Scollegare Telegram da questo canale?', 'Unlink Telegram from this channel?', '¿Desvincular Telegram de este canal?'))) return;
      await api('/api/tgapp/scollega', { method: 'POST', body: {} });
      toast(L('Telegram scollegato.', 'Telegram unlinked.', 'Telegram desvinculado.')); caricaTgLogin();
    }));
    return;
  }

  if (!proprietario) { box.innerHTML = testa + `<p class="suggerimento">${L('Solo il proprietario del canale può collegare Telegram.', 'Only the channel owner can link Telegram.', 'Solo el propietario del canal puede vincular Telegram.')}</p>`; return; }

  box.innerHTML = testa + `
    <ol class="passi">
      <li>${L('Apri la Mini App su Telegram', 'Open the Mini App on Telegram', 'Abre la Mini App en Telegram')}${linkBot ? ` (<a href="${linkBot}" target="_blank" rel="noopener">@${esc(d.bot)}</a>)` : ''} ${L('e copia il codice che ti mostra.', 'and copy the code it shows you.', 'y copia el código que te muestra.')}</li>
      <li>${L('Incolla qui il codice e premi «Collega».', 'Paste the code here and press «Link».', 'Pega aquí el código y pulsa «Vincular».')}</li>
    </ol>
    <div class="riga-flessibile">
      <input type="text" id="tgl-codice" class="campo-largo" placeholder="${L('codice (6 caratteri)', 'code (6 characters)', 'código (6 caracteres)')}" maxlength="6" autocomplete="off" style="text-transform:uppercase">
      <button class="btn" id="tgl-collega">${L('Collega', 'Link', 'Vincular')}</button>
    </div>
    ${d.oidc ? `<p class="suggerimento spazio-sopra">${L('In alternativa,', 'Alternatively,', 'Como alternativa,')} <a href="#" id="tgl-oidc">${L('collega con «Accedi con Telegram»', 'link with «Log in with Telegram»', 'vincula con «Acceder con Telegram»')}</a> ${L('dal browser.', 'from your browser.', 'desde el navegador.')}</p>` : ''}`;

  document.getElementById('tgl-collega')?.addEventListener('click', () => conErrore(async () => {
    const codice = (document.getElementById('tgl-codice')?.value || '').trim().toUpperCase();
    if (!codice) { toast(L('Inserisci il codice della Mini App.', 'Enter the Mini App code.', 'Introduce el código de la Mini App.'), 'errore'); return; }
    const r = await api('/api/tgapp/collega', { method: 'POST', body: { codice } });
    toast(L('Telegram collegato!', 'Telegram linked!', '¡Telegram vinculado!') + (r?.username ? ' (@' + r.username + ')' : ''));
    caricaTgLogin();
  }));
  document.getElementById('tgl-oidc')?.addEventListener('click', (e) => { e.preventDefault(); conErrore(async () => {
    const r = await api('/api/tgapp/oidc/start');
    if (r?.url) location.href = r.url;
  }); });
}

function collegaSalvaCred() {
  const b = document.getElementById('spotify-salva-cred');
  if (!b) return;
  b.addEventListener('click', () => conErrore(async () => {
    const clientId = (document.getElementById('spotify-cid')?.value || '').trim();
    const clientSecret = (document.getElementById('spotify-csec')?.value || '').trim();
    if (!clientId || !clientSecret) { toast(L('Inserisci Client ID e Client Secret.', 'Enter Client ID and Client Secret.', 'Introduce Client ID y Client Secret.'), 'errore'); return; }
    await api('/api/spotify/config', { method: 'POST', body: { clientId, clientSecret } });
    toast(L('Credenziali salvate! Ora connetti Spotify.', 'Credentials saved! Now connect Spotify.', '¡Credenciales guardadas! Ahora conecta Spotify.'));
    caricaSpotify();
  }));
}

// --- scheda Sondaggi & Predizioni ---------------------------------------

function pannelloSondaggi() {
  const campo = (cls, ph) => `<input type="text" class="${cls}" placeholder="${ph}">`;
  return pannello('sondaggi', `
    <div class="carta">
      <h2>${_hIco(ICO.sondaggi)}${L('Sondaggi', 'Polls', 'Encuestas')}</h2>
      <p>${L('Lancia un sondaggio Twitch: gli spettatori votano dall\'app, il risultato appare sul canale.', 'Launch a Twitch poll: viewers vote from the app, the result shows on the channel.', 'Lanza una encuesta de Twitch: los espectadores votan desde la app, el resultado aparece en el canal.')}</p>
      <div id="sondaggio-attivo"></div>
      <label class="campo">${L('Domanda', 'Question', 'Pregunta')}</label>
      <input type="text" id="poll-titolo" placeholder="${L('es. Che gioco stasera?', 'e.g. Which game tonight?', 'p. ej. ¿Qué juego esta noche?')}">
      <label class="campo spazio-sopra">${L('Opzioni (min 2, max 5)', 'Options (min 2, max 5)', 'Opciones (mín. 2, máx. 5)')}</label>
      <div class="griglia-campi">
        ${campo('poll-opt', L('Opzione 1', 'Option 1', 'Opción 1'))}${campo('poll-opt', L('Opzione 2', 'Option 2', 'Opción 2'))}${campo('poll-opt', L('Opzione 3 (facolt.)', 'Option 3 (opt.)', 'Opción 3 (opc.)'))}${campo('poll-opt', L('Opzione 4 (facolt.)', 'Option 4 (opt.)', 'Opción 4 (opc.)'))}
      </div>
      <label class="campo spazio-sopra">${L('Durata (secondi)', 'Duration (seconds)', 'Duración (segundos)')}</label>
      <input type="number" id="poll-durata" min="15" max="1800" value="120">
      <button class="btn spazio-sopra" id="poll-crea">${L('Lancia sondaggio', 'Launch poll', 'Lanzar encuesta')}</button>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.predizioni)}${L('Predizioni', 'Predictions', 'Predicciones')}</h2>
      <p>${L('Gli spettatori scommettono i punti canale sull\'esito. Decidi tu chi vince a fine gioco.', 'Viewers bet channel points on the outcome. You decide who wins at the end.', 'Los espectadores apuestan puntos de canal al resultado. Tú decides quién gana al final.')}</p>
      <div id="predizione-attiva"></div>
      <label class="campo">${L('Titolo', 'Title', 'Título')}</label>
      <input type="text" id="pred-titolo" placeholder="${L('es. Vinco questa partita?', 'e.g. Will I win this match?', 'p. ej. ¿Gano esta partida?')}">
      <label class="campo spazio-sopra">${L('Esiti (min 2, max 10)', 'Outcomes (min 2, max 10)', 'Resultados (mín. 2, máx. 10)')}</label>
      <div class="griglia-campi">
        ${campo('pred-esito', L('Esito 1 (es. Sì)', 'Outcome 1 (e.g. Yes)', 'Resultado 1 (p. ej. Sí)'))}${campo('pred-esito', L('Esito 2 (es. No)', 'Outcome 2 (e.g. No)', 'Resultado 2 (p. ej. No)'))}${campo('pred-esito', L('Esito 3 (facolt.)', 'Outcome 3 (opt.)', 'Resultado 3 (opc.)'))}${campo('pred-esito', L('Esito 4 (facolt.)', 'Outcome 4 (opt.)', 'Resultado 4 (opc.)'))}
      </div>
      <label class="campo spazio-sopra">${L('Finestra puntate (secondi)', 'Betting window (seconds)', 'Ventana de apuestas (segundos)')}</label>
      <input type="number" id="pred-finestra" min="30" max="1800" value="120">
      <button class="btn spazio-sopra" id="pred-crea">${L('Apri predizione', 'Open prediction', 'Abrir predicción')}</button>
    </div>`);
}

async function caricaSondaggi() {
  // wiring dei bottoni "crea" una volta sola
  const bp = document.getElementById('poll-crea');
  if (bp && !bp.dataset.wired) {
    bp.dataset.wired = '1';
    bp.addEventListener('click', () => conErrore(async () => {
      const titolo = (document.getElementById('poll-titolo').value || '').trim();
      const opzioni = [...document.querySelectorAll('.poll-opt')].map((i) => i.value.trim()).filter(Boolean);
      const durata = Number(document.getElementById('poll-durata').value) || 120;
      if (!titolo || opzioni.length < 2) { toast(L('Serve una domanda e almeno 2 opzioni.', 'You need a question and at least 2 options.', 'Hace falta una pregunta y al menos 2 opciones.'), 'errore'); return; }
      const r = await api('/api/sondaggi/crea', { method: 'POST', body: { titolo, opzioni, durata } });
      if (r?.poll) { toast(L('Sondaggio lanciato', 'Poll launched', 'Encuesta lanzada')); document.getElementById('poll-titolo').value = ''; document.querySelectorAll('.poll-opt').forEach((i) => (i.value = '')); caricaSondaggi(); }
    }));
  }
  const br = document.getElementById('pred-crea');
  if (br && !br.dataset.wired) {
    br.dataset.wired = '1';
    br.addEventListener('click', () => conErrore(async () => {
      const titolo = (document.getElementById('pred-titolo').value || '').trim();
      const esiti = [...document.querySelectorAll('.pred-esito')].map((i) => i.value.trim()).filter(Boolean);
      const finestra = Number(document.getElementById('pred-finestra').value) || 120;
      if (!titolo || esiti.length < 2) { toast(L('Serve un titolo e almeno 2 esiti.', 'You need a title and at least 2 outcomes.', 'Hace falta un título y al menos 2 resultados.'), 'errore'); return; }
      const r = await api('/api/predizioni/crea', { method: 'POST', body: { titolo, esiti, finestra } });
      if (r?.pred) { toast(L('Predizione aperta', 'Prediction opened', 'Predicción abierta')); document.getElementById('pred-titolo').value = ''; document.querySelectorAll('.pred-esito').forEach((i) => (i.value = '')); caricaSondaggi(); }
    }));
  }
  // stato attivo (poll + pred)
  const wrapP = document.getElementById('sondaggio-attivo');
  const wrapR = document.getElementById('predizione-attiva');
  let d;
  try { d = await api('/api/sondaggi/stato'); } catch { return; }
  if (wrapP) {
    if (d.poll) {
      wrapP.innerHTML = `<div class="riquadro-info"><p>${L('Sondaggio in corso:', 'Poll in progress:', 'Encuesta en curso:')} <strong>${esc(d.poll.titolo)}</strong></p>
        <button class="btn secondario spazio-sopra" id="poll-chiudi">${L('Chiudi ora', 'Close now', 'Cerrar ahora')}</button></div>`;
      document.getElementById('poll-chiudi').addEventListener('click', () => conErrore(async () => { await api('/api/sondaggi/chiudi', { method: 'POST', body: {} }); toast(L('Sondaggio chiuso.', 'Poll closed.', 'Encuesta cerrada.')); caricaSondaggi(); }));
    } else wrapP.innerHTML = '';
  }
  if (wrapR) {
    if (d.pred) {
      wrapR.innerHTML = `<div class="riquadro-info"><p>${L('Predizione in corso:', 'Prediction in progress:', 'Predicción en curso:')} <strong>${esc(d.pred.titolo)}</strong></p>
        <p class="spazio-sopra">${L('Fai vincere:', 'Make it win:', 'Haz ganar a:')}</p>
        <div class="chip-vars">${(d.pred.esiti || []).map((o) => `<button type="button" class="btn secondario mini" data-vince="${esc(o.id)}">${esc(o.titolo)}</button>`).join('')}</div>
        <button class="btn pericolo spazio-sopra" id="pred-annulla">${L('Annulla e rimborsa', 'Cancel and refund', 'Cancelar y reembolsar')}</button></div>`;
      wrapR.querySelectorAll('[data-vince]').forEach((b) => b.addEventListener('click', () => conErrore(async () => { await api('/api/predizioni/risolvi', { method: 'POST', body: { esitoId: b.dataset.vince } }); toast(L('Predizione risolta', 'Prediction resolved', 'Predicción resuelta')); caricaSondaggi(); })));
      document.getElementById('pred-annulla').addEventListener('click', () => conErrore(async () => { await api('/api/predizioni/annulla', { method: 'POST', body: {} }); toast(L('Predizione annullata.', 'Prediction cancelled.', 'Predicción cancelada.')); caricaSondaggi(); }));
    } else wrapR.innerHTML = '';
  }
}

// --- scheda Giveaway ----------------------------------------------------

function pannelloGiveaway() {
  return pannello('giveaway', `
    <div class="carta">
      <h2>${_hIco(ICO.giveaway)}Giveaway</h2>
      <p>${L('Apri un\'estrazione a premi: la community entra con <code>!join</code> in chat e tu estrai il vincitore da qui.', 'Open a prize giveaway: the community joins with <code>!join</code> in chat and you draw the winner from here.', 'Abre un sorteo de premios: la comunidad entra con <code>!join</code> en el chat y tú sacas al ganador desde aquí.')}</p>
      <div id="giveaway-stato" class="spazio-sopra"><p>${L('Carico…', 'Loading…', 'Cargando…')}</p></div>
      <div id="giveaway-apri">
        <label class="campo">${L('Premio in palio', 'Prize', 'Premio en juego')}</label>
        <input type="text" id="gw-premio" placeholder="${L('es. una gift card, un gioco Steam…', 'e.g. a gift card, a Steam game…', 'p. ej. una gift card, un juego de Steam…')}">
        <div class="riga-check spazio-sopra">
          <input type="checkbox" id="gw-sub">
          <label>${L('Riservato agli abbonati (sub)', 'Subscribers only (subs)', 'Solo para suscriptores (subs)')}</label>
        </div>
        <button class="btn spazio-sopra" id="gw-apri">${L('Apri il giveaway', 'Open the giveaway', 'Abrir el sorteo')}</button>
      </div>
    </div>`);
}

async function caricaGiveaway() {
  const stBox = document.getElementById('giveaway-stato');
  const apriBox = document.getElementById('giveaway-apri');
  if (!stBox) return;
  const ba = document.getElementById('gw-apri');
  if (ba && !ba.dataset.wired) {
    ba.dataset.wired = '1';
    ba.addEventListener('click', () => conErrore(async () => {
      const premio = (document.getElementById('gw-premio').value || '').trim();
      const soloSub = !!document.getElementById('gw-sub').checked;
      const r = await api('/api/giveaway/apri', { method: 'POST', body: { premio, soloSub } });
      if (r?.ok) { toast(L('Giveaway aperto!', 'Giveaway opened!', '¡Sorteo abierto!')); document.getElementById('gw-premio').value = ''; caricaGiveaway(); }
    }));
  }
  let d;
  try { d = await api('/api/giveaway/stato'); } catch { stBox.innerHTML = `<p>${L('Impossibile leggere lo stato.', 'Couldn’t read the status.', 'No se pudo leer el estado.')}</p>`; return; }
  if (d.aperto) {
    if (apriBox) apriBox.hidden = true;
    stBox.innerHTML = `<div class="riquadro-info">
      <p>${L('Giveaway in corso:', 'Giveaway in progress:', 'Sorteo en curso:')} <strong>${esc(d.premio)}</strong>${d.soloSub ? ` <span class="badge">${L('solo sub', 'subs only', 'solo subs')}</span>` : ''}</p>
      <p class="spazio-sopra"><strong>${d.partecipanti}</strong> ${d.partecipanti === 1 ? L('partecipante', 'participant', 'participante') : L('partecipanti', 'participants', 'participantes')} — ${L('entrano con', 'they join with', 'entran con')} <code>!join</code></p>
      <div class="spazio-sopra">
        <button class="btn" id="gw-estrai">${L('Estrai un vincitore', 'Draw a winner', 'Sacar un ganador')}</button>
        <button class="btn pericolo" id="gw-annulla">${L('Annulla', 'Cancel', 'Cancelar')}</button>
      </div>
      <div id="gw-vincitore" class="spazio-sopra"></div>
    </div>`;
    document.getElementById('gw-estrai').addEventListener('click', () => conErrore(async () => {
      const r = await api('/api/giveaway/estrai', { method: 'POST', body: {} });
      const v = document.getElementById('gw-vincitore');
      if (r?.vincitore) { if (v) v.innerHTML = `<p class="ok-riga">${L('Ha vinto:', 'Winner:', 'Ganó:')} <strong>${esc(r.vincitore)}</strong>!</p>`; }
      else if (v) v.innerHTML = `<p class="warn-riga">${L('Nessun partecipante ancora.', 'No participants yet.', 'Aún no hay participantes.')}</p>`;
      caricaGiveaway();
    }));
    document.getElementById('gw-annulla').addEventListener('click', () => conErrore(async () => { await api('/api/giveaway/annulla', { method: 'POST', body: {} }); toast(L('Giveaway annullato.', 'Giveaway cancelled.', 'Sorteo cancelado.')); caricaGiveaway(); }));
  } else {
    if (apriBox) apriBox.hidden = false;
    stBox.innerHTML = `<p>${L('Nessun giveaway in corso.', 'No giveaway in progress.', 'No hay ningún sorteo en curso.')}</p>`;
  }
}

// --- scheda Penitenze ---------------------------------------------------

function pannelloPenitenze() {
  const p = impostazioni().penitenze || {};
  const src = ['lista', 'ia'].includes(p.penitenzeModo) ? p.penitenzeModo : 'lista';
  const optS = (v, t) => `<option value="${v}"${src === v ? ' selected' : ''}>${t}</option>`;
  const ov = p.overlay || {};
  const pos = ov.posizione || 'alto-destra';
  const optP = (v, t) => `<option value="${v}"${pos === v ? ' selected' : ''}>${t}</option>`;
  const fuzzy = Number(p.fuzzy) || 80;
  return pannello('penitenze', `
    <div class="carta">
      <h2>${_hIco(ICO.penitenza)}${L('Penitenze a punti canale', 'Channel-point forfeits', 'Penitencias con puntos de canal')}</h2>
      <p>${L('Uno spettatore riscatta un premio e sceglie una', 'A viewer redeems a reward and picks a', 'Un espectador canjea una recompensa y elige una')} <strong>${L('parola', 'word', 'palabra')}</strong>. ${L('Per qualche minuto il bot', 'For a few minutes the bot', 'Durante unos minutos el bot')} <strong>${L('ti ascolta', 'listens to you', 'te escucha')}</strong>
      ${L('e tiene un', 'and keeps a', 'y lleva un')} <strong>${L('contatore', 'counter', 'contador')}</strong> ${L('(con «+1» rossi a schermo). Alla fine del tempo, se sei stato beccato, parte <strong>una penitenza</strong>', '(with red «+1»s on screen). When the time is up, if you slipped up, <strong>a forfeit</strong> starts', '(con «+1» rojos en pantalla). Al acabar el tiempo, si te pillaron, empieza <strong>una penitencia</strong>')}</p>
      <div class="riquadro-info spazio-sopra">
        <strong>${L('Due modi', 'Two modes', 'Dos modos')}</strong>, ${L('ognuno col suo premio a punti canale:', 'each with its own channel-point reward:', 'cada uno con su recompensa de puntos de canal:')}
        <ul class="lista-punti">
          <li><strong>${L('Vieta la parola', 'Ban the word', 'Prohíbe la palabra')}</strong> — ${L('non devi dirla: ogni volta che la dici,', 'you must not say it: every time you do,', 'no debes decirla: cada vez que la dices,')} <span class="pen-inline-num">+1</span>.</li>
          <li><strong>${L('Usa solo la parola', 'Use only the word', 'Usa solo la palabra')}</strong> — ${L('puoi dire', 'you can say', 'puedes decir')} <em>${L('solo', 'only', 'solo')}</em> ${L('quella: ogni frase con un\'altra parola,', 'that: every sentence with another word,', 'esa: cada frase con otra palabra,')} <span class="pen-inline-num">+1</span>.</li>
        </ul>
      </div>
      <p class="suggerimento">${L('Serve il <strong>riconoscimento vocale</strong> attivo (scheda <em>Comandi a voce</em>) e il permesso <strong>Punti canale</strong>.', 'Requires <strong>voice recognition</strong> active (<em>Voice commands</em> tab) and the <strong>Channel Points</strong> permission.', 'Necesita el <strong>reconocimiento de voz</strong> activo (pestaña <em>Comandos por voz</em>) y el permiso <strong>Puntos de canal</strong>.')}</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore"><input type="checkbox" id="pen-attivo" ${p.attivo ? 'checked' : ''}><span class="levetta"></span></label>
        <span class="etichetta-stato" id="pen-etichetta">${p.attivo ? L('Penitenze attive', 'Forfeits on', 'Penitencias activas') : L('Penitenze spente', 'Forfeits off', 'Penitencias apagadas')}</span>
      </div>
      <div class="griglia-campi spazio-sopra">
        <div>
          <label class="campo" for="pen-durata">${L('Durata (minuti)', 'Duration (minutes)', 'Duración (minutos)')}</label>
          <input type="number" id="pen-durata" min="1" max="15" value="${Number(p.durataMin) || 2}">
        </div>
        <div>
          <label class="campo" for="pen-src">${L('La penitenza…', 'The forfeit…', 'La penitencia…')}</label>
          <select id="pen-src">
            ${optS('lista', L('La scelgo dalla mia lista', 'I pick it from my list', 'La elijo de mi lista'))}
            ${optS('ia', L('La inventa l\'IA', 'The AI makes it up', 'La inventa la IA'))}
          </select>
        </div>
      </div>
      <label class="campo spazio-sopra" for="pen-penitenze">${L('La mia lista di penitenze (una per riga: ne parte una a caso)', 'My list of forfeits (one per line: a random one starts)', 'Mi lista de penitencias (una por línea: empieza una al azar)')}</label>
      <textarea id="pen-penitenze" placeholder="${L('10 flessioni&#10;canta la sigla&#10;parla in inglese per 1 minuto', '10 push-ups&#10;sing the theme song&#10;speak English for 1 minute', '10 flexiones&#10;canta la sintonía&#10;habla en inglés 1 minuto')}">${esc((p.penitenze || []).join('\n'))}</textarea>
      <p class="suggerimento">${L('Con «La inventa l\'IA» non serve scriverne: se il cervello non è disponibile, il bot ne pesca una pronta.', 'With «The AI makes it up» you don’t need to write any: if the brain isn’t available, the bot picks a ready-made one.', 'Con «La inventa la IA» no hace falta escribir ninguna: si el cerebro no está disponible, el bot elige una ya hecha.')}</p>
      <label class="campo spazio-sopra" for="pen-fuzzy">${L('Tolleranza al riconoscimento vocale:', 'Voice-recognition tolerance:', 'Tolerancia del reconocimiento de voz:')} <strong><span id="pen-fuzzy-val">${fuzzy}</span></strong></label>
      <input type="range" id="pen-fuzzy" min="50" max="100" step="5" value="${fuzzy}">
      <p class="suggerimento">${L('Più alta = più severo (conta solo parole quasi identiche). Più bassa = perdona di più gli errori di trascrizione.', 'Higher = stricter (counts only near-identical words). Lower = forgives transcription errors more.', 'Más alta = más estricto (cuenta solo palabras casi idénticas). Más baja = perdona más los errores de transcripción.')}</p>
      <label class="campo spazio-sopra" for="pen-effetto">${L('Suono/effetto quando scatta la penitenza (facoltativo)', 'Sound/effect when the forfeit triggers (optional)', 'Sonido/efecto cuando salta la penitencia (opcional)')}</label>
      <div class="riga-flessibile">
        <select id="pen-effetto" class="campo-largo"><option value="">${L('— niente —', '— none —', '— nada —')}</option></select>
        <button type="button" class="btn secondario mini" id="pen-effetto-prova" title="${L('Prova', 'Test', 'Probar')}">▶</button>
      </div>
      <p class="suggerimento">${L('Scegli un suono pronto o un tuo effetto (audio/immagine/video). Ne carichi altri dalla scheda «Effetti & suoni».', 'Pick a ready-made sound or one of your effects (audio/image/video). Upload more from the «Effects & sounds» tab.', 'Elige un sonido listo o uno de tus efectos (audio/imagen/vídeo). Sube más desde la pestaña «Efectos y sonidos».')}</p>
      <p class="spazio-sopra"><button class="btn" id="pen-salva">${L('Salva', 'Save', 'Guardar')}</button></p>
    </div>

    <div class="carta">
      <h3>${_hIco(ICO.monitor)}${L('Contatore a schermo (overlay)', 'On-screen counter (overlay)', 'Contador en pantalla (overlay)')}</h3>
      <p>${L('Il «+1» e il contatore compaiono nell\'<strong>overlay per OBS</strong> (lo stesso degli effetti, scheda <em>Effetti &amp; suoni</em>).', 'The «+1» and the counter appear in the <strong>OBS overlay</strong> (the same as effects, <em>Effects &amp; sounds</em> tab).', 'El «+1» y el contador aparecen en el <strong>overlay para OBS</strong> (el mismo de los efectos, pestaña <em>Efectos y sonidos</em>).')}</p>
      <div class="griglia-campi spazio-sopra">
        <div>
          <label class="campo" for="pen-ov-pos">${L('Posizione', 'Position', 'Posición')}</label>
          <select id="pen-ov-pos">
            ${optP('alto-sinistra', L('In alto a sinistra', 'Top left', 'Arriba a la izquierda'))}
            ${optP('alto-centro', L('In alto al centro', 'Top center', 'Arriba al centro'))}
            ${optP('alto-destra', L('In alto a destra', 'Top right', 'Arriba a la derecha'))}
            ${optP('basso-sinistra', L('In basso a sinistra', 'Bottom left', 'Abajo a la izquierda'))}
            ${optP('basso-centro', L('In basso al centro', 'Bottom center', 'Abajo al centro'))}
            ${optP('basso-destra', L('In basso a destra', 'Bottom right', 'Abajo a la derecha'))}
          </select>
        </div>
        <div>
          <label class="campo" for="pen-ov-col">${L('Colore', 'Color', 'Color')}</label>
          <input type="color" id="pen-ov-col" value="${/^#[0-9a-fA-F]{6}$/.test(ov.colore || '') ? ov.colore : '#ff2d2d'}">
        </div>
      </div>
      <p class="spazio-sopra"><button class="btn secondario" id="pen-ov-prova">${L('Prova il contatore nell\'overlay', 'Test the counter in the overlay', 'Prueba el contador en el overlay')}</button></p>
      <p class="suggerimento">${L('Apri l\'overlay in OBS (o nel browser) e premi «Prova»: vedrai partire un +1 di esempio.', 'Open the overlay in OBS (or the browser) and press «Test»: you’ll see a sample +1 fire.', 'Abre el overlay en OBS (o en el navegador) y pulsa «Probar»: verás saltar un +1 de ejemplo.')}</p>
    </div>

    <div class="carta">
      <h3>${_hIco(ICO.chiave)}${L('I premi a punti canale', 'The channel-point rewards', 'Las recompensas de puntos de canal')}</h3>
      <p>${L('Servono premi <strong>con richiesta di testo</strong> (così lo spettatore scrive la parola). Scegline uno per modo, o creali qui.', 'You need rewards <strong>that require text</strong> (so the viewer types the word). Pick one per mode, or create them here.', 'Hacen falta recompensas <strong>que requieran texto</strong> (así el espectador escribe la palabra). Elige una por modo, o créalas aquí.')}</p>
      <input type="hidden" id="pen-premio-vieta" value="${esc(p.premioVieta || '')}">
      <input type="hidden" id="pen-premio-solo" value="${esc(p.premioSolo || '')}">
      <h4 class="spazio-sopra">${_hIco(ICO.divieto)}${L('Vieta la parola', 'Ban the word', 'Prohíbe la palabra')} <span class="tenue">— ${L('non devi dirla', 'you must not say it', 'no debes decirla')}</span></h4>
      <div id="pen-box-vieta"><p class="suggerimento">${L('Carico i tuoi premi…', 'Loading your rewards…', 'Cargando tus recompensas…')}</p></div>
      <h4 class="spazio-sopra">${_hIco(ICO.target)}${L('Usa solo la parola', 'Use only the word', 'Usa solo la palabra')} <span class="tenue">— ${L('puoi dire solo quella', 'you can only say that', 'solo puedes decir esa')}</span></h4>
      <div id="pen-box-solo"><p class="suggerimento">${L('Carico i tuoi premi…', 'Loading your rewards…', 'Cargando tus recompensas…')}</p></div>
    </div>`);
}

async function salvaPenitenze(silenzioso) {
  const penitenze = {
    attivo: !!document.getElementById('pen-attivo')?.checked,
    premioVieta: (document.getElementById('pen-premio-vieta')?.value || '').trim(),
    premioSolo: (document.getElementById('pen-premio-solo')?.value || '').trim(),
    durataMin: Number(document.getElementById('pen-durata')?.value) || 2,
    penitenzeModo: document.getElementById('pen-src')?.value || 'lista',
    penitenze: righe(document.getElementById('pen-penitenze')?.value || ''),
    effetto: (document.getElementById('pen-effetto')?.value || '').trim(),
    fuzzy: Number(document.getElementById('pen-fuzzy')?.value) || 80,
    overlay: {
      posizione: document.getElementById('pen-ov-pos')?.value || 'alto-destra',
      colore: document.getElementById('pen-ov-col')?.value || '#ff2d2d',
    },
  };
  await salvaImpostazioni({ penitenze }, silenzioso ? null : L('Penitenze salvate', 'Forfeits saved', 'Penitencias guardadas'));
}

// Popola il menu «suono/effetto» della penitenza: suoni pronti (preset) + effetti
// caricati dallo streamer. Valore salvato: "preset:<id>" o "effetto:<comando>".
// Retrocompatibile col vecchio formato (comando "nudo" → trattato come effetto).
async function _penMontaEffetto() {
  const sel = document.getElementById('pen-effetto');
  if (!sel) return;
  let eff = {};
  try { eff = (await api('/api/streamer/effetti')) || {}; } catch { eff = {}; }
  const presets = (window.SUONI_PRESET && window.SUONI_PRESET.lista) || [];
  const audio = (eff.effetti || []).filter((e) => e.tipo === 'audio');
  const visivi = (eff.effetti || []).filter((e) => e.tipo === 'immagine' || e.tipo === 'video');
  let cur = String((impostazioni().penitenze || {}).effetto || '');
  if (cur && !/^(effetto|preset):/.test(cur)) cur = 'effetto:' + cur;   // retrocompat comando nudo
  const opt = (v, t) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(t)}</option>`;
  sel.innerHTML = opt('', L('— niente —', '— none —', '— nada —'))
    + `<optgroup label="${L('Suoni pronti', 'Ready-made sounds', 'Sonidos listos')}">${presets.map((s) => opt('preset:' + s.id, s.nome)).join('')}</optgroup>`
    + (audio.length ? `<optgroup label="${L('I miei suoni caricati', 'My uploaded sounds', 'Mis sonidos subidos')}">${audio.map((e) => opt('effetto:' + e.comando, '!' + e.comando)).join('')}</optgroup>` : '')
    + (visivi.length ? `<optgroup label="${L('Immagini / Video', 'Images / Videos', 'Imágenes / Vídeos')}">${visivi.map((e) => opt('effetto:' + e.comando, '!' + e.comando + ' (' + e.tipo + ')')).join('')}</optgroup>` : '');
  // valore salvato ma non più tra le opzioni (es. effetto cancellato): lo tengo visibile
  if (cur && sel.value !== cur) sel.insertAdjacentHTML('beforeend', `<option value="${esc(cur)}" selected>${esc(cur.replace(/^effetto:/, '!').replace(/^preset:/, ''))}</option>`);
  // Prova: preset → suona lato client; effetto → invia all'overlay in OBS
  const btn = document.getElementById('pen-effetto-prova');
  if (btn) btn.onclick = () => {
    const v = sel.value;
    if (!v) { toast(L('Scegli prima un suono/effetto.', 'Choose a sound/effect first.', 'Elige antes un sonido/efecto.')); return; }
    if (v.startsWith('preset:') && window.SUONI_PRESET) window.SUONI_PRESET.suona(v.slice(7), 100);
    else conErrore(async () => {
      await api('/api/streamer/effetti/test', { method: 'POST', body: { comando: v.startsWith('effetto:') ? v.slice(8) : v } });
      toast(L('Inviato all\'overlay ▶', 'Sent to the overlay ▶', 'Enviado al overlay ▶'));
    });
  };
}

async function caricaPenitenze() {
  document.getElementById('pen-attivo')?.addEventListener('change', (ev) => {
    const et = document.getElementById('pen-etichetta');
    if (et) et.textContent = ev.target.checked ? L('Penitenze attive', 'Forfeits on', 'Penitencias activas') : L('Penitenze spente', 'Forfeits off', 'Penitencias apagadas');
  });
  document.getElementById('pen-salva')?.addEventListener('click', () => conErrore(() => salvaPenitenze()));
  const rng = document.getElementById('pen-fuzzy');
  const val = document.getElementById('pen-fuzzy-val');
  rng?.addEventListener('input', () => { if (val) val.textContent = rng.value; });
  document.getElementById('pen-ov-pos')?.addEventListener('change', () => conErrore(async () => { await salvaPenitenze(true); toast(L('Overlay salvato ✓', 'Overlay saved ✓', 'Overlay guardado ✓')); }));
  document.getElementById('pen-ov-col')?.addEventListener('change', () => conErrore(() => salvaPenitenze(true)));
  document.getElementById('pen-ov-prova')?.addEventListener('click', () => conErrore(async () => {
    await salvaPenitenze(true);
    await api('/api/penitenze/prova', { method: 'POST', body: {} });
    toast(L('Inviato all\'overlay ▶', 'Sent to the overlay ▶', 'Enviado al overlay ▶'));
  }));
  await _penMontaEffetto();   // menu «suono/effetto» (preset + effetti caricati)
  const boxV = document.getElementById('pen-box-vieta');
  const boxS = document.getElementById('pen-box-solo');
  if (!boxV || !boxS) return;
  let d;
  try { d = await api('/api/penitenze/premi'); } catch { boxV.innerHTML = boxS.innerHTML = `<p class="suggerimento">${L('Impossibile leggere i premi.', 'Couldn’t read the rewards.', 'No se pueden leer las recompensas.')}</p>`; return; }
  if (!d.permessoOk) {
    boxV.innerHTML = `<div class="riquadro-info">${L('Per i premi a punti canale serve il permesso: concedilo da <strong>Chat &amp; comandi → Effetti &amp; suoni</strong> (sezione Premi), poi torna qui.', 'Channel-point rewards need the permission: grant it from <strong>Chat &amp; commands → Effects &amp; sounds</strong> (Rewards section), then come back here.', 'Las recompensas de puntos de canal necesitan el permiso: concédelo desde <strong>Chat y comandos → Efectos y sonidos</strong> (sección Recompensas), luego vuelve aquí.')}</div>`;
    boxS.innerHTML = '';
    return;
  }
  // solo i premi CON richiesta di testo (lo spettatore scrive la parola)
  const eleggibili = (d.tutti || []).filter((r) => r.richiedeTesto);
  const esclusi = (d.tutti || []).length - eleggibili.length;
  const montaPicker = (box, { campo, hiddenId, attuale, nomeDefault }) => {
    const inp = document.getElementById(hiddenId);
    const cur = (inp?.value || attuale || '').trim();
    const selId = `${hiddenId}-sel`, creaId = `${hiddenId}-crea`, nomeId = `${hiddenId}-nome`, costoId = `${hiddenId}-costo`;
    const formCrea = `
      <details class="spazio-sopra"${eleggibili.length ? '' : ' open'}>
        <summary>${eleggibili.length ? L('Oppure crea un premio pronto all\'uso', 'Or create a ready-to-use reward', 'O crea una recompensa lista para usar') : L('Crea un premio pronto all\'uso', 'Create a ready-to-use reward', 'Crea una recompensa lista para usar')}</summary>
        <div class="griglia-campi spazio-sopra">
          <div><label class="campo">${L('Nome', 'Name', 'Nombre')}</label><input type="text" id="${nomeId}" value="${esc(nomeDefault)}"></div>
          <div><label class="campo">${L('Costo (punti canale)', 'Cost (channel points)', 'Coste (puntos de canal)')}</label><input type="number" id="${costoId}" min="1" value="500"></div>
        </div>
        <button class="btn secondario spazio-sopra" id="${creaId}">${L('Crea il premio su Twitch', 'Create the reward on Twitch', 'Crea la recompensa en Twitch')}</button>
      </details>`;
    if (!eleggibili.length) {
      box.innerHTML = `<div class="riquadro-info">${L('Non hai premi con la <strong>richiesta di testo</strong>', 'You have no rewards <strong>that require text</strong>', 'No tienes recompensas <strong>que requieran texto</strong>')}${esclusi ? ` (${esclusi} ${L('non ', 'not ', 'no ')}${esclusi === 1 ? L('adatto', 'suitable', 'apta') : L('adatti', 'suitable', 'aptas')})` : ''}. ${L('Creane uno qui.', 'Create one here.', 'Crea una aquí.')}</div>${formCrea}`;
    } else {
      const nessuno = `<option value=""${cur ? '' : ' selected'}>${L('— nessuno —', '— none —', '— ninguno —')}</option>`;
      box.innerHTML = `
        <select id="${selId}">
          ${nessuno}${eleggibili.map((r) => `<option value="${esc(r.title)}"${r.title === cur ? ' selected' : ''}>${esc(r.title)} — ${r.cost} ${L('punti', 'points', 'puntos')}</option>`).join('')}
        </select>${formCrea}`;
      const sel = document.getElementById(selId);
      if (cur && !eleggibili.some((r) => r.title === cur)) sel.value = '';
      if (inp) inp.value = sel.value;
      sel.addEventListener('change', () => { if (inp) inp.value = sel.value; conErrore(async () => { await salvaPenitenze(true); toast(L('Premio impostato ✓', 'Reward set ✓', 'Recompensa fijada ✓')); }); });
    }
    const bc = document.getElementById(creaId);
    if (bc) bc.addEventListener('click', () => conErrore(async () => {
      const titolo = (document.getElementById(nomeId)?.value || nomeDefault).trim();
      const costo = Number(document.getElementById(costoId)?.value) || 500;
      const r = await api('/api/penitenze/premio', { method: 'POST', body: { campo, titolo, costo } });
      if (r?.reward) { if (inp) inp.value = r.reward.title; toast(L('Premio creato su Twitch!', 'Reward created on Twitch!', '¡Recompensa creada en Twitch!')); caricaPenitenze(); }
    }));
  };
  montaPicker(boxV, { campo: 'premioVieta', hiddenId: 'pen-premio-vieta', attuale: d.premioVieta, nomeDefault: L('Vietami una parola', 'Ban me a word', 'Prohíbeme una palabra') });
  montaPicker(boxS, { campo: 'premioSolo', hiddenId: 'pen-premio-solo', attuale: d.premioSolo, nomeDefault: L('Dì solo questa parola', 'Say only this word', 'Di solo esta palabra') });
}

// --- scheda Alert & Chat ------------------------------------------------

// opzioni <option> dei suoni preset (dalla libreria condivisa presets.js)
function opzioniSuono(sel) {
  const lista = (window.SUONI_PRESET && window.SUONI_PRESET.lista) || [];
  return ['<option value="">— nessun suono —</option>']
    .concat(lista.map((s) => `<option value="${esc(s.id)}"${s.id === sel ? ' selected' : ''}>${esc(s.nome)}</option>`)).join('');
}
// font per-alert: '' = usa il font condiviso dello stile
function opzioniFont(sel) {
  const f = [['', '— come lo stile —'], ['sistema', 'Sistema'], ['rotondo', 'Rotondo'], ['condensato', 'Condensato'], ['mono', 'Mono'], ['serif', 'Serif'], ['manga', 'Manga']];
  return f.map(([v, n]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${n}</option>`).join('');
}
// Popola i menu Suono/Immagine-Video di ogni alert con la libreria Effetti &
// suoni (audio nei suoni; immagini/video nei media), oltre ai preset, e ripristina
// i valori salvati (che possono essere "effetto:<comando>").
function popolaMediaSuoniAlert(effetti, alertsCfg) {
  const a = alertsCfg || (impostazioni().alerts) || {};
  const audio = (effetti || []).filter((e) => e.tipo === 'audio');
  const visivi = (effetti || []).filter((e) => e.tipo === 'immagine' || e.tipo === 'video');
  const gruppoAudio = audio.length ? `<optgroup label="I miei suoni caricati">${audio.map((e) => `<option value="effetto:${esc(e.comando)}">!${esc(e.comando)}</option>`).join('')}</optgroup>` : '';
  const optMedia = '<option value="">— niente —</option>' + visivi.map((e) => `<option value="effetto:${esc(e.comando)}">!${esc(e.comando)} (${e.tipo})</option>`).join('');
  document.querySelectorAll('.alert-blocco[data-alert]').forEach((b) => {
    const c = a[b.dataset.alert] || {};
    const selS = b.querySelector('.al-suono');
    if (selS) { selS.innerHTML = opzioniSuono('') + gruppoAudio; selS.value = c.suono || ''; }
    const selM = b.querySelector('.al-media');
    if (selM) { selM.innerHTML = optMedia; selM.value = c.media || ''; }
  });
}

const ALERT_TIPI = () => [
  { key: 'follow', nome: L('Nuovo follower', 'New follower', 'Nuevo seguidor'), ph: L('{user} ha seguito il canale!', '{user} followed the channel!', '¡{user} ha seguido el canal!'), vars: '{user}', acc: '#9146ff' },
  { key: 'sub', nome: L('Abbonamento', 'Subscription', 'Suscripción'), ph: L('{user} si è abbonato! ({mesi} mesi)', '{user} subscribed! ({mesi} months)', '¡{user} se ha suscrito! ({mesi} meses)'), vars: '{user}, {mesi}', acc: '#ffb020' },
  { key: 'cheer', nome: L('Bit (cheer)', 'Bits (cheer)', 'Bits (cheer)'), ph: L('{user} ha lanciato {bits} bit!', '{user} sent {bits} bits!', '¡{user} ha enviado {bits} bits!'), vars: '{user}, {bits}', acc: '#38d39f', soglia: { campo: 'minBits', label: L('Bit minimi', 'Minimum bits', 'Bits mínimos') } },
  { key: 'raid', nome: L('Raid', 'Raid', 'Raid'), ph: L('{user} è arrivato in raid con {viewers} spettatori!', '{user} raided with {viewers} viewers!', '¡{user} ha llegado en raid con {viewers} espectadores!'), vars: '{user}, {viewers}', acc: '#ff4d4d', soglia: { campo: 'minViewers', label: L('Spettatori minimi', 'Minimum viewers', 'Espectadores mínimos') } },
];

// opzioni comuni per i controlli di stile (funzioni: risolvono la lingua al render)
const FONT_OPTS = () => [['sistema', L('Sistema', 'System', 'Sistema')], ['rotondo', L('Arrotondato', 'Rounded', 'Redondeado')], ['condensato', L('Condensato', 'Condensed', 'Condensada')], ['mono', L('Monospazio', 'Monospace', 'Monoespaciada')], ['serif', L('Serif', 'Serif', 'Serif')], ['manga', L('Manga', 'Manga', 'Manga')]];
const ANIM_ALERT_OPTS = () => [['slide', L('Scivola', 'Slide', 'Deslizar')], ['pop', L('Pop', 'Pop', 'Pop')], ['zoom', L('Zoom', 'Zoom', 'Zoom')], ['fade', L('Dissolvenza', 'Fade', 'Fundido')], ['flip', L('Ribalta', 'Flip', 'Voltear')], ['bounce', L('Rimbalzo', 'Bounce', 'Rebote')]];
const ANIM_CHAT_OPTS = () => [['slide', L('Scivola', 'Slide', 'Deslizar')], ['fade', L('Dissolvenza', 'Fade', 'Fundido')], ['nessuna', L('Nessuna', 'None', 'Ninguna')]];
const DIM_OPTS = () => [['piccola', L('Piccola', 'Small', 'Pequeña')], ['media', L('Media', 'Medium', 'Mediana')], ['grande', L('Grande', 'Large', 'Grande')], ['enorme', L('Enorme', 'Huge', 'Enorme')]];
const DIM3_OPTS = () => [['piccola', L('Piccola', 'Small', 'Pequeña')], ['media', L('Media', 'Medium', 'Mediana')], ['grande', L('Grande', 'Large', 'Grande')]];
const POS4_OPTS = () => [['alto-sinistra', L('In alto a sx', 'Top left', 'Arriba izq.')], ['alto-destra', L('In alto a dx', 'Top right', 'Arriba der.')], ['basso-sinistra', L('In basso a sx', 'Bottom left', 'Abajo izq.')], ['basso-destra', L('In basso a dx', 'Bottom right', 'Abajo der.')]];

// mini-builder per i controlli (riducono la ripetizione)
const _hx = (v, d) => (/^#[0-9a-fA-F]{6}$/.test(v || '') ? v : d);
const cCol = (id, label, val) => `<div><label class="campo" for="${id}">${label}</label><input type="color" id="${id}" value="${_hx(val, '#000000')}"></div>`;
const cRng = (id, label, min, max, val, suf = '') => `<div><label class="campo" for="${id}">${label}: <strong><span id="${id}-v">${val}</span>${suf}</strong></label><input type="range" id="${id}" min="${min}" max="${max}" value="${val}"></div>`;
const cSel = (id, label, opts, val) => `<div><label class="campo" for="${id}">${label}</label><select id="${id}">${opts.map(([v, t]) => `<option value="${v}"${v === val ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
const cChk = (id, label, on) => `<label class="riga-check"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}> ${label}</label>`;

// template pronti: ogni look è pensato per RISPECCHIARE il proprio nome.
const TEMPLATE_BUILTIN = [
  // viola Twitch, scuro e morbido, bagliore soft: il classico.
  { nome: 'Viola classico', dati: { al: { animazione: 'slide', sfondo: '#12101c', opacita: 90, testo: '#ffffff', bordoRaggio: 18, bordoSpessore: 2, glow: true, font: 'sistema', dimTesto: 27 }, ch: { sfondo: '#12101c', opacita: 80, testo: '#efeaff', bordoRaggio: 12, font: 'sistema', dim: 'media' }, acc: '#9146ff' } },
  // insegna al neon: nero pieno, colore elettrico saturo, bordo sottile, bagliore forte, mono.
  { nome: 'Neon', dati: { al: { animazione: 'pop', sfondo: '#04010a', opacita: 62, testo: '#eafffb', bordoRaggio: 8, bordoSpessore: 2, glow: true, font: 'mono', dimTesto: 29 }, ch: { sfondo: '#04010a', opacita: 55, testo: '#d6fff7', bordoRaggio: 6, font: 'mono', dim: 'media' }, acc: '#00e5ff' } },
  // pulito e chiaro: fondo bianco, niente bordo/bagliore, angoli morbidi, accento tenue.
  { nome: 'Minimal chiaro', dati: { al: { animazione: 'fade', sfondo: '#f7f7fa', opacita: 95, testo: '#15171c', bordoRaggio: 16, bordoSpessore: 0, glow: false, font: 'sistema', dimTesto: 24 }, ch: { sfondo: '#ffffff', opacita: 90, testo: '#22242b', bordoRaggio: 12, font: 'sistema', dim: 'piccola' }, acc: '#2b2d36' } },
  // cabinato anni '80: mono squadrato, bordo spesso, giallo su nero, rosa acceso, rimbalzo.
  { nome: 'Retro arcade', dati: { al: { animazione: 'bounce', sfondo: '#0a0a14', opacita: 96, testo: '#ffe600', bordoRaggio: 2, bordoSpessore: 4, glow: true, font: 'mono', dimTesto: 28 }, ch: { sfondo: '#0a0a14', opacita: 90, testo: '#ffe600', bordoRaggio: 2, font: 'mono', dim: 'media' }, acc: '#ff2e88' } },
  // fumetto giapponese: bianco/nero netto, bordo nero spesso, rosso "manga", zoom d'impatto.
  { nome: 'Manga', dati: { al: { animazione: 'zoom', sfondo: '#ffffff', opacita: 98, testo: '#0b0b0b', bordoRaggio: 6, bordoSpessore: 4, glow: false, font: 'manga', dimTesto: 30 }, ch: { sfondo: '#0b0b0b', opacita: 88, testo: '#ffffff', bordoRaggio: 6, font: 'manga', dim: 'media' }, acc: '#e60012' } },
];

function bloccoAlert(t, a) {
  const c = a[t.key] || {};
  const acc = c.accento || c.colore || t.acc;
  const vol = c.volume != null ? c.volume : 100;
  const soglia = t.soglia ? `<div><label class="campo">${t.soglia.label}</label><input type="number" class="al-soglia" min="0" value="${Number(c[t.soglia.campo]) || 0}"></div>` : '';
  return `
    <div class="alert-blocco" data-alert="${t.key}">
      <div class="riga-interruttore">
        <label class="interruttore"><input type="checkbox" class="al-attivo" ${c.attivo ? 'checked' : ''}><span class="levetta"></span></label>
        <strong>${t.nome}</strong>
      </div>
      <label class="campo spazio-sopra">${L('Testo', 'Text', 'Texto')} <span class="tenue">— ${L('segnaposto', 'placeholders', 'marcadores')}: ${esc(t.vars)}</span></label>
      <input type="text" class="al-testo campo-largo" maxlength="200" placeholder="${esc(t.ph)}" value="${esc(c.testo || '')}">
      <div class="griglia-campi spazio-sopra">
        <div><label class="campo">${L('Colore', 'Color', 'Color')}</label><input type="color" class="al-colore" value="${_hx(acc, t.acc)}"></div>
        <div><label class="campo">${L('Volume', 'Volume', 'Volumen')}: <strong><span class="al-vol-v">${vol}</span>%</strong></label><input type="range" class="al-vol" min="0" max="100" value="${vol}"></div>
        <div><label class="campo">Font</label><select class="al-font">${opzioniFont(c.font || '')}</select></div>
        ${soglia}
      </div>
      <div class="al-media-wrap spazio-sopra">
        <div class="al-slot">
          <label class="campo">${_bIco(ICO.altoparlante)}${L('Suono', 'Sound', 'Sonido')}</label>
          <select class="al-suono">${opzioniSuono(c.suono || '')}</select>
          <div class="al-carica">
            <input type="file" class="al-up al-up-suono" accept="audio/*" data-slot="suono" hidden>
            <button type="button" class="btn secondario mini al-btn-up" data-slot="suono">${_bIco(ICO.carica)}${L('Carica un suono tuo', 'Upload your own sound', 'Sube un sonido tuyo')}</button>
            <span class="al-up-esito tenue"></span>
          </div>
        </div>
        <div class="al-slot">
          <label class="campo">${_bIco(ICO.immagine)}${L('Immagine o video', 'Image or video', 'Imagen o vídeo')}</label>
          <select class="al-media"><option value="">${L('— niente —', '— none —', '— nada —')}</option></select>
          <div class="al-carica">
            <input type="file" class="al-up al-up-media" accept="image/*,video/*" data-slot="media" hidden>
            <button type="button" class="btn secondario mini al-btn-up" data-slot="media">${_bIco(ICO.carica)}${L('Carica immagine/video tuo', 'Upload your own image/video', 'Sube tu imagen/vídeo')}</button>
            <span class="al-up-esito tenue"></span>
          </div>
        </div>
      </div>
      <p class="suggerimento"><strong>${L('Metti quello che vuoi:', 'Put whatever you want:', 'Pon lo que quieras:')}</strong> ${L('scegli dai tuoi effetti', 'choose from your effects', 'elige entre tus efectos')} <em>${L('oppure', 'or', 'o')}</em> ${L('carica un file al volo qui sopra. Suono e immagine/video', 'upload a file on the fly above. Sound and image/video', 'sube un archivo al vuelo arriba. Sonido e imagen/vídeo')} <strong>${L('partono insieme', 'play together', 'se reproducen juntos')}</strong> — ${L('così puoi avere, ad esempio, la tua GIF', 'so you can have, for example, your GIF', 'así puedes tener, por ejemplo, tu GIF')} <em>${L('con', 'with', 'con')}</em> ${L('il tuo suono.', 'your sound.', 'tu sonido.')}</p>
      <p class="spazio-sopra"><button type="button" class="btn secondario mini al-prova" data-kind="${t.key}">${L('Prova', 'Test', 'Probar')} ▶</button></p>
    </div>`;
}

function bloccoWidget(pref, w, titolo, kind) {
  const st = w.stile || {};
  return `
    <div class="alert-blocco" data-w="${pref}">
      <div class="riga-interruttore">
        <label class="interruttore"><input type="checkbox" id="${pref}-attivo" ${w.attivo ? 'checked' : ''}><span class="levetta"></span></label>
        <strong>${titolo}</strong>
      </div>
      <label class="campo spazio-sopra" for="${pref}-testo">${L('Testo', 'Text', 'Texto')} <span class="tenue">— {nome} = ${L('chi', 'who', 'quién')}</span></label>
      <input type="text" id="${pref}-testo" class="campo-largo" maxlength="80" value="${esc(w.testo)}">
      <div class="griglia-campi spazio-sopra">
        ${cSel(`${pref}-pos`, L('Posizione', 'Position', 'Posición'), POS4_OPTS(), w.posizione)}
        ${cSel(`${pref}-font`, 'Font', FONT_OPTS(), st.font)}
        ${cSel(`${pref}-dim`, L('Dimensione', 'Size', 'Tamaño'), DIM3_OPTS(), st.dim)}
      </div>
      <div class="griglia-campi spazio-sopra">
        ${cCol(`${pref}-bg`, L('Sfondo', 'Background', 'Fondo'), st.sfondo)}
        ${cRng(`${pref}-op`, L('Opacità', 'Opacity', 'Opacidad'), 0, 100, st.opacita, '%')}
        ${cCol(`${pref}-fg`, L('Testo', 'Text', 'Texto'), st.testo)}
        ${cCol(`${pref}-acc`, L('Nome', 'Name', 'Nombre'), st.accento)}
        ${cRng(`${pref}-radius`, L('Angoli', 'Corners', 'Esquinas'), 0, 30, st.bordoRaggio, 'px')}
      </div>
      <p class="spazio-sopra"><button type="button" class="btn secondario mini w-prova" data-kind="${kind}">${L('Prova', 'Test', 'Probar')} ▶</button></p>
    </div>`;
}

// Una riga della lista "Elementi (fonti) dell'overlay": icona, nome, «Modifica»
// (apre la sezione che lo personalizza) e l'interruttore mostra/nascondi.
// L'id dell'interruttore resta `mostra-<k>` così la logica di layout non cambia.
function ovlElemento(k, ico, nome, sez) {
  return `<div class="ovl-elem">
    <span class="oe-ico">${_bIco(ico)}</span>
    <span class="oe-nome">${esc(nome)}</span>
    <button type="button" class="oe-mod" data-apri-sez="${sez}">${L('Modifica', 'Edit', 'Editar')}</button>
    <label class="interruttore oe-sw" title="${L('Mostra', 'Show', 'Mostrar')} «${esc(nome)}» ${L('in questo overlay', 'in this overlay', 'en este overlay')}"><input type="checkbox" id="mostra-${k}" checked><span class="levetta"></span></label>
  </div>`;
}

function pannelloAlert() {
  const p = impostazioni();
  const a = p.alerts, st = a.stile, co = p.chatOverlay, cst = co.stile;
  const wf = p.overlayWidget.ultimoFollower, ws = p.overlayWidget.ultimoSub;
  const posAlertOpts = [['alto-centro', L('In alto al centro', 'Top center', 'Arriba centro')], ['centro', L('Al centro', 'Center', 'Al centro')], ['basso-centro', L('In basso al centro', 'Bottom center', 'Abajo centro')]];
  const userMode = (cst.username && cst.username !== 'twitch') ? 'fisso' : 'twitch';
  const lblPronti = L('Pronti', 'Ready-made', 'Listos'), lblMiei = L('I miei', 'Mine', 'Los míos');
  const opzTpl = `<optgroup label="${lblPronti}">${TEMPLATE_BUILTIN.map((t, i) => `<option value="b${i}">${esc(t.nome)}</option>`).join('')}</optgroup>`
    + (p.overlayTemplates.length ? `<optgroup label="${lblMiei}">${p.overlayTemplates.map((t, i) => `<option value="u${i}">${esc(t.nome)}</option>`).join('')}</optgroup>` : '');
  return pannello('alert', `
    <div class="carta">
      <h2>${_hIco(ICO.monitor)}${L('I miei overlay', 'My overlays', 'Mis overlays')}</h2>
      <p>${L('Puoi avere', 'You can have', 'Puedes tener')} <strong>${L('più overlay', 'multiple overlays', 'varios overlays')}</strong>, ${L('ognuno col suo', 'each with its own', 'cada uno con su')} <strong>${L('link OBS', 'OBS link', 'enlace OBS')}</strong> ${L('e il suo', 'and its own', 'y su propio')} <strong>${L('layout', 'layout', 'diseño')}</strong>
      (${L('cosa mostra e dove', 'what it shows and where', 'qué muestra y dónde')}). ${L('Es. un overlay "solo alert" in una scena e uno "solo chat" in un\'altra.', 'E.g. an "alerts only" overlay in one scene and a "chat only" one in another.', 'Ej. un overlay "solo alertas" en una escena y otro "solo chat" en otra.')}</p>
      <div class="riga-flessibile">
        <select id="ov-sel" class="campo-largo"></select>
        <button class="btn secondario" id="ov-nuovo">${L('Nuovo', 'New', 'Nuevo')}</button>
        <button class="btn secondario" id="ov-rinomina">${L('Rinomina', 'Rename', 'Renombrar')}</button>
        <button class="btn secondario" id="ov-elimina">${L('Elimina', 'Delete', 'Eliminar')}</button>
      </div>
      <label class="campo spazio-sopra">${L('Link OBS di questo overlay', 'OBS link for this overlay', 'Enlace OBS de este overlay')} <span class="tenue">— ${L('Sorgenti → Browser, 1920×1080, sfondo trasparente', 'Sources → Browser, 1920×1080, transparent background', 'Fuentes → Navegador, 1920×1080, fondo transparente')}</span></label>
      <div class="riga-flessibile">
        <input type="text" id="inp-overlay-url" class="campo-largo" readonly value="" placeholder="${L('caricamento…', 'loading…', 'cargando…')}">
        <button class="btn secondario" id="btn-copia-overlay">${L('Copia', 'Copy', 'Copiar')}</button>
      </div>
      <label class="campo spazio-sopra">${L('Elementi (fonti) di questo overlay', 'Elements (sources) of this overlay', 'Elementos (fuentes) de este overlay')} <span class="tenue">— ${L('accendi/spegni cosa compare, poi personalizzali con «Modifica»', 'turn on/off what appears, then customize them with «Edit»', 'activa/desactiva qué aparece, luego personalízalos con «Editar»')}</span></label>
      <div class="ovl-elementi">
        ${ovlElemento('alert', ICO.megafono, L('Alert eventi', 'Event alerts', 'Alertas de eventos'), 'sez-alert')}
        ${ovlElemento('chat', ICO.chat, L('Chat a schermo', 'On-screen chat', 'Chat en pantalla'), 'sez-chat')}
        ${ovlElemento('wf', ICO.cuore, L('Ultimo follower', 'Latest follower', 'Último seguidor'), 'sez-widget')}
        ${ovlElemento('ws', ICO.medaglia, L('Ultimo sub', 'Latest sub', 'Último sub'), 'sez-widget')}
        ${ovlElemento('effetti', ICO.effetti, L('Effetti & suoni', 'Effects & sounds', 'Efectos y sonidos'), 'effetti')}
      </div>
      <p class="suggerimento">${L('Tienilo per te: chi ha questo link può far comparire cose nel tuo overlay.', 'Keep it to yourself: anyone with this link can make things appear in your overlay.', 'Guárdalo para ti: quien tenga este enlace puede hacer aparecer cosas en tu overlay.')}</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.righello)}${L('Anteprima e layout', 'Preview and layout', 'Vista previa y diseño')}</h2>
      <p>${L('Personalizza', 'Customize', 'Personaliza')} <strong>${L('tutto', 'everything', 'todo')}</strong> ${L('ciò che appare a schermo: alert, chat, widget… colori, font, forma, animazioni.', 'that appears on screen: alerts, chat, widgets… colors, fonts, shape, animations.', 'lo que aparece en pantalla: alertas, chat, widgets… colores, fuentes, forma, animaciones.')}
      ${L('Posizioni e "cosa mostra" valgono per l\'', 'Positions and "what to show" apply to the', 'Las posiciones y "qué mostrar" valen para el')}<strong>${L('overlay selezionato qui sopra', 'overlay selected above', 'overlay seleccionado arriba')}</strong>; ${L('stile e testi sono condivisi.', 'style and texts are shared.', 'el estilo y los textos son compartidos.')}
      ${L('L\'', 'The ', 'La ')}<strong>${L('anteprima qui sotto è dal vivo', 'preview below is live', 'vista previa de abajo es en vivo')}</strong>.</p>
      <p class="spazio-sopra"><button class="btn grande" id="ovl-salva-tutto">${L('Salva overlay', 'Save overlay', 'Guardar overlay')}</button>
        <span class="suggerimento">${L('Salva tutto in un colpo: alert, chat, widget e il layout dell\'overlay selezionato.', 'Save everything at once: alerts, chat, widgets and the selected overlay\'s layout.', 'Guarda todo de una vez: alertas, chat, widgets y el diseño del overlay seleccionado.')}</span></p>
      <label class="campo spazio-sopra" for="ovl-tpl">${L('Parti da un modello pronto', 'Start from a ready-made template', 'Empieza con una plantilla lista')} <span class="tenue">— ${L('«Applica» riempie i controlli con quel look; poi premi «Salva overlay»', '«Apply» fills the controls with that look; then press «Save overlay»', '«Aplicar» rellena los controles con ese aspecto; luego pulsa «Guardar overlay»')}</span></label>
      <div class="riga-flessibile">
        <select id="ovl-tpl" class="campo-largo">${opzTpl}</select>
        <button class="btn secondario" id="ovl-tpl-applica">${L('Applica al momento', 'Apply now', 'Aplicar ahora')}</button>
        <button class="btn secondario" id="ovl-tpl-salva">${L('Salva come mio modello…', 'Save as my template…', 'Guardar como mi plantilla…')}</button>
        <button class="btn secondario" id="ovl-tpl-elimina">${L('Elimina', 'Delete', 'Eliminar')}</button>
      </div>
      <div class="ovl-anteprima spazio-sopra" id="ovl-preview">
        <div class="ap-stage" id="ap-stage">
          <div class="ap-el alert-card" id="ap-alert"><div class="alert-ico" id="ap-alert-ico"></div><div class="alert-testo" id="ap-alert-testo"></div></div>
          <div class="ap-el ap-chat" id="ap-chat"></div>
          <div class="ap-el" id="ap-wf"><div class="ovl-widget" id="ap-wf-el"><span class="w-ico"></span><span class="w-testo"></span></div></div>
          <div class="ap-el" id="ap-ws"><div class="ovl-widget" id="ap-ws-el"><span class="w-ico"></span><span class="w-testo"></span></div></div>
        </div>
      </div>
      <div class="ovl-inspector" id="ovl-inspector" hidden>
        <div class="ovl-insp-testa"><span class="ovl-insp-nome" id="insp-nome">${L('Elemento', 'Element', 'Elemento')}</span>
          <button type="button" class="ovl-insp-reset" id="insp-reset" title="${L('Ripristina posizione, dimensione e rotazione', 'Reset position, size and rotation', 'Restablecer posición, tamaño y rotación')}">${L('Ripristina', 'Reset', 'Restablecer')}</button></div>
        <div class="ovl-insp-riga">
          <label for="insp-size">${L('Dimensione', 'Size', 'Tamaño')}</label>
          <input type="range" id="insp-size" min="30" max="300" step="1" value="100">
          <span class="ovl-insp-val" id="insp-size-val">100%</span>
        </div>
        <div class="ovl-insp-riga">
          <label for="insp-rot">${L('Rotazione', 'Rotation', 'Rotación')}</label>
          <input type="range" id="insp-rot" min="-180" max="180" step="1" value="0">
          <span class="ovl-insp-val" id="insp-rot-val">0°</span>
        </div>
      </div>
      <p class="suggerimento"><strong>${L('Clicca', 'Click', 'Haz clic en')}</strong> ${L('un elemento per selezionarlo, poi', 'an element to select it, then', 'un elemento para seleccionarlo, luego')} <strong>${L('trascinalo', 'drag it', 'arrástralo')}</strong> ${L('per spostarlo, usa le', 'to move it, use the', 'para moverlo, usa los')} <strong>${L('maniglie', 'handles', 'tiradores')}</strong> (⤡ ${L('dimensione', 'size', 'tamaño')} · ⟳ ${L('rotazione', 'rotation', 'rotación')}) ${L('o i cursori qui sopra.', 'or the sliders above.', 'o los deslizadores de arriba.')} ${L('Scorciatoie:', 'Shortcuts:', 'Atajos:')} <strong>${L('rotellina', 'wheel', 'rueda')}</strong> = ${L('ridimensiona', 'resize', 'redimensionar')}, <strong>Shift+${L('rotellina', 'wheel', 'rueda')}</strong> = ${L('ruota', 'rotate', 'rotar')}, <strong>${L('doppio clic', 'double click', 'doble clic')}</strong> = ${L('ripristina', 'reset', 'restablecer')}. ${L('Usa «Prova ▶» per vederli nell\'overlay in OBS.', 'Use «Test ▶» to see them in the overlay in OBS.', 'Usa «Probar ▶» para verlos en el overlay en OBS.')}</p>
    </div>

    <details class="carta sez" id="sez-alert">
      <summary><h3>${_hIco(ICO.megafono)}${L('Alert eventi', 'Event alerts', 'Alertas de eventos')}</h3></summary>
      <p>${L('Un cartello animato con suono quando arriva un follow, un sub, dei bit o un raid.', 'An animated banner with sound when a follow, sub, bits or a raid comes in.', 'Un cartel animado con sonido cuando llega un follow, un sub, bits o un raid.')}</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore"><input type="checkbox" id="al-attivo" ${a.attivo ? 'checked' : ''}><span class="levetta"></span></label>
        <span class="etichetta-stato">${L('Alert eventi', 'Event alerts', 'Alertas de eventos')}</span>
      </div>
      <div class="griglia-campi spazio-sopra">
        ${cSel('al-pos', L('Posizione', 'Position', 'Posición'), posAlertOpts, a.posizione)}
        <div><label class="campo" for="al-durata">${L('Durata (secondi)', 'Duration (seconds)', 'Duración (segundos)')}</label><input type="number" id="al-durata" min="2" max="20" value="${Math.round((Number(a.durata) || 6000) / 1000)}"></div>
      </div>
      <h4 class="spazio-sopra">${L('Aspetto', 'Appearance', 'Aspecto')} <span class="tenue">— ${L('vale per tutti gli alert', 'applies to all alerts', 'vale para todas las alertas')}</span></h4>
      <div class="griglia-campi spazio-sopra">
        ${cSel('al-st-anim', L('Animazione', 'Animation', 'Animación'), ANIM_ALERT_OPTS(), st.animazione)}
        ${cSel('al-st-font', 'Font', FONT_OPTS(), st.font)}
        ${cRng('al-st-dim', L('Testo', 'Text', 'Texto'), 14, 56, st.dimTesto, 'px')}
      </div>
      <label class="campo spazio-sopra">Font <span class="tenue">— ${L('scegli un font Google dall\'elenco con anteprima (vince sul menu qui sopra)', 'pick a Google font from the list with preview (overrides the menu above)', 'elige una fuente Google de la lista con vista previa (gana sobre el menú de arriba)')}</span></label>
      <div class="riga-flessibile">
        <input type="text" id="al-st-gfont" class="campo-largo gfont" placeholder="${L('— nessun font Google (uso il menu) —', '— no Google font (using the menu) —', '— sin fuente Google (uso el menú) —')}" value="${esc(st.googleFont || '')}">
        <button type="button" class="btn secondario sfoglia-font" data-target="al-st-gfont" data-box="fb-al">${_bIco(ICO.libro)}${L('Sfoglia i font', 'Browse fonts', 'Explorar fuentes')}</button>
        <button type="button" class="btn secondario gfont-x" data-target="al-st-gfont" title="${L('Togli il font Google', 'Remove the Google font', 'Quitar la fuente Google')}">✕</button>
      </div>
      <div class="font-browser" id="fb-al" hidden></div>
      <div class="griglia-campi spazio-sopra">
        ${cCol('al-st-bg', L('Sfondo', 'Background', 'Fondo'), st.sfondo)}
        ${cRng('al-st-op', L('Opacità', 'Opacity', 'Opacidad'), 0, 100, st.opacita, '%')}
        ${cCol('al-st-fg', L('Testo', 'Text', 'Texto'), st.testo)}
        ${cRng('al-st-radius', L('Angoli', 'Corners', 'Esquinas'), 0, 40, st.bordoRaggio, 'px')}
        ${cRng('al-st-border', L('Bordo', 'Border', 'Borde'), 0, 10, st.bordoSpessore, 'px')}
      </div>
      <div class="riga-flessibile spazio-sopra">
        ${cChk('al-st-glow', L('Bagliore', 'Glow', 'Resplandor'), st.glow)}
        ${cChk('al-st-icon', L('Mostra icona', 'Show icon', 'Mostrar icono'), st.icona)}
      </div>
      <div class="alert-griglia spazio-sopra">
        ${ALERT_TIPI().map((t) => bloccoAlert(t, a)).join('')}
      </div>
      <p class="spazio-sopra"><button class="btn" id="al-salva">${L('Salva alert', 'Save alerts', 'Guardar alertas')}</button></p>
    </details>

    <details class="carta sez" id="sez-chat">
      <summary><h3>${_hIco(ICO.chat)}${L('Chat a schermo', 'On-screen chat', 'Chat en pantalla')}</h3></summary>
      <p>${L('I messaggi della chat scorrono in sovraimpressione nell\'overlay.', 'Chat messages scroll as an overlay on screen.', 'Los mensajes del chat se muestran superpuestos en el overlay.')}</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore"><input type="checkbox" id="co-attivo" ${co.attivo ? 'checked' : ''}><span class="levetta"></span></label>
        <span class="etichetta-stato">${L('Chat a schermo', 'On-screen chat', 'Chat en pantalla')}</span>
      </div>
      <div class="griglia-campi spazio-sopra">
        ${cSel('co-pos', L('Posizione', 'Position', 'Posición'), POS4_OPTS(), co.posizione)}
        <div><label class="campo" for="co-max">${L('Messaggi visibili', 'Visible messages', 'Mensajes visibles')}</label><input type="number" id="co-max" min="1" max="20" value="${Number(co.max) || 8}"></div>
        <div><label class="campo" for="co-fade">${L('Spariscono dopo (s, 0=restano)', 'Disappear after (s, 0=stay)', 'Desaparecen tras (s, 0=quedan)')}</label><input type="number" id="co-fade" min="0" max="120" value="${Number(co.fadeSec) || 0}"></div>
      </div>
      <h4 class="spazio-sopra">${L('Aspetto', 'Appearance', 'Aspecto')}</h4>
      <div class="griglia-campi spazio-sopra">
        ${cSel('co-st-dim', L('Dimensione', 'Size', 'Tamaño'), DIM_OPTS(), cst.dim)}
        ${cSel('co-st-font', 'Font', FONT_OPTS(), cst.font)}
        ${cSel('co-st-anim', L('Animazione', 'Animation', 'Animación'), ANIM_CHAT_OPTS(), cst.animazione)}
        ${cRng('co-st-larg', L('Larghezza', 'Width', 'Ancho'), 18, 60, cst.larghezza, 'vw')}
      </div>
      <label class="campo spazio-sopra">Font <span class="tenue">— ${L('font Google dall\'elenco con anteprima (opzionale, vince sul menu)', 'Google font from the list with preview (optional, overrides the menu)', 'fuente Google de la lista con vista previa (opcional, gana sobre el menú)')}</span></label>
      <div class="riga-flessibile">
        <input type="text" id="co-st-gfont" class="campo-largo gfont" placeholder="${L('— nessun font Google —', '— no Google font —', '— sin fuente Google —')}" value="${esc(cst.googleFont || '')}">
        <button type="button" class="btn secondario sfoglia-font" data-target="co-st-gfont" data-box="fb-co">${_bIco(ICO.libro)}${L('Sfoglia i font', 'Browse fonts', 'Explorar fuentes')}</button>
        <button type="button" class="btn secondario gfont-x" data-target="co-st-gfont" title="${L('Togli il font Google', 'Remove the Google font', 'Quitar la fuente Google')}">✕</button>
      </div>
      <div class="font-browser" id="fb-co" hidden></div>
      <div class="griglia-campi spazio-sopra">
        ${cCol('co-st-bg', L('Sfondo', 'Background', 'Fondo'), cst.sfondo)}
        ${cRng('co-st-op', L('Opacità', 'Opacity', 'Opacidad'), 0, 100, cst.opacita, '%')}
        ${cCol('co-st-fg', L('Testo', 'Text', 'Texto'), cst.testo)}
        ${cRng('co-st-radius', L('Angoli', 'Corners', 'Esquinas'), 0, 30, cst.bordoRaggio, 'px')}
      </div>
      <div class="griglia-campi spazio-sopra">
        ${cSel('co-st-user', L('Colore nomi', 'Name color', 'Color de nombres'), [['twitch', L('Colore di Twitch', 'Twitch color', 'Color de Twitch')], ['fisso', L('Colore fisso', 'Fixed color', 'Color fijo')]], userMode)}
        ${cCol('co-st-usercol', L('Colore nomi (se fisso)', 'Name color (if fixed)', 'Color de nombres (si fijo)'), userMode === 'fisso' ? cst.username : '#9146ff')}
      </div>
      <div class="riga-flessibile spazio-sopra">
        ${cChk('co-st-ombra', L('Ombra', 'Shadow', 'Sombra'), cst.ombra)}
        ${cChk('co-st-bold', L('Nome in grassetto', 'Bold name', 'Nombre en negrita'), cst.grassettoUser)}
      </div>
      <p class="spazio-sopra">
        <button class="btn" id="co-salva">${L('Salva chat', 'Save chat', 'Guardar chat')}</button>
        <button class="btn secondario" id="co-prova">${L('Prova', 'Test', 'Probar')} ▶</button>
      </p>
    </details>

    <details class="carta sez" id="sez-widget">
      <summary><h3>${_hIco(ICO.medaglia)}${L('Widget: ultimo follower / ultimo sub', 'Widgets: latest follower / latest sub', 'Widgets: último seguidor / último sub')}</h3></summary>
      <p>${L('Etichette', 'Labels', 'Etiquetas')} <strong>${L('sempre a schermo', 'always on screen', 'siempre en pantalla')}</strong> ${L('che si aggiornano da sole quando arriva un nuovo follower o sub.', 'that update themselves when a new follower or sub arrives.', 'que se actualizan solas cuando llega un nuevo seguidor o sub.')}</p>
      <div class="alert-griglia spazio-sopra">
        ${bloccoWidget('wf', wf, L('Ultimo follower', 'Latest follower', 'Último seguidor'), 'ultimoFollower')}
        ${bloccoWidget('ws', ws, L('Ultimo sub', 'Latest sub', 'Último sub'), 'ultimoSub')}
      </div>
      <p class="spazio-sopra"><button class="btn" id="wid-salva">${L('Salva widget', 'Save widgets', 'Guardar widgets')}</button></p>
    </details>

    <details class="carta sez">
      <summary><h3>${_hIco(ICO.moduli)}${L('CSS avanzato', 'Advanced CSS', 'CSS avanzado')} <span class="tenue">— ${L('libertà totale', 'total freedom', 'libertad total')}</span></h3></summary>
      <p>${L('Per chi vuole spingersi oltre: CSS applicato al tuo overlay. Le classi principali sono', 'For those who want to go further: CSS applied to your overlay. The main classes are', 'Para quien quiere ir más allá: CSS aplicado a tu overlay. Las clases principales son')}
      <code>.alert-card</code>, <code>.chat-riga</code>, <code>.ovl-widget</code>, <code>.pen-card</code>.</p>
      <textarea id="ovl-css" spellcheck="false" placeholder=".alert-card { letter-spacing: 1px; }">${esc(p.overlayCss || '')}</textarea>
      <p class="spazio-sopra"><button class="btn" id="css-salva">${L('Salva CSS', 'Save CSS', 'Guardar CSS')}</button></p>
    </details>`);
}

// nomi-font → variabile CSS (definite in overlay-skin.css) per l'anteprima
const FONT_VAR = { sistema: 'var(--font-sistema)', rotondo: 'var(--font-rotondo)', condensato: 'var(--font-condensato)', mono: 'var(--font-mono)', serif: 'var(--font-serif)', manga: 'var(--font-manga)' };
// FONT GOOGLE nell'anteprima: carica al volo il font dalla libreria Google.
const _gfontDash = new Set();
function fontGoogleDash(nome) {
  const n = String(nome || '').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  if (!n) return null;
  if (!_gfontDash.has(n.toLowerCase())) {
    _gfontDash.add(n.toLowerCase());
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(n).replace(/%20/g, '+') + '&display=swap';
    document.head.appendChild(l);
  }
  return "'" + n + "', var(--font-sistema)";
}
// font effettivo di uno stile: Google (se scritto) o quello del menu
const fontStile = (st) => (st && st.googleFont ? fontGoogleDash(st.googleFont) : FONT_VAR[(st || {}).font]);

// Elenco sfogliabile dei font Google CON ANTEPRIMA (ogni voce scritta nel suo
// font). Niente ricerca obbligatoria: scorri e scegli. I font si caricano solo
// quando la riga entra in vista (lazy), così le ~1900 voci non pesano tutte.
let FONTS_GOOGLE = null;
async function montaFontBrowser(box, targetId) {
  box.innerHTML = '<input type="text" class="fb-cerca" placeholder="Filtra per nome (facoltativo)…"><div class="fb-lista"><p class="tenue">Carico i font…</p></div>';
  if (!FONTS_GOOGLE) { try { const r = await api('/api/streamer/google-fonts'); FONTS_GOOGLE = r.fonts || []; } catch { FONTS_GOOGLE = []; } }
  const lista = box.querySelector('.fb-lista');
  lista.innerHTML = FONTS_GOOGLE.length
    ? FONTS_GOOGLE.map((f) => `<button type="button" class="fb-riga" data-font="${esc(f)}">${esc(f)}</button>`).join('')
    : '<p class="tenue">Elenco non disponibile ora: puoi scrivere il nome del font a mano.</p>';
  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (e.isIntersecting) { e.target.style.fontFamily = fontGoogleDash(e.target.dataset.font); io.unobserve(e.target); }
    }), { root: lista, rootMargin: '250px' });
    lista.querySelectorAll('.fb-riga').forEach((r) => io.observe(r));
  } else {
    lista.querySelectorAll('.fb-riga').forEach((r) => { r.style.fontFamily = fontGoogleDash(r.dataset.font); });
  }
  box.querySelector('.fb-cerca').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    lista.querySelectorAll('.fb-riga').forEach((r) => { r.hidden = !!q && !r.dataset.font.toLowerCase().includes(q); });
  });
  lista.addEventListener('click', (e) => {
    const r = e.target.closest('.fb-riga'); if (!r) return;
    const inp = _g(targetId);
    if (inp) { inp.value = r.dataset.font; inp.dispatchEvent(new Event('input', { bubbles: true })); }
    lista.querySelectorAll('.fb-riga.sel').forEach((x) => x.classList.remove('sel'));
    r.classList.add('sel');
  });
}
// posizioni LIBERE (drag) degli elementi nell'anteprima: {x,y} in % o null (angolo).
// Appartengono all'OVERLAY selezionato (posXY = layout dell'overlay corrente).
let posXY = { alert: null, chat: null, wf: null, ws: null };
let overlays = [];      // lista degli overlay dello streamer (ognuno un link OBS)
let overlaySel = '';    // id dell'overlay attualmente in modifica
const mostraChk = (k) => !!_g('mostra-' + k)?.checked;
const AP_ICO_ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
const AP_ICO_WIDGET = { ultimoFollower: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>', ultimoSub: AP_ICO_ALERT };
const _g = (id) => document.getElementById(id);
const _v = (id) => _g(id)?.value;
function _setVars(el, vars) { for (const k in vars) { const x = vars[k]; if (x != null && x !== '' && String(x).indexOf('undefined') < 0 && String(x).indexOf('NaN') < 0) el.style.setProperty(k, x); } }

function _leggiAlertStile() {
  return {
    animazione: _v('al-st-anim') || 'slide', font: _v('al-st-font') || 'sistema', googleFont: (_v('al-st-gfont') || '').trim(),
    dimTesto: Number(_v('al-st-dim')) || 27, sfondo: _v('al-st-bg'), opacita: Number(_v('al-st-op')),
    testo: _v('al-st-fg'), bordoRaggio: Number(_v('al-st-radius')), bordoSpessore: Number(_v('al-st-border')),
    glow: !!_g('al-st-glow')?.checked, icona: !!_g('al-st-icon')?.checked,
  };
}
function _leggiChatStile() {
  const mode = _v('co-st-user') || 'twitch';
  return {
    dim: _v('co-st-dim') || 'media', font: _v('co-st-font') || 'sistema', googleFont: (_v('co-st-gfont') || '').trim(), animazione: _v('co-st-anim') || 'slide',
    larghezza: Number(_v('co-st-larg')), sfondo: _v('co-st-bg'), opacita: Number(_v('co-st-op')), testo: _v('co-st-fg'),
    bordoRaggio: Number(_v('co-st-radius')), username: mode === 'fisso' ? (_v('co-st-usercol') || '#9146ff') : 'twitch',
    ombra: !!_g('co-st-ombra')?.checked, grassettoUser: !!_g('co-st-bold')?.checked,
  };
}
function _leggiWidget(pref) {
  const chXy = impostazioni().overlayWidget?.[pref === 'wf' ? 'ultimoFollower' : 'ultimoSub']?.xy || null;
  return {
    attivo: !!_g(`${pref}-attivo`)?.checked, posizione: _v(`${pref}-pos`) || 'basso-destra', xy: chXy,
    testo: (_v(`${pref}-testo`) || '').trim(),
    stile: { dim: _v(`${pref}-dim`) || 'media', font: _v(`${pref}-font`) || 'sistema', sfondo: _v(`${pref}-bg`),
      opacita: Number(_v(`${pref}-op`)), testo: _v(`${pref}-fg`), accento: _v(`${pref}-acc`), bordoRaggio: Number(_v(`${pref}-radius`)) },
  };
}

function _raccogliAlerts() {
  const blocchi = {};
  document.querySelectorAll('.alert-blocco[data-alert]').forEach((b) => {
    const k = b.dataset.alert;
    const soglia = b.querySelector('.al-soglia');
    blocchi[k] = {
      attivo: !!b.querySelector('.al-attivo')?.checked,
      testo: (b.querySelector('.al-testo')?.value || '').trim(),
      suono: b.querySelector('.al-suono')?.value || '',
      media: b.querySelector('.al-media')?.value || '',
      font: b.querySelector('.al-font')?.value || '',
      accento: b.querySelector('.al-colore')?.value || '#9146ff',
      volume: Number(b.querySelector('.al-vol')?.value) || 0,
    };
    if (soglia) blocchi[k][k === 'cheer' ? 'minBits' : 'minViewers'] = Number(soglia.value) || 0;
  });
  return {
    attivo: !!_g('al-attivo')?.checked,
    posizione: _v('al-pos') || 'alto-centro',
    // la posizione ora è per-overlay: lo stile non tocca la posizione "di default"
    xy: (impostazioni().alerts && impostazioni().alerts.xy) || null,
    durata: (Number(_v('al-durata')) || 6) * 1000,
    stile: _leggiAlertStile(),
    ...blocchi,
  };
}
function _raccogliChat() {
  return { attivo: !!_g('co-attivo')?.checked, posizione: _v('co-pos') || 'basso-sinistra',
    xy: (impostazioni().chatOverlay && impostazioni().chatOverlay.xy) || null,
    max: Number(_v('co-max')) || 8, fadeSec: Number(_v('co-fade')) || 0, stile: _leggiChatStile() };
}
function _raccogliWidget() { return { ultimoFollower: _leggiWidget('wf'), ultimoSub: _leggiWidget('ws') }; }

async function salvaAlert(silenzioso) {
  await salvaImpostazioni({ alerts: _raccogliAlerts() }, silenzioso ? null : L('Alert salvati ✓', 'Alerts saved ✓', 'Alertas guardadas ✓'));
}
async function salvaChatOverlay(silenzioso) {
  await salvaImpostazioni({ chatOverlay: _raccogliChat() }, silenzioso ? null : L('Chat a schermo salvata ✓', 'On-screen chat saved ✓', 'Chat en pantalla guardado ✓'));
}
async function salvaWidget(silenzioso) {
  await salvaImpostazioni({ overlayWidget: _raccogliWidget() }, silenzioso ? null : L('Widget salvati ✓', 'Widgets saved ✓', 'Widgets guardados ✓'));
}

async function salvaCss(silenzioso) {
  await salvaImpostazioni({ overlayCss: _v('ovl-css') || '' }, silenzioso ? null : L('CSS salvato ✓', 'CSS saved ✓', 'CSS guardado ✓'));
}

// --- anteprima dal vivo -------------------------------------------------
function _anteprimaWidget(pref, id, nome) {
  const attivo = !!_g(`${pref}-attivo`)?.checked;
  const box = _g(`ap-${pref}`);
  if (!box) return;
  if (!attivo || !mostraChk(pref)) { box.style.display = 'none'; return; }
  box.style.display = '';
  const w = _leggiWidget(pref).stile;
  const el = _g(`ap-${pref}-el`);
  el.className = 'ovl-widget dim-' + (w.dim || 'media');
  _setVars(el, { '--bg': w.sfondo, '--op': w.opacita + '%', '--fg': w.testo, '--acc': w.accento, '--radius': w.bordoRaggio + 'px', '--font': FONT_VAR[w.font] });
  el.querySelector('.w-ico').innerHTML = AP_ICO_WIDGET[id] || '';
  el.querySelector('.w-testo').innerHTML = esc(_v(`${pref}-testo`) || '{nome}').replace(/\{nome\}/g, '<b>' + esc(nome) + '</b>');
}

function aggiornaAnteprima() {
  const st = _leggiAlertStile();
  const acc = document.querySelector('.alert-blocco[data-alert="sub"] .al-colore')?.value || '#ffb020';
  const card = _g('ap-alert');
  if (card) {
    card.className = 'alert-card anim-' + st.animazione + (st.glow ? ' glow' : '') + (st.icona ? '' : ' senza-ico');
    _setVars(card, { '--acc': acc, '--bg': st.sfondo, '--op': st.opacita + '%', '--fg': st.testo, '--radius': st.bordoRaggio + 'px', '--border': st.bordoSpessore + 'px', '--size': st.dimTesto + 'px', '--font': fontStile(st) });
    _g('ap-alert-ico').innerHTML = AP_ICO_ALERT;
    _g('ap-alert-testo').innerHTML = L('<b>MarioRossi</b> si è abbonato!', '<b>MarioRossi</b> subscribed!', '¡<b>MarioRossi</b> se ha suscrito!');
    // niente re-animazione a ogni tasto: l'anteprima resta stabile (l'entrata
    // vera si vede con «Prova ▶» o nell'overlay). Prima "sfarfallava".
    card.classList.add('dentro');
  }
  const cst = _leggiChatStile();
  const chatPos = _v('co-pos') || 'basso-sinistra';
  const apChat = _g('ap-chat');
  if (apChat) {
    apChat.className = 'ap-el ap-chat' + (/destra/.test(chatPos) ? ' destra' : '') + (selezione === 'chat' ? ' sel' : '');
    apChat.innerHTML = [['lucaplays', '#ff4d4d', L('ciao a tutti!', 'hi everyone!', '¡hola a todos!')], ['giada_ttv', '#48b0ff', L('che bella live', 'great stream', 'qué buen directo')]].map(([u, col, t]) => {
      const cu = cst.username === 'twitch' ? col : cst.username;
      return `<div class="chat-riga dim-${cst.dim}${cst.ombra ? ' ombra' : ''}${cst.grassettoUser ? ' user-bold' : ''} dentro" style="--bg:${cst.sfondo};--op:${cst.opacita}%;--fg:${cst.testo};--radius:${cst.bordoRaggio}px;--font:${fontStile(cst)}"><span class="chat-user" style="color:${cu}">${esc(u)}</span> ${esc(t)}</div>`;
    }).join('');
    _iniettaManiglie('chat');   // l'innerHTML qui sopra le rimuove: le rimettiamo
  }
  _anteprimaWidget('wf', 'ultimoFollower', 'MarioRossi');
  _anteprimaWidget('ws', 'ultimoSub', 'GiadaTTV');
  // posiziona nel palco 1920x1080 (posizione libera dal drag, oppure l'angolo scelto)
  _posElemento(_g('ap-alert'), posXY.alert || _defPos('alert'));
  _posElemento(_g('ap-chat'), posXY.chat || _defPos('chat'));
  _posElemento(_g('ap-wf'), posXY.wf || _defPos('wf'));
  _posElemento(_g('ap-ws'), posXY.ws || _defPos('ws'));
  // nascondi nell'anteprima ciò che QUESTO overlay non mostra
  if (_g('ap-alert')) _g('ap-alert').style.display = mostraChk('alert') ? '' : 'none';
  if (_g('ap-chat')) _g('ap-chat').style.display = mostraChk('chat') ? '' : 'none';
}

// posizione di default (in %) di un elemento in base all'angolo/posizione scelta.
function _cornerXY(c) { return ({ 'alto-sinistra': { x: 13, y: 15 }, 'alto-destra': { x: 87, y: 15 }, 'basso-sinistra': { x: 13, y: 85 }, 'basso-destra': { x: 87, y: 85 } })[c] || { x: 87, y: 85 }; }
function _defPos(k) {
  if (k === 'alert') return ({ 'alto-centro': { x: 50, y: 16 }, centro: { x: 50, y: 50 }, 'basso-centro': { x: 50, y: 84 } })[_v('al-pos') || 'alto-centro'] || { x: 50, y: 16 };
  if (k === 'chat') return _cornerXY(_v('co-pos') || 'basso-sinistra');
  return _cornerXY(_v(`${k}-pos`) || 'basso-destra');
}

// Posiziona un elemento nel palco 1920x1080 (coordinate in % → left/top) con
// ancoraggio CONSAPEVOLE della posizione: translate(-x%,-y%) tiene l'elemento
// sempre dentro al palco (identico all'overlay → anteprima fedele). Applica anche
// DIMENSIONE (s = scala %) e ROTAZIONE (r = gradi).
function _posElemento(el, xy) {
  if (!el || !xy) return;
  const sf = (Number(xy.s) || 100) / 100, r = Number(xy.r) || 0;
  el.style.position = 'absolute'; el.style.left = xy.x + '%'; el.style.top = xy.y + '%';
  el.style.right = 'auto'; el.style.bottom = 'auto';
  el.style.transform = `translate(${-xy.x}%,${-xy.y}%) scale(${sf}) rotate(${r}deg)`;
  // le maniglie sono figlie dell'elemento: contro-scala così restano usabili
  el.querySelectorAll('.ap-handle').forEach((h) => { h.style.transform = `scale(${1 / sf})`; });
}

// Nomi leggibili degli elementi (mostrati nell'inspector).
const NOMI_EL = () => ({ alert: L('Alert', 'Alert', 'Alerta'), chat: L('Chat a schermo', 'On-screen chat', 'Chat en pantalla'), wf: L('Widget: ultimo follower', 'Widget: latest follower', 'Widget: último seguidor'), ws: L('Widget: ultimo sub', 'Widget: latest sub', 'Widget: último sub') });
let selezione = null;   // elemento selezionato nell'editor ('alert'|'chat'|'wf'|'ws')

// Ritorna (creandolo se serve) lo stato {x,y,s,r} di un elemento: dal drag/scala
// o, se ancora "all'angolo", materializzato dalla posizione di default.
function _statoXY(chiave) {
  if (!posXY[chiave]) posXY[chiave] = { ..._defPos(chiave) };
  const st = posXY[chiave];
  if (st.s == null) st.s = 100;
  if (st.r == null) st.r = 0;
  return st;
}

// Selezione: evidenzia l'elemento e mostra l'inspector (dimensione/rotazione).
function seleziona(chiave) {
  selezione = chiave;
  ['alert', 'chat', 'wf', 'ws'].forEach((k) => _g('ap-' + k)?.classList.toggle('sel', k === chiave));
  aggiornaInspector();
}
function deseleziona() {
  selezione = null;
  ['alert', 'chat', 'wf', 'ws'].forEach((k) => _g('ap-' + k)?.classList.remove('sel'));
  aggiornaInspector();
}
function aggiornaInspector() {
  const box = _g('ovl-inspector'); if (!box) return;
  if (!selezione) { box.hidden = true; return; }
  box.hidden = false;
  const st = _statoXY(selezione);
  const nome = _g('insp-nome'); if (nome) nome.textContent = NOMI_EL()[selezione] || selezione;
  const sz = _g('insp-size'), rt = _g('insp-rot');
  if (sz) { sz.value = st.s; _g('insp-size-val').textContent = st.s + '%'; }
  if (rt) { rt.value = st.r; _g('insp-rot-val').textContent = st.r + '°'; }
}

// Salvataggio posizione/scala/rotazione con antirimbalzo (rotellina/cursori).
let _timerPos = null;
function _salvaPosDebounced(chiave) {
  clearTimeout(_timerPos);
  _timerPos = setTimeout(() => _salvaPos(chiave), 500);
}

// Inietta le maniglie (ridimensiona ⤡ + ruota ⟳) in un elemento e le collega.
function _iniettaManiglie(chiave) {
  const el = _g('ap-' + chiave);
  if (!el || el.querySelector('.ap-handle')) return;
  const hR = document.createElement('div');
  hR.className = 'ap-handle ap-h-scala'; hR.title = L('Trascina per ridimensionare', 'Drag to resize', 'Arrastra para redimensionar'); hR.textContent = '⤡';
  const hRot = document.createElement('div');
  hRot.className = 'ap-handle ap-h-ruota'; hRot.title = L('Trascina per ruotare', 'Drag to rotate', 'Arrastra para rotar'); hRot.textContent = '⟳';
  el.appendChild(hR); el.appendChild(hRot);
  hR.addEventListener('pointerdown', (e) => _dragManiglia(chiave, e, 'scala'));
  hRot.addEventListener('pointerdown', (e) => _dragManiglia(chiave, e, 'ruota'));
}

// Drag di una maniglia: math in coordinate SCHERMO (robusta alla scala del palco).
//  · scala → rapporto tra la distanza dal centro ora e all'inizio
//  · ruota → angolo dal centro verso il puntatore (la maniglia sta in alto)
function _dragManiglia(chiave, e, tipo) {
  e.preventDefault(); e.stopPropagation();
  const el = _g('ap-' + chiave);
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const st = _statoXY(chiave);
  const d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
  const s0 = st.s || 100;
  seleziona(chiave);
  const move = (ev) => {
    if (tipo === 'scala') {
      const d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
      st.s = Math.max(30, Math.min(300, Math.round(s0 * d / d0)));
    } else {
      let deg = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90;
      while (deg > 180) deg -= 360; while (deg < -180) deg += 360;
      st.r = Math.round(deg);
    }
    _posElemento(el, st); aggiornaInspector();
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); _salvaPos(chiave); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}

// Scala il palco 1920x1080 per riempire esattamente il riquadro 16:9 dell'anteprima.
function scalaAnteprima() {
  const canvas = _g('ovl-preview'), stage = _g('ap-stage');
  if (!canvas || !stage) return;
  const w = canvas.clientWidth;
  if (w) stage.style.transform = 'scale(' + (w / 1920) + ')';
}

// Rende un elemento dell'anteprima MANIPOLABILE (WYSIWYG): clic per selezionare,
// trascina per spostare, rotellina per ridimensionare (Shift = ruota), maniglie
// per scala/rotazione. Doppio clic = ripristina (posizione, dimensione, rotazione).
function rendiTrascinabile(el, chiave) {
  if (!el) return;
  el.style.cursor = 'grab';
  el.title = 'Clic per selezionare · trascina per spostare · doppio clic per ripristinare';
  _iniettaManiglie(chiave);
  el.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    if (e.target?.classList?.contains('ap-handle')) return;   // le maniglie fanno da sé
    e.preventDefault();
    seleziona(chiave);
    const canvas = _g('ovl-preview').getBoundingClientRect();
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* niente */ }
    el.style.cursor = 'grabbing';
    const st = _statoXY(chiave);
    const move = (ev) => {
      // LIMITI 16:9: l'elemento non può uscire dal riquadro. Clampa il centro
      // tenendo conto del suo ingombro (metà larghezza/altezza in % del palco),
      // così il bordo resta sempre dentro l'anteprima (e quindi lo schermo).
      const er = el.getBoundingClientRect();
      const hw = Math.min(50, (er.width / 2) / canvas.width * 100);
      const hh = Math.min(50, (er.height / 2) / canvas.height * 100);
      const x = ((ev.clientX - canvas.left) / canvas.width) * 100;
      const y = ((ev.clientY - canvas.top) / canvas.height) * 100;
      st.x = Math.round(Math.max(hw, Math.min(100 - hw, x)));
      st.y = Math.round(Math.max(hh, Math.min(100 - hh, y)));
      _posElemento(el, st);
    };
    const up = () => { el.style.cursor = 'grab'; el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); _salvaPos(chiave); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  });
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    const st = _statoXY(chiave);
    if (e.shiftKey) { let r = (st.r || 0) + (e.deltaY < 0 ? 4 : -4); while (r > 180) r -= 360; while (r < -180) r += 360; st.r = r; }
    else { st.s = Math.max(30, Math.min(300, (st.s || 100) + (e.deltaY < 0 ? 4 : -4))); }
    seleziona(chiave); _posElemento(el, st); _salvaPosDebounced(chiave);
  }, { passive: false });
  el.addEventListener('dblclick', () => { posXY[chiave] = null; deseleziona(); aggiornaAnteprima(); _salvaPos(chiave); });
}

function _salvaPos() {
  // le posizioni (alert/chat/wf/ws) appartengono all'OVERLAY selezionato
  return salvaLayoutOverlay(true);
}

// --- template -----------------------------------------------------------
const _imposta = (id, val) => { const e = _g(id); if (e && val != null) { if (e.type === 'checkbox') e.checked = !!val; else e.value = val; } };
const _impostaEl = (e, val) => { if (e && val != null) { if (e.type === 'checkbox') e.checked = !!val; else e.value = val; } };

// Applica un template. Due formati:
//  - "seme" pronto { al, ch, acc }: cambia solo il LOOK (colori/font/forma).
//  - snapshot COMPLETO { alerts, chatOverlay, overlayWidget, overlayCss }: ripristina tutto.
function applicaTemplate(d) {
  if (!d) return;
  if (d.alerts || d.chatOverlay || d.overlayWidget || d.overlayCss != null) {
    _riempiConfig(d);
  } else {
    const al = d.al || {}, ch = d.ch || {}, acc = d.acc;
    _imposta('al-st-anim', al.animazione); _imposta('al-st-font', al.font); _imposta('al-st-gfont', al.googleFont); _imposta('al-st-dim', al.dimTesto);
    _imposta('al-st-bg', al.sfondo); _imposta('al-st-op', al.opacita); _imposta('al-st-fg', al.testo);
    _imposta('al-st-radius', al.bordoRaggio); _imposta('al-st-border', al.bordoSpessore);
    _imposta('al-st-glow', al.glow); _imposta('al-st-icon', al.icona !== false);
    _imposta('co-st-dim', ch.dim); _imposta('co-st-font', ch.font); _imposta('co-st-gfont', ch.googleFont); _imposta('co-st-bg', ch.sfondo);
    _imposta('co-st-op', ch.opacita); _imposta('co-st-fg', ch.testo); _imposta('co-st-radius', ch.bordoRaggio);
    if (acc) document.querySelectorAll('.alert-blocco[data-alert] .al-colore').forEach((c) => { c.value = acc; });
  }
  document.querySelectorAll('#scheda-alert input[type="range"]').forEach((r) => { const s = _g(r.id + '-v'); if (s) s.textContent = r.value; });
  aggiornaAnteprima();
}

// Riempie TUTTI i controlli dallo snapshot completo di un template.
function _riempiConfig(d) {
  const a = d.alerts || {}, ast = a.stile || {};
  _imposta('al-attivo', a.attivo); _imposta('al-pos', a.posizione); if (a.durata) _imposta('al-durata', Math.round(a.durata / 1000));
  _imposta('al-st-anim', ast.animazione); _imposta('al-st-font', ast.font); _imposta('al-st-gfont', ast.googleFont); _imposta('al-st-dim', ast.dimTesto);
  _imposta('al-st-bg', ast.sfondo); _imposta('al-st-op', ast.opacita); _imposta('al-st-fg', ast.testo);
  _imposta('al-st-radius', ast.bordoRaggio); _imposta('al-st-border', ast.bordoSpessore);
  _imposta('al-st-glow', ast.glow); _imposta('al-st-icon', ast.icona !== false);
  document.querySelectorAll('.alert-blocco[data-alert]').forEach((b) => {
    const c = a[b.dataset.alert] || {};
    _impostaEl(b.querySelector('.al-attivo'), c.attivo); _impostaEl(b.querySelector('.al-testo'), c.testo);
    _impostaEl(b.querySelector('.al-suono'), c.suono); _impostaEl(b.querySelector('.al-colore'), c.accento || c.colore);
    _impostaEl(b.querySelector('.al-font'), c.font || ''); _impostaEl(b.querySelector('.al-vol'), c.volume != null ? c.volume : 100);
    const sog = b.querySelector('.al-soglia'); if (sog) _impostaEl(sog, c.minBits != null ? c.minBits : c.minViewers);
  });
  // popola i menu Suono/Immagine-Video con la libreria Effetti & suoni
  api('/api/streamer/effetti').then((r) => popolaMediaSuoniAlert(r.effetti || [], a)).catch(() => { /* niente */ });
  const ch = d.chatOverlay || {}, cst = ch.stile || {};
  _imposta('co-attivo', ch.attivo); _imposta('co-pos', ch.posizione); _imposta('co-max', ch.max); _imposta('co-fade', ch.fadeSec);
  _imposta('co-st-dim', cst.dim); _imposta('co-st-font', cst.font); _imposta('co-st-gfont', cst.googleFont); _imposta('co-st-anim', cst.animazione); _imposta('co-st-larg', cst.larghezza);
  _imposta('co-st-bg', cst.sfondo); _imposta('co-st-op', cst.opacita); _imposta('co-st-fg', cst.testo); _imposta('co-st-radius', cst.bordoRaggio);
  const modo = (cst.username && cst.username !== 'twitch') ? 'fisso' : 'twitch';
  _imposta('co-st-user', modo); if (modo === 'fisso') _imposta('co-st-usercol', cst.username);
  _imposta('co-st-ombra', cst.ombra !== false); _imposta('co-st-bold', cst.grassettoUser !== false);
  const w = d.overlayWidget || {};
  [['wf', w.ultimoFollower], ['ws', w.ultimoSub]].forEach(([pref, wc]) => {
    if (!wc) return; const ws = wc.stile || {};
    _imposta(`${pref}-attivo`, wc.attivo); _imposta(`${pref}-pos`, wc.posizione); _imposta(`${pref}-testo`, wc.testo);
    _imposta(`${pref}-font`, ws.font); _imposta(`${pref}-dim`, ws.dim); _imposta(`${pref}-bg`, ws.sfondo);
    _imposta(`${pref}-op`, ws.opacita); _imposta(`${pref}-fg`, ws.testo); _imposta(`${pref}-acc`, ws.accento); _imposta(`${pref}-radius`, ws.bordoRaggio);
  });
  if (d.overlayCss != null) _imposta('ovl-css', d.overlayCss);
}

// Salva il look ATTUALE (completo) come template personale.
async function salvaComeTemplate() {
  const nome = (prompt(L('Nome del template:', 'Template name:', 'Nombre de la plantilla:')) || '').trim();
  if (!nome) return;
  const dati = { alerts: _raccogliAlerts(), chatOverlay: _raccogliChat(), overlayWidget: _raccogliWidget(), overlayCss: _v('ovl-css') || '' };
  const templates = (impostazioni().overlayTemplates || []).filter((t) => t.nome !== nome).concat([{ nome, dati }]).slice(-16);
  await salvaImpostazioni({ overlayTemplates: templates }, L('Template salvato ✓', 'Template saved ✓', 'Plantilla guardada ✓'));
  _rigeneraTemplateSelect(templates, nome);
}

async function eliminaTemplate() {
  const v = _v('ovl-tpl') || '';
  if (v[0] !== 'u') { toast(L('Puoi eliminare solo i template salvati da te.', 'You can only delete templates you saved.', 'Solo puedes eliminar plantillas que hayas guardado.')); return; }
  const templates = (impostazioni().overlayTemplates || []).slice();
  const i = Number(v.slice(1));
  if (!templates[i]) return;
  if (!confirm(L(`Eliminare il template "${templates[i].nome}"?`, `Delete the template "${templates[i].nome}"?`, `¿Eliminar la plantilla "${templates[i].nome}"?`))) return;
  templates.splice(i, 1);
  await salvaImpostazioni({ overlayTemplates: templates }, L('Template eliminato.', 'Template deleted.', 'Plantilla eliminada.'));
  _rigeneraTemplateSelect(templates);
}

// Ricostruisce le <option> del menu template (pronti + i miei).
function _rigeneraTemplateSelect(templates, selNome) {
  const sel = _g('ovl-tpl');
  if (!sel) return;
  const pronti = TEMPLATE_BUILTIN.map((t, i) => `<option value="b${i}">${esc(t.nome)}</option>`).join('');
  const miei = templates.map((t, i) => `<option value="u${i}"${t.nome === selNome ? ' selected' : ''}>${esc(t.nome)}</option>`).join('');
  sel.innerHTML = `<optgroup label="${L('Pronti', 'Ready-made', 'Listos')}">${pronti}</optgroup>` + (templates.length ? `<optgroup label="${L('I miei', 'Mine', 'Los míos')}">${miei}</optgroup>` : '');
}

// --- gestione PIÙ OVERLAY (ognuno un link + un layout) ------------------
async function caricaOverlays() {
  try { const d = await api('/api/streamer/overlays'); overlays = Array.isArray(d.overlays) ? d.overlays : []; }
  catch { overlays = []; }
  if (!overlays.length) overlays = [{ id: 'principale', nome: L('Overlay principale', 'Main overlay', 'Overlay principal'), mostra: { alert: true, chat: true, wf: true, ws: true, effetti: true }, xy: {}, url: '' }];
  if (!overlays.find((o) => o.id === overlaySel)) overlaySel = overlays[0].id;
  _rigeneraSelOverlay();
  caricaOverlaySel();
}
function _rigeneraSelOverlay() {
  const sel = _g('ov-sel'); if (!sel) return;
  sel.innerHTML = overlays.map((o) => `<option value="${esc(o.id)}"${o.id === overlaySel ? ' selected' : ''}>${esc(o.nome)}</option>`).join('');
}
// carica nell'editor il layout dell'overlay selezionato (posizioni + cosa mostra + link)
function caricaOverlaySel() {
  const ov = overlays.find((o) => o.id === overlaySel) || overlays[0];
  if (!ov) return;
  posXY = { alert: ov.xy?.alert || null, chat: ov.xy?.chat || null, wf: ov.xy?.wf || null, ws: ov.xy?.ws || null };
  ['alert', 'chat', 'wf', 'ws', 'effetti'].forEach((k) => { const c = _g('mostra-' + k); if (c) c.checked = ov.mostra?.[k] !== false; });
  const i = _g('inp-overlay-url'); if (i) i.value = ov.url || '';
  deseleziona();
  aggiornaAnteprima();
}
// payload "pulito" degli overlay per il salvataggio (senza url, che è calcolato)
function _overlaysPayload() {
  return overlays.map((o) => ({ id: o.id, nome: o.nome, mostra: o.mostra, xy: o.xy, css: o.css || '' }));
}
// salva il layout (posizioni + cosa mostra) dell'overlay selezionato
async function salvaLayoutOverlay(silenzioso) {
  const ov = overlays.find((o) => o.id === overlaySel);
  if (!ov) return;
  ov.xy = { alert: posXY.alert, chat: posXY.chat, wf: posXY.wf, ws: posXY.ws };
  ov.mostra = { alert: mostraChk('alert'), chat: mostraChk('chat'), wf: mostraChk('wf'), ws: mostraChk('ws'), effetti: mostraChk('effetti') };
  await salvaImpostazioni({ overlays: _overlaysPayload() }, silenzioso ? null : L('Overlay salvato ✓', 'Overlay saved ✓', 'Overlay guardado ✓'));
}
async function nuovoOverlay() {
  if (overlays.length >= 12) { toast(L('Massimo 12 overlay.', 'Maximum 12 overlays.', 'Máximo 12 overlays.')); return; }
  const nome = (prompt(L('Nome del nuovo overlay:', 'New overlay name:', 'Nombre del nuevo overlay:')) || '').trim();
  if (!nome) return;
  const id = 'ov' + Math.random().toString(36).slice(2, 8);
  overlays.push({ id, nome, mostra: { alert: true, chat: true, wf: true, ws: true, effetti: true }, xy: {}, css: '' });
  overlaySel = id;
  await salvaImpostazioni({ overlays: _overlaysPayload() }, null);
  await caricaOverlays();                 // ricarica per avere il link dal server
  toast(L('Overlay creato ✓', 'Overlay created ✓', 'Overlay creado ✓'));
}
async function rinominaOverlay() {
  const ov = overlays.find((o) => o.id === overlaySel); if (!ov) return;
  const nome = (prompt(L('Nuovo nome:', 'New name:', 'Nuevo nombre:'), ov.nome) || '').trim(); if (!nome) return;
  ov.nome = nome;
  await salvaImpostazioni({ overlays: _overlaysPayload() }, null);
  _rigeneraSelOverlay(); toast(L('Rinominato ✓', 'Renamed ✓', 'Renombrado ✓'));
}
async function eliminaOverlay() {
  if (overlays.length <= 1) { toast(L('Deve restare almeno un overlay.', 'At least one overlay must remain.', 'Debe quedar al menos un overlay.')); return; }
  const ov = overlays.find((o) => o.id === overlaySel); if (!ov) return;
  if (!confirm(L(`Eliminare l'overlay "${ov.nome}"? Il suo link OBS smetterà di funzionare.`, `Delete the overlay "${ov.nome}"? Its OBS link will stop working.`, `¿Eliminar el overlay "${ov.nome}"? Su enlace OBS dejará de funcionar.`))) return;
  overlays = overlays.filter((o) => o.id !== overlaySel);
  overlaySel = overlays[0].id;
  await salvaImpostazioni({ overlays: _overlaysPayload() }, null);
  await caricaOverlays();
  toast(L('Overlay eliminato.', 'Overlay deleted.', 'Overlay eliminado.'));
}

// Salva TUTTO l'overlay in un colpo: stile/testi (alert, chat, widget) + il
// layout (posizioni e "cosa mostra") dell'overlay selezionato.
async function salvaTuttoOverlay() {
  const ov = overlays.find((o) => o.id === overlaySel);
  if (ov) {
    ov.xy = { alert: posXY.alert, chat: posXY.chat, wf: posXY.wf, ws: posXY.ws };
    ov.mostra = { alert: mostraChk('alert'), chat: mostraChk('chat'), wf: mostraChk('wf'), ws: mostraChk('ws'), effetti: mostraChk('effetti') };
  }
  await salvaImpostazioni({
    alerts: _raccogliAlerts(), chatOverlay: _raccogliChat(), overlayWidget: _raccogliWidget(),
    overlays: _overlaysPayload(),
  }, null);
  toast(L('Overlay salvato ✓', 'Overlay saved ✓', 'Overlay guardado ✓'));
}

function caricaAlert() {
  const scheda = _g('scheda-alert');
  // posizioni libere iniziali (dal salvataggio) + elementi trascinabili
  const imp = impostazioni();
  posXY = { alert: imp.alerts.xy || null, chat: imp.chatOverlay.xy || null,
    wf: imp.overlayWidget.ultimoFollower.xy || null, ws: imp.overlayWidget.ultimoSub.xy || null };
  ['ap-alert', 'ap-chat', 'ap-wf', 'ap-ws'].forEach((id) => rendiTrascinabile(_g(id), id.replace('ap-', '')));
  // PIÙ OVERLAY: carica la lista, il selettore e il layout dell'overlay scelto
  caricaOverlays();
  _g('ov-sel')?.addEventListener('change', (e) => { overlaySel = e.target.value; caricaOverlaySel(); });
  _g('ov-nuovo')?.addEventListener('click', () => conErrore(() => nuovoOverlay()));
  _g('ov-rinomina')?.addEventListener('click', () => conErrore(() => rinominaOverlay()));
  _g('ov-elimina')?.addEventListener('click', () => conErrore(() => eliminaOverlay()));
  ['alert', 'chat', 'wf', 'ws', 'effetti'].forEach((k) => _g('mostra-' + k)?.addEventListener('change', () => { aggiornaAnteprima(); salvaLayoutOverlay(true); }));
  // «Modifica» su un elemento: apre la sua sezione (o va alla scheda Effetti)
  scheda?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-apri-sez]'); if (!b) return;
    const s = b.dataset.apriSez;
    if (s === 'effetti') { vaiAScheda('effetti'); return; }
    const det = _g(s);
    if (det) { det.open = true; det.scrollIntoView({ behavior: _menoMoto ? 'auto' : 'smooth', block: 'start' }); }
  });
  // inspector: cursori dimensione/rotazione dell'elemento selezionato
  _g('insp-size')?.addEventListener('input', (e) => {
    if (!selezione) return;
    const st = _statoXY(selezione); st.s = Math.max(30, Math.min(300, Number(e.target.value) || 100));
    _g('insp-size-val').textContent = st.s + '%'; _posElemento(_g('ap-' + selezione), st); _salvaPosDebounced(selezione);
  });
  _g('insp-rot')?.addEventListener('input', (e) => {
    if (!selezione) return;
    const st = _statoXY(selezione); st.r = Math.max(-180, Math.min(180, Number(e.target.value) || 0));
    _g('insp-rot-val').textContent = st.r + '°'; _posElemento(_g('ap-' + selezione), st); _salvaPosDebounced(selezione);
  });
  _g('insp-reset')?.addEventListener('click', () => {
    if (!selezione) return;
    const k = selezione; posXY[k] = null; aggiornaAnteprima(); aggiornaInspector(); _salvaPos(k);
  });
  // clic sul palco "vuoto" (non su un elemento) = deseleziona
  _g('ovl-preview')?.addEventListener('pointerdown', (e) => {
    if (e.target?.id === 'ovl-preview' || e.target?.id === 'ap-stage') deseleziona();
  });
  // anteprima dal vivo: qualsiasi cambiamento aggiorna la preview + le etichette dei range
  scheda?.addEventListener('input', (e) => {
    const t = e.target;
    if (t.type === 'range') {
      const s = _g(t.id + '-v'); if (s) s.textContent = t.value;
      if (t.classList.contains('al-vol')) { const v = t.closest('.alert-blocco')?.querySelector('.al-vol-v'); if (v) v.textContent = t.value; }
    }
    aggiornaAnteprima();
  });
  scheda?.addEventListener('change', () => aggiornaAnteprima());
  // scala il palco 16:9 in modo affidabile: un ResizeObserver riscala ogni volta
  // che il riquadro ottiene/cambia larghezza (anche quando la scheda diventa visibile).
  const canvas = _g('ovl-preview');
  if (canvas && !canvas._ro && typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => scalaAnteprima());
    ro.observe(canvas); canvas._ro = ro;
  }
  scalaAnteprima();
  aggiornaAnteprima();

  _g('al-salva')?.addEventListener('click', () => conErrore(() => salvaAlert()));
  _g('co-salva')?.addEventListener('click', () => conErrore(() => salvaChatOverlay()));
  _g('wid-salva')?.addEventListener('click', () => conErrore(() => salvaWidget()));
  _g('ovl-salva-tutto')?.addEventListener('click', () => conErrore(() => salvaTuttoOverlay()));
  // font Google: anteprima del nome scritto nel font stesso (più intuitivo)
  ['al-st-gfont', 'co-st-gfont'].forEach((id) => {
    const el = _g(id); if (!el) return;
    const upd = () => { el.style.fontFamily = fontGoogleDash(el.value) || ''; };
    el.addEventListener('input', upd); upd();
  });
  // "Sfoglia i font": apre l'elenco Google con ANTEPRIMA (ogni font nel suo font)
  document.querySelectorAll('.sfoglia-font').forEach((btn) => btn.addEventListener('click', () => {
    const box = _g(btn.dataset.box); if (!box) return;
    box.hidden = !box.hidden;
    btn.textContent = box.hidden ? 'Sfoglia i font' : '▲ Chiudi elenco';
    if (!box.hidden && !box._montato) { box._montato = true; montaFontBrowser(box, btn.dataset.target); }
  }));
  // ✕ = togli il font Google (torna al menu)
  document.querySelectorAll('.gfont-x').forEach((btn) => btn.addEventListener('click', () => {
    const inp = _g(btn.dataset.target); if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); }
  }));
  _g('css-salva')?.addEventListener('click', () => conErrore(() => salvaCss()));

  document.querySelectorAll('.al-prova').forEach((b) => b.addEventListener('click', () => conErrore(async () => {
    await salvaAlert(true); await api('/api/alert/prova', { method: 'POST', body: { kind: b.dataset.kind } }); toast(L('Inviato all\'overlay ▶', 'Sent to the overlay ▶', 'Enviado al overlay ▶'));
  })));
  // upload inline di suono / immagine-video direttamente dal blocco alert
  document.querySelectorAll('.al-btn-up').forEach((btn) => btn.addEventListener('click', () => {
    const inp = btn.parentElement.querySelector('.al-up'); if (inp) inp.click();
  }));
  document.querySelectorAll('.al-up').forEach((inp) => inp.addEventListener('change', () => conErrore(async () => {
    const blocco = inp.closest('.alert-blocco[data-alert]');
    const file = inp.files[0];
    if (blocco && file) await caricaMediaAlert(blocco.dataset.alert, inp.dataset.slot, file);
    inp.value = '';
  })));
  _g('co-prova')?.addEventListener('click', () => conErrore(async () => {
    await salvaChatOverlay(true); await api('/api/alert/prova', { method: 'POST', body: { kind: 'chat' } }); toast(L('Inviato all\'overlay ▶', 'Sent to the overlay ▶', 'Enviado al overlay ▶'));
  }));
  document.querySelectorAll('.w-prova').forEach((b) => b.addEventListener('click', () => conErrore(async () => {
    await salvaWidget(true); await api('/api/alert/prova', { method: 'POST', body: { kind: b.dataset.kind } }); toast(L('Inviato all\'overlay ▶', 'Sent to the overlay ▶', 'Enviado al overlay ▶'));
  })));

  _g('ovl-tpl-applica')?.addEventListener('click', () => {
    const v = _v('ovl-tpl') || '';
    const lista = v[0] === 'b' ? TEMPLATE_BUILTIN : (impostazioni().overlayTemplates || []);
    const t = lista[Number(v.slice(1))];
    if (t) { applicaTemplate(t.dati); toast(L('Template applicato — ricordati di salvare le sezioni.', 'Template applied — remember to save the sections.', 'Plantilla aplicada — recuerda guardar las secciones.')); }
  });
  _g('ovl-tpl-salva')?.addEventListener('click', () => conErrore(() => salvaComeTemplate()));
  _g('ovl-tpl-elimina')?.addEventListener('click', () => conErrore(() => eliminaTemplate()));
}

// --- scheda Regia (Vai live) --------------------------------------------

function pannelloRegia() {
  return pannello('regia', `
    <div class="carta evidenziata" id="regia-permessi-banner" hidden></div>

    <div class="carta">
      <h2>${_hIco(ICO.onda)}${L('Stato diretta', 'Stream status', 'Estado del directo')}</h2>
      <div id="regia-stato" class="regia-stato"><p class="vuoto">${L('Carico…', 'Loading…', 'Cargando…')}</p></div>
      <p class="spazio-sopra"><button type="button" class="btn secondario mini" id="regia-refresh">${_bIco(ICO.aggiorna)}${L('Aggiorna', 'Refresh', 'Actualizar')}</button></p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.scrivi)}${L('Info del canale', 'Channel info', 'Info del canal')}</h2>
      <p>${L('Imposta', 'Set the', 'Configura')} <strong>${L('titolo', 'title', 'título')}</strong>, <strong>${L('categoria', 'category', 'categoría')}</strong> ${L('e', 'and', 'y')} <strong>${L('tag', 'tags', 'etiquetas')}</strong> ${L('del canale — senza aprire Twitch o OBS. Vale anche da offline.', 'of the channel — without opening Twitch or OBS. Works offline too.', 'del canal — sin abrir Twitch ni OBS. Vale también sin estar en directo.')}</p>
      <label class="campo" for="regia-titolo">${L('Titolo della diretta', 'Stream title', 'Título del directo')}</label>
      <input type="text" id="regia-titolo" class="campo-largo" maxlength="140" placeholder="${L('Es. Ranked fino al Diamante!', 'e.g. Ranked to Diamond!', '¡Ej. Ranked hasta Diamante!')}">

      <label class="campo spazio-sopra">${L('Categoria / gioco', 'Category / game', 'Categoría / juego')}</label>
      <div class="regia-gioco-cur">${L('Ora:', 'Now:', 'Ahora:')} <strong id="regia-gioco-sel">—</strong></div>
      <div class="regia-gioco">
        <input type="text" id="regia-gioco-cerca" placeholder="${L('Cerca un gioco/categoria…', 'Search a game/category…', 'Busca un juego/categoría…')}" autocomplete="off">
        <div id="regia-gioco-lista" class="regia-gioco-lista" hidden></div>
      </div>

      <label class="campo spazio-sopra" for="regia-tags">${L('Tag', 'Tags', 'Etiquetas')} <span class="tenue">— ${L('separati da virgola, max 10', 'comma-separated, max 10', 'separadas por comas, máx. 10')}</span></label>
      <input type="text" id="regia-tags" class="campo-largo" placeholder="${L('italiano, chill, ranked', 'english, chill, ranked', 'español, chill, ranked')}">

      <p class="spazio-sopra"><button type="button" class="btn" id="regia-salva-canale">${L('Salva info canale', 'Save channel info', 'Guardar info del canal')}</button></p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.fulmine)}${L('Azioni rapide', 'Quick actions', 'Acciones rápidas')}</h2>
      <div class="regia-azioni">
        <button type="button" class="btn secondario" id="regia-clip">${_bIco(ICO.clip)}${L('Crea clip', 'Create clip', 'Crear clip')}</button>
        <div class="regia-riga">
          <input type="text" id="regia-marker-desc" placeholder="${L('Nota del marker (facoltativa)', 'Marker note (optional)', 'Nota del marcador (opcional)')}" maxlength="140">
          <button type="button" class="btn secondario" id="regia-marker">${_bIco(ICO.segnaposto)}Marker</button>
        </div>
        <div class="regia-riga" id="regia-ad-box">
          <select id="regia-ad-durata">
            <option value="30">30s</option><option value="60" selected>60s</option>
            <option value="90">90s</option><option value="120">120s</option>
            <option value="150">150s</option><option value="180">180s</option>
          </select>
          <button type="button" class="btn secondario" id="regia-ad">${_bIco(ICO.tv)}${L('Manda pubblicità', 'Run an ad', 'Lanzar anuncio')}</button>
        </div>
        <div class="regia-riga" id="regia-raid-box">
          <input type="text" id="regia-raid-canale" placeholder="${L('canale da raidare', 'channel to raid', 'canal a raidear')}" maxlength="30">
          <button type="button" class="btn secondario" id="regia-raid">${_bIco(ICO.freccia)}${L('Avvia raid', 'Start raid', 'Iniciar raid')}</button>
          <button type="button" class="btn secondario mini" id="regia-raid-annulla">${L('Annulla', 'Cancel', 'Cancelar')}</button>
        </div>
      </div>
      <p class="suggerimento spazio-sopra">${L('Clip e marker (e la pubblicità/raid) funzionano solo <strong>mentre sei in diretta</strong>. Il video della live lo fa ancora OBS — qui gestisci tutto il resto.', 'Clips and markers (and ads/raids) only work <strong>while you’re live</strong>. OBS still does the video — here you manage everything else.', 'Los clips y marcadores (y los anuncios/raids) solo funcionan <strong>mientras estás en directo</strong>. El vídeo sigue haciéndolo OBS — aquí gestionas todo lo demás.')}</p>
    </div>`);
}

let _regiaGameId = '';
let _regiaUptimeTimer = null;
let _regiaCercaTimer = null;

function _fmtUptime(startedAt) {
  if (!startedAt) return '';
  const ms = Date.now() - new Date(startedAt).getTime();
  if (!(ms >= 0)) return '';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const due = (n) => (n < 10 ? '0' : '') + n;
  return (h ? h + 'h ' : '') + (h ? due(m) : m) + 'm ' + due(ss) + 's';
}

function renderRegiaStato(live, ads) {
  const box = document.getElementById('regia-stato');
  if (!box) return;
  if (!live || !live.online) {
    box.innerHTML = `<div class="regia-badge off">● OFFLINE</div><p class="tenue spazio-sopra">${L('Non sei in diretta adesso. Titolo, categoria e tag puoi impostarli lo stesso.', 'You’re not live right now. You can still set the title, category and tags.', 'No estás en directo ahora. Igualmente puedes fijar título, categoría y etiquetas.')}</p>`;
    return;
  }
  let adInfo = '';
  if (ads && ads.nextAt) {
    const at = typeof ads.nextAt === 'number' ? ads.nextAt * 1000 : new Date(ads.nextAt).getTime();
    const secs = Math.round((at - Date.now()) / 1000);
    if (secs > 0) adInfo = `<div class="regia-metrica"><span>${L('Prossima pubblicità', 'Next ad', 'Próximo anuncio')}</span><strong>${Math.floor(secs / 60)}m ${secs % 60}s</strong></div>`;
  }
  box.innerHTML = `
    <div class="regia-badge live">● LIVE</div>
    <div class="regia-metriche">
      <div class="regia-metrica"><span>${L('Spettatori', 'Viewers', 'Espectadores')}</span><strong>${live.viewers ?? 0}</strong></div>
      <div class="regia-metrica"><span>${L('Da', 'For', 'Desde')}</span><strong id="regia-uptime">${esc(_fmtUptime(live.startedAt))}</strong></div>
      ${adInfo}
    </div>`;
}

async function caricaRegia() {
  const box = document.getElementById('regia-stato');
  if (!box) return;
  if (DEMO) {
    renderRegiaStato({ online: true, viewers: 128, startedAt: new Date(Date.now() - 5400000).toISOString() }, null);
    const sel = document.getElementById('regia-gioco-sel'); if (sel) sel.textContent = 'Just Chatting';
    return;
  }
  let d;
  try { d = await api('/api/streamer/regia'); } catch (e) { box.innerHTML = `<p class="vuoto">${L('Errore:', 'Error:', 'Error:')} ${esc(e.message)}</p>`; return; }

  // banner permessi mancanti → link per ri-concederli
  const p = d.permessi || {};
  const mancanti = [];
  if (!p.broadcast) mancanti.push(L('gestione canale (titolo/categoria/marker)', 'manage channel (title/category/marker)', 'gestión del canal (título/categoría/marcador)'));
  if (!p.raid) mancanti.push('raid');
  if (!p.commercial) mancanti.push(L('pubblicità', 'ads', 'anuncios'));
  const banner = document.getElementById('regia-permessi-banner');
  if (banner) {
    if (mancanti.length) {
      banner.hidden = false;
      banner.innerHTML = `<p>${_bIco(ICO.lucchetto)}${L('Per usare tutta la regia servono alcuni permessi non ancora concessi:', 'To use the full control room you need some permissions not yet granted:', 'Para usar toda la realización faltan algunos permisos:')} <strong>${esc(mancanti.join(', '))}</strong>.</p>
        <p class="spazio-sopra"><a class="btn" href="/auth/permessi">${L('Concedi i permessi', 'Grant permissions', 'Concede los permisos')}</a></p>`;
    } else banner.hidden = true;
  }

  renderRegiaStato(d.live, d.ads);
  clearInterval(_regiaUptimeTimer);
  if (d.live && d.live.online && d.live.startedAt) {
    _regiaUptimeTimer = setInterval(() => {
      const u = document.getElementById('regia-uptime');
      if (u) u.textContent = _fmtUptime(d.live.startedAt); else clearInterval(_regiaUptimeTimer);
    }, 1000);
  }

  const t = document.getElementById('regia-titolo'); if (t) t.value = d.canale?.title || '';
  const tags = document.getElementById('regia-tags'); if (tags) tags.value = (d.canale?.tags || []).join(', ');
  _regiaGameId = d.canale?.gameId || '';
  const sel = document.getElementById('regia-gioco-sel'); if (sel) sel.textContent = d.canale?.gameName || L('— nessuna —', '— none —', '— ninguna —');

  // nascondi le azioni per cui manca il permesso
  const adBox = document.getElementById('regia-ad-box'); if (adBox) adBox.style.display = p.commercial ? '' : 'none';
  const raidBox = document.getElementById('regia-raid-box'); if (raidBox) raidBox.style.display = p.raid ? '' : 'none';
}

async function cercaGiochiRegia() {
  const q = (document.getElementById('regia-gioco-cerca')?.value || '').trim();
  const lista = document.getElementById('regia-gioco-lista');
  if (!lista) return;
  if (q.length < 2) { lista.hidden = true; lista.innerHTML = ''; return; }
  try {
    const d = await api('/api/streamer/regia/giochi?q=' + encodeURIComponent(q));
    if (!d.giochi.length) { lista.hidden = false; lista.innerHTML = `<div class="rg-vuoto">${L('Nessun risultato', 'No results', 'Sin resultados')}</div>`; return; }
    lista.hidden = false;
    lista.innerHTML = d.giochi.map((g) => {
      const art = g.boxArt ? g.boxArt.replace('{width}', '40').replace('{height}', '53') : '';
      return `<button type="button" class="rg-opt" data-id="${esc(g.id)}" data-nome="${esc(g.name)}">${art ? `<img src="${esc(art)}" alt="">` : ''}<span>${esc(g.name)}</span></button>`;
    }).join('');
  } catch (e) { lista.hidden = false; lista.innerHTML = `<div class="rg-vuoto">${L('Errore:', 'Error:', 'Error:')} ${esc(e.message)}</div>`; }
}

async function salvaRegiaCanale() {
  if (DEMO) { toast(L('In demo non si salva — accedi per farlo davvero.', 'In demo nothing is saved — log in to do it for real.', 'En demo no se guarda — inicia sesión para hacerlo de verdad.')); return; }
  const titolo = document.getElementById('regia-titolo')?.value || '';
  const tagsRaw = document.getElementById('regia-tags')?.value || '';
  const tags = tagsRaw.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 10);
  const body = { titolo, tags };
  if (_regiaGameId) body.giocoId = _regiaGameId;
  await api('/api/streamer/regia/canale', { method: 'POST', body });
  toast(L('Info canale aggiornate ✓', 'Channel info updated ✓', 'Info del canal actualizada ✓'));
}

// --- scheda Studio Web (vai live dal browser, senza OBS) ----------------

function pannelloStudio() {
  return pannello('studio', `
    <div class="carta evidenziata" id="studio-permessi-banner" hidden></div>
    <div class="carta studio-carta studio-largo">
      <h2>${_hIco(ICO.onda)}${L('Studio Web — vai live senza OBS', 'Web Studio — go live without OBS', 'Estudio Web — emite sin OBS')}</h2>
      <p>${L('Un vero studio nel browser: crea', 'A real studio in the browser: create', 'Un estudio de verdad en el navegador: crea')} <strong>${L('scene', 'scenes', 'escenas')}</strong>, ${L('aggiungi', 'add', 'añade')} <strong>${L('fonti', 'sources', 'fuentes')}</strong> (${L('webcam, schermo, immagini, video, testo, overlay), spostale e ridimensionale sul palco, regola l\'<strong>audio</strong> e vai in diretta su Twitch. Il video parte da qui: <strong>tieni aperta questa scheda</strong> mentre trasmetti.', 'webcam, screen, images, video, text, overlay), move and resize them on the stage, tune the <strong>audio</strong> and go live on Twitch. The video comes from here: <strong>keep this tab open</strong> while you broadcast.', 'webcam, pantalla, imágenes, vídeo, texto, overlay), muévelas y rediméntalas en el escenario, ajusta el <strong>audio</strong> y emite en Twitch. El vídeo sale de aquí: <strong>mantén esta pestaña abierta</strong> mientras transmites.')}</p>

      ${miniGuida({
        titolo: L('Tutorial rapido: la tua prima diretta dallo Studio', 'Quick tutorial: your first Studio broadcast', 'Tutorial rápido: tu primer directo desde el Estudio'),
        passi: [
          L('<strong>1. Ingressi & qualità</strong>: scegli fotocamera, microfono e qualità (fino a <strong>2K</strong>). Se scegli una cam e resta nera, prova «Aggiorna dispositivi» e riseleziona.', '<strong>1. Inputs & quality</strong>: pick camera, microphone and quality (up to <strong>2K</strong>). If a cam stays black, hit “Refresh devices” and reselect.', '<strong>1. Entradas y calidad</strong>: elige cámara, micrófono y calidad (hasta <strong>2K</strong>). Si una cam se queda en negro, pulsa «Actualizar dispositivos» y vuelve a seleccionar.'),
          L('<strong>2. Aggiungi fonti</strong> (webcam, schermo, testo…) e sistemale sul palco trascinando gli angoli, oppure premi un <strong>layout rapido</strong>.', '<strong>2. Add sources</strong> (webcam, screen, text…) and arrange them on the stage by dragging the corners, or press a <strong>quick layout</strong>.', '<strong>2. Añade fuentes</strong> (webcam, pantalla, texto…) y colócalas en el escenario arrastrando las esquinas, o pulsa un <strong>diseño rápido</strong>.'),
          L('<strong>3. Overlay</strong>: aggiungi la fonte «Overlay» per avere a schermo <strong>alert, chat ed effetti</strong> a punti canale (è lo stesso overlay che useresti in OBS).', '<strong>3. Overlay</strong>: add the “Overlay” source to get <strong>alerts, chat and channel-point effects</strong> on screen (it’s the same overlay you’d use in OBS).', '<strong>3. Overlay</strong>: añade la fuente «Overlay» para tener en pantalla <strong>alertas, chat y efectos</strong> de puntos de canal (es el mismo overlay que usarías en OBS).'),
          L('<strong>4. Audio</strong>: dal <strong>mixer</strong> regola i volumi (microfono, video, effetti) e controlla che le barre si muovano.', '<strong>4. Audio</strong>: from the <strong>mixer</strong> adjust the volumes (microphone, video, effects) and check the bars are moving.', '<strong>4. Audio</strong>: desde el <strong>mezclador</strong> ajusta los volúmenes (micrófono, vídeo, efectos) y comprueba que las barras se muevan.'),
          L('<strong>5. Vai live</strong> e <strong>lascia aperta questa scheda</strong>: se la chiudi, la diretta si interrompe.', '<strong>5. Go live</strong> and <strong>leave this tab open</strong>: if you close it, the stream stops.', '<strong>5. Emitir</strong> y <strong>deja esta pestaña abierta</strong>: si la cierras, el directo se corta.'),
        ],
        note: [
          L('Vuoi più spazio? Con «<strong>Layout libero</strong>» sposti i pannelli dove vuoi; «Reimposta layout» rimette tutto in ordine.', 'Want more room? With “<strong>Free layout</strong>” you move the panels wherever you want; “Reset layout” puts everything back.', '¿Quieres más espacio? Con «<strong>Diseño libre</strong>» mueves los paneles donde quieras; «Restablecer diseño» lo deja todo en orden.'),
        ],
      })}

      <!-- scene: come le "scene" di OBS, si cambia al volo -->
      <div class="studio-scene" id="studio-scene"></div>
      <!-- preset: salva/richiama un intero set di scene con un nome -->
      <div class="studio-preset" id="studio-preset"></div>
      <!-- controlli layout (contenitore separato: renderStudioPreset sovrascrive #studio-preset) -->
      <div class="studio-layout-ctrl">
        <button type="button" class="btn secondario mini" id="studio-libero-btn" data-libero="toggle" title="${L('Sposta liberamente i pannelli (e il palco) dove vuoi', 'Freely move the panels (and the stage) wherever you want', 'Mueve libremente los paneles (y el escenario) donde quieras')}">${_bIco(ICO.sposta || ICO.righello || ICO.piu)}${L('Layout libero', 'Free layout', 'Diseño libre')}</button>
        <button type="button" class="btn secondario mini" data-libero="reset" title="${L('Rimetti i pannelli in ordine', 'Reset panels to the default order', 'Restablecer paneles')}">${L('Reimposta layout', 'Reset layout', 'Restablecer diseño')}</button>
      </div>

      <div class="studio-griglia" id="studio-griglia">
        <!-- palco: canvas pulito + livello UI (selezione/trascinamento) sopra -->
        <div class="studio-palco-wrap">
          <span class="studio-palco-drag" title="${L('Trascina il palco', 'Drag the stage', 'Arrastra el escenario')}">⠿ ${L('palco', 'stage', 'escenario')}</span>
          <div class="studio-palco" id="studio-palco">
            <canvas id="studio-canvas" width="1280" height="720"></canvas>
            <div class="studio-ui" id="studio-ui"></div>
            <div id="studio-badge-live" class="studio-badge-live" hidden>● LIVE <span id="studio-timer">00:00</span></div>
          </div>
          <div class="studio-layouts" id="studio-layouts">
            <span class="studio-mini-tit">${L('Layout rapidi', 'Quick layouts', 'Diseños rápidos')}</span>
            <button type="button" class="btn secondario mini" data-layout="cam">${L('Solo webcam', 'Webcam only', 'Solo webcam')}</button>
            <button type="button" class="btn secondario mini" data-layout="schermo">${L('Solo schermo', 'Screen only', 'Solo pantalla')}</button>
            <button type="button" class="btn secondario mini" data-layout="pip">${L('Schermo + webcam', 'Screen + webcam', 'Pantalla + webcam')}</button>
            <button type="button" class="btn secondario mini" data-layout="affianco">${L('Affiancati', 'Side by side', 'Lado a lado')}</button>
          </div>
        </div>

        <!-- colonna di destra: ingressi/qualità/overlay, aggiungi fonti, elenco, proprietà, mixer, chat -->
        <aside class="studio-side">
          <div class="studio-box studio-io">
            <div class="studio-box-tit">${_bIco(ICO.sliders)}${L('Ingressi & qualità', 'Inputs & quality', 'Entradas y calidad')}</div>
            <label class="campo" for="studio-cam-sel">${L('Fotocamera', 'Camera', 'Cámara')}</label>
            <select id="studio-cam-sel" class="campo-largo"></select>
            <label class="campo spazio-sopra" for="studio-mic-sel">${L('Microfono', 'Microphone', 'Micrófono')}</label>
            <select id="studio-mic-sel" class="campo-largo"></select>
            <label class="campo spazio-sopra" for="studio-qual-sel">${L('Qualità della diretta', 'Stream quality', 'Calidad del directo')}</label>
            <select id="studio-qual-sel" class="campo-largo"></select>
            <label class="campo spazio-sopra" for="studio-ov-sel">${L('Overlay da mostrare', 'Overlay to show', 'Overlay a mostrar')}</label>
            <select id="studio-ov-sel" class="campo-largo"></select>
            <button type="button" class="btn secondario mini spazio-sopra" data-io="aggiorna">${_bIco(ICO.ricarica || ICO.aggiorna || ICO.piu)}${L('Aggiorna dispositivi', 'Refresh devices', 'Actualizar dispositivos')}</button>
          </div>

          <div class="studio-box">
            <div class="studio-box-tit">${_bIco(ICO.piu)}${L('Aggiungi una fonte', 'Add a source', 'Añade una fuente')}</div>
            <div class="studio-add">
              <button type="button" class="btn secondario mini" data-add="webcam">${_bIco(ICO.fotocamera)}Webcam</button>
              <button type="button" class="btn secondario mini" data-add="schermo">${_bIco(ICO.monitor)}${L('Schermo', 'Screen', 'Pantalla')}</button>
              <button type="button" class="btn secondario mini" data-add="immagine">${_bIco(ICO.immagine)}${L('Immagine', 'Image', 'Imagen')}</button>
              <button type="button" class="btn secondario mini" data-add="video">${_bIco(ICO.video)}Video</button>
              <button type="button" class="btn secondario mini" data-add="testo">${_bIco(ICO.testo)}${L('Testo', 'Text', 'Texto')}</button>
              <button type="button" class="btn secondario mini" data-add="overlay">${_bIco(ICO.effetti)}Overlay</button>
            </div>
          </div>

          <div class="studio-box">
            <div class="studio-box-tit">${_bIco(ICO.lista)}${L('Fonti della scena', 'Scene sources', 'Fuentes de la escena')} <span class="tenue">(${L('la prima è dietro', 'the first is at the back', 'la primera está detrás')})</span></div>
            <ul class="studio-fonti" id="studio-fonti"></ul>
          </div>

          <div class="studio-box" id="studio-prop-box" hidden>
            <div class="studio-box-tit">${_bIco(ICO.righello)}${L('Proprietà', 'Properties', 'Propiedades')}</div>
            <div id="studio-prop"></div>
          </div>

          <div class="studio-box">
            <div class="studio-box-tit">${_bIco(ICO.sliders)}${L('Mixer audio', 'Audio mixer', 'Mezclador de audio')}</div>
            <div id="studio-mixer"></div>
          </div>

          <div class="studio-box">
            <div class="studio-box-tit">${_bIco(ICO.moduli)}${L('Chat live', 'Live chat', 'Chat en directo')} <span class="tenue">(${L('con emote', 'with emotes', 'con emotes')})</span></div>
            <div id="studio-chat" class="studio-chat"></div>
          </div>
        </aside>
      </div>

      <div class="studio-vai spazio-sopra">
        <button type="button" class="btn grande" id="studio-live">${_bIco(ICO.onda)}${L('VAI LIVE', 'GO LIVE', 'EMITIR')}</button>
        <button type="button" class="btn secondario" id="studio-ferma" hidden>${_bIco(ICO.stop)}${L('Ferma diretta', 'Stop stream', 'Detener directo')}</button>
        <span id="studio-stato" class="suggerimento"></span>
      </div>

      <p class="suggerimento spazio-sopra">${L('Perfetto per <strong>just-chatting / webcam</strong>. Per i giochi ad alta qualità/frame rate OBS resta migliore. Alert, chat ed effetti a punti canale compaiono nella fonte <strong>Overlay</strong>.', 'Perfect for <strong>just-chatting / webcam</strong>. For high-quality/high-frame-rate gaming OBS is still better. Alerts, chat and channel-point effects appear in the <strong>Overlay</strong> source.', 'Perfecto para <strong>just-chatting / webcam</strong>. Para juegos de alta calidad/frame rate OBS sigue siendo mejor. Las alertas, el chat y los efectos de puntos de canal aparecen en la fuente <strong>Overlay</strong>.')}</p>
    </div>
    <input type="file" id="studio-file" accept="image/*,video/*" hidden>`);
}

// stato del motore studio (lato browser)
// Motore Studio: modello "vero studio" simile a OBS —
//   Scene → Fonti (webcam, schermo, immagine, video, testo, overlay).
// Ogni fonte ha una trasformazione (x,y,w,h in coordinate del palco 1280×720),
// visibilità e ordine (l'ordine nell'array = z-order: la prima è dietro).
// Le catture (webcam/schermo/mic) sono GLOBALI e condivise tra le scene.
// Preset di qualità: la RISOLUZIONE è la dimensione del canvas (ffmpeg fa
// passthrough lato server); più risoluzione/fps ⇒ più bitrate. Le chiavi devono
// combaciare con QUALITA in src/features/studio.js. "2K" = 1440p. Il sistema di
// coordinate del palco resta SEMPRE logico 1280×720 (le fonti non cambiano):
// il canvas viene solo scalato al output scelto in studioDisegna.
const STUDIO_QUAL = {
  '720p30':  { w: 1280, h: 720,  fps: 30, vbps: 4500000 },
  '1080p30': { w: 1920, h: 1080, fps: 30, vbps: 6000000 },
  '1080p60': { w: 1920, h: 1080, fps: 60, vbps: 8000000 },
  '1440p30': { w: 2560, h: 1440, fps: 30, vbps: 9000000 },
  '1440p60': { w: 2560, h: 1440, fps: 60, vbps: 12000000 },
};

const STUDIO = {
  cap: { camStream: null, camEl: null, scrStream: null, scrEl: null, micStream: null },
  media: {},               // dataId → { el, tipo, url } per immagini/video caricati
  scene: [],               // [{ id, nome, fonti: [fonte…] }]
  attiva: 0,               // indice della scena attiva
  sel: null,               // id della fonte selezionata sul palco
  _n: 1,                   // contatore per id univoci
  canvas: null, ctx: null, raf: 0,
  audio: null, rec: null, live: false, startedAt: 0, timer: 0,
  coda: [], inviando: false,
  overlay: { alert: null, chat: [], fx: [] },
  sse: null,
  mix: { master: { vol: 100, mute: false }, mic: { vol: 100, mute: false }, desk: { vol: 100, mute: false }, media: { vol: 100, mute: false }, sfx: { vol: 100, mute: false } },
  vuRaf: 0, libero: false,
  drag: null, addTipo: null, _wired: false,
  // NEW: ingressi selezionabili, qualità, overlay scelto, chat+emote
  qual: '720p30',
  dev: { cams: [], mics: [], camId: '', micId: '', facing: '' },   // dispositivi audio/video
  ov: { list: [], sel: '', mostra: null, xy: null, key: '' },       // overlay dell'Overlay Studio
  emote: {},               // codice → url (7TV globali+canale), da /overlay/<login>/emotes
  emoteImg: {},            // url → HTMLImageElement precaricata (per il canvas)
  chatFeed: [],            // pannello chat live (DOM): [{user,colore,tokens}]
};

// Etichetta del tipo di fonte, risolta al momento della creazione (non a load).
const studioEtichetta = (tipo) => ({ webcam: 'Webcam', schermo: L('Schermo', 'Screen', 'Pantalla'), immagine: L('Immagine', 'Image', 'Imagen'), video: 'Video', testo: L('Testo', 'Text', 'Texto'), overlay: 'Overlay' }[tipo] || tipo);
const studioClamp = (v, a, b) => Math.max(a, Math.min(b, v));
function studioSceneAttiva() { return STUDIO.scene[STUDIO.attiva] || null; }
function studioTrovaFonte(id) { const s = studioSceneAttiva(); return s ? s.fonti.find((f) => f.id === id) : null; }
function studioIcoFonte(tipo) { return { webcam: 'fotocamera', schermo: 'monitor', immagine: 'immagine', video: 'video', testo: 'testo', overlay: 'effetti' }[tipo] || 'moduli'; }
function studioNuovaScena(nome) { const s = { id: 's' + (STUDIO._n++), nome: nome || ('Scena ' + (STUDIO.scene.length + 1)), fonti: [] }; STUDIO.scene.push(s); return s; }

function studioLog(m) { const el = document.getElementById('studio-stato'); if (el) el.textContent = m; }

function avviaLoopStudio() {
  if (!STUDIO.canvas) { STUDIO.canvas = document.getElementById('studio-canvas'); STUDIO.ctx = STUDIO.canvas ? STUDIO.canvas.getContext('2d') : null; }
  if (STUDIO.ctx && !STUDIO.raf) studioDisegna();
}

// Disegna la scena attiva: ogni fonte visibile, dalla più dietro alla più avanti.
// Il palco è SEMPRE in coordinate logiche 1280×720; il canvas può però avere una
// risoluzione di output più alta (1080p/2K): scaliamo il contesto una volta per
// frame così tutto il resto del codice continua a ragionare in 1280×720.
function studioDisegna() {
  const c = STUDIO.ctx; if (!c) { STUDIO.raf = 0; return; }
  const cw = STUDIO.canvas.width, ch = STUDIO.canvas.height;
  c.setTransform(cw / 1280, 0, 0, ch / 720, 0, 0);   // reset+scala (niente accumulo)
  c.fillStyle = '#0b0b0f'; c.fillRect(0, 0, 1280, 720);
  const s = studioSceneAttiva();
  if (s) for (const f of s.fonti) { if (f.visibile) disegnaFonte(c, f, 1280, 720); }
  STUDIO.raf = requestAnimationFrame(studioDisegna);
}

// "cover": riempie il riquadro ritagliando l'eccesso (webcam/schermo/video).
function studioCover(c, el, x, y, w, h) {
  const vw = el.videoWidth || el.naturalWidth, vh = el.videoHeight || el.naturalHeight; if (!vw) return;
  const r = Math.max(w / vw, h / vh), dw = vw * r, dh = vh * r;
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  try { c.drawImage(el, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); } catch (e) { /* frame non pronto */ }
  c.restore();
}
// "contain": mostra tutta l'immagine dentro il riquadro (loghi/immagini).
function studioContain(c, el, x, y, w, h) {
  const vw = el.videoWidth || el.naturalWidth, vh = el.videoHeight || el.naturalHeight; if (!vw) return;
  const r = Math.min(w / vw, h / vh), dw = vw * r, dh = vh * r;
  try { c.drawImage(el, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); } catch (e) { /* niente */ }
}

function disegnaFonte(c, f, W, H) {
  if (f.tipo === 'webcam') { if (STUDIO.cap.camEl) studioCover(c, STUDIO.cap.camEl, f.x, f.y, f.w, f.h); return; }
  if (f.tipo === 'schermo') { if (STUDIO.cap.scrEl) studioCover(c, STUDIO.cap.scrEl, f.x, f.y, f.w, f.h); return; }
  if (f.tipo === 'immagine') { const m = STUDIO.media[f.dataId]; if (m) studioContain(c, m.el, f.x, f.y, f.w, f.h); return; }
  if (f.tipo === 'video') { const m = STUDIO.media[f.dataId]; if (m) studioCover(c, m.el, f.x, f.y, f.w, f.h); return; }
  if (f.tipo === 'testo') { disegnaTestoFonte(c, f); return; }
  if (f.tipo === 'overlay') { disegnaOverlayStudio(c, W, H); return; }
}

function disegnaTestoFonte(c, f) {
  if (f.sfondo) { c.fillStyle = f.sfondo; c.fillRect(f.x, f.y, f.w, f.h); }
  const dim = Number(f.dim) || 48;
  c.font = (f.grassetto ? '800 ' : '600 ') + dim + 'px system-ui, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = Math.max(3, dim / 10); c.strokeStyle = '#000a';
  const cx = f.x + f.w / 2, cy = f.y + f.h / 2, mw = f.w * 0.96;
  c.strokeText(f.testo || '', cx, cy, mw);
  c.fillStyle = f.colore || '#fff'; c.fillText(f.testo || '', cx, cy, mw);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
}

function disegnaOverlayStudio(c, W, H) {
  const now = Date.now(), ov = STUDIO.overlay, mostra = STUDIO.ov.mostra;
  // se ho letto il "tema" dell'overlay scelto, rispetto cosa mostrare; altrimenti tutto
  const puoi = (k) => !mostra || mostra[k] !== false;

  // effetti (immagini/video a schermo)
  ov.fx = ov.fx.filter((f) => f.until > now);
  if (puoi('effetti')) for (const f of ov.fx) {
    const el = f.el; const vw = el && (el.videoWidth || el.naturalWidth), vh = el && (el.videoHeight || el.naturalHeight);
    if (!vw) continue;
    const scale = (W * 0.35) / vw, w = vw * scale, h = vh * scale;
    const x = (f.x != null ? f.x / 100 * W : W / 2) - w / 2;
    const y = (f.y != null ? f.y / 100 * H : H / 2) - h / 2;
    try { c.drawImage(el, x, y, w, h); } catch (e) { /* niente */ }
  }

  // chat a schermo CON EMOTE (posizione dal tema dell'overlay, se presente)
  ov.chat = ov.chat.filter((m) => m.until > now);
  if (puoi('chat')) {
    const chat = ov.chat.slice(-6);
    const cxy = STUDIO.ov.xy && STUDIO.ov.xy.chat;
    const baseX = (cxy && cxy.x != null) ? cxy.x / 100 * W : 24;
    const baseY = (cxy && cxy.y != null) ? cxy.y / 100 * H : H - 28;
    chat.forEach((m, i) => {
      const y = baseY - (chat.length - 1 - i) * 32;
      studioDisegnaRigaChat(c, baseX, y, m, W - baseX - 24);
    });
  }

  // alert
  if (ov.alert && ov.alert.until <= now) ov.alert = null;
  else if (ov.alert && puoi('alert')) {
    const a = ov.alert;
    c.textAlign = 'center'; c.textBaseline = 'top'; c.font = '800 40px system-ui, sans-serif';
    c.lineWidth = 6; c.strokeStyle = '#000b'; c.strokeText(a.testo, W / 2, 40, W * 0.9);
    c.fillStyle = a.colore || '#fff'; c.fillText(a.testo, W / 2, 40, W * 0.9);
    if (a.el && (a.el.naturalWidth || a.el.videoWidth)) {
      const vw = a.el.videoWidth || a.el.naturalWidth, vh = a.el.videoHeight || a.el.naturalHeight;
      const scale = (W * 0.26) / vw, w = vw * scale, h = vh * scale;
      try { c.drawImage(a.el, (W - w) / 2, 96, w, h); } catch (e) { /* niente */ }
    }
    c.textAlign = 'left';
  }
}

// Disegna UNA riga di chat sul canvas: "utente: " + testo con EMOTE inline
// (immagini 7TV/Twitch precaricate). Le emote non pronte ricadono sul testo.
function studioDisegnaRigaChat(c, x, y, m, maxW) {
  const eh = 26;
  c.textAlign = 'left'; c.textBaseline = 'bottom';
  let cx = x;
  const txt = (s, colore, peso) => {
    c.font = (peso || '600') + ' 22px system-ui, sans-serif';
    c.lineWidth = 4; c.strokeStyle = '#000a'; c.strokeText(s, cx, y);
    c.fillStyle = colore; c.fillText(s, cx, y);
    cx += c.measureText(s).width;
  };
  if (m.user) txt(m.user + ': ', m.colore || '#c9a6ff', '700');
  const toks = (m.tokens && m.tokens.length) ? m.tokens : [{ t: 'txt', v: m.testo || '' }];
  for (const tok of toks) {
    if (cx - x > maxW) break;
    if (tok.t === 'emote') {
      const img = STUDIO.emoteImg[tok.v];
      if (img && img.complete && (img.naturalWidth || img.width)) {
        const w = eh * ((img.naturalWidth || img.width) / (img.naturalHeight || img.height || 1));
        try { c.drawImage(img, cx, y - eh, w, eh); } catch (e) { /* niente */ }
        cx += w + 4;
      } else txt((tok.raw || '') + ' ', '#fff');
    } else txt(tok.v, '#fff');
  }
}

// Spezza il testo in token testo/emote usando le emote 7TV del canale (STUDIO.emote)
// e quelle NATIVE Twitch del messaggio (emotiTwitch). Precarica le immagini emote.
function studioTokenizza(testo, emotiTwitch) {
  const pezzi = String(testo || '').split(/(\s+)/);
  const tokens = []; let buf = '';
  const flush = () => { if (buf) { tokens.push({ t: 'txt', v: buf }); buf = ''; } };
  for (const p of pezzi) {
    if (!p) continue;
    const url = (!/\s/.test(p)) && ((emotiTwitch && emotiTwitch[p]) || STUDIO.emote[p]);
    if (url) { flush(); tokens.push({ t: 'emote', v: url, raw: p }); studioPrecaricaEmote(url); }
    else buf += p;
  }
  flush();
  return tokens;
}

function studioPrecaricaEmote(url) {
  if (!url || STUDIO.emoteImg[url]) return;
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url;
  STUDIO.emoteImg[url] = img;
}

// instrada un audio (effetto/alert) nel mix in diretta (così lo sentono anche gli
// spettatori) e lo fa sentire allo streamer. Fuori diretta: play locale semplice.
function suonaStudioSfx(url, volume) {
  try {
    const el = new Audio(url); el.crossOrigin = 'anonymous';
    if (volume != null) el.volume = Math.max(0, Math.min(1, Number(volume) / 100));
    const A = STUDIO.audio;
    if (A) { try { const s = A.ac.createMediaElementSource(el); s.connect(A.gSfx); s.connect(A.ac.destination); } catch (e) { /* niente */ } }
    el.play().catch(() => {});
  } catch (e) { /* niente */ }
}

// suono PRESET sintetizzato (presets.js): in diretta lo instradiamo nel mixer
// (gSfx → stream) e nel monitor locale; fuori diretta suona sugli altoparlanti.
function studioSuonaPreset(nome, volume) {
  try {
    const P = window.SUONI_PRESET; if (!P || !nome) return;
    const A = STUDIO.audio;
    const destino = A ? { ac: A.ac, nodi: [A.gSfx, A.ac.destination] } : null;
    P.suona(nome, volume != null ? volume : 100, destino);
  } catch (e) { /* niente */ }
}

// aggiunge una riga al PANNELLO chat dello Studio (DOM, con emote come <img>)
function studioChatPanelPush(d) {
  const box = document.getElementById('studio-chat'); if (!box) return;
  const attaccato = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  const riga = document.createElement('div'); riga.className = 'studio-chat-riga';
  if (d.badge7tv) { const b = document.createElement('img'); b.className = 'studio-chat-badge'; b.src = d.badge7tv; b.alt = ''; riga.appendChild(b); }
  const u = document.createElement('span'); u.className = 'studio-chat-user';
  u.textContent = (d.user || '') + ': '; if (d.colore) u.style.color = d.colore;
  riga.appendChild(u);
  for (const tok of studioTokenizza(d.testo, d.emotiTwitch)) {
    if (tok.t === 'emote') { const img = document.createElement('img'); img.className = 'studio-chat-emote'; img.src = tok.v; img.alt = tok.raw || ''; img.loading = 'lazy'; riga.appendChild(img); }
    else riga.appendChild(document.createTextNode(tok.v));
  }
  box.appendChild(riga);
  while (box.childNodes.length > 80) box.removeChild(box.firstChild);
  if (attaccato) box.scrollTop = box.scrollHeight;   // auto-scroll solo se già in fondo
}

function studioSSE(sseUrl) {
  if (STUDIO.sse) { try { STUDIO.sse.close(); } catch (e) { /* niente */ } }
  let es; try { es = new EventSource(sseUrl); } catch (e) { return; }
  STUDIO.sse = es;
  es.onmessage = (ev) => {
    let d; try { d = JSON.parse(ev.data); } catch { return; }
    const now = Date.now();
    if (d.tipo === 'immagine' || d.tipo === 'video') {
      const el = document.createElement(d.tipo === 'video' ? 'video' : 'img');
      el.crossOrigin = 'anonymous'; el.src = d.url;
      if (d.tipo === 'video') { el.muted = true; el.autoplay = true; el.playsInline = true; el.play().catch(() => {}); }
      const pos = d.posizione || {};
      STUDIO.overlay.fx.push({ el, until: now + (Number(d.durata) || 5000), x: pos.x, y: pos.y });
      if (d.suonoUrl) suonaStudioSfx(d.suonoUrl, d.volume);
    } else if (d.tipo === 'audio') {
      if (d.url) suonaStudioSfx(d.url, d.volume);
    } else if (d.tipo === 'preset') {
      studioSuonaPreset(d.suono || d.preset, d.volume);
    } else if (d.tipo === 'alert') {
      const a = { testo: String(d.testo || ''), colore: d.colore, until: now + (Number(d.durata) || 6000) };
      if (d.mediaUrl) {
        const el = document.createElement(d.mediaTipo === 'video' ? 'video' : 'img'); el.crossOrigin = 'anonymous'; el.src = d.mediaUrl;
        if (d.mediaTipo === 'video') { el.muted = true; el.autoplay = true; el.playsInline = true; el.play().catch(() => {}); }
        a.el = el;
      }
      STUDIO.overlay.alert = a;
      if (d.suonoUrl) suonaStudioSfx(d.suonoUrl, d.volume);
      else if (d.suono) studioSuonaPreset(d.suono, d.volume);   // alert con suono PRESET
    } else if (d.tipo === 'chat') {
      // chat "a schermo" dell'overlay: la disegniamo sul canvas con le emote
      STUDIO.overlay.chat.push({ user: d.user || '', colore: d.colore, testo: String(d.testo || ''), tokens: studioTokenizza(d.testo, d.emotiTwitch), until: now + 12000 });
    } else if (d.tipo === 'chat_raw') {
      // feed ungated: alimenta SOLO il pannello chat dello Studio
      studioChatPanelPush(d);
    }
  };
}

// --- catture globali (condivise tra le scene) --------------------------------

// Vincoli video: risoluzione/fps dalla qualità scelta + dispositivo selezionato
// (deviceId) o, su mobile, fotocamera anteriore/posteriore (facingMode). Le
// webcam raramente superano il 1080p: chiediamo al MASSIMO 1080p come "ideale"
// — con un deviceId `exact`, un ideale troppo alto (es. 2K) su certe fotocamere
// restituisce un frame nero. Sono comunque valori "ideal", quindi la cam sceglie
// il modo migliore che riesce a fare.
function studioVincoliVideo() {
  const q = STUDIO_QUAL[STUDIO.qual] || STUDIO_QUAL['720p30'];
  const hh = Math.min(q.h, 1080), ww = Math.round(hh * 16 / 9);
  const v = { width: { ideal: ww }, height: { ideal: hh }, frameRate: { ideal: Math.min(q.fps, 60) } };
  if (STUDIO.dev.camId) v.deviceId = { exact: STUDIO.dev.camId };
  else if (STUDIO.dev.facing) v.facingMode = STUDIO.dev.facing;
  return v;
}

async function studioCapWebcam() {
  if (DEMO) { toast(L('In demo la webcam non parte — accedi per farlo davvero.', 'In demo the webcam won’t start — log in to do it for real.', 'En demo la webcam no arranca — inicia sesión para hacerlo de verdad.')); return false; }
  if (STUDIO.cap.camEl) return true;
  try {
    STUDIO.cap.camStream = await navigator.mediaDevices.getUserMedia({ video: studioVincoliVideo(), audio: false });
    const v = document.createElement('video'); v.srcObject = STUDIO.cap.camStream; v.muted = true; v.playsInline = true; await v.play().catch(() => {});
    STUDIO.cap.camEl = v; avviaLoopStudio(); studioPopolaDispositivi(); return true;
  } catch (e) { toast(L('Webcam non disponibile: ', 'Webcam not available: ', 'Webcam no disponible: ') + e.message, 'errore'); return false; }
}

// Cambia la fotocamera in uso (dropdown "Ingressi"). ACQUISISCE PRIMA il nuovo
// stream, POI ferma il vecchio: così se il nuovo fallisce (cam occupata, non
// disponibile, permesso negato) NON restiamo con uno stream morto → niente
// schermo nero. In caso di errore ripristina la fotocamera precedente.
async function studioCambiaCamera(camId) {
  const precedente = STUDIO.dev.camId;
  STUDIO.dev.camId = camId || '';
  if (!STUDIO.cap.camEl) { studioPopolaDispositivi(); return; }   // webcam non ancora attiva: il valore si userà all'attivazione
  const vecchioStream = STUDIO.cap.camStream;
  try {
    const nuovo = await navigator.mediaDevices.getUserMedia({ video: studioVincoliVideo(), audio: false });
    STUDIO.cap.camStream = nuovo;
    STUDIO.cap.camEl.srcObject = nuovo;
    await STUDIO.cap.camEl.play().catch(() => {});
    try { vecchioStream && vecchioStream.getTracks().forEach((t) => t.stop()); } catch (e) { /* niente */ }
    studioPopolaDispositivi();
  } catch (e) {
    // ripristina la fotocamera precedente: niente schermo nero
    STUDIO.dev.camId = precedente || '';
    try { if (vecchioStream) { STUDIO.cap.camStream = vecchioStream; STUDIO.cap.camEl.srcObject = vecchioStream; STUDIO.cap.camEl.play().catch(() => {}); } } catch (e2) { /* niente */ }
    const cs = document.getElementById('studio-cam-sel'); if (cs) cs.value = STUDIO.dev.camId;
    toast(L('Questa fotocamera non è disponibile o è già in uso da un\'altra app.', 'This camera is unavailable or already in use by another app.', 'Esta cámara no está disponible o ya está en uso por otra app.'), 'errore');
  }
}

async function studioCapSchermo() {
  if (DEMO) { toast(L('In demo la condivisione non parte', 'In demo sharing won’t start', 'En demo la compartición no arranca')); return false; }
  try {
    const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
    STUDIO.cap.scrStream = s;
    const v = document.createElement('video'); v.srcObject = new MediaStream(s.getVideoTracks()); v.muted = true; v.playsInline = true; await v.play().catch(() => {});
    STUDIO.cap.scrEl = v;
    s.getVideoTracks()[0].addEventListener('ended', () => {
      STUDIO.cap.scrEl = null; STUDIO.cap.scrStream = null;
      STUDIO.scene.forEach((sc) => { sc.fonti = sc.fonti.filter((f) => f.tipo !== 'schermo'); });
      renderStudioTutto();
    });
    if (STUDIO.live) collegaAudioCatture();
    avviaLoopStudio(); return true;
  } catch (e) { if (e.name !== 'NotAllowedError') toast(L('Condivisione non riuscita: ', 'Sharing failed: ', 'Compartición fallida: ') + e.message, 'errore'); return false; }
}

async function studioCapMic() {
  if (DEMO) { toast(L('In demo il microfono non parte', 'In demo the microphone won’t start', 'En demo el micrófono no arranca')); return false; }
  if (STUDIO.cap.micStream) return true;
  try {
    const a = STUDIO.dev.micId ? { deviceId: { exact: STUDIO.dev.micId } } : true;
    STUDIO.cap.micStream = await navigator.mediaDevices.getUserMedia({ audio: a, video: false });
    if (STUDIO.live) collegaAudioCatture();
    renderStudioMixer(); studioPopolaDispositivi(); toast(L('Microfono attivo', 'Microphone active', 'Micrófono activo')); return true;
  } catch (e) { toast(L('Microfono non disponibile: ', 'Microphone not available: ', 'Micrófono no disponible: ') + e.message, 'errore'); return false; }
}

// Cambia il microfono in uso: ACQUISISCE PRIMA il nuovo stream, poi rilascia il
// vecchio e ricollega il nodo audio al mixer se siamo in diretta. In caso di
// errore ripristina il microfono precedente (niente audio muto imprevisto).
async function studioCambiaMic(micId) {
  const precedente = STUDIO.dev.micId;
  STUDIO.dev.micId = micId || '';
  if (!STUDIO.cap.micStream) { studioPopolaDispositivi(); return; }
  const vecchio = STUDIO.cap.micStream;
  try {
    const nuovo = await navigator.mediaDevices.getUserMedia({ audio: STUDIO.dev.micId ? { deviceId: { exact: STUDIO.dev.micId } } : true, video: false });
    const A = STUDIO.audio;
    try { A && A.micNode && A.micNode.disconnect(); } catch (e) { /* niente */ }
    STUDIO.cap.micStream = nuovo;
    try { vecchio.getTracks().forEach((t) => t.stop()); } catch (e) { /* niente */ }
    if (A) { A.micNode = null; collegaAudioCatture(); applicaMix(); }
    studioPopolaDispositivi();
  } catch (e) {
    STUDIO.dev.micId = precedente || '';
    const ms = document.getElementById('studio-mic-sel'); if (ms) ms.value = STUDIO.dev.micId;
    toast(L('Questo microfono non è disponibile o è già in uso.', 'This microphone is unavailable or already in use.', 'Este micrófono no está disponible o ya está en uso.'), 'errore');
  }
}

// --- ingressi (dispositivi), qualità, overlay, emote -------------------------

// Enumera fotocamere e microfoni e popola i due <select> "Ingressi". Le
// etichette diventano leggibili solo DOPO un primo getUserMedia concesso: per
// questo lo richiamiamo dopo aver attivato webcam/mic.
async function studioPopolaDispositivi() {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const dev = await navigator.mediaDevices.enumerateDevices();
    STUDIO.dev.cams = dev.filter((d) => d.kind === 'videoinput');
    STUDIO.dev.mics = dev.filter((d) => d.kind === 'audioinput');
    const riempi = (sel, lista, valore, etichettaDefault) => {
      if (!sel) return;
      sel.innerHTML = `<option value="">${etichettaDefault}</option>` +
        lista.map((d, i) => `<option value="${esc(d.deviceId)}"${d.deviceId === valore ? ' selected' : ''}>${esc(d.label || (etichettaDefault + ' ' + (i + 1)))}</option>`).join('');
    };
    riempi(document.getElementById('studio-cam-sel'), STUDIO.dev.cams, STUDIO.dev.camId, L('Fotocamera predefinita', 'Default camera', 'Cámara predeterminada'));
    riempi(document.getElementById('studio-mic-sel'), STUDIO.dev.mics, STUDIO.dev.micId, L('Microfono predefinito', 'Default microphone', 'Micrófono predeterminado'));
  } catch (e) { /* niente */ }
}

// Applica un preset di qualità: cambia la risoluzione del CANVAS (l'output della
// diretta). Non si può cambiare mentre si è in diretta (romperebbe la traccia).
function studioApplicaQualita(key) {
  if (STUDIO.live) return;
  STUDIO.qual = STUDIO_QUAL[key] ? key : '720p30';
  const q = STUDIO_QUAL[STUDIO.qual];
  if (!STUDIO.canvas) { STUDIO.canvas = document.getElementById('studio-canvas'); STUDIO.ctx = STUDIO.canvas ? STUDIO.canvas.getContext('2d') : null; }
  if (STUDIO.canvas) { STUDIO.canvas.width = q.w; STUDIO.canvas.height = q.h; }
  try { localStorage.setItem('andrybot-studio-qual:' + (stato?.user?.login || 'anon'), STUDIO.qual); } catch (e) { /* niente */ }
}

// Carica la mappa emote del canale (7TV globali+canale) per la chat.
async function studioCaricaEmote() {
  if (DEMO) return;
  const login = stato?.user?.login; if (!login) return;
  try {
    const r = await fetch(`/overlay/${encodeURIComponent(login)}/emotes`, { credentials: 'same-origin' });
    if (r.ok) { const m = await r.json(); if (m && typeof m === 'object') STUDIO.emote = m; }
  } catch (e) { /* niente */ }
}

// Carica l'elenco degli overlay dello streamer (Overlay Studio) e popola il
// <select> di scelta. Il primo diventa quello attivo di default.
async function studioCaricaOverlays() {
  if (DEMO) return;
  try {
    const d = await api('/api/streamer/overlays');
    STUDIO.ov.list = Array.isArray(d.overlays) ? d.overlays : [];
    const sel = document.getElementById('studio-ov-sel');
    if (sel) {
      sel.innerHTML = STUDIO.ov.list.map((o) => `<option value="${esc(o.id)}">${esc(o.nome || 'Overlay')}</option>`).join('')
        || `<option value="">${L('— nessun overlay —', '— no overlay —', '— sin overlay —')}</option>`;
      if (STUDIO.ov.list.length) { if (!STUDIO.ov.sel || !STUDIO.ov.list.some((o) => o.id === STUDIO.ov.sel)) STUDIO.ov.sel = STUDIO.ov.list[0].id; sel.value = STUDIO.ov.sel; }
    }
    await studioConnettiOverlay();
  } catch (e) { /* niente */ }
}

// (Ri)connette il feed SSE all'overlay selezionato e ne legge il "tema"
// (cosa mostrare / posizioni) così il canvas rispetta quell'overlay.
async function studioConnettiOverlay() {
  if (DEMO) return;
  try {
    const ov = await api('/api/streamer/overlay-url');
    if (!ov.overlayUrl) return;
    // overlayUrl = .../overlay/<login>?key=K → SSE = .../overlay/<login>/stream?key=K[&o=id]
    let sseUrl = ov.overlayUrl.replace('?key=', '/stream?key=');
    const id = STUDIO.ov.sel;
    if (id) sseUrl += (sseUrl.includes('?') ? '&' : '?') + 'o=' + encodeURIComponent(id);
    studioSSE(sseUrl);
    // tema dell'overlay scelto: mostra/xy (quali widget e dove)
    const meta = STUDIO.ov.list.find((o) => o.id === id);
    if (meta) { STUDIO.ov.mostra = meta.mostra || null; STUDIO.ov.xy = meta.xy || null; }
  } catch (e) { /* niente */ }
}

// --- aggiunta e gestione delle fonti -----------------------------------------
function studioDefaultTrasf(tipo) {
  const W = 1280, H = 720;
  if (tipo === 'schermo' || tipo === 'overlay') return { x: 0, y: 0, w: W, h: H };
  if (tipo === 'webcam') { const w = 384, h = 216; return { x: W - w - 28, y: H - h - 28, w, h }; }
  if (tipo === 'testo') return { x: 140, y: 560, w: 1000, h: 110 };
  return { x: (W - 640) / 2, y: (H - 360) / 2, w: 640, h: 360 };
}

function studioAddFonte(tipo, extra) {
  const s = studioSceneAttiva(); if (!s) return null;
  if (tipo === 'overlay' && s.fonti.some((f) => f.tipo === 'overlay')) { toast(L('L\'overlay è già nella scena.', 'The overlay is already in the scene.', 'El overlay ya está en la escena.')); return null; }
  const f = { id: 'f' + (STUDIO._n++), tipo, nome: studioEtichetta(tipo), visibile: true, ...studioDefaultTrasf(tipo), ...(extra || {}) };
  if (tipo === 'testo') { f.testo = f.testo || 'Testo'; f.colore = '#ffffff'; f.dim = 56; f.grassetto = true; f.sfondo = ''; }
  s.fonti.push(f); STUDIO.sel = f.id; renderStudioTutto();
  return f;
}

async function studioAggiungi(tipo) {
  if (tipo === 'webcam') { if (await studioCapWebcam()) studioAddFonte('webcam'); return; }
  if (tipo === 'schermo') { if (await studioCapSchermo()) studioAddFonte('schermo'); return; }
  if (tipo === 'immagine' || tipo === 'video') { studioScegliFile(tipo); return; }
  studioAddFonte(tipo);   // testo, overlay
}

function studioScegliFile(tipo) {
  const inp = document.getElementById('studio-file'); if (!inp) return;
  inp.accept = tipo === 'video' ? 'video/*' : 'image/*';
  STUDIO.addTipo = tipo; inp.value = ''; inp.click();
}

function studioFileScelto(file) {
  const tipo = STUDIO.addTipo; if (!file || !tipo) return;
  const url = URL.createObjectURL(file), dataId = 'm' + (STUDIO._n++);
  const el = document.createElement(tipo === 'video' ? 'video' : 'img');
  if (tipo === 'video') { el.muted = true; el.loop = true; el.playsInline = true; el.autoplay = true; el.src = url; el.play().catch(() => {}); }
  else el.src = url;
  STUDIO.media[dataId] = { el, tipo, url };
  studioAddFonte(tipo, { dataId, nome: (file.name || tipo).slice(0, 22) });
  if (tipo === 'video' && STUDIO.live) { collegaAudioMedia(); renderStudioMixer(); }   // in diretta: instrada subito l'audio del nuovo video
}

function studioSpostaFonte(id, dir) {
  const s = studioSceneAttiva(); if (!s) return;
  const i = s.fonti.findIndex((f) => f.id === id); if (i < 0) return;
  const j = i + dir; if (j < 0 || j >= s.fonti.length) return;
  const t = s.fonti[i]; s.fonti[i] = s.fonti[j]; s.fonti[j] = t; renderStudioTutto();
}

function studioRimuoviFonte(id) {
  const s = studioSceneAttiva(); if (!s) return;
  s.fonti = s.fonti.filter((f) => f.id !== id);
  if (STUDIO.sel === id) STUDIO.sel = null;
  renderStudioTutto();
}

function studioFit(mode) {
  const f = studioTrovaFonte(STUDIO.sel); if (!f) return;
  if (mode === 'riempi') { f.x = 0; f.y = 0; f.w = 1280; f.h = 720; }
  else if (mode === 'centra') { f.x = (1280 - f.w) / 2; f.y = (720 - f.h) / 2; }
  renderStudioTutto();
}

// Layout rapidi: dispone (e mostra/nasconde) le fonti webcam/schermo già presenti.
function studioLayout(preset) {
  const s = studioSceneAttiva(); if (!s) return;
  const cam = s.fonti.find((f) => f.tipo === 'webcam'), scr = s.fonti.find((f) => f.tipo === 'schermo');
  const pieno = (f) => { f.x = 0; f.y = 0; f.w = 1280; f.h = 720; f.visibile = true; };
  if (preset === 'cam') { if (cam) pieno(cam); if (scr) scr.visibile = false; }
  else if (preset === 'schermo') { if (scr) pieno(scr); if (cam) cam.visibile = false; }
  else if (preset === 'pip') {
    if (scr) pieno(scr);
    if (cam) { cam.visibile = true; cam.w = 384; cam.h = 216; cam.x = 1280 - 384 - 28; cam.y = 720 - 216 - 28; const i = s.fonti.indexOf(cam); if (i >= 0) { s.fonti.splice(i, 1); s.fonti.push(cam); } }
  } else if (preset === 'affianco') {
    if (scr) { scr.visibile = true; scr.x = 20; scr.y = 150; scr.w = 760; scr.h = 428; }
    if (cam) { cam.visibile = true; cam.x = 800; cam.y = 150; cam.w = 460; cam.h = 428; }
  }
  renderStudioTutto();
}

// --- audio: mixer con guadagni per canale + master + VU-meter ----------------
// Grafo: mic/schermo/effetti → gMaster → dest (traccia audio della diretta).
// Un AnalyserNode per canale (post-fader) alimenta i VU-meter. I suoni SFX/preset
// hanno anche un monitor locale diretto (in suonaStudioSfx/studioSuonaPreset).
function studioAudioInit() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  const dest = ac.createMediaStreamDestination();
  const gMaster = ac.createGain();
  const gMic = ac.createGain(), gDesk = ac.createGain(), gSfx = ac.createGain(), gMedia = ac.createGain();
  gMic.connect(gMaster); gDesk.connect(gMaster); gSfx.connect(gMaster); gMedia.connect(gMaster);
  gMaster.connect(dest);
  const mkAn = () => { const a = ac.createAnalyser(); a.fftSize = 256; a.smoothingTimeConstant = 0.6; return a; };
  const an = { mic: mkAn(), desk: mkAn(), sfx: mkAn(), media: mkAn(), master: mkAn() };
  gMic.connect(an.mic); gDesk.connect(an.desk); gSfx.connect(an.sfx); gMedia.connect(an.media); gMaster.connect(an.master);
  STUDIO.audio = { ac, dest, gMaster, gMic, gDesk, gSfx, gMedia, micNode: null, deskNode: null, mediaConnessi: new Set(), an };
  collegaAudioCatture(); collegaAudioMedia(); applicaMix(); avviaVU();
  return dest.stream;
}

function collegaAudioCatture() {
  const A = STUDIO.audio; if (!A) return;
  try { if (!A.micNode && STUDIO.cap.micStream && STUDIO.cap.micStream.getAudioTracks().length) { A.micNode = A.ac.createMediaStreamSource(STUDIO.cap.micStream); A.micNode.connect(A.gMic); } } catch (e) { /* niente */ }
  try { if (!A.deskNode && STUDIO.cap.scrStream && STUDIO.cap.scrStream.getAudioTracks().length) { A.deskNode = A.ac.createMediaStreamSource(new MediaStream(STUDIO.cap.scrStream.getAudioTracks())); A.deskNode.connect(A.gDesk); } } catch (e) { /* niente */ }
}

// Instrada l'audio dei VIDEO aggiunti come fonte nel canale "Media" del mix, così
// lo sentono anche gli spettatori. Usa captureStream (ricreabile a ogni diretta,
// senza il limite "una volta sola" di createMediaElementSource). Il video suona
// anche in locale (elemento non mutato); il fader Media regola solo la diretta.
function collegaAudioMedia() {
  const A = STUDIO.audio; if (!A || !A.gMedia || !A.mediaConnessi) return;
  for (const id of Object.keys(STUDIO.media)) {
    const m = STUDIO.media[id];
    if (!m || m.tipo !== 'video' || !m.el || A.mediaConnessi.has(id)) continue;
    try {
      const cap = m.el.captureStream ? m.el.captureStream() : (m.el.mozCaptureStream ? m.el.mozCaptureStream() : null);
      if (!cap || !cap.getAudioTracks().length) { A.mediaConnessi.add(id); continue; }   // video senza audio
      m.el.muted = false; m.el.volume = 1;   // suona in locale e viene catturato per lo stream
      A.ac.createMediaStreamSource(cap).connect(A.gMedia);
      A.mediaConnessi.add(id);
    } catch (e) { /* niente */ }
  }
}

function applicaMix() {
  const A = STUDIO.audio, m = STUDIO.mix; if (!A) return;
  A.gMic.gain.value = m.mic.mute ? 0 : m.mic.vol / 100;
  A.gDesk.gain.value = m.desk.mute ? 0 : m.desk.vol / 100;
  A.gSfx.gain.value = m.sfx.mute ? 0 : m.sfx.vol / 100;
  if (A.gMedia) A.gMedia.gain.value = m.media.mute ? 0 : m.media.vol / 100;
  if (A.gMaster) A.gMaster.gain.value = m.master.mute ? 0 : m.master.vol / 100;
}

// VU-meter: legge il livello (picco) di ogni canale dall'analyser e aggiorna le
// barre. Gira solo in diretta (grafo audio presente); si ferma da solo allo stop.
function avviaVU() {
  const A = STUDIO.audio; if (!A || !A.an) return;
  cancelAnimationFrame(STUDIO.vuRaf || 0);
  const buf = new Uint8Array(A.an.master.fftSize);
  const livello = (an) => { an.getByteTimeDomainData(buf); let picco = 0; for (let i = 0; i < buf.length; i++) { const v = Math.abs(buf[i] - 128) / 128; if (v > picco) picco = v; } return Math.min(1, picco * 1.4); };
  const tick = () => {
    if (!STUDIO.audio || !STUDIO.live) { STUDIO.vuRaf = 0; return; }
    const an = STUDIO.audio.an;
    for (const k of ['mic', 'desk', 'media', 'sfx', 'master']) {
      const bar = document.querySelector(`.mix-vu-barra[data-vu="${k}"]`);
      if (bar && an[k]) bar.style.width = Math.round(livello(an[k]) * 100) + '%';
    }
    STUDIO.vuRaf = requestAnimationFrame(tick);
  };
  STUDIO.vuRaf = requestAnimationFrame(tick);
}

async function avviaLive() {
  if (STUDIO.live) return;
  if (stato?.ruolo === 'moderatore') { toast(L('Solo il proprietario del canale può andare in diretta.', 'Only the channel owner can go live.', 'Solo el propietario del canal puede emitir.'), 'errore'); return; }
  const s = studioSceneAttiva();
  if (!s || !s.fonti.some((f) => f.visibile)) { toast(L('Aggiungi almeno una fonte visibile alla scena.', 'Add at least one visible source to the scene.', 'Añade al menos una fuente visible a la escena.'), 'errore'); return; }
  studioLog(L('Avvio…', 'Starting…', 'Iniciando…'));
  const q = STUDIO_QUAL[STUDIO.qual] || STUDIO_QUAL['720p30'];
  studioApplicaQualita(STUDIO.qual);   // assicura che il canvas sia alla risoluzione scelta
  try { await api('/api/studio/start', { method: 'POST', body: { quality: STUDIO.qual } }); }
  catch (e) { studioLog('' + e.message); toast(L('Non riuscito: ', 'Failed: ', 'No se pudo: ') + e.message, 'errore'); return; }
  avviaLoopStudio();
  const vstream = STUDIO.canvas.captureStream(q.fps);
  const astream = studioAudioInit();
  const combined = new MediaStream([...vstream.getVideoTracks(), ...astream.getAudioTracks()]);
  const mimeOk = (t) => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } };
  const mime = mimeOk('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : (mimeOk('video/webm') ? 'video/webm' : '');
  let rec;
  try { rec = new MediaRecorder(combined, mime ? { mimeType: mime, videoBitsPerSecond: q.vbps, audioBitsPerSecond: 160000 } : undefined); }
  catch (e) { studioLog(L('registrazione non supportata dal browser', 'recording not supported by the browser', 'grabación no soportada por el navegador')); toast(L('Il browser non supporta la registrazione video.', 'The browser doesn’t support video recording.', 'El navegador no soporta la grabación de vídeo.'), 'errore'); await api('/api/studio/stop', { method: 'POST' }).catch(() => {}); return; }
  rec.ondataavailable = (e) => { if (e.data && e.data.size) { STUDIO.coda.push(e.data); drenaCodaStudio(); } };
  rec.start(1000);
  STUDIO.rec = rec; STUDIO.live = true; STUDIO.startedAt = Date.now();
  studioRenderIO();   // blocca il cambio qualità durante la diretta
  document.getElementById('studio-live').hidden = true;
  document.getElementById('studio-ferma').hidden = false;
  const badge = document.getElementById('studio-badge-live'); if (badge) badge.hidden = false;
  STUDIO.timer = setInterval(aggiornaTimerStudio, 1000);
  studioLog(L('In diretta su Twitch!', 'Live on Twitch!', '¡En directo en Twitch!'));
}

async function drenaCodaStudio() {
  if (STUDIO.inviando) return;
  STUDIO.inviando = true;
  while (STUDIO.coda.length && STUDIO.live) {
    const blob = STUDIO.coda.shift();
    try {
      const buf = await blob.arrayBuffer();
      await fetch('/api/studio/chunk', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: buf });
    } catch (e) { /* pezzo perso: si continua */ }
  }
  STUDIO.inviando = false;
}

async function fermaLive() {
  if (!STUDIO.live) return;
  STUDIO.live = false;
  try { STUDIO.rec && STUDIO.rec.stop(); } catch (e) { /* niente */ }
  clearInterval(STUDIO.timer);
  try { await api('/api/studio/stop', { method: 'POST' }); } catch (e) { /* niente */ }
  try { STUDIO.audio && STUDIO.audio.ac.close(); } catch (e) { /* niente */ }
  STUDIO.audio = null; STUDIO.coda = []; STUDIO.inviando = false;
  // ri-muta i video sorgente (anteprima silenziosa fuori diretta)
  for (const id in STUDIO.media) { const mm = STUDIO.media[id]; if (mm && mm.tipo === 'video' && mm.el) { try { mm.el.muted = true; } catch (e) { /* niente */ } } }
  document.getElementById('studio-live').hidden = false;
  document.getElementById('studio-ferma').hidden = true;
  const badge = document.getElementById('studio-badge-live'); if (badge) badge.hidden = true;
  studioRenderIO();   // riabilita il cambio qualità
  studioLog(L('Diretta terminata.', 'Stream ended.', 'Directo finalizado.'));
}

function aggiornaTimerStudio() {
  const el = document.getElementById('studio-timer'); if (!el) return;
  const s = Math.max(0, Math.floor((Date.now() - STUDIO.startedAt) / 1000));
  el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

async function caricaStudio() {
  if (!STUDIO.scene.length) studioNuovaScena('Scena 1');
  // qualità salvata (per canale) → dimensiona subito il canvas
  try { const q = localStorage.getItem('andrybot-studio-qual:' + (stato?.user?.login || 'anon')); if (q && STUDIO_QUAL[q]) STUDIO.qual = q; } catch (e) { /* niente */ }
  studioApplicaQualita(STUDIO.qual);
  avviaLoopStudio();      // mostra il palco + le fonti in anteprima
  renderStudioTutto();
  studioRenderIO();       // selettori ingressi/qualità/overlay + pannello chat
  studioInitRiordino();   // pannelli laterali trascinabili (ordine salvato)
  // blindatura: i moderatori NON avviano la diretta (userebbero la stream key
  // del proprietario). Il blocco vero è lato server; qui lo rendiamo evidente.
  const modStudio = stato?.ruolo === 'moderatore';
  const btnLive = document.getElementById('studio-live');
  if (btnLive) { btnLive.disabled = modStudio; if (modStudio) btnLive.title = L('Solo il proprietario del canale può andare in diretta.', 'Only the channel owner can go live.', 'Solo el propietario del canal puede emitir.'); }
  if (modStudio) studioLog(L('Come moderatore puoi preparare scene, fonti e overlay, ma la diretta la avvia solo il proprietario del canale.', 'As a moderator you can set up scenes, sources and overlays, but only the channel owner can start the stream.', 'Como moderador puedes preparar escenas, fuentes y overlays, pero solo el propietario del canal puede iniciar el directo.'));
  if (DEMO) { if (!modStudio) studioLog(L('Anteprima demo: qui crei scene, aggiungi fonti e vai in diretta senza OBS.', 'Demo preview: here you create scenes, add sources and go live without OBS.', 'Vista previa demo: aquí creas escenas, añades fuentes y emites sin OBS.')); return; }
  try {
    const d = await api('/api/studio');
    const banner = document.getElementById('studio-permessi-banner');
    if (banner) {
      if (!d.keyOk) {
        banner.hidden = false;
        banner.innerHTML = '<p>' + _bIco(ICO.lucchetto) + 'Per andare live dallo Studio serve il permesso <strong>stream key</strong> (non ancora concesso).</p><p class="spazio-sopra"><a class="btn" href="/auth/permessi">Concedi i permessi</a></p>';
      } else banner.hidden = true;
    }
    // selettore qualità popolato dalle qualità note al server
    if (Array.isArray(d.qualita) && d.qualita.length) {
      const qs = document.getElementById('studio-qual-sel');
      if (qs) { qs.innerHTML = d.qualita.map((q) => `<option value="${esc(q.id)}"${q.id === STUDIO.qual ? ' selected' : ''}>${esc(q.etichetta)}</option>`).join(''); }
    }
  } catch (e) { /* niente */ }
  // ingressi (dispositivi), overlay (SSE + tema), mappa emote per la chat
  try { await studioPopolaDispositivi(); } catch (e) { /* niente */ }
  try { await studioCaricaEmote(); } catch (e) { /* niente */ }
  try { await studioCaricaOverlays(); } catch (e) { /* niente */ }
  studioRenderIO();
}

// Sincronizza i selettori "Ingressi & qualità" con lo stato (valori correnti +
// blocca il cambio qualità mentre si è in diretta, che romperebbe la traccia).
function studioRenderIO() {
  const qs = document.getElementById('studio-qual-sel');
  if (qs) {
    if (!qs.options.length) {   // fallback client (demo/offline) finché non arriva la lista dal server
      const et = { '720p30': '720p 30fps', '1080p30': '1080p 30fps', '1080p60': '1080p 60fps', '1440p30': '2K (1440p) 30fps', '1440p60': '2K (1440p) 60fps' };
      qs.innerHTML = Object.keys(STUDIO_QUAL).map((k) => `<option value="${k}">${et[k] || k}</option>`).join('');
    }
    qs.disabled = STUDIO.live; if (STUDIO.qual) qs.value = STUDIO.qual;
  }
  const cs = document.getElementById('studio-cam-sel'); if (cs && STUDIO.dev.camId) cs.value = STUDIO.dev.camId;
  const ms = document.getElementById('studio-mic-sel'); if (ms && STUDIO.dev.micId) ms.value = STUDIO.dev.micId;
  const os = document.getElementById('studio-ov-sel'); if (os && STUDIO.ov.sel) os.value = STUDIO.ov.sel;
}

// --- pannelli riarrangiabili (trascina per riordinare la colonna strumenti) --
// Chiave stabile di ogni box (in base a un elemento interno riconoscibile), così
// possiamo salvarne/ripristinarne l'ordine anche se l'HTML non ha id sui box.
function studioBoxKey(box) {
  if (!box) return '';
  if (box.id === 'studio-prop-box') return 'prop';
  if (box.classList.contains('studio-io')) return 'io';
  if (box.querySelector('#studio-fonti')) return 'fonti';
  if (box.querySelector('#studio-mixer')) return 'mixer';
  if (box.querySelector('#studio-chat')) return 'chat';
  if (box.querySelector('[data-add]')) return 'add';
  return '';
}
function studioOrdineKey() { try { return 'andrybot-studio-ord:' + (stato?.user?.login || 'anon'); } catch (e) { return 'andrybot-studio-ord:anon'; } }
function studioSalvaOrdinePannelli() {
  const side = document.querySelector('.studio-side'); if (!side) return;
  const ord = [...side.querySelectorAll(':scope > .studio-box')].map((b) => b.dataset.boxOrd).filter(Boolean);
  try { localStorage.setItem(studioOrdineKey(), JSON.stringify(ord)); } catch (e) { /* niente */ }
}
function studioApplicaOrdinePannelli() {
  const side = document.querySelector('.studio-side'); if (!side) return;
  let ord; try { ord = JSON.parse(localStorage.getItem(studioOrdineKey())); } catch (e) { ord = null; }
  if (!Array.isArray(ord) || !ord.length) return;
  for (const key of ord) { const b = side.querySelector(`:scope > .studio-box[data-box-ord="${key}"]`); if (b) side.appendChild(b); }
}
// --- layout libero: palco e pannelli flottanti trascinabili ovunque ----------
function studioLiberoKey() { try { return 'andrybot-studio-poslib:' + (stato?.user?.login || 'anon'); } catch (e) { return 'andrybot-studio-poslib:anon'; } }
function studioLiberoModeKey() { try { return 'andrybot-studio-libero:' + (stato?.user?.login || 'anon'); } catch (e) { return 'andrybot-studio-libero:anon'; } }
function studioElemKey(el) { return el.classList.contains('studio-palco-wrap') ? 'palco' : (el.dataset.boxOrd || studioBoxKey(el)); }
function studioElementiLibero() {
  const g = document.getElementById('studio-griglia'); if (!g) return [];
  return [g.querySelector('.studio-palco-wrap'), ...g.querySelectorAll('.studio-side > .studio-box')].filter(Boolean);
}
function studioLeggiPosLibero() { try { return JSON.parse(localStorage.getItem(studioLiberoKey())); } catch (e) { return null; } }
function studioSalvaPosLibero() {
  const g = document.getElementById('studio-griglia'); if (!g) return;
  const gr = g.getBoundingClientRect(); const pos = {};
  for (const el of studioElementiLibero()) { const r = el.getBoundingClientRect(); pos[studioElemKey(el)] = { x: Math.round(r.left - gr.left), y: Math.round(r.top - gr.top) }; }
  try { localStorage.setItem(studioLiberoKey(), JSON.stringify(pos)); } catch (e) { /* niente */ }
}
function studioAggiornaAltezzaLibero() {
  const g = document.getElementById('studio-griglia'); if (!g || !g.classList.contains('libero')) return;
  const gr = g.getBoundingClientRect(); let maxB = 0;
  for (const el of studioElementiLibero()) { const r = el.getBoundingClientRect(); maxB = Math.max(maxB, r.bottom - gr.top); }
  g.style.minHeight = (maxB + 24) + 'px';
}
function studioApplicaLibero() {
  const g = document.getElementById('studio-griglia'); if (!g) return;
  // "congela" le posizioni attuali (layout a colonna) prima di passare a flottante
  const gr = g.getBoundingClientRect(); const correnti = new Map();
  for (const el of studioElementiLibero()) { const r = el.getBoundingClientRect(); correnti.set(el, { x: r.left - gr.left, y: r.top - gr.top }); }
  g.classList.add('libero');
  const salvate = studioLeggiPosLibero();
  for (const el of studioElementiLibero()) {
    const p = (salvate && salvate[studioElemKey(el)]) || correnti.get(el) || { x: 0, y: 0 };
    el.style.left = Math.max(0, p.x) + 'px'; el.style.top = Math.max(0, p.y) + 'px';
  }
  studioAggiornaAltezzaLibero();
}
function studioTogliLibero() {
  const g = document.getElementById('studio-griglia'); if (!g) return;
  g.classList.remove('libero'); g.style.minHeight = '';
  for (const el of studioElementiLibero()) { el.style.left = ''; el.style.top = ''; }
}
function studioToggleLibero() {
  STUDIO.libero = !STUDIO.libero;
  try { localStorage.setItem(studioLiberoModeKey(), STUDIO.libero ? '1' : '0'); } catch (e) { /* niente */ }
  if (STUDIO.libero) studioApplicaLibero(); else studioTogliLibero();
  const btn = document.getElementById('studio-libero-btn'); if (btn) btn.classList.toggle('attivo', STUDIO.libero);
}
function studioResetLibero() {
  try { localStorage.removeItem(studioLiberoKey()); localStorage.removeItem(studioLiberoModeKey()); localStorage.removeItem(studioOrdineKey()); } catch (e) { /* niente */ }
  STUDIO.libero = false; studioTogliLibero();
  const side = document.querySelector('.studio-side');
  if (side) for (const key of ['io', 'add', 'fonti', 'prop', 'mixer', 'chat']) { const b = side.querySelector(`:scope > .studio-box[data-box-ord="${key}"]`); if (b) side.appendChild(b); }
  const btn = document.getElementById('studio-libero-btn'); if (btn) btn.classList.remove('attivo');
  toast(L('Layout ripristinato', 'Layout reset', 'Diseño restablecido'));
}

// Prepara maniglie + drag (riordino in colonna OPPURE spostamento libero) una
// sola volta: palco e box sono statici nel DOM.
let _studioDrag = null;
function studioInitRiordino() {
  const griglia = document.getElementById('studio-griglia'); if (!griglia) return;
  const side = griglia.querySelector('.studio-side');
  if (side) for (const b of side.querySelectorAll(':scope > .studio-box')) {
    const key = studioBoxKey(b); if (key) b.dataset.boxOrd = key;
    const tit = b.querySelector('.studio-box-tit');
    if (tit && !tit.querySelector('.studio-box-drag')) {
      const h = document.createElement('span');
      h.className = 'studio-box-drag'; h.textContent = '⠿';
      h.title = L('Trascina per riordinare / spostare', 'Drag to reorder / move', 'Arrastra para reordenar / mover');
      tit.insertBefore(h, tit.firstChild);
    }
  }
  // ripristina modalità (libero vs colonna) e ordine/posizioni salvati
  try { STUDIO.libero = localStorage.getItem(studioLiberoModeKey()) === '1'; } catch (e) { /* niente */ }
  if (STUDIO.libero) studioApplicaLibero(); else studioApplicaOrdinePannelli();
  const btn0 = document.getElementById('studio-libero-btn'); if (btn0) btn0.classList.toggle('attivo', STUDIO.libero);

  if (STUDIO._riordWired) return;
  STUDIO._riordWired = true;
  griglia.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('.studio-box-drag, .studio-palco-drag'); if (!h) return;
    const el = h.closest('.studio-box, .studio-palco-wrap'); if (!el) return;
    if (STUDIO.libero) {
      const r = el.getBoundingClientRect(), gr = griglia.getBoundingClientRect();
      _studioDrag = { el, mode: 'free', px: e.clientX, py: e.clientY, startL: r.left - gr.left, startT: r.top - gr.top };
    } else {
      if (!el.classList.contains('studio-box')) return;   // in colonna solo i box si riordinano
      _studioDrag = { el, mode: 'reorder' };
    }
    el.classList.add('studio-box-dragging');
    try { h.setPointerCapture(e.pointerId); } catch (er) { /* niente */ }
    e.preventDefault();
  });
  griglia.addEventListener('pointermove', (e) => {
    if (!_studioDrag) return;
    if (_studioDrag.mode === 'free') {
      const gr = griglia.getBoundingClientRect();
      let nx = _studioDrag.startL + (e.clientX - _studioDrag.px);
      let ny = _studioDrag.startT + (e.clientY - _studioDrag.py);
      nx = Math.max(0, Math.min(nx, gr.width - 60)); ny = Math.max(0, ny);
      _studioDrag.el.style.left = nx + 'px'; _studioDrag.el.style.top = ny + 'px';
      studioAggiornaAltezzaLibero();
    } else {
      const s = griglia.querySelector('.studio-side'); if (!s) return;
      const fratelli = [...s.querySelectorAll(':scope > .studio-box')].filter((b) => b !== _studioDrag.el);
      let messo = false;
      for (const f of fratelli) { const r = f.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { s.insertBefore(_studioDrag.el, f); messo = true; break; } }
      if (!messo) s.appendChild(_studioDrag.el);
    }
  });
  const fine = () => { if (!_studioDrag) return; const m = _studioDrag.mode; _studioDrag.el.classList.remove('studio-box-dragging'); _studioDrag = null; if (m === 'free') studioSalvaPosLibero(); else studioSalvaOrdinePannelli(); };
  griglia.addEventListener('pointerup', fine);
  griglia.addEventListener('pointercancel', fine);
}

// ---- disegno dell'interfaccia dello Studio (scene, fonti, proprietà, mixer) --
function renderStudioTutto() {
  renderStudioScene(); renderStudioPreset(); renderStudioFonti(); renderStudioUI(); renderStudioProp(); renderStudioMixer();
}

// Preset di layout: salva/richiama un intero set di scene con un nome. Restano
// nel browser (localStorage) per canale. Webcam/schermo/testo/overlay si
// ripristinano sempre; immagini/video solo se ancora caricati in questa sessione.
function studioPresetKey() { try { return 'andrybot-studio-preset:' + (stato?.user?.login || 'anon'); } catch (e) { return 'andrybot-studio-preset:anon'; } }
function studioLeggiPreset() { try { return JSON.parse(localStorage.getItem(studioPresetKey())) || []; } catch (e) { return []; } }
function studioScriviPreset(arr) { try { localStorage.setItem(studioPresetKey(), JSON.stringify(arr)); } catch (e) { /* quota/off */ } }
function studioSerializzaScene() {
  return STUDIO.scene.map((s) => ({ nome: s.nome, fonti: s.fonti.map((f) => {
    const o = { tipo: f.tipo, nome: f.nome, x: f.x, y: f.y, w: f.w, h: f.h, visibile: f.visibile };
    if (f.dataId) o.dataId = f.dataId;
    if (f.tipo === 'testo') { o.testo = f.testo; o.colore = f.colore; o.dim = f.dim; o.grassetto = f.grassetto; o.sfondo = f.sfondo; }
    return o;
  }) }));
}

function renderStudioPreset() {
  const el = document.getElementById('studio-preset'); if (!el) return;
  const list = studioLeggiPreset(), vuoto = !list.length;
  el.innerHTML = `<span class="studio-mini-tit">${L('Preset di layout', 'Layout presets', 'Presets de diseño')}</span>
    <select class="chip-utente" id="studio-preset-sel"${vuoto ? ' disabled' : ''}>${vuoto ? `<option>${L('— nessuno salvato —', '— none saved —', '— ninguno guardado —')}</option>` : list.map((p, i) => `<option value="${i}">${esc(p.nome)}</option>`).join('')}</select>
    <button type="button" class="btn secondario mini" data-preset="applica"${vuoto ? ' disabled' : ''}>${L('Applica', 'Apply', 'Aplicar')}</button>
    <button type="button" class="btn secondario mini" data-preset="salva">${L('Salva com\'è…', 'Save as is…', 'Guardar tal cual…')}</button>
    <button type="button" class="btn secondario mini" data-preset="elimina"${vuoto ? ' disabled' : ''}>${L('Elimina', 'Delete', 'Eliminar')}</button>`;
}

function studioSalvaPreset() {
  const nome = prompt(L('Nome del preset di layout:', 'Layout preset name:', 'Nombre del preset de diseño:'), L('Il mio layout', 'My layout', 'Mi diseño')); if (!nome) return;
  const arr = studioLeggiPreset();
  arr.push({ nome: nome.slice(0, 40), scene: studioSerializzaScene() });
  studioScriviPreset(arr); renderStudioPreset(); toast(L('Preset salvato ✓', 'Preset saved ✓', 'Preset guardado ✓'));
}
function studioApplicaPreset(idx) {
  const arr = studioLeggiPreset(), p = arr[idx]; if (!p) return;
  STUDIO.scene = (p.scene || []).map((s) => ({ id: 's' + (STUDIO._n++), nome: s.nome || L('Scena', 'Scene', 'Escena'),
    fonti: (s.fonti || []).filter((f) => !(f.dataId && !STUDIO.media[f.dataId])).map((f) => ({ ...f, id: 'f' + (STUDIO._n++), visibile: f.visibile !== false })) }));
  if (!STUDIO.scene.length) studioNuovaScena(L('Scena 1', 'Scene 1', 'Escena 1'));
  STUDIO.attiva = 0; STUDIO.sel = null; renderStudioTutto(); toast(L('Preset applicato ✓', 'Preset applied ✓', 'Preset aplicado ✓'));
}
function studioEliminaPreset(idx) {
  const arr = studioLeggiPreset(); if (!arr[idx]) return;
  if (!confirm(L('Eliminare il preset «', 'Delete the preset “', 'Eliminar el preset «') + arr[idx].nome + L('»?', '”?', '»?'))) return;
  arr.splice(idx, 1); studioScriviPreset(arr); renderStudioPreset(); toast(L('Preset eliminato', 'Preset deleted', 'Preset eliminado'));
}

function renderStudioScene() {
  const el = document.getElementById('studio-scene'); if (!el) return;
  el.innerHTML = STUDIO.scene.map((s, i) =>
    `<button type="button" class="studio-scena${i === STUDIO.attiva ? ' attiva' : ''}" data-scena="${i}">${_bIco(ICO.scene)}<span>${esc(s.nome)}</span></button>`).join('')
    + `<button type="button" class="studio-scena studio-scena-nuova" data-scena-nuova="1" title="${L('Nuova scena', 'New scene', 'Nueva escena')}">${_bIco(ICO.piu)}</button>`
    + (STUDIO.scene.length > 1 ? `<button type="button" class="studio-scena studio-scena-rinomina" data-scena-azione="rinomina" title="${L('Rinomina scena', 'Rename scene', 'Renombrar escena')}">${_bIco(ICO.scrivi)}</button><button type="button" class="studio-scena studio-scena-elimina" data-scena-azione="elimina" title="${L('Elimina scena', 'Delete scene', 'Eliminar escena')}">${_bIco(ICO.cestino)}</button>` : '');
}

function renderStudioFonti() {
  const ul = document.getElementById('studio-fonti'); if (!ul) return;
  const s = studioSceneAttiva();
  if (!s || !s.fonti.length) { ul.innerHTML = `<li class="vuoto">${L('Nessuna fonte. Aggiungine una qui sopra.', 'No sources. Add one above.', 'Sin fuentes. Añade una arriba.')}</li>`; return; }
  // mostra dalla più avanti (in cima all'elenco) alla più dietro
  ul.innerHTML = s.fonti.slice().reverse().map((f) => {
    const i = s.fonti.indexOf(f);
    return `<li class="studio-fonte${f.id === STUDIO.sel ? ' sel' : ''}${f.visibile ? '' : ' nascosta'}" data-fonte="${f.id}">
      <span class="sf-ico">${_bIco(ICO[studioIcoFonte(f.tipo)])}</span>
      <span class="sf-nome">${esc(f.nome)}</span>
      <span class="sf-azioni">
        <button type="button" class="sf-btn" data-vis="${f.id}" title="${f.visibile ? L('Nascondi', 'Hide', 'Ocultar') : L('Mostra', 'Show', 'Mostrar')}">${_bIco(f.visibile ? ICO.occhio : ICO.occhioNo)}</button>
        <button type="button" class="sf-btn" data-su="${f.id}" title="${L('Porta avanti', 'Bring forward', 'Traer al frente')}"${i === s.fonti.length - 1 ? ' disabled' : ''}>${_bIco(ICO.freccia)}</button>
        <button type="button" class="sf-btn sf-giu" data-giu="${f.id}" title="${L('Porta dietro', 'Send back', 'Enviar atrás')}"${i === 0 ? ' disabled' : ''}>${_bIco(ICO.freccia)}</button>
        <button type="button" class="sf-btn sf-rim" data-rim="${f.id}" title="${L('Rimuovi', 'Remove', 'Quitar')}">${_bIco(ICO.cestino)}</button>
      </span>
    </li>`;
  }).join('');
}

function renderStudioUI() {
  const ui = document.getElementById('studio-ui'); if (!ui) return;
  const s = studioSceneAttiva(), W = 1280, H = 720;
  ui.innerHTML = (s ? s.fonti : []).filter((f) => f.visibile).map((f) => {
    const sel = f.id === STUDIO.sel && f.tipo !== 'overlay';
    const st = `left:${f.x / W * 100}%;top:${f.y / H * 100}%;width:${f.w / W * 100}%;height:${f.h / H * 100}%`;
    const handles = sel ? ['nw', 'ne', 'sw', 'se'].map((h) => `<span class="studio-h studio-h-${h}" data-h="${h}"></span>`).join('') : '';
    return `<div class="studio-fonte-box${sel ? ' sel' : ''}${f.tipo === 'overlay' ? ' overlay' : ''}" data-box="${f.id}" style="${st}"><span class="sfb-nome">${esc(f.nome)}</span>${handles}</div>`;
  }).join('');
}

function renderStudioProp() {
  const box = document.getElementById('studio-prop-box'), el = document.getElementById('studio-prop');
  if (!box || !el) return;
  const f = studioTrovaFonte(STUDIO.sel);
  if (!f) { box.hidden = true; el.innerHTML = ''; return; }
  box.hidden = false;
  let extra = '';
  if (f.tipo === 'testo') {
    extra = `
      <label class="campo" for="sp-testo">${L('Testo', 'Text', 'Texto')}</label>
      <input id="sp-testo" type="text" maxlength="120" value="${esc(f.testo || '')}">
      <div class="griglia-campi spazio-sopra">
        <div><label class="campo" for="sp-colore">${L('Colore', 'Color', 'Color')}</label><input id="sp-colore" type="color" value="${esc(f.colore || '#ffffff')}"></div>
        <div><label class="campo" for="sp-dim">${L('Dimensione:', 'Size:', 'Tamaño:')} <strong><span id="sp-dim-v">${f.dim}</span></strong></label><input id="sp-dim" type="range" min="18" max="150" value="${f.dim}"></div>
      </div>
      <label class="riga-check spazio-sopra"><input id="sp-grass" type="checkbox"${f.grassetto ? ' checked' : ''}> ${L('Grassetto', 'Bold', 'Negrita')}</label>`;
  } else if (f.tipo === 'overlay') {
    extra = `<p class="suggerimento">${L('L\'overlay riempie tutto il palco (alert, chat ed effetti alle loro posizioni). Non si sposta né si ridimensiona.', 'The overlay fills the whole stage (alerts, chat and effects at their positions). It doesn’t move or resize.', 'El overlay llena todo el escenario (alertas, chat y efectos en sus posiciones). No se mueve ni se redimensiona.')}</p>`;
  }
  el.innerHTML = `
    <label class="campo" for="sp-nome">${L('Nome', 'Name', 'Nombre')}</label>
    <input id="sp-nome" type="text" maxlength="24" value="${esc(f.nome)}">
    ${extra}
    ${f.tipo !== 'overlay' ? `<div class="studio-prop-pos spazio-sopra">
      <button type="button" class="btn secondario mini" data-fit="riempi">${L('Riempi il palco', 'Fill the stage', 'Llenar el escenario')}</button>
      <button type="button" class="btn secondario mini" data-fit="centra">${L('Centra', 'Center', 'Centrar')}</button>
    </div>` : ''}`;
}

function renderStudioMixer() {
  const el = document.getElementById('studio-mixer'); if (!el) return;
  const m = STUDIO.mix;
  const micOn = !!STUDIO.cap.micStream;
  const deskOn = !!(STUDIO.cap.scrStream && STUDIO.cap.scrStream.getAudioTracks().length);
  const mediaOn = Object.values(STUDIO.media || {}).some((x) => x && x.tipo === 'video');
  const canale = (id, nome, on, cfg, extra, forte) => `
    <div class="mix-canale${on ? '' : ' off'}${forte ? ' mix-master' : ''}">
      <div class="mix-testa"><span>${nome}</span>${extra || ''}</div>
      <div class="mix-riga">
        <button type="button" class="mix-mute${cfg.mute ? ' on' : ''}" data-mute="${id}"${on ? '' : ' disabled'} title="${cfg.mute ? L('Riattiva', 'Unmute', 'Reactivar') : L('Muto', 'Mute', 'Silenciar')}">${_bIco(cfg.mute ? ICO.muto : ICO.altoparlante)}</button>
        <input type="range" min="0" max="100" value="${cfg.vol}" data-vol="${id}"${on ? '' : ' disabled'}>
        <span class="mix-val">${cfg.vol}</span>
      </div>
      <div class="mix-vu"><span class="mix-vu-barra" data-vu="${id}"></span></div>
    </div>`;
  el.innerHTML =
    canale('master', L('Master (uscita)', 'Master (output)', 'Master (salida)'), true, m.master, '', true)
    + canale('mic', L('Microfono', 'Microphone', 'Micrófono'), micOn, m.mic, micOn ? '' : `<button type="button" class="btn secondario mini" data-cap="mic">${L('Attiva', 'Enable', 'Activar')}</button>`)
    + canale('desk', L('Audio dello schermo', 'Screen audio', 'Audio de la pantalla'), deskOn, m.desk, deskOn ? '' : `<span class="tenue">${L('condividi lo schermo con audio', 'share the screen with audio', 'comparte la pantalla con audio')}</span>`)
    + canale('media', L('Audio dei video', 'Video audio', 'Audio de los vídeos'), mediaOn, m.media, mediaOn ? '' : `<span class="tenue">${L('aggiungi un video con audio', 'add a video with sound', 'añade un vídeo con audio')}</span>`)
    + canale('sfx', L('Effetti & alert', 'Effects & alerts', 'Efectos y alertas'), true, m.sfx, '');
}

function posizionaBoxStudio(f) {
  const box = document.querySelector(`#studio-ui [data-box="${f.id}"]`); if (!box) return;
  box.style.left = f.x / 1280 * 100 + '%'; box.style.top = f.y / 720 * 100 + '%';
  box.style.width = f.w / 1280 * 100 + '%'; box.style.height = f.h / 720 * 100 + '%';
}

// ---- interazione (click, input, trascinamento/ridimensionamento) ------------
function onStudioClick(ev) {
  const t = ev.target;
  const add = t.closest('[data-add]'); if (add) return conErrore(() => studioAggiungi(add.dataset.add));
  if (t.closest('[data-scena-nuova]')) { studioNuovaScena(); STUDIO.attiva = STUDIO.scene.length - 1; STUDIO.sel = null; renderStudioTutto(); return; }
  const azione = t.closest('[data-scena-azione]');
  if (azione) {
    const s = studioSceneAttiva(); if (!s) return;
    if (azione.dataset.scenaAzione === 'rinomina') { const n = prompt(L('Nome della scena:', 'Scene name:', 'Nombre de la escena:'), s.nome); if (n) { s.nome = n.slice(0, 24); renderStudioScene(); } }
    else if (azione.dataset.scenaAzione === 'elimina') {
      if (STUDIO.scene.length <= 1) { toast(L('Serve almeno una scena.', 'You need at least one scene.', 'Hace falta al menos una escena.')); return; }
      if (!confirm(L('Eliminare la scena «', 'Delete the scene “', 'Eliminar la escena «') + s.nome + L('»?', '”?', '»?'))) return;
      STUDIO.scene.splice(STUDIO.attiva, 1); STUDIO.attiva = Math.max(0, STUDIO.attiva - 1); STUDIO.sel = null; renderStudioTutto();
    }
    return;
  }
  const preset = t.closest('[data-preset]');
  if (preset) {
    const act = preset.dataset.preset;
    if (act === 'salva') return studioSalvaPreset();
    const sel = document.getElementById('studio-preset-sel'), i = sel ? Number(sel.value) : -1;
    if (act === 'applica') return studioApplicaPreset(i);
    if (act === 'elimina') return studioEliminaPreset(i);
    return;
  }
  const scena = t.closest('[data-scena]'); if (scena) { STUDIO.attiva = Number(scena.dataset.scena); STUDIO.sel = null; renderStudioTutto(); return; }
  const vis = t.closest('[data-vis]'); if (vis) { const f = studioTrovaFonte(vis.dataset.vis); if (f) { f.visibile = !f.visibile; renderStudioTutto(); } return; }
  const su = t.closest('[data-su]'); if (su) return studioSpostaFonte(su.dataset.su, 1);
  const giu = t.closest('[data-giu]'); if (giu) return studioSpostaFonte(giu.dataset.giu, -1);
  const rim = t.closest('[data-rim]'); if (rim) return studioRimuoviFonte(rim.dataset.rim);
  const voce = t.closest('#studio-fonti [data-fonte]'); if (voce) { STUDIO.sel = voce.dataset.fonte; renderStudioTutto(); return; }
  const layout = t.closest('[data-layout]'); if (layout) return studioLayout(layout.dataset.layout);
  const fit = t.closest('[data-fit]'); if (fit) return studioFit(fit.dataset.fit);
  const cap = t.closest('[data-cap]'); if (cap && cap.dataset.cap === 'mic') return conErrore(() => studioCapMic());
  const mute = t.closest('[data-mute]'); if (mute) { const k = mute.dataset.mute; if (STUDIO.mix[k]) { STUDIO.mix[k].mute = !STUDIO.mix[k].mute; applicaMix(); renderStudioMixer(); } return; }
  const io = t.closest('[data-io]'); if (io) { if (io.dataset.io === 'aggiorna') return conErrore(() => studioPopolaDispositivi()); return; }
  const lib = t.closest('[data-libero]'); if (lib) { if (lib.dataset.libero === 'toggle') return studioToggleLibero(); if (lib.dataset.libero === 'reset') return studioResetLibero(); return; }
  if (t.closest('#studio-live')) return conErrore(() => avviaLive());
  if (t.closest('#studio-ferma')) return conErrore(() => fermaLive());
}

function onStudioInput(ev) {
  const t = ev.target;
  const vol = t.closest('[data-vol]'); if (vol) { const k = vol.dataset.vol; if (STUDIO.mix[k]) { STUDIO.mix[k].vol = Number(vol.value); applicaMix(); const v = vol.parentElement.querySelector('.mix-val'); if (v) v.textContent = vol.value; } return; }
  // selettori "Ingressi & qualità" (non legati a una fonte)
  if (t.id === 'studio-cam-sel') return conErrore(() => studioCambiaCamera(t.value));
  if (t.id === 'studio-mic-sel') return conErrore(() => studioCambiaMic(t.value));
  if (t.id === 'studio-ov-sel') { STUDIO.ov.sel = t.value; return conErrore(() => studioConnettiOverlay()); }
  if (t.id === 'studio-qual-sel') { studioApplicaQualita(t.value); return; }
  const f = studioTrovaFonte(STUDIO.sel); if (!f) return;
  if (t.id === 'sp-nome') { f.nome = t.value; const n = document.querySelector(`#studio-fonti [data-fonte="${f.id}"] .sf-nome`); if (n) n.textContent = t.value; const bn = document.querySelector(`#studio-ui [data-box="${f.id}"] .sfb-nome`); if (bn) bn.textContent = t.value; return; }
  if (t.id === 'sp-testo') { f.testo = t.value; return; }
  if (t.id === 'sp-colore') { f.colore = t.value; return; }
  if (t.id === 'sp-dim') { f.dim = Number(t.value); const v = document.getElementById('sp-dim-v'); if (v) v.textContent = t.value; return; }
}

function onStudioChange(ev) {
  if (ev.target.id === 'sp-grass') { const f = studioTrovaFonte(STUDIO.sel); if (f) f.grassetto = ev.target.checked; return; }
  if (ev.target.id === 'studio-file') { const file = ev.target.files && ev.target.files[0]; if (file) studioFileScelto(file); }
}

function onStudioPointerDown(ev) {
  const box = ev.target.closest('.studio-fonte-box'); if (!box) return;
  const id = box.dataset.box, f = studioTrovaFonte(id); if (!f) return;
  STUDIO.sel = id; renderStudioTutto();
  if (f.tipo === 'overlay') return;   // l'overlay non si sposta
  const handle = ev.target.closest('.studio-h');
  const palco = document.getElementById('studio-palco'); const r = palco.getBoundingClientRect();
  STUDIO.drag = { id, mode: handle ? 'resize' : 'move', h: handle ? handle.dataset.h : null,
    sx: ev.clientX, sy: ev.clientY, ox: f.x, oy: f.y, ow: f.w, oh: f.h, rw: r.width, rh: r.height };
  ev.preventDefault();
  try { palco.setPointerCapture(ev.pointerId); } catch (e) { /* niente */ }
}

function onStudioPointerMove(ev) {
  const d = STUDIO.drag; if (!d) return;
  const f = studioTrovaFonte(d.id); if (!f) return;
  const dx = (ev.clientX - d.sx) / d.rw * 1280, dy = (ev.clientY - d.sy) / d.rh * 720;
  if (d.mode === 'move') {
    f.x = studioClamp(d.ox + dx, -f.w + 60, 1280 - 60);
    f.y = studioClamp(d.oy + dy, -f.h + 60, 720 - 60);
  } else {
    let x = d.ox, y = d.oy, w = d.ow, h = d.oh;
    if (d.h.indexOf('e') >= 0) w = d.ow + dx;
    if (d.h.indexOf('s') >= 0) h = d.oh + dy;
    if (d.h.indexOf('w') >= 0) { w = d.ow - dx; x = d.ox + dx; }
    if (d.h.indexOf('n') >= 0) { h = d.oh - dy; y = d.oy + dy; }
    if (w < 60) { if (d.h.indexOf('w') >= 0) x = d.ox + d.ow - 60; w = 60; }
    if (h < 60) { if (d.h.indexOf('n') >= 0) y = d.oy + d.oh - 60; h = 60; }
    f.x = x; f.y = y; f.w = w; f.h = h;
  }
  posizionaBoxStudio(f);
}

function onStudioPointerUp() { if (STUDIO.drag) STUDIO.drag = null; }

// Aggancia gli handler dello Studio (chiamata a ogni render: il pannello viene
// ridisegnato, quindi si riattacca al nuovo nodo; i listener globali del
// trascinamento si agganciano UNA volta sola).
function initStudio() {
  const panel = document.getElementById('scheda-studio'); if (!panel) return;
  panel.addEventListener('click', onStudioClick);
  panel.addEventListener('input', onStudioInput);
  panel.addEventListener('change', onStudioChange);
  document.getElementById('studio-palco')?.addEventListener('pointerdown', onStudioPointerDown);
  if (!STUDIO._wired) {
    document.addEventListener('pointermove', onStudioPointerMove);
    document.addEventListener('pointerup', onStudioPointerUp);
    STUDIO._wired = true;
  }
}

// --- scheda Effetti & Suoni ---------------------------------------------

function pannelloEffetti() {
  return pannello('effetti', `
    <div class="carta">
      <h2>${_hIco(ICO.libro)}${L('Libreria condivisa', 'Shared library', 'Biblioteca compartida')}</h2>
      <p>${L('Sfoglia', 'Browse', 'Explora')} <strong class="primo-piano">${L('effetti, gif, video, foto e suoni', 'effects, gifs, videos, photos and sounds', 'efectos, gifs, vídeos, fotos y sonidos')}</strong> ${L('condivisi dagli altri streamer', 'shared by other streamers', 'compartidos por otros streamers')}
      ${L('e aggiungili alla tua libreria con un click. Quello che aggiungi lo ritrovi', 'and add them to your library with one click. What you add you find', 'y añádelos a tu biblioteca con un clic. Lo que añades lo encuentras')} <strong>${L('ovunque', 'everywhere', 'en todas partes')}</strong>: ${L('overlay, alert, effetti e premi a punti canale.', 'overlay, alerts, effects and channel-point rewards.', 'overlay, alertas, efectos y recompensas de puntos de canal.')}</p>
      <div class="lib-filtri">
        <div class="lib-tabs">
          <button type="button" class="btn secondario mini lib-tab attivo" data-tipo="">${L('Tutti', 'All', 'Todos')}</button>
          <button type="button" class="btn secondario mini lib-tab" data-tipo="immagine">${_bIco(ICO.immagine)}${L('Immagini', 'Images', 'Imágenes')}</button>
          <button type="button" class="btn secondario mini lib-tab" data-tipo="video">${_bIco(ICO.video)}${L('Video', 'Videos', 'Vídeos')}</button>
          <button type="button" class="btn secondario mini lib-tab" data-tipo="audio">${_bIco(ICO.altoparlante)}${L('Audio', 'Audio', 'Audio')}</button>
        </div>
        <input type="search" id="lib-cerca" placeholder="${L('Cerca per nome…', 'Search by name…', 'Buscar por nombre…')}" maxlength="40">
      </div>
      <div id="lib-griglia" class="lib-griglia"><p class="vuoto">${L('Carico la libreria…', 'Loading the library…', 'Cargando la biblioteca…')}</p></div>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.effetti)}${L('Carica un effetto', 'Upload an effect', 'Sube un efecto')}</h2>
      <p>${L('Audio, immagini o brevi video. Ogni file viene', 'Audio, images or short videos. Each file is', 'Audio, imágenes o vídeos cortos. Cada archivo se')} <strong class="primo-piano">${L('super-compresso', 'super-compressed', 'súper-comprimido')}</strong>
      ${L('in automatico, così l\'overlay resta leggero.', 'automatically, so the overlay stays lightweight.', 'automáticamente, así el overlay se mantiene ligero.')}</p>

      <label class="campo" for="eff-file">${L('File (audio / immagine / video)', 'File (audio / image / video)', 'Archivo (audio / imagen / vídeo)')}</label>
      <input type="file" id="eff-file" accept="audio/*,image/*,video/*">

      <div class="spazio-sopra">
        <label class="campo" for="eff-suono">${_bIco(ICO.altoparlante)}${L('Suono da abbinare', 'Sound to pair', 'Sonido a combinar')} <span class="tenue">— ${L('opzionale, per immagini/video: crei una', 'optional, for images/videos: you create a', 'opcional, para imágenes/vídeos: creas una')} <strong>combo</strong> (${L('media + suono che parte insieme', 'media + sound that plays together', 'media + sonido que se reproduce junto')})</span></label>
        <input type="file" id="eff-suono" accept="audio/*">
      </div>

      <label class="campo" for="eff-comando">${L('Comando in chat', 'Chat command', 'Comando en el chat')}</label>
      <div class="riga-flessibile">
        <span class="prefisso-cmd">!</span>
        <input type="text" id="eff-comando" class="campo-largo" placeholder="airhorn" maxlength="24">
      </div>
      <p class="suggerimento">${L('Solo lettere minuscole, numeri e "_". Chi lo scrive in chat fa partire l\'effetto.', 'Only lowercase letters, numbers and "_". Whoever types it in chat triggers the effect.', 'Solo letras minúsculas, números y "_". Quien lo escribe en el chat activa el efecto.')}</p>

      <div class="griglia-campi spazio-sopra">
        <div>
          <label class="campo" for="eff-tier">${L('Chi può usarlo', 'Who can use it', 'Quién puede usarlo')}</label>
          <select id="eff-tier">
            <option value="tutti">${L('Tutti', 'Everyone', 'Todos')}</option>
            <option value="sub">${L('Solo sub', 'Subs only', 'Solo subs')}</option>
            <option value="vip">${L('Solo VIP', 'VIPs only', 'Solo VIP')}</option>
            <option value="mod">${L('Solo mod', 'Mods only', 'Solo mods')}</option>
          </select>
        </div>
        <div>
          <label class="campo" for="eff-cooldown">${L('Cooldown (s)', 'Cooldown (s)', 'Enfriamiento (s)')}</label>
          <input type="number" id="eff-cooldown" min="0" max="3600" value="10">
        </div>
        <div>
          <label class="campo" for="eff-volume">${L('Volume (%)', 'Volume (%)', 'Volumen (%)')}</label>
          <input type="number" id="eff-volume" min="0" max="100" value="80">
        </div>
        <div>
          <label class="campo" for="eff-durata">${L('Durata a schermo (ms)', 'On-screen duration (ms)', 'Duración en pantalla (ms)')}</label>
          <input type="number" id="eff-durata" min="500" max="30000" value="5000">
        </div>
      </div>
      <p class="suggerimento">${L('Fino a', 'Up to', 'Hasta')} <strong>${L('30 secondi', '30 seconds', '30 segundos')}</strong> (30000 ms). ${L('Per le', 'For', 'Para las')} <strong>${L('immagini', 'images', 'imágenes')}</strong> ${L('è quanto restano a schermo;', 'it\'s how long they stay on screen;', 'es cuánto permanecen en pantalla;')}
      ${L('audio e video usano la loro durata reale (accorciati a 30s se più lunghi).', 'audio and video use their real duration (shortened to 30s if longer).', 'audio y vídeo usan su duración real (acortados a 30s si son más largos).')}</p>

      <div class="riga-check spazio-sopra" style="display:block">
        <label class="riga-check"><input type="checkbox" id="eff-pubblico"> ${_bIco(ICO.globo)}<strong>${L('Rendi pubblico', 'Make it public', 'Hazlo público')}</strong> — ${L('condividilo con gli altri streamer nella libreria', 'share it with other streamers in the library', 'compártelo con otros streamers en la biblioteca')}</label>
      </div>
      <div id="eff-nome-box" class="spazio-sopra" hidden>
        <label class="campo" for="eff-nome">${L('Nome nella libreria condivisa', 'Name in the shared library', 'Nombre en la biblioteca compartida')}</label>
        <input type="text" id="eff-nome" class="campo-largo" maxlength="60" placeholder="${L('Es. Airhorn epico', 'E.g. Epic airhorn', 'Ej. Airhorn épico')}">
      </div>

      <p class="spazio-sopra">
        <button class="btn" id="btn-carica-effetto">${L('Carica effetto', 'Upload effect', 'Subir efecto')}</button>
        <span id="esito-effetto" class="suggerimento"></span>
      </p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.sliders)}${L('I tuoi effetti', 'Your effects', 'Tus efectos')}</h2>
      <ul class="lista-voci" id="lista-effetti"><li class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</li></ul>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.cuffie)}${L('Effetti sui tuoi punti canale', 'Effects on your channel points', 'Efectos en tus puntos de canal')}</h2>
      <p>${L('Attacca un', 'Attach an', 'Añade un')} <strong class="primo-piano">${L('effetto', 'effect', 'efecto')}</strong> ${L('a un', 'to a', 'a una')} <strong>${L('premio a punti canale che hai già', 'channel-point reward you already have', 'recompensa de puntos de canal que ya tienes')}</strong>:
      ${L('quando qualcuno lo riscatta (es. «Bevi l\'acqua»), nell\'overlay parte quello che scegli — un', 'when someone redeems it (e.g. «Drink water»), the overlay plays what you choose — a', 'cuando alguien la canjea (ej. «Bebe agua»), en el overlay se reproduce lo que elijas — un')} <strong>${L('suono pronto', 'ready-made sound', 'sonido listo')}</strong>,
      ${L('oppure un', 'or one of your', 'o un')} <strong>${L('tuo suono, immagine o video', 'own sound, image or video', 'sonido, imagen o vídeo tuyo')}</strong> ${L('caricato in «Carica un effetto» qui sopra.', 'uploaded in «Upload an effect» above.', 'subido en «Sube un efecto» arriba.')}
      ${L('Per immagini e video puoi decidere', 'For images and videos you can decide', 'Para imágenes y vídeos puedes decidir')} <strong>${L('dove e quanto grande', 'where and how big', 'dónde y de qué tamaño')}</strong> ${L('appaiono, e per i video attivare il', 'they appear, and for videos enable the', 'aparecen, y para los vídeos activar el')}
      <strong>green screen</strong> (${L('togliere lo sfondo di un colore', 'remove a color background', 'quitar el fondo de un color')}).</p>
      <div id="suoni-premi-box"><p class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</p></div>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.giveaway)}${L('Alert a punti canale', 'Channel-point alerts', 'Alertas de puntos de canal')}</h2>
      <p>${L('Crea un', 'Create a', 'Crea una')} <strong class="primo-piano">${L('premio a punti canale', 'channel-point reward', 'recompensa de puntos de canal')}</strong> ${L('di Twitch: quando uno spettatore lo riscatta', 'on Twitch: when a viewer redeems it', 'de Twitch: cuando un espectador la canjea')}
      (${L('spendendo i suoi punti', 'spending their points', 'gastando sus puntos')}), ${L('parte un', 'an', 'se lanza un')} <strong>${L('effetto', 'effect', 'efecto')}</strong> ${L('nell\'overlay e/o un', 'plays in the overlay and/or a', 'en el overlay y/o un')} <strong>${L('messaggio', 'message', 'mensaje')}</strong> ${L('in chat.', 'in chat.', 'en el chat.')}
      ${L('Il premio compare da solo nella tua pagina Twitch.', 'The reward appears automatically on your Twitch page.', 'La recompensa aparece sola en tu página de Twitch.')}</p>
      <div id="premi-box"><p class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</p></div>
    </div>`);
}

// Elenca i premi a punti canale ESISTENTI e permette di attaccare a ognuno un
// suono pronto (preset) + un messaggio. Non crea premi su Twitch: mappa e basta.
async function caricaSuoniPremi() {
  const box = document.getElementById('suoni-premi-box');
  if (!box) return;
  let d;
  try { d = await api('/api/streamer/premi'); } catch (e) { box.innerHTML = `<p class="vuoto">${L('Errore', 'Error', 'Error')}: ${esc(e.message)}</p>`; return; }
  if (!d.permessoOk) {
    box.innerHTML = `<p class="vuoto">${L('Per leggere i tuoi punti canale serve un permesso in più.', 'Reading your channel points requires an extra permission.', 'Para leer tus puntos de canal se necesita un permiso adicional.')}
      <a class="btn secondario mini" href="/auth/permessi">${L('Concedi il permesso', 'Grant the permission', 'Concede el permiso')}</a></p>`;
    return;
  }
  const tutti = d.tutti || [];
  if (!tutti.length) {
    box.innerHTML = `<div class="riquadro-info">${L('Non hai ancora premi a punti canale su Twitch. Creane uno (anche qui sotto, in «Alert a punti canale») e poi torna qui per dargli un suono.', 'You don\'t have any channel-point rewards on Twitch yet. Create one (also below, in «Channel-point alerts») and then come back here to give it a sound.', 'Aún no tienes recompensas de puntos de canal en Twitch. Crea una (también abajo, en «Alertas de puntos de canal») y luego vuelve aquí para darle un sonido.')}</div>`;
    return;
  }
  const mappa = {};
  (d.premi || []).forEach((p) => { mappa[p.reward_id] = p; });
  const presets = (window.SUONI_PRESET && window.SUONI_PRESET.lista) || [];
  const effetti = d.effetti || [];
  const audio = effetti.filter((e) => e.tipo === 'audio');
  const visivi = effetti.filter((e) => e.tipo === 'immagine' || e.tipo === 'video');
  const tipoDi = {}; effetti.forEach((e) => { tipoDi[e.comando] = e.tipo; });
  // scelta: preset ("<id>") o effetto ("effetto:<comando>")
  const opzScelta = (sel) => {
    const p = presets.map((s) => `<option value="${esc(s.id)}"${s.id === sel ? ' selected' : ''}>${esc(s.nome)}</option>`).join('');
    const a = audio.map((e) => `<option value="effetto:${esc(e.comando)}"${'effetto:' + e.comando === sel ? ' selected' : ''}>!${esc(e.comando)}</option>`).join('');
    const v = visivi.map((e) => `<option value="effetto:${esc(e.comando)}"${'effetto:' + e.comando === sel ? ' selected' : ''}>!${esc(e.comando)} (${e.tipo})</option>`).join('');
    return `<option value="">${L('— niente —', '— none —', '— nada —')}</option><optgroup label="${L('Suoni pronti', 'Ready-made sounds', 'Sonidos listos')}">${p}</optgroup>`
      + (a ? `<optgroup label="${L('I miei suoni caricati', 'My uploaded sounds', 'Mis sonidos subidos')}">${a}</optgroup>` : '')
      + (v ? `<optgroup label="${L('Immagini / Video', 'Images / Videos', 'Imágenes / Vídeos')}">${v}</optgroup>` : '');
  };
  const svgPlay = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  box.innerHTML = `<ul class="lista-suoni-premi">${tutti.map((r) => {
    const m = mappa[r.id] || {};
    const selVal = m.effetto ? 'effetto:' + m.effetto : (m.suono || '');
    return `<li data-reward="${esc(r.id)}" data-titolo="${esc(r.title)}" data-costo="${r.cost || 0}">
      <div class="riga-premio-suono">
        <span class="nome-premio"><strong>${esc(r.title)}</strong> <span class="suggerimento">${r.cost || 0} ${L('punti', 'points', 'puntos')}</span></span>
        <span class="controlli-suono">
          <select class="sel-effetto">${opzScelta(selVal)}</select>
          <button type="button" class="btn secondario mini prova-suono" title="${L('Prova', 'Test', 'Probar')}">${svgPlay}</button>
        </span>
      </div>
      <input type="text" class="campo-largo msg-suono spazio-sopra" maxlength="300" placeholder="${L('Messaggio in chat (facoltativo, {user} = chi riscatta)', 'Chat message (optional, {user} = who redeems)', 'Mensaje en el chat (opcional, {user} = quien canjea)')}" value="${esc(m.testo || '')}">
      <div class="premio-posizione" hidden></div>
    </li>`;
  }).join('')}</ul>`;

  // stato per riga: posizione (xy) + green screen (chroma)
  const stato = {};
  (d.premi || []).forEach((p) => {
    let o = {}; try { o = p.opzioni ? JSON.parse(p.opzioni) : {}; } catch { o = {}; }
    stato[p.reward_id] = { xy: o.xy || null, chroma: o.chroma || { attivo: false, colore: '#00ff00', soglia: 140 } };
  });

  box.querySelectorAll('.lista-suoni-premi > li').forEach((li) => {
    const reward = li.dataset.reward;
    const sel = li.querySelector('.sel-effetto');
    const st = stato[reward] || (stato[reward] = { xy: null, chroma: { attivo: false, colore: '#00ff00', soglia: 140 } });
    const salva = (msg) => conErrore(async () => {
      await api('/api/streamer/premi/suono', { method: 'POST', body: {
        rewardId: reward, titolo: li.dataset.titolo, costo: li.dataset.costo,
        scelta: sel.value, testo: (li.querySelector('.msg-suono').value || '').trim(),
        opzioni: { xy: st.xy, chroma: st.chroma },
      } });
      if (msg) toast(msg);
    });
    const comandoSel = () => { const m = /^effetto:(.+)$/.exec(sel.value); return m ? m[1] : ''; };
    const aggiornaEditor = () => {
      const c = comandoSel(); const tipo = tipoDi[c];
      _premioEditorPos(li.querySelector('.premio-posizione'), c, tipo, st, () => salva());
    };
    sel.addEventListener('change', () => {
      const v = sel.value;
      if (v && !v.startsWith('effetto:') && window.SUONI_PRESET) window.SUONI_PRESET.suona(v, 100);   // anteprima preset
      aggiornaEditor();
      salva(L('Effetto impostato ✓', 'Effect set ✓', 'Efecto configurado ✓'));
    });
    li.querySelector('.prova-suono').addEventListener('click', () => {
      const v = sel.value;
      if (v && !v.startsWith('effetto:') && window.SUONI_PRESET) window.SUONI_PRESET.suona(v, 100);
      else if (v) api('/api/streamer/effetti/test', { method: 'POST', body: { comando: comandoSel() } }).then(() => toast(L('Inviato all\'overlay ▶', 'Sent to the overlay ▶', 'Enviado al overlay ▶'))).catch(() => toast(L('Apri prima l\'overlay in OBS.', 'Open the overlay in OBS first.', 'Abre antes el overlay en OBS.')));
      else toast(L('Scegli prima un effetto.', 'Choose an effect first.', 'Elige antes un efecto.'));
    });
    li.querySelector('.msg-suono').addEventListener('change', () => salva(L('Messaggio salvato ✓', 'Message saved ✓', 'Mensaje guardado ✓')));
    aggiornaEditor();
  });
}

// Editor compatto (16:9) per posizione/dimensione/rotazione + green screen di un
// effetto visivo su un premio a punti canale. Solo per immagini/video.
function _premioEditorPos(box, comando, tipo, st, salva) {
  if (!box) return;
  if (!comando || (tipo !== 'immagine' && tipo !== 'video')) { box.hidden = true; box.innerHTML = ''; return; }
  st.xy = st.xy || { x: 50, y: 50, s: 100, r: 0 };
  box.hidden = false;
  const isVideo = tipo === 'video';
  box.innerHTML = `
    <p class="suggerimento spazio-sopra"><strong>${L('Dove appare', 'Where it appears', 'Dónde aparece')}</strong> — ${L('trascina nel riquadro, poi regola dimensione e rotazione.', 'drag in the box, then adjust size and rotation.', 'arrastra en el recuadro, luego ajusta tamaño y rotación.')}</p>
    <div class="pp-stage"><div class="pp-el">!${esc(comando)}</div></div>
    <div class="griglia-campi spazio-sopra">
      <div><label class="campo">${L('Dimensione', 'Size', 'Tamaño')}: <strong class="pp-s-v">${st.xy.s || 100}</strong>%</label><input type="range" class="pp-s" min="30" max="300" value="${st.xy.s || 100}"></div>
      <div><label class="campo">${L('Rotazione', 'Rotation', 'Rotación')}: <strong class="pp-r-v">${st.xy.r || 0}</strong>°</label><input type="range" class="pp-r" min="-180" max="180" value="${st.xy.r || 0}"></div>
    </div>
    ${isVideo ? `
    <div class="riga-check spazio-sopra"><input type="checkbox" class="pp-chroma" ${st.chroma?.attivo ? 'checked' : ''}><label>Green screen <span class="tenue">— ${L('togli lo sfondo di un colore dal video', 'remove a color background from the video', 'quita el fondo de un color del vídeo')}</span></label></div>
    <div class="pp-chroma-box griglia-campi" ${st.chroma?.attivo ? '' : 'hidden'}>
      <div><label class="campo">${L('Colore da togliere', 'Color to remove', 'Color a quitar')}</label><input type="color" class="pp-chroma-col" value="${esc(st.chroma?.colore || '#00ff00')}"></div>
      <div><label class="campo">${L('Sensibilità', 'Sensitivity', 'Sensibilidad')}: <strong class="pp-chroma-s-v">${st.chroma?.soglia || 140}</strong></label><input type="range" class="pp-chroma-s" min="40" max="260" value="${st.chroma?.soglia || 140}"></div>
    </div>` : ''}`;
  const el = box.querySelector('.pp-el');
  const stage = box.querySelector('.pp-stage');
  const posEl = () => { el.style.left = st.xy.x + '%'; el.style.top = st.xy.y + '%'; el.style.transform = `translate(-50%,-50%) scale(${(st.xy.s || 100) / 100}) rotate(${st.xy.r || 0}deg)`; };
  posEl();
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = stage.getBoundingClientRect();
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* niente */ }
    const move = (ev) => {
      st.xy.x = Math.round(Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100)));
      st.xy.y = Math.round(Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100)));
      posEl();
    };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); salva(); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  });
  box.querySelector('.pp-s').addEventListener('input', (e) => { st.xy.s = Number(e.target.value); box.querySelector('.pp-s-v').textContent = st.xy.s; posEl(); });
  box.querySelector('.pp-s').addEventListener('change', salva);
  box.querySelector('.pp-r').addEventListener('input', (e) => { st.xy.r = Number(e.target.value); box.querySelector('.pp-r-v').textContent = st.xy.r; posEl(); });
  box.querySelector('.pp-r').addEventListener('change', salva);
  const chk = box.querySelector('.pp-chroma');
  if (chk) {
    chk.addEventListener('change', () => { st.chroma.attivo = chk.checked; box.querySelector('.pp-chroma-box').hidden = !chk.checked; salva(); });
    box.querySelector('.pp-chroma-col').addEventListener('change', (e) => { st.chroma.colore = e.target.value; salva(); });
    box.querySelector('.pp-chroma-s').addEventListener('input', (e) => { st.chroma.soglia = Number(e.target.value); box.querySelector('.pp-chroma-s-v').textContent = st.chroma.soglia; });
    box.querySelector('.pp-chroma-s').addEventListener('change', salva);
  }
}

// carica e disegna gli alert a punti canale (crea premio Twitch + mappa effetto)
async function caricaPremi() {
  const box = document.getElementById('premi-box');
  if (!box) return;
  let d;
  try { d = await api('/api/streamer/premi'); } catch (e) { box.innerHTML = `<p class="vuoto">${L('Errore', 'Error', 'Error')}: ${esc(e.message)}</p>`; return; }
  if (!d.permessoOk) {
    box.innerHTML = `<p class="vuoto">${L('Per creare premi a punti canale serve un permesso in più.', 'Creating channel-point rewards requires an extra permission.', 'Para crear recompensas de puntos de canal se necesita un permiso adicional.')}
      <a class="btn secondario mini" href="/auth/permessi">${L('Concedi il permesso', 'Grant the permission', 'Concede el permiso')}</a></p>`;
    return;
  }
  const effOpts = [`<option value="">${L('— nessun effetto —', '— no effect —', '— sin efecto —')}</option>`]
    .concat((d.effetti || []).map((c) => `<option value="${esc(c.comando)}">!${esc(c.comando)} (${esc(c.tipo)})</option>`)).join('');
  const premi = d.premi || [];
  const lista = premi.length
    ? premi.map((p) => `<li><span><strong>${esc(p.titolo)}</strong> <span class="suggerimento">${p.costo} ${L('punti', 'points', 'puntos')}${p.effetto ? ` · !${esc(p.effetto)}` : ''}${p.testo ? ' ·' : ''}</span></span> <a href="#" class="rimuovi-premio" data-id="${esc(p.reward_id)}" title="${L('Elimina', 'Delete', 'Eliminar')}">✕</a></li>`).join('')
    : `<li class="vuoto">${L('Nessun premio ancora.', 'No rewards yet.', 'Aún no hay recompensas.')}</li>`;
  box.innerHTML = `
    <label class="campo" for="premio-titolo">${L('Nome del premio', 'Reward name', 'Nombre de la recompensa')}</label>
    <input type="text" id="premio-titolo" class="campo-largo" placeholder="${L('es. Airhorn', 'e.g. Airhorn', 'ej. Airhorn')}" maxlength="45">
    <div class="griglia-campi spazio-sopra">
      <div>
        <label class="campo" for="premio-costo">${L('Costo (punti canale)', 'Cost (channel points)', 'Coste (puntos de canal)')}</label>
        <input type="number" id="premio-costo" min="1" max="1000000" value="500">
      </div>
      <div>
        <label class="campo" for="premio-effetto">${L('Effetto da lanciare', 'Effect to trigger', 'Efecto a lanzar')}</label>
        <select id="premio-effetto">${effOpts}</select>
      </div>
    </div>
    <label class="campo spazio-sopra" for="premio-testo">${L('Messaggio in chat', 'Chat message', 'Mensaje en el chat')} <span class="suggerimento">(${L('facoltativo, {user} = chi riscatta', 'optional, {user} = who redeems', 'opcional, {user} = quien canjea')})</span></label>
    <input type="text" id="premio-testo" class="campo-largo" placeholder="${L('es. {user} ha lanciato l\'airhorn!', 'e.g. {user} triggered the airhorn!', 'ej. ¡{user} ha lanzado el airhorn!')}" maxlength="300">
    <p class="spazio-sopra"><button class="btn" id="btn-premio-crea">${L('Crea il premio', 'Create the reward', 'Crear la recompensa')}</button></p>
    <h3>${L('I tuoi premi', 'Your rewards', 'Tus recompensas')}</h3>
    <ul class="lista-voci" id="lista-premi">${lista}</ul>`;
  document.getElementById('btn-premio-crea')?.addEventListener('click', () => conErrore(async () => {
    const body = {
      titolo: (document.getElementById('premio-titolo').value || '').trim(),
      costo: document.getElementById('premio-costo').value,
      effetto: document.getElementById('premio-effetto').value,
      testo: (document.getElementById('premio-testo').value || '').trim(),
    };
    await api('/api/streamer/premi', { method: 'POST', body });
    toast(L('Premio creato — lo trovi tra i punti canale su Twitch.', 'Reward created — you\'ll find it in your Twitch channel points.', 'Recompensa creada — la encontrarás en tus puntos de canal de Twitch.'));
    caricaPremi();
  }));
  box.querySelectorAll('.rimuovi-premio').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); conErrore(async () => {
    if (!confirm(L('Eliminare questo premio da Twitch?', 'Delete this reward from Twitch?', '¿Eliminar esta recompensa de Twitch?'))) return;
    await api('/api/streamer/premi/' + encodeURIComponent(a.dataset.id), { method: 'DELETE' });
    toast(L('Premio eliminato.', 'Reward deleted.', 'Recompensa eliminada.'));
    caricaPremi();
  }); }));
}

// --- scheda 7TV · Emote -------------------------------------------------
// Gestione COMPLETA delle emote 7TV del canale: collega l'account 7TV (token),
// vedi il set attivo, cerca nella directory e aggiungi/togli/rinomina. Le emote
// 7TV compaiono anche nella chat a schermo dell'overlay (features/emotes.js).
function pannello7TV() {
  return pannello('emote', `
    <div class="carta">
      <h2>${_hIco(ICO.faccina || ICO.chat)}${L('Il tuo account 7TV', 'Your 7TV account', 'Tu cuenta 7TV')}</h2>
      <p>${L('Collega il tuo account', 'Connect your', 'Conecta tu cuenta')} <strong class="primo-piano">7TV</strong> ${L('per gestire le emote del canale — aggiungerle, toglierle e rinominarle — senza uscire dal bot. Le emote 7TV compaiono anche nella chat a schermo del tuo overlay.', 'account to manage your channel emotes — add, remove and rename them — without leaving the bot. 7TV emotes also appear in your overlay’s on-screen chat.', 'para gestionar las emotes del canal — añadirlas, quitarlas y renombrarlas — sin salir del bot. Las emotes 7TV también aparecen en el chat en pantalla de tu overlay.')}</p>
      <div id="svtv-conn"><p class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</p></div>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.sliders)}${L('Le tue emote', 'Your emotes', 'Tus emotes')}</h2>
      <div id="svtv-set"><p class="vuoto">${L('Collega 7TV per vedere le tue emote.', 'Connect 7TV to see your emotes.', 'Conecta 7TV para ver tus emotes.')}</p></div>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.piu)}${L('Aggiungi emote', 'Add emotes', 'Añadir emotes')}</h2>
      <p>${L('Cerca nella directory pubblica 7TV e aggiungi con un clic. Oppure incolla il link (o l\'ID) di un\'emote 7TV.', 'Search the public 7TV directory and add with one click. Or paste the link (or ID) of a 7TV emote.', 'Busca en el directorio público de 7TV y añade con un clic. O pega el enlace (o el ID) de una emote 7TV.')}</p>
      <div class="riga-flessibile">
        <input type="search" id="svtv-cerca" class="campo-largo" placeholder="${L('Cerca un\'emote…', 'Search an emote…', 'Busca una emote…')}" maxlength="60">
        <button class="btn secondario" id="svtv-cerca-btn">${L('Cerca', 'Search', 'Buscar')}</button>
      </div>
      <div id="svtv-risultati" class="svtv-griglia spazio-sopra"></div>
      <label class="campo spazio-sopra" for="svtv-link">${L('…oppure aggiungi da link / ID', '…or add by link / ID', '…o añade por enlace / ID')}</label>
      <div class="riga-flessibile">
        <input type="text" id="svtv-link" class="campo-largo" placeholder="https://7tv.app/emotes/…" maxlength="200">
        <input type="text" id="svtv-alias" placeholder="${L('alias (facoltativo)', 'alias (optional)', 'alias (opcional)')}" maxlength="40" style="max-width:180px">
        <button class="btn secondario" id="svtv-link-btn">${L('Aggiungi', 'Add', 'Añadir')}</button>
      </div>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.effetti)}${L('Carica una tua emote', 'Upload your own emote', 'Sube tu propia emote')}</h2>
      <p>${L('Immagine, GIF (anche', 'Image, GIF (even', 'Imagen, GIF (incluso')} <strong class="primo-piano">${L('trasparente', 'transparent', 'transparente')}</strong>) ${L('o', 'or', 'o')} <strong class="primo-piano">${L('video', 'video', 'vídeo')}</strong>: ${L('la convertiamo noi nel formato giusto per 7TV (WebP animato con trasparenza) e la aggiungiamo subito al tuo canale.', 'we convert it into the right 7TV format (animated WebP with transparency) and add it to your channel right away.', 'la convertimos al formato correcto para 7TV (WebP animado con transparencia) y la añadimos enseguida a tu canal.')}</p>
      <label class="campo" for="svtv-file">${L('File (immagine / GIF / video)', 'File (image / GIF / video)', 'Archivo (imagen / GIF / vídeo)')}</label>
      <input type="file" id="svtv-file" accept="image/*,video/*">
      <div class="riga-flessibile spazio-sopra">
        <span class="prefisso-cmd">:</span>
        <input type="text" id="svtv-nome" class="campo-largo" placeholder="${L('nome dell\'emote (senza spazi)', 'emote name (no spaces)', 'nombre de la emote (sin espacios)')}" maxlength="60">
        <input type="text" id="svtv-alias-up" placeholder="${L('alias nel canale (facoltativo)', 'alias in your channel (optional)', 'alias en tu canal (opcional)')}" maxlength="60" style="max-width:210px">
        <button class="btn" id="svtv-carica-btn">${L('Carica su 7TV', 'Upload to 7TV', 'Subir a 7TV')}</button>
      </div>
      <p class="suggerimento" id="svtv-carica-esito">${L('I video diventano emote animate; le GIF trasparenti restano trasparenti. Durata max ~6s, ridimensionata in automatico. L\'alias è il nome con cui appare nel tuo canale (se vuoto, usa il nome dell\'emote).', 'Videos become animated emotes; transparent GIFs stay transparent. Max ~6s, auto-resized. The alias is the name it shows under in your channel (if empty, it uses the emote name).', 'Los vídeos se vuelven emotes animadas; los GIF transparentes siguen transparentes. Máx. ~6s, con redimensionado automático. El alias es el nombre con el que aparece en tu canal (si está vacío, usa el nombre de la emote).')}</p>
    </div>`);
}

// Card di una singola emote (immagine + nome + azioni). `azioni` è HTML già pronto.
function _svtvEmoteCard(e, azioni) {
  return `<div class="svtv-card" data-id="${esc(e.id)}" data-nome="${esc(e.nome)}">
    <div class="svtv-img-wrap"><img class="svtv-img" src="${esc(e.url)}" alt="${esc(e.nome)}" loading="lazy">${e.animato ? '<span class="svtv-anim" title="animata">GIF</span>' : ''}</div>
    <div class="svtv-nome" title="${esc(e.nome)}">${esc(e.nome)}</div>
    ${e.autore ? `<div class="meta">${L('di', 'by', 'de')} ${esc(e.autore)}</div>` : ''}
    <div class="svtv-azioni">${azioni}</div>
  </div>`;
}

let _svtvCollegato = false;

async function caricaEmote7TV() {
  const conn = document.getElementById('svtv-conn');
  if (!conn) return;
  const proprietario = stato?.ruolo !== 'moderatore';
  let d;
  try { d = await api('/api/seventv/stato'); }
  catch { conn.innerHTML = `<p class="suggerimento">${L('Impossibile caricare lo stato di 7TV.', 'Could not load 7TV status.', 'No se pudo cargar el estado de 7TV.')}</p>`; return; }
  _svtvCollegato = !!d.collegato;

  if (d.collegato) {
    conn.innerHTML = `<div class="riga-interruttore">
        <span class="badge verde">● ${L('7TV collegato', '7TV connected', '7TV conectado')}${d.username ? ' (@' + esc(d.username) + ')' : ''}</span>
        ${proprietario ? `<button class="btn secondario mini" id="svtv-scollega">${L('Scollega', 'Disconnect', 'Desconectar')}</button>` : ''}
      </div>
      ${proprietario ? '' : `<p class="suggerimento spazio-sopra">${L('Solo il proprietario del canale può collegare o scollegare 7TV.', 'Only the channel owner can connect or disconnect 7TV.', 'Solo el propietario del canal puede conectar o desconectar 7TV.')}</p>`}`;
    document.getElementById('svtv-scollega')?.addEventListener('click', () => conErrore(async () => {
      if (!confirm(L('Scollegare 7TV? Il token verrà rimosso dal server.', 'Disconnect 7TV? The token will be removed from the server.', '¿Desconectar 7TV? El token se eliminará del servidor.'))) return;
      await api('/api/seventv/disconnect', { method: 'POST', body: {} });
      toast(L('7TV scollegato.', '7TV disconnected.', '7TV desconectado.')); caricaEmote7TV();
    }));
    _svtvCaricaSet();
  } else if (!proprietario) {
    conn.innerHTML = `<p class="suggerimento">${L('7TV non è ancora collegato. Solo il proprietario del canale può collegarlo.', '7TV is not connected yet. Only the channel owner can connect it.', '7TV aún no está conectado. Solo el propietario del canal puede conectarlo.')}</p>`;
  } else {
    conn.innerHTML = `
      <label class="campo" for="svtv-token">${L('Token del tuo account 7TV', 'Your 7TV account token', 'Token de tu cuenta 7TV')}</label>
      <div class="riga-flessibile">
        <input type="password" id="svtv-token" class="campo-largo" placeholder="${L('incolla qui il token…', 'paste the token here…', 'pega aquí el token…')}" autocomplete="off">
        <button class="btn" id="svtv-collega">${L('Collega 7TV', 'Connect 7TV', 'Conectar 7TV')}</button>
      </div>
      <p class="suggerimento spazio-sopra">${L('Il token resta sul server e non è mai esposto al browser. Serve perché sei tu il proprietario delle tue emote 7TV.', 'The token stays on the server and is never exposed to the browser. It’s needed because you own your 7TV emotes.', 'El token se queda en el servidor y nunca se expone al navegador. Hace falta porque tú eres el dueño de tus emotes 7TV.')}</p>
      <details class="spazio-sopra">
        <summary>${L('Come trovo il mio token 7TV?', 'How do I find my 7TV token?', '¿Cómo encuentro mi token de 7TV?')}</summary>
        <ol class="suggerimento">
          <li>${L('Vai su', 'Go to', 'Ve a')} <a href="https://7tv.app" target="_blank" rel="noopener">7tv.app</a> ${L('e accedi con Twitch.', 'and log in with Twitch.', 'e inicia sesión con Twitch.')}</li>
          <li>${L('Apri gli strumenti sviluppatore del browser (tasto F12) e vai alla scheda «Rete» (Network).', 'Open the browser developer tools (F12 key) and go to the «Network» tab.', 'Abre las herramientas de desarrollo del navegador (tecla F12) y ve a la pestaña «Red» (Network).')}</li>
          <li>${L('Ricarica la pagina, clicca una richiesta verso 7tv.io e, tra gli header della richiesta, copia il valore dopo «authorization: Bearer ».', 'Reload the page, click a request to 7tv.io and, among the request headers, copy the value after «authorization: Bearer ».', 'Recarga la página, haz clic en una petición a 7tv.io y, entre los encabezados de la petición, copia el valor después de «authorization: Bearer ».')}</li>
          <li>${L('Incollalo qui sopra e premi «Collega 7TV».', 'Paste it above and press «Connect 7TV».', 'Pégalo arriba y pulsa «Conectar 7TV».')}</li>
        </ol>
      </details>`;
    document.getElementById('svtv-collega')?.addEventListener('click', () => conErrore(async () => {
      const token = (document.getElementById('svtv-token')?.value || '').trim();
      if (!token) { toast(L('Incolla il token del tuo account 7TV.', 'Paste your 7TV account token.', 'Pega el token de tu cuenta 7TV.'), 'errore'); return; }
      const r = await api('/api/seventv/connect', { method: 'POST', body: { token } });
      toast(L('7TV collegato!', '7TV connected!', '¡7TV conectado!') + (r?.username ? ' (@' + r.username + ')' : ''));
      caricaEmote7TV();
    }));
  }

  // ricerca + aggiunta da link (attive solo da collegati; il server comunque protegge)
  const cercaBtn = document.getElementById('svtv-cerca-btn');
  const cercaInp = document.getElementById('svtv-cerca');
  const faiCerca = () => conErrore(async () => {
    const q = (cercaInp?.value || '').trim();
    const box = document.getElementById('svtv-risultati');
    if (!q) { if (box) box.innerHTML = ''; return; }
    if (box) box.innerHTML = `<p class="vuoto">${L('Cerco…', 'Searching…', 'Buscando…')}</p>`;
    let r;
    try { r = await api('/api/seventv/cerca?q=' + encodeURIComponent(q)); }
    catch { if (box) box.innerHTML = `<p class="vuoto">${L('Ricerca non disponibile ora.', 'Search not available now.', 'Búsqueda no disponible ahora.')}</p>`; return; }
    const items = r.items || [];
    if (!items.length) { if (box) box.innerHTML = `<p class="vuoto">${L('Nessuna emote trovata.', 'No emotes found.', 'No se han encontrado emotes.')}</p>`; return; }
    box.innerHTML = items.map((e) => _svtvEmoteCard(e,
      `<button type="button" class="btn mini svtv-add" data-id="${esc(e.id)}">${_bIco(ICO.piu)}${L('Aggiungi', 'Add', 'Añadir')}</button>`)).join('');
  });
  cercaBtn?.addEventListener('click', faiCerca);
  cercaInp?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); faiCerca(); } });

  // delega sui risultati: «Aggiungi»
  document.getElementById('svtv-risultati')?.addEventListener('click', (ev) => {
    const b = ev.target.closest('.svtv-add'); if (!b) return;
    _svtvAggiungi(b.dataset.id, '', b);
  });

  // aggiungi da link / ID
  document.getElementById('svtv-link-btn')?.addEventListener('click', () => {
    const v = (document.getElementById('svtv-link')?.value || '').trim();
    const alias = (document.getElementById('svtv-alias')?.value || '').trim();
    if (!v) { toast(L('Incolla il link o l\'ID di un\'emote 7TV.', 'Paste the link or ID of a 7TV emote.', 'Pega el enlace o el ID de una emote 7TV.'), 'errore'); return; }
    _svtvAggiungi(v, alias, document.getElementById('svtv-link-btn'));
  });

  // carica una TUA emote (immagine/gif/video → 7TV)
  document.getElementById('svtv-carica-btn')?.addEventListener('click', () => _svtvCarica());
}

// Upload multipart di un file → il server lo converte in webp e lo carica su 7TV.
async function _svtvCarica() {
  if (!_svtvCollegato) { toast(L('Collega prima il tuo account 7TV.', 'Connect your 7TV account first.', 'Conecta antes tu cuenta 7TV.'), 'errore'); return; }
  if (DEMO) { toast(L('In demo non si caricano file — accedi per farlo davvero.', "In demo you can't upload files — log in to do it for real.", 'En la demo no se suben archivos — inicia sesión para hacerlo de verdad.')); return; }
  const fileInp = document.getElementById('svtv-file');
  const nomeInp = document.getElementById('svtv-nome');
  const aliasInp = document.getElementById('svtv-alias-up');
  const file = fileInp?.files?.[0];
  const nome = (nomeInp?.value || '').trim();
  const alias = (aliasInp?.value || '').trim();
  if (!file) { toast(L('Scegli un file da caricare.', 'Choose a file to upload.', 'Elige un archivo para subir.'), 'errore'); return; }
  if (nome.replace(/\s+/g, '').length < 2) { toast(L('Dai un nome all\'emote (min 2 caratteri, niente spazi).', 'Give the emote a name (min 2 characters, no spaces).', 'Ponle un nombre a la emote (mín. 2 caracteres, sin espacios).'), 'errore'); return; }
  const btn = document.getElementById('svtv-carica-btn');
  const orig = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = L('Converto e carico… ⏳', 'Converting & uploading… ⏳', 'Convirtiendo y subiendo… ⏳'); }
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('nome', nome);
    if (alias) fd.append('alias', alias);
    const res = await fetch('/api/seventv/carica', { method: 'POST', body: fd });
    let d = null; try { d = await res.json(); } catch { /* non JSON */ }
    if (!res.ok) throw new Error(d?.errore || ('errore ' + res.status));
    toast(d.aggiunta
      ? L('Emote caricata e aggiunta al canale ✓', 'Emote uploaded and added to your channel ✓', 'Emote subida y añadida a tu canal ✓')
      : L('Emote caricata su 7TV ✓', 'Emote uploaded to 7TV ✓', 'Emote subida a 7TV ✓'));
    if (d.avviso) toast(L('Nota: ', 'Note: ', 'Nota: ') + d.avviso);
    if (fileInp) fileInp.value = '';
    if (nomeInp) nomeInp.value = '';
    if (aliasInp) aliasInp.value = '';
    _svtvCaricaSet();
  } catch (e) {
    toast((e?.message || L('Caricamento non riuscito.', 'Upload failed.', 'Subida fallida.')), 'errore');
  } finally { if (btn) { btn.disabled = false; btn.textContent = orig; } }
}

async function _svtvAggiungi(emoteId, alias, btn) {
  if (!_svtvCollegato) { toast(L('Collega prima il tuo account 7TV.', 'Connect your 7TV account first.', 'Conecta antes tu cuenta 7TV.'), 'errore'); return; }
  if (btn) btn.disabled = true;
  try {
    await api('/api/seventv/aggiungi', { method: 'POST', body: { emoteId, alias } });
    toast(L('Emote aggiunta ✓', 'Emote added ✓', 'Emote añadida ✓'));
    const l = document.getElementById('svtv-link'); if (l) l.value = '';
    const a = document.getElementById('svtv-alias'); if (a) a.value = '';
    _svtvCaricaSet();
  } catch (e) {
    toast((e?.message || L('Aggiunta non riuscita.', 'Add failed.', 'No se pudo añadir.')), 'errore');
  } finally { if (btn) btn.disabled = false; }
}

async function _svtvCaricaSet() {
  const box = document.getElementById('svtv-set');
  if (!box) return;
  box.innerHTML = `<p class="vuoto">${L('Carico le emote…', 'Loading emotes…', 'Cargando emotes…')}</p>`;
  let set;
  try { set = await api('/api/seventv/emotes'); }
  catch { box.innerHTML = `<p class="vuoto">${L('Non riesco a leggere il tuo emote-set.', 'Can’t read your emote set.', 'No puedo leer tu emote-set.')}</p>`; return; }
  const emotes = set.emotes || [];
  const cap = set.capienza ? ` <span class="suggerimento">${set.usate}/${set.capienza}</span>` : ` <span class="suggerimento">${emotes.length}</span>`;
  const testa = `<p><strong>${esc(set.nome || L('Set attivo', 'Active set', 'Set activo'))}</strong>${cap}</p>`;
  if (!emotes.length) { box.innerHTML = testa + `<p class="vuoto">${L('Nessuna emote nel set. Aggiungine qui sotto!', 'No emotes in the set. Add some below!', '¡No hay emotes en el set. Añade algunas abajo!')}</p>`; return; }
  const proprietario = stato?.ruolo !== 'moderatore';
  box.innerHTML = testa + `<div class="svtv-griglia">` + emotes.map((e) => _svtvEmoteCard(e, proprietario
    ? `<button type="button" class="btn secondario mini svtv-rinomina" data-id="${esc(e.id)}" data-nome="${esc(e.nome)}" title="${L('Rinomina', 'Rename', 'Renombrar')}">${_bIco(ICO.scrivi || ICO.moduli)}</button>
       <button type="button" class="btn pericolo mini svtv-rimuovi" data-id="${esc(e.id)}" data-nome="${esc(e.nome)}" title="${L('Togli', 'Remove', 'Quitar')}">✕</button>`
    : '')).join('') + `</div>`;

  box.querySelectorAll('.svtv-rimuovi').forEach((b) => b.addEventListener('click', () => conErrore(async () => {
    if (!confirm(L('Togliere «', 'Remove «', 'Quitar «') + b.dataset.nome + L('» dal tuo canale?', '» from your channel?', '» de tu canal?'))) return;
    await api('/api/seventv/rimuovi', { method: 'POST', body: { emoteId: b.dataset.id } });
    toast(L('Emote rimossa.', 'Emote removed.', 'Emote quitada.')); _svtvCaricaSet();
  })));
  box.querySelectorAll('.svtv-rinomina').forEach((b) => b.addEventListener('click', () => conErrore(async () => {
    const nome = (prompt(L('Nuovo nome per l\'emote:', 'New name for the emote:', 'Nuevo nombre para la emote:'), b.dataset.nome) || '').trim();
    if (!nome || nome === b.dataset.nome) return;
    await api('/api/seventv/rinomina', { method: 'POST', body: { emoteId: b.dataset.id, nome } });
    toast(L('Emote rinominata ✓', 'Emote renamed ✓', 'Emote renombrada ✓')); _svtvCaricaSet();
  })));
}

// --- scheda Moduli ------------------------------------------------------
// Automazioni componibili col modello QUANDO → SE → ALLORA.

function pannelloModuli() {
  const chipsRapido = ['$user', '$touser', '$giocotarget', '$canale', '$uptime', '$gioco', '$titolo($args)', '$categoria($args)', '$count(morti)', '$random(1,100)']
    .map((v) => `<button type="button" class="chip-var" data-qc="${esc(v)}">${esc(v)}</button>`).join('');
  return pannello('moduli', `
    <div class="carta">
      <h2>${_hIco(ICO.fulmine)}${L('Comando rapido', 'Quick command', 'Comando rápido')}</h2>
      <p>${L('Il modo più veloce: scrivi il', 'The fastest way: type the', 'La forma más rápida: escribe el')} <strong class="primo-piano">${L('nome', 'name', 'nombre')}</strong> ${L('e', 'and', 'y')} <strong class="primo-piano">${L('cosa deve rispondere', 'what it should reply', 'qué debe responder')}</strong>. ${L('Fatto — niente altro da compilare.', 'Done — nothing else to fill in.', 'Listo — nada más que rellenar.')}</p>
      <div class="riga-flessibile">
        <span class="prefisso-cmd">!</span>
        <input type="text" id="qc-nome" class="campo-largo" placeholder="social" maxlength="24">
      </div>
      <label class="campo" for="qc-risposta">${L('Risposta', 'Reply', 'Respuesta')}</label>
      <textarea id="qc-risposta" placeholder="${L('es. I miei social li trovi su socialbot.live/u/$canale', 'e.g. Find my socials at socialbot.live/u/$canale', 'p. ej. Mis redes están en socialbot.live/u/$canale')}"></textarea>
      <div class="chip-vars" id="qc-chips">${chipsRapido}</div>
      <p class="suggerimento spazio-sopra">${L('Puoi anche', 'You can also', 'También puedes')} <strong>${L('cambiare titolo e categoria', 'change title and category', 'cambiar título y categoría')}</strong> ${L('dal comando:', 'from the command:', 'desde el comando:')}
      <code>$categoria($args)</code> (${L('es.', 'e.g.', 'p. ej.')} <code>!gioco fortnite</code>) ${L('e', 'and', 'y')} <code>$titolo($args)</code>. ${L('Il token sparisce dal messaggio, scrivi tu la conferma. Consiglio: metti questi comandi', 'The token disappears from the message; you write the confirmation. Tip: make these commands', 'El token desaparece del mensaje; escribe tú la confirmación. Consejo: pon estos comandos')} <strong>${L('solo per i mod', 'mods only', 'solo para mods')}</strong>.</p>
      <p class="suggerimento">${L('Per uno', 'For a', 'Para un')} <strong>shoutout</strong>: <code>$touser</code> ${L('è il nome scritto dopo il comando e', 'is the name typed after the command and', 'es el nombre escrito tras el comando y')}
      <code>$giocotarget</code> ${L('è l\'ultimo gioco del suo canale. Es.', 'is the last game on their channel. E.g.', 'es el último juego de su canal. P. ej.')} <code>!so giorgiottv</code> ${L('con risposta', 'with reply', 'con respuesta')}
      <em>${L('"Andate a seguire @$touser! Stava streammando $giocotarget"', '"Go follow @$touser! They were streaming $giocotarget"', '"¡Id a seguir a @$touser! Estaba jugando a $giocotarget"')}</em>. ${L('Nota:', 'Note:', 'Nota:')} <code>$giocotarget</code> ${L('funziona solo se c\'è un destinatario (il nome dopo il comando).', 'works only if there’s a target (the name after the command).', 'funciona solo si hay un destinatario (el nombre tras el comando).')}</p>
      <p class="spazio-sopra">
        <button class="btn" id="btn-qc">${L('Aggiungi comando', 'Add command', 'Añadir comando')}</button>
        <span class="suggerimento">${L('Per condizioni, eventi, timer, effetti o webhook usa', 'For conditions, events, timers, effects or webhooks use', 'Para condiciones, eventos, temporizadores, efectos o webhooks usa')} <strong>${L('Nuovo modulo', 'New module', 'Nuevo módulo')}</strong> ${L('qui sotto.', 'below.', 'abajo.')}</span>
      </p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.moduli)}${L('Moduli', 'Modules', 'Módulos')}</h2>
      <p>${L('Automazioni avanzate:', 'Advanced automations:', 'Automatizaciones avanzadas:')} <strong class="primo-piano">${L('QUANDO', 'WHEN', 'CUANDO')}</strong> ${L('succede qualcosa,', 'something happens,', 'pasa algo,')}
      <strong class="primo-piano">${L('SE', 'IF', 'SI')}</strong> ${L('valgono certe condizioni,', 'certain conditions hold,', 'se cumplen ciertas condiciones,')} <strong class="primo-piano">${L('ALLORA', 'THEN', 'ENTONCES')}</strong>
      ${L('il bot fa una o più azioni.', 'the bot does one or more actions.', 'el bot hace una o más acciones.')}</p>
      <p class="spazio-sopra"><button class="btn secondario" data-nuovo-modulo>${_bIco(ICO.piu)}${L('Nuovo modulo (avanzato)', 'New module (advanced)', 'Nuevo módulo (avanzado)')}</button></p>
      <p class="suggerimento spazio-sopra">${L('Non sai da dove partire? Scegli un modello pronto e modificalo:', 'Not sure where to start? Pick a ready-made template and tweak it:', '¿No sabes por dónde empezar? Elige una plantilla lista y modifícala:')}</p>
      <div class="modelli-pronti">
        <button class="modello-pronto" data-modello="saluto">${L('Saluto', 'Greeting', 'Saludo')}</button>
        <button class="modello-pronto" data-modello="shoutout">Shoutout</button>
        <button class="modello-pronto" data-modello="timer">${L('Timer annuncio', 'Announcement timer', 'Temporizador de aviso')}</button>
        <button class="modello-pronto" data-modello="social">Social</button>
        <button class="modello-pronto" data-modello="morti">${L('Contatore morti', 'Death counter', 'Contador de muertes')}</button>
        <button class="modello-pronto" data-modello="voce">${L('Comando vocale: clippa', 'Voice command: clip', 'Comando por voz: clipea')}</button>
        <button class="modello-pronto" data-modello="webhook">${L('Collega il mio bot (webhook)', 'Connect my bot (webhook)', 'Conecta mi bot (webhook)')}</button>
      </div>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.lista)}${L('I tuoi moduli', 'Your modules', 'Tus módulos')}</h2>
      <ul id="lista-moduli" class="lista-moduli"><li class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</li></ul>
    </div>

    <div id="editor-modulo"></div>

    <div class="carta">
      <h2>${_hIco(ICO.spina)}${L('Connettori avanzati', 'Advanced connectors', 'Conectores avanzados')}</h2>
      <p>${L('Per far dire o fare qualcosa ad SocialBot', 'To make SocialBot say or do something', 'Para que SocialBot diga o haga algo')} <strong class="primo-piano">${L('da un tuo servizio esterno', 'from an external service of yours', 'desde un servicio externo tuyo')}</strong>
      ${L('(il bot custom che già hai): chiama l\'URL qui sotto con la tua chiave.', '(the custom bot you already have): call the URL below with your key.', '(el bot personalizado que ya tienes): llama a la URL de abajo con tu clave.')}</p>
      <div id="connettori-moduli"><p class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</p></div>
    </div>`);
}

// modelli pronti: precompilano l'editor, l'utente poi salva
function modelloPronto(nome) {
  const cond = () => ({ tier: 'tutti', cooldown: 0, probabilita: 100, soloLive: false, soloOffline: false });
  switch (nome) {
    case 'saluto':
      return { id: null, nome: 'Saluto', attivo: true,
        trigger: { tipo: 'comando', comando: 'ciao', alias: [] }, condizioni: cond(),
        azioni: [{ tipo: 'messaggio', testo: 'Ciao $user!' }] };
    case 'shoutout':
      // "!so giorgiottv" → "Andate a seguire @giorgiottv! Stava streammando <gioco>…"
      // $touser = il nome scritto dopo il comando; $giocotarget = l'ultimo gioco
      // del SUO canale (è legato a $touser: senza destinatario resta vuoto).
      return { id: null, nome: 'Shoutout', attivo: true,
        trigger: { tipo: 'comando', comando: 'so', alias: ['shoutout', 'sh'] }, condizioni: { ...cond(), tier: 'mod' },
        azioni: [{ tipo: 'messaggio', testo: 'Andate tutti a seguire @$touser! Stava streammando $giocotarget twitch.tv/$touser' }] };
    case 'timer':
      return { id: null, nome: 'Timer annuncio', attivo: true,
        trigger: { tipo: 'timer', minuti: 15, minMessaggi: 10 }, condizioni: cond(),
        azioni: [{ tipo: 'messaggio', testo: 'Ricordati di seguire il canale!' }] };
    case 'social':
      return { id: null, nome: 'Social', attivo: true,
        trigger: { tipo: 'comando', comando: 'social', alias: [] }, condizioni: cond(),
        azioni: [{ tipo: 'messaggio', testo: 'I miei social li trovi su socialbot.live/u/$canale' }] };
    case 'morti':
      return { id: null, nome: 'Contatore morti', attivo: true,
        trigger: { tipo: 'comando', comando: 'morte', alias: [] }, condizioni: { ...cond(), tier: 'mod' },
        azioni: [
          { tipo: 'contatore', nome: 'morti', op: 'incrementa', valore: 0 },
          { tipo: 'messaggio', testo: 'Morti oggi: $count(morti)' },
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

// Corpo del bookmarklet "Prendi le quote da x.la": gira NEL browser dell'utente
// sulla pagina x.la (dove il JavaScript ha già disegnato le frasi e lui è loggato),
// pesca le quote dal testo renderizzato e le copia nel formato «frase ⏎ autore | data».
// Qui non viene mai eseguita: la serializziamo con toString() per creare l'href.
function _xlaGrabFn() {
  try {
    var L = (document.body.innerText || '').split('\n').map(function (s) { return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
    var M = /^(.{1,48}?)\s*[|·•–-]\s*(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})$/;
    var G = /please enable javascript|enable javascript|xsolla partner network|shortcut icon/i;
    var o = [], seen = {};
    for (var i = 0; i < L.length; i++) {
      if (M.test(L[i]) || G.test(L[i])) continue;
      var q = L[i].replace(/^[“"'«\s]+|[”"'»\s]+$/g, '').trim();
      if (q.length < 6 || q.length > 300) continue;
      if (q.split(' ').length < 2) continue;
      if (!/[a-zA-Zà-ÿ]/.test(q)) continue;
      var k = q.toLowerCase();
      if (seen[k]) continue; seen[k] = 1;
      var mm = M.exec(L[i + 1] || '');
      o.push('"' + q + '"' + (mm ? '\n' + L[i + 1] : ''));
      if (mm) i++;
    }
    if (!o.length) { alert('Nessuna quote trovata: scorri la pagina x.la fino in fondo per caricarle tutte, poi riprova.'); return; }
    var t = o.join('\n\n');
    var done = function () { alert('Copiate ' + o.length + ' quote! Torna sul bot, incollale in "Importa citazioni" e premi "Riconosci e importa".'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { window.prompt(L('Copia con Ctrl+C:', 'Copy with Ctrl+C:', 'Copia con Ctrl+C:'), t); });
    else window.prompt(L('Copia con Ctrl+C:', 'Copy with Ctrl+C:', 'Copia con Ctrl+C:'), t);
  } catch (e) { alert('Errore: ' + e.message); }
}
// href del bookmarklet: la funzione su una riga sola, pronta da trascinare nei preferiti.
const bookmarkletXla = 'javascript:(' + _xlaGrabFn.toString().replace(/\n\s*/g, ' ') + ')()';

// --- Contatori (morti, tentativi, parole…) --------------------------------
// Sta nella sezione COMANDI (moduli): sono comandi di chat, non minigiochi.
function pannelloContatori() {
  return pannello('moduli', `
    <div class="carta">
      <h2>${_hIco(ICO.moduli)}${L('Contatori', 'Counters', 'Contadores')} <span class="tenue">(!morti, !tentativi…)</span></h2>
      <p>${L('Crea contatori (morti, tentativi, parole…). Tu e i moderatori li gestite in chat:', 'Create counters (deaths, attempts, words…). You and your mods manage them in chat:', 'Crea contadores (muertes, intentos, palabras…). Tú y tus moderadores los gestionáis en el chat:')}
      <code>!morti</code> ${L('mostra il valore;', 'shows the value;', 'muestra el valor;')} <code>!morti+</code> · <code>!morti +3</code> · <code>!morti-</code> · <code>!morti reset</code> · <code>!morti set 10</code> ${L('(solo mod/streamer).', '(mods/streamer only).', '(solo mods/streamer).')}
      ${L('Un contatore può salire anche <strong>da solo</strong> a ogni <em>parola</em> in chat, o con un <strong>premio a punti canale</strong>.', 'A counter can also go up <strong>on its own</strong> on each chat <em>word</em>, or with a <strong>channel-point reward</strong>.', 'Un contador también puede subir <strong>solo</strong> con cada <em>palabra</em> en el chat, o con un <strong>premio de puntos de canal</strong>.')}</p>

      ${miniGuida({
        titolo: L('Tutorial: dal primo contatore all’overlay OBS', 'Tutorial: from your first counter to the OBS overlay', 'Tutorial: de tu primer contador al overlay de OBS'),
        aperta: true,
        serve: L('Un <strong>contatore</strong> è un numero che tu e i moderatori fate salire dalla chat (morti, tentativi, «no» detti…). Puoi anche mostrarlo <strong>a schermo</strong> nell’overlay OBS.', 'A <strong>counter</strong> is a number you and your mods bump from chat (deaths, attempts, “no”s said…). You can also show it <strong>on screen</strong> in the OBS overlay.', 'Un <strong>contador</strong> es un número que tú y tus moderadores subís desde el chat (muertes, intentos, «noes» dichos…). También puedes mostrarlo <strong>en pantalla</strong> en el overlay de OBS.'),
        passi: [
          L('<strong>Crealo</strong> qui sotto in «Nuovo contatore»: scegli il comando (es. <code>morti</code>), un’etichetta e, se vuoi, un’emoji.', '<strong>Create it</strong> below in “New counter”: choose the command (e.g. <code>deaths</code>), a label and, if you like, an emoji.', '<strong>Créalo</strong> abajo en «Nuevo contador»: elige el comando (ej. <code>muertes</code>), una etiqueta y, si quieres, un emoji.'),
          L('<strong>Accendilo a schermo</strong> scrivendo in chat <code>!morti on</code> (parte da 0 e appare nell’overlay). Lo spegni con <code>!morti off</code>.', '<strong>Turn it on screen</strong> by typing <code>!deaths on</code> in chat (starts from 0 and appears in the overlay). Turn it off with <code>!deaths off</code>.', '<strong>Enciéndelo en pantalla</strong> escribiendo <code>!muertes on</code> en el chat (empieza en 0 y aparece en el overlay). Lo apagas con <code>!muertes off</code>.'),
          L('<strong>Fallo salire</strong> (solo tu e i mod): <code>!morti+</code>, <code>!morti +3</code>, <code>!morti-</code>, <code>!morti reset</code>, <code>!morti set 10</code>. Chiunque può leggerlo con <code>!morti</code>.', '<strong>Make it go up</strong> (you and mods only): <code>!deaths+</code>, <code>!deaths +3</code>, <code>!deaths-</code>, <code>!deaths reset</code>, <code>!deaths set 10</code>. Anyone can read it with <code>!deaths</code>.', '<strong>Súbelo</strong> (solo tú y los mods): <code>!muertes+</code>, <code>!muertes +3</code>, <code>!muertes-</code>, <code>!muertes reset</code>, <code>!muertes set 10</code>. Cualquiera lo lee con <code>!muertes</code>.'),
          L('<strong>In automatico</strong>: metti una «parola automatica» (es. «lol») e il contatore sale da solo ogni volta che appare in chat; oppure premi «Crea premio» per collegarlo a un <strong>punto canale</strong>.', '<strong>Automatically</strong>: set an “auto word” (e.g. “lol”) and the counter rises on its own whenever it shows up in chat; or hit “Create reward” to link it to a <strong>channel point</strong>.', '<strong>En automático</strong>: pon una «palabra automática» (ej. «lol») y el contador sube solo cada vez que aparece en el chat; o pulsa «Crear premio» para vincularlo a un <strong>punto de canal</strong>.'),
          L('<strong>Scegli dove appare</strong>: attiva «Mostra in overlay» e usa il menu <strong>Posizione a schermo</strong> (in alto a destra, in basso al centro…). Sotto puoi personalizzare colori, dimensione, font, formato del testo e le <strong>parole per accendere/spegnere</strong>.', '<strong>Choose where it shows</strong>: turn on “Show in overlay” and use the <strong>On-screen position</strong> menu (top right, bottom center…). Below you can customize colors, size, font, text format and the <strong>words to turn on/off</strong>.', '<strong>Elige dónde aparece</strong>: activa «Mostrar en overlay» y usa el menú <strong>Posición en pantalla</strong> (arriba a la derecha, abajo en el centro…). Debajo puedes personalizar colores, tamaño, fuente, formato del texto y las <strong>palabras para encender/apagar</strong>.'),
        ],
        note: [
          L('Il contatore usa lo <strong>stesso overlay OBS</strong> di alert ed effetti: se ce l’hai già in OBS, non devi aggiungere nulla.', 'The counter uses the <strong>same OBS overlay</strong> as alerts and effects: if it’s already in OBS, you don’t need to add anything.', 'El contador usa el <strong>mismo overlay de OBS</strong> que las alertas y los efectos: si ya lo tienes en OBS, no hace falta añadir nada.'),
        ],
      })}

      <div id="contatori-box" class="spazio-sopra"><p class="suggerimento">${L('Carico…', 'Loading…', 'Cargando…')}</p></div>

      <hr class="separatore">
      <h3>${L('Nuovo contatore', 'New counter', 'Nuevo contador')}</h3>
      <div class="griglia-campi">
        <div><label class="campo" for="cont-comando">${L('Comando (senza !)', 'Command (no !)', 'Comando (sin !)')}</label><input type="text" id="cont-comando" maxlength="30" placeholder="morti"></div>
        <div><label class="campo" for="cont-etichetta">${L('Etichetta', 'Label', 'Etiqueta')}</label><input type="text" id="cont-etichetta" maxlength="40" placeholder="Morti"></div>
      </div>
      <div class="griglia-campi spazio-sopra">
        <div><label class="campo" for="cont-emoji">${L('Emoji', 'Emoji', 'Emoji')} <span class="suggerimento">(${L('facolt.', 'optional', 'opcional')})</span></label><input type="text" id="cont-emoji" maxlength="4" placeholder="💀"></div>
        <div><label class="campo" for="cont-step">${L('Passo (+)', 'Step (+)', 'Paso (+)')}</label><input type="number" id="cont-step" min="1" max="1000" value="1"></div>
      </div>
      <label class="campo spazio-sopra" for="cont-parola">${L('Parola automatica', 'Auto word', 'Palabra automática')} <span class="suggerimento">(${L('facolt.', 'optional', 'opcional')})</span></label>
      <input type="text" id="cont-parola" maxlength="40" placeholder="${esc(L('es. «lol» → +1 ogni volta che appare in chat', 'e.g. «lol» → +1 each time it appears in chat', 'ej. «lol» → +1 cada vez que aparece en el chat'))}">
      <p class="spazio-sopra"><button class="btn" id="cont-crea">${L('Crea contatore', 'Create counter', 'Crear contador')}</button></p>
    </div>`);
}

async function caricaContatori() {
  const box = document.getElementById('contatori-box'); if (!box) return;
  let d; try { d = await api('/api/contatori'); }
  catch { box.innerHTML = `<p class="suggerimento">${L('Impossibile caricare i contatori.', 'Couldn\'t load counters.', 'No se pudieron cargar los contadores.')}</p>`; return; }
  const list = d.contatori || [];
  const FONTS = [['system', 'Sistema'], ['inter', 'Inter'], ['spaceGrotesk', 'Space Grotesk'], ['jetBrainsMono', 'JetBrains Mono'], ['fraunces', 'Fraunces'], ['bricolage', 'Bricolage']];
  const fontOpts = (sel) => FONTS.map(([k, n]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${n}</option>`).join('');
  // Preset di posizione [chiave, X%, Y%, etichetta]: riempiono i campi X/Y (che
  // restano per la regolazione fine). L'overlay ancora il widget all'angolo giusto.
  const POSZ = [
    ['alto-sx', 4, 6, L('In alto a sinistra', 'Top left', 'Arriba a la izquierda')],
    ['alto-c', 50, 6, L('In alto al centro', 'Top center', 'Arriba en el centro')],
    ['alto-dx', 96, 6, L('In alto a destra', 'Top right', 'Arriba a la derecha')],
    ['centro-sx', 4, 50, L('Al centro a sinistra', 'Middle left', 'En el centro a la izquierda')],
    ['centro', 50, 50, L('Al centro', 'Center', 'En el centro')],
    ['centro-dx', 96, 50, L('Al centro a destra', 'Middle right', 'En el centro a la derecha')],
    ['basso-sx', 4, 94, L('In basso a sinistra', 'Bottom left', 'Abajo a la izquierda')],
    ['basso-c', 50, 94, L('In basso al centro', 'Bottom center', 'Abajo en el centro')],
    ['basso-dx', 96, 94, L('In basso a destra', 'Bottom right', 'Abajo a la derecha')],
  ];
  const posOpts = (x, y) => {
    const cur = (POSZ.find(([, px, py]) => px === Number(x) && py === Number(y)) || [''])[0];
    return POSZ.map(([k, , , lab]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${lab}</option>`).join('')
      + `<option value=""${cur === '' ? ' selected' : ''}>${L('Personalizzata (X/Y sotto)', 'Custom (X/Y below)', 'Personalizada (X/Y abajo)')}</option>`;
  };
  box.innerHTML = list.length ? list.map((c) => {
    const o = c.overlayCfg || {};
    const hexBg = /^#/.test(o.sfondo || '') ? o.sfondo : '#000000';
    const trasp = !o.sfondo || o.sfondo === 'transparent';
    return `
    <div class="cont-riga">
      <span class="cont-info">${c.emoji ? esc(c.emoji) + ' ' : ''}<strong>${esc(c.etichetta || c.comando)}</strong> <code>!${esc(c.comando)}</code>${o.mostra ? ` <span class="tenue">· 📺 ${L('a schermo', 'on screen', 'en pantalla')}</span>` : ''}${c.auto_parola ? ` <span class="tenue">· ${L('auto', 'auto', 'auto')}: «${esc(c.auto_parola)}»</span>` : ''}${c.reward_id ? ` <span class="tenue">· 🏆 ${L('premio', 'reward', 'premio')}</span>` : ''}</span>
      <span class="cont-val" data-cv="${esc(c.comando)}">${c.valore}</span>
      <span class="cont-azioni">
        ${o.mostra
          ? `<button type="button" class="btn secondario mini" data-ca="off" data-cmd="${esc(c.comando)}" title="${L('Toglilo dallo schermo (come !' + esc(c.comando) + ' off)', 'Hide it from screen (like !' + esc(c.comando) + ' off)', 'Quítalo de la pantalla (como !' + esc(c.comando) + ' off)')}">${L('Spegni a schermo', 'Hide on screen', 'Apagar en pantalla')}</button>`
          : `<button type="button" class="btn secondario mini acceso" data-ca="on" data-cmd="${esc(c.comando)}" title="${L('Mostralo a schermo da 0 (come !' + esc(c.comando) + ' on)', 'Show it on screen from 0 (like !' + esc(c.comando) + ' on)', 'Muéstralo en pantalla desde 0 (como !' + esc(c.comando) + ' on)')}">📺 ${L('Accendi a schermo', 'Show on screen', 'Encender en pantalla')}</button>`}
        <button type="button" class="btn secondario mini" data-ca="piu" data-cmd="${esc(c.comando)}" data-val="${c.valore}" data-step="${c.step}">+${c.step}</button>
        <button type="button" class="btn secondario mini" data-ca="meno" data-cmd="${esc(c.comando)}" data-val="${c.valore}" data-step="${c.step}">−${c.step}</button>
        <button type="button" class="btn secondario mini" data-ca="reset" data-cmd="${esc(c.comando)}">${L('Reset', 'Reset', 'Reset')}</button>
        <button type="button" class="btn secondario mini" data-ca="reward" data-cmd="${esc(c.comando)}">${c.reward_id ? L('Scollega premio', 'Unlink reward', 'Desvincular premio') : L('Crea premio', 'Create reward', 'Crear premio')}</button>
        <button type="button" class="btn secondario mini" data-ca="del" data-cmd="${esc(c.comando)}" title="${L('Elimina', 'Delete', 'Eliminar')}">🗑</button>
      </span>
      <div class="cont-comandi">
        <span class="cont-comandi-tit">${L('Comandi in chat', 'Chat commands', 'Comandos en el chat')}</span>
        <code>!${esc(c.comando)}</code> <span class="tenue">${L('leggi', 'read', 'leer')}</span>
        · <code>!${esc(c.comando)} on</code> / <code>!${esc(c.comando)} off</code> <span class="tenue">${L('accendi/spegni a schermo (parte da 0)', 'show/hide on screen (starts from 0)', 'encender/apagar en pantalla (empieza en 0)')}</span>
        · <code>!${esc(c.comando)}+</code> <code>!${esc(c.comando)} +3</code> <code>!${esc(c.comando)}-</code> <code>!${esc(c.comando)} reset</code> <code>!${esc(c.comando)} set 10</code> <span class="tenue">(${L('solo mod/streamer', 'mods/streamer only', 'solo mods/streamer')})</span>
      </div>
      <details class="cont-ov">
        <summary>${L('Personalizza l\'aspetto a schermo (overlay)', 'Customize the on-screen look (overlay)', 'Personaliza el aspecto en pantalla (overlay)')}</summary>
        <div class="cont-ov-form" data-ovform="${esc(c.comando)}">
          <label class="riga-check riga-mostra"><input type="checkbox" data-ovk="mostra"${o.mostra ? ' checked' : ''}> <strong>${L('Mostra in overlay', 'Show in overlay', 'Mostrar en overlay')}</strong> <span class="suggerimento">${L('(lo stesso overlay di OBS/Studio)', '(the same overlay as OBS/Studio)', '(el mismo overlay de OBS/Studio)')}</span></label>
          <label class="campo spazio-sopra">${L('Posizione a schermo', 'On-screen position', 'Posición en pantalla')}</label>
          <select data-ovk="posizione" class="campo-largo">${posOpts(o.x, o.y)}</select>
          <details class="cont-fine">
            <summary>${L('Regolazione fine (X/Y manuali)', 'Fine tuning (manual X/Y)', 'Ajuste fino (X/Y manual)')}</summary>
            <div class="griglia-campi spazio-sopra">
              <div><label class="campo">${L('Posizione X %', 'Position X %', 'Posición X %')}</label><input type="number" data-ovk="x" min="0" max="100" value="${Number(o.x) || 0}"></div>
              <div><label class="campo">${L('Posizione Y %', 'Position Y %', 'Posición Y %')}</label><input type="number" data-ovk="y" min="0" max="100" value="${Number(o.y) || 0}"></div>
            </div>
          </details>
          <div class="griglia-campi spazio-sopra">
            <div><label class="campo">${L('Colore testo', 'Text color', 'Color texto')}</label><input type="color" data-ovk="colore" value="${esc(o.colore || '#ffffff')}"></div>
            <div><label class="campo">${L('Dimensione (px)', 'Size (px)', 'Tamaño (px)')}</label><input type="number" data-ovk="dim" min="10" max="200" value="${Number(o.dim) || 40}"></div>
          </div>
          <div class="griglia-campi spazio-sopra">
            <div><label class="campo">${L('Colore sfondo', 'Background color', 'Color de fondo')}</label><input type="color" data-ovk="sfondo" value="${esc(hexBg)}"></div>
            <div><label class="campo">Font</label><select data-ovk="font">${fontOpts(o.font || 'system')}</select></div>
          </div>
          <label class="riga-check spazio-sopra"><input type="checkbox" data-ovk="trasp"${trasp ? ' checked' : ''}> ${L('Sfondo trasparente', 'Transparent background', 'Fondo transparente')}</label>
          <label class="riga-check"><input type="checkbox" data-ovk="grassetto"${o.grassetto ? ' checked' : ''}> ${L('Grassetto', 'Bold', 'Negrita')}</label>
          <label class="campo spazio-sopra">${L('Formato del testo', 'Text format', 'Formato del texto')}</label>
          <input type="text" data-ovk="formato" maxlength="80" value="${esc(o.formato || '{emoji} {etichetta}: {valore}')}" placeholder="{emoji} {etichetta}: {valore}">
          <p class="suggerimento">${L('Segnaposto:', 'Placeholders:', 'Marcadores:')} <code>{emoji}</code> <code>{etichetta}</code> <code>{valore}</code></p>
          <div class="griglia-campi spazio-sopra">
            <div><label class="campo">${L('Parola per ACCENDERE', 'Word to TURN ON', 'Palabra para ENCENDER')}</label><input type="text" data-ovk="parolaOn" maxlength="60" value="${esc(o.parolaOn || '')}" placeholder="es. acceso, ok, vai"></div>
            <div><label class="campo">${L('Parola per SPEGNERE', 'Word to TURN OFF', 'Palabra para APAGAR')}</label><input type="text" data-ovk="parolaOff" maxlength="60" value="${esc(o.parolaOff || '')}" placeholder="es. spento, stop"></div>
          </div>
          <p class="suggerimento">${L('Parole extra per <code>!' + esc(c.comando) + ' &lt;parola&gt;</code> (oltre alle standard on/acceso/ok/vai · off/spento/stop). Separale con virgole.', 'Extra words for <code>!' + esc(c.comando) + ' &lt;word&gt;</code> (besides the defaults on/ok/go · off/stop). Comma-separated.', 'Palabras extra para <code>!' + esc(c.comando) + ' &lt;palabra&gt;</code> (además de las estándar on/ok/vai · off/stop). Sepáralas con comas.')}</p>
          <p><button type="button" class="btn secondario mini" data-ca="salva-ov" data-cmd="${esc(c.comando)}">${L('Salva aspetto', 'Save look', 'Guardar aspecto')}</button></p>
        </div>
      </details>
    </div>`; }).join('')
    : `<p class="suggerimento">${L('Nessun contatore ancora. Creane uno qui sotto.', 'No counters yet. Create one below.', 'Aún no hay contadores. Crea uno abajo.')}</p>`;

  const salvaVal = (comando, valore) => api('/api/contatori', { method: 'POST', body: { comando, valore } });
  // Tendina posizione → riempie i campi X/Y (poi si salva con "Salva aspetto").
  box.onchange = (ev) => {
    const sel = ev.target.closest('[data-ovk="posizione"]'); if (!sel) return;
    const form = ev.target.closest('[data-ovform]'); if (!form || !sel.value) return;
    const p = POSZ.find(([k]) => k === sel.value); if (!p) return;
    const xi = form.querySelector('[data-ovk="x"]'), yi = form.querySelector('[data-ovk="y"]');
    if (xi) xi.value = p[1]; if (yi) yi.value = p[2];
  };
  box.onclick = (ev) => {
    const b = ev.target.closest('[data-ca]'); if (!b) return;
    const cmd = b.dataset.cmd, az = b.dataset.ca;
    conErrore(async () => {
      if (az === 'salva-ov') {
        const form = box.querySelector(`[data-ovform="${cmd}"]`); if (!form) return;
        const g = (k) => form.querySelector(`[data-ovk="${k}"]`);
        const overlay = {
          mostra: g('mostra').checked,
          x: Number(g('x').value) || 0, y: Number(g('y').value) || 0,
          colore: g('colore').value, sfondo: g('trasp').checked ? 'transparent' : g('sfondo').value,
          dim: Number(g('dim').value) || 40, grassetto: g('grassetto').checked,
          font: g('font').value, formato: g('formato').value,
          parolaOn: g('parolaOn').value, parolaOff: g('parolaOff').value,
        };
        await api('/api/contatori', { method: 'POST', body: { comando: cmd, overlay } });
        toast(L('Aspetto salvato ✓ (aggiornato nell\'overlay)', 'Look saved ✓ (updated in overlay)', 'Aspecto guardado ✓ (actualizado en el overlay)'));
        return;   // non ricarico: tengo aperto l'editor
      }
      if (az === 'on') { await api('/api/contatori', { method: 'POST', body: { comando: cmd, valore: 0, overlay: { mostra: true } } }); toast(L('Contatore acceso a schermo ✓ (da 0)', 'Counter shown on screen ✓ (from 0)', 'Contador encendido en pantalla ✓ (desde 0)')); }
      else if (az === 'off') { await api('/api/contatori', { method: 'POST', body: { comando: cmd, overlay: { mostra: false } } }); toast(L('Contatore tolto dallo schermo.', 'Counter hidden from screen.', 'Contador quitado de la pantalla.')); }
      else if (az === 'piu') await salvaVal(cmd, (Number(b.dataset.val) || 0) + (Number(b.dataset.step) || 1));
      else if (az === 'meno') await salvaVal(cmd, (Number(b.dataset.val) || 0) - (Number(b.dataset.step) || 1));
      else if (az === 'reset') await salvaVal(cmd, 0);
      else if (az === 'del') { if (!confirm(L('Eliminare il contatore «', 'Delete counter «', 'Eliminar el contador «') + cmd + '»?')) return; await api('/api/contatori/' + encodeURIComponent(cmd), { method: 'DELETE' }); }
      else if (az === 'reward') {
        if (b.textContent.includes('Scollega') || b.textContent.includes('Unlink') || b.textContent.includes('Desvincular')) {
          await api('/api/contatori/' + encodeURIComponent(cmd) + '/reward', { method: 'POST', body: { scollega: true } });
          toast(L('Premio scollegato.', 'Reward unlinked.', 'Premio desvinculado.'));
        } else {
          const costo = prompt(L('Costo in punti canale del premio (riscattarlo fa +passo):', 'Channel-point cost of the reward (redeeming it does +step):', 'Coste en puntos de canal del premio (canjearlo hace +paso):'), '100');
          if (costo === null) return;
          await api('/api/contatori/' + encodeURIComponent(cmd) + '/reward', { method: 'POST', body: { costo: parseInt(costo, 10) || 100 } });
          toast(L('Premio a punti canale creato ✓', 'Channel-point reward created ✓', 'Premio de puntos de canal creado ✓'));
        }
      }
      caricaContatori();
    });
  };
  const crea = document.getElementById('cont-crea');
  if (crea) crea.onclick = () => conErrore(async () => {
    const comando = (document.getElementById('cont-comando').value || '').trim();
    if (!comando) { toast(L('Scrivi un comando (es. morti).', 'Enter a command (e.g. deaths).', 'Escribe un comando (ej. muertes).'), 'errore'); return; }
    await api('/api/contatori', { method: 'POST', body: {
      comando,
      etichetta: document.getElementById('cont-etichetta').value,
      emoji: document.getElementById('cont-emoji').value,
      step: document.getElementById('cont-step').value,
      autoParola: document.getElementById('cont-parola').value,
    } });
    document.getElementById('cont-comando').value = ''; document.getElementById('cont-etichetta').value = '';
    document.getElementById('cont-emoji').value = ''; document.getElementById('cont-parola').value = '';
    toast(L('Contatore creato ✓', 'Counter created ✓', 'Contador creado ✓')); caricaContatori();
  });
}

function pannelloGiochi() {
  const s = impostazioni();
  return pannello('giochi', `
    <div class="carta">
      <h2>${_hIco(ICO.giochi)}${L('Minigiochi', 'Minigames', 'Minijuegos')}</h2>
      <p>${L('Giochi in chat per la tua community, con delle', 'Chat games for your community, with', 'Juegos en el chat para tu comunidad, con')} <strong class="primo-piano">${L('monete', 'coins', 'monedas')}</strong>
      ${L('(punti fedeltà) che si guadagnano chiacchierando.', '(loyalty points) earned by chatting.', '(puntos de fidelidad) que se ganan charlando.')}</p>

      <div class="riga-check">
        <input type="checkbox" id="chk-giochi" ${s.giochi ? 'checked' : ''}>
        <label for="chk-giochi">${L('Attiva i minigiochi in chat', 'Enable chat minigames', 'Activa los minijuegos en el chat')}</label>
      </div>

      <label class="campo" for="inp-monete">${L('Come si chiamano le monete', 'What the coins are called', 'Cómo se llaman las monedas')}</label>
      <input type="text" id="inp-monete" maxlength="20" value="${esc(s.nomeMonete)}" placeholder="${L('es. monete, punti, gemme…', 'e.g. coins, points, gems…', 'p. ej. monedas, puntos, gemas…')}">

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-promo" ${s.promoSocial ? 'checked' : ''}>
        <label for="chk-promo">${L('Promo social automatica — ogni tanto condivide da solo i tuoi link', 'Automatic social promo — now and then it shares your links on its own', 'Promo social automática — de vez en cuando comparte solo tus enlaces')}</label>
      </div>
      <p class="suggerimento">${L('Nei momenti giusti (chat viva, dopo un raid/sub) il bot ricorda i tuoi social presi dal profilo andryxify.it — con calma, mai spam.', 'At the right moments (lively chat, after a raid/sub) the bot reminds people of your socials taken from your andryxify.it profile — gently, never spam.', 'En los momentos oportunos (chat animado, tras un raid/sub) el bot recuerda tus redes tomadas de tu perfil andryxify.it — con calma, nunca spam.')}</p>

      <p class="spazio-sopra"><button class="btn" id="btn-salva-giochi">${L('Salva', 'Save', 'Guardar')}</button></p>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.medaglia)}${L('Punti & classifica', 'Points & leaderboard', 'Puntos y clasificación')}</h2>
      <p>${L('Decidi quanti', 'Decide how many', 'Decide cuántas')} <strong class="primo-piano">${esc(s.nomeMonete)}</strong> ${L('si guadagnano e i premi dei giochi. La classifica', 'are earned and the game prizes. The leaderboard', 'se ganan y los premios de los juegos. La clasificación')} <code>!classifica</code> ${L('mostra i primi in cima.', 'shows the top players.', 'muestra a los primeros.')}</p>
      <div class="griglia-punti">
        <label class="campo-num">${L('Punti per messaggio', 'Points per message', 'Puntos por mensaje')}<input type="number" id="pt-perMessaggio" min="0" max="1000" value="${s.punti.perMessaggio}"></label>
        <label class="campo-num">${L('…ogni quanti secondi', '…every how many seconds', '…cada cuántos segundos')}<input type="number" id="pt-ogniSecondi" min="5" max="3600" value="${s.punti.ogniSecondi}"></label>
        <label class="campo-num">${L('Premio trivia', 'Trivia prize', 'Premio trivia')}<input type="number" id="pt-trivia" min="0" max="100000" value="${s.punti.trivia}"></label>
        <label class="campo-num">${L('Premio duello', 'Duel prize', 'Premio duelo')}<input type="number" id="pt-duello" min="0" max="100000" value="${s.punti.duello}"></label>
        <label class="campo-num">${L('Slot: costo giocata', 'Slot: play cost', 'Slot: coste por tirada')}<input type="number" id="pt-slotCosto" min="0" max="100000" value="${s.punti.slotCosto}"></label>
        <label class="campo-num">${L('Slot: vincita tris', 'Slot: three-of-a-kind win', 'Slot: premio trío')}<input type="number" id="pt-slotVinci" min="0" max="1000000" value="${s.punti.slotVinci}"></label>
        <label class="campo-num">${L('Slot: vincita coppia', 'Slot: pair win', 'Slot: premio pareja')}<input type="number" id="pt-slotCoppia" min="0" max="100000" value="${s.punti.slotCoppia}"></label>
        <label class="campo-num">${L('Quanti in classifica', 'How many on the board', 'Cuántos en la clasificación')}<input type="number" id="pt-topN" min="3" max="10" value="${s.punti.topN}"></label>
      </div>
      <p class="suggerimento">${L('“Punti per messaggio” a 0 = nessun guadagno passivo dal chattare. Lo slot tris scala su questo valore (pieno, 7⃣ 75%, resto 40%).', '“Points per message” at 0 = no passive earning from chatting. The slot three-of-a-kind scales on this value (full, 7⃣ 75%, rest 40%).', '“Puntos por mensaje” a 0 = sin ganancia pasiva por charlar. El trío de la slot escala sobre este valor (completo, 7⃣ 75%, resto 40%).')}</p>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-punti">${L('Salva punti', 'Save points', 'Guardar puntos')}</button></p>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.dado)}${L('Manche automatiche', 'Automatic rounds', 'Rondas automáticas')}</h2>
      <p>${L('Lascia che sia', 'Let', 'Deja que sea')} <strong class="primo-piano">${L('il bot', 'the bot', 'el bot')}</strong> ${L('a lanciare i giochi: ogni tanto, a sorpresa, parte una', 'launch the games: now and then, by surprise, a', 'quien lance los juegos: de vez en cuando, por sorpresa, empieza una')}
      <strong class="primo-piano">${L('manche', 'round', 'ronda')}</strong> ${L('(trivia, reflex sulla parola, indovina il numero) e il primo che risponde vince.', '(trivia, word reflex, guess the number) starts and the first to answer wins.', '(trivia, reflejo con la palabra, adivina el número) y el primero que responde gana.')}</p>
      <div class="riga-check">
        <input type="checkbox" id="chk-manche" ${s.manche.attivo ? 'checked' : ''}>
        <label for="chk-manche">${L('Attiva le manche automatiche', 'Enable automatic rounds', 'Activa las rondas automáticas')}</label>
      </div>
      <div class="griglia-punti">
        <label class="campo-num">${L('Ogni almeno (minuti)', 'At least every (minutes)', 'Cada al menos (minutos)')}<input type="number" id="mn-min" min="1" max="360" value="${s.manche.minMin}"></label>
        <label class="campo-num">${L('…al massimo (minuti)', '…at most (minutes)', '…como máximo (minutos)')}<input type="number" id="mn-max" min="1" max="360" value="${s.manche.maxMin}"></label>
      </div>
      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-manche-live" ${s.manche.soloLive ? 'checked' : ''}>
        <label for="chk-manche-live">${L('Solo mentre sono in diretta', 'Only while I’m live', 'Solo mientras estoy en directo')}</label>
      </div>
      <p class="suggerimento">${L('Il bot sceglie da solo quando e quale gioco, e non disturba mai una chat vuota. In chat:', 'The bot picks when and which game on its own, and never bothers an empty chat. In chat:', 'El bot elige solo cuándo y qué juego, y nunca molesta en un chat vacío. En el chat:')} <code>!manche</code> ${L('ne lancia una al volo.', 'starts one on the fly.', 'lanza una al vuelo.')}</p>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-manche">${L('Salva manche', 'Save rounds', 'Guardar rondas')}</button></p>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.giochi)}${L('I tuoi giochi', 'Your games', 'Tus juegos')}</h2>
      <p>${L('Crea i tuoi giochi: entrano nel giro delle manche automatiche (mescolati a quelli di default).', 'Create your own games: they join the automatic rounds rotation (mixed with the default ones).', 'Crea tus propios juegos: entran en la rotación de rondas automáticas (mezclados con los de serie).')}</p>
      <div class="riga-flessibile">
        <select id="gioco-tipo">
          <option value="trivia">${L('Trivia (domande & risposte)', 'Trivia (questions & answers)', 'Trivia (preguntas y respuestas)')}</option>
          <option value="parola">${L('Parola veloce (reflex)', 'Fast word (reflex)', 'Palabra rápida (reflejo)')}</option>
        </select>
        <input type="text" id="gioco-nome" maxlength="60" placeholder="${L('Nome del gioco (es. Trivia gaming)', 'Game name (e.g. Gaming trivia)', 'Nombre del juego (p. ej. Trivia gaming)')}">
      </div>
      <div id="gioco-trivia" class="spazio-sopra">
        <label class="campo">${L('Domande — una per riga, formato', 'Questions — one per line, format', 'Preguntas — una por línea, formato')} <code>${L('domanda | risposta1, risposta2', 'question | answer1, answer2', 'pregunta | respuesta1, respuesta2')}</code></label>
        <textarea id="gioco-domande" rows="5" placeholder="${L('Chi ha vinto i mondiali 2006? | italia&#10;Come si chiama il mio gatto? | felix, felixe', 'Who won the 2006 World Cup? | italy&#10;What’s my cat’s name? | felix, felixe', '¿Quién ganó el Mundial 2006? | italia&#10;¿Cómo se llama mi gato? | felix, felixe')}"></textarea>
      </div>
      <div id="gioco-parola" class="spazio-sopra" hidden>
        <label class="campo">${L('Parole — una per riga (il bot ne pesca una e il primo che la scrive vince)', 'Words — one per line (the bot picks one and the first to type it wins)', 'Palabras — una por línea (el bot elige una y el primero que la escribe gana)')}</label>
        <textarea id="gioco-parole" rows="5" placeholder="pizza&#10;combo perfetta&#10;gg wp"></textarea>
      </div>
      <p class="spazio-sopra"><button class="btn" id="btn-crea-gioco">${L('Crea gioco', 'Create game', 'Crear juego')}</button></p>
      <h3>${L('Giochi creati', 'Created games', 'Juegos creados')}</h3>
      <ul class="lista-voci" id="lista-giochi"><li class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</li></ul>
    </div>
    <div class="carta">
      <h2>${L('Comandi dei giochi', 'Game commands', 'Comandos de los juegos')}</h2>
      <ul class="lista-voci">
        <li><div class="testo-voce"><span class="domanda">!dado</span> <span class="risposta">${L('tira un dado (anche !dado 2d20)', 'roll a die (also !dado 2d20)', 'tira un dado (también !dado 2d20)')}</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!moneta</span> <span class="risposta">${L('testa o croce', 'heads or tails', 'cara o cruz')}</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!8ball &lt;${L('domanda', 'question', 'pregunta')}&gt;</span> <span class="risposta">${L('la palla magica risponde', 'the magic ball answers', 'la bola mágica responde')}</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!slot</span> <span class="risposta">${L('slot machine (costa qualche moneta)', 'slot machine (costs a few coins)', 'tragamonedas (cuesta unas monedas)')}</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!duello @${L('nome', 'name', 'nombre')}</span> <span class="risposta">${L('sfida un altro utente', 'challenge another user', 'reta a otro usuario')}</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!trivia</span> <span class="risposta">${L('domanda a sorpresa, il primo che risponde vince', 'surprise question, first to answer wins', 'pregunta sorpresa, el primero que responde gana')}</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!monete</span> <span class="risposta">${L('quante monete hai', 'how many coins you have', 'cuántas monedas tienes')}</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!classifica</span> <span class="risposta">${L('i più ricchi del canale', 'the richest in the channel', 'los más ricos del canal')}</span></div></li>
        <li><div class="testo-voce"><span class="domanda">!giochi</span> <span class="risposta">${L('elenco dei giochi', 'list of games', 'lista de juegos')}</span></div></li>
      </ul>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.trofeo)}${L('Classifica & VIP', 'Leaderboard & VIP', 'Clasificación y VIP')}</h2>
      ${stato.vipOk ? '' : `<p class="suggerimento">${L('Per assegnare i VIP serve un permesso in più (aggiunto dopo).', 'Assigning VIPs needs one more permission (added later).', 'Asignar VIP necesita un permiso más (añadido después).')}
        <a class="btn secondario mini" href="/auth/permessi">${L('Concedi i permessi', 'Grant permissions', 'Concede los permisos')}</a></p>`}
      <div class="riga-check">
        <input type="checkbox" id="chk-premiovip" ${s.premioVip.attivo ? 'checked' : ''}>
        <label for="chk-premiovip">${L('Premio VIP automatico ai più affezionati', 'Automatic VIP reward for your most loyal', 'Premio VIP automático a los más fieles')}</label>
      </div>
      <div class="riga-flessibile">
        <span class="suggerimento">${L('Ogni', 'Every', 'Cada')}</span>
        <select id="sel-premio-periodo">
          <option value="settimana" ${s.premioVip.periodo === 'settimana' ? 'selected' : ''}>${L('settimana', 'week', 'semana')}</option>
          <option value="mese" ${s.premioVip.periodo === 'mese' ? 'selected' : ''}>${L('mese', 'month', 'mes')}</option>
        </select>
        <span class="suggerimento">${L('ai primi', 'to the top', 'a los primeros')}</span>
        <input type="number" id="num-premio-quanti" min="1" max="5" value="${Number(s.premioVip.quanti) || 1}">
      </div>
      <p class="suggerimento">${L('Il bot dà il VIP (per la stessa durata) ai top', 'The bot gives VIP (for the same duration) to the top', 'El bot da el VIP (por la misma duración) a los mejores')} ${esc(s.nomeMonete)}. ${L('Puoi anche darlo', 'You can also give it', 'También puedes darlo')}
      <strong class="primo-piano">${L('a voce', 'by voice', 'por voz')}</strong> ${L('(Comandi a voce → "vip a nome", default 1 settimana; di\' "mese" per un mese)', '(Voice commands → "vip to name", default 1 week; say "month" for a month)', '(Comandos por voz → "vip a nombre", por defecto 1 semana; di "mes" para un mes)')}
      ${L('o in chat con', 'or in chat with', 'o en el chat con')} <code>!vip @${L('nome', 'name', 'nombre')}</code>.</p>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-premio">${L('Salva premio', 'Save reward', 'Guardar premio')}</button></p>
      <h3>${L('Classifica', 'Leaderboard', 'Clasificación')} ${esc(s.nomeMonete)}</h3>
      <ul class="lista-voci" id="lista-classifica"><li class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</li></ul>
      <h3>${L('VIP a tempo attivi', 'Active timed VIPs', 'VIP temporales activos')}</h3>
      <ul class="lista-voci" id="lista-vip"><li class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</li></ul>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.target)}${L('Giochi del sito andryxify.it', 'andryxify.it site games', 'Juegos del sitio andryxify.it')}</h2>
      <p>${L('I giochi di andryxify.it (come', 'The andryxify.it games (like', 'Los juegos de andryxify.it (como')} <strong class="primo-piano">AGENTify</strong>) ${L('possono girare', 'can run', 'pueden funcionar')}
      <strong class="primo-piano">${L('direttamente dalla tua chat', 'straight from your chat', 'directamente desde tu chat')}</strong> ${L('tramite SocialBot: i tuoi viewer scrivono i comandi (es.', 'through SocialBot: your viewers type the commands (e.g.', 'con SocialBot: tus espectadores escriben los comandos (p. ej.')} <code>!ag …</code>) ${L('e il bot risponde. Un solo bot in chat, niente da installare.', 'and the bot replies. One bot in chat, nothing to install.', 'y el bot responde. Un solo bot en el chat, nada que instalar.')}</p>
      ${s.giochiSito.collegato
        ? `<p class="suggerimento"><span class="badge verde">✓ ${L('collegato al sito', 'connected to the site', 'conectado al sitio')}</span></p>`
        : `<p class="suggerimento"><span class="badge giallo">${L('non ancora collegato', 'not connected yet', 'aún no conectado')}</span> — ${L('entra nella dashboard passando da andryxify.it e il collegamento si attiva da solo.', 'enter the dashboard via andryxify.it and the link activates on its own.', 'entra al panel pasando por andryxify.it y el enlace se activa solo.')}</p>`}
      <div class="riga-check">
        <input type="checkbox" id="chk-giochisito" ${s.giochiSito.attivo ? 'checked' : ''} ${s.giochiSito.collegato ? '' : 'disabled'}>
        <label for="chk-giochisito">${L('Fai giocare la chat ai giochi del sito', 'Let chat play the site games', 'Deja que el chat juegue a los juegos del sitio')}</label>
      </div>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-giochisito" ${s.giochiSito.collegato ? '' : 'disabled'}>${L('Salva', 'Save', 'Guardar')}</button></p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.chat)}${L('Citazioni', 'Quotes', 'Citas')}</h2>
      <p>${L('Le frasi memorabili della chat. In chat:', 'The chat’s memorable lines. In chat:', 'Las frases memorables del chat. En el chat:')} <code>!cita</code> (${L('a caso', 'random', 'al azar')}), <code>!cita 12</code> (${L('una precisa', 'a specific one', 'una concreta')}),
      <code>!cita ${L('aggiungi', 'add', 'añadir')} &lt;${L('testo', 'text', 'texto')}&gt;</code> ${L('e', 'and', 'y')} <code>!cita ${L('rimuovi', 'remove', 'quitar')} 12</code> (mod/streamer). ${L('Le gestisci anche da qui.', 'You can also manage them here.', 'También las gestionas desde aquí.')}</p>
      <div class="riga-flessibile">
        <input type="text" id="inp-citazione" maxlength="400" placeholder="${L('una frase memorabile…', 'a memorable line…', 'una frase memorable…')}">
        <button class="btn" id="btn-aggiungi-citazione">${L('Aggiungi', 'Add', 'Añadir')}</button>
      </div>

      <details class="spazio-sopra">
        <summary style="cursor:pointer">${L('Importa citazioni (da x.la)', 'Import quotes (from x.la)', 'Importar citas (desde x.la)')}</summary>
        <p class="suggerimento">${L('x.la disegna le frasi <strong>con JavaScript</strong>: copiare la pagina "alla cieca" (o dal link) spesso prende solo il guscio vuoto («<em>Please enable JavaScript</em>»). Due modi che funzionano davvero', 'x.la renders the lines <strong>with JavaScript</strong>: copying the page “blindly” (or from the link) often grabs only the empty shell (“<em>Please enable JavaScript</em>”). Two ways that really work', 'x.la dibuja las frases <strong>con JavaScript</strong>: copiar la página “a ciegas” (o desde el enlace) a menudo coge solo el cascarón vacío («<em>Please enable JavaScript</em>»). Dos formas que funcionan de verdad')}</p>

        <p class="suggerimento" style="margin-bottom:.35rem"><strong>${L('1) Bottone magico', '1) Magic button', '1) Botón mágico')}</strong> (${L('consigliato', 'recommended', 'recomendado')}). ${L('Trascina', 'Drag', 'Arrastra')}
        <a id="bm-xla" class="btn secondario" draggable="true" href="#" title="${L('Trascinami nella barra dei preferiti del browser', 'Drag me to your browser’s bookmarks bar', 'Arrástrame a la barra de favoritos del navegador')}">${_bIco(ICO.segnaposto)}${L('Prendi le quote da x.la', 'Grab quotes from x.la', 'Coge las citas de x.la')}</a>
        ${L('nella <strong>barra dei preferiti</strong> del browser. Poi apri la tua pagina x.la, aspetta che le quote compaiano (scorri fino in fondo) e <strong>clicca quel preferito</strong>: copia tutto da solo. Torna qui, incolla sotto e importa.', 'to your browser’s <strong>bookmarks bar</strong>. Then open your x.la page, wait for the quotes to appear (scroll to the bottom) and <strong>click that bookmark</strong>: it copies everything itself. Come back here, paste below and import.', 'a la <strong>barra de favoritos</strong> del navegador. Luego abre tu página x.la, espera a que aparezcan las citas (baja hasta el final) y <strong>haz clic en ese favorito</strong>: lo copia todo solo. Vuelve aquí, pega abajo e importa.')}
        <button class="btn secondario" id="bm-xla-copia" type="button" style="margin-left:.35rem">${L('copia il codice', 'copy the code', 'copia el código')}</button></p>

        <p class="suggerimento" style="margin-bottom:.5rem"><strong>${L('2) A mano.', '2) By hand.', '2) A mano.')}</strong> ${L('Sulla pagina x.la <em>già aperta e caricata</em>, seleziona le quote col mouse e incollale qui sotto: riconosco <strong>nome utente e data</strong> (formato «<em>frase</em> ⏎ <em>autore | data</em>», come le mostra x.la). I doppioni li salto.', 'On the x.la page <em>already open and loaded</em>, select the quotes with the mouse and paste them below: I recognize <strong>username and date</strong> (format “<em>line</em> ⏎ <em>author | date</em>”, as x.la shows them). I skip duplicates.', 'En la página x.la <em>ya abierta y cargada</em>, selecciona las citas con el ratón y pégalas abajo: reconozco <strong>usuario y fecha</strong> (formato «<em>frase</em> ⏎ <em>autor | fecha</em>», como las muestra x.la). Los duplicados los salto.')}</p>

        <textarea id="txt-import-citazioni" rows="6" placeholder="&quot;Tu, molto molto bravo&quot;&#10;UnicornoFacinoroso | 06.09.2024&#10;&quot;io solo perchè mi andava di uscire&quot;&#10;@chiara_3008 | 06.10.2024"></textarea>
        <div class="riga-flessibile">
          <input type="text" id="inp-import-url" placeholder="${L('…oppure incolla un link (per altre fonti)', '…or paste a link (for other sources)', '…o pega un enlace (para otras fuentes)')}">
          <button class="btn secondario" id="btn-estrai-citazioni">${L('Estrai dal link', 'Extract from link', 'Extraer del enlace')}</button>
        </div>
        <p class="spazio-sopra">
          <button class="btn" id="btn-importa-citazioni">${L('Riconosci e importa', 'Recognize and import', 'Reconocer e importar')}</button>
          <span id="import-cita-esito" class="suggerimento"></span>
        </p>
        <p id="import-cita-avviso" class="nota-lettura" hidden></p>
      </details>

      <ul class="lista-voci" id="lista-citazioni"><li class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</li></ul>
    </div>`);
}

// --- scheda Notifiche (Telegram) ---------------------------------------

function pannelloNotifiche() {
  const tg = stato.telegram || { configurato: false, gruppoOk: false, attivo: false, messaggio: '', botUsername: '', gruppo: '', pinLive: true };
  const tkc = impostazioni().tiktok || {};
  const ytc = impostazioni().youtube || {};
  const igc = impostazioni().instagram || {};
  const msgDefault = '{nome} è in diretta!\n\n{titolo}\n{gioco}\n\n{link}';
  return pannello('notifiche', `
    <div class="carta" id="box-tglogin" hidden></div>
    <div class="carta">
      <h2>${_hIco(ICO.megafono)}${L('Avviso "sono in diretta" su Telegram', '"I’m live" alert on Telegram', 'Aviso "estoy en directo" en Telegram')}</h2>
      <p>${L('Collega il', 'Connect', 'Conecta')} <strong class="primo-piano">${L('tuo', 'your own', 'tu')}</strong> ${L('bot Telegram e il tuo gruppo: quando vai live, il bot avvisa i tuoi follower nel gruppo. Le chiavi sono tue e restano tue.', 'Telegram bot and your group: when you go live, the bot alerts your followers in the group. The keys are yours and stay yours.', 'bot de Telegram y tu grupo: cuando estás en directo, el bot avisa a tus seguidores en el grupo. Las claves son tuyas y siguen siéndolo.')}</p>

      <ol class="passi">
        <li><strong>${L('Crea il bot', 'Create the bot', 'Crea el bot')}</strong>: ${L('su Telegram apri', 'on Telegram open', 'en Telegram abre')} <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a>,
          ${L('scrivi', 'type', 'escribe')} <code>/newbot</code>, ${L('segui le istruzioni e copia il', 'follow the steps and copy the', 'sigue los pasos y copia el')} <em>token</em> ${L('che ti dà.', 'it gives you.', 'que te da.')}</li>
        <li><strong>${L('Incolla il token', 'Paste the token', 'Pega el token')}</strong> ${L('qui sotto e premi', 'below and press', 'aquí abajo y pulsa')} <em>${L('Collega', 'Connect', 'Conectar')}</em>.</li>
        <li><strong>${L('Aggiungi il bot al tuo gruppo', 'Add the bot to your group', 'Añade el bot a tu grupo')}</strong>, ${L('scrivici', 'type', 'escribe')} <code>/collega</code> ${L('dentro, poi premi', 'inside, then press', 'dentro, luego pulsa')} <em>${L('Rileva gruppo', 'Detect group', 'Detectar grupo')}</em>.</li>
      </ol>

      <label class="campo" for="inp-tg-token">${L('Token del bot Telegram', 'Telegram bot token', 'Token del bot de Telegram')}</label>
      <div class="riga-flessibile">
        <input type="text" id="inp-tg-token" placeholder="123456789:AA..." autocomplete="off"
          value="" ${tg.configurato ? 'disabled' : ''}>
        <button class="btn" id="btn-tg-token">${tg.configurato ? L('Collegato ✓', 'Connected ✓', 'Conectado ✓') : L('Collega', 'Connect', 'Conectar')}</button>
      </div>
      ${tg.configurato ? `<p class="suggerimento">${L('Bot collegato:', 'Bot connected:', 'Bot conectado:')} <strong class="primo-piano">@${esc(tg.botUsername || '?')}</strong></p>` : ''}

      ${tg.configurato ? `
      <div class="riga-flessibile spazio-sopra">
        <button class="btn secondario" id="btn-tg-rileva">${L('Rileva gruppo', 'Detect group', 'Detectar grupo')}</button>
        <span class="suggerimento">${tg.gruppoOk
          ? `${L('Gruppo collegato:', 'Group connected:', 'Grupo conectado:')} <strong class="primo-piano">${esc(tg.gruppo || '(gruppo)')}</strong> ✓`
          : L('Nessun gruppo ancora collegato.', 'No group connected yet.', 'Aún no hay grupo conectado.')}</span>
      </div>

      <label class="campo spazio-sopra" for="txt-tg-messaggio">${L('Messaggio dell\'avviso', 'Alert message', 'Mensaje del aviso')}</label>
      <textarea id="txt-tg-messaggio" rows="5" placeholder="${esc(msgDefault)}">${esc(tg.messaggio || '')}</textarea>
      <p class="suggerimento">${L('Segnaposto:', 'Placeholders:', 'Marcadores:')} <code>{nome}</code> <code>{titolo}</code> <code>{gioco}</code>
        <code>{spettatori}</code> <code>{link}</code>. ${L('Lascia vuoto per usare quello standard.', 'Leave empty to use the default.', 'Déjalo vacío para usar el estándar.')}</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-tg-attivo" ${tg.attivo ? 'checked' : ''} ${tg.gruppoOk ? '' : 'disabled'}>
        <label for="chk-tg-attivo">${L('Avvisa il gruppo quando vado in diretta', 'Alert the group when I go live', 'Avisa al grupo cuando voy en directo')}</label>
      </div>

      <div class="riga-check">
        <input type="checkbox" id="chk-tg-pin" ${tg.pinLive ? 'checked' : ''} ${tg.gruppoOk ? '' : 'disabled'}>
        <label for="chk-tg-pin">${L('Fissa l\'avviso in cima durante la live e rimuovilo quando stacco', 'Pin the alert at the top during the live and remove it when I go offline', 'Fija el aviso arriba durante el directo y quítalo cuando termino')}</label>
      </div>
      <p class="suggerimento">${L('Per fissare l\'avviso il bot dev\'essere', 'To pin the alert the bot must be', 'Para fijar el aviso el bot debe ser')} <strong>${L('amministratore', 'an administrator', 'administrador')}</strong> ${L('del gruppo con il permesso di', 'of the group with permission to', 'del grupo con permiso para')} <em>${L('fissare i messaggi', 'pin messages', 'fijar mensajes')}</em>. ${L('L\'eliminazione a fine live funziona comunque.', 'Deletion at the end of the live works anyway.', 'El borrado al final del directo funciona igualmente.')}</p>

      <p class="spazio-sopra">
        <button class="btn" id="btn-tg-salva">${L('Salva', 'Save', 'Guardar')}</button>
        <button class="btn secondario" id="btn-tg-prova" ${tg.gruppoOk ? '' : 'disabled'}>${L('Manda una prova', 'Send a test', 'Envía una prueba')}</button>
        <button class="btn pericolo mini" id="btn-tg-scollega">${L('Scollega', 'Disconnect', 'Desconectar')}</button>
      </p>
      ` : ''}
    </div>

    ${tg.configurato ? `
    <div class="carta">
      <h2>${_hIco(ICO.bot)}${L('Bot interattivo su Telegram', 'Interactive bot on Telegram', 'Bot interactivo en Telegram')}</h2>
      <p>${L('Con la', 'With', 'Con el')} <strong class="primo-piano">${L('modalità interattiva', 'interactive mode', 'modo interactivo')}</strong> ${L('il bot <strong>legge i messaggi</strong> del gruppo e risponde ai comandi. I comandi si creano in <strong>Chat &amp; comandi → Comandi</strong>: crea un modulo con innesco <em>Comando</em> e spunta <strong>«Abilita anche su Telegram»</strong> (su Telegram funziona anche senza <code>!</code>). Valgono anche a voce dall\'ascolto vocale.', 'the bot <strong>reads the group’s messages</strong> and replies to commands. Commands are created in <strong>Chat &amp; commands → Commands</strong>: create a module with a <em>Command</em> trigger and check <strong>“Enable on Telegram too”</strong> (on Telegram it works even without <code>!</code>). They also work by voice from voice listening.', 'el bot <strong>lee los mensajes</strong> del grupo y responde a los comandos. Los comandos se crean en <strong>Chat y comandos → Comandos</strong>: crea un módulo con disparador <em>Comando</em> y marca <strong>«Habilitar también en Telegram»</strong> (en Telegram funciona incluso sin <code>!</code>). También valen por voz desde la escucha por voz.')}</p>

      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore"><input type="checkbox" id="chk-tg-interattivo" ${tg.interattivo ? 'checked' : ''}><span class="levetta"></span></label>
        <span class="etichetta-stato">${L('Bot interattivo nel gruppo', 'Interactive bot in the group', 'Bot interactivo en el grupo')}</span>
        ${tg.interattivo ? `<span class="badge verde">${L('attivo', 'active', 'activo')}</span>` : ''}
      </div>
      <p class="suggerimento">${L('Il bot dev\'essere', 'The bot must be', 'El bot debe estar')} <strong>${L('nel gruppo', 'in the group', 'en el grupo')}</strong>. ${L('Da attivo, il gruppo si collega da solo: scrivi un messaggio qualsiasi nel gruppo e viene rilevato. Il tasto «Rileva gruppo» funziona solo da spento. Per far leggere al bot <strong>tutti</strong> i messaggi (comandi senza <code>/</code> e roster membri) disattiva la <em>privacy</em> su', 'When active, the group connects itself: send any message in the group and it’s detected. The “Detect group” button only works when off. To let the bot read <strong>all</strong> messages (commands without <code>/</code> and the member roster) disable <em>privacy</em> on', 'Cuando está activo, el grupo se conecta solo: escribe cualquier mensaje en el grupo y se detecta. El botón «Detectar grupo» solo funciona apagado. Para que el bot lea <strong>todos</strong> los mensajes (comandos sin <code>/</code> y la lista de miembros) desactiva la <em>privacidad</em> en')} <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a>
      (<code>/setprivacy → Disable</code>); ${L('coi comandi <code>/comando</code> funziona comunque.', 'with <code>/command</code> commands it works anyway.', 'con los comandos <code>/comando</code> funciona igualmente.')}</p>

      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore"><input type="checkbox" id="chk-tg-dm" ${tg.dmModo !== 'off' ? 'checked' : ''}><span class="levetta"></span></label>
        <span class="etichetta-stato">${L('Rispondimi in chat privata (solo a me)', 'Reply to me in private chat (only me)', 'Respóndeme en el chat privado (solo a mí)')}</span>
      </div>
      <p class="suggerimento" id="tg-dm-stato">
        ${tg.dmCollegato
          ? `${L('In privato risponde <strong>solo a te</strong> (account', 'In private it replies <strong>only to you</strong> (account', 'En privado responde <strong>solo a ti</strong> (cuenta')} <strong>${esc(tg.dmNome || 'te')}</strong>). <a href="#" id="btn-tg-dm-scollega">${L('Scollega', 'Disconnect', 'Desconectar')}</a>`
          : `${L('Per rispondere solo a te, lega una volta il tuo Telegram:', 'To reply only to you, link your Telegram once:', 'Para responder solo a ti, vincula tu Telegram una vez:')} <a href="#" id="btn-tg-dm-collega">${L('genera un codice', 'generate a code', 'genera un código')}</a> ${L('e scrivi', 'and type', 'y escribe')} <code>/collega CODICE</code> ${L('al bot in privato. Finché non colleghi, in privato non risponde a nessuno.', 'to the bot in private. Until you link it, it replies to no one in private.', 'al bot en privado. Hasta que lo vincules, en privado no responde a nadie.')}`}
      </p>
      <div id="tg-dm-codice"></div>

      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore"><input type="checkbox" id="chk-tg-proattiva" ${impostazioni().proattivoTg !== false ? 'checked' : ''}><span class="levetta"></span></label>
        <span class="etichetta-stato">${L('Ti scrive per prima (proattiva e curiosa)', 'It writes to you first (proactive and curious)', 'Te escribe primero (proactiva y curiosa)')}</span>
      </div>
      <p class="suggerimento">${L('Ogni tanto è <strong>lei</strong> a scriverti in privato di sua iniziativa: ti fa una domanda, ti chiede una cosa che ancora non sa, commenta. Come una persona — non a orari fissi, mai di notte, e senza esagerare. Serve aver <strong>collegato</strong> il tuo Telegram qui sopra. Il nome con cui si presenta lo scegli in', 'Now and then <strong>it</strong> writes to you in private on its own: asks you a question, asks something it doesn’t know yet, comments. Like a person — not on a fixed schedule, never at night, and without overdoing it. You need to have <strong>linked</strong> your Telegram above. You choose the name it introduces itself with in', 'De vez en cuando <strong>ella</strong> te escribe en privado por iniciativa propia: te hace una pregunta, te pide algo que aún no sabe, comenta. Como una persona — sin horarios fijos, nunca de noche y sin pasarse. Hace falta haber <strong>vinculado</strong> tu Telegram arriba. El nombre con el que se presenta lo eliges en')} <strong>${L('Admin → Anima', 'Admin → Soul', 'Admin → Alma')}</strong>.</p>

      <p class="suggerimento">${L('Nel <strong>gruppo</strong> invece il bot funziona per tutti (e impara dalla chat come su Twitch). Il privato resta solo tuo.', 'In the <strong>group</strong>, instead, the bot works for everyone (and learns from chat like on Twitch). Private stays yours only.', 'En el <strong>grupo</strong>, en cambio, el bot funciona para todos (y aprende del chat como en Twitch). El privado sigue siendo solo tuyo.')}</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.torta)}${L('Auguri di compleanno', 'Birthday wishes', 'Felicitaciones de cumpleaños')}</h2>
      <p>${L('Il bot fa gli', 'The bot sends', 'El bot da las')} <strong class="primo-piano">${L('auguri automatici', 'automatic wishes', 'felicitaciones automáticas')}</strong> ${L('nel gruppo il giorno del compleanno dei membri. Loro possono registrarsi da soli scrivendo', 'in the group on members’ birthdays. They can register themselves by typing', 'en el grupo el día del cumpleaños de los miembros. Ellos pueden registrarse solos escribiendo')} <code>/compleanno 25/12</code> ${L('nel gruppo (serve il bot interattivo qui sopra), oppure li aggiungi tu qui sotto.', 'in the group (needs the interactive bot above), or you add them below.', 'en el grupo (necesita el bot interactivo de arriba), o los añades tú abajo.')}</p>
      <div id="box-compleanni"><p class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</p></div>
    </div>
    ` : ''}

    <div class="carta">
      <h2>${_hIco(ICO.musica)}${L('Notifica live TikTok', 'TikTok live alert', 'Aviso de directo en TikTok')}</h2>
      <p>${L('Quando vai in diretta su', 'When you go live on', 'Cuando estás en directo en')} <strong class="primo-piano">TikTok</strong>, ${L('avviso il gruppo Telegram (e, se vuoi, la chat Twitch). Su TikTok non esiste una chat-bot come su Twitch: qui facciamo la notifica.', 'I alert the Telegram group (and, if you want, the Twitch chat). On TikTok there’s no chat-bot like on Twitch: here we do the notification.', 'aviso al grupo de Telegram (y, si quieres, al chat de Twitch). En TikTok no existe un chat-bot como en Twitch: aquí hacemos la notificación.')}</p>

      <label class="campo" for="inp-tk-user">${L('Il tuo username TikTok', 'Your TikTok username', 'Tu usuario de TikTok')}</label>
      <div class="riga-flessibile">
        <span class="suggerimento">@</span>
        <input type="text" id="inp-tk-user" placeholder="${L('tuonome', 'yourname', 'tunombre')}" value="${esc(tkc.username || '')}">
      </div>

      <label class="campo spazio-sopra" for="txt-tk-messaggio">${L('Messaggio dell\'avviso TikTok', 'TikTok alert message', 'Mensaje del aviso de TikTok')}</label>
      <textarea id="txt-tk-messaggio" rows="4" placeholder="${esc(L('{nome} è in diretta su TikTok!\n\n{link}', '{nome} is live on TikTok!\n\n{link}', '¡{nome} está en directo en TikTok!\n\n{link}'))}">${esc(tkc.messaggio || '')}</textarea>
      <p class="suggerimento">${L('Segnaposto:', 'Placeholders:', 'Marcadores:')} <code>{nome}</code> <code>{link}</code> <code>{username}</code>. ${L('Lascia vuoto per usare quello standard. Se hai attivato', 'Leave empty to use the default. If you enabled', 'Déjalo vacío para usar el estándar. Si activaste')} <em>${L('«Fissa l\'avviso…»', '“Pin the alert…”', '«Fija el aviso…»')}</em> ${L('qui sopra, l\'avviso TikTok viene fissato a live attiva ed eliminato quando stacchi.', 'above, the TikTok alert is pinned while live and removed when you go offline.', 'arriba, el aviso de TikTok se fija durante el directo y se elimina cuando terminas.')}</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-tk-attivo" ${tkc.attivo ? 'checked' : ''}>
        <label for="chk-tk-attivo">${L('Rileva in automatico quando vado live su TikTok', 'Auto-detect when I go live on TikTok', 'Detecta automáticamente cuando voy en directo en TikTok')}</label>
      </div>
      <p class="suggerimento">${L('Il rilevamento automatico è <em>best-effort</em> (TikTok non ha un\'API ufficiale): può non essere sempre puntuale. Per la massima affidabilità usa il webhook qui sotto.', 'Auto-detection is <em>best-effort</em> (TikTok has no official API): it may not always be on time. For maximum reliability use the webhook below.', 'La detección automática es <em>best-effort</em> (TikTok no tiene API oficial): puede no ser siempre puntual. Para máxima fiabilidad usa el webhook de abajo.')}</p>

      <div class="riga-check">
        <input type="checkbox" id="chk-tk-chat" ${tkc.annunciaChat ? 'checked' : ''}>
        <label for="chk-tk-chat">${L('Annuncia anche nella chat Twitch', 'Announce in Twitch chat too', 'Anuncia también en el chat de Twitch')}</label>
      </div>

      <p class="spazio-sopra">
        <button class="btn" id="btn-tk-salva">${L('Salva', 'Save', 'Guardar')}</button>
        <button class="btn secondario" id="btn-tk-prova">${L('Manda una prova', 'Send a test', 'Envía una prueba')}</button>
      </p>

      <hr class="separatore">
      <p class="suggerimento"><strong class="primo-piano">${L('Via affidabile (webhook):', 'Reliable way (webhook):', 'Vía fiable (webhook):')}</strong> ${L('collega una tua automazione (IFTTT/Zapier/Shortcut) all\'evento "vado live su TikTok" e falle chiamare in POST:', 'connect an automation of yours (IFTTT/Zapier/Shortcut) to the "I go live on TikTok" event and have it POST:', 'conecta una automatización tuya (IFTTT/Zapier/Shortcut) al evento "voy en directo en TikTok" y haz que llame en POST:')}</p>
      <p><code>POST ${esc(location.origin)}/api/ext/${esc(stato.user.login)}</code></p>
      <p class="suggerimento">${L('con header', 'with header', 'con cabecera')} <code>Authorization: Bearer ${L('LA-TUA-CHIAVE-API', 'YOUR-API-KEY', 'TU-CLAVE-API')}</code> ${L('e corpo', 'and body', 'y cuerpo')}
      <code>{"azione":"tiktok-live"}</code>. ${L('La chiave API la trovi in', 'Find the API key in', 'La clave API está en')} <strong>${L('Chat & comandi → Comandi', 'Chat & commands → Commands', 'Chat y comandos → Comandos')}</strong>.</p>

      <hr class="separatore">
      <p class="suggerimento"><strong class="primo-piano">${L('Nuovo post su TikTok:', 'New TikTok post:', 'Nuevo post en TikTok:')}</strong> ${L('ora è automatico via API ufficiale — vedi la card qui sotto. In alternativa resta il webhook con corpo', 'it’s now automatic via the official API — see the card below. Alternatively the webhook remains, with body', 'ahora es automático vía API oficial — mira la tarjeta de abajo. Como alternativa queda el webhook con cuerpo')} <code>{"azione":"tiktok-post","url":"…"}</code>.</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.fotocamera)}${L('Nuovo post su TikTok', 'New TikTok post', 'Nuevo post en TikTok')}</h2>
      <p>${L('Quando pubblichi un', 'When you publish a', 'Cuando publicas un')} <strong class="primo-piano">${L('nuovo video', 'new video', 'nuevo vídeo')}</strong> ${L('su TikTok, avviso il gruppo Telegram (e, se vuoi, la chat Twitch). Uso l\'<strong>API ufficiale di TikTok</strong>: colleghi il tuo account una volta e ci penso io.', 'on TikTok, I alert the Telegram group (and, if you want, the Twitch chat). I use the <strong>official TikTok API</strong>: connect your account once and I take care of it.', 'en TikTok, aviso al grupo de Telegram (y, si quieres, al chat de Twitch). Uso la <strong>API oficial de TikTok</strong>: conectas tu cuenta una vez y yo me encargo.')}</p>
      <div id="tiktok-post-box" class="spazio-sopra"><p class="suggerimento">${L('Carico…', 'Loading…', 'Cargando…')}</p></div>

      <label class="campo spazio-sopra" for="txt-tk-post-msg">${L('Messaggio dell\'avviso', 'Alert message', 'Mensaje del aviso')}</label>
      <textarea id="txt-tk-post-msg" rows="4" placeholder="${esc(L('{nome} ha pubblicato un nuovo video su TikTok!\n\n{titolo}\n{link}', '{nome} posted a new video on TikTok!\n\n{titolo}\n{link}', '¡{nome} ha publicado un nuevo vídeo en TikTok!\n\n{titolo}\n{link}'))}">${esc(tkc.postMessaggio || '')}</textarea>
      <p class="suggerimento">${L('Segnaposto:', 'Placeholders:', 'Marcadores:')} <code>{nome}</code> <code>{titolo}</code> <code>{link}</code>. ${L('Lascia vuoto per usare quello standard.', 'Leave empty to use the default.', 'Déjalo vacío para usar el estándar.')}</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-tk-post-attivo" ${tkc.postAttivo ? 'checked' : ''}>
        <label for="chk-tk-post-attivo">${L('Avvisami quando pubblico un nuovo video', 'Alert me when I post a new video', 'Avísame cuando publico un nuevo vídeo')}</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-tk-post-chat" ${tkc.postAnnunciaChat ? 'checked' : ''}>
        <label for="chk-tk-post-chat">${L('Annuncia anche nella chat Twitch', 'Announce in Twitch chat too', 'Anuncia también en el chat de Twitch')}</label>
      </div>
      <p class="spazio-sopra"><button class="btn" id="btn-tk-post-salva">${L('Salva', 'Save', 'Guardar')}</button></p>
      <p class="suggerimento">${L('Il controllo parte ogni ~10 minuti; il primo giro dopo il collegamento memorizza solo l\'ultimo video (non avvisa).', 'The check runs every ~10 minutes; the first pass after connecting only stores the latest video (no alert).', 'La comprobación se hace cada ~10 minutos; la primera vuelta tras conectar solo memoriza el último vídeo (no avisa).')}</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.moduli)}${L('Discord — avviso "sei in diretta"', 'Discord — "you\'re live" alert', 'Discord — aviso "estás en directo"')}</h2>
      <p>${L('Quando vai in diretta, posto un avviso nel canale del tuo server Discord (embed con titolo, gioco, spettatori e miniatura). <strong>Nessun bot da creare, nessun token</strong>: incolli solo il <strong>webhook</strong> del canale.', 'When you go live, I post an alert in your Discord server channel (embed with title, game, viewers and thumbnail). <strong>No bot to create, no token</strong>: you just paste the channel <strong>webhook</strong>.', 'Cuando vas en directo, publico un aviso en el canal de tu servidor de Discord (embed con título, juego, espectadores y miniatura). <strong>Ningún bot que crear, ningún token</strong>: solo pegas el <strong>webhook</strong> del canal.')}</p>

      ${miniGuida({
        titolo: L('Tutorial: dove trovo il webhook di Discord?', 'Tutorial: where do I find the Discord webhook?', 'Tutorial: ¿dónde encuentro el webhook de Discord?'),
        serve: L('Il <strong>webhook</strong> è un indirizzo segreto che permette di scrivere in <em>un</em> canale del tuo server. Ti serve essere admin del server (o avere il permesso «Gestire i webhook»).', 'The <strong>webhook</strong> is a secret address that lets me post in <em>one</em> channel of your server. You need to be a server admin (or have the “Manage Webhooks” permission).', 'El <strong>webhook</strong> es una dirección secreta que permite escribir en <em>un</em> canal de tu servidor. Necesitas ser admin del servidor (o tener el permiso «Gestionar webhooks»).'),
        passi: [
          L('Su Discord apri le <strong>Impostazioni del canale</strong> (rotellina accanto al canale) → <strong>Integrazioni</strong>.', 'In Discord open the <strong>channel settings</strong> (gear next to the channel) → <strong>Integrations</strong>.', 'En Discord abre los <strong>ajustes del canal</strong> (rueda junto al canal) → <strong>Integraciones</strong>.'),
          L('<strong>Webhook</strong> → «Nuovo webhook» (puoi dargli un nome e un’immagine), poi «<strong>Copia URL webhook</strong>».', '<strong>Webhooks</strong> → “New Webhook” (you can give it a name and an image), then “<strong>Copy Webhook URL</strong>”.', '<strong>Webhooks</strong> → «Nuevo webhook» (puedes ponerle nombre e imagen), luego «<strong>Copiar URL del webhook</strong>».'),
          L('<strong>Incollalo</strong> qui sotto e salva. Premi «Prova» per vedere subito il messaggio nel canale.', '<strong>Paste it</strong> below and save. Hit “Test” to see the message in the channel right away.', '<strong>Pégalo</strong> aquí abajo y guarda. Pulsa «Probar» para ver el mensaje en el canal enseguida.'),
        ],
        note: [
          L('Tieni il webhook <strong>privato</strong>: chi ce l’ha può scrivere in quel canale. Se lo perdi, elimina il webhook su Discord e creane uno nuovo.', 'Keep the webhook <strong>private</strong>: anyone who has it can post in that channel. If it leaks, delete the webhook on Discord and create a new one.', 'Mantén el webhook <strong>privado</strong>: quien lo tenga puede escribir en ese canal. Si se filtra, borra el webhook en Discord y crea uno nuevo.'),
        ],
      })}

      <div id="discord-box" class="spazio-sopra"><p class="suggerimento">${L('Carico…', 'Loading…', 'Cargando…')}</p></div>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.tv)}${L('Nuovo video su YouTube', 'New YouTube video', 'Nuevo vídeo en YouTube')}</h2>
      <p>${L('Quando esce un', 'When a', 'Cuando sale un')} <strong class="primo-piano">${L('nuovo video', 'new video', 'nuevo vídeo')}</strong> ${L('sul tuo canale YouTube, avviso il gruppo Telegram (e, se vuoi, la chat Twitch). Funziona con il feed pubblico di YouTube:', 'comes out on your YouTube channel, I alert the Telegram group (and, if you want, the Twitch chat). It works with YouTube’s public feed:', 'sale en tu canal de YouTube, aviso al grupo de Telegram (y, si quieres, al chat de Twitch). Funciona con el feed público de YouTube:')} <strong>${L('affidabile e senza chiavi', 'reliable and key-free', 'fiable y sin claves')}</strong>.</p>

      <label class="campo" for="inp-yt-canale">${L('Il tuo canale YouTube', 'Your YouTube channel', 'Tu canal de YouTube')}</label>
      <input type="text" id="inp-yt-canale" class="campo-largo" placeholder="${L('@iltuohandle · oppure l\'URL o l\'ID (UC…) del canale', '@yourhandle · or the channel URL or ID (UC…)', '@tuhandle · o la URL o el ID (UC…) del canal')}" value="${esc(ytc.canale || '')}">
      <p class="suggerimento">${L('Va bene l\'<code>@handle</code>, l\'URL del canale, o l\'ID <code>UC…</code>. Lo risolvo io.', 'The <code>@handle</code>, the channel URL, or the <code>UC…</code> ID all work. I resolve it.', 'Vale el <code>@handle</code>, la URL del canal o el ID <code>UC…</code>. Yo lo resuelvo.')}</p>

      <label class="campo spazio-sopra" for="inp-yt-apikey">${L('La tua chiave API YouTube', 'Your YouTube API key', 'Tu clave API de YouTube')} <span class="suggerimento">(${L('facoltativa', 'optional', 'opcional')})</span></label>
      <input type="password" id="inp-yt-apikey" class="campo-largo" placeholder="${ytc.apiKeySet ? L('•••••••• (impostata)', '•••••••• (set)', '•••••••• (configurada)') : L('YouTube Data API v3 — lascia vuoto per usare l\'RSS', 'YouTube Data API v3 — leave empty to use RSS', 'YouTube Data API v3 — déjalo vacío para usar el RSS')}" autocomplete="off">
      <p class="suggerimento">${L('Senza chiave uso il <strong>feed RSS pubblico</strong> (va benissimo). Con la tua chiave (<em>YouTube Data API v3</em>, da', 'Without a key I use the <strong>public RSS feed</strong> (works great). With your key (<em>YouTube Data API v3</em>, from', 'Sin clave uso el <strong>feed RSS público</strong> (va perfecto). Con tu clave (<em>YouTube Data API v3</em>, de')} <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud</a>) ${L('la rilevazione è ancora più affidabile.', 'detection is even more reliable.', 'la detección es aún más fiable.')}
      ${ytc.apiKeySet ? `<a href="#" id="btn-yt-apikey-rimuovi">${L('Rimuovi la chiave', 'Remove the key', 'Quitar la clave')}</a>` : ''}</p>

      <label class="campo spazio-sopra" for="txt-yt-messaggio">${L('Messaggio dell\'avviso', 'Alert message', 'Mensaje del aviso')}</label>
      <textarea id="txt-yt-messaggio" rows="4" placeholder="${esc(L('{nome} ha caricato un nuovo video su YouTube!\n\n{titolo}\n{link}', '{nome} uploaded a new video on YouTube!\n\n{titolo}\n{link}', '¡{nome} ha subido un nuevo vídeo a YouTube!\n\n{titolo}\n{link}'))}">${esc(ytc.messaggio || '')}</textarea>
      <p class="suggerimento">${L('Segnaposto:', 'Placeholders:', 'Marcadores:')} <code>{nome}</code> <code>{titolo}</code> <code>{link}</code>. ${L('Lascia vuoto per usare quello standard.', 'Leave empty to use the default.', 'Déjalo vacío para usar el estándar.')}</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-yt-attivo" ${ytc.attivo ? 'checked' : ''}>
        <label for="chk-yt-attivo">${L('Avvisami quando esce un nuovo video', 'Alert me when a new video comes out', 'Avísame cuando sale un nuevo vídeo')}</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-yt-chat" ${ytc.annunciaChat ? 'checked' : ''}>
        <label for="chk-yt-chat">${L('Annuncia anche nella chat Twitch', 'Announce in Twitch chat too', 'Anuncia también en el chat de Twitch')}</label>
      </div>

      <p class="spazio-sopra">
        <button class="btn" id="btn-yt-salva">${L('Salva', 'Save', 'Guardar')}</button>
      </p>
      <p class="suggerimento">${L('Il controllo parte ogni ~10 minuti; il primo giro serve solo a memorizzare l\'ultimo video (non avvisa).', 'The check runs every ~10 minutes; the first pass only stores the latest video (no alert).', 'La comprobación se hace cada ~10 minutos; la primera vuelta solo memoriza el último vídeo (no avisa).')}</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.fotocamera)}${L('Nuovo post su Instagram', 'New Instagram post', 'Nuevo post en Instagram')}</h2>
      <p>${L('Quando pubblichi su', 'When you post on', 'Cuando publicas en')} <strong class="primo-piano">Instagram</strong>, ${L('avviso il gruppo Telegram (e, se vuoi, la chat Twitch). Instagram non ha un feed pubblico, quindi serve la <strong>tua API</strong>: l\'<em>Instagram Graph API</em> (account Business/Creator collegato a una Pagina Facebook).', 'I alert the Telegram group (and, if you want, the Twitch chat). Instagram has no public feed, so you need <strong>your own API</strong>: the <em>Instagram Graph API</em> (Business/Creator account linked to a Facebook Page).', 'aviso al grupo de Telegram (y, si quieres, al chat de Twitch). Instagram no tiene feed público, así que hace falta <strong>tu API</strong>: la <em>Instagram Graph API</em> (cuenta Business/Creator vinculada a una Página de Facebook).')}</p>

      <label class="campo" for="inp-ig-userid">${L('ID account Instagram', 'Instagram account ID', 'ID de la cuenta de Instagram')}</label>
      <input type="text" id="inp-ig-userid" class="campo-largo" placeholder="${L('es. 17841400000000000', 'e.g. 17841400000000000', 'p. ej. 17841400000000000')}" value="${esc(igc.userId || '')}">
      <label class="campo spazio-sopra" for="inp-ig-token">${L('Token di accesso (Graph API)', 'Access token (Graph API)', 'Token de acceso (Graph API)')}</label>
      <input type="password" id="inp-ig-token" class="campo-largo" placeholder="${igc.tokenSet ? L('•••••••• (impostato)', '•••••••• (set)', '•••••••• (configurado)') : L('token a lunga durata', 'long-lived token', 'token de larga duración')}" autocomplete="off">
      <p class="suggerimento">${L('Li ottieni creando un\'app su', 'You get them by creating an app on', 'Los obtienes creando una app en')} <a href="https://developers.facebook.com/" target="_blank" rel="noopener">Meta for Developers</a>
      ${L('e collegando il tuo account IG Business.', 'and linking your IG Business account.', 'y vinculando tu cuenta de IG Business.')} ${igc.tokenSet ? `<a href="#" id="btn-ig-token-rimuovi">${L('Rimuovi il token', 'Remove the token', 'Quitar el token')}</a>` : ''}</p>

      <label class="campo spazio-sopra" for="txt-ig-messaggio">${L('Messaggio dell\'avviso', 'Alert message', 'Mensaje del aviso')}</label>
      <textarea id="txt-ig-messaggio" rows="4" placeholder="${esc(L('{nome} ha un nuovo post su Instagram!\n\n{titolo}\n{link}', '{nome} has a new Instagram post!\n\n{titolo}\n{link}', '¡{nome} tiene un nuevo post en Instagram!\n\n{titolo}\n{link}'))}">${esc(igc.messaggio || '')}</textarea>
      <p class="suggerimento">${L('Segnaposto:', 'Placeholders:', 'Marcadores:')} <code>{nome}</code> <code>{titolo}</code> (${L('didascalia', 'caption', 'pie de foto')}) <code>{link}</code>.</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-ig-attivo" ${igc.attivo ? 'checked' : ''}>
        <label for="chk-ig-attivo">${L('Avvisami quando pubblico un nuovo post', 'Alert me when I post a new one', 'Avísame cuando publico un nuevo post')}</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-ig-chat" ${igc.annunciaChat ? 'checked' : ''}>
        <label for="chk-ig-chat">${L('Annuncia anche nella chat Twitch', 'Announce in Twitch chat too', 'Anuncia también en el chat de Twitch')}</label>
      </div>

      <p class="spazio-sopra">
        <button class="btn" id="btn-ig-salva">${L('Salva', 'Save', 'Guardar')}</button>
        <button class="btn secondario" id="btn-ig-prova">${L('Prova le credenziali', 'Test the credentials', 'Prueba las credenciales')}</button>
        <span id="ig-esito" class="suggerimento"></span>
      </p>
    </div>`);
}

// --- scheda Regole ------------------------------------------------------

function pannelloRegole() {
  const s = impostazioni();
  const a = s.antispam || {};
  const sel = (v, def) => v === undefined ? def : v;   // default "acceso" per i booleani
  return pannello('regole', `
    <div class="carta">
      <h2>${_hIco(ICO.divieto)}${L('Parole vietate', 'Banned words', 'Palabras prohibidas')}</h2>
      <p>${L('Una per riga. Il bot', 'One per line. The bot', 'Una por línea. El bot')} <strong class="primo-piano">${L('non le dirà mai', 'will never say them', 'nunca las dirá')}</strong> ${L('e richiama chi le usa in chat.', 'and calls out anyone using them in chat.', 'y llama la atención a quien las usa en el chat.')}</p>
      <label class="campo" for="txt-vietate">${L('Elenco parole vietate', 'Banned words list', 'Lista de palabras prohibidas')}</label>
      <textarea id="txt-vietate" placeholder="${L('una parola per riga', 'one word per line', 'una palabra por línea')}">${esc(s.paroleVietate.join('\n'))}</textarea>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-regole">${L('Salva', 'Save', 'Guardar')}</button></p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.scudo)}${L('Antispam automatico', 'Automatic anti-spam', 'Antispam automático')}</h2>
      ${stato.moderazioneOk
        ? `<p class="suggerimento"><span class="badge verde">✓ ${L('permessi di moderazione attivi', 'moderation permissions active', 'permisos de moderación activos')}</span></p>`
        : `<p class="suggerimento">${L('Per eliminare i messaggi servono i permessi di moderazione (aggiunti dopo).', 'Deleting messages needs moderation permissions (added later).', 'Para borrar mensajes hacen falta los permisos de moderación (añadidos después).')}
        <a class="btn secondario mini" href="/auth/permessi">${L('Concedi i permessi', 'Grant permissions', 'Concede los permisos')}</a></p>`}
      <p>${L('Elimina da solo lo spam e, a chi insiste, dà un timeout crescente.', 'Deletes spam on its own and gives escalating timeouts to repeat offenders.', 'Borra el spam solo y da timeouts crecientes a los reincidentes.')}
      <strong class="primo-piano">${L('Mod, VIP e broadcaster sono sempre esenti.', 'Mods, VIPs and the broadcaster are always exempt.', 'Mods, VIP y el broadcaster están siempre exentos.')}</strong></p>

      <div class="riga-check">
        <input type="checkbox" id="chk-as-attivo" ${a.attivo ? 'checked' : ''}>
        <label for="chk-as-attivo">${L('Attiva l\'antispam', 'Enable anti-spam', 'Activa el antispam')}</label>
      </div>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-as-link" ${sel(a.link, true) ? 'checked' : ''}>
        <label for="chk-as-link">${L('Blocca i link non autorizzati', 'Block unauthorized links', 'Bloquea los enlaces no autorizados')}</label>
      </div>
      <div class="riga-flessibile">
        <span class="suggerimento">${L('Possono postare link:', 'Can post links:', 'Pueden publicar enlaces:')}</span>
        <select id="sel-as-linktier">
          <option value="mod" ${a.linkTier === 'mod' ? 'selected' : ''}>${L('solo mod', 'mods only', 'solo mods')}</option>
          <option value="vip" ${a.linkTier === 'vip' ? 'selected' : ''}>${L('VIP e mod', 'VIPs and mods', 'VIP y mods')}</option>
          <option value="sub" ${(a.linkTier || 'sub') === 'sub' ? 'selected' : ''}>${L('sub, VIP e mod', 'subs, VIPs and mods', 'subs, VIP y mods')}</option>
          <option value="tutti" ${a.linkTier === 'tutti' ? 'selected' : ''}>${L('tutti (non bloccare)', 'everyone (don’t block)', 'todos (no bloquear)')}</option>
        </select>
      </div>
      <label class="campo" for="txt-as-whitelist">${L('Domini sempre permessi (uno per riga)', 'Always-allowed domains (one per line)', 'Dominios siempre permitidos (uno por línea)')}</label>
      <textarea id="txt-as-whitelist" placeholder="${L('es. youtube.com&#10;instagram.com/tuonome', 'e.g. youtube.com&#10;instagram.com/yourname', 'p. ej. youtube.com&#10;instagram.com/tunombre')}">${esc((Array.isArray(a.whitelist) ? a.whitelist : []).join('\n'))}</textarea>
      <p class="suggerimento">${L('Il tuo canale, le clip di Twitch e andryxify.it sono già permessi.', 'Your channel, Twitch clips and andryxify.it are already allowed.', 'Tu canal, los clips de Twitch y andryxify.it ya están permitidos.')}</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-as-ripet" ${sel(a.ripetizioni, true) ? 'checked' : ''}>
        <label for="chk-as-ripet">${L('Blocca copypasta / messaggi ripetuti', 'Block copypasta / repeated messages', 'Bloquea copypasta / mensajes repetidos')}</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-as-flood" ${sel(a.flood, true) ? 'checked' : ''}>
        <label for="chk-as-flood">${L('Blocca il flood (troppi messaggi di fila)', 'Block flooding (too many messages in a row)', 'Bloquea el flood (demasiados mensajes seguidos)')}</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-as-caps" ${sel(a.maiuscole, true) ? 'checked' : ''}>
        <label for="chk-as-caps">${L('Blocca i messaggi TUTTI MAIUSCOLI', 'Block ALL-CAPS messages', 'Bloquea los mensajes EN MAYÚSCULAS')}</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-as-menz" ${sel(a.menzioni, true) ? 'checked' : ''}>
        <label for="chk-as-menz">${L('Blocca le valanghe di @menzioni', 'Block @mention floods', 'Bloquea las avalanchas de @menciones')}</label>
      </div>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-as-timeout" ${sel(a.timeoutRecidivi, true) ? 'checked' : ''}>
        <label for="chk-as-timeout">${L('Timeout crescente ai recidivi (1ª volta solo cancella, poi 1m, 5m, 10m)', 'Escalating timeout for repeat offenders (1st time delete only, then 1m, 5m, 10m)', 'Timeout creciente a los reincidentes (1.ª vez solo borra, luego 1m, 5m, 10m)')}</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-as-avvisa" ${sel(a.avvisa, true) ? 'checked' : ''}>
        <label for="chk-as-avvisa">${L('Avvisa in chat quando elimina', 'Warn in chat when it deletes', 'Avisa en el chat cuando borra')}</label>
      </div>

      <p class="spazio-sopra"><button class="btn" id="btn-salva-antispam">${L('Salva antispam', 'Save anti-spam', 'Guardar antispam')}</button></p>
    </div>`);
}

// --- scheda Memoria & Statistiche --------------------------------------

function pannelloMemoria() {
  return pannello('memoria', `
    <div class="carta">
      <h2>${_hIco(ICO.grafico)}${L('Statistiche degli ultimi 7 giorni', 'Last 7 days stats', 'Estadísticas de los últimos 7 días')}</h2>
      <div class="griglia-stat" id="griglia-stat"><div class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</div></div>
      <h3>${L('Top chatters', 'Top chatters', 'Top chatters')}</h3>
      <ul class="lista-voci" id="lista-chatters"><li class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</li></ul>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.cervello)}${L('La memoria del bot', 'The bot’s memory', 'La memoria del bot')}</h2>
      <p>${L('Le "lezioni" che ha imparato osservando la tua chat e i fatti stabili che ricorda sul canale.', 'The “lessons” it learned watching your chat and the stable facts it remembers about the channel.', 'Las «lecciones» que aprendió observando tu chat y los datos estables que recuerda sobre el canal.')}</p>
      <p class="spazio-sopra"><button class="btn secondario" id="btn-carica-memoria">${L('Mostra la memoria', 'Show the memory', 'Mostrar la memoria')}</button></p>
      <div id="contenitore-memoria"></div>
      <hr class="separatore">
      <p><strong class="primo-piano">${L('Zona pericolosa.', 'Danger zone.', 'Zona peligrosa.')}</strong> ${L('Azzera lezioni, ricordi sugli utenti, fatti e conoscenza imparata dalla chat. La conoscenza dal sito e quella scritta da te restano.', 'Wipes lessons, user memories, facts and knowledge learned from chat. Knowledge from the site and what you wrote stays.', 'Borra lecciones, recuerdos de usuarios, datos y conocimiento aprendido del chat. El conocimiento de la web y el escrito por ti se mantiene.')}</p>
      <p class="spazio-sopra"><button class="btn pericolo" id="btn-reset">${L('Azzera ciò che ha imparato', 'Wipe what it learned', 'Borra lo que ha aprendido')}</button></p>
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
      document.getElementById('etichetta-bot').textContent = acceso ? L('Bot acceso', 'Bot on', 'Bot encendido') : L('Bot spento', 'Bot off', 'Bot apagado');
      toast(acceso ? L('Bot acceso!', 'Bot on!', '¡Bot encendido!') : L('Bot spento.', 'Bot off.', 'Bot apagado.'));
    } catch (e) {
      ev.target.checked = !acceso;
      toast(L('Errore: ', 'Error: ', 'Error: ') + e.message, 'errore');
    }
  });

  // installazione dell'app (PWA)
  document.getElementById('btn-installa')?.addEventListener('click', async () => {
    if (promptInstall) {
      promptInstall.prompt();
      const scelta = await promptInstall.userChoice.catch(() => null);
      if (scelta?.outcome === 'accepted') toast(L('App installata!', 'App installed!', '¡App instalada!'));
      promptInstall = null;
    } else if (window.matchMedia('(display-mode: standalone)').matches) {
      toast(L('L\'app è già installata', 'The app is already installed', 'La app ya está instalada'));
    } else {
      toast(L('Usa il menu del browser: “Installa app” / “Aggiungi a Home”.', 'Use the browser menu: “Install app” / “Add to Home”.', 'Usa el menú del navegador: “Instalar app” / “Añadir a inicio”.'));
    }
  });

  // gestione abbonamento (portale clienti Stripe)
  document.getElementById('btn-portale-abbonamento')?.addEventListener('click', () => conErrore(async () => {
    const r = await api('/api/abbonamento/portale', { method: 'POST', body: {} });
    if (r?.url) location.href = r.url;
  }));

  // invito di un moderatore (crea il link da mandargli)
  document.getElementById('btn-invita-mod')?.addEventListener('click', () => conErrore(async () => {
    const login = (document.getElementById('inp-mod-login').value || '').trim().replace(/^@/, '');
    if (!login) { toast(L('Scrivi l’username Twitch del moderatore.', 'Type the moderator\'s Twitch username.', 'Escribe el nombre de usuario de Twitch del moderador.'), 'errore'); return; }
    const r = await api('/api/moderatori', { method: 'POST', body: { login } });
    document.getElementById('inp-mod-login').value = '';
    mostraInvito(r.invito);
    toast(L('Invito creato: copia il link e mandaglielo', 'Invite created: copy the link and send it to them', 'Invitación creada: copia el enlace y envíaselo'));
    caricaModeratori();
  }));

  // creazione di una passkey
  document.getElementById('btn-crea-passkey')?.addEventListener('click', (ev) => conErrore(async () => {
    const btn = ev.currentTarget; btn.disabled = true;
    try { await creaPasskey(); toast(L('Passkey creata! Ora puoi rientrare senza pass', 'Passkey created! Now you can log back in without a password', '¡Passkey creada! Ahora puedes volver a entrar sin contraseña')); caricaPasskey(); }
    catch (e) {
      if (e?.name === 'NotAllowedError') toast(L('Operazione annullata.', 'Operation canceled.', 'Operación cancelada.'), 'errore');
      else toast(L('Passkey non creata: ', 'Passkey not created: ', 'Passkey no creada: ') + (e.message || e), 'errore');
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
      out.textContent = 'Fatto! ' + riassunto;
      toast(L('Profilo riletto, conoscenza aggiornata', 'Profile re-read, knowledge updated', 'Perfil releído, conocimiento actualizado'));
      // ricarica lo stato per aggiornare timestamp e contatore conoscenza
      stato = await api('/api/me');
      render();
    } catch (e) {
      out.textContent = '' + e.message;
      toast(L('Pre-addestramento fallito: ', 'Pre-training failed: ', 'Pre-entrenamiento fallido: ') + e.message, 'errore');
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
      internet: document.getElementById('chk-internet').checked,
      frasi: righe(document.getElementById('txt-frasi').value),
    }, 'Personalità salvata');
  }));

  // linee guida: aggiungi (l'elenco e i "✕" si gestiscono in caricaGuide)
  const aggiungiGuida = () => conErrore(async () => {
    const inp = document.getElementById('inp-guida');
    const t = (inp?.value || '').trim();
    if (t.length < 3) return;
    const dove = document.getElementById('sel-guida-dove')?.value || 'ovunque';
    const con_chi = document.getElementById('sel-guida-conchi')?.value || 'tutti';
    await api('/api/streamer/guide', { method: 'POST', body: { testo: t, dove, con_chi } });
    if (inp) inp.value = '';
    caricaGuide();
    toast(L('Regola aggiunta', 'Rule added', 'Regla añadida'));
  });
  document.getElementById('btn-guida-add')?.addEventListener('click', aggiungiGuida);
  document.getElementById('inp-guida')?.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); aggiungiGuida(); } });

  // clip: interruttore + slider sensibilità con anteprima dal vivo
  document.getElementById('chk-clip')?.addEventListener('change', (ev) => {
    const et = document.getElementById('etichetta-clip');
    if (et) et.textContent = ev.target.checked ? 'Clip automatiche accese' : 'Clip automatiche spente';
  });
  document.getElementById('rng-clip-sens')?.addEventListener('input', (ev) => {
    const v = document.getElementById('val-clip-sens');
    if (v) v.textContent = ev.target.value;
  });
  document.getElementById('btn-salva-clip')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      clipAuto: document.getElementById('chk-clip').checked,
      clipAutoSensibilita: Number(document.getElementById('rng-clip-sens').value),
    }, 'Impostazioni clip salvate');
  }));

  document.getElementById('btn-salva-regole')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      paroleVietate: righe(document.getElementById('txt-vietate').value),
    }, 'Regole salvate');
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
    }, 'Antispam salvato');
  }));

  document.getElementById('btn-salva-giochi')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      giochi: document.getElementById('chk-giochi').checked,
      nomeMonete: document.getElementById('inp-monete').value.trim(),
      promoSocial: document.getElementById('chk-promo').checked,
    }, 'Giochi salvati');
  }));

  // personalizzazione punti/classifica
  document.getElementById('btn-salva-punti')?.addEventListener('click', () => conErrore(async () => {
    const v = (id) => Number(document.getElementById(id).value);
    await salvaImpostazioni({ punti: {
      perMessaggio: v('pt-perMessaggio'), ogniSecondi: v('pt-ogniSecondi'),
      trivia: v('pt-trivia'), duello: v('pt-duello'),
      slotCosto: v('pt-slotCosto'), slotVinci: v('pt-slotVinci'),
      slotCoppia: v('pt-slotCoppia'), topN: v('pt-topN'),
    } }, 'Punti aggiornati');
  }));

  // manche automatiche
  document.getElementById('btn-salva-manche')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({ manche: {
      attivo: document.getElementById('chk-manche').checked,
      minMin: Number(document.getElementById('mn-min').value),
      maxMin: Number(document.getElementById('mn-max').value),
      soloLive: document.getElementById('chk-manche-live').checked,
    } }, 'Manche salvate');
  }));

  // creatore di giochi: mostra i campi giusti in base al tipo
  document.getElementById('gioco-tipo')?.addEventListener('change', (ev) => {
    const trivia = ev.target.value === 'trivia';
    document.getElementById('gioco-trivia').hidden = !trivia;
    document.getElementById('gioco-parola').hidden = trivia;
  });
  document.getElementById('btn-crea-gioco')?.addEventListener('click', () => conErrore(async () => {
    const tipo = document.getElementById('gioco-tipo').value;
    const nome = document.getElementById('gioco-nome').value.trim();
    const body = { tipo, nome };
    if (tipo === 'trivia') {
      body.domande = document.getElementById('gioco-domande').value.split('\n').map((r) => {
        const [q, ris] = r.split('|');
        return { q: (q || '').trim(), a: (ris || '').split(',').map((x) => x.trim()).filter(Boolean) };
      }).filter((d) => d.q && d.a.length);
      if (!body.domande.length) { toast(L('Aggiungi almeno una domanda con risposta.', 'Add at least one question with an answer.', 'Añade al menos una pregunta con respuesta.'), 'errore'); return; }
    } else {
      body.parole = document.getElementById('gioco-parole').value.split('\n').map((p) => p.trim()).filter(Boolean);
      if (!body.parole.length) { toast(L('Aggiungi almeno una parola.', 'Add at least one word.', 'Añade al menos una palabra.'), 'errore'); return; }
    }
    await api('/api/streamer/giochi', { method: 'POST', body });
    document.getElementById('gioco-nome').value = '';
    document.getElementById('gioco-domande').value = '';
    document.getElementById('gioco-parole').value = '';
    toast(L('Gioco creato!', 'Game created!', '¡Juego creado!'));
    caricaGiochi();
  }));

  // ponte "giochi del sito": solo l'interruttore (endpoint/segreto arrivano dal sito)
  document.getElementById('btn-salva-giochisito')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({ giochiSito: { attivo: document.getElementById('chk-giochisito').checked } }, 'Giochi del sito salvati');
  }));

  // citazioni: aggiunta dalla dashboard
  document.getElementById('btn-aggiungi-citazione')?.addEventListener('click', () => conErrore(async () => {
    const inp = document.getElementById('inp-citazione');
    const testo = (inp.value || '').trim();
    if (!testo) { toast(L('Scrivi la citazione.', 'Type the quote.', 'Escribe la cita.'), 'errore'); return; }
    const r = await api('/api/streamer/citazioni', { method: 'POST', body: { testo } });
    inp.value = '';
    toast(L('Citazione #', 'Quote #', 'Cita #') + r.n + L(' aggiunta', ' added', ' añadida'));
    caricaCitazioni();
  }));

  // citazioni: estrai da un link → riempie la textarea (da curare prima di importare)
  document.getElementById('btn-estrai-citazioni')?.addEventListener('click', (ev) => conErrore(async () => {
    const url = (document.getElementById('inp-import-url').value || '').trim();
    if (!url) { toast(L('Incolla un link.', 'Paste a link.', 'Pega un enlace.'), 'errore'); return; }
    const btn = ev.currentTarget; btn.disabled = true; const orig = btn.textContent; btn.textContent = 'Estraggo…';
    try {
      const r = await api('/api/streamer/citazioni/da-url', { method: 'POST', body: { url } });
      const ta = document.getElementById('txt-import-citazioni');
      const esistenti = ta.value.trim();
      ta.value = (esistenti ? esistenti + '\n' : '') + (r.citazioni || []).join('\n');
      if (r.avviso) mostraAvvisoCita(r.avviso); else if (r.citazioni?.length) mostraAvvisoCita('');
      toast(r.citazioni?.length ? `Trovate ${r.citazioni.length} possibili citazioni — controllale e importa`
        : (r.avviso ? 'Quel link disegna le frasi col JavaScript — usa il bottone magico' : 'Nessuna citazione trovata in quel link'),
        r.citazioni?.length ? 'ok' : 'errore');
    } finally { btn.disabled = false; btn.textContent = orig; }
  }));

  // mostra/nasconde l'avviso "hai incollato il guscio senza JS"
  const mostraAvvisoCita = (msg) => {
    const el = document.getElementById('import-cita-avviso');
    if (!el) return;
    if (msg) { el.innerHTML = '' + msg; el.hidden = false; } else { el.hidden = true; el.textContent = ''; }
  };

  // il bookmarklet "Prendi le quote da x.la": lo si trascina nei preferiti
  const bmXla = document.getElementById('bm-xla');
  if (bmXla) {
    bmXla.href = bookmarkletXla;
    // cliccato QUI (sul bot) non serve: va aperto su x.la. Spieghiamo invece di navigare.
    bmXla.addEventListener('click', (e) => { e.preventDefault(); toast(L('Trascinami nella barra dei preferiti, poi cliccami mentre sei sulla tua pagina x.la', 'Drag me to your bookmarks bar, then click me while you\'re on your x.la page', 'Arrástrame a la barra de favoritos, luego haz clic en mí mientras estás en tu página x.la')); });
  }
  document.getElementById('bm-xla-copia')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(bookmarkletXla); toast(L('Codice copiato. Crea un preferito e incollalo come indirizzo', 'Code copied. Create a bookmark and paste it as the address', 'Código copiado. Crea un favorito y pégalo como dirección')); }
    catch { window.prompt(L('Copia con Ctrl+C, poi crea un preferito con questo indirizzo:', 'Copy with Ctrl+C, then create a bookmark with this address:', 'Copia con Ctrl+C, luego crea un favorito con esta dirección:'), bookmarkletXla); }
  });

  // citazioni: riconosce (testo/autore/data, formato x.la) e importa
  document.getElementById('btn-importa-citazioni')?.addEventListener('click', () => conErrore(async () => {
    const testo = document.getElementById('txt-import-citazioni').value || '';
    const esito = document.getElementById('import-cita-esito');
    if (!testo.trim()) { toast(L('Incolla prima qualche citazione.', 'Paste some quotes first.', 'Pega primero algunas citas.'), 'errore'); return; }
    const a = await api('/api/streamer/citazioni/analizza', { method: 'POST', body: { testo } });
    const citazioni = a.citazioni || [];
    if (!citazioni.length) {
      if (a.avviso) mostraAvvisoCita(a.avviso);
      toast(a.avviso ? L('Hai incollato il guscio di x.la, non le frasi — leggi qui sotto', "You pasted the x.la shell, not the quotes — read below", 'Has pegado el armazón de x.la, no las frases — lee abajo') : L('Non ho riconosciuto nessuna citazione', "I didn't recognize any quotes", 'No he reconocido ninguna cita'), 'errore');
      return;
    }
    mostraAvvisoCita('');
    const conAutore = citazioni.filter((q) => q.autore).length;
    const conData = citazioni.filter((q) => q.data).length;
    const r = await api('/api/streamer/citazioni/importa', { method: 'POST', body: { citazioni } });
    document.getElementById('txt-import-citazioni').value = '';
    if (esito) esito.textContent = `${r.aggiunte} importate (${conAutore} con autore, ${conData} con data)` + (r.saltate ? ` · ${r.saltate} doppioni` : '');
    toast(L(`Importate ${r.aggiunte} citazioni con nome e data`, `Imported ${r.aggiunte} quotes with name and date`, `Importadas ${r.aggiunte} citas con nombre y fecha`));
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
    }, 'Premio VIP salvato');
  }));

  // modalità di attivazione (24/7 · quando live · manuale)
  document.getElementById('btn-salva-modalita')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({ modalita: document.getElementById('sel-modalita').value }, 'Modalità salvata ⏱');
  }));

  // --- Notifiche Telegram ---
  document.getElementById('btn-tg-token')?.addEventListener('click', () => conErrore(async () => {
    const inp = document.getElementById('inp-tg-token');
    if (inp?.disabled) return;   // già collegato
    const token = (inp?.value || '').trim();
    if (!token) { toast(L('Incolla il token del bot (te lo dà @BotFather).', 'Paste the bot token (@BotFather gives it to you).', 'Pega el token del bot (te lo da @BotFather).'), 'errore'); return; }
    const r = await api('/api/streamer/telegram/token', { method: 'POST', body: { token } });
    toast(L('Bot collegato: @', 'Bot connected: @', 'Bot conectado: @') + (r.botUsername || '?') + '');
    stato = await api('/api/me'); render();
  }));

  document.getElementById('btn-tg-rileva')?.addEventListener('click', () => conErrore(async () => {
    const r = await api('/api/streamer/telegram/rileva', { method: 'POST', body: {} });
    toast(r.privato ? L('Collegata la chat privata col bot.', 'Private chat with the bot connected.', 'Chat privado con el bot conectado.') : L('Gruppo collegato: ', 'Group connected: ', 'Grupo conectado: ') + (r.gruppo || '✓'));
    stato = await api('/api/me'); render();
  }));

  document.getElementById('btn-tg-salva')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/streamer/telegram/impostazioni', { method: 'POST', body: {
      attivo: document.getElementById('chk-tg-attivo').checked,
      messaggio: document.getElementById('txt-tg-messaggio').value,
      pinLive: document.getElementById('chk-tg-pin')?.checked ?? true,
    } });
    toast(L('Notifiche Telegram salvate', 'Telegram notifications saved', 'Notificaciones de Telegram guardadas'));
    stato = await api('/api/me');   // aggiorna lo stato senza perdere la scheda
  }));

  document.getElementById('btn-tg-prova')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/streamer/telegram/prova', { method: 'POST', body: {} });
    toast(L('Messaggio di prova inviato nel gruppo', 'Test message sent to the group', 'Mensaje de prueba enviado al grupo'));
  }));

  document.getElementById('btn-tg-scollega')?.addEventListener('click', () => conErrore(async () => {
    if (!confirm(L('Scollegare il bot Telegram? Dovrai reincollare il token per riattivarlo.', 'Disconnect the Telegram bot? You\'ll have to paste the token again to reactivate it.', '¿Desconectar el bot de Telegram? Tendrás que volver a pegar el token para reactivarlo.'))) return;
    await api('/api/streamer/telegram', { method: 'DELETE' });
    toast(L('Telegram scollegato.', 'Telegram disconnected.', 'Telegram desconectado.'));
    stato = await api('/api/me'); render();
  }));

  // --- Bot interattivo su Telegram (webhook + comandi) ---
  document.getElementById('chk-tg-interattivo')?.addEventListener('change', (ev) => {
    const chk = ev.target;
    conErrore(async () => {
      await api('/api/streamer/telegram/interattivo', { method: 'POST', body: { attivo: chk.checked } });
      toast(chk.checked ? 'Bot interattivo attivato' : 'Bot interattivo spento.');
      stato = await api('/api/me'); render();
    }).catch(() => { chk.checked = !chk.checked; });   // in caso di errore, rimetti lo switch
  });

  // --- Chat privata Telegram: chi risponde + collegamento "solo me" ---
  document.getElementById('chk-tg-dm')?.addEventListener('change', (ev) => conErrore(async () => {
    await api('/api/streamer/telegram/dm', { method: 'POST', body: { modo: ev.target.checked ? 'me' : 'off' } });
    toast(ev.target.checked ? 'In privato risponderò solo a te.' : 'Chat privata spenta.');
    stato = await api('/api/me'); render();
  }));
  document.getElementById('btn-tg-dm-collega')?.addEventListener('click', (ev) => { ev.preventDefault(); conErrore(async () => {
    const r = await api('/api/streamer/telegram/collega', { method: 'POST', body: {} });
    const box = document.getElementById('tg-dm-codice');
    if (box) box.innerHTML = `<p class="nota-lettura">Scrivi al tuo bot${r.username ? ' <strong>@' + esc(r.username) + '</strong>' : ''} in privato:<br><code>/collega ${esc(r.code)}</code><br>Scade tra 10 minuti.</p>`;
  }); });
  document.getElementById('btn-tg-dm-scollega')?.addEventListener('click', (ev) => { ev.preventDefault(); conErrore(async () => {
    await api('/api/streamer/telegram/scollega', { method: 'POST', body: {} });
    toast(L('Account Telegram scollegato.', 'Telegram account disconnected.', 'Cuenta de Telegram desconectada.'));
    stato = await api('/api/me'); render();
  }); });
  document.getElementById('chk-tg-proattiva')?.addEventListener('change', (ev) => conErrore(async () => {
    await salvaImpostazioni({ proattivoTg: ev.target.checked },
      ev.target.checked ? 'Ok, ogni tanto ti scriverò io' : 'Non ti scriverò più per prima.');
  }));

  // --- Auguri di compleanno (delega sul contenitore, ricaricato via JS) ---
  document.getElementById('box-compleanni')?.addEventListener('click', (ev) => {
    if (ev.target.closest('#btn-compleanni-salva')) return conErrore(async () => {
      await api('/api/streamer/telegram/compleanni', { method: 'POST', body: {
        attivo: document.getElementById('chk-compleanni-attivo')?.checked,
        messaggio: document.getElementById('txt-compleanni-msg')?.value || '',
      } });
      toast(L('Auguri di compleanno salvati', 'Birthday wishes saved', 'Felicitaciones de cumpleaños guardadas'));
      caricaCompleanni();
    });
    if (ev.target.closest('#btn-comple-aggiungi')) return conErrore(async () => {
      await api('/api/streamer/telegram/compleanni/aggiungi', { method: 'POST', body: {
        nome: document.getElementById('inp-comple-nome')?.value || '',
        giorno: document.getElementById('inp-comple-giorno')?.value || '',
        mese: document.getElementById('inp-comple-mese')?.value || '',
      } });
      toast(L('Compleanno aggiunto', 'Birthday added', 'Cumpleaños añadido'));
      caricaCompleanni();
    });
    if (ev.target.closest('#btn-membri-aggiorna')) return conErrore(async () => {
      const r = await api('/api/streamer/telegram/membri/aggiorna', { method: 'POST', body: {} });
      toast(L(`Caricati ${r.aggiunti || 0} amministratori`, `Loaded ${r.aggiunti || 0} admins`, `Cargados ${r.aggiunti || 0} administradores`));
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
        toast(L('Compleanno aggiunto (verrà taggato)', 'Birthday added (they\'ll be tagged)', 'Cumpleaños añadido (se le etiquetará)'));
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
    }, 'TikTok salvato');
  }));

  document.getElementById('btn-tk-prova')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/streamer/tiktok/prova', { method: 'POST', body: {} });
    toast(L('Prova TikTok inviata nel gruppo Telegram', 'TikTok test sent to the Telegram group', 'Prueba de TikTok enviada al grupo de Telegram'));
  }));

  // --- Nuovo post su TikTok (API ufficiale) ---
  document.getElementById('btn-tk-post-salva')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      tiktok: {
        postAttivo: document.getElementById('chk-tk-post-attivo').checked,
        postAnnunciaChat: document.getElementById('chk-tk-post-chat').checked,
        postMessaggio: document.getElementById('txt-tk-post-msg')?.value || '',
      },
    }, 'TikTok salvato');
  }));

  document.getElementById('btn-yt-salva')?.addEventListener('click', () => conErrore(async () => {
    const yt = {
      canale: (document.getElementById('inp-yt-canale').value || '').trim(),
      attivo: document.getElementById('chk-yt-attivo').checked,
      annunciaChat: document.getElementById('chk-yt-chat').checked,
      messaggio: document.getElementById('txt-yt-messaggio')?.value || '',
    };
    const ak = (document.getElementById('inp-yt-apikey')?.value || '').trim();
    if (ak) yt.apiKey = ak;   // vuoto = mantieni quella salvata
    await salvaImpostazioni({ youtube: yt }, 'YouTube salvato');
  }));
  document.getElementById('btn-yt-apikey-rimuovi')?.addEventListener('click', (ev) => { ev.preventDefault(); conErrore(async () => {
    await salvaImpostazioni({ youtube: { canale: (document.getElementById('inp-yt-canale').value || '').trim(), apiKeyClear: true } }, 'Chiave rimossa.');
    stato = await api('/api/me'); render();
  }); });

  document.getElementById('btn-ig-salva')?.addEventListener('click', () => conErrore(async () => {
    const ig = {
      userId: (document.getElementById('inp-ig-userid').value || '').trim(),
      attivo: document.getElementById('chk-ig-attivo').checked,
      annunciaChat: document.getElementById('chk-ig-chat').checked,
      messaggio: document.getElementById('txt-ig-messaggio')?.value || '',
    };
    const tk = (document.getElementById('inp-ig-token')?.value || '').trim();
    if (tk) ig.token = tk;
    await salvaImpostazioni({ instagram: ig }, 'Instagram salvato');
  }));
  document.getElementById('btn-ig-token-rimuovi')?.addEventListener('click', (ev) => { ev.preventDefault(); conErrore(async () => {
    await salvaImpostazioni({ instagram: { userId: (document.getElementById('inp-ig-userid').value || '').trim(), tokenClear: true } }, 'Token rimosso.');
    stato = await api('/api/me'); render();
  }); });
  document.getElementById('btn-ig-prova')?.addEventListener('click', () => conErrore(async () => {
    const esito = document.getElementById('ig-esito');
    if (esito) esito.textContent = 'Provo…';
    const r = await api('/api/streamer/instagram/prova', { method: 'POST', body: {
      userId: (document.getElementById('inp-ig-userid').value || '').trim(),
      token: (document.getElementById('inp-ig-token').value || '').trim(),
    } });
    if (esito) esito.innerHTML = r && r.ok ? 'Funziona!' : `${esc((r && r.motivo) || 'errore')}`;
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
    if (!comando) { toast(L('Scrivi il nome del comando (senza !).', 'Type the command name (without !).', 'Escribe el nombre del comando (sin !).'), 'errore'); return; }
    if (!risposta) { toast(L('Scrivi cosa deve rispondere il bot.', 'Type what the bot should reply.', 'Escribe qué debe responder el bot.'), 'errore'); return; }
    await api('/api/streamer/moduli', { method: 'POST', body: {
      nome: 'Comando !' + comando, attivo: true,
      trigger: { tipo: 'comando', comando, alias: [] },
      condizioni: { tier: 'tutti', cooldown: 0, probabilita: 100, soloLive: false, soloOffline: false },
      azioni: [{ tipo: 'messaggio', testo: risposta }],
    } });
    document.getElementById('qc-nome').value = '';
    document.getElementById('qc-risposta').value = '';
    toast(L('Comando !', 'Command !', 'Comando !') + comando + L(' creato', ' created', ' creado'));
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
        await salvaImpostazioni({ ascoltoLive: acceso }, acceso ? 'Ascolto live acceso' : 'Ascolto live spento.');
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
    await salvaImpostazioni({ ascoltoLive, ascoltoSensibilita }, 'Ascolto live salvato');
    const et = document.getElementById('etichetta-ascolto');
    if (et) et.textContent = ascoltoLive ? 'Ascolto acceso' : 'Ascolto spento';
  }));

  // --- cambio categoria a voce: label live, esempio live, salvataggio ---
  document.getElementById('chk-categoria')?.addEventListener('change', (ev) => {
    const et = document.getElementById('etichetta-categoria');
    if (et) et.textContent = ev.target.checked ? 'Attivo' : 'Spento';
  });
  document.getElementById('inp-cat-trigger')?.addEventListener('input', (ev) => {
    const ex = document.getElementById('cat-esempio');
    if (ex) ex.textContent = (ev.target.value.trim() || 'categoria');
  });
  document.getElementById('btn-salva-categoria')?.addEventListener('click', () => conErrore(async () => {
    const attivo = document.getElementById('chk-categoria').checked;
    const trigger = (document.getElementById('inp-cat-trigger').value || '').trim().toLowerCase() || 'categoria';
    const annuncia = document.getElementById('chk-cat-annuncia').checked;
    await salvaImpostazioni({ cambioCategoria: { attivo, trigger, annuncia } }, 'Comando categoria salvato');
    const et = document.getElementById('etichetta-categoria');
    if (et) et.textContent = attivo ? 'Attivo' : 'Spento';
  }));

  // --- cambio titolo a voce ---
  document.getElementById('chk-titolo')?.addEventListener('change', (ev) => {
    const et = document.getElementById('etichetta-titolo');
    if (et) et.textContent = ev.target.checked ? 'Attivo' : 'Spento';
  });
  document.getElementById('inp-tit-trigger')?.addEventListener('input', (ev) => {
    const ex = document.getElementById('tit-esempio');
    if (ex) ex.textContent = (ev.target.value.trim() || 'titolo');
  });
  document.getElementById('btn-salva-titolo')?.addEventListener('click', () => conErrore(async () => {
    const attivo = document.getElementById('chk-titolo').checked;
    const trigger = (document.getElementById('inp-tit-trigger').value || '').trim().toLowerCase() || 'titolo';
    const annuncia = document.getElementById('chk-tit-annuncia').checked;
    await salvaImpostazioni({ cambioTitolo: { attivo, trigger, annuncia } }, 'Comando titolo salvato');
    const et = document.getElementById('etichetta-titolo');
    if (et) et.textContent = attivo ? 'Attivo' : 'Spento';
  }));

  // --- "impara mentre parlo": interruttore che salva subito ---
  document.getElementById('chk-impara')?.addEventListener('change', (ev) => {
    const acceso = ev.target.checked;
    const et = document.getElementById('etichetta-impara');
    conErrore(async () => {
      try {
        await salvaImpostazioni({ imparaVoce: { attivo: acceso } }, acceso ? 'Ora imparo mentre parli' : 'Ascolto per imparare spento.');
        if (et) et.textContent = acceso ? 'Attivo' : 'Spento';
      } catch (e) { ev.target.checked = !acceso; throw e; }
    });
  });

  // conoscenza: aggiunta manuale
  document.getElementById('btn-aggiungi-conoscenza')?.addEventListener('click', () => conErrore(async () => {
    const domanda = document.getElementById('inp-domanda').value.trim();
    const risposta = document.getElementById('inp-risposta').value.trim();
    if (!domanda || !risposta) { toast(L('Compila domanda e risposta.', 'Fill in question and answer.', 'Completa pregunta y respuesta.'), 'errore'); return; }
    await api('/api/streamer/knowledge', { method: 'POST', body: { domanda, risposta } });
    document.getElementById('inp-domanda').value = '';
    document.getElementById('inp-risposta').value = '';
    toast(L('Il bot ha imparato qualcosa di nuovo', 'The bot learned something new', 'El bot ha aprendido algo nuevo'));
    caricaConoscenza();
  }));

  // copia URL overlay OBS
  document.getElementById('btn-copia-overlay')?.addEventListener('click', async () => {
    const inp = document.getElementById('inp-overlay-url');
    if (!inp?.value) { toast(L('URL non ancora pronto, riprova tra un attimo.', 'URL not ready yet, try again in a moment.', 'URL aún no lista, inténtalo de nuevo en un momento.'), 'errore'); return; }
    try {
      await navigator.clipboard.writeText(inp.value);
      toast(L('URL dell\'overlay copiato', 'Overlay URL copied', 'URL del overlay copiada'));
    } catch {
      inp.select();
      try { document.execCommand('copy'); toast(L('URL selezionato: premi Ctrl+C', 'URL selected: press Ctrl+C', 'URL seleccionada: pulsa Ctrl+C')); }
      catch { toast(L('Copia manualmente l\'URL selezionato.', 'Copy the selected URL manually.', 'Copia manualmente la URL seleccionada.'), 'errore'); }
    }
  });

  // --- Regia (Vai live) ---
  document.getElementById('regia-refresh')?.addEventListener('click', () => conErrore(() => caricaRegia()));
  document.getElementById('regia-salva-canale')?.addEventListener('click', () => conErrore(() => salvaRegiaCanale()));
  document.getElementById('regia-clip')?.addEventListener('click', () => conErrore(async () => {
    const r = await api('/api/streamer/regia/clip', { method: 'POST' }); toast(L('Clip creata!', 'Clip created!', '¡Clip creada!')); if (r.url) window.open(r.url, '_blank', 'noopener');
  }));
  document.getElementById('regia-marker')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/streamer/regia/marker', { method: 'POST', body: { descrizione: document.getElementById('regia-marker-desc')?.value || '' } });
    toast(L('Marker messo nel VOD', 'Marker added to the VOD', 'Marcador puesto en el VOD'));
  }));
  document.getElementById('regia-ad')?.addEventListener('click', () => conErrore(async () => {
    const r = await api('/api/streamer/regia/pubblicita', { method: 'POST', body: { durata: Number(document.getElementById('regia-ad-durata')?.value) || 60 } });
    toast(L(`Pubblicità di ${r.length}s avviata`, `${r.length}s ad started`, `Anuncio de ${r.length}s iniciado`));
  }));
  document.getElementById('regia-raid')?.addEventListener('click', () => conErrore(async () => {
    const c = document.getElementById('regia-raid-canale')?.value || '';
    const r = await api('/api/streamer/regia/raid', { method: 'POST', body: { canale: c } });
    toast(L(`Raid verso ${r.target || c} avviata`, `Raid to ${r.target || c} started`, `Raid hacia ${r.target || c} iniciada`));
  }));
  document.getElementById('regia-raid-annulla')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/streamer/regia/raid/annulla', { method: 'POST' }); toast(L('Raid annullata', 'Raid canceled', 'Raid cancelada'));
  }));
  // selettore gioco/categoria della regia
  const gCerca = document.getElementById('regia-gioco-cerca');
  gCerca?.addEventListener('input', () => { clearTimeout(_regiaCercaTimer); _regiaCercaTimer = setTimeout(cercaGiochiRegia, 300); });
  const gLista = document.getElementById('regia-gioco-lista');
  gLista?.addEventListener('click', (ev) => {
    const opt = ev.target.closest('.rg-opt'); if (!opt) return;
    _regiaGameId = opt.dataset.id;
    const sel = document.getElementById('regia-gioco-sel'); if (sel) sel.textContent = opt.dataset.nome;
    gLista.hidden = true; if (gCerca) gCerca.value = '';
  });
  document.addEventListener('click', (ev) => { if (gLista && !gLista.hidden && !gLista.contains(ev.target) && ev.target !== gCerca) gLista.hidden = true; });

  // --- Studio Web (scene, fonti, mixer: tutto via delegazione) ---
  initStudio();

  // caricamento di un effetto (multipart, con spinner)
  document.getElementById('btn-carica-effetto')?.addEventListener('click', caricaEffettoUpload);
  // "rendi pubblico": mostra il campo nome nella libreria
  document.getElementById('eff-pubblico')?.addEventListener('change', (e) => {
    const box = document.getElementById('eff-nome-box'); if (box) box.hidden = !e.target.checked;
  });
  // libreria condivisa: filtri per tipo, ricerca, import, anteprima audio/video
  document.querySelectorAll('.lib-tab').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.lib-tab').forEach((x) => x.classList.remove('attivo'));
    b.classList.add('attivo'); _libTipo = b.dataset.tipo || ''; caricaLibreria();
  }));
  document.getElementById('lib-cerca')?.addEventListener('input', () => {
    clearTimeout(_libCercaTimer); _libCercaTimer = setTimeout(caricaLibreria, 300);
  });
  const grigliaLib = document.getElementById('lib-griglia');
  if (grigliaLib) {
    grigliaLib.addEventListener('click', (ev) => {
      const imp = ev.target.closest('.lib-importa');
      const play = ev.target.closest('.lib-play');
      if (imp) conErrore(() => importaLibreria(imp.dataset.id, imp));
      else if (play) { try { const a = new Audio(play.dataset.audio); a.play().catch(() => {}); } catch (e) { /* niente */ } }
    });
    grigliaLib.addEventListener('mouseover', (ev) => { const v = ev.target.closest('video.lib-media'); if (v) v.play().catch(() => {}); });
    grigliaLib.addEventListener('mouseout', (ev) => { const v = ev.target.closest('video.lib-media'); if (v) { try { v.pause(); v.currentTime = 0; } catch (e) { /* niente */ } } });
  }

  // memoria on-demand
  document.getElementById('btn-carica-memoria')?.addEventListener('click', () => caricaMemoria(true));

  // reset con conferma
  document.getElementById('btn-reset')?.addEventListener('click', () => conErrore(async () => {
    if (!confirm(L('Sicuro? Il bot dimenticherà lezioni, ricordi sugli utenti e conoscenza imparata dalla chat. Non si torna indietro.', 'Are you sure? The bot will forget lessons, memories about users and knowledge learned from chat. There\'s no going back.', '¿Seguro? El bot olvidará lecciones, recuerdos sobre los usuarios y conocimiento aprendido del chat. No hay vuelta atrás.'))) return;
    await api('/api/streamer/memoria/reset', { method: 'POST', body: {} });
    toast(L('Memoria azzerata. Il bot riparte da zero (ma la tua conoscenza resta).', 'Memory wiped. The bot starts from scratch (but your knowledge stays).', 'Memoria borrada. El bot empieza de cero (pero tu conocimiento se queda).'));
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
      toast(L('Modulo salvato', 'Module saved', 'Módulo guardado'));
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
      toast(L('Salvato e provato: guarda chat/overlay', 'Saved and tested: check chat/overlay', 'Guardado y probado: mira chat/overlay'));
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
  try { await fn(); } catch (e) { toast(L('Errore: ', 'Error: ', 'Error: ') + e.message, 'errore'); }
}

// carica i dati "pigri" della scheda selezionata
function caricaDatiScheda(id) {
  if (schedaBloccata(id)) return;   // pagina bloccata: nessuna API (darebbe 403)
  if (id === 'stato') { caricaPasskey(); caricaModeratori(); caricaRetePanoramica(); }
  if (id === 'personalita') caricaGuide();
  if (id === 'conoscenza') caricaConoscenza();
  if (id === 'clip') caricaClip();
  if (id === 'musica') caricaSpotify();
  if (id === 'sondaggi') caricaSondaggi();
  if (id === 'giveaway') caricaGiveaway();
  if (id === 'penitenze') caricaPenitenze();
  if (id === 'alert') caricaAlert();
  if (id === 'regia') caricaRegia();
  if (id === 'studio') caricaStudio();
  if (id === 'effetti') { caricaEffetti(); caricaPremi(); caricaSuoniPremi(); caricaLibreria(); }
  if (id === 'emote') caricaEmote7TV();
  if (id === 'moduli') { caricaModuli(); caricaContatori(); }
  if (id === 'memoria') caricaStatistiche();
  if (id === 'giochi') { caricaClassifica(); caricaCitazioni(); caricaGiochi(); }
  if (id === 'notifiche') { caricaCompleanni(); caricaTikTok(); caricaDiscord(); caricaTgLogin(); }
  if (id === 'admin' && stato.isAdmin) { caricaTabellaAdmin(); caricaAnima(); caricaLLM(); }
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
    <li><div class="testo-voce"><span class="domanda">${esc(c.nome || '—')}</span>
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
    <textarea id="txt-compleanni-msg" rows="3" placeholder="Tanti auguri {menzione}!">${esc(d.messaggio || '')}</textarea>
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
    const badge = { auto: 'dal sito', manuale: 'tua', chat: 'dalla chat' };
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
        toast(L('Voce dimenticata.', 'Entry forgotten.', 'Entrada olvidada.'));
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
// giochi personalizzati (creati dallo streamer)
async function caricaGiochi() {
  const ul = document.getElementById('lista-giochi');
  if (!ul) return;
  try {
    const giochi = await api('/api/streamer/giochi');
    const et = { trivia: 'trivia', parola: 'parola' };
    ul.innerHTML = giochi.length
      ? giochi.map((g) => {
          const dett = g.tipo === 'trivia' ? `${(g.config.domande || []).length} domande` : `${(g.config.parole || []).length} parole`;
          return `<li>
            <div class="testo-voce">
              <div class="domanda">${esc(g.nome || '(senza nome)')} <span class="badge viola">${et[g.tipo] || g.tipo}</span></div>
              <div class="meta">${dett}${g.attivo ? '' : ' · <span class="badge">in pausa</span>'}</div>
            </div>
            <div class="azioni-voce">
              <button class="btn secondario mini" data-gioco-toggle="${g.id}" data-attivo="${g.attivo ? 1 : 0}">${g.attivo ? 'Pausa' : 'Riattiva'}</button>
              <button class="btn pericolo mini" data-gioco-elimina="${g.id}">Elimina</button>
            </div>
          </li>`;
        }).join('')
      : '<li class="vuoto">Nessun gioco tuo ancora: creane uno qui sopra! I giochi di default (trivia, reflex, numero) funzionano comunque.</li>';
    ul.onclick = (ev) => {
      const tog = ev.target.closest('[data-gioco-toggle]');
      const del = ev.target.closest('[data-gioco-elimina]');
      if (tog) conErrore(async () => {
        await api('/api/streamer/giochi/' + tog.dataset.giocoToggle + '/toggle', { method: 'POST', body: { attivo: tog.dataset.attivo !== '1' } });
        caricaGiochi();
      });
      else if (del) conErrore(async () => {
        if (!confirm(L('Eliminare questo gioco?', 'Delete this game?', '¿Eliminar este juego?'))) return;
        await api('/api/streamer/giochi/' + del.dataset.giocoElimina, { method: 'DELETE' });
        toast(L('Gioco eliminato.', 'Game deleted.', 'Juego eliminado.')); caricaGiochi();
      });
    };
  } catch (e) { ul.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`; }
}

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
              <span class="domanda">${esc(v.display || v.user)}</span>
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

function medaglia(i) { return ['', '', ''][i] || `${i + 1}°`; }

async function caricaCitazioni() {
  const ul = document.getElementById('lista-citazioni');
  if (!ul) return;
  try {
    const voci = await api('/api/streamer/citazioni');
    const fmtD = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
    ul.innerHTML = voci.length
      ? voci.map((q) => {
        const meta = [q.autore ? '@' + esc(q.autore) : '', fmtD(q.data)].filter(Boolean).join(' · ');
        return `<li>
          <div class="testo-voce"><span class="domanda">#${q.n}</span> <span class="risposta">${esc(q.text)}</span>${meta ? ` <span class="suggerimento">— ${meta}</span>` : ''}</div>
          <button class="btn secondario mini" data-cita-rimuovi="${q.n}">Rimuovi</button>
        </li>`;
      }).join('')
      : '<li class="vuoto">Ancora nessuna citazione. Aggiungine una qui sopra o con !cita aggiungi in chat</li>';
    ul.onclick = (ev) => {
      const b = ev.target.closest('[data-cita-rimuovi]');
      if (!b) return;
      conErrore(async () => { await api('/api/streamer/citazioni/' + b.dataset.citaRimuovi, { method: 'DELETE' }); toast(L('Citazione rimossa.', 'Quote removed.', 'Cita eliminada.')); caricaCitazioni(); });
    };
  } catch (e) { ul.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`; }
}

// --- effetti & suoni ----------------------------------------------------

async function caricaEffetti() {
  const ul = document.getElementById('lista-effetti');
  if (!ul) return;
  try {
    const dati = await api('/api/streamer/effetti');
    // NB: il link OBS vive nella scheda Overlay (per-overlay), non qui: non tocchiamo inp-overlay-url

    const etTipo = { audio: _bIco(ICO.altoparlante) + L('audio', 'audio', 'audio'), immagine: _bIco(ICO.immagine) + L('immagine', 'image', 'imagen'), video: _bIco(ICO.video) + L('video', 'video', 'vídeo') };
    const etTier = { tutti: L('tutti', 'everyone', 'todos'), sub: 'sub', vip: 'VIP', mod: 'mod' };

    if (!dati.effetti.length) {
      ul.innerHTML = `<li class="vuoto">${L('Nessun effetto ancora: caricane uno qui sopra e provalo!', 'No effects yet: upload one above and try it!', 'Aún no hay efectos: sube uno arriba y ¡pruébalo!')}</li>`;
      return;
    }
    ul.innerHTML = dati.effetti.map((e) => `
      <li>
        <div class="testo-voce">
          <div class="domanda">!${esc(e.comando)} <span class="badge viola">${etTipo[e.tipo] || esc(e.tipo)}</span>${e.combo ? ' <span class="badge">combo</span>' : ''}${e.pubblico ? ` <span class="badge verde">${L('pubblico', 'public', 'público')}</span>` : ''}</div>
          <div class="meta">${L('chi', 'who', 'quién')}: ${esc(etTier[e.tier] || e.tier)} · cooldown ${e.cooldown}s · ${L('volume', 'volume', 'volumen')} ${e.volume}% · ${e.durata}ms</div>
        </div>
        <div class="azioni-voce">
          <button class="btn secondario mini" data-pubblica="${e.id}" data-stato="${e.pubblico ? 1 : 0}" data-nome="${esc(e.nome || e.comando)}">${e.pubblico ? _bIco(ICO.lucchetto) + L('Rendi privato', 'Make private', 'Hacer privado') : _bIco(ICO.condividi) + L('Condividi', 'Share', 'Compartir')}</button>
          <button class="btn secondario mini" data-prova="${esc(e.comando)}">${L('Prova', 'Test', 'Probar')}</button>
          <button class="btn pericolo mini" data-elimina-eff="${e.id}">${L('Elimina', 'Delete', 'Eliminar')}</button>
        </div>
      </li>`).join('');

    // Prova / Elimina / Condividi (delega sull'elenco)
    ul.onclick = (ev) => {
      const prova = ev.target.closest('[data-prova]');
      const del = ev.target.closest('[data-elimina-eff]');
      const pub = ev.target.closest('[data-pubblica]');
      if (prova) {
        conErrore(async () => {
          await api('/api/streamer/effetti/test', { method: 'POST', body: { comando: prova.dataset.prova } });
          toast(L('Effetto inviato all\'overlay (aprilo per vederlo)', 'Effect sent to the overlay (open it to see it)', 'Efecto enviado al overlay (ábrelo para verlo)'));
        });
      } else if (del) {
        conErrore(async () => {
          if (!confirm(L('Eliminare questo effetto? Il file verrà cancellato.', 'Delete this effect? The file will be deleted.', '¿Eliminar este efecto? El archivo se borrará.'))) return;
          await api('/api/streamer/effetti/' + del.dataset.eliminaEff, { method: 'DELETE' });
          toast(L('Effetto eliminato', 'Effect deleted', 'Efecto eliminado'));
          caricaEffetti();
        });
      } else if (pub) {
        conErrore(async () => {
          const rendiPubblico = pub.dataset.stato !== '1';
          let nome = pub.dataset.nome || '';
          if (rendiPubblico) {
            nome = (prompt(L('Con che nome vuoi condividerlo nella libreria?', 'What name do you want to share it with in the library?', '¿Con qué nombre quieres compartirlo en la biblioteca?'), nome) || '').trim();
            if (!nome) return;   // annullato
          }
          await api('/api/streamer/effetti/' + pub.dataset.pubblica + '/pubblico', { method: 'PATCH', body: { pubblico: rendiPubblico, nome } });
          toast(rendiPubblico ? L('Condiviso nella libreria', 'Shared in the library', 'Compartido en la biblioteca') : L('Tornato privato', 'Made private again', 'Vuelto a privado'));
          caricaEffetti(); caricaLibreria();
        });
      }
    };
  } catch (e) {
    ul.innerHTML = `<li class="vuoto">${L('Errore', 'Error', 'Error')}: ${esc(e.message)}</li>`;
  }
}

// --- Libreria condivisa -------------------------------------------------
let _libTipo = '';
let _libCercaTimer = null;

function libItemHtml(it) {
  let media;
  if (it.tipo === 'immagine') media = `<img class="lib-media" src="${esc(it.url)}" loading="lazy" alt="">`;
  else if (it.tipo === 'video') media = `<video class="lib-media" src="${esc(it.url)}" muted playsinline loop preload="metadata"></video>`;
  else media = '<div class="lib-media lib-audio"></div>';
  const audio = (it.tipo === 'audio' || it.combo)
    ? `<button type="button" class="btn secondario mini lib-play" data-audio="${esc(it.suonoUrl || it.url)}" title="${L('Ascolta', 'Listen', 'Escuchar')}">▶</button>` : '';
  return `<div class="lib-card" data-id="${it.id}">
    <div class="lib-media-wrap">${media}${it.combo ? '<span class="lib-combo">combo</span>' : ''}</div>
    <div class="lib-nome" title="${esc(it.nome)}">${esc(it.nome)}</div>
    <div class="meta">${L('di', 'by', 'de')} ${esc(it.autore)}${it.usi ? ' · ' + it.usi + ' ' + L('usi', 'uses', 'usos') : ''}</div>
    <div class="lib-azioni">${audio}<button type="button" class="btn mini lib-importa" data-id="${it.id}">${_bIco(ICO.piu)}${L('Aggiungi', 'Add', 'Añadir')}</button></div>
  </div>`;
}

async function caricaLibreria() {
  const g = document.getElementById('lib-griglia');
  if (!g) return;
  const q = (document.getElementById('lib-cerca')?.value || '').trim();
  try {
    const d = await api(`/api/streamer/libreria?tipo=${encodeURIComponent(_libTipo)}&q=${encodeURIComponent(q)}`);
    if (!d.items.length) {
      g.innerHTML = `<p class="vuoto">${L('Ancora niente qui. Sii il primo a condividere: carica un effetto e spunta “Rendi pubblico”!', 'Nothing here yet. Be the first to share: upload an effect and tick “Make it public”!', 'Aún no hay nada aquí. Sé el primero en compartir: sube un efecto y marca “Hazlo público”.')}</p>`;
      return;
    }
    g.innerHTML = d.items.map(libItemHtml).join('');
  } catch (e) {
    g.innerHTML = `<p class="vuoto">${L('Errore', 'Error', 'Error')}: ${esc(e.message)}</p>`;
  }
}

async function importaLibreria(id, btn) {
  if (DEMO) { toast(L('In demo non si importa — accedi per farlo davvero.', "In demo you can't import — log in to do it for real.", 'En la demo no se importa — inicia sesión para hacerlo de verdad.')); return; }
  btn.disabled = true;
  const t = btn.textContent;
  btn.textContent = L('Aggiungo…', 'Adding…', 'Añadiendo…');
  try {
    const r = await api('/api/streamer/libreria/importa', { method: 'POST', body: { id: Number(id) } });
    toast(L(`Aggiunto come !${r.comando} alla tua libreria`, `Added as !${r.comando} to your library`, `Añadido como !${r.comando} a tu biblioteca`));
    caricaEffetti();
    btn.textContent = L('✓ Aggiunto', '✓ Added', '✓ Añadido');
  } catch (e) {
    toast(L('Non riuscito: ', 'Failed: ', 'No se pudo: ') + e.message, 'errore');
    btn.disabled = false;
    btn.textContent = t;
  }
}

// invio multipart del form di caricamento effetto (non passa da api(): usa FormData)
async function caricaEffettoUpload(ev) {
  if (DEMO) { toast(L('In demo non si caricano file — accedi per farlo davvero.', "In demo you can't upload files — log in to do it for real.", 'En la demo no se suben archivos — inicia sesión para hacerlo de verdad.')); return; }
  const btn = ev.currentTarget;
  const out = document.getElementById('esito-effetto');
  const fileInput = document.getElementById('eff-file');
  const comando = document.getElementById('eff-comando').value.trim();
  const file = fileInput.files[0];
  if (out) out.textContent = '';

  if (!file) { toast(L('Scegli un file da caricare.', 'Choose a file to upload.', 'Elige un archivo para subir.'), 'errore'); return; }
  if (!comando) { toast(L('Scrivi il comando (senza !).', 'Type the command (without !).', 'Escribe el comando (sin !).'), 'errore'); return; }

  const suonoInput = document.getElementById('eff-suono');
  const suonoFile = suonoInput?.files[0];
  const pubblico = !!document.getElementById('eff-pubblico')?.checked;

  const fd = new FormData();
  fd.append('file', file);
  if (suonoFile) fd.append('suono', suonoFile);       // COMBO: suono abbinato
  fd.append('comando', comando);
  fd.append('tier', document.getElementById('eff-tier').value);
  fd.append('cooldown', document.getElementById('eff-cooldown').value);
  fd.append('volume', document.getElementById('eff-volume').value);
  fd.append('durata', document.getElementById('eff-durata').value);
  fd.append('pubblico', pubblico ? '1' : '0');
  fd.append('nome', document.getElementById('eff-nome')?.value?.trim() || '');

  btn.disabled = true;
  const testoOrig = btn.textContent;
  btn.textContent = L('Comprimo e carico… ⏳', 'Compressing and uploading… ⏳', 'Comprimiendo y subiendo… ⏳');
  try {
    // niente header Content-Type: lo imposta il browser col boundary multipart
    const res = await fetch('/api/streamer/effetti', { method: 'POST', body: fd });
    let dati = null;
    try { dati = await res.json(); } catch { /* risposta non JSON */ }
    if (!res.ok) throw new Error(dati?.errore || `errore ${res.status}`);
    toast(dati?.combo ? L('Combo caricata (media + suono)!', 'Combo uploaded (media + sound)!', '¡Combo subida (media + sonido)!') : L('Effetto caricato e compresso!', 'Effect uploaded and compressed!', '¡Efecto subido y comprimido!'));
    fileInput.value = '';
    if (suonoInput) suonoInput.value = '';
    document.getElementById('eff-comando').value = '';
    const nomeBox = document.getElementById('eff-nome'); if (nomeBox) nomeBox.value = '';
    caricaEffetti();
    if (pubblico) caricaLibreria();     // riflette subito la nuova condivisione
  } catch (e) {
    if (out) out.textContent = '' + e.message;
    toast(L('Caricamento fallito: ', 'Upload failed: ', 'Subida fallida: ') + e.message, 'errore');
  } finally {
    btn.disabled = false;
    btn.textContent = testoOrig;
  }
}

// Carica un file (audio / immagine / video) SUO direttamente da un blocco alert:
// lo invia al server (che lo comprime, salva e assegna all'evento), poi ricarica
// la libreria e seleziona il nuovo media nel menu del blocco giusto. Così lo
// streamer mette quello che vuole senza passare dalla scheda Effetti.
async function caricaMediaAlert(kind, slot, file) {
  if (DEMO) { toast(L('In demo non si caricano file — accedi per farlo davvero.', "In demo you can't upload files — log in to do it for real.", 'En la demo no se suben archivos — inicia sesión para hacerlo de verdad.')); return; }
  const blocco = document.querySelector(`.alert-blocco[data-alert="${kind}"]`);
  const btn = blocco?.querySelector(`.al-btn-up[data-slot="${slot}"]`);
  const esito = btn?.parentElement?.querySelector('.al-up-esito');
  const testoOrig = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = L('Comprimo e carico… ⏳', 'Compressing and uploading… ⏳', 'Comprimiendo y subiendo… ⏳'); }
  if (esito) esito.textContent = '';
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    fd.append('slot', slot);
    // niente header Content-Type: lo imposta il browser col boundary multipart
    const res = await fetch('/api/streamer/alerts/media', { method: 'POST', body: fd });
    let dati = null; try { dati = await res.json(); } catch { /* risposta non JSON */ }
    if (!res.ok) throw new Error(dati?.errore || `errore ${res.status}`);
    // ricarica la libreria e ripopola i menu, mostrando il nuovo media già selezionato
    const lib = await api('/api/streamer/effetti').catch(() => ({ effetti: [] }));
    const cfg = impostazioni().alerts || {};
    cfg[kind] = { ...(cfg[kind] || {}), [slot === 'suono' ? 'suono' : 'media']: dati.ref };
    popolaMediaSuoniAlert(lib.effetti || [], cfg);
    if (esito) esito.textContent = '✓ ' + (slot === 'suono' ? L('suono', 'sound', 'sonido') : (dati.tipo || 'media')) + ' ' + L('caricato e assegnato', 'uploaded and assigned', 'subido y asignado');
    toast(L('Caricato e assegnato all\'alert!', 'Uploaded and assigned to the alert!', '¡Subido y asignado a la alerta!'));
  } catch (e) {
    if (esito) esito.textContent = '' + e.message;
    toast(L('Caricamento fallito: ', 'Upload failed: ', 'Subida fallida: ') + e.message, 'errore');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = testoOrig; }
  }
}

// Numeri "che contano su": animano da 0 al valore finale. Copre sia le
// statistiche (.stat .numero, valore letto dal testo) sia i contatori del
// cruscotto rete ([data-conta], con suffisso data-suff opzionale come "%").
// Rispetta prefers-reduced-motion ed è idempotente.
function animaNumeri(root) {
  const scope = root || document;
  const ridotto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // contatori espliciti del cruscotto rete
  scope.querySelectorAll('[data-conta]:not([data-contato])').forEach((el) => {
    el.dataset.contato = '1';
    const target = parseFloat(el.dataset.conta);
    const suff = el.dataset.suff || '';
    if (!isFinite(target)) return;
    if (ridotto) { el.textContent = target + suff; return; }
    const dur = 900; const t0 = performance.now();
    const passo = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);   // easeOutCubic
      el.textContent = Math.round(target * e) + suff;
      if (t < 1) requestAnimationFrame(passo); else el.textContent = target + suff;
    };
    requestAnimationFrame(passo);
  });

  // statistiche: il valore sta nel testo, formattato all'italiana
  scope.querySelectorAll('.stat .numero').forEach((el) => {
    if (el.dataset.animato) return;
    el.dataset.animato = '1';
    const finale = el.textContent.trim();
    const n = parseInt(finale.replace(/[^\d]/g, ''), 10);
    if (ridotto || !Number.isFinite(n) || n <= 0) return;   // niente da animare
    const start = performance.now();
    const passo = (ora) => {
      const t = Math.min(1, (ora - start) / 900);
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
          <li><div class="testo-voce"><span class="domanda">${['', '', '', '4°', '5°'][i] || ''} ${esc(c.user)}</span>
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
    if (mostraToast) toast(L('Memoria caricata', 'Memory loaded', 'Memoria cargada'));
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
  ['messaggio', 'Scrivi in chat'],
  ['effetto', 'Fai partire un effetto'],
  ['clip', 'Crea una clip'],
  ['categoria', 'Cambia categoria Twitch'],
  ['titolo', 'Cambia titolo stream'],
  ['contatore', 'Contatore'],
  ['webhook', 'Chiama un webhook'],
  ['attendi', 'Aspetta'],
  ['overlayTesto', 'Mostra testo sull\'overlay'],
  ['timeout', 'Timeout in chat'],
  ['musica', 'Metti una canzone in coda'],
];
// pillole variabili cliccabili (testo inserito = etichetta)
const VARIABILI = [
  // contesto
  '$user', '$touser', '$args', '$arg1', '$canale', '$uptime', '$gioco', '$titolo',
  // shoutout: gioco/titolo dell'ultima diretta del destinatario ($touser)
  '$giocotarget', '$titolotarget',
  // azioni sul canale (cambiano titolo/categoria su Twitch)
  '$titolo($args)', '$categoria($args)',
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
    case 'categoria': return a.gioco ? `cambia categoria in "${a.gioco}"` : 'cambia categoria';
    case 'titolo': return a.testo ? `cambia titolo in "${a.testo}"` : 'cambia titolo';
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
    ul.innerHTML = '<li class="vuoto">Nessun modulo ancora: parti da un modello qui sopra</li>';
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
        toast(acceso ? 'Modulo acceso' : 'Modulo spento.');
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
        toast(L('Modulo provato: guarda chat/overlay', 'Module tested: check chat/overlay', 'Módulo probado: mira chat/overlay'));
      });
    } else if (modifica) {
      const m = (datiModuli.moduli || []).find((x) => String(x.id) === String(modifica.dataset.modificaModulo));
      if (m) apriEditor(m);
    } else if (elimina) {
      conErrore(async () => {
        if (!confirm(L('Eliminare questo modulo? Non si torna indietro.', 'Delete this module? There\'s no going back.', '¿Eliminar este módulo? No hay vuelta atrás.'))) return;
        await api('/api/streamer/moduli/' + encodeURIComponent(elimina.dataset.eliminaModulo), { method: 'DELETE' });
        toast(L('Modulo eliminato', 'Module deleted', 'Módulo eliminado'));
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
      <h2>${_hIco(ICO.scrivi)}${m.id ? 'Modifica modulo' : 'Nuovo modulo'}</h2>
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
        una per riga. L'ascolto si avvia dalla pagina "Apri l'ascolto vocale" in <strong>Diretta → Comandi a voce</strong>.</p>
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
        <textarea data-campo="testo" data-var-target placeholder="es. Ciao $user!">${esc(a.testo || '')}</textarea>
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
    case 'categoria':
      return `
        <label class="campo">Categoria / gioco (puoi usare le variabili, es. <code>$args</code>)</label>
        <input type="text" data-campo="gioco" data-var-target placeholder="es. Fortnite oppure $args" value="${esc(a.gioco || '')}">
        ${pillole}
        <div class="riga-check spazio-sopra">
          <input type="checkbox" data-campo="annuncia" ${a.annuncia !== false ? 'checked' : ''}>
          <label>Annuncia il cambio in chat</label>
        </div>
        <p class="suggerimento">Il bot cerca la categoria su Twitch e imposta quella più somigliante a ciò che scrivi/dici.
        Serve il permesso <strong class="primo-piano">Gestione canale</strong> (lo concedi da <strong>Diretta → Comandi a voce</strong>).</p>`;
    case 'titolo':
      return `
        <label class="campo">Nuovo titolo (puoi usare le variabili, es. <code>$gioco</code>, <code>$args</code>)</label>
        <textarea data-campo="testo" data-var-target placeholder="es. In diretta: $gioco con la community!">${esc(a.testo || '')}</textarea>
        ${pillole}
        <div class="riga-check spazio-sopra">
          <input type="checkbox" data-campo="annuncia" ${a.annuncia !== false ? 'checked' : ''}>
          <label>Annuncia il cambio in chat</label>
        </div>
        <p class="suggerimento">Imposta il titolo dello stream su Twitch (max 140 caratteri).
        Serve il permesso <strong class="primo-piano">Gestione canale</strong> (lo concedi da <strong>Diretta → Comandi a voce</strong>).</p>`;
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
    case 'musica':
      return `
        <label class="campo">Brano da mettere in coda (nome, artista o <code>$args</code>)</label>
        <input type="text" data-campo="brano" data-var-target placeholder="es. Blinding Lights oppure $args" value="${esc(a.brano || '')}">
        ${pillole}
        <div class="riga-check spazio-sopra">
          <input type="checkbox" data-campo="annuncia" ${a.annuncia !== false ? 'checked' : ''}>
          <label>Annuncia in chat il brano aggiunto</label>
        </div>
        <p class="suggerimento">Aggiunge il brano alla coda del tuo Spotify. Richiede l'add-on <strong class="primo-piano">Richieste Musicali</strong> e Spotify collegato in <strong>Diretta → Musica</strong>.</p>`;
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
    case 'categoria': return { tipo, gioco: (v('gioco')?.value || '').trim(), annuncia: !!v('annuncia')?.checked };
    case 'titolo': return { tipo, testo: v('testo')?.value || '', annuncia: !!v('annuncia')?.checked };
    case 'attendi': return { tipo, secondi: Number(v('secondi')?.value) || 0 };
    case 'overlayTesto': return { tipo, testo: v('testo')?.value || '', durata: Number(v('durata')?.value) || 5000 };
    case 'timeout': return { tipo, secondi: Number(v('secondi')?.value) || 0 };
    case 'musica': return { tipo, brano: (v('brano')?.value || '').trim(), annuncia: !!v('annuncia')?.checked };
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
  if (!m.nome) { toast(L('Dai un nome al modulo.', 'Give the module a name.', 'Dale un nombre al módulo.'), 'errore'); return null; }
  if (!m.azioni.length) { toast(L('Aggiungi almeno un\'azione.', 'Add at least one action.', 'Añade al menos una acción.'), 'errore'); return null; }
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

  const esempio = `curl -X POST ${apiUrl || 'https://socialbot.live/api/ext/<login>'} \\
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
      copiaTesto(datiModuli?.apiKey || '', 'Chiave copiata');
    } else if (azione === 'copia-url') {
      copiaTesto(datiModuli?.apiUrl || '', 'URL copiato');
    } else if (azione === 'rigenera') {
      conErrore(async () => {
        const nuova = !!datiModuli?.apiKey;
        if (nuova && !confirm(L('Rigenerare la chiave? Quella vecchia smetterà subito di funzionare.', 'Regenerate the key? The old one will stop working immediately.', '¿Regenerar la clave? La antigua dejará de funcionar de inmediato.'))) return;
        const res = await api('/api/streamer/apikey', { method: 'POST', body: {} });
        if (datiModuli) datiModuli.apiKey = res.apiKey;
        apiKeyVisibile = true;
        disegnaConnettori();
        toast(nuova ? 'Nuova chiave generata' : 'Chiave creata');
      });
    }
  };
}

// copia negli appunti con fallback
async function copiaTesto(testo, msgOk) {
  if (!testo) { toast(L('Niente da copiare.', 'Nothing to copy.', 'Nada que copiar.'), 'errore'); return; }
  try {
    await navigator.clipboard.writeText(testo);
    toast(msgOk);
  } catch {
    toast(L('Copia non riuscita, fallo a mano.', 'Copy failed, do it by hand.', 'Copia fallida, hazlo a mano.'), 'errore');
  }
}

// ------------------------------------------------------------------ pannello admin

// Contenuto del pannello admin (senza wrapper): usato sia come scheda "Admin"
// per l'operatore con canale approvato, sia da solo se non ha un canale.
function vistaAdminContenuto() {
  const avviso = stato.missing?.length ? `
    <div class="carta avviso">
      <h2>${_hIco(ICO.avviso)}${L('Configurazione incompleta', 'Incomplete configuration', 'Configuración incompleta')}</h2>
      <p>${L('Mancano nel file', 'Missing in the file', 'Faltan en el archivo')} <code>.env</code>: ${stato.missing.map((m) => `<code>${esc(m)}</code>`).join(', ')}.
      ${L('Il bot non parte finché non le compili.', "The bot won't start until you fill them in.", 'El bot no arranca hasta que las completes.')}</p>
    </div>` : '';

  const st = stato.status || {};
  return `
    <div class="carta">
      <h2>${_hIco(ICO.corona)}${L('Pannello andryxify', 'andryxify panel', 'Panel de andryxify')}</h2>
      <p class="spazio-sopra">
        Bot: ${st.running ? `<span class="badge verde">● ${L('in esecuzione', 'running', 'en ejecución')}</span>` : `<span class="badge rosso">○ ${L('fermo', 'stopped', 'detenido')}</span>`}
        &nbsp; ${L('Canali attivi', 'Active channels', 'Canales activos')}: ${st.channels?.length
          ? st.channels.map((c) => `<span class="badge viola">#${esc(c)}</span>`).join(' ')
          : `<span class="badge">${L('nessuno', 'none', 'ninguno')}</span>`}
        &nbsp; ${L('Streamer registrati', 'Registered streamers', 'Streamers registrados')}: <strong class="primo-piano">${st.streamers ?? 0}</strong>
      </p>
    </div>
    ${avviso}
    <div class="carta">
      <h2>Streamer</h2>
      <div class="scorrevole">
        <table class="tabella">
          <thead><tr><th>Streamer</th><th>Login</th><th>${L('Stato', 'Status', 'Estado')}</th><th>${L('Permessi', 'Permissions', 'Permisos')}</th><th>${L('Conoscenza', 'Knowledge', 'Conocimiento')}</th><th>${L('Azioni', 'Actions', 'Acciones')}</th></tr></thead>
          <tbody id="tabella-streamer"><tr><td colspan="6" class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</td></tr></tbody>
        </table>
      </div>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.cuore)}${L('Anima di SocialBot', "SocialBot's soul", 'El alma de SocialBot')}</h2>
      <p>${L('La personalità', 'The', 'La personalidad')} <strong class="primo-piano">${L('condivisa', 'shared', 'compartida')}</strong> ${L('personalità: un solo carattere, coerente su tutti i canali (in chat indossa poi il nome e il tono di ognuno). Gli utenti restano a compartimenti stagni: qui vedi solo', 'personality: a single character, consistent across all channels (in chat it then wears each one\'s name and tone). Users stay in watertight compartments: here you only see', 'personalidad: un solo carácter, coherente en todos los canales (en el chat lleva luego el nombre y el tono de cada uno). Los usuarios quedan en compartimentos estancos: aquí solo ves')} <em>${L('quanti amici', 'how many friends', 'cuántos amigos')}</em> ${L('e i più affini, mai cosa hanno scritto o dove.', 'and the most compatible, never what they wrote or where.', 'y los más afines, nunca qué escribieron o dónde.')}</p>
      <div id="anima-box"><p class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</p></div>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.cervello)}${L('Cervello — modello IA', 'Brain — AI model', 'Cerebro — modelo IA')}</h2>
      <p>${L('Il modello linguistico locale è', 'The local language model is', 'El modelo de lenguaje local es')} <strong class="primo-piano">${L('condiviso', 'shared', 'compartido')}</strong> ${L('da tutti i canali. Cambiandolo qui, il cervello lo sostituisce', 'by all channels. Changing it here, the brain swaps it', 'por todos los canales. Al cambiarlo aquí, el cerebro lo sustituye')} <strong>${L('a caldo', 'on the fly', 'en caliente')}</strong> (${L('scarica + carica: può metterci qualche minuto; nel frattempo la chat usa il motore veloce di riserva', 'download + load: it may take a few minutes; meanwhile chat uses the fast backup engine', 'descarga + carga: puede tardar unos minutos; mientras tanto el chat usa el motor rápido de reserva')}).</p>
      <div id="llm-box"><p class="vuoto">${L('Caricamento…', 'Loading…', 'Cargando…')}</p></div>
    </div>`;
}

// cruscotto della "piccola rete" in Panoramica (per il canale corrente).
// Si aggiorna IN TEMPO REALE finché sei sulla scheda: così vedi i nodi salire
// mentre alleni. Il timer si spegne da solo quando lasci la scheda.
let _reteTimer = null;

async function caricaRetePanoramica() {
  const box = document.getElementById('rete-panoramica');
  if (!box) return;
  await aggiornaRetePanoramica(box, true);
  if (_reteTimer) { clearInterval(_reteTimer); _reteTimer = null; }
  if (DEMO) return;   // in demo i dati sono finti/statici: niente polling
  _reteTimer = setInterval(() => {
    const b = document.getElementById('rete-panoramica');
    if (!b) { clearInterval(_reteTimer); _reteTimer = null; return; }   // ho lasciato la scheda
    if (document.hidden) return;                                        // scheda in background: non sprecare
    aggiornaRetePanoramica(b, false);
  }, 5000);
}

async function aggiornaRetePanoramica(box, primo) {
  let d;
  try { d = await api('/api/streamer/rete'); }
  catch { if (primo) box.innerHTML = `<p class="vuoto">${L('Non disponibile ora.', 'Not available now.', 'No disponible ahora.')}</p>`; return; }
  const pct = (x) => Math.round((x || 0) * 100) + '%';
  const num = 'font-size:1.7em;font-weight:700;line-height:1';
  const nonSo = (d.non_so || []).slice(0, 4);
  const N = (v, suff = '') => `<span data-conta="${v}"${suff ? ` data-suff="${suff}"` : ''}>${v}${suff}</span>`;
  box.innerHTML = `
    <div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:2px">
      <div><div style="${num}">${N(d.nodi || 0)}</div><small>${L('nodi appresi', 'nodes learned', 'nodos aprendidos')}</small></div>
      <div><div style="${num}">${N(d.solidi || 0)}</div><small>${L('sa rispondere', 'can answer', 'sabe responder')}</small></div>
      <div><div style="${num}">${N(d.corpus || 0)}</div><small>${L('nella sua mente', 'in its mind', 'en su mente')}</small></div>
      <div><div style="${num}">${N(Math.round((d.fiducia || 0) * 100), '%')}</div><small>${L('fiducia', 'confidence', 'confianza')}</small></div>
      <div><div style="${num}">${N(Math.round((d.curiosita || 0) * 100), '%')}</div><small>${L('curiosità', 'curiosity', 'curiosidad')}</small></div>
    </div>
    ${d.pensiero ? `<p class="spazio-sopra"><em>${esc(d.pensiero)}</em></p>` : ''}
    ${d.ragiona ? `<p class="suggerimento spazio-sopra">${L('Cervello logico (non statistico):', 'Logical brain (not statistical):', 'Cerebro lógico (no estadístico):')} <strong>${d.ragiona.fatti || 0}</strong> ${L('fatti', 'facts', 'hechos')},
      <strong>${d.ragiona.dedotti || 0}</strong> ${L('dedotti da sé ragionando', 'deduced by reasoning on its own', 'deducidos por sí mismo razonando')}${(d.ragiona.contraddizioni || []).length ? ` · ${d.ragiona.contraddizioni.length} ${L('incoerenze notate', 'inconsistencies noted', 'incoherencias notadas')}` : ''}.</p>` : ''}
    ${nonSo.length
      ? `<p class="suggerimento spazio-sopra">${L('Ultime cose che', 'Latest things it', 'Últimas cosas que')} <strong>${L('non sapeva', "didn't know", 'no sabía')}</strong> (${L('le imparerà col tempo', 'it will learn them over time', 'las aprenderá con el tiempo')}): ${nonSo.map((t) => `«${esc(t)}»`).join(' · ')}</p>`
      : `<p class="suggerimento spazio-sopra">${L('Nessuna lacuna recente: sta rispondendo bene.', 'No recent gaps: it\'s answering well.', 'Sin lagunas recientes: está respondiendo bien.')}</p>`}
    <p class="spazio-sopra"><button class="btn secondario mini" id="btn-forgia">${_bIco(ICO.libro)}${L('Studia ora', 'Study now', 'Estudiar ahora')}</button>
      &nbsp;<a class="suggerimento" href="/api/streamer/corpus" download>${_bIco(ICO.pacco)}${L('Scarica il dataset della sua mente', 'Download its mind\'s dataset', 'Descarga el dataset de su mente')}</a></p>
    <p class="suggerimento">${L('«Studia ora»: cerca da sé le sue lacune online, ci ragiona su e le distilla nel suo motore.', '«Study now»: it looks up its own gaps online, reasons over them and distills them into its engine.', '«Estudiar ahora»: busca por sí mismo sus lagunas en línea, razona sobre ellas y las destila en su motor.')}
    ${L('Il «dataset» è la sua mente: su un Mac Apple Silicon lo trasformi in un vero modello tutto suo con', 'The «dataset» is its mind: on an Apple Silicon Mac you turn it into a real model of its own with', 'El «dataset» es su mente: en un Mac Apple Silicon lo conviertes en un modelo propio de verdad con')}
    <code>forgia/forgia.sh</code> (${L('vedi', 'see', 'ver')} <code>forgia/README.md</code>), ${L('poi lo ricolleghi come "maestro".', 'then reconnect it as a "teacher".', 'luego lo reconectas como "maestro".')}</p>`;
  if (primo) animaNumeri(box);   // conta su dallo 0 solo alla prima comparsa (non a ogni refresh)
  document.getElementById('btn-forgia')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/streamer/forgia', { method: 'POST', body: {} });
    toast(L('Ci sto lavorando — studio le mie lacune e distillo. Torna tra poco.', "I'm on it — studying my gaps and distilling. Check back soon.", 'Estoy en ello — estudio mis lagunas y destilo. Vuelve pronto.'));
  }));
}

// carica e disegna la gestione del modello IA (solo operatore)
async function caricaLLM() {
  const box = document.getElementById('llm-box');
  if (!box) return;
  let d;
  try { d = await api('/api/admin/llm'); } catch (e) { box.innerHTML = `<p class="vuoto">${L('Errore', 'Error', 'Error')}: ${esc(e.message)}</p>`; return; }
  const s = d.stato || {};
  const statoTxt = { pronto: L('pronto', 'ready', 'listo'), carico: L('sto caricando…', 'loading…', 'cargando…'), spento: L('spento', 'off', 'apagado'), errore: L('errore', 'error', 'error') }[s.stato] || ('' + (s.stato || L('sconosciuto', 'unknown', 'desconocido')));
  const scelta = d.scelta || {};
  const selVal = scelta.url ? 'url' : (scelta.modello || 'auto');
  const opts = (d.modelli || []).map((m) => `<option value="${esc(m.id)}" ${selVal === m.id ? 'selected' : ''}>${esc(m.nome)}</option>`).join('');
  const ep = scelta.endpoint || {};
  const eps = s.endpoint || {};
  const epBadge = eps.configurato
    ? (eps.ok === true ? L('collegato', 'connected', 'conectado') : eps.ok === false ? L('non risponde', 'not responding', 'no responde') : L('da provare', 'to test', 'por probar'))
    : L('non collegato', 'not connected', 'no conectado');
  const rete = s.rete || {};
  const pct = (x) => Math.round((x || 0) * 100) + '%';
  const stile = { hr: 'border:0;border-top:1px solid currentColor;opacity:.15;margin:20px 0', num: 'font-size:1.7em;font-weight:700;line-height:1' };
  const locali = d.modelliLocali || [];
  const selFile = scelta.file || '';
  const libItems = locali.length
    ? locali.map((m) => `<li><span>${esc(m.nome)} <span class="suggerimento">${m.mb} MB</span>${selFile === m.nome ? ` <span class="badge verde">${L('in uso', 'in use', 'en uso')}</span>` : ''}</span> <span>${selFile === m.nome ? '' : `<a href="#" class="usa-modello" data-nome="${esc(m.nome)}">${L('usa', 'use', 'usar')}</a> · `}<a href="#" class="rimuovi-modello" data-nome="${esc(m.nome)}" title="${L('Elimina', 'Delete', 'Eliminar')}">✕</a></span></li>`).join('')
    : `<li class="vuoto">${L('Nessun modello caricato a mano. Sopra usi quelli automatici; qui sotto carichi un GGUF tuo.', 'No manually uploaded models. Above you use the automatic ones; below you upload your own GGUF.', 'Ningún modelo subido a mano. Arriba usas los automáticos; abajo subes tu propio GGUF.')}</li>`;
  box.innerHTML = `
    <p class="suggerimento"><strong>${L('Riservato a te', 'For you only', 'Reservado a ti')}</strong>: ${L('il modello del server e il maestro esterno li vedi e li cambi', 'you see and change the server model and the external teacher', 'el modelo del servidor y el maestro externo los ves y los cambias')} <strong>${L('solo tu', 'only you', 'solo tú')}</strong> (andryxify). ${L('Nessun altro streamer o moderatore ha accesso a questa sezione.', 'No other streamer or moderator has access to this section.', 'Ningún otro streamer o moderador tiene acceso a esta sección.')}</p>
    <p>${L('Stato', 'Status', 'Estado')}: <strong>${statoTxt}</strong> &nbsp; ${L('In memoria', 'In memory', 'En memoria')}: <code>${esc(s.modello || '—')}</code>${s.motivo ? ` <span class="suggerimento">(${esc(s.motivo)})</span>` : ''}</p>
    <label class="campo" for="sel-llm">${L('Modello locale (sul server)', 'Local model (on the server)', 'Modelo local (en el servidor)')}</label>
    <select id="sel-llm" class="campo-largo">
      ${opts}
      <option value="url" ${selVal === 'url' ? 'selected' : ''}>${L('URL personalizzato (GGUF)…', 'Custom URL (GGUF)…', 'URL personalizada (GGUF)…')}</option>
    </select>
    <input type="text" id="inp-llm-url" class="campo-largo spazio-sopra" placeholder="https://…gguf" value="${esc(scelta.url || '')}" ${selVal === 'url' ? '' : 'hidden'}>
    <p class="spazio-sopra">
      <button class="btn" id="btn-llm-applica">${L('Applica e ricarica', 'Apply and reload', 'Aplicar y recargar')}</button>
      <button class="btn secondario" id="btn-llm-refresh">${L('Aggiorna stato', 'Refresh status', 'Actualizar estado')}</button>
    </p>
    <p class="suggerimento">${L('"Senza freni" = modello', '"No brakes" = model', '"Sin frenos" = modelo')} <em>abliterated</em> (${L('nessun rifiuto', 'no refusals', 'sin rechazos')}). ${L('La moderazione del bot e le', "The bot's moderation and the", 'La moderación del bot y las')} <strong>${L('parole vietate', 'banned words', 'palabras prohibidas')}</strong> ${L('filtrano comunque l\'uscita.', 'still filter the output.', 'filtran igualmente la salida.')}</p>

    <hr style="${stile.hr}">
    <h3>${_hIco(ICO.pacco)}${L('Modelli sul server', 'Models on the server', 'Modelos en el servidor')}</h3>
    <p class="suggerimento">${L('Carica un', 'Upload a', 'Sube un')} <strong>GGUF</strong> ${L('dal tuo computer (es. quello forgiato sul Mac) e usalo qui. Qui vedi anche i modelli scaricati automaticamente. Pesano vari GB: occhio allo', 'from your computer (e.g. the one forged on the Mac) and use it here. Here you also see the automatically downloaded models. They weigh several GB: watch the', 'desde tu ordenador (ej. el forjado en el Mac) y úsalo aquí. Aquí ves también los modelos descargados automáticamente. Pesan varios GB: cuidado con el')} <strong>${L('spazio su disco', 'disk space', 'espacio en disco')}</strong> ${L('del server (elimina quelli che non usi).', "of the server (delete the ones you don't use).", 'del servidor (elimina los que no uses).')}</p>
    <ul class="lista-voci" id="lista-modelli">${libItems}</ul>
    <p class="spazio-sopra">
      <input type="file" id="inp-modello-file" accept=".gguf">
      <button class="btn secondario" id="btn-modello-upload">${L('Carica sul server', 'Upload to server', 'Subir al servidor')}</button>
      <span id="modello-upload-stato" class="suggerimento"></span>
    </p>

    <hr style="${stile.hr}">
    <h3>${L('Maestro esterno — LM Studio / Ollama', 'External teacher — LM Studio / Ollama', 'Maestro externo — LM Studio / Ollama')} &nbsp;<span class="suggerimento">${epBadge}</span></h3>
    <p class="suggerimento">${L('Collega un modello che gira sul', 'Connect a model running on', 'Conecta un modelo que corra en')} <strong>${L('tuo PC', 'your PC', 'tu PC')}</strong> (${L('di solito più potente del server', 'usually more powerful than the server', 'normalmente más potente que el servidor')}): ${L('il bot lo usa come', 'the bot uses it as a', 'el bot lo usa como')} <em>${L('maestro', 'teacher', 'maestro')}</em> ${L('e la piccola rete impara da', 'and the small network learns from', 'y la pequeña red aprende de')} <strong>${L('ogni', 'every', 'cada')}</strong> ${L('sua risposta. Dev\'essere raggiungibile dal server: stessa LAN, IP pubblico, o un tunnel tipo', 'answer of it. It must be reachable from the server: same LAN, public IP, or a tunnel like', 'respuesta suya. Debe ser alcanzable desde el servidor: misma LAN, IP pública, o un túnel tipo')} <code>cloudflared</code>/<code>ngrok</code>.</p>
    <label class="campo" for="ep-url">${L('Indirizzo (URL)', 'Address (URL)', 'Dirección (URL)')}</label>
    <input type="text" id="ep-url" class="campo-largo" placeholder="http://IP:1234/v1" value="${esc(ep.url || '')}">
    <label class="campo" for="ep-mod">${L('Nome del modello', 'Model name', 'Nombre del modelo')} <span class="suggerimento">(${L('facoltativo', 'optional', 'opcional')})</span></label>
    <input type="text" id="ep-mod" class="campo-largo" placeholder="${L('quello caricato in LM Studio', 'the one loaded in LM Studio', 'el cargado en LM Studio')}" value="${esc(ep.modello || '')}">
    <label class="campo" for="ep-key">${L('Chiave API', 'API key', 'Clave API')} <span class="suggerimento">(${L('se richiesta', 'if required', 'si se requiere')})</span></label>
    <input type="password" id="ep-key" class="campo-largo" placeholder="${L('(vuoto se non serve)', '(empty if not needed)', '(vacío si no hace falta)')}" value="${esc(ep.chiave || '')}">
    <label class="spazio-sopra" style="display:flex;gap:8px;align-items:flex-start;cursor:pointer">
      <input type="checkbox" id="ep-solo" ${ep.solo ? 'checked' : ''}>
      <span>${L('Usa', 'Use', 'Usa')} <strong>${L('solo', 'only', 'solo')}</strong> ${L('l\'endpoint — non caricare il modello locale (libera la RAM del server)', 'the endpoint — don\'t load the local model (frees the server RAM)', 'el endpoint — no cargar el modelo local (libera la RAM del servidor)')}</span>
    </label>
    <p class="spazio-sopra">
      <button class="btn" id="btn-ep-salva">${L('Collega', 'Connect', 'Conectar')}</button>
      <button class="btn secondario" id="btn-ep-prova">${L('Prova connessione', 'Test connection', 'Probar conexión')}</button>
      <button class="btn secondario" id="btn-ep-stacca">${L('Scollega', 'Disconnect', 'Desconectar')}</button>
    </p>
    <p id="ep-esito" class="suggerimento"></p>

    <hr style="${stile.hr}">
    <h3>${_hIco(ICO.germoglio)}${L('La piccola rete che impara', 'The small network that learns', 'La pequeña red que aprende')}</h3>
    <p class="suggerimento">${L('Il motore veloce che', 'The fast engine that', 'El motor rápido que')} <strong>${L('cresce da solo', 'grows on its own', 'crece solo')}</strong>: ${L('risponde all\'istante a ciò che ha già imparato e, quando incontra qualcosa di nuovo, lo chiede al maestro e se lo segna. "Curiosità" alta = sente di avere lacune; "fiducia" = quanto si fida di ciò che sa.', "answers instantly to what it has already learned and, when it meets something new, asks the teacher and notes it down. High \"curiosity\" = it feels it has gaps; \"confidence\" = how much it trusts what it knows.", 'responde al instante a lo que ya ha aprendido y, cuando encuentra algo nuevo, se lo pregunta al maestro y lo apunta. "Curiosidad" alta = siente que tiene lagunas; "confianza" = cuánto se fía de lo que sabe.')}</p>
    <div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:6px">
      <div><div style="${stile.num}">${rete.nodi || 0}</div><small>${L('nodi appresi', 'nodes learned', 'nodos aprendidos')}</small></div>
      <div><div style="${stile.num}">${rete.solidi || 0}</div><small>${L('sa rispondere', 'can answer', 'sabe responder')}</small></div>
      <div><div style="${stile.num}">${pct(rete.fiducia)}</div><small>${L('fiducia', 'confidence', 'confianza')}</small></div>
      <div><div style="${stile.num}">${pct(rete.curiosita)}</div><small>${L('curiosità', 'curiosity', 'curiosidad')}</small></div>
    </div>`;
  const val = (id) => (document.getElementById(id)?.value || '').trim();
  const raccogliEp = () => ({ url: val('ep-url'), modello: val('ep-mod'), chiave: val('ep-key'), solo: !!document.getElementById('ep-solo')?.checked });
  document.getElementById('sel-llm')?.addEventListener('change', (ev) => {
    const u = document.getElementById('inp-llm-url');
    if (u) u.hidden = ev.target.value !== 'url';
  });
  document.getElementById('btn-llm-refresh')?.addEventListener('click', () => conErrore(caricaLLM));
  document.getElementById('btn-llm-applica')?.addEventListener('click', () => conErrore(async () => {
    const v = document.getElementById('sel-llm').value;
    const body = v === 'url' ? { url: (document.getElementById('inp-llm-url').value || '').trim() } : { modello: v };
    await api('/api/admin/llm', { method: 'POST', body });
    toast(L('Sto cambiando modello — può metterci qualche minuto (scarica + carica).', 'Changing the model — it may take a few minutes (download + load).', 'Cambiando el modelo — puede tardar unos minutos (descarga + carga).'));
    setTimeout(caricaLLM, 2500);
  }));
  document.getElementById('btn-ep-salva')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/admin/llm', { method: 'POST', body: { endpoint: raccogliEp() } });
    toast(L('Maestro collegato — la rete inizierà a imparare da lui.', 'Teacher connected — the network will start learning from it.', 'Maestro conectado — la red empezará a aprender de él.'));
    setTimeout(caricaLLM, 1500);
  }));
  document.getElementById('btn-ep-stacca')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/admin/llm', { method: 'POST', body: { endpoint: { url: '' } } });
    toast(L('Maestro scollegato.', 'Teacher disconnected.', 'Maestro desconectado.'));
    setTimeout(caricaLLM, 800);
  }));
  document.getElementById('btn-ep-prova')?.addEventListener('click', () => conErrore(async () => {
    const esito = document.getElementById('ep-esito');
    if (esito) esito.textContent = L('Provo la connessione…', 'Testing the connection…', 'Probando la conexión…');
    const r = await api('/api/admin/llm/prova', { method: 'POST', body: { endpoint: raccogliEp() } });
    if (!esito) return;
    esito.innerHTML = r && r.ok
      ? `${L('Risponde!', 'It responds!', '¡Responde!')} ${r.modello ? `(${esc(r.modello)}) ` : ''}<em>«${esc(r.campione || 'ok')}»</em>`
      : `${L('Non risponde', 'Not responding', 'No responde')}: ${esc((r && r.motivo) || L('errore', 'error', 'error'))}`;
  }));
  // libreria modelli: usa / elimina / carica
  document.querySelectorAll('#lista-modelli .usa-modello').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); conErrore(async () => {
    await api('/api/admin/llm', { method: 'POST', body: { file: a.dataset.nome } });
    toast(L('Carico il modello — può metterci un po\'.', 'Loading the model — it may take a while.', 'Cargando el modelo — puede tardar un poco.'));
    setTimeout(caricaLLM, 2500);
  }); }));
  document.querySelectorAll('#lista-modelli .rimuovi-modello').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); conErrore(async () => {
    if (!confirm(L('Eliminare questo modello dal server?', 'Delete this model from the server?', '¿Eliminar este modelo del servidor?'))) return;
    await api('/api/admin/llm/files/' + encodeURIComponent(a.dataset.nome), { method: 'DELETE' });
    toast(L('Modello eliminato.', 'Model deleted.', 'Modelo eliminado.'));
    caricaLLM();
  }); }));
  document.getElementById('btn-modello-upload')?.addEventListener('click', () => caricaModelloFile());
}

// upload di un GGUF con barra di avanzamento (i file sono grandi: XHR per il progresso)
function caricaModelloFile() {
  const inp = document.getElementById('inp-modello-file');
  const st = document.getElementById('modello-upload-stato');
  const f = inp && inp.files && inp.files[0];
  if (!f) { toast(L('Scegli un file .gguf', 'Choose a .gguf file', 'Elige un archivo .gguf'), 'errore'); return; }
  if (!/\.gguf$/i.test(f.name)) { toast(L('Serve un file .gguf', 'A .gguf file is required', 'Se necesita un archivo .gguf'), 'errore'); return; }
  if (DEMO) { toast(L('In demo non carico davvero', "In demo it doesn't really upload", 'En la demo no se sube de verdad')); return; }
  const xhr = new XMLHttpRequest();
  const fd = new FormData();
  fd.append('file', f);
  xhr.open('POST', '/api/admin/llm/upload');
  xhr.upload.onprogress = (e) => { if (e.lengthComputable && st) st.textContent = `${L('Carico…', 'Uploading…', 'Subiendo…')} ${Math.round(e.loaded * 100 / e.total)}%`; };
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      if (st) st.textContent = L('Caricato ✓', 'Uploaded ✓', 'Subido ✓');
      toast(L('Modello caricato — ora premi «usa» per attivarlo.', 'Model uploaded — now press «use» to activate it.', 'Modelo subido — ahora pulsa «usar» para activarlo.'));
      caricaLLM();
    } else {
      let m = 'errore'; try { m = JSON.parse(xhr.responseText).errore || m; } catch { /* niente */ }
      if (st) st.textContent = L('Errore: ', 'Error: ', 'Error: ') + m;
      toast(L('Upload fallito: ', 'Upload failed: ', 'Subida fallida: ') + m, 'errore');
    }
  };
  xhr.onerror = () => { if (st) st.textContent = L('Errore di rete', 'Network error', 'Error de red'); toast(L('Upload fallito', 'Upload failed', 'Subida fallida'), 'errore'); };
  if (st) st.textContent = L('Carico… 0%', 'Uploading… 0%', 'Subiendo… 0%');
  xhr.send(fd);
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
      <label class="campo" for="an-nome">${L('Nome', 'Name', 'Nombre')}</label>
      <input type="text" id="an-nome" value="${esc(p.nome || 'SocialBot')}" maxlength="40">

      <label class="campo" for="an-tono">${L('Tono di base', 'Base tone', 'Tono base')}</label>
      <select id="an-tono">
        <option value="scherzoso" ${p.tono === 'scherzoso' ? 'selected' : ''}>${L('Scherzoso', 'Playful', 'Bromista')}</option>
        <option value="amichevole" ${p.tono === 'amichevole' ? 'selected' : ''}>${L('Amichevole', 'Friendly', 'Amistoso')}</option>
        <option value="serio" ${p.tono === 'serio' ? 'selected' : ''}>${L('Serio', 'Serious', 'Serio')}</option>
      </select>

      <label class="campo" for="an-tratti">${L('Tratti (uno per riga)', 'Traits (one per line)', 'Rasgos (uno por línea)')}</label>
      <textarea id="an-tratti" placeholder="${L('curioso&#10;ironico&#10;empatico', 'curious&#10;ironic&#10;empathetic', 'curioso&#10;irónico&#10;empático')}">${esc((p.tratti || []).join('\n'))}</textarea>

      <label class="campo" for="an-valori">${L('Valori / linee guida (uno per riga)', 'Values / guidelines (one per line)', 'Valores / directrices (uno por línea)')}</label>
      <textarea id="an-valori" placeholder="${L('rispetto&#10;community prima di tutto', 'respect&#10;community first', 'respeto&#10;la comunidad primero')}">${esc((p.valori || []).join('\n'))}</textarea>

      <label class="campo" for="an-tormentoni">${L('Tormentoni / frasi-firma (uno per riga)', 'Catchphrases / signature lines (one per line)', 'Muletillas / frases-firma (una por línea)')}</label>
      <textarea id="an-tormentoni" placeholder="${L('si vola!&#10;GG raga', 'let\'s go!&#10;GG folks', '¡vamos!&#10;GG chicos')}">${esc((p.tormentoni || []).join('\n'))}</textarea>

      <p class="spazio-sopra">${L('Stato d\'animo ora', 'Mood now', 'Estado de ánimo ahora')}:
        <span class="badge viola">${L('umore', 'mood', 'humor')} ${p.umore ?? 50}/100</span>
        <span class="badge viola">${L('energia', 'energy', 'energía')} ${p.energia ?? 60}/100</span>
        <span class="suggerimento">— ${L('cambia da solo con gli eventi (raid, sub…) e col tempo.', 'changes on its own with events (raid, sub…) and over time.', 'cambia solo con los eventos (raid, sub…) y con el tiempo.')}</span>
      </p>
      <p><strong class="primo-piano">${amici.totale}</strong> ${L('persone conosciute in tutta la rete.', 'people known across the whole network.', 'personas conocidas en toda la red.')}
        ${amici.top.length ? L('Più affini: ', 'Most compatible: ', 'Más afines: ') + amici.top.map((f) =>
          `<span class="badge">${esc(f.user)} · ${f.affinita}</span>`).join(' ') : ''}</p>

      <p class="spazio-sopra"><button class="btn" id="btn-salva-anima">${L('Salva l\'anima', 'Save the soul', 'Guardar el alma')}</button></p>`;

    document.getElementById('btn-salva-anima')?.addEventListener('click', () => conErrore(async () => {
      await api('/api/admin/anima', { method: 'POST', body: {
        nome: document.getElementById('an-nome').value.trim(),
        tono: document.getElementById('an-tono').value,
        tratti: righe(document.getElementById('an-tratti').value),
        valori: righe(document.getElementById('an-valori').value),
        tormentoni: righe(document.getElementById('an-tormentoni').value),
      } });
      toast(L('Anima aggiornata', 'Soul updated', 'Alma actualizada'));
    }));
  } catch (e) {
    box.innerHTML = `<p class="vuoto">${L('Errore', 'Error', 'Error')}: ${esc(e.message)}</p>`;
  }
}

async function caricaTabellaAdmin() {
  const tbody = document.getElementById('tabella-streamer');
  if (!tbody) return;
  try {
    const lista = await api('/api/admin/streamers');
    if (!lista.length) { tbody.innerHTML = `<tr><td colspan="6" class="vuoto">${L('Nessuno streamer ancora.', 'No streamers yet.', 'Aún no hay streamers.')}</td></tr>`; return; }

    const badgeStato = {
      pending: `<span class="badge giallo">${L('in attesa', 'pending', 'en espera')}</span>`,
      approved: `<span class="badge verde">${L('approvato', 'approved', 'aprobado')}</span>`,
      disabled: `<span class="badge rosso">${L('disabilitato', 'disabled', 'deshabilitado')}</span>`,
    };
    tbody.innerHTML = lista.map((s) => `
      <tr>
        <td>${esc(s.display || s.login)}</td>
        <td><code>${esc(s.login)}</code></td>
        <td>${badgeStato[s.status] || esc(s.status)}</td>
        <td>${s.permessiOk ? '✔' : '✘'}</td>
        <td>${s.knowledgeCount}</td>
        <td>
          ${s.status !== 'approved' ? `<button class="btn mini" data-azione="approved" data-login="${esc(s.login)}">${L('Approva', 'Approve', 'Aprobar')}</button>` : ''}
          ${s.status === 'approved' ? `<button class="btn secondario mini" data-azione="disabled" data-login="${esc(s.login)}">${L('Disabilita', 'Disable', 'Deshabilitar')}</button>` : ''}
          <button class="btn pericolo mini" data-azione="rimuovi" data-login="${esc(s.login)}">${L('Rimuovi', 'Remove', 'Quitar')}</button>
        </td>
      </tr>`).join('');

    // azioni admin (delega sul tbody)
    tbody.onclick = (ev) => {
      const btn = ev.target.closest('[data-azione]');
      if (!btn) return;
      const { azione, login } = btn.dataset;
      conErrore(async () => {
        if (azione === 'rimuovi') {
          if (!confirm(L(`Rimuovere del tutto ${login}? Verranno eliminati anche i suoi permessi.`, `Completely remove ${login}? Their permissions will be deleted too.`, `¿Eliminar por completo a ${login}? También se borrarán sus permisos.`))) return;
          await api('/api/admin/rimuovi', { method: 'POST', body: { login } });
          toast(L(`${login} rimosso.`, `${login} removed.`, `${login} eliminado.`));
        } else {
          if (azione === 'disabled' && !confirm(L(`Disabilitare ${login}? Il bot uscirà dal suo canale.`, `Disable ${login}? The bot will leave their channel.`, `¿Deshabilitar a ${login}? El bot saldrá de su canal.`))) return;
          await api('/api/admin/stato', { method: 'POST', body: { login, status: azione } });
          toast(azione === 'approved' ? L(`${login} approvato! Il bot si sta pre-addestrando.`, `${login} approved! The bot is pre-training.`, `¡${login} aprobado! El bot se está pre-entrenando.`) : L(`${login} disabilitato.`, `${login} disabled.`, `${login} deshabilitado.`));
        }
        // ricarica stato globale (canali attivi) e tabella
        stato = await api('/api/me');
        render();
      });
    };
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="vuoto">${L('Errore', 'Error', 'Error')}: ${esc(e.message)}</td></tr>`;
  }
}

// ------------------------------------------------------------------ listener globali

// bottone "richiedi SocialBot" (vista senza richiesta) — delega sul documento
document.addEventListener('click', (ev) => {
  if (ev.target.id === 'btn-richiesta') {
    conErrore(async () => {
      await api('/api/richiesta', { method: 'POST', body: {} });
      toast(L('Richiesta inviata!', 'Request sent!', '¡Solicitud enviada!'));
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
  if (!window.PublicKeyCredential) { toast(L('Questo dispositivo non supporta le passkey.', "This device doesn't support passkeys.", 'Este dispositivo no admite passkeys.'), 'errore'); return; }
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
    <p class="suggerimento spazio-sopra">${L('Manda questo link a', 'Send this link to', 'Envía este enlace a')} <strong class="primo-piano">@${esc(invito.login)}</strong>
      (${L('vale fino al', 'valid until', 'válido hasta el')} ${esc(dataIt(invito.scade))}); ${L('accederà con Twitch e potrà gestire il bot:', 'they\'ll log in with Twitch and be able to manage the bot:', 'accederá con Twitch y podrá gestionar el bot:')}</p>
    <div class="riga-flessibile">
      <input type="text" id="url-invito" readonly value="${esc(invito.url)}">
      <button class="btn" id="btn-copia-invito">${L('Copia', 'Copy', 'Copiar')}</button>
    </div>`;
  document.getElementById('btn-copia-invito')?.addEventListener('click', () => copiaTesto(invito.url, L('Link d’invito copiato', 'Invite link copied', 'Enlace de invitación copiado')));
}

async function caricaModeratori() {
  const ul = document.getElementById('lista-moderatori');
  if (!ul) return;                       // per i moderatori la card non esiste: si salta
  try {
    const lista = await api('/api/moderatori');
    if (!lista.length) { ul.innerHTML = `<li class="vuoto">${L('Ancora nessun moderatore. Invitane uno qui sopra', 'No moderators yet. Invite one above', 'Aún no hay moderadores. Invita a uno arriba')}</li>`; return; }
    const links = {};
    ul.innerHTML = lista.map((m) => {
      if (m.invito) links[m.id] = m.invito.url;
      const stato = m.status === 'attivo'
        ? `<span class="badge verde">${L('attivo', 'active', 'activo')}</span>`
        : `<span class="badge giallo">${L('invito in attesa', 'invite pending', 'invitación en espera')}</span>`;
      const meta = m.status === 'attivo'
        ? (m.last_seen ? L('ultimo accesso ', 'last access ', 'último acceso ') + esc(dataIt(m.last_seen)) : L('mai entrato', 'never entered', 'nunca ha entrado'))
        : (m.invito ? L('invito valido fino al ', 'invite valid until ', 'invitación válida hasta el ') + esc(dataIt(m.invito.scade)) : L('invito scaduto', 'invite expired', 'invitación caducada'));
      const azioni = m.status === 'attivo'
        ? `<button class="btn secondario mini" data-mod-rimuovi="${m.id}">${L('Rimuovi', 'Remove', 'Quitar')}</button>`
        : `<button class="btn secondario mini" data-mod-link="${m.id}">${L('Copia link', 'Copy link', 'Copiar enlace')}</button>
           <button class="btn secondario mini" data-mod-reinvita="${m.id}">${L('Rigenera', 'Regenerate', 'Regenerar')}</button>
           <button class="btn secondario mini" data-mod-rimuovi="${m.id}">${L('Annulla', 'Cancel', 'Cancelar')}</button>`;
      return `<li>
        <div class="testo-voce">
          <span class="domanda">${esc(m.display || m.login)} ${stato}</span>
          <span class="meta">@${esc(m.login)} · ${meta}</span>
        </div>
        <div class="azioni-voce">${azioni}</div>
      </li>`;
    }).join('');
    ul.onclick = (ev) => {
      const b = ev.target.closest('[data-mod-rimuovi],[data-mod-reinvita],[data-mod-link]');
      if (!b) return;
      if (b.dataset.modLink) { if (links[b.dataset.modLink]) copiaTesto(links[b.dataset.modLink], L('Link d’invito copiato', 'Invite link copied', 'Enlace de invitación copiado')); return; }
      if (b.dataset.modReinvita) return conErrore(async () => {
        const r = await api('/api/moderatori/' + b.dataset.modReinvita + '/reinvita', { method: 'POST', body: {} });
        mostraInvito(r.invito); toast(L('Nuovo link generato.', 'New link generated.', 'Nuevo enlace generado.')); caricaModeratori();
      });
      if (b.dataset.modRimuovi) return conErrore(async () => {
        if (!confirm(L('Rimuovere questo moderatore / annullare l’invito?', 'Remove this moderator / cancel the invite?', '¿Quitar este moderador / cancelar la invitación?'))) return;
        await api('/api/moderatori/' + b.dataset.modRimuovi, { method: 'DELETE' });
        toast(L('Fatto.', 'Done.', 'Hecho.')); caricaModeratori();
      });
    };
  } catch (e) { ul.innerHTML = `<li class="vuoto">${L('Errore', 'Error', 'Error')}: ${esc(e.message)}</li>`; }
}

async function caricaPasskey() {
  const ul = document.getElementById('lista-passkey');
  if (!ul) return;
  try {
    const lista = await api('/api/passkey');
    ul.innerHTML = lista.length
      ? lista.map((p) => `<li><div class="testo-voce"><span class="domanda">${esc(p.nome || 'Passkey')}</span>
          <span class="meta">${L('creata', 'created', 'creada')} ${esc(dataIt(p.created_at))}${p.last_used ? ' · ' + L('usata', 'used', 'usada') + ' ' + esc(dataIt(p.last_used)) : ''}</span></div>
          <button class="btn secondario mini" data-pk="${p.id}">${L('Rimuovi', 'Remove', 'Quitar')}</button></li>`).join('')
      : `<li class="vuoto">${L('Nessuna passkey ancora. Creane una per rientrare al volo', 'No passkeys yet. Create one to get back in quickly', 'Aún no hay passkeys. Crea una para volver a entrar al instante')}</li>`;
    ul.onclick = (ev) => {
      const btn = ev.target.closest('[data-pk]');
      if (!btn) return;
      conErrore(async () => { await api('/api/passkey/' + btn.dataset.pk, { method: 'DELETE' }); toast(L('Passkey rimossa.', 'Passkey removed.', 'Passkey eliminada.')); caricaPasskey(); });
    };
  } catch (e) { ul.innerHTML = `<li class="vuoto">${L('Errore', 'Error', 'Error')}: ${esc(e.message)}</li>`; }
}

// Chiude il drawer della sidebar su mobile.
function chiudiMenuMobile() {
  document.body.classList.remove('menu-aperto');
  document.getElementById('apri-menu')?.setAttribute('aria-expanded', 'false');
}

// Chiude i menu a tendina aperti nella barra in alto.
function chiudiMenuTop() {
  document.querySelectorAll('#nav-top .grp.aperto').forEach((g) => {
    g.classList.remove('aperto');
    g.querySelector('[data-menu]')?.setAttribute('aria-expanded', 'false');
  });
}

// Evidenzia nella navigazione (barra + cassetto) il gruppo e la scheda attivi.
function aggiornaStatoNav(id) {
  const gid = gruppoDiScheda(id);
  document.querySelectorAll('#nav-top .grp').forEach((el) =>
    el.classList.toggle('attivo', el.dataset.grp === gid));
  document.querySelectorAll('#nav-top .menu-voce, #nav-drawer .drawer-voce').forEach((b) =>
    b.classList.toggle('on', b.dataset.scheda === id));
}

// Apre una scheda: aggiorna lo stato della nav, il corpo pagina (dentro una view
// transition), la testata e i dati. Condivisa da barra in alto e cassetto.
function vaiAScheda(id) {
  chiudiMenuTop();
  chiudiMenuMobile();                       // su mobile chiude il cassetto
  if (id === schedaAttiva) return;
  schedaAttiva = id;
  // Una scheda logica può avere PIÙ <section> (es. Comandi = moduli + contatori):
  // le gestiamo tutte, non solo la prima che troverebbe getElementById.
  const sezioni = [...document.querySelectorAll('.pannello-scheda')].filter((p) => p.dataset.scheda === id);
  transizione(() => {
    aggiornaStatoNav(id);
    document.querySelectorAll('.pannello-scheda').forEach((p) =>
      p.classList.toggle('visibile', p.dataset.scheda === id));
    aggiornaTestataPagina();
    sezioni.forEach((p) => { rendiCartePieghevoli(p, id); rivelaCarte(p); });
  });
  caricaDatiScheda(id);
  if (DEMO) aggiornaSpiegazioneDemo();     // aggiorna la spiegazione della scheda
  window.scrollTo({ top: 0, behavior: _menoMoto ? 'auto' : 'smooth' });
}

// Aggancia UNA VOLTA SOLA i comportamenti del guscio (barra in alto + cassetto).
// Il contenuto della nav si ridisegna ad ogni render, ma questi handler restano
// fissi: quindi si delega sugli elementi persistenti.
function initGuscio() {
  // ── carte richiudibili: click sul titolo (o Invio/Spazio) apre e chiude ──
  // Delegato su document: vale per ogni carta, presente e futura.
  document.addEventListener('click', (ev) => {
    // "Apri tutto / Riduci tutto" della scheda attiva
    const tutte = ev.target.closest('[data-carte]');
    if (tutte) {
      const apri = tutte.dataset.carte === 'apri';
      document.querySelectorAll('.pannello-scheda.visibile .carta.pieghevole')
        .forEach((c) => _piegaCarta(c, apri));
      return;
    }
    const h2 = ev.target.closest('.carta.pieghevole > h2');
    if (!h2) return;
    // se ho cliccato un link/pulsante/campo dentro il titolo, lascio fare a lui
    if (ev.target.closest('a, button, input, select, textarea, label')) return;
    const carta = h2.parentElement;
    _piegaCarta(carta, carta.classList.contains('chiusa'));
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const h2 = ev.target.closest?.('.carta.pieghevole > h2');
    if (!h2 || h2 !== document.activeElement) return;
    ev.preventDefault();
    const carta = h2.parentElement;
    _piegaCarta(carta, carta.classList.contains('chiusa'));
  });
  // ricorda se hai chiuso la guida "Come funziona" di una scheda
  // ('toggle' non fa bubbling: si cattura in fase di capture)
  document.addEventListener('toggle', (ev) => {
    const d = ev.target;
    if (!d?.dataset?.guida) return;
    try { localStorage.setItem('guida:' + d.dataset.guida, d.open ? '1' : '0'); } catch { /* niente */ }
  }, true);

  // barra in alto: click su un gruppo (apre il menu a tendina) o su una scheda
  document.getElementById('nav-top')?.addEventListener('click', (ev) => {
    const men = ev.target.closest('[data-menu]');
    if (men) {
      const grp = men.parentElement;
      const era = grp.classList.contains('aperto');
      chiudiMenuTop();
      if (!era) {
        grp.classList.add('aperto');
        men.setAttribute('aria-expanded', 'true');
        // se il menu sborda a destra dello schermo, allinealo al bordo destro
        const menu = grp.querySelector('.grp-menu');
        if (menu) {
          menu.classList.remove('a-destra');
          if (menu.getBoundingClientRect().right > window.innerWidth - 8) menu.classList.add('a-destra');
        }
      }
      return;
    }
    const b = ev.target.closest('[data-scheda]');
    if (b) vaiAScheda(b.dataset.scheda);
  });

  // pagina bloccata (upsell): «Sblocca» → checkout; «vedi piani» → scheda Stato.
  document.addEventListener('click', (ev) => {
    const sb = ev.target.closest('[data-sblocca]');
    if (sb) { ev.preventDefault(); sbloccaAddon(sb.dataset.sblocca); return; }
    const vp = ev.target.closest('.blocco-carta [data-scheda]');
    if (vp) { ev.preventDefault(); vaiAScheda(vp.dataset.scheda); }
  });

  // cassetto: click su una scheda
  document.getElementById('nav-drawer')?.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-scheda]');
    if (b) vaiAScheda(b.dataset.scheda);
  });

  // click fuori da un gruppo → chiude i menu a tendina; Esc → chiude tutto
  document.addEventListener('click', (ev) => { if (!ev.target.closest('.grp')) chiudiMenuTop(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { chiudiMenuTop(); chiudiMenuMobile(); } });

  // hamburger: apre/chiude il cassetto (schermi stretti)
  document.getElementById('apri-menu')?.addEventListener('click', () => {
    const aperto = document.body.classList.toggle('menu-aperto');
    document.getElementById('apri-menu').setAttribute('aria-expanded', aperto ? 'true' : 'false');
  });
  document.getElementById('backdrop')?.addEventListener('click', chiudiMenuMobile);
  document.getElementById('chiudi-menu')?.addEventListener('click', chiudiMenuMobile);

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
