export interface Settings {
  /** null の場合は現在のブラウザウィンドウの右寄りに自動配置 */
  left: number | null;
  top: number | null;
  width: number;
  height: number;
}

export const DEFAULT_SETTINGS: Settings = {
  left: null,
  top: null,
  width: 600,
  height: 700,
};

const SETTINGS_KEY = "settings";

export async function loadSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  const stored = (result[SETTINGS_KEY] ?? {}) as Partial<Settings>;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

export interface LookupMessage {
  type: "lookup";
  word: string;
}

export function isLookupMessage(value: unknown): value is LookupMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as LookupMessage).type === "lookup" &&
    typeof (value as LookupMessage).word === "string"
  );
}

const BASE_URL = "https://www.collinsdictionary.com/dictionary/english/";

/**
 * 入力語から Collins の URL を作る。
 * 小文字化 → 前後の記号/空白を除去 → 空白をハイフンに → URLエンコード
 * 例: "Break  down" -> .../english/break-down
 */
export function buildUrl(raw: string): string | null {
  const slug = raw
    .toLowerCase()
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .replace(/\s+/g, "-");
  if (!slug) return null;
  return BASE_URL + encodeURIComponent(slug);
}

/** ページ内でクリックされたことを background に知らせる(フォーカスイベントの補助) */
export interface DismissMessage {
  type: "dismiss";
}

export function isDismissMessage(value: unknown): value is DismissMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as DismissMessage).type === "dismiss"
  );
}
