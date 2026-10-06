// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL FRASARIO: I PREMI A PUNTI CANALE CHE DURANO (docs/PREMI-A-TEMPO.md). Il
// tempo di un premio che parte, che cresce e che finisce, il premio che adesso
// non si puo' fare, e le risposte di !tempi. Le regole di scrittura sono in
// testa a frasario/diretta.js.
//
// La fine va bene anche quando il tempo lo ferma prima lo streamer o un mod:
// «finito», «si chiude», mai «e' finito il tempo che hai pagato». Che i punti
// sono tornati lo dice solo il rimborso, che esce quando Twitch li ha
// restituiti davvero; l'altro dice che si possono restituire a mano, e non lo
// promette. La durata e il tempo che resta arrivano gia' scritti («1 ora e 30
// minuti»): niente verbo che si accordi con loro («mancano {resta}»). Nelle
// brutte notizie la faccina sta dopo la parte buona, perche' in chat puo'
// diventare un'emote allegra.

export const GRUPPO = { id: 'premi', titolo: ['I premi a punti canale', 'Channel-point rewards', 'Las recompensas de puntos de canal'] };

export const MOMENTI = {
  'premio-tempo-via': {
    titolo: ['Parte il tempo di un premio', 'A reward timer starts', 'Empieza el tiempo de una recompensa'],
    quando: [
      'Quando qualcuno riscatta un premio a punti canale che dura (Effetti, «Premi a tempo») e il suo tempo parte. Se il premio ha un messaggio suo, esce quello.',
      'When someone redeems a channel points reward that lasts (Effects, “Timed rewards”) and its timer starts. If the reward has its own message, that one is used.',
      'Cuando alguien canjea una recompensa de puntos del canal que dura (Efectos, «Recompensas con tiempo») y su tiempo empieza. Si la recompensa tiene su propio mensaje, sale ese.',
    ],
    dati: { nome: 'sempre', premio: 'sempre', durata: 'sempre' },
    esempio: { nome: 'Luna', premio: 'Parla in inglese', durata: '10 minuti' },
    spegnibile: true,
    frasi: {
      it: {
        scherzoso: [
          '{nome} ha riscattato «{premio}»! Cronometro partito: {durata} da adesso {:⏱️}',
          'Via! «{premio}» per {durata}, offre {nome} {:🏁}',
          'Punti spesi bene da {nome}: «{premio}» è servito, con {durata} sul cronometro {:😏}',
          'Si gira la clessidra: {durata} di «{premio}», grazie a {nome} {:⏳}',
          'Attenzione, attenzione: «{premio}» parte adesso e dura {durata}. Colpa di {nome} {:📣}',
          '{nome} accende la miccia: «{premio}» per {durata}, e il conto alla rovescia è già partito {:🧨}',
        ],
        amichevole: [
          '{nome}, che bella scelta: «{premio}» parte adesso e dura {durata} {:💜}',
          '{nome} ha scelto «{premio}»: il tempo è partito, {durata} da adesso {:😊}',
          'Evviva, {nome}! Il cronometro di «{premio}» è partito con {durata} {:🤗}',
          'Ci siamo, {nome}: «{premio}» per {durata}, e quanto manca lo dice !tempi {:🙌}',
          'Grazie dei punti, {nome}! «{premio}» è attivo per {durata} {:💜}',
          'Partito il tempo di «{premio}»: {durata}, grazie a {nome} {:😊}',
        ],
        serio: [
          '{nome} ha riscattato «{premio}»: durata {durata}.',
          '«{premio}» attivo per {durata}. Grazie, {nome}.',
          'Tempo avviato per «{premio}», riscattato da {nome}: {durata}.',
          'Da adesso e per {durata}: «{premio}». Lo ha riscattato {nome}.',
          '{nome}, «{premio}» parte adesso e dura {durata}. Per vedere quanto manca: !tempi.',
          'Parte «{premio}» per {durata}, grazie a {nome} {:⏳}',
        ],
      },
      en: {
        scherzoso: [
          '{nome} redeemed “{premio}”! Timer on: {durata} from now {:⏱️}',
          'Go! “{premio}” for {durata}, courtesy of {nome} {:🏁}',
          'Points well spent by {nome}: “{premio}” is served, with {durata} on the clock {:😏}',
          'Flip the hourglass: {durata} of “{premio}”, thanks to {nome} {:⏳}',
          'Attention, attention: “{premio}” starts now and lasts {durata}. Blame {nome} {:📣}',
          '{nome} lit the fuse: “{premio}” for {durata}, and the countdown is already running {:🧨}',
        ],
        amichevole: [
          '{nome}, great pick: “{premio}” starts now and lasts {durata} {:💜}',
          '{nome} chose “{premio}”: the clock is running, {durata} from now {:😊}',
          'Yay, {nome}! The “{premio}” timer just started with {durata} {:🤗}',
          'Here we go, {nome}: “{premio}” for {durata}, and !tempi shows how much is left {:🙌}',
          'Thanks for the points, {nome}! “{premio}” is on for {durata} {:💜}',
          'The time for “{premio}” has started: {durata}, thanks to {nome} {:😊}',
        ],
        serio: [
          '{nome} redeemed “{premio}”: duration {durata}.',
          '“{premio}” active for {durata}. Thank you, {nome}.',
          'Timer started for “{premio}”, redeemed by {nome}: {durata}.',
          'Starting now, for {durata}: “{premio}”, a redemption from {nome}.',
          '{nome}, “{premio}” starts now and lasts {durata}. To see how much is left: !tempi.',
          'Now running: “{premio}” for {durata}, thanks to {nome} {:⏳}',
        ],
      },
      es: {
        scherzoso: [
          '¡{nome} canjeó «{premio}»! Cronómetro en marcha: {durata} desde ya {:⏱️}',
          '¡Ya! «{premio}» durante {durata}, cortesía de {nome} {:🏁}',
          'Puntos bien gastados por {nome}: ¡marchando «{premio}», con {durata} en el cronómetro! {:😏}',
          'Se da la vuelta al reloj de arena: {durata} de «{premio}», gracias a {nome} {:⏳}',
          'Atención, atención: «{premio}» empieza ahora y dura {durata}. La culpa es de {nome} {:📣}',
          '{nome} encendió la mecha: «{premio}» durante {durata}, y la cuenta atrás ya corre {:🧨}',
        ],
        amichevole: [
          '{nome}, qué buena elección: «{premio}» empieza ahora y dura {durata} {:💜}',
          '{nome} eligió «{premio}»: el tiempo ya corre, {durata} desde ahora {:😊}',
          '¡Bien, {nome}! El cronómetro de «{premio}» arrancó con {durata} {:🤗}',
          'Aquí vamos, {nome}: «{premio}» durante {durata}, y con !tempi se ve cuánto falta {:🙌}',
          '¡Gracias por los puntos, {nome}! «{premio}» está en marcha durante {durata} {:💜}',
          'Empezó el tiempo de «{premio}»: {durata}, gracias a {nome} {:😊}',
        ],
        serio: [
          '{nome} canjeó «{premio}»: duración {durata}.',
          '«{premio}» en marcha durante {durata}. Gracias, {nome}.',
          'Tiempo iniciado para «{premio}», canje de {nome}: {durata}.',
          'Desde ahora y durante {durata}: «{premio}». Lo canjeó {nome}.',
          '{nome}, «{premio}» empieza ahora y dura {durata}. Para ver cuánto falta: !tempi.',
          'Arranca «{premio}»: {durata}, gracias a {nome} {:⏳}',
        ],
      },
    },
  },

  'premio-tempo-piu': {
    titolo: ['Il tempo di un premio cresce', 'A reward timer grows', 'Crece el tiempo de una recompensa'],
    quando: [
      'Quando qualcuno riscatta di nuovo un premio mentre il suo tempo corre, e il tempo cresce (Effetti, «Premi a tempo»). Dice quanto manca adesso.',
      'When someone redeems a reward again while its timer is running, and the time grows (Effects, “Timed rewards”). It says how much is left now.',
      'Cuando alguien vuelve a canjear una recompensa mientras su tiempo corre, y el tiempo crece (Efectos, «Recompensas con tiempo»). Dice cuánto falta ahora.',
    ],
    dati: { nome: 'sempre', premio: 'sempre', resta: 'sempre' },
    esempio: { nome: 'Marco', premio: 'Parla in inglese', resta: '18 minuti' },
    spegnibile: true,
    frasi: {
      it: {
        scherzoso: [
          '{nome} rilancia su «{premio}»! Adesso sul cronometro: {resta} {:😏}',
          'Ancora «{premio}»? Ma certo! Grazie a {nome} il conto sale a {resta} {:📈}',
          '{nome} ci mette altri punti e «{premio}» si allunga: {resta} da qui alla fine {:⏳}',
          'Chi lo ferma più? {nome} rinnova «{premio}»: il cronometro dice {resta} {:😂}',
          'Benzina sul fuoco: {nome} ricarica «{premio}», e adesso si arriva a {resta} {:🔥}',
          'Colpo di scena: «{premio}» non finisce più! {nome} lo riscatta di nuovo, ancora {resta} {:🙃}',
        ],
        amichevole: [
          'Grazie {nome}! Un altro giro di «{premio}»: il conto adesso è {resta} {:💜}',
          '{nome} riscatta di nuovo «{premio}»: adesso il cronometro segna {resta} {:😊}',
          'Altro tempo per «{premio}», grazie a {nome}: si va avanti per {resta} {:🤗}',
          'Che bello, {nome}! Con questo riscatto «{premio}» arriva a {resta} {:🙌}',
          '{nome} allunga «{premio}», {resta} da adesso {:💜}',
          'Si continua con «{premio}» grazie a {nome}: ancora {resta} {:😊}',
        ],
        serio: [
          '{nome} ha riscattato di nuovo «{premio}». Tempo rimasto: {resta}.',
          '«{premio}» rinnovato da {nome}. Adesso: {resta}.',
          'Tempo aggiunto a «{premio}», grazie a {nome}. Al cronometro: {resta}.',
          'Nuovo riscatto di «{premio}» da parte di {nome}: {resta} alla fine.',
          '{nome}, «{premio}» continua: {resta} da adesso.',
          'Il tempo di «{premio}» cresce con il riscatto di {nome}: adesso {resta} {:⏳}',
        ],
      },
      en: {
        scherzoso: [
          '{nome} doubles down on “{premio}”! The clock now says {resta} {:😏}',
          'More “{premio}”? Of course! Thanks to {nome}, we\'re up to {resta} {:📈}',
          '{nome} throws in more points and “{premio}” keeps going: {resta} left {:⏳}',
          'Who can stop it now? {nome} renews “{premio}”: {resta} on the clock {:😂}',
          'Fuel on the fire: {nome} recharges “{premio}”, and now it\'s up to {resta} {:🔥}',
          'Plot twist: “{premio}” never ends! {nome} redeemed it again, {resta} to go {:🙃}',
        ],
        amichevole: [
          'Thanks, {nome}! Another round of “{premio}”: {resta} left now {:💜}',
          '{nome} redeemed “{premio}” again: the clock now reads {resta} {:😊}',
          'More time for “{premio}”, thanks to {nome}: it keeps going for {resta} {:🤗}',
          'Love it, {nome}! With this one “{premio}” goes up to {resta} {:🙌}',
          '{nome} extends “{premio}”, {resta} from now {:💜}',
          '“{premio}” keeps going thanks to {nome}: {resta} to go {:😊}',
        ],
        serio: [
          '{nome} redeemed “{premio}” again. Time left: {resta}.',
          '“{premio}” renewed by {nome}. Now: {resta}.',
          'Time added to “{premio}”, thanks to {nome}. On the clock: {resta}.',
          'New redemption of “{premio}” from {nome}: {resta} until it ends.',
          '{nome}, “{premio}” continues: {resta} from now.',
          'The “{premio}” timer grows with {nome}\'s redemption: now {resta} {:⏳}',
        ],
      },
      es: {
        scherzoso: [
          '¡{nome} sube la apuesta con «{premio}»! El cronómetro marca ahora {resta} {:😏}',
          '¿Más «{premio}»? ¡Claro! Gracias a {nome}, el contador sube a {resta} {:📈}',
          '{nome} pone más puntos y «{premio}» se alarga: {resta} por delante {:⏳}',
          '¿Quién lo para ahora? {nome} renueva «{premio}»: el reloj dice {resta} {:😂}',
          'Leña al fuego: {nome} recarga «{premio}», cronómetro en {resta} {:🔥}',
          'Giro de guion: ¡«{premio}» no se acaba nunca! {nome} lo canjeó otra vez y el reloj se va a {resta} {:🙃}',
        ],
        amichevole: [
          '¡Gracias, {nome}! Otra ronda de «{premio}», con {resta} por delante {:💜}',
          '{nome} vuelve a canjear «{premio}»: el cronómetro ahora marca {resta} {:😊}',
          'Más tiempo para «{premio}», gracias a {nome}: {resta} en el reloj {:🤗}',
          '¡Qué bien, {nome}! Con este canje «{premio}» llega a {resta} {:🙌}',
          '{nome} alarga «{premio}»: {resta} desde ahora {:💜}',
          'Seguimos con «{premio}» gracias a {nome}: todavía {resta} {:😊}',
        ],
        serio: [
          '{nome} volvió a canjear «{premio}». Tiempo restante: {resta}.',
          '«{premio}» renovado por {nome}. Ahora: {resta}.',
          'Tiempo añadido a «{premio}», gracias a {nome}. En el reloj: {resta}.',
          'Nuevo canje de «{premio}» por parte de {nome}: {resta} hasta el final.',
          '{nome}, «{premio}» continúa: {resta} desde ahora.',
          'El tiempo de «{premio}» crece con el canje de {nome}: ahora {resta} {:⏳}',
        ],
      },
    },
  },

  'premio-tempo-fine': {
    titolo: ['Finisce il tempo di un premio', 'A reward timer ends', 'Termina el tiempo de una recompensa'],
    quando: [
      'Quando il tempo di un premio finisce, da solo o perché lo ferma prima un mod (!tempi stop) o tu (Effetti, «Premi a tempo»). Le modalità della chat dicono da sole la loro fine, e un VIP che scade non si annuncia.',
      'When a reward timer ends, on its own or because a mod stops it early (!tempi stop) or you do (Effects, “Timed rewards”). Chat modes announce their own end, and an expiring VIP is not announced.',
      'Cuando termina el tiempo de una recompensa, por sí solo o porque un mod lo detiene antes (!tempi stop) o lo haces tú (Efectos, «Recompensas con tiempo»). Los modos del chat anuncian solos su final, y un VIP que vence no se anuncia.',
    ],
    dati: { premio: 'sempre', nome: 'sempre' },
    esempio: { premio: 'Parla in inglese', nome: 'Luna' },
    spegnibile: true,
    frasi: {
      it: {
        scherzoso: [
          'Driiin! Tempo scaduto per «{premio}», si torna alla normalità {:⏰}',
          'E anche «{premio}» si chiude. Grazie {nome}, è stato divertente {:😄}',
          'Fine dei giochi per «{premio}». {nome}, punti ben spesi {:😏}',
          'Si chiude il sipario su «{premio}». Applausi a {nome} {:👏}',
          'Tempo scaduto! «{premio}» finisce in archivio. Grazie di tutto, {nome} {:📦}',
          '«{premio}» ci saluta. Chi lo vuole di nuovo sa cosa fare, vero, {nome}? {:😉}',
        ],
        amichevole: [
          'Finito il tempo di «{premio}». Grazie {nome}, è stato bello {:💜}',
          '«{premio}» si chiude qui. Grazie ancora a {nome} per averlo scelto {:😊}',
          'Si torna come prima: «{premio}» è finito. Grazie per l\'idea, {nome} {:🤗}',
          'Fine di «{premio}»! È stato un piacere, {nome} {:🙌}',
          'Tempo scaduto per «{premio}». Quando vuoi, {nome}, si rifà {:💜}',
          'Si spegne «{premio}». Grazie per il tempo passato insieme, {nome} {:😊}',
        ],
        serio: [
          'Tempo scaduto per «{premio}».',
          '«{premio}» è finito. Grazie, {nome}.',
          'Fine di «{premio}», riscattato da {nome}.',
          'Si chiude «{premio}». Tutto torna come prima.',
          '«{premio}» termina qui. Grazie a {nome}.',
          'Concluso il tempo di «{premio}» {:⏰}',
        ],
      },
      en: {
        scherzoso: [
          'Ding ding! Time\'s up for “{premio}”, back to normal {:⏰}',
          'And “{premio}” wraps up too. Thanks, {nome}, that was fun {:😄}',
          'Game over for “{premio}”. {nome}, points well spent {:😏}',
          'The curtain falls on “{premio}”. A round of applause for {nome} {:👏}',
          'Time\'s up! “{premio}” goes into the archive. Thanks for everything, {nome} {:📦}',
          '“{premio}” says goodbye. Anyone who wants it again knows what to do, right, {nome}? {:😉}',
        ],
        amichevole: [
          '“{premio}” is over. Thanks, {nome}, that was lovely {:💜}',
          '“{premio}” ends here. Thanks again to {nome} for picking it {:😊}',
          'Back to normal: “{premio}” is done. Thanks for the idea, {nome} {:🤗}',
          'That\'s the end of “{premio}”! It was a pleasure, {nome} {:🙌}',
          'Time\'s up for “{premio}”. Whenever you like, {nome}, we can do it again {:💜}',
          '“{premio}” switches off. Thanks for the time together, {nome} {:😊}',
        ],
        serio: [
          'Time\'s up for “{premio}”.',
          '“{premio}” is over. Thank you, {nome}.',
          'End of “{premio}”, redeemed by {nome}.',
          '“{premio}” closes. Everything goes back to how it was.',
          '“{premio}” ends here. Thanks to {nome}.',
          'The “{premio}” timer is done {:⏰}',
        ],
      },
      es: {
        scherzoso: [
          '¡Riiing! Se acabó el tiempo de «{premio}», volvemos a la normalidad {:⏰}',
          'Y «{premio}» también se cierra. Gracias, {nome}, fue divertido {:😄}',
          'Fin del juego para «{premio}». {nome}, puntos bien gastados {:😏}',
          'Cae el telón sobre «{premio}». Un aplauso para {nome} {:👏}',
          '¡Tiempo! «{premio}» pasa al archivo. Gracias por todo, {nome} {:📦}',
          '«{premio}» se despide. Quien lo quiera otra vez ya sabe qué hacer, ¿verdad, {nome}? {:😉}',
        ],
        amichevole: [
          'Terminó el tiempo de «{premio}». Gracias, {nome}, fue bonito {:💜}',
          '«{premio}» se cierra aquí. Gracias otra vez a {nome} por elegirlo {:😊}',
          'Volvemos a lo de antes: se acabó «{premio}». Gracias por la idea, {nome} {:🤗}',
          '¡Fin de «{premio}»! Fue un placer, {nome} {:🙌}',
          'Se acabó el tiempo de «{premio}». Cuando quieras, {nome}, se repite {:💜}',
          'Se apaga «{premio}». Gracias por este buen rato, {nome} {:😊}',
        ],
        serio: [
          'Tiempo terminado para «{premio}».',
          '«{premio}» ha terminado. Gracias, {nome}.',
          'Fin de «{premio}», canjeado por {nome}.',
          'Concluye «{premio}». Todo vuelve a lo de antes.',
          '«{premio}» se cierra aquí. Gracias a {nome}.',
          'Se acabó el tiempo de «{premio}» {:⏰}',
        ],
      },
    },
  },

  'premio-tempo-rimborso': {
    titolo: ['Premio non possibile, punti restituiti', 'Reward not possible, points refunded', 'Recompensa no posible, puntos devueltos'],
    quando: [
      'Quando un premio a tempo adesso non si può fare (la chat è già in quella modalità, il VIP non si può dare, Twitch non risponde) e Twitch ha restituito davvero i punti a chi l\'ha riscattato.',
      'When a timed reward can\'t be done right now (chat is already in that mode, the VIP can\'t be given, Twitch doesn\'t answer) and Twitch really refunded the points to whoever redeemed it.',
      'Cuando una recompensa con tiempo ahora no se puede hacer (el chat ya está en ese modo, el VIP no se puede dar, Twitch no responde) y Twitch devolvió de verdad los puntos a quien la canjeó.',
    ],
    dati: { nome: 'sempre', premio: 'sempre' },
    esempio: { nome: 'Luna', premio: 'Solo emote per 5 minuti' },
    spegnibile: false,
    frasi: {
      it: {
        scherzoso: [
          '{nome}, «{premio}» adesso non si può fare, ma niente paura: i punti sono tornati a casa {:🏠}',
          'Missione annullata per «{premio}»! {nome}, ti ho restituito i punti fino all\'ultimo {:🪙}',
          'Oops, «{premio}» per ora non parte. {nome}, i tuoi punti sono di nuovo nel portafoglio {:😅}',
          '{nome}, «{premio}» fa i capricci e adesso non va. Punti restituiti, nessuno ci rimette {:🙃}',
          'Niente da fare per «{premio}» in questo momento. {nome}, rimborso fatto: i punti sono ancora tuoi {:😏}',
          'Colpo di scena: «{premio}» adesso non si può. {nome}, i punti te li ho già ridati tutti {:🎁}',
        ],
        amichevole: [
          '{nome}, mi dispiace: «{premio}» adesso non si può fare. Ti ho restituito i punti {:💜}',
          'Scusa {nome}, «{premio}» per ora non si può. I punti sono già tornati a te {:🙏}',
          '{nome}, «{premio}» adesso non è possibile, ma i tuoi punti sono al sicuro: restituiti {:😊}',
          'Grazie per averci provato, {nome}! «{premio}» adesso non va, e i punti ti sono stati restituiti {:🤗}',
          '{nome}, per «{premio}» non è il momento giusto: punti restituiti, magari si riprova più tardi {:💜}',
          'Peccato, {nome}: «{premio}» adesso non si può attivare. I punti li hai di nuovo tu {:😊}',
        ],
        serio: [
          '{nome}, «{premio}» adesso non si può fare. Punti restituiti.',
          '«{premio}» non disponibile in questo momento: {nome}, i punti ti sono stati restituiti.',
          'Riscatto di «{premio}» annullato, {nome}: i punti sono tornati a te.',
          '{nome}, ho annullato «{premio}» e restituito i punti.',
          '«{premio}» adesso non si può attivare. {nome}, rimborso completato.',
          'Per ora «{premio}» non parte, {nome}. I punti sono di nuovo tuoi.',
        ],
      },
      en: {
        scherzoso: [
          '{nome}, “{premio}” can\'t happen right now, but don\'t worry: your points made it home {:🏠}',
          'Mission aborted for “{premio}”! {nome}, I refunded your points down to the last one {:🪙}',
          'Oops, “{premio}” won\'t start for now. {nome}, your points are back in your wallet {:😅}',
          '{nome}, “{premio}” is being stubborn and won\'t go right now. Points refunded, nobody loses out {:🙃}',
          'No luck with “{premio}” at the moment. {nome}, refund done: the points are still yours {:😏}',
          'Plot twist: “{premio}” isn\'t possible right now. {nome}, I already gave all your points back {:🎁}',
        ],
        amichevole: [
          '{nome}, I\'m sorry: “{premio}” can\'t happen right now. I refunded your points {:💜}',
          'Sorry, {nome}, “{premio}” isn\'t possible for now. Your points are already back {:🙏}',
          '{nome}, “{premio}” isn\'t possible right now, but your points are safe: refunded {:😊}',
          'Thanks for trying, {nome}! “{premio}” won\'t work right now, and your points have been refunded {:🤗}',
          '{nome}, it\'s not the right moment for “{premio}”: points refunded, maybe try again later {:💜}',
          'Too bad, {nome}: “{premio}” can\'t be turned on right now. The points are yours again {:😊}',
        ],
        serio: [
          '{nome}, “{premio}” can\'t be done right now. Points refunded.',
          '“{premio}” is unavailable at the moment: {nome}, your points have been refunded.',
          'Redemption of “{premio}” canceled, {nome}: your points are back.',
          '{nome}, I canceled “{premio}” and refunded the points.',
          '“{premio}” can\'t be turned on right now. {nome}, refund complete.',
          '“{premio}” won\'t start for now, {nome}. The points are yours again.',
        ],
      },
      es: {
        scherzoso: [
          '{nome}, «{premio}» ahora no se puede, pero tranquilidad: los puntos volvieron a casa {:🏠}',
          '¡Misión cancelada para «{premio}»! {nome}, te devolví los puntos hasta el último {:🪙}',
          'Ups, «{premio}» por ahora no arranca. {nome}, tus puntos vuelven a estar en tu bolsillo {:😅}',
          '{nome}, «{premio}» se pone difícil y ahora no va. Puntos devueltos, nadie pierde nada {:🙃}',
          'Nada que hacer con «{premio}» en este momento. {nome}, reembolso hecho: los puntos siguen siendo tuyos {:😏}',
          'Giro de guion: «{premio}» ahora no es posible. {nome}, todos tus puntos ya están de vuelta {:🎁}',
        ],
        amichevole: [
          '{nome}, lo siento: «{premio}» ahora no se puede hacer. Te devolví los puntos {:💜}',
          'Perdona, {nome}, «{premio}» por ahora no es posible. Los puntos ya volvieron contigo {:🙏}',
          '{nome}, «{premio}» ahora no se puede, pero tus puntos están a salvo: devueltos {:😊}',
          '¡Gracias por intentarlo, {nome}! «{premio}» ahora no funciona, y ya tienes tus puntos de vuelta {:🤗}',
          '{nome}, no es el momento para «{premio}»: puntos devueltos, quizá más tarde se puede {:💜}',
          'Qué pena, {nome}: «{premio}» ahora no se puede activar. Los puntos vuelven a ser tuyos {:😊}',
        ],
        serio: [
          '{nome}, «{premio}» ahora no se puede hacer. Puntos devueltos.',
          '«{premio}» no está disponible en este momento. {nome}, recuperas tus puntos.',
          'Canje de «{premio}» cancelado, {nome}: los puntos volvieron a ti.',
          '{nome}, cancelé «{premio}» y devolví los puntos.',
          '«{premio}» no se puede activar ahora. {nome}, reembolso completado.',
          'Por ahora «{premio}» no arranca, {nome}. Los puntos vuelven a ser tuyos.',
        ],
      },
    },
  },

  'premio-tempo-no': {
    titolo: ['Premio non possibile, punti da restituire a mano', 'Reward not possible, points to refund by hand', 'Recompensa no posible, puntos a devolver a mano'],
    quando: [
      'Quando un premio a tempo adesso non si può fare e i punti non si possono restituire da qui: succede per esempio coi premi creati fuori da SocialBot. Li puoi restituire tu dalla coda dei riscatti di Twitch.',
      'When a timed reward can\'t be done right now and the points can\'t be refunded from here: it happens for example with rewards created outside SocialBot. You can refund them yourself from the Twitch redemption queue.',
      'Cuando una recompensa con tiempo ahora no se puede hacer y los puntos no se pueden devolver desde aquí: pasa por ejemplo con las recompensas creadas fuera de SocialBot. Puedes devolverlos tú desde la cola de canjes de Twitch.',
    ],
    dati: { nome: 'sempre', premio: 'sempre' },
    esempio: { nome: 'Luna', premio: 'Solo emote per 5 minuti' },
    spegnibile: false,
    frasi: {
      it: {
        scherzoso: [
          '{nome}, «{premio}» adesso non si può fare. I punti non tornano da soli, ma posso restituirli a mano {:🙈}',
          'Intoppo su «{premio}», {nome}: da qui i punti non riesco a ridarteli in automatico. A mano si può fare {:😅}',
          'Oops, «{premio}» per ora non parte, {nome}. Il rimborso automatico qui non funziona, quello a mano sì {:🛠️}',
          '{nome}, «{premio}» fa i capricci. I punti da qui non si restituiscono, ma a mano posso farlo io {:🙃}',
          'Niente da fare per «{premio}» adesso, {nome}. Per i punti c\'è la via manuale: posso restituirli io {:🔧}',
          'Colpo di scena: «{premio}» adesso non si può, {nome}. I punti non tornano in automatico, ma restituirli a mano si può {:😬}',
        ],
        amichevole: [
          '{nome}, mi dispiace: «{premio}» adesso non si può fare. I punti non posso ridarli in automatico, ma a mano sì {:💜}',
          'Scusa {nome}, «{premio}» per ora non va. Da qui i punti non tornano, però posso restituirli a mano {:🙏}',
          '{nome}, «{premio}» adesso non è possibile. I tuoi punti non tornano da soli: posso rimborsarli io a mano {:😊}',
          'Grazie per averci provato, {nome}! «{premio}» adesso non va, e qui il rimborso automatico non c\'è: a mano si può fare {:🤗}',
          '{nome}, per «{premio}» non è il momento giusto. I punti si possono restituire a mano, in automatico no {:💜}',
          'Peccato, {nome}: «{premio}» adesso non si può attivare. Il rimborso non parte da solo, ma posso farlo a mano {:😊}',
        ],
        serio: [
          '{nome}, «{premio}» adesso non si può fare. I punti non si possono restituire in automatico: posso farlo a mano.',
          '«{premio}» non disponibile in questo momento, {nome}. Il rimborso automatico non è possibile, quello manuale sì.',
          'Riscatto di «{premio}» non eseguito, {nome}. I punti posso restituirli solo a mano.',
          '{nome}, «{premio}» non parte. Da qui non posso ridare i punti, ma a mano si può.',
          '«{premio}» adesso non si può attivare, {nome}. I punti si possono restituire a mano.',
          'Per ora niente «{premio}», {nome}: nessun rimborso automatico, ma posso restituire i punti a mano.',
        ],
      },
      en: {
        scherzoso: [
          '{nome}, “{premio}” can\'t happen right now. The points won\'t come back on their own, but I can refund them by hand {:🙈}',
          'Snag on “{premio}”, {nome}: I can\'t give your points back automatically from here. By hand, it can be done {:😅}',
          'Oops, “{premio}” won\'t start for now, {nome}. The automatic refund doesn\'t work here, the manual one does {:🛠️}',
          '{nome}, “{premio}” is being stubborn. The points can\'t be refunded from here, but I can do it by hand {:🙃}',
          'No luck with “{premio}” right now, {nome}. For the points there\'s the manual route: I can refund them {:🔧}',
          'Plot twist: “{premio}” isn\'t possible right now, {nome}. The points don\'t come back automatically, but a manual refund is possible {:😬}',
        ],
        amichevole: [
          '{nome}, I\'m sorry: “{premio}” can\'t happen right now. I can\'t refund the points automatically, but I can by hand {:💜}',
          'Sorry, {nome}, “{premio}” won\'t work for now. The points don\'t come back from here, but I can refund them by hand {:🙏}',
          '{nome}, “{premio}” isn\'t possible right now. Your points won\'t come back on their own: I can refund them manually {:😊}',
          'Thanks for trying, {nome}! “{premio}” won\'t work right now, and there\'s no automatic refund here: a manual one is possible {:🤗}',
          '{nome}, it\'s not the right moment for “{premio}”. The points can be refunded by hand, just not automatically {:💜}',
          'Too bad, {nome}: “{premio}” can\'t be turned on right now. The refund won\'t start on its own, but I can do it by hand {:😊}',
        ],
        serio: [
          '{nome}, “{premio}” can\'t be done right now. The points can\'t be refunded automatically: I can do it by hand.',
          '“{premio}” is unavailable at the moment, {nome}. An automatic refund isn\'t possible, a manual one is.',
          'Redemption of “{premio}” not completed, {nome}. I can only refund the points by hand.',
          '{nome}, “{premio}” won\'t start. I can\'t refund the points from here, but it can be done by hand.',
          '“{premio}” can\'t be turned on right now, {nome}. The points can be refunded by hand.',
          'No “{premio}” for now, {nome}: no automatic refund, but I can refund the points by hand.',
        ],
      },
      es: {
        scherzoso: [
          '{nome}, «{premio}» ahora no se puede. Los puntos no vuelven solos, pero puedo devolverlos a mano {:🙈}',
          'Tropiezo con «{premio}», {nome}: desde aquí no puedo devolverte los puntos automáticamente. A mano, sí se puede {:😅}',
          'Ups, «{premio}» por ahora no arranca, {nome}. El reembolso automático aquí no funciona, el manual sí {:🛠️}',
          '{nome}, «{premio}» se pone difícil. Los puntos no se devuelven desde aquí, pero puedo hacerlo a mano {:🙃}',
          'Nada que hacer con «{premio}» ahora, {nome}. Para los puntos queda la vía manual: puedo devolverlos yo {:🔧}',
          'Giro de guion: «{premio}» ahora no es posible, {nome}. Los puntos no vuelven automáticamente, pero devolverlos a mano sí se puede {:😬}',
        ],
        amichevole: [
          '{nome}, lo siento: «{premio}» ahora no se puede hacer. No puedo devolver los puntos automáticamente, pero a mano sí {:💜}',
          'Perdona, {nome}, «{premio}» por ahora no es posible. Desde aquí los puntos no vuelven, pero puedo devolverlos a mano {:🙏}',
          '{nome}, «{premio}» ahora no se puede. Tus puntos no vuelven solos: puedo reembolsarlos yo a mano {:😊}',
          '¡Gracias por intentarlo, {nome}! «{premio}» ahora no funciona, y aquí no hay reembolso automático: uno manual sí es posible {:🤗}',
          '{nome}, no es el momento para «{premio}». Los puntos se pueden devolver a mano, automáticamente no {:💜}',
          'Qué pena, {nome}: «{premio}» ahora no se puede activar. El reembolso no sale solo, pero puedo hacerlo a mano {:😊}',
        ],
        serio: [
          '{nome}, «{premio}» ahora no se puede hacer. Los puntos no se pueden devolver automáticamente: puedo hacerlo a mano.',
          '«{premio}» no está disponible en este momento, {nome}. El reembolso automático no es posible, el manual sí.',
          'Canje de «{premio}» no completado, {nome}. Solo puedo devolver los puntos a mano.',
          '{nome}, «{premio}» no arranca. Desde aquí no puedo devolver los puntos, pero a mano se puede.',
          '«{premio}» no se puede activar ahora, {nome}. Los puntos se pueden devolver a mano.',
          'Por ahora no hay «{premio}», {nome}: sin reembolso automático, pero puedo devolver los puntos a mano.',
        ],
      },
    },
  },

  'tempi-elenco': {
    titolo: ['!tempi: cosa corre adesso', '!tempi: what\'s running now', '!tempi: qué corre ahora'],
    quando: [
      'Quando qualcuno scrive !tempi e c\'è almeno un tempo in corso: dice ognuno con quanto manca.',
      'When someone types !tempi and at least one timer is running: it lists each one with the time left.',
      'Cuando alguien escribe !tempi y hay al menos un tiempo en marcha: dice cada uno con cuánto falta.',
    ],
    dati: { elenco: 'sempre' },
    esempio: { elenco: 'Parla in inglese 6:12, Solo emote 1:02' },
    spegnibile: false,
    frasi: {
      it: {
        scherzoso: [
          'Il cronometro dice: {elenco} {:⏱️}',
          'Rapporto dal reparto clessidre: {elenco} {:⏳}',
          'Ecco cosa corre adesso: {elenco}. Tic tac {:😏}',
          'Situazione orologi: {elenco} {:🕰️}',
          'Tutti i conti alla rovescia in un colpo d\'occhio: {elenco} {:👀}',
          'Le lancette non si fermano: {elenco} {:🏃}',
        ],
        amichevole: [
          'Ecco i tempi in corso: {elenco} {:😊}',
          'Adesso stanno correndo: {elenco} {:💜}',
          'Quanto manca? Ecco qui: {elenco} {:🤗}',
          'Un\'occhiata ai tempi: {elenco} {:😊}',
          'I tempi di adesso, per chi se lo chiedeva: {elenco} {:🙌}',
          'Ancora in corso: {elenco} {:💜}',
        ],
        serio: [
          'Tempi in corso: {elenco}.',
          'Stato dei tempi: {elenco}.',
          'Tempo rimasto: {elenco}.',
          'Conto alla rovescia: {elenco}.',
          'Ecco quanto manca: {elenco}.',
          'Attivi in questo momento: {elenco} {:⏱️}',
        ],
      },
      en: {
        scherzoso: [
          'The clock says: {elenco} {:⏱️}',
          'Report from the hourglass department: {elenco} {:⏳}',
          'Here\'s what\'s running right now: {elenco}. Tick tock {:😏}',
          'Clock check: {elenco} {:🕰️}',
          'Every countdown at a glance: {elenco} {:👀}',
          'The clocks keep ticking: {elenco} {:🏃}',
        ],
        amichevole: [
          'Here are the timers running: {elenco} {:😊}',
          'Running right now: {elenco} {:💜}',
          'How much is left? Here you go: {elenco} {:🤗}',
          'A quick look at the timers: {elenco} {:😊}',
          'Current timers, for anyone wondering: {elenco} {:🙌}',
          'Still going: {elenco} {:💜}',
        ],
        serio: [
          'Running timers: {elenco}.',
          'Timer status: {elenco}.',
          'Time left: {elenco}.',
          'Countdown: {elenco}.',
          'Here is how much is left: {elenco}.',
          'Active right now: {elenco} {:⏱️}',
        ],
      },
      es: {
        scherzoso: [
          'El cronómetro dice: {elenco} {:⏱️}',
          'Informe del departamento de relojes de arena: {elenco} {:⏳}',
          'Esto es lo que corre ahora: {elenco}. Tic tac {:😏}',
          'Estado de los relojes: {elenco} {:🕰️}',
          'Todas las cuentas atrás de un vistazo: {elenco} {:👀}',
          'Las agujas no paran: {elenco} {:🏃}',
        ],
        amichevole: [
          'Estos son los tiempos en marcha: {elenco} {:😊}',
          'Ahora mismo corren: {elenco} {:💜}',
          '¿Cuánto falta? Aquí está: {elenco} {:🤗}',
          'Un vistazo a los tiempos: {elenco} {:😊}',
          'Los tiempos de ahora, para quien se lo preguntaba: {elenco} {:🙌}',
          'Todavía en marcha: {elenco} {:💜}',
        ],
        serio: [
          'Tiempos en marcha: {elenco}.',
          'Estado de los tiempos: {elenco}.',
          'Tiempo restante: {elenco}.',
          'Cuenta atrás: {elenco}.',
          'Esto es lo que falta: {elenco}.',
          'Activos en este momento: {elenco} {:⏱️}',
        ],
      },
    },
  },

  'tempi-vuoto': {
    titolo: ['!tempi: niente in corso', '!tempi: nothing running', '!tempi: nada en marcha'],
    quando: [
      'Quando qualcuno scrive !tempi e non c\'è nessun tempo in corso.',
      'When someone types !tempi and no timer is running.',
      'Cuando alguien escribe !tempi y no hay ningún tiempo en marcha.',
    ],
    dati: {},
    esempio: {},
    spegnibile: false,
    frasi: {
      it: {
        scherzoso: [
          'Nessun cronometro acceso: qui il tempo scorre normale {:😌}',
          'Clessidre tutte ferme. Qualcuno ha dei punti da spendere? {:👀}',
          'Niente in corso! Il reparto orologi è in pausa caffè {:☕}',
          'Zero conti alla rovescia. Tutto tranquillo, fin troppo {:😏}',
          'Neanche un tic tac: nessun premio a tempo in corso {:🦗}',
          'Nessun premio a tempo attivo. I punti canale aspettano solo voi {:🪙}',
        ],
        amichevole: [
          'Adesso non c\'è nessun premio a tempo in corso {:😊}',
          'Tutto fermo per ora: nessun tempo che corre {:💜}',
          'Al momento niente in corso. Quando parte un premio a tempo, qui si vede quanto manca {:🤗}',
          'Nessun conto alla rovescia, per adesso. Si sta comodi {:😊}',
          'Niente che corre al momento. Si riprova con !tempi quando parte qualcosa {:🙌}',
          'Cronometri tutti a riposo, nessun premio a tempo attivo {:💜}',
        ],
        serio: [
          'Nessun tempo in corso.',
          'Al momento non c\'è nessun premio a tempo attivo.',
          'Niente in corso adesso.',
          'Nessun conto alla rovescia attivo.',
          'Cronometri fermi: non corre niente.',
          'Per ora nessun premio a tempo {:⏱️}',
        ],
      },
      en: {
        scherzoso: [
          'No timers on: time is flowing at regular speed here {:😌}',
          'All hourglasses at rest. Anyone got points to spend? {:👀}',
          'Nothing running! The clock department is on a coffee break {:☕}',
          'Zero countdowns. All quiet, maybe too quiet {:😏}',
          'Not even a tick tock: no timed rewards running {:🦗}',
          'No timed rewards active. The channel points are waiting for you {:🪙}',
        ],
        amichevole: [
          'There are no timed rewards running right now {:😊}',
          'All quiet for now: no timers running {:💜}',
          'Nothing running at the moment. When a timed reward starts, this is where you see how much is left {:🤗}',
          'No countdowns for now. Sit back and relax {:😊}',
          'No timers yet. Try !tempi again when something starts {:🙌}',
          'All timers are resting, no timed rewards active {:💜}',
        ],
        serio: [
          'No timers running.',
          'There are no timed rewards active at the moment.',
          'Nothing running right now.',
          'No active countdowns.',
          'Clocks stopped: nothing is running.',
          'No timed rewards for now {:⏱️}',
        ],
      },
      es: {
        scherzoso: [
          'Ningún cronómetro encendido: aquí el tiempo corre normal {:😌}',
          'Todos los relojes de arena en reposo. ¿Alguien tiene puntos para gastar? {:👀}',
          '¡Nada en marcha! El departamento de relojes está en su pausa del café {:☕}',
          'Cero cuentas atrás. Todo tranquilo, quizá demasiado {:😏}',
          'Ni un tic tac: ninguna recompensa con tiempo en marcha {:🦗}',
          'Ninguna recompensa con tiempo activa. Los puntos del canal esperan su turno {:🪙}',
        ],
        amichevole: [
          'Ahora no hay ninguna recompensa con tiempo en marcha {:😊}',
          'Todo quieto por ahora: ningún tiempo corriendo {:💜}',
          'De momento nada en marcha. Cuando empiece una recompensa con tiempo, aquí se ve cuánto falta {:🤗}',
          'Ninguna cuenta atrás, por ahora. Todo en calma {:😊}',
          'Todavía nada. Prueba otra vez con !tempi cuando empiece algo {:🙌}',
          'Los cronómetros descansan, ninguna recompensa con tiempo activa {:💜}',
        ],
        serio: [
          'Ningún tiempo en marcha.',
          'En este momento no hay ninguna recompensa con tiempo activa.',
          'Nada en marcha ahora.',
          'Ninguna cuenta atrás activa.',
          'Cronómetros parados: no corre nada.',
          'Por ahora, ninguna recompensa con tiempo {:⏱️}',
        ],
      },
    },
  },
};
