import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

// Configuration parameters for the app's Firebase project
export const firebaseConfig = {
  apiKey: "AIzaSyCgcs7VGPxxW97UC3S07xDEJe9ezPeEjC0",
  authDomain: "gen-lang-client-0427901785.firebaseapp.com",
  projectId: "gen-lang-client-0427901785",
  storageBucket: "gen-lang-client-0427901785.firebasestorage.app",
  messagingSenderId: "675240727616",
  appId: "1:675240727616:web:a42fe7dfa2acc2c4287ba5"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with local persistence so it remembers logged-in users
const auth = getAuth(app);

// Initialize Firestore
// In AI Studio, a custom Firestore Database ID is provisioned
const db = getFirestore(app, "ai-studio-6b54ef70-ffe1-4ce9-b034-263a44c85f1f");

export { app, auth, db };
