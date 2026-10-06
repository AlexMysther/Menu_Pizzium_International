# Foto dei piatti

Metti qui le foto, una per piatto, con il nome del file uguale all'`id`
del piatto in [`data/menu/items.json`](../../data/menu/items.json), estensione `.jpg`
(va bene anche `.png`, provato automaticamente se manca il `.jpg`).

Esempio: il piatto

```json
{ "id": "margherita", "categoryId": "pizze", "group": "pizze-classiche", ... }
```

vuole il file `img/immagini_piatti/margherita.jpg`.

Non serve modificare items.json: il menu cerca automaticamente il file con
quel nome e, se non lo trova, mostra la riga senza foto (nessun errore
visibile per il cliente).

Consigli per le foto:
- crop quadrato (1:1), stesso inquadramento per tutte così la lista è ordinata
- almeno 300x300px (il menu le mostra piccole ma su schermi retina servono il doppio dei pixel)
- esporta in JPG compresso, non PNG, per non appesantire il caricamento su wifi del locale
