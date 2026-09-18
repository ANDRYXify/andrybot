<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

# Le sezioni del pannello: chi merita una stanza sua

## Il difetto da cui nasce

Telegram era una **sotto-voce** di «Notifiche social», accanto a TikTok e
Instagram, come se fossero cose della stessa taglia. Non lo erano:

| area      | porte sul server |
|-----------|------------------|
| telegram  | 29 (+7 per login e mini app) |
| tiktok    | 5 |
| youtube   | 1 |
| instagram | 1 |

Telegram gestiva quattordici cose — gruppo, destinazioni, topic, membri, amici,
community, compleanni, rapporto, privato, verifica, token, carta — dentro una
voce che si chiamava «notifiche», dentro una scheda che stava in «La tua
vetrina». E «Notifiche social» stava lì perché quando è nata mandava solo un
messaggio quando andavi live.

Nessuno se n'era accorto perche' **una sotto-voce che cresce non fa rumore**:
diventa solo una pagina piu' lunga.

## La regola

Una cosa e' una **sezione a se'** quando ha tutte e tre queste:

1. **un'identita' che si collega e si scollega** — un bot, un account, un
   server. Non «un indirizzo dove mandare un avviso»;
2. **della gente dentro**, su cui fa qualcosa in base a chi e' — membri, ruoli,
   chi entra, chi si comporta in un certo modo;
3. **roba sua da tenere in ordine** che non vive altrove — destinazioni,
   elenchi, messaggi, impostazioni.

Chi ne ha **una sola** e' un **avviso**, e sta con gli altri avvisi.

Applicata: Telegram le ha tutte e tre → sezione sua, nel gruppo nuovo «Le tue
community». TikTok, YouTube e Instagram nessuna → restano in «Avvisi» (che
prima si chiamava «Notifiche social»). Discord oggi ne ha zero (e' solo un
webhook che annuncia) → resta in «Avvisi», e diventa sezione il giorno che
comincia a gestire i ruoli dei membri.

## La misura, perche' la regola non basta

La regola in parole serve a **decidere**. Non serve a **non dimenticarsene**
fra sei mesi, quando la stessa cosa ricrescera' da un'altra parte.

Le **porte del server** sono il conto di quante cose un'area gestisce davvero, e
si contano da sole. `scripts/verifica-sezioni.mjs`:

- conta le porte di ogni sotto-voce e va **rosso** se una supera le dieci: una
  sotto-voce di quella taglia e' una sezione mascherata;
- pretende che ogni sezione del menu abbia **icona, descrizione, aiuto e le
  parole per trovarla dalla ricerca**. Sono quattro elenchi in tre file diversi,
  e dimenticarne uno non da' nessun errore: da' un pannello con un buco.

Il secondo controllo ha trovato subito quattro buchi vecchi: «Donazioni»,
«Grafiche» e «CONSOLify» senza descrizione, «Stato» senza aiuto, e quattro
schede che dalla ricerca non si trovavano.

Il tetto e' largo di proposito (la mediana delle aree sta fra due e quattro
porte): serve a prendere i mappazzoni, non a discutere di due porte in piu'.

## Cosa NON dice il cancello

Non dice se una sezione e' **lunga**. «Overlay Studio» ha 264 campi in una
scheda sola ed e' la piu' densa del pannello, ma e' una cosa sola — la scena —
e chi ci lavora ci lavora a lungo. Quella e' una domanda diversa, e ha una
risposta diversa (una barra dentro la scheda, non una sezione nuova).
