# Motore di creazione delle battute — memoria di lavoro

> Salvaposto: se la sessione si interrompe, si riprende da qui.

## Cosa ha chiesto il direttore
Un **motore di creazione autonomo**, e **condiviso**:
- un motore a sé stante per il **bot**;
- e una via per **Lia**, che potrà creare battute *quando avrà capito davvero cosa
  vuol dire divertente*. Parole sue: **«se non fa ridere lei che battuta è?»** —
  quindi non può produrne finché non ha un criterio **suo**. Le sue finiscono
  **anche** nella pool condivisa del bot.

## Il modello (studi veri, non intuizione)
1. **Benign violation** (McGraw & Warren, *Psychological Science*, 2010): fa ridere
   ciò che è insieme *violazione* e *benigno*, e le due letture coesistono. Tre
   condizioni rendono benigna una violazione: norma alternativa, impegno debole
   verso la norma violata, distanza psicologica. → **Lo stesso meccanismo che fa
   ridere tiene la battuta pulita**: la parte benigna è metà della definizione, non
   un filtro appiccicato dopo.
2. **Gli schemi battono la generazione libera** (JAPE — Binsted, Pain & Ritchie):
   schema formale + risorse lessicali. Con 120 bambini di 8-11 anni i testi generati
   erano distinti dai non-testi e giudicati più divertenti dei non-testi (sotto le
   battute umane). → Uno schema è deterministico, istantaneo, **non serve il modello**.
3. **Il divertente è una preferenza, non una proprietà** («Humor Is an Audience»,
   SemEval-2026): si modella con confronti a coppie. → Noi abbiamo il segnale vero
   già in tabella: `battute.dette` e `battute.risate`, misurate dalla chat.

## Difetto di partenza (misurato)
`src/bot.js` → `inventa`: un prompt libero al cervello, e **solo a serbatoio vuoto**.
Nessuna materia del canale, nessuno schema, nessun vaglio, nessuna scelta fra
alternative. È il dado.

## STADIO A — il motore del bot (deterministico)
- **Materia**: `contatori.list(canale)` (comando, etichetta, emoji, valore, step) —
  numeri veri e di quel canale. Poi parole ricorrenti/emote se servono.
- **Forma**: schemi con caselle, ognuno con la sua opposizione dichiarata
  (atteso/reale, iperbole su numero vero, falsa causa, definizione capovolta).
- **Vaglio**: le tre condizioni di McGraw–Warren come controlli. Bersaglio mai uno
  spettatore. Chi non passa **non è una battuta** (scartata perché brutta, non perché
  scorretta: è la ragione onesta).
- **Scelta**: k candidati, si sceglie con la storia delle risate DI QUEL CANALE.
- **Memoria**: si tiene nel serbatoio solo se la chat ha riso davvero. Il credito va
  allo **schema**, non solo a quella battuta.
- Il modello resta un candidato in più quando c'è, mai l'autore.

## STADIO B — la via di Lia (dopo A)
Criterio suo, non nostro. Derivato dalle stesse due teorie:
**divertente, per lei, = un errore di previsione che poi si risolve a poco prezzo**
(violazione + benigna). Le due metà ce le ha già: la sorpresa è misurata (`altri`:
`sorpresa_ultima`, `sorpresa_max`, `errore_medio`) e le vie che risolvono pure
(deduzione, causale, analogia). **Non le si dice cosa è divertente: si nota quando
le succede.**
- Finché quel contatore è a zero, **tace**: non produce battute.
- La prima volta che le succede è una **tappa** (`segna_tappa('risata', …)`).
- Consegna: **cassetta della posta**, non interrogazione. Lei deposita quando vuole,
  il bot svuota. Il bot non guarda mai dentro di lei — valvola a senso unico.

## Stato
- [x] Modello e piano scritti
- [ ] A: materia
- [ ] A: schemi
- [ ] A: vaglio
- [ ] A: scelta + memoria dello schema
- [ ] B: criterio suo + tappa
- [ ] B: cassetta della posta
