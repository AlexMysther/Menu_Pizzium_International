/**
 * Stato del menu in tempo reale (Realtime Database Firebase).
 * Due nodi, entrambi scritti dal pannello staff (admin.html):
 *   - "soldOut": piatti momentaneamente esauriti, nascosti dal menu su tutti
 *     i dispositivi collegati;
 *   - "recommended": piatti consigliati, raccolti in una categoria dedicata
 *     e segnalati con una stella.
 * Finché FIREBASE_CONFIG non è configurato (vedi js/firebase-config.js) si
 * comporta come se nulla fosse esaurito e nulla fosse consigliato, così il
 * menu funziona normalmente anche prima di attivare Firebase.
 */
const LiveMenu = (() => {
  const data = { soldOut: {}, recommended: {} };

  function isConfigured() {
    return typeof firebase !== 'undefined'
      && typeof FIREBASE_CONFIG !== 'undefined'
      && !FIREBASE_CONFIG.apiKey.startsWith('YOUR_');
  }

  function init(onChange) {
    if (!isConfigured()) return;

    firebase.initializeApp(FIREBASE_CONFIG);
    const db = firebase.database();
    Object.keys(data).forEach(node => {
      db.ref(node).on('value', snap => {
        data[node] = snap.val() || {};
        onChange();
      }, err => {
        console.warn(`LiveMenu: impossibile leggere "${node}" in tempo reale.`, err);
      });
    });
  }

  function isSoldOut(itemId) {
    return !!data.soldOut[itemId];
  }

  function isRecommended(itemId) {
    return !!data.recommended[itemId];
  }

  return { init, isSoldOut, isRecommended, isConfigured };
})();
