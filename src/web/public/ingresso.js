// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  const { L, LINGUA, el, chiama, errore, prova, passkeyUsa } = window.SB_INGRESSO;
  const porta = document.getElementById('porta');
  document.title = L('Entra', 'Sign in', 'Entrar') + ' | SocialBot';

  const tasto = (classe, href, testo) => el('a', { classe: 'azione ' + classe, href }, testo);

  function conMail() {
    const box = el('div', { classe: 'con-mail', id: 'porta-mail', hidden: true });
    const m = el('div', { classe: 'msg', role: 'status' });
    const mail = el('input', { type: 'email', id: 'porta-mail-indirizzo', name: 'username', autocomplete: 'username', inputmode: 'email', placeholder: L('nome@esempio.it', 'name@example.com', 'nombre@ejemplo.es'), 'aria-label': L('La tua mail', 'Your email', 'Tu correo') });
    const codice = el('input', { type: 'text', id: 'porta-mail-codice', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '7', placeholder: '123456', classe: 'codice-campo', 'aria-label': L('Il codice della mail', 'The code from the email', 'El código del correo') });
    const secondo = el('div', { classe: 'secondo', hidden: true }, el('p', { classe: 'minuta', testo: L('Se la mail è di casa, ti è arrivato un codice di 6 cifre. Scrivilo qui:', 'If the email is one of ours, a 6-digit code has arrived. Type it here:', 'Si el correo es de casa, te ha llegado un código de 6 cifras. Escríbelo aquí:') }), codice);
    const manda = el('button', { classe: 'azione', id: 'btn-porta-mail-manda', type: 'button' }, L('Mandami il codice', 'Send me the code', 'Mándame el código'));
    const entra = el('button', { classe: 'azione', id: 'btn-porta-mail-entra', type: 'button', hidden: true }, L('Entra', 'Sign in', 'Entrar'));
    manda.addEventListener('click', async () => {
      m.className = 'msg'; m.textContent = L('Un attimo…', 'One moment…', 'Un momento…');
      manda.disabled = true;
      try {
        const p = await prova('mail');
        await chiama('/api/ingresso/mail/codice', { mail: mail.value, lingua: LINGUA, ...p });
        m.textContent = ''; secondo.hidden = false; entra.hidden = false;
        manda.textContent = L('Mandalo di nuovo', 'Send it again', 'Mándalo otra vez'); manda.classList.add('secondaria');
        codice.focus();
      } catch (e) { m.className = 'msg err'; m.textContent = errore(e); }
      finally { manda.disabled = false; }
    });
    entra.addEventListener('click', async () => {
      m.className = 'msg'; m.textContent = '';
      entra.disabled = true;
      try { const r = await chiama('/api/ingresso/mail/entra', { mail: mail.value, codice: codice.value }); location.href = r.vai || '/seconda-prova'; }
      catch (e) { m.className = 'msg err'; m.textContent = errore(e); entra.disabled = false; }
    });
    box.append(el('p', { classe: 'minuta', testo: L('Funziona se nel pannello hai aggiunto la mail e anche un’altra prova (la passkey o l’app dei codici).', 'It works if in the panel you added your email and another check too (a passkey or the code app).', 'Funciona si en el panel has añadido el correo y también otra prueba (la passkey o la app de códigos).') }), mail, secondo, entra, manda, m);
    const apri = el('button', { classe: 'azione secondaria', id: 'btn-porta-mail', type: 'button' }, L('Entra con un codice per mail', 'Sign in with an email code', 'Entra con un código por correo'));
    apri.addEventListener('click', () => { apri.hidden = true; box.hidden = false; mail.focus(); });
    return [apri, box];
  }

  function disegna(s) {
    const msg = el('div', { classe: 'msg', id: 'msg-porta', role: 'status' });
    const btnPasskey = el('button', { classe: 'azione secondaria', id: 'btn-porta-passkey', type: 'button' }, L('Entra con la passkey', 'Sign in with a passkey', 'Entra con passkey'));
    btnPasskey.addEventListener('click', async () => {
      msg.className = 'msg'; msg.textContent = '';
      btnPasskey.disabled = true;
      try {
        const r = await passkeyUsa('/api/passkey/login/inizio', '/api/passkey/login/fine');
        location.href = (r && r.vai) || '/';
      } catch (e) {
        btnPasskey.disabled = false;
        msg.className = 'msg err'; msg.textContent = errore(e);
      }
    });
    porta.append(...[
      el('h1', { testo: L('Entra in SocialBot', 'Sign in to SocialBot', 'Entra en SocialBot') }),
      s.avviso === 'anomalia' ? el('div', { classe: 'avviso-anomalia', role: 'alert', id: 'avviso-anomalia' },
        el('strong', { testo: L('Abbiamo notato un’anomalia', 'We noticed something unusual', 'Hemos notado una anomalía') }),
        el('p', { testo: L('Potrebbe non essere niente, ma per sicurezza rifai l’accesso.', 'It may be nothing, but to be safe please sign in again.', 'Puede que no sea nada, pero por seguridad vuelve a entrar.') }),
        el('p', { classe: 'minuta', testo: L('Dopo, se non l’hai ancora, attiva la seconda prova: ci vuole un minuto.', 'Afterwards, if you have not yet, turn on the second check: it takes a minute.', 'Después, si aún no la tienes, activa la segunda prueba: se tarda un minuto.') })) : null,
      el('p', { testo: L('Scegli come entrare.', 'Choose how to sign in.', 'Elige cómo entrar.') }),
      el('div', { classe: 'porte' },
        tasto('twitch', '/entra', L('Entra con Twitch', 'Sign in with Twitch', 'Entra con Twitch')),
        s.kick ? tasto('kick', '/accedi/kick', L('Entra con Kick', 'Sign in with Kick', 'Entra con Kick')) : null,
        s.youtube ? tasto('youtube', '/accedi/youtube', L('Entra con YouTube', 'Sign in with YouTube', 'Entra con YouTube')) : null,
        s.discord ? tasto('discord', '/accedi/discord', L('Entra con Discord', 'Sign in with Discord', 'Entra con Discord')) : null,
        btnPasskey,
        ...(s.posta ? conMail() : [])),
      msg,
      el('p', { classe: 'piccolo', testo: L('Per entrare nel pannello ti chiediamo anche una seconda prova che sei tu: una passkey, un codice per mail o l’app dei codici.', 'To get into the panel we also ask for a second check that it is you: a passkey, an email code or a code app.', 'Para entrar en el panel también te pedimos una segunda prueba de que eres tú: una passkey, un código por correo o la app de códigos.') }),
      el('p', { classe: 'piccolo' },
        el('a', { href: '/mod', testo: L('Sei un moderatore? Entra da qui', 'Are you a moderator? Sign in here', '¿Eres moderador? Entra por aquí') }),
        ' · ',
        el('a', { href: '/privacy', testo: L('Privacy e sicurezza', 'Privacy and security', 'Privacidad y seguridad') })),
    ].filter(Boolean));
  }

  chiama('/api/ingresso/stato').then((s) => {
    if (s.dentro === 'aperta') { location.href = '/'; return; }
    if (s.dentro === 'attesa') { location.href = '/seconda-prova'; return; }
    disegna(s);
  }).catch(() => disegna({}));
})();
