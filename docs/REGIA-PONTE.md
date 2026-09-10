# Comandare la regia da lontano — modello

Nato da: «non possiamo creare un piccolo plugin funzionante multiversione? magari
con il plugin basta collegarsi tramite passkey al proprio account».

## Il problema vero (che non e' la password)

Oggi i tasti di scena funzionano **solo** dalla pagina aperta sul computer dove
gira il programma di regia: il browser parla col loopback, e il loopback del
telefono e' il telefono. Quindi la cosa che manca non e' comodita' — e' che dal
telefono, dal tablet e dalla tastiera fisica **le scene non si comandano**, cioe'
proprio dove una plancia serve di piu'.

## Tre strade, e cosa costano davvero

**A. Plugin nativo dentro OBS.** Codice C/C++ compilato **per sistema e per
versione**: l'ABI di OBS cambia fra major, quindi tre build, firma su Windows,
notarizzazione su macOS, e un giro di lavoro a ogni OBS nuovo. «Multiversione»
non e' un dettaglio: e' il costo principale.

**B. Script nella scheda Scripting.** Sarebbe l'ideale — un file, niente
compilazione, attraversa le versioni. **Non si puo': il Lua di OBS non ha rete.**
Misurato sulla documentazione: LuaJIT dentro OBS porta solo base, bit, debug,
ffi, io, jit, math, os, package, string e table. Niente HTTP, niente websocket. I
giri esistenti sono `io.popen("curl")` — che blocca il thread e fa singhiozzare
il cambio scena — o caricare DLL native con FFI, che ci riporta ad A.

**C. Il ponte nel browser.** La pagina aperta sul computer della regia ha gia'
tutte e due le mani: una sul nostro server (e' nostra) e una sul programma
(loopback). Puo' fare da ponte: il telefono preme, il server manda il passo alla
pagina, la pagina lo esegue sul programma.

## La scelta: C adesso, e A solo se un giorno servira' davvero

C non chiede di installare niente, non dipende dall'ABI di OBS (usa il websocket
pubblico, che e' stabile) e si puo' fare oggi. Il suo limite e' onesto e va
scritto: **serve che il pannello sia aperto su quel computer.** Chi streama ha
quel computer acceso; la scheda aperta e' una cosa in piu' da ricordare.

Se un giorno quel limite dara' fastidio, la risposta NON e' il plugin nativo: e'
un programmino fuori da OBS che parla lo stesso websocket pubblico. Stessa
architettura di C, ospitata altrove — e per costruzione funziona con ogni
versione, perche' non tocca l'ABI.

## Sulla passkey: non puo' funzionare cosi'

Una passkey e' WebAuthn: autentica **un browser** verso **un sito**. Un plugin non
e' un browser e non puo' farla. La forma giusta, quando servira', e' un **codice
di accoppiamento**: il pezzo esterno mostra un codice, lo si approva dal pannello
— dove si e' gia' entrati con la passkey — e riceve un gettone suo, revocabile.
Per chi lo usa il risultato e' identico; il meccanismo no.

Nel ponte nel browser il problema non si pone nemmeno: la pagina e' gia'
autenticata come sempre.

## Come e' fatto il ponte

- La pagina, quando la regia e' collegata, **si annuncia**: da questo momento
  puo' eseguire passi di regia per questo canale.
- Il server, quando un passo di regia arriva da fuori (telefono, tastiera
  fisica), lo **manda alla pagina** e aspetta l'esito.
- Se nessuna pagina si e' annunciata, il tasto **lo dice** — non risponde
  «fatto». E' la stessa regola di sempre: un tasto che mente e' peggio di un
  tasto che non c'e'.
- Il ponte porta SOLO passi di regia gia' salvati su un tasto di quel canale: non
  e' un canale per comandi liberi.
