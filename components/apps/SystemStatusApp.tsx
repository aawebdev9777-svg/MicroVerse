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
    const logContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Optimized Log Subscription: Debounce updates to UI
    useEffect(() => {
        return subscribeToLogs((log) => {
            setLogs(prev => {
                const newLogs = [...prev, log];
                // Keep buffer smaller to save memory
                if (newLogs.length > 50) return newLogs.slice(-50);
                return newLogs;
            }); 
        });
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // OPTIMIZED: Reduced background task frequency from 800ms to 2000ms
    useEffect(() => {
        const bgTask = setInterval(() => {
            if (systemState === 'NORMAL' && Math.random() > 0.6) { // Lower probability
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
        }, 2000); // Slower interval for better performance
        return () => clearInterval(bgTask);
    }, [systemState]);

    const simulateBreach = async () => {
        if (systemState !== 'NORMAL') return;
        window.dispatchEvent(new CustomEvent('trigger-breach'));
        setSystemState('CRITICAL');
        logSystem('!!! UNAUTHORIZED ACCESS DETECTED !!!', 'error');
        // Simplified sequence
        setTimeout(() => {
            setSystemState('WARNING');
            logSystem('DEFENSE: Isolating compromised nodes...', 'warning');
        }, 3000);
        setTimeout(() => {
            setSystemState('NORMAL');
            logSystem('SYSTEM: Threat neutralized.', 'success');
        }, 6000);
    };

    // OPTIMIZED: Canvas Animation Loop Throttling
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let dataPoints: number[] = Array(50).fill(0);
        let animationFrameId: number;
        let lastTime = 0;
        const fpsInterval = 1000 / 30; // Cap at 30 FPS for performance

        const draw = (timestamp: number) => {
            animationFrameId = requestAnimationFrame(draw);

            const elapsed = timestamp - lastTime;
            if (elapsed < fpsInterval) return;

            lastTime = timestamp - (elapsed % fpsInterval);

            // Update Data
            dataPoints.shift();
            const volatility = systemState === 'CRITICAL' ? 40 : 15;
            const base = systemState === 'CRITICAL' ? 40 : 20;
            const last = dataPoints[dataPoints.length - 1] || base;
            let next = last + (Math.random() - 0.5) * volatility;
            next = Math.max(5, Math.min(45, next));
            dataPoints.push(next);

            // Render
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const color = systemState === 'CRITICAL' ? '#ef4444' : systemState === 'WARNING' ? '#eab308' : '#10b981';

            // Simplified Grid
            ctx.strokeStyle = '#064e3b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, canvas.height/2);
            ctx.lineTo(canvas.width, canvas.height/2);
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
            
            // Fill
            ctx.lineTo(canvas.width, canvas.height);
            ctx.lineTo(0, canvas.height);
            ctx.fillStyle = systemState === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
            ctx.fill();
        };

        animationFrameId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animationFrameId);
    }, [systemState]);

    return (
        <div className={`h-full w-full bg-black font-mono text-[11px] flex flex-col p-1 overflow-hidden border transition-colors duration-500 ${systemState === 'CRITICAL' ? 'text-red-500 border-red-900' : 'text-green-500 border-green-900/50'}`}>
            {/* Top Stats Bar */}
            <div className="grid grid-cols-2 gap-2 mb-2 p-1">
                <div className="bg-opacity-20 border bg-black border-opacity-30 border-green-900 p-2 flex flex-col gap-1">
                    <div className="flex items-center gap-2 font-bold border-b border-green-900/30 pb-1">
                        <Activity size={14} /> NET_IO
                    </div>
                    <canvas ref={canvasRef} width={200} height={50} className="w-full h-12 block" />
                </div>
                <div className="bg-opacity-20 border bg-black border-opacity-30 border-green-900 p-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-blue-400">
                        <span className="flex items-center gap-1"><Shield size={12} /> FIREWALL</span>
                        <span>{systemState === 'CRITICAL' ? 'FAIL' : 'OK'}</span>
                    </div>
                     <div className="flex items-center justify-between text-purple-400">
                        <span className="flex items-center gap-1"><Cpu size={12} /> CORE</span>
                        <span>v9.5</span>
                    </div>
                     <div className="flex items-center justify-between text-zinc-500">
                        <button 
                            onClick={simulateBreach} 
                            disabled={systemState !== 'NORMAL'}
                            className={`px-2 py-0.5 border text-[9px] hover:bg-white/10 ${systemState === 'NORMAL' ? 'border-red-800 text-red-700' : 'opacity-0'}`}
                        >
                            TEST BREACH
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Terminal Log */}
            <div ref={logContainerRef} className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-900/30 font-mono">
                {logs.map(log => (
                    <div key={log.id} className="flex gap-2 hover:bg-white/5 leading-tight">
                        <span className="opacity-40 shrink-0 w-12 text-right">{log.timestamp.toLocaleTimeString().split(' ')[0]}</span>
                        <span className={`break-all ${
                            log.type === 'error' ? 'text-red-500 font-bold' : 
                            log.type === 'warning' ? 'text-yellow-500' :
                            log.type === 'success' ? 'text-emerald-400' :
                            'text-zinc-400'
                        }`}>
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};