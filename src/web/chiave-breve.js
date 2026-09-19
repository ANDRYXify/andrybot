// UNA CHIAVE CHE SCADE: il modo di entrare in uno stato pericoloso apposta.
//
// Il difetto non e' «premere il tasto sbagliato»: e' che un clic normale, in
// uno stato normale, possa distruggere. La cura non e' un altro tasto — e' uno
// stato in cui si entra APPOSTA, e che sappia riconoscere il SERVER, non il
// browser. Se lo decidesse solo la pagina, un doppio clic su una scheda
// rimasta aperta da ieri basterebbe.
//
// E lo stato non si SALVA da nessuna parte: e' la chiave stessa. Una chiave
// che scade non la si puo' lasciare accesa per sbaglio — dimenticarla non e'
// una cosa da ricordarsi di non fare, e' una cosa che non puo' succedere.
//
// La chiave e' legata a CHI e a COSA: la chiave del canale di Tizio non apre
// niente sul canale di Caio, e quella per cancellare i canali non vale per
// cancellare i ruoli. Uno scopo solo, un canale solo, dieci minuti.
import { randomUUID } from 'node:crypto';

export const DURATA_MS = 10 * 60 * 1000;

export function creaChiavi({ durataMs = DURATA_MS, ora = () => Date.now() } = {}) {
  const dentro = new Map();   // chiave → { login, scopo, scade }

  const pulisci = () => {
    const adesso = ora();
    for (const [k, v] of dentro) if (v.scade <= adesso) dentro.delete(k);
  };

  return {
    // Coniare una chiave nuova brucia quella di prima per lo stesso scopo: due
    // schede aperte non devono poter tenere aperta la porta il doppio del tempo.
    conia(login, scopo) {
      pulisci();
      const l = String(login || '').toLowerCase();
      const s = String(scopo || '');
      if (!l || !s) return null;
      for (const [k, v] of dentro) if (v.login === l && v.scopo === s) dentro.delete(k);
      const k = randomUUID();
      const scade = ora() + durataMs;
      dentro.set(k, { login: l, scopo: s, scade });
      return { chiave: k, scade };
    },

    // Vale ANCORA? Non si consuma: fra guardare e fare passano piu' chiamate,
    // e far scadere la chiave al primo uso vorrebbe dire non poter rifare
    // l'anteprima senza rientrare nella modalita'.
    vale(chiave, login, scopo) {
      pulisci();
      const v = dentro.get(String(chiave || ''));
      if (!v) return false;
      return v.login === String(login || '').toLowerCase() && v.scopo === String(scopo || '');
    },

    // Quanto manca, per la fascia che lo dice. Zero se non vale piu'.
    restano(chiave) {
      pulisci();
      const v = dentro.get(String(chiave || ''));
      return v ? Math.max(0, v.scade - ora()) : 0;
    },

    // Uscire dalla modalita' e' bruciare la chiave: da quel momento la porta
    // che cancella non risponde piu', senza aspettare la scadenza.
    brucia(chiave) { return dentro.delete(String(chiave || '')); },

    quante() { pulisci(); return dentro.size; },
  };
}
