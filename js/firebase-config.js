/**
 * Configurazione del progetto Firebase usato per la disponibilità live dei
 * piatti (vedi README, sezione "Disponibilità piatti in tempo reale").
 *
 * Questi valori NON sono segreti: la API key di Firebase identifica solo il
 * progetto, non autorizza letture/scritture (quelle le decidono le Security
 * Rules lato Firebase). È normale e previsto che restino nel codice
 * pubblico — vedi https://firebase.google.com/docs/projects/api-keys.
 *
 * Sostituire i valori sotto con quelli del vostro progetto Firebase
 * (Project settings > General > Your apps > Web app > SDK setup and
 * configuration) dopo aver seguito i passi nel README.
 */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBtel3-uDyq64SkoJnO-FzWD5S5zxfrPI0",
  authDomain: "pizzium-menu-international.firebaseapp.com",
  databaseURL: "https://pizzium-menu-international-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "pizzium-menu-international"
};
