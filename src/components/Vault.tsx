import React, { useState, useEffect, useCallback, createContext } from 'react';
import {
    isVaultConfigured, getVaultConfig, createVaultConfig, updateLastAccessed,
    getCredentials, addCredential, updateCredential, deleteCredential,
    VaultCredential, VaultConfig
} from '../db/vaultQueries';
import {
    hashPassword, verifyPassword, generateSalt, encrypt, decrypt,
    generatePassword, calculatePasswordStrength
} from '../lib/crypto';

import {
    Lock, Unlock, Plus, Trash2, Pencil, Eye, EyeOff, Copy, Check,
    Search, Key, Globe, User, RefreshCw, Shield, X, AlertTriangle
} from 'lucide-react';

// Vault Categories
const VAULT_CATEGORIES = ['Email', 'Bank', 'Work', 'Social', 'Shopping', 'Crypto', 'Other'];

// Context for vault state
interface VaultContextType {
    isUnlocked: boolean;
    password: string;
    salt: string;
    config: VaultConfig | null;
    unlock: (password: string) => Promise<boolean>;
    lock: () => void;
    autoLockTimeout: ReturnType<typeof setTimeout> | null;
}

const VaultContext = createContext<VaultContextType | null>(null);

export const Vault: React.FC = () => {
    const [configured, setConfigured] = useState<boolean | null>(null);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [password, setPassword] = useState('');
    const [salt, setSalt] = useState('');
    const [config, setConfig] = useState<VaultConfig | null>(null);
    const [autoLockTimeout, setAutoLockTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        checkVaultStatus();
    }, []);

    const checkVaultStatus = async () => {
        const isConfigured = await isVaultConfigured();
        setConfigured(isConfigured);
        if (isConfigured) {
            const cfg = await getVaultConfig();
            setConfig(cfg);
            if (cfg) setSalt(cfg.password_salt);
        }
    };

    const unlock = async (pwd: string): Promise<boolean> => {
        if (!config) return false;
        const isValid = await verifyPassword(pwd, config.password_salt, config.password_hash);
        if (isValid) {
            setPassword(pwd);
            setIsUnlocked(true);
            await updateLastAccessed();
            startAutoLockTimer(config.auto_lock_minutes);
            return true;
        }
        return false;
    };

    const lock = useCallback(() => {
        setPassword('');
        setIsUnlocked(false);
        if (autoLockTimeout) clearTimeout(autoLockTimeout);
    }, [autoLockTimeout]);

    const startAutoLockTimer = (minutes: number) => {
        if (autoLockTimeout) clearTimeout(autoLockTimeout);
        const timeout = setTimeout(() => {
            lock();
        }, minutes * 60 * 1000);
        setAutoLockTimeout(timeout);
    };

    const resetActivityTimer = useCallback(() => {
        if (config && isUnlocked) {
            startAutoLockTimer(config.auto_lock_minutes);
        }
    }, [config, isUnlocked]);

    useEffect(() => {
        const handleActivity = () => resetActivityTimer();
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
        };
    }, [resetActivityTimer]);

    const handleSetupComplete = async () => {
        await checkVaultStatus();
    };

    if (configured === null) {
        return <div className="flex-col gap-4"><div className="animate-pulse">Loading vault...</div></div>;
    }

    if (!configured) {
        return <VaultSetup onComplete={handleSetupComplete} />;
    }

    if (!isUnlocked) {
        if (!config) {
            return <div className="flex-col gap-4"><div className="animate-pulse">Loading vault configuration...</div></div>;
        }
        return <VaultUnlock config={config} onUnlock={unlock} />;
    }

    return (
        <VaultContext.Provider value={{ isUnlocked, password, salt, config, unlock, lock, autoLockTimeout }}>
            <VaultMain password={password} salt={salt} onLock={lock} />
        </VaultContext.Provider>
    );
};

// Setup Component
const VaultSetup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [hint, setHint] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const strength = calculatePasswordStrength(password);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const salt = generateSalt();
            const hash = await hashPassword(password, salt);
            await createVaultConfig(hash, salt, hint || null);
            onComplete();
        } catch (err) {
            setError('Failed to create vault');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-col gap-4 animate-fade-in">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px'
                }}>
                    <Shield size={40} color="white" />
                </div>
                <h2 style={{ margin: 0 }}>Setup Password Vault</h2>
                <p style={{ color: 'var(--secondary-color)', marginTop: '8px' }}>
                    Create a master password to protect your credentials
                </p>
            </div>

            <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit} className="flex-col gap-4">
                    <div className="flex-col gap-2">
                        <label style={{ fontWeight: 500 }}>Master Password *</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter a strong password"
                                style={{ width: '100%', padding: '12px', paddingRight: '44px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-color)' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${strength}%`,
                                height: '100%',
                                background: strength < 40 ? '#ef4444' : strength < 70 ? '#f59e0b' : '#22c55e',
                                transition: 'all 0.3s'
                            }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
                            Strength: {strength < 40 ? 'Weak' : strength < 70 ? 'Medium' : 'Strong'}
                        </span>
                    </div>

                    <div className="flex-col gap-2">
                        <label style={{ fontWeight: 500 }}>Confirm Password *</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                            required
                        />
                    </div>

                    <div className="flex-col gap-2">
                        <label style={{ fontWeight: 500 }}>Password Hint (Optional)</label>
                        <input
                            type="text"
                            value={hint}
                            onChange={e => setHint(e.target.value)}
                            placeholder="A hint to help you remember"
                            style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
                            This hint will be shown if you forget your password
                        </span>
                    </div>

                    {error && (
                        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={18} />
                            {error}
                        </div>
                    )}

                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--secondary-color)' }}>
                        <strong>⚠️ Important:</strong> There is no way to recover your vault if you forget your password. Make sure to remember it or store the hint safely.
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
                        {loading ? 'Creating Vault...' : 'Create Vault'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// Unlock Component
const VaultUnlock: React.FC<{ config: VaultConfig; onUnlock: (password: string) => Promise<boolean> }> = ({ config, onUnlock }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const success = await onUnlock(password);
        if (!success) {
            setError('Incorrect password');
        }
        setLoading(false);
    };

    return (
        <div className="flex-col gap-4 animate-fade-in" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'var(--card-bg)',
                    border: '2px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px'
                }}>
                    <Lock size={36} color="var(--primary-color)" />
                </div>
                <h2 style={{ margin: 0 }}>Vault Locked</h2>
                <p style={{ color: 'var(--secondary-color)', marginTop: '8px' }}>
                    Enter your master password to unlock
                </p>
            </div>

            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                <form onSubmit={handleSubmit} className="flex-col gap-4">
                    <div className="flex-col gap-2">
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Master Password"
                                style={{ width: '100%', padding: '12px', paddingRight: '44px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                                autoFocus
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-color)' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)', color: '#ef4444', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        <Unlock size={18} />
                        {loading ? 'Unlocking...' : 'Unlock Vault'}
                    </button>

                    {config.password_hint && (
                        <div style={{ textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={() => setShowHint(!showHint)}
                                style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.9rem' }}
                            >
                                {showHint ? 'Hide Hint' : 'Show Hint'}
                            </button>
                            {showHint && (
                                <p style={{ marginTop: '8px', padding: '8px', background: 'var(--bg-color)', borderRadius: 'var(--radius-sm)', color: 'var(--secondary-color)' }}>
                                    💡 {config.password_hint}
                                </p>
                            )}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

// Main Vault Component
const VaultMain: React.FC<{ password: string; salt: string; onLock: () => void }> = ({ password, salt, onLock }) => {
    const [credentials, setCredentials] = useState<VaultCredential[]>([]);
    const [decryptedCreds, setDecryptedCreds] = useState<Map<number, { username: string; password: string; notes: string }>>(new Map());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [showForm, setShowForm] = useState(false);
    const [editingCred, setEditingCred] = useState<VaultCredential | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCredentials();
    }, []);

    const loadCredentials = async () => {
        setLoading(true);
        const creds = await getCredentials();
        setCredentials(creds);

        // Decrypt all credentials
        const decrypted = new Map();
        for (const cred of creds) {
            try {
                const username = cred.username_encrypted ? await decrypt(cred.username_encrypted, cred.iv, password, salt) : '';
                const pwd = await decrypt(cred.password_encrypted, cred.iv, password, salt);
                const notes = cred.notes_encrypted ? await decrypt(cred.notes_encrypted, cred.iv, password, salt) : '';
                decrypted.set(cred.id, { username, password: pwd, notes });
            } catch (err) {
                console.error('Failed to decrypt credential', cred.id, err);
            }
        }
        setDecryptedCreds(decrypted);
        setLoading(false);
    };

    const filteredCredentials = credentials.filter(c => {
        const matchesSearch = !searchQuery ||
            c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleEdit = (cred: VaultCredential) => {
        setEditingCred(cred);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Delete this credential? This cannot be undone.')) {
            await deleteCredential(id);
            loadCredentials();
        }
    };

    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingCred(null);
        loadCredentials();
    };

    return (
        <div className="flex-col gap-4 animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={24} color="var(--primary-color)" />
                        Password Vault
                    </h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--secondary-color)', fontSize: '0.9rem' }}>
                        {credentials.length} credential{credentials.length !== 1 ? 's' : ''} stored securely
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary" onClick={() => { setEditingCred(null); setShowForm(true); }}>
                        <Plus size={18} /> Add Credential
                    </button>
                    <button className="btn" onClick={onLock} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                        <Lock size={18} /> Lock
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-color)' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search credentials..."
                            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                    >
                        <option value="">All Categories</option>
                        {VAULT_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Credentials Grid */}
            {loading ? (
                <div className="card animate-pulse" style={{ textAlign: 'center', padding: '40px' }}>
                    Loading credentials...
                </div>
            ) : filteredCredentials.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {filteredCredentials.map(cred => (
                        <CredentialCard
                            key={cred.id}
                            credential={cred}
                            decrypted={decryptedCreds.get(cred.id)}
                            onEdit={() => handleEdit(cred)}
                            onDelete={() => handleDelete(cred.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Key size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <p style={{ color: 'var(--secondary-color)', margin: 0 }}>
                        {searchQuery || selectedCategory ? 'No matching credentials' : 'No credentials yet'}
                    </p>
                    {!searchQuery && !selectedCategory && (
                        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: '16px' }}>
                            <Plus size={18} /> Add Your First Credential
                        </button>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showForm && (
                <CredentialForm
                    credential={editingCred}
                    decrypted={editingCred ? decryptedCreds.get(editingCred.id) : undefined}
                    password={password}
                    salt={salt}
                    onSuccess={handleFormSuccess}
                    onCancel={() => { setShowForm(false); setEditingCred(null); }}
                />
            )}
        </div>
    );
};

// Credential Card
const CredentialCard: React.FC<{
    credential: VaultCredential;
    decrypted?: { username: string; password: string; notes: string };
    onEdit: () => void;
    onDelete: () => void;
}> = ({ credential, decrypted, onEdit, onDelete }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState<'username' | 'password' | null>(null);

    const copyToClipboard = async (text: string, type: 'username' | 'password') => {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const categoryColors: Record<string, string> = {
        Email: '#ef4444',
        Bank: '#22c55e',
        Work: '#3b82f6',
        Social: '#8b5cf6',
        Shopping: '#f59e0b',
        Crypto: '#06b6d4',
        Other: '#6b7280'
    };

    return (
        <div className="card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                    <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: `${categoryColors[credential.category] || '#6b7280'}20`,
                        color: categoryColors[credential.category] || '#6b7280',
                        marginBottom: '8px'
                    }}>
                        {credential.category}
                    </span>
                    <h4 style={{ margin: 0 }}>{credential.title}</h4>
                    {credential.url && (
                        <a href={credential.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <Globe size={14} /> {new URL(credential.url).hostname}
                        </a>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', padding: '4px' }}>
                        <Pencil size={16} />
                    </button>
                    <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-color)', padding: '4px' }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {decrypted && (
                <div className="flex-col gap-2" style={{ fontSize: '0.9rem' }}>
                    {decrypted.username && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-color)', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <User size={14} color="var(--secondary-color)" />
                                <span>{decrypted.username}</span>
                            </div>
                            <button onClick={() => copyToClipboard(decrypted.username, 'username')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'username' ? 'var(--success-color)' : 'var(--secondary-color)', padding: '4px' }}>
                                {copied === 'username' ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-color)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Key size={14} color="var(--secondary-color)" />
                            <span>{showPassword ? decrypted.password : '••••••••'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-color)', padding: '4px' }}>
                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button onClick={() => copyToClipboard(decrypted.password, 'password')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'password' ? 'var(--success-color)' : 'var(--secondary-color)', padding: '4px' }}>
                                {copied === 'password' ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Credential Form
const CredentialForm: React.FC<{
    credential: VaultCredential | null;
    decrypted?: { username: string; password: string; notes: string };
    password: string;
    salt: string;
    onSuccess: () => void;
    onCancel: () => void;
}> = ({ credential, decrypted, password, salt, onSuccess, onCancel }) => {
    const [title, setTitle] = useState(credential?.title || '');
    const [username, setUsername] = useState(decrypted?.username || '');
    const [pwd, setPwd] = useState(decrypted?.password || '');
    const [url, setUrl] = useState(credential?.url || '');
    const [category, setCategory] = useState(credential?.category || 'Other');
    const [notes, setNotes] = useState(decrypted?.notes || '');
    const [showPassword, setShowPassword] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !pwd) return;

        setLoading(true);
        try {
            const { ciphertext: passwordEnc, iv } = await encrypt(pwd, password, salt);
            const usernameEnc = username ? (await encrypt(username, password, salt)).ciphertext : null;
            const notesEnc = notes ? (await encrypt(notes, password, salt)).ciphertext : null;

            if (credential) {
                await updateCredential(credential.id, title, usernameEnc, passwordEnc, url || null, category, notesEnc, iv);
            } else {
                await addCredential(title, usernameEnc, passwordEnc, url || null, category, notesEnc, iv);
            }
            onSuccess();
        } catch (err) {
            console.error('Failed to save credential', err);
            alert('Failed to save credential');
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePassword = (generated: string) => {
        setPwd(generated);
        setShowGenerator(false);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} className="animate-fade-in">
            <div className="card animate-slide-in" style={{ width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>{credential ? 'Edit Credential' : 'Add Credential'}</h3>
                    <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-color)' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-col gap-3">
                    <div className="flex-col gap-2">
                        <label style={{ fontWeight: 500 }}>Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g., Gmail, Bank of America"
                            style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                            required
                        />
                    </div>

                    <div className="flex-col gap-2">
                        <label style={{ fontWeight: 500 }}>Category</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                        >
                            {VAULT_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-col gap-2">
                        <label style={{ fontWeight: 500 }}>Username / Email</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Enter username or email"
                            style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                        />
                    </div>

                    <div className="flex-col gap-2">
                        <label style={{ fontWeight: 500 }}>Password *</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={pwd}
                                    onChange={e => setPwd(e.target.value)}
                                    placeholder="Enter password"
                                    style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-color)' }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGenerator(!showGenerator)}
                                className="btn"
                                style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                        {showGenerator && <PasswordGenerator onGenerate={handleGeneratePassword} />}
                    </div>

                    <div className="flex-col gap-2">
                        <label style={{ fontWeight: 500 }}>URL</label>
                        <input
                            type="url"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://example.com"
                            style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                        />
                    </div>

                    <div className="flex-col gap-2">
                        <label style={{ fontWeight: 500 }}>Notes</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Additional notes (encrypted)"
                            rows={3}
                            style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                        <button type="button" className="btn" onClick={onCancel} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Password Generator
const PasswordGenerator: React.FC<{ onGenerate: (password: string) => void }> = ({ onGenerate }) => {
    const [length, setLength] = useState(16);
    const [uppercase, setUppercase] = useState(true);
    const [lowercase, setLowercase] = useState(true);
    const [numbers, setNumbers] = useState(true);
    const [symbols, setSymbols] = useState(true);
    const [generated, setGenerated] = useState('');

    useEffect(() => {
        generate();
    }, [length, uppercase, lowercase, numbers, symbols]);

    const generate = () => {
        const pwd = generatePassword({ length, uppercase, lowercase, numbers, symbols });
        setGenerated(pwd);
    };

    return (
        <div style={{ padding: '12px', background: 'var(--bg-color)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <input
                    type="text"
                    value={generated}
                    readOnly
                    style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontFamily: 'monospace' }}
                />
                <button type="button" onClick={generate} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-color)' }}>
                    <RefreshCw size={16} />
                </button>
            </div>

            <div className="flex-col gap-2" style={{ fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Length: {length}</span>
                    <input type="range" min={8} max={32} value={length} onChange={e => setLength(Number(e.target.value))} style={{ width: '120px' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={uppercase} onChange={e => setUppercase(e.target.checked)} /> Uppercase (A-Z)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={lowercase} onChange={e => setLowercase(e.target.checked)} /> Lowercase (a-z)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={numbers} onChange={e => setNumbers(e.target.checked)} /> Numbers (0-9)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={symbols} onChange={e => setSymbols(e.target.checked)} /> Symbols (!@#$%...)
                </label>
            </div>

            <button type="button" onClick={() => onGenerate(generated)} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                Use This Password
            </button>
        </div>
    );
};
