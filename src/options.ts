import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "./shared";

const MIN_SIZE = 300;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>("form");
const leftInput = $<HTMLInputElement>("left");
const topInput = $<HTMLInputElement>("top");
const widthInput = $<HTMLInputElement>("width");
const heightInput = $<HTMLInputElement>("height");
const statusEl = $<HTMLSpanElement>("status");
const shortcutEl = $<HTMLElement>("shortcut");

let statusTimer: number | undefined;

function showStatus(text: string, isError = false): void {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
  window.clearTimeout(statusTimer);
  if (!isError) {
    statusTimer = window.setTimeout(() => (statusEl.textContent = ""), 2500);
  }
}

function fill(s: Settings): void {
  leftInput.value = s.left === null ? "" : String(s.left);
  topInput.value = s.top === null ? "" : String(s.top);
  widthInput.value = String(s.width);
  heightInput.value = String(s.height);
}

function parseOptional(value: string): number | null {
  if (value.trim() === "") return null;
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
    height: Math.round(height),
  });
  showStatus("保存しました。");
});

$<HTMLButtonElement>("reset").addEventListener("click", async () => {
  fill(DEFAULT_SETTINGS);
  await saveSettings(DEFAULT_SETTINGS);
  showStatus("初期値に戻しました。");
});

$<HTMLButtonElement>("open-shortcuts").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

async function renderShortcut(): Promise<void> {
  const commands = await chrome.commands.getAll();
  const command = commands.find((c) => c.name === "_execute_action");
  shortcutEl.textContent = command?.shortcut || "未設定";
}

loadSettings().then(fill);
renderShortcut();
