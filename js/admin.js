/**
 * Pagina staff per attivare/disattivare la disponibilità dei piatti in
 * tempo reale. Scrive sullo stesso nodo "soldOut" del Realtime Database
 * letto da js/availability.js. Login con Firebase Authentication
 * (email/password): solo utenti autenticati possono scrivere, per via
 * delle Security Rules del database (vedi README).
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
  itemGroups: document.getElementById('itemGroups')
};

function isConfigured() {
  return !FIREBASE_CONFIG.apiKey.startsWith('YOUR_');
}

let soldOutRef = null;
let soldOut = {};

async function init() {
  if (!isConfigured()) {
    el.configWarning.hidden = false;
    return;
  }

  firebase.initializeApp(FIREBASE_CONFIG);
  soldOutRef = firebase.database().ref('soldOut');

  const [categories, items, itDict] = await Promise.all([
    fetch('data/menu/categories.json').then(r => r.json()),
    fetch('data/menu/items.json').then(r => r.json()),
    fetch('data/i18n/it.json').then(r => r.json())
  ]);

  categories.sort((a, b) => a.order - b.order);
  renderItemGroups(categories, items, itDict);

  soldOutRef.on('value', snap => {
    soldOut = snap.val() || {};
    syncToggles();
  });

  firebase.auth().onAuthStateChanged(user => {
    el.loginForm.hidden = !!user;
    el.panel.hidden = !user;
    if (user) el.loggedInAs.textContent = user.email;
  });

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

  const status = document.createElement('span');
  status.className = 'admin-item-status';
  status.dataset.statusFor = item.id;
  li.appendChild(status);

  const label = document.createElement('label');
  label.className = 'admin-toggle';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.itemId = item.id;
  input.addEventListener('change', () => {
    setSoldOut(item.id, input.checked);
    updateStatusText(status, input.checked);
  });
  const slider = document.createElement('span');
  slider.className = 'admin-toggle-slider';
  label.appendChild(input);
  label.appendChild(slider);
  li.appendChild(label);

  updateStatusText(status, false);
  return li;
}

function updateStatusText(statusEl, isSoldOut) {
  statusEl.textContent = isSoldOut ? 'Esaurito' : 'Disponibile';
  statusEl.classList.toggle('admin-item-status--sold-out', isSoldOut);
}

function setSoldOut(itemId, isSoldOut) {
  soldOutRef.child(itemId).set(isSoldOut || null).catch(err => {
    alert('Salvataggio non riuscito: ' + err.message);
  });
}

function syncToggles() {
  el.itemGroups.querySelectorAll('input[data-item-id]').forEach(input => {
    input.checked = !!soldOut[input.dataset.itemId];
  });
  el.itemGroups.querySelectorAll('[data-status-for]').forEach(statusEl => {
    updateStatusText(statusEl, !!soldOut[statusEl.dataset.statusFor]);
  });
}

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
