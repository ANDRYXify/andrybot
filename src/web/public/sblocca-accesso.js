// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  const { L, el, chiama, errore } = window.SB_INGRESSO;
  const scatola = document.getElementById('sblocco');
  document.title = L('Rientra', 'Sign back in', 'Vuelve a entrar') + ' | SocialBot';
  const t = new URLSearchParams(location.search).get('t') || '';
  try { history.replaceState(null, '', location.pathname); } catch { }
  const m = el('div', { classe: 'msg', role: 'status' });
  const b = el('button', { classe: 'azione', id: 'btn-sblocco-entra', type: 'button' }, L('Rientra', 'Sign back in', 'Vuelve a entrar'));
  b.addEventListener('click', async () => {
    m.className = 'msg'; m.textContent = '';
    b.disabled = true;
    try { const r = await chiama('/api/aiuto-accesso/usa', { t }); location.href = r.vai || '/seconda-prova'; }
    catch (e) {
      m.className = 'msg err';
      m.textContent = e.codice === 'link' ? L('Questo link non vale più: è già stato usato o è scaduto. Puoi chiedere aiuto di nuovo.', 'This link no longer works: it was already used or it expired. You can ask for help again.', 'Este enlace ya no vale: ya se usó o caducó. Puedes pedir ayuda otra vez.') : errore(e);
      b.disabled = false;
    }
  });
  scatola.append(
    el('h1', { testo: L('Rientra in SocialBot', 'Sign back in to SocialBot', 'Vuelve a entrar en SocialBot') }),
    el('p', { classe: 'grande', testo: L('Il tuo accesso è stato sbloccato. Questo link vale una volta sola.', 'Your sign-in has been unlocked. This link works only once.', 'Tu acceso ha sido desbloqueado. Este enlace vale una sola vez.') }),
    el('p', { testo: L('Tocca «Rientra»: subito dopo attivi una prova nuova (la passkey, l’app dei codici o la mail) e sei dentro.', 'Tap «Sign back in»: right after, you turn on a new check (a passkey, the code app or email) and you are in.', 'Toca «Vuelve a entrar»: justo después activas una prueba nueva (la passkey, la app de códigos o el correo) y estás dentro.') }),
    t ? b : el('p', { classe: 'msg err', testo: L('Il link è incompleto: aprilo di nuovo dal messaggio che hai ricevuto.', 'The link is incomplete: open it again from the message you received.', 'El enlace está incompleto: ábrelo otra vez desde el mensaje que recibiste.') }),
    m,
    el('p', { classe: 'piccolo' }, el('a', { href: '/aiuto-accesso', testo: L('Non sei stato tu a chiedere aiuto? Scrivici.', 'You did not ask for help? Write to us.', '¿No pediste ayuda? Escríbenos.') })));
})();
