// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PAGINA DEL WALK-ON, won/<canale> (docs/WALKON.md, «La pagina»). Vestita
// come la pagina link dello streamer (renderLinkPage con `fuori`, come i Pew):
// qui c'e' il guscio con le parole nella lingua di chi la apre; i dati vivi
// (le regole, il proprio walk-on, gli effetti) li chiede la pagina
// (/pagina-walkon.js). Le parole arrivano in un attributo: niente script in linea.
import { renderLinkPage } from './linkpagina.js';
import { testoDi, LINGUE } from './walkon.js';

export const linguaDi = (acceptLanguage) => String(acceptLanguage || '').toLowerCase().split(',').map((x) => x.trim().slice(0, 2)).find((x) => LINGUE.includes(x)) || 'it';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const T = {
  it: {
    accedi: 'Entra con Twitch', accediKick: 'Entra con Kick', esci: 'Esci', sei: 'Sei {nome}', accediPerche: 'Serve solo a sapere chi sei: non chiediamo di fare niente a tuo nome.',
    regole: 'Cosa vale qui', chi: 'Chi può', sub: 'sub su Twitch', subLivello: 'sub su Twitch dal livello {n}', subKick: 'sub su Kick', vip: 'VIP', mod: 'moderatori', aMano: 'chi sceglie lo streamer',
    cosa: 'Cosa puoi scegliere', unEffetto: 'un effetto del canale', unFile: '{tipi} tuo, fino a {mb} MB', fileDurata: 'video e audio fino a {s} secondi', unTesto: 'una riga di testo sotto, fino a {n} caratteri',
    tipi: { immagine: 'un\'immagine', video: 'un video', audio: 'un audio' }, o: ' o ',
    quandoMsg: 'Parte la prima volta che scrivi in chat in una diretta, una volta per diretta.', quandoCmd: 'Parte quando scrivi {comando} in chat, una volta per diretta.',
    approvazione: 'Prima di andare in onda lo guarda un moderatore.', senzaApprovazione: 'Un effetto del canale parte senza aspettare: l\'ha già scelto lo streamer.',
    mio: 'Il tuo walk-on', nessuno: 'Non hai ancora un walk-on qui.',
    stati: { attesa: 'In attesa', approvato: 'Approvato', rifiutato: 'Rifiutato', sospeso: 'Sospeso' },
    spiega: { attesa: 'Un moderatore lo guarda prima che vada in onda.', approvato: 'Partirà in diretta come scritto sopra.', rifiutato: 'Non andrà in onda. Puoi farne un altro.', sospeso: 'Adesso non hai i requisiti: se torni sub, torna com\'era.' },
    daVerificare: 'Non abbiamo potuto controllare adesso se sei sub: lo controlliamo quando scrivi in chat.',
    motivo: 'Perché: {motivo}', effetto: 'Effetto: {nome}', togli: 'Cancella il mio walk-on', togliChiedi: 'Cancello il tuo walk-on? Il file se ne va con lui.', tolto: 'Cancellato.',
    nuovo: 'Fai il tuo walk-on', cambia: 'Cambialo', cambiaNota: 'Se lo cambi torna in attesa: si approva quello che si vede.',
    sceltaEffetto: 'Un effetto del canale', sceltaFile: 'Un file tuo', file: 'Il file', fileNota: 'Il tipo lo leggiamo dal file stesso, non dal nome.', fileVa: 'Va bene {tipi}, fino a {mb} MB.',
    testo: 'La riga sotto (facoltativa)', testoPh: 'Per esempio: è arrivato {nome}!', testoNota: '{nome} diventa il tuo nome.',
    mail: 'La tua mail per sapere l\'esito (facoltativa)', mailNota: 'La usiamo una volta sola, per dirti com\'è andata, e poi la cancelliamo. Lo streamer e i moderatori non la vedono mai.', mailC: 'Ci hai lasciato una mail: ti scriviamo l\'esito.', mailTogli: 'Togli la mail', mailTolta: 'Mail tolta.',
    salva: 'Manda', invio: 'Lo mando…', salvato: 'Mandato: ora lo guarda un moderatore.', salvatoSubito: 'Fatto: è approvato.',
    nonPuoi: 'Qui il walk-on è per {chi}, e adesso non risulti fra loro.', serveAccesso: 'Entra per fare il tuo walk-on.', niente: 'Lo streamer non ha ancora aperto niente da scegliere.',
    errori: {
      tipo: 'Questo file non lo riconosco: servono immagini, video o audio.', 'tipo-no': 'Questo tipo di file qui non si può usare.', illeggibile: 'Questo file non si legge: prova con un altro.',
      lungo: 'È troppo lungo: al massimo {s} secondi.', peso: 'Pesa troppo: al massimo {mb} MB.', requisiti: 'Adesso non hai i requisiti per il walk-on qui.', accesso: 'Entra di nuovo, per favore.',
      troppi: 'Troppe richieste: riprova fra un minuto.', effetto: 'Quell\'effetto non si può scegliere.', vuoto: 'Scegli un effetto o un file.', spazio: 'Adesso qui non si possono caricare file: riprova più tardi.',
      occupato: 'Il server è occupato: riprova fra poco.', mail: 'Questa mail non sembra giusta.', errore: 'Qualcosa non ha funzionato: riprova.', testo: 'La riga è troppo lunga.',
    },
    privacy: 'Privacy', piede: 'Il walk-on di {canale}.',
  },
  en: {
    accedi: 'Sign in with Twitch', accediKick: 'Sign in with Kick', esci: 'Sign out', sei: 'You are {nome}', accediPerche: 'It only tells us who you are: we never ask to act on your behalf.',
    regole: 'What applies here', chi: 'Who can', sub: 'Twitch subs', subLivello: 'Twitch subs from tier {n}', subKick: 'Kick subs', vip: 'VIPs', mod: 'moderators', aMano: 'people the streamer picks',
    cosa: 'What you can choose', unEffetto: 'one of the channel\'s effects', unFile: '{tipi} of yours, up to {mb} MB', fileDurata: 'video and audio up to {s} seconds', unTesto: 'a line of text below, up to {n} characters',
    tipi: { immagine: 'an image', video: 'a video', audio: 'a sound' }, o: ' or ',
    quandoMsg: 'It plays the first time you write in chat during a stream, once per stream.', quandoCmd: 'It plays when you type {comando} in chat, once per stream.',
    approvazione: 'A moderator checks it before it goes live.', senzaApprovazione: 'A channel effect plays without waiting: the streamer already picked it.',
    mio: 'Your walk-on', nessuno: 'You have no walk-on here yet.',
    stati: { attesa: 'Pending', approvato: 'Approved', rifiutato: 'Rejected', sospeso: 'Suspended' },
    spiega: { attesa: 'A moderator checks it before it goes live.', approvato: 'It will play on stream as described above.', rifiutato: 'It will not go live. You can make another one.', sospeso: 'You do not meet the requirements right now: if you subscribe again, it is back as it was.' },
    daVerificare: 'We could not check right now whether you are subscribed: we will check when you write in chat.',
    motivo: 'Why: {motivo}', effetto: 'Effect: {nome}', togli: 'Delete my walk-on', togliChiedi: 'Delete your walk-on? Its file goes with it.', tolto: 'Deleted.',
    nuovo: 'Make your walk-on', cambia: 'Change it', cambiaNota: 'If you change it, it goes back to pending: what gets approved is what is seen.',
    sceltaEffetto: 'A channel effect', sceltaFile: 'A file of yours', file: 'The file', fileNota: 'We read the type from the file itself, not from its name.', fileVa: 'Accepted: {tipi}, up to {mb} MB.',
    testo: 'The line below (optional)', testoPh: 'For example: {nome} is here!', testoNota: '{nome} becomes your name.',
    mail: 'Your email to hear the outcome (optional)', mailNota: 'We use it once, to tell you how it went, and then delete it. The streamer and the moderators never see it.', mailC: 'You left us an email: we will write to you with the outcome.', mailTogli: 'Remove the email', mailTolta: 'Email removed.',
    salva: 'Send', invio: 'Sending…', salvato: 'Sent: a moderator will check it now.', salvatoSubito: 'Done: it is approved.',
    nonPuoi: 'Here the walk-on is for {chi}, and right now you are not among them.', serveAccesso: 'Sign in to make your walk-on.', niente: 'The streamer has not opened anything to choose yet.',
    errori: {
      tipo: 'I do not recognise this file: images, videos or sounds are needed.', 'tipo-no': 'This kind of file cannot be used here.', illeggibile: 'This file cannot be read: try another one.',
      lungo: 'It is too long: {s} seconds at most.', peso: 'It is too heavy: {mb} MB at most.', requisiti: 'Right now you do not meet the requirements for a walk-on here.', accesso: 'Please sign in again.',
      troppi: 'Too many requests: try again in a minute.', effetto: 'That effect cannot be chosen.', vuoto: 'Choose an effect or a file.', spazio: 'Files cannot be uploaded here right now: try again later.',
      occupato: 'The server is busy: try again shortly.', mail: 'This email does not look right.', errore: 'Something went wrong: try again.', testo: 'The line is too long.',
    },
    privacy: 'Privacy', piede: 'The walk-on of {canale}.',
  },
  es: {
    accedi: 'Entra con Twitch', accediKick: 'Entra con Kick', esci: 'Salir', sei: 'Eres {nome}', accediPerche: 'Solo sirve para saber quién eres: nunca pedimos actuar en tu nombre.',
    regole: 'Qué vale aquí', chi: 'Quién puede', sub: 'subs en Twitch', subLivello: 'subs en Twitch desde el nivel {n}', subKick: 'subs en Kick', vip: 'VIP', mod: 'moderadores', aMano: 'quien elija el streamer',
    cosa: 'Qué puedes elegir', unEffetto: 'un efecto del canal', unFile: '{tipi} tuyo, hasta {mb} MB', fileDurata: 'vídeo y audio hasta {s} segundos', unTesto: 'una línea de texto debajo, hasta {n} caracteres',
    tipi: { immagine: 'una imagen', video: 'un vídeo', audio: 'un audio' }, o: ' o ',
    quandoMsg: 'Sale la primera vez que escribes en el chat durante un directo, una vez por directo.', quandoCmd: 'Sale cuando escribes {comando} en el chat, una vez por directo.',
    approvazione: 'Antes de salir al aire lo revisa un moderador.', senzaApprovazione: 'Un efecto del canal sale sin esperar: ya lo eligió el streamer.',
    mio: 'Tu walk-on', nessuno: 'Aún no tienes un walk-on aquí.',
    stati: { attesa: 'En espera', approvato: 'Aprobado', rifiutato: 'Rechazado', sospeso: 'Suspendido' },
    spiega: { attesa: 'Un moderador lo revisa antes de que salga al aire.', approvato: 'Saldrá en directo como dice arriba.', rifiutato: 'No saldrá al aire. Puedes hacer otro.', sospeso: 'Ahora no cumples los requisitos: si vuelves a ser sub, vuelve como estaba.' },
    daVerificare: 'No hemos podido comprobar ahora si eres sub: lo comprobamos cuando escribas en el chat.',
    motivo: 'Por qué: {motivo}', effetto: 'Efecto: {nome}', togli: 'Borrar mi walk-on', togliChiedi: '¿Borro tu walk-on? El archivo se va con él.', tolto: 'Borrado.',
    nuovo: 'Haz tu walk-on', cambia: 'Cámbialo', cambiaNota: 'Si lo cambias vuelve a estar en espera: se aprueba lo que se ve.',
    sceltaEffetto: 'Un efecto del canal', sceltaFile: 'Un archivo tuyo', file: 'El archivo', fileNota: 'El tipo lo leemos del archivo mismo, no del nombre.', fileVa: 'Vale {tipi}, hasta {mb} MB.',
    testo: 'La línea de debajo (opcional)', testoPh: 'Por ejemplo: ¡ha llegado {nome}!', testoNota: '{nome} se convierte en tu nombre.',
    mail: 'Tu correo para saber el resultado (opcional)', mailNota: 'Lo usamos una sola vez, para decirte cómo fue, y luego lo borramos. El streamer y los moderadores nunca lo ven.', mailC: 'Nos dejaste un correo: te escribimos el resultado.', mailTogli: 'Quitar el correo', mailTolta: 'Correo quitado.',
    salva: 'Enviar', invio: 'Lo envío…', salvato: 'Enviado: ahora lo revisa un moderador.', salvatoSubito: 'Hecho: está aprobado.',
    nonPuoi: 'Aquí el walk-on es para {chi}, y ahora no estás entre ellos.', serveAccesso: 'Entra para hacer tu walk-on.', niente: 'El streamer aún no ha abierto nada para elegir.',
    errori: {
      tipo: 'No reconozco este archivo: hacen falta imágenes, vídeos o audios.', 'tipo-no': 'Este tipo de archivo aquí no se puede usar.', illeggibile: 'Este archivo no se puede leer: prueba con otro.',
      lungo: 'Es demasiado largo: como mucho {s} segundos.', peso: 'Pesa demasiado: como mucho {mb} MB.', requisiti: 'Ahora no cumples los requisitos para el walk-on aquí.', accesso: 'Vuelve a entrar, por favor.',
      troppi: 'Demasiadas peticiones: vuelve a intentarlo en un minuto.', effetto: 'Ese efecto no se puede elegir.', vuoto: 'Elige un efecto o un archivo.', spazio: 'Ahora aquí no se pueden subir archivos: vuelve a intentarlo más tarde.',
      occupato: 'El servidor está ocupado: vuelve a intentarlo en un rato.', mail: 'Este correo no parece correcto.', errore: 'Algo no ha funcionado: vuelve a intentarlo.', testo: 'La línea es demasiado larga.',
    },
    privacy: 'Privacidad', piede: 'El walk-on de {canale}.',
  },
};

const riempi = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

// `io` e' chi ha fatto l'accesso ({ nome, piattaforma }), `accesso` e
// `accessoKick` dicono se l'accesso c'e' su questo server per questo canale.
export function htmlPaginaWalkon({ login, display, avatar = '', pagina, baseUrl, url = '', lingua = 'it', cfg, io = null, accesso = false, accessoKick = false, privacy = '' }) {
  const l = LINGUE.includes(lingua) ? lingua : 'it';
  const t = T[l];
  const nome = display || login;
  const titolo = testoDi(cfg, l, 'titolo', { canale: nome });
  const dida = testoDi(cfg, l, 'dida', { canale: nome });
  const base = pagina || {};
  const p = { template: base.template, tema: base.tema, headline: titolo, tagline: dida, avatar: base.avatar, blocchi: [{ tipo: 'intestazione' }, { tipo: 'walkon' }] };
  const dati = (k, v) => `data-${k}="${esc(typeof v === 'string' ? v : JSON.stringify(v))}"`;
  const blocco = (b, { ritardo }) => {
    if (b.tipo !== 'walkon') return null;
    return `<section class="wo" id="wo" ${ritardo} ${dati('login', login)} ${dati('lingua', l)} ${dati('canale', nome)} ${dati('t', t)} ${dati('io', io || '')} ${dati('accesso', accesso ? '1' : '')} ${dati('accesso-kick', accessoKick ? '1' : '')}>
<div class="wo-col">
<section class="wo-carta wo-io" id="wo-io" aria-live="polite"></section>
<section class="wo-carta" id="wo-mio" aria-labelledby="wo-mio-t"><h2 class="wo-t" id="wo-mio-t">${esc(t.mio)}</h2><div id="wo-mio-dentro"></div></section>
<section class="wo-carta" id="wo-fai" hidden aria-labelledby="wo-fai-t"><h2 class="wo-t" id="wo-fai-t">${esc(t.nuovo)}</h2>
<form id="wo-modulo" novalidate>
<div class="wo-scelte" id="wo-scelte" role="radiogroup"></div>
<div id="wo-effetti" class="wo-effetti" role="radiogroup" hidden></div>
<div id="wo-file-box" hidden><label class="wo-campo" for="wo-file">${esc(t.file)}<input type="file" id="wo-file" name="file"></label><p class="wo-nota" id="wo-file-nota">${esc(t.fileNota)}</p></div>
<div id="wo-testo-box" hidden><label class="wo-campo" for="wo-testo">${esc(t.testo)}<input type="text" id="wo-testo" name="testo" autocomplete="off" placeholder="${esc(t.testoPh)}"></label><p class="wo-nota">${esc(t.testoNota)}</p></div>
<div id="wo-mail-box" hidden><label class="wo-campo" for="wo-mail">${esc(t.mail)}<input type="email" id="wo-mail" name="mail" autocomplete="email" maxlength="254"></label><p class="wo-nota">${esc(t.mailNota)}</p></div>
<p class="wo-nota" id="wo-cambia-nota" hidden>${esc(t.cambiaNota)}</p>
<div class="wo-righe-b"><button type="submit" class="wo-b" id="wo-manda">${esc(t.salva)}</button></div>
</form></section>
<p class="wo-avviso" id="wo-avviso" role="status" hidden></p>
</div>
<aside class="wo-col"><section class="wo-carta" id="wo-regole" aria-labelledby="wo-regole-t"><h2 class="wo-t" id="wo-regole-t">${esc(t.regole)}</h2><div id="wo-regole-dentro"></div></section></aside>
</section>`;
  };
  const css = ({ stileBtn, ombra }) => `
  .telo{max-width:min(60rem,100%)}
  .testa-b{display:flex;flex-direction:column;align-items:center;text-align:center;gap:.3rem;width:100%;margin-bottom:.6rem}
  .wo{--ko:#e5484d;--ok:#2fbf71;display:grid;grid-template-columns:minmax(0,1fr) 18rem;gap:1rem;width:100%;align-items:start;text-align:left}
  @media (max-width:760px){.wo{grid-template-columns:minmax(0,1fr)}.wo>aside{order:-1}}
  .wo-col{display:grid;gap:.8rem;min-width:0}
  .wo-carta{padding:1rem 1.1rem;border-radius:var(--r);${stileBtn};${ombra};color:var(--btxt);min-width:0}
  .wo-t{font-family:var(--fd);font-weight:var(--pm);font-size:1.1rem;letter-spacing:-.01em;margin:0 0 .6rem}
  .wo-carta p{font-size:.92rem;margin:.1rem 0 .5rem;overflow-wrap:anywhere}
  .wo-carta ul{margin:.2rem 0 .6rem;padding-left:1.1rem;font-size:.92rem}
  .wo-carta li{margin:.15rem 0}
  .wo-nota{font-size:.85rem;color:var(--tenue)}
  .wo-io{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem .8rem}
  .wo-io p{margin:0}
  .wo-io .wo-nota{flex-basis:100%}
  .wo-stato{display:inline-flex;align-items:center;gap:.4rem;padding:.2rem .7rem;border-radius:999px;font-size:.8rem;font-weight:700;border:1px solid currentColor}
  .wo-stato::before{content:"";width:.55rem;height:.55rem;border-radius:50%;background:currentColor}
  .wo-stato.approvato{color:var(--ok)}.wo-stato.rifiutato,.wo-stato.sospeso{color:var(--ko)}
  .wo-anteprima{display:grid;place-items:center;margin:.6rem 0;border-radius:calc(var(--r) * .6);background:rgba(127,127,127,.15);overflow:hidden;max-height:18rem}
  .wo-anteprima img,.wo-anteprima video{max-width:100%;max-height:18rem;object-fit:contain;display:block}
  .wo-anteprima audio{width:100%;margin:.6rem}
  .wo-scelte{display:flex;flex-wrap:wrap;gap:.4rem;margin:0 0 .7rem}
  .wo-scelte button{min-height:2.75rem;padding:.3rem .9rem;border-radius:999px;border:1px solid currentColor;background:transparent;color:inherit;font:inherit;font-size:.9rem;cursor:pointer}
  .wo-scelte button[aria-checked="true"]{background:var(--acc);color:var(--suacc);border-color:var(--acc)}
  .wo-effetti{display:grid;grid-template-columns:repeat(auto-fill,minmax(7rem,1fr));gap:.5rem;margin:0 0 .7rem}
  .wo-voce{display:grid;gap:.3rem;padding:.45rem;border-radius:calc(var(--r) * .7);border:var(--bw) solid currentColor;background:transparent;color:inherit;font:inherit;cursor:pointer;text-align:left;min-width:0}
  .wo-voce[aria-checked="true"]{border-color:var(--acc);box-shadow:0 0 0 2px var(--acc)}
  .wo-voce b{font-size:.85rem;overflow-wrap:anywhere}
  .wo-mini{aspect-ratio:1;border-radius:calc(var(--r) * .5);background:rgba(127,127,127,.15);overflow:hidden;display:grid;place-items:center;font-size:.8rem}
  .wo-mini img,.wo-mini video{width:100%;height:100%;object-fit:contain}
  .wo-campo{display:grid;gap:.25rem;margin:.3rem 0 .3rem;font-size:.88rem}
  .wo input[type=text],.wo input[type=email],.wo input[type=file]{font:inherit;color:inherit;padding:.55rem .7rem;border-radius:calc(var(--r) * .6);border:1px solid currentColor;background:transparent;min-height:2.75rem;width:100%;max-width:100%}
  .wo-righe-b{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.6rem}
  .wo-b{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-height:2.75rem;padding:.55rem 1.1rem;border-radius:calc(var(--r) * .8);border:0;background:var(--acc);color:var(--suacc);font:inherit;font-weight:var(--pf);cursor:pointer;text-decoration:none}
  .wo-b.due{background:transparent;color:inherit;border:1px solid currentColor}
  .wo-b[disabled]{opacity:.5;cursor:not-allowed}
  .wo-b:focus-visible,.wo-voce:focus-visible,.wo-scelte button:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
  .wo-avviso{padding:.6rem .8rem;border-radius:calc(var(--r) * .6);font-size:.92rem;background:rgba(127,127,127,.15);margin:0}
  .wo-avviso.ko{background:rgba(229,72,77,.18)}
  .wo-avviso.ok{background:rgba(47,191,113,.2)}
  [hidden]{display:none!important}`;
  const fuori = {
    lingua: l,
    url: url || `${baseUrl}/won/${login}`,
    privacy: privacy || '/privacy.html',
    testi: { titolo: 'Walk-on', descrizione: dida, vuota: '', creata: riempi(t.piede, { canale: nome }), privacy: t.privacy },
    blocco,
    css,
    script: () => '<script src="/pagina-walkon.js?v=1" defer></script>',
  };
  return renderLinkPage(p, { login, display: nome, avatar, baseUrl, fuori });
}
