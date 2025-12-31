import React, { useEffect, useState } from 'react';
import { getDailySummary, getMonthSummary } from '../db/queries';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const [daily, setDaily] = useState({ income: 0, expense: 0 });
    const [monthly, setMonthly] = useState({ income: 0, expense: 0 });

    // Date state
    const [currentDate, setCurrentDate] = useState(new Date());

    const loadData = async () => {
        try {
            const dateStr = currentDate.toISOString().split('T')[0];
            const year = currentDate.getFullYear().toString();
            const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');

            const d = await getDailySummary(dateStr);
            const m = await getMonthSummary(year, month);

            setDaily(d);
            setMonthly(m);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentDate]);

    const changeDate = (days: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + days);
        setCurrentDate(newDate);
    };

    return (
        <div className="flex-col gap-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Dashboard</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                    <button onClick={() => changeDate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
                    <span style={{ fontWeight: 500 }}>{currentDate.toDateString()}</span>
                    <button onClick={() => changeDate(1)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><ChevronRight size={20} /></button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <SummaryCard
                    title="Daily Income"
                    amount={daily.income}
                    icon={<TrendingUp color="var(--success-color)" />}
                    trend="Selected Day"
                />
                <SummaryCard
                    title="Daily Expenses"
                    amount={daily.expense}
                    icon={<TrendingDown color="var(--danger-color)" />}
                    trend="Selected Day"
                />
                <SummaryCard
                    title="Daily Balance"
                    amount={daily.income - daily.expense}
                    icon={<Wallet color="var(--primary-color)" />}
                    trend="Selected Day"
                />
            </div>

            <h3 style={{ margin: '32px 0 16px 0' }}>Monthly Overview ({currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })})</h3>
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
