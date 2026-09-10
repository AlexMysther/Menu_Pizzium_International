const ALLERGEN_ICONS = {
  gluten: '🌾',
  milk: '🥛'
};

const state = {
  languages: [],
  currentLang: null,
  dict: null,
  categories: [],
  items: [],
  activeCategory: 'pizze',
  searchQuery: '',
  view: 'menu' // 'menu' | 'bevande'
};

const el = {
  langFlag: document.getElementById('langFlag'),
  langCode: document.getElementById('langCode'),
  langSwitchBtn: document.getElementById('langSwitchBtn'),
  langPanel: document.getElementById('langPanel'),
  langBackdrop: document.getElementById('langBackdrop'),
  langSearchInput: document.getElementById('langSearchInput'),
  langList: document.getElementById('langList'),
  menuTitle: document.getElementById('menuTitle'),
  searchInput: document.getElementById('searchInput'),
  categoryPills: document.getElementById('categoryPills'),
  menuList: document.getElementById('menuList'),
  noResults: document.getElementById('noResults'),
  tabMenuBtn: document.getElementById('tabMenuBtn'),
  tabBevandeBtn: document.getElementById('tabBevandeBtn')
};

async function init() {
  // Fire every first-load request in one parallel batch, including a
  // speculative fetch of the browser/saved language: waiting for
  // languages.json to resolve before fetching the language file would
  // turn one round trip of latency into two on every page load, which
  // is the dominant cost on a slow venue wifi/4G connection (the JSON
  // payloads themselves are only ~20KB total).
  const guessCode = I18N.guessInitialLangCode();
  const needsOverride = guessCode !== I18N.FALLBACK_LANG;

  const [languages, categories, items, fallbackDict, guessDict] = await Promise.all([
    I18N.loadLanguages(),
    fetch('data/menu/categories.json').then(r => r.json()),
    fetch('data/menu/items.json').then(r => r.json()),
    I18N.loadLangFile(I18N.FALLBACK_LANG),
    needsOverride ? I18N.loadLangFile(guessCode).catch(() => null) : Promise.resolve(null)
  ]);

  state.languages = languages;
  state.categories = categories.sort((a, b) => a.order - b.order);
  state.items = items;

  const codes = languages.map(l => l.code);
  const initialLang = codes.includes(guessCode) ? guessCode : I18N.FALLBACK_LANG;
  const dict = initialLang === I18N.FALLBACK_LANG
    ? fallbackDict
    : I18N.combine(fallbackDict, guessDict);

  applyLanguage(initialLang, dict);
  bindEvents();
}

async function setLanguage(code) {
  const dict = await I18N.getTranslations(code);
  applyLanguage(code, dict);
}

function applyLanguage(code, dict) {
  state.currentLang = code;
  state.dict = dict;
  localStorage.setItem('pizzium_lang', code);

  const lang = state.languages.find(l => l.code === code);
  document.documentElement.lang = code;
  document.documentElement.dir = lang ? lang.dir : 'ltr';

  el.langFlag.textContent = lang ? lang.flag : '';
  el.langCode.textContent = code.toUpperCase();

  renderStaticText();
  renderCategoryPills();
  renderLangList('');
  renderMenuList();
}

function tr(path) {
  return I18N.t(state.dict, path);
}

function renderStaticText() {
  el.menuTitle.textContent = tr('ui.menuTitle');
  el.searchInput.placeholder = tr('ui.searchPlaceholder');
  el.langSearchInput.placeholder = tr('ui.langSearchPlaceholder');
  el.tabMenuBtn.textContent = tr('ui.tabMenu');
  el.tabBevandeBtn.textContent = tr('ui.tabBevande');
  el.noResults.textContent = tr('ui.noResults');
}

function renderCategoryPills() {
  el.categoryPills.innerHTML = '';
  state.categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill' + (cat.id === state.activeCategory ? ' active' : '');
    btn.textContent = tr(`categories.${cat.id}`);
    btn.addEventListener('click', () => {
      state.activeCategory = cat.id;
      state.view = cat.id === 'bevande' ? 'bevande' : 'menu';
      syncBottomTabs();
      renderCategoryPills();
      renderMenuList();
    });
    el.categoryPills.appendChild(btn);
  });
}

function syncBottomTabs() {
  el.tabMenuBtn.classList.toggle('active', state.view === 'menu');
  el.tabBevandeBtn.classList.toggle('active', state.view === 'bevande');
}

function matchesSearch(item) {
  if (!state.searchQuery) return true;
  const q = state.searchQuery.toLowerCase();
  const name = (tr(`items.${item.id}.name`) || '').toLowerCase();
  const desc = (tr(`items.${item.id}.desc`) || '').toLowerCase();
  return name.includes(q) || desc.includes(q);
}

function renderMenuList() {
  el.menuList.innerHTML = '';
  const items = state.items.filter(
    it => it.categoryId === state.activeCategory && matchesSearch(it)
  );

  if (items.length === 0) {
    el.noResults.hidden = false;
    return;
  }
  el.noResults.hidden = true;

  const groups = [];
  const groupIndex = {};
  items.forEach(it => {
    const key = it.group || '__ungrouped__';
    if (!(key in groupIndex)) {
      groupIndex[key] = groups.length;
      groups.push({ key, items: [] });
    }
    groups[groupIndex[key]].items.push(it);
  });

  groups.forEach(group => {
    if (group.key !== '__ungrouped__') {
      const h = document.createElement('h2');
      h.className = 'group-title';
      h.textContent = tr(`groups.${group.key}`);
      el.menuList.appendChild(h);
    }
    group.items.forEach(item => el.menuList.appendChild(renderItem(item)));
  });
}

function renderItem(item) {
  const wrap = document.createElement('article');
  wrap.className = 'menu-item';

  const name = document.createElement('h3');
  name.className = 'item-name';
  name.textContent = tr(`items.${item.id}.name`);
  wrap.appendChild(name);

  if (item.price) {
    const price = document.createElement('span');
    price.className = 'item-price';
    price.textContent = `€ ${item.price}`;
    wrap.appendChild(price);
  }

  const desc = document.createElement('p');
  desc.className = 'item-desc';
  desc.textContent = tr(`items.${item.id}.desc`);
  wrap.appendChild(desc);

  if (item.allergens && item.allergens.length) {
    const allergens = document.createElement('div');
    allergens.className = 'item-allergens';
    item.allergens.forEach(code => {
      const span = document.createElement('span');
      span.title = tr(`allergens.${code}`);
      span.textContent = ALLERGEN_ICONS[code] || '';
      allergens.appendChild(span);
    });
    wrap.appendChild(allergens);
  }

  return wrap;
}

function renderLangList(filter) {
  el.langList.innerHTML = '';
  const q = filter.trim().toLowerCase();
  const filtered = state.languages.filter(l =>
    !q ||
    l.nativeName.toLowerCase().includes(q) ||
    l.englishName.toLowerCase().includes(q) ||
    l.code.toLowerCase().includes(q)
  );

  filtered.forEach(l => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-item' + (l.code === state.currentLang ? ' active' : '');
    btn.innerHTML = `<span class="flag">${l.flag}</span><span class="native">${l.nativeName}</span><span class="english">${l.englishName}</span>`;
    btn.addEventListener('click', () => {
      setLanguage(l.code);
      closeLangPanel();
    });
    li.appendChild(btn);
    el.langList.appendChild(li);
  });
}

function openLangPanel() {
  el.langPanel.hidden = false;
  el.langBackdrop.hidden = false;
  el.langSwitchBtn.setAttribute('aria-expanded', 'true');
  el.langSearchInput.value = '';
  renderLangList('');
  el.langSearchInput.focus();
}

function closeLangPanel() {
  el.langPanel.hidden = true;
  el.langBackdrop.hidden = true;
  el.langSwitchBtn.setAttribute('aria-expanded', 'false');
}

function bindEvents() {
  el.langSwitchBtn.addEventListener('click', () => {
    el.langPanel.hidden ? openLangPanel() : closeLangPanel();
  });
  el.langBackdrop.addEventListener('click', closeLangPanel);
  el.langSearchInput.addEventListener('input', e => renderLangList(e.target.value));

  el.searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderMenuList();
  });

  el.tabMenuBtn.addEventListener('click', () => {
    state.view = 'menu';
    if (state.activeCategory === 'bevande') state.activeCategory = 'pizze';
    syncBottomTabs();
    renderCategoryPills();
    renderMenuList();
  });

  el.tabBevandeBtn.addEventListener('click', () => {
    state.view = 'bevande';
    state.activeCategory = 'bevande';
    syncBottomTabs();
    renderCategoryPills();
    renderMenuList();
  });
}

init();
