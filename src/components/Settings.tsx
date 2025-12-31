import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { getAllTransactions, getCategories, addCategory, hideCategory } from '../db/queries';
import { Download, Save, EyeOff } from 'lucide-react';
import { Category } from '../types';

export const Settings: React.FC = () => {
    const [exporting, setExporting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState('EXPENSE');

    React.useEffect(() => {
        loadCats();
    }, []);

    const loadCats = async () => {
        setCategories(await getCategories());
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const data = await getAllTransactions();
            const ws = XLSX.utils.json_to_sheet(data.map(t => ({
                Date: t.date,
                Type: t.category_type,
                Category: t.category_name,
                Amount: t.amount,
                Note: t.note
            })));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Transactions");

            // Save file
            const fileName = `Finance_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            alert(`Exported to ${fileName}`);
        } catch (e) {
            console.error(e);
            alert('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName) return;
        try {
            await addCategory(newCatName, newCatType as any);
            setNewCatName('');
            loadCats();
        } catch (e) { console.error(e); }
    };

    const handleHideCategory = async (id: number) => {
        if (confirm('Hide this category?')) {
            await hideCategory(id);
            loadCats();
        }
    };

    return (
        <div className="flex-col gap-4">
            <h2>Data Management</h2>
            <div className="card">
                <h3>Export Data</h3>
                <p style={{ color: 'var(--secondary-color)' }}>Export all your transactions to an Excel file.</p>
                <button className="btn btn-primary flex gap-2" onClick={handleExport} disabled={exporting}>
                    <Download size={18} />
                    {exporting ? 'Exporting...' : 'Export to Excel'}
                </button>
            </div>

            <h2>Category Management</h2>
            <div className="card">
                <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '16px' }}>
                    <div className="flex-col gap-2" style={{ flex: 1 }}>
                        <label>New Category Name</label>
                        <input
                            value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                            placeholder="e.g. Gym, Subscriptions"
                        />
                    </div>
                    <div className="flex-col gap-2">
                        <label>Type</label>
                        <select
                            value={newCatType}
                            onChange={e => setNewCatType(e.target.value)}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        >
                            <option value="EXPENSE">Expense</option>
                            <option value="INCOME">Income</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary flex gap-2">
                        <Save size={18} /> Add
                    </button>
                </form>

                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Name</th>
                                <th style={{ textAlign: 'left' }}>Type</th>
                                <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '8px' }}>{c.name}</td>
                                    <td style={{ padding: '8px' }}>{c.type}</td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        {!c.is_default && (
                                            <button onClick={() => handleHideCategory(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-color)' }}>
                                                <EyeOff size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
