# Menu Pizzium International

Menu digitale multilingua di Pizzium S.p.A. — versione test per 1 locale, pensata per essere **espandibile a molte lingue senza toccare il codice**.

Sito statico (HTML/CSS/JS vanilla, nessuna build), senza immagini dei piatti (come la versione cartacea). Aprire `index.html` tramite un web server statico (es. `python3 -m http.server`) — non funziona con `file://` a causa delle `fetch()` verso i JSON.

## Struttura

```
index.html
css/style.css
js/i18n.js          # loader traduzioni (fallback su IT per chiavi mancanti)
js/app.js           # rendering menu, filtri, switch lingua
js/live-menu.js     # esauriti e consigliati in tempo reale (Firebase)
img/flags/          # bandiere PNG (@2x per retina), da flagcdn.com
data/
  menu/
    categories.json # categorie del menu (id, ordine) — NON tradotto
    items.json       # piatti: id, categoria, prezzo/varianti, tag dietetici, gruppo — NON tradotto
  i18n/
    languages.json  # registro delle lingue disponibili (bandiera, nome nativo, direzione testo)
    it.json          # lingua di fallback — DEVE sempre contenere tutte le chiavi
    en.json, fr.json, es.json, pt.json, de.json, nl.json
    no.json, sv.json, ro.json, hu.json, hr.json, sl.json
    sr.json, cs.json, sk.json, pl.json, ru.json, uk.json
    el.json, zh.json, ja.json, ko.json, tr.json
    ar.json, he.json
```

Ogni file di lingua contiene, oltre alle traduzioni dei piatti, un **glossario** (`glossary`) dei termini italiani che restano invariati nelle descrizioni (gorgonzola, capocollo, DOP, olio EVO...): nel menu compaiono sottolineati e, al tocco, aprono una spiegazione breve nella lingua attiva. Il termine si traduce **una volta sola per lingua**, non a ogni piatto in cui ricorre.

Il contenuto del menu (`categories.json`, `items.json`) è **separato dalle traduzioni**: ogni piatto ha un id stabile (es. `"valle-aosta"`) usato come chiave nei file `data/i18n/*.json` per recuperare nome/descrizione nella lingua attiva.

## Come aggiungere una nuova lingua

Nessuna modifica al codice JS/HTML è necessaria.

1. Copiare `data/i18n/it.json` in `data/i18n/<codice>.json` (es. `ja.json` per il giapponese) e tradurre tutti i valori (lasciare invariate le chiavi).
2. Scaricare la bandiera del paese in PNG (es. da https://flagcdn.com/w80/jp.png e https://flagcdn.com/w160/jp.png per il retina) e salvarla in `img/flags/` come `<codice-paese-iso>.png` e `<codice-paese-iso>@2x.png` (il codice paese ISO può differire dal codice lingua, es. inglese → `gb`, arabo → `sa`, cinese → `cn`).
3. Aggiungere una riga in `data/i18n/languages.json`:
   ```json
   { "code": "ja", "nativeName": "日本語", "englishName": "Japanese", "flag": "img/flags/jp.png", "dir": "ltr" }
   ```
   Usare `"dir": "rtl"` per lingue scritte da destra a sinistra (es. arabo, ebraico, persiano).
4. Fatto: la lingua compare automaticamente nel selettore ricercabile in alto a destra.

Attenzione al blocco `glossary` copiato insieme al resto: oltre a `term` e `desc`, va rivisto anche `match`, che elenca le forme del termine **come le scrive la nuova lingua** (vedi sotto).

Se una traduzione è incompleta, le chiavi mancanti mostrano automaticamente il testo italiano (fallback), quindi si può pubblicare una lingua anche mentre viene completata.

## Come aggiungere un termine al glossario

Nessuna modifica al codice JS/HTML è necessaria.

1. Aggiungere una voce sotto `glossary` in `data/i18n/it.json`:
   ```json
   "nduja": {
     "term": "'Nduja",
     "desc": "Salume calabrese piccante e spalmabile. Carne di maiale.",
     "match": ["nduja"]
   }
   ```
   - `term`: l'etichetta mostrata in cima al riquadro.
   - `desc`: una frase. Dove serve, chiudere con l'informazione dietetica (`Contiene latte.`, `Carne di maiale.`): è il motivo principale per cui un turista tocca il termine.
   - `match`: le forme **come compaiono davvero** nelle descrizioni di quella lingua (confronto senza distinzione di maiuscole). Più forme sono ammesse, es. `["рикотта", "рикотты"]` per le declinazioni.
2. Ripetere la voce negli altri `data/i18n/*.json`, traducendo `term` e `desc`.
   - `match` si può **omettere** se la forma coincide con quella italiana (es. "gorgonzola" in inglese, francese, spagnolo): vale il fallback su `it.json`.
   - Va invece indicato quando la lingua scrive il termine diversamente (`"горгонзола"`, `"戈贡佐拉奶酪"`, `"غورغونزولا"`).
   - `"match": []` disattiva il termine in quella lingua: si usa quando lì è già tradotto e chiaro (es. `passata` → `番茄泥` in cinese).

Le forme più lunghe hanno la precedenza, quindi `"grana padano"` vince su un eventuale `"grana"` e `"riso venere"` su `"venere"`. Nelle lingue che separano le parole con spazi il termine viene evidenziato solo se è una parola intera; in cinese, giapponese e coreano il controllo è disattivato perché lì gli spazi non esistono.

## Come aggiungere/modificare un piatto

1. Aggiungere una voce in `data/menu/items.json` con un `id` univoco, `categoryId`, `group` (opzionale, per sotto-sezioni come "Pizze Regionali" o "Vini Bianchi") e:
   - `price`: singolo prezzo (es. `"14.00"`), oppure
   - `variants`: array di formati/prezzi, es. `[{ "label": "calice", "price": "6.00" }, { "label": "bottiglia 75cl", "price": "22.00" }]` per vini e birre alla spina.
   - `tags`: array di tag dietetici tra `vegan`, `vegetarian`, `lactose-free` (icone mostrate automaticamente).
     I piatti con `vegan` o `vegetarian` compaiono anche nella pill **"Vegetariano e vegano"** (sempre visibile, con la foglia verde), che raccoglie in un'unica vista, divisi per categoria, tutti i piatti senza carne né pesce: utile per chi è vegetariano/vegano o evita la carne per motivi religiosi (es. halal). Le etichette sono `ui.vegFilter` e `ui.vegFilterNote` nei file di lingua.
2. Aggiungere la traduzione (`name`, `desc` — `desc` è opzionale, si può omettere) sotto `items.<id>` in **ogni** file `data/i18n/*.json` (almeno in `it.json`; le altre lingue useranno il fallback finché non tradotte).

## Disponibilità e piatti consigliati in tempo reale (Firebase)

Dal pannello staff (`admin.html`) si governano due cose, entrambe con effetto immediato su **tutti i client connessi**, senza ricaricare la pagina:

- **Disponibilità**: quando un piatto finisce, lo staff lo spegne e sparisce dal menu.
- **Consigliati**: i piatti che lo staff suggerisce a chi non sa cosa scegliere. Compaiono con una stella nella loro categoria e, tutti insieme, in una categoria "Consigliati" che si aggiunge in testa alle pill (e sparisce quando non c'è nessun consiglio attivo).

Il sito resta statico (GitHub Pages non cambia): Firebase è un servizio esterno chiamato via JS direttamente dal browser, non un server da gestire.

File coinvolti: `js/firebase-config.js` (config progetto), `js/live-menu.js` (letto da `index.html`, legge i nodi `soldOut` e `recommended`), `admin.html` + `js/admin.js` (pannello staff, una scheda per nodo).

**Setup una tantum** (richiede un account Google):

1. Crea un progetto su [console.firebase.google.com](https://console.firebase.google.com) (piano gratuito Spark, sufficiente per un locale).
2. **Build > Realtime Database** → crea database → parti in modalità "locked" (nega tutto), poi vai su "Regole" e incolla:
   ```json
   {
     "rules": {
       "soldOut": {
         ".read": true,
         "$itemId": {
           ".write": "auth != null"
         }
       },
       "recommended": {
         ".read": true,
         "$itemId": {
           ".write": "auth != null"
         }
       }
     }
   }
   ```
   Lettura pubblica (serve ai clienti per vedere il menu), scrittura solo per utenti autenticati (lo staff).
3. **Build > Authentication** → tab "Sign-in method" → abilita "Email/Password" → tab "Users" → aggiungi manualmente un account per lo staff (email + password).
4. **Project settings** (icona ingranaggio) → in fondo, sezione "Your apps" → crea una "Web app" → copia i valori mostrati (`apiKey`, `authDomain`, `databaseURL`, `projectId`) dentro `js/firebase-config.js`, al posto dei placeholder `YOUR_...`.
5. Pubblica (commit + push): `js/firebase-config.js` contiene la config del progetto ma **non è un segreto** — la API key di Firebase non autorizza nulla da sola, la sicurezza reale è nelle Security Rules del punto 2 (vedi anche `js/firebase-config.js` per i dettagli).

**Uso quotidiano:** lo staff apre `admin.html`, fa login con l'account creato al punto 3, e trova la lista di tutti i piatti con un interruttore ciascuno, in due schede: "Disponibilità" (acceso = piatto disponibile) e "Consigliati" (acceso = piatto suggerito). Finché `firebase-config.js` ha ancora i valori placeholder, sia `index.html` che `admin.html` funzionano normalmente ma senza alcun effetto (nessun piatto risulta mai esaurito né consigliato).

Le etichette mostrate ai clienti (`ui.recommended`, `ui.recommendedItem`, `ui.recommendedNote`) stanno nei file di lingua come tutto il resto: la scelta dei piatti è una sola e vale per tutte le lingue.

## Lingue attualmente incluse

Italiano, Inglese, Francese, Spagnolo, Portoghese, Tedesco, Olandese, Norvegese, Svedese, Rumeno, Ungherese, Croato, Sloveno, Serbo, Ceco, Slovacco, Polacco, Russo, Ucraino, Greco, Cinese, Giapponese, Coreano, Turco, Arabo, Ebraico — contenuto reale trascritto dal menu cartaceo Pizzium (86 voci: antipasti, primi, secondi, calzoni, pizze regionali e classiche, insalate, dolci, menu bambino, bevande con birre/vini/cocktail/caffetteria).
