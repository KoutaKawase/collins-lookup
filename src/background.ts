import {
  buildUrl,
  isDismissMessage,
  isLookupMessage,
  loadSettings,
  type Settings,
} from "./shared";

interface DictState {
  id: number;
  /** 開いた(または再利用した)時刻。直後の一時的なフォーカス変動を無視するために使う */
  openedAt: number;
}

const STATE_KEY = "dictWindow";
/** 開いた直後にフォーカス判定を行わない猶予 */
const GRACE_MS = 600;
/** フォーカス喪失を検知してから、実際にフォーカスされていないか再確認するまでの待ち時間 */
const RECHECK_MS = 150;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function getState(): Promise<DictState | null> {
  const result = await chrome.storage.session.get(STATE_KEY);
  return (result[STATE_KEY] as DictState | undefined) ?? null;
}

async function setState(state: DictState | null): Promise<void> {
  if (state) await chrome.storage.session.set({ [STATE_KEY]: state });
  else await chrome.storage.session.remove(STATE_KEY);
}

async function resolveBounds(s: Settings) {
  let left = s.left;
  let top = s.top;
  if (left === null || top === null) {
    // 未設定なら、現在のブラウザウィンドウの右寄りに配置
    const base = await chrome.windows.getLastFocused();
    const baseLeft = base.left ?? 0;
    const baseTop = base.top ?? 0;
    const baseWidth = base.width ?? s.width + 40;
    left ??= Math.max(0, baseLeft + baseWidth - s.width - 20);
    top ??= baseTop + 40;
  }
  return { left, top, width: s.width, height: s.height };
}

/**
 * 猶予時間と再確認の待ち時間を置いたうえで、辞書ウィンドウがフォーカスされていなければ閉じる。
 * フォーカスイベントの取りこぼしや順序のずれに依存しないよう、最終的には get().focused で判定する。
 */
async function closeIfUnfocused(target: DictState): Promise<void> {
  const wait = Math.max(RECHECK_MS, target.openedAt + GRACE_MS - Date.now());
  await sleep(wait);

  // 待っている間に再利用・クローズされていたら何もしない
  const current = await getState();
  if (!current || current.id !== target.id || current.openedAt !== target.openedAt) return;

  try {
    const win = await chrome.windows.get(target.id);
    if (!win.focused) {
      await chrome.windows.remove(target.id);
    }
  } catch {
    // 既に閉じられている
  }
}

async function openDictionary(word: string): Promise<void> {
  const url = buildUrl(word);
  if (!url) return;

  // 既存ウィンドウがあれば再利用(URL更新+フォーカス。位置・サイズはユーザー操作を尊重)
  const previous = await getState();
  if (previous) {
    try {
      const existing = await chrome.windows.get(previous.id, { populate: true });
      const tabId = existing.tabs?.[0]?.id;
      if (tabId !== undefined) {
        await chrome.tabs.update(tabId, { url });
        await chrome.windows.update(previous.id, {
          focused: true,
          ...(existing.state === "minimized" ? { state: "normal" as const } : {}),
        });
        const next: DictState = { id: previous.id, openedAt: Date.now() };
        await setState(next);
        void closeIfUnfocused(next); // 取りこぼし対策の保険
        return;
      }
    } catch {
      // ウィンドウが既に存在しない → 新規作成へ
    }
    await setState(null);
  }

  const settings = await loadSettings();
  const bounds = await resolveBounds(settings);
  const created = await chrome.windows.create({
    url,
    focused: true,
    ...bounds,
  });
  if (created.id === undefined) return;

  const next: DictState = { id: created.id, openedAt: Date.now() };
  await setState(next);
  void closeIfUnfocused(next); // 取りこぼし対策の保険
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (isLookupMessage(message)) {
    openDictionary(message.word).then(
      () => sendResponse({ ok: true }),
      (error) => {
        console.error(error);
        sendResponse({ ok: false });
      },
    );
    return true; // 非同期で sendResponse する
  }

  if (isDismissMessage(message)) {
    // ページ内クリック: 辞書ウィンドウがフォーカスされていなければ閉じる
    getState().then((state) => {
      if (state) void closeIfUnfocused(state);
    });
  }
  return false;
});

// フォーカスが辞書ウィンドウから外れたら閉じる
chrome.windows.onFocusChanged.addListener(async (focusedId) => {
  const state = await getState();
  if (!state || focusedId === state.id) return;
  await closeIfUnfocused(state);
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  const state = await getState();
  if (state?.id === windowId) await setState(null);
});
