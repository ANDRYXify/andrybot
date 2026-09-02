# Portarsi via i propri dati

> © 2024–2026 Andrea Taliento (ANDRYXify)

Su un prodotto a pagamento in Europa non è cortesia: è un diritto (GDPR art. 20,
portabilità). Ma è anche una cosa giusta e basta — chi ha costruito duecento
comandi, una memoria di chat e una pagina pubblica deve poter uscire dalla porta
con la sua roba in mano, non restare per ostaggio dei dati.

`GET /api/streamer/esporta` (solo il **proprietario** del canale: un moderatore
gestisce, non possiede) restituisce un JSON scaricabile con tutto ciò che è del
canale.

## Come si evita che invecchi

Un elenco di tabelle scritto a mano si stacca dal database alla prima tabella
nuova: l'esportazione tace, e nessuno se ne accorge. Qui l'elenco si **ricava
dallo schema** — ogni tabella con una colonna di canale viene esportata — e
l'unica cosa scritta a mano è ciò che **non** deve uscire, con il motivo
accanto.

Il collaudo pretende che ogni tabella di canale sia stata *guardata*: esportata,
oppure negata di proposito con un motivo. Una tabella nuova entra da sola; se
contiene segreti va negata, e dimenticarsene fa diventare rosso il collaudo.

## Cosa non esce, e perché

| tabella | perché |
|---|---|
| `tokens`, `spotify_tokens`, `tiktok_tokens`, `seventv_tokens` | chiavi di accesso: darle via sarebbe consegnare il proprio account |
| `passkeys` | materiale di autenticazione, inutile altrove |
| `telegram_login` | codici di collegamento momentanei |
| `brain_model` | pesi del modello: sono del sistema, non dello streamer |
| `link_page_visite` | contatore grezzo, con dati di chi ha visitato |
| `messages` | **i messaggi della chat sono di chi li ha scritti**, non del canale |
| `stream_context` | stato momentaneo, non dati |

Oltre alle tabelle, non escono mai colonne che si chiamano
`access_token`, `refresh_token`, `secret`, `password`, `token`, `apikey` — in
qualunque tabella si trovino, anche in una futura.

Dei messaggi escono **solo i propri**: quelli che lo streamer ha scritto nel suo
canale. La chat degli spettatori non è roba sua da portare via.

## Le prove

Non basta che ci sia tutto il proprio: deve anche **non esserci** niente che non
lo è. Il collaudo controlla entrambe le cose — che i comandi e gli effetti ci
siano, che la roba di un altro streamer non compaia, che nessun token esca *in
nessuna forma* (nemmeno come stringa dentro un altro campo), che i messaggi
altrui restino fuori, e che un nome di canale ostile non diventi SQL.

## Come esce il file dal browser

Sembra un dettaglio da niente e invece era il difetto: sull'iPhone il pulsante
**non faceva niente**.

Il file veniva chiesto con `fetch`, trasformato in un blob, appeso a un `<a
download>` finto e cliccato via codice. È il modo che va su Chrome desktop, ed è
anche il modo che **iOS Safari ignora** — l'attributo `download` su un URL
`blob:` non lo onora, e dentro un'app installata a schermo intero il clic
programmatico non produce nulla. Nessun errore, nessun messaggio: il pulsante
sembrava rotto perché *era* rotto.

Ora il pulsante è un **link vero**: `<a href="/api/streamer/esporta" download>`.
Il server manda già `Content-Disposition: attachment`, quindi il download lo fa
il browser per conto suo — senza JavaScript, quindi senza niente che possa non
funzionare su una piattaforma invece che su un'altra. Il codice resta solo per
dire, in demo, che lì non si scarica davvero.

La regola generale, che vale oltre questo bottone: **un file che esiste sul
server si scarica con un link.** Il blob serve soltanto quando il file lo
fabbrica il browser e non esiste da nessun'altra parte — le grafiche social, la
GIF, il video, lo scatto della webcam. Quelli non hanno un URL a cui puntare, e
lì il blob non è una scelta ma l'unica strada (con lo stesso limite su iOS, che
resta da affrontare a parte).

E il pulsante ora **non compare ai moderatori**: la rotta è del proprietario, e
un link che porta a un rifiuto è peggio di un link assente. Al suo posto una riga
che dice di chi sono i dati.
