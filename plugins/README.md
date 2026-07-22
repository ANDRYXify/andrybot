# Plugin (solo operatore) ⚠️

Questa cartella è per i **plugin server-side** di SocialBot. Sono **codice JavaScript
vero** che gira **sul server, dentro il processo del bot, con pieni privilegi**.

> **Mettili SOLO tu (operatore andryxify).** Non sono per gli streamer: chi scrive
> un file qui può fare qualsiasi cosa il processo Node possa fare (rete, disco, ecc.).
> Gli **streamer** hanno invece i **Moduli** (`docs/moduli.md`): automazioni fatte di
> soli *dati* (JSON), senza esecuzione di codice arbitrario. Quella è la superficie
> sicura e condivisa; questa cartella no.

## Come funziona

All'avvio, `caricaPlugin()` legge questa cartella e importa ogni file **`*.js`**.
Ogni plugin esporta:

- una funzione `default`, **oppure**
- un oggetto con un metodo `setup`.

Riceve un'API stabile:

```js
export default function setup({ on, say, log }) {
  on('message', (msg) => { /* msg = { channel, user, display, text, ... } */ });
  on('event',   (ev)  => { /* ev  = { channel, type, data }              */ });
  // say(channel, text) scrive in chat con l'account dello streamer
}
```

- `on('message', h)` — un handler per ogni messaggio di chat.
- `on('event', h)` — un handler per ogni evento Twitch (follow, sub, raid, cheer,
  riscatti punti, live on/off).
- `say(channel, text)` — invia un messaggio in chat.
- `log` — logger con `.info/.warn/.error/.debug`.

## Regole pratiche

- Un plugin che va in errore al caricamento **non blocca** gli altri né l'avvio del bot.
- Gli handler sono isolati: un'eccezione viene loggata (in `DEBUG`) e non ferma gli altri.
- File di esempio: [`esempio-saluto.js.txt`](esempio-saluto.js.txt) — ha estensione
  `.js.txt` apposta, così **non viene caricato**. Copialo in `saluto.js` per attivarlo.
- Solo i file `.js` vengono caricati: `README.md` e `*.txt` sono ignorati.
