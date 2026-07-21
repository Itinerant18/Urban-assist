// FCM service worker — required for web push.
// Config arrives in the registration query string (?apiKey=...&projectId=...&
// messagingSenderId=...&appId=...), filled by the app from its public
// NEXT_PUBLIC_FIREBASE_* env. All values are public web config — no secrets here.
// No-ops safely until config is present.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

try {
  const params = new URL(self.location).searchParams;
  const config = {
    apiKey: params.get('apiKey'),
    projectId: params.get('projectId'),
    messagingSenderId: params.get('messagingSenderId'),
    appId: params.get('appId'),
  };
  if (config.apiKey) {
    firebase.initializeApp(config);
    firebase.messaging().onBackgroundMessage((payload) => {
      const { title, body } = payload.notification ?? {};
      self.registration.showNotification(title ?? 'Urban Assist', {
        body: body ?? '',
        icon: '/icon-192.png',
      });
    });
  }
} catch (e) {
  // Config absent or SDK load failed — no-op.
}
