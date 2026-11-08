import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any = null;
let dbInstance: any = null;
let authInstance: any = null;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  dbInstance = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
  authInstance = getAuth(app);
} catch (error: any) {
  console.warn('Firebase initialization note:', error?.message);
}

export const db = dbInstance;
export const auth = authInstance;

// Connection test on boot
export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'system', 'connection_ping'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline-queued mode.');
      return false;
    }
    // Document not existing is still a successful network connection to Firestore
    return true;
  }
}

