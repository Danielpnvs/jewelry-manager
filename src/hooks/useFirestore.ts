import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const useFirestore = <T>(collectionName: string) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => {
          const data = doc.data();
          // Converter Timestamps do Firebase para Date preservando arrays
          const convertTimestamps = (obj: any): any => {
            if (obj instanceof Timestamp) {
              return obj.toDate();
            }
            if (Array.isArray(obj)) {
              return obj.map((v) => convertTimestamps(v));
            }
            if (typeof obj === 'object' && obj !== null) {
              const converted: any = {};
              Object.keys(obj).forEach((key) => {
                converted[key] = convertTimestamps(obj[key]);
              });
              return converted;
            }
            return obj;
          };
          
          return {
            id: doc.id,
            ...convertTimestamps(data)
          } as T;
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName]);

  const add = async (item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      const docRef = await addDoc(collection(db, collectionName), {
        ...item,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setLoading(false);
      return docRef.id;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const update = async (id: string, updates: Partial<T>) => {
    try {
      setLoading(true);
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      });
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const remove = async (id: string) => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, collectionName, id));
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    add,
    update,
    remove
  };
};
