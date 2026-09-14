const LEGEND_ORDER = ['vegetarian', 'vegan', 'lactose-free'];

// Given e.g. "img/flags/it.png", returns the @2x retina variant path.
function retinaFlag(path) {
  return path.replace(/\.png$/, '@2x.png');
}

const state = {
  languages: [],
  currentLang: null,
  dict: null,
  itDict: null,
  glossary: [],
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
  langList: document.getElementById('langList'),
  infoBtn: document.getElementById('infoBtn'),
  infoPanel: document.getElementById('infoPanel'),
  infoBackdrop: document.getElementById('infoBackdrop'),
  infoPanelTitle: document.getElementById('infoPanelTitle'),
  infoPanelIntro: document.getElementById('infoPanelIntro'),
  legendList: document.getElementById('legendList'),
  infoCoverCharge: document.getElementById('infoCoverCharge'),
  menuTitle: document.getElementById('menuTitle'),
  searchInput: document.getElementById('searchInput'),
  categoryPills: document.getElementById('categoryPills'),
  categoryNote: document.getElementById('categoryNote'),
  menuList: document.getElementById('menuList'),
  noResults: document.getElementById('noResults'),
  bottomFixed: document.getElementById('bottomFixed'),
  pizzaPromoBar: document.getElementById('pizzaPromoBar'),
  tabMenuBtn: document.getElementById('tabMenuBtn'),
  tabBevandeBtn: document.getElementById('tabBevandeBtn'),
  infoGlossaryNote: document.getElementById('infoGlossaryNote'),
  glossPopover: document.getElementById('glossPopover'),
  glossTerm: document.getElementById('glossTerm'),
  glossDesc: document.getElementById('glossDesc')
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
  // Kept around (not just used for the fallback merge) so pizza names can
  // always show the Italian original alongside the active language.
  state.itDict = fallbackDict;

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

  el.langFlag.src = lang ? lang.flag : '';
  el.langFlag.srcset = lang ? `${retinaFlag(lang.flag)} 2x` : '';
  el.langFlag.alt = lang ? lang.englishName : '';
  el.langCode.textContent = code.toUpperCase();

  state.glossary = buildGlossaryIndex(dict);
  closeGloss();

  renderStaticText();
  renderCategoryPills();
  renderLangList();
  renderLegend();
  renderMenuList();
}

function tr(path) {
  return I18N.t(state.dict, path);
}

function renderStaticText() {
  el.menuTitle.textContent = tr('ui.menuTitle');
  el.searchInput.placeholder = tr('ui.searchPlaceholder');
  el.tabMenuBtn.textContent = tr('ui.tabMenu');
  el.tabBevandeBtn.textContent = tr('ui.tabBevande');
  el.noResults.textContent = tr('ui.noResults');
  el.infoBtn.setAttribute('aria-label', tr('ui.infoLabel'));
  el.infoPanelTitle.textContent = tr('ui.infoTitle');
  el.infoPanelIntro.textContent = tr('legend.intro');
  el.infoCoverCharge.textContent = tr('ui.coverCharge');
  el.infoGlossaryNote.textContent = tr('ui.glossaryNote');
  el.infoGlossaryNote.hidden = state.glossary.length === 0;
}

// Keeps the page's bottom padding in sync with the fixed footer's actual
// height, since the pizza promo bar appears/disappears and its text wraps
// to a different number of lines per language.
function syncBottomFixedHeight() {
  document.body.style.paddingBottom = el.bottomFixed.offsetHeight + 'px';
}

function updatePizzaPromoBar() {
  const show = state.activeCategory === 'pizze';
  el.pizzaPromoBar.hidden = !show;
  el.pizzaPromoBar.textContent = show ? tr('ui.pizzaPromo') : '';
  syncBottomFixedHeight();
}

function renderLegend() {
  el.legendList.innerHTML = '';
  LEGEND_ORDER.forEach(code => {
    const li = document.createElement('li');
    li.className = 'legend-item';

    const dot = document.createElement('span');
    dot.className = `tag-dot tag-dot--${code}`;
    li.appendChild(dot);

    const text = document.createElement('div');
    text.className = 'legend-text';
    const label = document.createElement('strong');
    label.textContent = tr(`tags.${code}`);
    const desc = document.createElement('span');
    desc.className = 'legend-desc';
    desc.textContent = tr(`legend.${code}`);
    text.appendChild(label);
    text.appendChild(desc);
    li.appendChild(text);

    el.legendList.appendChild(li);
  });
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
  const desc = (I18N.get(state.dict, `items.${item.id}.desc`) || '').toLowerCase();
  return name.includes(q) || desc.includes(q);
}

function renderMenuList() {
  updatePizzaPromoBar();
  closeGloss();

  const note = I18N.get(state.dict, `categoryNotes.${state.activeCategory}`);
  el.categoryNote.textContent = note || '';
  el.categoryNote.hidden = !note;

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

function formatPrice(item) {
  if (item.variants && item.variants.length) {
    return item.variants.map(v => `${v.label} € ${v.price}`).join(' / ');
  }
  if (item.price) return `€ ${item.price}`;
  return '';
}

function renderItem(item) {
  const wrap = document.createElement('article');
  wrap.className = 'menu-item';

  const name = document.createElement('h3');
  name.className = 'item-name';
  const nameText = tr(`items.${item.id}.name`);
  name.textContent = nameText;

  // Shown for every category (not just pizze): the Italian-majority staff
  // relies on the Italian name to identify orders regardless of dish type.
  const itName = I18N.get(state.itDict, `items.${item.id}.name`);
  if (itName && itName !== nameText) {
    const itSpan = document.createElement('span');
    itSpan.className = 'item-name-it';
    itSpan.textContent = ` (${itName})`;
    name.appendChild(itSpan);
  }
  wrap.appendChild(name);

  const priceText = formatPrice(item);
  if (priceText) {
    const price = document.createElement('span');
    price.className = 'item-price';
    if (item.variants && item.variants.length > 1) price.classList.add('item-price--variants');
    price.textContent = priceText;
    wrap.appendChild(price);
  }

  const descText = I18N.get(state.dict, `items.${item.id}.desc`);
  if (descText) {
    const desc = document.createElement('p');
    desc.className = 'item-desc';
    desc.appendChild(glossedText(descText));
    wrap.appendChild(desc);
  }

  if (item.tags && item.tags.length) {
    const tags = document.createElement('div');
    tags.className = 'item-tags';
    item.tags.forEach(code => {
      const span = document.createElement('span');
      span.className = `tag-dot tag-dot--${code}`;
      span.title = tr(`tags.${code}`);
      span.setAttribute('role', 'img');
      span.setAttribute('aria-label', tr(`tags.${code}`));
      tags.appendChild(span);
    });
    wrap.appendChild(tags);
  }

  return wrap;
}

/* ---------- Glossario degli ingredienti ----------
   Ogni lingua elenca in `glossary` i termini opachi per chi non parla
   italiano (gorgonzola, capocollo, DOP...) con le forme che compaiono
   davvero nelle sue descrizioni. Il termine viene tradotto una volta
   sola per lingua, non a ogni piatto in cui ricorre. */

// Lettera o cifra in qualsiasi alfabeto: serve a non evidenziare un
// termine che sia in realtà un pezzo di una parola più lunga.
const GLOSS_WORD_CHAR = /[\p{L}\p{N}]/u;
// Scritture senza spazi fra le parole (cinese, giapponese, coreano):
// lì il controllo sui confini di parola bloccherebbe ogni occorrenza.
const GLOSS_UNSPACED = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;

function buildGlossaryIndex(dict) {
  const glossary = I18N.get(dict, 'glossary') || {};
  const forms = [];
  Object.keys(glossary).forEach(id => {
    (glossary[id].match || []).forEach(form => {
      if (form) forms.push({ id, form: form.toLowerCase(), boundary: !GLOSS_UNSPACED.test(form) });
    });
  });
  // Le forme più lunghe per prime, così "grana padano" vince su "grana"
  // e "riso venere" su "venere": la prima che occupa il testo lo blocca.
  return forms.sort((a, b) => b.form.length - a.form.length);
}

// Un vicino ideografico non fa parola con il termine: "DOP" in
// "帕达诺干酪DOP" è una sigla a sé, non il pezzo di una parola più lunga.
function isWordNeighbour(ch) {
  return !!ch && GLOSS_WORD_CHAR.test(ch) && !GLOSS_UNSPACED.test(ch);
}

function isStandaloneWord(text, start, end) {
  return !isWordNeighbour(start > 0 ? text[start - 1] : '')
    && !isWordNeighbour(end < text.length ? text[end] : '');
}

function findGlossMatches(text) {
  const lower = text.toLowerCase();
  const found = [];
  state.glossary.forEach(entry => {
    let from = 0;
    let at;
    while ((at = lower.indexOf(entry.form, from)) !== -1) {
      const end = at + entry.form.length;
      from = end;
      if (entry.boundary && !isStandaloneWord(text, at, end)) continue;
      if (found.some(m => at < m.end && end > m.start)) continue;
      found.push({ start: at, end, id: entry.id });
    }
  });
  return found.sort((a, b) => a.start - b.start);
}

// Restituisce la descrizione come frammento in cui i termini del
// glossario sono bottoni; il testo non riconosciuto resta testo.
function glossedText(text) {
  const frag = document.createDocumentFragment();
  const matches = state.glossary.length ? findGlossMatches(text) : [];
  let cursor = 0;
  matches.forEach(m => {
    if (m.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gloss-term';
    btn.textContent = text.slice(m.start, m.end);
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleGloss(btn, m.id);
    });
    frag.appendChild(btn);
    cursor = m.end;
  });
  if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
  return frag;
}

let openGlossBtn = null;

function toggleGloss(btn, id) {
  if (openGlossBtn === btn) {
    closeGloss();
    return;
  }
  const entry = I18N.get(state.dict, `glossary.${id}`);
  if (!entry) return;

  closeGloss();
  el.glossTerm.textContent = entry.term;
  el.glossDesc.textContent = entry.desc;
  el.glossPopover.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  btn.setAttribute('aria-describedby', 'glossPopover');
  btn.classList.add('gloss-term--open');
  openGlossBtn = btn;
  positionGloss(btn);
}

// Il popover vive in fondo al body con coordinate assolute di documento:
// così scorre insieme alla pagina senza bisogno di riposizionarlo, e non
// viene tagliato dal riquadro del piatto.
function positionGloss(btn) {
  const pop = el.glossPopover;
  pop.style.left = '0px';
  const rect = btn.getBoundingClientRect();
  const margin = 10;
  const maxLeft = document.documentElement.clientWidth - pop.offsetWidth - margin;
  // In RTL il riquadro parte dal bordo destro del termine, come il resto
  // della pagina; poi in entrambi i versi lo si riporta dentro lo schermo.
  const anchor = document.documentElement.dir === 'rtl' ? rect.right - pop.offsetWidth : rect.left;
  const left = Math.max(margin, Math.min(anchor, maxLeft));
  pop.style.left = (left + window.scrollX) + 'px';
  pop.style.top = (rect.bottom + window.scrollY + 6) + 'px';
}

function closeGloss() {
  if (openGlossBtn) {
    openGlossBtn.setAttribute('aria-expanded', 'false');
    openGlossBtn.removeAttribute('aria-describedby');
    openGlossBtn.classList.remove('gloss-term--open');
    openGlossBtn = null;
  }
  el.glossPopover.hidden = true;
}

function renderLangList() {
  el.langList.innerHTML = '';
  state.languages.forEach(l => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-item' + (l.code === state.currentLang ? ' active' : '');
    btn.innerHTML = `<img class="flag" src="${l.flag}" srcset="${retinaFlag(l.flag)} 2x" alt="${l.englishName}"><span class="native">${l.nativeName}</span><span class="english">${l.englishName}</span>`;
    btn.addEventListener('click', () => {
      setLanguage(l.code);
      closeLangPanel();
    });
    li.appendChild(btn);
    el.langList.appendChild(li);
  });
}

function openLangPanel() {
  closeGloss();
  el.langPanel.hidden = false;
  el.langBackdrop.hidden = false;
  el.langSwitchBtn.setAttribute('aria-expanded', 'true');
  renderLangList();
}

function closeLangPanel() {
  el.langPanel.hidden = true;
  el.langBackdrop.hidden = true;
  el.langSwitchBtn.setAttribute('aria-expanded', 'false');
}

function openInfoPanel() {
  closeGloss();
  closeLangPanel();
  el.infoPanel.hidden = false;
  el.infoBackdrop.hidden = false;
  el.infoBtn.setAttribute('aria-expanded', 'true');
}

function closeInfoPanel() {
  el.infoPanel.hidden = true;
  el.infoBackdrop.hidden = true;
  el.infoBtn.setAttribute('aria-expanded', 'false');
}

function bindEvents() {
  el.langSwitchBtn.addEventListener('click', () => {
    closeInfoPanel();
    el.langPanel.hidden ? openLangPanel() : closeLangPanel();
  });
  el.langBackdrop.addEventListener('click', closeLangPanel);

  el.infoBtn.addEventListener('click', () => {
    el.infoPanel.hidden ? openInfoPanel() : closeInfoPanel();
  });
  el.infoBackdrop.addEventListener('click', closeInfoPanel);

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

  window.addEventListener('resize', () => {
    syncBottomFixedHeight();
    closeGloss();
  });

  // Un tocco fuori dal popover lo chiude; il click sul termine si ferma
  // prima (stopPropagation) e continua a funzionare come interruttore.
  document.addEventListener('click', e => {
    if (!el.glossPopover.hidden && !el.glossPopover.contains(e.target)) closeGloss();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeGloss();
  });
}

init();
