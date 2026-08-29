// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


const TG = window.Telegram && window.Telegram.WebApp;

const lc = (TG?.initDataUnsafe?.user?.language_code || navigator.language || 'it').slice(0, 2);
const LANG = ['it', 'en', 'es'].includes(lc) ? lc : (lc === 'es' ? 'es' : lc.startsWith('en') ? 'en' : 'it');
const L = (it, en, es) => (LANG === 'en' ? en : LANG === 'es' ? es : it);

const app = document.getElementById('app');
document.getElementById('sub').textContent = L('Il tuo bot, dentro Telegram', 'Your bot, inside Telegram', 'Tu bot, dentro de Telegram');

async function api(path, opts) {
  const r = await fetch(path, {
    method: opts?.method || 'GET',
    headers: opts?.body ? { 'Content-Type': 'application/json' } : {},
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok) throw new Error(j?.errore || ('HTTP ' + r.status));
  return j;
}

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function vistaFuoriTelegram() {
  app.innerHTML = `<div class="card center">
    <p>${L('Apri questa pagina dal bot <b>SocialBot</b> su Telegram.', 'Open this page from the <b>SocialBot</b> bot on Telegram.', 'Abre esta página desde el bot <b>SocialBot</b> en Telegram.')}</p>
    <p class="muted">${L('Oppure gestisci tutto dal browser su', 'Or manage everything from your browser at', 'O gestiona todo desde el navegador en')} <a href="/">socialbot.live</a>.</p>
  </div>`;
}

function vistaCollega(codice, nome) {
  app.innerHTML = `
    <div class="card">
      <h2>${L('Collega il tuo canale', 'Link your channel', 'Vincula tu canal')}</h2>
      <p>${L('Ciao', 'Hi', 'Hola')} <b>${esc(nome || '')}</b>! ${L('Per gestire il tuo bot da qui, collega una volta sola il tuo Telegram al tuo canale.', 'To manage your bot from here, link your Telegram to your channel once.', 'Para gestionar tu bot desde aquí, vincula una vez tu Telegram a tu canal.')}</p>
      <div class="codice">${esc(codice)}</div>
      <ol>
        <li>${L('Apri la dashboard su', 'Open the dashboard at', 'Abre el panel en')} <b>socialbot.live</b> ${L('(dalla mail/notifica di andryxify).', '(from your andryxify email/notification).', '(desde tu correo/notificación de andryxify).')}</li>
        <li>${L('Vai su <b>Notifiche → Accedi da Telegram</b> e inserisci il codice qui sopra.', 'Go to <b>Notifications → Telegram login</b> and enter the code above.', 'Ve a <b>Notificaciones → Acceso con Telegram</b> e introduce el código de arriba.')}</li>
        <li>${L('Torna qui e riapri la Mini App: sarai dentro!', 'Come back here and reopen the Mini App: you’re in!', 'Vuelve aquí y reabre la Mini App: ¡ya estás dentro!')}</li>
      </ol>
    </div>
    <button class="big ghost" id="ricontrolla">${L('Ho collegato — ricontrolla', 'I linked it — check again', 'Ya lo vinculé — comprobar')}</button>`;
  document.getElementById('ricontrolla').onclick = avvia;
}

async function vistaDashboard(sess) {
  app.innerHTML = `<div class="spin"></div>`;
  let st;
  try { st = await api('/api/tgapp/stato'); }
  catch { app.innerHTML = `<div class="card center"><p>${L('Non riesco a leggere lo stato.', 'Can’t read the status.', 'No puedo leer el estado.')}</p></div>`; return; }
  const puoToggle = st.ruolo !== 'moderatore' && st.abilitato;
  app.innerHTML = `
    <div class="card">
      <h2>${L('Il tuo canale', 'Your channel', 'Tu canal')}</h2>
      <div class="riga"><span class="lab">${esc(st.display || st.login)}</span>
        <span class="badge ${st.inChat ? 'on' : 'off'}"><span class="dot"></span>${st.inChat ? L('in chat', 'in chat', 'en el chat') : L('offline', 'offline', 'desconectado')}</span></div>
      <div class="riga"><span class="lab">${L('Bot acceso', 'Bot on', 'Bot activo')}</span>
        <label class="sw"><input type="checkbox" id="botsw" ${st.botOn ? 'checked' : ''} ${puoToggle ? '' : 'disabled'}><span class="track"></span><span class="knob"></span></label></div>
      ${st.abilitato ? '' : `<p class="muted">${L('Il tuo canale non è ancora abilitato.', 'Your channel isn’t enabled yet.', 'Tu canal aún no está habilitado.')}</p>`}
    </div>
    <button class="big" id="apri">${L('Apri la dashboard completa', 'Open the full dashboard', 'Abre el panel completo')}</button>
    <p class="center muted" style="margin-top:14px">${L('Accesso come', 'Signed in as', 'Sesión como')} @${esc(sess.login)}</p>`;
  const sw = document.getElementById('botsw');
  if (sw && puoToggle) sw.onchange = async () => {
    sw.disabled = true;
    try { await api('/api/tgapp/toggle', { method: 'POST', body: { enabled: sw.checked } }); TG?.HapticFeedback?.notificationOccurred?.('success'); }
    catch { sw.checked = !sw.checked; TG?.showAlert?.(L('Operazione non riuscita.', 'Action failed.', 'La acción falló.')); }
    finally { sw.disabled = false; }
  };

  document.getElementById('apri').onclick = () => { location.href = '/'; };
}

async function avvia() {
  app.innerHTML = `<div class="spin"></div>`;
  const initData = TG?.initData || '';
  if (!initData) { vistaFuoriTelegram(); return; }
  try {
    const r = await api('/api/tgapp/auth', { method: 'POST', body: { initData } });
    if (r.collegato) return vistaDashboard(r);
    return vistaCollega(r.codice, r.nome);
  } catch (e) {
    app.innerHTML = `<div class="card center"><p>${L('Accesso non riuscito.', 'Sign-in failed.', 'Acceso fallido.')}</p><p class="muted">${esc(e.message || '')}</p></div>`;
  }
}

if (TG) { try { TG.ready(); TG.expand(); } catch {} }
avvia();
