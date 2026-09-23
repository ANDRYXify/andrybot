# I vocali delle tracce e l'angolo AFK

## Il difetto, visto dal vivo

Costruendo la traccia «Intorno alle dirette», «Salotto» e «In diretta»
nascevano uguali: aperti a tutti, dove chiunque entra e parla. Per «Salotto» è
giusto — è il salotto. Per «In diretta» no: è la stanza dove stai tu mentre
trasmetti, e chiunque entrasse ti parlerebbe sopra.

E l'angolo AFK: nelle impostazioni del server c'erano «dopo quanto sposta
nell'angolo AFK» e «quale angolo», e nessuna traccia creava un angolo da
scegliere. Due comandi che puntavano a una cosa che non esisteva.

## «In diretta»: si ascolta

    tutti       nega  parlare
    Streamer    può   parlare
    Moderatori  può   parlare

Chi entra ascolta, chi sta davanti parla. **Chi ha il server parla comunque**,
e non per una regola nostra: Discord al proprietario dà tutto, e i permessi dei
canali su di lui non valgono (lo dice il calcolo dei permessi nei documenti di
Discord: `if guild.is_owner(member): return ALL`). «Streamer» serve quando in
onda c'è qualcuno che il server non ce l'ha; «Moderatori» a chi deve poter
intervenire.

I due ruoli nominati esistono nella traccia stessa. Se lo streamer ne toglie
uno, quella riga cade e l'anteprima dice quale: non resta una regola che nomina
un ruolo che non c'è.

## L'angolo AFK

Ogni traccia che ha dei vocali crea «Angolo AFK», e lo nomina nelle
impostazioni con un campo suo: `server.canaleAfkNome`. Un campo a parte e non
«un id oppure un nome» nella stessa casella: due tipi in un posto solo
vorrebbero dire indovinare quale dei due c'è scritto.

Tre regole, e ognuna toglie un difetto:

- **Il nome diventa id quando il canale esiste.** Se c'è già, si punta a lui
  nell'anteprima; se nasce in questo giro, il costruttore lo traduce subito
  dopo averlo creato. Se non nasce, il campo cade e il resto parte lo stesso.
- **Riempie un vuoto, non cambia una scelta.** Se il server ha già un suo
  angolo AFK, la traccia non lo tocca: è la stessa regola del «lascia com'è».
- **Solo un vocale.** Discord rifiuta un canale di testo come angolo AFK, quindi
  un canale di testo con quel nome non viene nemmeno considerato.

Discord zittisce da sé chi finisce nell'angolo AFK: lì non serve togliere
«parlare», servirebbe solo a scrivere una regola che non cambia niente.

## Nel pannello

La tendina «Angolo AFK» mostra «Angolo AFK (quello della traccia, se non ne hai
già uno)» quando la traccia lo nomina e non hai scelto altro. Rileggere il
modulo lo rimette nella traccia come nome, non come id: così la regola «riempie
un vuoto» resta al modello e non la scavalca il pannello.

## Dove sta nel codice

| pezzo | dove |
| --- | --- |
| la stanza e l'angolo nelle tracce | `src/features/discord-catalogo.js` (`stanzaDelloStreamer`, `ANGOLO_AFK`, `serverPronto`) |
| il nome che diventa id | `src/features/discord-preset.js` (`differenzaServer`) e `discord-costruisci.js` |
| la tendina | `src/web/public/app.js` (`_dcsSceltaCanale`, `_dcsImpLeggi`) |
| le prove | `test/unita/discord-vocali.test.mjs` |
