import { Transaction } from '../types';

export interface FinancialStats {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    dailyStats: Record<string, { income: number, expense: number, balance: number }>;
}

/**
 * Calculates financial statistics for a given period, intelligently handling
 * transactions that cover multiple months (amortization).
 * 
 * Logic Update:
 * Instead of calculating a single daily rate across the entire period (which causes
 * months with fewer days to have lower totals), we now allocate the amount equally
 * to each month bucket first, then derive a daily rate for that specific bucket.
 * 
 * @param transactions List of all transactions (should be historical up to endDate)
 * @param startDateStr Start date of the period to analyze (YYYY-MM-DD)
 * @param endDateStr End date of the period to analyze (YYYY-MM-DD)
 */
export const calculatePeriodStats = (
    transactions: Transaction[],
    startDateStr: string,
    endDateStr: string
): FinancialStats => {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Normalize to start of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const stats: FinancialStats = {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        dailyStats: {}
    };

    // Helper to add day stats
    const addDaily = (dateStr: string, amount: number, type: 'INCOME' | 'EXPENSE') => {
        if (!stats.dailyStats[dateStr]) {
            stats.dailyStats[dateStr] = { income: 0, expense: 0, balance: 0 };
        }
        if (type === 'INCOME') stats.dailyStats[dateStr].income += amount;
        else stats.dailyStats[dateStr].expense += amount;

        stats.dailyStats[dateStr].balance = stats.dailyStats[dateStr].income - stats.dailyStats[dateStr].expense;
    };

    const oneDayMs = 24 * 60 * 60 * 1000;

    // Iterate through all historical transactions
    transactions.forEach(tx => {
        const txDate = new Date(tx.date);
        txDate.setHours(0, 0, 0, 0);

        const months = tx.months_covered || 1;
        const totalAmount = tx.amount;

        // If it's a standard single-occurrence transaction
        if (months === 1) {
            // Only count if it falls within the window
            if (txDate >= startDate && txDate <= endDate) {
                if (tx.category_type === 'INCOME') {
                    stats.totalIncome += totalAmount;
                    addDaily(tx.date, totalAmount, 'INCOME');
                } else {
                    stats.totalExpense += totalAmount;
                    addDaily(tx.date, totalAmount, 'EXPENSE');
                }
            }
            return;
        }

        // --- New "Monthly Bucket" Amortization Logic ---
        // 1. Calculate the flat amount per month
        const monthlyAmount = totalAmount / months;

        // 2. Distribute this monthlyAmount over the specific days of each covered month
        for (let i = 0; i < months; i++) {
            // Determine the start/end of THIS bucket
            const bucketStart = new Date(txDate);
            bucketStart.setMonth(bucketStart.getMonth() + i);

            const bucketEnd = new Date(txDate);
            bucketEnd.setMonth(bucketEnd.getMonth() + i + 1);
            // bucketEnd is exclusive boundary for the loop

            const daysInBucket = Math.round((bucketEnd.getTime() - bucketStart.getTime()) / oneDayMs);

            if (daysInBucket <= 0) continue;

            const dailyAmount = monthlyAmount / daysInBucket;

            // Loop through days in this specific bucket
            let currentScanDate = new Date(bucketStart);
            while (currentScanDate < bucketEnd) {
                // Check if this day is within our Analysis Window
                if (currentScanDate >= startDate && currentScanDate <= endDate) {
                    const dateStr = currentScanDate.toISOString().split('T')[0];

                    if (tx.category_type === 'INCOME') {
                        stats.totalIncome += dailyAmount;
                        addDaily(dateStr, dailyAmount, 'INCOME');
                    } else {
                        stats.totalExpense += dailyAmount;
                        addDaily(dateStr, dailyAmount, 'EXPENSE');
                    }
                }
                currentScanDate.setDate(currentScanDate.getDate() + 1);
            }
        }
    });

    stats.balance = stats.totalIncome - stats.totalExpense;
    return stats;
};
