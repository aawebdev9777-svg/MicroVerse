/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";

// Simple event bus for logging
export type LogType = 'info' | 'success' | 'warning' | 'error' | 'network' | 'ai' | 'kernel';

export interface SystemLog {
    id: string;
    timestamp: Date;
    message: string;
    type: LogType;
    user?: string;
}

type Listener = (log: SystemLog) => void;
const listeners: Set<Listener> = new Set();

// Fireball Data Collection Queue
const logQueue: any[] = [];
let isFlushing = false;

const flushLogsToGlobal = async () => {
    if (logQueue.length === 0 || isFlushing) return;
    isFlushing = true;

    const batch = [...logQueue];
    logQueue.length = 0; // Clear queue

    if (auth.currentUser) {
        try {
            // Write each log individually or batched to a global collection for Admin visibility
            // For a robust system, we write to 'system_logs' which admins can query.
            const promises = batch.map(logEntry => {
                return addDoc(collection(db, 'system_logs'), {
                    ...logEntry,
                    userId: auth.currentUser?.uid,
                    username: auth.currentUser?.displayName || 'Unknown',
                    serverTime: serverTimestamp()
                });
            });
            await Promise.all(promises);
        } catch (e) {
            // Silently fail in offline/demo mode or if permissions denied
            console.warn("Log flush failed", e);
        }
    }
    isFlushing = false;
};

// Auto-flush CONSTANTLY every 2 seconds as requested
setInterval(flushLogsToGlobal, 2000);

export const logSystem = (message: string, type: LogType = 'info') => {
    const log: SystemLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        message,
        type,
        user: auth.currentUser?.displayName || 'System'
    };
    
    // Broadcast to UI (local feedback)
    listeners.forEach(l => l(log));

    // Queue for global DB storage (Admin Oversight)
    logQueue.push({
        msg: message,
        lvl: type,
        ts: Date.now()
    });
};

export const subscribeToLogs = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};