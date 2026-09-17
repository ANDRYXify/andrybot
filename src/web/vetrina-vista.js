// La vetrina, in un posto solo.
//
// Prima ce n'erano DUE, e non erano due copie della stessa pagina: erano due
// pagine diverse sullo stesso indirizzo. Dentro `index.html` stava un blocco
// scritto a mano — 4357 caratteri, solo in italiano, con quattro sezioni sue —
// e `app.js` ci scriveva sopra la vetrina vera, in tre lingue e con altre
// parole. Quindi il motore di ricerca indicizzava un testo che nessun
// visitatore leggeva mai, e la persona ne leggeva un altro. Lo scarto fra le
// due si misurava anche in CLS: 0.195, cioe' letteralmente lo scambio di una
// pagina con l'altra a meta' caricamento.
//
// Adesso la pagina e' UNA: la disegna il server dentro i gusci per lingua che
// gia' esistevano (`gusciaDi` in server.js), e il browser non la ridisegna piu'
// — aggancia i comportamenti su quello che trova.
//
// Sta in `src/web/` e non in `public/` perche' NON deve arrivare al browser: il
// browser riceve la vetrina gia' disegnata, il generatore gli sarebbe peso
// morto. Le icone e i nomi dei pacchetti qui sotto esistono anche in `app.js`
// (che e' uno script classico e non puo' importare): un contratto li confronta
// uno per uno, perche' due copie non sorvegliate vanno alla deriva in silenzio.

const ICO = {
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  scudo: '<path d="M12 3.2 19 6v5c0 4.8-3.4 7.8-7 8.8-3.6-1-7-4-7-8.8V6z"/>',
  moduli: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  musica: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
};

const _hIco = (d) => `<svg class="h-ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export const LINGUE = ['it', 'en', 'es'];

// Le lingue erano PULSANTI che ridisegnavano la pagina in JS: un crawler non li
// puo' premere, e chi cambiava lingua restava sullo stesso indirizzo. Qui sono
// LINK ai tre indirizzi che sitemap e hreflang dichiarano gia'.
const VIA_LINGUA = { it: '/', en: '/?lang=en', es: '/?lang=es' };
const selettoreLingua = (attiva, L) =>
  `<div class="lingua-sel" role="group" aria-label="${esc(L('Lingua', 'Language', 'Idioma'))}">${LINGUE.map((x) =>
    `<a class="lingua-btn${x === attiva ? ' on' : ''}" href="${VIA_LINGUA[x]}" hreflang="${x}"${x === attiva ? ' aria-current="true"' : ''}>${x.toUpperCase()}</a>`).join('')}</div>`;

const NOME_ADDON = {
  base: ['Base', 'Base', 'Base'],
  giochi: ['Giochi & Classifiche', 'Giochi & Classifiche', 'Giochi & Classifiche'],
  musica: ['Richieste Musicali', 'Richieste Musicali', 'Richieste Musicali'],
  voce: ['Comandi Vocali', 'Comandi Vocali', 'Comandi Vocali'],
  notifiche: ['Social & Notifiche', 'Social & Notifiche', 'Social & Notifiche'],
  effetti: ['Effetti & Punti canale', 'Effetti & Punti canale', 'Effetti & Punti canale'],
  clip: ['Clip Automatiche', 'Clip Automatiche', 'Clip Automatiche'],
  squadra: ['Squadra', 'Squadra', 'Squadra'],
};

const CAPACITA = [
  { ico: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', area: ['Chat e comandi', 'Chat and commands', 'Chat y comandos'], voci: [
    { scheda: 'stato', pacc: 'free', t: ['Scrive col tuo account', 'Writes with your account', 'Escribe con tu cuenta'], d: ['In chat compare il tuo nome, non un bot anonimo.', 'Your name appears in chat, not an anonymous bot.', 'En el chat aparece tu nombre, no un bot anónimo.'] },
    { scheda: 'moduli', pacc: 'free', t: ['Comandi e automazioni illimitati', 'Unlimited commands and automations', 'Comandos y automatizaciones ilimitados'], d: ['Un follow accende una GIF, «!oggi» risponde con la scaletta, un timer ricorda i social: li scrivi tu, quanti vuoi.', 'A follow fires a GIF, «!today» answers with the schedule, a timer reminds people of your socials: you write them, as many as you like.', 'Un follow lanza un GIF, «!hoy» responde con el horario, un temporizador recuerda tus redes: los escribes tú, tantos como quieras.'] },
    { scheda: 'regole', pacc: 'free', t: ['Moderazione e antispam', 'Moderation and anti-spam', 'Moderación y antispam'], d: ['Filtra link, maiuscole, ripetizioni, menzioni, ASCII-art/zalgo, muri di testo ed emoji a raffica, e dà timeout a chi insiste.', 'Filters links, caps, repetition, mentions, ASCII art/zalgo, text walls and emoji floods, and times out those who insist.', 'Filtra enlaces, mayúsculas, repeticiones, menciones, ASCII-art/zalgo, muros de texto y ráfagas de emojis, y da timeout a quien insiste.'] },
    { scheda: 'scudo', pacc: 'free', t: ['Scudo anti-bot e anti-raid', 'Anti-bot & anti-raid shield', 'Escudo anti-bot y anti-raid'], d: ['Ferma le raffiche di follow-bot, riconosce i bot noti (lista aggiornata da sola) e trattiene i messaggi degli account appena creati per mod e streamer.', 'Stops follow-bot waves, recognises known bots (self-updating list) and holds brand-new accounts’ messages for mods and streamer.', 'Frena las oleadas de follow-bots, reconoce los bots conocidos (lista que se actualiza sola) y retiene los mensajes de cuentas recién creadas para mods y streamer.'] },
    { scheda: 'moduli', pacc: 'free', t: ['Contatori a schermo', 'On-screen counters', 'Contadores en pantalla'], d: ['Tipo !morti: li accendi dalla chat e il numero appare nell’overlay.', 'Like !deaths: turn them on from chat and the number shows in the overlay.', 'Tipo !muertes: los enciendes desde el chat y el número aparece en el overlay.'] },
    { scheda: 'moduli', pacc: 'free', t: ['La regia dai comandi e dagli eventi', 'Your program from commands and events', 'La realización desde comandos y eventos'], d: ['Un comando, la voce o un raid cambiano scena o mutano il microfono nel programma con cui mandi in onda. Lo esegue il pannello aperto sul computer della regia.', 'A command, your voice or a raid switch scene or mute the mic in your broadcast program. The panel open on the streaming computer carries it out.', 'Un comando, la voz o un raid cambian de escena o silencian el micro en tu programa de emisión. Lo ejecuta el panel abierto en el ordenador del directo.'] },
    { scheda: 'personalita', pacc: 'free', t: ['Personalità e tono', 'Personality and tone', 'Personalidad y tono'], d: ['Decidi come parla e quanto interviene da solo. Parla quando c’è un motivo, non a caso: risponde a chi è rimasto senza risposta se sa la cosa, rilancia la chat che si ferma, sale sull’onda quando esplode. E vedi cosa ha detto di sua iniziativa, con l’ora e il motivo.', 'You decide how it speaks and how often it chimes in. It speaks when there is a reason, not at random: it answers whoever was left unanswered if it knows, revives a chat that goes quiet, rides the wave when it bursts. And you see what it said on its own, with time and reason.', 'Decides cómo habla y cuánto interviene solo. Habla cuando hay un motivo, no al azar: responde a quien se quedó sin respuesta si lo sabe, reanima el chat que se para, sube a la ola cuando explota. Y ves qué dijo por su cuenta, con la hora y el motivo.'] },
    { scheda: 'conoscenza', pacc: 'free', t: ['Cosa dire su di te', 'What to say about you', 'Qué decir sobre ti'], d: ['Social, orari, PC, regole: gli insegni le risposte una volta.', 'Socials, schedule, PC, rules: you teach it the answers once.', 'Redes, horarios, PC, reglas: le enseñas las respuestas una vez.'] },
    { scheda: 'memoria', pacc: 'free', t: ['Si ricorda chi c’era', 'It remembers who was there', 'Recuerda quién estaba'], d: ['Le statistiche della chat, chi c’è sempre e quello che il bot ricorda dei tuoi spettatori. Saluta chi scrive per la prima volta e chi torna dopo settimane, con le parole che scegli tu.', 'Chat stats, who is always there and what the bot remembers about your viewers. It greets whoever writes for the first time and whoever comes back after weeks, with the words you choose.', 'Las estadísticas del chat, quién está siempre y lo que el bot recuerda de tus espectadores. Saluda a quien escribe por primera vez y a quien vuelve tras semanas, con las palabras que elijas.'] },
    { scheda: 'giochi', pacc: 'free', t: ['Serie di presenze', 'Attendance streaks', 'Rachas de presencia'], d: ['Chi resta dieci minuti è presente a quella diretta; diretta dopo diretta la serie cresce, con un bonus in monete che cresce con lei e il bot che lo dice ai traguardi.', 'Whoever stays ten minutes is present at that stream; stream after stream the streak grows, with a coin bonus that grows with it and the bot announcing the milestones.', 'Quien se queda diez minutos está presente en ese directo; directo tras directo la racha crece, con un bono en monedas que crece con ella y el bot que lo dice en las metas.'] },
    { scheda: 'registro', pacc: 'free', t: ['Registro di cosa è successo', 'A log of what happened', 'Registro de lo que ha pasado'], d: ['Attacchi, interventi e casi da rivedere, con le prove: sai sempre perché qualcuno è stato fermato.', 'Attacks, actions and cases to review, with the evidence: you always know why someone was stopped.', 'Ataques, intervenciones y casos por revisar, con las pruebas: siempre sabes por qué se paró a alguien.'] },
    { scheda: 'sottoscrizione', pacc: 'squadra', t: ['Fino a 10 moderatori', 'Up to 10 moderators', 'Hasta 10 moderadores'], d: ['I tuoi mod entrano nella dashboard e gestiscono il canale con te.', 'Your mods get into the dashboard and manage the channel with you.', 'Tus mods entran en el panel y gestionan el canal contigo.'] },
  ] },
  { ico: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>', area: ['Overlay per la diretta', 'stream overlay', 'Overlay para el directo'], voci: [
    { scheda: 'alert', pacc: 'free', t: ['Overlay Studio', 'Overlay Studio', 'Overlay Studio'], d: ['Chat a schermo, widget e temi: colori, font, posizione e dimensione, con riquadri che danno la forma agli elementi, livelli che si bloccano, guide, zoom e un\'immagine di riferimento sotto la tela. Più overlay, ognuno col suo link segreto, che rinnovi con un tasto se ti scappa.', 'On-screen chat, widgets and themes: colours, fonts, position and size, with frames that shape the elements, lockable layers, guides, zoom and a reference image under the canvas. Multiple overlays, each with its own secret link, renewed with one key if it leaks.', 'Chat en pantalla, widgets y temas: colores, fuentes, posición y tamaño, con recuadros que dan forma a los elementos, capas que se bloquean, guías, zoom y una imagen de referencia bajo el lienzo. Varios overlays, cada uno con su enlace secreto, que renuevas con una tecla si se te escapa.'] },
    { scheda: 'emote', pacc: 'free', t: ['Emote 7TV', '7TV emotes', 'Emotes 7TV'], d: ['Aggiungi, rinomina e togli le emote del canale dal bot.', 'Add, rename and remove your channel’s emotes from the bot.', 'Añade, renombra y quita las emotes del canal desde el bot.'] },
    { scheda: 'alert', pacc: 'free', t: ['Due chat, come le vuoi tu', 'Two chats, the way you want', 'Dos chats, como los quieras'], d: ['Trasmetti su due piattaforme? Scegli quali chat vanno a schermo, e se stanno insieme o in due riquadri separati, uno per fonte. Quando stanno insieme, ogni riga puo\' portare un segno che dice da dove arriva. E se una chat non la vuoi in diretta, la togli dallo schermo senza spegnerla: il bot continua a leggerla e a rispondere.', 'Streaming on two platforms? Pick which chats go on screen, and whether they sit together or in two separate boxes, one per source. When they sit together, each line can carry a mark saying where it comes from. And if you don\'t want a chat on stream, take it off the screen without turning it off: the bot keeps reading it and replying.', '\u00bfTransmites en dos plataformas? Elige qu\u00e9 chats van en pantalla, y si van juntos o en dos recuadros separados, uno por fuente. Cuando van juntos, cada l\u00ednea puede llevar una marca que dice de d\u00f3nde llega. Y si un chat no lo quieres en directo, lo quitas de la pantalla sin apagarlo: el bot sigue ley\u00e9ndolo y respondiendo.'] },
    { scheda: 'alert', pacc: 'free', t: ['Player musica su misura', 'Music player, your way', 'Reproductor a tu medida'], d: ['Copertina, righe, tempi, barra e onde: ogni pezzo con la sua misura e il suo colore. Sei temi che si muovono ed entrano ed escono come l\'oggetto vero: il vinile frena e rientra nella custodia, il CD chiude la custodia, la cassetta viene espulsa. E con la disposizione libera trascini ogni pezzo dove vuoi. Un tuo video in loop può fare da sfondo sfocato o stare in chiaro al posto della copertina. Uguale in anteprima e in diretta.', 'Cover, lines, times, bar and waves: each part with its own size and colour. Six themes that move, and come and go like the real object: the vinyl brakes and slides back into its sleeve, the CD closes its case, the cassette is ejected. With the free layout you drag each part where you want it. A looping video of yours can be the blurred background or sit in the clear instead of the cover. The same in the preview and on air.', 'Portada, líneas, tiempos, barra y ondas: cada pieza con su medida y su color. Seis temas que se mueven y entran y salen como el objeto real: el vinilo frena y vuelve a su funda, el CD cierra su caja, el casete se expulsa. Con la disposición libre arrastras cada pieza donde quieras. Un vídeo tuyo en bucle puede ser el fondo difuminado o ir nítido en lugar de la portada. Igual en la vista previa y en directo.'] },
    { scheda: 'alert', pacc: 'free', t: ['Alert follow, sub, bit e raid', 'Follow, sub, bit and raid alerts', 'Alertas de follow, sub, bits y raid'], d: ['Con immagini o video, suoni tuoi o pronti, e il green screen.', 'With images or video, your own or ready-made sounds, and green screen.', 'Con imágenes o vídeo, sonidos tuyos o listos, y croma.'] },
    { scheda: 'effetti', pacc: 'free', t: ['Effetti sui punti canale', 'Channel-point effects', 'Efectos con puntos de canal'], d: ['Ogni riscatto può lanciare un suono, una GIF o un video a schermo.', 'Every redemption can trigger a sound, a GIF or a video on screen.', 'Cada canje puede lanzar un sonido, un GIF o un vídeo en pantalla.'] },
    { scheda: 'penitenze', pacc: 'free', t: ['Penitenze a tempo', 'Timed forfeits', 'Penitencias cronometradas'], d: ['La chat ti vieta una parola — o ti obbliga a dire solo quella. Se sbagli, penitenza.', 'Chat bans a word for you — or forces you to say only that one. Slip up and you owe a forfeit.', 'El chat te prohíbe una palabra — o te obliga a decir solo esa. Si fallas, penitencia.'] },
  ] },
  { ico: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4V8Z"/>', area: ['La tua diretta', 'Your stream', 'Tu directo'], voci: [
    { scheda: 'regia', pacc: 'free', t: ['Regia della diretta', 'Stream control room', 'Realización del directo'], d: ['Titolo, categoria, tag, marker, pubblicità e raid dal pannello.', 'Title, category, tags, markers, ads and raids from the panel.', 'Título, categoría, etiquetas, marcadores, anuncios y raids desde el panel.'] },
    { scheda: 'dirette', pacc: 'free', t: ['Il rapporto di ogni diretta', 'A report for every stream', 'El informe de cada directo'], d: ['Appena chiudi: durata, picco di spettatori, chat e chi ha scritto di più, nuovi follower e sub, raid, presenti, clip e donazioni. Resta nel pannello e, se vuoi, ti arriva su Telegram o via mail.', 'As soon as you end: duration, viewer peak, chat and top chatters, new followers and subs, raids, attendees, clips and donations. It stays in the panel and, if you want, reaches you on Telegram or by email.', 'En cuanto cierras: duración, pico de espectadores, chat y quién más ha escrito, nuevos seguidores y subs, raids, presentes, clips y donaciones. Se queda en el panel y, si quieres, te llega en Telegram o por correo.'] },
    { scheda: 'statistiche', pacc: 'free', t: ['I numeri del canale, in un posto solo', 'Your channel numbers, in one place', 'Los números del canal, en un solo sitio'], d: ['Dirette, ore in onda, picco di spettatori, chat, follower e donazioni, per sette giorni, trenta o da sempre. Con le classifiche di chi c’è sempre, di chi scrive e di chi guarda.', 'Streams, hours on air, viewer peak, chat, followers and donations, over seven days, thirty or all time. With the leaderboards of who is always there, who writes and who watches.', 'Directos, horas en antena, pico de espectadores, chat, seguidores y donaciones, en siete días, treinta o desde siempre. Con las clasificaciones de quién está siempre, quién escribe y quién mira.'] },
    { scheda: 'stato', pacc: 'free', t: ['La tua diretta sulla nostra home', 'Your stream on our home', 'Tu directo en nuestra home'], d: ['Quando sei in onda il tuo canale pu\u00f2 comparire fra le dirette sulla pagina iniziale di SocialBot, con il titolo e cosa stai giocando. Lo accendi tu e lo spegni quando vuoi: se non lo accendi, non compari.', 'When you are live your channel can show up among the streams on the SocialBot home page, with the title and what you are playing. You turn it on and off whenever you want: if you do not turn it on, you do not appear.', 'Cuando est\u00e1s en directo tu canal puede aparecer entre los directos de la p\u00e1gina de inicio de SocialBot, con el t\u00edtulo y a qu\u00e9 juegas. Lo enciendes y lo apagas cuando quieras: si no lo enciendes, no apareces.'] },
    { scheda: 'stato', pacc: 'free', t: ['Le nostre mail si riconoscono', 'Our mails can be told apart', 'Nuestros correos se reconocen'], d: ['In fondo a ogni mail che ti mandiamo c’è un codice che cambia ogni lunedì e lo trovi solo dentro al tuo pannello. Se non combacia, quella mail non l’abbiamo scritta noi.', 'At the bottom of every mail we send you there is a code that changes every Monday and lives only inside your panel. If it does not match, we did not write that mail.', 'Al final de cada correo que te enviamos hay un código que cambia cada lunes y solo está dentro de tu panel. Si no coincide, ese correo no lo hemos escrito nosotros.'] },

    { scheda: 'consolify', pacc: 'free', t: ['CONSOLify: i tasti del tuo canale', 'CONSOLify: your channel’s keys', 'CONSOLify: las teclas de tu canal'], d: ['Una plancia di tasti sul telefono, sul tablet o su una tastiera fisica. Ogni tasto fa una fila di cose: manda un suono o un video, dice una frase, cambia scena.', 'A board of keys on your phone, tablet or a physical key pad. Each key runs a row of steps: play a sound or a video, say a line, change scene.', 'Un panel de teclas en el móvil, la tablet o un teclado físico. Cada tecla hace una fila de cosas: lanza un sonido o un vídeo, dice una frase, cambia de escena.'] },
    { scheda: 'consolify', pacc: 'free', t: ['Collegato al programma della diretta', 'Wired to your broadcast program', 'Conectado al programa del directo'], d: ['Cambi scena, lanci una transizione o muti una fonte da un tasto. La password resta nel tuo browser: non passa da noi.', 'Change scene, fire a transition or mute a source from a key. The password stays in your browser: it never passes through us.', 'Cambias de escena, lanzas una transición o silencias una fuente desde una tecla. La contraseña se queda en tu navegador: no pasa por nosotros.'] },
    { scheda: 'clip', pacc: 'clip', t: ['Clip automatiche', 'Automatic clips', 'Clips automáticos'], d: ['Quando la chat si accende il bot clippa da solo.', 'When chat lights up the bot clips on its own.', 'Cuando el chat se enciende el bot clipea solo.'] },
    { scheda: 'ascolto', pacc: 'voce', t: ['Comandi a voce', 'Voice commands', 'Comandos por voz'], d: ['Cambi titolo, fai una clip o dai il VIP parlando. L’audio non lascia il tuo PC.', 'Change the title, make a clip or grant VIP by speaking. The audio never leaves your PC.', 'Cambias el título, haces un clip o das el VIP hablando. El audio no sale de tu PC.'] },
  ] },
  { ico: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6C2.6 9.4 2 14.5 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.4-1.4a2 2 0 0 1 1.4-.6h4.4a2 2 0 0 1 1.4.6L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.5-.6-6.6-.7-7.3A4 4 0 0 0 17.3 5z"/>', area: ['Far divertire la chat', 'Entertaining your chat', 'Divertir al chat'], voci: [
    { scheda: 'giochi', pacc: 'free', t: ['Minigiochi e monete', 'Minigames and coins', 'Minijuegos y monedas'], d: ['Slot, roulette, pesca, trivia: gli spettatori giocano con la moneta del canale.', 'Slots, roulette, fishing, trivia: viewers play with your channel coin.', 'Tragaperras, ruleta, pesca, trivia: los espectadores juegan con la moneda del canal.'] },
    { scheda: 'giochi', pacc: 'free', t: ['Classifiche e VIP automatico', 'Leaderboards and automatic VIP', 'Clasificaciones y VIP automático'], d: ['Chi partecipa più di tutti sale in classifica e prende il VIP.', 'Whoever takes part the most climbs the leaderboard and gets VIP.', 'Quien más participa sube en la clasificación y recibe el VIP.'] },
    { scheda: 'sondaggi', pacc: 'free', t: ['Sondaggi e predizioni', 'Polls and predictions', 'Encuestas y predicciones'], d: ['Lanci sondaggi e predizioni Twitch dal pannello, senza aprire Twitch.', 'Launch Twitch polls and predictions from the panel, without opening Twitch.', 'Lanzas encuestas y predicciones de Twitch desde el panel, sin abrir Twitch.'] },
    { scheda: 'giveaway', pacc: 'free', t: ['Giveaway', 'Giveaways', 'Sorteos'], d: ['Estrazioni a premi: entrano con !join, con probabilità regolabili (più chance a sub/VIP), biglietti bonus e più vincitori in un colpo.', 'Prize draws: they join with !join, with adjustable odds (better chances for subs/VIPs), bonus tickets and multiple winners at once.', 'Sorteos: entran con !join, con probabilidades ajustables (más chances para subs/VIPs), boletos extra y varios ganadores a la vez.'] },
    { scheda: 'musica', pacc: 'free', t: ['Richieste musicali', 'Music requests', 'Peticiones musicales'], d: ['Canzoni in coda su Spotify con !sr: libero o a bit, monete o punti canale.', 'Songs queued on Spotify with !sr: free or via bits, coins or channel points.', 'Canciones en cola en Spotify con !sr: libre o con bits, monedas o puntos de canal.'] },
  ] },
  { ico: '<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/>', area: ['Farti trovare', 'Getting you found', 'Que te encuentren'], voci: [
    { scheda: 'notifiche', pacc: 'notifiche', t: ['Avviso quando vai in diretta', 'Alert when you go live', 'Aviso cuando estás en directo'], d: ['Avvisa il tuo gruppo Telegram e il tuo server Discord.', 'Alerts your Telegram group and your Discord server.', 'Avisa a tu grupo de Telegram y a tu servidor de Discord.'] },
    { scheda: 'notifiche', pacc: 'notifiche', t: ['Avviso dei nuovi post', 'New-post alerts', 'Aviso de nuevos posts'], d: ['Quando pubblichi su TikTok, YouTube o Instagram lo dice alla community.', 'When you post on TikTok, YouTube or Instagram it tells your community.', 'Cuando publicas en TikTok, YouTube o Instagram se lo dice a tu comunidad.'] },
    { scheda: 'notifiche', pacc: 'notifiche', t: ['Compleanni in chat', 'Birthdays in chat', 'Cumplea\u00f1os en el chat'], d: ['Chi ti guarda si segna il compleanno da solo con un comando, e il giorno giusto il bot gli fa gli auguri al suo primo messaggio, con un effetto in sovraimpressione se lo vuoi. In chat la mezzanotte non serve a niente: gli auguri si fanno a chi c\'\u00e8.', 'Your viewers set their own birthday with a command, and on the day the bot wishes them at their first message, with an on-screen effect if you want one. Midnight is useless in chat: wishes go to whoever is there.', 'Quien te ve apunta su cumplea\u00f1os con un comando, y el d\u00eda justo el bot le felicita en su primer mensaje, con un efecto en pantalla si lo quieres. En el chat la medianoche no sirve: se felicita a quien est\u00e1.'] },
    { scheda: 'notifiche', pacc: 'notifiche', t: ['Bot su Telegram', 'Telegram bot', 'Bot en Telegram'], d: ['Gestisci il bot dal telefono, fai gli auguri di compleanno al gruppo e ricevi in privato il rapporto della serata.', 'Manage the bot from your phone, send birthday wishes to the group and get the night’s report in private.', 'Gestiona el bot desde el móvil, felicita los cumpleaños al grupo y recibe en privado el informe de la noche.'] },
    { scheda: 'grafiche', pacc: 'free', t: ['Grafiche pronte da pubblicare', 'Ready-to-post graphics', 'Gráficas listas para publicar'], d: ['La programmazione della settimana e l’annuncio della diretta: scegli un tema, cambi quello che vuoi e scarichi il PNG.', 'Your weekly schedule and the going-live announcement: pick a theme, change what you want and download the PNG.', 'La programación de la semana y el anuncio del directo: eliges un tema, cambias lo que quieras y descargas el PNG.'] },
    { scheda: 'pagina', pacc: 'free', t: ['La tua pagina link', 'Your link page', 'Tu página de enlaces'], d: ['Una pagina con tutti i tuoi social su socialbot.live/u/iltuonome. Quando la incolli in una chat, l\'anteprima è una card coi tuoi colori, che puoi rifare come vuoi.', 'A page with all your socials at socialbot.live/u/yourname. When you paste it in a chat, the preview is a card in your colours, which you can redo as you like.', 'Una página con todas tus redes en socialbot.live/u/tunombre. Cuando la pegas en un chat, la vista previa es una tarjeta con tus colores, que puedes rehacer como quieras.'] },
    { scheda: 'donazioni', pacc: 'free', t: ['Donazioni sul tuo conto', 'Donations on your own account', 'Donaciones en tu propia cuenta'], d: ['Colleghi il tuo conto Stripe o Satispay, tuo e gestito da te, e chi ti segue dona dalla tua pagina link o da una pagina tutta per le donazioni, con le offerte che accendono i tuoi effetti: i soldi arrivano a te, l\'avviso parte in overlay e in chat, e un obiettivo in euro sale anche sulla pagina. Da una cifra in su chi dona può allegare un\'immagine o una GIF che va in onda come un effetto: la vedi prima tu e la mandi con un tasto, o la lasci partire da sola. Se preferisci Ko-fi o PayPal, il tasto porta lì.', 'Connect your own Stripe or Satispay account, yours and run by you, and people donate from your link page or from a page just for donations, with offers that fire your effects: the money goes to you, the alert fires in the overlay and in chat, and a euro goal grows on the page too. From an amount upwards, donors can attach an image or a GIF that goes on air as an effect: you see it first and send it with a button, or let it start on its own. If you prefer Ko-fi or PayPal, the button goes there.', 'Conectas tu cuenta de Stripe o Satispay, tuya y gestionada por ti, y quien te sigue dona desde tu página de enlaces o desde una página solo para donaciones, con ofertas que encienden tus efectos: el dinero te llega a ti, el aviso sale en el overlay y en el chat, y un objetivo en euros sube también en la página. A partir de un importe, quien dona puede adjuntar una imagen o un GIF que sale en directo como un efecto: la ves antes tú y la envías con un botón, o dejas que salga sola. Si prefieres Ko-fi o PayPal, el botón lleva allí.'] },
  ] },
];

function capacitaHtml(L) {
  const etichetta = (pacc) => {
    if (pacc === 'free') return { testo: L('Essenziale · gratis', 'Essenziale · free', 'Essenziale · gratis'), cls: 'gratis' };
    const na = NOME_ADDON[pacc];
    return { testo: na ? na[0] : pacc, cls: pacc === 'base' ? 'base' : 'addon' };
  };
  const aree = CAPACITA.map((g, i) => {
    const righe = g.voci.map((v) => {
      const e = etichetta(v.pacc);
      return `<li class="cap-voce">
        <div class="cap-testo"><strong>${esc(L(v.t[0], v.t[1], v.t[2]))}</strong>
          <span>${esc(L(v.d[0], v.d[1], v.d[2]))}</span></div>
        <span class="cap-pacc ${e.cls}">${esc(e.testo)}</span>
      </li>`;
    }).join('');
    const ico = g.ico ? `<span class="cap-ico"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${g.ico}</svg></span>` : '';
    return `<details class="cap-area"${i === 0 ? ' open' : ''}>
      <summary>${ico}${esc(L(g.area[0], g.area[1], g.area[2]))} <span class="cap-quante">${g.voci.length}</span></summary>
      <ul class="cap-elenco">${righe}</ul>
    </details>`;
  }).join('');
  const nFree = CAPACITA.reduce((n, g) => n + g.voci.filter((v) => v.pacc === 'free').length, 0);
  const nTot = CAPACITA.reduce((n, g) => n + g.voci.length, 0);
  return `<div class="vt-cap vt-rivela">
    <p class="vt-cap-conta">
      <b>${nTot}</b> ${L('funzioni in tutto', 'features in total', 'funciones en total')}
      <span aria-hidden="true">·</span>
      <b>${nFree}</b> ${L('già tue con l’Essenziale gratis', 'already yours with the free Essenziale', 'ya tuyas con el Essenziale gratis')}
    </p>
    ${aree}
  </div>`;
}

function heroAnteprima(L) {
  const stella = '<svg class="vt-stella" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
  const riga = (cls, nome, testo) => `<li><b class="${cls}">${esc(nome)}</b> ${esc(testo)}</li>`;
  return `<figure class="vt-vetro" aria-hidden="true">
    <div class="vt-schermo">
      <div class="vt-gioco"></div>
      <span class="vt-scena-eti">${L('la tua diretta', 'your stream', 'tu directo')}</span>
      <span class="vt-etichetta vt-live"><i class="vivo"></i>Live</span>
      <span class="vt-etichetta vt-spett"><i></i>&nbsp;${L('spettatori', 'watching', 'viendo')}</span>
      <div class="vt-alert">${stella}<span><b>${L('Nuovo follower!', 'New follower!', '¡Nuevo follower!')}</b> MarioRossi</span></div>
      <ul class="vt-chat">
        ${riga('n1', 'lucaplays', L('ciao a tutti!', 'hi everyone!', '¡hola a todos!'))}
        ${riga('n2', 'giada_ttv', '!social')}
        <li class="bot"><b>${esc(L('il tuo canale', 'your channel', 'tu canal'))}</b> ${esc(L('Mi trovi su socialbot.live/u/luca', 'Find me at socialbot.live/u/luca', 'Me encuentras en socialbot.live/u/luca'))}</li>
        ${riga('n3', 'marco99', 'GG!')}
        ${riga('n4', 'sara_v', L('che bella diretta', 'great stream', 'qué buen directo'))}
      </ul>
      <div class="vt-cam">webcam</div>
    </div>
    <figcaption class="vt-didascalia">${L('L’overlay dal vivo: avvisi, chat a schermo e widget — tutto tuo da personalizzare.', 'The overlay live: alerts, on-screen chat and widgets — all yours to customize.', 'El overlay en vivo: avisos, chat en pantalla y widgets — todo tuyo para personalizar.')}</figcaption>
  </figure>`;
}


// LA FASCIA DELLE DIRETTE. Se non c'e' nessuno in onda non torna una fascia
// vuota: non torna niente. «Nessuno in diretta ora» su una home e' una casa con
// le luci spente, e si vede piu' di una casa che non c'e'. La disegna il server
// dentro al primo HTML, non il browser dopo: una fascia che compare a pagina
// gia' disegnata sposterebbe in giu' tutto il resto, ed e' esattamente lo scarto
// che questa home ha passato mesi a togliere.
function fasciaLive(L, l, dirette) {
  if (!Array.isArray(dirette) || !dirette.length) return '';
  const carte = dirette.map((d) => {
    const conta = Number(d.spettatori) > 0
      ? `${Number(d.spettatori).toLocaleString(l === 'en' ? 'en-GB' : l === 'es' ? 'es-ES' : 'it-IT')} ${L('spettatori', 'watching', 'viendo')}`
      : L('in onda', 'on air', 'en directo');
    return `<a class="vt-dirette-carta" href="${esc(d.url)}" rel="noopener">
      <span class="vt-dirette-nome">${esc(d.nome)}</span>
      ${d.categoria ? `<span class="vt-dirette-cat">${esc(d.categoria)}</span>` : ''}
      ${d.titolo ? `<span class="vt-dirette-tt">${esc(d.titolo)}</span>` : ''}
      <span class="vt-dirette-pie"><i class="vivo"></i>${esc(conta)}</span>
    </a>`;
  }).join('');
  return `<section class="vt-dirette vt-rivela">
    <h2 class="vt-dirette-tit">${L('In diretta adesso', 'Live right now', 'En directo ahora')}</h2>
    <p class="vt-dirette-sotto">${L('Canali che usano SocialBot e hanno scelto di comparire qui.', 'Channels using SocialBot that chose to appear here.', 'Canales que usan SocialBot y han elegido aparecer aquí.')}</p>
    <div class="vt-dirette-griglia">${carte}</div>
  </section>`;
}

function corpo(L, l, kick, youtube, dirette) {
  // con chi ci si registra: Twitch sempre, Kick e YouTube quando la porta e' aperta.
  // L'invito in fondo deve dire le stesse cose dell'apertura: una lista sola.
  const conChi = (o) => { const p = ['Twitch', kick ? 'Kick' : null, youtube ? 'YouTube' : null].filter(Boolean); return p.length > 1 ? p.slice(0, -1).join(', ') + o + p[p.length - 1] : p[0]; };

  // Una serata vera, momento per momento: ogni riga e' una cosa che il bot fa
  // davvero e che nel pannello ha la sua scheda. Niente elenco di parole chiave.
  const SERATA = [
    ['20:58', L('Vai in diretta. Il gruppo Telegram e il server Discord lo sanno da soli, con il titolo di stasera.', 'You go live. Your Telegram group and Discord server find out on their own, with tonight’s title.', 'Sales en directo. Tu grupo de Telegram y tu servidor de Discord se enteran solos, con el título de esta noche.')],
    ['21:03', L('Quaranta follow in dieci secondi. Lo scudo li riconosce come bot e li ferma: la chat non se ne accorge nemmeno.', 'Forty follows in ten seconds. The shield spots them as bots and stops them: chat does not even notice.', 'Cuarenta follows en diez segundos. El escudo los reconoce como bots y los para: el chat ni se entera.')],
    ['21:20', L('Qualcuno scrive <strong>!sr</strong> con una canzone: va in coda su Spotify, e sulla scena compaiono copertina e titolo, con la tua veste.', 'Someone types <strong>!sr</strong> with a song: it queues on Spotify, and cover and title show up on your scene, in your style.', 'Alguien escribe <strong>!sr</strong> con una canción: entra en la cola de Spotify, y en la escena aparecen portada y título, con tu estilo.')],
    ['21:41', L('La chat si ferma per qualche minuto. Il bot rilancia con una domanda, con il tono che gli hai dato, e riparte.', 'Chat goes quiet for a few minutes. The bot picks it back up with a question, in the tone you gave it, and it moves again.', 'El chat se queda callado unos minutos. El bot lo reactiva con una pregunta, con el tono que le diste, y vuelve a arrancar.')],
    ['22:15', L('Arriva un raid. L’alert va in scena con il tuo video e il tuo suono. Un mod chiede perché un tale è stato fermato: lo trova nel registro, con le prove.', 'A raid comes in. The alert plays on your scene with your video and your sound. A mod asks why someone got stopped: it is in the log, with the evidence.', 'Llega un raid. El aviso sale en escena con tu vídeo y tu sonido. Un mod pregunta por qué pararon a alguien: lo encuentra en el registro, con las pruebas.')],
    ['23:30', L('Chiudi. Le ore guardate sono già contate, e il VIP del mese lo prende chi c’era sempre, senza che tu debba ricordartene.', 'You sign off. Watch hours are already counted, and the VIP of the month goes to whoever was always there, without you having to remember.', 'Cierras. Las horas vistas ya están contadas, y el VIP del mes se lo lleva quien siempre estuvo, sin que tengas que acordarte.')],
  ];

  const FAQ = [
    [L('Con quale account scrive in chat?', 'Which account does it write with?', '¿Con qué cuenta escribe en el chat?'),
      L('Con il tuo. In chat compare il tuo nome, e puoi spegnerlo o correggerlo in qualsiasi momento dal pannello.', 'Yours. Your name is what shows up in chat, and you can switch it off or correct it any time from the panel.', 'Con la tuya. En el chat aparece tu nombre, y puedes apagarlo o corregirlo cuando quieras desde el panel.')],
    [L('Posso provarlo senza registrarmi?', 'Can I try it without signing up?', '¿Puedo probarlo sin registrarme?'),
      L('Sì: la <a href="/?demo=1">demo</a> è il pannello vero con dati d’esempio, senza accesso.', 'Yes: the <a href="/?demo=1">demo</a> is the real panel with sample data, no login.', 'Sí: la <a href="/?demo=1">demo</a> es el panel real con datos de ejemplo, sin acceso.')],
    [L('In che lingua parla?', 'What language does it speak?', '¿En qué idioma habla?'),
      L('Il pannello è in italiano, inglese e spagnolo. Quello che il bot scrive in chat lo scrivi tu, nella lingua che vuoi.', 'The panel comes in Italian, English and Spanish. What the bot says in chat is written by you, in whatever language you like.', 'El panel está en italiano, inglés y español. Lo que el bot escribe en el chat lo escribes tú, en el idioma que quieras.')],
    [L('Sono nella community di andryxify.it: cambia qualcosa?', 'I am in the andryxify.it community: does that change anything?', 'Estoy en la comunidad de andryxify.it: ¿cambia algo?'),
      L('Sì: se sei un membro abilitato hai tutto compreso. Entri con lo stesso account e il pannello è già completo.', 'Yes: enabled members get everything included. You log in with the same account and the panel is already complete.', 'Sí: si eres miembro habilitado lo tienes todo incluido. Entras con la misma cuenta y el panel ya está completo.')],
  ];

  return `
    <section class="vt-scena">
      <header class="vt-barra">
        <a class="vt-marchio" href="/" aria-label="SocialBot"><img src="/icons/logo-barra.png?v=8" alt="SocialBot" width="80" height="30"></a>
        <nav class="vt-mappa" aria-label="${L('Il sito', 'The site', 'El sitio')}">
          <a href="/guide">${L('Guide', 'Guides', 'Guías')}</a>
          <a href="/manuale">${L('Manuali', 'Manuals', 'Manuales')}</a>
          <a href="/novita">${L('Novità', 'What’s new', 'Novedades')}</a>
          <a href="/?demo=1">${L('Demo', 'Demo', 'Demo')}</a>
        </nav>
        <div class="vt-strumenti">${selettoreLingua(l, L)}</div>
      </header>
      <span class="vt-occhiello"><i class="vivo"></i>${L('Per Twitch e Kick · di andryxify.it', 'For Twitch and Kick · by andryxify.it', 'Para Twitch y Kick · de andryxify.it')}</span>
      <h1 class="vt-titolo">${L('Il bot che in chat scrive', 'The bot that writes in chat', 'El bot que en el chat escribe')} <em>${L('con il tuo nome', 'under your own name', 'con tu nombre')}</em></h1>
      <p class="vt-frase">${L('Chat, alert, donazioni e pagina link in un posto solo, con un accesso solo.', 'Chat, alerts, donations and your link page in one place, with one login.', 'Chat, avisos, donaciones y página de enlaces en un solo sitio, con un solo acceso.')}</p>
      <div class="vt-azioni">
        <a class="vt-btn vt-btn-primo" href="/entra?nuovo=1">${L('Registrati con Twitch', 'Sign up with Twitch', 'Regístrate con Twitch')}</a>
        <a class="vt-btn" href="/entra">${L('Accedi', 'Log in', 'Entrar')}</a>
        ${kick ? `<a class="vt-btn" href="/accedi/kick">${L('Registrati con Kick', 'Sign up with Kick', 'Regístrate con Kick')}</a>` : ''}
        ${youtube
          ? `<a class="vt-btn" href="/accedi/youtube">${L('Registrati con YouTube', 'Sign up with YouTube', 'Regístrate con YouTube')}</a>`
          : `<span class="vt-btn vt-btn-spento" aria-disabled="true">${L('YouTube · in arrivo', 'YouTube · coming soon', 'YouTube · muy pronto')}</span>`}
      </div>
      <p class="vt-sotto">${L('L’<b>Essenziale è gratis per sempre</b> · nessuna carta richiesta · <a href="/?demo=1">guarda la demo</a>', 'The <b>Essenziale plan is free forever</b> · no card needed · <a href="/?demo=1">see the demo</a>', 'El <b>plan Essenziale es gratis para siempre</b> · sin tarjeta · <a href="/?demo=1">mira la demo</a>')}</p>
      ${heroAnteprima(L)}
      ${fasciaLive(L, l, dirette)}
    </section>

    <section class="vt-sez">
      <div class="vt-testa vt-rivela">
        <h2 class="vt-tit">${L('Una serata, con il bot acceso', 'One evening, with the bot on', 'Una noche, con el bot encendido')}</h2>
      </div>
      <ol class="vt-serata vt-rivela">
        ${SERATA.map(([t, testo]) => `<li><time>${t}</time><p>${testo}</p></li>`).join('')}
      </ol>
    </section>

    <section class="vt-sez">
      <div class="vt-testa vt-rivela">
        <h2 class="vt-tit">${L('Cosa c’è dentro', 'What is inside', 'Qué hay dentro')}</h2>
        <p class="vt-testo">${L('Tutto, con accanto scritto se è già tuo o se è un pacchetto in più.', 'All of it, each marked as already yours or as an extra package.', 'Todo, con al lado si ya es tuyo o si es un paquete extra.')}</p>
      </div>
      ${capacitaHtml(L)}
    </section>

    <section class="vt-sez" id="listino">
      <div class="vt-testa centro vt-rivela">
        <h2 class="vt-tit">${L('Quanto costa', 'What it costs', 'Cuánto cuesta')}</h2>
        <p class="vt-testo">${L('L’Essenziale è gratis e resta gratis. Il resto si aggiunge un pacchetto alla volta, dal pannello, e si toglie allo stesso modo. Se un rinnovo non passa, il bot resta: si spengono solo le funzioni in più.', 'Essenziale is free and stays free. The rest is added one package at a time, from the panel, and removed the same way. If a renewal fails, the bot stays: only the extra features switch off.', 'Essenziale es gratis y sigue siéndolo. Lo demás se añade de paquete en paquete, desde el panel, y se quita igual. Si una renovación falla, el bot se queda: solo se apagan las funciones extra.')}</p>
      </div>
      <div class="vetrina-piani" id="vetrina-piani"></div>
    </section>

    <section class="vt-sez">
      <div class="vt-testa vt-rivela">
        <h2 class="vt-tit">${L('Domande', 'Questions', 'Preguntas')}</h2>
      </div>
      <div class="vt-faq vt-rivela">
        ${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
      </div>
    </section>

    <section class="vt-fine vt-rivela">
      <h2 class="vt-tit">${L('Per cominciare', 'To get started', 'Para empezar')}</h2>
      <p class="vt-testo">${L(`Serve solo l’account con cui streammi, su ${conChi(' o ')}. Entri, il piano Essenziale è già attivo, e quello che ti manca lo aggiungi quando ti manca davvero.`, `All you need is the account you stream with, on ${conChi(' or ')}. You log in, the Essenziale plan is already on, and whatever you are missing you add when you actually miss it.`, `Solo hace falta la cuenta con la que haces directo, en ${conChi(' o ')}. Entras, el plan Essenziale ya está activo, y lo que te falte lo añades cuando te falte de verdad.`)}</p>
      <div class="vt-azioni">
        <a class="vt-btn vt-btn-primo" href="/entra?nuovo=1">${L('Registrati con Twitch', 'Sign up with Twitch', 'Regístrate con Twitch')}</a>
        ${kick ? `<a class="vt-btn" href="/accedi/kick">${L('Registrati con Kick', 'Sign up with Kick', 'Regístrate con Kick')}</a>` : ''}
        ${youtube ? `<a class="vt-btn" href="/accedi/youtube">${L('Registrati con YouTube', 'Sign up with YouTube', 'Regístrate con YouTube')}</a>` : ''}
        <a class="vt-btn" href="https://andryxify.it">${L('Vai al sito principale', 'Go to the main site', 'Ir al sitio principal')}</a>
      </div>
      <p class="vt-sotto">${L('Preferisci un altro modo?', 'Prefer another way?', '¿Prefieres otra forma?')}
        <a href="/sblocca">${L('Entra con passkey', 'Log in with a passkey', 'Entra con passkey')}</a>
        <span aria-hidden="true">·</span>
        <a href="/mod">${L('Accesso moderatore', 'Moderator access', 'Acceso moderador')}</a>
      </p>
    </section>`;
}

// Il markup della vetrina nella lingua chiesta. Funzione PURA: nessun DOM,
// nessuna richiesta, nessuna data — cosi' i gusci si precalcolano una volta
// all'avvio e si servono senza rifare niente.
export function vetrinaHtml(lingua = 'it', { kick = false, youtube = false, dirette = [] } = {}) {
  const l = LINGUE.includes(lingua) ? lingua : 'it';
  const L = (it, en, es) => (l === 'en' ? en : l === 'es' ? es : it);
  return corpo(L, l, kick, youtube, dirette);
}

export { ICO as ICONE_VETRINA, NOME_ADDON as PACCHETTI_VETRINA, CAPACITA as FUNZIONI_VETRINA };

// Il punto in cui la vetrina entra nel guscio. Sta qui, e non a fianco di chi
// serve la pagina, perche' lo usano in due — il server e il collaudo che prova
// che la pagina e' una sola — e due copie di un ancoraggio sono due occasioni
// di sbagliarlo. Se l'ancoraggio non c'e' si alza un errore: meglio un server
// che non parte di una home che esce vuota senza dirlo a nessuno.
export const ANCORA_VETRINA = '<div id="app"></div>';

export function inserisciVetrina(guscio, lingua, opzioni) {
  if (!guscio.includes(ANCORA_VETRINA)) {
    throw new Error(`vetrina: non trovo ${ANCORA_VETRINA} in index.html`);
  }
  return guscio.replace(ANCORA_VETRINA, `<div id="app">${vetrinaHtml(lingua, opzioni)}</div>`);
}
