/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface NotepadAppProps {
    initialContent?: string;
}

export const NotepadApp: React.FC<NotepadAppProps> = ({ initialContent = '' }) => {
    return (
        <div className="h-full w-full bg-zinc-900 text-zinc-300 flex flex-col">
            <textarea 
                className="flex-1 w-full h-full p-4 resize-none border-none focus:outline-none font-mono text-sm bg-transparent overflow-y-auto overscroll-y-contain"
                defaultValue={initialContent}
                spellCheck={false}
            />
        </div>
    );
};