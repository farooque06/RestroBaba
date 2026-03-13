import React from 'react';
import { Menu, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MobileHeader = () => {
    const { user } = useAuth();

    const toggleMenu = () => {
        window.dispatchEvent(new CustomEvent('toggle-mobile-menu'));
    };

    return (
        <header className="mobile-header">
            <button className="mobile-menu-trigger" onClick={toggleMenu} aria-label="Toggle Menu">
                <Menu size={24} />
            </button>
            <div className="mobile-logo">
                <UtensilsCrossed size={20} color="var(--primary)" />
                <span>{user?.clientName || 'RestroBaba'}</span>
            </div>
            <div style={{ width: '40px' }} /> {/* Spacer for symmetry */}
        </header>
    );
};

export default MobileHeader;
