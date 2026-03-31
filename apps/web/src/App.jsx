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

// Lazy loaded pages to optimize bundle size per tenant/user role
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const MenuManagement = React.lazy(() => import('./pages/MenuManagement'));
const TableManagement = React.lazy(() => import('./pages/TableManagement'));
const OrderList = React.lazy(() => import('./pages/OrderList'));
const Billing = React.lazy(() => import('./pages/Billing'));
const Login = React.lazy(() => import('./pages/Login'));
const InventoryManagement = React.lazy(() => import('./pages/InventoryManagement'));
const ExpenseTracker = React.lazy(() => import('./pages/ExpenseTracker'));
const StaffManagement = React.lazy(() => import('./pages/StaffManagement'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const ClientManagement = React.lazy(() => import('./pages/ClientManagement'));
const PlanManagement = React.lazy(() => import('./pages/PlanManagement'));
const ActivityLog = React.lazy(() => import('./pages/ActivityLog'));
const KitchenDisplay = React.lazy(() => import('./pages/KitchenDisplay'));
const Reports = React.lazy(() => import('./pages/Reports'));
const PublicMenu = React.lazy(() => import('./pages/PublicMenu'));
const CustomerManagement = React.lazy(() => import('./pages/CustomerManagement'));
const ProfitDashboard = React.lazy(() => import('./pages/ProfitDashboard'));
const WasteManagement = React.lazy(() => import('./pages/WasteManagement'));
const ShiftManagement = React.lazy(() => import('./pages/ShiftManagement'));
const HelpPage = React.lazy(() => import('./pages/HelpPage'));
const Signup = React.lazy(() => import('./pages/Signup'));
const LeadManagement = React.lazy(() => import('./pages/LeadManagement'));
const TaxReports = React.lazy(() => import('./pages/TaxReports'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

import Sidebar from './components/layout/Sidebar';
import MobileHeader from './components/layout/MobileHeader';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
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
        <React.Suspense fallback={
            <div className="login-container">
                <Loader2 className="animate-spin" size={40} color="var(--primary)" />
            </div>
        }>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={!user ? <Login /> : <Navigate to={from} replace />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/menu/p/:clientId/:tableId" element={<PublicMenu />} />
                <Route path="/menu/p/:clientId" element={<PublicMenu />} />

                {/* Protected Dashboard Routes */}
                <Route path="/*" element={
                    <ProtectedRoute>
                        <div className="app-container">
                            <MobileHeader />
                            <Sidebar />
                            <main className="main-content">
                                <Routes>
                                    <Route index element={<Navigate to="/dashboard" replace />} />
                                    <Route path="dashboard" element={<Dashboard />} />
                                    <Route path="clients" element={
                                        <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                            <ClientManagement />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="plans" element={
                                        <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                            <PlanManagement />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="leads" element={
                                        <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                            <LeadManagement />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="menu" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CHEF', 'WAITER']}>
                                            <MenuManagement />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="tables" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'WAITER']}>
                                            <TableManagement />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="orders" element={<OrderList />} />
                                    <Route path="inventory" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CHEF']}>
                                            <InventoryManagement />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="expenses" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} minPlan="GOLD">
                                            <ExpenseTracker />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="staff" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                                            <StaffManagement />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="billing" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'WAITER']}>
                                            <Billing />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="activity" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} minPlan="DIAMOND">
                                            <ActivityLog />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="kitchen" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CHEF']} minPlan="GOLD">
                                            <KitchenDisplay />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="reports" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} minPlan="SILVER">
                                            <Reports />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="customers" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'WAITER']}>
                                            <CustomerManagement />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="profit-analytics" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} minPlan="GOLD">
                                            <ProfitDashboard />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="waste" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CHEF', 'WAITER']}>
                                            <WasteManagement />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="shifts" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} minPlan="GOLD">
                                            <ShiftManagement />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="tax-reports" element={
                                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} minPlan="GOLD">
                                            <TaxReports />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="settings" element={<SettingsPage />} />
                                    <Route path="help" element={<HelpPage />} />

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
        </React.Suspense>
    );
}

function App() {
    return (
        <ErrorBoundary>
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
        </ErrorBoundary>
    );
}

export default App;
