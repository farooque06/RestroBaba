import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';

let socket = null;

export const initSocket = (clientId) => {
    if (socket) return socket;

    // Use API_BASE_URL but remove /api if it's there
    const socketUrl = API_BASE_URL.replace('/api', '');

    socket = io(socketUrl, {
        query: { clientId },
        transports: ['websocket']
    });

    socket.on('connect', () => {
        console.log('🔌 Connected to Socket.io server');
    });

    socket.on('disconnect', () => {
        console.log('🔌 Disconnected from Socket.io server');
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
