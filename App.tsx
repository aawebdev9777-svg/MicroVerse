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
    { id: 'chat', name: 'Encrypted Chat', type: 'app', icon: MessageCircle, appId: 'chat', bgColor: 'bg-gradient-to-br from-purple-600 to-indigo-600' },
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

    const showToast = useCallback((message: string, title?: string, success: boolean = false) => {
        setToast({
            message,
            title,
            type: success ? 'info' : 'error'
        });
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => setToast(null), 4000);
    }, []);

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
                    const indices = newItems.map((item, idx) => item ? idx : -1).filter(i => i !== -1);
                    if (indices.length > 0) {
                        const randomIdx = indices[Math.floor(Math.random() * indices.length)];
                        newItems[randomIdx] = null;
                        logSystem(`DELETING ASSET: ${prev[randomIdx]?.name}`, 'error');
                    }
                    return newItems;
                });
            }, 200);
        };

        window.addEventListener('trigger-breach', handleBreach);
        return () => window.removeEventListener('trigger-breach', handleBreach);
    }, []);

    const launchApp = (item: DesktopItem) => {
        if (item.type === 'folder') return;
        
        let initialW = 800;
        let initialH = 600;
        
        if (item.appId === 'chat') {
            initialW = 1000;
            initialH = 750;
        }

        const id = Math.random().toString(36).substr(2, 9);
        setOpenWindows(prev => [...prev, {
            id,
            item,
            zIndex: nextZIndex,
            pos: { x: 50 + (prev.length * 20), y: 50 + (prev.length * 20) },
            size: { width: initialW, height: initialH }
        }]);
        setNextZIndex(prev => prev + 1);
        setFocusedId(id);
        logSystem(`PROCESS STARTED: ${item.name}`, 'info');
    };

    const closeWindow = (id: string) => {
        setOpenWindows(prev => prev.filter(w => w.id !== id));
        if (focusedId === id) setFocusedId(null);
    };

    const focusWindow = (id: string) => {
        setFocusedId(id);
        setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex } : w));
        setNextZIndex(prev => prev + 1);
    };

    return (
        <div className="h-full w-full bg-black relative overflow-hidden font-sans select-none">
            {isPurged ? (
                <div className="absolute inset-0 bg-black flex items-center justify-center text-red-600 font-mono text-xl animate-pulse">
                    NO SIGNAL
                </div>
            ) : isLocked ? (
                <LockScreen onUnlock={() => setIsLocked(false)} />
            ) : !user ? (
                <AuthScreen onBypass={handleBypassLogin} />
            ) : (
                <>
                    {/* Wallpaper */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
                        style={{ 
                            backgroundImage: wallpaperUrl ? `url(${wallpaperUrl})` : undefined,
                            backgroundColor: '#000',
                            filter: 'brightness(0.6)'
                        }}
                    >
                         {!wallpaperUrl && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000_100%)]"></div>}
                    </div>

                    {/* Desktop Icons */}
                    <div className="absolute inset-0 z-0 pt-10">
                        <HomeScreen 
                            items={desktopItems} 
                            onLaunch={(item) => {
                                if (item.type === 'folder') {
                                    // Handle folder open logic if needed or just launch as window
                                    launchApp({ ...item, type: 'app', appId: 'folder' } as DesktopItem);
                                } else {
                                    launchApp(item);
                                }
                            }} 
                        />
                    </div>

                    {/* Windows */}
                    {openWindows.map(win => (
                        <DraggableWindow
                            key={win.id}
                            id={win.id}
                            title={win.item.name}
                            icon={win.item.icon}
                            initialPos={win.pos}
                            initialSize={win.size}
                            zIndex={win.zIndex}
                            isActive={focusedId === win.id}
                            onFocus={() => focusWindow(win.id)}
                            onClose={() => closeWindow(win.id)}
                        >
                            {win.item.appId === 'mail' && <MailApp currentUser={user} />}
                            {win.item.appId === 'slides' && <SlidesApp />}
                            {win.item.appId === 'snake' && <SnakeGame />}
                            {win.item.appId === 'cyberbreak' && <CyberBreak />}
                            {win.item.appId === 'dashboard' && <SecurityDashboardApp />}
                            {win.item.appId === 'admin' && <AdminApp />}
                            {win.item.appId === 'profile' && <ProfileApp />}
                            {win.item.appId === 'media' && <MediaApp />}
                            {win.item.appId === 'folder' && <FolderView folder={win.item} />}
                            {win.item.appId === 'notepad' && <NotepadApp initialContent={win.item.notepadInitialContent} />}
                            {win.item.appId === 'browser' && <BrowserApp />}
                            {win.item.appId === 'chat' && <ChatApp />}
                            {win.item.appId === 'status' && <SystemStatusApp />}
                        </DraggableWindow>
                    ))}

                    {/* Taskbar */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-2xl z-[9999]">
                        <button onClick={() => setInkMode(!inkMode)} className={`p-2.5 rounded-xl transition-all ${inkMode ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-transparent text-zinc-400 hover:bg-white/10'}`}>
                            {inkMode ? <PenLine size={20} /> : <MousePointer2 size={20} />}
                        </button>
                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                        {desktopItems.slice(0, 5).map(item => item && (
                            <button key={item.id} onClick={() => launchApp(item)} className="p-2 rounded-xl hover:bg-white/10 transition-colors group relative">
                                <item.icon size={20} className="text-zinc-300 group-hover:text-white transition-colors" />
                                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    {item.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Toast Notification */}
                    {toast && (
                        <div className={`absolute top-6 right-6 z-[10000] bg-zinc-900 border-l-4 p-4 rounded shadow-2xl max-w-sm animate-in slide-in-from-right fade-in duration-300 ${toast.type === 'error' ? 'border-red-500' : toast.type === 'warning' ? 'border-yellow-500' : 'border-blue-500'}`}>
                            {toast.title && <div className={`text-xs font-bold uppercase mb-1 ${toast.type === 'error' ? 'text-red-500' : toast.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`}>{toast.title}</div>}
                            <div className="text-sm text-white">{toast.message}</div>
                        </div>
                    )}
                    
                    {/* Security Alert Overlay */}
                    {securityAlert && (
                        <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-center text-xs font-bold py-1 animate-pulse z-[10001]">
                            {securityAlert}
                        </div>
                    )}

                    {/* Ink Layer */}
                    <InkLayer active={inkMode} strokes={strokes} setStrokes={setStrokes} isProcessing={isProcessing} />
                </>
            )}
        </div>
    );
};