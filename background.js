const TOTAL_VERSES = 1089;
const BATCH_SIZE = 1000;
const BASE_URL = "https://cdn.jsdelivr.net/gh/ankilshah4193/bible-verses@main/";

/**
 * Returns YYYY-MM-DD
 */
const getTodayString = () => new Date().toISOString().split("T")[0];

/**
 * Maps a verse index (0..1088) to its CDN path.
 *  0..999  -> batch1/<idx>.json
 *  1000..1088 -> batch2/<idx>.json
 */
function pathForIndex(idx) {
  const batch = idx < BATCH_SIZE ? "batch1" : "batch2";
  return `${batch}/${idx}.json`;
}

/**
 * Configures the side panel to open on toolbar click.
 */
function enablePanelOnClick() {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e) => console.warn("[Bible] setPanelBehavior:", e.message));
}

// --- Lifecycle Listeners ---

chrome.runtime.onInstalled.addListener(enablePanelOnClick);

chrome.runtime.onStartup.addListener(() => {
  enablePanelOnClick();

  const today = getTodayString();

  chrome.storage.local.get(["lastShownDate"], (state) => {
    // Exit if we already showed a notification today
    if (state.lastShownDate === today) return;

    chrome.notifications.create("bible-instant", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: "✝ Holy Bible — Instant Wisdom",
      message: "Begin your day with a fresh verse of wisdom. Click the icon to read.",
      priority: 2,
    });

    chrome.storage.local.set({ lastShownDate: today });
  });
});

// --- Fetch Relay (CORS Bypass) ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "FETCH_VERSE") return false;

  fetch(msg.url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({ ok: false, error: err.message }));

  return true; // Keep channel open for async response
});