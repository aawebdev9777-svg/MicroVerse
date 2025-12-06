/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyC8ZpG7vCU7r1wL4-pYqIsrgnQtqrQgs9I",
  authDomain: "microverse-d8112.firebaseapp.com",
  projectId: "microverse-d8112",
  storageBucket: "microverse-d8112.firebasestorage.app",
  messagingSenderId: "888810922610",
  appId: "1:888810922610:web:14c490c9894652d1d418eb",
  measurementId: "G-0N25QZDXDM"
};

let app;
let db: any;
let auth: any;
let analytics: any;

// Safe Initialization Logic
try {
    // Initialize only if not already initialized
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Analytics is only supported in browser environments
    if (typeof window !== 'undefined') {
        analytics = getAnalytics(app);
    }
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}

// Helper to ensure we have a user profile doc
export const ensureAuth = async () => {
    return new Promise<any>((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
            if (user) {
                resolve(user);
            } else {
                resolve(null);
            }
            unsubscribe();
        });
    });
};

export { app, db, auth, analytics };