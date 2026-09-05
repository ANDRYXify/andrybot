// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


(function () {
  var q = new URLSearchParams(location.search);
  var invito = q.get('invito');
  var errore = q.get('errore');
  var btn = document.getElementById('btn');
  btn.href = '/auth/mod' + (invito ? ('?invito=' + encodeURIComponent(invito)) : '');
  if (!invito) {
    document.getElementById('intro').innerHTML =
      'Accedi con Twitch per gestire i canali di cui sei <strong>moderatore</strong>. ' +
      'Se hai ricevuto un <em>link d’invito</em>, aprilo per la prima volta.';
  }
  var testi = {
    state: 'Sessione scaduta, riprova ad aprire il link.',
    validazione: 'Twitch non ha confermato l’accesso, riprova.',
    invito: 'Invito non valido o già usato. Chiedi allo streamer un nuovo link.',
    scaduto: 'L’invito è scaduto. Chiedi allo streamer di reinviartelo.',
    'account-diverso': 'Hai fatto login con un account diverso da quello invitato: usa lo stesso.',
    nonmod: 'Questo account non gestisce nessun canale. Serve un invito dallo streamer.'
  };
  if (errore) {
    var m = document.getElementById('msg');
    m.className = 'msg err';
    m.textContent = testi[errore] || ('Non riuscito: ' + errore);
  }

  fetch('/api/me', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var altre = false;
      if (d && d.kickAperto) { document.getElementById('btn-kick').hidden = false; altre = true; }
      if (d && d.youtubeAperto) { document.getElementById('btn-youtube').hidden = false; altre = true; }
      if (altre) document.getElementById('altre-porte').hidden = false;
    })
    .catch(function () {});
})();
