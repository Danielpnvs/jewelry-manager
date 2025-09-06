import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'config';
const DOC_ID = 'auth';
const DEFAULT_PASSWORD = 'solarie123';

export async function sha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function ensureDefaultPassword(): Promise<void> {
  const ref = doc(db, COLLECTION, DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists() || !snap.data()?.passwordHash) {
    const hash = await sha256Hex(DEFAULT_PASSWORD);
    await setDoc(ref, { passwordHash: hash, updatedAt: new Date() }, { merge: true });
  }
}

export async function getPasswordHash(): Promise<string> {
  const ref = doc(db, COLLECTION, DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists() || !snap.data()?.passwordHash) {
    await ensureDefaultPassword();
    const again = await getDoc(ref);
    return (again.data()?.passwordHash as string) || '';
  }
  return (snap.data()?.passwordHash as string) || '';
}

export async function setPasswordHash(newHash: string): Promise<void> {
  const ref = doc(db, COLLECTION, DOC_ID);
  await setDoc(ref, { passwordHash: newHash, updatedAt: new Date() }, { merge: true });
}