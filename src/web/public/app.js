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
    tiktok: (s.tiktok && typeof s.tiktok === 'object') ? s.tiktok : { username: '', attivo: false, annunciaChat: false, messaggio: '' },
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
async function salvaImpostazioni(parziale, msgOk = 'Impostazioni salvate 💜') {
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
    toast('🎁 Hai ricevuto una settimana Pro gratis — esplora tutto SocialBot!');
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
        frasi: ['Benvenuto nel canale! 💜', 'Ricordati di seguire per non perderti le live!'],
        tiktok: { username: 'andryxify', attivo: true, annunciaChat: true, messaggio: '' },
        youtube: { canale: '@andryxify', apiKeySet: true, attivo: true, annunciaChat: false, messaggio: '' },
        instagram: { userId: '17841400000000000', tokenSet: true, attivo: true, annunciaChat: false, messaggio: '' },
        giochiSito: { attivo: true, collegato: true },
        antispam: { maiuscole: true, link: true, flood: true },
        penitenze: { attivo: true, premioVieta: 'Vietami una parola', premioSolo: 'Dì solo questa parola',
          durataMin: 2, penitenzeModo: 'lista', penitenze: ['10 flessioni', 'canta la sigla', 'parla in inglese per 1 minuto'],
          effetto: 'airhorn', fuzzy: 80, overlay: { posizione: 'alto-destra', colore: '#ff2d2d' } },
        alerts: { attivo: true, posizione: 'alto-centro', durata: 6000,
          follow: { attivo: true, testo: '{user} ha seguito il canale! 💜', suono: 'campanello', colore: '#9146ff' },
          sub: { attivo: true, testo: '{user} si è abbonato! ({mesi} mesi) 🌟', suono: 'tada', colore: '#ffb020' },
          cheer: { attivo: true, testo: '{user} ha lanciato {bits} bit! ⚡', suono: 'moneta', colore: '#38d39f', minBits: 100 },
          raid: { attivo: true, testo: '{user} è arrivato in raid con {viewers}! 🚀', suono: 'trombetta', colore: '#ff4d4d', minViewers: 2 } },
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
  if (via === '/api/moderatori') return Promise.resolve({ invito: 'https://bot.andryxify.it/mod?token=demo' });
  if (via === '/api/streamer/apikey') return Promise.resolve({ apikey: 'demo_' + 'x'.repeat(24) });
  if (via === '/api/cambia-canale' || via === '/api/mod/cambia-canale') {
    const ch = opzioni.body?.channel;
    if (_DEMO_CANALI.some((c) => c.canale === ch)) _demoCanale = ch;
    const ctx = _DEMO_CANALI.find((c) => c.canale === _demoCanale);
    return Promise.resolve({ ok: true, ruolo: ctx.role, canale: ctx.canale });
  }
  if (via === '/api/admin/llm/prova') return Promise.resolve({ ok: true, modello: 'mistral-nemo', campione: 'ok' });
  if (via === '/api/streamer/instagram/prova') return Promise.resolve({ ok: true });
  if (via === '/api/streamer/citazioni/analizza') return Promise.resolve({ ok: true, citazioni: [
    { testo: 'Tu, molto molto bravo', autore: 'UnicornoFacinoroso', data: '2024-06-09' },
    { testo: 'ti porterò in un brodificio', autore: 'andryxify', data: '2024-06-17' },
  ] });
  if (via === '/api/streamer/citazioni/importa') return Promise.resolve({ ok: true, aggiunte: 2, saltate: 0 });
  if (via.endsWith('/prova')) { toast('In demo non invio davvero in chat 😊'); return Promise.resolve({ ok: true }); }
  return Promise.resolve({ ok: true, demo: true });
}

function _demoGet(via) {
  const F = {
    '/api/me': statoDemo(),
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
        { reward_id: 'r1', titolo: 'Airhorn 📣', costo: 500, effetto: 'airhorn', suono: '', testo: '{user} ha lanciato l\'airhorn!' },
        { reward_id: 'r2', titolo: 'Applauso 👏', costo: 300, effetto: 'applausi', suono: '', testo: '' },
        { reward_id: 'r3', titolo: 'Bevi l\'acqua', costo: 150, effetto: '', suono: 'acqua', testo: '{user} ti ricorda di bere! 💧' },
      ],
      tutti: [
        { id: 'r1', title: 'Airhorn 📣', cost: 500, richiedeTesto: false },
        { id: 'r2', title: 'Applauso 👏', cost: 300, richiedeTesto: false },
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
      { id: 1, domanda: 'Che PC usi?', risposta: 'Ryzen 7 + RTX 4070, trovi tutto su andryxify.it 🖥️', fonte: 'manuale', ts: '2026-05-02T18:00:00Z' },
      { id: 2, domanda: 'Da dove streammi?', risposta: 'Da Genova, quasi ogni sera verso le 21 💜', fonte: 'auto', ts: '2026-05-01T20:00:00Z' },
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
     <span class="demo-testo"><strong>Demo di SocialBot</strong> — stai esplorando la dashboard con dati d'esempio. Puoi cliccare ovunque; niente viene salvato.</span>
     <span class="demo-azioni">
       <a class="btn mini" href="https://andryxify.it">Attiva su andryxify.it</a>
       <a class="btn mini secondario" href="/">Esci dalla demo</a>
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
  if (stato.isAdmin) { caricaTabellaAdmin(); caricaAnima(); caricaLLM(); }

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

  // Identità della persona (fissa) + il canale che sta gestendo ora. Se può
  // gestire più canali (il proprio + quelli che modera) mostra uno switcher che
  // riporta il RUOLO per canale: cambiando canale il sito capisce da sé chi sei.
  const canali = stato.mieiCanali || [];
  const ident = esc(stato.identitaDisplay || stato.user.identitaDisplay || stato.user.modDisplay || stato.user.display || 'tu');
  const attuale = stato.user.login;
  const etichetta = (c) => (c.role === 'proprietario' ? 'il mio canale @' : 'moderi @') + c.display;

  let centro = '';
  if (canali.length > 1) {
    centro = `<select class="chip-utente" id="switch-canale" title="Cambia canale">
      ${canali.map((c) => `<option value="${esc(c.canale)}" ${c.canale === attuale ? 'selected' : ''}>${esc(etichetta(c))}</option>`).join('')}
    </select>`;
  } else if (stato.ruolo === 'moderatore') {
    centro = `<span class="chip-utente">moderi <strong>@${esc(stato.user.display || attuale)}</strong></span>`;
  }

  areaUtente.innerHTML = `
    <span class="chip-utente">ciao, <strong>${ident}</strong></span>
    ${centro}
    <a class="btn secondario mini" href="/auth/logout">Esci</a>`;

  document.getElementById('switch-canale')?.addEventListener('change', (ev) => conErrore(async () => {
    await api('/api/cambia-canale', { method: 'POST', body: { channel: ev.target.value } });
    stato = await api('/api/me'); render();
    toast('Ora gestisci @' + (stato.user.display || stato.user.login) + (stato.ruolo === 'moderatore' ? ' come moderatore' : ' come proprietario'));
  }));
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
  // Domande frequenti: rispecchiano i dati strutturati FAQPage in index.html
  // (Google mostra le FAQ nei risultati solo se sono anche visibili qui).
  const FAQ = [
    ['Con quale account scrive SocialBot in chat?', 'Con il <strong>tuo</strong>: SocialBot usa il tuo account Twitch, non un bot anonimo. In chat compare il tuo nome e sei sempre tu ad avere il controllo.'],
    ['Che cosa sa fare?', 'Comandi e automazioni su misura, moderazione della chat, clip automatiche, minigiochi con monete, notifiche live su Telegram e avvisi dei nuovi post su TikTok, YouTube e Instagram. E lo piloti anche a voce.'],
    ['SocialBot è in italiano?', 'Sì: sia il bot in chat sia la dashboard sono interamente in italiano.'],
    ['Posso provarlo senza registrarmi?', 'Sì, c’è una <a href="/?demo=1">demo interattiva</a> con dati d’esempio: la apri con un click, senza accesso.'],
    ['Come si attiva sul mio canale?', 'In due modi. Se sei già un membro abilitato della community di <a href="https://andryxify.it">andryxify.it</a>, SocialBot è gratis e completo: accedi con Twitch e attivi la dashboard. Altrimenti scegli un piano — con l’abbonamento entri subito, direttamente da qui.'],
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
      <p class="vetrina-accessi">Hai già un accesso?
        <a href="/sblocca">🔓 Entra con passkey</a>
        <span aria-hidden="true">·</span>
        <a href="/mod">🛠️ Accesso moderatore</a>
      </p>
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

    <section class="vetrina-piani" id="vetrina-piani" aria-label="Piani"></section>

    <section class="carta rivela vetrina-faq" aria-label="Domande frequenti">
      <h2>Domande frequenti</h2>
      ${FAQ.map(([q, a]) => `<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`).join('')}
    </section>

    <section class="carta rivela vetrina-cta">
      <div>
        <h2>Fai parte di andryxify.it</h2>
        <p>SocialBot è uno dei tasselli del mondo andryxify: profili, giochi e community in un unico posto.</p>
      </div>
      <a class="btn grande secondario" href="https://andryxify.it">Vai al sito principale →</a>
    </section>`;

  rivelaCarte();   // scroll-reveal delle carte della vetrina
  caricaPiani();   // riempie la sezione prezzi (tier) dal server
  // esiti del ritorno da Stripe
  const q = new URLSearchParams(location.search);
  if (q.get('abbonato') === '1') toast('Abbonamento attivo, benvenuto! 🎉');
  else if (q.get('abbonamento') === 'annullato') toast('Checkout annullato — nessun addebito.');
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
  if (!base) { box.remove(); return; }

  const prezzoIt = (n) => Number(n || 0).toFixed(2).replace('.', ',');
  // Cosa include la Base (copy curata, non guidata dalla matrice grezza).
  const inclusiBase = [
    'Comandi & moduli illimitati',
    'Antispam & moderazione',
    'Overlay per OBS',
    '1 moderatore incluso',
  ];

  box.innerHTML = `
    <div class="vetrina-piani-testa">
      <h2>Componi il tuo bot</h2>
      <p>${dati.attivo
        ? 'Parti dalla Base e aggiungi solo i super-poteri che ti servono.'
        : 'Presto potrai attivarlo — parti dalla Base e aggiungi solo i super-poteri che ti servono.'}</p>
    </div>
    <div class="piani-componi">
      <div class="piano-base carta rivela">
        <div class="piano-base-testa">
          <span class="piano-icona">${svgPiano('base')}</span>
          <div>
            <h3>${esc(base.nome)}</h3>
            <p class="piano-somm">${esc(base.sommario)}</p>
          </div>
          <div class="piano-prezzo">€${prezzoIt(base.prezzo)}<span>/mese</span></div>
        </div>
        <ul class="piano-funzioni">
          ${inclusiBase.map((t) => `<li><span class="pf-val si">✓</span> ${esc(t)}</li>`).join('')}
        </ul>
      </div>

      <div class="addon-blocco">
        <h4 class="addon-titolo">Aggiungi super-poteri <span>· à la carte</span></h4>
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
          <span class="riepilogo-voce" id="piani-voce">Solo Base</span>
          <span class="riepilogo-tot" id="piani-totale">€${prezzoIt(base.prezzo)}<span>/mese</span></span>
        </div>
        ${dati.attivo
          ? '<button class="btn grande" id="piani-attiva">Attiva SocialBot →</button>'
          : '<button class="btn grande secondario" disabled>In arrivo</button>'}
      </div>
    </div>
    <div class="piani-community">
      🎁 <strong>Sei già un membro abilitato della community di <a href="https://andryxify.it">andryxify.it</a>?</strong>
      SocialBot è <strong>gratis e completo</strong> per te — non ti serve nessun piano.
    </div>`;
  rivelaCarte(box);

  // Selezione add-on + totale live.
  const selezione = new Set();
  const totaleEl = box.querySelector('#piani-totale');
  const voceEl = box.querySelector('#piani-voce');
  const aggiorna = () => {
    let tot = Number(base.prezzo || 0);
    selezione.forEach((id) => { const a = addon.find((x) => x.id === id); if (a) tot += Number(a.prezzo || 0); });
    if (totaleEl) totaleEl.innerHTML = `€${prezzoIt(tot)}<span>/mese</span>`;
    if (voceEl) voceEl.textContent = selezione.size
      ? `Base + ${selezione.size} add-on`
      : 'Solo Base';
  };
  box.querySelectorAll('[data-addon]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.addon;
      const on = !selezione.has(id);
      if (on) selezione.add(id); else selezione.delete(id);
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      aggiorna();
    });
  });

  // CTA unica: checkout con Base + add-on scelti.
  const attivaBtn = box.querySelector('#piani-attiva');
  if (attivaBtn) attivaBtn.addEventListener('click', () => {
    const pacchetti = [...selezione];
    conErrore(async () => {
      try {
        const r = await api('/api/abbonamento/checkout', { method: 'POST', body: { pacchetti } });
        if (r?.url) location.href = r.url; else toast('Piano non disponibile al momento.', 'errore');
      } catch (e) {
        // non loggato: prima l'accesso con Twitch, poi si torna dritti al checkout con la scelta
        if (/non autenticato/i.test(e?.message || '')) { location.href = '/accedi?pacchetti=' + encodeURIComponent(pacchetti.join(',')); return; }
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
    ['musica', 'Musica'],
    ['sondaggi', 'Sondaggi'],
    ['giveaway', 'Giveaway'],
    ['penitenze', 'Penitenze'],
  ] },
  { id: 'overlay', nome: 'Overlay', icona: '🖥️', schede: [
    ['alert', 'Overlay Studio'],
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
  musica:      _ico('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  sondaggi:    _ico('<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'),
  giveaway:    _ico('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'),
  penitenze:   _ico('<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  alert:       _ico('<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/><path d="M6 8h4"/><path d="M6 11h2"/>'),
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
  musica: 'Richieste musicali: gli spettatori mettono canzoni in coda su Spotify.',
  sondaggi: 'Crea sondaggi e predizioni Twitch al volo.',
  giveaway: 'Organizza estrazioni a premi per la community.',
  penitenze: 'Punti canale che ti vietano una parola: se la dici, penitenza!',
  alert: 'Il tuo overlay OBS: alert, chat a schermo, widget e temi, tutto personalizzabile.',
  notifiche: 'Avvisi su Telegram e TikTok quando vai in diretta.',
  admin: 'Gestione streamer e anima condivisa del bot.',
};

// Mini-guida per scheda: "a cosa serve" + i passi di "come si fa". Mostrata in
// cima a ogni pagina (callout richiudibile), così con tante sezioni si capisce
// sempre cosa fare. Vale anche in demo (usa la stessa testata di pagina).
const GUIDE = {
  stato: { serve: 'Accendere il bot e controllare che sia connesso alla tua chat.',
    come: ['Accendi l’interruttore del bot.', 'Controlla il badge “in chat”: verde = sei online.', 'Se manca un permesso, riautorizza con un clic.'] },
  personalita: { serve: 'Dare al bot il tono e il carattere con cui parla in chat.',
    come: ['Scegli tono e “spontaneità” (quanto interviene da solo).', 'Aggiungi regole che rispetterà SEMPRE.', 'Salva: il nuovo stile parte subito.'] },
  conoscenza: { serve: 'Insegnare al bot cosa dire su di te (social, orari, PC, regole…).',
    come: ['Aggiungi una voce: domanda → risposta.', 'In chat richiami la risposta con un !comando o una parola chiave.'] },
  moduli: { serve: 'Creare comandi e automazioni: QUANDO succede X, SE le condizioni, ALLORA fai Y.',
    come: ['“Nuovo comando”.', 'Scegli l’innesco: !comando, una parola, un evento o un timer.', 'Aggiungi una o più azioni (scrivi in chat, effetto, clip, musica…).', 'Premi “Prova” per vederlo in azione.'] },
  regole: { serve: 'Moderazione automatica: filtra spam, link e flood e dà timeout ai recidivi.',
    come: ['Attiva l’antispam.', 'Scegli cosa filtrare (link, maiuscole, ripetizioni…).', 'Salva: il bot modera da solo.'] },
  giochi: { serve: 'Minigiochi, monete e classifiche per tenere viva la chat.',
    come: ['Attiva i giochi.', 'Personalizza il nome della moneta e i premi.', 'Gli spettatori giocano con !slot, !roulette, !pesca, !trivia…'] },
  effetti: { serve: 'Suoni ed effetti in overlay OBS, anche riscattabili con i punti canale.',
    come: ['Carica un effetto (audio/immagine) e dagli un comando.', 'Aggiungi l’URL overlay in OBS come sorgente browser.', 'Se vuoi, collega un effetto a un premio a punti canale.'] },
  clip: { serve: 'Creare clip automatiche nei momenti di “hype” della diretta.',
    come: ['Attiva le clip automatiche.', 'Regola la sensibilità (quanto “hype” serve).'] },
  ascolto: { serve: 'Comandare il bot con la VOCE mentre streami (l’audio resta sul tuo PC).',
    come: ['Concedi l’accesso al microfono dal browser.', 'Di’ le frasi-chiave dei tuoi moduli vocali (es. “clippa”).'] },
  musica: { serve: 'Richieste musicali: gli spettatori mettono canzoni in coda su Spotify.',
    come: ['Connetti Spotify (serve Premium + app aperta).', 'Scegli come si “paga” la richiesta: libera, sub, monete, bit o punti canale.', 'Gli spettatori usano !sr <canzone>; !song mostra cosa suona.'] },
  sondaggi: { serve: 'Lanciare sondaggi e predizioni Twitch direttamente da qui.',
    come: ['Scrivi la domanda e le opzioni (o titolo ed esiti).', 'Lancia: gli spettatori votano/puntano dall’app.', 'Chiudi il sondaggio o scegli l’esito vincente della predizione.'] },
  giveaway: { serve: 'Organizzare estrazioni a premi per la community.',
    come: ['Apri il giveaway indicando il premio.', 'La community entra scrivendo !join in chat.', 'Estrai il vincitore dal pannello (puoi ripetere).'] },
  penitenze: { serve: 'Trasformare un premio a punti canale in una sfida a tempo: il bot conta quante volte sbagli (con «+1» a schermo) e alla fine fa partire una penitenza.',
    come: ['Attiva il riconoscimento vocale (scheda Ascolto vocale) e concedi i Punti canale.', 'Scegli i due premi: «Vieta la parola» (non dirla) e «Usa solo la parola» (dì solo quella).', 'Decidi la penitenza (tua lista o inventata dall\'IA) e dove mostrare il contatore nell\'overlay.'] },
  notifiche: { serve: 'Avvisare i tuoi canali (Telegram, social) quando vai in diretta.',
    come: ['Collega Telegram e/o le piattaforme social.', 'Attiva gli avvisi che vuoi.', 'Personalizza i messaggi.'] },
  alert: { serve: 'Mostrare nell\'overlay OBS un cartello animato (con suono) per follow, sub, bit e raid, e far scorrere la chat a schermo.',
    come: ['Aggiungi l\'URL overlay in OBS (scheda Effetti & suoni).', 'Attiva gli alert che vuoi e personalizza testo, suono e colore.', 'Premi «Prova» per vederli. Attiva la chat a schermo se la vuoi in sovraimpressione.'] },
};

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
};

// HTML della mini-guida di una scheda (vuoto se non prevista).
function guidaSchedaHtml(id) {
  const g = GUIDE[id];
  if (!g) return '';
  return `<details class="guida-scheda" open>
    <summary><span class="guida-ico">${_icoGuida}</span> Come funziona</summary>
    <div class="guida-corpo">
      ${g.serve ? `<p class="guida-serve"><strong>A cosa serve.</strong> ${esc(g.serve)}</p>` : ''}
      ${Array.isArray(g.come) && g.come.length ? `<p class="guida-titolo">Come si fa</p><ol class="guida-come">${g.come.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>` : ''}
    </div>
  </details>`;
}

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
    `${desc ? `<p>${esc(desc)}</p>` : ''}` +
    guidaSchedaHtml(schedaAttiva);
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
    ${pannelloMusica()}
    ${pannelloSondaggi()}
    ${pannelloGiveaway()}
    ${pannelloPenitenze()}
    ${pannelloAlert()}
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
      <h2>${_hIco(ICO.utenti)}Stai gestendo il canale di @${esc(stato.gestisce?.streamer || login)}</h2>
      <p>Sei entrato come <strong class="primo-piano">moderatore</strong>: puoi occuparti di comandi, moduli,
      effetti, giochi, notifiche, regole e memoria. Le cose da proprietario — permessi Twitch e l'elenco dei
      moderatori — restano a chi possiede il canale.</p>
    </div>`;

  // La card "concedi permessi" la vede solo il proprietario (un mod non li tocca).
  const cardPermessi = (!proprietario || stato.permessiOk) ? '' : `
    <div class="carta evidenziata">
      <h2>${_hIco(ICO.chiave)}Attiva il bot: concedi i permessi</h2>
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
      <h2>${_hIco(ICO.libro)}Pre-addestramento</h2>
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
    <div class="carta">
      <h2>${_hIco(ICO.germoglio)}La piccola rete che impara</h2>
      <p>Il motore veloce del bot che <strong class="primo-piano">cresce da solo</strong>: risponde all'istante a ciò
      che ha già imparato e, quando incontra qualcosa di nuovo, se lo segna e lo impara dal maestro.
      Più lo alleni (anche via DM su Telegram), più sa fare da sé.</p>
      <div id="rete-panoramica"><p class="vuoto">Caricamento…</p></div>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.telefono)}Installa l'app</h2>
      <p>Installa la dashboard <strong class="primo-piano">come app</strong> sul telefono o sul PC: la apri a
      schermo intero come un'app vera, senza doverla cercare nel browser.</p>
      <p class="spazio-sopra">
        <button class="btn secondario" id="btn-installa">Installa l'app</button>
      </p>
      <p class="suggerimento">Su iPhone/iPad: apri in Safari → Condividi → “Aggiungi a Home”. Su Android/PC (Chrome):
      usa il bottone qui sopra o l’icona “installa” nella barra indirizzi.</p>
    </div>
    ${proprietario ? (() => {
      const nomi = { community: 'Community', free: 'Prova', base: 'Base', pro: 'Pro' };
      const tier = stato.tier || 'community';
      const pagato = tier === 'base' || tier === 'pro';
      return `
    <div class="carta">
      <h2>${_hIco(ICO.carta)}Abbonamento</h2>
      <p>Piano attuale: <strong class="primo-piano">${esc(nomi[tier] || '—')}</strong>${tier === 'community' ? ' — accesso completo, riservato ai membri abilitati di andryxify.it.' : ''}</p>
      ${pagato
        ? '<p class="spazio-sopra"><button class="btn secondario" id="btn-portale-abbonamento">Gestisci abbonamento</button></p>'
        : (tier === 'community' ? '' : '<p class="suggerimento spazio-sopra">Gli abbonamenti self-service stanno arrivando.</p>')}
    </div>`;
    })() : ''}
    <div class="carta">
      <h2>${_hIco(ICO.chiave)}Passkey</h2>
      <p>Crea una <strong class="primo-piano">passkey</strong> (impronta, volto o PIN): così rientri al volo, in
      modo sicuro, <strong class="primo-piano">senza ripassare ogni volta dal sito</strong>.
      ${proprietario ? '' : 'Vale per il tuo account: ti riporta ai canali che gestisci.'}</p>
      <p class="spazio-sopra">
        <button class="btn" id="btn-crea-passkey">Crea una passkey</button>
      </p>
      <h3>Le tue passkey</h3>
      <ul class="lista-voci" id="lista-passkey"><li class="vuoto">Caricamento…</li></ul>
    </div>
    ${proprietario ? `
    <div class="carta">
      <h2>${_hIco(ICO.utenti)}Moderatori</h2>
      <p>Fai aiutare qualcuno di cui ti fidi a gestire il bot. Gli mandi un <strong class="primo-piano">link
      d'invito</strong>: accede con Twitch (così sappiamo che è davvero lui) e può occuparsi di tutto,
      <strong class="primo-piano">tranne</strong> le cose da proprietario — permessi Twitch e questo elenco.</p>
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
      <h2>${_hIco(ICO.persona)}Personalità</h2>
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

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-internet" ${s.internet ? 'checked' : ''}>
        <label for="chk-internet">Accesso a internet — cerca da sé quando ha un dubbio</label>
      </div>
      <p class="suggerimento">Se non sa qualcosa (in privato, o se la nomini con una domanda in chat), può fare una
      ricerca veloce online (fonti gratuite: DuckDuckGo, Wikipedia) e risponderti da sé, invece di dire «non lo so».
      Tratta ciò che trova con giudizio e non segue istruzioni nascoste nelle pagine.</p>

      <label class="campo" for="txt-frasi">Le tue frasi / battute (una per riga)</label>
      <textarea id="txt-frasi" placeholder="es. GG raga, si vola!&#10;chi non segue il canale paga da bere">${esc(s.frasi.join('\n'))}</textarea>
      <p class="suggerimento">Il bot le userà ogni tanto per suonare davvero come te. Max 50 frasi da 200 caratteri.</p>

      <p class="spazio-sopra"><button class="btn" id="btn-salva-personalita">Salva</button></p>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.righello)}Linee guida</h2>
      <p>I <strong class="primo-piano">limiti e le regole</strong> che le dai: lei li <strong>salva</strong> e li rispetta
      <strong>sempre</strong>, in ogni chat (privata, pubblica, quando scrive per prima). Es. «non essere mai volgare»,
      «non parlare di politica», «dai del tu a tutti».</p>
      <p class="suggerimento">Ogni regola può valere in un <strong>contesto</strong> preciso: con chi (tutti / solo con te / tutti tranne te)
      e dove (ovunque / Twitch / Telegram / in privato con te). Così puoi dire «con tutti tranne me non parlare di politica»
      oppure «solo con me, in privato su Telegram, dammi del tu».</p>
      <p class="suggerimento">Puoi dettargliele anche <strong>da Telegram in privato</strong> (solo tu), a voce tua: scrivi ad es.
      «d'ora in poi non essere troppo formale» o «con chi non sono io non parlare dei miei progetti» — capisce da sola il
      contesto. Comandi: <code>/regola &lt;testo&gt;</code>, <code>/regole</code>, <code>/scorda n</code>.</p>
      <label class="campo" for="inp-guida">Nuova linea guida</label>
      <input type="text" id="inp-guida" placeholder="es. non parlare di politica" maxlength="300">
      <div class="riga-flessibile spazio-sopra">
        <select id="sel-guida-conchi" title="Con chi">
          <option value="tutti">con tutti</option>
          <option value="solo-me">solo con me</option>
          <option value="tranne-me">con tutti tranne me</option>
        </select>
        <select id="sel-guida-dove" title="Dove">
          <option value="ovunque">ovunque</option>
          <option value="twitch">in chat Twitch</option>
          <option value="tg">su Telegram</option>
          <option value="tg-privato">in privato su Telegram</option>
        </select>
        <button class="btn" id="btn-guida-add">Aggiungi</button>
      </div>
      <ul class="lista-voci" id="lista-guide"><li class="vuoto">Caricamento…</li></ul>
    </div>`);
}

// carica e disegna l'elenco delle linee guida (regole di "lia")
async function caricaGuide() {
  const box = document.getElementById('lista-guide');
  if (!box) return;
  let d;
  try { d = await api('/api/streamer/guide'); } catch { box.innerHTML = '<li class="vuoto">Non disponibile ora.</li>'; return; }
  const l = d.guide || [];
  const DOVE = { ovunque: 'ovunque', twitch: 'in chat Twitch', tg: 'su Telegram', 'tg-privato': 'in privato su Telegram' };
  const CONCHI = { tutti: 'con tutti', 'solo-me': 'solo con te', 'tranne-me': 'con tutti tranne te' };
  const amb = (g) => `${CONCHI[g.con_chi] || 'con tutti'}, ${DOVE[g.dove] || 'ovunque'}`;
  box.innerHTML = l.length
    ? l.map((g) => `<li><span>${esc(g.testo)} <span class="suggerimento">— ${esc(amb(g))}</span></span> <a href="#" class="rimuovi" data-id="${g.id}" title="Rimuovi">✕</a></li>`).join('')
    : '<li class="vuoto">Nessuna regola ancora. Aggiungine una qui sopra o da Telegram.</li>';
  box.querySelectorAll('.rimuovi').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); conErrore(async () => {
    await api('/api/streamer/guide/' + a.dataset.id, { method: 'DELETE' });
    caricaGuide();
  }); }));
}

// --- scheda Conoscenza --------------------------------------------------

function pannelloConoscenza() {
  return pannello('conoscenza', `
    <div class="carta">
      <h2>${_hIco(ICO.scrivi)}Insegnagli qualcosa</h2>
      <p>Domanda (o parole chiave) e risposta: quando in chat spunta l'argomento, il bot saprà cosa dire.</p>
      <label class="campo" for="inp-domanda">Domanda / parole chiave</label>
      <input type="text" id="inp-domanda" placeholder="es. che pc usi? / setup / configurazione">
      <label class="campo" for="inp-risposta">Risposta</label>
      <input type="text" id="inp-risposta" placeholder="es. Gioco su un Ryzen 7 con una 4070, trovi tutto su andryxify.it!">
      <p class="spazio-sopra"><button class="btn" id="btn-aggiungi-conoscenza">Aggiungi</button></p>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.cervello)}Cosa sa il bot</h2>
      <p>🌐 dal sito &nbsp;·&nbsp; ✍️ tua &nbsp;·&nbsp; 💬 imparata dalla chat</p>
      <ul class="lista-voci" id="lista-conoscenza"><li class="vuoto">Caricamento…</li></ul>
    </div>`);
}

// --- scheda Clip --------------------------------------------------------

function pannelloClip() {
  const s = impostazioni();
  return pannello('clip', `
    <div class="carta">
      <h2>${_hIco(ICO.clip)}Clip automatiche</h2>
      <p>Il bot riconosce i <strong>momenti da clip</strong> da solo: non conta solo i messaggi,
      ma capisce quando la chat <strong>esplode di reazioni</strong>, ride tutta insieme o arrivano
      <strong>sub, bit o raid</strong>. E si adatta al ritmo del tuo canale (piccolo o grande).</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="chk-clip" ${s.clipAuto ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-clip">${s.clipAuto ? 'Clip automatiche accese' : 'Clip automatiche spente'}</span>
      </div>
      <label class="campo spazio-sopra" for="rng-clip-sens">Sensibilità: <span id="val-clip-sens">${s.clipAutoSensibilita}</span></label>
      <input type="range" id="rng-clip-sens" min="1" max="10" value="${s.clipAutoSensibilita}">
      <p class="suggerimento">Più alta = più clip (basta poco). Più bassa = solo i momenti davvero forti.</p>
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
  const cc = s.cambioCategoria || { attivo: false, trigger: 'categoria', annuncia: true };
  const ct = s.cambioTitolo || { attivo: false, trigger: 'titolo', annuncia: true };
  const iv = s.imparaVoce || { attivo: false };
  const proprietario = stato?.ruolo !== 'moderatore';        // "impara mentre parlo" solo per me
  const mancaPermesso = !DEMO && stato.canaleOk === false;   // serve una ri-autorizzazione

  return pannello('ascolto', `
    <div class="carta">
      <h2>${_hIco(ICO.cuffie)}Momenti salienti (dal server)</h2>
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
      <h2>${_hIco(ICO.voce)}Comando vocale</h2>
      <p>I comandi vocali funzionano <strong class="primo-piano">nel browser</strong>, senza installare niente:
      apri la pagina di ascolto, premi Avvia, e quando dici una parola chiave il bot fa quello che hai impostato
      nei Moduli.</p>
      <p class="spazio-sopra">
        <a class="btn grande" href="/voce.html" target="_blank" rel="noopener">🎙️ Apri l'ascolto vocale</a>
      </p>
      <p class="suggerimento spazio-sopra">Tienila aperta mentre streammi. Funziona su Chrome o Edge (Mac e Windows).</p>
      <p class="suggerimento">I comandi vocali si creano e modificano in
      <strong class="primo-piano">Chat &amp; comandi → Comandi</strong> (innesco "Comando vocale").</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.giochi)}Cambia categoria a voce</h2>
      <p>Dici <strong class="primo-piano">«<span id="cat-esempio">${esc(cc.trigger || 'categoria')}</span> <em>nome del gioco</em>»</strong>
      mentre streammi e il bot cambia la categoria del canale su Twitch. Se ti sente male,
      prova comunque a indovinare il gioco più somigliante tra le categorie di Twitch.</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="chk-categoria" ${cc.attivo ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-categoria">${cc.attivo ? 'Attivo' : 'Spento'}</span>
      </div>
      <label class="campo" for="inp-cat-trigger">Parola chiave (quella che dici prima del gioco)</label>
      <input type="text" id="inp-cat-trigger" class="campo-largo" maxlength="30" value="${esc(cc.trigger || 'categoria')}" placeholder="categoria">
      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-cat-annuncia" ${cc.annuncia !== false ? 'checked' : ''}>
        <label for="chk-cat-annuncia">Annuncia il cambio in chat</label>
      </div>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-categoria">Salva</button></p>
      ${mancaPermesso ? `<p class="nota-lettura">🔒 Per cambiare categoria il bot ha bisogno del permesso <strong>Gestione canale</strong> su Twitch.
      <a href="/auth/permessi">Concedi il permesso</a> (ti riporta qui dopo l'autorizzazione).</p>` : ''}
      <p class="suggerimento spazio-sopra">Esempi: «categoria Fortnite», «categoria League of Legends».
      La parola chiave è a tua scelta (es. «gioco», «passa a»). Funziona dalla stessa pagina di ascolto vocale qui sopra.</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.scrivi)}Cambia titolo a voce</h2>
      <p>Dici <strong class="primo-piano">«<span id="tit-esempio">${esc(ct.trigger || 'titolo')}</span> <em>il tuo titolo</em>»</strong>
      e il bot aggiorna il titolo dello stream su Twitch (testo libero, come lo dici).</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="chk-titolo" ${ct.attivo ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-titolo">${ct.attivo ? 'Attivo' : 'Spento'}</span>
      </div>
      <label class="campo" for="inp-tit-trigger">Parola chiave (quella che dici prima del titolo)</label>
      <input type="text" id="inp-tit-trigger" class="campo-largo" maxlength="30" value="${esc(ct.trigger || 'titolo')}" placeholder="titolo">
      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-tit-annuncia" ${ct.annuncia !== false ? 'checked' : ''}>
        <label for="chk-tit-annuncia">Annuncia il cambio in chat</label>
      </div>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-titolo">Salva</button></p>
      ${mancaPermesso ? `<p class="nota-lettura">🔒 Anche il titolo usa il permesso <strong>Gestione canale</strong>.
      <a href="/auth/permessi">Concedilo qui</a> (vale per categoria e titolo).</p>` : ''}
      <p class="suggerimento spazio-sopra">Esempio: «titolo Si torna su Elden Ring, si punta al boss!».
      Puoi cambiare la parola chiave (es. «nuovo titolo»). Stessa pagina di ascolto vocale qui sopra.</p>
    </div>
    ${proprietario ? `
    <div class="carta">
      <h2>${_hIco(ICO.cuffie)}Impara mentre parlo</h2>
      <p>Con la pagina di ascolto aperta, il bot <strong class="primo-piano">ti sente parlare in diretta</strong> e cresce:
      impara i tuoi modi di dire e il tuo tono, così ti somiglia sempre di più. <strong>Solo la tua voce</strong> — mai da altri account.</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="chk-impara" ${iv.attivo ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-impara">${iv.attivo ? 'Attivo' : 'Spento'}</span>
      </div>
      <p class="suggerimento spazio-sopra">🔒 L'audio <strong>non lascia il tuo PC</strong>: la trascrizione avviene nel browser,
      al bot arriva solo il testo. Funziona dalla stessa pagina di ascolto vocale qui sopra.</p>
    </div>` : ''}`);
}

// --- scheda Musica (richieste via Spotify) ------------------------------

function pannelloMusica() {
  const m = impostazioni().musica || {};
  const modo = ['libero', 'sub', 'monete', 'bit', 'punti'].includes(m.modo) ? m.modo : 'libero';
  const opt = (v, t) => `<option value="${v}" ${modo === v ? 'selected' : ''}>${t}</option>`;
  return pannello('musica', `
    <div class="carta">
      <h2>${_hIco(ICO.musica)}Richieste musicali</h2>
      <p>Collega Spotify: gli spettatori mettono canzoni in coda con
      <code>!sr &lt;canzone&gt;</code> e vedono cosa suona con <code>!song</code>.
      Serve <strong>Spotify Premium</strong> e un dispositivo attivo (l'app aperta e in riproduzione).</p>
      <div id="spotify-box" class="spazio-sopra"><p>Carico…</p></div>
    </div>
    <div class="carta">
      <h3>${_hIco(ICO.sliders)}Come si richiede una canzone</h3>
      <p>Decidi tu se le richieste sono libere o "a pagamento": non devono per forza essere gratis.</p>
      <label class="campo" for="musica-modo">Modalità</label>
      <select id="musica-modo">
        ${opt('libero', 'Libere — tutti, gratis')}
        ${opt('sub', 'Solo abbonati (sub)')}
        ${opt('monete', 'A monete del bot')}
        ${opt('bit', 'A bit (Cheer nel messaggio)')}
        ${opt('punti', 'A punti canale (premio)')}
      </select>
      <div id="musica-costo-box" class="spazio-sopra" hidden>
        <label class="campo" for="musica-costo">Costo (<span id="musica-costo-unita">monete</span>)</label>
        <input type="number" id="musica-costo" min="0" max="1000000" value="${Number(m.costo) || 0}">
      </div>
      <div id="musica-premio-box" class="spazio-sopra" hidden>
        <input type="hidden" id="musica-premio" value="${esc(m.premio || '')}">
        <p>Gli spettatori richiedono una canzone <strong>riscattando un premio a punti canale</strong> con la "richiesta di testo": scrivono il brano nel riscatto e il bot lo mette in coda.</p>
        <div id="musica-premi-box" class="spazio-sopra"><p>Carico i tuoi premi…</p></div>
      </div>
      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="musica-disambigua" ${m.disambigua !== false ? 'checked' : ''}>
        <label for="musica-disambigua">Se ci sono più canzoni con lo stesso titolo, chiedi in chat quale ("intendi 1, 2 o 3?")</label>
      </div>
      <button class="btn spazio-sopra" id="musica-salva">Salva</button>
    </div>`);
}

// Modulo "credenziali": ogni streamer crea la SUA app Spotify (gratis) e incolla
// qui Client ID/Secret. Così ogni app serve un solo utente e resta in
// Development mode → nessuna approvazione da chiedere a Spotify.
function formCredenzialiSpotify(redirect) {
  return `
    <details class="spotify-guida">
      <summary>Come ottenere le credenziali Spotify (2 min)</summary>
      <ol>
        <li>Vai su <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a> e accedi.</li>
        <li>Clicca <strong>Create app</strong>: dai un nome qualsiasi.</li>
        <li>In <strong>Redirect URIs</strong> incolla esattamente:<br><code class="spotify-redirect">${esc(redirect || '')}</code></li>
        <li>Salva, poi apri le <strong>Settings</strong> dell'app: copia <strong>Client ID</strong> e <strong>Client Secret</strong> qui sotto.</li>
      </ol>
    </details>
    <div class="griglia-campi spazio-sopra">
      <div>
        <label class="campo">Client ID</label>
        <input type="text" id="spotify-cid" placeholder="es. 4a1b…" autocomplete="off">
      </div>
      <div>
        <label class="campo">Client Secret</label>
        <input type="password" id="spotify-csec" placeholder="incolla il secret" autocomplete="off">
      </div>
    </div>
    <button class="btn spazio-sopra" id="spotify-salva-cred">Salva credenziali</button>`;
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
  if (!silenzioso) toast('Impostazioni musica salvate 🎵');
}

// Modalità "punti canale": lascia scegliere UN premio tra quelli con la
// "richiesta di testo" attiva (gli altri non sono usabili → esclusi), oppure
// crearne uno pronto all'uso. Niente più campo-nome da riempire a mano.
async function caricaPremiMusica() {
  const box = document.getElementById('musica-premi-box');
  if (!box) return;
  box.innerHTML = '<p>Carico i tuoi premi a punti canale…</p>';
  let d;
  try { d = await api('/api/musica/premi'); } catch { box.innerHTML = '<p>Impossibile leggere i premi.</p>'; return; }
  if (!d.permessoOk) {
    box.innerHTML = '<div class="riquadro-info">⚠️ Per usare i premi a punti canale serve il permesso: concedilo da <strong>Chat &amp; comandi → Effetti &amp; suoni</strong> (sezione Premi), poi torna qui.</div>';
    return;
  }
  const eleggibili = (d.tutti || []).filter((r) => r.richiedeTesto);
  const esclusi = (d.tutti || []).length - eleggibili.length;
  const inp = document.getElementById('musica-premio');
  const attuale = (inp?.value || d.premio || '').trim();

  const formCrea = `
    <details class="spazio-sopra"${eleggibili.length ? '' : ' open'}>
      <summary>${eleggibili.length ? 'Oppure crea un premio pronto all\'uso' : 'Crea un premio pronto all\'uso'}</summary>
      <div class="griglia-campi spazio-sopra">
        <div><label class="campo">Nome</label><input type="text" id="musica-nuovo-nome" value="Richiesta musicale"></div>
        <div><label class="campo">Costo (punti canale)</label><input type="number" id="musica-nuovo-costo" min="1" value="500"></div>
      </div>
      <button class="btn secondario spazio-sopra" id="musica-crea-premio">Crea il premio su Twitch</button>
      <p class="suggerimento">Lo creo io con la "richiesta di testo" già attiva e lo seleziono qui.</p>
    </details>`;

  if (!eleggibili.length) {
    box.innerHTML = `<div class="riquadro-info">Non hai premi a punti canale con la <strong>richiesta di testo</strong> attiva${esclusi ? ` (${esclusi} non ${esclusi === 1 ? 'adatto' : 'adatti'})` : ''}. Creane uno pronto all'uso 👇</div>${formCrea}`;
  } else {
    box.innerHTML = `
      <label class="campo" for="musica-premio-sel">Premio usato per le richieste</label>
      <select id="musica-premio-sel">
        ${eleggibili.map((r) => `<option value="${esc(r.title)}"${r.title === attuale ? ' selected' : ''}>${esc(r.title)} — ${r.cost} punti</option>`).join('')}
      </select>
      ${esclusi ? `<p class="suggerimento">${esclusi} ${esclusi === 1 ? 'altro premio non ha' : 'altri premi non hanno'} la richiesta di testo, quindi ${esclusi === 1 ? 'non compare' : 'non compaiono'} qui.</p>` : ''}
      ${formCrea}`;
    const selp = document.getElementById('musica-premio-sel');
    if (!eleggibili.some((r) => r.title === attuale)) selp.selectedIndex = 0;
    if (inp) inp.value = selp.value;
    selp.addEventListener('change', () => { if (inp) inp.value = selp.value; conErrore(async () => { await salvaMusica(true); toast('Premio impostato ✓'); }); });
  }

  const bc = document.getElementById('musica-crea-premio');
  if (bc) bc.addEventListener('click', () => conErrore(async () => {
    const titolo = (document.getElementById('musica-nuovo-nome')?.value || 'Richiesta musicale').trim();
    const costo = Number(document.getElementById('musica-nuovo-costo')?.value) || 500;
    const r = await api('/api/musica/premio', { method: 'POST', body: { titolo, costo } });
    if (r?.reward) { if (inp) inp.value = r.reward.title; toast('Premio creato su Twitch! 🎁'); caricaPremiMusica(); }
  }));
}

async function caricaSpotify() {
  wiraMusicaConfig();
  const box = document.getElementById('spotify-box');
  if (!box) return;
  const q = new URLSearchParams(location.search);
  if (q.get('spotify') === 'ok') toast('Spotify collegato! 🎵');
  else if (q.get('spotify') === 'errore') toast('Collegamento Spotify non riuscito.', 'errore');
  const proprietario = stato?.ruolo !== 'moderatore';
  if (!proprietario) { box.innerHTML = '<p>Solo il proprietario del canale può collegare Spotify.</p>'; return; }
  let d;
  try { d = await api('/api/spotify/stato'); } catch { box.innerHTML = '<p>Impossibile caricare lo stato.</p>'; return; }

  // 1) già collegato → badge + scollega + possibilità di cambiare app
  if (d.collegato) {
    box.innerHTML = `<div class="riga-interruttore">
        <span class="badge verde">● Spotify collegato</span>
        <button class="btn secondario" id="spotify-scollega">Scollega</button>
      </div>
      <p class="suggerimento spazio-sopra">${d.proprio ? 'Stai usando la tua app Spotify.' : 'Stai usando l\'app condivisa dell\'operatore.'}</p>`;
    document.getElementById('spotify-scollega').addEventListener('click', () => conErrore(async () => {
      await api('/api/spotify/disconnect', { method: 'POST', body: {} });
      toast('Spotify scollegato.'); caricaSpotify();
    }));
    return;
  }

  // 2) credenziali presenti (proprie o globali) ma non ancora collegato → Connetti
  //    (+ possibilità di reimpostare le proprie credenziali)
  if (d.attivo) {
    box.innerHTML = `
      <button class="btn" id="spotify-collega">Connetti Spotify</button>
      <p class="suggerimento spazio-sopra">${d.proprio
        ? 'Userai la tua app Spotify.'
        : 'Basta un clic: userai l\'app di andryxify.it. Solo se preferisci puoi usare una tua app Spotify (opzionale).'}</p>
      ${d.proprio ? '' : '<details class="spazio-sopra"><summary>Usa una mia app Spotify (avanzato)</summary>' + formCredenzialiSpotify(d.redirect) + '</details>'}`;
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

function collegaSalvaCred() {
  const b = document.getElementById('spotify-salva-cred');
  if (!b) return;
  b.addEventListener('click', () => conErrore(async () => {
    const clientId = (document.getElementById('spotify-cid')?.value || '').trim();
    const clientSecret = (document.getElementById('spotify-csec')?.value || '').trim();
    if (!clientId || !clientSecret) { toast('Inserisci Client ID e Client Secret.', 'errore'); return; }
    await api('/api/spotify/config', { method: 'POST', body: { clientId, clientSecret } });
    toast('Credenziali salvate! Ora connetti Spotify.');
    caricaSpotify();
  }));
}

// --- scheda Sondaggi & Predizioni ---------------------------------------

function pannelloSondaggi() {
  const campo = (cls, ph) => `<input type="text" class="${cls}" placeholder="${ph}">`;
  return pannello('sondaggi', `
    <div class="carta">
      <h2>${_hIco(ICO.sondaggi)}Sondaggi</h2>
      <p>Lancia un sondaggio Twitch: gli spettatori votano dall'app, il risultato appare sul canale.</p>
      <div id="sondaggio-attivo"></div>
      <label class="campo">Domanda</label>
      <input type="text" id="poll-titolo" placeholder="es. Che gioco stasera?">
      <label class="campo spazio-sopra">Opzioni (min 2, max 5)</label>
      <div class="griglia-campi">
        ${campo('poll-opt', 'Opzione 1')}${campo('poll-opt', 'Opzione 2')}${campo('poll-opt', 'Opzione 3 (facolt.)')}${campo('poll-opt', 'Opzione 4 (facolt.)')}
      </div>
      <label class="campo spazio-sopra">Durata (secondi)</label>
      <input type="number" id="poll-durata" min="15" max="1800" value="120">
      <button class="btn spazio-sopra" id="poll-crea">Lancia sondaggio</button>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.predizioni)}Predizioni</h2>
      <p>Gli spettatori scommettono i punti canale sull'esito. Decidi tu chi vince a fine gioco.</p>
      <div id="predizione-attiva"></div>
      <label class="campo">Titolo</label>
      <input type="text" id="pred-titolo" placeholder="es. Vinco questa partita?">
      <label class="campo spazio-sopra">Esiti (min 2, max 10)</label>
      <div class="griglia-campi">
        ${campo('pred-esito', 'Esito 1 (es. Sì)')}${campo('pred-esito', 'Esito 2 (es. No)')}${campo('pred-esito', 'Esito 3 (facolt.)')}${campo('pred-esito', 'Esito 4 (facolt.)')}
      </div>
      <label class="campo spazio-sopra">Finestra puntate (secondi)</label>
      <input type="number" id="pred-finestra" min="30" max="1800" value="120">
      <button class="btn spazio-sopra" id="pred-crea">Apri predizione</button>
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
      if (!titolo || opzioni.length < 2) { toast('Serve una domanda e almeno 2 opzioni.', 'errore'); return; }
      const r = await api('/api/sondaggi/crea', { method: 'POST', body: { titolo, opzioni, durata } });
      if (r?.poll) { toast('Sondaggio lanciato 📊'); document.getElementById('poll-titolo').value = ''; document.querySelectorAll('.poll-opt').forEach((i) => (i.value = '')); caricaSondaggi(); }
    }));
  }
  const br = document.getElementById('pred-crea');
  if (br && !br.dataset.wired) {
    br.dataset.wired = '1';
    br.addEventListener('click', () => conErrore(async () => {
      const titolo = (document.getElementById('pred-titolo').value || '').trim();
      const esiti = [...document.querySelectorAll('.pred-esito')].map((i) => i.value.trim()).filter(Boolean);
      const finestra = Number(document.getElementById('pred-finestra').value) || 120;
      if (!titolo || esiti.length < 2) { toast('Serve un titolo e almeno 2 esiti.', 'errore'); return; }
      const r = await api('/api/predizioni/crea', { method: 'POST', body: { titolo, esiti, finestra } });
      if (r?.pred) { toast('Predizione aperta 🔮'); document.getElementById('pred-titolo').value = ''; document.querySelectorAll('.pred-esito').forEach((i) => (i.value = '')); caricaSondaggi(); }
    }));
  }
  // stato attivo (poll + pred)
  const wrapP = document.getElementById('sondaggio-attivo');
  const wrapR = document.getElementById('predizione-attiva');
  let d;
  try { d = await api('/api/sondaggi/stato'); } catch { return; }
  if (wrapP) {
    if (d.poll) {
      wrapP.innerHTML = `<div class="riquadro-info"><p>📊 Sondaggio in corso: <strong>${esc(d.poll.titolo)}</strong></p>
        <button class="btn secondario spazio-sopra" id="poll-chiudi">Chiudi ora</button></div>`;
      document.getElementById('poll-chiudi').addEventListener('click', () => conErrore(async () => { await api('/api/sondaggi/chiudi', { method: 'POST', body: {} }); toast('Sondaggio chiuso.'); caricaSondaggi(); }));
    } else wrapP.innerHTML = '';
  }
  if (wrapR) {
    if (d.pred) {
      wrapR.innerHTML = `<div class="riquadro-info"><p>🔮 Predizione in corso: <strong>${esc(d.pred.titolo)}</strong></p>
        <p class="spazio-sopra">Fai vincere:</p>
        <div class="chip-vars">${(d.pred.esiti || []).map((o) => `<button type="button" class="btn secondario mini" data-vince="${esc(o.id)}">${esc(o.titolo)}</button>`).join('')}</div>
        <button class="btn pericolo spazio-sopra" id="pred-annulla">Annulla e rimborsa</button></div>`;
      wrapR.querySelectorAll('[data-vince]').forEach((b) => b.addEventListener('click', () => conErrore(async () => { await api('/api/predizioni/risolvi', { method: 'POST', body: { esitoId: b.dataset.vince } }); toast('Predizione risolta 🎉'); caricaSondaggi(); })));
      document.getElementById('pred-annulla').addEventListener('click', () => conErrore(async () => { await api('/api/predizioni/annulla', { method: 'POST', body: {} }); toast('Predizione annullata.'); caricaSondaggi(); }));
    } else wrapR.innerHTML = '';
  }
}

// --- scheda Giveaway ----------------------------------------------------

function pannelloGiveaway() {
  return pannello('giveaway', `
    <div class="carta">
      <h2>${_hIco(ICO.giveaway)}Giveaway</h2>
      <p>Apri un'estrazione a premi: la community entra con <code>!join</code> in chat e tu estrai il vincitore da qui.</p>
      <div id="giveaway-stato" class="spazio-sopra"><p>Carico…</p></div>
      <div id="giveaway-apri">
        <label class="campo">Premio in palio</label>
        <input type="text" id="gw-premio" placeholder="es. una gift card, un gioco Steam…">
        <div class="riga-check spazio-sopra">
          <input type="checkbox" id="gw-sub">
          <label>Riservato agli abbonati (sub)</label>
        </div>
        <button class="btn spazio-sopra" id="gw-apri">Apri il giveaway</button>
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
      if (r?.ok) { toast('Giveaway aperto! 🎁'); document.getElementById('gw-premio').value = ''; caricaGiveaway(); }
    }));
  }
  let d;
  try { d = await api('/api/giveaway/stato'); } catch { stBox.innerHTML = '<p>Impossibile leggere lo stato.</p>'; return; }
  if (d.aperto) {
    if (apriBox) apriBox.hidden = true;
    stBox.innerHTML = `<div class="riquadro-info">
      <p>🎁 Giveaway in corso: <strong>${esc(d.premio)}</strong>${d.soloSub ? ' <span class="badge">solo sub</span>' : ''}</p>
      <p class="spazio-sopra"><strong>${d.partecipanti}</strong> ${d.partecipanti === 1 ? 'partecipante' : 'partecipanti'} — entrano con <code>!join</code></p>
      <div class="spazio-sopra">
        <button class="btn" id="gw-estrai">Estrai un vincitore</button>
        <button class="btn pericolo" id="gw-annulla">Annulla</button>
      </div>
      <div id="gw-vincitore" class="spazio-sopra"></div>
    </div>`;
    document.getElementById('gw-estrai').addEventListener('click', () => conErrore(async () => {
      const r = await api('/api/giveaway/estrai', { method: 'POST', body: {} });
      const v = document.getElementById('gw-vincitore');
      if (r?.vincitore) { if (v) v.innerHTML = `<p class="ok-riga">🎉 Ha vinto: <strong>${esc(r.vincitore)}</strong>!</p>`; }
      else if (v) v.innerHTML = '<p class="warn-riga">Nessun partecipante ancora.</p>';
      caricaGiveaway();
    }));
    document.getElementById('gw-annulla').addEventListener('click', () => conErrore(async () => { await api('/api/giveaway/annulla', { method: 'POST', body: {} }); toast('Giveaway annullato.'); caricaGiveaway(); }));
  } else {
    if (apriBox) apriBox.hidden = false;
    stBox.innerHTML = '<p>Nessun giveaway in corso.</p>';
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
      <h2>${_hIco(ICO.penitenza)}Penitenze a punti canale</h2>
      <p>Uno spettatore riscatta un premio e sceglie una <strong>parola</strong>. Per qualche minuto il bot <strong>ti ascolta</strong>
      e tiene un <strong>contatore</strong> (con «+1» rossi a schermo). Alla fine del tempo, se sei stato beccato, parte <strong>una penitenza</strong> 😈</p>
      <div class="riquadro-info spazio-sopra">
        <strong>Due modi</strong>, ognuno col suo premio a punti canale:
        <ul class="lista-punti">
          <li><strong>Vieta la parola</strong> — non devi dirla: ogni volta che la dici, <span class="pen-inline-num">+1</span>.</li>
          <li><strong>Usa solo la parola</strong> — puoi dire <em>solo</em> quella: ogni frase con un'altra parola, <span class="pen-inline-num">+1</span>.</li>
        </ul>
      </div>
      <p class="suggerimento">Serve il <strong>riconoscimento vocale</strong> attivo (scheda <em>Ascolto vocale</em>) e il permesso <strong>Punti canale</strong>.</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore"><input type="checkbox" id="pen-attivo" ${p.attivo ? 'checked' : ''}><span class="levetta"></span></label>
        <span class="etichetta-stato" id="pen-etichetta">${p.attivo ? 'Penitenze attive' : 'Penitenze spente'}</span>
      </div>
      <div class="griglia-campi spazio-sopra">
        <div>
          <label class="campo" for="pen-durata">Durata (minuti)</label>
          <input type="number" id="pen-durata" min="1" max="15" value="${Number(p.durataMin) || 2}">
        </div>
        <div>
          <label class="campo" for="pen-src">La penitenza…</label>
          <select id="pen-src">
            ${optS('lista', 'La scelgo dalla mia lista')}
            ${optS('ia', 'La inventa l\'IA')}
          </select>
        </div>
      </div>
      <label class="campo spazio-sopra" for="pen-penitenze">La mia lista di penitenze (una per riga: ne parte una a caso)</label>
      <textarea id="pen-penitenze" placeholder="10 flessioni&#10;canta la sigla&#10;parla in inglese per 1 minuto">${esc((p.penitenze || []).join('\n'))}</textarea>
      <p class="suggerimento">Con «La inventa l'IA» non serve scriverne: se il cervello non è disponibile, il bot ne pesca una pronta.</p>
      <label class="campo spazio-sopra" for="pen-fuzzy">Tolleranza al riconoscimento vocale: <strong><span id="pen-fuzzy-val">${fuzzy}</span></strong></label>
      <input type="range" id="pen-fuzzy" min="50" max="100" step="5" value="${fuzzy}">
      <p class="suggerimento">Più alta = più severo (conta solo parole quasi identiche). Più bassa = perdona di più gli errori di trascrizione.</p>
      <label class="campo spazio-sopra" for="pen-effetto">Effetto quando scatta la penitenza (facoltativo)</label>
      <input type="text" id="pen-effetto" placeholder="es. airhorn (comando di un effetto)" value="${esc(p.effetto || '')}">
      <p class="spazio-sopra"><button class="btn" id="pen-salva">Salva</button></p>
    </div>

    <div class="carta">
      <h3>${_hIco(ICO.monitor)}Contatore a schermo (overlay)</h3>
      <p>Il «+1» e il contatore compaiono nell'<strong>overlay per OBS</strong> (lo stesso degli effetti, scheda <em>Effetti &amp; suoni</em>).</p>
      <div class="griglia-campi spazio-sopra">
        <div>
          <label class="campo" for="pen-ov-pos">Posizione</label>
          <select id="pen-ov-pos">
            ${optP('alto-sinistra', 'In alto a sinistra')}
            ${optP('alto-centro', 'In alto al centro')}
            ${optP('alto-destra', 'In alto a destra')}
            ${optP('basso-sinistra', 'In basso a sinistra')}
            ${optP('basso-centro', 'In basso al centro')}
            ${optP('basso-destra', 'In basso a destra')}
          </select>
        </div>
        <div>
          <label class="campo" for="pen-ov-col">Colore</label>
          <input type="color" id="pen-ov-col" value="${/^#[0-9a-fA-F]{6}$/.test(ov.colore || '') ? ov.colore : '#ff2d2d'}">
        </div>
      </div>
      <p class="spazio-sopra"><button class="btn secondario" id="pen-ov-prova">Prova il contatore nell'overlay</button></p>
      <p class="suggerimento">Apri l'overlay in OBS (o nel browser) e premi «Prova»: vedrai partire un +1 di esempio.</p>
    </div>

    <div class="carta">
      <h3>${_hIco(ICO.chiave)}I premi a punti canale</h3>
      <p>Servono premi <strong>con richiesta di testo</strong> (così lo spettatore scrive la parola). Scegline uno per modo, o creali qui.</p>
      <input type="hidden" id="pen-premio-vieta" value="${esc(p.premioVieta || '')}">
      <input type="hidden" id="pen-premio-solo" value="${esc(p.premioSolo || '')}">
      <h4 class="spazio-sopra">${_hIco(ICO.divieto)}Vieta la parola <span class="tenue">— non devi dirla</span></h4>
      <div id="pen-box-vieta"><p class="suggerimento">Carico i tuoi premi…</p></div>
      <h4 class="spazio-sopra">${_hIco(ICO.target)}Usa solo la parola <span class="tenue">— puoi dire solo quella</span></h4>
      <div id="pen-box-solo"><p class="suggerimento">Carico i tuoi premi…</p></div>
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
  await salvaImpostazioni({ penitenze }, silenzioso ? null : 'Penitenze salvate 😈');
}

async function caricaPenitenze() {
  document.getElementById('pen-attivo')?.addEventListener('change', (ev) => {
    const et = document.getElementById('pen-etichetta');
    if (et) et.textContent = ev.target.checked ? 'Penitenze attive' : 'Penitenze spente';
  });
  document.getElementById('pen-salva')?.addEventListener('click', () => conErrore(() => salvaPenitenze()));
  const rng = document.getElementById('pen-fuzzy');
  const val = document.getElementById('pen-fuzzy-val');
  rng?.addEventListener('input', () => { if (val) val.textContent = rng.value; });
  document.getElementById('pen-ov-pos')?.addEventListener('change', () => conErrore(async () => { await salvaPenitenze(true); toast('Overlay salvato ✓'); }));
  document.getElementById('pen-ov-col')?.addEventListener('change', () => conErrore(() => salvaPenitenze(true)));
  document.getElementById('pen-ov-prova')?.addEventListener('click', () => conErrore(async () => {
    await salvaPenitenze(true);
    await api('/api/penitenze/prova', { method: 'POST', body: {} });
    toast('Inviato all\'overlay ▶');
  }));
  const boxV = document.getElementById('pen-box-vieta');
  const boxS = document.getElementById('pen-box-solo');
  if (!boxV || !boxS) return;
  let d;
  try { d = await api('/api/penitenze/premi'); } catch { boxV.innerHTML = boxS.innerHTML = '<p class="suggerimento">Impossibile leggere i premi.</p>'; return; }
  if (!d.permessoOk) {
    boxV.innerHTML = '<div class="riquadro-info">⚠️ Per i premi a punti canale serve il permesso: concedilo da <strong>Chat &amp; comandi → Effetti &amp; suoni</strong> (sezione Premi), poi torna qui.</div>';
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
        <summary>${eleggibili.length ? 'Oppure crea un premio pronto all\'uso' : 'Crea un premio pronto all\'uso'}</summary>
        <div class="griglia-campi spazio-sopra">
          <div><label class="campo">Nome</label><input type="text" id="${nomeId}" value="${esc(nomeDefault)}"></div>
          <div><label class="campo">Costo (punti canale)</label><input type="number" id="${costoId}" min="1" value="500"></div>
        </div>
        <button class="btn secondario spazio-sopra" id="${creaId}">Crea il premio su Twitch</button>
      </details>`;
    if (!eleggibili.length) {
      box.innerHTML = `<div class="riquadro-info">Non hai premi con la <strong>richiesta di testo</strong>${esclusi ? ` (${esclusi} non ${esclusi === 1 ? 'adatto' : 'adatti'})` : ''}. Creane uno qui.</div>${formCrea}`;
    } else {
      const nessuno = `<option value=""${cur ? '' : ' selected'}>— nessuno —</option>`;
      box.innerHTML = `
        <select id="${selId}">
          ${nessuno}${eleggibili.map((r) => `<option value="${esc(r.title)}"${r.title === cur ? ' selected' : ''}>${esc(r.title)} — ${r.cost} punti</option>`).join('')}
        </select>${formCrea}`;
      const sel = document.getElementById(selId);
      if (cur && !eleggibili.some((r) => r.title === cur)) sel.value = '';
      if (inp) inp.value = sel.value;
      sel.addEventListener('change', () => { if (inp) inp.value = sel.value; conErrore(async () => { await salvaPenitenze(true); toast('Premio impostato ✓'); }); });
    }
    const bc = document.getElementById(creaId);
    if (bc) bc.addEventListener('click', () => conErrore(async () => {
      const titolo = (document.getElementById(nomeId)?.value || nomeDefault).trim();
      const costo = Number(document.getElementById(costoId)?.value) || 500;
      const r = await api('/api/penitenze/premio', { method: 'POST', body: { campo, titolo, costo } });
      if (r?.reward) { if (inp) inp.value = r.reward.title; toast('Premio creato su Twitch! 🎁'); caricaPenitenze(); }
    }));
  };
  montaPicker(boxV, { campo: 'premioVieta', hiddenId: 'pen-premio-vieta', attuale: d.premioVieta, nomeDefault: 'Vietami una parola' });
  montaPicker(boxS, { campo: 'premioSolo', hiddenId: 'pen-premio-solo', attuale: d.premioSolo, nomeDefault: 'Dì solo questa parola' });
}

// --- scheda Alert & Chat ------------------------------------------------

// opzioni <option> dei suoni preset (dalla libreria condivisa presets.js)
function opzioniSuono(sel) {
  const lista = (window.SUONI_PRESET && window.SUONI_PRESET.lista) || [];
  return ['<option value="">— nessun suono —</option>']
    .concat(lista.map((s) => `<option value="${esc(s.id)}"${s.id === sel ? ' selected' : ''}>${esc(s.nome)}</option>`)).join('');
}

const ALERT_TIPI = [
  { key: 'follow', nome: 'Nuovo follower', ph: '{user} ha seguito il canale!', vars: '{user}', acc: '#9146ff' },
  { key: 'sub', nome: 'Abbonamento', ph: '{user} si è abbonato! ({mesi} mesi)', vars: '{user}, {mesi}', acc: '#ffb020' },
  { key: 'cheer', nome: 'Bit (cheer)', ph: '{user} ha lanciato {bits} bit!', vars: '{user}, {bits}', acc: '#38d39f', soglia: { campo: 'minBits', label: 'Bit minimi' } },
  { key: 'raid', nome: 'Raid', ph: '{user} è arrivato in raid con {viewers} spettatori!', vars: '{user}, {viewers}', acc: '#ff4d4d', soglia: { campo: 'minViewers', label: 'Spettatori minimi' } },
];

// opzioni comuni per i controlli di stile
const FONT_OPTS = [['sistema', 'Sistema'], ['rotondo', 'Arrotondato'], ['condensato', 'Condensato'], ['mono', 'Monospazio'], ['serif', 'Serif'], ['manga', 'Manga']];
const ANIM_ALERT_OPTS = [['slide', 'Scivola'], ['pop', 'Pop'], ['zoom', 'Zoom'], ['fade', 'Dissolvenza'], ['flip', 'Ribalta'], ['bounce', 'Rimbalzo']];
const ANIM_CHAT_OPTS = [['slide', 'Scivola'], ['fade', 'Dissolvenza'], ['nessuna', 'Nessuna']];
const DIM_OPTS = [['piccola', 'Piccola'], ['media', 'Media'], ['grande', 'Grande'], ['enorme', 'Enorme']];
const DIM3_OPTS = [['piccola', 'Piccola'], ['media', 'Media'], ['grande', 'Grande']];
const POS4_OPTS = [['alto-sinistra', 'In alto a sx'], ['alto-destra', 'In alto a dx'], ['basso-sinistra', 'In basso a sx'], ['basso-destra', 'In basso a dx']];

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
      <label class="campo spazio-sopra">Testo <span class="tenue">— segnaposto: ${esc(t.vars)}</span></label>
      <input type="text" class="al-testo campo-largo" maxlength="200" placeholder="${esc(t.ph)}" value="${esc(c.testo || '')}">
      <div class="griglia-campi spazio-sopra">
        <div><label class="campo">Suono</label><select class="al-suono">${opzioniSuono(c.suono || '')}</select></div>
        <div><label class="campo">Colore</label><input type="color" class="al-colore" value="${_hx(acc, t.acc)}"></div>
        <div><label class="campo">Volume: <strong><span class="al-vol-v">${vol}</span>%</strong></label><input type="range" class="al-vol" min="0" max="100" value="${vol}"></div>
        ${soglia}
      </div>
      <p class="spazio-sopra"><button type="button" class="btn secondario mini al-prova" data-kind="${t.key}">Prova ▶</button></p>
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
      <label class="campo spazio-sopra" for="${pref}-testo">Testo <span class="tenue">— {nome} = chi</span></label>
      <input type="text" id="${pref}-testo" class="campo-largo" maxlength="80" value="${esc(w.testo)}">
      <div class="griglia-campi spazio-sopra">
        ${cSel(`${pref}-pos`, 'Posizione', POS4_OPTS, w.posizione)}
        ${cSel(`${pref}-font`, 'Font', FONT_OPTS, st.font)}
        ${cSel(`${pref}-dim`, 'Dimensione', DIM3_OPTS, st.dim)}
      </div>
      <div class="griglia-campi spazio-sopra">
        ${cCol(`${pref}-bg`, 'Sfondo', st.sfondo)}
        ${cRng(`${pref}-op`, 'Opacità', 0, 100, st.opacita, '%')}
        ${cCol(`${pref}-fg`, 'Testo', st.testo)}
        ${cCol(`${pref}-acc`, 'Nome', st.accento)}
        ${cRng(`${pref}-radius`, 'Angoli', 0, 30, st.bordoRaggio, 'px')}
      </div>
      <p class="spazio-sopra"><button type="button" class="btn secondario mini w-prova" data-kind="${kind}">Prova ▶</button></p>
    </div>`;
}

function pannelloAlert() {
  const p = impostazioni();
  const a = p.alerts, st = a.stile, co = p.chatOverlay, cst = co.stile;
  const wf = p.overlayWidget.ultimoFollower, ws = p.overlayWidget.ultimoSub;
  const posAlertOpts = [['alto-centro', 'In alto al centro'], ['centro', 'Al centro'], ['basso-centro', 'In basso al centro']];
  const userMode = (cst.username && cst.username !== 'twitch') ? 'fisso' : 'twitch';
  const opzTpl = `<optgroup label="Pronti">${TEMPLATE_BUILTIN.map((t, i) => `<option value="b${i}">${esc(t.nome)}</option>`).join('')}</optgroup>`
    + (p.overlayTemplates.length ? `<optgroup label="I miei">${p.overlayTemplates.map((t, i) => `<option value="u${i}">${esc(t.nome)}</option>`).join('')}</optgroup>` : '');
  return pannello('alert', `
    <div class="carta">
      <h2>${_hIco(ICO.monitor)}I miei overlay</h2>
      <p>Puoi avere <strong>più overlay</strong>, ognuno col suo <strong>link OBS</strong> e il suo <strong>layout</strong>
      (cosa mostra e dove). Es. un overlay "solo alert" in una scena e uno "solo chat" in un'altra.</p>
      <div class="riga-flessibile">
        <select id="ov-sel" class="campo-largo"></select>
        <button class="btn secondario" id="ov-nuovo">＋ Nuovo</button>
        <button class="btn secondario" id="ov-rinomina">Rinomina</button>
        <button class="btn secondario" id="ov-elimina">Elimina</button>
      </div>
      <label class="campo spazio-sopra">Link OBS di questo overlay <span class="tenue">— Sorgenti → Browser, 1920×1080, sfondo trasparente</span></label>
      <div class="riga-flessibile">
        <input type="text" id="inp-overlay-url" class="campo-largo" readonly value="" placeholder="caricamento…">
        <button class="btn secondario" id="btn-copia-overlay">Copia</button>
      </div>
      <label class="campo spazio-sopra">Cosa mostra questo overlay</label>
      <div class="ovl-mostra">
        <label class="riga-check"><input type="checkbox" id="mostra-alert" checked> Alert</label>
        <label class="riga-check"><input type="checkbox" id="mostra-chat" checked> Chat a schermo</label>
        <label class="riga-check"><input type="checkbox" id="mostra-wf" checked> Widget ultimo follower</label>
        <label class="riga-check"><input type="checkbox" id="mostra-ws" checked> Widget ultimo sub</label>
        <label class="riga-check"><input type="checkbox" id="mostra-effetti" checked> Effetti & suoni</label>
      </div>
      <p class="suggerimento">Tienilo per te: chi ha questo link può far comparire cose nel tuo overlay.</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.monitor)}Overlay Studio</h2>
      <p>Personalizza <strong>tutto</strong> ciò che appare a schermo: alert, chat, widget… colori, font, forma, animazioni.
      Posizioni e "cosa mostra" valgono per l'<strong>overlay selezionato qui sopra</strong>; stile e testi sono condivisi.
      L'<strong>anteprima qui sotto è dal vivo</strong>.</p>
      <label class="campo" for="ovl-tpl">Template <span class="tenue">— parti da un preset o crea il tuo (salva l'intero look)</span></label>
      <div class="riga-flessibile">
        <select id="ovl-tpl" class="campo-largo">${opzTpl}</select>
        <button class="btn secondario" id="ovl-tpl-applica">Applica</button>
        <button class="btn secondario" id="ovl-tpl-salva">Salva il mio look…</button>
        <button class="btn secondario" id="ovl-tpl-elimina">Elimina</button>
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
        <div class="ovl-insp-testa"><span class="ovl-insp-nome" id="insp-nome">Elemento</span>
          <button type="button" class="ovl-insp-reset" id="insp-reset" title="Ripristina posizione, dimensione e rotazione">Ripristina</button></div>
        <div class="ovl-insp-riga">
          <label for="insp-size">Dimensione</label>
          <input type="range" id="insp-size" min="30" max="300" step="1" value="100">
          <span class="ovl-insp-val" id="insp-size-val">100%</span>
        </div>
        <div class="ovl-insp-riga">
          <label for="insp-rot">Rotazione</label>
          <input type="range" id="insp-rot" min="-180" max="180" step="1" value="0">
          <span class="ovl-insp-val" id="insp-rot-val">0°</span>
        </div>
      </div>
      <p class="suggerimento"><strong>Clicca</strong> un elemento per selezionarlo, poi <strong>trascinalo</strong> per spostarlo, usa le <strong>maniglie</strong> (⤡ dimensione · ⟳ rotazione) o i cursori qui sopra. Scorciatoie: <strong>rotellina</strong> = ridimensiona, <strong>Shift+rotellina</strong> = ruota, <strong>doppio clic</strong> = ripristina. Usa «Prova ▶» per vederli nell'overlay in OBS.</p>
    </div>

    <div class="carta">
      <h3>${_hIco(ICO.megafono)}Alert eventi</h3>
      <p>Un cartello animato con suono quando arriva un follow, un sub, dei bit o un raid.</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore"><input type="checkbox" id="al-attivo" ${a.attivo ? 'checked' : ''}><span class="levetta"></span></label>
        <span class="etichetta-stato">Alert eventi</span>
      </div>
      <div class="griglia-campi spazio-sopra">
        ${cSel('al-pos', 'Posizione', posAlertOpts, a.posizione)}
        <div><label class="campo" for="al-durata">Durata (secondi)</label><input type="number" id="al-durata" min="2" max="20" value="${Math.round((Number(a.durata) || 6000) / 1000)}"></div>
      </div>
      <h4 class="spazio-sopra">Aspetto <span class="tenue">— vale per tutti gli alert</span></h4>
      <div class="griglia-campi spazio-sopra">
        ${cSel('al-st-anim', 'Animazione', ANIM_ALERT_OPTS, st.animazione)}
        ${cSel('al-st-font', 'Font', FONT_OPTS, st.font)}
        ${cRng('al-st-dim', 'Testo', 14, 56, st.dimTesto, 'px')}
      </div>
      <div class="griglia-campi spazio-sopra">
        ${cCol('al-st-bg', 'Sfondo', st.sfondo)}
        ${cRng('al-st-op', 'Opacità', 0, 100, st.opacita, '%')}
        ${cCol('al-st-fg', 'Testo', st.testo)}
        ${cRng('al-st-radius', 'Angoli', 0, 40, st.bordoRaggio, 'px')}
        ${cRng('al-st-border', 'Bordo', 0, 10, st.bordoSpessore, 'px')}
      </div>
      <div class="riga-flessibile spazio-sopra">
        ${cChk('al-st-glow', 'Bagliore', st.glow)}
        ${cChk('al-st-icon', 'Mostra icona', st.icona)}
      </div>
      <div class="alert-griglia spazio-sopra">
        ${ALERT_TIPI.map((t) => bloccoAlert(t, a)).join('')}
      </div>
      <p class="spazio-sopra"><button class="btn" id="al-salva">Salva alert</button></p>
    </div>

    <div class="carta">
      <h3>${_hIco(ICO.chat)}Chat a schermo</h3>
      <p>I messaggi della chat scorrono in sovraimpressione nell'overlay.</p>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore"><input type="checkbox" id="co-attivo" ${co.attivo ? 'checked' : ''}><span class="levetta"></span></label>
        <span class="etichetta-stato">Chat a schermo</span>
      </div>
      <div class="griglia-campi spazio-sopra">
        ${cSel('co-pos', 'Posizione', POS4_OPTS, co.posizione)}
        <div><label class="campo" for="co-max">Messaggi visibili</label><input type="number" id="co-max" min="1" max="20" value="${Number(co.max) || 8}"></div>
        <div><label class="campo" for="co-fade">Spariscono dopo (s, 0=restano)</label><input type="number" id="co-fade" min="0" max="120" value="${Number(co.fadeSec) || 0}"></div>
      </div>
      <h4 class="spazio-sopra">Aspetto</h4>
      <div class="griglia-campi spazio-sopra">
        ${cSel('co-st-dim', 'Dimensione', DIM_OPTS, cst.dim)}
        ${cSel('co-st-font', 'Font', FONT_OPTS, cst.font)}
        ${cSel('co-st-anim', 'Animazione', ANIM_CHAT_OPTS, cst.animazione)}
        ${cRng('co-st-larg', 'Larghezza', 18, 60, cst.larghezza, 'vw')}
      </div>
      <div class="griglia-campi spazio-sopra">
        ${cCol('co-st-bg', 'Sfondo', cst.sfondo)}
        ${cRng('co-st-op', 'Opacità', 0, 100, cst.opacita, '%')}
        ${cCol('co-st-fg', 'Testo', cst.testo)}
        ${cRng('co-st-radius', 'Angoli', 0, 30, cst.bordoRaggio, 'px')}
      </div>
      <div class="griglia-campi spazio-sopra">
        ${cSel('co-st-user', 'Colore nomi', [['twitch', 'Colore di Twitch'], ['fisso', 'Colore fisso']], userMode)}
        ${cCol('co-st-usercol', 'Colore nomi (se fisso)', userMode === 'fisso' ? cst.username : '#9146ff')}
      </div>
      <div class="riga-flessibile spazio-sopra">
        ${cChk('co-st-ombra', 'Ombra', cst.ombra)}
        ${cChk('co-st-bold', 'Nome in grassetto', cst.grassettoUser)}
      </div>
      <p class="spazio-sopra">
        <button class="btn" id="co-salva">Salva chat</button>
        <button class="btn secondario" id="co-prova">Prova ▶</button>
      </p>
    </div>

    <div class="carta">
      <h3>${_hIco(ICO.medaglia)}Widget: ultimo follower / ultimo sub</h3>
      <p>Etichette <strong>sempre a schermo</strong> che si aggiornano da sole quando arriva un nuovo follower o sub.</p>
      <div class="alert-griglia spazio-sopra">
        ${bloccoWidget('wf', wf, 'Ultimo follower', 'ultimoFollower')}
        ${bloccoWidget('ws', ws, 'Ultimo sub', 'ultimoSub')}
      </div>
      <p class="spazio-sopra"><button class="btn" id="wid-salva">Salva widget</button></p>
    </div>

    <div class="carta">
      <h3>${_hIco(ICO.moduli)}CSS avanzato <span class="tenue">— libertà totale</span></h3>
      <p>Per chi vuole spingersi oltre: CSS applicato al tuo overlay. Le classi principali sono
      <code>.alert-card</code>, <code>.chat-riga</code>, <code>.ovl-widget</code>, <code>.pen-card</code>.</p>
      <textarea id="ovl-css" spellcheck="false" placeholder=".alert-card { letter-spacing: 1px; }">${esc(p.overlayCss || '')}</textarea>
      <p class="spazio-sopra"><button class="btn" id="css-salva">Salva CSS</button></p>
    </div>`);
}

// nomi-font → variabile CSS (definite in overlay-skin.css) per l'anteprima
const FONT_VAR = { sistema: 'var(--font-sistema)', rotondo: 'var(--font-rotondo)', condensato: 'var(--font-condensato)', mono: 'var(--font-mono)', serif: 'var(--font-serif)', manga: 'var(--font-manga)' };
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
    animazione: _v('al-st-anim') || 'slide', font: _v('al-st-font') || 'sistema',
    dimTesto: Number(_v('al-st-dim')) || 27, sfondo: _v('al-st-bg'), opacita: Number(_v('al-st-op')),
    testo: _v('al-st-fg'), bordoRaggio: Number(_v('al-st-radius')), bordoSpessore: Number(_v('al-st-border')),
    glow: !!_g('al-st-glow')?.checked, icona: !!_g('al-st-icon')?.checked,
  };
}
function _leggiChatStile() {
  const mode = _v('co-st-user') || 'twitch';
  return {
    dim: _v('co-st-dim') || 'media', font: _v('co-st-font') || 'sistema', animazione: _v('co-st-anim') || 'slide',
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
  await salvaImpostazioni({ alerts: _raccogliAlerts() }, silenzioso ? null : 'Alert salvati ✓');
}
async function salvaChatOverlay(silenzioso) {
  await salvaImpostazioni({ chatOverlay: _raccogliChat() }, silenzioso ? null : 'Chat a schermo salvata ✓');
}
async function salvaWidget(silenzioso) {
  await salvaImpostazioni({ overlayWidget: _raccogliWidget() }, silenzioso ? null : 'Widget salvati ✓');
}

async function salvaCss(silenzioso) {
  await salvaImpostazioni({ overlayCss: _v('ovl-css') || '' }, silenzioso ? null : 'CSS salvato ✓');
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
    _setVars(card, { '--acc': acc, '--bg': st.sfondo, '--op': st.opacita + '%', '--fg': st.testo, '--radius': st.bordoRaggio + 'px', '--border': st.bordoSpessore + 'px', '--size': st.dimTesto + 'px', '--font': FONT_VAR[st.font] });
    _g('ap-alert-ico').innerHTML = AP_ICO_ALERT;
    _g('ap-alert-testo').innerHTML = '<b>MarioRossi</b> si è abbonato! 🌟';
    // niente re-animazione a ogni tasto: l'anteprima resta stabile (l'entrata
    // vera si vede con «Prova ▶» o nell'overlay). Prima "sfarfallava".
    card.classList.add('dentro');
  }
  const cst = _leggiChatStile();
  const chatPos = _v('co-pos') || 'basso-sinistra';
  const apChat = _g('ap-chat');
  if (apChat) {
    apChat.className = 'ap-el ap-chat' + (/destra/.test(chatPos) ? ' destra' : '') + (selezione === 'chat' ? ' sel' : '');
    apChat.innerHTML = [['lucaplays', '#ff4d4d', 'ciao a tutti! 👋'], ['giada_ttv', '#48b0ff', 'che bella live']].map(([u, col, t]) => {
      const cu = cst.username === 'twitch' ? col : cst.username;
      return `<div class="chat-riga dim-${cst.dim}${cst.ombra ? ' ombra' : ''}${cst.grassettoUser ? ' user-bold' : ''} dentro" style="--bg:${cst.sfondo};--op:${cst.opacita}%;--fg:${cst.testo};--radius:${cst.bordoRaggio}px;--font:${FONT_VAR[cst.font]}"><span class="chat-user" style="color:${cu}">${esc(u)}</span> ${esc(t)}</div>`;
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

// Posiziona un elemento nel palco 1920x1080 (coordinate in % → left/top, ancorato
// al centro) applicando anche DIMENSIONE (s = scala %) e ROTAZIONE (r = gradi).
function _posElemento(el, xy) {
  if (!el || !xy) return;
  const sf = (Number(xy.s) || 100) / 100, r = Number(xy.r) || 0;
  el.style.position = 'absolute'; el.style.left = xy.x + '%'; el.style.top = xy.y + '%';
  el.style.right = 'auto'; el.style.bottom = 'auto';
  el.style.transform = `translate(-50%,-50%) scale(${sf}) rotate(${r}deg)`;
  // le maniglie sono figlie dell'elemento: contro-scala così restano usabili
  el.querySelectorAll('.ap-handle').forEach((h) => { h.style.transform = `scale(${1 / sf})`; });
}

// Nomi leggibili degli elementi (mostrati nell'inspector).
const NOMI_EL = { alert: 'Alert', chat: 'Chat a schermo', wf: 'Widget: ultimo follower', ws: 'Widget: ultimo sub' };
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
  const nome = _g('insp-nome'); if (nome) nome.textContent = NOMI_EL[selezione] || selezione;
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
  hR.className = 'ap-handle ap-h-scala'; hR.title = 'Trascina per ridimensionare'; hR.textContent = '⤡';
  const hRot = document.createElement('div');
  hRot.className = 'ap-handle ap-h-ruota'; hRot.title = 'Trascina per ruotare'; hRot.textContent = '⟳';
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
    _imposta('al-st-anim', al.animazione); _imposta('al-st-font', al.font); _imposta('al-st-dim', al.dimTesto);
    _imposta('al-st-bg', al.sfondo); _imposta('al-st-op', al.opacita); _imposta('al-st-fg', al.testo);
    _imposta('al-st-radius', al.bordoRaggio); _imposta('al-st-border', al.bordoSpessore);
    _imposta('al-st-glow', al.glow); _imposta('al-st-icon', al.icona !== false);
    _imposta('co-st-dim', ch.dim); _imposta('co-st-font', ch.font); _imposta('co-st-bg', ch.sfondo);
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
  _imposta('al-st-anim', ast.animazione); _imposta('al-st-font', ast.font); _imposta('al-st-dim', ast.dimTesto);
  _imposta('al-st-bg', ast.sfondo); _imposta('al-st-op', ast.opacita); _imposta('al-st-fg', ast.testo);
  _imposta('al-st-radius', ast.bordoRaggio); _imposta('al-st-border', ast.bordoSpessore);
  _imposta('al-st-glow', ast.glow); _imposta('al-st-icon', ast.icona !== false);
  document.querySelectorAll('.alert-blocco[data-alert]').forEach((b) => {
    const c = a[b.dataset.alert] || {};
    _impostaEl(b.querySelector('.al-attivo'), c.attivo); _impostaEl(b.querySelector('.al-testo'), c.testo);
    _impostaEl(b.querySelector('.al-suono'), c.suono); _impostaEl(b.querySelector('.al-colore'), c.accento || c.colore);
    _impostaEl(b.querySelector('.al-vol'), c.volume != null ? c.volume : 100);
    const sog = b.querySelector('.al-soglia'); if (sog) _impostaEl(sog, c.minBits != null ? c.minBits : c.minViewers);
  });
  const ch = d.chatOverlay || {}, cst = ch.stile || {};
  _imposta('co-attivo', ch.attivo); _imposta('co-pos', ch.posizione); _imposta('co-max', ch.max); _imposta('co-fade', ch.fadeSec);
  _imposta('co-st-dim', cst.dim); _imposta('co-st-font', cst.font); _imposta('co-st-anim', cst.animazione); _imposta('co-st-larg', cst.larghezza);
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
  const nome = (prompt('Nome del template:') || '').trim();
  if (!nome) return;
  const dati = { alerts: _raccogliAlerts(), chatOverlay: _raccogliChat(), overlayWidget: _raccogliWidget(), overlayCss: _v('ovl-css') || '' };
  const templates = (impostazioni().overlayTemplates || []).filter((t) => t.nome !== nome).concat([{ nome, dati }]).slice(-16);
  await salvaImpostazioni({ overlayTemplates: templates }, 'Template salvato ✓');
  _rigeneraTemplateSelect(templates, nome);
}

async function eliminaTemplate() {
  const v = _v('ovl-tpl') || '';
  if (v[0] !== 'u') { toast('Puoi eliminare solo i template salvati da te.'); return; }
  const templates = (impostazioni().overlayTemplates || []).slice();
  const i = Number(v.slice(1));
  if (!templates[i]) return;
  if (!confirm(`Eliminare il template "${templates[i].nome}"?`)) return;
  templates.splice(i, 1);
  await salvaImpostazioni({ overlayTemplates: templates }, 'Template eliminato.');
  _rigeneraTemplateSelect(templates);
}

// Ricostruisce le <option> del menu template (pronti + i miei).
function _rigeneraTemplateSelect(templates, selNome) {
  const sel = _g('ovl-tpl');
  if (!sel) return;
  const pronti = TEMPLATE_BUILTIN.map((t, i) => `<option value="b${i}">${esc(t.nome)}</option>`).join('');
  const miei = templates.map((t, i) => `<option value="u${i}"${t.nome === selNome ? ' selected' : ''}>${esc(t.nome)}</option>`).join('');
  sel.innerHTML = `<optgroup label="Pronti">${pronti}</optgroup>` + (templates.length ? `<optgroup label="I miei">${miei}</optgroup>` : '');
}

// --- gestione PIÙ OVERLAY (ognuno un link + un layout) ------------------
async function caricaOverlays() {
  try { const d = await api('/api/streamer/overlays'); overlays = Array.isArray(d.overlays) ? d.overlays : []; }
  catch { overlays = []; }
  if (!overlays.length) overlays = [{ id: 'principale', nome: 'Overlay principale', mostra: { alert: true, chat: true, wf: true, ws: true, effetti: true }, xy: {}, url: '' }];
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
  await salvaImpostazioni({ overlays: _overlaysPayload() }, silenzioso ? null : 'Overlay salvato ✓');
}
async function nuovoOverlay() {
  if (overlays.length >= 12) { toast('Massimo 12 overlay.'); return; }
  const nome = (prompt('Nome del nuovo overlay:') || '').trim();
  if (!nome) return;
  const id = 'ov' + Math.random().toString(36).slice(2, 8);
  overlays.push({ id, nome, mostra: { alert: true, chat: true, wf: true, ws: true, effetti: true }, xy: {}, css: '' });
  overlaySel = id;
  await salvaImpostazioni({ overlays: _overlaysPayload() }, null);
  await caricaOverlays();                 // ricarica per avere il link dal server
  toast('Overlay creato ✓');
}
async function rinominaOverlay() {
  const ov = overlays.find((o) => o.id === overlaySel); if (!ov) return;
  const nome = (prompt('Nuovo nome:', ov.nome) || '').trim(); if (!nome) return;
  ov.nome = nome;
  await salvaImpostazioni({ overlays: _overlaysPayload() }, null);
  _rigeneraSelOverlay(); toast('Rinominato ✓');
}
async function eliminaOverlay() {
  if (overlays.length <= 1) { toast('Deve restare almeno un overlay.'); return; }
  const ov = overlays.find((o) => o.id === overlaySel); if (!ov) return;
  if (!confirm(`Eliminare l'overlay "${ov.nome}"? Il suo link OBS smetterà di funzionare.`)) return;
  overlays = overlays.filter((o) => o.id !== overlaySel);
  overlaySel = overlays[0].id;
  await salvaImpostazioni({ overlays: _overlaysPayload() }, null);
  await caricaOverlays();
  toast('Overlay eliminato.');
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
  _g('css-salva')?.addEventListener('click', () => conErrore(() => salvaCss()));

  document.querySelectorAll('.al-prova').forEach((b) => b.addEventListener('click', () => conErrore(async () => {
    await salvaAlert(true); await api('/api/alert/prova', { method: 'POST', body: { kind: b.dataset.kind } }); toast('Inviato all\'overlay ▶');
  })));
  _g('co-prova')?.addEventListener('click', () => conErrore(async () => {
    await salvaChatOverlay(true); await api('/api/alert/prova', { method: 'POST', body: { kind: 'chat' } }); toast('Inviato all\'overlay ▶');
  }));
  document.querySelectorAll('.w-prova').forEach((b) => b.addEventListener('click', () => conErrore(async () => {
    await salvaWidget(true); await api('/api/alert/prova', { method: 'POST', body: { kind: b.dataset.kind } }); toast('Inviato all\'overlay ▶');
  })));

  _g('ovl-tpl-applica')?.addEventListener('click', () => {
    const v = _v('ovl-tpl') || '';
    const lista = v[0] === 'b' ? TEMPLATE_BUILTIN : (impostazioni().overlayTemplates || []);
    const t = lista[Number(v.slice(1))];
    if (t) { applicaTemplate(t.dati); toast('Template applicato — ricordati di salvare le sezioni.'); }
  });
  _g('ovl-tpl-salva')?.addEventListener('click', () => conErrore(() => salvaComeTemplate()));
  _g('ovl-tpl-elimina')?.addEventListener('click', () => conErrore(() => eliminaTemplate()));
}

// --- scheda Effetti & Suoni ---------------------------------------------

function pannelloEffetti() {
  return pannello('effetti', `
    <div class="carta">
      <h2>${_hIco(ICO.effetti)}Carica un effetto</h2>
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
          <input type="number" id="eff-durata" min="500" max="30000" value="5000">
        </div>
      </div>
      <p class="suggerimento">Fino a <strong>30 secondi</strong> (30000 ms). Per le <strong>immagini</strong> è quanto restano a schermo;
      audio e video usano la loro durata reale (accorciati a 30s se più lunghi).</p>
      <p class="spazio-sopra">
        <button class="btn" id="btn-carica-effetto">Carica effetto</button>
        <span id="esito-effetto" class="suggerimento"></span>
      </p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.sliders)}I tuoi effetti</h2>
      <ul class="lista-voci" id="lista-effetti"><li class="vuoto">Caricamento…</li></ul>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.cuffie)}Suoni sui tuoi punti canale</h2>
      <p>Attacca un <strong class="primo-piano">suono</strong> a un <strong>premio a punti canale che hai già</strong>:
      quando qualcuno lo riscatta (es. «Bevi l'acqua»), parte il suono nell'overlay — così si capisce al volo.
      Sono <strong>suoni pronti</strong>, non serve caricare niente.</p>
      <div id="suoni-premi-box"><p class="vuoto">Caricamento…</p></div>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.giveaway)}Alert a punti canale</h2>
      <p>Crea un <strong class="primo-piano">premio a punti canale</strong> di Twitch: quando uno spettatore lo riscatta
      (spendendo i suoi punti), parte un <strong>effetto</strong> nell'overlay e/o un <strong>messaggio</strong> in chat.
      Il premio compare da solo nella tua pagina Twitch.</p>
      <div id="premi-box"><p class="vuoto">Caricamento…</p></div>
    </div>`);
}

// Elenca i premi a punti canale ESISTENTI e permette di attaccare a ognuno un
// suono pronto (preset) + un messaggio. Non crea premi su Twitch: mappa e basta.
async function caricaSuoniPremi() {
  const box = document.getElementById('suoni-premi-box');
  if (!box) return;
  let d;
  try { d = await api('/api/streamer/premi'); } catch (e) { box.innerHTML = `<p class="vuoto">Errore: ${esc(e.message)}</p>`; return; }
  if (!d.permessoOk) {
    box.innerHTML = `<p class="vuoto">Per leggere i tuoi punti canale serve un permesso in più.
      <a class="btn secondario mini" href="/auth/permessi">Concedi il permesso</a></p>`;
    return;
  }
  const tutti = d.tutti || [];
  if (!tutti.length) {
    box.innerHTML = '<div class="riquadro-info">Non hai ancora premi a punti canale su Twitch. Creane uno (anche qui sotto, in «Alert a punti canale») e poi torna qui per dargli un suono.</div>';
    return;
  }
  const mappa = {};
  (d.premi || []).forEach((p) => { mappa[p.reward_id] = p; });
  const presets = (window.SUONI_PRESET && window.SUONI_PRESET.lista) || [];
  const opz = (sel) => ['<option value="">— nessun suono —</option>']
    .concat(presets.map((s) => `<option value="${esc(s.id)}"${s.id === sel ? ' selected' : ''}>${esc(s.nome)}</option>`)).join('');
  const svgPlay = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  box.innerHTML = `<ul class="lista-suoni-premi">${tutti.map((r) => {
    const m = mappa[r.id] || {};
    return `<li data-reward="${esc(r.id)}" data-titolo="${esc(r.title)}" data-costo="${r.cost || 0}">
      <div class="riga-premio-suono">
        <span class="nome-premio"><strong>${esc(r.title)}</strong> <span class="suggerimento">${r.cost || 0} punti</span></span>
        <span class="controlli-suono">
          <select class="sel-suono">${opz(m.suono || '')}</select>
          <button type="button" class="btn secondario mini prova-suono" title="Ascolta">${svgPlay}</button>
        </span>
      </div>
      <input type="text" class="campo-largo msg-suono spazio-sopra" maxlength="300" placeholder="Messaggio in chat (facoltativo, {user} = chi riscatta)" value="${esc(m.testo || '')}">
    </li>`;
  }).join('')}</ul>`;

  const salvaRiga = (li) => conErrore(async () => {
    await api('/api/streamer/premi/suono', { method: 'POST', body: {
      rewardId: li.dataset.reward,
      titolo: li.dataset.titolo,
      costo: li.dataset.costo,
      suono: li.querySelector('.sel-suono').value,
      testo: (li.querySelector('.msg-suono').value || '').trim(),
    } });
  });
  box.querySelectorAll('.lista-suoni-premi > li').forEach((li) => {
    const sel = li.querySelector('.sel-suono');
    sel.addEventListener('change', () => {
      const id = sel.value;
      if (id && window.SUONI_PRESET) window.SUONI_PRESET.suona(id, 100);   // anteprima
      salvaRiga(li).then(() => toast('Suono impostato ✓'));
    });
    li.querySelector('.prova-suono').addEventListener('click', () => {
      const id = sel.value;
      if (id && window.SUONI_PRESET) window.SUONI_PRESET.suona(id, 100);
      else toast('Scegli prima un suono.');
    });
    li.querySelector('.msg-suono').addEventListener('change', () => salvaRiga(li).then(() => toast('Messaggio salvato ✓')));
  });
}

// carica e disegna gli alert a punti canale (crea premio Twitch + mappa effetto)
async function caricaPremi() {
  const box = document.getElementById('premi-box');
  if (!box) return;
  let d;
  try { d = await api('/api/streamer/premi'); } catch (e) { box.innerHTML = `<p class="vuoto">Errore: ${esc(e.message)}</p>`; return; }
  if (!d.permessoOk) {
    box.innerHTML = `<p class="vuoto">Per creare premi a punti canale serve un permesso in più.
      <a class="btn secondario mini" href="/auth/permessi">Concedi il permesso</a></p>`;
    return;
  }
  const effOpts = ['<option value="">— nessun effetto —</option>']
    .concat((d.effetti || []).map((c) => `<option value="${esc(c)}">!${esc(c)}</option>`)).join('');
  const premi = d.premi || [];
  const lista = premi.length
    ? premi.map((p) => `<li><span><strong>${esc(p.titolo)}</strong> <span class="suggerimento">${p.costo} punti${p.effetto ? ` · !${esc(p.effetto)}` : ''}${p.testo ? ' · 💬' : ''}</span></span> <a href="#" class="rimuovi-premio" data-id="${esc(p.reward_id)}" title="Elimina">✕</a></li>`).join('')
    : '<li class="vuoto">Nessun premio ancora.</li>';
  box.innerHTML = `
    <label class="campo" for="premio-titolo">Nome del premio</label>
    <input type="text" id="premio-titolo" class="campo-largo" placeholder="es. Airhorn 📣" maxlength="45">
    <div class="griglia-campi spazio-sopra">
      <div>
        <label class="campo" for="premio-costo">Costo (punti canale)</label>
        <input type="number" id="premio-costo" min="1" max="1000000" value="500">
      </div>
      <div>
        <label class="campo" for="premio-effetto">Effetto da lanciare</label>
        <select id="premio-effetto">${effOpts}</select>
      </div>
    </div>
    <label class="campo spazio-sopra" for="premio-testo">Messaggio in chat <span class="suggerimento">(facoltativo, {user} = chi riscatta)</span></label>
    <input type="text" id="premio-testo" class="campo-largo" placeholder="es. {user} ha lanciato l'airhorn! 📣" maxlength="300">
    <p class="spazio-sopra"><button class="btn" id="btn-premio-crea">Crea il premio</button></p>
    <h3>I tuoi premi</h3>
    <ul class="lista-voci" id="lista-premi">${lista}</ul>`;
  document.getElementById('btn-premio-crea')?.addEventListener('click', () => conErrore(async () => {
    const body = {
      titolo: (document.getElementById('premio-titolo').value || '').trim(),
      costo: document.getElementById('premio-costo').value,
      effetto: document.getElementById('premio-effetto').value,
      testo: (document.getElementById('premio-testo').value || '').trim(),
    };
    await api('/api/streamer/premi', { method: 'POST', body });
    toast('Premio creato 🎁 — lo trovi tra i punti canale su Twitch.');
    caricaPremi();
  }));
  box.querySelectorAll('.rimuovi-premio').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); conErrore(async () => {
    if (!confirm('Eliminare questo premio da Twitch?')) return;
    await api('/api/streamer/premi/' + encodeURIComponent(a.dataset.id), { method: 'DELETE' });
    toast('Premio eliminato.');
    caricaPremi();
  }); }));
}

// --- scheda Moduli ------------------------------------------------------
// Automazioni componibili col modello QUANDO → SE → ALLORA.

function pannelloModuli() {
  const chipsRapido = ['$user', '$touser', '$giocotarget', '$canale', '$uptime', '$gioco', '$titolo($args)', '$categoria($args)', '$count(morti)', '$random(1,100)']
    .map((v) => `<button type="button" class="chip-var" data-qc="${esc(v)}">${esc(v)}</button>`).join('');
  return pannello('moduli', `
    <div class="carta">
      <h2>${_hIco(ICO.fulmine)}Comando rapido</h2>
      <p>Il modo più veloce: scrivi il <strong class="primo-piano">nome</strong> e <strong class="primo-piano">cosa
      deve rispondere</strong>. Fatto — niente altro da compilare.</p>
      <div class="riga-flessibile">
        <span class="prefisso-cmd">!</span>
        <input type="text" id="qc-nome" class="campo-largo" placeholder="social" maxlength="24">
      </div>
      <label class="campo" for="qc-risposta">Risposta</label>
      <textarea id="qc-risposta" placeholder="es. I miei social li trovi su andryxify.it/u/$canale ✨"></textarea>
      <div class="chip-vars" id="qc-chips">${chipsRapido}</div>
      <p class="suggerimento spazio-sopra">Puoi anche <strong>cambiare titolo e categoria</strong> dal comando:
      <code>$categoria($args)</code> (es. <code>!gioco fortnite</code>) e <code>$titolo($args)</code>. Il token sparisce dal messaggio, scrivi tu la conferma.
      Consiglio: metti questi comandi <strong>solo per i mod</strong>.</p>
      <p class="suggerimento">Per uno <strong>shoutout</strong>: <code>$touser</code> è il nome scritto dopo il comando e
      <code>$giocotarget</code> è l'ultimo gioco del suo canale. Es. <code>!so giorgiottv</code> con risposta
      <em>"Andate a seguire @$touser! Stava streammando $giocotarget"</em>. Nota: <code>$giocotarget</code> funziona
      solo se c'è un destinatario (il nome dopo il comando).</p>
      <p class="spazio-sopra">
        <button class="btn" id="btn-qc">Aggiungi comando</button>
        <span class="suggerimento">Per condizioni, eventi, timer, effetti o webhook usa <strong>Nuovo modulo</strong> qui sotto.</span>
      </p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.moduli)}Moduli</h2>
      <p>Automazioni avanzate: <strong class="primo-piano">QUANDO</strong> succede qualcosa,
      <strong class="primo-piano">SE</strong> valgono certe condizioni, <strong class="primo-piano">ALLORA</strong>
      il bot fa una o più azioni.</p>
      <p class="spazio-sopra"><button class="btn secondario" data-nuovo-modulo>➕ Nuovo modulo (avanzato)</button></p>
      <p class="suggerimento spazio-sopra">Non sai da dove partire? Scegli un modello pronto e modificalo:</p>
      <div class="modelli-pronti">
        <button class="modello-pronto" data-modello="saluto">Saluto</button>
        <button class="modello-pronto" data-modello="shoutout">Shoutout</button>
        <button class="modello-pronto" data-modello="timer">Timer annuncio</button>
        <button class="modello-pronto" data-modello="social">Social</button>
        <button class="modello-pronto" data-modello="morti">Contatore morti</button>
        <button class="modello-pronto" data-modello="voce">Comando vocale: clippa</button>
        <button class="modello-pronto" data-modello="webhook">Collega il mio bot (webhook)</button>
      </div>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.lista)}I tuoi moduli</h2>
      <ul id="lista-moduli" class="lista-moduli"><li class="vuoto">Caricamento…</li></ul>
    </div>

    <div id="editor-modulo"></div>

    <div class="carta">
      <h2>${_hIco(ICO.spina)}Connettori avanzati</h2>
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
    case 'shoutout':
      // "!so giorgiottv" → "Andate a seguire @giorgiottv! Stava streammando <gioco>…"
      // $touser = il nome scritto dopo il comando; $giocotarget = l'ultimo gioco
      // del SUO canale (è legato a $touser: senza destinatario resta vuoto).
      return { id: null, nome: 'Shoutout', attivo: true,
        trigger: { tipo: 'comando', comando: 'so', alias: ['shoutout', 'sh'] }, condizioni: { ...cond(), tier: 'mod' },
        azioni: [{ tipo: 'messaggio', testo: 'Andate tutti a seguire @$touser! 💜 Stava streammando $giocotarget 👉 twitch.tv/$touser' }] };
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
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { window.prompt('Copia con Ctrl+C:', t); });
    else window.prompt('Copia con Ctrl+C:', t);
  } catch (e) { alert('Errore: ' + e.message); }
}
// href del bookmarklet: la funzione su una riga sola, pronta da trascinare nei preferiti.
const bookmarkletXla = 'javascript:(' + _xlaGrabFn.toString().replace(/\n\s*/g, ' ') + ')()';

function pannelloGiochi() {
  const s = impostazioni();
  return pannello('giochi', `
    <div class="carta">
      <h2>${_hIco(ICO.giochi)}Minigiochi</h2>
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
      <h2>${_hIco(ICO.medaglia)}Punti & classifica</h2>
      <p>Decidi quanti <strong class="primo-piano">${esc(s.nomeMonete)}</strong> si guadagnano e i premi dei giochi.
      La classifica <code>!classifica</code> mostra i primi in cima.</p>
      <div class="griglia-punti">
        <label class="campo-num">Punti per messaggio<input type="number" id="pt-perMessaggio" min="0" max="1000" value="${s.punti.perMessaggio}"></label>
        <label class="campo-num">…ogni quanti secondi<input type="number" id="pt-ogniSecondi" min="5" max="3600" value="${s.punti.ogniSecondi}"></label>
        <label class="campo-num">Premio trivia<input type="number" id="pt-trivia" min="0" max="100000" value="${s.punti.trivia}"></label>
        <label class="campo-num">Premio duello<input type="number" id="pt-duello" min="0" max="100000" value="${s.punti.duello}"></label>
        <label class="campo-num">Slot: costo giocata<input type="number" id="pt-slotCosto" min="0" max="100000" value="${s.punti.slotCosto}"></label>
        <label class="campo-num">Slot: vincita tris<input type="number" id="pt-slotVinci" min="0" max="1000000" value="${s.punti.slotVinci}"></label>
        <label class="campo-num">Slot: vincita coppia<input type="number" id="pt-slotCoppia" min="0" max="100000" value="${s.punti.slotCoppia}"></label>
        <label class="campo-num">Quanti in classifica<input type="number" id="pt-topN" min="3" max="10" value="${s.punti.topN}"></label>
      </div>
      <p class="suggerimento">“Punti per messaggio” a 0 = nessun guadagno passivo dal chattare. Lo slot tris scala su questo valore (💎 pieno, 7️⃣ 75%, resto 40%).</p>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-punti">Salva punti</button></p>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.dado)}Manche automatiche</h2>
      <p>Lascia che sia <strong class="primo-piano">il bot</strong> a lanciare i giochi: ogni tanto, a sorpresa, parte una
      <strong class="primo-piano">manche</strong> (trivia, reflex sulla parola, indovina il numero) e il primo che risponde vince.</p>
      <div class="riga-check">
        <input type="checkbox" id="chk-manche" ${s.manche.attivo ? 'checked' : ''}>
        <label for="chk-manche">Attiva le manche automatiche</label>
      </div>
      <div class="griglia-punti">
        <label class="campo-num">Ogni almeno (minuti)<input type="number" id="mn-min" min="1" max="360" value="${s.manche.minMin}"></label>
        <label class="campo-num">…al massimo (minuti)<input type="number" id="mn-max" min="1" max="360" value="${s.manche.maxMin}"></label>
      </div>
      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-manche-live" ${s.manche.soloLive ? 'checked' : ''}>
        <label for="chk-manche-live">Solo mentre sono in diretta</label>
      </div>
      <p class="suggerimento">Il bot sceglie da solo quando e quale gioco, e non disturba mai una chat vuota. In chat: <code>!manche</code> ne lancia una al volo.</p>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-manche">Salva manche</button></p>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.giochi)}I tuoi giochi</h2>
      <p>Crea i tuoi giochi: entrano nel giro delle manche automatiche (mescolati a quelli di default).</p>
      <div class="riga-flessibile">
        <select id="gioco-tipo">
          <option value="trivia">Trivia (domande & risposte)</option>
          <option value="parola">Parola veloce (reflex)</option>
        </select>
        <input type="text" id="gioco-nome" maxlength="60" placeholder="Nome del gioco (es. Trivia gaming)">
      </div>
      <div id="gioco-trivia" class="spazio-sopra">
        <label class="campo">Domande — una per riga, formato <code>domanda | risposta1, risposta2</code></label>
        <textarea id="gioco-domande" rows="5" placeholder="Chi ha vinto i mondiali 2006? | italia&#10;Come si chiama il mio gatto? | felix, felixe"></textarea>
      </div>
      <div id="gioco-parola" class="spazio-sopra" hidden>
        <label class="campo">Parole — una per riga (il bot ne pesca una e il primo che la scrive vince)</label>
        <textarea id="gioco-parole" rows="5" placeholder="pizza&#10;combo perfetta&#10;gg wp"></textarea>
      </div>
      <p class="spazio-sopra"><button class="btn" id="btn-crea-gioco">Crea gioco</button></p>
      <h3>Giochi creati</h3>
      <ul class="lista-voci" id="lista-giochi"><li class="vuoto">Caricamento…</li></ul>
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
      <h2>${_hIco(ICO.trofeo)}Classifica & VIP</h2>
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
      <h2>${_hIco(ICO.target)}Giochi del sito andryxify.it</h2>
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
      <h2>${_hIco(ICO.chat)}Citazioni</h2>
      <p>Le frasi memorabili della chat. In chat: <code>!cita</code> (a caso), <code>!cita 12</code> (una precisa),
      <code>!cita aggiungi &lt;testo&gt;</code> e <code>!cita rimuovi 12</code> (mod/streamer). Le gestisci anche da qui.</p>
      <div class="riga-flessibile">
        <input type="text" id="inp-citazione" maxlength="400" placeholder="una frase memorabile…">
        <button class="btn" id="btn-aggiungi-citazione">Aggiungi</button>
      </div>

      <details class="spazio-sopra">
        <summary style="cursor:pointer">📥 Importa citazioni (da x.la)</summary>
        <p class="suggerimento">x.la disegna le frasi <strong>con JavaScript</strong>: copiare la pagina "alla cieca" (o dal link)
        spesso prende solo il guscio vuoto («<em>Please enable JavaScript</em>»). Due modi che funzionano davvero 👇</p>

        <p class="suggerimento" style="margin-bottom:.35rem"><strong>1) Bottone magico</strong> (consigliato). Trascina
        <a id="bm-xla" class="btn secondario" draggable="true" href="#" title="Trascinami nella barra dei preferiti del browser">📌 Prendi le quote da x.la</a>
        nella <strong>barra dei preferiti</strong> del browser. Poi apri la tua pagina x.la, aspetta che le quote compaiano
        (scorri fino in fondo) e <strong>clicca quel preferito</strong>: copia tutto da solo. Torna qui, incolla sotto e importa.
        <button class="btn secondario" id="bm-xla-copia" type="button" style="margin-left:.35rem">copia il codice</button></p>

        <p class="suggerimento" style="margin-bottom:.5rem"><strong>2) A mano.</strong> Sulla pagina x.la <em>già aperta e caricata</em>,
        seleziona le quote col mouse e incollale qui sotto: riconosco <strong>nome utente e data</strong>
        (formato «<em>frase</em> ⏎ <em>autore | data</em>», come le mostra x.la). I doppioni li salto.</p>

        <textarea id="txt-import-citazioni" rows="6" placeholder="&quot;Tu, molto molto bravo&quot;&#10;UnicornoFacinoroso | 06.09.2024&#10;&quot;io solo perchè mi andava di uscire&quot;&#10;@chiara_3008 | 06.10.2024"></textarea>
        <div class="riga-flessibile">
          <input type="text" id="inp-import-url" placeholder="…oppure incolla un link (per altre fonti)">
          <button class="btn secondario" id="btn-estrai-citazioni">Estrai dal link</button>
        </div>
        <p class="spazio-sopra">
          <button class="btn" id="btn-importa-citazioni">Riconosci e importa</button>
          <span id="import-cita-esito" class="suggerimento"></span>
        </p>
        <p id="import-cita-avviso" class="nota-lettura" hidden></p>
      </details>

      <ul class="lista-voci" id="lista-citazioni"><li class="vuoto">Caricamento…</li></ul>
    </div>`);
}

// --- scheda Notifiche (Telegram) ---------------------------------------

function pannelloNotifiche() {
  const tg = stato.telegram || { configurato: false, gruppoOk: false, attivo: false, messaggio: '', botUsername: '', gruppo: '', pinLive: true };
  const tkc = impostazioni().tiktok || {};
  const ytc = impostazioni().youtube || {};
  const igc = impostazioni().instagram || {};
  const msgDefault = '🔴 {nome} è in diretta!\n\n{titolo}\n🎮 {gioco}\n\n👉 {link}';
  return pannello('notifiche', `
    <div class="carta">
      <h2>${_hIco(ICO.megafono)}Avviso "sono in diretta" su Telegram</h2>
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
      <h2>${_hIco(ICO.bot)}Bot interattivo su Telegram</h2>
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

      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore"><input type="checkbox" id="chk-tg-dm" ${tg.dmModo !== 'off' ? 'checked' : ''}><span class="levetta"></span></label>
        <span class="etichetta-stato">Rispondimi in chat privata (solo a me)</span>
      </div>
      <p class="suggerimento" id="tg-dm-stato">
        ${tg.dmCollegato
          ? `🔗 In privato risponde <strong>solo a te</strong> (account <strong>${esc(tg.dmNome || 'te')}</strong>). <a href="#" id="btn-tg-dm-scollega">Scollega</a>`
          : 'Per rispondere solo a te, lega una volta il tuo Telegram: <a href="#" id="btn-tg-dm-collega">genera un codice</a> e scrivi <code>/collega CODICE</code> al bot in privato. Finché non colleghi, in privato non risponde a nessuno.'}
      </p>
      <div id="tg-dm-codice"></div>

      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore"><input type="checkbox" id="chk-tg-proattiva" ${impostazioni().proattivoTg !== false ? 'checked' : ''}><span class="levetta"></span></label>
        <span class="etichetta-stato">Ti scrive per prima (proattiva e curiosa)</span>
      </div>
      <p class="suggerimento">Ogni tanto è <strong>lei</strong> a scriverti in privato di sua iniziativa: ti fa una domanda, ti chiede una cosa
      che ancora non sa, commenta. Come una persona — non a orari fissi, mai di notte, e senza esagerare.
      Serve aver <strong>collegato</strong> il tuo Telegram qui sopra. Il nome con cui si presenta lo scegli in
      <strong>Admin → Anima</strong>.</p>

      <p class="suggerimento">Nel <strong>gruppo</strong> invece il bot funziona per tutti (e impara dalla chat come su Twitch). Il privato resta solo tuo.</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.torta)}Auguri di compleanno</h2>
      <p>Il bot fa gli <strong class="primo-piano">auguri automatici</strong> nel gruppo il giorno del compleanno dei
      membri. Loro possono registrarsi da soli scrivendo <code>/compleanno 25/12</code> nel gruppo (serve il bot
      interattivo qui sopra), oppure li aggiungi tu qui sotto.</p>
      <div id="box-compleanni"><p class="vuoto">Caricamento…</p></div>
    </div>
    ` : ''}

    <div class="carta">
      <h2>${_hIco(ICO.musica)}Notifica live TikTok</h2>
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

      <hr class="separatore">
      <p class="suggerimento"><strong class="primo-piano">Nuovo post su TikTok:</strong> il rilevamento automatico dei post
      dal server non è possibile. Usa lo stesso webhook con corpo <code>{"azione":"tiktok-post","url":"…"}</code>
      (la tua automazione lo chiama quando pubblichi).</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.tv)}Nuovo video su YouTube</h2>
      <p>Quando esce un <strong class="primo-piano">nuovo video</strong> sul tuo canale YouTube, avviso il gruppo Telegram
      (e, se vuoi, la chat Twitch). Funziona con il feed pubblico di YouTube: <strong>affidabile e senza chiavi</strong>.</p>

      <label class="campo" for="inp-yt-canale">Il tuo canale YouTube</label>
      <input type="text" id="inp-yt-canale" class="campo-largo" placeholder="@iltuohandle · oppure l'URL o l'ID (UC…) del canale" value="${esc(ytc.canale || '')}">
      <p class="suggerimento">Va bene l'<code>@handle</code>, l'URL del canale, o l'ID <code>UC…</code>. Lo risolvo io.</p>

      <label class="campo spazio-sopra" for="inp-yt-apikey">La tua chiave API YouTube <span class="suggerimento">(facoltativa)</span></label>
      <input type="password" id="inp-yt-apikey" class="campo-largo" placeholder="${ytc.apiKeySet ? '•••••••• (impostata)' : 'YouTube Data API v3 — lascia vuoto per usare l\'RSS'}" autocomplete="off">
      <p class="suggerimento">Senza chiave uso il <strong>feed RSS pubblico</strong> (va benissimo). Con la tua chiave (<em>YouTube Data API v3</em>,
      da <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud</a>) la rilevazione è ancora più affidabile.
      ${ytc.apiKeySet ? '<a href="#" id="btn-yt-apikey-rimuovi">Rimuovi la chiave</a>' : ''}</p>

      <label class="campo spazio-sopra" for="txt-yt-messaggio">Messaggio dell'avviso</label>
      <textarea id="txt-yt-messaggio" rows="4" placeholder="${esc('📺 {nome} ha caricato un nuovo video su YouTube!\n\n{titolo}\n👉 {link}')}">${esc(ytc.messaggio || '')}</textarea>
      <p class="suggerimento">Segnaposto: <code>{nome}</code> <code>{titolo}</code> <code>{link}</code>. Lascia vuoto per usare quello standard.</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-yt-attivo" ${ytc.attivo ? 'checked' : ''}>
        <label for="chk-yt-attivo">Avvisami quando esce un nuovo video</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-yt-chat" ${ytc.annunciaChat ? 'checked' : ''}>
        <label for="chk-yt-chat">Annuncia anche nella chat Twitch</label>
      </div>

      <p class="spazio-sopra">
        <button class="btn" id="btn-yt-salva">Salva</button>
      </p>
      <p class="suggerimento">Il controllo parte ogni ~10 minuti; il primo giro serve solo a memorizzare l'ultimo video (non avvisa).</p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.fotocamera)}Nuovo post su Instagram</h2>
      <p>Quando pubblichi su <strong class="primo-piano">Instagram</strong>, avviso il gruppo Telegram (e, se vuoi, la chat Twitch).
      Instagram non ha un feed pubblico, quindi serve la <strong>tua API</strong>: l'<em>Instagram Graph API</em> (account Business/Creator
      collegato a una Pagina Facebook).</p>

      <label class="campo" for="inp-ig-userid">ID account Instagram</label>
      <input type="text" id="inp-ig-userid" class="campo-largo" placeholder="es. 17841400000000000" value="${esc(igc.userId || '')}">
      <label class="campo spazio-sopra" for="inp-ig-token">Token di accesso (Graph API)</label>
      <input type="password" id="inp-ig-token" class="campo-largo" placeholder="${igc.tokenSet ? '•••••••• (impostato)' : 'token a lunga durata'}" autocomplete="off">
      <p class="suggerimento">Li ottieni creando un'app su <a href="https://developers.facebook.com/" target="_blank" rel="noopener">Meta for Developers</a>
      e collegando il tuo account IG Business. ${igc.tokenSet ? '<a href="#" id="btn-ig-token-rimuovi">Rimuovi il token</a>' : ''}</p>

      <label class="campo spazio-sopra" for="txt-ig-messaggio">Messaggio dell'avviso</label>
      <textarea id="txt-ig-messaggio" rows="4" placeholder="${esc('📸 {nome} ha un nuovo post su Instagram!\n\n{titolo}\n👉 {link}')}">${esc(igc.messaggio || '')}</textarea>
      <p class="suggerimento">Segnaposto: <code>{nome}</code> <code>{titolo}</code> (didascalia) <code>{link}</code>.</p>

      <div class="riga-check spazio-sopra">
        <input type="checkbox" id="chk-ig-attivo" ${igc.attivo ? 'checked' : ''}>
        <label for="chk-ig-attivo">Avvisami quando pubblico un nuovo post</label>
      </div>
      <div class="riga-check">
        <input type="checkbox" id="chk-ig-chat" ${igc.annunciaChat ? 'checked' : ''}>
        <label for="chk-ig-chat">Annuncia anche nella chat Twitch</label>
      </div>

      <p class="spazio-sopra">
        <button class="btn" id="btn-ig-salva">Salva</button>
        <button class="btn secondario" id="btn-ig-prova">Prova le credenziali</button>
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
      <h2>${_hIco(ICO.divieto)}Parole vietate</h2>
      <p>Una per riga. Il bot <strong class="primo-piano">non le dirà mai</strong> e richiama chi le usa in chat.</p>
      <label class="campo" for="txt-vietate">Elenco parole vietate</label>
      <textarea id="txt-vietate" placeholder="una parola per riga">${esc(s.paroleVietate.join('\n'))}</textarea>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-regole">Salva</button></p>
    </div>

    <div class="carta">
      <h2>${_hIco(ICO.scudo)}Antispam automatico</h2>
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
      <h2>${_hIco(ICO.grafico)}Statistiche degli ultimi 7 giorni</h2>
      <div class="griglia-stat" id="griglia-stat"><div class="vuoto">Caricamento…</div></div>
      <h3>Top chatters</h3>
      <ul class="lista-voci" id="lista-chatters"><li class="vuoto">Caricamento…</li></ul>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.cervello)}La memoria del bot</h2>
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

  // gestione abbonamento (portale clienti Stripe)
  document.getElementById('btn-portale-abbonamento')?.addEventListener('click', () => conErrore(async () => {
    const r = await api('/api/abbonamento/portale', { method: 'POST', body: {} });
    if (r?.url) location.href = r.url;
  }));

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
      internet: document.getElementById('chk-internet').checked,
      frasi: righe(document.getElementById('txt-frasi').value),
    }, 'Personalità salvata 🎭');
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
    toast('Regola aggiunta ✍️');
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

  // personalizzazione punti/classifica
  document.getElementById('btn-salva-punti')?.addEventListener('click', () => conErrore(async () => {
    const v = (id) => Number(document.getElementById(id).value);
    await salvaImpostazioni({ punti: {
      perMessaggio: v('pt-perMessaggio'), ogniSecondi: v('pt-ogniSecondi'),
      trivia: v('pt-trivia'), duello: v('pt-duello'),
      slotCosto: v('pt-slotCosto'), slotVinci: v('pt-slotVinci'),
      slotCoppia: v('pt-slotCoppia'), topN: v('pt-topN'),
    } }, 'Punti aggiornati 🏅');
  }));

  // manche automatiche
  document.getElementById('btn-salva-manche')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({ manche: {
      attivo: document.getElementById('chk-manche').checked,
      minMin: Number(document.getElementById('mn-min').value),
      maxMin: Number(document.getElementById('mn-max').value),
      soloLive: document.getElementById('chk-manche-live').checked,
    } }, 'Manche salvate 🎲');
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
      if (!body.domande.length) { toast('Aggiungi almeno una domanda con risposta.', 'errore'); return; }
    } else {
      body.parole = document.getElementById('gioco-parole').value.split('\n').map((p) => p.trim()).filter(Boolean);
      if (!body.parole.length) { toast('Aggiungi almeno una parola.', 'errore'); return; }
    }
    await api('/api/streamer/giochi', { method: 'POST', body });
    document.getElementById('gioco-nome').value = '';
    document.getElementById('gioco-domande').value = '';
    document.getElementById('gioco-parole').value = '';
    toast('Gioco creato! 🕹️');
    caricaGiochi();
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
      if (r.avviso) mostraAvvisoCita(r.avviso); else if (r.citazioni?.length) mostraAvvisoCita('');
      toast(r.citazioni?.length ? `Trovate ${r.citazioni.length} possibili citazioni — controllale e importa 👀`
        : (r.avviso ? 'Quel link disegna le frasi col JavaScript — usa il bottone magico 📌' : 'Nessuna citazione trovata in quel link 🤔'),
        r.citazioni?.length ? 'ok' : 'errore');
    } finally { btn.disabled = false; btn.textContent = orig; }
  }));

  // mostra/nasconde l'avviso "hai incollato il guscio senza JS"
  const mostraAvvisoCita = (msg) => {
    const el = document.getElementById('import-cita-avviso');
    if (!el) return;
    if (msg) { el.innerHTML = '⚠️ ' + msg; el.hidden = false; } else { el.hidden = true; el.textContent = ''; }
  };

  // il bookmarklet "Prendi le quote da x.la": lo si trascina nei preferiti
  const bmXla = document.getElementById('bm-xla');
  if (bmXla) {
    bmXla.href = bookmarkletXla;
    // cliccato QUI (sul bot) non serve: va aperto su x.la. Spieghiamo invece di navigare.
    bmXla.addEventListener('click', (e) => { e.preventDefault(); toast('Trascinami nella barra dei preferiti, poi cliccami mentre sei sulla tua pagina x.la 🙂'); });
  }
  document.getElementById('bm-xla-copia')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(bookmarkletXla); toast('Codice copiato. Crea un preferito e incollalo come indirizzo 📌'); }
    catch { window.prompt('Copia con Ctrl+C, poi crea un preferito con questo indirizzo:', bookmarkletXla); }
  });

  // citazioni: riconosce (testo/autore/data, formato x.la) e importa
  document.getElementById('btn-importa-citazioni')?.addEventListener('click', () => conErrore(async () => {
    const testo = document.getElementById('txt-import-citazioni').value || '';
    const esito = document.getElementById('import-cita-esito');
    if (!testo.trim()) { toast('Incolla prima qualche citazione.', 'errore'); return; }
    const a = await api('/api/streamer/citazioni/analizza', { method: 'POST', body: { testo } });
    const citazioni = a.citazioni || [];
    if (!citazioni.length) {
      if (a.avviso) mostraAvvisoCita(a.avviso);
      toast(a.avviso ? 'Hai incollato il guscio di x.la, non le frasi — leggi qui sotto 👇' : 'Non ho riconosciuto nessuna citazione 🤔', 'errore');
      return;
    }
    mostraAvvisoCita('');
    const conAutore = citazioni.filter((q) => q.autore).length;
    const conData = citazioni.filter((q) => q.data).length;
    const r = await api('/api/streamer/citazioni/importa', { method: 'POST', body: { citazioni } });
    document.getElementById('txt-import-citazioni').value = '';
    if (esito) esito.textContent = `${r.aggiunte} importate (${conAutore} con autore, ${conData} con data)` + (r.saltate ? ` · ${r.saltate} doppioni` : '');
    toast(`Importate ${r.aggiunte} citazioni con nome e data 💬`);
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
    toast('Account Telegram scollegato.');
    stato = await api('/api/me'); render();
  }); });
  document.getElementById('chk-tg-proattiva')?.addEventListener('change', (ev) => conErrore(async () => {
    await salvaImpostazioni({ proattivoTg: ev.target.checked },
      ev.target.checked ? 'Ok, ogni tanto ti scriverò io 💜' : 'Non ti scriverò più per prima.');
  }));

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

  document.getElementById('btn-yt-salva')?.addEventListener('click', () => conErrore(async () => {
    const yt = {
      canale: (document.getElementById('inp-yt-canale').value || '').trim(),
      attivo: document.getElementById('chk-yt-attivo').checked,
      annunciaChat: document.getElementById('chk-yt-chat').checked,
      messaggio: document.getElementById('txt-yt-messaggio')?.value || '',
    };
    const ak = (document.getElementById('inp-yt-apikey')?.value || '').trim();
    if (ak) yt.apiKey = ak;   // vuoto = mantieni quella salvata
    await salvaImpostazioni({ youtube: yt }, 'YouTube salvato 📺');
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
    await salvaImpostazioni({ instagram: ig }, 'Instagram salvato 📸');
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
    if (esito) esito.innerHTML = r && r.ok ? '🟢 Funziona!' : `🔴 ${esc((r && r.motivo) || 'errore')}`;
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
    await salvaImpostazioni({ cambioCategoria: { attivo, trigger, annuncia } }, 'Comando categoria salvato 🎮');
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
    await salvaImpostazioni({ cambioTitolo: { attivo, trigger, annuncia } }, 'Comando titolo salvato 📝');
    const et = document.getElementById('etichetta-titolo');
    if (et) et.textContent = attivo ? 'Attivo' : 'Spento';
  }));

  // --- "impara mentre parlo": interruttore che salva subito ---
  document.getElementById('chk-impara')?.addEventListener('change', (ev) => {
    const acceso = ev.target.checked;
    const et = document.getElementById('etichetta-impara');
    conErrore(async () => {
      try {
        await salvaImpostazioni({ imparaVoce: { attivo: acceso } }, acceso ? 'Ora imparo mentre parli 🎧' : 'Ascolto per imparare spento.');
        if (et) et.textContent = acceso ? 'Attivo' : 'Spento';
      } catch (e) { ev.target.checked = !acceso; throw e; }
    });
  });

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
  if (id === 'stato') { caricaPasskey(); caricaModeratori(); caricaRetePanoramica(); }
  if (id === 'personalita') caricaGuide();
  if (id === 'conoscenza') caricaConoscenza();
  if (id === 'clip') caricaClip();
  if (id === 'musica') caricaSpotify();
  if (id === 'sondaggi') caricaSondaggi();
  if (id === 'giveaway') caricaGiveaway();
  if (id === 'penitenze') caricaPenitenze();
  if (id === 'alert') caricaAlert();
  if (id === 'effetti') { caricaEffetti(); caricaPremi(); caricaSuoniPremi(); }
  if (id === 'moduli') caricaModuli();
  if (id === 'memoria') caricaStatistiche();
  if (id === 'giochi') { caricaClassifica(); caricaCitazioni(); caricaGiochi(); }
  if (id === 'notifiche') caricaCompleanni();
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
// giochi personalizzati (creati dallo streamer)
async function caricaGiochi() {
  const ul = document.getElementById('lista-giochi');
  if (!ul) return;
  try {
    const giochi = await api('/api/streamer/giochi');
    const et = { trivia: '🧠 trivia', parola: '⚡ parola' };
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
        if (!confirm('Eliminare questo gioco?')) return;
        await api('/api/streamer/giochi/' + del.dataset.giocoElimina, { method: 'DELETE' });
        toast('Gioco eliminato.'); caricaGiochi();
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
    const fmtD = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
    ul.innerHTML = voci.length
      ? voci.map((q) => {
        const meta = [q.autore ? '@' + esc(q.autore) : '', fmtD(q.data)].filter(Boolean).join(' · ');
        return `<li>
          <div class="testo-voce"><span class="domanda">#${q.n}</span> <span class="risposta">${esc(q.text)}</span>${meta ? ` <span class="suggerimento">— ${meta}</span>` : ''}</div>
          <button class="btn secondario mini" data-cita-rimuovi="${q.n}">Rimuovi</button>
        </li>`;
      }).join('')
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
        Serve il permesso <strong class="primo-piano">Gestione canale</strong> (lo concedi da <strong>Durante la diretta → Ascolto vocale</strong>).</p>`;
    case 'titolo':
      return `
        <label class="campo">Nuovo titolo (puoi usare le variabili, es. <code>$gioco</code>, <code>$args</code>)</label>
        <textarea data-campo="testo" data-var-target placeholder="es. In diretta: $gioco con la community! 🎮">${esc(a.testo || '')}</textarea>
        ${pillole}
        <div class="riga-check spazio-sopra">
          <input type="checkbox" data-campo="annuncia" ${a.annuncia !== false ? 'checked' : ''}>
          <label>Annuncia il cambio in chat</label>
        </div>
        <p class="suggerimento">Imposta il titolo dello stream su Twitch (max 140 caratteri).
        Serve il permesso <strong class="primo-piano">Gestione canale</strong> (lo concedi da <strong>Durante la diretta → Ascolto vocale</strong>).</p>`;
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
        <p class="suggerimento">Aggiunge il brano alla coda del tuo Spotify. Richiede l'add-on <strong class="primo-piano">Richieste Musicali</strong> e Spotify collegato in <strong>Durante la diretta → Musica</strong>.</p>`;
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
      <h2>${_hIco(ICO.avviso)}Configurazione incompleta</h2>
      <p>Mancano nel file <code>.env</code>: ${stato.missing.map((m) => `<code>${esc(m)}</code>`).join(', ')}.
      Il bot non parte finché non le compili.</p>
    </div>` : '';

  const st = stato.status || {};
  return `
    <div class="carta">
      <h2>${_hIco(ICO.corona)}Pannello andryxify</h2>
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
      <h2>${_hIco(ICO.cuore)}Anima di SocialBot</h2>
      <p>La personalità <strong class="primo-piano">condivisa</strong>: un solo carattere, coerente su tutti
      i canali (in chat indossa poi il nome e il tono di ognuno). Gli utenti restano a compartimenti stagni:
      qui vedi solo <em>quanti amici</em> e i più affini, mai cosa hanno scritto o dove.</p>
      <div id="anima-box"><p class="vuoto">Caricamento…</p></div>
    </div>
    <div class="carta">
      <h2>${_hIco(ICO.cervello)}Cervello — modello IA</h2>
      <p>Il modello linguistico locale è <strong class="primo-piano">condiviso</strong> da tutti i canali.
      Cambiandolo qui, il cervello lo sostituisce <strong>a caldo</strong> (scarica + carica: può metterci
      qualche minuto; nel frattempo la chat usa il motore veloce di riserva).</p>
      <div id="llm-box"><p class="vuoto">Caricamento…</p></div>
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
  catch { if (primo) box.innerHTML = '<p class="vuoto">Non disponibile ora.</p>'; return; }
  const pct = (x) => Math.round((x || 0) * 100) + '%';
  const num = 'font-size:1.7em;font-weight:700;line-height:1';
  const nonSo = (d.non_so || []).slice(0, 4);
  const N = (v, suff = '') => `<span data-conta="${v}"${suff ? ` data-suff="${suff}"` : ''}>${v}${suff}</span>`;
  box.innerHTML = `
    <div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:2px">
      <div><div style="${num}">${N(d.nodi || 0)}</div><small>nodi appresi</small></div>
      <div><div style="${num}">${N(d.solidi || 0)}</div><small>sa rispondere</small></div>
      <div><div style="${num}">${N(d.corpus || 0)}</div><small>nella sua mente</small></div>
      <div><div style="${num}">${N(Math.round((d.fiducia || 0) * 100), '%')}</div><small>fiducia</small></div>
      <div><div style="${num}">${N(Math.round((d.curiosita || 0) * 100), '%')}</div><small>curiosità</small></div>
    </div>
    ${d.pensiero ? `<p class="spazio-sopra">💭 <em>${esc(d.pensiero)}</em></p>` : ''}
    ${d.ragiona ? `<p class="suggerimento spazio-sopra">🧩 Cervello logico (non statistico): <strong>${d.ragiona.fatti || 0}</strong> fatti,
      <strong>${d.ragiona.dedotti || 0}</strong> dedotti da sé ragionando${(d.ragiona.contraddizioni || []).length ? ` · ⚠️ ${d.ragiona.contraddizioni.length} incoerenze notate` : ''}.</p>` : ''}
    ${nonSo.length
      ? `<p class="suggerimento spazio-sopra">Ultime cose che <strong>non sapeva</strong> (le imparerà col tempo): ${nonSo.map((t) => `«${esc(t)}»`).join(' · ')}</p>`
      : '<p class="suggerimento spazio-sopra">Nessuna lacuna recente: sta rispondendo bene. 🙂</p>'}
    <p class="spazio-sopra"><button class="btn secondario mini" id="btn-forgia">📚 Studia ora</button>
      &nbsp;<a class="suggerimento" href="/api/streamer/corpus" download>📦 Scarica il dataset della sua mente</a></p>
    <p class="suggerimento">«Studia ora»: cerca da sé le sue lacune online, ci ragiona su e le distilla nel suo motore.
    Il «dataset» è la sua mente: su un Mac Apple Silicon lo trasformi in un vero modello tutto suo con
    <code>forgia/forgia.sh</code> (vedi <code>forgia/README.md</code>), poi lo ricolleghi come "maestro".</p>`;
  if (primo) animaNumeri(box);   // conta su dallo 0 solo alla prima comparsa (non a ogni refresh)
  document.getElementById('btn-forgia')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/streamer/forgia', { method: 'POST', body: {} });
    toast('Ci sto lavorando 📚 — studio le mie lacune e distillo. Torna tra poco.');
  }));
}

// carica e disegna la gestione del modello IA (solo operatore)
async function caricaLLM() {
  const box = document.getElementById('llm-box');
  if (!box) return;
  let d;
  try { d = await api('/api/admin/llm'); } catch (e) { box.innerHTML = `<p class="vuoto">Errore: ${esc(e.message)}</p>`; return; }
  const s = d.stato || {};
  const statoTxt = { pronto: '🟢 pronto', carico: '🟡 sto caricando…', spento: '🔴 spento', errore: '🔴 errore' }[s.stato] || ('⚪ ' + (s.stato || 'sconosciuto'));
  const scelta = d.scelta || {};
  const selVal = scelta.url ? 'url' : (scelta.modello || 'auto');
  const opts = (d.modelli || []).map((m) => `<option value="${esc(m.id)}" ${selVal === m.id ? 'selected' : ''}>${esc(m.nome)}</option>`).join('');
  const ep = scelta.endpoint || {};
  const eps = s.endpoint || {};
  const epBadge = eps.configurato
    ? (eps.ok === true ? '🟢 collegato' : eps.ok === false ? '🔴 non risponde' : '🟡 da provare')
    : '⚪ non collegato';
  const rete = s.rete || {};
  const pct = (x) => Math.round((x || 0) * 100) + '%';
  const stile = { hr: 'border:0;border-top:1px solid currentColor;opacity:.15;margin:20px 0', num: 'font-size:1.7em;font-weight:700;line-height:1' };
  const locali = d.modelliLocali || [];
  const selFile = scelta.file || '';
  const libItems = locali.length
    ? locali.map((m) => `<li><span>${esc(m.nome)} <span class="suggerimento">${m.mb} MB</span>${selFile === m.nome ? ' <span class="badge verde">in uso</span>' : ''}</span> <span>${selFile === m.nome ? '' : `<a href="#" class="usa-modello" data-nome="${esc(m.nome)}">usa</a> · `}<a href="#" class="rimuovi-modello" data-nome="${esc(m.nome)}" title="Elimina">✕</a></span></li>`).join('')
    : '<li class="vuoto">Nessun modello caricato a mano. Sopra usi quelli automatici; qui sotto carichi un GGUF tuo.</li>';
  box.innerHTML = `
    <p class="suggerimento">🔒 <strong>Riservato a te</strong>: il modello del server e il maestro esterno li vedi e li cambi <strong>solo tu</strong> (andryxify). Nessun altro streamer o moderatore ha accesso a questa sezione.</p>
    <p>Stato: <strong>${statoTxt}</strong> &nbsp; In memoria: <code>${esc(s.modello || '—')}</code>${s.motivo ? ` <span class="suggerimento">(${esc(s.motivo)})</span>` : ''}</p>
    <label class="campo" for="sel-llm">Modello locale (sul server)</label>
    <select id="sel-llm" class="campo-largo">
      ${opts}
      <option value="url" ${selVal === 'url' ? 'selected' : ''}>URL personalizzato (GGUF)…</option>
    </select>
    <input type="text" id="inp-llm-url" class="campo-largo spazio-sopra" placeholder="https://…gguf" value="${esc(scelta.url || '')}" ${selVal === 'url' ? '' : 'hidden'}>
    <p class="spazio-sopra">
      <button class="btn" id="btn-llm-applica">Applica e ricarica</button>
      <button class="btn secondario" id="btn-llm-refresh">Aggiorna stato</button>
    </p>
    <p class="suggerimento">"Senza freni" = modello <em>abliterated</em> (nessun rifiuto). La moderazione del bot e le <strong>parole vietate</strong> filtrano comunque l'uscita.</p>

    <hr style="${stile.hr}">
    <h3>${_hIco(ICO.pacco)}Modelli sul server</h3>
    <p class="suggerimento">Carica un <strong>GGUF</strong> dal tuo computer (es. quello forgiato sul Mac) e usalo qui. Qui vedi anche i modelli
    scaricati automaticamente. ⚠️ Pesano vari GB: occhio allo <strong>spazio su disco</strong> del server (elimina quelli che non usi).</p>
    <ul class="lista-voci" id="lista-modelli">${libItems}</ul>
    <p class="spazio-sopra">
      <input type="file" id="inp-modello-file" accept=".gguf">
      <button class="btn secondario" id="btn-modello-upload">Carica sul server</button>
      <span id="modello-upload-stato" class="suggerimento"></span>
    </p>

    <hr style="${stile.hr}">
    <h3>Maestro esterno — LM Studio / Ollama &nbsp;<span class="suggerimento">${epBadge}</span></h3>
    <p class="suggerimento">Collega un modello che gira sul <strong>tuo PC</strong> (di solito più potente del server): il bot lo usa come <em>maestro</em> e la piccola rete impara da <strong>ogni</strong> sua risposta. Dev'essere raggiungibile dal server: stessa LAN, IP pubblico, o un tunnel tipo <code>cloudflared</code>/<code>ngrok</code>.</p>
    <label class="campo" for="ep-url">Indirizzo (URL)</label>
    <input type="text" id="ep-url" class="campo-largo" placeholder="http://IP:1234/v1" value="${esc(ep.url || '')}">
    <label class="campo" for="ep-mod">Nome del modello <span class="suggerimento">(facoltativo)</span></label>
    <input type="text" id="ep-mod" class="campo-largo" placeholder="quello caricato in LM Studio" value="${esc(ep.modello || '')}">
    <label class="campo" for="ep-key">Chiave API <span class="suggerimento">(se richiesta)</span></label>
    <input type="password" id="ep-key" class="campo-largo" placeholder="(vuoto se non serve)" value="${esc(ep.chiave || '')}">
    <label class="spazio-sopra" style="display:flex;gap:8px;align-items:flex-start;cursor:pointer">
      <input type="checkbox" id="ep-solo" ${ep.solo ? 'checked' : ''}>
      <span>Usa <strong>solo</strong> l'endpoint — non caricare il modello locale (libera la RAM del server)</span>
    </label>
    <p class="spazio-sopra">
      <button class="btn" id="btn-ep-salva">Collega</button>
      <button class="btn secondario" id="btn-ep-prova">Prova connessione</button>
      <button class="btn secondario" id="btn-ep-stacca">Scollega</button>
    </p>
    <p id="ep-esito" class="suggerimento"></p>

    <hr style="${stile.hr}">
    <h3>${_hIco(ICO.germoglio)}La piccola rete che impara</h3>
    <p class="suggerimento">Il motore veloce che <strong>cresce da solo</strong>: risponde all'istante a ciò che ha già imparato e, quando incontra qualcosa di nuovo, lo chiede al maestro e se lo segna. "Curiosità" alta = sente di avere lacune; "fiducia" = quanto si fida di ciò che sa.</p>
    <div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:6px">
      <div><div style="${stile.num}">${rete.nodi || 0}</div><small>nodi appresi</small></div>
      <div><div style="${stile.num}">${rete.solidi || 0}</div><small>sa rispondere</small></div>
      <div><div style="${stile.num}">${pct(rete.fiducia)}</div><small>fiducia</small></div>
      <div><div style="${stile.num}">${pct(rete.curiosita)}</div><small>curiosità</small></div>
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
    toast('Sto cambiando modello 🧠 — può metterci qualche minuto (scarica + carica).');
    setTimeout(caricaLLM, 2500);
  }));
  document.getElementById('btn-ep-salva')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/admin/llm', { method: 'POST', body: { endpoint: raccogliEp() } });
    toast('Maestro collegato 🎓 — la rete inizierà a imparare da lui.');
    setTimeout(caricaLLM, 1500);
  }));
  document.getElementById('btn-ep-stacca')?.addEventListener('click', () => conErrore(async () => {
    await api('/api/admin/llm', { method: 'POST', body: { endpoint: { url: '' } } });
    toast('Maestro scollegato.');
    setTimeout(caricaLLM, 800);
  }));
  document.getElementById('btn-ep-prova')?.addEventListener('click', () => conErrore(async () => {
    const esito = document.getElementById('ep-esito');
    if (esito) esito.textContent = 'Provo la connessione…';
    const r = await api('/api/admin/llm/prova', { method: 'POST', body: { endpoint: raccogliEp() } });
    if (!esito) return;
    esito.innerHTML = r && r.ok
      ? `🟢 Risponde! ${r.modello ? `(${esc(r.modello)}) ` : ''}<em>«${esc(r.campione || 'ok')}»</em>`
      : `🔴 Non risponde: ${esc((r && r.motivo) || 'errore')}`;
  }));
  // libreria modelli: usa / elimina / carica
  document.querySelectorAll('#lista-modelli .usa-modello').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); conErrore(async () => {
    await api('/api/admin/llm', { method: 'POST', body: { file: a.dataset.nome } });
    toast('Carico il modello 🧠 — può metterci un po\'.');
    setTimeout(caricaLLM, 2500);
  }); }));
  document.querySelectorAll('#lista-modelli .rimuovi-modello').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); conErrore(async () => {
    if (!confirm('Eliminare questo modello dal server?')) return;
    await api('/api/admin/llm/files/' + encodeURIComponent(a.dataset.nome), { method: 'DELETE' });
    toast('Modello eliminato.');
    caricaLLM();
  }); }));
  document.getElementById('btn-modello-upload')?.addEventListener('click', () => caricaModelloFile());
}

// upload di un GGUF con barra di avanzamento (i file sono grandi: XHR per il progresso)
function caricaModelloFile() {
  const inp = document.getElementById('inp-modello-file');
  const st = document.getElementById('modello-upload-stato');
  const f = inp && inp.files && inp.files[0];
  if (!f) { toast('Scegli un file .gguf', 'errore'); return; }
  if (!/\.gguf$/i.test(f.name)) { toast('Serve un file .gguf', 'errore'); return; }
  if (DEMO) { toast('In demo non carico davvero 😊'); return; }
  const xhr = new XMLHttpRequest();
  const fd = new FormData();
  fd.append('file', f);
  xhr.open('POST', '/api/admin/llm/upload');
  xhr.upload.onprogress = (e) => { if (e.lengthComputable && st) st.textContent = `Carico… ${Math.round(e.loaded * 100 / e.total)}%`; };
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      if (st) st.textContent = 'Caricato ✓';
      toast('Modello caricato 📦 — ora premi «usa» per attivarlo.');
      caricaLLM();
    } else {
      let m = 'errore'; try { m = JSON.parse(xhr.responseText).errore || m; } catch { /* niente */ }
      if (st) st.textContent = 'Errore: ' + m;
      toast('Upload fallito: ' + m, 'errore');
    }
  };
  xhr.onerror = () => { if (st) st.textContent = 'Errore di rete'; toast('Upload fallito', 'errore'); };
  if (st) st.textContent = 'Carico… 0%';
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
