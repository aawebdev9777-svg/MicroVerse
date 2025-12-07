/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";

// --- MICROVERSE SURVEILLANCE LOGGER v9.4 ---

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

    try {
        const promises = batch.map(logEntry => {
            return addDoc(collection(db, 'system_logs'), {
                message: logEntry.msg,
                type: logEntry.lvl,
                metadata: logEntry.meta || {},
                // Use captured user info from the moment of the event
                username: logEntry.capturedUser || 'Unknown Agent',
                userId: logEntry.capturedUid || 'anonymous',
                email: logEntry.capturedEmail || 'N/A',
                timestamp: new Date(logEntry.ts),
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
    // Capture state synchronously at the moment of logging
    const currentUser = auth.currentUser;
    
    // Logic to determine the "Actor" of the log
    // 1. Current logged in user
    // 2. "target" specified in metadata (useful for login attempts)
    // 3. Fallback to System
    const actorName = currentUser?.displayName || metadata?.target || 'System';
    const actorUid = currentUser?.uid || (metadata?.target ? 'unauthenticated_target' : 'system_core');
    const actorEmail = currentUser?.email || metadata?.email || 'N/A';

    const log: SystemLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        message,
        type,
        user: actorName,
        metadata
    };
    
    // Broadcast to UI (System Status App)
    listeners.forEach(l => l(log));

    // Queue for Firestore with captured identity
    logQueue.push({
        msg: message,
        lvl: type,
        meta: metadata,
        ts: Date.now(),
        capturedUser: actorName,
        capturedUid: actorUid,
        capturedEmail: actorEmail
    });
};

export const subscribeToLogs = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};