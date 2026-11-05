// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  const { L, LINGUA, el, chiama, errore, passkeyUsa, passkeyCrea } = window.SB_INGRESSO;
  const scatola = document.getElementById('prova');
  document.title = L('Seconda prova', 'Second check', 'Segunda prueba') + ' | SocialBot';
  const logo = scatola.querySelector('img');
  let stato = null;

  const pulisci = () => { scatola.replaceChildren(logo); };
  const metti = (...x) => scatola.append(...x.filter((v) => v != null && v !== false));
  const messaggio = () => el('div', { classe: 'msg', role: 'status' });
  const sbaglio = (m, e) => { m.className = 'msg err'; m.textContent = errore(e); };
  const indietro = () => el('button', { classe: 'link-indietro', type: 'button', suclick: () => disegna() }, L('← Scegli un altro modo', '← Choose another way', '← Elige otra forma'));
  const piede = () => el('p', { classe: 'piccolo' }, L('Non sei tu? ', 'Not you? ', '¿No eres tú? '), el('a', { href: '/auth/logout', testo: L('Esci', 'Sign out', 'Salir') }));
  const campoCodice = (id, etichetta) => {
    const i = el('input', { type: 'text', id, inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '7', placeholder: '123456', classe: 'codice-campo', 'aria-label': etichetta });
    return i;
  };
  const scelta = (id, titolo, perche, fare) => el('button', { classe: 'scelta', id, type: 'button', suclick: fare },
    el('span', { classe: 'scelta-titolo', testo: titolo }), el('span', { classe: 'scelta-perche', testo: perche }));
  const passo = (n, testo) => el('p', { classe: 'passo' }, el('span', { classe: 'passo-n', testo: String(n) }), el('span', { testo }));
  const entra = (r) => { location.href = (r && r.vai) || '/'; };

  function conBottone(btn, m, azione) {
    btn.addEventListener('click', async () => {
      m.className = 'msg'; m.textContent = '';
      btn.disabled = true;
      try { await azione(); } catch (e) { sbaglio(m, e); } finally { btn.disabled = false; }
    });
    return btn;
  }

  const T = {
    passkey: [L('Con questo telefono o computer (passkey)', 'With this phone or computer (passkey)', 'Con este teléfono u ordenador (passkey)'),
      L('Il modo più semplice: usi l’impronta, il volto o il PIN, come quando sblocchi il telefono. Niente da ricordare.', 'The simplest way: you use your fingerprint, face or PIN, like when you unlock your phone. Nothing to remember.', 'La forma más sencilla: usas la huella, la cara o el PIN, como cuando desbloqueas el teléfono. Nada que recordar.')],
    mail: [L('Con un codice per mail', 'With a code by email', 'Con un código por correo'),
      L('Ogni volta ti mandiamo 6 cifre per mail. Va bene anche senza telefono a portata.', 'Each time we email you 6 digits. Works even without your phone at hand.', 'Cada vez te mandamos 6 cifras por correo. Sirve aunque no tengas el teléfono a mano.')],
    totp: [L('Con l’app dei codici', 'With a code app', 'Con la app de códigos'),
      L('Se usi già Google Authenticator, Authy o il portachiavi del telefono: ogni 30 secondi ti dà 6 cifre nuove.', 'If you already use Google Authenticator, Authy or your phone’s keychain: every 30 seconds it gives you 6 new digits.', 'Si ya usas Google Authenticator, Authy o el llavero del teléfono: cada 30 segundos te da 6 cifras nuevas.')],
  };

  function verifica() {
    const f = stato.fattori;
    metti(
      el('h1', { testo: L('Ancora un passo', 'One more step', 'Un paso más') }),
      el('p', { testo: L(`Ciao ${stato.chi}. Per entrare ci serve una seconda prova che sei proprio tu. Scegli come:`, `Hi ${stato.chi}. To get in we need a second check that it is really you. Choose how:`, `Hola ${stato.chi}. Para entrar necesitamos una segunda prueba de que eres tú. Elige cómo:`) }),
      el('div', { classe: 'scelte' },
        f.passkey > 0 ? scelta('scelta-passkey', T.passkey[0], L('Usa l’impronta, il volto o il PIN.', 'Use your fingerprint, face or PIN.', 'Usa la huella, la cara o el PIN.'), () => usaPasskey()) : null,
        f.mail && stato.posta ? scelta('scelta-mail', T.mail[0], L(`Te lo mandiamo a ${f.mail}.`, `We send it to ${f.mail}.`, `Te lo mandamos a ${f.mail}.`), () => usaMail()) : null,
        f.totp ? scelta('scelta-totp', T.totp[0], L('Apri l’app e scrivi le 6 cifre.', 'Open the app and type the 6 digits.', 'Abre la app y escribe las 6 cifras.'), () => usaTotp()) : null,
        f.password ? scelta('scelta-password', L('Con la tua password', 'With your password', 'Con tu contraseña'), L('Quella che hai scelto quando ti sei registrato.', 'The one you chose when you signed up.', 'La que elegiste al registrarte.'), () => usaPassword()) : null),
      f.riserve > 0 ? el('p', { classe: 'piccolo' }, el('button', { classe: 'link-indietro', type: 'button', id: 'btn-usa-riserva', suclick: () => usaRiserva() },
        L('Non hai niente di questo con te? Usa un codice di riserva', 'None of these with you? Use a backup code', '¿No tienes nada de esto contigo? Usa un código de reserva'))) : null,
      piede());
  }

  function usaPasskey() {
    pulisci();
    const m = messaggio();
    const b = conBottone(el('button', { classe: 'azione', id: 'btn-prova-passkey', type: 'button' }, L('Usa la passkey', 'Use the passkey', 'Usar la passkey')), m,
      async () => entra(await passkeyUsa('/api/ingresso/prova/passkey/inizio', '/api/ingresso/prova/passkey/fine')));
    metti(el('h1', { testo: T.passkey[0] }), passo(1, L('Tocca il tasto qui sotto.', 'Tap the button below.', 'Toca el botón de abajo.')),
      passo(2, L('Il telefono o il computer ti chiede l’impronta, il volto o il PIN.', 'Your phone or computer asks for your fingerprint, face or PIN.', 'El teléfono o el ordenador te pide la huella, la cara o el PIN.')), b, m, indietro(), piede());
  }

  function usaMail() {
    pulisci();
    const m = messaggio();
    const campo = campoCodice('campo-prova-mail', L('Il codice della mail', 'The code from the email', 'El código del correo'));
    const conferma = conBottone(el('button', { classe: 'azione', id: 'btn-prova-mail', type: 'button' }, L('Entra', 'Sign in', 'Entrar')), m,
      async () => entra(await chiama('/api/ingresso/prova/mail/verifica', { codice: campo.value })));
    const manda = async () => { await chiama('/api/ingresso/prova/mail/manda', { lingua: LINGUA }); m.className = 'msg ok'; m.textContent = L('Mail partita. Guarda anche fra lo spam.', 'Email sent. Check your spam folder too.', 'Correo enviado. Mira también en el spam.'); };
    const ancora = conBottone(el('button', { classe: 'link-indietro', type: 'button', id: 'btn-prova-mail-ancora' }, L('Non è arrivata? Mandala di nuovo', 'Did not arrive? Send it again', '¿No ha llegado? Mándalo otra vez')), m, manda);
    metti(el('h1', { testo: T.mail[0] }),
      passo(1, L(`Ti abbiamo scritto a ${stato.fattori.mail}.`, `We wrote to ${stato.fattori.mail}.`, `Te hemos escrito a ${stato.fattori.mail}.`)),
      passo(2, L('Scrivi qui le 6 cifre della mail. Valgono 10 minuti.', 'Type the 6 digits from the email here. They work for 10 minutes.', 'Escribe aquí las 6 cifras del correo. Valen 10 minutos.')),
      campo, conferma, m, el('p', { classe: 'piccolo' }, ancora), indietro(), piede());
    manda().catch((e) => sbaglio(m, e));
    campo.focus();
  }

  function usaTotp() {
    pulisci();
    const m = messaggio();
    const campo = campoCodice('campo-prova-totp', L('Le 6 cifre dell’app', 'The 6 digits from the app', 'Las 6 cifras de la app'));
    const b = conBottone(el('button', { classe: 'azione', id: 'btn-prova-totp', type: 'button' }, L('Entra', 'Sign in', 'Entrar')), m,
      async () => entra(await chiama('/api/ingresso/prova/totp', { codice: campo.value })));
    metti(el('h1', { testo: T.totp[0] }), passo(1, L('Apri l’app dei codici.', 'Open your code app.', 'Abre la app de códigos.')),
      passo(2, L('Scrivi qui le 6 cifre di SocialBot.', 'Type the 6 SocialBot digits here.', 'Escribe aquí las 6 cifras de SocialBot.')), campo, b, m, indietro(), piede());
    campo.focus();
  }

  function usaPassword() {
    pulisci();
    const m = messaggio();
    const campo = el('input', { type: 'password', id: 'campo-prova-password', name: 'password', autocomplete: 'current-password', maxlength: '128', classe: 'codice-campo parola', 'aria-label': L('La password', 'The password', 'La contraseña') });
    const b = conBottone(el('button', { classe: 'azione', id: 'btn-prova-password', type: 'button' }, L('Entra', 'Sign in', 'Entrar')), m,
      async () => entra(await chiama('/api/ingresso/prova/password', { password: campo.value })));
    metti(el('h1', { testo: L('Con la tua password', 'With your password', 'Con tu contraseña') }),
      passo(1, L('Scrivi la password del tuo conto. Il portachiavi te la può proporre.', 'Type your account password. Your keychain can suggest it.', 'Escribe la contraseña de tu cuenta. El llavero te la puede proponer.')), campo, b, m, indietro(), piede());
    campo.focus();
  }

  function usaRiserva() {
    pulisci();
    const m = messaggio();
    const campo = el('input', { type: 'text', id: 'campo-prova-riserva', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', maxlength: '12', placeholder: 'ABCD-EFGH', classe: 'codice-campo', 'aria-label': L('Il codice di riserva', 'The backup code', 'El código de reserva') });
    const b = conBottone(el('button', { classe: 'azione', id: 'btn-prova-riserva', type: 'button' }, L('Entra', 'Sign in', 'Entrar')), m,
      async () => entra(await chiama('/api/ingresso/prova/riserva', { codice: campo.value })));
    metti(el('h1', { testo: L('Un codice di riserva', 'A backup code', 'Un código de reserva') }),
      passo(1, L('Prendi uno dei dieci codici che hai salvato.', 'Take one of the ten codes you saved.', 'Coge uno de los diez códigos que guardaste.')),
      passo(2, L('Scrivilo qui. Ognuno vale una volta sola.', 'Type it here. Each one works only once.', 'Escríbelo aquí. Cada uno vale una sola vez.')), campo, b, m, indietro(), piede());
    campo.focus();
  }

  function attiva() {
    metti(
      el('h1', { testo: L('Una seconda prova che sei tu', 'A second check that it is you', 'Una segunda prueba de que eres tú') }),
      el('p', { classe: 'grande', testo: L('Per entrare d’ora in poi ti chiediamo una seconda prova che sei proprio tu. Scegli come, ci vuole un minuto:', 'From now on, to get in we ask for a second check that it is really you. Choose how, it takes a minute:', 'A partir de ahora, para entrar te pedimos una segunda prueba de que eres tú. Elige cómo, se tarda un minuto:') }),
      el('div', { classe: 'scelte' },
        scelta('attiva-passkey', T.passkey[0], T.passkey[1], () => attivaPasskey()),
        stato.posta && stato.primo !== 'mail' ? scelta('attiva-mail', T.mail[0], T.mail[1], () => attivaMail()) : null,
        scelta('attiva-totp', T.totp[0], T.totp[1], () => attivaTotp())),
      el('p', { classe: 'piccolo', testo: L('Alla fine ti diamo dieci codici di riserva, per il giorno in cui non hai il telefono.', 'At the end we give you ten backup codes, for the day you do not have your phone.', 'Al final te damos diez códigos de reserva, para el día que no tengas el teléfono.') }),
      piede());
  }

  function attivaPasskey() {
    pulisci();
    const m = messaggio();
    const b = conBottone(el('button', { classe: 'azione', id: 'btn-attiva-passkey', type: 'button' }, L('Crea la passkey', 'Create the passkey', 'Crear la passkey')), m,
      async () => riserve(await passkeyCrea('/api/ingresso/attiva/passkey/inizio', '/api/ingresso/attiva/passkey/fine', L('Passkey', 'Passkey', 'Passkey'))));
    metti(el('h1', { testo: T.passkey[0] }),
      passo(1, L('Tocca «Crea la passkey».', 'Tap «Create the passkey».', 'Toca «Crear la passkey».')),
      passo(2, L('Il telefono o il computer ti chiede l’impronta, il volto o il PIN: è tutto.', 'Your phone or computer asks for your fingerprint, face or PIN: that is all.', 'El teléfono o el ordenador te pide la huella, la cara o el PIN: eso es todo.')),
      passo(3, L('La prossima volta entri con lo stesso gesto.', 'Next time you get in with the same gesture.', 'La próxima vez entras con el mismo gesto.')), b, m, indietro(), piede());
  }

  function attivaMail() {
    pulisci();
    const m = messaggio();
    const mail = el('input', { type: 'email', id: 'campo-attiva-mail', autocomplete: 'email', inputmode: 'email', placeholder: L('nome@esempio.it', 'name@example.com', 'nombre@ejemplo.es'), 'aria-label': L('La tua mail', 'Your email', 'Tu correo') });
    const campo = campoCodice('campo-attiva-codice', L('Il codice della mail', 'The code from the email', 'El código del correo'));
    const secondo = el('div', { classe: 'secondo', hidden: true },
      passo(2, L('Scrivi qui le 6 cifre che ti abbiamo mandato. Guarda anche fra lo spam.', 'Type the 6 digits we sent you. Check your spam folder too.', 'Escribe aquí las 6 cifras que te hemos mandado. Mira también en el spam.')), campo,
      conBottone(el('button', { classe: 'azione', id: 'btn-attiva-mail-conferma', type: 'button' }, L('Conferma', 'Confirm', 'Confirmar')), m,
        async () => riserve(await chiama('/api/ingresso/attiva/mail/verifica', { codice: campo.value }))));
    const manda = conBottone(el('button', { classe: 'azione', id: 'btn-attiva-mail-manda', type: 'button' }, L('Mandami il codice', 'Send me the code', 'Mándame el código')), m, async () => {
      await chiama('/api/ingresso/attiva/mail/manda', { mail: mail.value, lingua: LINGUA });
      secondo.hidden = false; manda.textContent = L('Mandalo di nuovo', 'Send it again', 'Mándalo otra vez'); manda.classList.add('secondaria'); campo.focus();
    });
    metti(el('h1', { testo: T.mail[0] }), passo(1, L('Scrivi la tua mail.', 'Type your email.', 'Escribe tu correo.')), mail, manda, secondo, m, indietro(), piede());
    mail.focus();
  }

  async function attivaTotp() {
    pulisci();
    const m = messaggio();
    let d;
    try { d = await chiama('/api/ingresso/attiva/totp/inizio', {}); } catch (e) { metti(m, indietro()); sbaglio(m, e); return; }
    const qr = el('div', { classe: 'qr', role: 'img', 'aria-label': L('Il QR da inquadrare con l’app', 'The QR to scan with the app', 'El QR para escanear con la app') });
    try { const p = window.SB_QR.progetto(d.indirizzo); qr.innerHTML = window.SB_QR.svg(p, window.SB_QR.geometria(p, 200)); } catch { qr.hidden = true; }
    const campo = campoCodice('campo-attiva-totp', L('Le 6 cifre dell’app', 'The 6 digits from the app', 'Las 6 cifras de la app'));
    const b = conBottone(el('button', { classe: 'azione', id: 'btn-attiva-totp', type: 'button' }, L('Conferma', 'Confirm', 'Confirmar')), m,
      async () => riserve(await chiama('/api/ingresso/attiva/totp/verifica', { codice: campo.value })));
    metti(el('h1', { testo: T.totp[0] }),
      passo(1, L('Nell’app tocca «+» e inquadra questo QR.', 'In the app tap «+» and scan this QR.', 'En la app toca «+» y escanea este QR.')), qr,
      el('p', { classe: 'minuta' }, L('Non puoi inquadrare? Scrivi questa chiave: ', 'Cannot scan? Type this key: ', '¿No puedes escanear? Escribe esta clave: '), el('code', { classe: 'chiave', testo: d.segreto.replace(/(.{4})/g, '$1 ').trim() })),
      passo(2, L('Scrivi qui le 6 cifre che l’app ti mostra.', 'Type the 6 digits the app shows you.', 'Escribe aquí las 6 cifras que te muestra la app.')), campo, b, m, indietro(), piede());
  }

  function riserve(r) {
    pulisci();
    const codici = (r && r.riserve) || [];
    const m = messaggio();
    const testo = codici.join('\n');
    const salvati = el('input', { type: 'checkbox', id: 'spunta-riserve' });
    const vai = el('button', { classe: 'azione', id: 'btn-riserve-entra', type: 'button', disabled: true, suclick: () => entra(r) }, L('Entra', 'Sign in', 'Entrar'));
    salvati.addEventListener('change', () => { vai.disabled = !salvati.checked; });
    const scarica = el('button', { classe: 'azione secondaria', id: 'btn-riserve-scarica', type: 'button', suclick: () => {
      const a = el('a', { href: URL.createObjectURL(new Blob([L('Codici di riserva di SocialBot', 'SocialBot backup codes', 'Códigos de reserva de SocialBot') + '\n\n' + testo + '\n'], { type: 'text/plain' })), download: 'socialbot-codici-di-riserva.txt' });
      document.body.append(a); a.click(); a.remove();
    } }, L('Scarica', 'Download', 'Descargar'));
    metti(
      el('p', { classe: 'fatto', testo: L('Fatto: la seconda prova è attiva.', 'Done: the second check is on.', 'Hecho: la segunda prueba está activa.') }),
      el('h1', { testo: L('Ultima cosa: i codici di riserva', 'One last thing: backup codes', 'Una última cosa: los códigos de reserva') }),
      el('p', { testo: L('Se un giorno perdi il telefono, con uno di questi entri lo stesso. Ognuno vale una volta. Salvali in un posto sicuro: il portachiavi, o un foglio.', 'If one day you lose your phone, any of these gets you in. Each one works once. Keep them somewhere safe: your keychain, or a piece of paper.', 'Si un día pierdes el teléfono, con uno de estos entras igual. Cada uno vale una vez. Guárdalos en un sitio seguro: el llavero, o un papel.') }),
      el('ol', { classe: 'codici', id: 'lista-riserve' }, codici.map((c) => el('li', { testo: c }))),
      el('p', { classe: 'minuta', testo: L('Tocca un codice per selezionarlo, o scaricali tutti in un file.', 'Tap a code to select it, or download them all as a file.', 'Toca un código para seleccionarlo, o descárgalos todos en un archivo.') }), scarica,
      el('label', { classe: 'spunta', for: 'spunta-riserve' }, salvati, L(' Li ho salvati', ' I have saved them', ' Los he guardado')),
      vai, m);
  }

  function disegna() {
    pulisci();
    if (stato.modo === 'verifica') verifica(); else attiva();
  }

  chiama('/api/ingresso/prova').then((s) => {
    if (s.stato !== 'attesa') { location.href = s.vai || '/ingresso'; return; }
    stato = s;
    disegna();
  }).catch(() => { location.href = '/ingresso'; });
})();
