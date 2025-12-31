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
};
