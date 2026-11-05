// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  const { L, LINGUA, el, chiama, errore, prova } = window.SB_INGRESSO;
  const scatola = document.getElementById('aiuto');
  document.title = L('Non riesci a entrare', 'Cannot sign in', 'No puedes entrar') + ' | SocialBot';
  const logo = scatola.querySelector('img');
  const metti = (...x) => scatola.append(...x.filter((v) => v != null && v !== false));
  const pulisci = () => scatola.replaceChildren(logo);
  const scelta = (id, titolo, perche, fare) => el('button', { classe: 'scelta', id, type: 'button', suclick: fare },
    el('span', { classe: 'scelta-titolo', testo: titolo }), el('span', { classe: 'scelta-perche', testo: perche }));
  const indietro = () => el('button', { classe: 'link-indietro', type: 'button', suclick: () => inizio() }, L('← Torna indietro', '← Go back', '← Volver'));
  const campo = (id, etichetta, attr = {}) => [el('label', { for: id, testo: etichetta }), el('input', { type: 'text', id, autocomplete: 'off', ...attr })];
  const ERR = {
    conto: () => L('Scrivi il nome del canale o la mail con cui entri.', 'Type the channel name or the email you sign in with.', 'Escribe el nombre del canal o el correo con el que entras.'),
    contatti: () => L('Scrivi almeno un contatto giusto, così possiamo raggiungerti.', 'Type at least one valid contact, so we can reach you.', 'Escribe al menos un contacto válido, para poder contactarte.'),
  };
  const sbaglio = (m, e) => { m.className = 'msg err'; m.textContent = (ERR[e?.codice] || (() => errore(e)))(); };

  function daSoli(titolo, testo) {
    pulisci();
    metti(el('h1', { testo: titolo }), el('p', { classe: 'grande', testo }),
      el('a', { classe: 'azione', href: '/ingresso' }, L('Vai a entrare', 'Go and sign in', 'Ir a entrar')), indietro());
  }

  function richiesta(problema) {
    pulisci();
    const m = el('div', { classe: 'msg', role: 'status' });
    const [lConto, conto] = campo('aiuto-conto', L('Il tuo canale, o la mail con cui entri', 'Your channel, or the email you sign in with', 'Tu canal, o el correo con el que entras'));
    const motivo = el('select', { id: 'aiuto-problema', 'aria-label': L('Cosa non va', 'What is wrong', 'Qué pasa') },
      [['password', L('Non ricordo la password', 'I do not remember the password', 'No recuerdo la contraseña')], ['fattore', L('Ho perso la seconda prova', 'I lost my second check', 'He perdido la segunda prueba')],
        ['mail', L('Non ricevo più la mail', 'I no longer get the email', 'Ya no recibo el correo')], ['altro', L('Altro', 'Something else', 'Otra cosa')]]
        .map(([v, t]) => el('option', { value: v, selected: v === problema }, t)));
    const testo = el('textarea', { id: 'aiuto-riga', maxlength: '200', rows: '2', placeholder: L('Cosa succede, in una riga', 'What happens, in one line', 'Qué pasa, en una línea') });
    const [lDc, dc] = campo('aiuto-discord', 'Discord', { placeholder: L('il tuo nome su Discord', 'your Discord name', 'tu nombre en Discord') });
    const [lTg, tg] = campo('aiuto-telegram', 'Telegram', { placeholder: '@nome' });
    const [lIg, ig] = campo('aiuto-instagram', 'Instagram', { placeholder: '@nome' });
    const [lMl, ml] = campo('aiuto-mail', L('Una mail che leggi', 'An email you read', 'Un correo que lees'), { type: 'email', placeholder: L('nome@esempio.it', 'name@example.com', 'nombre@ejemplo.es') });
    const manda = el('button', { classe: 'azione', id: 'btn-aiuto-manda', type: 'button' }, L('Manda la richiesta', 'Send the request', 'Enviar la solicitud'));
    manda.addEventListener('click', async () => {
      m.className = 'msg'; m.textContent = L('Un attimo…', 'One moment…', 'Un momento…');
      manda.disabled = true;
      try {
        const p = await prova('aiuto');
        const r = await chiama('/api/aiuto-accesso', { conto: conto.value, problema: motivo.value, riga: testo.value, lingua: LINGUA,
          contatti: { discord: dc.value, telegram: tg.value, instagram: ig.value, mail: ml.value }, ...p });
        mandata(r.pratica);
      } catch (e) { sbaglio(m, e); manda.disabled = false; }
    });
    metti(el('h1', { testo: L('Chiedi aiuto', 'Ask for help', 'Pide ayuda') }),
      el('p', { testo: L('La guarda andryxify, a mano. Ti scrive su uno dei contatti qui sotto, e solo dopo aver controllato che sei tu ti manda il modo di rientrare.', 'andryxify looks at it by hand. He writes to you on one of the contacts below, and only after checking it is you he sends you the way back in.', 'La revisa andryxify, a mano. Te escribe en uno de los contactos de abajo, y solo después de comprobar que eres tú te manda la forma de volver a entrar.') }),
      el('div', { classe: 'con-mail modulo-aiuto' }, lConto, conto, el('label', { for: 'aiuto-problema', testo: L('Cosa non va', 'What is wrong', 'Qué pasa') }), motivo, testo,
        el('p', { classe: 'minuta', testo: L('Come ti raggiungiamo (almeno uno). Se sono gli stessi collegati al tuo canale, si fa prima.', 'How we reach you (at least one). If they are the same ones linked to your channel, it is quicker.', 'Cómo te contactamos (al menos uno). Si son los mismos vinculados a tu canal, es más rápido.') }),
        lDc, dc, lTg, tg, lIg, ig, lMl, ml, manda, m),
      indietro());
    conto.focus();
  }

  function mandata(pratica) {
    pulisci();
    metti(el('p', { classe: 'fatto', testo: L('Richiesta mandata.', 'Request sent.', 'Solicitud enviada.') }),
      el('h1', { testo: L('Il tuo numero di pratica', 'Your case number', 'Tu número de expediente') }),
      el('p', { classe: 'codice-grosso', id: 'aiuto-pratica', testo: pratica }),
      el('p', { testo: L('Salvalo: ti serve per sapere com’è andata. Ti scriviamo sul contatto che hai dato. Nessuno ti chiederà mai la password o un codice.', 'Save it: you need it to see how it went. We write to you on the contact you gave. Nobody will ever ask you for your password or a code.', 'Guárdalo: lo necesitas para saber cómo fue. Te escribimos en el contacto que diste. Nadie te pedirá nunca la contraseña ni un código.') }),
      controlla(pratica));
  }

  function controlla(gia) {
    const m = el('div', { classe: 'msg', role: 'status' });
    const n = el('input', { type: 'text', id: 'aiuto-numero', autocomplete: 'off', maxlength: '9', placeholder: 'ABCD-EFGH', value: gia || '', 'aria-label': L('Il numero di pratica', 'The case number', 'El número de expediente'), classe: 'codice-campo' });
    const b = el('button', { classe: 'azione secondaria', id: 'btn-aiuto-guarda', type: 'button' }, L('Com’è andata?', 'How did it go?', '¿Cómo fue?'));
    const DICE = {
      aperta: () => L('Ricevuta: la stiamo guardando.', 'Received: we are looking at it.', 'Recibida: la estamos revisando.'),
      sbloccata: () => L('Sbloccata: ti abbiamo scritto sul contatto che hai dato.', 'Unlocked: we wrote to you on the contact you gave.', 'Desbloqueada: te hemos escrito en el contacto que diste.'),
      rifiutata: () => L('Non sbloccata.', 'Not unlocked.', 'No desbloqueada.'),
      sconosciuta: () => L('Questo numero non lo troviamo.', 'We cannot find this number.', 'No encontramos este número.'),
    };
    b.addEventListener('click', async () => {
      try { const r = await chiama('/api/aiuto-accesso/pratica?n=' + encodeURIComponent(n.value.trim())); m.className = 'msg ok'; m.textContent = (DICE[r.stato] || DICE.sconosciuta)() + (r.risposta ? ' ' + r.risposta : ''); }
      catch (e) { sbaglio(m, e); }
    });
    return el('div', { classe: 'con-mail', id: 'aiuto-controlla' }, el('label', { for: 'aiuto-numero', testo: gia ? L('Fra un po’, guarda qui com’è andata:', 'In a while, check here how it went:', 'Dentro de un rato, mira aquí cómo fue:') : L('Hai già un numero di pratica?', 'Already have a case number?', '¿Ya tienes un número de expediente?') }), n, b, m);
  }

  function inizio() {
    pulisci();
    metti(el('h1', { testo: L('Non riesci a entrare?', 'Cannot sign in?', '¿No puedes entrar?') }),
      el('p', { classe: 'grande', testo: L('Dicci cosa ti succede: quasi sempre si risolve da soli, in un minuto.', 'Tell us what is happening: it almost always sorts itself out, in a minute.', 'Dinos qué te pasa: casi siempre se resuelve solo, en un minuto.') }),
      el('div', { classe: 'scelte' },
        scelta('aiuto-password', L('Ho dimenticato la password', 'I forgot the password', 'He olvidado la contraseña'), L('Entra con un codice per mail, poi dal pannello ne metti una nuova.', 'Sign in with an email code, then set a new one from the panel.', 'Entra con un código por correo y luego pon una nueva desde el panel.'),
          () => daSoli(L('Entra con un codice per mail', 'Sign in with an email code', 'Entra con un código por correo'), L('Nella pagina per entrare tocca «Entra con un codice per mail». Dentro, nella scheda Account, metti una password nuova.', 'On the sign-in page tap «Sign in with an email code». Inside, in the Account tab, set a new password.', 'En la página para entrar toca «Entra con un código por correo». Dentro, en la pestaña Cuenta, pon una contraseña nueva.'))),
        scelta('aiuto-telefono', L('Ho perso la passkey o il telefono', 'I lost my passkey or my phone', 'He perdido la passkey o el teléfono'), L('Un codice di riserva vale come seconda prova. Dopo attivi quella nuova.', 'A backup code works as the second check. Afterwards you turn on the new one.', 'Un código de reserva vale como segunda prueba. Después activas la nueva.'),
          () => daSoli(L('Usa un codice di riserva', 'Use a backup code', 'Usa un código de reserva'), L('Entra come sempre. Alla seconda prova tocca «Usa un codice di riserva». Dentro, nella scheda Account, attiva la prova nuova e togli quella persa.', 'Sign in as always. At the second check tap «Use a backup code». Inside, in the Account tab, turn on the new check and remove the lost one.', 'Entra como siempre. En la segunda prueba toca «Usa un código de reserva». Dentro, en la pestaña Cuenta, activa la prueba nueva y quita la perdida.'))),
        scelta('aiuto-richiesta', L('Non ricevo la mail, o non ho i codici di riserva', 'I do not get the email, or I have no backup codes', 'No recibo el correo, o no tengo los códigos de reserva'), L('Chiedi aiuto: ti sblocchiamo a mano, dopo aver controllato che sei tu.', 'Ask for help: we unlock you by hand, after checking it is you.', 'Pide ayuda: te desbloqueamos a mano, después de comprobar que eres tú.'), () => richiesta('mail')),
        scelta('aiuto-altro', L('Altro', 'Something else', 'Otra cosa'), L('Raccontacelo in una riga.', 'Tell us in one line.', 'Cuéntanoslo en una línea.'), () => richiesta('altro'))),
      controlla(''),
      el('p', { classe: 'piccolo' }, el('a', { href: '/ingresso', testo: L('Torna alla pagina per entrare', 'Back to the sign-in page', 'Volver a la página para entrar') })));
  }
  inizio();
})();
