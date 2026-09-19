// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


const $ = (id) => document.getElementById(id);
const canale = decodeURIComponent((location.pathname.split('/')[2] || '')).toLowerCase().replace(/[^a-z0-9_]/g, '');
const parametri = new URLSearchParams(location.search);

function dici(testo, male) {
  const m = $('msg');
  m.className = 'msg' + (male ? ' err' : '');
  m.textContent = testo || '';
}

function mostraCodice(codice, dentro) {
  $('codice').textContent = '!discord ' + codice;
  $('dentro').hidden = !dentro;
  $('fatto').hidden = false;
  $('btn').hidden = true;
  $('scelta').hidden = true;
  $('passi').hidden = true;
  dici('');
}

async function prepara() {
  if (canale) $('canale').textContent = canale;
  if (parametri.get('esito') === 'no') {
    dici('Non ha funzionato. Riprova da qui.', true);
  }
  const codice = (parametri.get('codice') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (codice) { mostraCodice(codice, parametri.get('dentro') === '1'); return; }
  if (!canale) { dici('Manca il nome del canale nell’indirizzo.', true); return; }
  let d = null;
  try {
    const r = await fetch('/api/discord/collega/' + encodeURIComponent(canale));
    d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.errore || 'non si può adesso');
  } catch (e) {
    dici(e.message || 'Non si può collegare adesso.', true);
    return;
  }
  const btn = $('btn');
  btn.hidden = false;
  $('scelta').hidden = false;
  if (canale) $('via').href = '/u/' + encodeURIComponent(canale);
  btn.addEventListener('click', () => { btn.disabled = true; location.href = d.url; });
}

prepara();
