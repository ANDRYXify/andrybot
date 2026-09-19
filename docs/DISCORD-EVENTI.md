# Gli appuntamenti sul calendario del server

«Giovedì alle 21» sul Discord di chi ti guarda. Non e' un avviso — l'avviso
arriva quando parti — e' la riga che c'e' PRIMA, quella che fa sapere quando
tornare.

## Non passano dal costruttore

E non e' una dimenticanza. Un appuntamento non descrive com'e' fatto il server:
descrive quando ci sei. Cambia da solo — cambi il palinsesto, arriva l'ora
legale — e deve rimettersi a posto senza che nessuno prema niente. Il
costruttore invece parte quando lo dici tu, e va bene cosi' per i canali.

Quindi vivono nelle impostazioni (`settings.discordEventi`), con la loro carta
negli «Avvisi su Discord», e un giro del bot che li riallinea quattro volte al
giorno.

## Il palinsesto non si chiede due volte

La programmazione della settimana e' gia' scritta, per la grafica:
`settings.grafiche.giorni`, sette voci con l'ora, cosa fai e i giorni di
riposo. Chiederla di nuovo per Discord vorrebbe dire due palinsesti da tenere
uguali a mano, e un giorno direbbero due cose diverse.

## Un appuntamento per FASCIA

Si raggruppa per ORA e per COSA SI FA. Tre sere alle 21 a giocare sono un
appuntamento solo, e Discord lo mostra come «ogni lun, mer, ven»; se il giovedì
alle 21 fai un'altra cosa, quello e' un appuntamento suo. Raggruppare solo per
ora metterebbe tre attivita' diverse sotto un titolo che ne nomina una.

I giorni si contano da LUNEDI' = 0, da noi e da Discord. E' scritto in
`discord-api.js` perche' il giorno che una delle due parti cambiasse, si sappia
dove guardare.

## L'ora legale non ha una riga di codice

La ripetizione di Discord ripete un ISTANTE, quindi a fine ottobre
l'appuntamento slitterebbe di un'ora. Ma noi non confrontiamo istanti:
confrontiamo quello che dice il palinsesto con quello che c'e' sul server, e
l'ora la rileggiamo NEL FUSO (`oraNel`). Al primo giro dopo il cambio la
differenza si vede e si corregge da sola. E' una conseguenza del confronto, non
una toppa.

Il fuso lo sa il BROWSER dello streamer, ed e' l'unico che lo sappia:
l'appuntamento vuole un istante, il palinsesto dice «alle 21». Si prende da
`Intl` quando si salva.

### Due passate, e non una

`istante()` calcola lo scarto del fuso due volte. Non e' prudenza: e' misurato.
Su un anno intero, con una passata sola l'ora esce sbagliata fra le tre e le
undici volte a seconda del fuso; con due, al massimo una — e quell'una e' l'ora
che NON ESISTE nella notte in cui l'orologio salta avanti, dove nessuna
risposta e' giusta. Il collaudo lo fissa su Lord Howe, che salta di mezz'ora e
quindi lo fa vedere bene.

## Solo i nostri

Il bot chiede `CREATE_EVENTS` (1 << 44), che permette di CREARE appuntamenti e
di modificare o cancellare SOLO I PROPRI. Gli appuntamenti scritti a mano dallo
streamer non li possiamo toccare nemmeno volendo: lo impedisce Discord, non la
nostra prudenza. I nostri si riconoscono dal `creator_id`, senza contrassegni
da inventare.

MANAGE_EVENTS resta dov'era: fra i privilegi che il bot passa ai moderatori,
perche' quello serve a toccare gli eventi di tutti.

Chi ha invitato il bot prima che questa parte esistesse quel permesso non glie
l'ha dato: Discord non aggiorna i permessi da solo, si riprende dal tasto
dell'invito. Percio' `sincronizza` guarda i permessi PRIMA di leggere il
calendario e, se manca, lo dice insieme alla cura invece di riprovare a vuoto
ogni sei ore.

## Quello che Discord pretende (verificato)

- Tipo ESTERNO: `channel_id` nullo, `entity_metadata.location` obbligatorio (il
  link del canale), `scheduled_end_time` OBBLIGATORIO.
- `privacy_level` solo GUILD_ONLY (2). `name` 1-100, `description` 1-1000.
- `recurrence_rule`: WEEKLY con `by_weekday` (0-6). `end`, `count` e
  `by_year_day` non si possono scrivere da fuori.
- Fino a 100 eventi attivi per server; noi ci fermiamo a venti fasce.

## Dove sta nel codice

| pezzo | dove |
|---|---|
| le porte di Discord | `src/features/discord-api.js` — `eventi`, `creaEvento`, `sistemaEvento`, `togliEvento` |
| il modello | `src/features/discord-eventi.js` |
| il giro che li allinea | `src/bot.js` — `_giroEventiDiscord`, ogni sei ore |
| la carta | pannello, dentro «Avvisi su Discord» |
