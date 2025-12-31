import React, { useEffect, useState } from 'react';
import { getTransactions, deleteTransaction, addTransaction, updateTransaction, getCategories } from '../db/queries';
import { Transaction, Category } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Trash2, Pencil, Search, Filter, X } from 'lucide-react';

export const Transactions: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTxs, setFilteredTxs] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<number | ''>('');
    const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

    const loadData = async () => {
        setLoading(true);
        const t = await getTransactions(1000);
        const c = await getCategories();
        setTransactions(t);
        setFilteredTxs(t);
        setCategories(c);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        let filtered = [...transactions];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(tx =>
                tx.category_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tx.note?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Category filter
        if (filterCategory) {
            filtered = filtered.filter(tx => tx.category_id === filterCategory);
        }

        // Type filter
        if (filterType !== 'ALL') {
            filtered = filtered.filter(tx => tx.category_type === filterType);
        }

        setFilteredTxs(filtered);
    }, [searchQuery, filterCategory, filterType, transactions]);

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            await deleteTransaction(id);
            loadData();
        }
    };

    const handleEdit = (tx: Transaction) => {
        setEditingTx(tx);
        setShowForm(true);
    };

    const handleSuccess = () => {
        setShowForm(false);
        setEditingTx(null);
        loadData();
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterCategory('');
        setFilterType('ALL');
    };

    const hasActiveFilters = searchQuery || filterCategory || filterType !== 'ALL';

    return (
        <div className="flex-col gap-4 animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Transactions</h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--secondary-color)', fontSize: '0.9rem' }}>
                        {filteredTxs.length} transaction{filteredTxs.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingTx(null); setShowForm(true); }}>
                    <Plus size={18} /> Add Transaction
                </button>
            </div>

            {/* Filters */}
            <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>
                    {/* Search */}
                    <div className="flex-col gap-2">
                        <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Search</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-color)' }} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search transactions..."
                                style={{
                                    width: '100%',
                                    padding: '8px 8px 8px 36px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-color)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Type Filter */}
                    <div className="flex-col gap-2">
                        <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Type</label>
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value as any)}
                            style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                        >
                            <option value="ALL">All Types</option>
                            <option value="INCOME">Income</option>
                            <option value="EXPENSE">Expense</option>
                        </select>
                    </div>

                    {/* Category Filter */}
                    <div className="flex-col gap-2">
                        <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Category</label>
                        <select
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value ? Number(e.target.value) : '')}
                            style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                            ))}
                        </select>
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            className="btn"
                            onClick={clearFilters}
                            style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
                        >
                            <X size={18} /> Clear
                        </button>
                    )}
                </div>
            </div>

            {showForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} className="animate-fade-in">
                    <div className="card animate-slide-in" style={{ width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0 }}>{editingTx ? 'Edit Transaction' : 'Add Transaction'}</h3>
                        <TransactionForm
                            categories={categories}
                            initialData={editingTx}
                            onSuccess={handleSuccess}
                            onCancel={() => { setShowForm(false); setEditingTx(null); }}
                        />
                    </div>
                </div>
            )}

            {/* Transactions Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div className="animate-pulse" style={{ color: 'var(--secondary-color)' }}>Loading...</div>
                    </div>
                ) : filteredTxs.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Note</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTxs.map(t => (
                                    <tr key={t.id}>
                                        <td style={{ fontWeight: 500 }}>{formatDate(t.date)}</td>
                                        <td>
                                            <span className={`badge badge-${t.category_type === 'INCOME' ? 'success' : 'danger'}`}>
                                                {t.category_name}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--secondary-color)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {t.note || '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: t.category_type === 'INCOME' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                                            {t.category_type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleEdit(t)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', marginRight: '8px', padding: '4px' }}
                                                title="Edit"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-color)', padding: '4px' }}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--secondary-color)' }}>
                        <Filter size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                        <p style={{ margin: 0 }}>No transactions found</p>
                        {hasActiveFilters && (
                            <button className="btn" onClick={clearFilters} style={{ marginTop: '12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

interface FormProps {
    categories: Category[];
    initialData?: Transaction | null;
    onSuccess: () => void;
    onCancel: () => void;
}

const TransactionForm: React.FC<FormProps> = ({ categories, initialData, onSuccess, onCancel }) => {
    const [type, setType] = useState<'INCOME' | 'EXPENSE'>(initialData?.category_type || 'EXPENSE');
    const [categoryId, setCategoryId] = useState<number | ''>(initialData?.category_id || '');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState(initialData?.note || '');
    const [monthsCovered, setMonthsCovered] = useState(initialData?.months_covered || 1);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !amount) return;

        setSubmitting(true);
        try {
            const payload = {
                category_id: Number(categoryId),
                amount: parseFloat(amount),
                date,
                note,
                months_covered: monthsCovered
            };

            if (initialData) {
                await updateTransaction(initialData.id, payload);
            } else {
                await addTransaction(payload);
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Failed to save transaction');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCats = categories.filter(c => c.type === type);

    useEffect(() => {
        if (initialData && initialData.category_type === type) {
            setCategoryId(initialData.category_id);
        }
    }, [type, initialData]);

    return (
        <form onSubmit={handleSubmit} className="flex-col gap-4">
            {!initialData && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                        type="button"
                        className="btn"
                        style={{
                            background: type === 'EXPENSE' ? 'var(--danger-color)' : 'var(--hover-bg)',
                            color: type === 'EXPENSE' ? 'white' : 'var(--text-color)',
                            border: type === 'EXPENSE' ? 'none' : '1px solid var(--border-color)'
                        }}
                        onClick={() => { setType('EXPENSE'); setCategoryId(''); }}
                    >
                        Expense
                    </button>
                    <button
                        type="button"
                        className="btn"
                        style={{
                            background: type === 'INCOME' ? 'var(--success-color)' : 'var(--hover-bg)',
                            color: type === 'INCOME' ? 'white' : 'var(--text-color)',
                            border: type === 'INCOME' ? 'none' : '1px solid var(--border-color)'
                        }}
                        onClick={() => { setType('INCOME'); setCategoryId(''); }}
                    >
                        Income
                    </button>
                </div>
            )}

            <div className="flex-col gap-2">
                <label style={{ fontWeight: 500 }}>Category *</label>
                <select
                    style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                    value={categoryId}
                    onChange={e => setCategoryId(Number(e.target.value))}
                    required
                >
                    <option value="">Select Category</option>
                    {filteredCats.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex-col gap-2">
                <label style={{ fontWeight: 500 }}>Amount *</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                />
            </div>

            <div className="flex-col gap-2">
                <label style={{ fontWeight: 500 }}>Date *</label>
                <input
                    type="date"
                    style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                />
            </div>

            <div className="flex-col gap-2">
                <label style={{ fontWeight: 500 }}>Note</label>
                <textarea
                    rows={3}
                    style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', resize: 'vertical' }}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Optional note..."
                />
            </div>

            <div className="flex-col gap-2">
                <label style={{ fontWeight: 500 }}>Months Covered (Recurring)</label>
                <input
                    type="number"
                    min="1"
                    step="1"
                    style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}
                    value={monthsCovered}
                    onChange={e => setMonthsCovered(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
                    Spread the cost/income over this many months (e.g. Rent = 12, Quarterly Tax = 3)
                </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn" onClick={onCancel} style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-color)' }}>
                    Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Transaction'}
                </button>
            </div>
        </form>
    );
};
