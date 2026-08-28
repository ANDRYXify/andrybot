// L'ARGINE — un limite di frequenza per TUTTA la superficie, in un posto solo.
//
// Prima ce n'era esattamente uno, sull'API esterna. Login, OAuth, passkey,
// caricamenti, ogni /api/streamer/*: niente. Su un prodotto multi-inquilino a
// pagamento è insieme una porta all'abuso e una voce di costo — ogni file
// caricato passa da compressione, cioè processore e disco.
//
// Perché QUI e non su ogni rotta: sparso per endpoint è così che si finisce con
// uno coperto e duecento no. Un solo classificatore, davanti a tutto: una rotta
// nuova nasce già protetta invece di doversi ricordare di proteggerla.
//
// L'identità è la SESSIONE quando c'è, l'indirizzo solo come ripiego: dietro
// una rete mobile mezza città condivide un indirizzo, e punire l'indirizzo
// punirebbe loro. Chi è entrato risponde di sé.
//
// Cosa NON si limita mai, e perché:
//   · /health           — il controllo di salute di Docker e i monitor esterni;
//   · /stripe/webhook   — scartarne uno significa perdere un pagamento (ed è già
//                         protetto dalla firma);
//   · gli SSE           — un overlay resta collegato per ore: è UNA richiesta,
//                         non un flusso, e non deve mai essere respinto;
//   · i file statici    — costano niente e li serve il proxy.

// Finestra fissa: per ogni chiave si contano le richieste nella finestra
// corrente. Semplice, prevedibile, senza dipendenze. L'orologio si può
// iniettare, così il comportamento nel tempo si può provare davvero.
export function creaArgine({ finestraMs = 60_000, max = 60, ora = () => Date.now(), tetto = 20_000 } = {}) {
  const conti = new Map();
  return {
    get dimensione() { return conti.size; },
    permetti(chiave) {
      const t = ora();
      let r = conti.get(chiave);
      if (!r || t >= r.fine) {
        // Tetto alla memoria: sotto un flood da mille indirizzi diversi la mappa
        // non deve diventare essa stessa il problema. Si svuota di ciò che è
        // scaduto, e solo se non basta si arrende (lasciando passare).
        if (!r && conti.size >= tetto) { for (const [k, v] of conti) if (t >= v.fine) conti.delete(k); }
        if (!r && conti.size >= tetto) return { ok: true, restano: -1, fraMs: 0, pieno: true };
        r = { n: 0, fine: t + finestraMs };
        conti.set(chiave, r);
      }
      r.n++;
      const ok = r.n <= max;
      return { ok, restano: Math.max(0, max - r.n), fraMs: ok ? 0 : r.fine - t };
    },
    dimentica(chiave) { conti.delete(chiave); },
    svuota() { conti.clear(); },
    // Pulizia periodica: toglie le finestre finite.
    pulisci() { const t = ora(); for (const [k, v] of conti) if (t >= v.fine) conti.delete(k); },
  };
}

// Le classi di richiesta, dalla più cara alla più economica. I numeri sono per
// minuto e per identità, e sono LARGHI: devono fermare l'abuso, non l'uso.
// Un tenere-premuto su un cursore che salva, o uno studio dell'overlay usato di
// gusto, non deve mai incontrarli.
export const CLASSI = {
  autenticazione: { max: 20, finestraMs: 60_000 },
  caricamento: { max: 20, finestraMs: 60_000 },
  scrittura: { max: 180, finestraMs: 60_000 },
  lettura: { max: 600, finestraMs: 60_000 },
};

const RE_AUTENTICAZIONE = /^\/(accedi|auth|sblocca|api\/passkey|api\/cambia-canale|mod)(\/|$|\?)/;
const RE_ESENTE = /^\/(health|stripe\/webhook|api\/ext\/)/;
const RE_FLUSSO = /\/stream$/;
const RE_CARICAMENTO = /^\/api\/(streamer\/(effetti|font|sfondi)|alert\/media)|\/media(\/|$)/;

// A che classe appartiene questa richiesta? null = non si limita.
export function classifica(metodo, percorso, multipart = false) {
  const m = String(metodo || 'GET').toUpperCase();
  const p = String(percorso || '/');
  if (RE_ESENTE.test(p) || RE_FLUSSO.test(p)) return null;
  if (RE_AUTENTICAZIONE.test(p)) return 'autenticazione';
  if (!p.startsWith('/api/')) return null;                 // pagine e statici: li serve il proxy
  if (m === 'GET' || m === 'HEAD') return 'lettura';
  // "Caricamento" è chi porta davvero su un file: il tipo multipart lo dice con
  // certezza, il percorso è solo un ripiego — e vale solo per i metodi che un
  // file lo mandano. Cancellare o pubblicare un effetto NON è un caricamento:
  // metterlo in quella classe faceva sbattere contro il muro chi ne ripuliva
  // trenta.
  if (multipart) return 'caricamento';
  if ((m === 'POST' || m === 'PUT') && RE_CARICAMENTO.test(p)) return 'caricamento';
  return 'scrittura';
}

// Il middleware. `chiaveDi(req)` deve dare l'identità (login di sessione, o
// indirizzo come ripiego).
export function montaArgine(app, { chiaveDi, classi = CLASSI, suRifiuto } = {}) {
  const argini = {};
  for (const [nome, cfg] of Object.entries(classi)) argini[nome] = creaArgine(cfg);
  const pulizia = setInterval(() => { for (const a of Object.values(argini)) a.pulisci(); }, 120_000);
  pulizia.unref();

  app.use((req, res, next) => {
    const multipart = String(req.headers['content-type'] || '').startsWith('multipart/');
    const classe = classifica(req.method, req.path, multipart);
    if (!classe) return next();
    const esito = argini[classe].permetti(classe + '|' + chiaveDi(req));
    if (esito.ok) return next();
    const secondi = Math.max(1, Math.ceil(esito.fraMs / 1000));
    suRifiuto?.(classe, req);
    res.set('Retry-After', String(secondi));
    return res.status(429).json({ errore: 'troppe richieste, riprova fra ' + secondi + ' secondi' });
  });

  return { argini, fermati: () => clearInterval(pulizia) };
}
