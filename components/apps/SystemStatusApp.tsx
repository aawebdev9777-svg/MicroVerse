/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Wifi, Activity, Shield, Cpu, Zap, ShieldAlert, Skull, Siren } from 'lucide-react';
import { SystemLog, subscribeToLogs, logSystem } from '../../lib/systemLogger';

export const SystemStatusApp: React.FC = () => {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [systemState, setSystemState] = useState<'NORMAL' | 'WARNING' | 'CRITICAL'>('NORMAL');
    const endRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Subscribe to real logs
    useEffect(() => {
        return subscribeToLogs((log) => {
            setLogs(prev => [...prev.slice(-149), log]); 
        });
    }, []);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // Simulated Background Kernel Activity
    useEffect(() => {
        const bgTask = setInterval(() => {
            if (systemState === 'NORMAL' && Math.random() > 0.7) {
                const tasks = [
                    "Kernel: Packet inspected - CLEAN",
                    "MemMgmt: Heap compacted 4MB",
                    "Network: Handshake ACK/SYN",
                    "Daemon: Integrity check PASSED",
                    "Crypt: Key rotation complete",
                    "Firewall: Port 443 active",
                    "IO: Flush buffer to disk"
                ];
                const task = tasks[Math.floor(Math.random() * tasks.length)];
                logSystem(task, 'kernel');
            }
        }, 800);
        return () => clearInterval(bgTask);
    }, [systemState]);

    // Attack Simulation Logic
    const simulateBreach = async () => {
        if (systemState !== 'NORMAL') return;
        
        // Trigger the Global Red Team Event (App.tsx listener)
        window.dispatchEvent(new CustomEvent('trigger-breach'));

        // Phase 1: Intrusion
        setSystemState('CRITICAL');
        logSystem('!!! UNAUTHORIZED ACCESS DETECTED !!!', 'error');
        await new Promise(r => setTimeout(r, 600));
        logSystem('WARNING: Firewall breach on Port 8080', 'error');
        await new Promise(r => setTimeout(r, 800));
        logSystem('ALERT: External IP attempting root escalation', 'error');
        await new Promise(r => setTimeout(r, 800));
        logSystem('CRITICAL: Data exfiltration attempt in progress', 'error');
        
        // Phase 2: Countermeasures
        await new Promise(r => setTimeout(r, 1500));
        setSystemState('WARNING');
        logSystem('AUTOMATED DEFENSE: Initiating Protocol 7', 'warning');
        await new Promise(r => setTimeout(r, 500));
        logSystem('DEFENSE: Isolating compromised nodes...', 'warning');
        await new Promise(r => setTimeout(r, 600));
        logSystem('DEFENSE: Rerouting traffic through honeypot', 'warning');
        await new Promise(r => setTimeout(r, 700));
        logSystem('DEFENSE: Flooding attacker connection', 'warning');
        
        // Phase 3: Neuralization
        await new Promise(r => setTimeout(r, 1500));
        logSystem('SUCCESS: Threat neutralized.', 'success');
        await new Promise(r => setTimeout(r, 500));
        logSystem('SYSTEM: Restoring integrity...', 'success');
        setSystemState('NORMAL');
        logSystem('SYSTEM: All systems nominal.', 'kernel');
    };

    // Canvas Network Graph Animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let dataPoints: number[] = Array(50).fill(0);
        let frameId = 0;

        const draw = () => {
            // Update Data
            dataPoints.shift();
            // Higher volatility if Critical
            const volatility = systemState === 'CRITICAL' ? 40 : 15;
            const base = systemState === 'CRITICAL' ? 40 : 20;
            
            const last = dataPoints[dataPoints.length - 1] || base;
            let next = last + (Math.random() - 0.5) * volatility;
            next = Math.max(5, Math.min(45, next));
            dataPoints.push(next);

            // Render
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Color based on state
            const color = systemState === 'CRITICAL' ? '#ef4444' : systemState === 'WARNING' ? '#eab308' : '#10b981';

            // Grid lines
            ctx.strokeStyle = systemState === 'CRITICAL' ? '#450a0a' : '#064e3b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(let i=0; i<canvas.width; i+=20) { ctx.moveTo(i,0); ctx.lineTo(i, canvas.height); }
            for(let i=0; i<canvas.height; i+=10) { ctx.moveTo(0,i); ctx.lineTo(canvas.width, i); }
            ctx.stroke();

            // Graph Line
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const step = canvas.width / (dataPoints.length - 1);
            dataPoints.forEach((val, i) => {
                const x = i * step;
                const y = canvas.height - val;
                if (i===0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Glow under line
            ctx.lineTo(canvas.width, canvas.height);
            ctx.lineTo(0, canvas.height);
            ctx.fillStyle = systemState === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
            ctx.fill();

            frameId = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(frameId);
    }, [systemState]);

    const getThemeColors = () => {
        switch(systemState) {
            case 'CRITICAL': return 'text-red-500 border-red-900/50';
            case 'WARNING': return 'text-yellow-500 border-yellow-900/50';
            default: return 'text-green-500 border-green-900/50';
        }
    };

    return (
        <div className={`h-full w-full bg-black font-mono text-[11px] flex flex-col p-1 overflow-hidden border transition-colors duration-500 ${getThemeColors()}`}>
            {/* Top Stats Bar */}
            <div className="grid grid-cols-2 gap-2 mb-2 p-1">
                <div className={`bg-opacity-20 border bg-black border-opacity-30 p-2 flex flex-col gap-1 ${systemState === 'CRITICAL' ? 'border-red-500' : 'border-green-900'}`}>
                    <div className={`flex items-center gap-2 font-bold border-b pb-1 ${systemState === 'CRITICAL' ? 'text-red-400 border-red-900' : 'text-emerald-400 border-green-900/30'}`}>
                        <Activity size={14} /> {systemState === 'CRITICAL' ? 'INTRUSION DETECTED' : 'NETWORK TRAFFIC'}
                    </div>
                    <canvas ref={canvasRef} width={200} height={50} className="w-full h-12 block" />
                </div>
                <div className={`bg-opacity-20 border bg-black border-opacity-30 p-2 flex flex-col justify-between ${systemState === 'CRITICAL' ? 'border-red-500' : 'border-green-900'}`}>
                    <div className={`flex items-center justify-between ${systemState === 'CRITICAL' ? 'text-red-500 font-bold animate-pulse' : 'text-blue-400'}`}>
                        <span className="flex items-center gap-1">
                            {systemState === 'CRITICAL' ? <Skull size={12} /> : <Shield size={12} />} 
                            FIREWALL
                        </span>
                        <span>{systemState === 'CRITICAL' ? 'BREACHED' : 'ACTIVE'}</span>
                    </div>
                     <div className="flex items-center justify-between text-purple-400">
                        <span className="flex items-center gap-1"><Cpu size={12} /> KERNEL</span>
                        <span>v9.0.4</span>
                    </div>
                     <div className="flex items-center justify-between text-zinc-500">
                        <button 
                            onClick={simulateBreach} 
                            disabled={systemState !== 'NORMAL'}
                            className={`px-2 py-0.5 border text-[9px] hover:bg-white/10 transition-colors ${systemState === 'NORMAL' ? 'border-red-800 text-red-700' : 'opacity-0'}`}
                        >
                            SIMULATE BREACH
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Terminal Log */}
            <div ref={logContainerRef} className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent bg-zinc-900/30 font-mono">
                {logs.length === 0 && <div className="opacity-50">Booting kernel...</div>}
                {logs.map(log => (
                    <div key={log.id} className="flex gap-2 hover:bg-white/5 leading-tight">
                        <span className="opacity-40 shrink-0 select-none w-16 text-right">[{log.timestamp.getSeconds().toString().padStart(2, '0')}:{log.timestamp.getMilliseconds().toString().padStart(3, '0')}]</span>
                        <span className={`break-all ${
                            log.type === 'error' ? 'text-red-500 font-bold' : 
                            log.type === 'warning' ? 'text-yellow-500' :
                            log.type === 'success' ? 'text-emerald-400' :
                            log.type === 'network' ? 'text-blue-400' : 
                            log.type === 'ai' ? 'text-purple-400' : 
                            log.type === 'kernel' ? 'text-zinc-500' : 'text-inherit'
                        }`}>
                            {log.type === 'network' ? '>> ' : log.type === 'ai' ? ':: ' : log.type === 'kernel' ? '# ' : ''}{log.message}
                        </span>
                    </div>
                ))}
            </div>

             {/* Status Footer */}
            <div className={`border-t pt-1 mt-1 flex justify-between text-zinc-600 px-2 ${systemState === 'CRITICAL' ? 'border-red-900' : 'border-green-900/30'}`}>
                <span className="text-red-500 animate-pulse font-bold">
                    STATUS: {systemState}
                </span>
                <span>UPTIME: 99.999%</span>
            </div>
        </div>
    );
};