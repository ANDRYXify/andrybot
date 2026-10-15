// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
import { creaCameraRemota, QUALITA_REMOTA } from '/js/studio-camera-remota.js';
import { prossimoZoom, nomeCamera, orientamentoStorto } from '/js/studio-modello.js';

const LINGUA = (() => { const q = new URLSearchParams(location.search).get('lang') || navigator.language || 'it'; const l = String(q).slice(0, 2).toLowerCase(); return ['it', 'en', 'es'].includes(l) ? l : 'en'; })();
const L = (it, en, es) => (LINGUA === 'en' ? en : LINGUA === 'es' ? es : it);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICO = {
  mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  muto: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16"/>',
  gira: '<path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2"/><path d="M21 4v5h-5M3 20v-5h5"/>',
  altro: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  stella: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  giu: '<path d="M6 9l6 6 6-6"/>',
};
const ico = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k] || ''}</svg>`;

const pezzi = location.pathname.split('/').filter(Boolean);
const TOKEN = pezzi[0] === 'cam' && pezzi[1] ? decodeURIComponent(pezzi[1]) : '';
const IO = new URLSearchParams(location.search).has('io');
const MEMO = 'sb-cam';
const TIENI_MS = 1500;

const S = {
  canale: '', id: '', chiave: '', nome: '', comanda: false, regia: false, rete: 'attesa', live: false,
  stream: null, facing: '', camId: '', muto: false, zoom: 1, hw: null, torcia: false, torciaAccesa: false, qual: '720p30',
  tally: { onda: false, anteprima: false, live: false, formato: 'o', protagonista: '' }, scene: [], inOnda: '',
  chat: [], chatAperta: false, zoomRegia: 1, flusso: null, camera: null, foglio: '', wake: null, cams: [],
  batteria: null, riprendi: null, avvisoT: 0, tieni: 0, storto: '', fermo: false, giro: '', pronto: false, segnali: false,
};

function memoria() {
  try { const m = JSON.parse(localStorage.getItem(MEMO) || 'null'); if (m && typeof m === 'object' && m.canali && typeof m.canali === 'object') return m; } catch (e) { void e; }
  return { ultimo: '', canali: {}, facing: {} };
}
function scriviMemoria(m) { try { localStorage.setItem(MEMO, JSON.stringify(m)); } catch (e) { void e; } }
function ricorda(d) { const m = memoria(); m.canali[d.canale] = { id: d.id, chiave: d.chiave, nome: d.nome }; m.ultimo = d.canale; scriviMemoria(m); }
function dimentica(canale) { const m = memoria(); delete m.canali[canale]; if (m.ultimo === canale) m.ultimo = Object.keys(m.canali)[0] || ''; scriviMemoria(m); }

async function api(percorso, corpo, tieni) {
  const r = await fetch(percorso, { method: corpo ? 'POST' : 'GET', headers: corpo ? { 'Content-Type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined, credentials: 'same-origin', cache: 'no-store', keepalive: !!tieni });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.errore || L('Qualcosa non è andato: riprova.', 'Something went wrong: try again.', 'Algo no ha ido bien: inténtalo de nuevo.')); e.stato = r.status; e.dati = d; throw e; }
  return d;
}
const cred = () => ({ canale: S.canale, id: S.id, chiave: S.chiave });

function dici(testo, male) { const m = $('msg'); m.className = 'msg' + (male ? ' err' : ''); m.textContent = testo || ''; }
function avviso(testo, ms = 4000, errore = false) {
  const el = $('avviso'); if (!el) return;
  el.textContent = testo || ''; el.hidden = !testo; el.classList.toggle('errore', !!errore);
  clearTimeout(S.avvisoT);
  if (testo && ms) S.avvisoT = setTimeout(() => { el.hidden = true; }, ms);
}
const nomeDiSerie = () => (/iPad|Tablet/i.test(navigator.userAgent) ? 'Tablet' : (/iPhone|Android|Mobile/i.test(navigator.userAgent) ? L('Telefono', 'Phone', 'Teléfono') : 'Computer'));

function testi() {
  document.documentElement.lang = LINGUA;
  $('titolo').textContent = IO ? L('Il tuo telefono nella tua regia', 'Your phone in your control room', 'Tu teléfono en tu control') : L('Questo telefono come fotocamera', 'This phone as a camera', 'Este teléfono como cámara');
  $('intro').innerHTML = IO
    ? L('Diventa una fotocamera della regia aperta sul computer. Da qui mandi video e voce, cambi scena e leggi la chat; la diretta la fa il computer.', 'It becomes a camera of the control room open on the computer. From here you send video and voice, switch scenes and read the chat; the computer runs the stream.', 'Se convierte en una cámara del control abierto en el ordenador. Desde aquí mandas vídeo y voz, cambias de escena y lees el chat; el directo lo hace el ordenador.')
    : L('Diventa un\'inquadratura della diretta di <strong id="canale">questo canale</strong>. La regia resta al computer: da qui mandi il video e la voce, e vedi quando sei in onda.', 'It becomes a shot in the stream of <strong id="canale">this channel</strong>. The control room stays on the computer: from here you send video and voice, and see when you are on air.', 'Se convierte en un plano del directo de <strong id="canale">este canal</strong>. El control se queda en el ordenador: desde aquí mandas el vídeo y la voz, y ves cuándo estás en el aire.');
  $('t-codice').textContent = L('Il codice che vedi sul computer', 'The code you see on the computer', 'El código que ves en el ordenador');
  $('t-nome').textContent = L('Come si chiama questo dispositivo', 'What this device is called', 'Cómo se llama este dispositivo');
  $('collega').textContent = L('Collega', 'Connect', 'Conectar');
  $('t-privacy').textContent = L('Il video va dritto al computer della regia, cifrato: noi passiamo solo il saluto fra i due. Qui non si registra niente.', 'The video goes straight to the control room computer, encrypted: we only pass the handshake between the two. Nothing is recorded here.', 'El vídeo va directo al ordenador del control, cifrado: nosotros solo pasamos el saludo entre los dos. Aquí no se graba nada.');
  $('a-privacy').textContent = L('Privacy e sicurezza', 'Privacy and security', 'Privacidad y seguridad');
  document.title = L('Fotocamera della regia', 'Control room camera', 'Cámara del control') + ' | SocialBot';
}

function mostraCodice() {
  S.riprendi = null;
  $('riprendi').hidden = true;
  $('campo-codice').hidden = false;
  $('campo-nome').hidden = false;
  $('collega').hidden = false;
  $('codice').focus?.();
}

async function prepara() {
  testi();
  const m = memoria();
  $('nome').value = m.canali[m.ultimo]?.nome || nomeDiSerie();
  if (TOKEN) {
    try { const i = await api('/api/cam/invito/' + encodeURIComponent(TOKEN)); const c = $('canale'); if (c) c.textContent = i.canale; }
    catch (e) { dici(L('Questo invito è scaduto o è già stato usato: scrivi il codice che vedi sul computer, o chiedi un invito nuovo.', 'This invite has expired or was already used: type the code you see on the computer, or ask for a new invite.', 'Esta invitación ha caducado o ya se ha usado: escribe el código que ves en el ordenador, o pide una invitación nueva.'), true); mostraCodice(); }
    return;
  }
  if (IO) {
    $('collega').textContent = L('Collega il mio telefono', 'Connect my phone', 'Conectar mi teléfono');
    try {
      const io = await api('/api/cam/io');
      const mio = m.canali[io.canale];
      if (mio) { S.riprendi = { canale: io.canale, ...mio }; $('nome').value = mio.nome || $('nome').value; }
    } catch (e) { dici(e.stato === 401 || e.stato === 403 || e.stato === 404 ? L('Per collegare il tuo telefono senza codice devi essere entrato col tuo account: entra, o usa il codice che vedi sul computer.', 'To connect your phone without a code you must be logged in with your account: log in, or use the code you see on the computer.', 'Para conectar tu teléfono sin código tienes que haber entrado con tu cuenta: entra, o usa el código que ves en el ordenador.') : e.message, true); }
    return;
  }
  const ultimo = m.ultimo && m.canali[m.ultimo];
  if (ultimo) {
    const r = $('riprendi');
    r.hidden = false; r.className = 'cam-riprendi';
    r.innerHTML = `<button type="button" class="azione" id="b-riprendi">${esc(L(`Ricollegati a ${m.ultimo} come «${ultimo.nome}»`, `Reconnect to ${m.ultimo} as “${ultimo.nome}”`, `Vuelve a conectarte a ${m.ultimo} como «${ultimo.nome}»`))}</button><button type="button" class="azione" style="background:transparent;color:inherit;border:1px solid currentColor" id="b-codice">${esc(L('Usa un codice nuovo', 'Use a new code', 'Usa un código nuevo'))}</button>`;
    $('campo-nome').hidden = true; $('collega').hidden = true;
    $('b-riprendi').onclick = () => { S.riprendi = { canale: m.ultimo, ...ultimo }; entra(); };
    $('b-codice').onclick = () => mostraCodice();
    return;
  }
  mostraCodice();
}

async function entra() {
  const nome = $('nome').value.trim() || nomeDiSerie();
  $('collega').disabled = true;
  dici(L('Collego…', 'Connecting…', 'Conectando…'));
  try {
    let d;
    if (S.riprendi) d = { ...S.riprendi, comanda: false };
    else if (IO) d = await api('/api/cam/io', { nome });
    else if (TOKEN) d = await api('/api/cam/entra', { token: TOKEN, nome });
    else {
      const codice = $('codice').value.replace(/\D/g, '');
      if (codice.length !== 6) throw new Error(L('Il codice ha sei cifre.', 'The code has six digits.', 'El código tiene seis cifras.'));
      d = await api('/api/cam/entra', { codice, nome });
    }
    ricorda(d);
    if (TOKEN) history.replaceState(null, '', '/cam');
    dici('');
    avvia(d);
  } catch (e) {
    if (S.riprendi && (e.stato === 401 || e.stato === 404)) { dimentica(S.riprendi.canale); dici(L('Questo dispositivo era stato scollegato: serve un codice nuovo.', 'This device had been disconnected: a new code is needed.', 'Este dispositivo se había desconectado: hace falta un código nuevo.'), true); mostraCodice(); }
    else dici(e.message, true);
  } finally { $('collega').disabled = false; }
}

function avvia(d) {
  S.canale = d.canale; S.id = d.id; S.chiave = d.chiave; S.nome = d.nome || ''; S.comanda = !!d.comanda;
  S.fermo = false; S.pronto = false; S.regia = false; S.giro = '';
  $('accendi').hidden = true;
  const m = memoria();
  S.facing = m.facing?.[S.canale] || (IO ? 'user' : 'environment');
  $('entra').hidden = true; $('cam').hidden = false;
  document.body.classList.remove('centrata'); document.body.classList.add('in-cam');
  S.camera = creaCameraRemota({
    trasporto: { manda: (tipo, dati) => api('/api/cam/segnale', { ...cred(), tipo, dati }, tipo === 'fine').catch(() => {}) },
    chiediIce: () => api('/api/cam/ice', cred()),
    suStato: (st) => { const prima = S.rete; S.rete = st.rete; if (st.canale && st.rete === 'collegato') mandaInfo(); if (prima !== S.rete) render(); },
    suMessaggio,
  });
  render();
  ascolta();
  accendi(false);
  tieniAcceso();
  leggiBatteria();
}

function ascolta() {
  if (S.fermo || S.flusso) return;
  S.flusso = window.SB_FLUSSO.apri(async () => {
    let b;
    try { b = (await api('/api/cam/biglietto', cred())).biglietto; }
    catch (e) { if (e.stato === 401 || e.stato === 404) tolto(!S.pronto); throw e; }
    return '/api/cam/eventi?b=' + encodeURIComponent(b);
  }, {
    silenzio: 75000,
    suMessaggio: (m) => { let x = null; try { x = JSON.parse(m.data); } catch (e) { return; } evento(String(x?.e || ''), x?.d || {}); },
    suCaduta: () => {
      if (S.fermo) return;
      S.segnali = false;
      if (S.rete !== 'collegato') avviso(L('Ricollego al server…', 'Reconnecting to the server…', 'Reconectando con el servidor…'), 4000);
      render();
    },
  });
}

function evento(e, d) {
  if (e === 'pronto') { S.pronto = true; S.segnali = true; S.nome = d.nome || S.nome; S.comanda = !!d.comanda; S.live = !!d.live; regia(d.regia, d.giro); }
  else if (e === 'regia') regia(d.c, d.giro);
  else if (e === 'segnale') S.camera?.segnale(d);
  else if (e === 'tu') {
    S.nome = d.nome || S.nome; S.comanda = !!d.comanda;
    const m = memoria(); if (m.canali[S.canale]) { m.canali[S.canale].nome = S.nome; scriviMemoria(m); }
    render();
    avviso(S.comanda ? L('Ora da qui puoi anche fare regia.', 'Now you can also run the show from here.', 'Ahora desde aquí también puedes llevar el control.') : L('La regia ha tolto i comandi a questo dispositivo: resta una fotocamera.', 'The control room removed this device\'s controls: it stays a camera.', 'El control ha quitado los mandos a este dispositivo: sigue siendo una cámara.'));
  }
  else if (e === 'tolto') tolto();
  else if (e === 'altrove') { ferma(); ricollegabile(L('Questa fotocamera si è aperta in un\'altra scheda: la uso lì.', 'This camera was opened in another tab: it is used there.', 'Esta cámara se ha abierto en otra pestaña: se usa allí.'), false); }
  else if (e === 'troppi') { ferma(); ricollegabile(L('Alla regia ci sono già quattro dispositivi collegati: scollegane uno dal computer e riprova.', 'Four devices are already connected to the control room: disconnect one from the computer and try again.', 'Ya hay cuatro dispositivos conectados al control: desconecta uno desde el ordenador y vuelve a intentarlo.'), true); }
}

function regia(c, giro) { S.regia = !!c; S.giro = String(giro || ''); S.camera?.regiaPresente(S.regia, S.giro); render(); }

function ricollegabile(testo, errore) {
  avviso(testo, 0, errore);
  const b = $('accendi');
  b.hidden = false; b.textContent = L('Ricollega questa fotocamera', 'Reconnect this camera', 'Vuelve a conectar esta cámara');
  b.onclick = () => { $('avviso').hidden = true; avvia({ canale: S.canale, id: S.id, chiave: S.chiave, nome: S.nome, comanda: S.comanda }); };
}

function ferma() {
  S.fermo = true;
  S.flusso?.chiudi();
  S.flusso = null;
  S.camera?.chiudi();
  for (const t of S.stream?.getTracks() || []) { try { t.stop(); } catch (e) { void e; } }
  S.stream = null;
  try { S.wake?.release(); } catch (e) { void e; }
  render();
}

function tolto(allAvvio) {
  ferma();
  dimentica(S.canale);
  S.riprendi = null;
  $('cam').hidden = true; $('entra').hidden = false;
  document.body.classList.add('centrata'); document.body.classList.remove('in-cam');
  if (IO && allAvvio) { entra(); return; }
  if (IO) {
    dici(L('La regia ha scollegato questo telefono. Puoi ricollegarlo quando vuoi.', 'The control room disconnected this phone. You can connect it again whenever you like.', 'El control ha desconectado este teléfono. Puedes volver a conectarlo cuando quieras.'), true);
    $('riprendi').hidden = true; $('campo-codice').hidden = true; $('campo-nome').hidden = false; $('collega').hidden = false;
    return;
  }
  dici(allAvvio
    ? L('Questo dispositivo era stato scollegato: serve un codice nuovo.', 'This device had been disconnected: a new code is needed.', 'Este dispositivo se había desconectado: hace falta un código nuevo.')
    : L('Questo dispositivo è stato scollegato dalla regia. Per tornare serve un codice nuovo.', 'This device was disconnected by the control room. A new code is needed to come back.', 'Este dispositivo ha sido desconectado por el control. Para volver hace falta un código nuevo.'), true);
  mostraCodice();
}

function vincoli() {
  const q = QUALITA_REMOTA[S.qual] || QUALITA_REMOTA['720p30'];
  const v = { width: { ideal: q.w }, height: { ideal: q.h }, frameRate: { ideal: q.fps } };
  if (S.camId) v.deviceId = { exact: S.camId }; else v.facingMode = S.facing || 'environment';
  return v;
}

async function chiediVideo() {
  const v = vincoli();
  if (navigator.userAgentData && navigator.mediaDevices.getSupportedConstraints?.().zoom) {
    try { return await navigator.mediaDevices.getUserMedia({ video: { ...v, zoom: true }, audio: false }); } catch (e) { if (e?.name === 'NotAllowedError') throw e; }
  }
  try { return await navigator.mediaDevices.getUserMedia({ video: v, audio: false }); }
  catch (e) { if (S.camId && /Overconstrained|NotFound/.test(e?.name || '')) { S.camId = ''; return navigator.mediaDevices.getUserMedia({ video: vincoli(), audio: false }); } throw e; }
}

async function accendi(daTocco) {
  if (!navigator.mediaDevices?.getUserMedia) { avviso(L('Questo browser non dà la fotocamera: apri la pagina in Chrome o Safari aggiornati.', 'This browser does not give access to the camera: open the page in an up-to-date Chrome or Safari.', 'Este navegador no da la cámara: abre la página en Chrome o Safari actualizados.'), 0, true); return; }
  try {
    const video = await chiediVideo();
    let audio = null;
    try { audio = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); } catch (e) { avviso(L('Il microfono non c\'è o non ha dato il permesso: va solo il video.', 'The microphone is missing or not allowed: only video goes.', 'El micrófono no está o no ha dado permiso: va solo el vídeo.'), 6000, true); }
    const s = new MediaStream([...video.getVideoTracks(), ...(audio ? audio.getAudioTracks() : [])]);
    for (const t of s.getAudioTracks()) t.enabled = !S.muto;
    S.stream = s;
    $('accendi').hidden = true;
    const pv = $('anteprima'); pv.srcObject = s; pv.play?.().catch(() => {});
    pv.onresize = guardaForma;
    leggiCam(); seguiTracce();
    await S.camera.usaStream(s);
    S.camera.regiaPresente(S.regia, S.giro);
    popolaCams();
    mandaInfo();
    render();
  } catch (e) {
    const b = $('accendi');
    b.hidden = false; b.innerHTML = L('Accendi fotocamera e microfono', 'Turn on camera and microphone', 'Enciende cámara y micrófono');
    b.onclick = () => accendi(true);
    if (daTocco || e?.name === 'NotAllowedError') avviso(L('Il telefono non ha dato il permesso per la fotocamera: concedilo nelle impostazioni del browser e tocca di nuovo.', 'The phone did not allow the camera: grant it in the browser settings and tap again.', 'El teléfono no ha dado permiso para la cámara: concédelo en los ajustes del navegador y toca de nuevo.'), 0, true);
  }
}

function tracciaVideo() { return S.stream?.getVideoTracks()[0] || null; }

function leggiCam() {
  const tr = tracciaVideo(); let cap = {}, st = {};
  try { cap = tr?.getCapabilities?.() || {}; } catch (e) { void e; }
  try { st = tr?.getSettings?.() || {}; } catch (e) { void e; }
  S.hw = cap.zoom && cap.zoom.min > 0 && cap.zoom.max > cap.zoom.min ? { min: cap.zoom.min, max: cap.zoom.max } : null;
  S.zoom = S.hw ? Math.max(1, (Number(st.zoom) || S.hw.min) / S.hw.min) : 1;
  S.torcia = !!cap.torch; S.torciaAccesa = false;
  if (typeof st.facingMode === 'string' && st.facingMode) S.facing = st.facingMode;
  S.camAttiva = st.deviceId || '';
  $('anteprima').style.transform = S.facing === 'user' ? 'scaleX(-1)' : '';
}

function seguiTracce() {
  for (const t of S.stream?.getTracks() || []) {
    if (t._seguita) continue; t._seguita = true;
    t.addEventListener('ended', () => { if (!document.hidden && !S.fermo) riprendiCamera(); });
  }
}

async function riprendiCamera() {
  if (S.fermo) return;
  const v = tracciaVideo(), a = S.stream?.getAudioTracks()[0];
  if (v && v.readyState === 'live' && (!a || a.readyState === 'live')) return;
  for (const t of S.stream?.getTracks() || []) { try { t.stop(); } catch (e) { void e; } }
  await accendi(false);
  avviso(L('Di nuovo qui: fotocamera e microfono ripresi.', 'Back here: camera and microphone resumed.', 'De nuevo aquí: cámara y micrófono recuperados.'));
}

async function cambiaCamera({ facing, camId } = {}) {
  if (!S.stream) return accendi(true);
  const primaF = S.facing, primaC = S.camId;
  if (facing) { S.facing = facing; S.camId = ''; }
  if (camId !== undefined) S.camId = camId;
  const vecchio = tracciaVideo();
  try { vecchio?.stop(); } catch (e) { void e; }
  try {
    const nuovo = await chiediVideo();
    const s = new MediaStream([...nuovo.getVideoTracks(), ...S.stream.getAudioTracks()]);
    S.stream = s;
    const pv = $('anteprima'); pv.srcObject = s; pv.play?.().catch(() => {});
    leggiCam(); seguiTracce();
    await S.camera.usaStream(s);
    const m = memoria(); m.facing = { ...(m.facing || {}), [S.canale]: S.facing }; scriviMemoria(m);
    mandaInfo(); render();
  } catch (e) {
    S.facing = primaF; S.camId = primaC;
    avviso(L('Questa fotocamera non si apre: forse la usa un\'altra app.', 'This camera does not open: maybe another app is using it.', 'Esta cámara no se abre: quizá la usa otra app.'), 5000, true);
    await accendi(false);
  }
}

async function popolaCams() {
  try { S.cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'); } catch (e) { S.cams = []; }
  if (S.foglio === 'altro') renderFoglio();
}

async function zoom(z) {
  const max = S.hw ? S.hw.max / S.hw.min : 3;
  const v = Math.max(1, Math.min(max, Number(z) || 1));
  if (S.hw) {
    S.zoom = v;
    try { await tracciaVideo()?.applyConstraints({ advanced: [{ zoom: S.hw.min * v }] }); }
    catch (e) { S.hw = null; S.zoomRegia = v; S.camera?.manda({ t: 'cmd', cmd: 'zoom', v }); }
  } else { S.zoomRegia = v; S.camera?.manda({ t: 'cmd', cmd: 'zoom', v }); }
  avviso(L('Zoom ', 'Zoom ', 'Zoom ') + zoomTesto(S.hw ? S.zoom : S.zoomRegia), 1200);
  render();
}
const zoomTesto = (z) => (Math.round(z * 10) / 10).toLocaleString(LINGUA) + '×';

async function torcia() {
  try { await tracciaVideo()?.applyConstraints({ advanced: [{ torch: !S.torciaAccesa }] }); S.torciaAccesa = !S.torciaAccesa; }
  catch (e) { avviso(L('La torcia non si accende con questa fotocamera.', 'The torch does not work with this camera.', 'La linterna no funciona con esta cámara.'), 3000, true); }
  renderFoglio();
}

function microfono() {
  S.muto = !S.muto;
  for (const t of S.stream?.getAudioTracks() || []) t.enabled = !S.muto;
  mandaInfo(); render();
  try { navigator.vibrate?.(20); } catch (e) { void e; }
}

function mandaInfo() {
  const v = $('anteprima');
  S.camera?.manda({ t: 'info', nome: S.nome, muto: S.muto, batteria: S.batteria, qual: S.qual, cam: { facing: S.facing, hw: !!S.hw, torcia: S.torcia, w: v?.videoWidth || 0, h: v?.videoHeight || 0, zoom: S.hw ? S.zoom : S.zoomRegia }, microfono: !!S.stream?.getAudioTracks().length });
}

function suMessaggio(m) {
  if (m.t === 'tally') {
    const prima = S.tally.onda;
    S.tally = { onda: !!m.onda, anteprima: !!m.anteprima, live: !!m.live, formato: m.formato === 'v' ? 'v' : (m.formato === 'ov' ? 'ov' : 'o'), protagonista: String(m.protagonista || '') };
    S.live = S.tally.live;
    if (S.tally.onda && !prima) { try { navigator.vibrate?.([60, 40, 60]); } catch (e) { void e; } }
    guardaForma(); render();
  } else if (m.t === 'scene') {
    S.scene = Array.isArray(m.lista) ? m.lista.slice(0, 30).map((s) => ({ id: String(s.id), nome: String(s.nome || ''), muta: !!s.muta })) : [];
    S.inOnda = String(m.inOnda || ''); render();
  } else if (m.t === 'chat') {
    for (const r of Array.isArray(m.righe) ? m.righe : []) S.chat.push({ user: String(r.user || ''), testo: String(r.testo || '').slice(0, 300) });
    S.chat = S.chat.slice(-30); renderChat();
  } else if (m.t === 'cam') {
    if (m.cmd === 'gira') cambiaCamera({ facing: S.facing === 'user' ? 'environment' : 'user' });
    else if (m.cmd === 'zoom') zoom(m.v);
    else if (m.cmd === 'torcia') torcia();
    else if (m.cmd === 'qualita' && QUALITA_REMOTA[m.v] && m.v !== S.qual) { S.qual = m.v; S.camera.qualita(m.v); cambiaCamera({}); }
  } else if (m.t === 'zoom') { S.zoomRegia = Number(m.v) || 1; render(); }
  else if (m.t === 'avviso') avviso(String(m.testo || '').slice(0, 200), 5000, !!m.errore);
}

function guardaForma() {
  const v = $('anteprima');
  const f = S.tally.formato === 'ov' ? '' : S.tally.formato;
  const k = f ? orientamentoStorto(v.videoWidth, v.videoHeight, f) : '';
  if (k === S.storto) return;
  S.storto = k;
  if (k === 'dritto') avviso(L('La diretta è in verticale: tieni il telefono dritto.', 'The stream is vertical: hold the phone upright.', 'El directo es vertical: sujeta el teléfono derecho.'), 6000);
  else if (k === 'lato') avviso(L('La diretta è in orizzontale: gira il telefono di lato.', 'The stream is horizontal: turn the phone sideways.', 'El directo es horizontal: gira el teléfono de lado.'), 6000);
  mandaInfo();
}

function render() {
  const cam = $('cam'); if (!cam || cam.hidden) return;
  const t = S.tally, collegato = S.rete === 'collegato';
  cam.classList.toggle('onda', collegato && t.onda);
  cam.classList.toggle('anteprima', collegato && !t.onda && t.anteprima);
  const tally = $('tally');
  let testo = '', cl = '';
  if (S.fermo) testo = L('Scollegato', 'Disconnected', 'Desconectado');
  else if (!S.regia && !collegato) testo = L('Aspetto la regia del computer', 'Waiting for the computer control room', 'Esperando el control del ordenador');
  else if (!collegato) testo = L('Collego alla regia…', 'Connecting to the control room…', 'Conectando con el control…');
  else if (t.onda) { testo = L('IN ONDA', 'ON AIR', 'EN EL AIRE'); cl = 'onda'; }
  else if (t.anteprima) { testo = L('IN ANTEPRIMA', 'IN PREVIEW', 'EN VISTA PREVIA'); cl = 'anteprima'; }
  else testo = L('Pronta', 'Ready', 'Lista');
  tally.textContent = testo; tally.className = 'cam-pill ' + cl;
  const rete = $('rete');
  const rt = { perso: L('Rete persa, riprovo…', 'Network lost, retrying…', 'Red perdida, reintentando…'), bloccata: L('La rete non lascia passare il video: prova la stessa Wi-Fi del computer', 'The network does not let the video through: try the computer\'s Wi-Fi', 'La red no deja pasar el vídeo: prueba la misma Wi-Fi del ordenador'), errore: L('Collegamento non riuscito', 'Connection failed', 'Conexión fallida') };
  rete.textContent = rt[S.rete] || ''; rete.className = 'cam-pill ' + (S.rete === 'bloccata' || S.rete === 'errore' ? 'bloccata' : (S.rete === 'perso' ? 'media' : ''));
  $('b-altro').innerHTML = ico('altro'); $('b-altro').setAttribute('aria-label', L('Altro', 'More', 'Más'));
  const sonoProt = t.protagonista === S.id;
  const barra = [
    `<button type="button" class="cam-tasto${S.muto ? ' spento' : ''}" data-cam="mic" aria-pressed="${!S.muto}">${ico(S.muto ? 'muto' : 'mic')}<span>${S.muto ? L('Muto', 'Muted', 'Silencio') : L('Microfono', 'Mic', 'Micro')}</span></button>`,
    `<button type="button" class="cam-tasto" data-cam="gira">${ico('gira')}<span>${L('Gira', 'Flip', 'Girar')}</span></button>`,
    `<button type="button" class="cam-tondo" data-cam="zoom" aria-label="${esc(L('Zoom: tocca per cambiarlo', 'Zoom: tap to change it', 'Zoom: toca para cambiarlo'))}">${zoomTesto(S.hw ? S.zoom : S.zoomRegia)}</button>`,
  ];
  if (S.comanda) {
    barra.push(`<button type="button" class="cam-tasto protagonista${sonoProt ? ' si' : ''}" data-cam="protagonista" aria-pressed="${sonoProt}">${ico('stella')}<span>${sonoProt ? L('Protagonista', 'Main shot', 'Protagonista') : L('Prendi la scena', 'Take the shot', 'Toma la escena')}</span></button>`);
    barra.push(`<button type="button" class="cam-tasto" data-cam="chat" aria-pressed="${S.chatAperta}">${ico('chat')}<span>Chat</span></button>`);
  }
  const b = $('barra'); const html = barra.join('');
  if (b._html !== html) { b._html = html; b.innerHTML = html; }
  const sc = $('scene');
  sc.hidden = !S.comanda || !S.scene.length || !S.regia;
  const htmlSc = S.scene.map((s) => `<button type="button" class="cam-scena${s.id === S.inOnda ? ' attiva' : ''}" data-scena="${esc(s.id)}" aria-pressed="${s.id === S.inOnda}">${esc(s.nome)}</button>`).join('');
  if (sc._html !== htmlSc) { sc._html = htmlSc; sc.innerHTML = htmlSc; }
  $('chat').hidden = !S.comanda || !S.chatAperta;
  renderFoglio();
}

function renderChat() {
  const c = $('chat'); if (!c) return;
  c.innerHTML = S.chat.map((r) => `<p>${r.user ? `<b>${esc(r.user)}:</b> ` : ''}${esc(r.testo)}</p>`).join('');
}

function renderFoglio() {
  const f = $('foglio'); if (!f) return;
  f.hidden = !S.foglio;
  if (S.foglio !== 'altro') return;
  const nomi = { davanti: L('Davanti', 'Front', 'Delantera'), dietro: L('Dietro', 'Back', 'Trasera'), fotocamera: L('Fotocamera', 'Camera', 'Cámara') };
  const max = S.hw ? S.hw.max / S.hw.min : 3;
  f.innerHTML = `<div class="cam-testa"><h3>${esc(S.nome || L('Questo dispositivo', 'This device', 'Este dispositivo'))}</h3><button type="button" class="cam-tondo" data-cam="chiudi-foglio" aria-label="${esc(L('Chiudi', 'Close', 'Cerrar'))}">${ico('giu')}</button></div>
    <p>${esc(L(`Fotocamera della regia di ${S.canale}.`, `Camera of ${S.canale}'s control room.`, `Cámara del control de ${S.canale}.`))} ${S.comanda ? esc(L('Da qui puoi anche cambiare scena e prendere la scena.', 'From here you can also switch scenes and take the shot.', 'Desde aquí también puedes cambiar de escena y tomar la escena.')) : ''}</p>
    ${S.cams.length > 1 ? `<h4>${L('Obiettivo', 'Lens', 'Objetivo')}</h4>${S.cams.map((d, i) => `<button type="button" class="cam-chip${d.deviceId === S.camAttiva ? ' attivo' : ''}" data-lente="${esc(d.deviceId)}">${esc(nomeCamera(d.label, i, nomi))}</button>`).join('')}` : ''}
    <h4>Zoom</h4>${[1, 2, 3].filter((z) => z <= max + 1e-9).map((z) => `<button type="button" class="cam-chip${Math.abs((S.hw ? S.zoom : S.zoomRegia) - z) < 0.05 ? ' attivo' : ''}" data-zoom="${z}">${z}×</button>`).join('')}
    <p>${S.hw ? esc(L('È lo zoom della fotocamera: resta nitido.', 'It is the camera\'s own zoom: it stays sharp.', 'Es el zoom de la cámara: sigue nítido.')) : esc(L('Questa fotocamera non ha uno zoom suo: ingrandisce la regia, e oltre 2× si sgrana.', 'This camera has no zoom of its own: the control room enlarges, and beyond 2× it gets grainy.', 'Esta cámara no tiene zoom propio: amplía el control, y más allá de 2× se ve granulada.'))}</p>
    ${S.torcia ? `<button type="button" class="cam-grande${S.torciaAccesa ? ' attivo' : ''}" data-cam="torcia" aria-pressed="${S.torciaAccesa}">${L('Torcia', 'Torch', 'Linterna')}</button>` : ''}
    ${S.comanda && S.live ? `<button type="button" class="cam-grande pericolo" data-cam="ferma">${L('Tieni premuto per chiudere la diretta', 'Hold to end the stream', 'Mantén pulsado para cerrar el directo')}</button>` : ''}
    <button type="button" class="cam-grande" data-cam="esci">${L('Stacca questa fotocamera', 'Disconnect this camera', 'Desconecta esta cámara')}</button>
    ${IO ? `<a class="cam-grande" href="/#studio">${L('Torna allo Studio', 'Back to the Studio', 'Vuelve al Estudio')}</a>` : ''}
    <button type="button" class="cam-grande pericolo" data-cam="dimentica">${L('Scollega e dimentica questo dispositivo', 'Disconnect and forget this device', 'Desconecta y olvida este dispositivo')}</button>`;
}

async function tieniAcceso() {
  try { if ('wakeLock' in navigator && !document.hidden) { S.wake = await navigator.wakeLock.request('screen'); } } catch (e) { void e; }
}

async function leggiBatteria() {
  if (S.battLetta) return;
  S.battLetta = true;
  try {
    const b = await navigator.getBattery?.();
    if (!b) return;
    const leggi = () => { S.batteria = { livello: Math.round(b.level * 100) / 100, carica: !!b.charging }; const el = $('batt'); el.hidden = false; el.textContent = Math.round(b.level * 100) + '%'; mandaInfo(); };
    leggi(); b.addEventListener('levelchange', leggi); b.addEventListener('chargingchange', leggi);
  } catch (e) { void e; }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden || S.fermo || !S.id) return;
  tieniAcceso();
  riprendiCamera();
});

document.addEventListener('click', (ev) => {
  const t = ev.target;
  if (t.closest('#collega')) { entra(); return; }
  const sc = t.closest('[data-scena]'); if (sc) { S.camera?.manda({ t: 'cmd', cmd: 'scena', id: sc.dataset.scena }); try { navigator.vibrate?.(15); } catch (e) { void e; } return; }
  const len = t.closest('[data-lente]'); if (len) { cambiaCamera({ camId: len.dataset.lente }); return; }
  const z = t.closest('[data-zoom]'); if (z) { zoom(Number(z.dataset.zoom)); return; }
  const b = t.closest('[data-cam]'); if (!b) return;
  const a = b.dataset.cam;
  if (a === 'mic') microfono();
  else if (a === 'gira') cambiaCamera({ facing: S.facing === 'user' ? 'environment' : 'user' });
  else if (a === 'zoom') zoom(prossimoZoom(S.hw ? S.zoom : S.zoomRegia, S.hw ? S.hw.max / S.hw.min : 3));
  else if (a === 'protagonista') { S.camera?.manda({ t: 'cmd', cmd: S.tally.protagonista === S.id ? 'rilascia' : 'protagonista' }); }
  else if (a === 'chat') { S.chatAperta = !S.chatAperta; render(); renderChat(); }
  else if (a === 'altro') { S.foglio = S.foglio === 'altro' ? '' : 'altro'; popolaCams(); renderFoglio(); }
  else if (a === 'chiudi-foglio') { S.foglio = ''; renderFoglio(); }
  else if (a === 'torcia') torcia();
  else if (a === 'esci') { ferma(); S.foglio = ''; renderFoglio(); ricollegabile(L('Fotocamera staccata: la regia non la vede più.', 'Camera disconnected: the control room no longer sees it.', 'Cámara desconectada: el control ya no la ve.'), false); }
  else if (a === 'dimentica') { api('/api/cam/esci', cred()).catch(() => {}).finally(() => tolto()); }
});

document.addEventListener('pointerdown', (ev) => {
  const b = ev.target.closest('[data-cam="ferma"]'); if (!b) return;
  b.classList.add('tenendo');
  clearTimeout(S.tieni);
  S.tieni = setTimeout(() => { b.classList.remove('tenendo'); S.camera?.manda({ t: 'cmd', cmd: 'ferma' }); avviso(L('Chiedo alla regia di chiudere la diretta.', 'Asking the control room to end the stream.', 'Pido al control que cierre el directo.')); }, TIENI_MS);
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) document.addEventListener(ev, () => { clearTimeout(S.tieni); document.querySelector('[data-cam="ferma"]')?.classList.remove('tenendo'); }, true);
document.addEventListener('contextmenu', (e) => { if (e.target.closest('.cam') && !e.target.closest('input')) e.preventDefault(); });
$('codice')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') entra(); });
setInterval(() => { if (S.rete === 'collegato') mandaInfo(); }, 30000);
addEventListener('pagehide', () => { if (S.id && !S.fermo) S.camera?.chiudi(); });
addEventListener('pageshow', (e) => { if (e.persisted && S.id) location.reload(); });

prepara();
