import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { getAllTransactions, getCategories, addCategory, hideCategory, updateCategory } from '../db/queries';
import { Download, Save, EyeOff, Pencil, X } from 'lucide-react';
import { Category } from '../types';

export const Settings: React.FC = () => {
    const [exporting, setExporting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState('EXPENSE');

    // Rename state
    const [editingCatId, setEditingCatId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');

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

            if (data.length === 0) {
                alert('No transactions to export');
                setExporting(false);
                return;
            }

            // Create workbook
            const formatDate = (isoDate: string) => {
                const [year, month, day] = isoDate.split('-');
                return `${day}/${month}/${year}`;
            };

            const ws = XLSX.utils.json_to_sheet(data.map(t => ({
                Date: formatDate(t.date),
                Type: t.category_type,
                Category: t.category_name,
                Amount: t.amount,
                Note: t.note || ''
            })));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Transactions");

            // Get file path from user
            const filePath = await save({
                defaultPath: `Finance_Export_${new Date().toISOString().split('T')[0]}.xlsx`,
                filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
            });

            if (filePath) {
                // Write to file using Tauri FS
                const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
                await writeFile(filePath, new Uint8Array(buffer));
                alert(`Successfully exported ${data.length} transactions to:\n${filePath}`);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Export failed: ${e.message || JSON.stringify(e)}`);
        } finally {
            setExporting(false);
        }
    };


    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName.trim()) {
            alert('Please enter a category name');
            return;
        }
        try {
            await addCategory(newCatName.trim(), newCatType as any);
            setNewCatName('');
            await loadCats();
            alert('Category added successfully');
        } catch (e: any) {
            console.error(e);
            alert(`Failed to add category: ${e.message || JSON.stringify(e)}`);
        }
    };

    const handleHideCategory = async (id: number) => {
        if (confirm('Hide this category?')) {
            await hideCategory(id);
            loadCats();
        }
    };

    const startEditing = (c: Category) => {
        setEditingCatId(c.id);
        setEditingName(c.name);
    }

    const saveEdit = async () => {
        if (editingCatId && editingName) {
            await updateCategory(editingCatId, editingName);
            setEditingCatId(null);
            loadCats();
        }
    }

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
                                    <td style={{ padding: '8px' }}>
                                        {editingCatId === c.id ? (
                                            <input
                                                value={editingName}
                                                onChange={e => setEditingName(e.target.value)}
                                                style={{ padding: '4px' }}
                                            />
                                        ) : c.name}
                                    </td>
                                    <td style={{ padding: '8px' }}>{c.type}</td>
                                    <td style={{ padding: '8px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                        {editingCatId === c.id ? (
                                            <>
                                                <button onClick={saveEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success-color)' }}>
                                                    <Save size={16} />
                                                </button>
                                                <button onClick={() => setEditingCatId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary-color)' }}>
                                                    <X size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => startEditing(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)' }}>
                                                <Pencil size={16} />
                                            </button>
                                        )}

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

            {/* Existing Security and Import sections would be here, assuming valid merge */}
            {/* For safety in this full file overwrite, I should re-include them. */}
            <h2>Security</h2>
            <div className="card">
                <h3>App Lock</h3>
                <div className="flex-col gap-2">
                    <label>Set PIN (Leave empty to disable)</label>
                    <div className="flex gap-2">
                        <input
                            type="password"
                            placeholder="Enter 4-digit PIN"
                            maxLength={4}
                            id="pin-input"
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                        <button className="btn btn-primary" onClick={() => {
                            const pin = (document.getElementById('pin-input') as HTMLInputElement).value;
                            if (pin && pin.length !== 4) {
                                alert('PIN must be 4 digits');
                                return;
                            }
                            localStorage.setItem('app_pin', pin);
                            alert(pin ? 'PIN Set' : 'PIN Disabled');
                        }}>
                            Save PIN
                        </button>
                    </div>
                </div>
            </div>

            <h2>Import Data</h2>
            <div className="card">
                <h3>Import from Excel</h3>
                <p style={{ color: 'var(--secondary-color)' }}>Import transactions from a .xlsx file.</p>
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                            const data = await file.arrayBuffer();
                            const wb = XLSX.read(data);
                            const ws = wb.Sheets[wb.SheetNames[0]];
                            const json: any[] = XLSX.utils.sheet_to_json(ws);

                            if (confirm(`Found ${json.length} rows. Import?`)) {
                                let imported = 0;

                                // Parse date from DD/MM/YYYY to YYYY-MM-DD
                                const parseDate = (dateStr: string): string => {
                                    if (!dateStr) return new Date().toISOString().split('T')[0];

                                    // Check if already in YYYY-MM-DD format
                                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                                        return dateStr;
                                    }

                                    // Try DD/MM/YYYY format
                                    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
                                        const [day, month, year] = dateStr.split('/');
                                        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                                    }

                                    // Try to parse as date object
                                    const d = new Date(dateStr);
                                    if (!isNaN(d.getTime())) {
                                        return d.toISOString().split('T')[0];
                                    }

                                    return new Date().toISOString().split('T')[0];
                                };

                                for (const row of json) {
                                    let catId = categories.find(c => c.name === row.Category)?.id;

                                    if (!catId && row.Category) {
                                        try {
                                            catId = await addCategory(row.Category, (row.Type || 'EXPENSE').toUpperCase());
                                        } catch (e) { console.error('Failed to create cat', row.Category); }
                                    }

                                    if (catId) {
                                        await import('../db/queries').then(q => q.addTransaction({
                                            category_id: catId!,
                                            amount: Number(row.Amount),
                                            date: parseDate(row.Date),
                                            note: row.Note
                                        }));
                                        imported++;
                                    }
                                }
                                alert(`Imported ${imported} transactions.`);
                            }
                        } catch (e) {
                            console.error(e);
                            alert('Import failed. Check console.');
                        }
                    }}
                />
            </div>
        </div>
    );
};
