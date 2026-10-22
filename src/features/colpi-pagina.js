// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PAGINA DEI COLPI (docs/COLPI.md, «La pagina»): la diretta del canale, uno
// strato di mira grande come il quadro dell'overlay, il listino e i tre modi di
// pagare. Il server disegna il guscio vestito come la pagina link dello
// streamer; i dati vivi (listino, zone, stato della mira) li chiede la pagina
// (/pagina-colpo.js). Le parole sono nella lingua di chi la apre, fra le tre
// del sito, e arrivano alla pagina in un attributo: niente script in linea.
import { renderLinkPage, domini, conParent } from './linkpagina.js';

export const LINGUE = ['it', 'en', 'es'];
export const linguaDi = (acceptLanguage) => String(acceptLanguage || '').toLowerCase().split(',').map((x) => x.trim().slice(0, 2)).find((x) => LINGUE.includes(x)) || 'it';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Le parole. {nome}, {n}, {codice}, {premio}, {canale} si riempiono in pagina.
export const T = {
  it: {
    titolo: 'Colpisci la diretta di {canale}', dida: 'Scegli un effetto, mira un punto della diretta di {canale} e fallo comparire lì, col tuo nome.', didaSenzaNome: 'Scegli un effetto, mira un punto della diretta di {canale} e fallo comparire lì.',
    inOnda: 'In onda', spenta: 'Diretta spenta', senzaOverlay: 'Overlay chiuso',
    passo1: 'Scegli il colpo', passo2: 'Mira', passo3: 'Paga e parte',
    mira: 'Tocca il punto della diretta dove vuoi che compaia. Le zone a righe sono protette.',
    nome: 'Il tuo nome accanto al colpo', nomePh: 'come ti chiamano in chat',
    conferma: 'Prendi la mira', cambia: 'Cambia punto', annulla: 'Ricomincia',
    ritardo: 'La diretta che vedi arriva qualche secondo dopo: il colpo cade nel punto del quadro che hai scelto.',
    guarda: 'Guarda la diretta', guardaTesto: 'La diretta è su Twitch: caricandola, Twitch può usare cookie.',
    codice: 'Il tuo codice', scade: 'vale ancora {n}',
    euro: 'Paga {prezzo}', carta: 'Carta', satispay: 'Satispay',
    punti: 'Con i punti canale: su Twitch riscatta «{premio}» ({n} punti) e scrivi il codice {codice}.',
    bit: 'Con i Bit: in chat fai un Cheer di {n} Bit con il codice nel messaggio, per esempio «Cheer{n} {codice}». Il cheer si vede in chat: è Twitch.',
    apriChat: 'Apri la chat', puntiN: '{n} punti', bitN: '{n} Bit', ricomincia: 'Un altro colpo',
    chat: 'Chat', chatVuota: 'La chat è tranquilla: i messaggi nuovi compaiono qui.', chatScrivi: 'Scrivi in chat', chatInvia: 'Invia',
    chatFuori: 'La chat si legge da qui. Per scrivere, accedi con Twitch.', chatNonInviato: 'Twitch non ha mandato il messaggio: {motivo}',
    accedi: 'Accedi con Twitch', esci: 'Esci', sei: 'Sei {nome}',
    accediPerche: 'Twitch ti chiede un solo permesso: scrivere in chat a nome tuo. Con l\'accesso non serve il codice: paga il tuo cheer o il tuo riscatto.',
    puntiIo: 'Con i punti canale: su Twitch riscatta «{premio}» ({n} punti). Hai fatto l\'accesso: nel riscatto scrivi quello che vuoi, il colpo è tuo.',
    bitIo: 'Con i Bit: fai un Cheer di almeno {n} Bit nella chat di Twitch. Hai fatto l\'accesso: il tuo prossimo cheer da {n} Bit paga questo colpo, senza codice. Per pagarlo a pezzi, scrivi il codice {codice} in ogni cheer.',
    bitNonQui: 'I Bit e i punti si spendono solo su Twitch: è Twitch a non lasciarli usare da altri siti.',
    attesa: 'Aspetto il pagamento…', partito: 'Il colpo è comparso nella diretta: lo vedi fra qualche secondo.',
    pagata: 'Pagato: il colpo sta per comparire. Se entro 10 minuti non compare, gli euro e i punti ti tornano da soli.',
    rimborsata: 'Il colpo non è potuto comparire: il pagamento ti è stato restituito.',
    fermo: 'Adesso il colpo non può comparire: {motivo} Non pagare finché non torna possibile.',
    scaduta: 'Questa mira è scaduta: prendine una nuova.', versati: 'Arrivati {n} Bit: ne mancano {m}.',
    nessuno: 'Per ora {canale} non ha colpi da mandare.', pausa: 'I colpi sono in pausa: riprova fra poco.',
    motivi: {
      spento: 'I colpi sono spenti.', pausa: 'I colpi sono in pausa: riprova fra poco.', offline: 'La diretta è spenta: i colpi partono solo in onda.',
      overlay: 'L’overlay dello streamer è chiuso: il colpo non lo vedrebbe nessuno.', voce: 'Questo colpo non c’è più.', effetto: 'Questo colpo non si può mirare.',
      protetta: 'Quel punto è protetto: scegline un altro.', punto: 'Quel punto è fuori dalla diretta.', attesa: 'Hai appena mirato: riprova fra {n} s.',
      troppi: 'Troppi colpi in questo minuto: riprova fra poco.', codice: 'Qualcosa non ha funzionato: riprova.', rete: 'La connessione non risponde: riprova.',
      pagamento: 'Il pagamento non si apre in questo momento: riprova fra poco.', gia: 'Il pagamento di questa mira è già aperto.',
    },
    piede: 'I pagamenti vanno a {canale}.', privacy: 'Privacy',
  },
  en: {
    titolo: 'Hit {canale}\'s stream', dida: 'Pick an effect, aim at a spot on {canale}\'s stream and make it appear there, with your name.', didaSenzaNome: 'Pick an effect, aim at a spot on {canale}\'s stream and make it appear there.',
    inOnda: 'Live', spenta: 'Offline', senzaOverlay: 'Overlay closed',
    passo1: 'Pick your hit', passo2: 'Aim', passo3: 'Pay and fire',
    mira: 'Tap the spot on the stream where you want it to appear. Striped areas are protected.',
    nome: 'Your name next to the hit', nomePh: 'your name in chat',
    conferma: 'Lock the aim', cambia: 'Change spot', annulla: 'Start over',
    ritardo: 'The stream you see runs a few seconds behind: the hit lands on the spot of the frame you picked.',
    guarda: 'Watch the stream', guardaTesto: 'The stream is on Twitch: loading it lets Twitch use cookies.',
    codice: 'Your code', scade: 'valid for {n}',
    euro: 'Pay {prezzo}', carta: 'Card', satispay: 'Satispay',
    punti: 'With channel points: on Twitch redeem «{premio}» ({n} points) and type the code {codice}.',
    bit: 'With Bits: cheer {n} Bits in chat with the code in the message, for example «Cheer{n} {codice}». The cheer shows in chat: that\'s Twitch.',
    apriChat: 'Open chat', puntiN: '{n} points', bitN: '{n} Bits', ricomincia: 'Another hit',
    chat: 'Chat', chatVuota: 'Chat is quiet: new messages show up here.', chatScrivi: 'Write in chat', chatInvia: 'Send',
    chatFuori: 'You can read the chat here. To write, log in with Twitch.', chatNonInviato: 'Twitch did not send the message: {motivo}',
    accedi: 'Log in with Twitch', esci: 'Log out', sei: 'You are {nome}',
    accediPerche: 'Twitch asks you for one permission only: writing in chat as you. Once logged in no code is needed: your own cheer or redemption pays.',
    puntiIo: 'With channel points: on Twitch redeem «{premio}» ({n} points). You are logged in: write anything in the redemption, the hit is yours.',
    bitIo: 'With Bits: cheer at least {n} Bits in the Twitch chat. You are logged in: your next cheer of {n} Bits pays for this hit, no code needed. To pay it in parts, write the code {codice} in every cheer.',
    bitNonQui: 'Bits and points can only be spent on Twitch: Twitch does not let other sites use them.',
    attesa: 'Waiting for the payment…', partito: 'Your hit showed up on the stream: you\'ll see it in a few seconds.',
    pagata: 'Paid: the hit is about to show. If it doesn\'t within 10 minutes, euros and points go back to you by themselves.',
    rimborsata: 'The hit couldn\'t show: your payment has been returned.',
    fermo: 'The hit can\'t show right now: {motivo} Don\'t pay until it\'s possible again.',
    scaduta: 'This aim has expired: take a new one.', versati: '{n} Bits received: {m} to go.',
    nessuno: '{canale} has no hits to send for now.', pausa: 'Hits are paused: try again shortly.',
    motivi: {
      spento: 'Hits are off.', pausa: 'Hits are paused: try again shortly.', offline: 'The stream is offline: hits only fire while live.',
      overlay: 'The streamer\'s overlay is closed: nobody would see the hit.', voce: 'This hit is no longer available.', effetto: 'This hit can\'t be aimed.',
      protetta: 'That spot is protected: pick another one.', punto: 'That spot is outside the stream.', attesa: 'You just aimed: try again in {n} s.',
      troppi: 'Too many hits this minute: try again shortly.', codice: 'Something went wrong: try again.', rete: 'The connection isn\'t answering: try again.',
      pagamento: 'The payment won\'t open right now: try again shortly.', gia: 'The payment for this aim is already open.',
    },
    piede: 'Payments go to {canale}.', privacy: 'Privacy',
  },
  es: {
    titolo: 'Golpea el directo de {canale}', dida: 'Elige un efecto, apunta a un punto del directo de {canale} y haz que aparezca ahí, con tu nombre.', didaSenzaNome: 'Elige un efecto, apunta a un punto del directo de {canale} y haz que aparezca ahí.',
    inOnda: 'En directo', spenta: 'Directo apagado', senzaOverlay: 'Overlay cerrado',
    passo1: 'Elige el golpe', passo2: 'Apunta', passo3: 'Paga y sale',
    mira: 'Toca el punto del directo donde quieres que aparezca. Las zonas rayadas están protegidas.',
    nome: 'Tu nombre junto al golpe', nomePh: 'como te llaman en el chat',
    conferma: 'Fijar el punto', cambia: 'Cambiar punto', annulla: 'Empezar de nuevo',
    ritardo: 'El directo que ves llega unos segundos tarde: el golpe cae en el punto del cuadro que elegiste.',
    guarda: 'Ver el directo', guardaTesto: 'El directo está en Twitch: al cargarlo, Twitch puede usar cookies.',
    codice: 'Tu código', scade: 'vale {n} más',
    euro: 'Paga {prezzo}', carta: 'Tarjeta', satispay: 'Satispay',
    punti: 'Con puntos del canal: en Twitch canjea «{premio}» ({n} puntos) y escribe el código {codice}.',
    bit: 'Con Bits: en el chat haz un Cheer de {n} Bits con el código en el mensaje, por ejemplo «Cheer{n} {codice}». El cheer se ve en el chat: es Twitch.',
    apriChat: 'Abrir el chat', puntiN: '{n} puntos', bitN: '{n} Bits', ricomincia: 'Otro golpe',
    chat: 'Chat', chatVuota: 'El chat está tranquilo: los mensajes nuevos aparecen aquí.', chatScrivi: 'Escribe en el chat', chatInvia: 'Enviar',
    chatFuori: 'El chat se lee desde aquí. Para escribir, accede con Twitch.', chatNonInviato: 'Twitch no envió el mensaje: {motivo}',
    accedi: 'Accede con Twitch', esci: 'Salir', sei: 'Eres {nome}',
    accediPerche: 'Twitch te pide un solo permiso: escribir en el chat en tu nombre. Con el acceso no hace falta el código: paga tu cheer o tu canje.',
    puntiIo: 'Con puntos del canal: en Twitch canjea «{premio}» ({n} puntos). Has accedido: en el canje escribe lo que quieras, el golpe es tuyo.',
    bitIo: 'Con Bits: haz un Cheer de al menos {n} Bits en el chat de Twitch. Has accedido: tu próximo cheer de {n} Bits paga este golpe, sin código. Para pagarlo por partes, escribe el código {codice} en cada cheer.',
    bitNonQui: 'Los Bits y los puntos solo se gastan en Twitch: es Twitch quien no deja usarlos a otros sitios.',
    attesa: 'Esperando el pago…', partito: 'El golpe apareció en el directo: lo ves en unos segundos.',
    pagata: 'Pagado: el golpe está por aparecer. Si en 10 minutos no aparece, los euros y los puntos vuelven a ti solos.',
    rimborsata: 'El golpe no pudo aparecer: se te ha devuelto el pago.',
    fermo: 'Ahora el golpe no puede aparecer: {motivo} No pagues hasta que vuelva a ser posible.',
    scaduta: 'Este punto ha caducado: elige uno nuevo.', versati: 'Recibidos {n} Bits: faltan {m}.',
    nessuno: 'Por ahora {canale} no tiene golpes para mandar.', pausa: 'Los golpes están en pausa: vuelve a intentarlo pronto.',
    motivi: {
      spento: 'Los golpes están apagados.', pausa: 'Los golpes están en pausa: vuelve a intentarlo pronto.', offline: 'El directo está apagado: los golpes solo salen en directo.',
      overlay: 'El overlay del streamer está cerrado: nadie vería el golpe.', voce: 'Este golpe ya no está.', effetto: 'Este golpe no se puede apuntar.',
      protetta: 'Ese punto está protegido: elige otro.', punto: 'Ese punto está fuera del directo.', attesa: 'Acabas de apuntar: vuelve a intentarlo en {n} s.',
      troppi: 'Demasiados golpes este minuto: vuelve a intentarlo pronto.', codice: 'Algo ha fallado: vuelve a intentarlo.', rete: 'La conexión no responde: vuelve a intentarlo.',
      pagamento: 'El pago no se abre ahora: vuelve a intentarlo pronto.', gia: 'El pago de este punto ya está abierto.',
    },
    piede: 'Los pagos van a {canale}.', privacy: 'Privacidad',
  },
};

const riempi = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

// LA PAGINA, VESTITA COME LE ALTRE DELLO STREAMER. Passa da renderLinkPage con
// `fuori`, come la porta del gruppo Telegram: sfondo, caratteri, carte, bottoni,
// testa, piede e consenso ai contenuti di altri siti sono quelli della sua
// pagina link (aspettoDi), per costruzione. Qui ci sono solo i pezzi suoi: la
// diretta con lo strato di mira, la chat, il listino e i modi di pagare.
// `io` e' lo spettatore che ha fatto l'accesso con Twitch ({ login, nome }),
// `accesso` dice se l'accesso c'e' su questo server.
export function htmlPaginaColpo({ login, display, avatar = '', pagina, baseUrl, lingua = 'it', mira = '', privacy = '', io = null, accesso = false, testi = {} }) {
  const l = LINGUE.includes(lingua) ? lingua : 'it';
  const t = T[l];
  const nome = display || login;
  const player = conParent(`https://player.twitch.tv/?channel=${encodeURIComponent(login)}&muted=true&autoplay=true`, domini(baseUrl));
  const titolo = String(testi.titolo || '').trim() || riempi(t.titolo, { canale: nome });
  const dida = String(testi.dida || '').trim() || riempi(testi.conNome === false ? t.didaSenzaNome : t.dida, { canale: nome });
  const base = pagina || {};
  const p = { template: base.template, tema: base.tema, headline: titolo, tagline: dida, avatar: base.avatar,
    blocchi: [{ tipo: 'intestazione' }, { tipo: 'colpo' }] };
  const dati = (k, v) => `data-${k}="${esc(typeof v === 'string' ? v : JSON.stringify(v))}"`;
  const blocco = (b, { ritardo }) => {
    if (b.tipo !== 'colpo') return null;
    return `<section class="cp" id="cp" ${ritardo} ${dati('login', login)} ${dati('lingua', l)} ${dati('canale', nome)} ${dati('mira', mira)} ${dati('t', t)} ${dati('io', io || '')} ${dati('accesso', accesso ? '1' : '')}>
<div class="cp-scena">
<div class="cp-cima"><span class="cp-stato" id="cp-stato" role="status">${esc(t.spenta)}</span><p class="cp-ritardo">${esc(t.ritardo)}</p></div>
<div class="cp-palco" id="cp-palco">
<div class="chiedi"><p class="chiedi-t">Twitch</p><p class="chiedi-p">${esc(t.guardaTesto)}</p><button type="button" class="chiedi-b" data-src="${esc(player)}" data-t="Twitch">${esc(t.guarda)}</button></div>
<div class="cp-mira" id="cp-mira" tabindex="-1" aria-label="${esc(t.passo2)}"></div>
</div>
<section class="cp-carta cp-chat" aria-labelledby="cp-chat-t">
<h2 class="cp-t" id="cp-chat-t">${esc(t.chat)}</h2>
<ol class="cp-righe" id="cp-righe" aria-live="polite"><li class="cp-vuota">${esc(t.chatVuota)}</li></ol>
<form class="cp-scrivi" id="cp-scrivi" hidden><label class="solo-lettori" for="cp-testo">${esc(t.chatScrivi)}</label><input id="cp-testo" maxlength="500" autocomplete="off" placeholder="${esc(t.chatScrivi)}"><button type="submit" class="cp-b">${esc(t.chatInvia)}</button></form>
<p class="cp-nota" id="cp-chat-fuori">${esc(t.chatFuori)}</p>
</section>
</div>
<aside class="cp-lato">
<section class="cp-carta cp-io" id="cp-io"></section>
<section class="cp-carta cp-passo" id="cp-p1"><h2 class="cp-t"><span>1</span>${esc(t.passo1)}</h2><div class="cp-voci" id="cp-voci" role="group" aria-label="${esc(t.passo1)}"></div><p id="cp-vuoto" hidden></p></section>
<section class="cp-carta cp-passo spento" id="cp-p2"><h2 class="cp-t"><span>2</span>${esc(t.passo2)}</h2><p>${esc(t.mira)}</p>
<label class="cp-campo" id="cp-nome-l" hidden>${esc(t.nome)}<input id="cp-nome" maxlength="25" autocomplete="nickname" placeholder="${esc(t.nomePh)}"></label>
<div class="cp-righe-b"><button type="button" class="cp-b" id="cp-conferma" disabled>${esc(t.conferma)}</button></div>
</section>
<section class="cp-carta cp-passo spento" id="cp-p3"><h2 class="cp-t"><span>3</span>${esc(t.passo3)}</h2><div id="cp-paga"></div></section>
<p class="cp-avviso" id="cp-avviso" role="status" hidden></p>
<p class="cp-nota">${esc(t.bitNonQui)}</p>
</aside>
</section>`;
  };
  const css = ({ stileBtn, ombra }) => `
  .solo-lettori{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  .telo{max-width:min(76rem,100%)}
  .testa-b{display:flex;flex-direction:column;align-items:center;text-align:center;gap:.3rem;width:100%;margin-bottom:.6rem}
  .cp{--ko:#e5484d;--ok:#2fbf71;display:grid;grid-template-columns:minmax(0,1fr) 22rem;gap:1rem;width:100%;align-items:start;text-align:left}
  @media (max-width:900px){.cp{grid-template-columns:minmax(0,1fr)}.cp-chat{order:3}}
  .cp-scena{display:grid;gap:.8rem;min-width:0}
  .cp-carta{padding:1rem 1.1rem;border-radius:var(--r);${stileBtn};${ombra};color:var(--btxt)}
  .cp-t{display:flex;align-items:center;gap:.5rem;font-family:var(--fd);font-weight:var(--pm);font-size:1.1rem;letter-spacing:-.01em;margin:0 0 .6rem}
  .cp-t span{display:inline-grid;place-items:center;width:1.6rem;height:1.6rem;border-radius:50%;background:var(--acc);color:var(--suacc);font-size:.85rem;font-family:var(--ft)}
  .cp-palco{position:relative;aspect-ratio:16/9;background:#000;border-radius:calc(var(--r) * .8);overflow:hidden;${ombra}}
  .cp-palco iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  .cp-palco .chiedi{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:.5rem;padding:1rem;text-align:center;color:#eee;background:radial-gradient(circle at 50% 40%,#1b1b24,#000)}
  .cp-palco .chiedi-p{color:#bbb}
  .cp-mira{position:absolute;inset:0;pointer-events:none;touch-action:manipulation}
  .cp-mira.attiva{pointer-events:auto;cursor:crosshair}
  .cp-zona{position:absolute;border:1px dashed rgba(255,255,255,.7);background:repeating-linear-gradient(135deg,rgba(255,255,255,.18) 0 6px,rgba(0,0,0,.18) 6px 12px);opacity:0;transition:opacity .2s}
  .cp-mira.attiva .cp-zona{opacity:1}
  .cp-ombra{position:absolute;transform:translate(-50%,-50%);opacity:.8;pointer-events:none;max-width:none;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))}
  .cp-mirino{position:absolute;width:34px;height:34px;transform:translate(-50%,-50%);pointer-events:none;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 2px rgba(0,0,0,.55)}
  .cp-mirino::before,.cp-mirino::after{content:"";position:absolute;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.55)}
  .cp-mirino::before{left:50%;top:-10px;bottom:-10px;width:2px;transform:translateX(-50%)}
  .cp-mirino::after{top:50%;left:-10px;right:-10px;height:2px;transform:translateY(-50%)}
  .cp-mirino.no{border-color:var(--ko)}
  .cp-ritardo,.cp-nota{font-size:.85rem;color:var(--tenue)}
  .cp-cima{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .8rem}
  .cp-cima .cp-ritardo{margin:0;flex:1 1 14rem}
  .cp-stato{flex:none;display:inline-flex;align-items:center;gap:.4rem;padding:.25rem .7rem;border-radius:999px;${stileBtn};color:var(--btxt);font-size:.8rem;font-weight:600;white-space:nowrap}
  .cp-stato::before{content:"";width:.55rem;height:.55rem;border-radius:50%;background:currentColor;opacity:.45}
  .cp-stato.vivo::before{background:var(--ko);opacity:1;box-shadow:0 0 0 3px color-mix(in srgb,var(--ko) 30%,transparent)}
  .cp-lato{display:grid;gap:.8rem;min-width:0}
  .cp-passo.spento{opacity:.55}
  .cp-passo p{font-size:.92rem;margin:.1rem 0 .6rem}
  .cp-voci{display:grid;grid-template-columns:repeat(auto-fill,minmax(7.5rem,1fr));gap:.5rem}
  .cp-voce{display:grid;gap:.3rem;padding:.45rem;border-radius:calc(var(--r) * .7);border:var(--bw) solid currentColor;background:transparent;color:inherit;font:inherit;cursor:pointer;text-align:left}
  .cp-voce[aria-pressed="true"]{border-color:var(--acc);box-shadow:0 0 0 2px var(--acc)}
  .cp-anteprima{aspect-ratio:1;border-radius:calc(var(--r) * .5);background:rgba(127,127,127,.15);overflow:hidden;display:grid;place-items:center}
  .cp-anteprima img,.cp-anteprima video{width:100%;height:100%;object-fit:contain}
  .cp-voce b{font-size:.88rem;line-height:1.2;overflow-wrap:anywhere}
  .cp-prezzi{display:flex;flex-wrap:wrap;gap:.25rem}
  .cp-prezzi i{font-style:normal;font-size:.74rem;padding:.05rem .45rem;border-radius:999px;border:1px solid currentColor;font-variant-numeric:tabular-nums;white-space:nowrap;opacity:.85}
  .cp-campo{display:grid;gap:.25rem;margin:.3rem 0 .7rem;font-size:.88rem}
  .cp input{font:inherit;color:inherit;padding:.55rem .7rem;border-radius:calc(var(--r) * .6);border:1px solid currentColor;background:transparent;min-height:2.75rem;width:100%}
  .cp-righe-b{display:flex;flex-wrap:wrap;gap:.5rem}
  .cp-b{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-height:2.75rem;padding:.55rem 1.1rem;border-radius:calc(var(--r) * .8);border:0;background:var(--acc);color:var(--suacc);font:inherit;font-weight:var(--pf);cursor:pointer;text-decoration:none}
  .cp-b:focus-visible{filter:brightness(1.08)}
  @media (hover:hover){.cp-b:hover{filter:brightness(1.08)}}
  .cp-b[disabled]{opacity:.5;cursor:not-allowed;filter:none}
  .cp-b.due{background:transparent;color:inherit;border:1px solid currentColor}
  .cp-codice{display:flex;align-items:baseline;flex-wrap:wrap;gap:.6rem;margin:.1rem 0 .6rem}
  .cp-codice output{font:700 1.6rem/1.1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;user-select:all;-webkit-user-select:all}
  .cp-codice small{color:var(--tenue);font-variant-numeric:tabular-nums}
  .cp-modo{border-top:1px solid rgba(127,127,127,.35);padding-top:.6rem;margin-top:.6rem}
  .cp-avviso{padding:.6rem .8rem;border-radius:calc(var(--r) * .6);font-size:.92rem;background:rgba(127,127,127,.15)}
  .cp-avviso.ko{background:rgba(229,72,77,.18)}
  .cp-avviso.ok{background:rgba(47,191,113,.2)}
  .cp-chat{display:grid;gap:.5rem}
  .cp-righe{list-style:none;display:grid;gap:.2rem;max-height:16rem;overflow-y:auto;padding:0;margin:0;font-size:.92rem;overscroll-behavior:contain}
  .cp-righe li{overflow-wrap:anywhere;line-height:1.35}
  .cp-righe b{font-weight:700}
  .cp-righe img{height:1.6em;width:auto;vertical-align:middle;margin:0 .1em}
  .cp-vuota{color:var(--tenue)}
  .cp-scrivi{display:flex;gap:.5rem;align-items:stretch}
  .cp-scrivi input{flex:1;min-width:0}
  .cp-scrivi .cp-b{flex:none;white-space:nowrap}
  .cp-scrivi[hidden]{display:none}
  .cp-io{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem .8rem}
  .cp-io[hidden]{display:none}
  .cp-io p{font-size:.92rem;margin:0}
  .cp-io .cp-nota{flex-basis:100%;font-size:.85rem}
  [hidden]{display:none!important}
  @media (prefers-reduced-motion:reduce){.cp *{transition:none!important;animation:none!important}}`;
  const fuori = {
    lingua: l,
    url: `${baseUrl}/u/${login}/colpo`,
    privacy: privacy || `/u/${login}/privacy`,
    testi: { titolo: t.passo1, descrizione: dida, vuota: '', creata: riempi(t.piede, { canale: nome }), privacy: t.privacy },
    blocco,
    css,
    script: () => '<script src="/flusso.js" defer></script><script src="/pagina-colpo.js?v=3" defer></script>',
  };
  return renderLinkPage(p, { login, display: nome, avatar, baseUrl, fuori });
}
