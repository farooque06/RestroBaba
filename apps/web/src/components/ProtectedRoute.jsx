import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const PLAN_RANK = {
    'SILVER': 1,
    'GOLD': 2,
    'DIAMOND': 3
};

const ProtectedRoute = ({ children, allowedRoles, minPlan }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'var(--bg-main)'
            }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            </div>
        );
    }

    if (!user) {
        // Redirect to login but save the current location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // --- Role Check ---
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Role not authorized, redirect to dashboard
        return <Navigate to="/dashboard" replace />;
    }

    // --- Plan Check ---
    if (minPlan && user.role !== 'SUPER_ADMIN') {
        const userPlan = user.client?.plan || 'SILVER';
        const userRank = PLAN_RANK[userPlan] || 1;
        const requiredRank = PLAN_RANK[minPlan] || 1;

        if (userRank < requiredRank) {
            // Plan not high enough, redirect to dashboard (or upgrade page if you have one)
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
