import { API_BASE_URL } from '../config';

/**
 * Centralized API client for all backend requests.
 * Handles auth headers, session expiry, and network errors.
 */
const apiClient = async (endpoint, options = {}) => {
    const token = localStorage.getItem('restroToken');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    let response;

    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } catch (networkError) {
        // Network-level failure (server down, no internet, CORS block, etc.)
        console.error(`Network Error [${endpoint}]:`, networkError);
        throw new Error(
            'Cannot connect to the server. Please make sure the API server is running.'
        );
    }

    // Handle session expiry — auto-logout on 401 for non-auth endpoints
    if (
        response.status === 401 &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/pin-login')
    ) {
        console.warn('Session expired or unauthorized. Logging out.');
        localStorage.removeItem('restroUser');
        localStorage.removeItem('restroToken');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        return null;
    }

    // Parse response body
    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error('Invalid response from server.');
    }

    if (!response.ok) {
        throw new Error(data.error || 'API request failed');
    }

    return data;
};

export default apiClient;
