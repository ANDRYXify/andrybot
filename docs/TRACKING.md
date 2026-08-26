# Il rilevamento di volto, mani e gesti

Quattro difetti veri, trovati facendo **girare davvero** la pagina con una
webcam finta (`--use-fake-device-for-media-stream`) invece di guardarla.

## 1. Il modello delle mani non c'era

`hand.landmarks` era acceso, ma nella cartella dei modelli stavano
`handlandmark-**full**.json/.bin`. Human di default chiede
`handlandmark-**lite**`. Risultato: 404 sul modello dei punti della mano, e

```
Human: error loading model: /vendor/human-models/handlandmark-lite.json
Failed to parse model JSON of response
```

(«failed to parse» perche al 404 il server rispondeva con la pagina HTML.)

Il rilevatore delle mani caricava, i **punti** delle mani no: **le mani non sono
mai state rilevate**, e senza punti non esistono gesti.

Ora `handlandmark-lite` e vendorizzato (2 MB, contro i 5,3 del full) e i
percorsi dei modelli sono **scritti nella nostra configurazione**, non ereditati
dal default della libreria:

```js
hand: {
  detector: { modelPath: 'handtrack.json' },
  skeleton: { modelPath: 'handlandmark-lite.json' },
}
```

Cosi la dipendenza e dichiarata da noi e non puo cambiare sotto i piedi al
prossimo aggiornamento di Human. Tutti i manifest sono stati ricontrollati: ogni
`.json` cita un `.bin` che esiste davvero.

## 2. Il ripiego WASM era rotto

Human prova i motori in ordine: **webgl → webgpu → wasm**. Se la scheda video
non collabora — succede con schede vecchie, driver capricciosi e dentro la
fonte browser di OBS — si finisce sul WASM. E li:

```
wasm streaming compile failed: Incorrect response MIME type
WebAssembly.instantiate(): expected magic word 00 61 73 6d, found 3c 21 44 4f
```

`3c 21 44 4f` e `<!DO`: stava ricevendo **HTML** al posto del binario. Il
percorso predefinito di tfjs punta a un CDN esterno (jsdelivr), che questo
progetto per scelta non usa.

Ora i tre binari (`tfjs-backend-wasm{,-simd,-threaded-simd}.wasm`, 1,1 MB in
tutto) stanno in `/vendor/`, e `wasmPath` punta li. Sono **nella stessa cartella
di `human.js`** apposta: tfjs, quando non gli si dice altro, li cerca accanto al
proprio script. Cosi le due strade — la nostra configurazione e il default della
libreria — portano allo **stesso posto**, e non conta quale delle due venga
percorsa.

Verificato: motore `wasm`, cinque modelli su cinque caricati, rilevamento a 4,7
giri/secondo su una macchina **senza GPU**. Con WebGL vero e molto piu veloce.

## 3. `127.0.0.1` non era considerato sicuro

`if (!location.protocol.startsWith('https') && location.hostname !== 'localhost')`
— ma contesto sicuro non vuol dire «https oppure il nome localhost»: la
specifica include anche `127.0.0.1`, `[::1]` e i sottodomini `.localhost`.

Adesso lo si chiede al browser, che e l'unico a saperlo davvero:

```js
if (!window.isSecureContext) { … }
```

## 4. Il messaggio non diceva niente

`libreria non caricata` non e riparabile da nessuno. Ora, se `Human` manca, la
pagina ritira `/vendor/human.js` da sola e dice **cosa** e successo: HTTP
diverso da 200, file troppo corto, sintassi che questo browser non digerisce, o
blocco della CSP.

E servito subito: in produzione ha risposto «arrivata incompleta (71 byte)», e
quei 71 byte erano la pagina-esca dell'anti-scanner (vedi
`docs/ESCHE-VENDOR.md`). Senza quel messaggio non l'avremmo trovata.

## Collaudo

`scratchpad/t_trk3.mjs` — pagina vera, webcam finta, motore WASM:

| | |
| --- | --- |
| stato | `attivo` in 2 secondi |
| video / tela | 1280×720, allineate |
| modelli caricati | **5 su 5** (blazeface, emotion, facemesh, handtrack, handlandmark-lite) |
| peso totale | 7,8 MB |
| rilevamento | 4,7 giri/s senza GPU |
| errori pagina / 404 | **0** |
