import React, { useEffect, useState } from 'react';
import { getDailySummary, getMonthSummary } from '../db/queries';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const [daily, setDaily] = useState({ income: 0, expense: 0 });
    const [monthly, setMonthly] = useState({ income: 0, expense: 0 });
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const now = new Date();
            const year = now.getFullYear().toString();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');

            const d = await getDailySummary(today);
            const m = await getMonthSummary(year, month);

            setDaily(d);
            setMonthly(m);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // Listen for updates? For now just load on mount.
        // In a real app we might use a context or event emitter for data refreshes.
        const interval = setInterval(loadData, 5000); // Poll for updates every 5s for simple reactivity
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="flex-col gap-4">
            <h2 style={{ margin: '0 0 16px 0' }}>Today's Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <SummaryCard
                    title="Daily Income"
                    amount={daily.income}
                    icon={<TrendingUp color="var(--success-color)" />}
                    trend="Today"
                />
                <SummaryCard
                    title="Daily Expenses"
                    amount={daily.expense}
                    icon={<TrendingDown color="var(--danger-color)" />}
                    trend="Today"
                />
                <SummaryCard
                    title="Daily Balance"
                    amount={daily.income - daily.expense}
                    icon={<Wallet color="var(--primary-color)" />}
                    trend="Today"
                />
            </div>

            <h2 style={{ margin: '32px 0 16px 0' }}>Monthly Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <SummaryCard
                    title="Monthly Income"
                    amount={monthly.income}
                    icon={<TrendingUp color="var(--success-color)" />}
                    trend="This Month"
                />
                <SummaryCard
                    title="Monthly Expenses"
                    amount={monthly.expense}
                    icon={<TrendingDown color="var(--danger-color)" />}
                    trend="This Month"
                />
                <SummaryCard
                    title="Net Savings"
                    amount={monthly.income - monthly.expense}
                    icon={<Wallet color="var(--primary-color)" />}
                    trend="This Month"
                />
            </div>
        </div>
    );
};

const SummaryCard = ({ title, amount, icon, trend }: any) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
            <p style={{ margin: 0, color: 'var(--secondary-color)', fontSize: '0.9rem' }}>{title}</p>
            <h3 style={{ margin: '4px 0', fontSize: '1.5rem' }}>{formatCurrency(amount)}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--secondary-color)' }}>{trend}</span>
        </div>
        <div style={{
            width: 48, height: 48,
            borderRadius: '50%',
            background: 'var(--bg-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {icon}
        </div>
    </div>
);
