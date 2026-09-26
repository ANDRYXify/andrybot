# Gli avvisi su cosa manca

Chi usa SocialBot spesso non sa che una cosa esiste, o che le manca un passo
perché funzioni. Gli avvisi glielo dicono una cosa per volta, in basso a destra,
senza fermarlo.

## Il modello

- **Un avviso è una cosa che manca**, ricavata dallo stato vero del canale, non
  un giro a tempo. Esiste finché manca: fatta la cosa, sparisce da sé.
- **Il catalogo sta in un posto solo**, `src/features/cosa-manca.js`, in ordine
  di peso: prima quello che rompe qualcosa che c'è già (permessi, bot spento,
  Spotify per chi ha la Musica), poi quello che non si scopre da soli (overlay
  mai aperto, nessun comando, pagina link non pubblicata, settimana vuota).
- **Un fatto che il server non sa leggere non accende niente.** Meglio tacere
  che dire una cosa falsa. Un canale solo Discord non ne ha: per lui chat,
  overlay e pagina link non esistono.
- **Uno per visita**, dopo dodici secondi di quiete. Mai sopra una finestra, il
  giro guidato, l'invito alle recensioni o la ricerca, e mai sulla scheda che lo
  risolve (ci sei già). L'invito alle recensioni aspetta lui, e viceversa.

## Di chi sono

Solo del proprietario del canale. È la regola che conta di più, e il motivo è
concreto: se un moderatore potesse toglierli, chi modera un canale altrui (magari
streamer a sua volta, mentre sistema le sue cose) spegnerebbe al proprietario
proprio gli avvisi che gli servono.

- La lista la calcola `avvisiAperti`, che per chi non è il proprietario torna
  vuota. Il server le passa `isOwner(req)`, falso per chi entra da moderatore.
- Le risposte e l'interruttore passano da `POST /api/streamer/avvisi`, che è
  `requireOwner` e scrive nelle impostazioni del canale di chi è entrato da
  proprietario.
- `POST /api/streamer/impostazioni` li ignora: quella porta la può chiamare
  anche un moderatore.

`test/contratto/cosa-manca.test.mjs` fissa tutte e tre le cose, e diventa rosso
se una delle porte si apre.

## Le risposte

«Fammi vedere» porta alla scheda e lo rimanda a domani (se la cosa si fa,
sparisce comunque). «Domani», «Fra una settimana», «Non mostrarlo più». Esc e
basta vale domani. Le risposte restano nel server, non nel browser: una scelta
tenuta nel browser torna a galla sul telefono.

In Account c'è l'interruttore per spegnerli tutti.

## L'overlay

L'avviso dell'overlay dice esattamente quello che si misura: «il tuo overlay non
l'hai ancora aperto». Il server ricorda la prima volta che il flusso dell'overlay
si collega con la chiave giusta, una volta sola.
