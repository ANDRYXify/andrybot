// IL COSTRUTTORE: prende una differenza e la fa succedere.
//
// Tutte le decisioni sono gia' state prese altrove. Il preset dice come dev'essere
// il server (`discord-preset.js`), la fotografia dice com'e' adesso
// (`discord-api.js`), e la differenza fra le due e' l'elenco delle intenzioni.
// Qui non si sceglie niente: si esegue, nell'ordine giusto, fermandosi quando
// c'e' da fermarsi.
//
// L'ordine non e' una preferenza, e' quello che rende innocuo l'inciampo:
//
//  · PRIMA LE CATEGORIE, poi i canali che ci vanno dentro. Non per eleganza:
//    un canale si crea dentro una categoria dandone l'id, e quell'id esiste
//    solo dopo. Al contrario nascerebbero tutti fuori, sparsi in cima.
//  · POI I SISTEMI. Un canale che si rimette nella sua categoria ha bisogno
//    che la categoria ci sia: se la sua creazione e' andata male, non lo si
//    sposta «da qualche parte» — si lascia dov'e'. Mezza cosa fatta e' peggio
//    di niente, perche' non somiglia ne' a prima ne' a dopo.
//  · IN FONDO CIO' CHE SI TOGLIE, e solo nel modo distruttivo. Se qualcosa va
//    storto prima, si e' fermato un costruttore, non uno che stava cancellando.
//    E fra le cose da togliere vanno prima i canali e poi le categorie: una
//    categoria cancellata non porta via i suoi canali, li lascia orfani in
//    cima al server, e fermarsi a meta' lascerebbe quel disordine li'.
//
// La seconda serratura sul cancellare e' voluta. `togliere` decide gia' se la
// differenza contiene l'elenco di cio' che sparisce, e qui si controlla di
// nuovo prima di chiamare. Non e' una ripetizione: e' che sull'unica cosa
// irreversibile la domanda si fa nel punto in cui si distrugge, non solo dove
// si e' deciso.
//
// E il limite delle mosse non e' un troncamento silenzioso: quando si ferma lo
// dice, e dice perche'.
import * as api from './discord-api.js';
import { differenza, vuota, improntaDi, TIPI, nomeCanale } from './discord-preset.js';
import { makeLog } from '../logger.js';

const log = makeLog('discord-costruisci');

export const PAUSA_MS = 350;
export const MAX_MOSSE = 80;
const MAX_ERRORI = 3;

const dormi = (ms) => new Promise((r) => setTimeout(r, ms));

function aggiungi(elenco, cosa) {
  const t = String(cosa || '').trim();
  if (!t || elenco.includes(t) || elenco.length >= MAX_ERRORI) return;
  elenco.push(t);
}

// L'ANTEPRIMA E' LA STESSA FUNZIONE. Guardare e fare partono da qui tutti e
// due: se fossero due strade, divergerebbero al primo cambiamento e il pannello
// mostrerebbe una cosa mentre ne succede un'altra.
export async function anteprima(token, guild, preset, { togliere = false } = {}) {
  const foto = await api.fotografia(token, guild);
  if (!foto.ok) return foto;
  const d = differenza(foto, preset, { togliere });
  return { ok: true, foto, differenza: d, impronta: improntaDi(d), vuota: vuota(d) };
}

// Le categorie che esistono, per nome. Serve a tradurre il «dentro» della
// differenza — che e' un nome, perche' un preset non puo' conoscere gli id di
// un server che non ha mai visto — nell'id che vuole Discord.
function categorieDi(canali) {
  const m = new Map();
  for (const c of (canali || [])) {
    if (c.tipo !== TIPI.categoria) continue;
    const k = nomeCanale(TIPI.categoria, c.nome).toLowerCase();
    if (!m.has(k)) m.set(k, String(c.id));
  }
  return m;
}

export async function applica(token, guild, preset, { togliere = false, impronta = null, pausa = PAUSA_MS, max = MAX_MOSSE } = {}) {
  const a = await anteprima(token, guild, preset, { togliere });
  if (!a.ok) return a;

  // Il permesso si controlla PRIMA, non si scopre a meta' strada da un errore.
  // Chi ha invitato il bot quando chiedevamo solo i ruoli non ha questo, e la
  // cura non e' un messaggio tecnico: e' ripassare dal tasto che lo porta nel
  // server, perche' reinvitare aggiorna i permessi.
  if (!a.foto.puoCanali) {
    return { ok: false, reinvito: true, errore: 'al bot manca «Gestire i canali»: ripassa dal tasto che lo porta nel tuo server, cosi\' Discord gli aggiorna i permessi' };
  }
  if (impronta && String(impronta) !== a.impronta) {
    return { ok: false, cambiato: true, impronta: a.impronta, differenza: a.differenza,
      errore: 'il server e\' cambiato da quando hai guardato: ricontrolla cosa succede e riconferma' };
  }
  if (a.vuota) return { ok: true, creati: 0, sistemati: 0, tolti: 0, errori: [], fermo: '', fatte: 0, impronta: a.impronta, niente: true };

  const d = a.differenza;
  const cat = categorieDi(a.foto.canali);
  const dentroId = (nome) => (nome ? cat.get(nomeCanale(TIPI.categoria, nome).toLowerCase()) || null : null);

  const esito = { creati: 0, sistemati: 0, tolti: 0, errori: [], fermo: '', fatte: 0 };
  const passo = async (fn, conta) => {
    if (esito.fermo) return null;
    if (esito.fatte >= max) { esito.fermo = 'limite'; return null; }
    const x = await fn();
    esito.fatte++;
    if (x.ok) esito[conta]++;
    else {
      aggiungi(esito.errori, x.errore);
      // Un limite dichiarato da Discord non si sfida: ci si ferma e si torna.
      if (x.attesa) esito.fermo = 'attesa';
    }
    if (!esito.fermo && pausa > 0) await dormi(pausa);
    return x;
  };

  for (const v of d.crea) {
    if (v.tipo !== TIPI.categoria) continue;
    const x = await passo(() => api.creaCanale(token, guild, { nome: v.nome, tipo: v.tipo, permessi: v.permessi }), 'creati');
    if (x?.ok && x.id) cat.set(v.nome.toLowerCase(), String(x.id));
    if (esito.fermo) break;
  }
  for (const v of d.crea) {
    if (esito.fermo) break;
    if (v.tipo === TIPI.categoria) continue;
    await passo(() => api.creaCanale(token, guild, {
      nome: v.nome, tipo: v.tipo, argomento: v.argomento, permessi: v.permessi, dentroId: dentroId(v.dentro),
    }), 'creati');
  }

  for (const s of d.sistema) {
    if (esito.fermo) break;
    const cambia = {};
    if (Array.isArray(s.permessi)) cambia.permessi = s.permessi;
    if (s.argomento !== undefined) cambia.argomento = s.argomento;
    if (s.dentro !== undefined) {
      const pid = dentroId(s.dentro);
      // Senza la categoria giusta non lo si sposta «via»: restare dov'e' e'
      // sbagliato in un modo che si vede e si aggiusta, finire fuori da tutto
      // e' sbagliato in un modo che sembra un guasto nostro.
      if (!pid) continue;
      cambia.dentroId = pid;
    }
    if (!Object.keys(cambia).length) continue;
    await passo(() => api.sistemaCanale(token, s.id, cambia), 'sistemati');
  }

  if (togliere) {
    const prima = (x) => (x.tipo === TIPI.categoria ? 1 : 0);
    for (const t of [...d.togli].sort((x, y) => prima(x) - prima(y))) {
      if (esito.fermo) break;
      await passo(() => api.togliCanale(token, t.id), 'tolti');
    }
  }

  if (esito.errori.length) log.debug('costruito con inciampi:', esito.errori.join(' · '));
  return { ok: true, ...esito, impronta: a.impronta };
}
