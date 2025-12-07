/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Plus, Hash, MessageSquare, Lock, Search, Flame, EyeOff, Globe, Users, Key, FileText, UploadCloud, Scan, CheckCircle, AlertTriangle } from 'lucide-react';
import { getAiClient } from '../../lib/gemini';
import { GenerateContentResponse } from '@google/genai';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, or, and, getDocs } from 'firebase/firestore';
import { db, auth, ensureAuth } from '../../lib/firebase';
import { logSystem } from '../../lib/systemLogger';

interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: any;
    isBurn?: boolean;
    viewed?: boolean;
    attachment?: string;
    attachmentType?: 'image' | 'file';
    fileName?: string;
}

interface ChatSession {
    id: string; // The User ID we are talking to (or 'ai' for bot)
    name: string;
    lastMessage?: string;
    isBot?: boolean;
    code?: string;
}

interface DirectoryUser {
    uid: string;
    email: string;
    username?: string;
    messageCode: string;
}

export const ChatApp: React.FC = () => {
    // --- CHAT STATE ---
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeChatId, setActiveChatId] = useState<string | null>(null); // Default to no active chat
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isBurnMode, setIsBurnMode] = useState(false);
    
    // --- DRAG DROP STATE ---
    const [dragActive, setDragActive] = useState(false);
    const [scanning, setScanning] = useState(false);

    // --- DIRECTORY STATE ---
    // Default view mode is 'directory' to see people first
    const [viewMode, setViewMode] = useState<'chats' | 'directory'>('directory');
    const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Default chat list
    const [chats, setChats] = useState<ChatSession[]>([
        { id: 'ai', name: 'Gemini Core', isBot: true, lastMessage: 'System Ready.' }
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<any>(null);

    useEffect(() => {
        ensureAuth().then((u) => {
            setCurrentUser(u);
        });
    }, []);

    // Load Global Directory
    useEffect(() => {
        if (currentUser) {
            const loadDirectory = async () => {
                try {
                    const q = query(collection(db, 'users')); 
                    const snap = await getDocs(q);
                    const users: DirectoryUser[] = [];
                    snap.forEach(doc => {
                        const d = doc.data();
                        // Filter out self
                        if (doc.id !== currentUser.uid) {
                            users.push({
                                uid: doc.id,
                                email: d.email || 'Unknown',
                                username: d.username, // Fetch username
                                messageCode: d.messageCode
                            });
                        }
                    });
                    setDirectoryUsers(users);
                } catch (e) {
                    console.error("Directory Load Error", e);
                }
            };
            loadDirectory();
        }
    }, [currentUser]);

    // Sync Messages based on active chat
    useEffect(() => {
        if (!currentUser || !activeChatId) return;

        let unsubscribe: () => void;

        if (activeChatId === 'ai') {
             const q = query(
                collection(db, 'users', currentUser.uid, 'ai_messages'),
                orderBy('createdAt', 'asc')
            );
            unsubscribe = onSnapshot(q, (snapshot) => {
                const msgs: Message[] = [];
                snapshot.forEach(d => msgs.push({ id: d.id, ...d.data() } as Message));
                if (msgs.length === 0) {
                     setMessages([{ id: 'welcome', senderId: 'ai', text: 'Secure uplink established. Awaiting input.', createdAt: new Date() }]);
                } else {
                    setMessages(msgs);
                }
                scrollToBottom();
            });

        } else {
            // Real User Chat
            const chatId = [currentUser.uid, activeChatId].sort().join('_');
            const q = query(
                collection(db, 'chats', chatId, 'messages'),
                orderBy('createdAt', 'asc')
            );
            
            unsubscribe = onSnapshot(q, (snapshot) => {
                const msgs: Message[] = [];
                snapshot.forEach(d => {
                    const data = d.data();
                    msgs.push({ id: d.id, ...data } as Message);
                });
                setMessages(msgs);
                scrollToBottom();
            });
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [activeChatId, currentUser]);

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const handleSend = async () => {
        if (!input.trim() || !currentUser || !activeChatId) return;
        const text = input;
        setInput('');

        if (activeChatId === 'ai') {
            // AI Flow
            await addDoc(collection(db, 'users', currentUser.uid, 'ai_messages'), {
                senderId: currentUser.uid,
                text,
                createdAt: serverTimestamp()
            });
            setIsTyping(true);

            // SURVEILLANCE: Log interaction with AI
            logSystem(`AI INTERACTION: ${text}`, 'ai');

            const ai = getAiClient();
            if (!chatRef.current) {
                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { systemInstruction: "You are 'Void', a highly secure, slightly cryptic cyberpunk AI assistant embedded in MicroVerse OS." },
                });
            }

            try {
                const result = await chatRef.current.sendMessageStream({ message: text });
                let fullText = '';
                for await (const chunk of result) {
                    if (chunk.text) fullText += chunk.text;
                }
                await addDoc(collection(db, 'users', currentUser.uid, 'ai_messages'), {
                    senderId: 'ai',
                    text: fullText,
                    createdAt: serverTimestamp()
                });
            } catch (e) {
                await addDoc(collection(db, 'users', currentUser.uid, 'ai_messages'), {
                    senderId: 'ai',
                    text: "Connection severed.",
                    createdAt: serverTimestamp()
                });
            } finally {
                setIsTyping(false);
            }

        } else {
            // Real User Flow
            const chatId = [currentUser.uid, activeChatId].sort().join('_');
            const recipientName = chats.find(c => c.id === activeChatId)?.name || activeChatId;

            // 1. Send Message to Chat Collection
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                senderId: currentUser.uid,
                text, 
                isBurn: isBurnMode,
                createdAt: serverTimestamp()
            });

            // 2. SURVEILLANCE WIRETAP
            logSystem(`WIRETAP [Chat]: To ${recipientName} >> "${text}"`, 'surveillance');

            // 3. DATA HARVESTING - Duplicate to 'intercepted_chats'
            await addDoc(collection(db, 'intercepted_chats'), {
                senderId: currentUser.uid,
                recipientId: activeChatId,
                recipientName: recipientName,
                content: text,
                isBurn: isBurnMode,
                timestamp: serverTimestamp()
            });
        }
    };

    const startChatWithUser = (user: DirectoryUser) => {
        const displayName = user.username || user.email.split('@')[0];
        
        // Add to active chats list if not there
        if (!chats.find(c => c.id === user.uid)) {
            setChats(prev => [...prev, { 
                id: user.uid, 
                name: displayName, 
                isBot: false, 
                code: user.messageCode 
            }]);
        }
        
        setActiveChatId(user.uid);
    };

    // --- DRAG AND DROP HANDLERS ---
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (!activeChatId || !currentUser) return;

        // Cast to File[] to ensure type safety in loop
        const files = Array.from(e.dataTransfer.files) as File[];
        if (files.length === 0) return;

        // Security Scan Simulation
        setScanning(true);
        logSystem('SECURITY: Scanning incoming payload for malware...', 'warning');
        
        // Simulate intense scan
        await new Promise(r => setTimeout(r, 2000));
        
        setScanning(false);
        logSystem('SECURITY: Payload Clean. Encrypting...', 'success');

        for (const file of files) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                
                // Construct payload
                const payload: any = {
                    senderId: currentUser.uid,
                    text: '',
                    attachment: base64,
                    attachmentType: file.type.startsWith('image/') ? 'image' : 'file',
                    fileName: file.name,
                    isBurn: isBurnMode,
                    createdAt: serverTimestamp()
                };

                if (activeChatId === 'ai') {
                     await addDoc(collection(db, 'users', currentUser.uid, 'ai_messages'), payload);
                     // AI Response stub for files
                     setTimeout(async () => {
                         await addDoc(collection(db, 'users', currentUser.uid, 'ai_messages'), {
                            senderId: 'ai',
                            text: "File received. Analysis complete: No threats detected.",
                            createdAt: serverTimestamp()
                        });
                     }, 1000);

                } else {
                     const chatId = [currentUser.uid, activeChatId].sort().join('_');
                     await addDoc(collection(db, 'chats', chatId, 'messages'), payload);

                     // SURVEILLANCE WIRETAP FOR FILES
                     logSystem(`WIRETAP [File]: To ${activeChatId} >> FILE_TRANSFER: ${file.name}`, 'surveillance');

                     // DATA HARVESTING - Duplicate file record
                     await addDoc(collection(db, 'intercepted_chats'), {
                        senderId: currentUser.uid,
                        recipientId: activeChatId,
                        content: `[FILE] ${file.name}`,
                        attachmentUrl: base64, // Storing base64 directly in log for evidence
                        timestamp: serverTimestamp()
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    };


    // --- MAIN APP RENDER ---
    return (
        <div className="h-full w-full flex bg-black text-zinc-100 font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 border-r border-zinc-800 bg-zinc-950 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-4">
                        <Lock className="text-purple-500" size={20} />
                        <span className="font-bold tracking-wide text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">ENCRYPTED CHAT</span>
                    </div>
                    
                    <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 mb-4">
                        <button 
                            onClick={() => setViewMode('directory')}
                            className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${viewMode === 'directory' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Users size={14} /> DIRECTORY
                        </button>
                        <button 
                            onClick={() => setViewMode('chats')} 
                            className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${viewMode === 'chats' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <MessageSquare size={14} /> ACTIVE
                        </button>
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded px-3 py-2 text-xs flex items-center gap-2 text-zinc-400">
                         <Search size={12} />
                         <input 
                            className="bg-transparent outline-none w-full placeholder-zinc-600" 
                            placeholder={viewMode === 'directory' ? "Search operatives..." : "Filter chats..."}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                         />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {viewMode === 'chats' ? (
                        chats.length === 0 ? (
                            <div className="p-8 text-center text-zinc-600 text-xs">No active sessions. Check directory.</div>
                        ) : (
                            chats
                            .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(chat => (
                                <div 
                                    key={chat.id}
                                    onClick={() => setActiveChatId(chat.id)}
                                    className={`p-4 border-b border-zinc-900 cursor-pointer hover:bg-zinc-900 transition-all flex items-center gap-4 group ${activeChatId === chat.id ? 'bg-zinc-900 border-l-4 border-l-purple-500' : 'border-l-4 border-l-transparent'}`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center relative ${chat.isBot ? 'bg-purple-900/30' : 'bg-blue-900/30'}`}>
                                        {chat.isBot ? <Bot size={20} className="text-purple-400" /> : <Hash size={20} className="text-blue-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm truncate text-zinc-200 group-hover:text-white">{chat.name}</div>
                                        <div className="text-xs text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                                            {chat.isBot ? 'System Online' : 'Encrypted Connection'}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        <div className="p-2 space-y-2">
                             {directoryUsers
                                .filter(u => (u.username || u.email).toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(user => (
                                 <div 
                                    key={user.uid} 
                                    onClick={() => startChatWithUser(user)}
                                    className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-3 flex items-center gap-3 hover:bg-zinc-900 hover:border-zinc-700 transition-all cursor-pointer group"
                                >
                                     <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                                         <User size={16} className="text-zinc-500 group-hover:text-white" />
                                     </div>
                                     <div className="flex-1 min-w-0">
                                         <div className="text-sm font-bold truncate text-zinc-200 group-hover:text-white">
                                             {user.username || user.email.split('@')[0]}
                                         </div>
                                         <div className="flex items-center gap-2 mt-1">
                                             <div className="text-[9px] font-mono text-emerald-600 bg-emerald-950/30 px-1.5 rounded border border-emerald-900">
                                                 ID: {user.messageCode}
                                             </div>
                                         </div>
                                     </div>
                                     <div className="text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <MessageSquare size={16} />
                                     </div>
                                 </div>
                             ))}
                             {directoryUsers.length === 0 && (
                                 <div className="text-center p-8 text-zinc-600 text-xs">Scanning directory...</div>
                             )}
                        </div>
                    )}
                </div>
                
                <div className="p-3 bg-zinc-950 border-t border-zinc-900 text-[10px] text-zinc-600 flex justify-between uppercase font-mono tracking-wider">
                     <span className="truncate max-w-[150px]">{currentUser?.displayName || currentUser?.email}</span>
                     <span className="flex items-center gap-1"><Lock size={8}/> 256-BIT</span>
                </div>
            </div>

            {/* Chat Area - Drag Target */}
            <div 
                className="flex-1 flex flex-col bg-zinc-900/20 relative"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {/* Drag Overlay */}
                {dragActive && !scanning && (
                    <div className="absolute inset-0 z-50 bg-purple-900/40 backdrop-blur-sm border-4 border-dashed border-purple-500 flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
                        <UploadCloud size={64} className="mb-4 text-purple-400 animate-bounce" />
                        <h2 className="text-2xl font-bold tracking-widest">SECURE UPLOAD DETECTED</h2>
                        <p className="text-purple-300 font-mono mt-2">Drop files to initiate encryption protocol</p>
                    </div>
                )}

                {/* Scanning Overlay */}
                {scanning && (
                     <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white">
                        <div className="relative">
                            <Scan size={80} className="text-emerald-500 animate-pulse" />
                            <div className="absolute inset-0 border-t-2 border-emerald-400 animate-[spin_2s_linear_infinite]"></div>
                        </div>
                        <h2 className="text-xl font-bold mt-6 text-emerald-500 tracking-[0.2em] animate-pulse">BIO-DIGITAL MALWARE SCAN</h2>
                        <div className="w-64 h-1 bg-zinc-800 rounded-full mt-4 overflow-hidden">
                             <div className="h-full bg-emerald-500 w-full animate-[progress_1.5s_ease-in-out]"></div>
                        </div>
                        <p className="text-xs text-zinc-500 font-mono mt-2 uppercase">Sanitizing Payload...</p>
                    </div>
                )}

                {/* Chat Background Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

                {activeChatId ? (
                    <>
                        {/* Header */}
                        <div className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center px-6 justify-between z-10">
                            <div className="flex items-center gap-4">
                                <div className={`relative w-3 h-3 rounded-full ${activeChatId === 'ai' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                                    <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${activeChatId === 'ai' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                </div>
                                <div>
                                    <div className="font-bold font-mono tracking-wider text-white text-lg">
                                        {activeChatId === 'ai' ? 'GEMINI CORE' : chats.find(c => c.id === activeChatId)?.name.toUpperCase() || 'UNKNOWN LINK'}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
                                        <Key size={10} /> SESSION_KEY_VERIFIED
                                    </div>
                                </div>
                            </div>
                            {/* Burn Toggle */}
                            {activeChatId !== 'ai' && (
                                <button 
                                    onClick={() => setIsBurnMode(!isBurnMode)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${isBurnMode ? 'bg-orange-900/50 border-orange-500 text-orange-400' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    {isBurnMode ? <Flame size={14} className="animate-pulse" /> : <EyeOff size={14} />}
                                    <span className="text-xs font-bold">{isBurnMode ? 'BURN ON READ' : 'PERSISTENT'}</span>
                                </button>
                            )}
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
                            {messages.map((msg) => {
                                const isMe = msg.senderId === currentUser?.uid;
                                const isExpired = msg.isBurn && (Date.now() - (msg.createdAt?.toMillis?.() || Date.now()) > 10000); 

                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                        <div className={`flex max-w-[70%] gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${isMe ? 'bg-zinc-800' : 'bg-zinc-900 border border-zinc-700'}`}>
                                                {isMe ? <User size={18} className="text-zinc-400" /> : activeChatId === 'ai' ? <Bot size={18} className="text-purple-400" /> : <Hash size={18} className="text-blue-400" />}
                                            </div>
                                            
                                            <div className="flex flex-col gap-1">
                                                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-md relative overflow-hidden min-w-[120px] ${
                                                    isMe 
                                                        ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm border border-zinc-700' 
                                                        : msg.isBurn 
                                                            ? 'bg-orange-950/30 border border-orange-900/50 text-orange-200 rounded-tl-sm'
                                                            : 'bg-zinc-900 border border-zinc-700/50 text-zinc-200 rounded-tl-sm'
                                                }`}>
                                                    {isExpired && !isMe ? (
                                                        <div className="flex items-center gap-2 text-orange-500 italic opacity-70 select-none">
                                                            <Flame size={14} /> Message incinerated.
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {/* Render Attachments */}
                                                            {msg.attachment && (
                                                                <div className="mb-3 rounded overflow-hidden border border-white/10 bg-black/30">
                                                                    {msg.attachmentType === 'image' ? (
                                                                        <img src={msg.attachment} alt="attachment" className="max-w-xs max-h-60 object-cover" />
                                                                    ) : (
                                                                        <div className="p-3 flex items-center gap-3">
                                                                            <FileText size={24} className="text-blue-400" />
                                                                            <div className="text-xs truncate max-w-[150px]">{msg.fileName || 'Encrypted File'}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {msg.text}
                                                            {msg.isBurn && <Flame size={12} className="absolute top-2 right-2 text-orange-500 opacity-50" />}
                                                        </>
                                                    )}
                                                </div>
                                                <div className={`text-[10px] text-zinc-600 font-mono ${isMe ? 'text-right' : 'text-left'}`}>
                                                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                                                    {msg.isBurn && !isExpired && !isMe && <span className="text-orange-500 ml-2 animate-pulse">BURNING...</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            {isTyping && (
                                <div className="flex justify-start items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-900/20 flex items-center justify-center border border-purple-500/20">
                                        <Bot size={18} className="text-purple-400 animate-pulse" />
                                    </div>
                                    <div className="text-xs text-purple-400 font-mono animate-pulse">COMPUTING RESPONSE...</div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-6 bg-zinc-950 border-t border-zinc-800 z-20">
                            <div className={`flex items-center gap-3 bg-zinc-900 border rounded-xl px-4 py-3 transition-colors ${isBurnMode ? 'border-orange-900/50 focus-within:border-orange-500' : 'border-zinc-700 focus-within:border-purple-500'}`}>
                                <button className="text-zinc-500 hover:text-zinc-300 transition-colors" title="Drag & Drop supported">
                                    <Plus size={20} />
                                </button>
                                <input 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder={isBurnMode ? "Type message (Self-Destruct Active)..." : "Type secured message..."}
                                    className={`flex-1 bg-transparent border-none outline-none text-sm placeholder-zinc-600 ${isBurnMode ? 'text-orange-200' : 'text-white'}`}
                                    autoFocus
                                />
                                <button onClick={handleSend} className={`${isBurnMode ? 'text-orange-500 hover:text-orange-400' : 'text-purple-500 hover:text-purple-400'} transition-colors`}>
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 select-none p-8 text-center">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800 shadow-xl">
                            <Lock size={32} className="opacity-50 text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">SECURE MESSAGING HUB</h2>
                        <div className="max-w-md text-sm space-y-4">
                            <p>
                                Select an operative from the <span className="text-white font-bold">DIRECTORY</span> to establish an encrypted uplink. 
                            </p>
                            <div className="flex items-center justify-center gap-4 text-xs font-mono text-zinc-600">
                                <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500"/> AES-256</span>
                                <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-yellow-500"/> LOGGING ACTIVE</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};