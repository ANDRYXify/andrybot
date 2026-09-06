// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

import { svgCarta, normCarta, normElemento } from '/js/carta-disegno.js';

const L = (it, en, es) => (document.documentElement.lang === 'en' ? en : document.documentElement.lang === 'es' ? es : it);
const esc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

const CAMPI = {
  testo: [
    ['testo', ['Testo', 'Text', 'Texto'], 'frase'],
    ['carattere', ['Carattere', 'Typeface', 'Tipografía'], 'scelta', 'caratteri'],
    ['corpo', ['Corpo', 'Size', 'Tamaño'], 'numero', 8, 240],
    ['colore', ['Colore', 'Colour', 'Color'], 'colore'],
    ['max', ['Segni al massimo', 'Max characters', 'Caracteres máximos'], 'numero', 4, 200],
    ['spaziatura', ['Spaziatura', 'Letter spacing', 'Espaciado'], 'numero', -10, 40],
    ['maiuscolo', ['Tutto maiuscolo', 'All caps', 'Todo mayúsculas'], 'sino'],
  ],
  targhetta: [
    ['testo', ['Testo', 'Text', 'Texto'], 'frase'],
    ['sfondo', ['Fondo', 'Background', 'Fondo'], 'colore'],
    ['colore', ['Colore', 'Colour', 'Color'], 'colore'],
    ['carattere', ['Carattere', 'Typeface', 'Tipografía'], 'scelta', 'caratteri'],
    ['corpo', ['Corpo', 'Size', 'Tamaño'], 'numero', 10, 200],
    ['punto', ['Pallino davanti', 'Dot in front', 'Punto delante'], 'sino'],
    ['tagliata', ['Angolo tagliato', 'Cut corner', 'Esquina cortada'], 'sino'],
  ],
  avatar: [
    ['d', ['Diametro', 'Diameter', 'Diámetro'], 'numero', 40, 1200],
    ['forma', ['Forma', 'Shape', 'Forma'], 'scelta', 'forme'],
    ['bordo', ['Bordo', 'Border', 'Borde'], 'colore'],
    ['spessore', ['Spessore', 'Thickness', 'Grosor'], 'numero', 0, 40],
    ['aureola', ['Anello intorno', 'Ring around', 'Anillo alrededor'], 'sino'],
  ],
  riga: [
    ['larghezza', ['Larghezza', 'Width', 'Ancho'], 'numero', 1, 2400],
    ['altezza', ['Altezza', 'Height', 'Alto'], 'numero', 1, 1000],
    ['colore', ['Colore', 'Colour', 'Color'], 'colore'],
  ],
  striscia: [
    ['larghezza', ['Larghezza', 'Width', 'Ancho'], 'numero', 2, 1200],
    ['inclinazione', ['Inclinazione', 'Slant', 'Inclinación'], 'numero', -80, 80],
    ['colore', ['Colore', 'Colour', 'Color'], 'colore'],
  ],
};

const CAMPI_FONDO = [
  ['tipo', ['Tipo', 'Kind', 'Tipo'], 'scelta', 'fondi'],
  ['tinta', ['Tinta', 'Base colour', 'Tinte'], 'colore'],
  ['alone', ['Alone', 'Glow', 'Halo'], 'colore'],
  ['alone2', ['Secondo alone', 'Second glow', 'Segundo halo'], 'colore'],
  ['cx', ['Alone: da sinistra', 'Glow: from left', 'Halo: desde la izquierda'], 'numero', 0, 100],
  ['cy', ['Alone: dall’alto', 'Glow: from top', 'Halo: desde arriba'], 'numero', 0, 100],
  ['r', ['Alone: ampiezza', 'Glow: spread', 'Halo: amplitud'], 'numero', 5, 200],
];

const NOME_TIPO = {
  testo: ['Testo', 'Text', 'Texto'],
  targhetta: ['Targhetta', 'Badge', 'Etiqueta'],
  avatar: ['Faccia', 'Avatar', 'Cara'],
  riga: ['Riga', 'Bar', 'Barra'],
  striscia: ['Striscia', 'Stripe', 'Franja'],
};

const AGGANCIO = 6;
const PASSI_MAX = 60;

export function apri(stato, { salva, aggiorna } = {}) {
  let carta = normCarta(JSON.parse(JSON.stringify(stato.carta)));
  const dati = stato.dati || {};
  const vocab = stato.vocabolario || {};
  const partenza = JSON.stringify(carta);
  let sel = null;
  let passato = [];
  let futuro = [];
  let scala = 1;
  let trascino = null;

  const velo = document.createElement('div');
  velo.className = 'ce-velo';
  velo.innerHTML = `
    <div class="ce-testa">
      <strong>${L('Editor della locandina', 'Poster editor', 'Editor del cartel')}</strong>
      <span class="ce-spinta"></span>
      <button type="button" class="btn secondario mini" data-fa="annulla" title="${L('Annulla (Ctrl+Z)', 'Undo (Ctrl+Z)', 'Deshacer (Ctrl+Z)')}">${L('Annulla', 'Undo', 'Deshacer')}</button>
      <button type="button" class="btn secondario mini" data-fa="rifai" title="${L('Rifai (Ctrl+Maiusc+Z)', 'Redo (Ctrl+Shift+Z)', 'Rehacer (Ctrl+Mayús+Z)')}">${L('Rifai', 'Redo', 'Rehacer')}</button>
      <button type="button" class="btn" data-fa="salva">${L('Salva', 'Save', 'Guardar')}</button>
      <button type="button" class="btn secondario" data-fa="chiudi">${L('Chiudi', 'Close', 'Cerrar')}</button>
    </div>
    <div class="ce-banco">
      <aside class="ce-lato ce-livelli">
        <h3>${L('Pezzi', 'Pieces', 'Piezas')}</h3>
        <div class="ce-elenco" data-elenco></div>
        <div class="ce-aggiungi" data-aggiungi></div>
      </aside>
      <div class="ce-tela" data-tela>
        <div class="ce-foglio" data-foglio>
          <div class="ce-disegno" data-disegno></div>
          <div class="ce-cornice" data-cornice hidden></div>
        </div>
      </div>
      <aside class="ce-lato ce-ispettore" data-ispettore></aside>
    </div>`;
  document.body.appendChild(velo);
  document.body.classList.add('ce-aperto');

  const q = (s) => velo.querySelector(s);
  const tela = q('[data-tela]');
  const foglio = q('[data-foglio]');
  const disegno = q('[data-disegno]');
  const cornice = q('[data-cornice]');

  const elSel = () => carta.elementi.find((x) => x.id === sel) || null;

  function passo() {
    passato.push(JSON.stringify(carta));
    if (passato.length > PASSI_MAX) passato.shift();
    futuro = [];
  }

  function annulla() {
    if (!passato.length) return;
    futuro.push(JSON.stringify(carta));
    carta = JSON.parse(passato.pop());
    if (!elSel()) sel = null;
    tutto();
  }

  function rifai() {
    if (!futuro.length) return;
    passato.push(JSON.stringify(carta));
    carta = JSON.parse(futuro.pop());
    if (!elSel()) sel = null;
    tutto();
  }

  function misura() {
    const r = tela.getBoundingClientRect();
    scala = Math.min((r.width - 48) / carta.larghezza, (r.height - 48) / carta.altezza, 1.4);
    if (!(scala > 0)) scala = 0.4;
    foglio.style.width = Math.round(carta.larghezza * scala) + 'px';
    foglio.style.height = Math.round(carta.altezza * scala) + 'px';
    const svg = disegno.querySelector('svg');
    if (svg) { svg.setAttribute('width', Math.round(carta.larghezza * scala)); svg.setAttribute('height', Math.round(carta.altezza * scala)); }
  }

  function riquadro() {
    const e = elSel();
    const svg = disegno.querySelector('svg');
    if (!e || e.spento || !svg) { cornice.hidden = true; return; }
    const g = svg.querySelector(`g[data-el="${CSS.escape(e.id)}"]`);
    if (!g) { cornice.hidden = true; return; }
    let b;
    try { b = g.getBBox(); } catch { cornice.hidden = true; return; }
    if (!b || (!b.width && !b.height)) { cornice.hidden = true; return; }
    cornice.hidden = false;
    cornice.style.left = (b.x * scala) + 'px';
    cornice.style.top = (b.y * scala) + 'px';
    cornice.style.width = (b.width * scala) + 'px';
    cornice.style.height = (b.height * scala) + 'px';
  }

  function disegnaTela() {
    disegno.innerHTML = svgCarta(carta, dati);
    misura();
    riquadro();
  }

  function elenco() {
    const box = q('[data-elenco]');
    box.innerHTML = carta.elementi.map((e, i) => `
      <div class="ce-voce${e.id === sel ? ' scelta' : ''}${e.spento ? ' spenta' : ''}" data-voce="${esc(e.id)}">
        <button type="button" class="ce-occhio" data-occhio="${esc(e.id)}" title="${e.spento ? L('Accendi', 'Show', 'Mostrar') : L('Spegni', 'Hide', 'Ocultar')}" aria-label="${e.spento ? L('Accendi', 'Show', 'Mostrar') : L('Spegni', 'Hide', 'Ocultar')}"></button>
        <span class="ce-voce-nome">${esc(e.id)}</span>
        <span class="ce-voce-tipo">${esc(L(...NOME_TIPO[e.tipo] || [e.tipo, e.tipo, e.tipo]))}</span>
        <button type="button" class="ce-mini" data-su="${esc(e.id)}" ${i === 0 ? 'disabled' : ''} title="${L('Più indietro', 'Send back', 'Atrás')}" aria-label="${L('Più indietro', 'Send back', 'Atrás')}">&#8593;</button>
        <button type="button" class="ce-mini" data-giu="${esc(e.id)}" ${i === carta.elementi.length - 1 ? 'disabled' : ''} title="${L('Più avanti', 'Bring forward', 'Adelante')}" aria-label="${L('Più avanti', 'Bring forward', 'Adelante')}">&#8595;</button>
      </div>`).join('');
    const agg = q('[data-aggiungi]');
    const pieno = carta.elementi.length >= (vocab.massimo || 24);
    agg.innerHTML = (vocab.tipi || []).map((t) => `<button type="button" class="btn secondario mini" data-nuovo="${esc(t)}" ${pieno ? 'disabled' : ''}>+ ${esc(L(...NOME_TIPO[t] || [t, t, t]))}</button>`).join('')
      + (pieno ? `<p class="suggerimento">${L('Hai raggiunto il massimo di pezzi.', 'You reached the maximum number of pieces.', 'Has alcanzado el máximo de piezas.')}</p>` : '');
  }

  function campo(e, [k, eti, tipo, a, b]) {
    const v = e[k];
    const nome = esc(L(...eti));
    const id = 'ce-c-' + k;
    if (tipo === 'sino') {
      return `<div class="riga-check"><input type="checkbox" id="${id}" data-k="${k}" ${v ? 'checked' : ''}><label for="${id}">${nome}</label></div>`;
    }
    if (tipo === 'colore') {
      return `<label class="campo" for="${id}">${nome}</label>
        <div class="ce-colore"><input type="color" id="${id}" data-k="${k}" value="${esc(/^#[0-9a-f]{6}$/i.test(v) ? v : '#ffffff')}">
        <input type="text" data-k="${k}" data-testo="1" value="${esc(v || '')}" spellcheck="false" aria-label="${nome}"></div>`;
    }
    if (tipo === 'scelta') {
      const opz = (vocab[a] || []);
      return `<label class="campo" for="${id}">${nome}</label>
        <select id="${id}" data-k="${k}">${opz.map((o) => `<option value="${esc(o)}"${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    }
    if (tipo === 'numero') {
      return `<label class="campo" for="${id}">${nome}</label>
        <div class="ce-numero"><input type="range" id="${id}" data-k="${k}" min="${a}" max="${b}" value="${Number(v) || 0}">
        <input type="number" data-k="${k}" min="${a}" max="${b}" value="${Number(v) || 0}" aria-label="${nome}"></div>`;
    }
    return `<label class="campo" for="${id}">${nome}</label><input type="text" id="${id}" data-k="${k}" value="${esc(v || '')}">`;
  }

  function ispettore() {
    const box = q('[data-ispettore]');
    const e = elSel();
    if (!e) {
      box.innerHTML = `<h3>${L('Fondo', 'Background', 'Fondo')}</h3><div data-dove="fondo">`
        + CAMPI_FONDO.map((c) => campo(carta.fondo, c)).join('')
        + `</div><p class="suggerimento">${L('Scegli un pezzo per cambiarlo. Trascinalo sulla tela per spostarlo.', 'Pick a piece to change it. Drag it on the canvas to move it.', 'Elige una pieza para cambiarla. Arrástrala en el lienzo para moverla.')}</p>`;
      return;
    }
    const segna = (vocab.segnaposto || []);
    const haTesto = e.tipo === 'testo' || e.tipo === 'targhetta';
    box.innerHTML = `
      <h3>${esc(L(...NOME_TIPO[e.tipo] || [e.tipo, e.tipo, e.tipo]))} · ${esc(e.id)}</h3>
      <div data-dove="elemento">
        <label class="campo" for="ce-c-id">${L('Nome del pezzo', 'Piece name', 'Nombre de la pieza')}</label>
        <input type="text" id="ce-c-id" data-k="id" value="${esc(e.id)}">
        ${campo(e, ['x', ['Da sinistra', 'From left', 'Desde la izquierda'], 'numero', -carta.larghezza, carta.larghezza * 2])}
        ${campo(e, ['y', ['Dall’alto', 'From top', 'Desde arriba'], 'numero', -carta.altezza, carta.altezza * 2])}
        ${(CAMPI[e.tipo] || []).map((c) => campo(e, c)).join('')}
        ${campo(e, ['spento', ['Nascosto', 'Hidden', 'Oculto'], 'sino'])}
      </div>
      ${haTesto ? `<p class="suggerimento">${L('Segnaposto:', 'Placeholders:', 'Marcadores:')} ${segna.map((k) => `<button type="button" class="ce-segna" data-segna="${esc(k)}">{${esc(k)}}</button>`).join(' ')}</p>` : ''}
      <p class="riga-flessibile spazio-sopra">
        <button type="button" class="btn secondario mini" data-fa="duplica">${L('Duplica', 'Duplicate', 'Duplicar')}</button>
        <button type="button" class="btn pericolo mini" data-fa="elimina">${L('Elimina', 'Delete', 'Eliminar')}</button>
      </p>`;
  }

  function tutto() { disegnaTela(); elenco(); ispettore(); }

  function cambia(chiave, valore, { subito = false } = {}) {
    const e = elSel();
    const dove = e || null;
    if (!subito) passo();
    if (!dove) {
      carta.fondo = normCarta({ ...carta, fondo: { ...carta.fondo, [chiave]: valore } }).fondo;
    } else if (chiave === 'id') {
      const nuovo = String(valore || '').trim().slice(0, 24) || dove.tipo;
      if (!carta.elementi.some((x) => x !== dove && x.id === nuovo)) { dove.id = nuovo; sel = nuovo; }
    } else {
      const grezzo = { ...dove, [chiave]: valore };
      const pulito = normElemento(grezzo, carta.larghezza, carta.altezza);
      Object.assign(dove, pulito);
      sel = dove.id;
    }
    disegnaTela();
  }

  function aggiungi(tipo) {
    if (carta.elementi.length >= (vocab.massimo || 24)) return;
    passo();
    let n = 1;
    while (carta.elementi.some((x) => x.id === tipo + n)) n += 1;
    const e = normElemento({ tipo, id: tipo + n, x: Math.round(carta.larghezza / 2), y: Math.round(carta.altezza / 2) }, carta.larghezza, carta.altezza);
    carta.elementi.push(e);
    sel = e.id;
    tutto();
  }

  function sposta(id, verso) {
    const i = carta.elementi.findIndex((x) => x.id === id);
    const j = i + verso;
    if (i < 0 || j < 0 || j >= carta.elementi.length) return;
    passo();
    const [e] = carta.elementi.splice(i, 1);
    carta.elementi.splice(j, 0, e);
    tutto();
  }

  function aggancia(e, x, y, libero) {
    if (libero) return [x, y];
    const rette = { x: [carta.larghezza / 2], y: [carta.altezza / 2] };
    for (const a of carta.elementi) if (a !== e && !a.spento) { rette.x.push(a.x); rette.y.push(a.y); }
    const vicino = (v, elenco) => {
      let m = v, d = AGGANCIO;
      for (const r of elenco) if (Math.abs(r - v) < d) { d = Math.abs(r - v); m = r; }
      return m;
    };
    return [vicino(x, rette.x), vicino(y, rette.y)];
  }

  disegno.addEventListener('pointerdown', (ev) => {
    const g = ev.target.closest('g[data-el]');
    const id = g ? g.dataset.el : null;
    if (id !== sel) { sel = id; elenco(); ispettore(); riquadro(); }
    const e = elSel();
    if (!e) return;
    passo();
    const r = foglio.getBoundingClientRect();
    trascino = { id: e.id, dx: (ev.clientX - r.left) / scala - e.x, dy: (ev.clientY - r.top) / scala - e.y, x0: e.x, y0: e.y, mosso: false };
    disegno.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });

  disegno.addEventListener('pointermove', (ev) => {
    if (!trascino) return;
    const e = carta.elementi.find((x) => x.id === trascino.id);
    if (!e) return;
    const r = foglio.getBoundingClientRect();
    const fine = ev.ctrlKey || ev.metaKey ? 0.25 : 1;
    let x = trascino.x0 + ((ev.clientX - r.left) / scala - trascino.dx - trascino.x0) * fine;
    let y = trascino.y0 + ((ev.clientY - r.top) / scala - trascino.dy - trascino.y0) * fine;
    if (ev.shiftKey) { if (Math.abs(x - trascino.x0) > Math.abs(y - trascino.y0)) y = trascino.y0; else x = trascino.x0; }
    [x, y] = aggancia(e, Math.round(x), Math.round(y), ev.altKey);
    if (x !== e.x || y !== e.y) { e.x = x; e.y = y; trascino.mosso = true; disegnaTela(); }
  });

  const finisci = () => {
    if (!trascino) return;
    if (!trascino.mosso) passato.pop();
    trascino = null;
    ispettore();
  };
  disegno.addEventListener('pointerup', finisci);
  disegno.addEventListener('pointercancel', finisci);
  disegno.addEventListener('dblclick', () => { const e = elSel(); if (!e) return; passo(); e.x = Math.round(carta.larghezza / 2); e.y = Math.round(carta.altezza / 2); tutto(); });

  velo.addEventListener('input', (ev) => {
    const t = ev.target;
    const k = t.dataset.k;
    if (!k) return;
    const v = t.type === 'checkbox' ? t.checked : t.value;
    cambia(k, v, { subito: t.dataset.corso === '1' });
    t.dataset.corso = '1';
    if (t.type === 'color') { const gemello = t.parentElement.querySelector('[data-testo]'); if (gemello) gemello.value = t.value; }
    if (t.type === 'range' || t.type === 'number') {
      const g = t.parentElement.querySelector(t.type === 'range' ? 'input[type=number]' : 'input[type=range]');
      if (g) g.value = t.value;
    }
  });
  velo.addEventListener('change', (ev) => { if (ev.target.dataset.k) ev.target.dataset.corso = ''; });

  velo.addEventListener('click', async (ev) => {
    const t = ev.target;
    const occhio = t.closest('[data-occhio]');
    if (occhio) { const e = carta.elementi.find((x) => x.id === occhio.dataset.occhio); if (e) { passo(); e.spento = !e.spento; tutto(); } return; }
    if (t.closest('[data-su]')) { sposta(t.closest('[data-su]').dataset.su, -1); return; }
    if (t.closest('[data-giu]')) { sposta(t.closest('[data-giu]').dataset.giu, 1); return; }
    const voce = t.closest('[data-voce]');
    if (voce) { sel = voce.dataset.voce; elenco(); ispettore(); riquadro(); return; }
    const nuovo = t.closest('[data-nuovo]');
    if (nuovo) { aggiungi(nuovo.dataset.nuovo); return; }
    const segna = t.closest('[data-segna]');
    if (segna) {
      const e = elSel(); if (!e) return;
      passo();
      e.testo = String(e.testo || '') + '{' + segna.dataset.segna + '}';
      Object.assign(e, normElemento(e, carta.larghezza, carta.altezza));
      tutto();
      return;
    }
    const fa = t.closest('[data-fa]');
    if (!fa) return;
    const che = fa.dataset.fa;
    if (che === 'annulla') annulla();
    else if (che === 'rifai') rifai();
    else if (che === 'duplica') {
      const e = elSel(); if (!e) return;
      passo();
      let n = 2;
      while (carta.elementi.some((x) => x.id === e.id + '-' + n)) n += 1;
      const copia = normElemento({ ...e, id: e.id + '-' + n, x: e.x + 16, y: e.y + 16 }, carta.larghezza, carta.altezza);
      carta.elementi.push(copia); sel = copia.id; tutto();
    } else if (che === 'elimina') {
      const e = elSel(); if (!e) return;
      passo();
      carta.elementi = carta.elementi.filter((x) => x !== e);
      sel = null; tutto();
    } else if (che === 'salva') {
      fa.disabled = true;
      try { await salva(carta); chiudi(true); } finally { fa.disabled = false; }
    } else if (che === 'chiudi') chiudi();
  });

  function tasti(ev) {
    if (ev.target.matches('input, textarea, select')) {
      if (ev.key === 'Escape') ev.target.blur();
      return;
    }
    const e = elSel();
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (ev.shiftKey) rifai(); else annulla(); return; }
    if (ev.key === 'Escape') { ev.preventDefault(); chiudi(); return; }
    if (!e) return;
    const p = ev.shiftKey ? 10 : 1;
    const mosse = { ArrowLeft: [-p, 0], ArrowRight: [p, 0], ArrowUp: [0, -p], ArrowDown: [0, p] };
    if (mosse[ev.key]) {
      ev.preventDefault(); passo();
      e.x += mosse[ev.key][0]; e.y += mosse[ev.key][1];
      Object.assign(e, normElemento(e, carta.larghezza, carta.altezza));
      disegnaTela(); ispettore(); return;
    }
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      ev.preventDefault(); passo();
      carta.elementi = carta.elementi.filter((x) => x !== e); sel = null; tutto();
    }
  }

  function chiudi(salvato) {
    if (!salvato && JSON.stringify(carta) !== partenza
      && !confirm(L('Hai cambiato la locandina e non l’hai salvata. Chiudo lo stesso?', 'You changed the poster and did not save. Close anyway?', 'Has cambiado el cartel y no lo has guardado. ¿Cierro igualmente?'))) return;
    document.removeEventListener('keydown', tasti, true);
    window.removeEventListener('resize', suMisura);
    document.body.classList.remove('ce-aperto');
    velo.remove();
    if (aggiorna) aggiorna();
  }

  const suMisura = () => { misura(); riquadro(); };
  document.addEventListener('keydown', tasti, true);
  window.addEventListener('resize', suMisura);
  tutto();
  requestAnimationFrame(suMisura);
  return { chiudi };
}
