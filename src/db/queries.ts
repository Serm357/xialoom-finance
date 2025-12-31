import { getDB } from './index';
import { Category, Transaction, TransactionPayload, TransactionType } from '../types';

// Categories
export const getCategories = async (): Promise<Category[]> => {
    const db = await getDB();
    return await db.select('SELECT * FROM categories WHERE is_hidden = 0 ORDER BY name ASC');
};

export const addCategory = async (name: string, type: TransactionType): Promise<number> => {
    const db = await getDB();
    const result = await db.execute('INSERT INTO categories (name, type) VALUES ($1, $2)', [name, type]);
    return result.lastInsertId as number;
};

export const hideCategory = async (id: number): Promise<void> => {
    const db = await getDB();
    await db.execute('UPDATE categories SET is_hidden = 1 WHERE id = $1 AND is_default = 0', [id]);
};

export const updateCategory = async (id: number, name: string): Promise<void> => {
    const db = await getDB();
    await db.execute('UPDATE categories SET name = $1 WHERE id = $2', [name, id]);
};

export const deleteCategory = async (id: number): Promise<void> => {
    const db = await getDB();
    // Cascade delete transactions first
    await db.execute('DELETE FROM transactions WHERE category_id = $1', [id]);
    // Then delete category
    await db.execute('DELETE FROM categories WHERE id = $1', [id]);
};

// Transactions
export const getTransactions = async (limit = 100, offset = 0): Promise<Transaction[]> => {
    const db = await getDB();
    return await db.select<Transaction[]>(`
    SELECT t.*, c.name as category_name, c.type as category_type 
    FROM transactions t 
    JOIN categories c ON t.category_id = c.id 
    ORDER BY t.date DESC, t.id DESC 
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
    const db = await getDB();
    return await db.select<Transaction[]>(`
      SELECT t.*, c.name as category_name, c.type as category_type 
      FROM transactions t 
      JOIN categories c ON t.category_id = c.id 
      ORDER BY t.date DESC, t.id DESC 
    `);
};

export const addTransaction = async (data: TransactionPayload): Promise<number> => {
    const db = await getDB();
    const result = await db.execute(
        'INSERT INTO transactions (category_id, amount, date, note, months_covered) VALUES ($1, $2, $3, $4, $5)',
        [data.category_id, data.amount, data.date, data.note || null, data.months_covered || 1]
    );
    return result.lastInsertId as number;
};

export const deleteTransaction = async (id: number): Promise<void> => {
    const db = await getDB();
    await db.execute('DELETE FROM transactions WHERE id = $1', [id]);
};

export const updateTransaction = async (id: number, data: TransactionPayload): Promise<void> => {
    const db = await getDB();
    await db.execute(
        'UPDATE transactions SET category_id = $1, amount = $2, date = $3, note = $4, months_covered = $5 WHERE id = $6',
        [data.category_id, data.amount, data.date, data.note || null, data.months_covered || 1, id]
    );
};

export const getTransactionsInRange = async (_start: string, end: string): Promise<Transaction[]> => {
    const db = await getDB();
    // We fetch a bit wider range or filter in JS if needed to account for "past transactions covering this future period"
    // Ideally, we fetch ALL transactions that *COULD* overlap the window.
    // Overlap condition:
    // User pays on TxDate. Covers N months.
    // End Date of Tx coverage = TxDate + N months.
    // We need Tx where (TxDate <= EndRange) AND (TxDate + Months >= StartRange)

    // For simplicity, let's fetch ALL transactions before the end date, 
    // and filter computationally in the smart logic to handle the overlaps correctly.
    // Or just fetch all. The DB isn't likely to be massive for a personal finance app right now.
    // Let's safe-guard by fetching where date <= end.

    return await db.select<Transaction[]>(`
        SELECT t.*, c.name as category_name, c.type as category_type 
        FROM transactions t 
        JOIN categories c ON t.category_id = c.id 
        WHERE t.date <= $1
        ORDER BY t.date ASC
      `, [end]);
};

// Summaries
export const getDailySummary = async (date: string): Promise<{ income: number, expense: number }> => {
    const db = await getDB();
    const result: any[] = await db.select(`
        SELECT 
            SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END) as income,
            SUM(CASE WHEN c.type = 'EXPENSE' THEN t.amount ELSE 0 END) as expense
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.date = $1
    `, [date]);

    return {
        income: result[0].income || 0,
        expense: result[0].expense || 0
    };
}

export const getMonthSummary = async (year: string, month: string): Promise<{ income: number, expense: number }> => {
    // month is 01-12
    const db = await getDB();
    const result: any[] = await db.select(`
        SELECT 
            SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END) as income,
            SUM(CASE WHEN c.type = 'EXPENSE' THEN t.amount ELSE 0 END) as expense
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE strftime('%Y', t.date) = $1 AND strftime('%m', t.date) = $2
    `, [year, month]);

    return {
        income: result[0].income || 0,
        expense: result[0].expense || 0
    };
}

export const getCategoryBreakdown = async (year: string, month: string): Promise<{ name: string, value: number, type: string }[]> => {
    const db = await getDB();
    return await db.select(`
        SELECT c.name, SUM(t.amount) as value, c.type
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE strftime('%Y', t.date) = $1 AND strftime('%m', t.date) = $2
        GROUP BY c.id
        ORDER BY value DESC
     `, [year, month]);
}

export const getDailyHistory = async (days = 30): Promise<{ date: string, amount: number }[]> => {
    const db = await getDB();
    return await db.select(`
        SELECT date, SUM(amount) as amount
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE c.type = 'EXPENSE'
        GROUP BY date
        ORDER BY date DESC
        LIMIT $1
    `, [days]);
}

export const getRecentTransactions = async (limit = 5): Promise<Transaction[]> => {
    const db = await getDB();
    return await db.select<Transaction[]>(`
        SELECT t.*, c.name as category_name, c.type as category_type 
        FROM transactions t 
        JOIN categories c ON t.category_id = c.id 
        ORDER BY t.date DESC, t.id DESC 
        LIMIT $1
    `, [limit]);
};

export const getTopCategories = async (year: string, month: string, type: 'INCOME' | 'EXPENSE', limit = 3): Promise<{ name: string, amount: number }[]> => {
    const db = await getDB();
    return await db.select(`
        SELECT c.name, SUM(t.amount) as amount
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE c.type = $1 AND strftime('%Y', t.date) = $2 AND strftime('%m', t.date) = $3
        GROUP BY c.id
        ORDER BY amount DESC
        LIMIT $4
    `, [type, year, month, limit]);
};

export const getMonthlyTotals = async (year: string, month: string): Promise<{ income: number, expense: number }> => {
    const db = await getDB();
    const result = await db.select<any[]>(`
        SELECT 
            COALESCE(SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN c.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) as expense
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE strftime('%Y', t.date) = $1 AND strftime('%m', t.date) = $2
    `, [year, month]);
    return { income: result[0]?.income || 0, expense: result[0]?.expense || 0 };
};

export const getMonthlyHistory = async (months = 6): Promise<{ month: string, income: number, expense: number }[]> => {
    const db = await getDB();
    return await db.select(`
        SELECT 
            strftime('%Y-%m', t.date) as month,
            COALESCE(SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN c.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) as expense
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        GROUP BY strftime('%Y-%m', t.date)
        ORDER BY month DESC
        LIMIT $1
    `, [months]);
};

export const getTransactionCount = async (year: string, month: string): Promise<number> => {
    const db = await getDB();
    const result = await db.select<any[]>(`
        SELECT COUNT(*) as count FROM transactions t
        WHERE strftime('%Y', t.date) = $1 AND strftime('%m', t.date) = $2
    `, [year, month]);
    return result[0]?.count || 0;
};
// Balance
export const getCurrentBalance = async (): Promise<number> => {
    const db = await getDB();
    const result = await db.select<any[]>(`
        SELECT 
            SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END) as income,
            SUM(CASE WHEN c.type = 'EXPENSE' THEN t.amount ELSE 0 END) as expense
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
    `);

    const income = result[0]?.income || 0;
    const expense = result[0]?.expense || 0;
    return income - expense;
};
