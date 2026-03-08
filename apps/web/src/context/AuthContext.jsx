import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '../config';

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
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (response.ok) {
                if (data.requiresTOTP) {
                    return { success: true, requiresTOTP: true, userId: data.userId, needsSetup: data.needsSetup, qrCode: data.qrCode, secret: data.secret };
                }
                handleAuthSuccess(data);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (err) {
            return { success: false, error: 'Cannot connect to server' };
        }
    };

    const verifyTotp = async (userId, code) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/verify-totp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, code }),
            });
            const data = await response.json();
            if (response.ok) {
                handleAuthSuccess(data);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Invalid code' };
            }
        } catch (err) {
            return { success: false, error: 'Cannot connect to server' };
        }
    };

    const resolveShop = async (shopCode) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/resolve-shop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shopCode }),
            });
            const data = await response.json();
            if (response.ok) {
                return { success: true, data };
            } else {
                return { success: false, error: data.error || 'Invalid Shop Code' };
            }
        } catch (err) {
            return { success: false, error: 'Cannot connect to server' };
        }
    };

    const loginWithPin = async (userId, pin) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/pin-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, pin }),
            });
            const data = await response.json();
            if (response.ok) {
                handleAuthSuccess(data);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Invalid PIN' };
            }
        } catch (err) {
            return { success: false, error: 'Cannot connect to server' };
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
