import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export const initDB = async () => {
    if (db) return db;

    try {
        db = await Database.load('sqlite:finance.db');
        console.log('Database connected');
        await runMigrations(db);
        return db;
    } catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
    }
};

export const getDB = async () => {
    if (!db) {
        return await initDB();
    }
    return db;
}

const runMigrations = async (db: Database) => {
    // Table: Categories
    await db.execute(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
            is_default BOOLEAN DEFAULT 0,
            is_hidden BOOLEAN DEFAULT 0
        );
    `);

    // Table: Transactions
    await db.execute(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        );
    `);

    // Seed Default Categories if empty
    const countResult: any[] = await db.select('SELECT COUNT(*) as count FROM categories');
    if (countResult[0].count === 0) {
        const defaultIncome = ['Salary', 'Freelance', 'Investment', 'Gifts', 'Other Income'];
        const defaultExpense = ['Food', 'Rent', 'Electricity', 'Water', 'Transport', 'Internet / Mobile', 'Groceries', 'Entertainment', 'Health', 'Miscellaneous'];

        for (const cat of defaultIncome) {
            await db.execute('INSERT INTO categories (name, type, is_default) VALUES ($1, $2, $3)', [cat, 'INCOME', 1]);
        }
        for (const cat of defaultExpense) {
            await db.execute('INSERT INTO categories (name, type, is_default) VALUES ($1, $2, $3)', [cat, 'EXPENSE', 1]);
        }
        console.log('Default categories seeded');
    }

    // Table: Vault Configuration
    await db.execute(`
        CREATE TABLE IF NOT EXISTS vault_config (
            id INTEGER PRIMARY KEY,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            password_hint TEXT,
            auto_lock_minutes INTEGER DEFAULT 5,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_accessed DATETIME
        );
    `);

    // Table: Vault Credentials
    await db.execute(`
        CREATE TABLE IF NOT EXISTS vault_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            username_encrypted TEXT,
            password_encrypted TEXT NOT NULL,
            url TEXT,
            category TEXT DEFAULT 'general',
            notes_encrypted TEXT,
            iv TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
        );
    `);

    // Migration: Add months_covered to transactions if not exists
    try {
        await db.execute('ALTER TABLE transactions ADD COLUMN months_covered INTEGER DEFAULT 1');
        console.log('Migration: Added months_covered column');
    } catch (e) {
        // Column likely exists
    }
};

export const wipeDatabase = async () => {
    if (!db) return;
    try {
        await db.execute('DELETE FROM transactions');
        await db.execute('DELETE FROM categories'); // Optional: usually keep categories, but user asked to "wipe all records"
        await db.execute('DELETE FROM vault_credentials');
        // Re-seed default categories
        const defaultIncome = ['Salary', 'Freelance', 'Investment', 'Gifts', 'Other Income'];
        const defaultExpense = ['Food', 'Rent', 'Electricity', 'Water', 'Transport', 'Internet / Mobile', 'Groceries', 'Entertainment', 'Health', 'Miscellaneous'];
        for (const cat of defaultIncome) {
            await db.execute('INSERT INTO categories (name, type, is_default) VALUES ($1, $2, $3)', [cat, 'INCOME', 1]);
        }
        for (const cat of defaultExpense) {
            await db.execute('INSERT INTO categories (name, type, is_default) VALUES ($1, $2, $3)', [cat, 'EXPENSE', 1]);
        }
    } catch (error) {
        console.error('Failed to wipe database:', error);
        throw error;
    }
};
