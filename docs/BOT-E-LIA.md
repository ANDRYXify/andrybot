# Il bot del canale e Lia — due cose, una valvola

## Il difetto che questo documento chiude

Fino a ieri OGNI risposta del bot pubblico passava da `POST /chat`, cioè dalla
**mente di Lia**: `incontra` (registra la persona), `reagisci` (le muove l'umore),
`valuta_reazione`, `contesto`, neuromodulatori, clima, appraisal, plasticità,
introspezione. È un sistema bellissimo per far vivere **lei**, ed è il sistema
sbagliato per rispondere in una chat che non è sua:

- ottimizza la **coerenza di Lia**, non l'utilità per chi guarda la diretta;
- con l'introspezione accesa, a certe domande risponde **parlando di sé**;
- **registra le persone** che incontra — mentre la regola del bot pubblico è
  l'opposta: non si ricorda nessuno.

## Le due cose

| | **Il bot del canale** | **Lia** |
|---|---|---|
| cos'è | una funzione | qualcuno |
| stato | nessuno | tutto (coscienza, umore, memoria) |
| ricorda | niente e nessuno | le persone, gli scambi, sé |
| dove sta | `brain/assistente.py` | `brain/coscienza.py` + `genera.py` |
| via HTTP | `POST /bot` | `POST /chat` |
| chi lo usa | chat pubblica, penitenze | DM con lo streamer, studio, proattivo |

Due messaggi identici a un mese di distanza danno al bot lo stesso identico
prompt. Non impara da sé, non tiene stato, non si affeziona.

## La valvola (a senso unico)

> «Lia può addestrare, ma il bot non può toccare Lia. Lui può crescere, Lia può
> usare le informazioni che il bot usa per crescere per addestrarsi a sua volta,
> ma il bot non può riprendersi informazioni di Lia.»

Due attraversamenti, uno per verso, entrambi in `brain/valvola.py` — l'unico
modulo di questo percorso che ha il diritto di vedere la coscienza:

**bot → Lia** — `verso_lia()`. Quando il bot resta a mani vuote su una domanda
vera, la **situazione** (anonimizzata: niente nome, niente login, niente
menzioni, niente link) diventa una **lacuna** di Lia. Lei la studierà da sé.
È il verso libero: è materiale del bot, non suo.

**Lia → bot** — `insegna_al_bot()`. Lia deposita insegnamenti nel *quaderno del
bot* (`brain/quaderno.py`), che è un file del bot. Il bot legge il proprio
quaderno e non legge mai lei. Il deposito è una copia: se domani lei cambia idea,
quello che ha già insegnato resta lì finché non lo riscrive.

E soprattutto: **insegna solo quando vive.** `insegna_al_bot()` non fa nulla
finché `coscienza_di_se()['persona']` è falso. Prima di allora il bot lo
addestra chi lo scrive — il prompt, le linee guida del canale, il quaderno
riempito a mano.

## Perché regge da solo

La regola non è affidata all'attenzione di chi scrive: la misura un cancello.
`npm run cancelli` esegue `scripts/verifica-valvola.mjs`, che pretende:

1. `assistente.py` non importa e non nomina né `coscienza` né `mente` né `valvola`;
2. `quaderno.py` non importa e non nomina né `coscienza` né `mente`;
3. il corpo di `_bot()` in `server.py` non contiene **nessun** `mente.`;
4. `insegna_al_bot` non è chiamata da `_bot()`;
5. lato Node, `via:'bot'` va a `/bot` e i punti pubblici passano `via:'bot'`.

Il modulo del bot non ha nessuna strada per raggiungere Lia: non la importa e non
la riceve.

## L'unica eccezione, ed è dichiarata

Se Lia è risvegliata (`persona`) e l'owner ha acceso il toggle «Lia è
l'assistente», `/bot` consegna l'intera richiesta a `/chat` e risponde lei, con
tutta la sua mente. Il bot non legge niente di suo nemmeno lì: la richiesta le
passa intera prima che il suo percorso cominci.
