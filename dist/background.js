// src/shared.ts
var DEFAULT_SETTINGS = {
  left: null,
  top: null,
  width: 600,
  height: 700
};
var SETTINGS_KEY = "settings";
async function loadSettings() {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  const stored = result[SETTINGS_KEY] ?? {};
  return { ...DEFAULT_SETTINGS, ...stored };
}
async function saveSettings(settings) {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}
function isLookupMessage(value) {
  return typeof value === "object" && value !== null && value.type === "lookup" && typeof value.word === "string";
}
var BASE_URL = "https://www.collinsdictionary.com/dictionary/english/";
function buildUrl(raw) {
  const slug = raw.toLowerCase().trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").replace(/\s+/g, "-");
  if (!slug)
    return null;
  return BASE_URL + encodeURIComponent(slug);
}
function isDismissMessage(value) {
  return typeof value === "object" && value !== null && value.type === "dismiss";
}

// src/background.ts
var STATE_KEY = "dictWindow";
var GRACE_MS = 600;
var RECHECK_MS = 150;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function getState() {
  const result = await chrome.storage.session.get(STATE_KEY);
  return result[STATE_KEY] ?? null;
}
async function setState(state) {
  if (state)
    await chrome.storage.session.set({ [STATE_KEY]: state });
  else
    await chrome.storage.session.remove(STATE_KEY);
}
async function resolveBounds(s) {
  let left = s.left;
  let top = s.top;
  if (left === null || top === null) {
    const base = await chrome.windows.getLastFocused();
    const baseLeft = base.left ?? 0;
    const baseTop = base.top ?? 0;
    const baseWidth = base.width ?? s.width + 40;
    left ??= Math.max(0, baseLeft + baseWidth - s.width - 20);
    top ??= baseTop + 40;
  }
  return { left, top, width: s.width, height: s.height };
}
async function closeIfUnfocused(target) {
  const wait = Math.max(RECHECK_MS, target.openedAt + GRACE_MS - Date.now());
  await sleep(wait);
  const current = await getState();
  if (!current || current.id !== target.id || current.openedAt !== target.openedAt)
    return;
  try {
    const win = await chrome.windows.get(target.id);
    if (!win.focused) {
      await chrome.windows.remove(target.id);
    }
  } catch {}
}
async function openDictionary(word) {
  const url = buildUrl(word);
  if (!url)
    return;
  const previous = await getState();
  if (previous) {
    try {
      const existing = await chrome.windows.get(previous.id, { populate: true });
      const tabId = existing.tabs?.[0]?.id;
      if (tabId !== undefined) {
        await chrome.tabs.update(tabId, { url });
        await chrome.windows.update(previous.id, {
          focused: true,
          ...existing.state === "minimized" ? { state: "normal" } : {}
        });
        const next2 = { id: previous.id, openedAt: Date.now() };
        await setState(next2);
        closeIfUnfocused(next2);
        return;
      }
    } catch {}
    await setState(null);
  }
  const settings = await loadSettings();
  const bounds = await resolveBounds(settings);
  const created = await chrome.windows.create({
    url,
    focused: true,
    ...bounds
  });
  if (created.id === undefined)
    return;
  const next = { id: created.id, openedAt: Date.now() };
  await setState(next);
  closeIfUnfocused(next);
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (isLookupMessage(message)) {
    openDictionary(message.word).then(() => sendResponse({ ok: true }), (error) => {
      console.error(error);
      sendResponse({ ok: false });
    });
    return true;
  }
  if (isDismissMessage(message)) {
    getState().then((state) => {
      if (state)
        closeIfUnfocused(state);
    });
  }
  return false;
});
chrome.windows.onFocusChanged.addListener(async (focusedId) => {
  const state = await getState();
  if (!state || focusedId === state.id)
    return;
  await closeIfUnfocused(state);
});
chrome.windows.onRemoved.addListener(async (windowId) => {
  const state = await getState();
  if (state?.id === windowId)
    await setState(null);
});
