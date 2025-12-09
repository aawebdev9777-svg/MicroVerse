/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState } from 'react';
import { Shield, Activity, Cpu, Wifi } from 'lucide-react';
import { subscribeToLogs } from '../../lib/systemLogger';

export const SecurityDashboardApp: React.FC = () => {
    const mapCanvasRef = useRef<HTMLCanvasElement>(null);
    const [logCount, setLogCount] = useState(0);
    const [lastLog, setLastLog] = useState<string>('System Ready');

    useEffect(() => {
        return subscribeToLogs((log) => {
            setLogCount(c => c + 1);
            setLastLog(log.message);
            triggerVisualPulse(log.type);
        });
    }, []);

    const pulses = useRef<{x: number, y: number, life: number, color: string}[]>([]);

    const triggerVisualPulse = (type: string) => {
        const canvas = mapCanvasRef.current;
        if(!canvas) return;
        
        let color = '#3b82f6'; 
        if (type === 'error' || type === 'warning') color = '#ef4444';
        if (type === 'success') color = '#10b981';

        pulses.current.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            life: 1.0,
            color
        });
    };

    // OPTIMIZED: Throttled Animation Loop (30 FPS)
    useEffect(() => {
        const canvas = mapCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let lastTime = 0;
        const fpsInterval = 1000 / 30; // Limit to 30 FPS

        const drawMap = (timestamp: number) => {
            animationFrameId = requestAnimationFrame(drawMap);

            const elapsed = timestamp - lastTime;
            if (elapsed < fpsInterval) return;
            lastTime = timestamp - (elapsed % fpsInterval);

            // Clear with heavy fade to reduce redraw artifacts complexity
            ctx.fillStyle = 'rgba(9, 9, 11, 0.3)'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for(let i = pulses.current.length - 1; i >= 0; i--) {
                const p = pulses.current[i];
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, 40 * (1 - p.life), 0, Math.PI * 2);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2 * p.life;
                ctx.globalAlpha = p.life;
                ctx.stroke();

                p.life -= 0.05; // Faster fade out to clean up array quicker
                if(p.life <= 0) pulses.current.splice(i, 1);
            }
            ctx.globalAlpha = 1;
        };
        animationFrameId = requestAnimationFrame(drawMap);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div className="h-full w-full bg-black text-zinc-300 font-mono flex flex-col overflow-hidden select-none">
            {/* Top Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                        <Shield size={18} className="text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-wider">OVERWATCH</h1>
                        <div className="text-[10px] text-zinc-500 uppercase">System Integrity Monitor</div>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-emerald-500">LIVE</span>
                    </div>
                </div>
            </div>

            {/* Main Visualizer */}
            <div className="flex-1 relative border-b border-zinc-800 bg-black">
                <div className="absolute top-4 left-4 z-10 space-y-1">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Activity Map</div>
                    <div className="text-xl font-bold text-white tracking-tighter">{logCount} <span className="text-xs text-zinc-600 font-normal">EVENTS</span></div>
                </div>
                <canvas ref={mapCanvasRef} width={800} height={300} className="w-full h-full block opacity-80" />
                
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            {/* Bottom Metrics */}
            <div className="h-32 bg-zinc-950 grid grid-cols-3 divide-x divide-zinc-800">
                <div className="p-4 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
                        <Activity size={12} /> Last Event
                    </div>
                    <div className="text-xs text-zinc-300 font-mono leading-tight line-clamp-2">
                        {lastLog}
                    </div>
                </div>

                <div className="p-4 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
                        <Cpu size={12} /> Resources
                    </div>
                    <div className="space-y-1">
                         <div className="flex justify-between text-[10px]">
                            <span className="text-zinc-500">CPU</span>
                            <span className="text-emerald-400">OPT</span>
                         </div>
                         <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 w-[12%]"></div>
                         </div>
                         <div className="flex justify-between text-[10px] mt-2">
                            <span className="text-zinc-500">MEM</span>
                            <span className="text-blue-400">2.1GB</span>
                         </div>
                         <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500 w-[25%]"></div>
                         </div>
                    </div>
                </div>

                <div className="p-4 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
                        <Wifi size={12} /> Network
                    </div>
                    <div className="flex items-end gap-1 h-12">
                        {[40, 60, 30, 80, 50, 90, 20, 40, 60, 45].map((h, i) => (
                            <div key={i} className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition-colors" style={{height: `${h}%`}}></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};