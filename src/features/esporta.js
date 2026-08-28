// PORTARSI VIA I PROPRI DATI.
//
// Su un prodotto a pagamento in Europa non è cortesia: è un diritto (GDPR art.
// 20, portabilità). Ma è anche una cosa giusta e basta — chi ha costruito
// duecento comandi, una memoria di chat e una pagina pubblica deve poter uscire
// dalla porta con la sua roba in mano, non restare per ostaggio dei dati.
//
// COME SI EVITA CHE INVECCHI. Un elenco di tabelle scritto a mano si stacca dal
// database alla prima tabella nuova: l'esportazione tace, e nessuno se ne
// accorge. Qui l'elenco si RICAVA dallo schema — ogni tabella che ha una
// colonna di canale viene esportata — e l'unica cosa scritta a mano è ciò che
// NON deve uscire, con il motivo accanto. Una tabella nuova entra da sola; se
// contiene segreti va negata di proposito, e il collaudo lo pretende.

import { db } from '../db.js';

// Le colonne con cui una riga dice "sono di questo streamer".
const COLONNE_CANALE = ['channel', 'login', 'streamer'];

// Cosa NON esce, e perché. Il motivo non è decorazione: è la cosa che il
// collaudo legge per pretendere una decisione consapevole su ogni tabella.
export const NEGATE = {
  tokens: 'chiavi di accesso a Twitch e agli altri servizi: darle via sarebbe consegnare il proprio account',
  spotify_tokens: 'chiave di accesso a Spotify',
  tiktok_tokens: 'chiave di accesso a TikTok',
  seventv_tokens: 'chiave di accesso a 7TV',
  passkeys: 'chiavi pubbliche di accesso: non servono altrove e sono materiale di autenticazione',
  telegram_login: 'codici di collegamento momentanei',
  brain_model: 'pesi del modello: sono del sistema, non dello streamer',
  link_page_visite: 'contatore di visite grezzo, con dati di chi ha visitato',
  messages: 'i messaggi della chat sono di CHI LI HA SCRITTI, non del canale: escono solo i propri',
  stream_context: 'stato momentaneo della diretta, non dati',
};

// Le tabelle che appartengono a un canale, ricavate dallo schema.
export function tabelleDiCanale() {
  const out = [];
  const nomi = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  for (const { name } of nomi) {
    const colonne = db.pragma(`table_info(${name})`).map((c) => c.name);
    const chiave = COLONNE_CANALE.find((c) => colonne.includes(c));
    if (chiave) out.push({ tabella: name, colonna: chiave, colonne });
  }
  return out;
}

// Colonne che non escono MAI, qualunque tabella le abbia.
const COLONNE_SEGRETE = /^(access_token|refresh_token|secret|password|token|apikey|api_key|webhook_secret)$/i;

// L'esportazione di uno streamer. `limite` protegge da una tabella enorme
// (la memoria della chat può avere decine di migliaia di righe).
export function esporta(login, { limite = 20_000 } = {}) {
  const chi = String(login || '').toLowerCase();
  if (!chi) throw new Error('serve un canale');

  const dati = {};
  const saltate = [];
  // `considerate` non serve al file esportato: serve al collaudo, che con
  // questo può pretendere che OGNI tabella di canale sia stata guardata —
  // esportata o negata di proposito. Senza, una tabella nuova sparirebbe in
  // silenzio dall'esportazione, e nessuno se ne accorgerebbe.
  const considerate = [];
  for (const { tabella, colonna, colonne } of tabelleDiCanale()) {
    if (NEGATE[tabella]) { saltate.push({ tabella, perche: NEGATE[tabella] }); continue; }
    considerate.push(tabella);
    const tieni = colonne.filter((c) => !COLONNE_SEGRETE.test(c));
    const righe = db.prepare(`SELECT ${tieni.map((c) => `"${c}"`).join(', ')} FROM "${tabella}" WHERE "${colonna}"=? LIMIT ?`)
      .all(chi, limite);
    if (righe.length) dati[tabella] = righe;
  }

  // I messaggi di chat sono di chi li ha scritti: dal canale escono solo i
  // PROPRI, non quelli degli spettatori.
  try {
    dati.messages_miei = db.prepare('SELECT * FROM messages WHERE channel=? AND user=? ORDER BY ts DESC LIMIT ?')
      .all(chi, chi, Math.min(limite, 5000));
  } catch { /* la tabella potrebbe non esserci in un database di prova */ }

  return {
    formato: 1,
    canale: chi,
    generato: new Date().toISOString(),
    nota: 'Esportazione dei dati del canale. Non contiene chiavi di accesso, né i messaggi scritti da altre persone.',
    saltate,
    considerate,
    dati,
  };
}
