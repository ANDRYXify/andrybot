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
- Intrattenimento: Presenza, Monete, Giochi, Partite, Sondaggi e predizioni, Giveaway, Penitenze
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

## Presenza, monete e giochi: una strada sola

Chiesto così: «ordiniamo un po' la parte di giochi, punti etc, è scomodissimo
ora, sinceramente non so più dove trovare la gestione dei punti (monete
inteso), ci arrivo cercandolo dalla lente», e «colleghiamo il tutto, perché la
presenza di pew ora è la presenza in generale (!presente), quindi non può
essere sotto a pew».

**Il difetto, misurato.** Le monete stavano in Giochi, sotto-scheda «Monete e
classifica»: una cosa di tutto il canale (le spendono il negozio, i Pew, i
giochi) dentro una delle cose che le usano. La presenza aveva tre nomi in tre
posti: «Presenze e saluti» (Giochi, chi c'è da dieci minuti), le monete «mentre
guardano» (Giochi), e «!presente» con la sua porta (Pew), che decide se monete,
Bit e giochi valgono — una regola del canale messa dentro un modo di spenderle.

**Il modello.** Le cose stanno nell'ordine in cui succedono a chi guarda:

1. **Presenza** (scheda nuova, `presenza`): ci sei. «!presente» con la porta e
   la serie, e «Presenze e saluti». Una regola del canale: vale anche con i
   Pew spenti e senza il piano dei giochi.
2. **Monete** (scheda nuova, `monete`): ne guadagni e ne perdi. Il nome delle
   monete (che stava nella prima carta di Giochi), l'economia, il registro,
   la classifica e i VIP: le carte che erano in «Monete e classifica».
3. **Giochi**, **Partite**, **Negozio**, **Pew**: le spendi. Ognuno dice da
   dove vengono le monete con un tasto che porta lì.

Il gruppo del menu «Intrattenimento» diventa quello di questa strada, nello
stesso ordine. Gli id di prima restano tutti raggiungibili: `giochi` apre i
giochi, e un vecchio indirizzo alla sotto-scheda delle monete porta alla
scheda Monete.

**Il pezzo della presenza che resta ai Pew** è solo l'effetto a schermo
(quale effetto, dove, quanto grande, quanti al minuto): è un colpo, e sta coi
colpi. Frase, porta, serie, ricordo e conferma sono della scheda Presenza
(`settings.presente`). Una configurazione salvata prima li ha dentro
`colpi.presenza`: si leggono da lì finché lo streamer non salva la scheda
nuova, e da quel momento vale la scheda nuova.

**Due scelte, e perché.** L'id è `monete`, non `monete-canale`: i cancelli
(verifica-sezioni, le tabelle lette dai contratti) riconoscono una scheda come
`[a-z0-9]+`, e una scheda col trattino sarebbe nata invisibile proprio a chi
controlla che non nasca registrata a metà. Il vecchio `monete` era solo il
nome di una parte di Giochi, che non c'è più. Il nome nel menu è «Monete», non
quello che il canale dà alle sue: un posto ha un nome solo (menu, titolo,
giro, manuale, ricerca, «Novità»), e un nome scelto dallo streamer non si può
tenere uguale in tutti, né garantire che non ripeta un'altra voce. Il nome
del canale compare dentro la scheda, dove si sceglie.

**La presenza del canale, nel codice.** `src/features/presente.js`, puro, ha
l'accessore `presenteDi(settings)` (la scheda nuova o la forma di prima) e
tutto quello che prima stava nei Pew: la frase, la porta, la serie, la
risposta. La porta, il bot, i giochi e il server leggono solo da lì. Due cose
che il modello non diceva, e che il codice ha dovuto decidere:
- **la serie sale solo in onda**: prima la contava l'effetto, che parte solo
  in onda; staccata dall'effetto, fuori onda la chiave sarebbe il giorno e la
  serie (con le sue monete) salirebbe a canale spento;
- **una risposta sola**: prima la serie rispondeva quando partiva l'effetto e
  la conferma negli altri casi; adesso la serie c'è sempre, e risponde lei
  quando ha qualcosa in più da dire (monete, o un testo dello streamer), se no
  la conferma (docs/COLPI.md, «La serie della presenza»).

**Gli strumenti in alto a destra** (canale, lingua, «?», tema, suono) ci
stavano già, ma al primo cambio di sezione saltavano accanto al logo: la
pillola dello Studio entra nella barra (nascosta) quando si cambia scheda, e
la regola che le cedeva il margine valeva anche da nascosta. Ora il margine lo
cede solo una pillola che si vede (`.studio-pillola:not([hidden]) +
.top-strumenti`), e un contratto lo tiene fermo.
