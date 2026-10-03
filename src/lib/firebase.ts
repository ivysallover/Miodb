import { getFirestore } from 'firebase/firestore';
import app, { auth } from './firebaseAuth';

// Full Firebase surface (Auth + Firestore). App code on the landing's critical path should
// import `auth` from './firebaseAuth' instead, so Firestore stays out of the first load.
export { auth };
export const db = getFirestore(app);
export default app;
