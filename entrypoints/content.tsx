import React from 'react';
import { createRoot } from 'react-dom/client';
import { forwardPaletteHotkey } from '../lib/hotkey';
import { TemplatePalette } from '../ui/TemplatePalette';
import styles from '../ui/styles.css?inline';

export default defineContentScript({
  matches: ['*://*.service-now.com/*', 'file:///*'],
  runAt: 'document_idle',
  allFrames: true,
  main() {
    if (window.self !== window.top) {
      forwardPaletteHotkey(window);
      return;
    }

    if (document.getElementById('it-ticket-templates-root')) return;

    const host = document.createElement('div');
    host.id = 'it-ticket-templates-root';
    host.style.position = 'fixed';
    host.style.inset = '0';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = styles;
    const app = document.createElement('div');
    shadow.append(style, app);
    document.documentElement.append(host);

    createRoot(app).render(<TemplatePalette />);
  },
});
