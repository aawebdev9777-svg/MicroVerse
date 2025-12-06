/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { User, Copy, Check, Shield, Lock, Fingerprint, RefreshCw } from 'lucide-react';
import { auth, ensureAuth } from '../../lib/firebase';

export const ProfileApp: React.FC = () => {
    const [uid, setUid] = useState<string>('Loading identity...');
    const [copied, setCopied] = useState(false);
    const [status, setStatus] = useState('ENCRYPTED');

    useEffect(() => {
        const load = async () => {
            const user = await ensureAuth();
            if (user) setUid(user.uid);
        };
        load();
    }, []);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(uid);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="h-full w-full bg-zinc-950 text-zinc-200 flex flex-col font-sans relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="p-8 flex flex-col items-center justify-center flex-1 z-10">
                <div className="relative mb-6 group cursor-pointer">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-zinc-800 to-black border-2 border-zinc-700 flex items-center justify-center shadow-2xl relative z-10 group-hover:border-blue-500 transition-colors">
                        <User size={64} className="text-zinc-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="absolute inset-0 rounded-full border border-blue-500/30 scale-110 animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-0 rounded-full border border-dashed border-zinc-600 scale-125 animate-[spin_15s_linear_infinite_reverse]"></div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-1">OPERATIVE IDENTITY</h2>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 mb-8 bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-900">
                    <Shield size={12} /> VERIFIED // LEVEL 5 CLEARANCE
                </div>

                <div className="w-full max-w-md bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 space-y-6">
                    <div>
                        <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Secure ID (Share to Message)</label>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-black border border-zinc-800 rounded-lg p-3 font-mono text-sm text-zinc-300 truncate select-all">
                                {uid}
                            </div>
                            <button 
                                onClick={copyToClipboard}
                                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white p-3 rounded-lg transition-colors"
                            >
                                {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/30 p-3 rounded-lg border border-zinc-800">
                            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                                <Lock size={12} /> ENCRYPTION
                            </div>
                            <div className="text-emerald-400 font-mono text-sm">AES-256-GCM</div>
                        </div>
                        <div className="bg-black/30 p-3 rounded-lg border border-zinc-800">
                            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                                <Fingerprint size={12} /> BIOMETRICS
                            </div>
                            <div className="text-blue-400 font-mono text-sm">ACTIVE</div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
                        <span className="text-xs text-zinc-600">Session ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                        <button className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                            <RefreshCw size={12} /> RESET KEYS
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};