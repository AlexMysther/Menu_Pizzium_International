/**
 * Gate Firebase loading behind explicit consent.
 *
 * The public menu (index.html) only needs Firebase for the real-time
 * "sold out / recommended" feature (see js/live-menu.js). Loading the
 * Firebase SDK unconditionally would mean every visitor's browser
 * contacts Google's servers (gstatic.com + the Firebase Realtime
 * Database) on every page view, sending their IP address, whether or
 * not the feature is ever used — the same category of issue German/EU
 * courts have fined sites for over unconsented Google Fonts loading.
 *
 * So the two Firebase <script> tags are NOT in index.html. This module
 * injects them itself, and only after the visitor accepts the banner.
 * Declining (or not deciding yet) means Firebase never loads at all;
 * the menu works fully either way (LiveMenu treats "not configured" as
 * "nothing sold out, nothing recommended").
 *
 * admin.html (the staff panel) is not public-facing and keeps loading
 * Firebase unconditionally — no visitor consent question applies there.
 */
const ConsentManager = (() => {
  const STORAGE_KEY = 'pizzium_consent';
  const FIREBASE_SCRIPTS = [
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js'
  ];

  let pendingOnChange = null;
  let scriptsState = 'idle'; // 'idle' | 'loading' | 'loaded'
  let onScriptsLoaded = [];

  function getChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setChoice(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
  }

  function loadFirebaseScripts(callback) {
    if (scriptsState === 'loaded') { callback(); return; }
    onScriptsLoaded.push(callback);
    if (scriptsState === 'loading') return;
    scriptsState = 'loading';

    let remaining = FIREBASE_SCRIPTS.length;
    const done = () => {
      remaining--;
      if (remaining > 0) return;
      scriptsState = 'loaded';
      onScriptsLoaded.forEach(cb => cb());
      onScriptsLoaded = [];
    };
    FIREBASE_SCRIPTS.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = done;
      s.onerror = done;
      document.head.appendChild(s);
    });
  }

  function activate() {
    if (!pendingOnChange) return;
    loadFirebaseScripts(() => {
      if (typeof LiveMenu !== 'undefined') LiveMenu.init(pendingOnChange);
    });
  }

  function grant() {
    setChoice('accepted');
    hideBanner();
    activate();
    refreshStatusUI();
  }

  function decline() {
    setChoice('declined');
    hideBanner();
    refreshStatusUI();
  }

  function showBanner() {
    const el = document.getElementById('consentBanner');
    if (el) el.hidden = false;
  }

  function hideBanner() {
    const el = document.getElementById('consentBanner');
    if (el) el.hidden = true;
  }

  // Called once at page init with the callback LiveMenu should run on
  // every sold-out/recommended change. Loads Firebase immediately if
  // consent was already given in a previous visit; otherwise shows the
  // banner (declined or undecided = Firebase stays unloaded).
  function initLiveMenu(onChange) {
    pendingOnChange = onChange;
    const choice = getChoice();
    if (choice === 'accepted') {
      activate();
    } else if (choice === null) {
      showBanner();
    }
  }

  // Lets a visitor reopen the banner later (e.g. from a "privacy and
  // consent" link) to accept after having declined, or just to see
  // their current choice.
  function reopen() {
    showBanner();
  }

  function refreshStatusUI() {
    const statusEl = document.getElementById('consentStatusText');
    if (!statusEl || typeof tr !== 'function') return;
    const choice = getChoice();
    const key = choice === 'accepted' ? 'ui.consentStatusAccepted'
      : choice === 'declined' ? 'ui.consentStatusDeclined'
      : 'ui.consentStatusUnset';
    statusEl.textContent = tr(key);
  }

  function bindUI() {
    const acceptBtn = document.getElementById('consentAccept');
    const declineBtn = document.getElementById('consentDecline');
    if (acceptBtn) acceptBtn.addEventListener('click', grant);
    if (declineBtn) declineBtn.addEventListener('click', decline);
  }

  bindUI();

  return { initLiveMenu, reopen, getChoice, refreshStatusUI };
})();
