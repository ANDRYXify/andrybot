<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Il menu e le sottosezioni

## Il difetto, misurato

Per arrivare a una cosa c'erano fino a cinque livelli: il gruppo del menu, la
voce, la barra della famiglia (pagine sorelle che dal menu non si vedevano),
la barra dei fratelli del gruppo (il menu ripetuto dentro la pagina) e la
barra delle parti della pagina, con la stessa veste della precedente,
impilata sotto. «Giochi» e «Comandi» avevano due barre uguali una sopra
l'altra.

La stessa cosa aveva più nomi: menu «Giochi», titolo «Giochi», barra
«Giochi & classifiche», manuale «Chat e pubblico → Giochi». Lo scudo era «Lo
scudo», «Scudo anti-bot» e «Scudo»; il registro «Registro» e «Registro dello
scudo». Quattro tabelle di nomi (T_SCHEDA, NOMI_SCHEDA, T_PARTE, FAM_ETI), e
FAM_ETI con famiglie che non esistevano più.

Le famiglie mettevano insieme cose diverse: Sondaggi, Giveaway e Penitenze
«dentro» Giochi, Clip e Musica «dentro» Regia, Comandi vocali «dentro»
Comandi. Il gruppo «Il tuo bot» aveva una voce sola, «Il bot».

Cambiare parte di una pagina faceva rientrare di nuovo tutte le carte, una
dopo l'altra: il rimbalzo.

## Le regole

1. **Un nome per ogni posto, uguale ovunque.** T_SCHEDA è il nome della
   pagina; T_FAMIGLIA è il nome della voce che apre una famiglia; T_GRUPPO il
   nome del gruppo. Il menu, la testata, le barre, la barra in basso del
   telefono e i percorsi scritti nel pannello (`percorso(id)`) li leggono da
   lì. Niente articoli né possessivi nei nomi; in italiano «e», non «&».
2. **Al massimo una barra per pagina, mai una che ripete il menu a schermo.**
   O le parti della pagina (linguette), o le parti della sua famiglia
   (pillole). Le sorelle del gruppo compaiono solo quando il menu non è a
   schermo: sul telefono e a tutto schermo, e solo nelle pagine senza parti.
3. **Una famiglia sono le parti di una cosa sola.** Restano due famiglie: «Il
   bot» (Personalità, Conoscenza, Memoria, Comandi vocali) e «Discord» (Ruoli,
   Avvisi, Server, Chi entra, Filtro). Le cose diverse sono voci del menu.
4. **Un gruppo con una voce sola è una voce**, col nome della voce.
5. **Un cambio, un movimento.** Cambiare parte o sorella scambia il contenuto
   con una dissolvenza sola: le carte non rientrano e il titolo non si
   riscrive parola per parola. Chi chiede meno movimento non ha neanche la
   dissolvenza.

Gli id delle schede non cambiano: i link, le righe delle novità con
`[vai: x]` e i manuali restano buoni. L'unica scheda nuova è `partite`, che
prima era una carta dentro Giveaway.

## Il menu

- Stato
- Il bot
- Chat: Comandi, Moderazione, Negozio
- Intrattenimento: Giochi, Partite, Sondaggi e predizioni, Giveaway, Penitenze
- In diretta: Regia, Clip, Musica, CONSOLify
- Scena e overlay: Overlay Studio, Effetti e suoni, Emote (7TV)
- Scudo e attacchi: Scudo anti-bot, Attacchi, Follower, Registro
- Numeri: Statistiche, Dirette
- Vetrina: Pagina link, Donazioni, Settimana, Grafiche social, Social
- Community: Telegram, Discord
- Strumenti: QR su misura, Emote e badge, Media kit, Pannelli
- Account: Accesso e dati, Abbonamento

## Come si misura

`test/contratto/menu-nomi.test.mjs` legge le tabelle vere del pannello e
controlla le regole su quello che ne esce: nomi uguali, nessuna ripetizione,
nessun articolo, gruppi da una voce, famiglie, una barra sola, ogni id di
prima ancora raggiungibile, un movimento solo, e nessun nome vecchio nel
pannello e nei manuali. `scripts/verifica-sorelle.mjs` apre il pannello e
guarda le barre davvero.
