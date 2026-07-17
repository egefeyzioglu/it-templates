export const TOGGLE_MESSAGE_TYPE = 'it-ticket-templates:toggle';

export function isPaletteHotkey(event: KeyboardEvent): boolean {
  return event.ctrlKey && event.code === 'Space';
}

// Key events never cross frame boundaries, so frames that don't host the
// palette (e.g. ServiceNow's gsft_main form iframe) forward the hotkey to the
// top window, where the palette listens for it.
export function forwardPaletteHotkey(win: Window): void {
  win.addEventListener(
    'keydown',
    (event) => {
      if (!isPaletteHotkey(event)) return;
      event.preventDefault();
      event.stopPropagation();
      win.top?.postMessage({ type: TOGGLE_MESSAGE_TYPE }, '*');
    },
    true,
  );
}
