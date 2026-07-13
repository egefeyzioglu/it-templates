import { createRoot } from 'react-dom/client';
import { TemplatePalette } from '../ui/TemplatePalette';
import styles from '../ui/styles.css?inline';

const host = document.getElementById('root')!;
host.style.position = 'fixed';
host.style.inset = '0';
host.style.zIndex = '2147483647';
host.style.pointerEvents = 'none';
const shadow = host.attachShadow({ mode: 'open' });
const style = document.createElement('style');
style.textContent = styles;
const app = document.createElement('div');
shadow.append(style, app);
createRoot(app).render(<TemplatePalette />);
