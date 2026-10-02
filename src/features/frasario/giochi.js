// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// IL FRASARIO: I GIOCHI IN CHAT. Quello che il bot dice attorno ai giochi e che
// lo streamer puo' voler dire a modo suo. Le regole di scrittura sono in testa
// a frasario/diretta.js.

export const GRUPPO = { id: 'giochi', titolo: ['I giochi in chat', 'Chat games', 'Los juegos en el chat'] };

export const MOMENTI = {
  'gioco-parla-prima': {
    titolo: ['Prima si parla, poi si gioca', 'Chat first, then play', 'Primero se habla, luego se juega'],
    quando: [
      'Quando qualcuno prova a giocare senza aver scritto abbastanza messaggi in chat (Economia, «Un gioco ogni N messaggi»). Lo si dice una volta, e di nuovo solo dopo un altro messaggio.',
      'When someone tries to play without having written enough chat messages (Economy, “One game every N messages”). It is said once, and again only after another message.',
      'Cuando alguien intenta jugar sin haber escrito suficientes mensajes en el chat (Economía, «Un juego cada N mensajes»). Se dice una vez, y otra vez solo después de otro mensaje.',
    ],
    dati: { nome: 'sempre', quanti: 'sempre' },
    esempio: { nome: 'Luna', quanti: 3 },
    spegnibile: true,
    frasi: {
      it: {
        scherzoso: [
          '{nome}, prima due chiacchiere con me e poi si gioca: {quanti|manca un messaggio|mancano # messaggi} {:😏}',
          'Alt, {nome}! Qui si gioca chiacchierando: {quanti|ancora un messaggio|ancora # messaggi} e il tavolo è tuo {:🎲}',
          '{nome}, i giochi si sbloccano parlando in chat. {quanti|Un messaggio|# messaggi} e ci sei {:😄}',
          '{nome}, qui i giochi costano chiacchiere: {quanti|ancora un messaggio|ancora # messaggi} e si parte {:🪙}',
          'Non così in fretta, {nome}: raccontami qualcosa! {quanti|Un messaggio|# messaggi} e poi giochi {:👀}',
          '{nome}, la sala giochi apre a chi chiacchiera: {quanti|manca un messaggio|mancano # messaggi} {:🎰}',
        ],
        amichevole: [
          '{nome}, prima scrivimi qualcosa in chat: {quanti|ancora un messaggio|ancora # messaggi} e puoi giocare {:💜}',
          'Mi fa piacere sentirti, {nome}! {quanti|Un messaggio|# messaggi} in chat e poi si gioca {:😊}',
          '{nome}, qui si gioca fra una chiacchiera e l\'altra: {quanti|manca un messaggio|mancano # messaggi} {:🤗}',
          'Raccontami come va, {nome}: dopo {quanti|un messaggio|# messaggi} il gioco è tuo {:💜}',
          '{nome}, prima facciamo due chiacchiere: {quanti|ancora un messaggio|ancora # messaggi} e ci giochiamo {:🙌}',
          'Ci sentiamo un po\' in chat, {nome}? {quanti|Un messaggio|# messaggi} e si gioca {:😊}',
        ],
        serio: [
          '{nome}, per giocare {quanti|serve ancora un messaggio|servono ancora # messaggi} in chat.',
          'Qui si gioca dopo aver scritto in chat, {nome}: {quanti|manca un messaggio|mancano # messaggi}.',
          '{nome}, i giochi si aprono scrivendo in chat. {quanti|Manca un messaggio|Mancano # messaggi}.',
          'Prima di giocare, {nome}, {quanti|un altro messaggio|altri # messaggi} in chat.',
          '{nome}: {quanti|ancora un messaggio|ancora # messaggi} in chat, poi si gioca.',
          'Per il prossimo gioco {quanti|manca un messaggio|mancano # messaggi} in chat, {nome}.',
        ],
      },
      en: {
        scherzoso: [
          '{nome}, chat with me first, then we play: {quanti|one more message|# more messages} {:😏}',
          'Hold up, {nome}! Games here run on chatter: {quanti|one more message|# more messages} and the table is yours {:🎲}',
          '{nome}, games unlock by talking in chat. {quanti|One message|# messages} and you\'re in {:😄}',
          '{nome}, games here cost a bit of chat: {quanti|one more message|# more messages} and we\'re off {:🪙}',
          'Not so fast, {nome}: tell me something! {quanti|One message|# messages} and then you play {:👀}',
          '{nome}, the arcade opens for people who chat: {quanti|one message to go|# messages to go} {:🎰}',
        ],
        amichevole: [
          '{nome}, write me something in chat first: {quanti|one more message|# more messages} and you can play {:💜}',
          'Good to see you, {nome}! {quanti|One message|# messages} in chat and then we play {:😊}',
          '{nome}, here we play in between the chatting: {quanti|one message to go|# messages to go} {:🤗}',
          'Tell me how it\'s going, {nome}: after {quanti|one message|# messages} the game is yours {:💜}',
          '{nome}, let\'s chat a bit first: {quanti|one more message|# more messages} and we play {:🙌}',
          'Hang out in chat with me for a bit, {nome}? {quanti|One message|# messages} and we play {:😊}',
        ],
        serio: [
          '{nome}, to play you need {quanti|one more message|# more messages} in chat.',
          'Games here come after chatting, {nome}: {quanti|one message to go|# messages to go}.',
          '{nome}, games open up by writing in chat. {quanti|One message|# messages} to go.',
          'Before playing, {nome}, {quanti|one more message|# more messages} in chat.',
          '{nome}: {quanti|one more message|# more messages} in chat, then you can play.',
          'For the next game, {quanti|one more message|# more messages} in chat, {nome}.',
        ],
      },
      es: {
        scherzoso: [
          '{nome}, primero charla conmigo y luego jugamos: {quanti|falta un mensaje|faltan # mensajes} {:😏}',
          '¡Alto, {nome}! Aquí se juega charlando: {quanti|un mensaje más|# mensajes más} y la mesa es tuya {:🎲}',
          '{nome}, los juegos se desbloquean hablando en el chat. {quanti|Un mensaje|# mensajes} y estás dentro {:😄}',
          '{nome}, aquí los juegos se pagan con charla: {quanti|un mensaje más|# mensajes más} y arrancamos {:🪙}',
          'No tan rápido, {nome}: ¡cuéntame algo! {quanti|Un mensaje|# mensajes} y luego juegas {:👀}',
          '{nome}, la sala de juegos abre para quien charla: {quanti|falta un mensaje|faltan # mensajes} {:🎰}',
        ],
        amichevole: [
          '{nome}, primero escríbeme algo en el chat: {quanti|un mensaje más|# mensajes más} y puedes jugar {:💜}',
          '¡Qué gusto leerte, {nome}! {quanti|Un mensaje|# mensajes} en el chat y luego jugamos {:😊}',
          '{nome}, aquí se juega entre charla y charla: {quanti|falta un mensaje|faltan # mensajes} {:🤗}',
          'Cuéntame qué tal, {nome}: después de {quanti|un mensaje|# mensajes} el juego es tuyo {:💜}',
          '{nome}, primero charlemos un poco: {quanti|un mensaje más|# mensajes más} y jugamos {:🙌}',
          '¿Charlamos un rato, {nome}? {quanti|Un mensaje|# mensajes} y se juega {:😊}',
        ],
        serio: [
          '{nome}, para jugar {quanti|falta un mensaje|faltan # mensajes} en el chat.',
          'Aquí se juega después de escribir en el chat, {nome}: {quanti|falta un mensaje|faltan # mensajes}.',
          '{nome}, los juegos se abren escribiendo en el chat. {quanti|Falta un mensaje|Faltan # mensajes}.',
          'Antes de jugar, {nome}, {quanti|un mensaje más|# mensajes más} en el chat.',
          '{nome}: {quanti|un mensaje más|# mensajes más} en el chat, y luego se juega.',
          'Para el próximo juego {quanti|falta un mensaje|faltan # mensajes} en el chat, {nome}.',
        ],
      },
    },
  },

  'gioco-insisti': {
    titolo: ['Chi insiste aspetta di più', 'Insisting means waiting longer', 'Quien insiste espera más'],
    quando: [
      'Quando qualcuno riscrive il comando di un gioco mentre per lui è in attesa, e il gioco castiga chi insiste (regole del gioco o quelle uguali per tutti, «Chi insiste prima del tempo aspetta in più»). Dice l’attesa nuova.',
      'When someone types a game command again while that game is still in their wait, and the game punishes insisting (the game’s rules or the ones for every game, “Whoever insists too early waits longer”). It says the new wait.',
      'Cuando alguien vuelve a escribir el comando de un juego mientras para él sigue en espera, y el juego castiga a quien insiste (reglas del juego o las de todos, «Quien insiste antes de tiempo espera más»). Dice la nueva espera.',
    ],
    dati: { nome: 'sempre', comando: 'sempre', tempo: 'sempre' },
    esempio: { nome: 'Luna', comando: '!slot', tempo: '45 secondi' },
    spegnibile: true,
    frasi: {
      it: {
        scherzoso: [
          '{nome}, insistere non aiuta: {comando} di nuovo fra {tempo}, e ogni volta che insisti cresce {:😏}',
          'Calma, {nome}! Per {comando} adesso aspetti {tempo}. Insisti ancora e cresce di nuovo {:⏳}',
          '{nome}, a forza di insistere il tempo si allunga: {comando} fra {tempo} {:🙃}',
          'Più insisti, più aspetti, {nome}: {comando} di nuovo fra {tempo} {:😅}',
          '{nome}, il gioco si riposa e tu con lui: {comando} fra {tempo}, e insistendo l\'attesa cresce {:😴}',
          'Pazienza, {nome}! {comando} riapre fra {tempo}. La prossima volta che insisti, cresce ancora {:⏰}',
        ],
        amichevole: [
          '{nome}, ancora un po\' di pazienza: {comando} di nuovo fra {tempo}. Se insisti, l\'attesa cresce {:💜}',
          'Aspettiamo insieme, {nome}: {comando} fra {tempo}. Insistere la allunga {:😊}',
          '{nome}, ti tengo il posto: {comando} di nuovo fra {tempo}, e ogni volta che insisti cresce un po\' {:🤗}',
          'Un attimo, {nome}! {comando} fra {tempo}. Se riprovi prima, aspetti ancora di più {:🙏}',
          '{nome}, intanto raccontami qualcosa: {comando} di nuovo fra {tempo} {:💜}',
          'Ci siamo quasi, {nome}: {comando} fra {tempo}. Insistendo l\'attesa cresce {:😊}',
        ],
        serio: [
          '{nome}, hai insistito: {comando} di nuovo fra {tempo}. Ogni volta che insisti l\'attesa cresce.',
          '{comando} per {nome} di nuovo fra {tempo}. Insistere allunga l\'attesa.',
          '{nome}, attesa allungata: {comando} fra {tempo}.',
          'Per {nome}, {comando} riapre fra {tempo}. Se insisti, cresce ancora.',
          '{nome}, {comando} di nuovo fra {tempo}. Riprovare prima allunga l\'attesa.',
          'Attesa di {nome} per {comando}: {tempo}. Insistendo aumenta.',
        ],
      },
      en: {
        scherzoso: [
          '{nome}, insisting won\'t help: {comando} again in {tempo}, and it grows every time you insist {:😏}',
          'Easy, {nome}! You now wait {tempo} for {comando}. Insist again and it grows again {:⏳}',
          '{nome}, the more you insist the longer it gets: {comando} in {tempo} {:🙃}',
          'More insisting, more waiting, {nome}: {comando} again in {tempo} {:😅}',
          '{nome}, the game is resting and so are you: {comando} in {tempo}, and insisting makes it longer {:😴}',
          'Patience, {nome}! {comando} reopens in {tempo}. Insist again and it grows {:⏰}',
        ],
        amichevole: [
          '{nome}, a little more patience: {comando} again in {tempo}. If you insist, the wait grows {:💜}',
          'Let\'s wait together, {nome}: {comando} in {tempo}. Insisting makes it longer {:😊}',
          '{nome}, I\'m saving your spot: {comando} again in {tempo}, and it grows a bit every time you insist {:🤗}',
          'Just a moment, {nome}! {comando} in {tempo}. Try before then and you\'ll wait even longer {:🙏}',
          '{nome}, tell me something in the meantime: {comando} again in {tempo} {:💜}',
          'Almost there, {nome}: {comando} in {tempo}. Insisting makes the wait grow {:😊}',
        ],
        serio: [
          '{nome}, you insisted: {comando} again in {tempo}. Every time you insist the wait grows.',
          '{comando} for {nome} again in {tempo}. Insisting makes the wait longer.',
          '{nome}, wait extended: {comando} in {tempo}.',
          'For {nome}, {comando} reopens in {tempo}. If you insist, it grows again.',
          '{nome}, {comando} again in {tempo}. Trying earlier makes the wait longer.',
          'Wait for {nome} on {comando}: {tempo}. Insisting increases it.',
        ],
      },
      es: {
        scherzoso: [
          '{nome}, insistir no ayuda: {comando} otra vez en {tempo}, y cada vez que insistes crece {:😏}',
          '¡Calma, {nome}! Ahora esperas {tempo} para {comando}. Insiste otra vez y crece de nuevo {:⏳}',
          '{nome}, cuanto más insistes, más se alarga: {comando} en {tempo} {:🙃}',
          'Más insistes, más esperas, {nome}: {comando} otra vez en {tempo} {:😅}',
          '{nome}, el juego descansa y tú con él: {comando} en {tempo}, e insistiendo la espera crece {:😴}',
          '¡Paciencia, {nome}! {comando} vuelve en {tempo}. La próxima vez que insistas, crece otra vez {:⏰}',
        ],
        amichevole: [
          '{nome}, un poco más de paciencia: {comando} otra vez en {tempo}. Si insistes, la espera crece {:💜}',
          'Esperemos un poco, {nome}: {comando} en {tempo}. Insistir la alarga {:😊}',
          '{nome}, te guardo el sitio: {comando} otra vez en {tempo}, y crece un poco cada vez que insistes {:🤗}',
          '¡Un momento, {nome}! {comando} en {tempo}. Si lo intentas antes, esperarás aún más {:🙏}',
          '{nome}, mientras tanto cuéntame algo: {comando} otra vez en {tempo} {:💜}',
          'Ya casi, {nome}: {comando} en {tempo}. Insistiendo la espera crece {:😊}',
        ],
        serio: [
          '{nome}, has insistido: {comando} otra vez en {tempo}. Cada vez que insistes la espera crece.',
          '{comando} para {nome} otra vez en {tempo}. Insistir alarga la espera.',
          '{nome}, espera alargada: {comando} en {tempo}.',
          'Para {nome}, {comando} vuelve en {tempo}. Si insistes, crece otra vez.',
          '{nome}, {comando} otra vez en {tempo}. Intentarlo antes alarga la espera.',
          'Espera de {nome} para {comando}: {tempo}. Insistir la aumenta.',
        ],
      },
    },
  },

  'gioco-basta': {
    titolo: ['Basta fino a fine diretta', 'No more until the end of the stream', 'Se acabó hasta el final del directo'],
    quando: [
      'Quando qualcuno ha insistito su un gioco quante volte le regole permettono: per lui quel gioco si chiude fino alla fine della diretta (a canale spento, fino a domani). Si dice una volta.',
      'When someone has insisted on a game as many times as the rules allow: that game closes for them until the end of the stream (with the channel offline, until tomorrow). It is said once.',
      'Cuando alguien ha insistido en un juego tantas veces como permiten las reglas: ese juego se le cierra hasta el final del directo (con el canal apagado, hasta mañana). Se dice una vez.',
    ],
    dati: { nome: 'sempre', comando: 'sempre', quando: 'sempre' },
    esempio: { nome: 'Luna', comando: '!slot', quando: 'fino alla fine della diretta' },
    spegnibile: true,
    frasi: {
      it: {
        scherzoso: [
          '{nome}, con {comando} hai insistito troppo: basta {quando} {:🙈}',
          'Game over per {nome}: {comando} chiuso {quando} {:🔒}',
          '{nome}, {comando} va in pausa {quando}. Intanto si chiacchiera {:😌}',
          'Troppa insistenza, {nome}: niente {comando} {quando} {:🛑}',
          '{nome}, {comando} ha chiuso bottega {quando} {:🏪}',
          'Fine dei giochi con {comando} per {nome}, {quando} {:⛔}',
        ],
        amichevole: [
          '{nome}, per {comando} basta {quando}. Restiamo a chiacchierare {:💜}',
          '{nome}, {comando} si ferma {quando}, ma tu resta qui in chat {:🤗}',
          'Ci prendiamo una pausa da {comando}, {nome}: {quando} {:😊}',
          '{nome}, abbiamo insistito un po\' troppo: niente {comando} {quando} {:🙏}',
          '{nome}, {comando} riposa {quando}. Ci sono tanti altri modi di divertirsi {:💜}',
          '{nome}, mettiamo da parte {comando} {quando} {:😊}',
        ],
        serio: [
          '{nome}, troppi tentativi: {comando} chiuso {quando}.',
          '{comando} non è più disponibile per {nome} {quando}.',
          '{nome}, troppe insistenze: niente {comando} {quando}.',
          'Per {nome}, {comando} resta chiuso {quando}.',
          '{nome}: {comando} bloccato {quando}, per troppe insistenze.',
          'Limite raggiunto, {nome}: {comando} chiuso {quando}.',
        ],
      },
      en: {
        scherzoso: [
          '{nome}, you insisted too much on {comando}: no more {quando} {:🙈}',
          'Game over for {nome}: {comando} is closed {quando} {:🔒}',
          '{nome}, {comando} takes a break {quando}. Let\'s chat meanwhile {:😌}',
          'Too much insisting, {nome}: no {comando} {quando} {:🛑}',
          '{nome}, {comando} has shut up shop {quando} {:🏪}',
          'That\'s it for {comando}, {nome}, {quando} {:⛔}',
        ],
        amichevole: [
          '{nome}, that\'s enough {comando} {quando}. Let\'s keep chatting {:💜}',
          '{nome}, {comando} stops {quando}, but stay here in chat {:🤗}',
          'Let\'s take a break from {comando}, {nome}: {quando} {:😊}',
          '{nome}, we pushed it a bit too far: no {comando} {quando} {:🙏}',
          '{nome}, {comando} is resting {quando}. There are lots of other ways to have fun {:💜}',
          '{nome}, let\'s put {comando} aside {quando} {:😊}',
        ],
        serio: [
          '{nome}, too many attempts: {comando} is closed {quando}.',
          '{comando} is no longer available to {nome} {quando}.',
          '{nome}, too much insisting: no {comando} {quando}.',
          'For {nome}, {comando} stays closed {quando}.',
          '{nome}: {comando} is blocked {quando}, for insisting too much.',
          'Limit reached, {nome}: {comando} is closed {quando}.',
        ],
      },
      es: {
        scherzoso: [
          '{nome}, insististe demasiado con {comando}: se acabó {quando} {:🙈}',
          'Game over para {nome}: {comando} cerrado {quando} {:🔒}',
          '{nome}, {comando} se toma un descanso {quando}. Mientras tanto, charlamos {:😌}',
          'Demasiada insistencia, {nome}: nada de {comando} {quando} {:🛑}',
          '{nome}, {comando} cerró el chiringuito {quando} {:🏪}',
          'Se acabó {comando} para {nome}, {quando} {:⛔}',
        ],
        amichevole: [
          '{nome}, basta de {comando} {quando}. Sigamos charlando {:💜}',
          '{nome}, {comando} se detiene {quando}, pero quédate aquí en el chat {:🤗}',
          'Tomemos un descanso de {comando}, {nome}: {quando} {:😊}',
          '{nome}, insistimos un poco de más: nada de {comando} {quando} {:🙏}',
          '{nome}, {comando} descansa {quando}. Hay muchas otras formas de divertirse {:💜}',
          '{nome}, dejemos {comando} a un lado {quando} {:😊}',
        ],
        serio: [
          '{nome}, demasiados intentos: {comando} cerrado {quando}.',
          '{comando} ya no está disponible para {nome} {quando}.',
          '{nome}, demasiada insistencia: nada de {comando} {quando}.',
          'Para {nome}, {comando} sigue cerrado {quando}.',
          '{nome}: {comando} bloqueado {quando}, por insistir demasiado.',
          'Límite alcanzado, {nome}: {comando} cerrado {quando}.',
        ],
      },
    },
  },
};
