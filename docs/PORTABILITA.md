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
