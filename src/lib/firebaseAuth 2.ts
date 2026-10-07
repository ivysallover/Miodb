import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Firebase app + Auth only.
 *
 * Why this file exists: the landing (navbar session state, founder check) needs `auth`
 * but never touches Firestore. Importing `auth` from '@/lib/firebase' also pulled the whole
 * Firestore SDK into the landing's critical path. Landing-path code imports from here;
 * '@/lib/firebase' re-exports everything below plus `db`, so every other importer keeps working.
 *
 * The firebase config and the auth logic are unchanged — only where they live.
 */
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'AIzaSyBjk2S_M4HGEJ7C9yUeSjIqNLcI4kARAyQ',
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || 'analitica-dashboar-y-ml.firebaseapp.com',
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'analitica-dashboar-y-ml',
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || 'analitica-dashboar-y-ml.firebasestorage.app',
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '104157180210',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '1:104157180210:web:c86fc2ecedbbbba53ee72b',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export default app;
