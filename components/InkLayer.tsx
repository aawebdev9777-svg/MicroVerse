/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point, Stroke } from '../types';

interface InkLayerProps {
    active: boolean;
    strokes: Stroke[];
    setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
    isProcessing: boolean;
}

export const InkLayer: React.FC<InkLayerProps> = ({ active, strokes, setStrokes, isProcessing }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const currentStroke = useRef<Stroke>([]);

    // Optimized Single-Pass Drawing
    const drawSingleStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
        if (stroke.length < 2) return;

        const path = new Path2D();
        path.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
            path.lineTo(stroke[i].x, stroke[i].y);
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Single pass with shadow built-in for better performance
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke(path);
        
        // Reset shadow to avoid affecting other ops if any
        ctx.shadowBlur = 0; 
    };

    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokes.forEach(stroke => drawSingleStroke(ctx, stroke));

        if (isDrawing && currentStroke.current.length > 0) {
            drawSingleStroke(ctx, currentStroke.current);
        }
    }, [strokes, isDrawing]);

    // Resize Handler
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                const rect = parent.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    canvas.width = rect.width;
                    canvas.height = rect.height;
                    renderCanvas();
                }
            }
        };

        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [renderCanvas]);

    // External stroke updates
    useEffect(() => {
        if (!isProcessing) {
            renderCanvas();
        }
    }, [strokes, renderCanvas, isProcessing]);

    // Throttled Pulsating Loop (only when processing)
    useEffect(() => {
        if (!isProcessing) return;

        let animationFrameId: number;
        const start = Date.now();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        const animate = () => {
            if (!ctx || !canvas) return;

            const now = Date.now();
            const pulse = (Math.sin((now - start) / 250) + 1) / 4 + 0.5;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.globalAlpha = pulse;
            strokes.forEach(stroke => drawSingleStroke(ctx, stroke));
            ctx.restore();

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();
        return () => {
            cancelAnimationFrame(animationFrameId);
            renderCanvas(); // Restore full opacity
        };
    }, [isProcessing, strokes, renderCanvas]);

    const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!active || isProcessing) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDrawing(true);
        const point = getPoint(e);
        currentStroke.current = [point];
        renderCanvas();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!active || !isDrawing || isProcessing) return;
        
        // Skip coalesced events for performance in simple drawing
        const point = getPoint(e);
        currentStroke.current.push(point);
        
        // Simple throttle: only render if we have significant movement or every X events?
        // For now, renderCanvas is optimized enough.
        renderCanvas();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!active || !isDrawing || isProcessing) return;
        setIsDrawing(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        
        if (currentStroke.current.length > 0) {
            setStrokes(prev => [...prev, [...currentStroke.current]]);
        }
        currentStroke.current = [];
    };

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-[2000] touch-none ${active && !isProcessing ? 'cursor-crosshair' : 'pointer-events-none'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        />
    );
};