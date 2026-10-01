// src/content.ts
var MAX_LENGTH = 60;
var SVG_NS = "http://www.w3.org/2000/svg";
var currentWord = "";
var host = document.createElement("div");
host.style.cssText = "all: initial; position: absolute; z-index: 2147483647;";
var shadow = host.attachShadow({ mode: "closed" });
var style = document.createElement("style");
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
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  }
  button:hover { background: #b91c1c; }
  button:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
`;
var button = document.createElement("button");
button.type = "button";
button.title = "Collins で調べる";
button.setAttribute("aria-label", "Collins で調べる");
var svg = document.createElementNS(SVG_NS, "svg");
svg.setAttribute("viewBox", "0 0 24 24");
svg.setAttribute("width", "16");
svg.setAttribute("height", "16");
svg.setAttribute("fill", "none");
svg.setAttribute("stroke", "currentColor");
svg.setAttribute("stroke-width", "2.5");
svg.setAttribute("stroke-linecap", "round");
var circle = document.createElementNS(SVG_NS, "circle");
circle.setAttribute("cx", "10");
circle.setAttribute("cy", "10");
circle.setAttribute("r", "6");
var handle = document.createElementNS(SVG_NS, "line");
handle.setAttribute("x1", "15");
handle.setAttribute("y1", "15");
handle.setAttribute("x2", "21");
handle.setAttribute("y2", "21");
svg.append(circle, handle);
button.append(svg);
shadow.append(style, button);
function show(x, y, word) {
  currentWord = word;
  const maxLeft = document.documentElement.scrollWidth - 36;
  host.style.left = `${Math.max(0, Math.min(x, maxLeft))}px`;
  host.style.top = `${y}px`;
  if (!host.isConnected)
    document.documentElement.append(host);
}
function hide() {
  currentWord = "";
  host.remove();
}
document.addEventListener("mouseup", (event) => {
  if (event.target === host)
    return;
  const x = event.pageX + 8;
  const y = event.pageY + 12;
  setTimeout(() => {
    const text = window.getSelection()?.toString().trim() ?? "";
    if (!text || text.length > MAX_LENGTH) {
      hide();
      return;
    }
    show(x, y, text);
  }, 0);
});
function notifyDismiss() {
  try {
    const message = { type: "dismiss" };
    chrome.runtime.sendMessage(message).catch(() => {});
  } catch {}
}
document.addEventListener("mousedown", (event) => {
  if (event.target === host)
    return;
  hide();
  notifyDismiss();
}, true);
document.addEventListener("selectionchange", () => {
  const text = window.getSelection()?.toString().trim() ?? "";
  if (!text)
    hide();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape")
    hide();
});
button.addEventListener("mousedown", (event) => event.preventDefault());
button.addEventListener("click", async () => {
  const word = currentWord;
  hide();
  if (!word)
    return;
  try {
    const message = { type: "lookup", word };
    await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.warn("Collins Quick Lookup:", error);
  }
});
