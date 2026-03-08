import React, { useState } from 'react';
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
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
    const { logout, user } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', newState);
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'WAITER', 'CHEF'] },
        { id: 'menu', label: 'Menu', icon: UtensilsCrossed, path: '/menu', roles: ['ADMIN', 'WAITER', 'CHEF'] },
        { id: 'kitchen', label: 'Kitchen', icon: ChefHat, path: '/kitchen', roles: ['ADMIN', 'CHEF'] },
        { id: 'tables', label: 'Tables', icon: TableProperties, path: '/tables', roles: ['ADMIN', 'WAITER'] },
        { id: 'orders', label: 'Orders', icon: ClipboardList, path: '/orders', roles: ['ADMIN', 'WAITER', 'CHEF'] },
        { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports', roles: ['ADMIN'] },
        { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory', roles: ['ADMIN', 'CHEF'] },
        { id: 'waste', label: 'Waste Management', icon: Trash2, path: '/waste', roles: ['ADMIN', 'CHEF', 'WAITER'] },
        { id: 'expenses', label: 'Expenses', icon: Wallet, path: '/expenses', roles: ['ADMIN'] },
        { id: 'staff', label: 'Staff', icon: Users, path: '/staff', roles: ['ADMIN'] },
        { id: 'billing', label: 'Billing', icon: Receipt, path: '/billing', roles: ['ADMIN', 'WAITER'] },
        { id: 'customers', label: 'Customers', icon: Users, path: '/customers', roles: ['ADMIN', 'WAITER'] },
        { id: 'activity', label: 'Activity Log', icon: History, path: '/activity', roles: ['ADMIN'] },
        { id: 'clients', label: 'Manage Clients', icon: ShieldCheck, path: '/clients', roles: ['SUPER_ADMIN'] },
    ];

    const filteredItems = menuItems.filter(item => item.roles.includes(user?.role));

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <button className="sidebar-toggle" onClick={toggleSidebar}>
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className="logo" style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
                <UtensilsCrossed size={24} color="var(--primary)" style={{ flexShrink: 0 }} />
                {!isCollapsed && <span>RestroFlow</span>}
            </div>

            <div className="nav-links">
                {filteredItems.map((item) => (
                    <NavLink
                        key={item.id}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        title={isCollapsed ? item.label : ''}
                    >
                        <item.icon size={18} />
                        {!isCollapsed && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </div>

            <div style={{ marginTop: 'auto' }} className="nav-links">
                <NavLink
                    to="/settings"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title={isCollapsed ? 'Settings' : ''}
                >
                    <Settings size={18} />
                    {!isCollapsed && <span>Settings</span>}
                </NavLink>
                <div
                    className="nav-item"
                    style={{ color: 'var(--danger)' }}
                    onClick={logout}
                    title={isCollapsed ? 'Logout' : ''}
                >
                    <LogOut size={18} />
                    {!isCollapsed && <span>Logout</span>}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
