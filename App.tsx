/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MousePointer2, PenLine, Play, Mail, Presentation, Folder, Loader2, FileText, Image as ImageIcon, Gamepad2, Eraser, Mic, MicOff, Globe, MessageCircle, Terminal, ShieldAlert, LayoutDashboard, UserCircle, Image, Skull, Eye } from 'lucide-react';
import { Modality, LiveServerMessage } from "@google/genai";
import { AppId, DesktopItem, Stroke, Email } from './types';
import { HomeScreen } from './components/apps/HomeScreen';
import { MailApp } from './components/apps/MailApp';
import { SlidesApp } from './components/apps/SlidesApp';
import { SnakeGame } from './components/apps/SnakeGame';
import { CyberBreak } from './components/apps/CyberBreak';
import { SecurityDashboardApp } from './components/apps/SecurityDashboardApp'; 
import { AdminApp } from './components/apps/AdminApp';
import { ProfileApp } from './components/apps/ProfileApp';
import { MediaApp } from './components/apps/MediaApp';
import { FolderView } from './components/apps/FolderView';
import { DraggableWindow } from './components/DraggableWindow';
import { InkLayer } from './components/InkLayer';
import { getAiClient, HOME_TOOLS, MAIL_TOOLS, MODEL_NAME, SYSTEM_INSTRUCTION, LIVE_MODEL_NAME, VOICE_TOOLS, LIVE_SYSTEM_INSTRUCTION } from './lib/gemini';
import { NotepadApp } from './components/apps/NotepadApp';
import { BrowserApp } from './components/apps/BrowserApp';
import { ChatApp } from './components/apps/ChatApp';
import { SystemStatusApp } from './components/apps/SystemStatusApp';
import { AuthScreen } from './components/AuthScreen';
import { LockScreen } from './components/LockScreen';
import { db, auth } from './lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { logSystem } from './lib/systemLogger';

const INITIAL_DESKTOP_ITEMS: DesktopItem[] = [
    { id: 'status', name: 'System Core', type: 'app', icon: Terminal, appId: 'status', bgColor: 'bg-black border border-green-900/50 shadow-[0_0_15px_rgba(0,255,0,0.1)]' },
    { id: 'dashboard', name: 'Overwatch', type: 'app', icon: LayoutDashboard, appId: 'dashboard', bgColor: 'bg-zinc-800 border border-zinc-600' },
    { id: 'chat', name: 'Void Uplink', type: 'app', icon: MessageCircle, appId: 'chat', bgColor: 'bg-gradient-to-br from-purple-600 to-indigo-600' },
    { id: 'browser', name: 'Net Runner', type: 'app', icon: Globe, appId: 'browser', bgColor: 'bg-gradient-to-br from-zinc-900 to-black border border-red-900/30' },
    { id: 'mail', name: 'Secure Comms', type: 'app', icon: Mail, appId: 'mail', bgColor: 'bg-gradient-to-br from-blue-400 to-blue-700' },
    { id: 'media', name: 'Vault', type: 'app', icon: Image, appId: 'media', bgColor: 'bg-gradient-to-br from-pink-600 to-rose-600' },
    { id: 'profile', name: 'Operative ID', type: 'app', icon: UserCircle, appId: 'profile', bgColor: 'bg-gradient-to-br from-zinc-700 to-zinc-800' },
    { id: 'slides', name: 'Briefings', type: 'app', icon: Presentation, appId: 'slides', bgColor: 'bg-gradient-to-br from-orange-400 to-orange-700' },
    { id: 'snake', name: 'Training Sim', type: 'app', icon: Gamepad2, appId: 'snake', bgColor: 'bg-gradient-to-br from-emerald-500 to-emerald-800' },
    { id: 'cyberbreak', name: 'Breach Protocol', type: 'app', icon: ShieldAlert, appId: 'cyberbreak', bgColor: 'bg-gradient-to-br from-red-600 to-red-900 shadow-[0_0_15px_rgba(220,38,38,0.3)]' },
    { 
        id: 'how_to_use', 
        name: 'manual.enc', 
        type: 'app', 
        icon: FileText, 
        appId: 'notepad', 
        bgColor: 'bg-gradient-to-br from-pink-500 to-pink-700',
        notepadInitialContent: `GEMINI INK - SECURE PROTOCOLS`
    },
    { id: 'docs', name: 'Classified', type: 'folder', icon: Folder, bgColor: 'bg-gradient-to-br from-sky-400 to-sky-700', contents: [
        { id: 'doc1', name: 'Report.docx', type: 'app', icon: FileText, bgColor: 'bg-gradient-to-br from-blue-500 to-blue-700' },
        { id: 'img1', name: 'Evidence.png', type: 'app', icon: ImageIcon, bgColor: 'bg-gradient-to-br from-purple-500 to-purple-700' }
    ] },
    { id: 'projects', name: 'Ops', type: 'folder', icon: Folder, bgColor: 'bg-gradient-to-br from-indigo-400 to-indigo-700', contents: [
        { id: 'p1', name: 'Payload.ts', type: 'app', icon: FileText, bgColor: 'bg-gradient-to-br from-cyan-500 to-cyan-700' }
    ]}
];

interface OpenWindow {
    id: string;
    item: DesktopItem;
    zIndex: number;
    pos: { x: number, y: number };
    size?: { width: number, height: number };
}

// Audio helpers
function createBlob(data: Float32Array): { data: string, mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return {
        data: btoa(binary),
        mimeType: 'audio/pcm;rate=16000',
    };
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


export const App: React.FC = () => {
    // isLocked = System BIOS Password Screen
    const [isLocked, setIsLocked] = useState(true);
    // user = Firebase User (null if not logged in)
    const [user, setUser] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
    
    const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [nextZIndex, setNextZIndex] = useState(100);
    const [inkMode, setInkMode] = useState(false);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [desktopItems, setDesktopItems] = useState<(DesktopItem | null)[]>(INITIAL_DESKTOP_ITEMS);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [toast, setToast] = useState<{ title?: string; message: React.ReactNode, type?: 'info' | 'error' | 'warning' } | null>(null);
    const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
    
    // Security / Breach State
    const [isPurged, setIsPurged] = useState(false);
    const [securityAlert, setSecurityAlert] = useState<string | null>(null);
    
    // Live API State
    const [isLive, setIsLive] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sessionRef = useRef<any>(null);

    const timeoutRef = useRef<number | null>(null);

    // Initialize Auth & Data Sync Listener
    useEffect(() => {
        let unsubscribeProfile: (() => void) | undefined;

        const unsubscribeAuth = auth.onAuthStateChanged(async (u: any) => {
            if (u) {
                setUser(u);
                const start = new Date();
                setSessionStartTime(start);
                logSystem(`SESSION START: ${u.displayName || u.email} at ${start.toLocaleTimeString()}`, 'success');
                
                // Sync User Profile (Firestore)
                unsubscribeProfile = onSnapshot(doc(db, 'users', u.uid), (doc) => {
                    if (doc.exists()) {
                        const data = doc.data();
                        setUserProfile(data);
                        
                        // Add Admin App if user is admin
                        if (data.username === 'admin') {
                            setDesktopItems(prev => {
                                if (prev.find(i => i?.id === 'admin_console')) return prev;
                                return [
                                    { id: 'admin_console', name: 'GOD MODE', type: 'app', icon: Eye, appId: 'admin', bgColor: 'bg-red-900 border border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.3)]' },
                                    ...prev
                                ];
                            });
                        }
                    }
                });
            } else {
                if (user && sessionStartTime) {
                    const duration = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
                    logSystem(`SESSION END: Duration ${duration}s`, 'warning');
                }
                setUser(null);
                setUserProfile(null);
                setSessionStartTime(null);
                if (unsubscribeProfile) unsubscribeProfile();
                logSystem('AUTH: Uplink severed.', 'warning');
            }
        });
        
        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []); // eslint-disable-line

    const handleBypassLogin = (mockUser: any) => {
        setUser(mockUser);
        
        // Setup Admin Env if needed
        if (mockUser.email.includes('admin')) {
             setUserProfile({ username: 'admin', email: mockUser.email, role: 'admin', messageCode: 'ROOT' });
             setDesktopItems(prev => {
                if (prev.find(i => i?.id === 'admin_console')) return prev;
                return [
                    { id: 'admin_console', name: 'GOD MODE', type: 'app', icon: Eye, appId: 'admin', bgColor: 'bg-red-900 border border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.3)]' },
                    ...prev
                ];
            });
        } else {
             setUserProfile({ username: 'Operative', email: mockUser.email, role: 'operative', messageCode: 'BYPASS' });
        }

        logSystem(`IDENTITY OVERRIDE: ADMIN ACCESS GRANTED TO ${mockUser.email}`, 'success');
        showToast("ADMIN CREDENTIALS ACCEPTED", "SYSTEM OVERRIDE", true);
    };

    // BACKDOOR LISTENER FOR HACKER CODE
    useEffect(() => {
        const handleBreach = async (e: any) => {
            // 1. Initial Alarm
            logSystem("CRITICAL SECURITY EVENT: ROOT ACCESS BREACHED", "error");
            setSecurityAlert("INTRUSION DETECTED");
            setToast({ title: "SECURITY ALERT", message: "External IP detected accessing core files.", type: 'error' });
            
            // 2. Simulated Defense (Wait 2s)
            await new Promise(r => setTimeout(r, 2000));
            logSystem("DEFENSE PROTOCOL: ENGAGING LOCKDOWN...", "warning");
            setSecurityAlert("ATTEMPTING LOCKDOWN...");
            setToast({ title: "SYSTEM DEFENSE", message: "Rerouting traffic through proxy...", type: 'info' });

            // 3. Defense Failure (Wait 2s)
            await new Promise(r => setTimeout(r, 2000));
            logSystem("DEFENSE FAILED. ENCRYPTION KEYS EXPOSED.", "error");
            setSecurityAlert("SYSTEM COMPROMISED");
            setToast({ title: "CRITICAL FAILURE", message: "Defense systems offline. Data exfiltration in progress.", type: 'error' });

            // 4. Protocol Zero: Self Destruct (Wait 1s)
            await new Promise(r => setTimeout(r, 1000));
            logSystem("INITIATING SCORCHED EARTH PROTOCOL: DELETING LOCAL ASSETS", "error");
            setSecurityAlert("SELF DESTRUCT SEQUENCE");
            
            // 5. Delete Items Loop
            const deleteInterval = setInterval(() => {
                setDesktopItems(prev => {
                    const realItems = prev.filter(i => i !== null);
                    if(realItems.length === 0) {
                        clearInterval(deleteInterval);
                        setTimeout(() => setIsPurged(true), 1000);
                        return [];
                    }
                    
                    const newItems = [...prev];
                    let lastIdx = -1;
                    