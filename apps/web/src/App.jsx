import React, { useEffect } from 'react';
import './styles/index.css';
import 'nprogress/nprogress.css';
import NProgress from 'nprogress';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation
} from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import MenuManagement from './pages/MenuManagement';
import TableManagement from './pages/TableManagement';
import OrderList from './pages/OrderList';
import Billing from './pages/Billing';
import Login from './pages/Login';
import InventoryManagement from './pages/InventoryManagement';
import ExpenseTracker from './pages/ExpenseTracker';
import StaffManagement from './pages/StaffManagement';
import SettingsPage from './pages/SettingsPage';
import ClientManagement from './pages/ClientManagement';
import ActivityLog from './pages/ActivityLog';
import KitchenDisplay from './pages/KitchenDisplay';
import Reports from './pages/Reports';
import PublicMenu from './pages/PublicMenu';
import CustomerManagement from './pages/CustomerManagement';
import ProfitDashboard from './pages/ProfitDashboard';
import WasteManagement from './pages/WasteManagement';
import NotFound from './pages/NotFound';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';

// NProgress Configuration
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.2 });

function AppContent() {
    const { user, loading } = useAuth();
    const location = useLocation();
    const defaultPath = user?.role === 'SUPER_ADMIN' ? "/clients" : "/dashboard";
    const from = location.state?.from?.pathname || defaultPath;

    // Handle Route Change Loading Indicator
    useEffect(() => {
        NProgress.start();
        const timer = setTimeout(() => NProgress.done(), 200);
        return () => {
            clearTimeout(timer);
            NProgress.done();
        };
    }, [location.pathname]);

    if (loading) {
        return (
            <div className="login-container">
                <Loader2 className="animate-spin" size={40} color="var(--primary)" />
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={!user ? <Login /> : <Navigate to={from} replace />} />
            <Route path="/menu/p/:clientId/:tableId" element={<PublicMenu />} />
            <Route path="/menu/p/:clientId" element={<PublicMenu />} />

            {/* Protected Dashboard Routes */}
            <Route path="/*" element={
                <ProtectedRoute>
                    <div className="app-container">
                        <Sidebar />
                        <main className="main-content">
                            <Header />
                            <Routes>
                                <Route index element={<Navigate to="/dashboard" replace />} />
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="clients" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                        <ClientManagement />
                                    </ProtectedRoute>
                                } />
                                <Route path="menu" element={
                                    <ProtectedRoute allowedRoles={['ADMIN', 'CHEF', 'WAITER']}>
                                        <MenuManagement />
                                    </ProtectedRoute>
                                } />
                                <Route path="tables" element={
                                    <ProtectedRoute allowedRoles={['ADMIN', 'WAITER']}>
                                        <TableManagement />
                                    </ProtectedRoute>
                                } />
                                <Route path="orders" element={<OrderList />} />
                                <Route path="inventory" element={
                                    <ProtectedRoute allowedRoles={['ADMIN', 'CHEF']}>
                                        <InventoryManagement />
                                    </ProtectedRoute>
                                } />
                                <Route path="expenses" element={
                                    <ProtectedRoute allowedRoles={['ADMIN']}>
                                        <ExpenseTracker />
                                    </ProtectedRoute>
                                } />
                                <Route path="staff" element={
                                    <ProtectedRoute allowedRoles={['ADMIN']}>
                                        <StaffManagement />
                                    </ProtectedRoute>
                                } />
                                <Route path="billing" element={
                                    <ProtectedRoute allowedRoles={['ADMIN', 'WAITER']}>
                                        <Billing />
                                    </ProtectedRoute>
                                } />
                                <Route path="activity" element={
                                    <ProtectedRoute allowedRoles={['ADMIN']}>
                                        <ActivityLog />
                                    </ProtectedRoute>
                                } />
                                <Route path="kitchen" element={
                                    <ProtectedRoute allowedRoles={['ADMIN', 'CHEF']}>
                                        <KitchenDisplay />
                                    </ProtectedRoute>
                                } />
                                <Route path="reports" element={
                                    <ProtectedRoute allowedRoles={['ADMIN']}>
                                        <Reports />
                                    </ProtectedRoute>
                                } />
                                <Route path="customers" element={
                                    <ProtectedRoute allowedRoles={['ADMIN', 'WAITER']}>
                                        <CustomerManagement />
                                    </ProtectedRoute>
                                } />
                                <Route path="profit-analytics" element={
                                    <ProtectedRoute allowedRoles={['ADMIN']}>
                                        <ProfitDashboard />
                                    </ProtectedRoute>
                                } />
                                <Route path="waste" element={
                                    <ProtectedRoute allowedRoles={['ADMIN', 'CHEF', 'WAITER']}>
                                        <WasteManagement />
                                    </ProtectedRoute>
                                } />
                                <Route path="settings" element={<SettingsPage />} />

                                {/* 404 inside Protected Area */}
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        </main>
                    </div>
                </ProtectedRoute>
            } />

            {/* Global Fallback/404 */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Router>
                    <AppContent />
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            className: 'premium-toast',
                            style: {
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)',
                                backdropFilter: 'blur(10px)',
                            },
                        }}
                    />
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
