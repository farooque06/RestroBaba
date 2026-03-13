import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    UtensilsCrossed,
    ChefHat,
    TableProperties,
    ClipboardList,
    BarChart3,
    Package,
    Wallet,
    Users,
    Receipt,
    ShieldCheck,
    History,
    Clock,
    Zap,
    Trash2,
    LogOut as Logout,
    Menu as MenuIcon,
    ChevronLeft,
    ChevronRight,
    Search,
    Bell,
    Settings,
    User,
    X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
    const { logout, user } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    useEffect(() => {
        const handleToggle = () => setIsMobileOpen(prev => !prev);
        window.addEventListener('toggle-mobile-menu', handleToggle);
        return () => window.removeEventListener('toggle-mobile-menu', handleToggle);
    }, []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', newState);
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WAITER', 'CHEF'], minPlan: 'SILVER' },
        { id: 'menu', label: 'Menu', icon: UtensilsCrossed, path: '/menu', roles: ['ADMIN', 'MANAGER', 'WAITER', 'CHEF'], minPlan: 'SILVER' },
        { id: 'kitchen', label: 'Kitchen', icon: ChefHat, path: '/kitchen', roles: ['ADMIN', 'MANAGER', 'CHEF'], minPlan: 'SILVER' },
        { id: 'tables', label: 'Tables', icon: TableProperties, path: '/tables', roles: ['ADMIN', 'MANAGER', 'WAITER'], minPlan: 'SILVER' },
        { id: 'orders', label: 'Orders', icon: ClipboardList, path: '/orders', roles: ['ADMIN', 'MANAGER', 'WAITER', 'CHEF'], minPlan: 'SILVER' },
        { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports', roles: ['ADMIN', 'MANAGER'], minPlan: 'GOLD' },
        { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory', roles: ['ADMIN', 'MANAGER', 'CHEF'], minPlan: 'SILVER' },
        { id: 'waste', label: 'Waste Management', icon: Trash2, path: '/waste', roles: ['ADMIN', 'MANAGER', 'CHEF', 'WAITER'], minPlan: 'SILVER' },
        { id: 'expenses', label: 'Expenses', icon: Wallet, path: '/expenses', roles: ['ADMIN', 'MANAGER'], minPlan: 'SILVER' },
        { id: 'staff', label: 'Staff', icon: Users, path: '/staff', roles: ['ADMIN', 'MANAGER'], minPlan: 'SILVER' },
        { id: 'billing', label: 'Billing', icon: Receipt, path: '/billing', roles: ['ADMIN', 'MANAGER', 'WAITER'], minPlan: 'SILVER' },
        { id: 'customers', label: 'Customers', icon: Users, path: '/customers', roles: ['ADMIN', 'MANAGER', 'WAITER'], minPlan: 'SILVER' },
        { id: 'activity', label: 'Activity Log', icon: History, path: '/activity', roles: ['ADMIN', 'MANAGER'], minPlan: 'DIAMOND' },
        { id: 'clients', label: 'Manage Clients', icon: ShieldCheck, path: '/clients', roles: ['SUPER_ADMIN'], minPlan: 'SILVER' },
        { id: 'plans', label: 'Subscription Plans', icon: Zap, path: '/plans', roles: ['SUPER_ADMIN'], minPlan: 'SILVER' },
        { id: 'shifts', label: 'Shifts', icon: Clock, path: '/shifts', roles: ['ADMIN', 'MANAGER'], minPlan: 'SILVER' },
    ];

    const PLAN_RANK = { 'SILVER': 1, 'GOLD': 2, 'DIAMOND': 3 };

    const filteredItems = menuItems.filter(item => {
        // 1. Check Role
        const hasRole = item.roles.includes(user?.role);
        if (!hasRole) return false;

        // 2. Check Plan (SUPER_ADMIN sees everything)
        if (user?.role === 'SUPER_ADMIN') return true;
        
        const subPlan = user?.client?.subscriptionPlan;
        const clientPlan = user?.client?.plan || 'SILVER';

        // 2a. Granular Feature Toggles
        if (item.id === 'kitchen' && subPlan && subPlan.hasKDS === false) return false;
        if (item.id === 'inventory' && subPlan && subPlan.hasInventory === false) return false;
        if (item.id === 'reports' && subPlan && subPlan.hasAnalytics === false) return false;
        if (item.id === 'expenses' && subPlan && subPlan.hasAnalytics === false) return false;
        if (item.id === 'profit-analytics' && subPlan && subPlan.hasAnalytics === false) return false;
        if (item.id === 'activity' && subPlan && subPlan.hasAnalytics === false) return false;

        // 2b. Check Plan Rank (fallback)
        const hasPlan = PLAN_RANK[clientPlan] >= PLAN_RANK[item.minPlan];
        
        return hasPlan;
    });

    return (
        <>
            {/* Mobile Overlay */}
            <div 
                className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`} 
                onClick={() => setIsMobileOpen(false)}
            />

            <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
                {/* Mobile Close Button - Now top-level and fixed via CSS */}
                <button 
                    className="mobile-close-btn"
                    onClick={() => setIsMobileOpen(false)}
                >
                    <X size={20} />
                </button>

                <button className="sidebar-toggle" onClick={toggleSidebar}>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <div className="logo" style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <UtensilsCrossed size={24} color="var(--primary)" style={{ flexShrink: 0 }} />
                        {(!isCollapsed || isMobileOpen) && <span title={user?.clientName || 'RestroBaba'} style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>{user?.clientName || 'RestroBaba'}</span>}
                    </div>
                </div>

                <div className="nav-links">
                    {filteredItems.map((item) => (
                        <NavLink
                            key={item.id}
                            to={item.path}
                            onClick={() => setIsMobileOpen(false)} // Close drawer on navigation
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            title={isCollapsed ? item.label : ''}
                        >
                            <item.icon size={18} />
                            {(!isCollapsed || isMobileOpen) && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </div>

                <div style={{ marginTop: 'auto' }} className="nav-links">
                    {/* User Profile Section */}
                    <div className="sidebar-profile" title={isCollapsed ? `${user?.name} (${user?.clientName})` : ''}>
                        <div className="profile-avatar">
                            <Users size={18} color="white" />
                        </div>
                        {(!isCollapsed || isMobileOpen) && (
                            <div className="profile-info">
                                <span className="profile-name">{user?.name || 'User'}</span>
                                <span className="profile-client">{user?.clientName || 'Restaurant'}</span>
                                {user?.role !== 'SUPER_ADMIN' && user?.client?.plan && (
                                    <span className={`plan-tag ${user.client.plan.toLowerCase()}`}>{user.client.plan}</span>
                                )}
                            </div>
                        )}
                    </div>

                    <NavLink
                        to="/settings"
                        onClick={() => setIsMobileOpen(false)}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        title={isCollapsed ? 'Settings' : ''}
                    >
                        <Settings size={18} />
                        {(!isCollapsed || isMobileOpen) && <span>Settings</span>}
                    </NavLink>
                    <div
                        className="nav-item logout-item"
                        onClick={() => { logout(); setIsMobileOpen(false); }}
                        title={isCollapsed ? 'Logout' : ''}
                    >
                        <Logout size={18} />
                        {(!isCollapsed || isMobileOpen) && <span>Logout</span>}
                    </div>
                </div>
            </div>

        </>
    );
};

export default Sidebar;
