import React, { useEffect, useState } from 'react';
import { getCategoryBreakdown, getDailyHistory } from '../db/queries';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../lib/utils';

export const Analysis: React.FC = () => {
    const [breakdown, setBreakdown] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCharts();
    }, []);

    const loadCharts = async () => {
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');

        const b = await getCategoryBreakdown(year, month);
        const h = await getDailyHistory(30);

        setBreakdown(b);
        setHistory(h);
        setLoading(false);
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    if (loading) return <div>Loading charts...</div>;

    return (
        <div className="flex-col gap-4">
            <h2>Analysis</h2>

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
