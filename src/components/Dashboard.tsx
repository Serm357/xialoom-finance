import React, { useEffect, useState } from 'react';
import { getDailySummary, getMonthSummary, getRecentTransactions, getTopCategories, getDailyHistory } from '../db/queries';
import { formatCurrency, formatDate } from '../lib/utils';
import { TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction } from '../types';

export const Dashboard: React.FC = () => {
    const [daily, setDaily] = useState({ income: 0, expense: 0 });
    const [monthly, setMonthly] = useState({ income: 0, expense: 0 });
    const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
    const [topExpenses, setTopExpenses] = useState<{ name: string, amount: number }[]>([]);
    const [weeklyTrend, setWeeklyTrend] = useState<{ date: string, amount: number }[]>([]);

    const [currentDate, setCurrentDate] = useState(new Date());

    const loadData = async () => {
        try {
            const dateStr = currentDate.toISOString().split('T')[0];
            const year = currentDate.getFullYear().toString();
            const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');

            const [d, m, recent, top, trend] = await Promise.all([
                getDailySummary(dateStr),
                getMonthSummary(year, month),
                getRecentTransactions(5),
                getTopCategories(year, month, 'EXPENSE', 3),
                getDailyHistory(7)
            ]);

            setDaily(d);
            setMonthly(m);
            setRecentTxs(recent);
            setTopExpenses(top);
            setWeeklyTrend(trend);
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

    const isToday = currentDate.toDateString() === new Date().toDateString();

    return (
        <div className="flex-col gap-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Dashboard</h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--secondary-color)', fontSize: '0.9rem' }}>
                        Financial Overview
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                    <button onClick={() => changeDate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-color)' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} color="var(--primary-color)" />
                        <span style={{ fontWeight: 500, minWidth: '140px', textAlign: 'center' }}>
                            {isToday ? 'Today' : currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                    <button onClick={() => changeDate(1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-color)' }}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Daily Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <SummaryCard
                    title="Daily Income"
                    amount={daily.income}
                    icon={<TrendingUp size={20} />}
                    color="var(--success-color)"
                    trend="+0%"
                />
                <SummaryCard
                    title="Daily Expenses"
                    amount={daily.expense}
                    icon={<TrendingDown size={20} />}
                    color="var(--danger-color)"
                    trend="+0%"
                />
                <SummaryCard
                    title="Daily Balance"
                    amount={daily.income - daily.expense}
                    icon={<Wallet size={20} />}
                    color={daily.income - daily.expense >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}
                />
            </div>

            {/* Monthly Overview & 7-Day Trend */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div className="card">
                    <h3 style={{ margin: '0 0 16px 0' }}>Monthly Overview - {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        <MonthlyStatCard
                            label="Income"
                            amount={monthly.income}
                            icon={<ArrowUpRight size={18} />}
                            color="var(--success-color)"
                        />
                        <MonthlyStatCard
                            label="Expenses"
                            amount={monthly.expense}
                            icon={<ArrowDownRight size={18} />}
                            color="var(--danger-color)"
                        />
                        <MonthlyStatCard
                            label="Net Savings"
                            amount={monthly.income - monthly.expense}
                            icon={<Wallet size={18} />}
                            color={monthly.income - monthly.expense >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}
                        />
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ margin: '0 0 12px 0' }}>7-Day Trend</h3>
                    {weeklyTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={120}>
                            <LineChart data={weeklyTrend}>
                                <Tooltip
                                    formatter={(value: any) => formatCurrency(value)}
                                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                />
                                <Line type="monotone" dataKey="amount" stroke="var(--primary-color)" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ color: 'var(--secondary-color)', textAlign: 'center', marginTop: '40px' }}>No data</p>
                    )}
                </div>
            </div>

            {/* Recent Transactions & Top Spending */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div className="card">
                    <h3 style={{ margin: '0 0 16px 0' }}>Recent Transactions</h3>
                    {recentTxs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recentTxs.map(tx => (
                                <div key={tx.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px',
                                    borderRadius: 'var(--radius)',
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 500 }}>{tx.category_name}</p>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--secondary-color)' }}>
                                            {formatDate(tx.date)} {tx.note && `• ${tx.note}`}
                                        </p>
                                    </div>
                                    <div style={{
                                        fontWeight: 600,
                                        color: tx.category_type === 'INCOME' ? 'var(--success-color)' : 'var(--danger-color)'
                                    }}>
                                        {tx.category_type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--secondary-color)', textAlign: 'center', padding: '40px 0' }}>No recent transactions</p>
                    )}
                </div>

                <div className="card">
                    <h3 style={{ margin: '0 0 16px 0' }}>Top Spending</h3>
                    {topExpenses.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {topExpenses.map((cat, idx) => {
                                const maxAmount = topExpenses[0]?.amount || 1;
                                const percentage = (cat.amount / maxAmount) * 100;
                                return (
                                    <div key={idx}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.9rem' }}>{cat.name}</span>
                                            <span style={{ fontWeight: 600 }}>{formatCurrency(cat.amount)}</span>
                                        </div>
                                        <div style={{
                                            width: '100%',
                                            height: '6px',
                                            background: 'var(--bg-color)',
                                            borderRadius: '3px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${percentage}%`,
                                                height: '100%',
                                                background: 'var(--danger-color)',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--secondary-color)', textAlign: 'center', padding: '40px 0' }}>No spending data</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const SummaryCard = ({ title, amount, icon, color, trend }: any) => (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 16, right: 16, opacity: 0.1, color: color || 'var(--text-color)' }}>
            {React.cloneElement(icon, { size: 64 })}
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ color: color || 'var(--text-color)' }}>{icon}</div>
                <p style={{ margin: 0, color: 'var(--secondary-color)', fontSize: '0.9rem' }}>{title}</p>
            </div>
            <h2 style={{ margin: '0', fontSize: '2rem', color: color || 'var(--text-color)' }}>
                {formatCurrency(amount)}
            </h2>
            {trend && (
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--secondary-color)' }}>{trend}</p>
            )}
        </div>
    </div>
);

const MonthlyStatCard = ({ label, amount, icon, color }: any) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: `${color}20`,
            color: color,
            marginBottom: '8px'
        }}>
            {icon}
        </div>
        <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--secondary-color)' }}>{label}</p>
        <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: color }}>{formatCurrency(amount)}</p>
    </div>
);
