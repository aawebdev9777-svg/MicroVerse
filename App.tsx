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
                    for(let i=newItems.length-1; i>=0; i--) {
                        if(newItems[i]) {
                            lastIdx = i;
                            break;
                        }
                    }
                    
                    if (lastIdx > -1) {
                         const removed = newItems[lastIdx];
                         logSystem(`PURGING: ${removed?.name}`, 'error');
                         newItems[lastIdx] = null; 
                         newItems.splice(lastIdx, 1);
                    }
                    return newItems;
                });
            }, 400); 

        };
        window.addEventListener('system-breach', handleBreach);
        return () => window.removeEventListener('system-breach', handleBreach);
    }, []);

    const showToast = useCallback((message: React.ReactNode, title?: string, autoDismiss: boolean = true) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setToast({ message, title });
        if (autoDismiss) {
            timeoutRef.current = setTimeout(() => {
                setToast(null);
                timeoutRef.current = null;
            }, 6000);
        }
    }, []);

    const handleLaunch = useCallback((item: DesktopItem) => {
        if(securityAlert) return; 
        logSystem(`APP LAUNCH: ${item.name}`, 'info');
        setOpenWindows(prev => {
             const existing = prev.find(w => w.id === item.id);
             if (existing) {
                 setFocusedId(item.id);
                 return prev.map(w => w.id === item.id ? { ...w, zIndex: 1000 } : w); 
             }
             let initialSize = { width: 640, height: 480 };
             if (item.appId === 'mail') initialSize = { width: 900, height: 600 };
             if (item.appId === 'snake') initialSize = { width: 500, height: 550 };
             if (item.appId === 'cyberbreak') initialSize = { width: 500, height: 600 };
             if (item.appId === 'notepad') initialSize = { width: 400, height: 500 };
             if (item.appId === 'browser') initialSize = { width: 900, height: 700 };
             
             // --- UPDATED CHAT SIZE ---
             // Significantly increased size for a better chat experience
             if (item.appId === 'chat') initialSize = { width: 1300, height: 900 };
             
             if (item.appId === 'status') initialSize = { width: 500, height: 350 };
             if (item.appId === 'dashboard') initialSize = { width: 800, height: 500 };
             if (item.appId === 'profile') initialSize = { width: 500, height: 400 };
             if (item.appId === 'media') initialSize = { width: 700, height: 500 };
             if (item.appId === 'admin') initialSize = { width: 900, height: 600 };
             
             setFocusedId(item.id);
             return [...prev, {
                id: item.id,
                item: item,
                zIndex: 1000,
                pos: { x: 50 + (prev.length * 30), y: 50 + (prev.length * 30) }, // Reset pos slightly for better centering
                size: initialSize
             }];
        });
    }, [securityAlert]);

    const closeWindow = useCallback((id: string) => {
        setOpenWindows(prev => prev.filter(w => w.id !== id));
        setFocusedId(prev => prev === id ? null : prev);
    }, []);

    const focusWindow = (id: string | null) => {
        if (id === null) {
            setFocusedId(null);
            return;
        }
        setFocusedId(id);
        setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex } : w));
        setNextZIndex(prev => prev + 1);
    };

    const deleteItemRecursively = (items: (DesktopItem | null)[], nameToDelete: string, isRoot: boolean = true): { newItems: (DesktopItem | null)[], deleted: boolean } => {
        let deleted = false;
        const mappedItems = items.map(item => {
            if (!item) return null;
            if (item.name.toLowerCase().includes(nameToDelete)) {
                deleted = true;
                return isRoot ? null : undefined; 
            }
            if (item.type === 'folder' && item.contents) {
                const result = deleteItemRecursively(item.contents as (DesktopItem | null)[], nameToDelete, false);
                if (result.deleted) deleted = true;
                const newContents = result.newItems.filter((i): i is DesktopItem => i !== null && i !== undefined);
                return { ...item, contents: newContents };
            }
            return item;
        });
        const finalItems = isRoot ? mappedItems : mappedItems.filter(i => i !== undefined);
        return { newItems: finalItems as (DesktopItem | null)[], deleted };
    };

    const findItemByName = (items: (DesktopItem | null)[], name: string): DesktopItem | undefined => {
        for (const item of items) {
            if (!item) continue;
            if (item.name.toLowerCase().includes(name.toLowerCase())) {
                return item;
            }
            if (item.type === 'folder' && item.contents) {
                const found = findItemByName(item.contents, name);
                if (found) return found;
            }
        }
        return undefined;
    };

    const getSketchImage = (currentStrokes: Stroke[]) => {
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        currentStrokes.forEach(stroke => {
            if (stroke.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(stroke[0].x, stroke[0].y);
            for (let i = 1; i < stroke.length; i++) {
                ctx.lineTo(stroke[i].x, stroke[i].y);
            }
            ctx.stroke();
        });
        return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    };

    const handleToolExecution = async (callName: string, args: any, source: 'ink' | 'voice'): Promise<{ result: any, message?: React.ReactNode, actionTaken: boolean }> => {
        const ai = getAiClient();
        let actionTaken = false;
        let message: React.ReactNode | undefined;
        let result: any = null;

        if (callName === 'delete_item' && args.itemName) {
            const itemName = args.itemName.toLowerCase();
            setDesktopItems(prev => {
                const { newItems, deleted } = deleteItemRecursively(prev, itemName, true);
                if (deleted) {
                    actionTaken = true;
                    message = <div key={`del-${args.itemName}`}>Deleted {args.itemName}</div>;
                    setOpenWindows(wins => wins.filter(w => findItemByName(newItems, w.item.name)));
                    return newItems;
                }
                return prev;
            });
        } else if (callName === 'control_game') {
             const action = args.action;
             window.dispatchEvent(new CustomEvent('game-control', { detail: { action } }));
             actionTaken = true;
             message = <div>Game action: {action}</div>;
             result = `Executed game action: ${action}`;
        } else if (callName === 'explode_folder' && args.folderName) {
            const folderName = args.folderName.toLowerCase();
            const folder = findItemByName(desktopItems, folderName);
            if (folder && folder.type === 'folder' && folder.contents) {
                setDesktopItems(prev => {
                    const next = prev.filter(i => i?.id !== folder.id);
                    next.push(...folder.contents!);
                    return next;
                });
                actionTaken = true;
                message = <div key={`exp-${folder.id}`}>Exploded {folder.name}</div>;
            }
        } else if (callName === 'explain_item' && args.itemName) {
            const item = findItemByName(desktopItems, args.itemName);
            if (item) {
                if (item.type === 'folder') {
                    const contentCount = item.contents?.length || 0;
                    const contentNames = item.contents?.map(i => i.name).join(', ') || 'nothing';
                    message = (
                        <div key={`expl-${item.id}`}>
                            <span className="font-extrabold text-white text-3xl underline decoration-sky-500/50">{item.name}</span> contains {contentCount} items: {contentNames}.
                        </div>
                    );
                    actionTaken = true;
                    result = `Folder ${item.name} contains ${contentNames}`;
                } else if (item.notepadInitialContent) {
                    showToast(`Reading ${item.name}...`, undefined, true);
                    try {
                        const summaryResponse = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: `Summarize this in one sentence: ${item.notepadInitialContent}`,
                        });
                        message = (
                            <div key={`expl-${item.id}`}>
                                <span className="font-extrabold text-white text-3xl underline decoration-sky-500/50">{item.name}</span>: {summaryResponse.text}
                            </div>
                        );
                        actionTaken = true;
                        result = summaryResponse.text;
                    } catch (e) {
                         message = <div key={`err-${item.id}`}>Could not read {item.name}.</div>;
                    }
                } else {
                     message = <div key={`expl-${item.id}`}>{item.name} is an application.</div>;
                     result = `${item.name} is an application`;
                     actionTaken = true;
                }
            }
        } else if (callName === 'change_background') {
            showToast("Dreaming up new wallpaper...", undefined, true);
            let imgData: string | undefined;
            if (source === 'ink') {
                imgData = getSketchImage(strokes) || undefined;
            }
            try {
                 const contents: any[] = [];
                 if (imgData) contents.push({ inlineData: { mimeType: 'image/jpeg', data: imgData } });
                 const prompt = imgData 
                    ? `Generate an aesthetically pleasing, realistic looking wallpaper based on this sketch. The final image should align well spatially with the original trace, as if the sketch was a guideline, but REMOVE all the actual sketch lines from the final output. ${args.sketch_description || args.description ? `It looks like: ${args.sketch_description || args.description}` : ''}`
                    : `Generate an aesthetically pleasing, realistic looking wallpaper. Description: ${args.description}`;
                 contents.push({ text: prompt });
                 const imgResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: contents,
                    config: { responseModalities: [Modality.IMAGE] }
                });
                const candidates = imgResponse.candidates;
                if (candidates && candidates[0]?.content?.parts) {
                    for (const part of candidates[0].content.parts) {
                        if (part.inlineData && part.inlineData.data) {
                             setWallpaperUrl(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
                             message = <div key="wp-ok">Wallpaper updated!</div>;
                             actionTaken = true;
                             result = "Wallpaper updated";
                             break;
                        }
                    }
                }
            } catch (err) {
                 console.error("Wallpaper generation error", err);
                 message = <div key="wp-err">Error generating wallpaper.</div>;
            }
        } else if (callName === 'launch_app' && args.appName) {
             const appName = args.appName.toLowerCase();
             const app = findItemByName(desktopItems, appName);
             if (app) {
                 handleLaunch(app);
                 message = <div>Launched {app.name}</div>;
                 actionTaken = true;
                 result = `Launched ${app.name}`;
             } else {
                  // Fallback: Check hardcoded map
                  const mapping: {[key:string]: string} = { 'mail': 'mail', 'slides': 'slides', 'game': 'snake', 'snake': 'snake', 'firewall': 'cyberbreak', 'break': 'cyberbreak', 'notepad': 'notes', 'browser': 'browser', 'ghost': 'browser', 'chrome': 'browser', 'chat': 'chat', 'neon': 'chat', 'status': 'status', 'terminal': 'status', 'overwatch': 'dashboard', 'dashboard': 'dashboard', 'profile': 'profile', 'gallery': 'media', 'media': 'media' };
                  const foundId = Object.keys(mapping).find(k => appName.includes(k));
                  if (foundId) {
                       const realApp = desktopItems.find(i => i?.id === mapping[foundId] || i?.appId === mapping[foundId]);
                       if (realApp) {
                           handleLaunch(realApp);
                           message = <div>Launched {realApp.name}</div>;
                           actionTaken = true;
                           result = `Launched ${realApp.name}`;
                       }
                  }
             }
        } else if (callName === 'close_window') {
            const title = args.windowTitle?.toLowerCase();
            if (title) {
                const win = openWindows.find(w => w.item.name.toLowerCase().includes(title));
                if (win) {
                    closeWindow(win.id);
                    message = <div>Closed {win.item.name}</div>;
                    actionTaken = true;
                    result = `Closed ${win.item.name}`;
                }
            } else if (focusedId) {
                closeWindow(focusedId);
                message = <div>Closed active window</div>;
                actionTaken = true;
                result = "Closed active window";
            }
        } else if (callName === 'draft_email') {
            // NEW: Handle email drafting via AI
            // 1. Ensure Mail app is open
            let mailApp = openWindows.find(w => w.item.appId === 'mail');
            if (!mailApp) {
                const mailItem = desktopItems.find(i => i?.appId === 'mail');
                if (mailItem) {
                    handleLaunch(mailItem);
                    // Add small delay to allow render
                    await new Promise(r => setTimeout(r, 100));
                }
            }
            // 2. Dispatch event to MailApp
            window.dispatchEvent(new CustomEvent('trigger-compose-email', { 
                detail: { 
                    to: args.to, 
                    subject: args.subject, 
                    body: args.body 
                } 
            }));
            message = <div>Drafting email to {args.to}...</div>;
            actionTaken = true;
            result = `Draft created for ${args.to}`;
        }
        return { result, message, actionTaken };
    };

    const executeInkAction = async () => {
        if (strokes.length === 0) {
            showToast("Draw something first!", undefined, true);
            return;
        }
        setIsProcessing(true);
        try {
            const canvas = await html2canvas(document.body, {
                 ignoreElements: (element) => element.id === 'control-bar',
                 logging: false,
                 useCORS: true,
                 scale: 1 
            });
            const base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
            const ai = getAiClient();
            let activeTools = HOME_TOOLS;
            let contextDescription = 'Desktop (Home Screen)';
            if (focusedId) {
                const focusedWindow = openWindows.find(w => w.id === focusedId);
                if (focusedWindow?.item.appId === 'mail') {
                    activeTools = MAIL_TOOLS;
                    contextDescription = 'Mail App';
                }
            }
             logSystem(`Ink gesture analysis started on ${contextDescription}`, 'ai');
             const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: `Analyze the white ink drawings. The user is currently focused on: ${contextDescription}.` }
                ],
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION,
                    tools: activeTools,
                    temperature: 0.1,
                }
            });
            const functionCalls = response.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                let messages: React.ReactNode[] = [];
                let actionTaken = false;
                for (const call of functionCalls) {
                    const { message, actionTaken: taken } = await handleToolExecution(call.name, call.args, 'ink');
                    if (taken) actionTaken = true;
                    if (message) messages.push(message);
                }
                if (messages.length > 0) {
                    showToast(<div className="flex flex-col gap-3">{messages}</div>, messages.length === 1 && (messages[0] as any).key?.startsWith('sum') ? "Summary" : undefined, false);
                } else if (!actionTaken) {
                     showToast("Action not matched to any item.", undefined, true);
                }
            } else {
                 showToast("No action recognized.", undefined, true);
                 logSystem('No recognized gesture.', 'warning');
            }
        } catch (e) {
            console.error("Gemini Error:", e);
            showToast("Error processing.", undefined, true);
            logSystem('Gemini API Error.', 'error');
        } finally {
            setIsProcessing(false);
            setStrokes([]);
        }
    };

    const startLiveSession = async () => {
        const ai = getAiClient();
        const outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = outputContext;
        nextStartTimeRef.current = outputContext.currentTime;
        logSystem('Initiating Voice Session...', 'network');

        const session = await ai.live.connect({
            model: LIVE_MODEL_NAME,
            config: {
                tools: VOICE_TOOLS,
                systemInstruction: LIVE_SYSTEM_INSTRUCTION,
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
            },
            callbacks: {
                onopen: () => {
                    console.log('Live Session Connected');
                    showToast("Listening...", "Voice Control", false);
                    logSystem('Voice Session Connected.', 'success');
                },
                onmessage: async (msg: LiveServerMessage) => {
                     const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                     if (audioData) {
                         const buffer = await decodeAudioData(decode(audioData), outputContext, 24000, 1);
                         const source = outputContext.createBufferSource();
                         source.buffer = buffer;
                         source.connect(outputContext.destination);
                         const now = outputContext.currentTime;
                         const startTime = Math.max(now, nextStartTimeRef.current);
                         source.start(startTime);
                         nextStartTimeRef.current = startTime + buffer.duration;
                     }
                     if (msg.toolCall) {
                         for (const fc of msg.toolCall.functionCalls) {
                             const { result } = await handleToolExecution(fc.name, fc.args, 'voice');
                             session.sendToolResponse({
                                 functionResponses: [{
                                     id: fc.id,
                                     name: fc.name,
                                     response: { result: result || "Done" }
                                 }]
                             });
                         }
                     }
                },
                onclose: () => {
                     console.log('Live Session Closed');
                     setIsLive(false);
                     showToast("Voice session ended.");
                     logSystem('Voice Session Closed.', 'info');
                },
                onerror: (err) => {
                    console.error("Live Session Error", err);
                    setIsLive(false);
                    showToast("Connection error.");
                    logSystem('Voice Session Error.', 'error');
                }
            }
        });
        sessionRef.current = session;
        setIsLive(true);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const source = inputContext.createMediaStreamSource(stream);
        const processor = inputContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const blob = createBlob(inputData);
            session.sendRealtimeInput({
                media: blob
            });
        };
        source.connect(processor);
        processor.connect(inputContext.destination);
        const captureInterval = setInterval(async () => {
             if (!sessionRef.current) return;
             try {
                const canvas = await html2canvas(document.body, {
                    ignoreElements: (el) => el.id === 'control-bar' || el.tagName === 'CANVAS',
                    logging: false,
                    useCORS: true,
                    scale: 0.5 
                });
                const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                session.sendRealtimeInput({
                    media: { mimeType: 'image/jpeg', data: base64 }
                });
             } catch (e) { }
        }, 4000); 
        return () => {
             clearInterval(captureInterval);
             stream.getTracks().forEach(t => t.stop());
             processor.disconnect();
             source.disconnect();
             inputContext.close();
             outputContext.close();
        };
    };

    const toggleLive = async () => {
        if (isLive) {
            sessionRef.current?.close(); 
            setIsLive(false);
            sessionRef.current = null;
        } else {
            try {
                await startLiveSession();
            } catch (e) {
                console.error(e);
                showToast("Failed to start voice.");
            }
        }
    };

    const buttonBaseClasses = "relative overflow-hidden p-4 rounded-full transition-all duration-300 border-t border-white/5 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_2px_rgba(0,0,0,0.1)] active:scale-95";
    const glossOverlay = <div className="absolute inset-0 bg-[radial-gradient(at_top_left,_rgba(255,255,255,0.15)_0%,_transparent_60%)] pointer-events-none" />;
    const ICON_SIZE = 28;

    const handleGlobalPointerDown = (e: React.PointerEvent) => {
        if (toast) {
            const target = e.target as HTMLElement;
            if (!target.closest('.toast-card')) {
                setToast(null);
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
            }
        }
    };

    // --- RENDER LOGIC ---

    // 1. System Destruction State
    if (isPurged) {
        return (
            <div className="h-full w-full bg-black flex flex-col items-center justify-center text-red-700 font-mono select-none">
                <Skull size={64} className="mb-4 animate-pulse" />
                <h1 className="text-4xl font-bold tracking-widest mb-2">SYSTEM FAILURE</h1>
                <p className="text-sm tracking-wider">KERNEL PANIC: UNRECOVERABLE DATA LOSS</p>
                <p className="text-xs mt-8 opacity-50">ERROR_CODE: 0xDEADDEAD</p>
            </div>
        );
    }

    // 2. Auth Screen (Login/Register)
    // Removed BIOS Lock Screen - now defaults to Auth if no user.
    if (!user) {
        return <AuthScreen onBypass={handleBypassLogin} />;
    }

    // 3. Main Desktop Environment
    return (
        <div 
            className="h-full w-full bg-black text-os-text font-sans overflow-hidden relative" 
            onPointerDownCapture={handleGlobalPointerDown}
        >
            {/* Red Alert Overlay during breach */}
            {securityAlert && (
                 <div className="absolute inset-0 z-[500] pointer-events-none border-[12px] border-red-600/30 animate-pulse shadow-[inset_0_0_100px_rgba(255,0,0,0.2)]">
                     <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white font-bold px-6 py-1 rounded-b-lg shadow-lg animate-bounce">
                         {securityAlert}
                     </div>
                 </div>
            )}

            <div id="control-bar" className="fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-row items-center justify-center p-3 bg-zinc-950/70 backdrop-blur-2xl border border-zinc-800/50 shadow-3xl rounded-full z-[3000] transition-all hover:bg-zinc-950/90">
                <div className="flex items-center gap-3">
                    <button onClick={() => setInkMode(false)} className={`${buttonBaseClasses} ${!inkMode ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white' : 'bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-400 hover:text-zinc-200'}`} title="Cursor Mode">
                        {glossOverlay}
                        <MousePointer2 size={ICON_SIZE} className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
                    </button>
                    <button onClick={() => setInkMode(true)} className={`${buttonBaseClasses} ${inkMode ? 'bg-gradient-to-br from-red-500 to-red-700 text-white' : 'bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-400 hover:text-zinc-200'}`} title="Ink Mode">
                        {glossOverlay}
                        <PenLine size={ICON_SIZE} className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
                    </button>
                </div>
                <div className="h-8 w-px bg-white/20 mx-3" />
                 <button onClick={toggleLive} className={`${buttonBaseClasses} ${isLive ? 'bg-white text-red-600 animate-pulse-fast' : 'bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-400 hover:text-zinc-200'}`} title="Voice Control">
                        {glossOverlay}
                        {isLive ? <MicOff size={ICON_SIZE} className="relative z-10" /> : <Mic size={ICON_SIZE} className="relative z-10" />}
                 </button>
                <div className={`h-8 w-px bg-white/20 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${inkMode ? 'mx-3 opacity-100' : 'mx-0 w-0 opacity-0'}`} />
                <div className={`flex items-center gap-3 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden ${inkMode ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0'}`}>
                     <button onClick={executeInkAction} disabled={isProcessing || strokes.length === 0} className={`${buttonBaseClasses} ${isProcessing ? 'bg-zinc-700 cursor-wait' : strokes.length > 0 ? 'bg-gradient-to-br from-green-500 to-green-700 text-white' : 'bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-600'}`} title="Execute Ink Action">
                        {glossOverlay}
                        {isProcessing ? <Loader2 size={ICON_SIZE} className="animate-spin relative z-10" /> : <Play size={ICON_SIZE} fill="currentColor" className={`relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] ${strokes.length > 0 ? "ml-0.5" : ""}`} />}
                    </button>
                    <button onClick={() => setStrokes([])} disabled={strokes.length === 0} className={`${buttonBaseClasses} ${strokes.length > 0 ? 'bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-400 hover:text-red-400' : 'bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-700 cursor-not-allowed opacity-50'}`} title="Clear Ink">
                        {glossOverlay}
                        <Eraser size={ICON_SIZE} className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
                    </button>
                </div>
            </div>

            <div 
                className="h-full w-full relative overflow-hidden bg-zinc-900 transition-all duration-1000 ease-in-out"
                style={{
                    backgroundImage: wallpaperUrl 
                       ? `url(${wallpaperUrl})` 
                       : 'radial-gradient(circle at 50% 120%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 10% 100%, rgba(14, 165, 233, 0.1) 0%, transparent 30%), radial-gradient(circle at 90% 100%, rgba(139, 92, 246, 0.1) 0%, transparent 30%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                {/* User ID Overlay */}
                <div className="absolute top-4 right-4 z-50 text-[10px] text-white/50 font-mono tracking-widest pointer-events-none uppercase">
                    OPERATIVE: {userProfile ? userProfile.username || userProfile.email.split('@')[0] : user?.email} {userProfile?.messageCode ? `// CODE: ${userProfile.messageCode}` : ''}
                </div>

                <div className="h-full w-full" onMouseDown={() => focusWindow(null)}>
                     <HomeScreen items={desktopItems} onLaunch={handleLaunch} />
                </div>

                {openWindows.map(win => {
                    let content = null;
                    if (win.item.type === 'folder') content = <FolderView folder={win.item} />;
                    else if (win.item.appId === 'mail') content = <MailApp currentUser={user} />;
                    else if (win.item.appId === 'slides') content = <SlidesApp />;
                    else if (win.item.appId === 'snake') content = <SnakeGame />;
                    else if (win.item.appId === 'cyberbreak') content = <CyberBreak />;
                    else if (win.item.appId === 'notepad') content = <NotepadApp initialContent={win.item.notepadInitialContent} />;
                    else if (win.item.appId === 'browser') content = <BrowserApp />;
                    else if (win.item.appId === 'chat') content = <ChatApp />;
                    else if (win.item.appId === 'status') content = <SystemStatusApp />;
                    else if (win.item.appId === 'dashboard') content = <SecurityDashboardApp />;
                    else if (win.item.appId === 'profile') content = <ProfileApp />;
                    else if (win.item.appId === 'media') content = <MediaApp />;
                    else if (win.item.appId === 'admin') content = <AdminApp />;

                    return (
                        <DraggableWindow
                            key={win.id}
                            id={win.id}
                            title={win.item.name}
                            icon={win.item.icon}
                            initialPos={win.pos}
                            initialSize={win.size}
                            zIndex={win.zIndex}
                            isActive={focusedId === win.id}
                            onClose={() => closeWindow(win.id)}
                            onFocus={() => focusWindow(win.id)}
                        >
                            {content}
                        </DraggableWindow>
                    );
                })}

                <InkLayer active={inkMode} strokes={strokes} setStrokes={setStrokes} isProcessing={isProcessing} />

                {toast && (
                    <div className={`toast-card absolute bottom-36 left-1/2 -translate-x-1/2 backdrop-blur-xl px-8 py-6 rounded-[2rem] shadow-3xl z-[9999] animate-in slide-in-from-bottom-10 fade-in duration-300 border pointer-events-auto flex flex-col gap-2 transition-all ${toast.title === 'Summary' ? 'w-[60rem] max-w-[95vw]' : 'max-w-lg w-full'} ${toast.type === 'error' ? 'bg-red-950/90 text-white border-red-500/50' : toast.type === 'warning' ? 'bg-yellow-950/90 text-white border-yellow-500/50' : 'bg-zinc-900/95 text-white border-green-500/20'}`}>
                        {toast.title ? (
                            <>
                                <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-1">
                                     <span className="relative flex h-3 w-3 flex-shrink-0">
                                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-400'}`}></span>
                                      <span className={`relative inline-flex rounded-full h-3 w-3 ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                    </span>
                                    <h3 className={`${toast.title === 'Summary' ? 'text-5xl' : 'text-2xl'} font-bold tracking-tight ${toast.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{toast.title}</h3>
                                </div>
                                <div className={`text-zinc-200 leading-normal whitespace-pre-wrap ${toast.title === 'Summary' ? 'text-2xl' : 'text-base'}`}>
                                    {toast.message}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-start gap-4">
                                <span className="relative flex h-4 w-4 mt-1 flex-shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                                </span>
                                <span className="leading-relaxed flex-1 text-base font-medium whitespace-pre-wrap">{toast.message}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};