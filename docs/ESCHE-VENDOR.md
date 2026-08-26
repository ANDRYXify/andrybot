# Quando la difesa mangia le nostre cose

## Il sintomo

Il rilevatore di volto/mani diceva `SocialBot tracking · libreria non caricata`.
Sul banco funzionava tutto: `Human` caricava, i modelli scendevano, anche
applicando la stessa CSP di produzione. Il codice era giusto.

## Come si e trovato

Il messaggio non diceva **perche**, e senza quello non si ripara. Quindi prima
di indovinare l'ho reso diagnostico: se `Human` manca, la pagina ora ritira
`/vendor/human.js` da sola e dice cosa e successo — HTTP diverso da 200, file
troppo corto, sintassi non digeribile dal browser, o blocco della CSP.

Al primo tentativo in produzione ha risposto:

> libreria arrivata incompleta (**71 byte** invece di ~1,5 milioni)

Settantuno byte non sono un file troncato: sono un'altra risposta. E infatti
sono esattamente la pagina finta di `esche.js`:

```
<!DOCTYPE html><title>401 Unauthorized</title><h1>401 Unauthorized</h1>
```

Al secondo tentativo: **HTTP 429**. L'IP era finito in castigo.

## La causa

`src/web/esche.js` intrappola gli indirizzi che solo uno scanner chiederebbe.
Fra i prefissi c'e `/vendor/`, e ha ragione di esserci:
`/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php` e uno degli indirizzi piu
scansionati al mondo.

Ma sotto `/vendor/` ci stanno anche le **nostre** cose: `human.js`, i dieci file
dei modelli, `pixi.min.js`, `pixi-filters.min.js`, `qrcode.js` e — da poco — i
quattordici `.woff2` dei caratteri. La difesa serviva la pagina-esca al posto
della libreria; e siccome la pagina del tracking ne chiede una quindicina, si
superava la soglia di dodici e l'indirizzo finiva **in castigo per otto
minuti**, con 429 su tutto il resto.

Quindi non erano rotti solo i rilevamenti: erano a rischio il QR code, gli
effetti WebGL dell'overlay e i caratteri appena messi in casa.

## La correzione

Togliere `/vendor/` dalla lista sarebbe stata la toppa sbagliata: riaprirebbe
una superficie d'attacco vera. La regola giusta si dice una volta sola:

> **Un indirizzo che corrisponde a un file che pubblichiamo davvero non e mai
> un attacco.**

`eEsca()` ora, prima di far scattare la trappola, controlla se il percorso
risolve a un file esistente dentro `src/web/public/`. Se si, passa. Il
controllo e in cache, rifiuta `..` e i byte nulli, e pretende che il file
risolto stia **dentro** la radice pubblica: per passare di qui un indirizzo
deve corrispondere a qualcosa che ci abbiamo messo noi.

Cosi qualunque cosa si vendorizzi domani e al sicuro da se, e tutto quello che
non pubblichiamo resta in trappola.

## Collaudo

`scratchpad/t_esche.mjs`, quattordici casi contro il middleware vero:

| indirizzo | esito |
| --- | --- |
| `/vendor/human.js`, `/vendor/pixi.min.js`, `/vendor/qrcode.js` | passa |
| `/vendor/human-models/blazeface.json` | passa |
| `/vendor/font/archivo-…woff2`, `/vendor/font/LICENSE.txt` | passa |
| `/style.css` | passa |
| `/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php` | **in trappola** |
| `/vendor/composer/installed.json` | **in trappola** |
| `/vendor/qualsiasi-cosa-non-nostra.php` | **in trappola** |
| `/wp-login.php`, `/.env`, `/.git/config` | **in trappola** |
| `/vendor/../style.css` (risalita) | **in trappola** |
