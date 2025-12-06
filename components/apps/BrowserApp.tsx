/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { Lock, RefreshCw, Search, X, Trash2, Globe, Shield, Wifi, Code, Eye, AlertCircle } from 'lucide-react';
import { getAiClient } from '../../lib/gemini';
import { logSystem } from '../../lib/systemLogger';
import { sanitizeHTML } from '../../lib/security';

export const BrowserApp: React.FC = () => {
    const [inputUrl, setInputUrl] = useState('');
    const [content, setContent] = useState<string>('');
    const [mode, setMode] = useState<'intel' | 'simulation'>('simulation');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sources, setSources] = useState<any[]>([]);

    const handleNavigate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        let target = inputUrl || 'Global Network';
        setIsLoading(true);
        setError(null);
        setContent(''); 
        setSources([]);
        
        logSystem(`BROWSER: Resolving node "${target}"...`, 'network');

        const ai = getAiClient();

        try {
            let prompt = "";
            
            if (mode === 'simulation') {
                // Simulation Mode: Asks AI to recreate the site visually
                prompt = `Target URL: "${target}".
                
                TASK:
                Generate a high-fidelity HTML/Tailwind CSS "Holographic Clone" of this website. 
                Do NOT provide a summary. 
                Render the UI exactly as it would appear to a user browsing the site.
                
                REQUIREMENTS:
                - Use semantic HTML tags.
                - Use Tailwind CSS classes for styling (e.g., bg-black, text-white, grid, flex).
                - Recreate the Navigation Bar, Hero Section, Feature Grid, and Footer.
                - For images, use 'https://picsum.photos/seed/{random}/800/600' placeholders or generic SVGs.
                - If the target is 'apple.com', style it with minimal white/black aesthetics, large hero images, and clean typography.
                - Make it look like a functional website.
                `;
            } else {
                // Intel Mode: Asks for a text-based briefing
                prompt = `User Query: "${target}".
                TASK: Perform a live search using the 'googleSearch' tool.
                OUTPUT: Create a "Secure Intelligence Briefing" in HTML.
                STYLE: Minimalist, high-contrast, professional, dark mode.
                `;
            }

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: mode === 'intel' ? [{ googleSearch: {} }] : [], // Search only needed for intel, simulation relies on training data usually
                },
            });

            // FIX: Handle case where response.text is undefined
            const htmlContent = response.text || '';
            
            if (!htmlContent) {
                 if (mode === 'intel') {
                     throw new Error("Intelligence gathering failed. No data returned.");
                 } else {
                     // Fallback for simulation
                     setContent('<div class="flex h-full items-center justify-center text-zinc-500">Connection Interrupted. No visual data received.</div>');
                     return;
                 }
            }

            // Extract sources if available
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            const webSources = groundingChunks
                .map((chunk: any) => chunk.web)
                .filter((web: any) => web && web.uri && web.title);
            setSources(webSources);

            // Extract body content
            const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            let finalContent = bodyMatch ? bodyMatch[1] : htmlContent;
            
            // Basic sanitization
            finalContent = sanitizeHTML(finalContent);

            setContent(finalContent);
            logSystem(`BROWSER: Node rendered via ${mode === 'simulation' ? 'Holographic Engine' : 'Intel Stream'}.`, 'success');

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Connection Reset. Target node is offline or shielded.");
            logSystem(`Browser Error: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const clearHistory = () => {
        setContent('');
        setInputUrl('');
        setSources([]);
        logSystem('Browser cache flushed.', 'info');
    };

    return (
        <div className="h-full w-full flex flex-col bg-zinc-950 text-zinc-100 font-sans border border-zinc-800 relative shadow-2xl overflow-hidden">
            {/* Top Security Bar */}
            <div className="h-9 bg-black flex items-center justify-between px-4 border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500 select-none">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                        <Shield size={10} /> 
                        <span>ENCRYPTED</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                        <Globe size={10} /> 
                        <span>TOR NODE</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setMode(m => m === 'intel' ? 'simulation' : 'intel')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${mode === 'simulation' ? 'bg-blue-900/30 text-blue-400' : 'bg-emerald-900/30 text-emerald-400'}`}
                    >
                        {mode === 'simulation' ? <Eye size={10} /> : <Code size={10} />}
                        <span className="font-bold">{mode === 'simulation' ? 'VISUAL SIM' : 'INTEL BRIEF'}</span>
                    </button>
                </div>
            </div>

            {/* Address Bar */}
            <div className="p-4 bg-zinc-900/30 backdrop-blur-sm border-b border-white/5 flex gap-3 items-center z-10">
                <form onSubmit={handleNavigate} className="flex-1 relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {isLoading ? (
                            <RefreshCw size={14} className="text-emerald-500 animate-spin" />
                        ) : (
                            <Search size={14} className="text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                        )}
                    </div>
                    <input 
                        className="w-full bg-black/40 border border-zinc-800 rounded-md py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/30 focus:bg-black/60 transition-all font-medium font-mono"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="ENTER URL OR KEYWORD..."
                    />
                    {inputUrl && (
                        <button type="button" onClick={() => setInputUrl('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-600 hover:text-zinc-400">
                            <X size={14} />
                        </button>
                    )}
                </form>

                <button onClick={clearHistory} className="p-2.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-md transition-colors" title="Clear Data">
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Main View */}
            <div className="flex-1 overflow-hidden relative bg-zinc-950/50">
                
                {isLoading && (
                    <div className="absolute inset-0 bg-zinc-950/90 z-20 flex flex-col items-center justify-center space-y-4">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-12 bg-emerald-500/50 animate-[pulse_1s_ease-in-out_infinite]" style={{animationDelay:'0ms'}}></div>
                            <div className="w-1.5 h-12 bg-emerald-500/50 animate-[pulse_1s_ease-in-out_infinite]" style={{animationDelay:'100ms'}}></div>
                            <div className="w-1.5 h-12 bg-emerald-500/50 animate-[pulse_1s_ease-in-out_infinite]" style={{animationDelay:'200ms'}}></div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-emerald-500 font-mono text-xs tracking-widest uppercase">
                                {mode === 'simulation' ? 'Reconstructing Visual Interface...' : 'Gathering Intelligence...'}
                            </h3>
                        </div>
                    </div>
                )}

                <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {!content && !isLoading && !error && (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-700 space-y-4 p-8 opacity-60 select-none">
                            <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                <Wifi size={32} className="text-zinc-600" />
                            </div>
                            <p className="text-xs font-mono tracking-widest uppercase">Secure Uplink Established</p>
                        </div>
                    )}

                    {content && (
                        <div className="w-full h-full bg-white text-black min-h-full">
                            {/* Rendered Content - In Simulation mode, we allow full styling */}
                            <div 
                                className={mode === 'intel' ? "prose prose-invert prose-sm max-w-none p-8" : "w-full min-h-full bg-white"}
                                dangerouslySetInnerHTML={{ __html: content }} 
                            />
                        </div>
                    )}
                    
                    {error && (
                        <div className="h-full flex items-center justify-center p-8 text-white">
                            <div className="flex items-center gap-3 text-zinc-500">
                                <AlertCircle size={20} className="text-red-500" />
                                <span className="font-mono text-xs">{error}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};