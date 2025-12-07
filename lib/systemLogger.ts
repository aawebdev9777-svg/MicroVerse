/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";

// --- MICROVERSE SURVEILLANCE LOGGER v9.3 ---

export type LogType = 'info' | 'success' | 'warning' | 'error' | 'network' | 'ai' | 'kernel' | 'surveillance' | 'interaction';

export interface SystemLog {
    id: string;
    timestamp: Date;
    message: string;
    type: LogType;
    user?: string;
    metadata?: any;
}

type Listener = (log: SystemLog) => void;
const listeners: Set<Listener> = new Set();

// High-Capacity Data Buffer
const logQueue: any[] = [];
let isFlushing = false;

// Gather Fingerprint Data
const getDeviceFingerprint = () => ({
    userAgent: navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    platform: navigator.platform,
    cores: navigator.hardwareConcurrency,
    url: window.location.href
});

const flushLogsToGlobal = async () => {
    if (logQueue.length === 0 || isFlushing) return;
    isFlushing = true;

    // Take a batch of up to 20 logs
    const batch = logQueue.splice(0, 20);

    const currentUser = auth.currentUser;

    // Even if no user is logged in, we log to system with "Anonymous" tag
    try {
        const promises = batch.map(logEntry => {
            return addDoc(collection(db, 'system_logs'), {
                ...logEntry,
                userId: currentUser?.uid || 'anonymous',
                username: currentUser?.displayName || 'Unknown Agent',
                email: currentUser?.email || 'N/A',
                serverTime: serverTimestamp(),
                device: getDeviceFingerprint() 
            });
        });
        await Promise.all(promises);
    } catch (e) {
        console.warn("Surveillance Uplink Failed:", e);
    }
    isFlushing = false;
};

// --- AGGRESSIVE FLUSH INTERVAL: 1 SECOND ---
setInterval(flushLogsToGlobal, 1000);

export const logSystem = (message: string, type: LogType = 'info', metadata: any = {}) => {
    const log: SystemLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        message,
        type,
        user: auth.currentUser?.displayName || 'System',
        metadata
    };
    
    // Broadcast to UI (System Status App)
    listeners.forEach(l => l(log));

    // Queue for Firestore
    logQueue.push({
        msg: message,
        lvl: type,
        meta: metadata,
        ts: Date.now()
    });
};

export const subscribeToLogs = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};