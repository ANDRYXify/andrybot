// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PAGINA DEI COLPI (docs/COLPI.md, «La pagina»): la diretta del canale, uno
// strato di mira grande come il quadro dell'overlay, il listino e i tre modi di
// pagare. Il server disegna il guscio vestito come la pagina link dello
// streamer; i dati vivi (listino, zone, stato della mira) li chiede la pagina
// (/pagina-colpo.js). Le parole sono nella lingua di chi la apre, fra le tre
// del sito, e arrivano alla pagina in un attributo: niente script in linea.
import { vesteDi, domini, conParent } from './linkpagina.js';

export const LINGUE = ['it', 'en', 'es'];
export const linguaDi = (acceptLanguage) => String(acceptLanguage || '').toLowerCase().split(',').map((x) => x.trim().slice(0, 2)).find((x) => LINGUE.includes(x)) || 'it';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Le parole. {nome}, {n}, {codice}, {premio}, {canale} si riempiono in pagina.
export const T = {
  it: {
    titolo: 'Colpisci la diretta di {canale}', dida: 'Scegli un effetto, mira un punto della diretta di {canale} e fallo comparire lì, col tuo nome.',
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
    titolo: 'Hit {canale}\'s stream', dida: 'Pick an effect, aim at a spot on {canale}\'s stream and make it appear there, with your name.',
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
    titolo: 'Golpea el directo de {canale}', dida: 'Elige un efecto, apunta a un punto del directo de {canale} y haz que aparezca ahí, con tu nombre.',
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

// Il guscio. `mira` e' l'id della mira da riprendere (il ritorno da un pagamento).
export function htmlPaginaColpo({ login, display, avatar = '', pagina, baseUrl, lingua = 'it', mira = '', privacy = '' }) {
  const l = LINGUE.includes(lingua) ? lingua : 'it';
  const t = T[l];
  const { c, font, faccia, suAcc, scuro } = vesteDi(pagina);
  const nome = display || login;
  const player = conParent(`https://player.twitch.tv/?channel=${encodeURIComponent(login)}&muted=true&autoplay=true`, domini(baseUrl));
  const titolo = riempi(t.titolo, { canale: nome });
  const url = `${baseUrl}/u/${login}/colpo`;
  return `<!DOCTYPE html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(riempi(t.dida, { canale: nome }))}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(url)}">
<meta name="color-scheme" content="${scuro ? 'dark' : 'light'}">
<style>${faccia}
:root{--bg:${c.bg};--card:${c.card};--testo:${c.testo};--tenue:${c.tenue};--bordo:${c.bordo};--acc:${c.acc};--suacc:${suAcc};--font:${font.t};--font-d:${font.d};
  --ok:#2fbf71;--ko:#e5484d}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100dvh;background:var(--bg);color:var(--testo);font:16px/1.5 var(--font)}
a{color:var(--acc)}
button,input{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.cp-testa{display:flex;align-items:center;gap:.8rem;max-width:76rem;margin:0 auto;padding:1rem 1rem .6rem}
.cp-testa img{width:44px;height:44px;border-radius:50%;object-fit:cover;flex:none;border:1px solid var(--bordo)}
.cp-testa h1,.cp-passo h2{font-family:var(--font-d)}
.cp-testa h1{margin:0;font-size:clamp(1.1rem,2.4vw,1.5rem);line-height:1.2;text-wrap:balance}
.cp-testa p{margin:.1rem 0 0;color:var(--tenue);font-size:.88rem}
.cp-stato{margin-left:auto;flex:none;display:inline-flex;align-items:center;gap:.4rem;padding:.25rem .7rem;border-radius:999px;border:1px solid var(--bordo);font-size:.8rem;font-weight:600;white-space:nowrap}
.cp-stato::before{content:"";width:.55rem;height:.55rem;border-radius:50%;background:var(--tenue)}
.cp-stato.vivo::before{background:var(--ko);box-shadow:0 0 0 3px color-mix(in srgb,var(--ko) 30%,transparent)}
.cp{display:grid;grid-template-columns:minmax(0,1fr) 22rem;gap:1rem;max-width:76rem;margin:0 auto;padding:0 1rem 1.5rem;align-items:start}
@media (max-width:900px){.cp{grid-template-columns:minmax(0,1fr)}}
.cp-palco{position:relative;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;border:1px solid var(--bordo)}
.cp-palco iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.cp-chiedi{position:absolute;inset:0;display:grid;place-content:center;gap:.6rem;padding:1rem;text-align:center;color:#eee;background:radial-gradient(circle at 50% 40%,#1b1b24,#000)}
.cp-chiedi p{margin:0;font-size:.88rem;max-width:26rem;color:#bbb}
.cp-b{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;padding:.6rem 1.1rem;border-radius:10px;border:1px solid transparent;background:var(--acc);color:var(--suacc);font-weight:600;cursor:pointer;text-decoration:none}
.cp-b[disabled]{opacity:.5;cursor:not-allowed}
.cp-b.due{background:transparent;color:var(--testo);border-color:var(--bordo)}
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
.cp-ritardo{margin:.5rem 0 0;font-size:.82rem;color:var(--tenue)}
.cp-lato{display:grid;gap:.8rem}
.cp-passo{background:var(--card);border:1px solid var(--bordo);border-radius:12px;padding:.9rem}
.cp-passo h2{display:flex;align-items:center;gap:.5rem;margin:0 0 .6rem;font-size:.95rem}
.cp-passo h2 span{display:inline-grid;place-items:center;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--acc);color:var(--suacc);font-size:.8rem}
.cp-passo.spento{opacity:.55}
.cp-passo p{margin:.2rem 0 .6rem;font-size:.88rem;color:var(--tenue)}
.cp-voci{display:grid;grid-template-columns:repeat(auto-fill,minmax(7.5rem,1fr));gap:.5rem}
.cp-voce{display:grid;gap:.3rem;padding:.4rem;border-radius:10px;border:1px solid var(--bordo);background:transparent;cursor:pointer;text-align:left}
.cp-voce[aria-pressed="true"]{border-color:var(--acc);box-shadow:0 0 0 2px var(--acc)}
.cp-voce .cp-anteprima{aspect-ratio:1;border-radius:6px;background:#0002 center/contain no-repeat;overflow:hidden;display:grid;place-items:center}
.cp-voce .cp-anteprima img,.cp-voce .cp-anteprima video{width:100%;height:100%;object-fit:contain}
.cp-voce b{font-size:.85rem;line-height:1.2;overflow-wrap:anywhere}
.cp-prezzi{display:flex;flex-wrap:wrap;gap:.25rem}
.cp-prezzi i{font-style:normal;font-size:.72rem;padding:.05rem .4rem;border-radius:999px;border:1px solid var(--bordo);font-variant-numeric:tabular-nums;white-space:nowrap}
.cp-campo{display:grid;gap:.25rem;margin:.4rem 0 .7rem;font-size:.85rem}
.cp-campo input{padding:.5rem .6rem;border-radius:8px;border:1px solid var(--bordo);background:transparent}
.cp-righe{display:flex;flex-wrap:wrap;gap:.5rem}
.cp-codice{display:flex;align-items:baseline;gap:.6rem;margin:.2rem 0 .6rem}
.cp-codice output{font:700 1.6rem/1.1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;user-select:all;-webkit-user-select:all}
.cp-codice small{color:var(--tenue);font-variant-numeric:tabular-nums}
.cp-modo{border-top:1px solid var(--bordo);padding-top:.6rem;margin-top:.6rem}
.cp-modo p{color:var(--testo)}
.cp-avviso{margin:.4rem 0 0;padding:.5rem .7rem;border-radius:8px;font-size:.88rem;background:color-mix(in srgb,var(--acc) 12%,transparent)}
.cp-avviso.ko{background:color-mix(in srgb,var(--ko) 16%,transparent)}
.cp-avviso.ok{background:color-mix(in srgb,var(--ok) 18%,transparent)}
.cp-piede{max-width:76rem;margin:0 auto;padding:0 1rem 2rem;font-size:.8rem;color:var(--tenue)}
[hidden]{display:none!important}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>
</head>
<body data-login="${esc(login)}" data-lingua="${l}" data-mira="${esc(mira)}" data-player="${esc(player)}" data-t="${esc(JSON.stringify(t))}" data-canale="${esc(nome)}">
<header class="cp-testa">
${avatar ? `<img src="${esc(avatar)}" alt="" width="44" height="44">` : ''}
<div><h1>${esc(titolo)}</h1><p>${esc(riempi(t.dida, { canale: nome }))}</p></div>
<span class="cp-stato" id="cp-stato" role="status">${esc(t.spenta)}</span>
</header>
<main class="cp">
<section>
<div class="cp-palco" id="cp-palco">
<div class="cp-chiedi" id="cp-chiedi"><p>${esc(t.guardaTesto)}</p><div><button type="button" class="cp-b" id="cp-guarda">${esc(t.guarda)}</button></div></div>
<div class="cp-mira" id="cp-mira" tabindex="-1" aria-label="${esc(t.passo2)}"></div>
</div>
<p class="cp-ritardo">${esc(t.ritardo)}</p>
</section>
<aside class="cp-lato">
<section class="cp-passo" id="cp-p1"><h2><span>1</span>${esc(t.passo1)}</h2><div class="cp-voci" id="cp-voci" role="group" aria-label="${esc(t.passo1)}"></div><p id="cp-vuoto" hidden></p></section>
<section class="cp-passo spento" id="cp-p2"><h2><span>2</span>${esc(t.passo2)}</h2><p>${esc(t.mira)}</p>
<label class="cp-campo" id="cp-nome-l" hidden>${esc(t.nome)}<input id="cp-nome" maxlength="25" autocomplete="nickname" placeholder="${esc(t.nomePh)}"></label>
<div class="cp-righe"><button type="button" class="cp-b" id="cp-conferma" disabled>${esc(t.conferma)}</button></div>
</section>
<section class="cp-passo spento" id="cp-p3"><h2><span>3</span>${esc(t.passo3)}</h2><div id="cp-paga"></div></section>
<p class="cp-avviso" id="cp-avviso" role="status" hidden></p>
</aside>
</main>
<footer class="cp-piede">${esc(riempi(t.piede, { canale: nome }))}${privacy ? ` · <a href="${esc(privacy)}">${esc(t.privacy)}</a>` : ''}</footer>
<script src="/pagina-colpo.js?v=1" defer></script>
</body>
</html>`;
}
