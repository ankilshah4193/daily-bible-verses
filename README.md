# Holy Bible — Instant Wisdom · Chrome Extension

A modern Chrome extension that delivers a fresh verse of wisdom from the Holy Bible every time you open the side panel. Cycles through all 1089 verses in **random order without repeats** — you'll see every verse exactly once before any verse appears again.

---

## Why two folders?

GitHub's web UI paginates directories after 1000 entries, and very large flat folders get slow to browse. To keep the repo tidy, the 1089 verses are split into two batches:

```
bible-verses/
├── batch1/
│   ├── 0.json
│   ├── 1.json
│   ├── ...
│   └── 999.json    (1000 files)
└── batch2/
    ├── 1000.json
    ├── 1001.json
    ├── ...
    └── 1088.json   (89 files)
```

The extension automatically routes each index to the right folder via `pathForIndex()` — `0..999` → `batch1/`, `1000..1088` → `batch2/`. This logic lives in both `verse.js` and `background.js`.

---

## Setup

### 1 · Configure your CDN URL

Edit the `BASE_URL` in **both** `verse.js` and `background.js`:

```js
// verse.js
const CONFIG = {
  BASE_URL: "https://cdn.jsdelivr.net/gh/ankilshah4193/bible-verses@main/",
  TOTAL_VERSES: 1089,
  BATCH_SIZE: 1000,
  DATA_VERSION: "1.1",
  // ...
};
```

```js
// background.js
const BASE_URL = "https://cdn.jsdelivr.net/gh/ankilshah4193/bible-verses@main/";
```

Also update the `host_permissions` URL in `manifest.json`:

```json
"host_permissions": ["https://cdn.jsdelivr.net/gh/ankilshah4193/bible-verses/*"]
```

### 2 · Add icons

Place 4 PNG icons in an `icons/` folder at the root of the extension:
`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`.

### 3 · Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this project folder

The side panel opens when you click the **✝** icon in your toolbar. A new randomly-selected verse appears every time you open it.

---

## Features

| Feature | Details |
|---|---|
| **Random, non-repeating** | Uses a Fisher-Yates shuffle bag — every verse appears exactly once before any verse repeats. After all 1089 are seen, a new shuffled cycle begins automatically. |
| **English scripture + multi-language reflection** | The scripture text is shown in English. The reflection/wisdom text adapts to the user's chosen language. |
| **9 reflection languages** | English, Spanish, Portuguese, French, Tagalog, Swahili, Mandarin Chinese, Russian, Malayalam. Language preference persists across sessions. |
| **Progress tracking** | Footer shows `N / 1089` for the current cycle, plus cycle count once you've completed a full pass. |
| **Privacy first** | No tracking, no analytics. Only your language preference, current shuffle bag state, and cycle count are stored locally. |
| **CDN-powered** | Verses load from jsDelivr's global CDN for fast, cached delivery worldwide. |

---

## JSON file format

Each file (`batch1/0.json` through `batch2/1088.json`) follows this structure:

```json
{
  "book": "Psalms",
  "chapter_number": 23,
  "verse_number": 1,
  "english_text": "Yahweh is my shepherd: I shall lack nothing.",

  "english":          "A caring guide walks beside you, providing direction...",
  "spanish":          "Un guía atento camina a tu lado, ofreciendo dirección...",
  "portuguese":       "Um guia cuidadoso caminha ao seu lado, oferecendo direção...",
  "french":           "Un guide attentionné marche à vos côtés, offrant direction...",
  "tagalog":          "May mapag-alagang gabay na kasama mo, nagbibigay ng direksyon...",
  "swahili":          "Mkiongozi mwenye huruma anakuwepo kando, akitoa miongozo...",
  "mandarin_chinese": "一位关怀的指引者陪伴在你身旁,提供方向和支持。...",
  "russian":          "Внимательный наставник идёт рядом с вами, предлагая направление...",
  "malayalam":        "ഒരു കരുണാമയ മാർഗദർശകൻ നിങ്ങളുടെ കൂടെ നടക്കുന്നു..."
}
```

### Field reference

| Field | Required | What it is |
|---|---|---|
| `book` | yes | Bible book name (e.g., `"Psalms"`, `"John"`) |
| `chapter_number` | yes | Numeric chapter (e.g., `23`) |
| `verse_number` | yes | Numeric verse within chapter (e.g., `1`) |
| `english_text` | yes | The actual scripture text (English only) |
| `english` | yes | The reflection/wisdom in English (also acts as fallback for missing translations) |
| `spanish`, `portuguese`, `french`, `tagalog`, `swahili`, `mandarin_chinese`, `russian`, `malayalam` | optional | Reflection in that language; missing keys fall back to `english` |

Multi-line text uses `\n` for line breaks — the extension renders these as `<br>` safely.

---

## Customisation

| Want to change… | Edit… |
|---|---|
| Total number of verses | `TOTAL_VERSES` in `verse.js` and `background.js` |
| Batch split point | `BATCH_SIZE` in `verse.js` and `background.js` (default: 1000) |
| CDN cache version | `DATA_VERSION` in `verse.js` (bump when verse data changes) |
| Colors / fonts | CSS variables inside `:root` at the top of `verse.css` |
| Extension name | `name` and `short_name` in `manifest.json` |
| Selection logic | `pickNextVerseState()` in `verse.js` (e.g., switch to sequential or daily) |
| Languages | `SCRIPTURE_LABELS`, `REFLECTION_LABELS`, `TRANSLATIONS`, `GREETINGS` in `verse.js`, plus `<option>` tags in `verse.html` (option `value` must match the JSON key) |

---

## How the random-without-repeats logic works

The extension stores an `unseenBag` array in `chrome.storage.local` — a Fisher-Yates shuffled list of indices not yet shown in the current cycle.

Each time the panel opens:
1. If the bag is empty (or missing/corrupted), build a fresh shuffled bag of all 1089 indices and increment `cyclesCompleted`.
2. Pop the last index off the bag — this is the verse to show.
3. Save the smaller bag back to storage.

This guarantees every verse is shown exactly once per cycle, and the order is different on each cycle. The state survives browser restarts because it lives in `chrome.storage.local`.

---

## Privacy

This extension makes read-only requests to `cdn.jsdelivr.net`. It does not collect or transmit personal data. Only your language preference, current shuffle bag state, and cycle counter are stored locally in your browser.
