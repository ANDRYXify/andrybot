<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Gli alert di Twitch, i nostri o tutti e due

Chiesto così: usare anche o solo gli alert di Twitch, a scelta dello streamer,
e cambiarli dal pannello.

## Cosa si può fare, e cosa no

Twitch ha i suoi alert («Alerts by Twitch») per follow, sub, bit, raid e altro.
Si impostano solo su Twitch: non c'è un'API per cambiarli, né per farli
partire da fuori. La guida ufficiale è
<https://link.twitch.tv/SettingUpTwitchAlerts>.

Quindi «cambiarli dal pannello» non si può fare sui loro. Si fanno due cose:

1. per ogni evento, lo streamer sceglie **chi lo mostra**: SocialBot, Twitch o
   tutti e due;
2. fra le vesti dei nostri c'è **«Stile Twitch»**: niente riquadro,
   l'immagine grande sopra, il nome in viola. È una veste come le altre, e si
   cambia tutta.

## Il modello

Due cose diverse, in due campi diversi, per ogni evento:

| campo | domanda | valori |
|---|---|---|
| `attivo` | c'è un alert per questo evento? | sì / no |
| `chi` | chi lo mostra? | `socialbot` (di serie), `twitch`, `entrambi` |

Il nostro parte quando `attivo` e `chi` non è `twitch`. Con `entrambi` il nostro
si comporta come con `socialbot`: la differenza sta su Twitch, che lo
streamer accende da sé. Il pannello lo dice nella nota sotto la scelta, e con
`entrambi` consiglia di metterli in due punti diversi dello schermo.

`chi` vale solo per gli eventi che arrivano da Twitch (`EVENTI_TWITCH` in
`src/web/stile.js`). La donazione non passa da Twitch: `chiAlertOk` la riporta
sempre a `socialbot`, qualunque cosa ci sia scritto, e il pannello non offre la
scelta.

## Cosa continua a contare

La scelta tocca solo l'alert. Nel motore (`src/features/alerts.js`, `onEvent`)
widget dell'ultimo follower e dell'ultimo sub, obiettivi e subathon si
aggiornano prima del controllo sull'alert: con `twitch` contano come prima.

## Dove sta

- `src/web/stile.js`: `CHI_ALERT`, `EVENTI_TWITCH`, `chiAlertOk`.
- `src/web/server.js`: la normalizzazione degli alert tiene `chi` per ognuno
  dei cinque eventi, col nome dell'evento.
- `src/features/alerts.js`: con `twitch` il nostro non parte.
- `src/web/public/app.js`: `ALERT_TIPI` (`twitch: true` sugli eventi di
  Twitch), `CHI_ALERT_OPTS`, `notaChiAlert`, `chiAlertMostra`; con `twitch` il
  resto del blocco dell'evento (testi, suoni, prova) si chiude.
- La veste «Stile Twitch» in `TEMPLATE_BUILTIN`.

## Collaudo

- `test/unita/alert-chi.test.mjs`: sul motore vero, con gli eventi come li
  manda Twitch.
- `test/contratto/alert-chi.test.mjs`: pannello e server dicono la stessa cosa.
