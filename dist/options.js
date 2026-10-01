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

// src/options.ts
var MIN_SIZE = 300;
var $ = (id) => document.getElementById(id);
var form = $("form");
var leftInput = $("left");
var topInput = $("top");
var widthInput = $("width");
var heightInput = $("height");
var statusEl = $("status");
var shortcutEl = $("shortcut");
var statusTimer;
function showStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
  window.clearTimeout(statusTimer);
  if (!isError) {
    statusTimer = window.setTimeout(() => statusEl.textContent = "", 2500);
  }
}
function fill(s) {
  leftInput.value = s.left === null ? "" : String(s.left);
  topInput.value = s.top === null ? "" : String(s.top);
  widthInput.value = String(s.width);
  heightInput.value = String(s.height);
}
function parseOptional(value) {
  if (value.trim() === "")
    return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const width = Number(widthInput.value);
  const height = Number(heightInput.value);
  if (!(width >= MIN_SIZE && height >= MIN_SIZE)) {
    showStatus(`幅と高さは ${MIN_SIZE} 以上の数値で指定してください。`, true);
    return;
  }
  await saveSettings({
    left: parseOptional(leftInput.value),
    top: parseOptional(topInput.value),
    width: Math.round(width),
    height: Math.round(height)
  });
  showStatus("保存しました。");
});
$("reset").addEventListener("click", async () => {
  fill(DEFAULT_SETTINGS);
  await saveSettings(DEFAULT_SETTINGS);
  showStatus("初期値に戻しました。");
});
$("open-shortcuts").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});
async function renderShortcut() {
  const commands = await chrome.commands.getAll();
  const command = commands.find((c) => c.name === "_execute_action");
  shortcutEl.textContent = command?.shortcut || "未設定";
}
loadSettings().then(fill);
renderShortcut();
