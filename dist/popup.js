// src/popup.ts
var form = document.getElementById("form");
var input = document.getElementById("word");
input.focus();
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const word = input.value.trim();
  if (!word)
    return;
  try {
    const message = { type: "lookup", word };
    await chrome.runtime.sendMessage(message);
  } finally {
    window.close();
  }
});
