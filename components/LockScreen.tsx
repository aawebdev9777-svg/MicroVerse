/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertTriangle, Fingerprint, Scan, Eye } from 'lucide-react';
import { logSystem } from '../lib/systemLogger';

interface LockScreenProps {
    onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [lockedOut, setLockedOut] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [isScanning, setIsScanning] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // UPDATED PASSWORD
    const EXPECTED_HASH = "VerseMicro"; 

    // Digital Rain Effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const columns = Math.floor(canvas.width / 20);
        const drops: number[] = Array(columns).fill(1);
        const chars = "010101XYZΩΣπMicroVerse";

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = lockedOut ? '#ef4444' : '#0ea5e9'; // Red if locked, Blue if safe
            ctx.font = '15px monospace';

            for(let i=0; i<drops.length; i++) {
                const text = chars[Math.floor(Math.random()*chars.length)];
                ctx.fillText(text, i*20, drops[i]*20);
                
                if(drops[i]*20 > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
            requestAnimationFrame(draw);
        }
        draw();
    }, [lockedOut]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (lockedOut && countdown > 0) {
            timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        } else if (lockedOut && countdown === 0) {
            setLockedOut(false);
            setAttempts(0);
            logSystem('Security lockout lifted.', 'warning');
        }
        return () => clearTimeout(timer);
    }, [lockedOut, countdown]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (lockedOut) return;

        setIsScanning(true);
        setTimeout(() => {
             setIsScanning(false);
             if (password === EXPECTED_HASH) {
                logSystem('Identity verified via Biometrics & Password. Access granted.', 'success');
                onUnlock();
            } else {
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);
                setError(true);
                setPassword('');
                logSystem(`Failed login attempt (${newAttempts}/3). Bio-scan mismatch.`, 'warning');

                if (newAttempts >= 3) {
                    setLockedOut(true);
                    setCountdown(30); 
                    logSystem('Intrusion detected. System locked down.', 'error');
                }
            }
        }, 800); // Fake scan delay
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center font-mono text-zinc-400 select-none overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-20" />
            
            <div className="relative z-10 mb-8 flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className={`relative w-32 h-32 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border-2 ${lockedOut ? 'border-red-500 shadow-[0_0_50px_rgba(255,0,0,0.5)]' : 'border-sky-500 shadow-[0_0_50px_rgba(14,165,233,0.3)]'}`}>
                    {lockedOut ? (
                        <AlertTriangle size={64} className="text-red-500 animate-pulse" />
                    ) : isScanning ? (
                        <Scan size={64} className="text-sky-500 animate-spin" />
                    ) : (
                        <Fingerprint size={64} className="text-sky-500" />
                    )}
                    {/* Scanning Line */}
                    {!lockedOut && !isScanning && <div className="absolute inset-0 border-t-2 border-sky-400/50 animate-[scan_2s_ease-in-out_infinite] rounded-full opacity-50"></div>}
                </div>
                
                <h1 className="text-3xl font-black text-white tracking-[0.2em] uppercase drop-shadow-lg">MicroVerse OS</h1>
                <p className={`text-xs mt-2 flex items-center gap-2 font-bold tracking-widest ${lockedOut ? 'text-red-500' : 'text-sky-500'}`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${lockedOut ? 'bg-red-500' : 'bg-sky-500'}`}></span>
                    {lockedOut ? 'SYSTEM LOCKED // SECURITY VIOLATION' : 'MILITARY GRADE ENCRYPTION ACTIVE'}
                </p>
            </div>

            {lockedOut ? (
                <div className="relative z-10 bg-red-950/80 border border-red-500 rounded p-6 text-center max-w-xs backdrop-blur-md shadow-2xl">
                    <h3 className="text-red-500 font-bold mb-2 text-xl">LOCKOUT ACTIVE</h3>
                    <p className="text-xs text-red-300 mb-4 font-mono">Biometric mismatch. Neural link severed.</p>
                    <div className="text-4xl font-black text-white font-mono">{countdown}<span className="text-base text-red-500">s</span></div>
                </div>
            ) : (
                <form onSubmit={handleLogin} className="flex flex-col gap-4 w-80 relative z-10">
                    <div className="relative group">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-sky-500 transition-colors" />
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(false); }}
                            placeholder="ENTER PASSPHRASE..."
                            className="w-full bg-black/50 border border-zinc-800 rounded py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 focus:shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all placeholder-zinc-700 font-mono tracking-widest uppercase"
                            autoFocus
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isScanning}
                        className="group bg-sky-900/30 hover:bg-sky-500 hover:text-white border border-sky-800 hover:border-sky-400 text-sky-400 py-3 rounded text-sm font-bold tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                        {isScanning ? 'VERIFYING...' : 'AUTHENTICATE'} <ArrowRight size={14} className={`group-hover:translate-x-1 transition-transform ${isScanning ? 'hidden' : ''}`} />
                    </button>
                    {error && (
                        <div className="text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1">
                             <Eye size={10} /> HINT: Project Name
                        </div>
                    )}
                </form>
            )}

            {error && !lockedOut && (
                 <div className="relative z-10 mt-6 flex items-center gap-2 text-red-500 text-xs font-bold bg-red-950/50 px-4 py-2 rounded border border-red-900 animate-bounce">
                    <AlertTriangle size={12} />
                    ACCESS DENIED: CREDENTIALS INVALID
                </div>
            )}
            
            <div className="absolute bottom-8 text-[9px] text-zinc-600 flex flex-col items-center gap-1 font-mono z-10">
                <span>UNAUTHORIZED ACCESS IS A FEDERAL OFFENSE</span>
                <span>IP: [REDACTED] // PROXY: HIDDEN</span>
            </div>
            
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};