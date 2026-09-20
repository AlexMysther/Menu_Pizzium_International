/**
 * Pagina staff, due pannelli sulla stessa lista di piatti:
 *   - "Disponibilità": scrive il nodo "soldOut" del Realtime Database,
 *     i piatti spenti spariscono subito dal menu;
 *   - "Consigliati": scrive il nodo "recommended", i piatti accesi finiscono
 *     nella categoria "Consigliati" del menu, con una stella.
 * Entrambi i nodi sono letti in tempo reale da js/live-menu.js. Login con
 * Firebase Authentication (email/password): solo utenti autenticati possono
 * scrivere, per via delle Security Rules del database (vedi README).
 */
const el = {
  configWarning: document.getElementById('configWarning'),
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  loginError: document.getElementById('loginError'),
  panel: document.getElementById('panel'),
  loggedInAs: document.getElementById('loggedInAs'),
  logoutBtn: document.getElementById('logoutBtn'),
  tabAvailability: document.getElementById('tabAvailability'),
  tabRecommended: document.getElementById('tabRecommended'),
  adminHint: document.getElementById('adminHint'),
  itemGroups: document.getElementById('itemGroups')
};

// Le due modalità differiscono solo per il nodo su cui scrivono e per cosa
// significa l'interruttore acceso: la lista di piatti e i toggle sono gli
// stessi, quindi cambiare pannello non ridisegna nulla.
const MODES = {
  availability: {
    node: 'soldOut',
    tab: el.tabAvailability,
    hint: 'Disattiva un piatto per nasconderlo subito dal menu su tutti i dispositivi. Riattivalo per farlo ricomparire.',
    // Acceso = piatto disponibile = nessuna chiave su "soldOut": è lo stato
    // di riposo di un piatto, quindi deve corrispondere alla posizione "on"
    // naturale dell'interruttore.
    isOn: (nodeData, itemId) => !nodeData[itemId],
    valueFor: on => (on ? null : true)
  },
  recommended: {
    node: 'recommended',
    tab: el.tabRecommended,
    hint: 'Accendi i piatti da suggerire a chi non sa cosa scegliere: compaiono con una stella e in una categoria "Consigliati" in cima al menu.',
    isOn: (nodeData, itemId) => !!nodeData[itemId],
    valueFor: on => (on ? true : null)
  }
};

let mode = MODES.availability;

function isConfigured() {
  return !FIREBASE_CONFIG.apiKey.startsWith('YOUR_');
}

// Un tablet lasciato loggato sul bancone non deve restare una porta aperta:
// niente sessione persistita da un turno all'altro, e logout automatico se
// resta inattivo troppo a lungo.
const INACTIVITY_LOGOUT_MS = 15 * 60 * 1000;
let inactivityTimer = null;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  if (firebase.auth().currentUser) {
    inactivityTimer = setTimeout(() => firebase.auth().signOut(), INACTIVITY_LOGOUT_MS);
  }
}

const refs = {};
const data = { soldOut: {}, recommended: {} };

async function init() {
  if (!isConfigured()) {
    el.configWarning.hidden = false;
    return;
  }

  firebase.initializeApp(FIREBASE_CONFIG);
  // Sessione legata alla scheda del browser: chiudendola si esce, invece
  // di restare loggati a tempo indeterminato come fa Firebase di default.
  await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);

  const [categories, items, itDict] = await Promise.all([
    fetch('data/menu/categories.json').then(r => r.json()),
    fetch('data/menu/items.json').then(r => r.json()),
    fetch('data/i18n/it.json').then(r => r.json())
  ]);

  categories.sort((a, b) => a.order - b.order);
  renderItemGroups(categories, items, itDict);
  applyMode();

  const db = firebase.database();
  Object.keys(data).forEach(node => {
    refs[node] = db.ref(node);
    refs[node].on('value', snap => {
      data[node] = snap.val() || {};
      syncToggles();
    });
  });

  firebase.auth().onAuthStateChanged(user => {
    el.loginForm.hidden = !!user;
    el.panel.hidden = !user;
    if (user) el.loggedInAs.textContent = user.email;
    resetInactivityTimer();
  });

  ['click', 'keydown', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, resetInactivityTimer)
  );

  el.loginForm.hidden = false;
}

function renderItemGroups(categories, items, itDict) {
  el.itemGroups.innerHTML = '';
  categories.forEach(cat => {
    const catItems = items.filter(it => it.categoryId === cat.id);
    if (catItems.length === 0) return;

    const section = document.createElement('section');
    section.className = 'admin-group';

    const h2 = document.createElement('h2');
    h2.textContent = (itDict.categories && itDict.categories[cat.id]) || cat.id;
    section.appendChild(h2);

    const ul = document.createElement('ul');
    ul.className = 'admin-item-list';
    catItems.forEach(item => ul.appendChild(renderItemRow(item, itDict)));
    section.appendChild(ul);

    el.itemGroups.appendChild(section);
  });
}

function renderItemRow(item, itDict) {
  const li = document.createElement('li');
  li.className = 'admin-item-row';

  const name = document.createElement('span');
  name.className = 'admin-item-name';
  name.textContent = (itDict.items && itDict.items[item.id] && itDict.items[item.id].name) || item.id;
  li.appendChild(name);

  const label = document.createElement('label');
  label.className = 'admin-toggle';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.itemId = item.id;
  input.addEventListener('change', () => setFlag(item.id, input.checked));
  const slider = document.createElement('span');
  slider.className = 'admin-toggle-slider';
  label.appendChild(input);
  label.appendChild(slider);
  li.appendChild(label);

  return li;
}

function setFlag(itemId, isOn) {
  refs[mode.node].child(itemId).set(mode.valueFor(isOn)).catch(err => {
    alert('Salvataggio non riuscito: ' + err.message);
  });
}

function syncToggles() {
  el.itemGroups.querySelectorAll('input[data-item-id]').forEach(input => {
    input.checked = mode.isOn(data[mode.node], input.dataset.itemId);
  });
}

function applyMode() {
  Object.values(MODES).forEach(m => {
    m.tab.classList.toggle('active', m === mode);
    m.tab.setAttribute('aria-selected', String(m === mode));
  });
  el.adminHint.textContent = mode.hint;
  // Spento qui vuol dire "non consigliato", non "esaurito": l'interruttore
  // resta grigio invece di dare l'allarme rosso della disponibilità.
  el.itemGroups.classList.toggle('admin-groups--neutral-off', mode === MODES.recommended);
  syncToggles();
}

function setMode(next) {
  mode = next;
  applyMode();
}

el.tabAvailability.addEventListener('click', () => setMode(MODES.availability));
el.tabRecommended.addEventListener('click', () => setMode(MODES.recommended));

el.loginForm.addEventListener('submit', e => {
  e.preventDefault();
  el.loginError.hidden = true;
  firebase.auth()
    .signInWithEmailAndPassword(el.loginEmail.value, el.loginPassword.value)
    .catch(err => {
      el.loginError.textContent = err.message;
      el.loginError.hidden = false;
    });
});

el.logoutBtn.addEventListener('click', () => firebase.auth().signOut());

init();
