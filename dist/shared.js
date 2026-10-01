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
export {
  saveSettings,
  loadSettings,
  isLookupMessage,
  isDismissMessage,
  buildUrl,
  DEFAULT_SETTINGS
};
