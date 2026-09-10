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

  function t(dict, path) {
    const parts = path.split('.');
    let cur = dict;
    for (const p of parts) {
      if (cur == null) return path;
      cur = cur[p];
    }
    return cur == null ? path : cur;
  }

  return { FALLBACK_LANG, loadLanguages, getTranslations, t };
})();
