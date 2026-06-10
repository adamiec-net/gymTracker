import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { register as registerServiceWorker } from './registerServiceWorker'
import type { BeforeInstallPromptEvent } from './types'

// Listen for the PWA install prompt event and store it globally
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e as BeforeInstallPromptEvent;
  window.dispatchEvent(new CustomEvent('pwa-installable', { detail: e }));
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
