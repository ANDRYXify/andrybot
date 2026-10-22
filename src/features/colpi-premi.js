// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I PREMI A PUNTI CANALE DEI COLPI (docs/COLPI.md). Ogni voce del listino con un
// prezzo in punti ha il suo premio su Twitch, «Colpo: <nome>», che chiede il
// codice preso sulla pagina. SocialBot li tiene allineati al listino: li crea,
// li toglie, e se il prezzo o il nome cambiano li rifa' (Twitch non lascia
// cambiare il costo di un premio creato da un'app senza riscriverlo).
//
// Lo stato si confronta col listino SALVATO, non con quello di prima: una
// riconciliazione che parte due volte trova la seconda volta tutto a posto.
import { normalizza, titoloPremio } from './colpi.js';

export async function riconciliaPremi({ login, prima, helix, streamers, pagina, log = null }) {
  const cfg = normalizza(streamers.get(login)?.settings?.colpi);
  const errori = [];
  const vive = new Set(cfg.voci.map((v) => v.premio).filter(Boolean));
  for (const v of normalizza(prima).voci) {
    if (v.premio && !vive.has(v.premio)) { try { await helix.eliminaReward(login, v.premio); } catch (e) { log?.debug?.(`premio colpo via #${login}:`, e?.message || e); } }
  }
  const nuovi = new Map();
  for (const v of cfg.voci) {
    const vuole = cfg.attivo && v.attiva && v.punti > 0;
    const titolo = titoloPremio(v);
    let premio = v.premio, costo = v.premioCosto, nome = v.premioNome;
    if (premio && (!vuole || costo !== v.punti || nome !== titolo)) {
      try { await helix.eliminaReward(login, premio); } catch (e) { log?.debug?.(`premio colpo via #${login}:`, e?.message || e); }
      premio = ''; costo = 0; nome = '';
    }
    if (vuole && !premio) {
      try {
        const r = await helix.creaReward(login, { titolo, costo: v.punti, prompt: `Mira su ${pagina} e scrivi qui il codice del colpo (con l'accesso a Twitch fatto sulla pagina va bene qualunque testo)`, userInput: true });
        if (r?.id) { premio = r.id; costo = v.punti; nome = titolo; }
        else errori.push(v.nome);
      } catch (e) { errori.push(v.nome + ': ' + String(e?.message || e).slice(0, 120)); }
    }
    nuovi.set(v.id, { premio, premioCosto: costo, premioNome: nome });
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
    if (x.premio && !restano.has(id)) { try { await helix.eliminaReward(login, x.premio); } catch (e) { log?.debug?.(`premio colpo via #${login}:`, e?.message || e); } }
  }
  return { errori };
}
