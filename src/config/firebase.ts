import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA_ddlLI6vYKoW_I1MIUStTME7NxXXb46Y",
  authDomain: "solarie-acessorios.firebaseapp.com",
  projectId: "solarie-acessorios",
  storageBucket: "solarie-acessorios.firebasestorage.app",
  messagingSenderId: "238111392073",
  appId: "1:238111392073:web:14732f6e219e5ee06c9a98",
  measurementId: "G-VF07SL4T0F"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
export const db = getFirestore(app);

export default app;