// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I PREMI A PUNTI CANALE DEI COLPI (docs/COLPI.md). Ogni voce del listino con un
// prezzo in punti ha il suo premio su Twitch, «Colpo: <nome>», che chiede il
// codice preso sulla pagina. SocialBot li tiene allineati al listino: li crea,
// li toglie, e se il prezzo o il nome cambiano li rifa' (Twitch non lascia
// cambiare il costo di un premio creato da un'app senza riscriverlo).
//
// E il premio del modo misto coi punti (docs/COLPI.md, «I modi misti»),
// «Colpo: <nome> + monete»: costa i punti del modo misto, e vale solo con le
// monete gia' pagate sulla pagina o in chat.
//
// Lo stato si confronta col listino SALVATO, non con quello di prima: una
// riconciliazione che parte due volte trova la seconda volta tutto a posto.
import { normalizza, titoloPremio, titoloPremioMisto } from './colpi.js';
import { monetaDa } from './moneta.js';

export async function riconciliaPremi({ login, prima, helix, streamers, pagina, log = null }) {
  const cfg = normalizza(streamers.get(login)?.settings?.colpi);
  const errori = [];
  const vive = new Set(cfg.voci.flatMap((v) => [v.premio, v.premioMisto]).filter(Boolean));
  for (const v of normalizza(prima).voci) {
    for (const id of [v.premio, v.premioMisto]) {
      if (id && !vive.has(id)) { try { await helix.eliminaReward(login, id); } catch (e) { log?.debug?.(`premio colpo via #${login}:`, e?.message || e); } }
    }
  }
  // un premio: tenuto se e' gia' quello giusto, se no tolto e rifatto
  const allinea = async (v, { vuole, titolo, costo: voluto, prompt }, { premio, costo, nome }) => {
    if (premio && (!vuole || costo !== voluto || nome !== titolo)) {
      try { await helix.eliminaReward(login, premio); } catch (e) { log?.debug?.(`premio colpo via #${login}:`, e?.message || e); }
      premio = ''; costo = 0; nome = '';
    }
    if (vuole && !premio) {
      try {
        const r = await helix.creaReward(login, { titolo, costo: voluto, prompt, userInput: true });
        if (r?.id) { premio = r.id; costo = voluto; nome = titolo; }
        else errori.push(titolo);
      } catch (e) { errori.push(titolo + ': ' + String(e?.message || e).slice(0, 120)); }
    }
    return { premio, costo, nome };
  };
  const nuovi = new Map();
  for (const v of cfg.voci) {
    const p = await allinea(v, { vuole: cfg.attivo && v.attiva && v.punti > 0, titolo: titoloPremio(v), costo: v.punti,
      prompt: `Mira su ${pagina} e scrivi qui il codice del colpo (con l'accesso a Twitch fatto sulla pagina va bene qualunque testo)` },
    { premio: v.premio, costo: v.premioCosto, nome: v.premioNome });
    const mi = v.misti?.punti;
    const q = await allinea(v, { vuole: cfg.attivo && v.attiva && !!mi, titolo: titoloPremioMisto(v), costo: mi?.punti || 0,
      prompt: `Prima paga ${mi?.monete || 0} ${monetaDa(streamers.get(login)?.settings).nome} su ${pagina} (o in chat col codice e «punti»), poi scrivi qui il codice del colpo` },
    { premio: v.premioMisto, costo: v.premioMistoCosto, nome: v.premioMistoNome });
    nuovi.set(v.id, { premio: p.premio, premioCosto: p.costo, premioNome: p.nome, premioMisto: q.premio, premioMistoCosto: q.costo, premioMistoNome: q.nome });
  }
  // si scrive solo il pezzo dei premi, sulle impostazioni di adesso: fra la
  // lettura e la scrittura non c'e' nessuna attesa, cosi' un salvataggio
  // arrivato nel frattempo non si perde
  const s = streamers.get(login);
  const c = s?.settings?.colpi;
  if (!c || !Array.isArray(c.voci)) return { errori };
  const voci = c.voci.map((v) => (nuovi.has(v.id) ? { ...v, ...nuovi.get(v.id) } : v));
  streamers.setSettings(login, { ...s.settings, colpi: { ...c, voci, premiErrori: errori } });
  // una voce tolta da un salvataggio arrivato nel frattempo: il suo premio appena creato non resta orfano
  const restano = new Set(c.voci.map((v) => v.id));
  for (const [id, x] of nuovi) {
    if (restano.has(id)) continue;
    for (const r of [x.premio, x.premioMisto]) {
      if (r) { try { await helix.eliminaReward(login, r); } catch (e) { log?.debug?.(`premio colpo via #${login}:`, e?.message || e); } }
    }
  }
  return { errori };
}
