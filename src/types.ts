export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Category {
    id: number;
    name: string;
    type: TransactionType;
    is_default: boolean;
    is_hidden: boolean;
}

export interface Transaction {
    id: number;
    category_id: number;
    amount: number;
    date: string; // ISO Date string YYYY-MM-DD
    note?: string;
    created_at?: string;
    // Joined fields
    category_name?: string;
    category_type?: TransactionType;
    months_covered?: number;
}

export interface TransactionPayload {
    category_id: number;
    amount: number;
    date: string;
    note?: string;
    months_covered?: number;
}

export interface DailySummary {
    date: string;
    income: number;
    expense: number;
    balance: number;
}

export interface DateRange {
    start: string;
    end: string;
}
