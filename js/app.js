/**
 * service worker가 활성화되기를 기다리고 있는 경우 대기를 건너뛰고 페이지를 다시 로드하도록 지시
 *
 * @param registration 서비스 작업자 등록을 나타내는 ServiceWorkerRegistration 개체
 */
function promptUserToRefresh(registration) {
  registration.waiting.postMessage('skipWaiting');
  window.location.reload();
}

/**
 * 대기 중인 service worker가 있는 경우 promptUserToRefresh 함수 실행
 * 그렇지 않으면 설치 중인 service worker가 설치될 때까지 기다린 다음 promptUserToRefresh 함수 실행
 *
 * @param registration ServiceWorkerRegistration 객체
 */
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

/* service worker registration */
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
