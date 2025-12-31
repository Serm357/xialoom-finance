import React, { useEffect, useState } from 'react';
import { getCategoryBreakdown, getDailyHistory } from '../db/queries';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Analysis: React.FC = () => {
    const [breakdown, setBreakdown] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        loadCharts();
    }, [currentDate]);

    const loadCharts = async () => {
        const year = currentDate.getFullYear().toString();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');

        const b = await getCategoryBreakdown(year, month);
        const h = await getDailyHistory(30); // Note: Daily history is still last 30 days global. Improving this requires changing query.

        setBreakdown(b);
        setHistory(h);
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <div className="flex-col gap-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Analysis</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                    <button onClick={() => changeMonth(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
                    <span style={{ fontWeight: 500 }}>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => changeMonth(1)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><ChevronRight size={20} /></button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="card" style={{ height: '400px' }}>
                    <h3 style={{ marginTop: 0 }}>Monthly Expenses by Category</h3>
                    {breakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height="90%">
                            <PieChart>
                                <Pie
                                    data={breakdown}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {breakdown.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--secondary-color)' }}>No expense data for this month</p>
                    )}
                </div>

                <div className="card" style={{ height: '400px' }}>
                    <h3 style={{ marginTop: 0 }}>Daily Spending Trend (Last 30 Days)</h3>
                    {history.length > 0 ? (
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={history}>
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                                <Bar dataKey="amount" fill="var(--primary-color)" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--secondary-color)' }}>No spending history available</p>
                    )}
                </div>
            </div>
        </div>
    );
};
