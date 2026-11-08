import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { Dispatch } from '../types/dispatch.js';
import { db } from './firebase.js';

export interface FirestoreTelemetryPayload {
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  checkpointName?: string;
  source?: 'GPS' | 'DRIVER_SCAN' | 'CHECKPOINT' | 'SIMULATION';
  updatedAt: string;
}

/**
 * Subscribe in real time to live dispatch manifest changes (status updates, dock sign-offs, loss reports)
 */
export function subscribeToDispatchLive(
  dispatchId: string,
  onUpdate: (data: Partial<Dispatch>) => void,
  onError?: (error: Error) => void
): () => void {
  if (!dispatchId || !db) {
    return () => {};
  }

  try {
    const dispatchDocRef = doc(db, 'dispatches', dispatchId);
    return onSnapshot(
      dispatchDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          onUpdate(data as Partial<Dispatch>);
        }
      },
      (error) => {
        console.warn(`Firestore real-time subscription for ${dispatchId} note:`, error.message);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn('Could not initialize Firestore live subscription:', err?.message);
    return () => {};
  }
}

/**
 * Subscribe in real time to live vehicle/cargo GPS telemetry updates
 */
export function subscribeToTelemetryLive(
  dispatchId: string,
  onTelemetry: (telemetry: FirestoreTelemetryPayload) => void
): () => void {
  if (!dispatchId || !db) {
    return () => {};
  }

  try {
    const docRef = doc(db, 'dispatches', dispatchId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.currentCoordinates) {
            onTelemetry({
              latitude: data.currentCoordinates.latitude,
              longitude: data.currentCoordinates.longitude,
              speedKmh: data.currentCoordinates.speedKmh,
              heading: data.currentCoordinates.heading,
              checkpointName: data.currentCoordinates.checkpointName,
              source: data.currentCoordinates.source || 'GPS',
              updatedAt: data.currentCoordinates.updatedAt || new Date().toISOString(),
            });
          }
        }
      },
      (error) => {
        console.warn(`Firestore telemetry stream for ${dispatchId} note:`, error.message);
      }
    );
  } catch (err: any) {
    console.warn('Could not initialize Firestore telemetry stream:', err?.message);
    return () => {};
  }
}

/**
 * Persist dispatch state into persistent Cloud Firestore for multi-device sync
 */
export async function syncDispatchToFirestore(dispatch: Dispatch): Promise<boolean> {
  if (!dispatch?.id || !db) return false;

  try {
    const docRef = doc(db, 'dispatches', dispatch.id);
    const serialized = JSON.parse(JSON.stringify(dispatch));
    await setDoc(docRef, serialized, { merge: true });
    return true;
  } catch (error: any) {
    console.warn(`Firestore dispatch sync for ${dispatch.id} deferred:`, error.message);
    return false;
  }
}

/**
 * Stream updated GPS coordinate telemetry into Firestore
 */
export async function syncTelemetryToFirestore(
  dispatchId: string,
  telemetry: FirestoreTelemetryPayload
): Promise<boolean> {
  if (!dispatchId || !db) return false;

  try {
    const docRef = doc(db, 'dispatches', dispatchId);
    await updateDoc(docRef, {
      currentCoordinates: telemetry,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error: any) {
    console.warn(`Firestore telemetry sync for ${dispatchId} deferred:`, error.message);
    return false;
  }
}
