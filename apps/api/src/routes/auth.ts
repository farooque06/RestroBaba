import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, UnauthorizedError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import logger from '../services/logger.js';
import prisma from '../services/prisma.js';
import { authMiddleware as authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET is not defined in environment variables.');
}

// ─── Rate Limiting (in-memory) ──────────────────────────────────────────────
interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const pinFailMap = new Map<string, RateLimitEntry>();

function isRateLimited(map: Map<string, RateLimitEntry>, key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = map.get(key);

    if (!entry || now > entry.resetAt) {
        map.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }

    entry.count++;
    if (entry.count > maxAttempts) {
        return true;
    }
    return false;
}

function getRemainingLockout(map: Map<string, RateLimitEntry>, key: string): number {
    const entry = map.get(key);
    if (!entry) return 0;
    const remaining = Math.ceil((entry.resetAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
}

// Clean up stale entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
        if (now > entry.resetAt) rateLimitMap.delete(key);
    }
    for (const [key, entry] of pinFailMap) {
        if (now > entry.resetAt) pinFailMap.delete(key);
    }
}, 10 * 60 * 1000);

// Generate a random 6-char alphanumeric shop code
function generateShopCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Helper: Check subscription status
function checkSubscription(client: any) {
    if (!client || !client.subscriptionEnd) return { expired: false, daysLeft: Infinity };
    
    try {
        const expiry = new Date(client.subscriptionEnd);
        if (isNaN(expiry.getTime())) {
            return { expired: false, daysLeft: Infinity };
        }

        const now = new Date();
        const diff = expiry.getTime() - now.getTime();
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
        
        return {
            expired: daysLeft <= 0,
            daysLeft
        };
    } catch (e) {
        console.error("Subscription check error:", e);
        return { expired: false, daysLeft: Infinity };
    }
}

// ─── Email + Password Login ─────────────────────────────────────────────────
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (isRateLimited(rateLimitMap, `login:${ip}`, 10, 5 * 60 * 1000)) {
        const remaining = getRemainingLockout(rateLimitMap, `login:${ip}`);
        throw new AppError(`Too many login attempts. Try again in ${remaining}s.`, 429);
    }

    const user = await prisma.user.findUnique({
        where: { email },
        include: { client: { include: { subscriptionPlan: true } } }
    });

    if (!user) {
        throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
        throw new ForbiddenError('Your account has been deactivated.');
    }

    // --- Subscription Enforcement ---
    if (user.role !== 'SUPER_ADMIN' && user.client) {
        if (!user.client.isActive) {
            throw new ForbiddenError('This restaurant system has been deactivated by the administrator.');
        }

        const { expired } = checkSubscription(user.client);
        if (expired) {
            throw new ForbiddenError('Your subscription is expired please renue or contact 9765231402 whatsapp for extending or additional time');
        }
    }

    // ── Super Admin → TOTP 2FA ──
    if (user.role === 'SUPER_ADMIN') {
        // First time? Generate TOTP secret and return QR code for setup
        if (!user.totpSecret) {
            const secret = speakeasy.generateSecret({ 
                name: `RestroFlow (${user.email})`,
                issuer: 'RestroFlow',
                otpauth_url: true
            });
            
            if (!secret.otpauth_url) {
                throw new Error('Failed to generate TOTP auth URL');
            }

            await prisma.user.update({
                where: { id: user.id },
                data: { totpSecret: secret.base32 }
            });

            const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

            return res.json({
                requiresTOTP: true,
                needsSetup: true,
                userId: user.id,
                qrCode: qrDataUrl,
                secret: secret.base32,
                message: 'Scan this QR code with Google Authenticator'
            });
        }

        // Already setup → just ask for code
        return res.json({
            requiresTOTP: true,
            needsSetup: false,
            userId: user.id,
            message: 'Enter your authenticator code'
        });
    }

    // ── Regular users → direct token ──
    const token = jwt.sign(
        {
            userId: user.id,
            clientId: user.clientId,
            role: user.role,
            plan: user.client?.plan || 'SILVER',
            clientName: user.client?.name || 'System'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            clientId: user.clientId,
            clientName: user.client?.name || 'System',
            shopCode: user.client?.shopCode || null,
            client: user.client
        },
        subscriptionWarning: user.client ? checkSubscription(user.client).daysLeft : null
    });
}));

// ─── Verify TOTP Code (Super Admin 2FA) ─────────────────────────────────────
router.post('/verify-totp', async (req: Request, res: Response) => {
    const { userId, code } = req.body;

    if (!userId || !code) {
        return res.status(400).json({ error: 'User ID and code are required' });
    }

    // Rate limit TOTP attempts
    if (isRateLimited(rateLimitMap, `totp:${userId}`, 5, 5 * 60 * 1000)) {
        const remaining = getRemainingLockout(rateLimitMap, `totp:${userId}`);
        return res.status(429).json({ error: `Too many attempts. Try again in ${remaining}s.` });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || user.role !== 'SUPER_ADMIN' || !user.totpSecret) {
            return res.status(401).json({ error: 'Invalid operation' });
        }

        const isValid = speakeasy.totp.verify({
            secret: user.totpSecret,
            encoding: 'base32',
            token: code
        });

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid code. Check your authenticator app.' });
        }

        // Clear rate limit on success
        rateLimitMap.delete(`totp:${userId}`);

        const token = jwt.sign(
            {
                userId: user.id,
                clientId: null,
                role: 'SUPER_ADMIN',
                plan: 'DIAMOND', // Super admin has diamond equivalent access
                clientName: 'RestroFlow System'
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                clientName: 'RestroFlow System'
            }
        });
    } catch (error) {
        console.error('TOTP verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── Resolve Shop Code & Get Staff List ─────────────────────────────────────
router.post('/resolve-shop', async (req: Request, res: Response) => {
    const { shopCode } = req.body;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (!shopCode) {
        return res.status(400).json({ error: 'Shop Code is required' });
    }

    if (isRateLimited(rateLimitMap, `shop:${ip}`, 5, 60 * 1000)) {
        const remaining = getRemainingLockout(rateLimitMap, `shop:${ip}`);
        return res.status(429).json({ error: `Too many attempts. Try again in ${remaining}s.` });
    }

    try {
        // @ts-ignore
        const client = await prisma.client.findFirst({
            // @ts-ignore
            where: { shopCode: shopCode.toUpperCase().trim() },
            include: {
                users: {
                    where: {
                        isActive: true,
                        pin: { not: null },
                        role: { not: 'ADMIN' }
                    },
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            }
        });

        if (!client) {
            return res.status(404).json({ error: 'Invalid Shop Code. Please check and try again.' });
        }

        res.json({
            clientName: client.name,
            staff: client.users
        });
    } catch (error) {
        console.error('Resolve shop error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── PIN-based Login (Staff) ────────────────────────────────────────────────
router.post('/pin-login', async (req: Request, res: Response) => {
    const { userId, pin } = req.body;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (!userId || !pin) {
        return res.status(400).json({ error: 'User ID and PIN are required' });
    }

    if (isRateLimited(pinFailMap, `pin:${userId}:${ip}`, 10, 5 * 60 * 1000)) {
        const remaining = getRemainingLockout(pinFailMap, `pin:${userId}:${ip}`);
        return res.status(429).json({ error: `Too many failed attempts. Try again in ${remaining}s.` });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { client: { include: { subscriptionPlan: true } } }
        });

        if (!user || user.pin !== pin || !user.isActive) {
            return res.status(401).json({ error: 'Invalid PIN or inactive account' });
        }

        if (user.role !== 'SUPER_ADMIN' && user.client) {
            if (!user.client.isActive) {
                return res.status(403).json({ error: 'Restaurant system is deactivated' });
            }

            const sub = checkSubscription(user.client);
            if (sub.expired) {
                return res.status(403).json({ 
                    error: 'Your subscription is expired please renue or contact 9765231402 whatsapp for extending or additional time',
                    isExpired: true
                });
            }
        }

        // Clear fails on success
        pinFailMap.delete(`pin:${userId}:${ip}`);

        const token = jwt.sign(
            {
                userId: user.id,
                clientId: user.clientId,
                role: user.role,
                plan: user.client?.plan || 'SILVER',
                clientName: user.client?.name || 'System'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                clientId: user.clientId,
                clientName: user.client?.name || 'System',
                shopCode: user.client?.shopCode || null,
                client: user.client
            },
            subscriptionWarning: user.client ? checkSubscription(user.client).daysLeft : null
        });
    } catch (error) {
        console.error('PIN login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── Register a New Client (Restaurant) ─────────────────────────────────────
router.post('/register-client', async (req: Request, res: Response, next: NextFunction) => {
    const {
        restaurantName,
        restaurantEmail,
        adminName,
        adminEmail,
        adminPassword,
        useTax,
        taxRate,
        useServiceCharge,
        serviceChargeRate
    } = req.body;

    if (!restaurantName || !restaurantEmail || !adminName || !adminEmail || !adminPassword) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Generate unique shop code
        let shopCode: string;
        let isUnique = false;
        do {
            shopCode = generateShopCode();
            // @ts-ignore
            const existing = await prisma.client.findFirst({ where: { shopCode } });
            isUnique = !existing;
        } while (!isUnique);

        const result = await prisma.$transaction(async (tx) => {
            const client = await tx.client.create({
                data: {
                    name: restaurantName,
                    email: restaurantEmail,
                    shopCode,
                    useTax: useTax === true,
                    taxRate: parseFloat(taxRate) || 0,
                    useServiceCharge: useServiceCharge === true,
                    serviceChargeRate: parseFloat(serviceChargeRate) || 0
                }
            });

            const user = await tx.user.create({
                data: {
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'ADMIN',
                    clientId: client.id
                }
            });

            return { client, user };
        });

        res.status(201).json({
            message: 'Restaurant and Admin account created successfully',
            client: {
                id: result.client.id,
                name: result.client.name,
                shopCode: result.client.shopCode
            },
            admin: {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email
            }
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }
        next(error);
    }
});

// ─── Change Own Password ──────────────────────────────────────────────────
router.patch('/change-password', authenticate, async (req: any, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Incorrect current password' });

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── Get Current User Profile ──────────────────────────────────────────────
router.get('/me', authenticate, async (req: any, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { client: { include: { subscriptionPlan: true } } }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                clientId: user.clientId,
                clientName: user.client?.name || 'System',
                shopCode: user.client?.shopCode || null,
                client: user.client // This includes the tax/SC settings
            },
            subscriptionWarning: user.client ? checkSubscription(user.client).daysLeft : null
        });
    } catch (error) {
        console.error('Fetch profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
