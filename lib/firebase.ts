import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

export const firebaseConfig = {
  apiKey: "AIzaSyAMW4YRYDIDLExMUByPjkhi7pVLjgT5mU4",
  authDomain: "hellopoor-16c13.firebaseapp.com",
  projectId: "hellopoor-16c13",
  storageBucket: "hellopoor-16c13.firebasestorage.app",
  messagingSenderId: "776206171526",
  appId: "1:776206171526:web:95ff4c2187ca0dc53e4007",
  measurementId: "G-9SPFP62GEF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firestore instance
export const db = getFirestore(app);

// Get Functions instance
export const functions = getFunctions(app);

export { app }; 
