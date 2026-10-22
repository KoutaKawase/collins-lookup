import type { DismissMessage, LookupMessage } from "./shared";

const MAX_LENGTH = 60; // これより長い選択ではアイコンを出さない

let currentWord = "";

// ページのCSSと干渉しないよう Shadow DOM 内にアイコンを作る
const host = document.createElement("div");
host.style.cssText = "all: initial; position: absolute; z-index: 2147483647;";
const shadow = host.attachShadow({ mode: "closed" });

const style = document.createElement("style");
style.textContent = `
  button {
    all: initial;
    box-sizing: border-box;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #1f2937;
    color: #fff;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  }
  button:hover { background: #b91c1c; }
  button:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
`;

const button = document.createElement("button");
button.type = "button";
button.title = "Collins で調べる";
button.setAttribute("aria-label", "Collins で調べる");

button.textContent = "📖";
shadow.append(style, button);

function show(x: number, y: number, word: string): void {
  currentWord = word;
  const maxLeft = document.documentElement.scrollWidth - 36;
  host.style.left = `${Math.max(0, Math.min(x, maxLeft))}px`;
  host.style.top = `${y}px`;
  if (!host.isConnected) document.documentElement.append(host);
}

function hide(): void {
  currentWord = "";
  host.remove();
}

// 選択確定時(マウスを離した位置の左下にアイコンを表示)
document.addEventListener("mouseup", (event) => {
  if (event.target === host) return;
  const x = event.pageX - 8 - 28;
  const y = event.pageY + 12;
  // mouseup 直後は選択が未確定な場合があるため次のタスクで読む
  setTimeout(() => {
    const text = window.getSelection()?.toString().trim() ?? "";
    if (!text || text.length > MAX_LENGTH) {
      hide();
      return;
    }
    show(x, y, text);
  }, 0);
});

// 辞書ウィンドウが開いていれば閉じてもらう(フォーカスイベントが届かない環境の補助)
function notifyDismiss(): void {
  try {
    const message: DismissMessage = { type: "dismiss" };
    chrome.runtime.sendMessage(message).catch(() => {});
  } catch {
    // 拡張機能の再読み込み直後など
  }
}

// アイコン以外をクリックしたらアイコンを消し、辞書ウィンドウも閉じる
document.addEventListener(
  "mousedown",
  (event) => {
    if (event.target === host) return;
    hide();
    notifyDismiss();
  },
  true,
);

document.addEventListener("selectionchange", () => {
  const text = window.getSelection()?.toString().trim() ?? "";
  if (!text) hide();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hide();
});

// クリックしても選択が解除されないようにする
button.addEventListener("mousedown", (event) => event.preventDefault());

button.addEventListener("click", async () => {
  const word = currentWord;
  hide();
  if (!word) return;
  try {
    const message: LookupMessage = { type: "lookup", word };
    await chrome.runtime.sendMessage(message);
  } catch (error) {
    // 拡張機能の再読み込み直後などは失敗する(ページの再読み込みで復旧)
    console.warn("Collins Quick Lookup:", error);
  }
});
