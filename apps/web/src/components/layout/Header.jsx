import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
    const { user } = useAuth();
    const location = useLocation();

    // Map path to title
    const getPageTitle = (pathname) => {
        const path = pathname.split('/')[1];
        if (!path || path === 'dashboard') return 'Dashboard';
        // Handle plurals and formatting
        if (path === 'expenses') return 'Expense Tracker';
        if (path === 'inventory') return 'Inventory Management';
        if (path === 'staff') return 'Staff Management';
        if (path === 'clients') return 'Client Management';
        if (path === 'tables') return 'Table Management';
        if (path === 'menu') return 'Menu Management';
        return path.charAt(0).toUpperCase() + path.slice(1);
    };

    return (
        <header className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{getPageTitle(location.pathname)}</h2>
                <div className="search-bar" style={{ marginLeft: '1rem' }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input type="text" placeholder="Search..." />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    display: 'flex'
                }}>
                    <Bell size={18} color="var(--text-muted)" />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-heading)' }}>{user?.name || 'User'}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.clientName || 'Restaurant'}</p>
                    </div>
                    <div style={{
                        width: '36px', height: '36px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <User size={16} color="white" />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
