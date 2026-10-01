import type { LookupMessage } from "./shared";

const form = document.getElementById("form") as HTMLFormElement;
const input = document.getElementById("word") as HTMLInputElement;

input.focus();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const word = input.value.trim();
  if (!word) return;
  try {
    const message: LookupMessage = { type: "lookup", word };
    await chrome.runtime.sendMessage(message);
  } finally {
    window.close();
  }
});
