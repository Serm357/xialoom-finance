import React from 'react';
import { LayoutDashboard, Receipt, Settings as SettingsIcon, PieChart } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'transactions', label: 'Transactions', icon: Receipt },
        { id: 'analysis', label: 'Analysis', icon: PieChart },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            <aside style={{
                width: 'var(--sidebar-width)',
                backgroundColor: 'var(--card-bg)',
                borderRight: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                padding: 'var(--spacing)'
            }}>
                <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 32, height: 32, background: 'var(--primary-color)', borderRadius: 8 }}></div>
                    <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Finance</h1>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    border: 'none',
                                    background: isActive ? 'var(--bg-color)' : 'transparent',
                                    color: isActive ? 'var(--primary-color)' : 'var(--text-color)',
                                    borderRadius: 'var(--radius)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '0.95rem',
                                    fontWeight: isActive ? 600 : 400
                                }}
                            >
                                <Icon size={20} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing)' }}>
                {children}
            </main>
        </div>
    );
};
