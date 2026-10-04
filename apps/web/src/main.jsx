import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
)

// Service workers cache production assets, but must not cache Vite's changing
// source modules during local development.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            if (import.meta.env.DEV) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                const appRegistrations = registrations.filter((registration) =>
                    [registration.active, registration.waiting, registration.installing]
                        .filter(Boolean)
                        .some((worker) => new URL(worker.scriptURL).pathname.endsWith('/sw.js'))
                );
                const hasAppController = navigator.serviceWorker.controller
                    && new URL(navigator.serviceWorker.controller.scriptURL).pathname.endsWith('/sw.js');

                if (appRegistrations.length || hasAppController) {
                    await Promise.all(appRegistrations.map((registration) => registration.unregister()));
                    const appCaches = (await caches.keys()).filter((key) => key.startsWith('restrobaba-'));
                    await Promise.all(appCaches.map((key) => caches.delete(key)));

                    const reloadKey = 'restrobaba-dev-sw-cleanup';
                    if (hasAppController && !sessionStorage.getItem(reloadKey)) {
                        sessionStorage.setItem(reloadKey, 'true');
                        window.location.reload();
                        return;
                    }
                } else {
                    sessionStorage.removeItem('restrobaba-dev-sw-cleanup');
                }
                return;
            }

            await navigator.serviceWorker.register('/sw.js');
        } catch (err) {
            console.error('Service worker setup failed:', err);
        }
    });
}
