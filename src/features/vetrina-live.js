// LE DIRETTE IN VETRINA: chi e' in onda adesso, sulla home.
//
// Due regole, e sono tutte e due per COSTRUZIONE, non impostazioni da ricordare:
//
//  · SI ENTRA DICENDO SI'. Un canale non e' nostro da mettere in mostra. Compare
//    solo se il suo proprietario ha acceso l'interruttore, e sparisce appena lo
//    spegne. Di serie e' spento: chi non sa che esiste non si ritrova in vetrina.
//  · UNA FASCIA VUOTA E' PEGGIO DI NESSUNA FASCIA. Se non c'e' nessuno in onda,
//    non si scrive «nessuno in diretta ora»: la fascia non esiste proprio. Una
//    casa con le luci spente si vede piu' di una casa che non c'e'.
//
// CHI e' live lo sa gia' il bot: lo stato vive li' perche' gli serve per mille
// altre cose, quindi qui non si va a chiedere niente a nessuno per saperlo. A
// Twitch si chiede solo il CONTORNO — titolo, categoria, spettatori — e si
// chiede per tutti i canali in una volta sola, non piu' di una al minuto: cosi'
// il costo non cresce col numero di clienti ne' col numero di visite.
import { streamers } from '../db.js';
import { piattaformaDi, nomeSu, urlCanale } from '../identita.js';

export const FRESCHEZZA_MS = 60_000;
export const MAX_IN_VETRINA = 12;

// Volatile per natura: e' una fotografia di un minuto fa, e dopo un riavvio la
// prima visita la rifa'. Non c'e' niente da salvare.
let _foto = { ts: 0, lista: [] };
// La richiesta in volo sta in una variabile SUA. Dentro all'oggetto della foto
// sarebbe finita sull'oggetto vecchio — l'assegnazione fissa il bersaglio prima
// di valutare quel che le sta a destra — e chi chiamava si sarebbe ritrovato in
// mano un «niente» al posto dell'elenco, ma solo quando non c'era nessuno in
// onda: cioe' proprio quando la fascia non deve comparire, e nessuno se ne
// sarebbe accorto guardando la home.
let _inVolo = null;

export const accesa = (settings) => settings?.vetrinaLive === true;

// Chi ha detto di si' ed e' un canale vivo (approvato e non sospeso).
export function candidati() {
  return streamers.list()
    .filter((s) => s.status === 'approved' && accesa(s.settings))
    .map((s) => s.login);
}

// La carta di un canale: solo cose che sono gia' pubbliche di loro (il nome del
// canale e cosa sta facendo). Niente che riguardi chi guarda.
function carta(login, s, stream) {
  return {
    login,
    nome: s?.display || nomeSu(login),
    piattaforma: piattaformaDi(login),
    url: urlCanale(login),
    titolo: String(stream?.title || '').slice(0, 120),
    categoria: String(stream?.game_name || '').slice(0, 60),
    spettatori: Number(stream?.viewer_count) || 0,
  };
}

// L'elenco per la home. `inDiretta` e' il bot; `helix` serve solo al contorno,
// e se non risponde le carte restano senza contorno invece di sparire: la
// vetrina non deve dipendere dal fatto che una piattaforma risponda.
export async function elenco({ helix, inDiretta, ora = Date.now() } = {}) {
  if (ora - _foto.ts < FRESCHEZZA_MS) return _foto.lista;
  if (_inVolo) return _inVolo;
  _inVolo = (async () => {
    const vivi = candidati().filter((l) => { try { return inDiretta?.(l) === true; } catch { return false; } })
      .slice(0, MAX_IN_VETRINA);
    const perLogin = new Map();
    const suTwitch = vivi.filter((l) => piattaformaDi(l) === 'twitch');
    if (suTwitch.length && helix?.getStreams) {
      try {
        for (const st of await helix.getStreams(suTwitch)) {
          if (st?.user_login) perLogin.set(String(st.user_login).toLowerCase(), st);
        }
      } catch { /* senza contorno le carte ci sono lo stesso */ }
    }
    const lista = vivi.map((l) => carta(l, streamers.get(l), perLogin.get(nomeSu(l))))
      .sort((a, b) => b.spettatori - a.spettatori || a.nome.localeCompare(b.nome));
    _foto = { ts: ora, lista };
    return lista;
  })().finally(() => { _inVolo = null; });
  return _inVolo;
}

// Per le prove e per il pannello: la prossima visita rilegge tutto.
export function scorda() { _foto = { ts: 0, lista: [] }; _inVolo = null; }
