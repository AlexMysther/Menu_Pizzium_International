# Menu Pizzium International

Menu digitale multilingua di Pizzium S.p.A. — versione test per 1 locale, pensata per essere **espandibile a molte lingue senza toccare il codice**.

Sito statico (HTML/CSS/JS vanilla, nessuna build), senza immagini dei piatti (come la versione cartacea). Aprire `index.html` tramite un web server statico (es. `python3 -m http.server`) — non funziona con `file://` a causa delle `fetch()` verso i JSON.

## Struttura

```
index.html
css/style.css
js/i18n.js          # loader traduzioni (fallback su IT per chiavi mancanti)
js/app.js           # rendering menu, filtri, switch lingua
data/
  menu/
    categories.json # categorie del menu (id, ordine) — NON tradotto
    items.json       # piatti: id, categoria, prezzo/varianti, tag dietetici, gruppo — NON tradotto
  i18n/
    languages.json  # registro delle lingue disponibili (bandiera, nome nativo, direzione testo)
    it.json          # lingua di fallback — DEVE sempre contenere tutte le chiavi
    en.json, de.json, fr.json, es.json
    ru.json, zh.json, ar.json, pt.json
```

Il contenuto del menu (`categories.json`, `items.json`) è **separato dalle traduzioni**: ogni piatto ha un id stabile (es. `"valle-aosta"`) usato come chiave nei file `data/i18n/*.json` per recuperare nome/descrizione nella lingua attiva.

## Come aggiungere una nuova lingua

Nessuna modifica al codice JS/HTML è necessaria.

1. Copiare `data/i18n/it.json` in `data/i18n/<codice>.json` (es. `ja.json` per il giapponese) e tradurre tutti i valori (lasciare invariate le chiavi).
2. Aggiungere una riga in `data/i18n/languages.json`:
   ```json
   { "code": "ja", "nativeName": "日本語", "englishName": "Japanese", "flag": "🇯🇵", "dir": "ltr" }
   ```
   Usare `"dir": "rtl"` per lingue scritte da destra a sinistra (es. arabo, ebraico, persiano).
3. Fatto: la lingua compare automaticamente nel selettore ricercabile in alto a destra.

Se una traduzione è incompleta, le chiavi mancanti mostrano automaticamente il testo italiano (fallback), quindi si può pubblicare una lingua anche mentre viene completata.

## Come aggiungere/modificare un piatto

1. Aggiungere una voce in `data/menu/items.json` con un `id` univoco, `categoryId`, `group` (opzionale, per sotto-sezioni come "Pizze Regionali" o "Vini Bianchi") e:
   - `price`: singolo prezzo (es. `"14.00"`), oppure
   - `variants`: array di formati/prezzi, es. `[{ "label": "calice", "price": "6.00" }, { "label": "bottiglia 75cl", "price": "22.00" }]` per vini e birre alla spina.
   - `tags`: array di tag dietetici tra `vegan`, `vegetarian`, `lactose-free` (icone mostrate automaticamente).
2. Aggiungere la traduzione (`name`, `desc` — `desc` è opzionale, si può omettere) sotto `items.<id>` in **ogni** file `data/i18n/*.json` (almeno in `it.json`; le altre lingue useranno il fallback finché non tradotte).

## Lingue attualmente incluse

Italiano, Inglese, Tedesco, Francese, Spagnolo, Russo, Cinese, Arabo, Portoghese — contenuto reale trascritto dal menu cartaceo Pizzium (86 voci: antipasti, primi, secondi, calzoni, pizze regionali e classiche, insalate, dolci, menu bambino, bevande con birre/vini/cocktail/caffetteria).
