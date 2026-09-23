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
import { differenza, differenzaRuoli, differenzaIngresso, differenzaFiltro, vuota, improntaDi, TIPI, nomeCanale, chiaveNome, consiglioRuoli, applicaConsiglio, aChiVanno } from './discord-preset.js';
import { risolvi, nonPuoDare } from './discord-catalogo.js';
import { makeLog } from '../logger.js';

const log = makeLog('discord-costruisci');

// IL MOTIVO CHE FINISCE NEL REGISTRO DEL SERVER.
//
// Discord scrive accanto a ogni azione chi l'ha fatta; il perche' lo scrive
// solo se glielo si dice. Senza, fra sei mesi il registro di casa altrui dice
// «SocialBot ha cancellato un canale» e nessuno sa piu' in nome di cosa — men
// che meno chi quel giorno non c'era.
const MOTIVO = Object.freeze({
  creato: 'creato dal costruttore, come da traccia',
  sistemato: 'rimesso come dice la traccia',
  tolto: 'non e\' nella traccia, e la modalita\' distruttiva era accesa',
  ruoloCreato: 'creato dal costruttore, come da traccia',
  ruoloSistemato: 'rimesso come dice la traccia',
  ruoloTolto: 'non e\' nella traccia, e la modalita\' distruttiva era accesa',
  server: 'impostazioni rimesse come dice la traccia',
  ingresso: 'la porta d\'ingresso, come dice la traccia',
  filtro: 'il filtro, come dice la traccia',
  aTe: 'e\' il ruolo della traccia che spetta a chi ha il server',
  filtroTolto: 'non e\' nella traccia, e la modalita\' distruttiva era accesa',
});

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
export async function anteprima(token, guild, preset, { togliere = false, immagini = null, regoleOra = [] } = {}) {
  const foto = await api.fotografia(token, guild);
  if (!foto.ok) return foto;
  // Il preset parla a parole — «tutti», un ruolo per nome — e qui, con il
  // server sotto gli occhi, quelle parole diventano id. E' anche il punto in
  // cui si scopre che un ruolo nominato non c'e': quella riga di permessi si
  // salta e si dice quale, perche' un ruolo che non esiste non e' «nessuno».
  // I RUOLI SI CALCOLANO PRIMA, e non e' un ordine di comodo: un canale che nel
  // preset nomina «Moderatori» ha bisogno che quel ruolo esista. Se il
  // costruttore lo creasse dopo, la prima applicazione salterebbe tutti i suoi
  // permessi e la seconda li metterebbe — cioe' «funziona alla seconda volta»,
  // che e' il difetto peggiore perche' sembra funzionare.
  //
  // Un ruolo che la traccia sta per creare quindi NON e' mancante: e' uno che
  // non c'e' ancora. Si risolve su un elenco che comprende anche quelli, con un
  // id finto che nessun permesso di adesso puo' avere — cosi' il canale che lo
  // nomina risulta da sistemare, che e' esattamente quello che succedera'.
  // IL CONSIGLIO: «io lascerei solo questi, chiamandoli in questo modo». Si
  // calcola sempre — anche andando solo in avanti, perche' e' una cosa da
  // guardare — ma si APPLICA da solo solo facendo piazza pulita, e solo nei
  // rinomini. Vedi applicaConsiglio: il risparmio e' una deroga, e le deroghe
  // le decide chi ha il server.
  const consiglio = consiglioRuoli(foto, preset);
  const preset_ = togliere ? applicaConsiglio(preset, consiglio) : preset;
  const dRuoli = differenzaRuoli(foto, preset_, { togliere, immagini, puoiDare: (p) => !nonPuoDare([p], foto.bits).length });
  const nasceranno = dRuoli.crea.map((r) => ({ id: 'nuovo:' + r.nome.toLowerCase(), nome: r.nome }));
  const { preset: risolto, mancanti } = risolvi(preset_, {
    guildId: foto.guild.id, ruoli: [...foto.ruoli, ...nasceranno], botId: foto.bot?.id });
  // COSA RESTA FUORI DAL PRESET SI SA SEMPRE, anche quando non si tocca.
  // Serve a dire «il tuo server ha sette canali che questo preset non prevede»
  // senza che quella frase diventi un'offerta di cancellarli: il modo decide
  // se si agisce, non se si guarda. E l'impronta e' di quello che si FA, cosi'
  // in avanti e in distruttivo non si confondono fra loro.
  // Cosa puo' fare il bot DENTRO ogni canale, non solo nel server: le regole
  // del singolo canale battono quelle generali, e un canale che il bot non
  // vede non lo sa nemmeno cancellare.
  const puoiToccare = (c) => {
    const bits = api.permessiNelCanale(foto, c);
    return api.puoVedere(bits) && api.puoCanali(bits);
  };
  const tutto = differenza(foto, risolto, { togliere: true, puoiToccare });
  const d = togliere ? { ...tutto, ruoli: dRuoli } : { ...tutto, togli: [], ruoli: { ...dRuoli, togli: [] } };
  // A CHI VANNO I RUOLI. I ruoli del proprietario si chiedono solo se la
  // traccia ne ha uno «tuo»: una chiamata che serve a una domanda sola, e
  // senza quella domanda non si fa.
  const proprietario = String(foto.guild?.proprietario || '');
  let ruoliDelProprietario = null;
  if (proprietario && (preset_?.ruoli || []).some((r) => r?.aChi === 'tu')) {
    const m = await api.membro(token, guild, proprietario);
    if (m?.ok) ruoliDelProprietario = m.ruoli || [];
  }
  const vanno = aChiVanno(foto, preset_, dRuoli, { ruoliDelProprietario, regoleOra });
  if (vanno.aTe) d.ruoli.aTe = vanno.aTe;
  if (vanno.regole.length) d.ruoli.regole = vanno.regole;
  if (vanno.nonATe) d.ruoli.nonATe = vanno.nonATe;
  // LA PORTA D'INGRESSO si legge solo se la traccia ne parla, e sono due
  // chiamate in piu'. Farle sempre vorrebbe dire pagarle a ogni anteprima di
  // ogni server, comprese le tracce che di ingresso non dicono una parola.
  // E si legge sul preset A PAROLE, non su quello risolto: la porta nomina
  // canali che stanno per nascere, e un id per loro non esiste ancora.
  if (preset_?.ingresso) {
    const [ben, ing] = await Promise.all([api.benvenuto(token, guild), api.ingresso(token, guild)]);
    const ip = differenzaIngresso(preset_, foto, {
      benvenuto: ben?.ok ? ben : null, ingresso: ing?.ok ? ing : null });
    if (ip) d.ingresso = ip;
  }
  // IL FILTRO, anche lui solo se la traccia ne parla: e' una lettura in piu',
  // e una traccia che di filtro non dice niente non deve pagarla.
  let fuoriFiltro = [];
  if (preset_?.filtro) {
    const rr = await api.regoleAuto(token, guild);
    const fp = differenzaFiltro(preset_, foto, rr?.ok ? rr.regole : []);
    if (fp) {
      fuoriFiltro = fp.togli;
      d.filtro = togliere ? fp : { ...fp, togli: [] };
    }
  }
  return { ok: true, foto, differenza: d, fuori: tutto.togli, fuoriRuoli: dRuoli.togli, fuoriFiltro,
    impronta: improntaDi(d), vuota: vuota(d), mancanti, nonPosso: dRuoli.nonPosso,
    // Cosa questo server non sa fare: il segno accanto al nome, la sfumatura.
    // Si dice PRIMA di partire, perche' e' una cosa che si sapeva prima di
    // partire — e la cura non e' nostra, e' far salire di livello il server.
    manca: dRuoli.manca, fuoriPortata: tutto.fuoriPortata || [], consiglio };
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

export async function applica(token, guild, preset, { togliere = false, impronta = null, pausa = PAUSA_MS, max = MAX_MOSSE, immagini = null, regoleOra = [] } = {}) {
  const a = await anteprima(token, guild, preset, { togliere, immagini, regoleOra });
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
  if (a.vuota) return { ok: true, creati: 0, sistemati: 0, tolti: 0, errori: [], fermo: '', fatte: 0, nomiTolti: [], impronta: a.impronta, mancanti: a.mancanti, niente: true };

  const d = a.differenza;
  const cat = categorieDi(a.foto.canali);
  const dentroId = (nome) => (nome ? cat.get(nomeCanale(TIPI.categoria, nome).toLowerCase()) || null : null);

  // IL CANALE DEGLI AVVISI, se la traccia ne dichiara uno. Se c'era gia' lo si
  // sa dalla differenza; se nasce adesso l'id arriva da Discord al momento
  // della creazione — ed e' l'unico momento in cui lo si puo' sapere senza
  // rileggere tutto il server.
  const esito = { creati: 0, sistemati: 0, tolti: 0, errori: [], fermo: '', fatte: 0, nomiTolti: [],
    ruoliCreati: 0, ruoliSistemati: 0, ruoliTolti: 0, nomiRuoliTolti: [],
    serverSistemato: 0, serverDice: [],
    ingressoSistemato: 0, ingressoDice: [], ingressoPersi: [],
    filtroCreate: 0, filtroSistemate: 0, filtroTolte: 0, nomiFiltroTolte: [],
    segni: [],
    aTeDato: 0, regoleNuove: [],
    canaleAvvisi: d.avvisi?.id ? String(d.avvisi.id) : '' };
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

  // I RUOLI PRIMA DI TUTTO, perche' i canali li nominano.
  //
  // E appena ne nasce uno, il suo id vero si mette al posto di quello finto che
  // l'anteprima aveva usato per dire «questo ruolo arrivera'». Da qui in poi i
  // permessi dei canali parlano di ruoli che esistono davvero: e' l'unico
  // momento in cui si puo' fare, e farlo dopo vorrebbe dire mandare a Discord
  // un id inventato.
  const r = d.ruoli || { crea: [], sistema: [], togli: [] };
  const idVeri = new Map();
  // L'IMPRONTA DELL'ICONA APPENA MESSA torna indietro da qui, e da nessun altro
  // posto: dai byte non si calcola. Chi ha mandato l'immagine se la registra, e
  // da li' in poi «c'e' gia' quella» e' una domanda con una risposta — cioe'
  // la volta dopo non si riscrive niente.
  for (const v of (r.crea || [])) {
    if (esito.fermo) break;
    const x = await passo(() => api.creaRuolo(token, guild, v, MOTIVO.ruoloCreato), 'ruoliCreati');
    if (x?.ok && x.id) idVeri.set('nuovo:' + v.nome.toLowerCase(), String(x.id));
    if (x?.ok && x.icona) esito.segni.push({ nome: v.nome, icona: x.icona });
  }
  for (const v of (r.sistema || [])) {
    if (esito.fermo) break;
    const x = await passo(() => api.sistemaRuolo(token, guild, v.id, v, MOTIVO.ruoloSistemato), 'ruoliSistemati');
    if (x?.ok && x.icona) esito.segni.push({ nome: v.nome || '', icona: x.icona });
  }
  // IL RUOLO TUO VA A TE, e gli altri alle regole che li danno.
  //
  // Solo adesso: un ruolo appena nato ha un id da pochi istanti. Se non e'
  // nato — Discord ha detto no, o ci si e' fermati prima — non si inventa
  // niente: la riga cade, e l'errore della creazione dice gia' perche'.
  const idRuolo = (x) => x?.id || idVeri.get('nuovo:' + String(x?.nome || '').toLowerCase()) || '';
  if (!esito.fermo && r.aTe && a.foto.guild?.proprietario) {
    const id = idRuolo(r.aTe);
    if (id) await passo(() => api.dai(token, guild, a.foto.guild.proprietario, id, MOTIVO.aTe), 'aTeDato');
  }
  for (const x of (r.regole || [])) {
    const id = idRuolo(x);
    if (id) esito.regoleNuove.push({ tipo: x.tipo, ruolo: id, nome: x.nome });
  }

  // Un id finto che non e' diventato vero vuol dire che quel ruolo non si e'
  // potuto creare. Il permesso che lo nomina si salta: dargli un id a caso
  // sarebbe peggio, e lasciarlo scritto «nuovo:...» farebbe fallire la
  // chiamata a meta' costruzione.
  const veri = (righe) => (righe || []).map((p) => (String(p.id).startsWith('nuovo:')
    ? { ...p, id: idVeri.get(String(p.id)) || '' } : p)).filter((p) => p.id);
  for (const v of d.crea) if (v.permessi) v.permessi = veri(v.permessi);
  for (const v of d.sistema) if (Array.isArray(v.permessi)) v.permessi = veri(v.permessi);

  for (const v of d.crea) {
    if (v.tipo !== TIPI.categoria) continue;
    const x = await passo(() => api.creaCanale(token, guild, { nome: v.nome, tipo: v.tipo, permessi: v.permessi }, MOTIVO.creato), 'creati');
    if (x?.ok && x.id) cat.set(v.nome.toLowerCase(), String(x.id));
    if (esito.fermo) break;
  }
  // I CANALI CHE NASCONO, presi per nome mentre nascono. E' l'unico momento in
  // cui il loro id si sa senza rileggere tutto il server, ed e' esattamente
  // quello che serve alla porta d'ingresso: la traccia la scrive con i nomi
  // proprio perche' questi canali, quando la si scriveva, non c'erano.
  const nuoviCanali = new Map();
  for (const v of d.crea) {
    if (esito.fermo) break;
    if (v.tipo === TIPI.categoria) continue;
    const x = await passo(() => api.creaCanale(token, guild, {
      nome: v.nome, tipo: v.tipo, argomento: v.argomento, permessi: v.permessi, dentroId: dentroId(v.dentro),
    }, MOTIVO.creato), 'creati');
    if (x?.ok && x.id) nuoviCanali.set(chiaveNome(v.nome), String(x.id));
    if (v.avvisi && x?.ok && x.id) esito.canaleAvvisi = String(x.id);
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
    await passo(() => api.sistemaCanale(token, s.id, cambia, MOTIVO.sistemato), 'sistemati');
  }

  // LE IMPOSTAZIONI DEL SERVER, dopo i canali e prima di cio' che si toglie.
  //
  // Dopo i canali perche' alcune li nominano — il canale delle regole, quello
  // di sistema — e nominarli prima che esistano vorrebbe dire nominare il
  // nulla. Prima delle rimozioni perche' se qualcosa va storto piu' in la', il
  // server e' comunque rimasto com'era chiesto, e non a meta'.
  // L'angolo AFK nominato dalla traccia ha un id solo adesso, se e' nato in
  // questo giro. Se non e' nato non si inventa niente: il campo cade, e il
  // resto delle impostazioni parte lo stesso.
  if (d.server?.cambia?.canaleAfkNome) {
    const id = nuoviCanali.get(chiaveNome(d.server.cambia.canaleAfkNome));
    if (id) d.server.cambia.canaleAfk = id;
    delete d.server.cambia.canaleAfkNome;
    if (!Object.keys(d.server.cambia).filter((k) => k !== 'featuresOra').length) d.server.cambia = null;
  }
  if (!esito.fermo && d.server?.cambia) {
    const x = await passo(() => api.sistemaServer(token, guild, d.server.cambia, MOTIVO.server), 'serverSistemato');
    if (x?.ok) esito.serverDice = d.server.dice || [];
  }

  // LA PORTA D'INGRESSO, quando canali e ruoli esistono davvero.
  //
  // E' qui e non prima perche' qui i nomi diventano id: un canale creato due
  // righe sopra ha un id solo adesso, e la porta parla proprio di quelli. Un
  // nome che non si risolve non si inventa — quella voce cade, e si dice
  // quale, invece di mandare a Discord un id a caso.
  if (!esito.fermo && d.ingresso?.cambia) {
    if (d.ingresso.blocco) aggiungi(esito.errori, d.ingresso.blocco);
    else {
      const canPerNome = new Map();
      for (const c of (a.foto.canali || [])) {
        if (Number(c.tipo) === TIPI.categoria) continue;
        canPerNome.set(chiaveNome(c.nome), String(c.id));
      }
      for (const [k, v] of nuoviCanali) canPerNome.set(k, v);
      const ruoPerNome = new Map();
      for (const x of (a.foto.ruoli || [])) ruoPerNome.set(chiaveNome(x.nome), String(x.id));
      for (const [k, v] of idVeri) ruoPerNome.set(chiaveNome(k.slice('nuovo:'.length)), v);
      const persi = [];
      const trova = (m) => (n) => {
        const i = m.get(chiaveNome(n));
        if (!i && !persi.includes(String(n))) persi.push(String(n));
        return i || null;
      };
      const canId = trova(canPerNome);
      const ruoId = trova(ruoPerNome);
      const v = d.ingresso.cambia;
      if (v.benvenuto) {
        await passo(() => api.sistemaBenvenuto(token, guild, {
          acceso: v.acceso,
          testo: v.benvenuto.testo,
          canali: (v.benvenuto.canali || []).map((c) => ({ ...c, canale: canId(c.canale) })).filter((c) => c.canale),
        }, MOTIVO.ingresso), 'ingressoSistemato');
      }
      if (v.porta && !esito.fermo) {
        await passo(() => api.sistemaIngresso(token, guild, {
          acceso: v.acceso,
          modo: v.modo,
          canaliDiPartenza: (v.canaliDiPartenza || []).map(canId).filter(Boolean),
          domande: (v.domande || []).map((q) => ({
            ...q,
            risposte: (q.risposte || []).map((r) => ({
              ...r,
              canali: (r.canali || []).map(canId).filter(Boolean),
              ruoli: (r.ruoli || []).map(ruoId).filter(Boolean),
            })),
          })),
        }, MOTIVO.ingresso), 'ingressoSistemato');
      }
      if (esito.ingressoSistemato) esito.ingressoDice = d.ingresso.dice || [];
      esito.ingressoPersi = persi;
    }
  }

  // IL FILTRO, dopo la porta e con lo stesso passaggio: i nomi diventano id.
  // Una regola puo' avvisare in un canale e risparmiare dei ruoli, e quei
  // canali e quei ruoli la traccia li ha appena creati.
  if (!esito.fermo && d.filtro) {
    const canPerNome = new Map();
    for (const c of (a.foto.canali || [])) {
      if (Number(c.tipo) === TIPI.categoria) continue;
      canPerNome.set(chiaveNome(c.nome), String(c.id));
    }
    for (const [k, v] of nuoviCanali) canPerNome.set(k, v);
    const ruoPerNome = new Map();
    for (const x of (a.foto.ruoli || [])) ruoPerNome.set(chiaveNome(x.nome), String(x.id));
    for (const [k, v] of idVeri) ruoPerNome.set(chiaveNome(k.slice('nuovo:'.length)), v);
    const persi = [];
    const trova = (m) => (n) => {
      const i = m.get(chiaveNome(n));
      if (!i && !persi.includes(String(n))) persi.push(String(n));
      return i || null;
    };
    const canId = trova(canPerNome);
    const ruoId = trova(ruoPerNome);
    // Un canale nominato che non si trova NON diventa «nessun canale»: la
    // regola perde solo quell'avviso, e si dice quale. Zittire un avviso senza
    // dirlo sarebbe una regola che sembra accesa e non avvisa nessuno.
    const conId = (r) => ({
      ...r,
      azioni: { ...r.azioni, ...(r.azioni?.avvisaIn ? { avvisaIn: canId(r.azioni.avvisaIn) || '' } : {}) },
      esentiRuoli: (r.esentiRuoli || []).map(ruoId).filter(Boolean),
      esentiCanali: (r.esentiCanali || []).map(canId).filter(Boolean),
    });
    for (const r of (d.filtro.crea || [])) {
      if (esito.fermo) break;
      await passo(() => api.creaRegolaAuto(token, guild, conId(r), MOTIVO.filtro), 'filtroCreate');
    }
    for (const r of (d.filtro.sistema || [])) {
      if (esito.fermo) break;
      await passo(() => api.sistemaRegolaAuto(token, guild, r.id, conId(r), MOTIVO.filtro), 'filtroSistemate');
    }
    // LA SECONDA SERRATURA, come per i canali. Non e' lei a proteggere: a
    // proteggere e' l'anteprima, che in avanti consegna l'elenco vuoto — ed e'
    // quello che il collaudo misura, da un capo all'altro. Questa sta qui per
    // la stessa ragione dell'altra: sull'unica cosa che toglie roba a qualcuno,
    // la domanda si rifa' nel punto in cui si toglie, non solo dove si e' deciso.
    if (togliere) {
      for (const r of (d.filtro.togli || [])) {
        if (esito.fermo) break;
        const x = await passo(() => api.togliRegolaAuto(token, guild, r.id, MOTIVO.filtroTolto), 'filtroTolte');
        if (x?.ok) esito.nomiFiltroTolte.push(String(r.nome || ''));
      }
    }
    for (const n of persi) aggiungi(esito.errori, `nel filtro non ho trovato «${n}» sul server`);
  }

  if (togliere) {
    const prima = (x) => (x.tipo === TIPI.categoria ? 1 : 0);
    for (const t of [...d.togli].sort((x, y) => prima(x) - prima(y))) {
      if (esito.fermo) break;
      const x = await passo(() => api.togliCanale(token, t.id, MOTIVO.tolto), 'tolti');
      // I NOMI di quello che e' sparito, per il registro. Non gli id: fra sei
      // mesi un id non dice niente a una persona, e quello che si vuole
      // ricordare e' «c'era un canale che si chiamava cosi'».
      if (x?.ok) esito.nomiTolti.push(String(t.nome || ''));
    }
    // I RUOLI SI CANCELLANO PER ULTIMI, dopo i canali.
    //
    // Cancellare un ruolo lo toglie di mano a tutti quelli che ce l'hanno, e lo
    // fa in silenzio. Se ci si ferma prima — per un limite, per un guasto — ci
    // si e' fermati con un server a meta' costruzione, non con un server dove
    // meta' delle persone ha perso i suoi privilegi.
    for (const t of (r.togli || [])) {
      if (esito.fermo) break;
      const x = await passo(() => api.togliRuolo(token, guild, t.id, MOTIVO.ruoloTolto), 'ruoliTolti');
      if (x?.ok) esito.nomiRuoliTolti.push(String(t.nome || ''));
    }
  }

  if (esito.errori.length) log.debug('costruito con inciampi:', esito.errori.join(' · '));
  return { ok: true, ...esito, impronta: a.impronta, mancanti: a.mancanti };
}
