// LA PROVA CHE UNA PERSONA MODERA DAVVERO UN CANALE.
//
// La richiesta di moderazione apre una porta nella direzione opposta all'invito:
// non è lo streamer che chiama, è la persona che bussa. Una porta così, senza
// prova, è una casella di posta per chiunque.
//
// Qui la prova si chiede alla piattaforma, non alla persona. E si chiede col
// token dello STREAMER, che il permesso ce l'ha già: nessuno deve concedere
// niente di nuovo per far funzionare questa strada.
//
// Non tutte le piattaforme sanno rispondere, e questo file non finge il
// contrario. Ritorna un fatto — `verificata` vero o falso — e il motivo. Falso
// non vuol dire «bugiardo»: vuol dire che non lo sappiamo, e allora decide lo
// streamer guardando il nome. Il giorno che Kick o YouTube pubblicheranno
// l'elenco dei loro moderatori, cambia una funzione sola.
import { piattaformaDi, nomeSu } from '../identita.js';

// Chi sa rispondere, e con che parole si spiega chi non sa.
const PERCHE_NO = {
  kick: 'Kick non pubblica l’elenco dei moderatori di un canale',
  youtube: 'YouTube mostra i moderatori solo durante una diretta',
};

// Si può anche solo PROVARE a chiedere? No, se le due parti stanno su
// piattaforme diverse: l'elenco dei moderatori di un canale Twitch contiene
// login Twitch, e un account Kick non ci comparirà mai — nemmeno se quella
// persona modera davvero. Chiederlo lo stesso darebbe un «non sei moderatore»
// falso, che è peggio di un «non lo so».
export function verificabile(canale, identita) {
  return piattaformaDi(canale) === 'twitch' && piattaformaDi(identita) === 'twitch';
}

export async function provaModerazione(canale, identita, { helix } = {}) {
  const ch = String(canale || '').toLowerCase();
  const chi = String(identita || '').toLowerCase();
  if (!ch || !chi) return { verificata: false, motivo: 'dati mancanti' };

  const suo = piattaformaDi(chi);
  const del = piattaformaDi(ch);
  if (!verificabile(ch, chi)) {
    if (suo !== del) return { verificata: false, motivo: `il tuo account è su ${suo} e il canale è su ${del}: la conferma automatica non è possibile` };
    return { verificata: false, motivo: PERCHE_NO[del] || 'questa piattaforma non permette la conferma automatica' };
  }

  const elenco = await helix?.getModerators?.(ch).catch(() => null) ?? null;
  // null = non si è potuto chiedere (lo streamer non ha concesso i permessi, o
  // Twitch non ha risposto). Diverso da «non c'è»: se lo trattassimo come un no
  // diremmo a un moderatore vero che non lo è.
  if (elenco === null) return { verificata: false, motivo: 'non sono riuscito a chiedere a Twitch chi modera quel canale' };

  const nome = nomeSu(chi);
  const ce = elenco.some((m) => String(m?.user_login || '').toLowerCase() === nome);
  return ce
    ? { verificata: true, motivo: '' }
    : { verificata: false, negata: true, motivo: 'Twitch non ti elenca fra i moderatori di quel canale' };
}
