import React, { useEffect, useState } from 'react';
import { getTransactionsInRange, getMonthlyHistory, getCurrentBalance } from '../db/queries';
import { calculatePeriodStats, FinancialStats } from '../lib/finance';
import { formatCurrency } from '../lib/utils';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, Legend,
    Line, AreaChart, Area, ComposedChart, CartesianGrid
} from 'recharts';
import {
    ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign,
    Percent, BarChart3, Calendar, Target, ArrowUpRight, ArrowDownRight, Wallet
} from 'lucide-react';

interface CategoryData {
    name: string;
    value: number;
    type: string;
    [key: string]: any;
}

export const Analysis: React.FC = () => {
    const [stats, setStats] = useState<FinancialStats | null>(null);
    const [breakdown, setBreakdown] = useState<CategoryData[]>([]);
    const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);
    const [topExpenses, setTopExpenses] = useState<{ name: string, amount: number }[]>([]);
    const [topIncome, setTopIncome] = useState<{ name: string, amount: number }[]>([]);
    const [transactionCount, setTransactionCount] = useState(0);
    const [currentBalance, setCurrentBalance] = useState(0);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCharts();
    }, [currentDate]);

    const loadCharts = async () => {
        setLoading(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Define Month Start/End
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0); // last day of month

        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        try {
            const allTxs = await getTransactionsInRange('2000-01-01', endStr);
            const smartStats = calculatePeriodStats(allTxs, startStr, endStr);
            setStats(smartStats);

            // Fetch Global Physical Balance
            const cashBal = await getCurrentBalance();
            setCurrentBalance(cashBal);

            // Derive Categories Breakdown from transactions within this period (handling overlap)
            const catMap: Record<number, { name: string, value: number, type: string }> = {};

            allTxs.forEach(tx => {
                const months = tx.months_covered || 1;
                let effectiveAmount = 0;

                if (months === 1) {
                    if (tx.date >= startStr && tx.date <= endStr) {
                        effectiveAmount = tx.amount;
                    }
                } else {
                    const txStart = new Date(tx.date);
                    const txEnd = new Date(txStart);
                    txEnd.setMonth(txEnd.getMonth() + months);

                    const overlapStart = new Date(Math.max(txStart.getTime(), start.getTime()));
                    const overlapEnd = new Date(Math.min(txEnd.getTime(), end.getTime()));

                    if (overlapStart < overlapEnd) {
                        const daysOverlap = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 3600 * 24);
                        const totalTxDays = (txEnd.getTime() - txStart.getTime()) / (1000 * 3600 * 24);
                        effectiveAmount = (daysOverlap / totalTxDays) * tx.amount;
                    }
                }

                if (effectiveAmount > 0) {
                    if (!catMap[tx.category_id]) {
                        catMap[tx.category_id] = {
                            name: tx.category_name || 'Unknown',
                            value: 0,
                            type: tx.category_type || 'EXPENSE'
                        };
                    }
                    catMap[tx.category_id].value += effectiveAmount;
                }
            });

            const catList = Object.values(catMap);
            setBreakdown(catList);
            setTopExpenses(catList.filter(c => c.type === 'EXPENSE').sort((a, b) => b.value - a.value).slice(0, 5).map(c => ({ name: c.name, amount: c.value })));
            setTopIncome(catList.filter(c => c.type === 'INCOME').sort((a, b) => b.value - a.value).slice(0, 5).map(c => ({ name: c.name, amount: c.value })));
            setTransactionCount(allTxs.filter(t => t.date >= startStr && t.date <= endStr).length);

            const mHistory = await getMonthlyHistory(6);
            setMonthlyHistory(mHistory.reverse().map(m => ({
                ...m,
                monthLabel: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' })
            })));

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const balance = stats ? stats.totalIncome - stats.totalExpense : 0;
    const savingsRate = stats && stats.totalIncome > 0
        ? ((stats.totalIncome - stats.totalExpense) / stats.totalIncome * 100)
        : 0;

    const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
    const expenseBreakdown = breakdown.filter(b => b.type === 'EXPENSE');
    const incomeBreakdown = breakdown.filter(b => b.type === 'INCOME');

    return (
        <div className="flex-col gap-4 animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Financial Analysis</h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--secondary-color)', fontSize: '0.9rem' }}>
                        Comprehensive insights into your finances
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', padding: '10px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                    <button onClick={() => changeMonth(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-color)', padding: '4px' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} color="var(--primary-color)" />
                        <span style={{ fontWeight: 600, minWidth: '140px', textAlign: 'center' }}>
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                    <button onClick={() => changeMonth(1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-color)', padding: '4px' }}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {loading || !stats ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>Loading Analysis...</div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        {/* Physical Balance Card */}
                        <div className="card" style={{
                            background: 'linear-gradient(135deg, var(--primary-color), #312e81)',
                            color: 'white',
                            padding: '24px',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
                            border: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <div style={{ position: 'relative', zIndex: 2 }}>
                                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', opacity: 0.9 }}>Physical Balance</p>
                                <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(currentBalance)}</h3>
                                <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', opacity: 0.8 }}>Current Cash on Hand</p>
                            </div>
                            <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.2, color: 'white' }}>
                                <Wallet size={120} />
                            </div>
                        </div>
                        <KPICard
                            title="Period Income"
                            value={formatCurrency(stats.totalIncome)}
                            icon={<TrendingUp size={24} />}
                            color="#22c55e"
                            subtitle="Accrued (Smart)"
                        />
                        <KPICard
                            title="Period Expenses"
                            value={formatCurrency(stats.totalExpense)}
                            icon={<TrendingDown size={24} />}
                            color="#ef4444"
                            subtitle="Amortized (Smart)"
                        />
                        <KPICard
                            title="Period Net"
                            value={formatCurrency(balance)}
                            icon={<DollarSign size={24} />}
                            color={balance >= 0 ? '#22c55e' : '#ef4444'}
                            subtitle={balance >= 0 ? 'Surplus' : 'Deficit'}
                        />
                        <KPICard
                            title="Savings Rate"
                            value={`${savingsRate.toFixed(1)}%`}
                            icon={<Percent size={24} />}
                            color={savingsRate >= 20 ? '#22c55e' : savingsRate >= 0 ? '#f59e0b' : '#ef4444'}
                            subtitle={savingsRate >= 20 ? 'Excellent' : savingsRate >= 10 ? 'Good' : savingsRate >= 0 ? 'Low' : 'Negative'}
                        />
                        <KPICard
                            title="Transactions"
                            value={transactionCount.toString()}
                            icon={<BarChart3 size={24} />}
                            color="#6366f1"
                            subtitle="This month"
                        />
                    </div>

                    {/* Trend Chart */}
                    <div className="card" style={{ height: '350px' }}>
                        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Target size={20} color="var(--primary-color)" />
                            6-Month Income vs Expense Trend
                        </h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <ComposedChart data={monthlyHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="monthLabel" stroke="var(--secondary-color)" />
                                <YAxis stroke="var(--secondary-color)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                    formatter={(value: number | undefined) => [formatCurrency(value || 0), '']}
                                />
                                <Legend />
                                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Charts Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
                        {/* Expense Breakdown Pie */}
                        <div className="card" style={{ height: '400px' }}>
                            <h3 style={{ margin: '0 0 16px 0' }}>Expense Distribution</h3>
                            {expenseBreakdown.length > 0 ? (
                                <ResponsiveContainer width="100%" height="85%">
                                    <PieChart>
                                        <Pie
                                            data={expenseBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {expenseBreakdown.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number | undefined) => [formatCurrency(value || 0), '']} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="No expense data for this month" />
                            )}
                        </div>

                        {/* Income Breakdown Pie */}
                        <div className="card" style={{ height: '400px' }}>
                            <h3 style={{ margin: '0 0 16px 0' }}>Income Distribution</h3>
                            {incomeBreakdown.length > 0 ? (
                                <ResponsiveContainer width="100%" height="85%">
                                    <PieChart>
                                        <Pie
                                            data={incomeBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {incomeBreakdown.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number | undefined) => [formatCurrency(value || 0), '']} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="No income data for this month" />
                            )}
                        </div>
                    </div>

                    {/* Daily Pattern */}
                    <div className="card" style={{ height: '300px' }}>
                        <h3 style={{ margin: '0 0 16px 0' }}>Daily Spending Pattern (This Month)</h3>
                        {stats && Object.keys(stats.dailyStats).length > 0 ? (
                            <ResponsiveContainer width="100%" height="85%">
                                <AreaChart data={Object.entries(stats.dailyStats).map(([d, v]) => ({ date: d, amount: v.expense })).sort((a, b) => a.date.localeCompare(b.date))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis dataKey="date" stroke="var(--secondary-color)" tickFormatter={(d) => new Date(d).getDate().toString()} />
                                    <YAxis stroke="var(--secondary-color)" />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                        formatter={(value: number | undefined) => [formatCurrency(value || 0), '']}
                                        labelFormatter={(d) => new Date(d).toLocaleDateString()}
                                    />
                                    <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="rgba(99, 102, 241, 0.2)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="No spending history available" />
                        )}
                    </div>

                    {/* Top lists */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="card">
                            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ArrowDownRight size={20} color="#ef4444" />
                                Top Expenses
                            </h3>
                            {topExpenses.length > 0 ? (
                                <div className="flex-col gap-3">
                                    {topExpenses.map((cat, idx) => (
                                        <CategoryBar
                                            key={idx}
                                            name={cat.name}
                                            amount={cat.amount}
                                            maxAmount={topExpenses[0]?.amount || 1}
                                            color="#ef4444"
                                            rank={idx + 1}
                                        />
                                    ))}
                                </div>
                            ) : <p style={{ color: 'var(--secondary-color)' }}>No data</p>}
                        </div>

                        <div className="card">
                            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ArrowUpRight size={20} color="#22c55e" />
                                Top Income
                            </h3>
                            {topIncome.length > 0 ? (
                                <div className="flex-col gap-3">
                                    {topIncome.map((cat, idx) => (
                                        <CategoryBar
                                            key={idx}
                                            name={cat.name}
                                            amount={cat.amount}
                                            maxAmount={topIncome[0]?.amount || 1}
                                            color="#22c55e"
                                            rank={idx + 1}
                                        />
                                    ))}
                                </div>
                            ) : <p style={{ color: 'var(--secondary-color)' }}>No data</p>}
                        </div>
                    </div>

                </>
            )}
        </div>
    );
};

const KPICard = ({ title, value, icon, color, subtitle }: any) => (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 12, right: 12, opacity: 0.15, color }}>
            {React.cloneElement(icon, { size: 48 })}
        </div>
        <p style={{ margin: '0 0 4px 0', color: 'var(--secondary-color)', fontSize: '0.85rem' }}>{title}</p>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '1.75rem', color }}>{value}</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--secondary-color)' }}>{subtitle}</span>
    </div>
);

const CategoryBar = ({ name, amount, maxAmount, color, rank }: any) => {
    const percentage = (amount / maxAmount) * 100;
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: `${color}20`, color, fontSize: '0.75rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600
                    }}>
                        {rank}
                    </span>
                    {name}
                </span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(amount)}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: color,
                    borderRadius: '4px',
                    transition: 'width 0.5s ease-out'
                }} />
            </div>
        </div>
    );
};

const EmptyState = ({ message }: { message: string }) => (
    <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--secondary-color)', textAlign: 'center'
    }}>
        <p>{message}</p>
    </div>
);
