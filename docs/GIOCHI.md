# Giochi e monete

## I duelli: due difetti veri

Il direttore ha segnalato che i duelli «danno tag inesistenti» e mostrano «`{a}`
come vincente». Erano due difetti reali, e vale la pena raccontarli perché sono
di due specie diverse.

### `{a}` in chat

Uno dei quattro esiti del duello era:

```
'{a} e {b} se le danno di santa ragione… vince {a}! 🔥'
```

e la sostituzione era `.replace('{a}', a).replace('{b}', b)`.

`String.replace` con una stringa cambia **solo la prima occorrenza**. Quindi in
chat usciva letteralmente:

> Mario e Luigi se le danno di santa ragione… vince **{a}**!

Un errore di battitura reso letale da un metodo fragile. La correzione non è
sistemare quella riga — è togliere di mezzo il modo di sbagliare: `riempi()`
sostituisce **tutte** le occorrenze e **lancia** se resta un segnaposto non
risolto. Un modello scritto male non arriva più in chat: si ferma nei collaudi.

### Duelli con i fantasmi

`!duello @chiunque` funzionava con qualunque nome: il bot annunciava il duello e
**accreditava le monete** a un profilo che non esisteva. Bastava inventare un
nome per creare punteggi dal nulla.

Ora si può sfidare solo chi ha parlato in chat negli ultimi trenta minuti. Il bot
tiene una memoria leggera di chi si è visto, che serve anche a non sfidare
qualcuno che se n'è andato mezz'ora fa.

## L'economia delle monete

### Com'era

Si guadagnava **solo scrivendo**: due monete, al massimo una volta al minuto.
Quindi:

- chi guardava in silenzio per due ore prendeva **zero**;
- chi scriveva "ok" ogni minuto ne prendeva centoventi.

Si premiava il rumore, non la presenza — ed era un invito a tenere una macro che
scrive in chat. Inoltre valeva anche a canale **spento**, dove non c'è niente da
premiare, e un flusso continuo a bocce ferme è esattamente ciò che svaluta una
moneta.

### Com'è ora

Sul modello dei sistemi fedeltà collaudati (StreamElements, Streamlabs), **due
flussi che si sommano**:

| flusso | a chi | quando |
|---|---|---|
| presenza | a chi è in chat, anche in silenzio | ogni giro |
| partecipazione | in più, a chi ha scritto in quel giro | ogni giro |

più i moltiplicatori per **abbonati** (×1,5) e **VIP** (×1,25), letti dai
distintivi dei messaggi — quindi senza una sola chiamata in più a Twitch.

E la regola che il direttore ha chiesto: chi resta in lurk continua a guadagnare,
ma **gradualmente meno**. Un gradino per ogni giro senza partecipare, fino a un
minimo sotto il quale non si scende:

```
giri in silenzio   0    1    2    3    4    5+
monete             5    4    4    3    2    2
```

Non a zero, perché la presenza vale sempre qualcosa. E chi torna a parlare
**risale subito a quota piena**, senza dover recuperare.

Tutto solo mentre il canale è in diretta (disattivabile).

Il giro si aggancia al ciclo delle ore guardate, che ogni cinque minuti già
chiede a Twitch chi è in chat: le monete di presenza non costano **nessuna**
chiamata aggiuntiva.

## Più tipi di manche

Prima lo streamer poteva creare due tipi di gioco: quiz e parola veloce. Ora
cinque, e tre sono nuovi:

| tipo | cosa fa | cosa serve |
|---|---|---|
| Quiz | domanda e risposte accettate | le domande |
| Parola veloce | il primo che scrive la parola | le parole |
| **Anagramma** | lettere mescolate da rimettere in ordine | parole da 4+ lettere |
| **Sequenza** | ricopiare una sequenza di simboli | i simboli |
| **Domanda tua** | una domanda sola, scritta da te | domanda e risposte |
| Numero | indovina il numero | niente, è di serie |

I tipi stanno in **un elenco solo** (`COSTRUTTORI`), da cui si servono il
sorteggio delle manche automatiche, la dashboard e i collaudi: aggiungerne uno
non vuol dire ricordarsi di tre elenchi sparsi che possono divergere.

Due dettagli che sembrano piccoli e non lo sono:

- l'anagramma **rimescola finché il risultato è diverso dall'originale**. Un
  anagramma uguale alla parola non è un gioco;
- il controllo della risposta riceve il testo **sia normalizzato sia grezzo**. La
  normalizzazione toglie tutto ciò che non è alfanumerico — comprese le emoji —
  quindi la sequenza di simboli sarebbe stata impossibile da vincere.

## Il collaudo

`t_giochi.mjs` verifica:

- che **ogni modello di testo** si riempia senza lasciare segnaposto, e che un
  segnaposto ripetuto venga sostituito tutte le volte;
- che un modello con un segnaposto ignoto **protesti** invece di passare;
- che non si possano sfidare fantasmi;
- che chi guarda guadagni, chi partecipa guadagni di più, e che abbonati e VIP
  stiano nell'ordine giusto;
- che il lurk scenda **in modo monotono** e non arrivi mai a zero;
- che chi torna a parlare risalga subito;
- e per **ogni tipo di manche**, che la soluzione superi il proprio controllo —
  cioè che non esista una manche invincibile.

## Fonti

- [Streamlabs — Loyalty Points](https://streamlabs.com/content-hub/post/cloudbot-101-loyalty-points)
- [StreamElements — Loyalty System](https://support.streamelements.com/hc/en-us/articles/10474478470290-Loyalty-System-Overview)
- [Frictions and flows in Twitch's platform economy](https://www.tandfonline.com/doi/full/10.1080/1369118X.2024.2331766)
