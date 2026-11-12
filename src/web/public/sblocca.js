// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  const { L, LINGUA, errore, passkeyUsa, passkeyQui } = window.SB_INGRESSO;
  const $ = (id) => document.getElementById(id);
  const btn = $('btn');
  const altro = $('altro-modo');
  const msg = $('msg');
  document.title = L('Sblocca', 'Unlock', 'Desbloquear') + ' | SocialBot';

  const PAROLE = {
    'sb-titolo': L('Rieccoti', 'Welcome back', 'Hola de nuevo'),
    'sb-testo': L('Sblocca il pannello con la passkey: impronta, volto o PIN di questo dispositivo.', 'Unlock the panel with your passkey: fingerprint, face or PIN of this device.', 'Desbloquea el panel con la passkey: huella, rostro o PIN de este dispositivo.'),
    btn: L('Sblocca con la passkey', 'Unlock with a passkey', 'Desbloquear con passkey'),
    'altro-modo': L('Entra in un altro modo', 'Sign in another way', 'Entra de otra forma'),
    'sb-nota': L('Non hai una passkey su questo dispositivo? Entra con Twitch, Kick, la mail o gli altri modi. Se non hai ancora una seconda prova, la scegli subito dopo: ci vuole un minuto.', 'No passkey on this device? Sign in with Twitch, Kick, email or the other ways. If you do not have a second check yet, you choose one right after: it takes a minute.', '¿No tienes una passkey en este dispositivo? Entra con Twitch, Kick, el correo o las otras formas. Si aún no tienes una segunda prueba, la eliges justo después: se tarda un minuto.'),
    'link-non-riesci': L('Non riesci a entrare?', 'Cannot sign in?', '¿No puedes entrar?'),
    'sb-privacy': L('Privacy e sicurezza', 'Privacy and security', 'Privacidad y seguridad'),
  };
  for (const [id, parola] of Object.entries(PAROLE)) { const e = $(id); if (e) e.textContent = parola; }
  if (LINGUA !== 'it') altro.href = '/ingresso?lang=' + LINGUA;

  const avantiLAltro = () => { btn.classList.add('secondaria'); altro.classList.remove('secondaria'); };

  async function sblocca() {
    msg.className = 'msg'; msg.textContent = '';
    btn.disabled = true;
    try {
      await passkeyUsa('/api/passkey/login/inizio', '/api/passkey/login/fine');
      msg.className = 'msg ok'; msg.textContent = L('Sbloccato!', 'Unlocked!', '¡Desbloqueado!');
      location.href = '/';
    } catch (e) {
      btn.disabled = false;
      msg.className = 'msg err';
      msg.textContent = errore(e && e.name === 'NotAllowedError' ? { codice: 'passkey' } : e);
      avantiLAltro();
    }
  }

  if (!window.PublicKeyCredential) {
    btn.hidden = true;
    msg.className = 'msg'; msg.textContent = errore({ codice: 'supporto' });
    avantiLAltro();
    return;
  }
  btn.addEventListener('click', sblocca);

  const inApp = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (inApp && passkeyQui()) window.addEventListener('load', () => setTimeout(sblocca, 250));
})();
