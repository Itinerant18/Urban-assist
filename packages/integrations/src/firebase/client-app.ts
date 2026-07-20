'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

let authentication: Promise<{ app: FirebaseApp; uid: string }> | null = null;

function getFirebaseClientApp(): FirebaseApp {
  if (getApps().length) return getApp();
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.projectId || !config.appId) {
    throw new Error('firebase_client_not_configured');
  }
  return initializeApp(config);
}

export async function authenticateFirebase(customToken: string) {
  const app = getFirebaseClientApp();
  const auth = getAuth(app);
  if (auth.currentUser) return { app, uid: auth.currentUser.uid };
  authentication ??= signInWithCustomToken(auth, customToken)
    .then((credential) => ({ app, uid: credential.user.uid }))
    .catch((error) => {
      authentication = null;
      throw error;
    });
  return authentication;
}
