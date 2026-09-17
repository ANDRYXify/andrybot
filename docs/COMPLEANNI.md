# Compleanni

Gli auguri esistevano solo nel gruppo Telegram. Portarli in chat non e' «lo
stesso codice con un'altra uscita»: cambiano due cose nel modello, e se non
cambiano il risultato e' una funzione che sembra esserci e non serve a niente.

## Un compleanno e' di una persona, non di un membro di un gruppo

Il gruppo e' soltanto uno dei posti da cui quella persona ci parla. Percio' la
chiave della tabella `compleanni` dice CHI, e ha tre forme che non si possono
confondere fra loro:

    123456789        l'id Telegram di chi se l'e' segnato nel gruppo
    man_a1b2c3       aggiunto a mano dallo streamer (solo un nome)
    chat:marco99     segnato dalla chat  (chat:kick.giada se scrive da Kick)

Il prefisso `chat:` non e' un vezzo. Un nome fatto di sole cifre e' legittimo
su Twitch: senza prefisso, `12345` finirebbe sulla riga del membro Telegram
numero 12345. Il login dentro alla chiave e' quello canonico del prodotto
(`identita.js`), quindi porta con se' la piattaforma senza una colonna in piu'.

La tabella non e' cambiata, e le righe di prima valgono ancora: e' la stessa
colonna, letta per quello che ha sempre contenuto.

## In chat non esiste la mezzanotte

Nel gruppo gli auguri partono a mezzanotte italiana, ed e' giusto: un gruppo si
legge quando si vuole. In chat a mezzanotte non c'e' nessuno, e un augurio che
nessuno legge non e' un augurio.

Quindi in chat partono al **primo messaggio** di chi compie gli anni quel
giorno, una volta l'anno (`last_auguri`, lo stesso campo del gruppo: sono due
righe diverse, quindi non si pestano i piedi). Chi quel giorno non passa non
riceve niente: gli auguri si fanno a chi c'e'.

Il segno «gia' fatto» si scrive **prima** di parlare. Se si scrivesse dopo, un
messaggio che non parte lascerebbe la riga da rifare, e la chat si riempirebbe
di auguri uguali a ogni frase del festeggiato.

## Niente cache

Il controllo e' una lettura per chiave primaria su SQLite, in processo: costa
meno di quasi tutto quello che un messaggio attraversa gia'. Una cache dei
compleanni di oggi avrebbe risparmiato quel nulla e comprato un difetto vero:
chi si segna il compleanno **oggi** non sarebbe nella cache, e proprio il suo
giorno passerebbe senza auguri.

## Un comando, due posti

`/compleanno` nel gruppo e `!compleanno` in chat chiedono le stesse tre cose
(dimmi la mia, segnamela, toglila). Quella decisione sta in una funzione sola
(`leggiArgomento`), e cambia solo come si risponde: il gruppo parla in HTML e
puo' taggare, la chat parla in testo semplice.

In chat il nome del comando arriva gia' riportato a quello canonico dal vaglio
del registro, quindi il gestore guarda l'id e non i soprannomi: `!compleanni` e
`!birthday` li scioglie il registro, come per ogni altro comando.

Il comando vive con gli auguri in chat: spenti quelli, non risponde. Un comando
che si lascia usare e poi non fa succedere niente e' peggio di un comando che
non c'e'.

## Cosa decide lo streamer

Nella scheda Notifiche: interruttore, testo (con `{nome}`) e un **effetto**
della sua libreria che parte insieme agli auguri. L'elenco dei compleanni resta
uno solo, con accanto da dove arriva ognuno.

## Collaudo

`test/unita/compleanni-chat.test.mjs`: la chiave che non puo' collidere, il
comando letto uguale col punto e con l'esclamativo, segnare-rileggere-togliere,
il comando muto quando la funzione e' spenta, gli auguri una volta sola (la
filastrocca e' il difetto naturale di questa idea), l'anno segnato, chi compie
gli anni un altro giorno, e l'effetto che parte solo se scelto.
