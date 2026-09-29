import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Firebase web configuration identifies the project; it is not an access secret.
  // Firestore Rules and Auth enforce access control.
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBjk2S_M4HGEJ7C9yUeSjIqNLcI4kARAyQ',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'analitica-dashboar-y-ml.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'analitica-dashboar-y-ml',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'analitica-dashboar-y-ml.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '104157180210',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:104157180210:web:c86fc2ecedbbbba53ee72b',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
