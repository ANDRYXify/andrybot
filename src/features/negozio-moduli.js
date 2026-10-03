// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL MODULO DI UN ARTICOLO (docs/NEGOZIO.md, «Il modulo»): quello che lo
// streamer chiede a chi compra, per esempio il nome Discord.
//
// Chi compra si riconosce dalla chat: lo dice la piattaforma, su Twitch, Kick
// e YouTube allo stesso modo. Un modulo invece e' una pagina, e un link detto in
// chat lo apre chiunque la stia guardando: se bastasse compilarlo, un altro
// potrebbe metterci il SUO nome Discord e prendersi quello che ha pagato un
// altro. Per questo la pagina raccoglie e la chat conferma:
//  1. `!compra torneo` fa i controlli che dicono di no senza toccare niente, e
//     se l'articolo ha un modulo nasce una BOZZA col suo indirizzo, /m/<chiave>;
//  2. la pagina prende le risposte e da' un CODICE, #1234, legato a quelle;
//  3. `!compra #1234`, scritto dallo stesso account, compra davvero, con quelle
//     risposte e gli stessi controlli di sempre.
// Chi apre il link di un altro ottiene un codice che non puo' scrivere: lo
// scrive solo chi ha l'account. E `#` non puo' stare nella parola di un
// articolo ([a-z0-9]): un codice non si confonde mai con un articolo.
//
// Qui sta la parte pura: i campi, le risposte, la pagina. Il database (le
// bozze) e la chat stanno in db.js e negozio.js.

export const MAX_CAMPI = 5;
export const TIPI_CAMPO = ['testo', 'lungo', 'numero', 'scelta'];
export const LIMITI = { etichetta: 60, aiuto: 80, opzione: 40, opzioni: 10, testo: 100, lungo: 300, numero: 15 };
// Quanto vive una bozza: il tempo di aprire il link, compilare e tornare in chat.
export const VITA_BOZZA_MS = 15 * 60 * 1000;
// Quante volte si puo' inviare lo stesso modulo: chi sbaglia corregge, chi
// martella si ferma.
export const MAX_INVII = 12;
export const CODICE = /^#(\d{4})$/;

const LINGUE = ['it', 'en', 'es'];
const lin = (l) => (LINGUE.includes(l) ? l : 'it');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const senzaControllo = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
const riga = (v, max) => senzaControllo(v).replace(/\s+/g, ' ').trim().slice(0, max);
const chiave = (s) => riga(s, 200).toLowerCase();

// I campi come li salva il negozio. Torna { ok, campi } oppure il perche' no:
// una scelta vuole almeno due opzioni diverse, e due campi con la stessa
// etichetta darebbero due risposte che non si distinguono. Un campo senza
// etichetta non e' una domanda, e non passa. L'id e' la posizione: le
// risposte si salvano con l'etichetta, non con l'id.
export function normCampi(lista) {
  const grezzi = Array.isArray(lista) ? lista : [];
  const campi = [];
  const viste = new Set();
  for (const x of grezzi) {
    if (!x || typeof x !== 'object') continue;
    const etichetta = riga(x.etichetta, LIMITI.etichetta);
    if (!etichetta) continue;
    if (campi.length >= MAX_CAMPI) return { ok: false, errore: 'campiTroppi' };
    if (viste.has(etichetta.toLowerCase())) return { ok: false, errore: 'campoDoppio' };
    viste.add(etichetta.toLowerCase());
    const tipo = TIPI_CAMPO.includes(x.tipo) ? x.tipo : 'testo';
    const opzioni = [];
    if (tipo === 'scelta') {
      const uniche = new Set();
      for (const o of (Array.isArray(x.opzioni) ? x.opzioni : String(x.opzioni || '').split('\n'))) {
        const v = riga(o, LIMITI.opzione);
        if (v && !uniche.has(v.toLowerCase()) && opzioni.length < LIMITI.opzioni) { uniche.add(v.toLowerCase()); opzioni.push(v); }
      }
      if (opzioni.length < 2) return { ok: false, errore: 'sceltaCorta' };
    }
    campi.push({ id: `c${campi.length + 1}`, etichetta, tipo, obbligatorio: x.obbligatorio !== false, opzioni, aiuto: riga(x.aiuto, LIMITI.aiuto) });
  }
  return { ok: true, campi };
}

// I campi di un articolo come valgono adesso. Un «da consegnare a mano» di
// prima, con la sua domanda, e' un modulo di un campo obbligatorio: cosi' gli
// articoli che ci sono non cambiano e non c'e' niente da migrare.
export function campiDi(a) {
  if (Array.isArray(a?.campi) && a.campi.length) return a.campi;
  const domanda = riga(a?.dati?.domanda, 120);
  if (a?.tipo === 'mano' && domanda) return [{ id: 'c1', etichetta: domanda, tipo: 'testo', obbligatorio: true, opzioni: [], aiuto: '' }];
  return [];
}

// I tipi che usano il testo dopo la parola come CONTENUTO: la canzone, il
// messaggio da mettere in evidenza, gli argomenti del Modulo. Per loro la riga
// e' sempre la nota, mai una risposta al modulo.
export const usaNota = (tipo) => tipo === 'musica' || tipo === 'evidenza' || tipo === 'modulo';

// La riga basta quando il modulo ha un campo solo e la riga non serve ad altro:
// `!compra gioco Hades` risponde al campo, come la domanda di prima.
export const rigaBasta = (a) => campiDi(a).length === 1 && !usaNota(a.tipo);

// Un valore per un campo, controllato. Torna { ok, valore } o { ok:false, errore }.
export function valoreDi(campo, grezzo) {
  const lungo = campo.tipo === 'lungo';
  const v = lungo
    ? senzaControllo(grezzo).replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, LIMITI.lungo)
    : riga(grezzo, campo.tipo === 'numero' ? LIMITI.numero : LIMITI.testo);
  if (!v) return campo.obbligatorio ? { ok: false, errore: 'obbligatorio' } : { ok: true, valore: '' };
  if (campo.tipo === 'numero' && !/^-?\d+(?:[.,]\d+)?$/.test(v)) return { ok: false, errore: 'numero' };
  if (campo.tipo === 'scelta') {
    const giusta = campo.opzioni.find((o) => chiave(o) === chiave(v));
    if (!giusta) return { ok: false, errore: 'scelta' };
    return { ok: true, valore: giusta };
  }
  return { ok: true, valore: v };
}

// Tutte le risposte di un modulo inviato. `grezzo` ha un valore per id
// ({ c1: '…' }). Torna i valori puliti (per riempire di nuovo la pagina), gli
// errori campo per campo, e le risposte come si salvano: l'etichetta di adesso
// col suo valore, solo quelle date. Le risposte sono un'istantanea: cambiare
// l'articolo dopo non cambia quello che ha scritto chi ha comprato.
export function vaglia(campi, grezzo) {
  const g = grezzo && typeof grezzo === 'object' ? grezzo : {};
  const valori = {}, errori = {}, risposte = [];
  for (const c of campi) {
    const r = valoreDi(c, g[c.id]);
    valori[c.id] = r.ok ? r.valore : riga(g[c.id], c.tipo === 'lungo' ? LIMITI.lungo : LIMITI.testo);
    if (!r.ok) { errori[c.id] = r.errore; continue; }
    if (r.valore) risposte.push({ etichetta: c.etichetta, valore: r.valore });
  }
  return { ok: !Object.keys(errori).length, valori, errori, risposte };
}

// Le risposte salvate, rilette: solo coppie vere, comunque ci siano arrivate.
export function risposteDa(testo) {
  let x = [];
  try { x = JSON.parse(String(testo || '[]')); } catch { x = []; }
  return (Array.isArray(x) ? x : [])
    .filter((r) => r && typeof r === 'object')
    .map((r) => ({ etichetta: riga(r.etichetta, LIMITI.etichetta), valore: String(r.valore ?? '').slice(0, LIMITI.lungo) }))
    .filter((r) => r.etichetta && r.valore);
}

// Le etichette, per dire in chat e sulla pagina cosa chiede un articolo.
export const cosaChiede = (a) => campiDi(a).map((c) => c.etichetta);

// --------------------------------------------------------------- la pagina

const T = {
  it: {
    titolo: (art) => `Prima di comprare «${art}»`,
    chi: (nome, dove) => `Compri come ${nome}${dove ? ` su ${dove}` : ''}.`,
    prezzo: 'Prezzo',
    facoltativo: 'facoltativo',
    scegli: 'Scegli…',
    invia: 'Avanti',
    nota: 'Le risposte le legge solo chi ti vende l’articolo, e il suo staff.',
    errori: { obbligatorio: 'Questo serve: scrivilo.', numero: 'Qui va un numero.', scelta: 'Scegli una delle voci.' },
    ancora: (n) => (n === 1 ? 'Una risposta va sistemata: la trovi segnata qui sotto.' : `${n} risposte vanno sistemate: le trovi segnate qui sotto.`),
    passo: 'Ultimo passo',
    scrivi: 'Scrivi in chat:',
    perche: 'Il codice dice che sei tu: lo può scrivere solo il tuo account. Le monete si spendono quando lo scrivi.',
    copia: 'Copia',
    copiato: 'Copiato',
    rifai: 'Cambia le risposte',
    vale: (min) => `Vale ${min} minuti.`,
    scaduto: 'Questo modulo non c’è più',
    scadutoTesto: (cmd) => `I moduli valgono un quarto d’ora, e questo è scaduto o è già stato usato. Per ricominciare scrivi di nuovo in chat ${cmd} e la parola dell’articolo.`,
    troppi: 'Questo modulo è stato inviato troppe volte: ricomincia da capo dalla chat.',
  },
  en: {
    titolo: (art) => `Before you buy «${art}»`,
    chi: (nome, dove) => `You are buying as ${nome}${dove ? ` on ${dove}` : ''}.`,
    prezzo: 'Price',
    facoltativo: 'optional',
    scegli: 'Choose…',
    invia: 'Next',
    nota: 'Your answers are read only by the seller and their staff.',
    errori: { obbligatorio: 'This one is needed: fill it in.', numero: 'A number goes here.', scelta: 'Pick one of the options.' },
    ancora: (n) => (n === 1 ? 'One answer needs fixing: it is marked below.' : `${n} answers need fixing: they are marked below.`),
    passo: 'Last step',
    scrivi: 'Type in chat:',
    perche: 'The code proves it is you: only your account can type it. Your coins are spent when you type it.',
    copia: 'Copy',
    copiato: 'Copied',
    rifai: 'Change the answers',
    vale: (min) => `Valid for ${min} minutes.`,
    scaduto: 'This form is gone',
    scadutoTesto: (cmd) => `Forms last a quarter of an hour, and this one has expired or was already used. To start again, type ${cmd} and the item word in chat.`,
    troppi: 'This form was sent too many times: start again from the chat.',
  },
  es: {
    titolo: (art) => `Antes de comprar «${art}»`,
    chi: (nome, dove) => `Compras como ${nome}${dove ? ` en ${dove}` : ''}.`,
    prezzo: 'Precio',
    facoltativo: 'opcional',
    scegli: 'Elige…',
    invia: 'Siguiente',
    nota: 'Las respuestas solo las lee quien te vende el artículo, y su equipo.',
    errori: { obbligatorio: 'Esto hace falta: escríbelo.', numero: 'Aquí va un número.', scelta: 'Elige una de las opciones.' },
    ancora: (n) => (n === 1 ? 'Hay una respuesta que corregir: la tienes marcada abajo.' : `Hay ${n} respuestas que corregir: las tienes marcadas abajo.`),
    passo: 'Último paso',
    scrivi: 'Escribe en el chat:',
    perche: 'El código dice que eres tú: solo tu cuenta puede escribirlo. Las monedas se gastan cuando lo escribes.',
    copia: 'Copiar',
    copiato: 'Copiado',
    rifai: 'Cambiar las respuestas',
    vale: (min) => `Vale ${min} minutos.`,
    scaduto: 'Este formulario ya no está',
    scadutoTesto: (cmd) => `Los formularios valen un cuarto de hora, y este ha caducado o ya se ha usado. Para empezar de nuevo escribe otra vez en el chat ${cmd} y la palabra del artículo.`,
    troppi: 'Este formulario se ha enviado demasiadas veces: empieza de nuevo desde el chat.',
  },
};
export const testiModulo = (l) => T[lin(l)];

// La pagina del modulo, in tre stati: «modulo» (i campi, con gli errori
// accanto a ognuno), «codice» (l'ultimo passo, da scrivere in chat) e «fine»
// (scaduto, usato o mandato troppe volte). Funziona senza JavaScript: e' un
// <form> che si manda al server, che controlla e la riscrive. L'unico script,
// esterno, e' il «Copia» del codice; senza, il codice si seleziona a mano.
// `veste` sono i colori e i caratteri della pagina del negozio del canale.
export function htmlModulo({
  lingua, veste, stato = 'modulo', articolo = {}, chi = '', dove = '', campi = [], valori = {}, errori = {},
  codice = '', cmd = '!compra', azione = '', minuti = 15, fine = 'scaduto', script = '',
}) {
  const l = lin(lingua);
  const t = T[l];
  const v = veste || {};
  const c = v.c || { bg: '#0f0d14', bg2: '#1c1828', testo: '#f4f2f8', tenue: '#b9b3c9', card: 'rgba(255,255,255,.06)', bordo: 'rgba(255,255,255,.18)', acc: '#9b6bff' };
  const suAcc = v.suAcc || '#ffffff';
  const errCol = v.scuro === false ? '#a3231a' : '#ff9d94';
  const fd = v.font?.d || 'system-ui, sans-serif';
  const ft = v.font?.t || 'system-ui, sans-serif';
  const quanti = Object.keys(errori).length;
  const nomeArt = articolo.nome || '';
  const titoloPagina = stato === 'fine' ? t.scaduto : t.titolo(nomeArt);

  const campo = (k) => {
    const id = `m-${k.id}`;
    const err = errori[k.id] ? t.errori[errori[k.id]] || t.errori.obbligatorio : '';
    const descr = [k.aiuto ? `${id}-a` : '', err ? `${id}-e` : ''].filter(Boolean).join(' ');
    const attr = `id="${id}" name="${esc(k.id)}"${k.obbligatorio ? ' required aria-required="true"' : ''}${err ? ' aria-invalid="true"' : ''}${descr ? ` aria-describedby="${descr}"` : ''}`;
    const val = valori[k.id] ?? '';
    let ctrl;
    if (k.tipo === 'lungo') ctrl = `<textarea ${attr} rows="4" maxlength="${LIMITI.lungo}">${esc(val)}</textarea>`;
    else if (k.tipo === 'scelta') ctrl = `<select ${attr}><option value="">${esc(t.scegli)}</option>${k.opzioni.map((o) => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else ctrl = `<input ${attr} type="text"${k.tipo === 'numero' ? ' inputmode="decimal"' : ''} maxlength="${k.tipo === 'numero' ? LIMITI.numero : LIMITI.testo}" value="${esc(val)}" autocomplete="off">`;
    return `<div class="campo${err ? ' sbagliato' : ''}">
      <label for="${id}">${esc(k.etichetta)}${k.obbligatorio ? '' : ` <span class="fac">(${esc(t.facoltativo)})</span>`}</label>
      ${k.aiuto ? `<p class="aiuto" id="${id}-a">${esc(k.aiuto)}</p>` : ''}
      ${ctrl}
      ${err ? `<p class="errore" id="${id}-e">${esc(err)}</p>` : ''}
    </div>`;
  };

  const testa = stato === 'fine' ? '' : `<header class="testa">
      <h1>${esc(t.titolo(nomeArt))}</h1>
      ${articolo.descrizione ? `<p class="desc">${esc(articolo.descrizione)}</p>` : ''}
      <p class="prezzo"><span>${esc(t.prezzo)}</span> <strong>${esc(articolo.prezzo || '')} ${esc(articolo.moneta || '')}</strong></p>
      ${chi ? `<p class="chi">${esc(t.chi(chi, dove))}</p>` : ''}
    </header>`;

  let corpo;
  if (stato === 'codice') {
    const riga1 = `${cmd} #${codice}`;
    corpo = `<section class="passo" aria-labelledby="passo-t">
      <h2 id="passo-t">${esc(t.passo)}</h2>
      <p>${esc(t.scrivi)}</p>
      <div class="codice ng-cmd"><code id="codice">${esc(riga1)}</code><button type="button" class="copia" data-copia="${esc(riga1)}" data-fatto="${esc(t.copiato)}">${esc(t.copia)}</button></div>
      <p class="tenue">${esc(t.perche)} ${esc(t.vale(minuti))}</p>
      <p><a class="rifai" href="${esc(azione)}">${esc(t.rifai)}</a></p>
    </section>`;
  } else if (stato === 'fine') {
    corpo = `<section class="passo">
      <h1>${esc(t.scaduto)}</h1>
      <p>${esc(fine === 'troppi' ? t.troppi : t.scadutoTesto(cmd))}</p>
    </section>`;
  } else {
    corpo = `<form method="post" action="${esc(azione)}" novalidate>
      ${quanti ? `<p class="avviso" role="alert">${esc(t.ancora(quanti))}</p>` : ''}
      ${campi.map(campo).join('')}
      <p class="tenue">${esc(t.nota)}</p>
      <button type="submit" class="invia">${esc(t.invia)}</button>
    </form>`;
  }

  return `<!DOCTYPE html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>${esc(titoloPagina)}</title>
<style>${v.faccia || ''}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--acc:${c.acc};--suacc:${suAcc};--testo:${c.testo};--tenue:${c.tenue};--bordo:${c.bordo};--card:${c.card};--err:${errCol}}
html{background:${c.bg}}
body{min-height:100dvh;background:linear-gradient(180deg,${c.bg},${c.bg2});color:var(--testo);font-family:${ft};line-height:1.55;overflow-x:clip;overflow-wrap:anywhere;padding:clamp(1.25rem,5vw,3rem) 1rem 3rem;-webkit-font-smoothing:antialiased}
main{max-width:34rem;margin:0 auto;display:flex;flex-direction:column;gap:1.25rem}
h1{font-family:${fd};font-size:clamp(1.5rem,5.5vw,2.1rem);line-height:1.1;letter-spacing:-.02em;text-wrap:balance}
h2{font-family:${fd};font-size:1.2rem;letter-spacing:-.01em}
.testa{display:flex;flex-direction:column;gap:.45rem}
.desc,.chi,.tenue{color:var(--tenue);font-size:.95rem}
.prezzo span{color:var(--tenue);font-size:.8rem;text-transform:uppercase;letter-spacing:.06em}
.prezzo strong{font-family:${fd};font-size:1.15rem}
form,.passo{display:flex;flex-direction:column;gap:1rem;padding:1.1rem;border:1px solid var(--bordo);border-radius:16px;background:var(--card)}
.campo{display:flex;flex-direction:column;gap:.35rem}
label{font-weight:700}
.fac{font-weight:400;color:var(--tenue);font-size:.88rem}
.aiuto{color:var(--tenue);font-size:.88rem}
input,select,textarea{font:inherit;color:var(--testo);background:${c.bg};border:1px solid var(--bordo);border-radius:10px;padding:.7rem .8rem;min-height:2.9rem;width:100%}
textarea{resize:vertical;min-height:6rem}
input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid var(--acc);outline-offset:2px}
.sbagliato input,.sbagliato select,.sbagliato textarea{border-color:var(--err);border-width:2px}
.errore,.avviso{color:var(--err);font-size:.92rem;font-weight:600}
.invia,.copia{font:inherit;font-weight:700;border:0;border-radius:12px;background:var(--acc);color:var(--suacc);min-height:3rem;padding:.7rem 1.4rem;cursor:pointer}
.invia{align-self:flex-start}
.codice{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;padding:.8rem;border:1px dashed var(--acc);border-radius:12px}
.codice code{flex:1 1 10rem;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:1.35rem;font-weight:700;user-select:all}
.copia{min-height:2.75rem;padding:.5rem 1.1rem}
.rifai{color:var(--acc)}
@media (prefers-reduced-motion:no-preference){.invia,.copia{transition:filter .15s}.invia:hover,.copia:hover{filter:brightness(1.08)}}
</style>
</head>
<body>
<main>
  ${testa}
  ${corpo}
</main>
${script && stato === 'codice' ? `<script src="${esc(script)}" defer></script>` : ''}
</body>
</html>`;
}
