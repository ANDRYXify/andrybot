# Le sorelle di una scheda

Da ogni scheda del pannello si arriva a quelle accanto senza tornare al menù.
Non è una barra in più: è la stessa barra che c'era per Discord e per la
moderazione, resa una **conseguenza** invece di una cosa da ricordarsi gruppo
per gruppo.

## Il difetto, misurato

La barra c'era in sei gruppi su nove. Dentro «Scena», «Vetrina» e «Community»
per passare da «Effetti & suoni» a «Emote (7TV)» si doveva risalire al menù;
dentro «Discord» no. La stessa azione, due modi diversi a seconda di dove eri.

Tredici schede su trentatré non avevano nessuna barra: grafiche, stato, alert,
consolify, effetti, emote, dirette, sottoscrizione, pagina, donazioni,
telegram, notifiche, statistiche.

Nessuno se n'era accorto perché una barra che manca non fa rumore: fa solo un
clic in più, ogni volta.

## La regola, una sola

**Una scheda ha sempre delle sorelle**: quelle della sua *famiglia* se ne ha
una, se no le altre del suo *gruppo* nel menù.

    sorelleDi(id) = famigliaDi(id)  ||  il gruppo del menù che la contiene

Da qui «la barra c'è dappertutto» non è più una cosa da mantenere: è quello che
succede. Aggiungere una scheda a un gruppo le dà la barra senza toccare niente.

## Perché non si è toccato `famigliaDi`

Sarebbe stato più corto, e sbagliato. `famigliaDi` risponde a un'altra domanda
— di che cosa fa parte questa scheda — e da quella risposta dipendono il titolo
della pagina (`infoScheda`) e quale voce del menù si accende. Facendogli
tornare anche i gruppi, il titolo avrebbe ripetuto il nome del gruppo due volte
e nel menù si sarebbero accese tutte le voci del gruppo insieme.

Due domande diverse, due funzioni. `sorelleDi` risponde solo a «da qui, dove
altro posso saltare?».

## I nomi nella barra sono quelli del menù

Per una famiglia valgono i nomi corti della famiglia (dentro Discord: «Ruoli»,
«Avvisi», «Il server»). Per un gruppo valgono le etichette del menù, prese
dalla stessa tabella che il menù usa: la barra dice quello che hai appena letto
nel menù, e non un secondo nome per la stessa cosa.

## Chi resta fuori, e perché

`admin` e `avatar` sono schede da amministratore. `studio` (Studio Web) è
nascosto apposta dal commit `5437e2f` — faceva laggare le dirette — e il codice
resta per quando le prestazioni saranno a posto.

## Come si misura

`scripts/verifica-sorelle.mjs` non legge il codice: **apre il pannello**, va su
ogni scheda che il pannello disegna davvero e guarda se la barra c'è, se porta
da qualche parte e se cliccandola ci si arriva. Una regola scritta bene e una
barra che non compare sono due cose diverse, e conta la seconda.

L'elenco delle schede lo dà il pannello (`pannello('…')`), non il cancello: una
scheda nuova entra nel conto da sola.
