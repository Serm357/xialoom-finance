import React, { useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Transactions } from "./components/Transactions";
import { Analysis } from "./components/Analysis";
import { Settings } from "./components/Settings";
import "./styles/main.css";

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [locked, setLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    const pin = localStorage.getItem('app_pin');
    if (!pin) {
      setLocked(false);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = localStorage.getItem('app_pin');
    if (pinInput === pin) {
      setLocked(false);
    } else {
      alert('Incorrect PIN');
      setPinInput('');
    }
  };

  if (locked) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', flexDirection: 'column', gap: '16px' }}>
        <h2>Enter PIN</h2>
        <form onSubmit={handleUnlock} className="flex gap-2">
          <input
            type="password"
            value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            maxLength={4}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '1.5rem', width: '120px', textAlign: 'center' }}
            autoFocus
          />
          <button type="submit" className="btn btn-primary">Unlock</button>
        </form>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <Transactions />;
      case 'analysis':
        return <Analysis />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
