/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Basic HTML Sanitizer to prevent XSS in the simulated browser
export const sanitizeHTML = (html: string): string => {
    // Remove script tags
    let clean = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
    // Remove event handlers (e.g., onclick, onload)
    clean = clean.replace(/ on\w+="[^"]*"/g, "");
    // Remove iframe, object, embed
    clean = clean.replace(/<(iframe|object|embed)\b[^>]*>([\s\S]*?)<\/\1>/gim, "");
    // Remove javascript: links
    clean = clean.replace(/href="javascript:[^"]*"/g, 'href="#"');
    
    return clean;
};

// Password Validation (Simulated complex complexity check)
export const validatePasswordStrength = (password: string): boolean => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas;
};

// Simulated Intrusion Detection
export const checkSystemIntegrity = (): boolean => {
    // In a real app, this would check hash of bundles, etc.
    // Here we just return true to simulate a "Green" status.
    return true;
};

// Advanced "Military Grade" Encryption Simulation
// This reverses, salts, and base64 encodes data to make it "unreadable" in transit
export const encryptPayload = (data: any): string => {
    try {
        const json = JSON.stringify(data);
        const salt = "MICROVERSE_SECURE_SALT_" + Date.now();
        const combined = salt + "::" + json;
        // Simple obfuscation pipeline: Reverse -> Base64
        const reversed = combined.split('').reverse().join('');
        return btoa(reversed);
    } catch (e) {
        return "ENCRYPTION_FAILED";
    }
};

export const generateSessionHash = (): string => {
    return Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
}