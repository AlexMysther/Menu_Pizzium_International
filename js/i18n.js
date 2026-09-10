/**
 * i18n loader.
 * Adding a new language = add its code+metadata to data/i18n/languages.json
 * and create data/i18n/<code>.json. No JS changes required.
 */
const I18N = (() => {
  const FALLBACK_LANG = 'it';

  async function fetchJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.json();
  }

  function loadLanguages() {
    return fetchJSON('data/i18n/languages.json');
  }

  function loadLangFile(code) {
    return fetchJSON(`data/i18n/${code}.json`);
  }

  function isPlainObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v);
  }

  function deepMerge(base, override) {
    const out = { ...base };
    for (const key in override) {
      if (isPlainObject(override[key]) && isPlainObject(base[key])) {
        out[key] = deepMerge(base[key], override[key]);
      } else {
        out[key] = override[key];
      }
    }
    return out;
  }

  async function getTranslations(code) {
    const fallback = await loadLangFile(FALLBACK_LANG);
    if (code === FALLBACK_LANG) return fallback;
    try {
      const override = await loadLangFile(code);
      return deepMerge(fallback, override);
    } catch (e) {
      console.warn(`Missing translation file for "${code}", using fallback.`, e);
      return fallback;
    }
  }

  // Combines an already-fetched fallback dict with an already-fetched (or
  // failed/null) override dict, without triggering any network request.
  // Lets callers fire the fallback + override fetches in parallel with
  // everything else on first load, instead of waiting on a round trip
  // to resolve which language to fetch before fetching it.
  function combine(fallbackDict, overrideDict) {
    if (!overrideDict) return fallbackDict;
    return deepMerge(fallbackDict, overrideDict);
  }

  function guessInitialLangCode() {
    const saved = localStorage.getItem('pizzium_lang');
    if (saved) return saved;
    return (navigator.language || FALLBACK_LANG).slice(0, 2).toLowerCase();
  }

  function t(dict, path) {
    const parts = path.split('.');
    let cur = dict;
    for (const p of parts) {
      if (cur == null) return path;
      cur = cur[p];
    }
    return cur == null ? path : cur;
  }

  return { FALLBACK_LANG, loadLanguages, loadLangFile, getTranslations, combine, guessInitialLangCode, t };
})();
