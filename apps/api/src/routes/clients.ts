import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../services/prisma.js';
import { authMiddleware as authenticate } from '../middleware/authMiddleware.js';
import { roleMiddleware as authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All routes here require authentication
router.use(authenticate);

// ─── Helper: Generate Unique Shop Code ───────────────────────────────────────
const generateUniqueShopCode = async (): Promise<string> => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars like O, 0, I, 1
    let isUnique = false;
    let code = '';

    while (!isUnique) {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const existing = await prisma.client.findUnique({
            where: { shopCode: code }
        });
        if (!existing) isUnique = true;
    }
    return code;
};

// ─── List All Clients ────────────────────────────────────────────────────────
router.get('/', authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    const search = req.query.search as string;

    try {
        const clients = await prisma.client.findMany({
            where: search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { shopCode: { contains: search, mode: 'insensitive' } }
                ]
            } : {},
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(clients);
    } catch (error) {
        console.error('List clients error:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// ─── Create New Client (Restaurant) ──────────────────────────────────────────
router.post('/', authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    const { name, email, adminName, adminPassword, useTax, taxRate, useServiceCharge, serviceChargeRate } = req.body;

    if (!name || !email || !adminName || !adminPassword) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const shopCode = await generateUniqueShopCode();

        // Also check if admin email exists globally
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const result = await prisma.$transaction(async (tx) => {
            const client = await tx.client.create({
                data: {
                    name,
                    email,
                    shopCode,
                    subdomain: name.toLowerCase().replace(/\s+/g, '-'),
                    useTax: useTax === true,
                    taxRate: parseFloat(taxRate) || 0,
                    useServiceCharge: useServiceCharge === true,
                    serviceChargeRate: parseFloat(serviceChargeRate) || 0
                }
            });

            await tx.user.create({
                data: {
                    name: adminName,
                    email: email,
                    password: hashedPassword,
                    role: 'ADMIN',
                    clientId: client.id
                }
            });

            return client;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

// ─── Update Client Status/Details ───────────────────────────────────────────
router.patch('/:id', authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, email, shopCode, isActive } = req.body;

    try {
        const client = await prisma.client.update({
            where: { id },
            data: {
                name,
                email,
                shopCode: typeof shopCode === 'string' ? shopCode.toUpperCase() : undefined,
                // @ts-ignore
                isActive: typeof isActive === 'boolean' ? isActive : undefined,
                useTax: req.body.useTax !== undefined ? req.body.useTax === true : undefined,
                taxRate: req.body.taxRate !== undefined ? parseFloat(req.body.taxRate) : undefined,
                useServiceCharge: req.body.useServiceCharge !== undefined ? req.body.useServiceCharge === true : undefined,
                serviceChargeRate: req.body.serviceChargeRate !== undefined ? parseFloat(req.body.serviceChargeRate) : undefined
            }
        });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// ─── Reset Client Admin Password ─────────────────────────────────────────────
router.patch('/:id/reset-password', authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({ error: 'New password is required' });
    }

    try {
        // Find the admin user for this client
        const adminUser = await prisma.user.findFirst({
            where: { clientId: id, role: 'ADMIN' }
        });

        if (!adminUser) {
            return res.status(404).json({ error: 'Admin user not found for this client' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: adminUser.id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Admin password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// ─── Regenerate Shop Code (SUPER_ADMIN) ──────────────────────────────────────
router.patch('/:id/regenerate', authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    const id = req.params.id as string;

    try {
        const newCode = await generateUniqueShopCode();
        const client = await prisma.client.update({
            where: { id },
            data: { shopCode: newCode }
        });

        res.json({ message: 'Shop code regenerated', shopCode: newCode });
    } catch (error) {
        console.error('Regenerate code error:', error);
        res.status(500).json({ error: 'Failed to regenerate shop code' });
    }
});

// ─── Regenerate Own Shop Code (ADMIN) ───────────────────────────────────────
router.patch('/my-shop/regenerate', authorize(['ADMIN']), async (req: any, res: Response) => {
    try {
        const newCode = await generateUniqueShopCode();
        const client = await prisma.client.update({
            where: { id: req.user.clientId },
            data: { shopCode: newCode }
        });

        res.json({ message: 'Shop code regenerated', shopCode: newCode });
    } catch (error) {
        console.error('Regenerate own code error:', error);
        res.status(500).json({ error: 'Failed to regenerate shop code' });
    }
});

// ─── Update Own Client Settings (ADMIN) ──────────────────────────────────────
router.patch('/settings/me', authorize(['ADMIN']), async (req: any, res: Response) => {
    const { useTax, taxRate, useServiceCharge, serviceChargeRate, restaurantName } = req.body;

    try {
        const client = await prisma.client.update({
            where: { id: req.user.clientId },
            data: {
                name: restaurantName,
                useTax: useTax !== undefined ? useTax === true : undefined,
                taxRate: taxRate !== undefined ? parseFloat(taxRate) : undefined,
                useServiceCharge: useServiceCharge !== undefined ? useServiceCharge === true : undefined,
                serviceChargeRate: serviceChargeRate !== undefined ? parseFloat(serviceChargeRate) : undefined
            }
        });
        res.json(client);
    } catch (error) {
        console.error('Update own settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
