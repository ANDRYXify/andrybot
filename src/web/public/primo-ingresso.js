// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function () {
  'use strict';
  const { L, el, chiama, errore } = window.SB_INGRESSO;
  const scatola = document.getElementById('primo');
  document.title = L('Primo ingresso', 'First sign-in', 'Primer acceso') + ' | SocialBot';
  const logo = scatola.querySelector('img');
  const metti = (...x) => scatola.append(...x.filter((v) => v != null && v !== false));

  const domanda = (n, etichetta, campo, nota) => el('div', { classe: 'domanda' },
    el('label', { classe: 'domanda-testo', for: campo.id }, el('span', { classe: 'passo-n', testo: String(n) }), el('span', { testo: etichetta })),
    campo, nota ? el('p', { classe: 'minuta', testo: nota }) : null);
  const testo = (id, valore, max, segnaposto) => el('input', { type: 'text', id, maxlength: String(max), value: valore || '', placeholder: segnaposto, autocomplete: 'off' });
  const lungo = (id, valore, segnaposto) => { const t = el('textarea', { id, maxlength: '240', rows: '3', placeholder: segnaposto }); t.value = valore || ''; return t; };
  const scelte = (nome, voci, valore) => el('div', { classe: 'scelte-piccole', role: 'radiogroup' }, voci.map(([v, t]) => el('label', { classe: 'scelta-piccola' },
    el('input', { type: 'radio', name: nome, value: v, checked: v === valore }), el('span', { testo: t }))));
  const scelto = (nome) => document.querySelector(`input[name="${nome}"]:checked`)?.value || '';

  function attesa(d) {
    return el('div', { classe: 'attesa', id: 'conto-attesa' },
      el('strong', { testo: L('Il tuo conto aspetta l’approvazione', 'Your account is waiting for approval', 'Tu cuenta espera la aprobación') }),
      el('p', { testo: L('Come oggi per tutti: il pannello si apre quando il conto è approvato. Si apre così:', 'As for everyone today: the panel opens once the account is approved. It opens like this:', 'Como hoy para todos: el panel se abre cuando la cuenta está aprobada. Se abre así:') }),
      el('ul', { classe: 'strade' },
        el('li', { testo: L('Se sei uno streamer di andryxify.it, entra dal sito col tuo pass, da questo stesso browser.', 'If you are an andryxify.it streamer, come in from the site with your pass, from this same browser.', 'Si eres streamer de andryxify.it, entra desde el sitio con tu pase, desde este mismo navegador.') }),
        d.abbonamento ? el('li', { testo: L('Oppure scegli un abbonamento: il conto si apre appena il pagamento passa.', 'Or pick a subscription: the account opens as soon as the payment goes through.', 'O elige una suscripción: la cuenta se abre en cuanto pasa el pago.') }) : null,
        el('li', { testo: L('Oppure aspetta: lo guarda andryxify.', 'Or wait: andryxify looks at it.', 'O espera: lo revisa andryxify.') })),
      el('a', { classe: 'azione secondaria', href: 'https://www.andryxify.it' }, L('Vai ad andryxify.it', 'Go to andryxify.it', 'Ir a andryxify.it')),
      d.abbonamento ? abbonati() : null);
  }
  function abbonati() {
    const m = el('div', { classe: 'msg', role: 'status' });
    const b = el('button', { classe: 'azione', id: 'btn-conto-abbonati', type: 'button' }, L('Scegli un abbonamento', 'Pick a subscription', 'Elige una suscripción'));
    b.addEventListener('click', async () => {
      b.disabled = true;
      try { const r = await chiama('/api/ingresso/abbonati', {}); location.href = r.vai; } catch (e) { m.className = 'msg err'; m.textContent = errore(e); b.disabled = false; }
    });
    return el('div', {}, b, m);
  }

  function disegna(d) {
    scatola.replaceChildren(logo);
    const r = d.conto.risposte || {};
    if (d.conto.stato === 'approvato') {
      metti(el('h1', { testo: L('Il tuo conto è approvato', 'Your account is approved', 'Tu cuenta está aprobada') }),
        el('p', { testo: L('Entra con la tua mail: ti chiediamo anche una seconda prova che sei tu.', 'Sign in with your email: we also ask for a second check that it is you.', 'Entra con tu correo: también te pedimos una segunda prueba de que eres tú.') }),
        el('a', { classe: 'azione', href: '/ingresso' }, L('Entra', 'Sign in', 'Entrar')));
      return;
    }
    const m = el('div', { classe: 'msg', role: 'status' });
    const salva = el('button', { classe: 'azione', id: 'btn-domande-salva', type: 'button' }, L('Salva le risposte', 'Save the answers', 'Guardar las respuestas'));
    salva.addEventListener('click', async () => {
      m.className = 'msg'; m.textContent = '';
      salva.disabled = true;
      try {
        await chiama('/api/ingresso/domande', { risposte: {
          nome: document.getElementById('d-nome').value, argomento: document.getElementById('d-argomento').value,
          tono: scelto('d-tono'), genere: scelto('d-genere'), community: document.getElementById('d-community').value,
          lingua: scelto('d-lingua'), evita: document.getElementById('d-evita').value,
        } });
        m.className = 'msg ok'; m.textContent = L('Salvate. Le cambi quando vuoi dal pannello.', 'Saved. You can change them any time from the panel.', 'Guardadas. Las cambias cuando quieras desde el panel.');
      } catch (e) { m.className = 'msg err'; m.textContent = errore(e); }
      finally { salva.disabled = false; }
    });
    metti(
      el('p', { classe: 'fatto', testo: L('Fatto: la tua mail è confermata.', 'Done: your email is confirmed.', 'Hecho: tu correo está confirmado.') }),
      el('h1', { testo: L('Presenta il tuo canale al bot', 'Introduce your channel to the bot', 'Presenta tu canal al bot') }),
      el('p', { testo: L('Sette domande, tutte facoltative: il bot comincia sapendo chi sei. Tutto si cambia dopo.', 'Seven questions, all optional: the bot starts out knowing who you are. Everything can be changed later.', 'Siete preguntas, todas opcionales: el bot empieza sabiendo quién eres. Todo se cambia después.') }),
      el('div', { classe: 'domande', id: 'domande' },
        domanda(1, L('Come si chiama il tuo canale?', 'What is your channel called?', '¿Cómo se llama tu canal?'), testo('d-nome', r.nome, 40, L('Per esempio: Andryx', 'For example: Andryx', 'Por ejemplo: Andryx'))),
        domanda(2, L('Di cosa parla?', 'What is it about?', '¿De qué va?'), lungo('d-argomento', r.argomento, L('Giochi horror, chiacchiere la domenica…', 'Horror games, chatting on Sundays…', 'Juegos de terror, charlas los domingos…'))),
        domanda(3, L('Che tono deve avere il bot?', 'What tone should the bot have?', '¿Qué tono debe tener el bot?'), scelte('d-tono', [['scherzoso', L('Scherzoso', 'Playful', 'Bromista')], ['amichevole', L('Amichevole', 'Friendly', 'Amistoso')], ['serio', L('Serio', 'Serious', 'Serio')]], r.tono)),
        domanda(4, L('Il bot parla di sé…', 'The bot speaks of itself…', 'El bot habla de sí…'), scelte('d-genere', [['neutro', L('senza genere', 'without gender', 'sin género')], ['femminile', L('al femminile', 'as feminine', 'en femenino')], ['maschile', L('al maschile', 'as masculine', 'en masculino')]], r.genere)),
        domanda(5, L('Come chiami la tua community?', 'What do you call your community?', '¿Cómo llamas a tu comunidad?'), testo('d-community', r.community, 60, L('Per esempio: ciurma', 'For example: crew', 'Por ejemplo: tripulación'))),
        domanda(6, L('In che lingua scrive la tua chat?', 'What language does your chat write in?', '¿En qué idioma escribe tu chat?'), scelte('d-lingua', [['it', 'Italiano'], ['en', 'English'], ['es', 'Español']], r.lingua)),
        domanda(7, L('Cosa non deve dire mai?', 'What must it never say?', '¿Qué no debe decir nunca?'), lungo('d-evita', r.evita, L('Spoiler, il mio nome vero…', 'Spoilers, my real name…', 'Spoilers, mi nombre real…')))),
      salva, m, attesa(d),
      el('p', { classe: 'piccolo' }, el('a', { href: '/privacy', testo: L('Privacy e sicurezza', 'Privacy and security', 'Privacidad y seguridad') })));
  }

  chiama('/api/ingresso/conto').then((d) => {
    if (!d.conto) { location.href = '/ingresso'; return; }
    disegna(d);
  }).catch(() => { location.href = '/ingresso'; });
})();
