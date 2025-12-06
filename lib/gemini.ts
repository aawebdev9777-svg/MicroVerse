/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Tool, Type } from "@google/genai";

// Using the most capable Flash model for speed and intelligence
export const MODEL_NAME = "gemini-2.5-flash"; 
export const LIVE_MODEL_NAME = "gemini-2.5-flash-native-audio-preview-09-2025";

let aiClient: GoogleGenAI | null = null;

export const getAiClient = () => {
    if (!aiClient) {
        aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return aiClient;
};

export const HOME_TOOLS: Tool[] = [
    {
        functionDeclarations: [
            {
                name: 'delete_item',
                description: 'Call this function for EACH item (application or folder) that has an "X" or cross drawn over it. If multiple items are crossed out, call this function multiple times.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['itemName'],
                    properties: {
                        itemName: { type: Type.STRING, description: 'The exact name of the item to delete as seen on screen.' },
                    },
                },
            },
            {
                name: 'explode_folder',
                description: 'Call this when the user draws outward pointing arrows from a folder to "explode" it and show its contents.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['folderName'],
                    properties: {
                        folderName: { type: Type.STRING, description: 'The exact name of the folder to explode as seen on screen.' },
                    },
                },
            },
            {
                name: 'explain_item',
                description: 'Call this when the user draws a question mark "?" over an item (or nearby an item). If it is a folder, it will summarize its contents. If it is a text file, it will summarize its text content.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['itemName'],
                    properties: {
                        itemName: { type: Type.STRING, description: 'The name of the item (app or folder) to explain.' },
                    },
                },
            },
            {
                name: 'change_background',
                description: 'Call this when the user draws a sketch on the empty desktop background (not specifically targeting an app icon), intending to turn that sketch into a new wallpaper. Do NOT call this if the sketch is clearly trying to interact with an existing icon (like crossing it out).',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        sketch_description: { type: Type.STRING, description: 'A short description of what the sketch appears to be, to help generating the wallpaper (e.g., "mountains", "flower", "abstract curves").' },
                    },
                },
            },
        ],
    },
];

export const MAIL_TOOLS: Tool[] = [
    {
        functionDeclarations: [
            {
                name: 'delete_email',
                description: 'Call this when the user draws a line through (strikes out) or an "X" over an email row in the list to delete it.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['subject_text'],
                    properties: {
                        subject_text: { type: Type.STRING, description: 'Distinct text from the subject line of the email.' },
                        sender_text: { type: Type.STRING, description: 'The name of the sender of the email.' },
                    },
                },
            },
            {
                name: 'summarize_email',
                description: 'Call this when the user draws a question mark "?" over email row(s). Summarizes the body.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['subject_text'],
                    properties: {
                        subject_text: { type: Type.STRING, description: 'Distinct text from the subject line of the email.' },
                        sender_text: { type: Type.STRING, description: 'The name of the sender of the email.' },
                    },
                },
            },
            {
                name: 'draft_email',
                description: 'Call this when the user wants to write or draft a new email. Use this if the user says "Write an email to..." or draws a compose symbol.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['to', 'subject', 'body'],
                    properties: {
                        to: { type: Type.STRING, description: 'The recipient email address (if mentioned).' },
                        subject: { type: Type.STRING, description: 'A short subject line for the email.' },
                        body: { type: Type.STRING, description: 'The full body content of the email.' },
                    },
                },
            },
        ]
    }
]

export const VOICE_TOOLS: Tool[] = [
    {
        functionDeclarations: [
            {
                name: 'delete_item',
                description: 'Delete an application or folder from the desktop by name.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['itemName'],
                    properties: {
                        itemName: { type: Type.STRING, description: 'The name of the item to delete.' },
                    },
                },
            },
            {
                name: 'explode_folder',
                description: 'Open or explode a folder to show its contents.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['folderName'],
                    properties: {
                        folderName: { type: Type.STRING, description: 'The name of the folder.' },
                    },
                },
            },
            {
                name: 'explain_item',
                description: 'Summarize or explain the contents of an item (folder or file).',
                parameters: {
                    type: Type.OBJECT,
                    required: ['itemName'],
                    properties: {
                        itemName: { type: Type.STRING, description: 'The name of the item.' },
                    },
                },
            },
            {
                name: 'change_background',
                description: 'Generate a new wallpaper based on a voice description.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['description'],
                    properties: {
                        description: { type: Type.STRING, description: 'The description of the wallpaper to generate.' },
                    },
                },
            },
            {
                name: 'launch_app',
                description: 'Launch or open an application by name (e.g. Mail, Slides, Game, Notepad).',
                parameters: {
                    type: Type.OBJECT,
                    required: ['appName'],
                    properties: {
                        appName: { type: Type.STRING, description: 'The name of the app to launch.' },
                    },
                },
            },
             {
                name: 'close_window',
                description: 'Close an active window by title. If no title is given, close the currently focused window.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        windowTitle: { type: Type.STRING, description: 'The title of the window to close.' },
                    },
                },
            },
            {
                name: 'control_game',
                description: 'Control the Alien Defense (Snake) game. Use this when the user asks to play, fire, or move in the game.',
                parameters: {
                    type: Type.OBJECT,
                    required: ['action'],
                    properties: {
                        action: { 
                            type: Type.STRING, 
                            enum: ['move_left', 'move_right', 'fire'],
                            description: 'The action to perform in the game.' 
                        },
                    },
                },
            },
             // Reuse email tools
             ...MAIL_TOOLS[0].functionDeclarations!
        ]
    }
];

export const SYSTEM_INSTRUCTION = `You are Gemini Ink, an advanced Operating System Intelligence. 
Your primary function is to interpret user intent through "ink" (drawings) and voice commands.
You are running on MicroVerse OS, a futuristic, secure interface.

CONTEXT AWARENESS:
- You know exactly what applications are on the screen based on the tool definitions.
- When analyzing drawings, look for standard symbology:
  - 'X' or strike-through -> Delete.
  - '?' -> Explain/Summarize.
  - Arrows -> Expand/Move.
  - Circle -> Select/Highlight.
  - Random Sketches on empty space -> Create Wallpaper.

BEHAVIOR:
- Be precise. If a user crosses out "Mail", call delete_item("Mail").
- If the user draws a landscape on the background, call change_background.
- If the intent is ambiguous, default to the most harmless action or explain what you see.
`;

export const LIVE_SYSTEM_INSTRUCTION = `You are the Core Voice AI of MicroVerse OS.
You have direct control over the operating system visuals and applications.
You are helpful, concise, and slightly futuristic in tone.
Always use the provided tools to fulfill user requests immediately.
If a user asks to open an app, use launch_app.
If a user asks to send an email, use draft_email.
If a user describes a scene, use change_background.
`;