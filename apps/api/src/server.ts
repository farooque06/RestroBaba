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
import staffAccountancyRoutes from './routes/staffAccountancy.js';
import statsRoutes from './routes/stats.js';
import publicRoutes from './routes/public.js';
import customerRoutes from './routes/customers.js';
import uploadRoutes from './routes/upload.js';
import reportsRoutes from './routes/reports.js';
import plansRoutes from './routes/plans.js';
import shiftsRoutes from './routes/shifts.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { roleMiddleware } from './middleware/roleMiddleware.js';
import prisma from './services/prisma.js';
import { createServer } from 'http';
import { initSocket } from './services/socket.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import logger from './services/logger.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer);

// Security Middlewares
app.use(helmet());
// CORS Configuration
const allowedOrigins = [
    'https://restrobaba.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'clientId'],
    exposedHeaders: ['Set-Cookie']
}));
app.use(express.json());

// Logging Middleware
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Skip global rate limiting to prevent blocking legitimate high-volume traffic
// app.use('/api/', limiter);

// Extend Express Request to include clientId and user
declare global {
    namespace Express {
        interface Request {
            clientId?: string;
            user?: any;
        }
    }
}

// Public & Auth Routes (Rate Limited)
app.get('/health', limiter, (req, res) => {
    res.json({ status: 'RestroBaBa API is running', multiTenant: true });
});
app.use('/api/auth', limiter, authRoutes);
app.use('/api/public', limiter, publicRoutes);

// Auth Middleware (Protected Routes)
app.use(authMiddleware);

// --- Protected API Routes ---
app.use('/api/menu', roleMiddleware(['ADMIN', 'MANAGER', 'CHEF', 'WAITER']), menuRoutes);
app.use('/api/clients', clientsRouter);
app.use('/api/tables', roleMiddleware(['ADMIN', 'MANAGER', 'WAITER']), tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', roleMiddleware(['ADMIN', 'MANAGER', 'CHEF']), inventoryRoutes);
app.use('/api/recipes', roleMiddleware(['ADMIN', 'MANAGER', 'CHEF']), recipeRoutes);
app.use('/api/expenses', roleMiddleware(['ADMIN', 'MANAGER']), expenseRoutes);
app.use('/api/staff', roleMiddleware(['ADMIN', 'MANAGER']), staffRoutes);
app.use('/api/activity', roleMiddleware(['ADMIN', 'SUPER_ADMIN']), activityRoutes);
app.use('/api/shift-management', roleMiddleware(['ADMIN', 'MANAGER']), shiftsRoutes); // Backward compatibility or specific route
app.use('/api/staff-accountancy', roleMiddleware(['ADMIN', 'MANAGER']), staffAccountancyRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/customers', roleMiddleware(['ADMIN', 'MANAGER', 'WAITER']), customerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reports', roleMiddleware(['ADMIN', 'MANAGER']), reportsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/shifts', roleMiddleware(['ADMIN', 'MANAGER']), shiftsRoutes);

import { ZodError } from 'zod';

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error(`❌ [SERVER ERROR]: ${err.message}`, { stack: err.stack });

    if (err instanceof ZodError) {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.issues.map((e: any) => ({
                path: e.path.join('.'),
                message: e.message
            }))
        });
    }

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    logger.info(`🚀 Professional RestroBaBa API running on port ${PORT} with WebSockets`);
});
