import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET is not defined in environment variables.');
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const isPublicAuthRoute = req.path.startsWith('/api/auth/') &&
        ['/login', '/verify-totp', '/totp-setup-qr', '/resolve-shop-code'].some(p => req.path.includes(p));

    if (req.path === '/health' || isPublicAuthRoute) {
        return next();
    }

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.clientId = decoded.clientId;
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
};
