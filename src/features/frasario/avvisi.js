// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL FRASARIO: GLI AVVISI FUORI DALLA CHAT. La prima riga dell'avviso di
// diretta su Telegram e su Discord, e la riga che lo chiude quando la diretta
// finisce. Il resto dell'avviso (il titolo, il gioco, il link, l'icona della
// piattaforma) lo mette in forma chi lo manda, perche' e' diverso da un posto
// all'altro.
//
// Fuori dalla chat le emote di Twitch non si vedono: qui non ci sono faccine
// da sostituire. E niente asterischi, trattini bassi o parentesi angolari: la
// stessa frase finisce in HTML su Telegram e in markdown su Discord, e chi la
// manda sfugge il testo per il suo posto. {nome} arriva gia' in grassetto.

export const GRUPPO = { id: 'avvisi', titolo: ['Gli avvisi fuori dalla chat', 'Alerts outside chat', 'Los avisos fuera del chat'] };

export const MOMENTI = {
  'avviso-diretta': {
    titolo: ['L’avviso di diretta', 'The live alert', 'El aviso de directo'],
    quando: ['La prima riga dell’avviso su Telegram e su Discord quando vai in diretta. Un posto con un testo suo, scritto nella sua carta, usa quello.', 'The first line of the Telegram and Discord alert when you go live. A place with its own text, written in its card, uses that one.', 'La primera línea del aviso en Telegram y Discord cuando sales en directo. Un sitio con su propio texto, escrito en su tarjeta, usa ese.'],
    dati: { nome: 'sempre', piattaforma: 'sempre' },
    esempio: { nome: 'Luna', piattaforma: 'Twitch' },
    spegnibile: false,
    dove: 'fuori',
    frasi: {
      it: {
        scherzoso: [
          '{nome} è in diretta su {piattaforma}! Correte, che il meglio succede all\'inizio',
          'Si accendono le luci: {nome} è live su {piattaforma}',
          '{nome} è in onda su {piattaforma}. Portate snack e buon umore',
          'Suonate le trombe: {nome} ha appena iniziato la diretta su {piattaforma}',
          'Diretta partita! {nome} vi aspetta su {piattaforma}, niente scuse',
          '{nome} è live su {piattaforma} e ha già bisogno di voi in chat',
          '{community}, {nome} è in diretta su {piattaforma}!',
        ],
        amichevole: [
          '{nome} è in diretta su {piattaforma}, passate a salutare!',
          'Siamo live su {piattaforma}: {nome} vi aspetta',
          'È iniziata la diretta di {nome} su {piattaforma}, vi aspettiamo',
          '{nome} ha appena acceso la diretta su {piattaforma}, venite a fare un saluto',
          'Diretta in corso su {piattaforma}! {nome} sarà felice di vedervi',
          'Ci vediamo in live su {piattaforma}: {nome} è in onda adesso',
          '{community}, vi aspetto su {piattaforma}: {nome} è in diretta!',
        ],
        serio: [
          '{nome} è in diretta su {piattaforma}.',
          'Diretta iniziata: {nome} su {piattaforma}.',
          'Ora in onda su {piattaforma}: {nome}.',
          '{nome} ha iniziato a trasmettere su {piattaforma}.',
          'La diretta di {nome} è iniziata su {piattaforma}.',
          'Nuova diretta di {nome} su {piattaforma}.',
        ],
      },
      en: {
        scherzoso: [
          '{nome} is live on {piattaforma}! Hurry, the best stuff happens at the start',
          'Lights on: {nome} is live on {piattaforma}',
          '{nome} is on air on {piattaforma}. Bring snacks and good vibes',
          'Sound the trumpets: {nome} just went live on {piattaforma}',
          'Stream started! {nome} is waiting for you on {piattaforma}, no excuses',
          '{nome} is live on {piattaforma} and already needs you in chat',
          '{community}, {nome} is live on {piattaforma}!',
        ],
        amichevole: [
          '{nome} is live on {piattaforma}, come say hi!',
          'We\'re live on {piattaforma}: {nome} is waiting for you',
          '{nome}\'s stream just started on {piattaforma}, hope to see you there',
          '{nome} just went live on {piattaforma}, come stop by',
          'Live now on {piattaforma}! {nome} would love to see you',
          'See you on {piattaforma}: {nome} is on air right now',
          '{community}, see you on {piattaforma}: {nome} is live!',
        ],
        serio: [
          '{nome} is live on {piattaforma}.',
          'Stream started: {nome} on {piattaforma}.',
          'Now streaming on {piattaforma}: {nome}.',
          'On air now: {nome}, on {piattaforma}.',
          '{nome}\'s stream has started on {piattaforma}.',
          'New stream from {nome} on {piattaforma}.',
        ],
      },
      es: {
        scherzoso: [
          '¡{nome} está en vivo en {piattaforma}! Corran, que lo mejor pasa al principio',
          'Se encienden las luces: {nome} está en vivo en {piattaforma}',
          '{nome} está al aire en {piattaforma}. Traigan snacks y buen humor',
          'Que suenen las trompetas: {nome} acaba de empezar en {piattaforma}',
          '¡Empezó el stream! {nome} los espera en {piattaforma}, sin excusas',
          '{nome} está en vivo en {piattaforma} y ya los necesita en el chat',
          '{community}, ¡{nome} está en vivo en {piattaforma}!',
        ],
        amichevole: [
          '{nome} está en vivo en {piattaforma}, ¡pasen a saludar!',
          'Estamos en vivo en {piattaforma}: {nome} los espera',
          'Empezó el stream de {nome} en {piattaforma}, los esperamos',
          '{nome} acaba de encender el stream en {piattaforma}, vengan a saludar',
          '¡En vivo ahora en {piattaforma}! A {nome} le encantaría verlos',
          'Nos vemos en {piattaforma}: {nome} está al aire ahora mismo',
          '{community}, los espero en {piattaforma}: ¡{nome} está en vivo!',
        ],
        serio: [
          '{nome} está en vivo en {piattaforma}.',
          'Transmisión iniciada: {nome} en {piattaforma}.',
          'Ahora en {piattaforma}: {nome}.',
          '{nome} comenzó a transmitir en {piattaforma}.',
          'La transmisión de {nome} ha comenzado en {piattaforma}.',
          'Nueva transmisión de {nome} en {piattaforma}.',
        ],
      },
    },
  },

  'avviso-finita': {
    titolo: ['L’avviso a diretta finita', 'The alert when the stream ends', 'El aviso al terminar el directo'],
    quando: ['Su Discord, dove hai chiesto di chiudere l’avviso: a diretta finita il messaggio si riscrive con questa riga.', 'On Discord, where you asked to close the alert: when the stream ends the message is rewritten with this line.', 'En Discord, donde pediste cerrar el aviso: al terminar el directo el mensaje se reescribe con esta línea.'],
    dati: { nome: 'sempre' },
    esempio: { nome: 'Luna' },
    spegnibile: false,
    dove: 'fuori',
    frasi: {
      it: {
        scherzoso: [
          '{nome} ha finito la diretta. Ci si rivede alla prossima',
          'Luci spente: la diretta di {nome} è finita',
          'Fine delle trasmissioni per {nome}. Grazie a chi c\'era',
          '{nome} ha chiuso la live. Chi c\'era sa com\'è andata',
          'La diretta di {nome} è finita, ma le clip restano',
          'Sipario! {nome} ha chiuso la diretta',
        ],
        amichevole: [
          'La diretta di {nome} è finita, grazie a chi è passato',
          '{nome} ha chiuso la live. Alla prossima!',
          'Finita la diretta di {nome}. Grazie per la compagnia',
          '{nome} ha terminato la diretta, ci vediamo presto',
          'La live di {nome} si è conclusa. Grazie a tutti',
          'Diretta conclusa per {nome}, a presto',
        ],
        serio: [
          '{nome} ha finito la diretta.',
          'La diretta di {nome} è terminata.',
          'Diretta conclusa: {nome}.',
          '{nome} non è più in diretta.',
          'Fine della diretta di {nome}.',
          'La live di {nome} si è chiusa.',
        ],
      },
      en: {
        scherzoso: [
          '{nome} wrapped up the stream. See you next time',
          'Lights out: {nome}\'s stream is over',
          'That\'s all, folks, from {nome}. Thanks to everyone who came',
          '{nome} ended the stream. If you were there, you know how it went',
          '{nome}\'s stream is over, but the clips live on',
          'Curtain call! {nome} has ended the stream',
        ],
        amichevole: [
          '{nome}\'s stream is over, thanks to everyone who stopped by',
          '{nome} ended the stream. Until next time!',
          '{nome}\'s stream has ended. Thanks for the company',
          '{nome} finished streaming, see you soon',
          '{nome}\'s stream has wrapped. Thank you all',
          'Stream over for {nome}. Hope you had fun',
        ],
        serio: [
          '{nome} has ended the stream.',
          '{nome}\'s stream has ended.',
          'Stream over: {nome}.',
          '{nome} is no longer live.',
          'End of {nome}\'s stream.',
          '{nome}\'s broadcast has finished.',
        ],
      },
      es: {
        scherzoso: [
          '{nome} terminó el stream. Nos vemos en el próximo',
          'Luces apagadas: terminó el stream de {nome}',
          'Fin de la transmisión de {nome}. Gracias a quienes estuvieron',
          '{nome} cerró el stream. Quien estuvo sabe cómo fue',
          'Terminó el stream de {nome}, pero los clips quedan',
          '¡Se baja el telón! {nome} terminó la transmisión',
        ],
        amichevole: [
          'Terminó el stream de {nome}, gracias a quienes pasaron',
          '{nome} cerró la transmisión. ¡Hasta la próxima!',
          'Se acabó el stream de {nome}. Gracias por la compañía',
          '{nome} terminó de transmitir, nos vemos pronto',
          'La transmisión de {nome} ha concluido. Gracias a todos',
          'Stream terminado para {nome}. Ojalá lo hayan disfrutado',
        ],
        serio: [
          '{nome} ha terminado la transmisión.',
          'La transmisión de {nome} ha finalizado.',
          'Transmisión concluida: {nome}.',
          '{nome} ya no está en vivo.',
          'Fin de la transmisión de {nome}.',
          'El stream de {nome} se ha cerrado.',
        ],
      },
    },
  },
};
