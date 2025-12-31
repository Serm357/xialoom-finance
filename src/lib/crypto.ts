/**
 * Crypto utilities for password vault
 * Uses Web Crypto API for encryption/decryption and PBKDF2 for key derivation
 */

// Convert ArrayBuffer to base64 string
const bufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

// Convert base64 string to ArrayBuffer
const base64ToBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer as ArrayBuffer;
};

/**
 * Generate a random salt for password hashing
 */
export const generateSalt = (): string => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return bufferToBase64(salt.buffer as ArrayBuffer);
};

/**
 * Hash a password using PBKDF2 with SHA-256
 * Returns base64 encoded hash
 */
export const hashPassword = async (password: string, salt: string): Promise<string> => {
    const passwordBuffer = new TextEncoder().encode(password);
    const saltBuffer = base64ToBuffer(salt);

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer as BufferSource,
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    return bufferToBase64(derivedBits);
};

/**
 * Verify a password against a stored hash
 */
export const verifyPassword = async (password: string, salt: string, storedHash: string): Promise<boolean> => {
    const hash = await hashPassword(password, salt);
    return hash === storedHash;
};

/**
 * Derive an encryption key from password using PBKDF2
 */
const deriveKey = async (password: string, salt: string): Promise<CryptoKey> => {
    const passwordBuffer = new TextEncoder().encode(password);
    const saltBuffer = base64ToBuffer(salt);

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer as BufferSource,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

/**
 * Encrypt data using AES-256-GCM
 * Returns { ciphertext: base64, iv: base64 }
 */
export const encrypt = async (plaintext: string, password: string, salt: string): Promise<{ ciphertext: string; iv: string }> => {
    const key = await deriveKey(password, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintextBuffer = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        plaintextBuffer as BufferSource
    );

    return {
        ciphertext: bufferToBase64(ciphertext),
        iv: bufferToBase64(iv.buffer as ArrayBuffer)
    };
};

/**
 * Decrypt data using AES-256-GCM
 */
export const decrypt = async (ciphertext: string, iv: string, password: string, salt: string): Promise<string> => {
    const key = await deriveKey(password, salt);
    const ciphertextBuffer = base64ToBuffer(ciphertext);
    const ivBuffer = new Uint8Array(base64ToBuffer(iv));

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        key,
        ciphertextBuffer
    );

    return new TextDecoder().decode(decrypted);
};

/**
 * Generate a random password
 */
export interface PasswordOptions {
    length: number;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
}

export const generatePassword = (options: PasswordOptions): string => {
    const { length, uppercase, lowercase, numbers, symbols } = options;

    let charset = '';
    if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (numbers) charset += '0123456789';
    if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!charset) charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const randomValues = crypto.getRandomValues(new Uint32Array(length));
    let password = '';

    for (let i = 0; i < length; i++) {
        password += charset[randomValues[i] % charset.length];
    }

    return password;
};

/**
 * Calculate password strength (0-100)
 */
export const calculatePasswordStrength = (password: string): number => {
    let score = 0;

    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;

    return Math.min(100, score);
};
