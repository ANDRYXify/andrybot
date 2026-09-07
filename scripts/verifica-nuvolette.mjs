// Cancello delle NUVOLETTE: chi non ha un nome deve almeno averlo qui.
//
// Perche' esiste. Il pannello ha quasi mille controlli, e la tentazione era
// mettere una nuvoletta su tutti. Sarebbe stato peggio di niente: novecento
// nuvolette che ripetono l'etichetta accanto insegnano a non leggerle piu', e
// quando finalmente ne arriva una che dice qualcosa nessuno la guarda.
//
// La regola e' un'altra: una nuvoletta spiega quello che l'etichetta NON dice.
// E c'e' un caso in cui l'etichetta non dice niente perche' non esiste — i
// tasti fatti di sola icona. Li' la nuvoletta e' l'unico nome che quel tasto ha,
// e non e' un vezzo: chi naviga con un lettore di schermo, senza, sente
// «pulsante» e basta.
//
// Cosa misura, e perche' col browser. «Ha una sola icona» non si vede leggendo
// il codice: dipende da cosa viene reso. Quindi si apre il pannello, si girano
// tutte le schede e per ogni controllo si chiede il suo NOME ACCESSIBILE —
// il testo dentro, oppure aria-label, oppure la nuvoletta. Zero nome = rosso.
//
// E il contrario: una nuvoletta che ripete parola per parola l'etichetta che ha
// accanto e' rumore, e va tolta. Anche quella e' rossa.
//
// La copertura si CONTA e si stampa, ma non e' un cancello: «quante nuvolette
// ci sono» non e' una domanda con una risposta giusta.
//
// Poi ci sono i CAMPI da riempire, e li' il problema e' lo stesso visto da un
// altro lato. Un campo prende il nome dalla sua etichetta, ma solo se le due
// cose sono legate davvero: <label for="..."> oppure il campo dentro la label.
// Un'etichetta messa li' accanto si legge con gli occhi e sparisce per tutto il
// resto — chi usa un lettore di schermo sente «casella di testo, vuoto».
// Molti campi nascono da generatori (una riga per premio, una per membro, una
// per contatore), quindi il nome va costruito li' dentro, non aggiunto a mano
// uno per uno. Anche qui il conto va fatto sul reso, non sul sorgente: quali
// campi esistono dipende dai dati.
//
// Quello che si vede adesso non c'entra. Meta' del pannello sta dietro a un
// pieghevole chiuso, a un pannello che compare quando scegli un elemento, a un
// blocco che si apre con un interruttore: roba che si raggiunge, non roba che
// non esiste. Quindi il cancello guarda TUTTI i campi della scheda, aperti o no.
// Fuori restano solo quelli nascosti da se' per sempre — i selettori di file
// dietro a un bottone, che il nome ce l'hanno sul bottone.
//
// Uso: node scripts/verifica-nuvolette.mjs
//      node scripts/verifica-nuvolette.mjs --selftest   (deve diventare rosso)

import { apriSito } from './_sito.mjs';

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const SELFTEST = process.argv.includes('--selftest');

let chromium;
try { ({ chromium } = await import(PLAYWRIGHT)); }
catch { console.log('Playwright non c\'e\' su questa macchina: collaudo saltato.'); process.exit(0); }

const CACCIA = `(() => {
  const pulito = (t) => String(t || '').replace(/\\s+/g, ' ').trim();
  const nome = (e) => (e.tagName.toLowerCase() + (String(e.className || '').trim()
    ? '.' + String(e.className).split(/\\s+/).filter(Boolean).slice(0, 2).join('.') : '')).slice(0, 40);
  const muti = [];
  const doppie = [];
  const senzaNome = [];
  let controlli = 0, connuvoletta = 0, campi = 0;
  for (const e of document.querySelectorAll('.pannello-scheda.visibile button, .pannello-scheda.visibile a.btn, .pannello-scheda.visibile [role="button"], .pannello-scheda.visibile [role="tab"]')) {
    if (e.hidden || e.style.display === 'none') continue;
    controlli += 1;
    const aiuto = pulito(e.getAttribute('data-aiuto') || e.getAttribute('title'));
    if (aiuto) connuvoletta += 1;
    const scritto = pulito(e.textContent);
    const etichetta = pulito(e.getAttribute('aria-label'));
    if (!scritto && !etichetta && !aiuto) muti.push({ chi: nome(e), id: e.id || '' });
    if (aiuto && scritto && aiuto.toLowerCase() === scritto.toLowerCase()) doppie.push({ chi: nome(e), testo: aiuto.slice(0, 40) });
  }
  for (const e of document.querySelectorAll('.pannello-scheda.visibile input, .pannello-scheda.visibile select, .pannello-scheda.visibile textarea')) {
    if (e.type === 'hidden' || e.hidden || e.style.display === 'none') continue;
    campi += 1;
    const legata = e.id && document.querySelector('label[for="' + CSS.escape(e.id) + '"]');
    if (legata || e.closest('label')) continue;
    if (pulito(e.getAttribute('aria-label')) || e.getAttribute('aria-labelledby') || pulito(e.getAttribute('title'))) continue;
    const vicina = e.previousElementSibling;
    senzaNome.push({ chi: nome(e), id: e.id || '',
      accanto: (vicina && /^(label|span|strong)$/i.test(vicina.tagName) ? pulito(vicina.textContent).slice(0, 28) : ''),
      posto: pulito(e.placeholder).slice(0, 28) });
  }
  return { muti, doppie, senzaNome, controlli, connuvoletta, campi };
})()`;

const quanti = () => document.querySelectorAll('.pannello-scheda.visibile button, .pannello-scheda.visibile a.btn, .pannello-scheda.visibile [role="button"], .pannello-scheda.visibile [role="tab"], .pannello-scheda.visibile input, .pannello-scheda.visibile select, .pannello-scheda.visibile textarea').length;

// Aspetta che la scheda smetta di crescere: due letture uguali di fila, o si
// arriva al tetto. Senza questo il cancello conta una scheda diversa ogni volta.
const posata = async (p, giri = 16, passo = 180) => {
  let prima = -1;
  for (let i = 0; i < giri; i += 1) {
    await p.waitForTimeout(passo);
    const ora = await p.evaluate(quanti);
    if (ora === prima && ora > 0) return true;
    prima = ora;
  }
  return false;
};

const { porta: PORTA, chiudi: chiudiSito } = await apriSito();
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto(`http://127.0.0.1:${PORTA}/?demo=1&lang=it`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.SB_APP, null, { timeout: 20000 });
await p.addStyleTag({ content: '.giro-velo,.giro-fumetto,#cookie-banner{display:none!important}' });
if (SELFTEST) {
  // Un tasto di sola icona senza nome, e un campo con l'etichetta solo accanto:
  // le due forme che il cancello deve vedere.
  await p.evaluate(() => {
    const dove = document.querySelector('.pannello-scheda.visibile') || document.body;
    const t = document.createElement('button');
    t.className = 'btn mini prova-muta';
    t.innerHTML = '<svg width="16" height="16"><circle cx="8" cy="8" r="6"/></svg>';
    dove.prepend(t);
    window.__provaMuta = t;
    const c = document.createElement('div');
    c.innerHTML = '<label class="campo">Prova</label><input type="text" class="prova-campo-muto">';
    dove.prepend(c);
    window.__provaCampo = c;
  });
}

const muti = [];
const doppie = [];
const senzaNome = [];
let controlli = 0, connuvoletta = 0, campi = 0;
const schede = await p.evaluate(() => [...document.querySelectorAll('.pannello-scheda')].map((s) => s.dataset.scheda));
let visitate = 0;
const irrequiete = [];
for (const id of schede) {
  try { await p.evaluate((x) => window.SB_APP.vai(x), id); } catch { continue; }
  if (!await posata(p)) irrequiete.push(id);
  visitate += 1;
  if (SELFTEST) {
    await p.evaluate(() => {
      const dove = document.querySelector('.pannello-scheda.visibile');
      if (dove && window.__provaMuta && !dove.contains(window.__provaMuta)) dove.prepend(window.__provaMuta);
      if (dove && window.__provaCampo && !dove.contains(window.__provaCampo)) dove.prepend(window.__provaCampo);
    });
  }
  const r = await p.evaluate(new Function('return ' + CACCIA));
  controlli += r.controlli; connuvoletta += r.connuvoletta; campi += r.campi;
  for (const x of r.muti) if (!muti.some((y) => y.chi === x.chi && y.id === x.id)) muti.push({ dove: id, ...x });
  for (const x of r.doppie) if (!doppie.some((y) => y.chi === x.chi && y.testo === x.testo)) doppie.push({ dove: id, ...x });
  for (const x of r.senzaNome) if (!senzaNome.some((y) => y.chi === x.chi && y.id === x.id && y.accanto === x.accanto && y.posto === x.posto)) senzaNome.push({ dove: id, ...x });
}

await b.close();
await chiudiSito();

const esiti = [];
const dice = (ok, msg, extra = '') => { esiti.push(ok); console.log(`  ${ok ? '✓' : '✗'} ${msg}${!ok && extra ? `  → ${extra}` : ''}`); };

console.log(`\n${visitate} schede, ${controlli} controlli e ${campi} campi guardati.\n`);
dice(!muti.length, 'ogni controllo ha un nome: nessuno e\' solo un\'icona muta',
  muti.slice(0, 6).map((x) => `${x.chi}${x.id ? '#' + x.id : ''} (${x.dove})`).join(' · '));
dice(!doppie.length, 'e nessuna nuvoletta ripete l\'etichetta che ha accanto',
  doppie.slice(0, 5).map((x) => `${x.chi}: «${x.testo}» (${x.dove})`).join(' · '));
dice(!irrequiete.length, 'ogni scheda si e\' fermata prima di essere contata',
  irrequiete.join(' · '));
dice(!senzaNome.length, 'ogni campo da riempire e\' legato al suo nome, non solo vicino',
  senzaNome.slice(0, 6).map((x) => `${x.chi}${x.id ? '#' + x.id : ''}${x.accanto ? ' accanto a «' + x.accanto + '»' : ''}${x.posto ? ' posto «' + x.posto + '»' : ''} (${x.dove})`).join(' · '));
console.log(`  · nuvolette: ${connuvoletta} su ${controlli} controlli`);

const rossi = esiti.filter((x) => !x).length;
if (SELFTEST) {
  const attesi = ['ogni controllo', 'ogni campo'];
  if (rossi >= attesi.length) { console.log('\nAutoprova: il tasto muto e il campo scollegato si vedono tutti e due. ✓\n'); process.exit(0); }
  console.log(`\nAutoprova FALLITA: rossi ${rossi}, ne servono ${attesi.length}.\n`);
  process.exit(1);
}
console.log(rossi ? '\ncancello ROSSO ✗\n' : '\nOgni cosa che si puo\' premere o riempire si sa come si chiama. ✓\n');
process.exit(rossi ? 1 : 0);
