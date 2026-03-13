import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('restroUser');
        const token = localStorage.getItem('restroToken');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const handleAuthSuccess = (data) => {
        setUser(data.user);
        localStorage.setItem('restroUser', JSON.stringify(data.user));
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

    const logout = () => {
        setUser(null);
        localStorage.removeItem('restroUser');
        localStorage.removeItem('restroToken');
    };

    return (
        <AuthContext.Provider value={{ user, login, verifyTotp, resolveShop, loginWithPin, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
