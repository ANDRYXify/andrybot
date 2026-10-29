// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL SERVIZIO DEI COLPI (docs/COLPI.md): la mira, il pagamento, la consegna.
// Le regole stanno nel modello (colpi.js); qui si mettono insieme registro,
// effetti e impostazioni, che arrivano da fuori: cosi' le prove lo fanno
// girare senza database e senza rete.
//
// CHI PAGA VEDE IL SUO COLPO, O RIAVE I SOLDI. Per costruzione:
//  · si paga solo un colpo CONSEGNABILE adesso (diretta in onda, un overlay
//    che ha detto di mostrare gli effetti, l'effetto che c'e'): la mira, il
//    tasto «Paga» e il riscatto lo controllano, e la pagina toglie i modi di
//    pagare appena smette di esserlo;
//  · pagato non vuol dire visto: la mira resta «pagata» finche' un overlay non
//    dice di averla MOSTRATA (`visto`); fino ad allora la ronda la rimanda;
//  · se in CONSEGNA_MS non si vede, euro e punti tornano indietro da soli (il
//    rimborso sul conto dello streamer, il riscatto CANCELED). I Bit non li
//    puo' rimborsare nessuno fuori da Twitch: per questo la pagina li chiede
//    solo quando il colpo e' consegnabile, e un colpo a Bit pagato resta in
//    coda finche' un overlay non lo mostra. Con i Bit da spendere accesi
//    (sotto) anche i Bit tornano: come saldo della pagina, a chi li ha mandati.
import { valutaDi, valutaMira, cfgValuta, regoleMira, serveIn, personaKick, normalizza, puntoBuono, puntoChat, voceDi, metodiDi, mistiDi, bitServe, bitResi, togliUltimi, scadenzaBit, zainoDi, nuovoCodice, codiceIn, nomeChi, frasePresenza, premioSerie, serieDopo, SCADENZA_MS,
  voceBuono, valoreBuono, puntiPer, buonoCopre, titoloPremioPrezzo } from './colpi.js';
import { randomBytes, createHash } from 'node:crypto';

// Gli effetti che si possono mirare: quelli che si posano in un punto. Un'immagine
// o un video (non a tutto schermo), e un lancio (docs/LANCI.md), che per come e'
// fatto arriva col centro nel punto. I disegni girano a tutto schermo, senza un punto.
export const MIRABILE = (eff) => !!eff && (eff.tipo === 'lancio' || ((eff.tipo === 'immagine' || eff.tipo === 'video') && eff.schermo !== 'riempi' && eff.schermo !== 'intero'));
// quanto si aspetta che un overlay mostri un colpo pagato, prima di rimborsarlo
export const CONSEGNA_MS = 10 * 60_000;
// ogni quanto si rimanda un colpo non ancora visto (l'overlay riconosce quelli
// che ha gia' in fila: un rinvio non lo mostra due volte)
export const RINVIO_MS = 20_000;
// una presenza che l'overlay non mostra in tre minuti non si mostra piu': il
// momento e' passato (come per chi arriva in chat), e lo spettatore la puo' rifare
export const PRESENZA_MS = 3 * 60_000;
// la voce di una presenza: non e' una voce del listino (quelle sono [a-z0-9])
export const VOCE_PRESENZA = '@presenza';

// `monete`: le monete del canale (economia.js): `punta` (tutte o niente:
// { tolte, ricevuta } o null), `rendi` (la ricevuta torna com'era) e `saldo`. Senza, i colpi non
// si pagano in monete.
// `crediti`: i Bit da spendere sulla pagina (db.pewBit): `entra`, `spendi`
// (tutti o niente, con la ricevuta dei lotti), `rendi`, `saldo`, `prossima`;
// ogni movimento una volta per riferimento. Senza, i Bit fanno come prima.
// `fusoDi`: il fuso del canale, per le scadenze. `zaino`: lo zaino (db.pewZaino);
// senza, non si compra per dopo.
export function creaServizioColpi({ registro, effects, effettoDi, impostazioni, inOnda = () => true, overlay = () => true,
  rimborsaEuro = async () => ({ errore: 'nessun conto' }), chiudiPremio = async () => true, monete = null, serie = null, crediti = null,
  zaino = null, fusoDi = () => 'Europe/Rome', ora = () => Date.now(), log = null,
  // la porta della presenza (docs/COLPI.md, «La presenza come porta»): i Bit
  // che non pagano un colpo vanno da spendere solo a chi e' presente
  presente = () => true }) {
  const ultimaDi = new Map();
  const cfgDi = (login) => normalizza(impostazioni(login));

  // I BIT DA SPENDERE (docs/COLPI.md, «I Bit da spendere»). Un Bit vale una
  // volta: quello che paga un colpo resta sulla mira (`versanti`, in ordine,
  // a nome di chi l'ha mandato), quello che non lo paga diventa saldo. La resa
  // si scrive sulla mira (`prezzi.resa`): i Bit di quella mira tornano con la
  // resa di quando e' stata aperta, anche se intanto lo streamer la cambia.
  // (i Kicks da spendere sono la stessa cosa per chi e' su Kick: `valuta` 'kicks', «Su Kick»)
  const resaDi = (ch, valuta = 'bit') => { const c = cfgDi(ch); const v = cfgValuta(c, valuta); return crediti && c.attivo && v.attivo ? v.resa : 0; };
  // le scadenze di adesso (docs/COLPI.md, «Quando scadono»): quella dei Bit
  // che arrivano, la spinta dell'inattivita', e fin dove vale un lotto che torna
  const scadenze = (ch, valuta = 'bit') => {
    const sc = cfgValuta(cfgDi(ch), valuta).scadenza, adesso = ora();
    const nuova = scadenzaBit(sc, adesso, fusoDi(ch));
    return { scade: nuova, rinnova: sc.tipo === 'inattivo' ? nuova : 0, almeno: sc.tipo === 'mai' ? 0 : adesso + sc.grazia * 3600_000 };
  };
  // la valuta e' quella della persona: i suoi Kicks se e' su Kick, i suoi Bit se no
  function accredita(ch, chi, n, rif, nome = '') {
    if (!crediti || !chi || chi === '-' || !(n > 0)) return 0;
    const valuta = valutaDi(chi);
    const { scade, rinnova } = scadenze(ch, valuta);
    try { return crediti.entra(ch, chi, n, rif, { nome, scade, rinnova, tetto: cfgValuta(cfgDi(ch), valuta).tetto, ora: ora() }); } catch (e) { log?.warn?.(`Bit da spendere su #${ch}:`, e?.message || e); return 0; }
  }
  function restituisci(ch, chi, ricevuta, rif) {
    if (!crediti || !chi) return 0;
    const { rinnova, almeno } = scadenze(ch, valutaDi(chi));
    try { return crediti.rendi(ch, chi, ricevuta, rif, { almeno, rinnova, ora: ora() }); } catch (e) { log?.warn?.(`Bit da spendere su #${ch}:`, e?.message || e); return 0; }
  }
  // quelli presi dal saldo tornano coi loro lotti, quelli dei cheer con la resa della mira
  const rendiVersanti = (m, lista, perche) => lista.reduce((t, [chi, n, da, ric], i) =>
    t + (da === 'p' ? restituisci(m.login, chi, ric || [{ scade: 0, quanti: n }], `${perche}:${m.id}:${i}`) : accredita(m.login, chi, bitResi(regoleMira(m, valutaDi(chi)).resa, n), `${perche}:${m.id}:${i}`)), 0);
  // un Bit della mira puo' tornare: quelli del saldo sempre, quelli dei cheer
  // se si sa di chi sono e se la mira e' nata coi Bit dei colpi che tornano
  const rendibile = (m, [chi, , da]) => da === 'p' || (!!chi && chi !== '-' && regoleMira(m, valutaDi(chi)).resa > 0 && regoleMira(m, valutaDi(chi)).rendiColpi);
  // si sa di chi e' ogni Bit della mira, e tutti possono tornare: solo cosi' tornano
  const tracciati = (m) => m.versanti.length > 0 && m.versanti.every((v) => rendibile(m, v))
    && m.versanti.reduce((t, v) => t + (Number(v[1]) || 0), 0) === (Number(m.versati) || 0);
  const saldoBit = (login, chi) => (crediti && chi ? crediti.saldo(String(login || '').toLowerCase(), String(chi), ora()) : 0);
  // i Bit che scadono per primi, se scadono entro i giorni dell'avviso: { quanti, scade } o null
  function scadonoBit(login, chi) {
    const ch = String(login || '').toLowerCase();
    if (!crediti || !chi) return null;
    const l = crediti.prossima(ch, String(chi), ora());
    const giorni = cfgValuta(cfgDi(ch), valutaDi(chi)).scadenza.avviso;
    return l && giorni > 0 && l.scade - ora() <= giorni * 86400_000 ? { quanti: l.quanti, scade: l.scade } : null;
  }

  // Consegnabile adesso: la stessa domanda per la mira, per «Paga» e per il
  // riscatto. Torna '' se si', se no il motivo.
  function consegnabile(login, idVoce) {
    const ch = String(login || '').toLowerCase();
    const cfg = cfgDi(ch);
    if (!cfg.attivo) return 'spento';
    if (cfg.pausa) return 'pausa';
    if (!inOnda(ch)) return 'offline';
    if (!overlay(ch)) return 'overlay';
    const voce = voceDi(cfg, idVoce);
    if (!voce || (!metodiDi(voce).length && !mistiDi(voce).length)) return 'voce';
    if (!MIRABILE(effettoDi(ch, voce.comando))) return 'effetto';
    return '';
  }

  // COMPRABILE PER DOPO (docs/COLPI.md, «Lo zaino»): la pagina accesa e non in
  // pausa, lo zaino acceso per quella voce, l'effetto che c'e'. Niente diretta
  // ne' overlay: per dopo si compra anche a canale spento.
  function comprabile(login, idVoce) {
    const ch = String(login || '').toLowerCase();
    const cfg = cfgDi(ch);
    if (!cfg.attivo) return 'spento';
    if (cfg.pausa) return 'pausa';
    const voce = voceDi(cfg, idVoce);
    if (!zaino || !voce || !zainoDi(cfg, voce)) return 'zaino';
    if (!metodiDi(voce).length && !mistiDi(voce).length) return 'voce';
    if (!MIRABILE(effettoDi(ch, voce.comando))) return 'effetto';
    return '';
  }
  // Una mira si paga adesso con questo mezzo? '' se si', se no il motivo. Per
  // dopo: comprabile, e con un mezzo che lo streamer accetta per lo zaino.
  const MEZZO_ZAINO = { monete: 'monete', bit: 'bit', kicks: 'kicks', 'monete+bit': 'misto', 'monete+kicks': 'misto', 'monete+punti': 'misto', misto: 'misto', cheer: 'cheer', regalo: 'regalo', punti: 'punti', euro: 'euro' };
  // i metodi che raccolgono a versamenti (Bit o Kicks), e quello di una valuta
  const A_VERSAMENTI = new Set(['bit', 'monete+bit', 'kicks', 'monete+kicks']);
  const metodoDi = (valuta, misto) => (misto ? 'monete+' : '') + (valuta === 'kicks' ? 'kicks' : 'bit');
  function pronta(m, mezzo) {
    if (!m?.dopo) return consegnabile(m?.login, m?.voce);
    const no = comprabile(m.login, m.voce);
    if (no) return no;
    return cfgDi(m.login).zaino.con[MEZZO_ZAINO[mezzo] || mezzo] ? '' : 'mezzo';
  }

  // La mira: il punto si controlla adesso, il prezzo si scrive adesso. Con
  // `dopo` e' un acquisto per lo zaino: niente punto, e serve sapere di chi e'
  // (lo zaino e' suo), con posto nello zaino contando gli acquisti ancora aperti.
  function mira(login, { voce: idVoce, x, y, chi = '', chiave = '', spettatore = '', dopo = false } = {}) {
    const ch = String(login || '').toLowerCase();
    const no = dopo ? comprabile(ch, idVoce) : consegnabile(ch, idVoce);
    if (no) return { ok: false, motivo: no };
    const cfg = cfgDi(ch);
    const voce = voceDi(cfg, idVoce);
    if (dopo) {
      if (!spettatore) return { ok: false, motivo: 'accesso' };
      const z = zaino.conta(ch, spettatore, ora());
      const aperte = registro.dopoAperte(ch, spettatore, ora());
      if (cfg.zaino.massimo && z.tutti + aperte.length >= cfg.zaino.massimo) return { ok: false, motivo: 'zaino-pieno', massimo: cfg.zaino.massimo };
      if (cfg.zaino.massimoVoce && (z.voci[voce.id] || 0) + aperte.filter((v) => v === voce.id).length >= cfg.zaino.massimoVoce) return { ok: false, motivo: 'zaino-pieno', massimo: cfg.zaino.massimoVoce };
    }
    const punto = dopo ? { ok: true, x: 50, y: 50 } : puntoBuono(cfg, x, y);
    if (!punto.ok) return { ok: false, motivo: punto.motivo };
    const adesso = ora();
    // le chiavi dell'attesa: l'indirizzo, la persona; la piu' recente comanda
    const chiavi = (Array.isArray(chiave) ? chiave : [chiave]).map((c) => ch + '|' + String(c || ''));
    const prima = Math.max(0, ...chiavi.map((k) => ultimaDi.get(k) || 0));
    if (cfg.attesaSec && adesso - prima < cfg.attesaSec * 1000) return { ok: false, motivo: 'attesa', fraSec: Math.ceil((prima + cfg.attesaSec * 1000 - adesso) / 1000) };
    if (registro.aperteDa(ch, adesso - 60_000) >= cfg.alMinuto) return { ok: false, motivo: 'troppi' };
    const m = {
      id: randomBytes(9).toString('hex'), login: ch, voce: voce.id, comando: voce.comando, nome: voce.nome,
      x: punto.x, y: punto.y, scala: voce.scala, chi: cfg.conNome ? nomeChi(chi) : '',
      prezzi: { euro: voce.euro, punti: voce.punti, bit: voce.bit, kicks: voce.kicks, puntiKick: voce.puntiKick, monete: voce.monete, misti: voce.misti || {}, resa: resaDi(ch),
        rendiColpi: cfg.bitPew.rendiColpi, rendiMire: cfg.bitPew.rendiMire,
        k: { resa: resaDi(ch, 'kicks'), rendiColpi: cfg.kicksPew.rendiColpi, rendiMire: cfg.kicksPew.rendiMire } }, creata: adesso, scade: adesso + SCADENZA_MS,
      spettatore: String(spettatore || ''), dopo: !!dopo,
    };
    for (let i = 0; i < 12; i++) { m.codice = nuovoCodice(); if (registro.apri(m)) { for (const k of chiavi) ultimaDi.set(k, adesso); return { ok: true, mira: { ...m, metodi: metodiDi(voce) } }; } }
    return { ok: false, motivo: 'codice' };
  }

  // Manda all'overlay un colpo pagato. Non lo segna visto: lo fa l'overlay.
  function manda(m) {
    const ch = m.login;
    if (!inOnda(ch) || !overlay(ch) || !MIRABILE(effettoDi(ch, m.comando))) return false;
    registro.tentata(m.id, ora());
    return !!effects.fireConOpzioni(ch, m.comando, { xy: { x: m.x, y: m.y, s: m.scala, r: 0, centro: true }, attacco: { id: m.id, chi: m.chi, nome: m.nome } });
  }

  // Il pagamento e' arrivato: una volta sola, qualunque cosa lo paghi. Un
  // acquisto per dopo va nello zaino, nello stesso passaggio in cui nasce.
  function incassa(m, metodo, riferimento = '', premio = '', ancheScaduta = false, ricevuta = null) {
    if (!m || !registro.paga(m.id, metodo, riferimento, ora(), premio, ancheScaduta, ricevuta)) return false;
    if (m.dopo) { alloZaino(registro.get(m.id)); return true; }
    const fatto = manda(registro.get(m.id));
    log?.info?.(`colpo ${m.nome} pagato su #${m.login} (${metodo})${fatto ? '' : ': in coda, nessun overlay pronto'}`);
    return true;
  }

  function alloZaino(m) {
    const cfg = cfgDi(m.login);
    const voce = voceDi(cfg, m.voce);
    const sc = (voce && zainoDi(cfg, voce)) || cfg.zaino.scadenza;
    const scade = scadenzaBit(sc, ora(), fusoDi(m.login));
    // lo streamer usa i punti premio: il riscatto si chiude subito, il colpo e' consegnato nello zaino
    if ((m.metodo === 'punti' || m.metodo === 'monete+punti') && m.premio) chiudi(m, 'FULFILLED');
    const ok = registro.nelloZaino(m.id, { id: randomBytes(9).toString('hex'), channel: m.login, chi: m.spettatore, nome: m.chi, voce: m.voce, comprato: ora(), scade });
    if (ok) rinnovaZaino(m.login, m.spettatore);
    log?.info?.(`colpo ${m.nome} su #${m.login} comprato per dopo (${m.metodo})${ok ? '' : ': gia\' nello zaino'}`);
    return ok;
  }

  // lo zaino «inattivo»: ogni acquisto e ogni lancio sposta in avanti tutti i colpi di quella persona
  function rinnovaZaino(ch, chi) {
    const sc = cfgDi(ch).zaino.scadenza;
    if (zaino && chi && sc.tipo === 'inattivo') zaino.rinnova(ch, String(chi), scadenzaBit(sc, ora(), fusoDi(ch)), ora());
  }

  async function chiudi(m, stato) {
    const [premio, riscatto] = String(m.premio || '').split(':');
    try { return !!(await chiudiPremio(m.login, premio, riscatto, stato)); } catch (e) { log?.warn?.(`riscatto del colpo #${m.login}:`, e?.message || e); return false; }
  }

  // LA PRESENZA dalla chat (docs/COLPI.md, «La presenza»). Le stesse domande di
  // un colpo (pagina accesa, non in pausa, in onda, un overlay, l'effetto che
  // c'e', il punto fuori dalle zone), un tetto suo al minuto, e una sola per
  // spettatore per diretta: `occasione` e' la diretta (arrivi.occasioneDiretta),
  // `chiave` chi e' (piattaforma e id). Il resto e' la strada dei colpi: l'overlay
  // la mostra in fila e dice «visto», la ronda la rimanda.
  function presenza(login, { chiave = '', nome = '', occasione = '', lingua = 'it' } = {}) {
    const ch = String(login || '').toLowerCase();
    const cfg = cfgDi(ch);
    const p = cfg.presenza;
    if (!cfg.attivo || !p.attiva) return { esito: 'spenta' };
    if (!chiave || !occasione) return { esito: 'spenta' };
    if (cfg.pausa) return { esito: 'fermo', motivo: 'pausa' };
    if (!inOnda(ch)) return { esito: 'fermo', motivo: 'offline' };
    if (!overlay(ch)) return { esito: 'fermo', motivo: 'overlay' };
    if (!MIRABILE(effettoDi(ch, p.comando))) return { esito: 'fermo', motivo: 'effetto' };
    const punto = puntoBuono(cfg, p.x, p.y);
    if (!punto.ok) return { esito: 'fermo', motivo: punto.motivo };
    if (!nomeChi(nome)) return { esito: 'spenta' };
    const adesso = ora();
    if (registro.presenzeDa(ch, adesso - 60_000) >= p.alMinuto) return { esito: 'troppe' };
    // la serie: di fila se la sua ultima presenza era alla diretta subito prima
    // di questa. Le monete una volta per diretta: una presenza rifatta dopo che
    // la prima non si e' vista non le ridà.
    serie?.segnaDiretta(ch, occasione, adesso);
    const prima = serie?.get(ch, chiave) || null;
    const n = serieDopo(prima, occasione, serie?.precedente(ch, occasione) || '');
    const nuova = prima?.ultima !== occasione;
    const premio = nuova ? premioSerie(p, n) : 0;
    const chi = frasePresenza(cfg, nome, lingua, { serie: n, monete: premioSerie(p, n) });
    const m = { id: randomBytes(9).toString('hex'), login: ch, voce: VOCE_PRESENZA, comando: p.comando, nome: 'Presenza',
      x: punto.x, y: punto.y, scala: p.scala, chi, riferimento: `presenza:${occasione}:${chiave}` };
    if (!registro.presenza(m, adesso)) return { esito: 'gia' };
    serie?.metti(ch, chiave, { ultima: occasione, serie: n, record: Math.max(prima?.record || 0, n), ts: adesso });
    const fatto = manda(registro.get(m.id));
    log?.info?.(`presenza su #${ch}${fatto ? '' : ': in coda, nessun overlay pronto'}`);
    return { esito: 'partita', serie: n, monete: premio, nuova };
  }

  // La prova dal pannello: la stessa presenza, subito, senza registro (non e'
  // di nessuno e non conta), col nome dello streamer. L'effetto deve esserci.
  function provaPresenza(login, { nome = '', lingua = 'it', presenza: bozza = null } = {}) {
    const ch = String(login || '').toLowerCase();
    const cfg = cfgDi(ch);
    const p = bozza ? normalizza({ presenza: { ...bozza, attiva: true } }).presenza : cfg.presenza;
    if (!MIRABILE(effettoDi(ch, p.comando))) return { ok: false, motivo: 'effetto' };
    const punto = puntoBuono(cfg, p.x, p.y);
    if (!punto.ok) return { ok: false, motivo: punto.motivo };
    const chi = frasePresenza({ presenza: p }, nome, lingua, { serie: 1, monete: premioSerie(p, 1) });
    const ok = !!effects.fireConOpzioni(ch, p.comando, { xy: { x: punto.x, y: punto.y, s: p.scala, r: 0, centro: true }, attacco: { id: '', chi, nome: 'Presenza' } });
    return ok ? { ok: true } : { ok: false, motivo: 'overlay' };
  }

  // L'overlay l'ha mostrato. Coi punti canale il riscatto si chiude adesso.
  async function visto(login, id) {
    const m = registro.getDi(String(login || '').toLowerCase(), String(id || ''));
    if (!m || !registro.consegnata(m.id, ora())) return false;
    if (m.metodo === 'punti' && m.premio) await chiudi(m, 'FULFILLED');
    return true;
  }

  // La ronda: rimanda quello che non si e' visto, rimborsa quello che non si
  // vedra'. Un rimborso che non riesce si ritenta al giro dopo.
  // Un giro alla volta: due giri insieme potrebbero rimborsare due volte.
  let inGiro = false;
  async function ronda() {
    if (inGiro) return;
    inGiro = true;
    try { await giro(); } finally { inGiro = false; }
  }
  async function giro() {
    const adesso = ora();
    // un modo misto lasciato a meta': le monete dell'acconto tornano, una volta sola
    for (const m of registro.accontiScaduti(adesso)) {
      if (registro.scadi(m.id) && monete && m.acconto?.ricevuta) {
        try { monete.rendi(m.login, m.acconto.user, m.acconto.ricevuta); } catch (e) { log?.warn?.(`acconto del colpo su #${m.login}:`, e?.message || e); }
      }
    }
    // LO ZAINO: un colpo comprato che scade esce, una volta sola; se lo streamer
    // vuole, tornano i saldi con cui era stato pagato
    if (zaino) {
      for (const z of zaino.scaduti(adesso)) {
        if (!zaino.scadi(z.id)) continue;
        const p = registro.get(z.mira);
        if (p && cfgDi(z.channel).zaino.rendi) rendiAcquisto(p);
        log?.info?.(`colpo per dopo su #${z.channel} scaduto nello zaino`);
      }
    }
    // i Bit di una mira che non si paghera' piu': tornano a chi li ha mandati, una volta sola
    for (const m of registro.versatiPersi()) {
      if (!registro.svuota(m.id) || !regoleMira(m, valutaMira(m)).rendiMire) continue;
      const resi = rendiVersanti(m, m.versanti, 'persi');
      if (resi) log?.info?.(`colpo ${m.nome} su #${m.login} mai pagato: ${resi} ${valutaMira(m) === 'kicks' ? 'Kicks' : 'Bit'} tornati da spendere`);
    }
    for (const m of registro.daConsegnare()) {
      if (m.metodo === 'presenza') {
        if (adesso - m.pagata_at > PRESENZA_MS) registro.lasciata(m.id);
        else if (adesso - (m.tentata_at || 0) >= RINVIO_MS) manda(m);
        continue;
      }
      // lanciato dallo zaino e non comparso: torna nello zaino, pieno
      if (m.metodo === 'zaino' && adesso - m.pagata_at > CONSEGNA_MS) {
        const almeno = adesso + cfgDi(m.login).zaino.scadenza.grazia * 3600_000;
        if (registro.rimborsata(m.id) && zaino?.rimetti(String(m.riferimento).replace(/^zaino:/, ''), m.id, almeno)) log?.info?.(`colpo ${m.nome} su #${m.login} non mostrato: torna nello zaino`);
        continue;
      }
      // un acquisto per dopo rimasto pagato (il passaggio allo zaino interrotto): va nello zaino, mai all'overlay
      if (m.dopo) { alloZaino(m); continue; }
      // un colpo a Bit che non compare: i Bit tornano da spendere, e le monete
      // dell'acconto. Solo se si sa di chi e' ogni Bit; se no resta in coda.
      if (A_VERSAMENTI.has(m.metodo) && adesso - m.pagata_at > CONSEGNA_MS && crediti && tracciati(m)) {
        if (registro.rimborsata(m.id)) {
          const resi = rendiVersanti(m, m.versanti, 'reso');
          if (m.metodo.startsWith('monete+') && monete && m.acconto?.ricevuta) {
            try { monete.rendi(m.login, m.acconto.user, m.acconto.ricevuta); } catch (e) { log?.warn?.(`monete del colpo su #${m.login}:`, e?.message || e); }
          }
          log?.info?.(`colpo ${m.nome} su #${m.login} non mostrato: ${resi} Bit tornati da spendere (${m.metodo})`);
        }
        continue;
      }
      if (!A_VERSAMENTI.has(m.metodo) && adesso - m.pagata_at > CONSEGNA_MS) {
        let ok = false;
        if (m.metodo === 'monete+punti') {
          // i punti col riscatto annullato, e le monete dell'acconto: dopo, una volta sola
          if (await chiudi(m, 'CANCELED') && registro.rimborsata(m.id)) {
            try { monete?.rendi(m.login, m.acconto?.user, m.ricevuta || []); } catch (e) { log?.warn?.(`monete del colpo su #${m.login}:`, e?.message || e); }
            log?.info?.(`colpo ${m.nome} su #${m.login} non mostrato: rimborsato (monete+punti)`);
          }
          continue;
        }
        if (m.metodo === 'punti') ok = await chiudi(m, 'CANCELED');
        else if (m.metodo === 'monete') { try { ok = !!monete && !!m.ricevuta && (monete.rendi(m.login, String(m.riferimento).replace(/^monete:/, ''), m.ricevuta), true); } catch { ok = false; } }
        else if (m.metodo === 'euro') { try { ok = !!(await rimborsaEuro(m.login, m.riferimento))?.ok; } catch { ok = false; } }
        if (ok && registro.rimborsata(m.id)) log?.info?.(`colpo ${m.nome} su #${m.login} non mostrato: rimborsato (${m.metodo})`);
        else if (!ok) log?.warn?.(`colpo ${m.nome} su #${m.login} non mostrato, rimborso non riuscito (${m.metodo}): riprovo`);
        continue;
      }
      if (adesso - (m.tentata_at || 0) >= RINVIO_MS) manda(m);
    }
  }

  // I Bit: il cheer porta il codice nel messaggio. Chi ha mirato con l'accesso
  // a Twitch non ha bisogno del codice: un suo cheer che da solo copre quello
  // che manca paga la sua ultima mira aperta. Solo da solo: un cheer piu'
  // piccolo, fatto magari per altro, non si somma di nascosto (col codice si').
  // Sulla mira va solo quello che serve; il resto del cheer, o tutto se non
  // paga niente, diventa Bit da spendere (`evento`: l'id del messaggio di
  // EventSub, cosi' lo stesso cheer rimandato non conta due volte).
  function daCheer(login, { bits, message, user_login = '', user_id = '', is_anonymous = false, evento = '' } = {}) {
    const chi = !is_anonymous && user_id ? String(user_id) : '-';
    return dono(login, 'bit', { n: bits, message, user_login, chi, spettatore: is_anonymous ? '' : String(user_id || ''), rif: 'cheer:' + (evento || `${chi}:${ora()}:${bits}`) });
  }
  // I KICKS (docs/COLPI.md, «Su Kick»): il regalo di Kick col codice nel suo
  // messaggio paga come un cheer; chi ha mirato con l'accesso a Kick la paga
  // senza codice; quello che avanza diventa Kicks da spendere.
  function daKicks(login, { kicks, message, user_login = '', user_id = '', evento = '' } = {}) {
    const chi = user_id ? personaKick(user_id) : '-';
    return dono(login, 'kicks', { n: kicks, message, user_login, chi, spettatore: chi === '-' ? '' : chi, rif: 'regalo:' + (evento || `${chi}:${ora()}:${kicks}`) });
  }
  // un dono (cheer o regalo) di `valuta`: sulla mira quello che serve, il resto da spendere
  function dono(login, valuta, { n: quanti, message, user_login, chi, spettatore, rif }) {
    const ch = String(login || '').toLowerCase();
    const n = Math.max(0, Math.trunc(Number(quanti) || 0));
    const { usati = 0, ...r } = cheerSuMira(ch, n, chi, message, user_login, spettatore, valuta);
    const resa = resaDi(ch, valuta);
    const avanzo = n - usati;
    const salva = resa && avanzo > 0 && avanzo >= cfgValuta(cfgDi(ch), valuta).minimo;
    // chiuso dalla porta: il cheer resta un cheer, ma non va da spendere
    if (salva && !presente(ch, chi)) return { ...r, fuoriPorta: avanzo };
    const dati = salva ? accredita(ch, chi, bitResi(resa, avanzo), rif, user_login) : 0;
    return dati ? { ...r, [valuta === 'kicks' ? 'kicksPew' : 'bitPew']: dati, saldo: saldoBit(ch, chi) } : r;
  }
  function cheerSuMira(ch, n, chi, message, user_login, spettatore, valuta = 'bit') {
    const codice = codiceIn(message);
    let m = codice ? registro.perCodice(ch, codice, ora()) : null;
    if (!m && !codice && spettatore) {
      const sua = registro.apertaDi(ch, String(spettatore), ora());
      const manca = sua ? serveIn(sua, valuta) - (Number(sua.versati) || 0) : 0;
      if (sua && manca > 0 && n >= manca) m = sua;
    }
    if (m && m.dopo && pronta(m, valuta === 'kicks' ? 'regalo' : 'cheer')) m = null;
    if (!m) return codice ? { esito: 'sconosciuto', codice } : { esito: 'nessuno' };
    // quanti ne chiede adesso: il prezzo, o il resto del modo misto con le
    // monete gia' pagate. Un modo misto ancora senza monete li conta lo
    // stesso: niente va perso, e quando arrivano le monete il colpo parte.
    // Una mira che raccoglie gia' nell'altra valuta non ne prende (serveIn: 0).
    const serve = serveIn(m, valuta);
    const misto = !m.acconto && !(Number(m.versati) > 0 && valutaMira(m) !== valuta) ? m.prezzi?.misti?.[valuta] : null;
    if (!(serve > 0) && !misto) return { esito: 'sconosciuto', codice };
    const voluti = serve > 0 ? serve : misto[valuta];
    const usati = Math.min(n, Math.max(0, voluti - (Number(m.versati) || 0)));
    const totale = usati ? registro.versa(m.id, usati, chi, '', null, valuta) : Number(m.versati) || 0;
    if (totale == null) return { esito: 'sconosciuto', codice };
    if (serve > 0 && totale >= serve) {
      if (!incassa(m, metodoDi(valuta, !!m.acconto), `${valuta === 'kicks' ? 'regalo' : 'cheer'}:${user_login}:${ora()}`, '', false, m.acconto?.ricevuta || null)) return { esito: 'gia', codice, nome: m.nome, usati };
      return { esito: 'pagato', codice, nome: m.nome, inCoda: !m.dopo && !!consegnabile(ch, m.voce), dopo: !!m.dopo, usati };
    }
    if (misto && totale >= misto[valuta]) return { esito: 'servono-monete', codice, nome: m.nome, monete: misto.monete, modo: valuta, usati };
    return { esito: 'pochi', codice, serve: voluti, mancano: voluti - totale, nome: m.nome, usati };
  }

  // I Bit da spendere, dalla pagina (con l'accesso: `chi` e' l'id Twitch).
  // Pagano quello che manca del prezzo in Bit (o del resto di un modo misto
  // con le monete gia' pagate), tutto o niente. Le stesse regole degli altri
  // modi: una mira aperta, senza un pagamento in euro in corso, un colpo che
  // adesso puo' comparire. Se il colpo poi non compare, tornano.
  // Per chi e' su Kick (`chi` = k:<id>) e' lo stesso, coi suoi Kicks da spendere.
  function daBitPew(login, { id = '', chi = '', nome = '' } = {}) {
    const ch = String(login || '').toLowerCase();
    const c = String(chi || '');
    const valuta = valutaDi(c);
    if (!crediti || !c || !resaDi(ch, valuta)) return { esito: 'spento' };
    const m = registro.getDi(ch, String(id || ''));
    if (!m || m.stato !== 'attesa' || !(regoleMira(m, valuta).resa > 0) || (m.scade <= ora() && !(Number(m.versati) > 0))) return { esito: 'sconosciuto' };
    if (m.riferimento) return { esito: 'gia' };
    const serve = serveIn(m, valuta);
    if (!(serve > 0)) {
      const misto = !m.acconto && !(Number(m.versati) > 0 && valutaMira(m) !== valuta) ? m.prezzi?.misti?.[valuta] : null;
      return misto ? { esito: 'servono-monete', nome: m.nome, monete: misto.monete } : { esito: 'sconosciuto' };
    }
    const no = pronta(m, m.acconto ? 'misto' : valuta);
    if (no) return { esito: 'fermo', motivo: no, nome: m.nome };
    const manca = serve - (Number(m.versati) || 0);
    if (!(manca > 0)) return { esito: 'gia' };
    const ricevuta = crediti.spendi(ch, c, manca, `spesa:${m.id}`, { rinnova: scadenze(ch, valuta).rinnova, ora: ora() });
    if (!ricevuta) return { esito: 'pochi', serve: manca, saldo: saldoBit(ch, c), nome: m.nome };
    if (registro.versa(m.id, manca, c, 'p', ricevuta, valuta) == null || !incassa(registro.get(m.id), metodoDi(valuta, !!m.acconto), `${valuta === 'kicks' ? 'kickspew' : 'bitpew'}:` + c, '', false, m.acconto?.ricevuta || null)) {
      restituisci(ch, c, ricevuta, `reso:${m.id}:spesa`);
      return { esito: 'gia' };
    }
    return { esito: 'pagato', nome: m.nome, [valuta]: manca, saldo: saldoBit(ch, c) };
  }

  // I punti canale: il premio della voce, col codice scritto nel riscatto.
  // `stato` e' quello da dare SUBITO al riscatto: CANCELED (i punti tornano) se
  // il codice non vale o se il colpo adesso non si puo' consegnare; null se il
  // colpo e' pagato: il riscatto si chiude quando l'overlay lo mostra
  // (FULFILLED) o, se non succede, alla scadenza della consegna (CANCELED).
  // Chi ha mirato con l'accesso a Twitch puo' scrivere quello che vuole: vale la
  // sua ultima mira aperta su una voce di quel premio.
  // Un premio puo' servire piu' voci (docs/COLPI.md, «I premi su Twitch»): il
  // premio dice quanto si paga, la mira quale colpo. La mira vale se la sua
  // voce e' fra quelle del premio.
  function miraDelPremio(ch, voci, user_input, user_id) {
    const sue = new Set(voci.map((v) => v.id));
    const codice = codiceIn(user_input);
    let m = codice ? registro.perCodice(ch, codice, ora()) : null;
    if ((!m || !sue.has(m.voce)) && user_id) {
      const sua = registro.apertaDi(ch, String(user_id), ora());
      if (sua && sue.has(sua.voce)) m = sua;
    }
    return { m: m && sue.has(m.voce) ? m : null, codice };
  }
  // Su Kick (docs/COLPI.md, «Su Kick»): i premi di Kick, il prezzo in punti di
  // Kick e la persona k:<id>; niente misto, che coi punti e' di Twitch.
  function daRiscatto(login, { reward_id, user_input = '', id = '', user_id = '', user_login = '', piattaforma = 'twitch' } = {}) {
    const ch = String(login || '').toLowerCase();
    const cfg = cfgDi(ch);
    if (piattaforma === 'kick') {
      const voci = reward_id ? (cfg.voci || []).filter((v) => v.premioKick === reward_id) : [];
      if (!voci.length) return { esito: 'non-mio' };
      const { m, codice } = miraDelPremio(ch, voci, user_input, user_id ? personaKick(user_id) : '');
      if (!m && cfg.flusso === 'zaino') return zainoDaPremio(ch, voci, { id, reward_id, persona: user_id ? personaKick(user_id) : '', nome: user_login, su: 'kick' });
      if (!m || !(Number(m.prezzi.puntiKick) > 0) || (voci[0].premioKickCosto && Number(m.prezzi.puntiKick) !== voci[0].premioKickCosto)) return { esito: 'sconosciuto', stato: 'CANCELED', codice };
      const no = pronta(m, 'punti');
      if (no) return { esito: 'fermo', stato: 'CANCELED', motivo: no };
      return incassa(m, 'punti', `premio:${id}`, `${reward_id}:${id}`) ? { esito: 'pagato', stato: null, nome: m.nome, dopo: !!m.dopo } : { esito: 'gia', stato: 'CANCELED' };
    }
    const misti = reward_id ? (cfg.voci || []).filter((v) => v.premioMisto === reward_id) : [];
    if (misti.length) return daRiscattoMisto(ch, misti, { reward_id, user_input, id, user_id });
    const voci = reward_id ? (cfg.voci || []).filter((v) => v.premio === reward_id) : [];
    if (!voci.length) return { esito: 'non-mio' };
    const { m, codice } = miraDelPremio(ch, voci, user_input, user_id);
    if (!m && cfg.flusso === 'zaino') return zainoDaPremio(ch, voci, { id, reward_id, persona: String(user_id || ''), nome: user_login, su: 'twitch' });
    // il premio costa quello che costa la mira, o niente: una mira presa a un
    // prezzo vecchio non si paga con un premio di un altro prezzo
    if (!m || !(Number(m.prezzi.punti) > 0) || (voci[0].premioCosto && Number(m.prezzi.punti) !== voci[0].premioCosto)) return { esito: 'sconosciuto', stato: 'CANCELED', codice };
    // con un acconto per un modo misto la strada e' quella: niente punti pieni
    if (m.acconto) return { esito: 'gia', stato: 'CANCELED', codice };
    const no = pronta(m, 'punti');
    if (no) return { esito: 'fermo', stato: 'CANCELED', motivo: no };
    return incassa(m, 'punti', `premio:${id}`, `${reward_id}:${id}`) ? { esito: 'pagato', stato: null, nome: m.nome, dopo: !!m.dopo } : { esito: 'gia', stato: 'CANCELED' };
  }

  // UN RISCATTO SENZA MIRA FINISCE NELLO ZAINO (docs/COLPI.md, «I premi a punti
  // canale finiscono nello zaino»): di chi ha riscattato, che la piattaforma
  // dice sempre. Il premio di un colpo mette quel colpo; quello di un prezzo,
  // un buono da quei punti. La mira del riscatto ha un id che viene dal
  // riscatto: lo stesso riscatto due volte non mette due oggetti.
  function zainoDaPremio(ch, voci, { id, reward_id, persona, nome = '', su = 'twitch' }) {
    const cfg = cfgDi(ch);
    const no = (motivo) => ({ esito: 'fermo', stato: 'CANCELED', motivo });
    if (!zaino || !persona || !id) return no('zaino');
    if (!cfg.attivo) return no('spento');
    if (cfg.pausa) return no('pausa');
    if (!cfg.zaino.con.punti) return no('mezzo');
    const costo = Number(su === 'kick' ? voci[0].premioKickCosto || voci[0].puntiKick : voci[0].premioCosto || voci[0].punti) || 0;
    const nomePremio = String((su === 'kick' ? voci[0].premioKickNome : voci[0].premioNome) || '');
    const perPrezzo = voci.length > 1 || nomePremio.startsWith(titoloPremioPrezzo(costo));
    const voce = perPrezzo ? null : voci[0];
    if (voce ? comprabile(ch, voce.id) : !voci.some((v) => !comprabile(ch, v.id))) return no('zaino');
    if (!(costo > 0)) return no('voce');
    const z = zaino.conta(ch, persona, ora());
    const aperte = registro.dopoAperte(ch, persona, ora());
    const vz = voce ? voce.id : voceBuono(costo);
    if (cfg.zaino.massimo && z.tutti + aperte.length >= cfg.zaino.massimo) return { ...no('zaino-pieno'), massimo: cfg.zaino.massimo };
    if (voce && cfg.zaino.massimoVoce && (z.voci[vz] || 0) + aperte.filter((v) => v === vz).length >= cfg.zaino.massimoVoce) return { ...no('zaino-pieno'), massimo: cfg.zaino.massimoVoce };
    const adesso = ora();
    const m = { id: 'rz' + createHash('sha256').update(su + ':' + reward_id + ':' + id).digest('hex').slice(0, 22), login: ch, voce: vz, comando: voce ? voce.comando : '',
      nome: voce ? voce.nome : titoloPremioPrezzo(costo), x: 50, y: 50, scala: voce ? voce.scala : 100, chi: nomeChi(nome),
      prezzi: { [su === 'kick' ? 'puntiKick' : 'punti']: costo }, creata: adesso, scade: adesso + SCADENZA_MS, spettatore: persona, dopo: true };
    if (registro.get(m.id)) return { esito: 'doppio', stato: null };
    let aperta = false;
    for (let i = 0; i < 12 && !aperta; i++) { m.codice = nuovoCodice(); aperta = registro.apri(m); if (!aperta && registro.get(m.id)) return { esito: 'doppio', stato: null }; }
    if (!aperta) return no('codice');
    return incassa(registro.get(m.id), 'punti', `premio:${id}`, `${reward_id}:${id}`)
      ? { esito: 'pagato', stato: null, nome: m.nome, dopo: true, buono: perPrezzo ? costo : 0 } : { esito: 'gia', stato: 'CANCELED' };
  }
  // c'e' nello zaino qualcosa che lancia questa voce: un colpo suo, o un buono che basta
  function copreZaino(ch, chi, voce) {
    if (!zaino || !chi || !voce) return false;
    const valuta = valutaDi(chi);
    return zainoDi_(ch, chi).some((x) => x.voce === voce.id || buonoCopre(valoreBuono(x.voce), voce, valuta));
  }

  // LE MONETE DEL CANALE. Dalla pagina (con l'accesso a Twitch: `id` della mira,
  // `user` chi paga) o dalla chat («!pew K7QX3»: `codice`). Si spendono tutte o
  // niente, prima si guarda che il colpo si possa consegnare, e se la mira nel
  // frattempo e' gia' pagata la ricevuta torna subito: nessuno paga due volte.
  // Con `modo` ('bit' o 'punti') si paga l'acconto di quel modo misto: le
  // monete restano sulla mira finche' arriva il resto, e tornano se non arriva.
  function daMonete(login, { id = '', codice = '', user = '', modo = '' } = {}) {
    const ch = String(login || '').toLowerCase();
    const u = String(user || '').toLowerCase();
    if (!monete || !u) return { esito: 'spento' };
    const m = id ? registro.getDi(ch, String(id)) : codice ? registro.perCodice(ch, codice, ora()) : null;
    if (modo) return acconto(ch, m, u, modo, codice);
    if (!m || m.stato !== 'attesa' || !(Number(m.prezzi?.monete) > 0)) return { esito: 'sconosciuto', codice };
    if (m.riferimento || m.acconto) return { esito: 'gia', codice };
    const no = pronta(m, 'monete');
    if (no) return { esito: 'fermo', motivo: no, nome: m.nome };
    const n = Number(m.prezzi.monete);
    const presa = monete.punta(ch, u, n);
    if (!presa) return { esito: 'pochi', serve: n, saldo: Number(monete.saldo?.(ch, u)) || 0, nome: m.nome };
    const ricevuta = presa.ricevuta;
    if (!incassa(m, 'monete', 'monete:' + u, '', false, ricevuta)) { monete.rendi(ch, u, ricevuta); return { esito: 'gia', codice }; }
    return { esito: 'pagato', nome: m.nome, monete: n, dopo: !!m.dopo };
  }
  function acconto(ch, m, u, modo, codice) {
    const mi = m?.prezzi?.misti?.[modo];
    if (!m || m.stato !== 'attesa' || !mi) return { esito: 'sconosciuto', codice };
    if (m.riferimento || m.acconto) return { esito: 'gia', codice };
    const no = pronta(m, 'misto');
    if (no) return { esito: 'fermo', motivo: no, nome: m.nome };
    const presa = monete.punta(ch, u, mi.monete);
    if (!presa) return { esito: 'pochi', serve: mi.monete, saldo: Number(monete.saldo?.(ch, u)) || 0, nome: m.nome };
    const a = { modo, monete: mi.monete, resto: mi[modo], user: u, ricevuta: presa.ricevuta };
    if (!registro.acconto(m.id, a)) { monete.rendi(ch, u, presa.ricevuta); return { esito: 'gia', codice }; }
    // i Bit erano gia' arrivati: il colpo parte adesso. Quelli di troppo (un
    // cheer piu' grande del resto) sono gli ultimi arrivati, e tornano da spendere.
    if ((modo === 'bit' || modo === 'kicks') && valutaMira(m) === modo && (Number(m.versati) || 0) >= a.resto) {
      if (incassa(registro.get(m.id), metodoDi(modo, true), `${modo === 'kicks' ? 'regalo' : 'cheer'}:prima:${ora()}`, '', false, a.ricevuta)) {
        const troppi = (Number(m.versati) || 0) - a.resto;
        if (troppi > 0) {
          const { resto, resi } = togliUltimi(m.versanti, troppi);
          registro.riparti(m.id, resto);
          rendiVersanti(m, resi, 'avanzo');
        }
      }
      return { esito: 'pagato', nome: m.nome, monete: mi.monete, dopo: !!m.dopo };
    }
    // il premio da riscattare dopo, col nome che ha su Twitch (per colpo o per prezzo)
    const premio = modo === 'punti' ? { premio: (cfgDi(ch).voci || []).find((v) => v.id === m.voce)?.premioMistoNome || '' } : {};
    return { esito: 'acconto', modo, monete: mi.monete, resto: a.resto, codice: m.codice, nome: m.nome, ...premio };
  }

  // Quello che torna di un acquisto per dopo scaduto: solo i saldi nostri. Le
  // monete con la loro ricevuta, i Bit come quelli di un colpo non comparso
  // (dal saldo coi loro lotti, dai cheer se lo streamer li rende); i punti e gli
  // euro no: sono stati consegnati, nello zaino.
  function rendiAcquisto(p) {
    try {
      if (p.metodo === 'monete' && monete && p.ricevuta) monete.rendi(p.login, String(p.riferimento).replace(/^monete:/, ''), p.ricevuta);
      if ((p.metodo === 'monete+bit' || p.metodo === 'monete+kicks') && monete && p.acconto?.ricevuta) monete.rendi(p.login, p.acconto.user, p.acconto.ricevuta);
      if (A_VERSAMENTI.has(p.metodo)) rendiVersanti(p, p.versanti.filter((v) => rendibile(p, v)), 'scaduto');
    } catch (e) { log?.warn?.(`acquisto scaduto su #${p.login}:`, e?.message || e); }
  }

  // DALLO ZAINO: la mira (col punto) si paga con un colpo di quella voce che lo
  // spettatore ha nello zaino, il primo che scade. Se il colpo non compare,
  // l'oggetto torna nello zaino (la ronda).
  function daZaino(login, { id = '', chi = '' } = {}) {
    const ch = String(login || '').toLowerCase();
    if (!zaino || !chi) return { esito: 'spento' };
    const m = registro.getDi(ch, String(id || ''));
    if (!m || m.stato !== 'attesa' || m.dopo || m.riferimento || m.acconto || (m.scade <= ora() && !(Number(m.versati) > 0))) return { esito: 'sconosciuto' };
    const no = consegnabile(ch, m.voce);
    if (no) return { esito: 'fermo', motivo: no, nome: m.nome };
    const z = zaino.prendi(ch, String(chi), m.voce, m.id, ora(), puntiPer(voceDi(cfgDi(ch), m.voce), valutaDi(chi)));
    if (!z) return { esito: 'vuoto', nome: m.nome };
    if (!incassa(m, 'zaino', 'zaino:' + z)) { zaino.rimetti(z, m.id); return { esito: 'gia' }; }
    rinnovaZaino(ch, chi);
    return { esito: 'pagato', nome: m.nome };
  }

  // TUTTO IN UN TOCCO, per chi ha fatto l'accesso (docs/COLPI.md, «Con
  // l'accesso, un tocco»): monete e Bit da spendere sono un saldo nostro, quindi
  // la mira appena aperta si paga subito, senza codice. `con`: 'bit' (il saldo
  // della pagina), 'monete', 'misto-bit' (le monete del modo misto, poi i Bit
  // dal saldo). Se una parte non va, la mira si chiude e quello che era gia'
  // stato preso torna: non resta niente a meta'.
  function subito(login, id, { con = '', user = '', chi = '', nome = '' } = {}) {
    const ch = String(login || '').toLowerCase();
    const chiudi = () => registro.scadi(String(id));
    // il saldo da spendere e' nella valuta della persona: «kicks» solo per chi e' su Kick, «bit» solo per chi e' su Twitch
    const valuta = valutaDi(chi);
    if (con === valuta || con === 'monete' || con === 'zaino') {
      const r = con === valuta ? daBitPew(ch, { id, chi, nome }) : con === 'zaino' ? daZaino(ch, { id, chi }) : daMonete(ch, { id, user });
      if (r.esito !== 'pagato') chiudi();
      return r;
    }
    if (con !== 'misto-' + valuta) { chiudi(); return { esito: 'mezzo' }; }
    const a = daMonete(ch, { id, user, modo: valuta });
    if (a.esito === 'pagato') return a;
    if (a.esito !== 'acconto') { chiudi(); return a; }
    const b = daBitPew(ch, { id, chi, nome });
    if (b.esito === 'pagato') return { ...b, monete: a.monete };
    const m = registro.get(String(id));
    if (chiudi() && monete && m?.acconto?.ricevuta) monete.rendi(ch, m.acconto.user, m.acconto.ricevuta);
    return b;
  }
  // «!pew <colpo> [come]» (docs/COLPI.md, «Dalla chat»): il colpo nel punto
  // della chat, pagato col primo mezzo dello streamer che basta (o con quello
  // chiesto, se lo streamer lo permette). `chi`: la persona di Twitch, `user`:
  // il suo login (le monete). Torna { esito: 'pagato'|'pochi'|'fermo'|'mezzo'|..., mezzo }.
  function inChat(login, { voce: idVoce, con = '', user = '', chi = '', nome = '' } = {}) {
    const ch = String(login || '').toLowerCase();
    const cfg = cfgDi(ch);
    const voce = voceDi(cfg, idVoce);
    if (!cfg.chat.attivo || !voce || voce.chat.modo === 'no' || !chi) return { esito: 'mezzo' };
    const no = consegnabile(ch, voce.id);
    if (no) return { esito: 'fermo', motivo: no };
    const mezzi = con ? cfg.chat.con.filter((m) => m === con) : cfg.chat.con;
    const valuta = valutaDi(chi);
    const misto = mistiDi(voce).find((x) => x.modo === valuta);
    const sm = () => saldoMonete(ch, user), sb = () => saldoBit(ch, chi);
    // cosa costa ogni mezzo, e se il saldo basta
    const costo = {
      zaino: () => (zaino ? { ok: copreZaino(ch, chi, voce), quale: 'zaino' } : null),
      monete: () => (monete && voce.monete > 0 ? { ok: sm() >= voce.monete, monete: voce.monete, serve: voce.monete, saldo: sm(), quale: 'monete' } : null),
      // i Bit da spendere sono di chi e' su Twitch, i Kicks di chi e' su Kick
      bit: () => (valuta === 'bit' && crediti && resaDi(ch) && voce.bit > 0 ? { ok: sb() >= voce.bit, bit: voce.bit, serve: voce.bit, saldo: sb(), quale: 'bit' } : null),
      kicks: () => (valuta === 'kicks' && crediti && resaDi(ch, 'kicks') && voce.kicks > 0 ? { ok: sb() >= voce.kicks, kicks: voce.kicks, serve: voce.kicks, saldo: sb(), quale: 'kicks' } : null),
      misto: () => (monete && crediti && resaDi(ch, valuta) && misto ? (sm() < misto.monete
        ? { ok: false, monete: misto.monete, [valuta]: misto.resto, serve: misto.monete, saldo: sm(), quale: 'monete' }
        : { ok: sb() >= misto.resto, monete: misto.monete, [valuta]: misto.resto, serve: misto.resto, saldo: sb(), quale: valuta }) : null),
    };
    const prove = mezzi.map((m) => ({ m, c: costo[m]() })).filter((x) => x.c);
    const scelto = prove.find((x) => x.c.ok);
    if (!scelto) {
      const primo = prove.find((x) => x.m !== 'zaino');
      return primo ? { esito: 'pochi', mezzo: primo.m, serve: primo.c.serve, saldo: primo.c.saldo, quale: primo.c.quale } : { esito: 'mezzo' };
    }
    const p = puntoChat(cfg, voce);
    const r = mira(ch, { voce: voce.id, x: p.x, y: p.y, chi: nome, chiave: ['tw:' + chi], spettatore: chi });
    if (!r.ok) return { esito: r.motivo === 'attesa' ? 'attesa' : 'fermo', motivo: r.motivo, fraSec: r.fraSec };
    const pagato = subito(ch, r.mira.id, { con: scelto.m === 'misto' ? 'misto-' + valuta : scelto.m, user, chi, nome });
    if (pagato.esito !== 'pagato') return { ...pagato, mezzo: scelto.m, esito: pagato.esito === 'pochi' ? 'pochi' : 'fermo', motivo: pagato.motivo || pagato.esito };
    return { esito: 'pagato', mezzo: scelto.m, nome: voce.nome, monete: scelto.c.monete || 0, bit: scelto.c.bit || 0, kicks: scelto.c.kicks || 0, id: r.mira.id };
  }
  const saldoMonete = (login, user) => (monete && user ? Number(monete.saldo?.(String(login || '').toLowerCase(), String(user).toLowerCase())) || 0 : 0);

  // Il premio del modo misto coi punti: vale solo con le monete gia' pagate per
  // quella mira (l'acconto). Se no i punti tornano, e il bot dice cosa manca.
  function daRiscattoMisto(ch, voci, { reward_id, user_input, id, user_id }) {
    const { m, codice } = miraDelPremio(ch, voci, user_input, user_id);
    const mp = m?.prezzi?.misti?.punti;
    if (!m || !mp || (voci[0].premioMistoCosto && Number(mp.punti) !== voci[0].premioMistoCosto)) return { esito: 'sconosciuto', stato: 'CANCELED', codice };
    if (m.acconto?.modo !== 'punti') return { esito: 'servono-monete', stato: 'CANCELED', codice: m.codice, nome: m.nome, monete: m.prezzi.misti.punti.monete, modo: 'punti' };
    const no = pronta(m, 'misto');
    if (no) return { esito: 'fermo', stato: 'CANCELED', motivo: no };
    return incassa(m, 'monete+punti', `premio:${id}`, `${reward_id}:${id}`, false, m.acconto.ricevuta) ? { esito: 'pagato', stato: null, nome: m.nome, dopo: !!m.dopo } : { esito: 'gia', stato: 'CANCELED' };
  }

  // Gli euro: la donazione pagata che era stata aperta per una mira.
  function daPagamento(donazioneId) {
    const m = registro.perRiferimento(donazioneId);
    if (!m) return { esito: 'non-mio' };
    // anche se la mira nel frattempo e' scaduta: i soldi sono arrivati, quindi o il colpo o il rimborso
    return { esito: incassa(m, 'euro', donazioneId, '', true) ? 'pagato' : 'gia', nome: m.nome, login: m.login };
  }

  // lo zaino di una persona, per la pagina e la chat: [{ voce, quanti, scade }]
  // (scade: il primo che scade di quella voce, 0 = mai), nell'ordine del listino
  function zainoDi_(login, chi) {
    const ch = String(login || '').toLowerCase();
    if (!zaino || !chi) return [];
    const per = new Map();
    for (const o of zaino.contenuto(ch, String(chi), ora())) {
      const x = per.get(o.voce) || { voce: o.voce, quanti: 0, scade: 0 };
      x.quanti++;
      if (o.scade && (!x.scade || o.scade < x.scade)) x.scade = o.scade;
      per.set(o.voce, x);
    }
    const ordine = cfgDi(ch).voci.map((v) => v.id);
    const posto = (x) => ordine.indexOf(x.voce) + 1 || 1000 + valoreBuono(x.voce) / 1e7;
    return [...per.values()].map((x) => (valoreBuono(x.voce) ? { ...x, buono: valoreBuono(x.voce) } : x)).sort((a, b) => posto(a) - posto(b));
  }

  return { mira, consegnabile, comprabile, pronta, daZaino, zainoDi: zainoDi_, daCheer, daRiscatto, daPagamento, daMonete, daBitPew, daKicks, subito, inChat, saldoBit, scadonoBit, saldoMonete, presenza, provaPresenza, visto, ronda, cfgDi,
    conMonete: !!monete, conZaino: (login) => !!zaino && cfgDi(String(login || '').toLowerCase()).zaino.attivo,
    // lo zaino si mostra a chi compra per lo zaino, e a chi ci ha qualcosa dentro
    zainoVisibile: (login, chi) => !!zaino && (cfgDi(String(login || '').toLowerCase()).zaino.attivo || zainoDi_(login, chi).length > 0), copreZaino: (login, chi, idVoce) => copreZaino(String(login || '').toLowerCase(), chi, voceDi(cfgDi(String(login || '').toLowerCase()), idVoce)), conBitPew: (login) => !!resaDi(String(login || '').toLowerCase()), conKicksPew: (login) => !!resaDi(String(login || '').toLowerCase(), 'kicks') };
}
