// skipWaiting() functions
function promptUserToRefresh(registration) {
  // this is just an example - don't use window.confirm in real life; it's terrible
  registration.waiting.postMessage('skipWaiting');
  window.location.reload();
}
function listenForWaitingServiceWorker(registration) {
  console.log('listenForWaitingServiceWorker', registration);
  function awaitStateChange() {
    registration.installing.addEventListener('statechange', function () {
      if (this.state === 'installed') promptUserToRefresh(registration);
    });
  }
  if (!registration) return;
  if (registration.waiting) return promptUserToRefresh(registration);
  if (registration.installing) awaitStateChange();
  registration.addEventListener('updatefound', awaitStateChange);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('sw.js')
    .then(registration => {
      console.log('service worker registered', registration);
      // notify new user if an updated SW was installed.
      listenForWaitingServiceWorker(registration);
    })
    .catch(err => console.log('service worker not registered', err));
}
