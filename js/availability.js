/**
 * Disponibilità piatti in tempo reale.
 * Legge il nodo "soldOut" del Realtime Database Firebase: le chiavi presenti
 * (valore true) sono i piatti momentaneamente esauriti, nascosti dal menu su
 * tutti i dispositivi collegati. Finché FIREBASE_CONFIG non è configurato
 * (vedi js/firebase-config.js) si comporta come se nulla fosse mai esaurito,
 * così il menu funziona normalmente anche prima di attivare Firebase.
 */
const Availability = (() => {
  let soldOut = {};
  let ready = false;

  function isConfigured() {
    return typeof firebase !== 'undefined'
      && typeof FIREBASE_CONFIG !== 'undefined'
      && !FIREBASE_CONFIG.apiKey.startsWith('YOUR_');
  }

  function init(onChange) {
    if (!isConfigured()) return;

    firebase.initializeApp(FIREBASE_CONFIG);
    firebase.database().ref('soldOut').on('value', snap => {
      soldOut = snap.val() || {};
      ready = true;
      onChange();
    }, err => {
      console.warn('Availability: impossibile leggere la disponibilità live.', err);
    });
  }

  function isSoldOut(itemId) {
    return !!soldOut[itemId];
  }

  return { init, isSoldOut, isConfigured, get ready() { return ready; } };
})();
