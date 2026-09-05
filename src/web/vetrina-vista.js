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
    { pacc: 'free', t: ['Scrive col tuo account', 'Writes with your account', 'Escribe con tu cuenta'], d: ['In chat compare il tuo nome, non un bot anonimo.', 'Your name appears in chat, not an anonymous bot.', 'En el chat aparece tu nombre, no un bot anónimo.'] },
    { pacc: 'free', t: ['Comandi e automazioni illimitati', 'Unlimited commands and automations', 'Comandos y automatizaciones ilimitados'], d: ['Quando succede X, il bot fa Y. Nessun limite di numero.', 'When X happens, the bot does Y. No limit on how many.', 'Cuando pasa X, el bot hace Y. Sin límite de cantidad.'] },
    { pacc: 'free', t: ['Moderazione e antispam', 'Moderation and anti-spam', 'Moderación y antispam'], d: ['Filtra link, maiuscole, ripetizioni, menzioni, ASCII-art/zalgo, muri di testo ed emoji a raffica, e dà timeout a chi insiste.', 'Filters links, caps, repetition, mentions, ASCII art/zalgo, text walls and emoji floods, and times out those who insist.', 'Filtra enlaces, mayúsculas, repeticiones, menciones, ASCII-art/zalgo, muros de texto y ráfagas de emojis, y da timeout a quien insiste.'] },
    { pacc: 'free', t: ['Scudo anti-bot e anti-raid', 'Anti-bot & anti-raid shield', 'Escudo anti-bot y anti-raid'], d: ['Ferma le raffiche di follow-bot, riconosce i bot noti (lista aggiornata da sola) e trattiene i messaggi degli account appena creati per mod e streamer.', 'Stops follow-bot waves, recognises known bots (self-updating list) and holds brand-new accounts’ messages for mods and streamer.', 'Frena las oleadas de follow-bots, reconoce los bots conocidos (lista que se actualiza sola) y retiene los mensajes de cuentas recién creadas para mods y streamer.'] },
    { pacc: 'free', t: ['Contatori a schermo', 'On-screen counters', 'Contadores en pantalla'], d: ['Tipo !morti: li accendi dalla chat e il numero appare nell’overlay.', 'Like !deaths: turn them on from chat and the number shows in the overlay.', 'Tipo !muertes: los enciendes desde el chat y el número aparece en el overlay.'] },
    { pacc: 'free', t: ['Personalità e tono', 'Personality and tone', 'Personalidad y tono'], d: ['Decidi come parla e quanto interviene da solo in chat.', 'You decide how it speaks and how often it chimes in.', 'Decides cómo habla y cuánto interviene solo en el chat.'] },
    { pacc: 'free', t: ['Cosa dire su di te', 'What to say about you', 'Qué decir sobre ti'], d: ['Social, orari, PC, regole: gli insegni le risposte una volta.', 'Socials, schedule, PC, rules: you teach it the answers once.', 'Redes, horarios, PC, reglas: le enseñas las respuestas una vez.'] },
    { pacc: 'squadra', t: ['Fino a 10 moderatori', 'Up to 10 moderators', 'Hasta 10 moderadores'], d: ['I tuoi mod entrano nella dashboard e gestiscono il canale con te.', 'Your mods get into the dashboard and manage the channel with you.', 'Tus mods entran en el panel y gestionan el canal contigo.'] },
  ] },
  { ico: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>', area: ['Overlay per la diretta', 'stream overlay', 'Overlay para el directo'], voci: [
    { pacc: 'free', t: ['Overlay Studio', 'Overlay Studio', 'Overlay Studio'], d: ['Chat a schermo, widget e temi: colori, font, posizione e dimensione. Più overlay, ognuno col suo link.', 'On-screen chat, widgets and themes: colours, fonts, position and size. Multiple overlays, each with its own link.', 'Chat en pantalla, widgets y temas: colores, fuentes, posición y tamaño. Varios overlays, cada uno con su enlace.'] },
    { pacc: 'free', t: ['Emote 7TV', '7TV emotes', 'Emotes 7TV'], d: ['Aggiungi, rinomina e togli le emote del canale dal bot.', 'Add, rename and remove your channel’s emotes from the bot.', 'Añade, renombra y quita las emotes del canal desde el bot.'] },
    { pacc: 'effetti', t: ['Alert follow, sub, bit e raid', 'Follow, sub, bit and raid alerts', 'Alertas de follow, sub, bits y raid'], d: ['Con immagini o video, suoni tuoi o pronti, e il green screen.', 'With images or video, your own or ready-made sounds, and green screen.', 'Con imágenes o vídeo, sonidos tuyos o listos, y croma.'] },
    { pacc: 'effetti', t: ['Effetti sui punti canale', 'Channel-point effects', 'Efectos con puntos de canal'], d: ['Ogni riscatto può lanciare un suono, una GIF o un video a schermo.', 'Every redemption can trigger a sound, a GIF or a video on screen.', 'Cada canje puede lanzar un sonido, un GIF o un vídeo en pantalla.'] },
    { pacc: 'effetti', t: ['Penitenze a tempo', 'Timed forfeits', 'Penitencias cronometradas'], d: ['La chat ti vieta una parola — o ti obbliga a dire solo quella. Se sbagli, penitenza.', 'Chat bans a word for you — or forces you to say only that one. Slip up and you owe a forfeit.', 'El chat te prohíbe una palabra — o te obliga a decir solo esa. Si fallas, penitencia.'] },
  ] },
  { ico: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4V8Z"/>', area: ['La tua diretta', 'Your stream', 'Tu directo'], voci: [
    { pacc: 'free', t: ['Regia della diretta', 'Stream control room', 'Realización del directo'], d: ['Titolo, categoria, tag, marker, pubblicità e raid dal pannello.', 'Title, category, tags, markers, ads and raids from the panel.', 'Título, categoría, etiquetas, marcadores, anuncios y raids desde el panel.'] },

    { pacc: 'clip', t: ['Clip automatiche', 'Automatic clips', 'Clips automáticos'], d: ['Quando la chat si accende il bot clippa da solo.', 'When chat lights up the bot clips on its own.', 'Cuando el chat se enciende el bot clipea solo.'] },
    { pacc: 'voce', t: ['Comandi a voce', 'Voice commands', 'Comandos por voz'], d: ['Cambi titolo, fai una clip o dai il VIP parlando. L’audio non lascia il tuo PC.', 'Change the title, make a clip or grant VIP by speaking. The audio never leaves your PC.', 'Cambias el título, haces un clip o das el VIP hablando. El audio no sale de tu PC.'] },
  ] },
  { ico: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6C2.6 9.4 2 14.5 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.4-1.4a2 2 0 0 1 1.4-.6h4.4a2 2 0 0 1 1.4.6L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.5-.6-6.6-.7-7.3A4 4 0 0 0 17.3 5z"/>', area: ['Far divertire la chat', 'Entertaining your chat', 'Divertir al chat'], voci: [
    { pacc: 'giochi', t: ['Minigiochi e monete', 'Minigames and coins', 'Minijuegos y monedas'], d: ['Slot, roulette, pesca, trivia: gli spettatori giocano con la moneta del canale.', 'Slots, roulette, fishing, trivia: viewers play with your channel coin.', 'Tragaperras, ruleta, pesca, trivia: los espectadores juegan con la moneda del canal.'] },
    { pacc: 'giochi', t: ['Classifiche e VIP automatico', 'Leaderboards and automatic VIP', 'Clasificaciones y VIP automático'], d: ['Chi partecipa più di tutti sale in classifica e prende il VIP.', 'Whoever takes part the most climbs the leaderboard and gets VIP.', 'Quien más participa sube en la clasificación y recibe el VIP.'] },
    { pacc: 'effetti', t: ['Sondaggi e predizioni', 'Polls and predictions', 'Encuestas y predicciones'], d: ['Lanci sondaggi e predizioni Twitch dal pannello, senza aprire Twitch.', 'Launch Twitch polls and predictions from the panel, without opening Twitch.', 'Lanzas encuestas y predicciones de Twitch desde el panel, sin abrir Twitch.'] },
    { pacc: 'free', t: ['Giveaway', 'Giveaways', 'Sorteos'], d: ['Estrazioni a premi: entrano con !join, con probabilità regolabili (più chance a sub/VIP), biglietti bonus e più vincitori in un colpo.', 'Prize draws: they join with !join, with adjustable odds (better chances for subs/VIPs), bonus tickets and multiple winners at once.', 'Sorteos: entran con !join, con probabilidades ajustables (más chances para subs/VIPs), boletos extra y varios ganadores a la vez.'] },
    { pacc: 'musica', t: ['Richieste musicali', 'Music requests', 'Peticiones musicales'], d: ['Canzoni in coda su Spotify con !sr: libero o a bit, monete o punti canale.', 'Songs queued on Spotify with !sr: free or via bits, coins or channel points.', 'Canciones en cola en Spotify con !sr: libre o con bits, monedas o puntos de canal.'] },
  ] },
  { ico: '<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/>', area: ['Farti trovare', 'Getting you found', 'Que te encuentren'], voci: [
    { pacc: 'notifiche', t: ['Avviso quando vai in diretta', 'Alert when you go live', 'Aviso cuando estás en directo'], d: ['Avvisa il tuo gruppo Telegram e il tuo server Discord.', 'Alerts your Telegram group and your Discord server.', 'Avisa a tu grupo de Telegram y a tu servidor de Discord.'] },
    { pacc: 'notifiche', t: ['Avviso dei nuovi post', 'New-post alerts', 'Aviso de nuevos posts'], d: ['Quando pubblichi su TikTok, YouTube o Instagram lo dice alla community.', 'When you post on TikTok, YouTube or Instagram it tells your community.', 'Cuando publicas en TikTok, YouTube o Instagram se lo dice a tu comunidad.'] },
    { pacc: 'notifiche', t: ['Bot su Telegram', 'Telegram bot', 'Bot en Telegram'], d: ['Gestisci il bot dal telefono e fai gli auguri di compleanno al gruppo.', 'Manage the bot from your phone and send birthday wishes to the group.', 'Gestiona el bot desde el móvil y felicita los cumpleaños al grupo.'] },
    { pacc: 'free', t: ['La tua pagina link', 'Your link page', 'Tu página de enlaces'], d: ['Una pagina con tutti i tuoi social su socialbot.live/u/iltuonome.', 'A page with all your socials at socialbot.live/u/yourname.', 'Una página con todas tus redes en socialbot.live/u/tunombre.'] },
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

function capacita(L) {
  const c = (ico, t, d) => `<article class="vt-carta"><span class="vt-carta-ico">${_hIco(ico)}</span><h3>${t}</h3><p>${d}</p></article>`;
  return [
    c(ICO.chat, L('Scrive col tuo account', 'It writes with your account', 'Escribe con tu cuenta'),
      L('Niente bot anonimo: in chat compare il tuo nome, e il controllo resta tuo.', 'No anonymous bot: your name shows in chat, and control stays yours.', 'Nada de bot anónimo: en el chat aparece tu nombre y el control es tuyo.')),
    c(ICO.scudo, L('Scudo anti-bot', 'Anti-bot shield', 'Escudo anti-bot'),
      L('Ferma follow-bot e hate-raid prima che tocchino la tua community.', 'Stops follow-bots and hate-raids before they reach your community.', 'Detiene follow-bots y hate-raids antes de que lleguen a tu comunidad.')),
    c(ICO.moduli, L('Comandi e automazioni', 'Commands and automations', 'Comandos y automatizaciones'),
      L('Illimitati e già dal piano gratuito: parole, eventi, timer, variabili.', 'Unlimited, free plan included: words, events, timers, variables.', 'Ilimitados, ya en el plan gratis: palabras, eventos, temporizadores, variables.')),
    c(ICO.monitor, L('Overlay per la diretta', 'Overlay for your stream', 'Overlay para el directo'),
      L('Avvisi, chat a schermo, contatori e classifiche: un link e sei in scena.', 'Alerts, on-screen chat, counters and leaderboards: one link and you are on.', 'Avisos, chat en pantalla, contadores y clasificaciones: un enlace y estás en escena.')),
    c(ICO.scudo, L('Scudo anti-bot e anti-raid', 'Anti-bot and anti-raid shield', 'Escudo anti-bot y anti-raid'),
      L('Ferma le raffiche di follow-bot e para le hate-raid, da solo, mentre streammi.', 'Stops follow-bot bursts and blocks hate raids, on its own, while you stream.', 'Frena las oleadas de follow-bots y para las hate-raids, solo, mientras emites.')),
    c(ICO.musica, L('Musica, clip e giochi', 'Music, clips and games', 'Música, clips y juegos'),
      L('Richieste su Spotify, momenti migliori clippati da soli, minigiochi con monete.', 'Spotify requests, best moments clipped automatically, coin minigames.', 'Peticiones en Spotify, mejores momentos clipados solos, minijuegos con monedas.')),
  ].map((h, i) => h.replace('<article class="vt-carta"', `<article class="vt-carta" style="--i:${i}"`)).join('');
}

function corpo(L, l, kick, youtube) {

  const STEP = [
    ['1', L('Accedi con Twitch', 'Log in with Twitch', 'Entra con Twitch'), L('Un click, con lo stesso account con cui streammi.', 'One click, with the same account you stream with.', 'Un clic, con la misma cuenta con la que haces directo.')],
    ['2', L('Parti con l’Essenziale', 'Start with Essenziale', 'Empieza con Essenziale'), L('Gratis e senza carta: comandi illimitati, moderazione, overlay e contatori sono già tuoi.', 'Free, no card needed: unlimited commands, moderation, overlay and counters are already yours.', 'Gratis y sin tarjeta: comandos ilimitados, moderación, overlay y contadores ya son tuyos.')],
    ['3', L('Aggiungi solo ciò che vuoi', 'Add only what you want', 'Añade solo lo que quieras'), L('Se ti serve di più, scegli i pacchetti uno per uno. Niente di tutto-o-nulla.', 'If you need more, pick packages one by one. No all-or-nothing.', 'Si necesitas más, eliges los paquetes uno a uno. Nada de todo o nada.')],
  ];

  const FAQ = [
    [L('Con quale account scrive SocialBot in chat?', 'Which account does SocialBot write with in chat?', '¿Con qué cuenta escribe SocialBot en el chat?'), L('Con il <strong>tuo</strong>: SocialBot usa il tuo account Twitch, non un bot anonimo. In chat compare il tuo nome e sei sempre tu ad avere il controllo.', 'With <strong>yours</strong>: SocialBot uses your Twitch account, not an anonymous bot. Your name shows in chat and you’re always in control.', 'Con la <strong>tuya</strong>: SocialBot usa tu cuenta de Twitch, no un bot anónimo. En el chat aparece tu nombre y siempre tienes el control.')],
    [L('Che cosa sa fare?', 'What can it do?', '¿Qué sabe hacer?'), L('Comandi e automazioni su misura, moderazione della chat con scudo anti-bot (blocca follow-bot e hate-raid), shoutout e annunci ufficiali, ore guardate e classifica fedeltà, clip automatiche, minigiochi con monete, notifiche live su Telegram e avvisi dei nuovi post su TikTok, YouTube e Instagram. E lo piloti anche a voce.', 'Custom commands and automations, chat moderation with an anti-bot shield (blocks follow-bots and hate-raids), native shoutouts and announcements, watched hours and a loyalty leaderboard, automatic clips, coin minigames, live Telegram notifications and alerts for new posts on TikTok, YouTube and Instagram. And you can drive it by voice too.', 'Comandos y automatizaciones a medida, moderación del chat con escudo anti-bot (bloquea follow-bots y hate-raids), shoutouts y anuncios oficiales, horas vistas y clasificación de fidelidad, clips automáticos, minijuegos con monedas, notificaciones en directo por Telegram y avisos de nuevas publicaciones en TikTok, YouTube e Instagram. Y también lo controlas por voz.')],
    [L('SocialBot è in italiano?', 'Is SocialBot multilingual?', '¿SocialBot está en varios idiomas?'), L('Sì, ed è disponibile in italiano, inglese e spagnolo.', 'Yes: it’s available in Italian, English and Spanish.', 'Sí: está disponible en italiano, inglés y español.')],
    [L('Posso provarlo senza registrarmi?', 'Can I try it without signing up?', '¿Puedo probarlo sin registrarme?'), L('Sì, c’è una <a href="/?demo=1">demo interattiva</a> con dati d’esempio: la apri con un click, senza accesso.', 'Yes, there’s an <a href="/?demo=1">interactive demo</a> with sample data: open it with one click, no login.', 'Sí, hay una <a href="/?demo=1">demo interactiva</a> con datos de ejemplo: la abres con un clic, sin acceso.')],
    [L('Come si attiva sul mio canale?', 'How do I activate it on my channel?', '¿Cómo lo activo en mi canal?'), L('In due modi. Se sei già un membro abilitato della community di <a href="https://andryxify.it">andryxify.it</a>, SocialBot è gratis e completo: accedi con Twitch e attivi la dashboard. Altrimenti scegli un piano — con l’abbonamento entri subito, direttamente da qui.', 'Two ways. If you’re already an enabled member of the <a href="https://andryxify.it">andryxify.it</a> community, SocialBot is free and complete: log in with Twitch and activate the dashboard. Otherwise pick a plan — with a subscription you’re in right away, from here.', 'De dos formas. Si ya eres miembro habilitado de la comunidad de <a href="https://andryxify.it">andryxify.it</a>, SocialBot es gratis y completo: entra con Twitch y activas el panel. Si no, elige un plan — con la suscripción entras al instante, desde aquí.')],
  ];

  return `
    <section class="vt-scena">
      <header class="vt-barra">
        <a class="vt-marchio" href="/" aria-label="SocialBot"><img src="/icons/logo-barra.png?v=7" alt="SocialBot" width="80" height="30"></a>
        <nav class="vt-mappa" aria-label="${L('Il sito', 'The site', 'El sitio')}">
          <a href="/guide">${L('Guide', 'Guides', 'Guías')}</a>
          <a href="/manuale">${L('Manuali', 'Manuals', 'Manuales')}</a>
          <a href="/novita">${L('Novità', 'What’s new', 'Novedades')}</a>
          <a href="/?demo=1">${L('Demo', 'Demo', 'Demo')}</a>
        </nav>
        <div class="vt-strumenti">${selettoreLingua(l, L)}</div>
      </header>
      <span class="vt-occhiello"><i class="vivo"></i>${L('Per Twitch e Kick · di andryxify.it', 'For Twitch and Kick · by andryxify.it', 'Para Twitch y Kick · de andryxify.it')}</span>
      <h1 class="vt-titolo">${L('Il bot per Twitch che parla', 'The Twitch bot that speaks', 'El bot de Twitch que habla')} <em>${L('con la tua voce', 'with your own voice', 'con tu propia voz')}</em></h1>
      <p class="vt-sub">${L('Vive nella tua chat e scrive <strong>con il tuo account</strong> — niente bot anonimi. Comandi su misura, <strong>scudo anti-bot</strong>, overlay per la diretta, clip, musica e <strong>notifiche live</strong>.', 'It lives in your chat and writes <strong>with your own account</strong> — no anonymous bots. Custom commands, an <strong>anti-bot shield</strong>, stream overlay, clips, music and <strong>live alerts</strong>.', 'Vive en tu chat y escribe <strong>con tu cuenta</strong> — nada de bots anónimos. Comandos a medida, <strong>escudo anti-bot</strong>, overlay para el directo, clips, música y <strong>avisos en directo</strong>.')}</p>
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
    </section>

    <section class="vt-sez">
      <div class="vt-testa centro vt-rivela">
        <span class="vt-occhio">${L('Cosa sa fare', 'What it does', 'Qué sabe hacer')}</span>
        <h2 class="vt-tit">${L('Tutto quello che serve,', 'Everything you need,', 'Todo lo que hace falta,')} <em>${L('niente che non serva', 'nothing you don’t', 'nada que no')}</em></h2>
        <p class="vt-testo">${L('Un solo pannello per la chat, la moderazione, la scena e la community. Quello che non usi non lo paghi.', 'One panel for chat, moderation, your scene and your community. You don’t pay for what you don’t use.', 'Un solo panel para el chat, la moderación, la escena y la comunidad. Lo que no usas, no lo pagas.')}</p>
      </div>
      <div class="vt-griglia">${capacita(L)}</div>
    </section>

    <section class="vt-sez">
      <div class="vt-testa vt-rivela">
        <span class="vt-occhio">${L('Nel dettaglio', 'In detail', 'En detalle')}</span>
        <h2 class="vt-tit">${L('Ogni funzione, e', 'Every feature, and', 'Cada función, y')} <em>${L('in quale piano sta', 'which plan it’s in', 'en qué plan está')}</em></h2>
        <p class="vt-testo">${L('Niente sorprese: qui c’è tutto, con accanto scritto se è già tuo o se è un extra.', 'No surprises: it’s all here, marked as already yours or as an extra.', 'Sin sorpresas: está todo, con la marca de si ya es tuyo o si es un extra.')}</p>
      </div>
      ${capacitaHtml(L)}
    </section>

    <section class="vt-sez">
      <div class="vt-testa vt-rivela">
        <span class="vt-occhio">${L('Come si attiva', 'How to start', 'Cómo se activa')}</span>
        <h2 class="vt-tit">${L('Tre passi,', 'Three steps,', 'Tres pasos,')} <em>${L('due minuti', 'two minutes', 'dos minutos')}</em></h2>
      </div>
      <div class="vt-passi">
        ${STEP.map(([n, t, d], i) => `
          <div class="vt-passo" style="--i:${i}">
            <span class="vt-num">${n}</span>
            <strong>${t}</strong><p>${d}</p>
          </div>`).join('')}
      </div>
    </section>

    <section class="vt-sez" id="listino">
      <div class="vt-testa centro vt-rivela">
        <span class="vt-occhio">${L('Il listino', 'Pricing', 'Precios')}</span>
        <h2 class="vt-tit">${L('Parti gratis.', 'Start free.', 'Empieza gratis.')} <em>${L('Aggiungi quando vuoi.', 'Add whenever you like.', 'Añade cuando quieras.')}</em></h2>
        <p class="vt-testo">${L('Nessun tutto-o-nulla: scegli i pezzi uno per uno, e li puoi aggiungere o togliere anche dopo, dal pannello.', 'No all-or-nothing: pick the pieces one by one, and add or remove them later from the dashboard.', 'Nada de todo o nada: eliges las piezas una a una, y las añades o quitas después desde el panel.')}</p>
      </div>
      <div class="vetrina-piani" id="vetrina-piani"></div>
    </section>

    <section class="vt-sez">
      <div class="vt-testa vt-rivela">
        <span class="vt-occhio">${L('Domande', 'Questions', 'Preguntas')}</span>
        <h2 class="vt-tit">${L('Quello che', 'What people', 'Lo que')} <em>${L('chiedono di più', 'ask most', 'más preguntan')}</em></h2>
      </div>
      <div class="vt-faq vt-rivela">
        ${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
      </div>
    </section>

    <section class="vt-fine vt-rivela">
      <h2 class="vt-tit">${L('Pronto a farlo parlare?', 'Ready to give it a voice?', '¿Listo para darle voz?')}</h2>
      <p class="vt-testo">${L('Registrarsi è un click con Twitch. L’Essenziale è gratis per sempre, e gli extra li aggiungi quando ti servono davvero — non prima.', 'Signing up is one click with Twitch. Essenziale is free forever, and you add extras when you actually need them — not before.', 'Registrarse es un clic con Twitch. Essenziale es gratis para siempre, y añades extras cuando de verdad los necesitas — no antes.')}</p>
      <div class="vt-azioni">
        <a class="vt-btn vt-btn-primo" href="/entra?nuovo=1">${L('Registrati con Twitch', 'Sign up with Twitch', 'Regístrate con Twitch')}</a>
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
export function vetrinaHtml(lingua = 'it', { kick = false, youtube = false } = {}) {
  const l = LINGUE.includes(lingua) ? lingua : 'it';
  const L = (it, en, es) => (l === 'en' ? en : l === 'es' ? es : it);
  return corpo(L, l, kick, youtube);
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
