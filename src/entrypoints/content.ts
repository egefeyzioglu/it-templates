export default defineContentScript({
  matches: ["https://efeyzee.dev/*"],
  main() {
    const abortController = new AbortController();

    // Event listener to trigger the command dropdown when the user types `/`
    // into an <input> or <textarea>
    // TODO: Support shadow DOMs, probably with a MutationObserver
    document.addEventListener("keydown", slashCommandKeydownHandler, {
      signal: abortController.signal,
    });
    return () => abortController.abort();
  },
});

function slashCommandKeydownHandler(e: KeyboardEvent) {
  if (e.key === "/") {
    if (
      !(
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
    ) {
      // TODO: Support editable div's in the future
      return;
    }

    const target = e.target;
    const value = target.value;
    const cursor = target.selectionStart;
    if (cursor === null) {
      return;
    }

    const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
    const lineText = value.slice(lineStart, cursor);

    const isEmptyLine = lineText.trim() === "";
    const hasSpaceBefore = cursor > 0 && /\s/.test(value[cursor - 1]);

    // Only show the dropdown if the `/` is its own word
    if (!isEmptyLine && !hasSpaceBefore) {
      return;
    }
    showCommandDropdown(target);
  }
}

function showCommandDropdown(target: HTMLInputElement | HTMLTextAreaElement) {
  console.log("showCommandDropdown stub", { target: target });
}
