// LE RIGHE DELLA PRIMA SCHERMATA.
//
// Nella schermata di benvenuto di Discord ogni canale in mostra ha una faccina
// e una riga: cosa si fa li'. Una riga vuota non dice niente a chi arriva, e
// Discord la vuole comunque (e' una stringa, non un campo facoltativo). Qui le
// righe si scrivono da sole, dal NOME del canale: e' l'unica cosa che dice a
// cosa serve, insieme al tipo e all'argomento.
//
// TRE REGOLE.
//
//  · VINCE LA PAROLA PIU' LUNGA. Un nome come «clip-e-schermate» contiene
//    «clip» e «schermate»: vince la parola che dice di piu', e a parita' quella
//    che viene dopo. Le parole della piattaforma («live», «stream», «twitch»)
//    sono DEBOLI: dicono di cosa si parla, non a cosa serve il canale, e contano
//    solo da sole («twitch-clip» e' un canale di clip, «live» da solo e'
//    l'avviso della diretta). Cosi' l'ordine della tabella non decide niente, e
//    aggiungere una voce non ne sposta un'altra.
//  · LA RIGA PARLA LA LINGUA DEL NOME. «rules» e' inglese e prende una riga in
//    inglese, «reglas» in spagnolo, «regole» in italiano, qualunque sia la
//    lingua del pannello. Le parole che valgono in piu' lingue («meme», «live»,
//    «musica») stanno fra le NEUTRE e prendono la lingua di chi scrive.
//  · SE NON SI SA, NON SI INVENTA. Un nome che non dice niente passa al tipo del
//    canale (un canale annunci e' un canale annunci), poi al suo argomento se
//    sta nella riga, e poi a nessuno: la riga la scrive chi il canale lo conosce.
//
// Le righe stanno sotto i 42 caratteri: e' meno di quanto Discord tiene, e sta
// su una riga sola anche sul telefono.

const LINGUE = ['it', 'en', 'es'];
export const MAX_RIGA = 50;

// Una voce: la faccina, la riga nelle tre lingue, e le parole che la chiamano,
// divise per la lingua in cui sono scritte. Una parola vale dall'inizio di un
// pezzo del nome («regol» prende «regole» e «regolamento», non «sregolati»).
const V = (faccina, it, en, es, parole) => ({ faccina, testo: { it, en, es }, parole });

export const RIGHE = Object.freeze([
  V('\u{1F534}', 'L’avviso quando vado in diretta.', 'Get the ping when I go live.', 'El aviso cuando empiezo en directo.',
    { it: ['sono-in-onda', 'in-onda', 'dirett', 'notific'], en: ['going-live', 'go-live', 'notification'], es: ['directo', 'en-directo', 'avisos-directo'], deboli: ['live', 'stream', 'twitch'] }),
  V('\u{1F4DC}', 'Da leggere prima di scrivere.', 'Read these before you post.', 'Léelas antes de escribir.',
    { it: ['regol', 'norme'], en: ['rule', 'guideline'], es: ['regla', 'normas'] }),
  V('\u{1F4E3}', 'Le novità importanti, e basta.', 'The important news, nothing else.', 'Las novedades importantes, nada más.',
    { it: ['annunc', 'avvis', 'novita', 'bacheca', 'comunicazion', 'aggiornament'], en: ['announce', 'news', 'update'], es: ['anunci', 'noticia', 'novedad', 'aviso'] }),
  V('\u{1F44B}', 'Due righe su di te, per conoscerci.', 'A couple of lines about you.', 'Dos líneas sobre ti, para conocernos.',
    { it: ['presentati', 'presentazion', 'introduzion', 'chi-sei', 'chi-sono', 'conosciamoci'], en: ['intro', 'introduc', 'about-you', 'say-hi', 'hello'], es: ['presentacion', 'presentate', 'conoceros'] }),
  V('\u{1F6AA}', 'Dove si saluta chi arriva.', 'Where newcomers get a hello.', 'Donde se saluda a quien llega.',
    { it: ['benvenut'], en: ['welcome'], es: ['bienvenid'] }),
  V('\u{1F4F8}', 'Clip e schermate delle vostre partite.', 'Clips and screenshots from your games.', 'Clips y capturas de vuestras partidas.',
    { it: ['schermat'], en: ['screenshot', 'screen'], es: ['captura'] }),
  V('\u{1F3AC}', 'I momenti delle dirette da rivedere.', 'Stream moments worth rewatching.', 'Momentos del directo para volver a ver.',
    { it: ['momenti'], en: ['highlight'], es: ['momentos'], neutre: ['clip'] }),
  V('\u{1F64B}', 'Giochi, canzoni, sfide: chiedi pure.', 'Games, songs, challenges: just ask.', 'Juegos, canciones, retos: pide sin miedo.',
    { it: ['richiest'], en: ['request'], es: ['peticion', 'pedido'] }),
  V('\u{1F3AE}', 'Trova con chi giocare.', 'Find people to play with.', 'Encuentra con quién jugar.',
    { it: ['cerchiamo', 'cerco', 'squadr', 'compagn'], en: ['lfg', 'looking-for', 'squad', 'team'], es: ['busc', 'equipo'] }),
  V('\u{1F602}', 'Qui si ride.', 'For the laughs.', 'Aquí se viene a reír.',
    { neutre: ['meme', 'shitpost'] }),
  V('\u{1F3A8}', 'I vostri disegni e le vostre creazioni.', 'Your drawings and creations.', 'Vuestros dibujos y creaciones.',
    { it: ['disegn', 'creazion'], en: ['art', 'creation', 'drawing'], es: ['dibujo', 'creacion'], neutre: ['fanart', 'fan-art', 'arte', 'artist'] }),
  V('\u{1F5BC}\u{FE0F}', 'Foto e immagini da condividere.', 'Photos and pictures to share.', 'Fotos e imágenes para compartir.',
    { it: ['immagin', 'foto'], en: ['image', 'pic', 'photo'], es: ['imagen', 'fotos'], neutre: ['media', 'selfie'] }),
  V('\u{1F3B5}', 'Cosa stai ascoltando? Faccelo sentire.', 'What are you listening to? Share it.', '¿Qué escuchas? Compártelo.',
    { it: ['canzon'], en: ['music', 'song'], es: ['cancion'], neutre: ['musica', 'playlist'] }),
  V('\u{1F9ED}', 'Trucchi e consigli da condividere.', 'Tips and tricks to share.', 'Trucos y consejos para compartir.',
    { it: ['consigl', 'trucch', 'guida'], en: ['tip', 'trick', 'guide'], es: ['consejo', 'truco', 'guia'] }),
  V('\u{1F4A1}', 'Le vostre idee per il canale.', 'Your ideas for the channel.', 'Vuestras ideas para el canal.',
    { it: ['suggeriment', 'idee', 'propost'], en: ['suggestion', 'feedback'], es: ['sugerencia', 'propuesta'], neutre: ['idea'] }),
  V('\u2753', 'Hai un dubbio? Chiedi qui.', 'Got a question? Ask here.', '¿Tienes una duda? Pregunta aquí.',
    { it: ['domand', 'aiut', 'dubbi', 'supporto'], en: ['help', 'support', 'question', 'ask'], es: ['pregunta', 'ayuda', 'soporte', 'duda'], neutre: ['faq'] }),
  V('\u{1F6A9}', 'Se qualcosa non va, si scrive qui.', 'If something is wrong, say it here.', 'Si algo va mal, se escribe aquí.',
    { it: ['segnal'], en: ['report', 'abuse'], es: ['reporte', 'denuncia'] }),
  V('\u{1F4C5}', 'Eventi e serate della community.', 'Community events and nights.', 'Eventos y quedadas de la comunidad.',
    { it: ['torne', 'serat'], en: ['tournament', 'calendar'], es: ['evento', 'torneo', 'quedada'], neutre: ['event', 'calendari'] }),
  V('\u{1F3F7}\u{FE0F}', 'Scegli i tuoi ruoli.', 'Pick your roles.', 'Elige tus roles.',
    { it: ['ruol'], en: ['role'], es: ['rol'] }),
  V('\u{1F916}', 'Qui si usano i comandi del bot.', 'Where bot commands go.', 'Aquí van los comandos del bot.',
    { it: ['comand'], en: ['command'], es: ['comando'], neutre: ['bot'] }),
  V('\u{1F517}', 'Dove trovarmi fuori da qui.', 'Where to find me elsewhere.', 'Dónde encontrarme fuera de aquí.',
    { it: ['dove-trovarmi'], en: ['find-me'], es: ['redes'], neutre: ['link', 'social'] }),
  V('\u{1F3AD}', 'Qui si gioca di ruolo.', 'Roleplay lives here.', 'Aquí se juega a rol.',
    { it: ['gdr', 'gioco-di-ruolo', 'giochi-di-ruolo'], en: ['roleplay', 'rp'], es: ['juego-de-rol', 'juegos-de-rol'] }),
  V('\u{1F3AE}', 'Si parla di giochi.', 'All about games.', 'Se habla de juegos.',
    { it: ['gioc', 'videogioc'], en: ['game', 'gaming'], es: ['juego', 'videojuego'] }),
  V('\u{1F5A5}\u{FE0F}', 'Setup, PC e tutto quello che ci gira.', 'Setups, PCs and gear.', 'Setups, PCs y equipo.',
    { neutre: ['setup', 'pc', 'hardware', 'tech', 'tecnolog'] }),
  V('\u{1F365}', 'Anime e manga.', 'Anime and manga.', 'Anime y manga.',
    { neutre: ['anime', 'manga'] }),
  V('\u{1F37F}', 'Film e serie da consigliare.', 'Films and shows worth a watch.', 'Pelis y series para recomendar.',
    { en: ['movie', 'tv'], es: ['pelicula', 'peli'], neutre: ['film', 'serie', 'cinema'] }),
  V('\u{1F43E}', 'Le foto dei vostri animali.', 'Photos of your pets.', 'Fotos de vuestras mascotas.',
    { it: ['gatt'], en: ['pet'], es: ['mascota'], neutre: ['animal'] }),
  V('\u{1F35D}', 'Cosa si mangia, e come si cucina.', 'Food and recipes.', 'Comida y recetas.',
    { it: ['cucin', 'cibo', 'ricett'], en: ['food', 'recipe', 'cooking'], es: ['comida', 'receta', 'cocina'] }),
  V('\u26BD', 'Si parla di sport.', 'All about sport.', 'Se habla de deporte.',
    { it: ['calcio'], en: ['football', 'soccer'], es: ['futbol', 'deporte'], neutre: ['sport'] }),
  V('\u{1F3B2}', 'Tutto quello che non c’entra niente.', 'Everything that fits nowhere else.', 'Todo lo que no encaja en otro sitio.',
    { it: ['fuori-tema', 'cazzeggio', 'varie'], en: ['off-topic', 'offtopic'], es: ['otros-temas'], neutre: ['random'] }),
  V('\u{1F4AC}', 'Due chiacchiere con tutti.', 'Chat with everyone.', 'Charla con todos.',
    { it: ['generale', 'chiacchier', 'piazza', 'salotto'], en: ['lounge', 'hangout'], es: ['charla'], neutre: ['general', 'chat'] }),
]);

// Quando il nome non dice niente, il tipo del canale dice gia' qualcosa.
const PER_TIPO = {
  annunci: RIGHE[2],
  media: RIGHE[11],
  forum: V('\u{1F5C2}\u{FE0F}', 'Le discussioni, un argomento alla volta.', 'Discussions, one topic at a time.', 'Los debates, un tema cada vez.', {}),
};

// Il nome come lo scrive chi non usa i trattini: minuscolo, senza accenti, e
// ogni cosa che non e' lettera o cifra diventa un trattino. «📢│Annunci» e
// «annunci» sono lo stesso canale.
export const pulisci = (nome) => String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// La parola del nome che dice di piu': la piu' lunga, e a parita' la piu' in
// fondo; una parola debole pesa meno di tutte. Torna la voce e la lingua in cui
// e' scritta la parola ('' se vale in piu' lingue).
function parolaCheConta(nome) {
  const n = pulisci(nome);
  if (!n) return null;
  let meglio = null;
  for (const voce of RIGHE) {
    for (const lingua of [...LINGUE, 'neutre', 'deboli']) {
      for (const p of voce.parole[lingua] || []) {
        const peso = lingua === 'deboli' ? 1 : p.length;
        for (let da = n.indexOf(p); da >= 0; da = n.indexOf(p, da + 1)) {
          if (da > 0 && n[da - 1] !== '-') continue;
          if (!meglio || peso > meglio.peso || (peso === meglio.peso && da > meglio.da)) {
            meglio = { voce, lingua: LINGUE.includes(lingua) ? lingua : '', peso, da };
          }
        }
      }
    }
  }
  return meglio;
}

// La prima frase dell'argomento, se sta nella riga. L'argomento lo ha scritto
// chi il canale lo conosce: se e' corto, e' la riga migliore che ci sia.
function dallArgomento(argomento) {
  const a = String(argomento || '').replace(/\s+/g, ' ').trim();
  if (!a) return '';
  const prima = (a.match(/^.*?[.!?](?=\s|$)/) || [a])[0].trim();
  if (prima.length <= MAX_RIGA) return prima;
  return a.length <= MAX_RIGA ? a : '';
}

// La riga di un canale: { testo, emoji, lingua } o null se non si sa.
// `lingua` e' quella di chi scrive, e vale per le parole neutre e per i tipi.
export function rigaPer(canale, lingua = 'it') {
  const lg = LINGUE.includes(lingua) ? lingua : 'it';
  const c = typeof canale === 'string' ? { nome: canale } : (canale || {});
  const trovata = parolaCheConta(c.nome);
  if (trovata) {
    const l = trovata.lingua || lg;
    return { testo: trovata.voce.testo[l], emoji: trovata.voce.faccina, lingua: l };
  }
  const perTipo = PER_TIPO[String(c.tipo || '')];
  if (perTipo) return { testo: perTipo.testo[lg], emoji: perTipo.faccina, lingua: lg };
  const arg = dallArgomento(c.argomento);
  if (arg) return { testo: arg, emoji: '', lingua: '' };
  return null;
}
