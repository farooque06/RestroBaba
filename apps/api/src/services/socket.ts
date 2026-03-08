import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export const initSocket = (server: HTTPServer) => {
    io = new SocketIOServer(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        const { clientId } = socket.handshake.query;

        if (clientId) {
            const room = `client_${clientId}`;
            socket.join(room);
            console.log(`🔌 Socket joined room: ${room}`);
        }

        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

export const notifyClient = (clientId: string, event: string, data: any) => {
    if (io) {
        const room = `client_${clientId}`;
        io.to(room).emit(event, data);
        console.log(`📡 Emitting ${event} to room: ${room}`);
    }
};
