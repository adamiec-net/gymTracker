export function register() {
  if ('serviceWorker' in navigator) {
    const registerSW = () => {
      let base = import.meta.env.BASE_URL;
      if (base === './') {
        const path = window.location.pathname;
        if (path.endsWith('.html')) {
          base = path.substring(0, path.lastIndexOf('/') + 1);
        } else if (path.endsWith('/')) {
          base = path;
        } else {
          base = path + '/';
        }
      }
      
      const swUrl = `${base}sw.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }
}
