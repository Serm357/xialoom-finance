import { getDB } from './index';

export interface VaultConfig {
    id: number;
    password_hash: string;
    password_salt: string;
    password_hint: string | null;
    auto_lock_minutes: number;
    created_at: string;
    last_accessed: string | null;
}

export interface VaultCredential {
    id: number;
    title: string;
    username_encrypted: string | null;
    password_encrypted: string;
    url: string | null;
    category: string;
    notes_encrypted: string | null;
    iv: string;
    created_at: string;
    updated_at: string | null;
}

export interface DecryptedCredential {
    id: number;
    title: string;
    username: string;
    password: string;
    url: string | null;
    category: string;
    notes: string;
    created_at: string;
    updated_at: string | null;
}

// Vault Configuration
export const getVaultConfig = async (): Promise<VaultConfig | null> => {
    const db = await getDB();
    const result = await db.select<VaultConfig[]>('SELECT * FROM vault_config WHERE id = 1');
    return result[0] || null;
};

export const isVaultConfigured = async (): Promise<boolean> => {
    const config = await getVaultConfig();
    return config !== null;
};

export const createVaultConfig = async (
    passwordHash: string,
    passwordSalt: string,
    passwordHint: string | null,
    autoLockMinutes: number = 5
): Promise<void> => {
    const db = await getDB();
    await db.execute(
        `INSERT OR REPLACE INTO vault_config (id, password_hash, password_salt, password_hint, auto_lock_minutes) 
         VALUES (1, $1, $2, $3, $4)`,
        [passwordHash, passwordSalt, passwordHint, autoLockMinutes]
    );
};

export const updateLastAccessed = async (): Promise<void> => {
    const db = await getDB();
    await db.execute('UPDATE vault_config SET last_accessed = CURRENT_TIMESTAMP WHERE id = 1');
};

export const updateVaultHint = async (hint: string | null): Promise<void> => {
    const db = await getDB();
    await db.execute('UPDATE vault_config SET password_hint = $1 WHERE id = 1', [hint]);
};

export const updateAutoLock = async (minutes: number): Promise<void> => {
    const db = await getDB();
    await db.execute('UPDATE vault_config SET auto_lock_minutes = $1 WHERE id = 1', [minutes]);
};

// Credentials CRUD
export const getCredentials = async (): Promise<VaultCredential[]> => {
    const db = await getDB();
    return await db.select<VaultCredential[]>('SELECT * FROM vault_credentials ORDER BY title ASC');
};

export const getCredentialById = async (id: number): Promise<VaultCredential | null> => {
    const db = await getDB();
    const result = await db.select<VaultCredential[]>('SELECT * FROM vault_credentials WHERE id = $1', [id]);
    return result[0] || null;
};

export const addCredential = async (
    title: string,
    usernameEncrypted: string | null,
    passwordEncrypted: string,
    url: string | null,
    category: string,
    notesEncrypted: string | null,
    iv: string
): Promise<number> => {
    const db = await getDB();
    const result = await db.execute(
        `INSERT INTO vault_credentials (title, username_encrypted, password_encrypted, url, category, notes_encrypted, iv)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [title, usernameEncrypted, passwordEncrypted, url, category, notesEncrypted, iv]
    );
    return result.lastInsertId as number;
};

export const updateCredential = async (
    id: number,
    title: string,
    usernameEncrypted: string | null,
    passwordEncrypted: string,
    url: string | null,
    category: string,
    notesEncrypted: string | null,
    iv: string
): Promise<void> => {
    const db = await getDB();
    await db.execute(
        `UPDATE vault_credentials 
         SET title = $1, username_encrypted = $2, password_encrypted = $3, url = $4, 
             category = $5, notes_encrypted = $6, iv = $7, updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [title, usernameEncrypted, passwordEncrypted, url, category, notesEncrypted, iv, id]
    );
};

export const deleteCredential = async (id: number): Promise<void> => {
    const db = await getDB();
    await db.execute('DELETE FROM vault_credentials WHERE id = $1', [id]);
};

export const searchCredentials = async (query: string): Promise<VaultCredential[]> => {
    const db = await getDB();
    return await db.select<VaultCredential[]>(
        `SELECT * FROM vault_credentials 
         WHERE title LIKE $1 OR url LIKE $1 OR category LIKE $1
         ORDER BY title ASC`,
        [`%${query}%`]
    );
};

export const getCredentialsByCategory = async (category: string): Promise<VaultCredential[]> => {
    const db = await getDB();
    return await db.select<VaultCredential[]>(
        'SELECT * FROM vault_credentials WHERE category = $1 ORDER BY title ASC',
        [category]
    );
};

// Reset vault (WARNING: deletes all credentials)
export const resetVault = async (): Promise<void> => {
    const db = await getDB();
    await db.execute('DELETE FROM vault_credentials');
    await db.execute('DELETE FROM vault_config');
};
