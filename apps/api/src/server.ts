import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import menuRoutes from './routes/menu.js';
import tableRoutes from './routes/tables.js';
import orderRoutes from './routes/orders.js';
import inventoryRoutes from './routes/inventory.js';
import recipeRoutes from './routes/recipes.js';
import expenseRoutes from './routes/expenses.js';
import staffRoutes from './routes/staff.js';
import activityRoutes from './routes/activity.js';
import statsRoutes from './routes/stats.js';
import publicRoutes from './routes/public.js';
import customerRoutes from './routes/customers.js';
import uploadRoutes from './routes/upload.js';
import reportsRoutes from './routes/reports.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { roleMiddleware } from './middleware/roleMiddleware.js';
import prisma from './services/prisma.js';
import { createServer } from 'http';
import { initSocket } from './services/socket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer);

app.use(cors());
app.use(express.json());

// Extend Express Request to include clientId and user
declare global {
    namespace Express {
        interface Request {
            clientId?: string;
            user?: any;
        }
    }
}

// Public Routes
app.get('/health', (req, res) => {
    res.json({ status: 'RestroFlow API is running', multiTenant: true });
});
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);

// Auth Middleware (Protected Routes)
app.use(authMiddleware);

// --- Protected API Routes ---
app.use('/api/menu', roleMiddleware(['ADMIN', 'CHEF', 'WAITER']), menuRoutes);
app.use('/api/clients', clientsRouter);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', roleMiddleware(['ADMIN', 'CHEF']), inventoryRoutes);
app.use('/api/recipes', roleMiddleware(['ADMIN', 'CHEF']), recipeRoutes);
app.use('/api/expenses', roleMiddleware(['ADMIN']), expenseRoutes);
app.use('/api/staff', roleMiddleware(['ADMIN']), staffRoutes);
app.use('/api/activity', roleMiddleware(['ADMIN']), activityRoutes);
app.use('/api/stats', roleMiddleware(['ADMIN']), statsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reports', roleMiddleware(['ADMIN']), reportsRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('❌ [SERVER ERROR]:', err);

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Professional RestroFlow API running on port ${PORT} with WebSockets`);
});
