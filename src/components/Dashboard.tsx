import React, { useEffect, useState } from 'react';
import { getTransactionsInRange, getRecentTransactions, getCurrentBalance } from '../db/queries';
import { calculatePeriodStats, FinancialStats } from '../lib/finance';
import { formatCurrency, formatDate } from '../lib/utils';
import {
    TrendingUp, TrendingDown, Wallet, Calendar,
    ChevronLeft, ChevronRight, Activity, ArrowUpRight, ArrowDownRight, BarChart3, Clock
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import { Transaction } from '../types';

type DateRangeType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export const Dashboard: React.FC = () => {
    const [rangeType, setRangeType] = useState<DateRangeType>('MONTHLY');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [stats, setStats] = useState<FinancialStats | null>(null);
    const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
    const [currentBalance, setCurrentBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [currentDate, rangeType]);

    const getRangeDates = () => {
        const start = new Date(currentDate);
        const end = new Date(currentDate);

        if (rangeType === 'DAILY') {
            // Start and End are same day
        } else if (rangeType === 'WEEKLY') {
            // Start is Monday, End is Sunday
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            start.setDate(diff);
            end.setDate(diff + 6);
        } else if (rangeType === 'MONTHLY') {
            start.setDate(1);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
        } else if (rangeType === 'YEARLY') {
            start.setMonth(0, 1);
            end.setMonth(11, 31);
        }
        return { start, end };
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const { start, end } = getRangeDates();
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];

            // For Smart Analysis (Accrual), we fetch historical data
            const allTxs = await getTransactionsInRange('2000-01-01', endStr);

            const calculatedStats = calculatePeriodStats(allTxs, startStr, endStr);
            setStats(calculatedStats);

            const recent = await getRecentTransactions(5);
            setRecentTxs(recent);

            // Fetch real-time physical balance
            const cashBal = await getCurrentBalance();
            setCurrentBalance(cashBal);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (rangeType === 'DAILY') newDate.setDate(newDate.getDate() - 1);
        if (rangeType === 'WEEKLY') newDate.setDate(newDate.getDate() - 7);
        if (rangeType === 'MONTHLY') newDate.setMonth(newDate.getMonth() - 1);
        if (rangeType === 'YEARLY') newDate.setFullYear(newDate.getFullYear() - 1);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (rangeType === 'DAILY') newDate.setDate(newDate.getDate() + 1);
        if (rangeType === 'WEEKLY') newDate.setDate(newDate.getDate() + 7);
        if (rangeType === 'MONTHLY') newDate.setMonth(newDate.getMonth() + 1);
        if (rangeType === 'YEARLY') newDate.setFullYear(newDate.getFullYear() + 1);
        setCurrentDate(newDate);
    };

    const getRangeLabel = () => {
        if (rangeType === 'DAILY') return currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        if (rangeType === 'MONTHLY') return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (rangeType === 'YEARLY') return currentDate.getFullYear().toString();

        const { start, end } = getRangeDates();
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    };

    const chartData = stats ? Object.entries(stats.dailyStats).map(([date, val]) => ({
        date,
        income: val.income,
        expense: val.expense,
        balance: val.balance
    })).sort((a, b) => a.date.localeCompare(b.date)) : [];

    return (
        <div className="flex-col gap-6 animate-fade-in">
            {/* Header / Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.75rem', letterSpacing: '-0.5px' }}>Financial Overview</h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--secondary-color)' }}>
                        Enterprise Grade Smart Analysis
                    </p>
                </div>

                <div className="flex gap-4 items-center">
                    {/* Range Tabs */}
                    <div style={{ display: 'flex', background: 'var(--card-bg)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border-color)' }}>
                        {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as DateRangeType[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setRangeType(t)}
                                style={{
                                    border: 'none',
                                    background: rangeType === t ? 'var(--primary-color)' : 'transparent',
                                    color: rangeType === t ? 'white' : 'var(--secondary-color)',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {t.charAt(0) + t.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    {/* Date Navigator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--card-bg)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <button onClick={handlePrev} className="icon-btn"><ChevronLeft size={20} /></button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px', justifyContent: 'center' }}>
                            <Calendar size={16} color="var(--primary-color)" />
                            <span style={{ fontWeight: 600, userSelect: 'none' }}>{getRangeLabel()}</span>
                        </div>
                        <button onClick={handleNext} className="icon-btn"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>

            {loading || !stats ? (
                <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="animate-pulse">Analyzing Financial Data...</div>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                        {/* Physical Balance Card */}
                        <div className="card" style={{
                            background: 'linear-gradient(135deg, var(--primary-color), #312e81)',
                            color: 'white', padding: '24px', position: 'relative', overflow: 'hidden',
                            boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
                            border: 'none'
                        }}>
                            <div style={{ position: 'relative', zIndex: 2 }}>
                                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', opacity: 0.9 }}>Physical Balance</p>
                                <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(currentBalance)}</h3>
                                <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', opacity: 0.8 }}>Current Cash on Hand</p>
                            </div>
                            <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.2 }}>
                                <Wallet size={120} />
                            </div>
                        </div>

                        <SmartKPICard
                            title="Period Income"
                            amount={stats.totalIncome}
                            icon={<TrendingUp />}
                            color="var(--success-color)"
                            sublabel="Accrued revenue (Smart)"
                        />
                        <SmartKPICard
                            title="Period Expenses"
                            amount={stats.totalExpense}
                            icon={<TrendingDown />}
                            color="var(--danger-color)"
                            sublabel="Amortized costs (Smart)"
                        />
                        <SmartKPICard
                            title="Period Result"
                            amount={stats.balance}
                            icon={<Activity />}
                            color={stats.balance >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}
                            sublabel={stats.balance >= 0 ? 'Net Profit' : 'Net Loss'}
                        />
                    </div>

                    {/* Main Chart */}
                    <div className="card" style={{ height: '400px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Activity size={20} color="var(--primary-color)" />
                                {rangeType === 'DAILY' ? 'Hourly Activity (Simulated)' : 'Cashflow Trend'}
                            </h3>
                            <div style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', display: 'flex', gap: '16px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success-color)' }} /> Income</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger-color)' }} /> Expense</span>
                            </div>
                        </div>

                        <ResponsiveContainer width="100%" height="85%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--success-color)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--success-color)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--danger-color)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--danger-color)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--secondary-color)"
                                    tickFormatter={str => {
                                        const d = new Date(str);
                                        if (rangeType === 'DAILY') return '';
                                        return d.getDate().toString();
                                    }}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                    stroke="var(--secondary-color)"
                                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(val: number | undefined) => [formatCurrency(val || 0), '']}
                                    labelFormatter={(label) => new Date(label as string).toLocaleDateString()}
                                />
                                <Area type="monotone" dataKey="income" stroke="var(--success-color)" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                                <Area type="monotone" dataKey="expense" stroke="var(--danger-color)" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bottom Section: Recent & Quick Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                        {/* Recent Transactions List */}
                        <div className="card">
                            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={18} /> Recent Activity
                            </h3>
                            <div className="flex-col gap-3">
                                {recentTxs.map((tx, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '12px', background: 'var(--bg-color)', borderRadius: '8px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: '50%',
                                                background: tx.category_type === 'INCOME' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: tx.category_type === 'INCOME' ? 'var(--success-color)' : 'var(--danger-color)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {tx.category_type === 'INCOME' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 500 }}>{tx.category_name}</p>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
                                                    {formatDate(tx.date)}
                                                    {tx.months_covered && tx.months_covered > 1 && ` • ${tx.months_covered}mo split`}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{
                                                fontWeight: 600,
                                                color: tx.category_type === 'INCOME' ? 'var(--success-color)' : 'var(--danger-color)'
                                            }}>
                                                {tx.category_type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cost Distribution (Simple Bar) */}
                        <div className="card">
                            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BarChart3 size={18} /> Distribution
                            </h3>
                            {stats.totalExpense > 0 ? (
                                <div style={{ height: '200px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[
                                            { name: 'Income', amount: stats.totalIncome, fill: 'var(--success-color)' },
                                            { name: 'Expense', amount: stats.totalExpense, fill: 'var(--danger-color)' }
                                        ]}>
                                            <XAxis dataKey="name" stroke="var(--secondary-color)" hide />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                                formatter={(val: number | undefined) => [formatCurrency(val || 0), '']}
                                            />
                                            <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--secondary-color)' }}>
                                            Saving Rate: {stats.totalIncome > 0 ? ((stats.totalIncome - stats.totalExpense) / stats.totalIncome * 100).toFixed(1) : 0}%
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--secondary-color)', textAlign: 'center', marginTop: '40px' }}>No Data</p>
                            )}
                        </div>

                    </div>
                </>
            )}
        </div>
    );
};

const SmartKPICard = ({ title, amount, icon, color, sublabel }: any) => (
    <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: '20px', borderLeft: `4px solid ${color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--secondary-color)', fontWeight: 500 }}>{title}</p>
                <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-color)' }}>{formatCurrency(amount)}</h3>
            </div>
            <div style={{
                padding: '12px', borderRadius: '12px',
                background: `${color}15`, color: color
            }}>
                {React.cloneElement(icon, { size: 24 })}
            </div>
        </div>
        <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--secondary-color)', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            {sublabel}
        </div>
    </div>
);
