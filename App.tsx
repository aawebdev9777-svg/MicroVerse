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
    const timeoutRef = useRef<number | null>(null);

    // --- GLOBAL SURVEILLANCE LISTENERS ---
    useEffect(() => {
        // Tracker Logic
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const targetName = target.innerText?.substring(0, 20) || target.tagName || 'UNKNOWN_ELEMENT';
            const location = `${e.clientX}x${e.clientY}`;
            
            logSystem(`INPUT: CLICK @ [${location}] -> "${targetName}"`, 'interaction', {
                x: e.clientX,
                y: e.clientY,
                target: target.tagName,
                class: target.className
            });
        };

        const handleKeydown = (e: KeyboardEvent) => {
            const ignored = ['Shift', 'Control', 'Alt', 'Meta'];
            if (!ignored.includes(e.key)) {
                logSystem(`INPUT: KEY_PRESS -> [${e.key.toUpperCase()}]`, 'interaction', { key: e.key, code: e.code });
            }
        };

        window.addEventListener('click', handleClick);
        window.addEventListener('keydown', handleKeydown);

        return () => {
            window.removeEventListener('click', handleClick);
            window.removeEventListener('keydown', handleKeydown);
        };
    }, []); 

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
                        if (data.role === 'admin') {
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
                // Do not auto-clear user if we are in manual bypass mode (user.isAnonymous && session active)
                if (!user?.isAnonymous) {
                     setUser(null);
                     setUserProfile(null);
                     setSessionStartTime(null);
                }
                if (unsubscribeProfile) unsubscribeProfile();
            }
        });
        
        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, [user, sessionStartTime]);

    // Red Team Event Listener (Simulated Hack)
    useEffect(() => {
        const handleBreach = () => {
            setSecurityAlert("CRITICAL SECURITY COMPROMISE DETECTED");
            
            setTimeout(() => {
                 setToast({ title: "SYSTEM FAILURE", message: "Core files corrupted. Purging buffers...", type: 'error' });
                 setIsPurged(true);
            }, 2000);

            setTimeout(() => {
                setIsPurged(false);
                setSecurityAlert(null);
                setToast({ title: "RECOVERY", message: "System restored from secure backup.", type: 'info' });
            }, 6000);
        };

        window.addEventListener('trigger-breach', handleBreach);
        return () => window.removeEventListener('trigger-breach', handleBreach);
    }, []);

    const launchApp = (item: DesktopItem) => {
        if (item.type === 'folder') {
            createWindow(item);
            return;
        }
        createWindow(item);
        logSystem(`EXEC: Launching ${item.name}...`, 'kernel');
    };

    const createWindow = (item: DesktopItem) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newZ = nextZIndex + 1;
        setNextZIndex(newZ);
        
        const offset = openWindows.length * 20;
        
        setOpenWindows([...openWindows, {
            id,
            item,
            zIndex: newZ,
            pos: { x: 50 + offset, y: 50 + offset },
            size: { width: 800, height: 600 }
        }]);
        setFocusedId(id);
    };

    const closeWindow = (id: string) => {
        setOpenWindows(prev => prev.filter(w => w.id !== id));
    };

    const focusWindow = (id: string) => {
        setFocusedId(id);
        setNextZIndex(prev => prev + 1);
        setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex + 1 } : w));
    };

    const handleInkProcess = async () => {
        if (strokes.length === 0) return;
        setIsProcessing(true);
        logSystem('AI: Processing visual input...', 'ai');

        try {
            await new Promise(r => setTimeout(r, 1000));
            setToast({ title: "Gemini", message: "Visual analysis complete.", type: 'info' });
            
        } catch (e) {
            console.error(e);
            setToast({ title: "Error", message: "Failed to process ink.", type: 'error' });
        } finally {
            setIsProcessing(false);
            setStrokes([]);
            setInkMode(false);
        }
    };

    const handleAuthBypass = (mockUser: any) => {
        setUser(mockUser);
        setSessionStartTime(new Date());
        
        // Setup Simulated Profile since Firestore listeners might not fire without real Auth
        setUserProfile({
            username: mockUser.displayName,
            email: mockUser.email,
            role: mockUser.displayName.toLowerCase() === 'admin' ? 'admin' : 'operative',
            messageCode: 'SIM-' + Math.floor(Math.random()*10000).toString(16).toUpperCase(),
            createdAt: new Date(),
            lastLogin: new Date()
        });

        // Add Admin App if user is admin (Simulated)
        if (mockUser.displayName.toLowerCase() === 'admin') {
            setDesktopItems(prev => {
                if (prev.find(i => i?.id === 'admin_console')) return prev;
                return [
                    { id: 'admin_console', name: 'GOD MODE', type: 'app', icon: Eye, appId: 'admin', bgColor: 'bg-red-900 border border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.3)]' },
                    ...prev
                ];
            });
        }

        logSystem(`AUTH: Security Bypass Active for ${mockUser.displayName}`, 'warning');
    };

    if (isLocked) {
        return <LockScreen onUnlock={() => setIsLocked(false)} />;
    }

    if (!user) {
        return <AuthScreen onBypass={handleAuthBypass} />;
    }

    return (
        <div 
            className={`h-full w-full relative overflow-hidden transition-all duration-1000 ${isPurged ? 'grayscale contrast-125 brightness-50' : 'bg-[#1e1e2e]'}`}
            style={{
                backgroundImage: wallpaperUrl ? `url(${wallpaperUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            {/* Security Alert Overlay */}
            {securityAlert && (
                <div className="absolute top-0 left-0 w-full bg-red-600 text-white font-bold text-center py-2 animate-pulse z-[9999] text-xs tracking-[0.3em]">
                    {securityAlert}
                </div>
            )}

            {/* Desktop Layer */}
            <div className="absolute inset-0 z-0 pt-8 pb-12">
                <HomeScreen items={desktopItems} onLaunch={launchApp} />
            </div>

            {/* Window Layer */}
            {openWindows.map(win => (
                <DraggableWindow
                    key={win.id}
                    id={win.id}
                    title={win.item.name}
                    icon={win.item.icon}
                    zIndex={win.zIndex}
                    initialPos={win.pos}
                    initialSize={win.size}
                    onClose={() => closeWindow(win.id)}
                    onFocus={() => focusWindow(win.id)}
                    isActive={focusedId === win.id}
                >
                    {win.item.appId === 'mail' && <MailApp currentUser={user} />}
                    {win.item.appId === 'slides' && <SlidesApp />}
                    {win.item.appId === 'snake' && <SnakeGame />}
                    {win.item.appId === 'cyberbreak' && <CyberBreak />}
                    {win.item.appId === 'status' && <SystemStatusApp />}
                    {win.item.appId === 'dashboard' && <SecurityDashboardApp />}
                    {win.item.appId === 'admin' && <AdminApp />}
                    {win.item.appId === 'profile' && <ProfileApp />}
                    {win.item.appId === 'media' && <MediaApp />}
                    {win.item.appId === 'chat' && <ChatApp />}
                    {win.item.appId === 'browser' && <BrowserApp />}
                    {win.item.appId === 'notepad' && <NotepadApp initialContent={win.item.notepadInitialContent} />}
                    {win.item.type === 'folder' && <FolderView folder={win.item} />}
                </DraggableWindow>
            ))}

            {/* Ink Layer */}
            <InkLayer 
                active={inkMode} 
                strokes={strokes} 
                setStrokes={setStrokes} 
                isProcessing={isProcessing}
            />

            {/* Taskbar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl px-4 py-2 flex items-center gap-4 shadow-2xl z-[5000]">
                <button 
                    onClick={() => setInkMode(!inkMode)}
                    className={`p-3 rounded-xl transition-all ${inkMode ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'hover:bg-zinc-800 text-zinc-400'}`}
                    title="Gemini Ink"
                >
                    {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <PenLine size={20} />}
                </button>
                
                <div className="w-px h-8 bg-zinc-700/50 mx-2"></div>
                
                {/* Taskbar Items (Open Apps) */}
                {openWindows.map(win => (
                    <button 
                        key={win.id}
                        onClick={() => focusWindow(win.id)}
                        className={`p-2 rounded-lg transition-all relative group ${focusedId === win.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                        <win.item.icon size={20} className={focusedId === win.id ? 'text-blue-400' : 'text-zinc-400'} />
                        {focusedId === win.id && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"></div>}
                    </button>
                ))}
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`absolute top-8 right-8 z-[6000] max-w-sm w-full bg-zinc-900 border-l-4 p-4 rounded shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300 ${
                    toast.type === 'error' ? 'border-red-500' : 
                    toast.type === 'warning' ? 'border-yellow-500' : 
                    'border-blue-500'
                }`}>
                    <div className="flex justify-between items-start">
                        <div>
                            {toast.title && <h3 className={`font-bold text-sm ${
                                toast.type === 'error' ? 'text-red-400' : 
                                toast.type === 'warning' ? 'text-yellow-400' : 
                                'text-blue-400'
                            }`}>{toast.title}</h3>}
                            <div className="text-zinc-300 text-sm mt-1">{toast.message}</div>
                        </div>
                        <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-white"><MousePointer2 size={14}/></button>
                    </div>
                </div>
            )}
        </div>
    );
};