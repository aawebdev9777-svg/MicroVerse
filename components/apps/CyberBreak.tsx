/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, ShieldAlert, Binary } from 'lucide-react';

export const CyberBreak: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'won'>('start');
    const [score, setScore] = useState(0);

    // Physics state
    const physics = useRef({
        ball: { x: 0, y: 0, dx: 4, dy: -4, radius: 6 },
        paddle: { x: 0, width: 80, height: 10 },
        bricks: [] as { x: number, y: number, w: number, h: number, status: number }[],
        width: 0,
        height: 0
    });

    const animationRef = useRef<number>(0);

    const initGame = () => {
        if (!canvasRef.current) return;
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        const p = physics.current;

        p.width = w;
        p.height = h;
        p.ball = { x: w / 2, y: h - 30, dx: 4 * (Math.random() > 0.5 ? 1 : -1), dy: -4, radius: 6 };
        p.paddle = { x: (w - 80) / 2, width: 80, height: 10 };
        
        // Create Bricks (Firewall Nodes)
        p.bricks = [];
        const rows = 5;
        const cols = 8;
        const padding = 10;
        const brickW = (w - (padding * (cols + 1))) / cols;
        const brickH = 20;
        const offsetTop = 40;
        
        for(let c=0; c<cols; c++) {
            for(let r=0; r<rows; r++) {
                p.bricks.push({ 
                    x: (c*(brickW+padding)) + padding, 
                    y: (r*(brickH+padding)) + offsetTop, 
                    w: brickW, 
                    h: brickH, 
                    status: 1 
                });
            }
        }
        
        setScore(0);
        setGameState('playing');
    };

    const update = () => {
        if (gameState !== 'playing') return;
        const p = physics.current;
        const b = p.ball;

        // Move Ball
        b.x += b.dx;
        b.y += b.dy;

        // Wall collisions
        if(b.x + b.dx > p.width - b.radius || b.x + b.dx < b.radius) {
            b.dx = -b.dx;
        }
        if(b.y + b.dy < b.radius) {
            b.dy = -b.dy;
        } else if(b.y + b.dy > p.height - b.radius) {
             // Paddle hit?
             if(b.x > p.paddle.x && b.x < p.paddle.x + p.paddle.width) {
                 b.dy = -b.dy;
                 // Add some english based on hit position
                 const hitPoint = b.x - (p.paddle.x + p.paddle.width/2);
                 b.dx = hitPoint * 0.15; 
             } else {
                 setGameState('gameover');
                 return;
             }
        }

        // Brick collisions
        let activeBricks = 0;
        for(let i=0; i<p.bricks.length; i++) {
            const br = p.bricks[i];
            if(br.status === 1) {
                activeBricks++;
                if(b.x > br.x && b.x < br.x + br.w && b.y > br.y && b.y < br.y + br.h) {
                    b.dy = -b.dy;
                    br.status = 0;
                    setScore(prev => prev + 100);
                }
            }
        }

        if(activeBricks === 0) {
            setGameState('won');
        }
    };

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const p = physics.current;

        // Clear with slight trail effect
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, p.width, p.height);

        // Paddle
        ctx.fillStyle = '#0ea5e9'; // Sky 500
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#0284c7';
        ctx.fillRect(p.paddle.x, p.height - p.paddle.height - 5, p.paddle.width, p.paddle.height);
        ctx.shadowBlur = 0;

        // Ball
        ctx.beginPath();
        ctx.arc(p.ball.x, p.ball.y, p.ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.closePath();

        // Bricks
        p.bricks.forEach(b => {
            if(b.status === 1) {
                ctx.fillStyle = '#ef4444'; // Red 500 (Firewall)
                ctx.fillRect(b.x, b.y, b.w, b.h);
                // "Code" lines on bricks
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(b.x + 2, b.y + 5, b.w - 4, 2);
                ctx.fillRect(b.x + 2, b.y + 10, b.w - 4, 2);
            }
        });
    };

    const loop = () => {
        update();
        draw();
        if (gameState === 'playing') {
            animationRef.current = requestAnimationFrame(loop);
        }
    };

    useEffect(() => {
        if (gameState === 'playing') {
            animationRef.current = requestAnimationFrame(loop);
        }
        return () => cancelAnimationFrame(animationRef.current);
    }, [gameState]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (gameState !== 'playing' || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const p = physics.current;
        
        if(relativeX > 0 && relativeX < p.width) {
            p.paddle.x = relativeX - p.paddle.width/2;
        }
    };

    // Initial resize handling
    useEffect(() => {
        const resize = () => {
            if(canvasRef.current && canvasRef.current.parentElement) {
                canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
                canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
                physics.current.width = canvasRef.current.width;
                physics.current.height = canvasRef.current.height;
                // Center paddle initially
                physics.current.paddle.x = (physics.current.width - physics.current.paddle.width) / 2;
                draw();
            }
        }
        window.addEventListener('resize', resize);
        resize();
        return () => window.removeEventListener('resize', resize);
    }, []);

    return (
        <div className="h-full w-full bg-black relative flex flex-col font-mono overflow-hidden select-none" onMouseMove={handleMouseMove}>
             <canvas ref={canvasRef} className="block cursor-none" />
             
             {/* Score UI */}
             <div className="absolute top-4 right-4 text-sky-400 font-bold text-xl drop-shadow-md z-10">
                 DATA_LEAK: {score}
             </div>

             {/* Overlays */}
             {gameState !== 'playing' && (
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center z-20">
                     <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-2">FIREWALL BREAKER</h1>
                     <p className="text-zinc-400 mb-8 max-w-xs">Infiltrate the mainframe by smashing through security layers.</p>
                     
                     {gameState === 'gameover' && <div className="text-2xl text-red-500 font-bold mb-4 animate-pulse">CONNECTION TERMINATED</div>}
                     {gameState === 'won' && <div className="text-2xl text-green-500 font-bold mb-4 animate-bounce">ACCESS GRANTED</div>}
                     
                     <button 
                         onClick={initGame}
                         className="px-8 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-none border border-sky-400 font-bold flex items-center gap-2 hover:shadow-[0_0_15px_rgba(14,165,233,0.5)] transition-all"
                     >
                         {gameState === 'start' ? <Play size={18} /> : <RotateCcw size={18} />}
                         {gameState === 'start' ? 'INITIATE HACK' : 'RETRY CONNECTION'}
                     </button>
                 </div>
             )}
        </div>
    );
};