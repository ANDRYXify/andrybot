// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I REGALI SI CONTANO UNA VOLTA (docs/PIATTAFORME.md, «Gli eventi di Kick»).
//
// Twitch manda un channel.subscribe per ogni abbonamento regalato (is_gift), e
// in piu' la raffica (channel.subscription.gift), che li annuncia: si contano i
// singoli, e la raffica no. Kick manda solo la raffica, e li' e' l'unico conto
// che c'e'. La regola sta qui perche' la usano il rapporto e le statistiche, e
// due copie della stessa regola prima o poi non tornano.
export const regaliDaRaffica = (dati) => !!dati?.piattaforma && dati.piattaforma !== 'twitch';
