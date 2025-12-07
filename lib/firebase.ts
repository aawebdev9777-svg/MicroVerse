/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// --- FIREBASE CONFIGURATION (ENCRYPTED-OS) ---
const firebaseConfig = {
  apiKey: "AIzaSyBEihYVgLZLfQRTSdDDQEn7UQR50SZoiXE",
  authDomain: "encrypted-os.firebaseapp.com",
  projectId: "encrypted-os",
  storageBucket: "encrypted-os.firebasestorage.app",
  messagingSenderId: "225588170926",
  appId: "1:225588170926:web:4f5541efe7725089935d3f",
  measurementId: "G-H93NYCC9VX"
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