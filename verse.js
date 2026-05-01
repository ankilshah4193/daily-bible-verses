const CONFIG = {
  BASE_URL: "https://cdn.jsdelivr.net/gh/ankilshah4193/bible-verses@main/",
  TOTAL_VERSES: 1089,
  BATCH_SIZE: 1000,
  DATA_VERSION: "1.0",

  SCRIPTURE_LABELS: {
    english:           "Sacred Scripture",
    spanish:           "Sagrada Escritura",
    portuguese:        "Sagrada Escritura",
    french:            "Sainte Écriture",
    tagalog:           "Banal na Kasulatan",
    swahili:           "Maandiko Matakatifu",
    mandarin_chinese:  "圣 经",
    russian:           "Священное Писание",
    malayalam:         "വിശുദ്ധ ഗ്രന്ഥം"
  },

  REFLECTION_LABELS: {
    english:           "Divine Wisdom",
    spanish:           "Sabiduría Divina",
    portuguese:        "Sabedoria Divina",
    french:            "Sagesse Divine",
    tagalog:           "Banal na Karunungan",
    swahili:           "Hekima ya Kimungu",
    mandarin_chinese:  "神圣智慧",
    russian:           "Божественная Мудрость",
    malayalam:         "ദൈവിക ജ്ഞാനം"
  },

  TRANSLATIONS: {
    english:           { chapter: "Chapter",   verse: "Verse",     brand: "Holy Bible",        langLabel: "Language", langHint: "Saved for future verses" },
    spanish:           { chapter: "Capítulo",  verse: "Versículo", brand: "Santa Biblia",      langLabel: "Idioma",   langHint: "Guardado para futuros versículos" },
    portuguese:        { chapter: "Capítulo",  verse: "Versículo", brand: "Bíblia Sagrada",    langLabel: "Idioma",   langHint: "Salvo para futuros versículos" },
    french:            { chapter: "Chapitre",  verse: "Verset",    brand: "Sainte Bible",      langLabel: "Langue",   langHint: "Enregistré pour les versets futurs" },
    tagalog:           { chapter: "Kabanata",  verse: "Talata",    brand: "Banal na Bibliya",  langLabel: "Wika",     langHint: "Naka-save para sa mga susunod na talata" },
    swahili:           { chapter: "Sura",      verse: "Mstari",    brand: "Biblia Takatifu",   langLabel: "Lugha",    langHint: "Imehifadhiwa kwa mistari ijayo" },
    mandarin_chinese:  { chapter: "章",        verse: "节",        brand: "圣 经",              langLabel: "语言",     langHint: "已保存,适用于以后的经文" },
    russian:           { chapter: "Глава",     verse: "Стих",      brand: "Святая Библия",     langLabel: "Язык",     langHint: "Сохранено для будущих стихов" },
    malayalam:         { chapter: "അദ്ധ്യായം", verse: "വാക്യം",   brand: "വിശുദ്ധ ബൈബിൾ",    langLabel: "ഭാഷ",     langHint: "ഭാവി വാക്യങ്ങൾക്കായി സംരക്ഷിച്ചു" }
  },

  GREETINGS: {
    english:           "Peace be with you",
    spanish:           "La paz sea contigo",
    portuguese:        "A paz esteja contigo",
    french:            "Que la paix soit avec toi",
    tagalog:           "Sumainyo ang kapayapaan",
    swahili:           "Amani iwe nawe",
    mandarin_chinese:  "愿平安与你同在",
    russian:           "Мир тебе",
    malayalam:         "സമാധാനം നിന്നോടൊപ്പം"
  }
};

const elements = {
  bibleTitle:          document.getElementById("bibleTitle"),
  reference:           document.getElementById("reference"),
  verseContainer:      document.getElementById("verseContainer"),
  reflectionContainer: document.getElementById("reflectionContainer"),
  langSelect:          document.getElementById("langSelect"),
  langLabel:           document.getElementById("langLabel"),
  langHint:            document.getElementById("langHint"),
  progressFill:        document.getElementById("progressFill"),
  greetingLabel:       document.getElementById("greetingLabel")
};

let currentVerseData = null;
let currentIdx = 0;

const storageGet = (keys) => new Promise((r) => chrome.storage.local.get(keys, r));
const storageSet = (obj)  => new Promise((r) => chrome.storage.local.set(obj, r));

/**
 * Map a verse index (0..TOTAL_VERSES-1) to its CDN path.
 */
function pathForIndex(idx) {
  const batch = idx < CONFIG.BATCH_SIZE ? "batch1" : "batch2";
  return `${batch}/${idx}.json`;
}

async function fetchVerseData(index) {
  const url = `${CONFIG.BASE_URL}${pathForIndex(index)}?v=${CONFIG.DATA_VERSION}`;
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "FETCH_VERSE", url: url }, (response) => {
      if (chrome.runtime.lastError || !response || !response.ok) resolve(null);
      else resolve(response.data);
    });
  });
}

/* ---------- Random-without-repeats (shuffle bag) ---------- */

function fisherYatesShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildFreshBag() {
  const bag = Array.from({ length: CONFIG.TOTAL_VERSES }, (_, i) => i);
  return fisherYatesShuffle(bag);
}

/**
 * Detects a bag that was never shuffled (sequential order).
 * Checks first 5 elements for ascending or descending sequence.
 */
function isSorted(arr) {
  for (let i = 1; i < Math.min(arr.length, 5); i++) {
    if (arr[i] !== arr[i - 1] + 1 && arr[i] !== arr[i - 1] - 1) return false;
  }
  return true;
}

/**
 * Picks the next verse index using the shuffle-bag.
 * Guarantees all 1089 verses are shown before any repeat.
 * Returns { index, seenInCycle, cyclesCompleted }.
 */
async function pickNextVerseState() {
  const state = await storageGet(["unseenBag", "cyclesCompleted", "bagVersion"]);

  let bag = Array.isArray(state.unseenBag) ? state.unseenBag.slice() : null;
  let cyclesCompleted = typeof state.cyclesCompleted === "number" ? state.cyclesCompleted : 0;

  const needsRebuild =
    !bag ||
    bag.length === 0 ||
    bag.some((n) => n >= CONFIG.TOTAL_VERSES || n < 0) ||
    isSorted(bag) ||                           // was never shuffled
    state.bagVersion !== CONFIG.DATA_VERSION;  // data version changed

  if (needsRebuild) {
    if (bag && bag.length === 0) cyclesCompleted += 1; // completed a full cycle
    bag = buildFreshBag();
  }

  const index = bag.pop();
  const seenInCycle = CONFIG.TOTAL_VERSES - bag.length;

  await storageSet({
    unseenBag: bag,
    cyclesCompleted,
    bagVersion: CONFIG.DATA_VERSION,
  });

  return { index, seenInCycle, cyclesCompleted };
}

/* ---------- App init ---------- */

async function initializeApp() {
  try {
    const state    = await pickNextVerseState();
    const langPref = await storageGet(["language"]);

    currentIdx = state.index;
    const language = langPref.language || "english";
    elements.langSelect.value = language;

    currentVerseData = await fetchVerseData(currentIdx);

    if (currentVerseData) {
      renderVerse(currentVerseData, currentIdx, language, state);
      setupEventListeners(state);
    } else {
      showError(currentIdx);
    }
  } catch (error) {
    console.error("Initialization error:", error);
    showError(currentIdx);
  }
}

/**
 * Safely sets text content with line breaks using DOM nodes
 * instead of innerHTML, preventing any XSS risk.
 */
function setTextWithLineBreaks(container, text) {
  container.textContent = "";
  const lines = String(text).split("\n");
  lines.forEach((line, i) => {
    container.appendChild(document.createTextNode(line));
    if (i < lines.length - 1) {
      container.appendChild(document.createElement("br"));
    }
  });
}

function renderVerse(verse, index, language, state) {
  const trans         = CONFIG.TRANSLATIONS[language]      || CONFIG.TRANSLATIONS.english;
  const reflectionLbl = CONFIG.REFLECTION_LABELS[language] || CONFIG.REFLECTION_LABELS.english;
  const scriptureLbl  = CONFIG.SCRIPTURE_LABELS[language]  || CONFIG.SCRIPTURE_LABELS.english;
  const greeting      = CONFIG.GREETINGS[language]         || CONFIG.GREETINGS.english;

  elements.bibleTitle.textContent = trans.brand;

  const bookName = verse.book ?? "";
  const chapNum  = verse.chapter_number ?? verse.chapter ?? "?";
  const verseNum = verse.verse_number   ?? verse.verse   ?? "?";
  elements.reference.textContent = `${bookName} ${chapNum}:${verseNum}`.trim();

  if (elements.langLabel) elements.langLabel.textContent = trans.langLabel;
  if (elements.langHint)  elements.langHint.textContent  = trans.langHint;

  // Scripture text — always English
  const scriptureText = verse.english_text || "Scripture unavailable";
  elements.verseContainer.textContent = "";
  const scLabel = document.createElement("div");
  scLabel.className = "content-label";
  scLabel.textContent = scriptureLbl;
  const scText = document.createElement("div");
  scText.className = "content-text";
  setTextWithLineBreaks(scText, scriptureText);
  elements.verseContainer.append(scLabel, scText);

  // Reflection — in chosen language, falls back to English
  const reflectionText = verse[language] || verse.english || "";
  elements.reflectionContainer.textContent = "";
  if (reflectionText) {
    const refLabel = document.createElement("div");
    refLabel.className = "content-label";
    refLabel.textContent = reflectionLbl;
    const refText = document.createElement("div");
    refText.className = "content-text";
    setTextWithLineBreaks(refText, reflectionText);
    elements.reflectionContainer.append(refLabel, refText);
  }

  // Footer & Progress
  elements.greetingLabel.textContent = greeting;

  const seen = state ? state.seenInCycle : 1;
  const pct  = ((seen / CONFIG.TOTAL_VERSES) * 100).toFixed(2);
  elements.progressFill.style.width = `${pct}%`;
}

function showError(idx) {
  elements.reference.textContent = "Unable to Load";
  elements.verseContainer.textContent = "";
  elements.reflectionContainer.textContent = "";

  const msg = document.createElement("p");
  msg.className = "content-text";
  msg.style.textAlign = "center";
  msg.style.padding = "20px 0";
  msg.style.color = "var(--color-text-muted)";
  msg.textContent = `Could not load verse ${idx}. Please check your internet connection and try again.`;
  elements.reflectionContainer.appendChild(msg);
}

function setupEventListeners(state) {
  elements.langSelect.addEventListener("change", async (e) => {
    const newLang = e.target.value;
    await storageSet({ language: newLang });
    if (currentVerseData) renderVerse(currentVerseData, currentIdx, newLang, state);
  });
}

document.addEventListener("DOMContentLoaded", initializeApp);
