// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

const $ = (id) => document.getElementById(id);
const euro = (c) => (Math.round(c) / 100).toFixed(2).replace('.', ',').replace(/,00$/, '');

let scelto = 0;
let limiti = { min: 100, max: 50000 };

function dici(testo, male) {
  const m = $('msg');
  m.className = 'msg' + (male ? ' err' : '');
  m.textContent = testo || '';
}

function segna(cent) {
  scelto = cent;
  for (const b of document.querySelectorAll('#cifre button')) {
    b.classList.toggle('on', Number(b.dataset.cent) === cent);
  }
  if (cent) $('altro').value = '';
  dici('');
  etichetta();
}

function etichetta() {
  const c = scelto || centesimiScritti();
  $('vai').textContent = c ? `Dai ${euro(c)} €` : 'Dai una mano';
}

function centesimiScritti() {
  const n = Number(String($('altro').value || '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return 0;
  const c = Math.round(n * 100);
  return c >= limiti.min && c <= limiti.max ? c : 0;
}

async function prepara() {
  const ok = new URLSearchParams(location.search).get('ok');
  if (ok && ok !== 'annullato') return aspettaEsito(ok);

  let d = null;
  try { d = await (await fetch('/api/sostieni')).json(); } catch { d = null; }
  if (!d || !d.attivo) { $('spento').hidden = false; return; }
  limiti = { min: d.min, max: d.max };
  $('cifre').innerHTML = (d.importi || []).map((c) =>
    `<button type="button" data-cent="${c}">${euro(c)} €</button>`).join('');
  $('modulo').hidden = false;
  if (ok === 'annullato') dici('Non è partito niente. Se cambi idea, sono qui.');

  $('cifre').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cent]');
    if (b) segna(Number(b.dataset.cent));
  });
  $('altro').addEventListener('input', () => segna(0));
  $('vai').addEventListener('click', manda);
}

async function manda() {
  const cent = scelto || centesimiScritti();
  if (!cent) {
    dici(`Scegli quanto: da ${euro(limiti.min)} a ${euro(limiti.max)} euro.`, true);
    return;
  }
  const b = $('vai');
  b.disabled = true;
  dici('Un attimo…');
  try {
    const r = await fetch('/api/sostieni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importo: cent / 100, nome: $('nome').value, messaggio: $('messaggio').value }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.url) throw new Error(d.errore || 'Non si apre in questo momento.');
    location.href = d.url;
  } catch (e) {
    b.disabled = false;
    dici(e.message || 'Non si apre in questo momento.', true);
  }
}

async function aspettaEsito(id) {
  $('grazie').hidden = false;
  let d = null;
  try { d = await (await fetch('/api/sostieni/esito?id=' + encodeURIComponent(id))).json(); } catch { d = null; }
  if (d && d.stato === 'pagato') {
    $('grazie-testo').textContent = `Sono arrivati ${euro(d.importo)} €, e contano più di quanto sembri.`;
    return;
  }
  $('grazie-testo').textContent = 'Se il pagamento è andato a buon fine lo vedo lo stesso, anche se questa pagina non lo sa ancora.';
}

prepara();
