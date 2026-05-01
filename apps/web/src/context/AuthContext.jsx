import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('restroUser');
            const token = localStorage.getItem('restroToken');
            
            if (storedUser && token) {
                setUser(JSON.parse(storedUser));
                // Refresh silently to get latest client settings (like QR code)
                try {
                    const data = await apiClient('/api/auth/me');
                    if (data?.user) {
                        const userWithWarning = { ...data.user, subscriptionWarning: data.subscriptionWarning };
                        setUser(userWithWarning);
                        localStorage.setItem('restroUser', JSON.stringify(userWithWarning));
                    }
                } catch (err) {
                    console.error('Initial auth refresh failed:', err);
                    // If 401, apiClient will handle logout
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const handleAuthSuccess = (data) => {
        const userWithWarning = { ...data.user, subscriptionWarning: data.subscriptionWarning };
        setUser(userWithWarning);
        localStorage.setItem('restroUser', JSON.stringify(userWithWarning));
        localStorage.setItem('restroToken', data.token);
        localStorage.setItem('restroClientId', data.user.clientId);
    };

    const login = async (email, password) => {
        try {
            const data = await apiClient('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            if (data?.requiresTOTP) {
                return { success: true, requiresTOTP: true, userId: data.userId, needsSetup: data.needsSetup, qrCode: data.qrCode, secret: data.secret };
            }

            if (data) {
                handleAuthSuccess(data);
                return { success: true };
            }
            return { success: false, error: 'Login failed' };
        } catch (err) {
            return { success: false, error: err.message || 'Cannot connect to server' };
        }
    };

    const verifyTotp = async (userId, code) => {
        try {
            const data = await apiClient('/api/auth/verify-totp', {
                method: 'POST',
                body: JSON.stringify({ userId, code }),
            });

            if (data) {
                handleAuthSuccess(data);
                return { success: true };
            }
            return { success: false, error: 'Invalid code' };
        } catch (err) {
            return { success: false, error: err.message || 'Cannot connect to server' };
        }
    };

    const resolveShop = async (shopCode) => {
        try {
            const data = await apiClient('/api/auth/resolve-shop', {
                method: 'POST',
                body: JSON.stringify({ shopCode }),
            });

            if (data) {
                return { success: true, data };
            }
            return { success: false, error: 'Invalid Shop Code' };
        } catch (err) {
            return { success: false, error: err.message || 'Cannot connect to server' };
        }
    };

    const loginWithPin = async (userId, pin) => {
        try {
            const data = await apiClient('/api/auth/pin-login', {
                method: 'POST',
                body: JSON.stringify({ userId, pin }),
            });

            if (data) {
                handleAuthSuccess(data);
                return { success: true };
            }
            return { success: false, error: 'Invalid PIN' };
        } catch (err) {
            return { success: false, error: err.message || 'Cannot connect to server' };
        }
    };

    const refreshUser = async () => {
        try {
            const data = await apiClient('/api/auth/me');
            if (data?.user) {
                const userWithWarning = { ...data.user, subscriptionWarning: data.subscriptionWarning };
                setUser(userWithWarning);
                localStorage.setItem('restroUser', JSON.stringify(userWithWarning));
                return { success: true, user: userWithWarning };
            }
        } catch (err) {
            console.error('Failed to refresh user:', err);
        }
        return { success: false };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('restroUser');
        localStorage.removeItem('restroToken');
        // Force full refresh to login page to clear all in-memory state and avoid lazy-load issues
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, login, verifyTotp, resolveShop, loginWithPin, logout, refreshUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
