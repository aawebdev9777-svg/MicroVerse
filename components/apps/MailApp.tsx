/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { Mail, Trash2, Inbox, Send, Plus, ArrowLeft, RefreshCw, UserCheck, Shield, Sparkles, UploadCloud, FileText } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { logSystem } from '../../lib/systemLogger';

interface RealEmail {
    id: string;
    fromEmail: string;
    toEmail: string;
    subject: string;
    body: string;
    createdAt: any;
    read: boolean;
    folder: 'inbox' | 'sent';
}

interface MailAppProps {
    currentUser: any;
}

export const MailApp: React.FC<MailAppProps> = ({ currentUser }) => {
    const [view, setView] = useState<'inbox' | 'sent' | 'compose'>('inbox');
    const [selectedEmail, setSelectedEmail] = useState<RealEmail | null>(null);
    const [inboxEmails, setInboxEmails] = useState<RealEmail[]>([]);
    const [sentEmails, setSentEmails] = useState<RealEmail[]>([]);
    
    // Compose State
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [recipientStatus, setRecipientStatus] = useState<'idle' | 'checking' | 'found' | 'not-found'>('idle');
    const [dragActive, setDragActive] = useState(false);

    // AI Draft Listener
    useEffect(() => {
        const handleDraft = (e: CustomEvent) => {
            const { to: aiTo, subject: aiSubject, body: aiBody } = e.detail;
            if (aiTo) setTo(aiTo);
            if (aiSubject) setSubject(aiSubject);
            if (aiBody) setBody(aiBody);
            setView('compose');
            logSystem('AI: Email draft generated.', 'ai');
        };

        window.addEventListener('trigger-compose-email' as any, handleDraft);
        return () => window.removeEventListener('trigger-compose-email' as any, handleDraft);
    }, []);

    // Sync Inbox
    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'users', currentUser.uid, 'inbox'),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const mails: RealEmail[] = [];
            snapshot.forEach(d => mails.push({ id: d.id, folder: 'inbox', ...d.data() } as RealEmail));
            setInboxEmails(mails);
        });
        return () => unsub();
    }, [currentUser]);

    // Sync Sent
    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'users', currentUser.uid, 'sent_mail'),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const mails: RealEmail[] = [];
            snapshot.forEach(d => mails.push({ id: d.id, folder: 'sent', ...d.data() } as RealEmail));
            setSentEmails(mails);
        });
        return () => unsub();
    }, [currentUser]);

    const checkRecipient = async () => {
        if (!to.includes('@')) return;
        setRecipientStatus('checking');
        const q = query(collection(db, 'users'), where('email', '==', to));
        const snap = await getDocs(q);
        if (!snap.empty) {
            setRecipientStatus('found');
        } else {
            setRecipientStatus('not-found');
        }
    };

    const handleSend = async () => {
        if (!to || !subject || !currentUser) return;
        setSending(true);
        logSystem(`MAIL: Resolving recipient ${to}...`, 'network');
        
        try {
            // 1. Find Recipient UID
            const q = query(collection(db, 'users'), where('email', '==', to));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                throw new Error("Recipient not found in MicroVerse Directory.");
            }
            
            const targetUser = snap.docs[0];
            const targetUid = targetUser.id;

            const emailData = {
                fromEmail: currentUser.email,
                toEmail: to,
                subject,
                body,
                read: false,
                createdAt: serverTimestamp()
            };

            // 2. Add to Recipient Inbox
            await addDoc(collection(db, 'users', targetUid, 'inbox'), emailData);
            
            // 3. Add to My Sent Folder
            await addDoc(collection(db, 'users', currentUser.uid, 'sent_mail'), emailData);

            logSystem(`MAIL: Encrypted transmission sent to ${to}.`, 'success');
            
            // Reset
            setTo('');
            setSubject('');
            setBody('');
            setView('inbox');
            setRecipientStatus('idle');

        } catch (e: any) {
            console.error(e);
            logSystem(`MAIL ERROR: ${e.message}`, 'error');
            alert(`Delivery Failed: ${e.message}`);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (email: RealEmail) => {
        if (!currentUser) return;
        try {
            const collectionName = email.folder === 'inbox' ? 'inbox' : 'sent_mail';
            await deleteDoc(doc(db, 'users', currentUser.uid, collectionName, email.id));
            if (selectedEmail?.id === email.id) setSelectedEmail(null);
            logSystem('MAIL: Message deleted.', 'info');
        } catch (e) {
            console.error(e);
        }
    };
    
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (view !== 'compose') return;

        const files = Array.from(e.dataTransfer.files) as File[];
        if (files.length > 0) {
             const names = files.map(f => f.name).join(', ');
             setBody(prev => prev + `\n\n[ATTACHMENT ENCRYPTED: ${names}]`);
             logSystem('MAIL: Attachment linked to encrypted envelope.', 'info');
        }
    };

    const displayedEmails = view === 'sent' ? sentEmails : inboxEmails;

    return (
        <div className="h-full w-full bg-black/90 flex text-zinc-200 font-sans border border-zinc-800 relative overflow-hidden backdrop-blur-md">
            {/* Ambient Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Sidebar */}
            <div className="w-16 md:w-56 bg-zinc-950/50 border-r border-zinc-800 flex-shrink-0 flex flex-col z-10 backdrop-blur-xl">
                <div className="p-4 font-bold text-lg flex items-center gap-2 text-blue-400 border-b border-zinc-800/50">
                    <Shield size={20} className="text-blue-500" /> 
                    <span className="hidden md:inline tracking-wider">SECURE MAIL</span>
                </div>
                
                <div className="p-4">
                    <button 
                        onClick={() => { setView('compose'); setSelectedEmail(null); }}
                        className="w-full flex items-center justify-center md:justify-start gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" /> <span className="hidden md:inline">COMPOSE</span>
                    </button>
                </div>

                <nav className="flex flex-col gap-1 px-2">
                    <button onClick={() => setView('inbox')} className={`flex items-center justify-center md:justify-start gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'inbox' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}`}>
                        <Inbox size={18} /> <span className="hidden md:inline">Inbox</span>
                        {inboxEmails.filter(e => !e.read).length > 0 && (
                            <span className="ml-auto bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full hidden md:inline shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                {inboxEmails.filter(e => !e.read).length}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setView('sent')} className={`flex items-center justify-center md:justify-start gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'sent' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}`}>
                        <Send size={18} /> <span className="hidden md:inline">Sent</span>
                    </button>
                </nav>
                
                <div className="mt-auto p-4 border-t border-zinc-900 bg-black/40">
                    <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider truncate">
                        ID: {currentUser?.email}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden bg-zinc-900/20 relative z-10">
                
                {/* Compose View */}
                {view === 'compose' ? (
                    <div 
                        className="flex-1 p-8 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300 relative"
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        {dragActive && (
                            <div className="absolute inset-0 z-50 bg-blue-900/40 backdrop-blur-sm border-4 border-dashed border-blue-500 flex flex-col items-center justify-center text-white pointer-events-none">
                                <UploadCloud size={64} className="mb-4 text-blue-400 animate-bounce" />
                                <h2 className="text-2xl font-bold tracking-widest">ATTACH TO ENVELOPE</h2>
                            </div>
                        )}

                        <div className="max-w-3xl mx-auto bg-zinc-950/80 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
                            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
                                    <Sparkles size={18} className="text-blue-400" /> New Transmission
                                </h2>
                                <button onClick={() => setView('inbox')} className="text-zinc-500 hover:text-white transition-colors"><ArrowLeft size={18}/></button>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase text-blue-400 font-bold tracking-wider">Recipient Target</label>
                                    <div className="relative">
                                        <input 
                                            className={`w-full bg-black/50 border rounded-lg p-3 text-white focus:outline-none transition-colors pr-10 font-mono text-sm ${recipientStatus === 'found' ? 'border-emerald-500/50 text-emerald-300' : recipientStatus === 'not-found' ? 'border-red-500/50' : 'border-zinc-800 focus:border-blue-500'}`}
                                            placeholder="agent@microverse.net"
                                            value={to}
                                            onChange={e => setTo(e.target.value)}
                                            onBlur={checkRecipient}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {recipientStatus === 'checking' && <RefreshCw size={14} className="animate-spin text-zinc-500" />}
                                            {recipientStatus === 'found' && <UserCheck size={16} className="text-emerald-500" />}
                                        </div>
                                    </div>
                                    {recipientStatus === 'not-found' && <div className="text-xs text-red-500 flex items-center gap-1"><Shield size={10} /> Target not found in directory.</div>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Subject Vector</label>
                                    <input 
                                        className="w-full bg-black/50 border border-zinc-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors font-medium"
                                        placeholder="Mission Report..."
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Payload Data</label>
                                    <textarea 
                                        className="w-full h-64 bg-black/50 border border-zinc-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors resize-none font-mono text-sm leading-relaxed"
                                        placeholder="Encrypted message content..."
                                        value={body}
                                        onChange={e => setBody(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={handleSend}
                                        disabled={sending || !to || recipientStatus === 'not-found'}
                                        className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                    >
                                        {sending ? 'ENCRYPTING & SENDING...' : 'TRANSMIT'} <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Split View: List | Reading */
                    <>
                        {/* List */}
                        <div className={`${selectedEmail ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 border-r border-zinc-800 bg-zinc-950/60 backdrop-blur-md`}>
                            <div className="p-3 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between items-center bg-black/20">
                                <span>{view === 'sent' ? 'OUTGOING LOG' : 'INCOMING LOG'} ({displayedEmails.length})</span>
                            </div>
                            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                                {displayedEmails.length === 0 ? (
                                    <div className="p-8 text-center text-zinc-600 flex flex-col items-center mt-20">
                                        <Inbox size={32} className="mb-2 opacity-50 text-blue-900" />
                                        <p className="text-xs">No communications intercepted.</p>
                                    </div>
                                ) : (
                                    displayedEmails.map(email => (
                                        <div
                                            key={email.id}
                                            onClick={() => setSelectedEmail(email)}
                                            className={`p-4 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-900/80 transition-all ${selectedEmail?.id === email.id ? 'bg-blue-900/10 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'}`}
                                        >
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className={`text-sm truncate max-w-[140px] ${!email.read && view === 'inbox' ? 'text-blue-100 font-bold' : 'text-zinc-400'}`}>
                                                    {view === 'sent' ? <span className="text-zinc-500 text-[10px] mr-1 uppercase">TO:</span> : <span className="text-zinc-500 text-[10px] mr-1 uppercase">FROM:</span>}
                                                    {view === 'sent' ? email.toEmail.split('@')[0] : email.fromEmail.split('@')[0]}
                                                </span>
                                                <span className="text-[9px] text-zinc-600 flex-shrink-0 font-mono">
                                                    {email.createdAt?.toDate ? email.createdAt.toDate().toLocaleDateString() : 'Now'}
                                                </span>
                                            </div>
                                            <div className={`text-xs mb-1 truncate ${!email.read && view === 'inbox' ? 'text-zinc-200' : 'text-zinc-500'}`}>{email.subject}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Reading Pane */}
                        <div className={`${selectedEmail ? 'block' : 'hidden lg:block'} flex-1 bg-zinc-950/40 relative backdrop-blur-sm`}>
                             {/* Background Pattern */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.03)_0%,_transparent_50%)] pointer-events-none"></div>

                            {selectedEmail ? (
                                <div className="h-full flex flex-col">
                                    {/* Toolbar */}
                                    <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur">
                                        <button className="lg:hidden text-zinc-400 flex items-center gap-1 text-xs font-bold uppercase" onClick={() => setSelectedEmail(null)}>
                                            <ArrowLeft size={14} /> Back
                                        </button>
                                        <div className="flex gap-2 ml-auto">
                                            <button onClick={() => handleDelete(selectedEmail)} className="p-2 hover:bg-red-900/30 text-zinc-500 hover:text-red-500 rounded transition-colors" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8">
                                        <h2 className="text-2xl font-bold mb-6 text-white leading-tight tracking-tight">{selectedEmail.subject}</h2>
                                        
                                        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-zinc-800/50">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-900 to-indigo-900 border border-blue-700/30 flex items-center justify-center text-blue-200 font-bold shadow-lg">
                                                {selectedEmail.fromEmail[0].toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-baseline justify-between">
                                                    <div className="font-bold text-zinc-200">
                                                        <span className="text-zinc-500 text-xs uppercase mr-2 font-normal">FROM:</span>
                                                        {selectedEmail.fromEmail}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 font-mono">
                                                        {selectedEmail.createdAt?.toDate ? selectedEmail.createdAt.toDate().toLocaleString() : 'Processing...'}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-zinc-400 mt-1">
                                                     <span className="text-zinc-500 text-xs uppercase mr-2 font-normal">TO:</span>
                                                     {selectedEmail.toEmail === currentUser.email ? 'Me' : selectedEmail.toEmail}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-zinc-300 leading-7 whitespace-pre-wrap font-sans text-sm p-4 bg-black/20 rounded-lg border border-white/5 shadow-inner min-h-[200px]">
                                            {selectedEmail.body}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-700 select-none">
                                    <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                                        <Mail size={48} className="opacity-20 text-blue-500" />
                                    </div>
                                    <p className="text-sm font-mono uppercase tracking-widest opacity-50">Secure Transmission Uplink Ready</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};