# Più di una piattaforma

> © 2024–2026 Andrea Taliento (ANDRYXify)

## L'idea che tiene in piedi tutto

Il bot **non deve sapere da dove arriva un messaggio**. Comandi, moduli,
antispam, punti, ore guardate, memoria, minigiochi: tutto legge la stessa forma
e risponde attraverso la stessa interfaccia.

Due sole cose devono essere vere perché una piattaforma nuova funzioni il primo
giorno, senza toccare niente di quello che c'è:

1. un messaggio entra con la **forma di casa** — `channel, user, display, text,
   id, userId, isMod, isBroadcaster, isSub, isVip, isSelf, tags`;
2. la piattaforma espone **`say(canale, testo)`**, come fa la chat di Twitch.

Da lì in poi il gestore dei messaggi non cambia di una riga. E la risposta torna
**da dove è arrivata la domanda**: un `!comando` scritto su Kick si risponde su
Kick, non su Twitch — che è l'unica cosa che conta per chi ha scritto.

## Kick

OAuth 2.1 con **PKCE**: quando lo streamer preme «collega», nasce un segreto
usa-e-getta che resta nella *sua* sessione; a Kick va solo la sua impronta, e al
ritorno si mostra il segreto per intero. Un codice intercettato non serve a
nulla senza il verifier, che non è mai passato dalla rete.

I token finiscono nella **stessa tabella** di quelli Twitch (`kind='kick'`):
cifrati a riposo dalla strada già provata, ed esclusi dall'esportazione dei dati
senza doversene ricordare. Si rinnovano **prima** della scadenza, e una volta
sola anche se dieci messaggi partono insieme.

I messaggi non li chiediamo: Kick li **spinge** al nostro webhook. Che è
pubblico per forza — Kick deve raggiungerlo — quindi chiunque lo trovi potrebbe
mandarci finti eventi. L'unica cosa che distingue Kick da un impostore è la
firma RSA, e si verifica **prima di guardare qualunque altra cosa**.

Quello che si firma non è solo il corpo: è `id.timestamp.corpo`. Se si firmasse
solo il corpo passerebbe il **replay** — un evento vero, catturato e rispedito
mille volte. Il collaudo lo prova: stesso corpo e stessa firma con un altro id
non passa.

### Cosa NON fa ancora, e perché è detto qui

Antibot e antispam agiscono via Helix (elimina, timeout): hanno senso solo su
Twitch. Su Kick il messaggio passa direttamente al flusso normale — **meglio
nessuna moderazione che una moderazione che finge di esserci**. Kick ha le sue
rotte di moderazione (`moderation:ban`, `moderation:chat_message:manage`): sono
già negli scope facoltativi, l'aggancio è il passo dopo.

## YouTube

Le credenziali ci sono. Il lavoro vero non è l'OAuth: è il **quota** e la
**verifica Google** (lo scope `youtube.force-ssl` è sensibile; prima della
verifica il progetto ha un tetto di 100 utenti che vale per tutta la sua vita).
Il modo giusto di leggere la chat è `liveChatMessages.streamList`, che tiene una
connessione aperta invece di interrogare in continuazione.
