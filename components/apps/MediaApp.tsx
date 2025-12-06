/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Image as ImageIcon, Music, Play } from 'lucide-react';

export const MediaApp: React.FC = () => {
    return (
        <div className="h-full w-full bg-zinc-950 flex text-zinc-200 font-sans">
             {/* Sidebar */}
             <div className="w-48 border-r border-zinc-800 bg-black p-4 flex flex-col gap-2">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Library</div>
                <button className="flex items-center gap-3 p-2 bg-zinc-900 rounded-lg text-white text-sm font-medium">
                    <ImageIcon size={16} className="text-purple-400" /> Gallery
                </button>
                <button className="flex items-center gap-3 p-2 hover:bg-zinc-900/50 rounded-lg text-zinc-400 text-sm font-medium transition-colors">
                    <Music size={16} /> Audio Logs
                </button>
             </div>

             {/* Content */}
             <div className="flex-1 p-6 overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">Encrypted Assets</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="aspect-square bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden group relative cursor-pointer">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <span className="text-sm font-bold">Evidence_{i}.png</span>
                                <span className="text-xs text-zinc-400">2.4 MB</span>
                            </div>
                            <img 
                                src={`https://picsum.photos/400/400?random=${i+10}`} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                                alt="asset"
                            />
                        </div>
                    ))}
                </div>
             </div>
        </div>
    );
};