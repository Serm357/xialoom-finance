import React, { useEffect, useState } from 'react';
import { getTransactions, deleteTransaction, addTransaction, updateTransaction, getCategories } from '../db/queries';
import { Transaction, Category } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Trash2, Pencil } from 'lucide-react';

export const Transactions: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const t = await getTransactions(500);
        const c = await getCategories();
        setTransactions(t);
        setCategories(c);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

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

    return (
        <div className="flex-col gap-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Transactions</h2>
                <button className="btn btn-primary flex gap-2" onClick={() => { setEditingTx(null); setShowForm(true); }}>
                    <Plus size={18} /> Add New
                </button>
            </div>

            {showForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
                        <h3>{editingTx ? 'Edit Transaction' : 'Add Transaction'}</h3>
                        <TransactionForm
                            categories={categories}
                            initialData={editingTx}
                            onSuccess={handleSuccess}
                            onCancel={() => { setShowForm(false); setEditingTx(null); }}
                        />
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                        <tr>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Category</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Note</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '12px' }}>{formatDate(t.date)}</td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '4px',
                                        background: t.category_type === 'INCOME' ? '#d1e7dd' : '#f8d7da',
                                        color: t.category_type === 'INCOME' ? '#0f5132' : '#842029',
                                        fontSize: '0.85rem'
                                    }}>
                                        {t.category_name}
                                    </span>
                                </td>
                                <td style={{ padding: '12px' }}>{t.note || '-'}</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: t.category_type === 'INCOME' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                                    {t.category_type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <button onClick={() => handleEdit(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', marginRight: '8px' }}>
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-color)' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {transactions.length === 0 && !loading && (
                            <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--secondary-color)' }}>No transactions found.</td></tr>
                        )}
                    </tbody>
                </table>
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
    // If initialData exists, use its values
    const [type, setType] = useState<'INCOME' | 'EXPENSE'>(initialData?.category_type || 'EXPENSE');
    const [categoryId, setCategoryId] = useState<number | ''>(initialData?.category_id || '');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState(initialData?.note || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !amount) return;

        try {
            const payload = {
                category_id: Number(categoryId),
                amount: parseFloat(amount),
                date,
                note
            };

            if (initialData) {
                await updateTransaction(initialData.id, payload);
            } else {
                await addTransaction(payload);
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Failed to save');
        }
    };

    const filteredCats = categories.filter(c => c.type === type);

    // If we switch type, clear category unless it matches existing (edge case, simplified here)
    useEffect(() => {
        if (initialData && initialData.category_type === type) {
            setCategoryId(initialData.category_id);
        } else if (!initialData) {
            // setCategoryId(''); // Keep behavior or reset? Resetting is safer.
        }
    }, [type]);

    return (
        <form onSubmit={handleSubmit} className="flex-col gap-4">
            {!initialData && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <button
                        type="button"
                        className="btn"
                        style={{ flex: 1, background: type === 'EXPENSE' ? 'var(--danger-color)' : 'var(--bg-color)', color: type === 'EXPENSE' ? 'white' : 'var(--text-color)' }}
                        onClick={() => { setType('EXPENSE'); setCategoryId(''); }}
                    >
                        Expense
                    </button>
                    <button
                        type="button"
                        className="btn"
                        style={{ flex: 1, background: type === 'INCOME' ? 'var(--success-color)' : 'var(--bg-color)', color: type === 'INCOME' ? 'white' : 'var(--text-color)' }}
                        onClick={() => { setType('INCOME'); setCategoryId(''); }}
                    >
                        Income
                    </button>
                </div>
            )}

            <div className="flex-col gap-2">
                <label>Category</label>
                <select
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
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
                <label>Amount</label>
                <input
                    type="number"
                    step="0.01"
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                />
            </div>

            <div className="flex-col gap-2">
                <label>Date</label>
                <input
                    type="date"
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                />
            </div>

            <div className="flex-col gap-2">
                <label>Note (Optional)</label>
                <input
                    type="text"
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" className="btn" onClick={onCancel} style={{ background: 'var(--bg-color)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Transaction</button>
            </div>
        </form>
    );
};
