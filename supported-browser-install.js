navigator.serviceWorker
  .register('sw.js')
  .then(registration => {
    console.log('running "supported-browser-install.js"');
    if (registration.installing) {
      const sw = registration.installing || registration.waiting;
      sw.onstatechange = function () {
        if (sw.state === 'installed') {
          window.location.reload();
        }
      };
    } else if (registration.active) {
      // something's not right or SW is bypassed.  previously-installed SW should have redirected this request to different page
      status(
        '<p>Service Worker is installed and not functioning as intended.<p>Please contact developer.',
      );
    }
  })
  .catch(error => status(error));
