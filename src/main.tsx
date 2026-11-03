import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure live document title & iOS Home Screen meta always reflect "alcove"
document.title = 'alcove';

// Purge any legacy caches on phones that opened an earlier version
if ('caches' in window) {
  caches
    .keys()
    .then((keys) => {
      for (const key of keys) {
        if (
          key.startsWith('booth31') ||
          key.startsWith('annas-alcove') ||
          (key.startsWith('alcove') && key !== 'alcove-pwa-v5')
        ) {
          caches.delete(key).catch(() => {});
        }
      }
    })
    .catch(() => {});
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js?v=5', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {
        // Service worker optional in restricted iframe previews
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
