// AndryBot — logica della dashboard (single-page, zero dipendenze).
// Stato globale caricato da GET /api/me, funzioni di render per sezione,
// fetch con gestione errori e toast di conferma.

'use strict';

// ------------------------------------------------------------------ stato
let stato = null;          // risposta di /api/me
let schedaAttiva = 'stato';

const app = document.getElementById('app');
const areaUtente = document.getElementById('area-utente');

// ------------------------------------------------------------------ utilità

// escape HTML: tutto ciò che viene dal server/utente passa da qui
function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function dataIt(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return new Date(n).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

// notifica a scomparsa
function toast(msg, tipo = 'ok') {
  const box = document.getElementById('toast-box');
  const el = document.createElement('div');
  el.className = 'toast' + (tipo === 'errore' ? ' errore' : '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// fetch verso le API: JSON in/out, errori → eccezione con messaggio leggibile
async function api(percorso, opzioni = {}) {
  const opts = { headers: {}, ...opzioni };
  if (opts.body !== undefined && typeof opts.body !== 'string') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(percorso, opts);
  let dati = null;
  try { dati = await res.json(); } catch { /* risposta non JSON */ }
  if (!res.ok) throw new Error(dati?.errore || `errore ${res.status}`);
  return dati;
}

// impostazioni correnti con i valori di default del bot
function impostazioni() {
  const s = stato?.streamer?.settings || {};
  return {
    tono: ['scherzoso', 'amichevole', 'serio'].includes(s.tono) ? s.tono : 'scherzoso',
    spontaneita: typeof s.spontaneita === 'number' ? s.spontaneita : 0.03,
    rispostaMenzioni: s.rispostaMenzioni !== false,
    frasi: Array.isArray(s.frasi) ? s.frasi : [],
    clipAuto: s.clipAuto !== false,
    clipAutoSoglia: typeof s.clipAutoSoglia === 'number' ? s.clipAutoSoglia : 25,
    paroleVietate: Array.isArray(s.paroleVietate) ? s.paroleVietate : [],
  };
}

// salva un sottoinsieme di impostazioni e aggiorna lo stato locale
async function salvaImpostazioni(parziale, msgOk = 'Impostazioni salvate 💜') {
  await api('/api/streamer/impostazioni', { method: 'POST', body: parziale });
  if (stato?.streamer) {
    stato.streamer.settings = { ...(stato.streamer.settings || {}), ...parziale };
  }
  toast(msgOk);
}

// ------------------------------------------------------------------ avvio

async function caricaStato() {
  try {
    stato = await api('/api/me');
  } catch (e) {
    app.innerHTML = `<div class="carta"><h2>Ops!</h2><p>Impossibile contattare il server: ${esc(e.message)}</p></div>`;
    return;
  }
  render();
}

// ------------------------------------------------------------------ render principale

function render() {
  renderAreaUtente();

  if (!stato.user) { renderHero(); return; }

  let html = '';
  const st = stato.streamer;

  if (!st) {
    html += vistaRichiesta();
  } else if (st.status === 'pending') {
    html += vistaPending();
  } else if (st.status === 'disabled') {
    html += vistaDisabilitato();
  } else if (st.status === 'approved') {
    html += vistaPiattaforma();
  }

  if (stato.isAdmin) html += vistaAdmin();

  app.innerHTML = html;

  if (st?.status === 'approved') attivaPiattaforma();
  if (stato.isAdmin) caricaTabellaAdmin();
}

function renderAreaUtente() {
  if (!stato.user) { areaUtente.innerHTML = ''; return; }
  areaUtente.innerHTML = `
    <span class="chip-utente">ciao, <strong>${esc(stato.user.display)}</strong></span>
    <a class="btn secondario mini" href="/auth/logout">Esci</a>`;
}

// ------------------------------------------------------------------ viste "semplici"

function renderHero() {
  const errore = new URLSearchParams(location.search).get('errore');
  const msgErrore = {
    'access_denied': 'Hai annullato l’accesso su Twitch.',
    'state': 'Sessione di accesso scaduta, riprova.',
    'validazione': 'Twitch non ha confermato il tuo accesso, riprova.',
    'account-diverso': 'Hai autorizzato un account diverso da quello con cui sei loggato: usa lo stesso account.',
  }[errore] || (errore ? `Errore di accesso: ${errore}` : null);

  app.innerHTML = `
    ${msgErrore ? `<div class="carta avviso"><p>⚠️ ${esc(msgErrore)}</p></div>` : ''}
    <div class="carta hero">
      <h2>Il bot Twitch che parla <em>con la tua voce</em></h2>
      <p>AndryBot vive nella tua chat e scrive <strong class="primo-piano">con il tuo account</strong>:
      niente account bot anonimi, sei sempre tu.</p>
      <ul class="lista-punti">
        <li>Impara dalla tua chat e dal tuo profilo su andryxify.it</li>
        <li>Si pre-addestra da solo al primo accesso: conosce già te e i tuoi contenuti</li>
        <li>Crea clip automatiche nei momenti di hype</li>
        <li>Comandi personalizzati, battute tue, tono a tua scelta</li>
        <li>Cresce nel tempo: più lo usi, più diventa "tuo"</li>
      </ul>
      <a class="btn grande" href="/auth/login">Accedi con Twitch</a>
      <p class="nota">🔒 Riservato agli streamer verificati e abilitati da andryxify.</p>
    </div>`;
}

function vistaRichiesta() {
  return `
    <div class="carta evidenziata">
      <h2>Porta AndryBot nel tuo canale 🚀</h2>
      <p>Chiedi l'abilitazione: andryxify riceverà la tua richiesta e, una volta approvata,
      potrai configurare il tuo bot da qui.</p>
      <p class="spazio-sopra">
        <button class="btn grande" id="btn-richiesta">Richiedi AndryBot</button>
      </p>
    </div>`;
}

function vistaPending() {
  return `
    <div class="carta">
      <h2>Richiesta inviata! ⏳</h2>
      <p>andryxify deve approvarti. Torna qui più tardi: quando sarai abilitato
      troverai la tua dashboard completa.</p>
    </div>`;
}

function vistaDisabilitato() {
  return `
    <div class="carta">
      <h2>Accesso disabilitato 😴</h2>
      <p>Il tuo accesso ad AndryBot è al momento disabilitato da andryxify.
      Se pensi sia un errore, contattalo.</p>
    </div>`;
}

// ------------------------------------------------------------------ piattaforma streamer

function vistaPiattaforma() {
  const schede = [
    ['stato', 'Stato'],
    ['personalita', 'Personalità'],
    ['conoscenza', 'Conoscenza'],
    ['clip', 'Clip'],
    ['effetti', 'Effetti & Suoni'],
    ['regole', 'Regole'],
    ['memoria', 'Memoria & Statistiche'],
  ];
  return `
    <nav class="schede" id="nav-schede">
      ${schede.map(([id, nome]) =>
        `<button class="scheda-btn${id === schedaAttiva ? ' attiva' : ''}" data-scheda="${id}">${nome}</button>`).join('')}
    </nav>
    ${pannelloStato()}
    ${pannelloPersonalita()}
    ${pannelloConoscenza()}
    ${pannelloClip()}
    ${pannelloEffetti()}
    ${pannelloRegole()}
    ${pannelloMemoria()}`;
}

function pannello(id, contenuto) {
  return `<section class="pannello-scheda${id === schedaAttiva ? ' visibile' : ''}" id="scheda-${id}">${contenuto}</section>`;
}

// --- scheda Stato -------------------------------------------------------

function pannelloStato() {
  const login = stato.user.login;
  const inChat = (stato.status?.channels || []).includes(login);
  const pre = stato.preaddestramento || {};

  const cardPermessi = stato.permessiOk ? '' : `
    <div class="carta evidenziata">
      <h2>Attiva il bot: concedi i permessi 🔑</h2>
      <p>Per funzionare, AndryBot <strong class="primo-piano">leggerà e scriverà nella tua chat
      con il tuo account</strong>, creerà clip e vedrà follow e sub. Nient'altro.</p>
      <p class="spazio-sopra"><a class="btn grande" href="/auth/permessi">Concedi i permessi su Twitch</a></p>
    </div>`;

  return pannello('stato', `
    ${cardPermessi}
    <div class="carta">
      <h2>Il tuo bot</h2>
      <div class="riga-interruttore spazio-sopra">
        <label class="interruttore">
          <input type="checkbox" id="toggle-bot" ${stato.streamer.botEnabled ? 'checked' : ''}>
          <span class="levetta"></span>
        </label>
        <span class="etichetta-stato" id="etichetta-bot">${stato.streamer.botEnabled ? 'Bot acceso' : 'Bot spento'}</span>
        ${inChat
          ? '<span class="badge verde">● in chat adesso</span>'
          : '<span class="badge">○ non connesso</span>'}
        ${stato.permessiOk ? '<span class="badge viola">permessi ok</span>' : '<span class="badge rosso">permessi mancanti</span>'}
      </div>
      <p class="suggerimento spazio-sopra">Spegnerlo non cancella nulla: quando lo riaccendi riparte da dove era rimasto.</p>
    </div>
    <div class="carta">
      <h2>Pre-addestramento 📚</h2>
      <p>AndryBot legge il tuo profilo su andryxify.it per conoscerti prima ancora di entrare in chat.</p>
      <p class="spazio-sopra">
        Ultima lettura: <strong class="primo-piano">${esc(dataIt(pre.preaddestramento_ts))}</strong>
        ${pre.preaddestramento_esito ? ` — <span class="badge viola">${esc(pre.preaddestramento_esito)}</span>` : ''}
        — voci di conoscenza: <strong class="primo-piano">${stato.knowledgeCount}</strong>
      </p>
      <p class="spazio-sopra">
        <button class="btn secondario" id="btn-pretrain">Ri-leggi il mio profilo andryxify.it</button>
        <span id="esito-pretrain" class="suggerimento"></span>
      </p>
    </div>`);
}

// --- scheda Personalità -------------------------------------------------

function pannelloPersonalita() {
  const s = impostazioni();
  const perc = Math.round(s.spontaneita * 100);
  return pannello('personalita', `
    <div class="carta">
      <h2>Personalità 🎭</h2>
      <p>Decidi come parla il bot: ricorda che in chat appare <strong class="primo-piano">a nome tuo</strong>.</p>

      <label class="campo" for="sel-tono">Tono</label>
      <select id="sel-tono">
        <option value="scherzoso" ${s.tono === 'scherzoso' ? 'selected' : ''}>Scherzoso — battute e ironia</option>
        <option value="amichevole" ${s.tono === 'amichevole' ? 'selected' : ''}>Amichevole — caloroso e tranquillo</option>
        <option value="serio" ${s.tono === 'serio' ? 'selected' : ''}>Serio — sobrio e diretto</option>
      </select>

      <label class="campo" for="rng-spontaneita">Spontaneità: <span id="val-spontaneita">${perc}%</span></label>
      <input type="range" id="rng-spontaneita" min="0" max="30" step="1" value="${perc}">
      <p class="suggerimento">Quanto spesso interviene da solo, senza che nessuno lo chiami. 0% = solo se interpellato.</p>

      <div class="riga-check">
        <input type="checkbox" id="chk-menzioni" ${s.rispostaMenzioni ? 'checked' : ''}>
        <label for="chk-menzioni">Rispondi quando mi nominano in chat</label>
      </div>

      <label class="campo" for="txt-frasi">Le tue frasi / battute (una per riga)</label>
      <textarea id="txt-frasi" placeholder="es. GG raga, si vola!&#10;chi non segue il canale paga da bere">${esc(s.frasi.join('\n'))}</textarea>
      <p class="suggerimento">Il bot le userà ogni tanto per suonare davvero come te. Max 50 frasi da 200 caratteri.</p>

      <p class="spazio-sopra"><button class="btn" id="btn-salva-personalita">Salva</button></p>
    </div>`);
}

// --- scheda Conoscenza --------------------------------------------------

function pannelloConoscenza() {
  return pannello('conoscenza', `
    <div class="carta">
      <h2>Insegnagli qualcosa ✍️</h2>
      <p>Domanda (o parole chiave) e risposta: quando in chat spunta l'argomento, il bot saprà cosa dire.</p>
      <label class="campo" for="inp-domanda">Domanda / parole chiave</label>
      <input type="text" id="inp-domanda" placeholder="es. che pc usi? / setup / configurazione">
      <label class="campo" for="inp-risposta">Risposta</label>
      <input type="text" id="inp-risposta" placeholder="es. Gioco su un Ryzen 7 con una 4070, trovi tutto su andryxify.it!">
      <p class="spazio-sopra"><button class="btn" id="btn-aggiungi-conoscenza">Aggiungi</button></p>
    </div>
    <div class="carta">
      <h2>Cosa sa il bot 🧠</h2>
      <p>🌐 dal sito &nbsp;·&nbsp; ✍️ tua &nbsp;·&nbsp; 💬 imparata dalla chat</p>
      <ul class="lista-voci" id="lista-conoscenza"><li class="vuoto">Caricamento…</li></ul>
    </div>`);
}

// --- scheda Clip --------------------------------------------------------

function pannelloClip() {
  const s = impostazioni();
  return pannello('clip', `
    <div class="carta">
      <h2>Clip automatiche 🎬</h2>
      <div class="riga-check">
        <input type="checkbox" id="chk-clip" ${s.clipAuto ? 'checked' : ''}>
        <label for="chk-clip">Crea clip da solo nei momenti di hype</label>
      </div>
      <label class="campo" for="num-soglia">Soglia di hype (messaggi al minuto)</label>
      <div class="riga-flessibile">
        <input type="number" id="num-soglia" min="5" max="200" value="${s.clipAutoSoglia}">
        <span class="suggerimento">Quando la chat supera questo ritmo, il bot capisce che sta succedendo
        qualcosa di bello e salva una clip. Più bassa = più clip.</span>
      </div>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-clip">Salva</button></p>
    </div>
    <div class="carta">
      <h2>Ultime clip</h2>
      <ul class="lista-voci" id="lista-clip"><li class="vuoto">Caricamento…</li></ul>
    </div>`);
}

// --- scheda Effetti & Suoni ---------------------------------------------

function pannelloEffetti() {
  return pannello('effetti', `
    <div class="carta">
      <h2>Overlay per OBS 🖥️</h2>
      <p>Aggiungi questo indirizzo in OBS come <strong class="primo-piano">Sorgenti → Browser</strong>,
      con larghezza <strong class="primo-piano">1920</strong>, altezza <strong class="primo-piano">1080</strong> e sfondo trasparente.</p>
      <div class="riga-flessibile spazio-sopra">
        <input type="text" id="inp-overlay-url" class="campo-largo" readonly value="" placeholder="caricamento…">
        <button class="btn secondario" id="btn-copia-overlay">Copia</button>
      </div>
      <p class="suggerimento">Tienilo per te: chi ha questo link può far comparire effetti nel tuo overlay.</p>
    </div>

    <div class="carta">
      <h2>Carica un effetto ✨</h2>
      <p>Audio, immagini o brevi video. Ogni file viene <strong class="primo-piano">super-compresso</strong>
      in automatico, così l'overlay resta leggero.</p>

      <label class="campo" for="eff-file">File (audio / immagine / video)</label>
      <input type="file" id="eff-file" accept="audio/*,image/*,video/*">

      <label class="campo" for="eff-comando">Comando in chat</label>
      <div class="riga-flessibile">
        <span class="prefisso-cmd">!</span>
        <input type="text" id="eff-comando" class="campo-largo" placeholder="airhorn" maxlength="24">
      </div>
      <p class="suggerimento">Solo lettere minuscole, numeri e "_". Chi lo scrive in chat fa partire l'effetto.</p>

      <div class="griglia-campi spazio-sopra">
        <div>
          <label class="campo" for="eff-tier">Chi può usarlo</label>
          <select id="eff-tier">
            <option value="tutti">Tutti</option>
            <option value="sub">Solo sub</option>
            <option value="vip">Solo VIP</option>
            <option value="mod">Solo mod</option>
          </select>
        </div>
        <div>
          <label class="campo" for="eff-cooldown">Cooldown (s)</label>
          <input type="number" id="eff-cooldown" min="0" max="3600" value="10">
        </div>
        <div>
          <label class="campo" for="eff-volume">Volume (%)</label>
          <input type="number" id="eff-volume" min="0" max="100" value="80">
        </div>
        <div>
          <label class="campo" for="eff-durata">Durata a schermo (ms)</label>
          <input type="number" id="eff-durata" min="500" max="15000" value="5000">
        </div>
      </div>
      <p class="spazio-sopra">
        <button class="btn" id="btn-carica-effetto">Carica effetto</button>
        <span id="esito-effetto" class="suggerimento"></span>
      </p>
    </div>

    <div class="carta">
      <h2>I tuoi effetti 🎛️</h2>
      <ul class="lista-voci" id="lista-effetti"><li class="vuoto">Caricamento…</li></ul>
    </div>`);
}

// --- scheda Regole ------------------------------------------------------

function pannelloRegole() {
  const s = impostazioni();
  return pannello('regole', `
    <div class="carta">
      <h2>Parole vietate 🚫</h2>
      <p>Una per riga. Il bot <strong class="primo-piano">non le dirà mai</strong> e richiama chi le usa in chat.</p>
      <label class="campo" for="txt-vietate">Elenco parole vietate</label>
      <textarea id="txt-vietate" placeholder="una parola per riga">${esc(s.paroleVietate.join('\n'))}</textarea>
      <p class="spazio-sopra"><button class="btn" id="btn-salva-regole">Salva</button></p>
    </div>`);
}

// --- scheda Memoria & Statistiche --------------------------------------

function pannelloMemoria() {
  return pannello('memoria', `
    <div class="carta">
      <h2>Statistiche degli ultimi 7 giorni 📊</h2>
      <div class="griglia-stat" id="griglia-stat"><div class="vuoto">Caricamento…</div></div>
      <h3>Top chatters</h3>
      <ul class="lista-voci" id="lista-chatters"><li class="vuoto">Caricamento…</li></ul>
    </div>
    <div class="carta">
      <h2>La memoria del bot 🧠</h2>
      <p>Le "lezioni" che ha imparato osservando la tua chat e i fatti stabili che ricorda sul canale.</p>
      <p class="spazio-sopra"><button class="btn secondario" id="btn-carica-memoria">Mostra la memoria</button></p>
      <div id="contenitore-memoria"></div>
      <hr class="separatore">
      <p><strong class="primo-piano">Zona pericolosa.</strong> Azzera lezioni, ricordi sugli utenti, fatti
      e conoscenza imparata dalla chat. La conoscenza dal sito e quella scritta da te restano.</p>
      <p class="spazio-sopra"><button class="btn pericolo" id="btn-reset">Azzera ciò che ha imparato</button></p>
    </div>`);
}

// ------------------------------------------------------------------ eventi della piattaforma

// aggancia tutti i listener dopo il render della vista "approved"
function attivaPiattaforma() {
  // navigazione a schede
  document.getElementById('nav-schede')?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-scheda]');
    if (!btn) return;
    schedaAttiva = btn.dataset.scheda;
    document.querySelectorAll('.scheda-btn').forEach((b) => b.classList.toggle('attiva', b === btn));
    document.querySelectorAll('.pannello-scheda').forEach((p) =>
      p.classList.toggle('visibile', p.id === 'scheda-' + schedaAttiva));
    caricaDatiScheda(schedaAttiva);
  });

  // interruttore acceso/spento
  document.getElementById('toggle-bot')?.addEventListener('change', async (ev) => {
    const acceso = ev.target.checked;
    try {
      await api('/api/streamer/toggle', { method: 'POST', body: { enabled: acceso } });
      stato.streamer.botEnabled = acceso;
      document.getElementById('etichetta-bot').textContent = acceso ? 'Bot acceso' : 'Bot spento';
      toast(acceso ? 'Bot acceso! 💜' : 'Bot spento.');
    } catch (e) {
      ev.target.checked = !acceso;
      toast('Errore: ' + e.message, 'errore');
    }
  });

  // pre-addestramento manuale con spinner e risultato
  document.getElementById('btn-pretrain')?.addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    const out = document.getElementById('esito-pretrain');
    btn.disabled = true;
    const testoOrig = btn.textContent;
    btn.textContent = 'Sto leggendo il tuo profilo… ⏳';
    out.textContent = '';
    try {
      const esito = await api('/api/streamer/preaddestra', { method: 'POST', body: {} });
      const riassunto = typeof esito === 'object' && esito
        ? (esito.esito || esito.messaggio || `voci: ${esito.voci ?? esito.count ?? '?'}`)
        : String(esito);
      out.textContent = '✅ Fatto! ' + riassunto;
      toast('Profilo riletto, conoscenza aggiornata 💜');
      // ricarica lo stato per aggiornare timestamp e contatore conoscenza
      stato = await api('/api/me');
      render();
    } catch (e) {
      out.textContent = '❌ ' + e.message;
      toast('Pre-addestramento fallito: ' + e.message, 'errore');
      btn.disabled = false;
      btn.textContent = testoOrig;
    }
  });

  // salvataggi per sezione
  document.getElementById('btn-salva-personalita')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      tono: document.getElementById('sel-tono').value,
      spontaneita: Number(document.getElementById('rng-spontaneita').value) / 100,
      rispostaMenzioni: document.getElementById('chk-menzioni').checked,
      frasi: righe(document.getElementById('txt-frasi').value),
    }, 'Personalità salvata 🎭');
  }));

  document.getElementById('btn-salva-clip')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      clipAuto: document.getElementById('chk-clip').checked,
      clipAutoSoglia: Number(document.getElementById('num-soglia').value),
    }, 'Impostazioni clip salvate 🎬');
  }));

  document.getElementById('btn-salva-regole')?.addEventListener('click', () => conErrore(async () => {
    await salvaImpostazioni({
      paroleVietate: righe(document.getElementById('txt-vietate').value),
    }, 'Regole salvate 🚫');
  }));

  // slider spontaneità: percentuale in tempo reale
  document.getElementById('rng-spontaneita')?.addEventListener('input', (ev) => {
    document.getElementById('val-spontaneita').textContent = ev.target.value + '%';
  });

  // conoscenza: aggiunta manuale
  document.getElementById('btn-aggiungi-conoscenza')?.addEventListener('click', () => conErrore(async () => {
    const domanda = document.getElementById('inp-domanda').value.trim();
    const risposta = document.getElementById('inp-risposta').value.trim();
    if (!domanda || !risposta) { toast('Compila domanda e risposta.', 'errore'); return; }
    await api('/api/streamer/knowledge', { method: 'POST', body: { domanda, risposta } });
    document.getElementById('inp-domanda').value = '';
    document.getElementById('inp-risposta').value = '';
    toast('Il bot ha imparato qualcosa di nuovo ✍️');
    caricaConoscenza();
  }));

  // copia URL overlay OBS
  document.getElementById('btn-copia-overlay')?.addEventListener('click', async () => {
    const inp = document.getElementById('inp-overlay-url');
    if (!inp?.value) { toast('URL non ancora pronto, riprova tra un attimo.', 'errore'); return; }
    try {
      await navigator.clipboard.writeText(inp.value);
      toast('URL dell\'overlay copiato 📋');
    } catch {
      inp.select();
      try { document.execCommand('copy'); toast('URL selezionato: premi Ctrl+C'); }
      catch { toast('Copia manualmente l\'URL selezionato.', 'errore'); }
    }
  });

  // caricamento di un effetto (multipart, con spinner)
  document.getElementById('btn-carica-effetto')?.addEventListener('click', caricaEffettoUpload);

  // memoria on-demand
  document.getElementById('btn-carica-memoria')?.addEventListener('click', () => caricaMemoria(true));

  // reset con conferma
  document.getElementById('btn-reset')?.addEventListener('click', () => conErrore(async () => {
    if (!confirm('Sicuro? Il bot dimenticherà lezioni, ricordi sugli utenti e conoscenza imparata dalla chat. Non si torna indietro.')) return;
    await api('/api/streamer/memoria/reset', { method: 'POST', body: {} });
    toast('Memoria azzerata. Il bot riparte da zero (ma la tua conoscenza resta).');
    document.getElementById('contenitore-memoria').innerHTML = '';
  }));

  // dati della scheda visibile al primo caricamento
  caricaDatiScheda(schedaAttiva);
}

// textarea → array di righe pulite
function righe(testo) {
  return String(testo || '').split('\n').map((r) => r.trim()).filter(Boolean);
}

// esegue un'azione async mostrando eventuali errori come toast
async function conErrore(fn) {
  try { await fn(); } catch (e) { toast('Errore: ' + e.message, 'errore'); }
}

// carica i dati "pigri" della scheda selezionata
function caricaDatiScheda(id) {
  if (id === 'conoscenza') caricaConoscenza();
  if (id === 'clip') caricaClip();
  if (id === 'effetti') caricaEffetti();
  if (id === 'memoria') caricaStatistiche();
}

// --- caricamenti dati ---------------------------------------------------

async function caricaConoscenza() {
  const ul = document.getElementById('lista-conoscenza');
  if (!ul) return;
  try {
    const voci = await api('/api/streamer/knowledge');
    if (!voci.length) { ul.innerHTML = '<li class="vuoto">Il bot non sa ancora niente: insegnagli qualcosa qui sopra!</li>'; return; }
    const badge = { auto: '🌐 dal sito', manuale: '✍️ tua', chat: '💬 dalla chat' };
    ul.innerHTML = voci.map((v) => `
      <li>
        <div class="testo-voce">
          <div class="domanda">${esc(v.domanda)}</div>
          <div class="risposta">${esc(v.risposta)}</div>
          <div class="meta"><span class="badge">${badge[v.fonte] || esc(v.fonte)}</span> · ${esc(dataIt(v.ts))}</div>
        </div>
        <button class="btn secondario mini" data-elimina="${v.id}">Elimina</button>
      </li>`).join('');
    // eliminazione singola voce (delega sull'elenco)
    ul.onclick = (ev) => {
      const btn = ev.target.closest('[data-elimina]');
      if (!btn) return;
      conErrore(async () => {
        await api('/api/streamer/knowledge/' + btn.dataset.elimina, { method: 'DELETE' });
        toast('Voce dimenticata.');
        caricaConoscenza();
      });
    };
  } catch (e) {
    ul.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`;
  }
}

async function caricaClip() {
  const ul = document.getElementById('lista-clip');
  if (!ul) return;
  try {
    const { clip } = await api('/api/streamer/memoria');
    if (!clip.length) { ul.innerHTML = '<li class="vuoto">Nessuna clip ancora: arriveranno nei momenti di hype!</li>'; return; }
    ul.innerHTML = clip.map((c) => `
      <li>
        <div class="testo-voce">
          <div class="domanda"><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.url || c.clip_id)}</a></div>
          <div class="meta">${esc(c.reason || '')} · ${esc(dataIt(c.ts))}</div>
        </div>
      </li>`).join('');
  } catch (e) {
    ul.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`;
  }
}

// --- effetti & suoni ----------------------------------------------------

async function caricaEffetti() {
  const ul = document.getElementById('lista-effetti');
  if (!ul) return;
  const inpUrl = document.getElementById('inp-overlay-url');
  try {
    const dati = await api('/api/streamer/effetti');
    if (inpUrl) inpUrl.value = dati.overlayUrl || '';

    const etTipo = { audio: '🔊 audio', immagine: '🖼️ immagine', video: '🎬 video' };
    const etTier = { tutti: 'tutti', sub: 'sub', vip: 'VIP', mod: 'mod' };

    if (!dati.effetti.length) {
      ul.innerHTML = '<li class="vuoto">Nessun effetto ancora: caricane uno qui sopra e provalo!</li>';
      return;
    }
    ul.innerHTML = dati.effetti.map((e) => `
      <li>
        <div class="testo-voce">
          <div class="domanda">!${esc(e.comando)} <span class="badge viola">${etTipo[e.tipo] || esc(e.tipo)}</span></div>
          <div class="meta">chi: ${esc(etTier[e.tier] || e.tier)} · cooldown ${e.cooldown}s · volume ${e.volume}% · ${e.durata}ms</div>
        </div>
        <div class="azioni-voce">
          <button class="btn secondario mini" data-prova="${esc(e.comando)}">Prova</button>
          <button class="btn pericolo mini" data-elimina-eff="${e.id}">Elimina</button>
        </div>
      </li>`).join('');

    // Prova / Elimina (delega sull'elenco)
    ul.onclick = (ev) => {
      const prova = ev.target.closest('[data-prova]');
      const del = ev.target.closest('[data-elimina-eff]');
      if (prova) {
        conErrore(async () => {
          await api('/api/streamer/effetti/test', { method: 'POST', body: { comando: prova.dataset.prova } });
          toast('Effetto inviato all\'overlay ✨ (aprilo per vederlo)');
        });
      } else if (del) {
        conErrore(async () => {
          if (!confirm('Eliminare questo effetto? Il file verrà cancellato.')) return;
          await api('/api/streamer/effetti/' + del.dataset.eliminaEff, { method: 'DELETE' });
          toast('Effetto eliminato 🗑️');
          caricaEffetti();
        });
      }
    };
  } catch (e) {
    ul.innerHTML = `<li class="vuoto">Errore: ${esc(e.message)}</li>`;
  }
}

// invio multipart del form di caricamento effetto (non passa da api(): usa FormData)
async function caricaEffettoUpload(ev) {
  const btn = ev.currentTarget;
  const out = document.getElementById('esito-effetto');
  const fileInput = document.getElementById('eff-file');
  const comando = document.getElementById('eff-comando').value.trim();
  const file = fileInput.files[0];
  if (out) out.textContent = '';

  if (!file) { toast('Scegli un file da caricare.', 'errore'); return; }
  if (!comando) { toast('Scrivi il comando (senza !).', 'errore'); return; }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('comando', comando);
  fd.append('tier', document.getElementById('eff-tier').value);
  fd.append('cooldown', document.getElementById('eff-cooldown').value);
  fd.append('volume', document.getElementById('eff-volume').value);
  fd.append('durata', document.getElementById('eff-durata').value);

  btn.disabled = true;
  const testoOrig = btn.textContent;
  btn.textContent = 'Comprimo e carico… ⏳';
  try {
    // niente header Content-Type: lo imposta il browser col boundary multipart
    const res = await fetch('/api/streamer/effetti', { method: 'POST', body: fd });
    let dati = null;
    try { dati = await res.json(); } catch { /* risposta non JSON */ }
    if (!res.ok) throw new Error(dati?.errore || `errore ${res.status}`);
    toast('Effetto caricato e compresso! ✨');
    fileInput.value = '';
    document.getElementById('eff-comando').value = '';
    caricaEffetti();
  } catch (e) {
    if (out) out.textContent = '❌ ' + e.message;
    toast('Caricamento fallito: ' + e.message, 'errore');
  } finally {
    btn.disabled = false;
    btn.textContent = testoOrig;
  }
}

async function caricaStatistiche() {
  const griglia = document.getElementById('griglia-stat');
  const chatters = document.getElementById('lista-chatters');
  if (!griglia) return;
  try {
    const s = await api('/api/streamer/statistiche');
    griglia.innerHTML = `
      <div class="stat"><div class="numero">${s.messaggi7g}</div><div class="etichetta">messaggi in chat (7g)</div></div>
      <div class="stat"><div class="numero">${s.messaggiBot7g}</div><div class="etichetta">interventi del bot (7g)</div></div>
      <div class="stat"><div class="numero">${s.clipTotali}</div><div class="etichetta">clip totali</div></div>`;
    chatters.innerHTML = s.topChatters.length
      ? s.topChatters.map((c, i) => `
          <li><div class="testo-voce"><span class="domanda">${['🥇', '🥈', '🥉', '4°', '5°'][i] || ''} ${esc(c.user)}</span>
          <span class="meta"> — ${c.c} messaggi</span></div></li>`).join('')
      : '<li class="vuoto">Ancora nessun chatter registrato.</li>';
  } catch (e) {
    griglia.innerHTML = `<div class="vuoto">Errore: ${esc(e.message)}</div>`;
  }
}

async function caricaMemoria(mostraToast = false) {
  const box = document.getElementById('contenitore-memoria');
  if (!box) return;
  box.innerHTML = '<p class="vuoto">Caricamento…</p>';
  try {
    const m = await api('/api/streamer/memoria');
    box.innerHTML = `
      <h3>Lezioni imparate (${m.lezioni.length})</h3>
      <ul class="lista-voci">${m.lezioni.length
        ? m.lezioni.map((l) => `<li><div class="testo-voce">${esc(l.text)}<div class="meta">${esc(dataIt(l.ts))}</div></div></li>`).join('')
        : '<li class="vuoto">Nessuna lezione ancora: il bot impara osservando la chat.</li>'}</ul>
      <h3>Fatti sul canale (${m.fatti.length})</h3>
      <ul class="lista-voci">${m.fatti.length
        ? m.fatti.map((f) => `<li><div class="testo-voce"><span class="domanda">${esc(f.key)}</span>
            <span class="risposta"> ${esc(String(f.value).slice(0, 200))}</span></div></li>`).join('')
        : '<li class="vuoto">Nessun fatto memorizzato.</li>'}</ul>`;
    if (mostraToast) toast('Memoria caricata 🧠');
  } catch (e) {
    box.innerHTML = `<p class="vuoto">Errore: ${esc(e.message)}</p>`;
  }
}

// ------------------------------------------------------------------ pannello admin

function vistaAdmin() {
  const avviso = stato.missing?.length ? `
    <div class="carta avviso">
      <h2>⚠️ Configurazione incompleta</h2>
      <p>Mancano nel file <code>.env</code>: ${stato.missing.map((m) => `<code>${esc(m)}</code>`).join(', ')}.
      Il bot non parte finché non le compili.</p>
    </div>` : '';

  const st = stato.status || {};
  return `
    <hr class="separatore">
    <div class="carta">
      <h2>Pannello andryxify 👑</h2>
      <p class="spazio-sopra">
        Bot: ${st.running ? '<span class="badge verde">● in esecuzione</span>' : '<span class="badge rosso">○ fermo</span>'}
        &nbsp; Canali attivi: ${st.channels?.length
          ? st.channels.map((c) => `<span class="badge viola">#${esc(c)}</span>`).join(' ')
          : '<span class="badge">nessuno</span>'}
        &nbsp; Streamer registrati: <strong class="primo-piano">${st.streamers ?? 0}</strong>
      </p>
    </div>
    ${avviso}
    <div class="carta">
      <h2>Streamer</h2>
      <div class="scorrevole">
        <table class="tabella">
          <thead><tr><th>Streamer</th><th>Login</th><th>Stato</th><th>Permessi</th><th>Conoscenza</th><th>Azioni</th></tr></thead>
          <tbody id="tabella-streamer"><tr><td colspan="6" class="vuoto">Caricamento…</td></tr></tbody>
        </table>
      </div>
    </div>`;
}

async function caricaTabellaAdmin() {
  const tbody = document.getElementById('tabella-streamer');
  if (!tbody) return;
  try {
    const lista = await api('/api/admin/streamers');
    if (!lista.length) { tbody.innerHTML = '<tr><td colspan="6" class="vuoto">Nessuno streamer ancora.</td></tr>'; return; }

    const badgeStato = {
      pending: '<span class="badge giallo">in attesa</span>',
      approved: '<span class="badge verde">approvato</span>',
      disabled: '<span class="badge rosso">disabilitato</span>',
    };
    tbody.innerHTML = lista.map((s) => `
      <tr>
        <td>${esc(s.display || s.login)}</td>
        <td><code>${esc(s.login)}</code></td>
        <td>${badgeStato[s.status] || esc(s.status)}</td>
        <td>${s.permessiOk ? '✔' : '✘'}</td>
        <td>${s.knowledgeCount}</td>
        <td>
          ${s.status !== 'approved' ? `<button class="btn mini" data-azione="approved" data-login="${esc(s.login)}">Approva</button>` : ''}
          ${s.status === 'approved' ? `<button class="btn secondario mini" data-azione="disabled" data-login="${esc(s.login)}">Disabilita</button>` : ''}
          <button class="btn pericolo mini" data-azione="rimuovi" data-login="${esc(s.login)}">Rimuovi</button>
        </td>
      </tr>`).join('');

    // azioni admin (delega sul tbody)
    tbody.onclick = (ev) => {
      const btn = ev.target.closest('[data-azione]');
      if (!btn) return;
      const { azione, login } = btn.dataset;
      conErrore(async () => {
        if (azione === 'rimuovi') {
          if (!confirm(`Rimuovere del tutto ${login}? Verranno eliminati anche i suoi permessi.`)) return;
          await api('/api/admin/rimuovi', { method: 'POST', body: { login } });
          toast(`${login} rimosso.`);
        } else {
          if (azione === 'disabled' && !confirm(`Disabilitare ${login}? Il bot uscirà dal suo canale.`)) return;
          await api('/api/admin/stato', { method: 'POST', body: { login, status: azione } });
          toast(azione === 'approved' ? `${login} approvato! Il bot si sta pre-addestrando.` : `${login} disabilitato.`);
        }
        // ricarica stato globale (canali attivi) e tabella
        stato = await api('/api/me');
        render();
      });
    };
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="vuoto">Errore: ${esc(e.message)}</td></tr>`;
  }
}

// ------------------------------------------------------------------ listener globali

// bottone "richiedi AndryBot" (vista senza richiesta) — delega sul documento
document.addEventListener('click', (ev) => {
  if (ev.target.id === 'btn-richiesta') {
    conErrore(async () => {
      await api('/api/richiesta', { method: 'POST', body: {} });
      toast('Richiesta inviata! 🎉');
      stato = await api('/api/me');
      render();
    });
  }
});

// via!
caricaStato();
