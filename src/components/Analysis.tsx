import React, { useEffect, useState } from 'react';
import { getCategoryBreakdown, getDailyHistory, getMonthlyTotals, getMonthlyHistory, getTopCategories, getTransactionCount } from '../db/queries';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, Legend,
    Line, AreaChart, Area, ComposedChart, CartesianGrid
} from 'recharts';
import { formatCurrency } from '../lib/utils';
import {
    ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign,
    Percent, BarChart3, Calendar, Target, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

interface MonthlyData {
    income: number;
    expense: number;
}

interface CategoryData {
    name: string;
    value: number;
    type: string;
    [key: string]: string | number;
}

export const Analysis: React.FC = () => {
    const [breakdown, setBreakdown] = useState<CategoryData[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [monthlyTotals, setMonthlyTotals] = useState<MonthlyData>({ income: 0, expense: 0 });
    const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);
    const [topExpenses, setTopExpenses] = useState<any[]>([]);
    const [topIncome, setTopIncome] = useState<any[]>([]);
    const [transactionCount, setTransactionCount] = useState(0);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [_loading, setLoading] = useState(true);

    useEffect(() => {
        loadCharts();
    }, [currentDate]);

    const loadCharts = async () => {
        setLoading(true);
        const year = currentDate.getFullYear().toString();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');

        try {
            const [b, h, totals, mHistory, topExp, topInc, txCount] = await Promise.all([
                getCategoryBreakdown(year, month),
                getDailyHistory(30),
                getMonthlyTotals(year, month),
                getMonthlyHistory(6),
                getTopCategories(year, month, 'EXPENSE', 5),
                getTopCategories(year, month, 'INCOME', 5),
                getTransactionCount(year, month)
            ]);

            setBreakdown(b);
            setHistory(h.reverse());
            setMonthlyTotals(totals);
            setMonthlyHistory(mHistory.reverse().map(m => ({
                ...m,
                monthLabel: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' })
            })));
            setTopExpenses(topExp);
            setTopIncome(topInc);
            setTransactionCount(txCount);
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

    const balance = monthlyTotals.income - monthlyTotals.expense;
    const savingsRate = monthlyTotals.income > 0
        ? ((monthlyTotals.income - monthlyTotals.expense) / monthlyTotals.income * 100)
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

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <KPICard
                    title="Total Income"
                    value={formatCurrency(monthlyTotals.income)}
                    icon={<TrendingUp size={24} />}
                    color="#22c55e"
                    subtitle="This month"
                />
                <KPICard
                    title="Total Expenses"
                    value={formatCurrency(monthlyTotals.expense)}
                    icon={<TrendingDown size={24} />}
                    color="#ef4444"
                    subtitle="This month"
                />
                <KPICard
                    title="Net Balance"
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

            {/* Income vs Expense Trend */}
            <div className="card" style={{ height: '350px' }}>
                <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={20} color="var(--primary-color)" />
                    6-Month Income vs Expense Trend
                </h3>
                {monthlyHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="85%">
                        <ComposedChart data={monthlyHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="monthLabel" stroke="var(--secondary-color)" />
                            <YAxis stroke="var(--secondary-color)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                            <Tooltip
                                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                formatter={(value: number | undefined) => formatCurrency(value || 0)}
                            />
                            <Legend />
                            <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <EmptyState message="No monthly data available" />
                )}
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
                                <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState message="No expense data for this month" />
                    )}
                </div>

                {/* Income Breakdown */}
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
                                <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState message="No income data for this month" />
                    )}
                </div>
            </div>

            {/* Daily Spending Trend */}
            <div className="card" style={{ height: '300px' }}>
                <h3 style={{ margin: '0 0 16px 0' }}>Daily Spending Pattern (Last 30 Days)</h3>
                {history.length > 0 ? (
                    <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="date" stroke="var(--secondary-color)" tickFormatter={(d) => new Date(d).getDate().toString()} />
                            <YAxis stroke="var(--secondary-color)" />
                            <Tooltip
                                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                formatter={(value: number | undefined) => formatCurrency(value || 0)}
                                labelFormatter={(d) => new Date(d).toLocaleDateString()}
                            />
                            <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="rgba(99, 102, 241, 0.2)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <EmptyState message="No spending history available" />
                )}
            </div>

            {/* Top Categories */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Top Expenses */}
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
                    ) : (
                        <p style={{ color: 'var(--secondary-color)', textAlign: 'center', padding: '20px 0' }}>No expense data</p>
                    )}
                </div>

                {/* Top Income */}
                <div className="card">
                    <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowUpRight size={20} color="#22c55e" />
                        Top Income Sources
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
                    ) : (
                        <p style={{ color: 'var(--secondary-color)', textAlign: 'center', padding: '20px 0' }}>No income data</p>
                    )}
                </div>
            </div>

            {/* Insights Section */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)' }}>
                <h3 style={{ margin: '0 0 16px 0' }}>💡 Financial Insights</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <InsightCard
                        title="Spending Habit"
                        value={monthlyTotals.expense > 0 ? `Avg ${formatCurrency(monthlyTotals.expense / (transactionCount || 1))} per transaction` : 'No spending yet'}
                    />
                    <InsightCard
                        title="Top Expense Category"
                        value={topExpenses[0]?.name || 'N/A'}
                        subtitle={topExpenses[0] ? formatCurrency(topExpenses[0].amount) : ''}
                    />
                    <InsightCard
                        title="Monthly Status"
                        value={balance >= 0 ? '✅ On Track' : '⚠️ Overspending'}
                        subtitle={balance >= 0 ? `Saved ${formatCurrency(balance)}` : `Over by ${formatCurrency(Math.abs(balance))}`}
                    />
                </div>
            </div>
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

const InsightCard = ({ title, value, subtitle }: any) => (
    <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
        <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--secondary-color)' }}>{title}</p>
        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{value}</p>
        {subtitle && <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--secondary-color)' }}>{subtitle}</p>}
    </div>
);

const EmptyState = ({ message }: { message: string }) => (
    <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--secondary-color)', textAlign: 'center'
    }}>
        <p>{message}</p>
    </div>
);
