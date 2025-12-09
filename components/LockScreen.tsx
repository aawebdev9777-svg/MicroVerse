/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { Power, Cpu, ShieldCheck, Zap, Radio, ChevronRight } from 'lucide-react';

interface LockScreenProps {
    onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
    const [step, setStep] = useState(0);
    const [bootLog, setBootLog] = useState<string[]>([]);
    
    useEffect(() => {
        // High-performance sequence using timeouts instead of heavy canvas loops
        const sequence = async () => {
            // Step 0: Power On
            await new Promise(r => setTimeout(r, 500));
            setStep(1);
            
            // Step 1: Kernel Logs (Fast fake loading)
            const logs = [
                "MOUNTING VOLUMES...",
                "LOADING KERNEL v9.5...",
                "BYPASSING BIOS SECURITY...",
                "OPTIMIZING NEURAL ENGINES...",
                "ESTABLISHING SECURE HANDSHAKE..."
            ];
            
            for (const log of logs) {
                setBootLog(prev => [...prev, log]);
                await new Promise(r => setTimeout(r, 300));
            }

            // Step 2: System Ready
            setStep(2);
        };
        sequence();
    }, []);

    const handleEnter = () => {
        setStep(3); // Exit animation
        setTimeout(onUnlock, 800);
    };

    return (
        <div className={`fixed inset-0 z-[9999] bg-black text-emerald-500 font-mono flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-700 ${step === 3 ? 'opacity-0' : 'opacity-100'}`}>
            
            {/* Background Grid - CSS based (Lightweight) */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            
            {/* Content Container */}
            <div className="relative z-10 max-w-lg w-full p-8 flex flex-col items-center">
                
                {/* Logo / Core Icon */}
                <div className={`relative mb-8 transition-all duration-1000 ${step >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                    <div className="w-24 h-24 rounded-full border-2 border-emerald-500/30 flex items-center justify-center bg-emerald-950/20 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                        {step === 2 ? (
                            <Power size={48} className="text-emerald-400 animate-pulse" />
                        ) : (
                            <Cpu size={48} className="text-emerald-600 animate-spin-slow" />
                        )}
                    </div>
                    {/* Ring Animation */}
                    <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                </div>

                {/* Text Title */}
                <h1 className={`text-3xl font-black tracking-[0.3em] text-white mb-2 transition-all duration-1000 delay-300 ${step >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    MICROVERSE
                </h1>
                <div className={`flex items-center gap-2 text-xs font-bold tracking-widest text-emerald-600 mb-8 transition-all duration-1000 delay-500 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                    <ShieldCheck size={12} /> SYSTEM SECURE
                    <span className="mx-2">|</span>
                    <Zap size={12} /> OPTIMIZED
                </div>

                {/* Boot Log Window */}
                <div className="w-full bg-black/50 border-t border-b border-emerald-900/30 h-32 mb-8 p-4 overflow-hidden flex flex-col justify-end">
                    {bootLog.map((log, i) => (
                        <div key={i} className="text-xs text-emerald-500/70 truncate animate-in slide-in-from-left fade-in duration-300">
                            <span className="mr-2 text-emerald-800">&gt;</span>{log}
                        </div>
                    ))}
                    {step < 2 && (
                        <div className="text-xs text-emerald-500 animate-pulse">
                            <span className="mr-2 text-emerald-800">&gt;</span>_
                        </div>
                    )}
                </div>

                {/* Enter Button */}
                <button
                    onClick={handleEnter}
                    disabled={step < 2}
                    className={`group relative px-8 py-4 bg-emerald-900/20 border border-emerald-500/50 hover:bg-emerald-500 hover:border-emerald-400 text-emerald-400 hover:text-black font-bold tracking-widest transition-all duration-300 overflow-hidden ${step === 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                >
                    <span className="relative z-10 flex items-center gap-2">
                        INITIALIZE SESSION <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 z-0"></div>
                </button>

            </div>

            {/* Footer */}
            <div className="absolute bottom-6 flex gap-8 text-[10px] text-emerald-800 font-bold tracking-widest uppercase">
                <span className="flex items-center gap-1"><Radio size={10} className={step === 2 ? "animate-pulse" : ""} /> ONLINE</span>
                <span>v9.5.2</span>
                <span>CPU: NOMINAL</span>
            </div>
        </div>
    );
};