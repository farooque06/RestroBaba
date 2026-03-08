import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../services/prisma.js';

const router = express.Router();

// GET /api/staff — List all staff for the current client
router.get('/', async (req: Request, res: Response) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    try {
        const staff = await prisma.user.findMany({
            where: { clientId: req.clientId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                pin: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(staff);
    } catch (error) {
        console.error('Fetch staff error:', error);
        res.status(500).json({ error: 'Failed to fetch staff' });
    }
});

// POST /api/staff — Admin creates a new staff member
router.post('/', async (req: Request, res: Response) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    const { name, email, password, role, pin } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
        return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    try {
        // Check if email already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'A user with this email already exists' });
        }

        // Check if PIN already exists for this client
        if (pin) {
            const existingPin = await prisma.user.findUnique({
                where: { pin_clientId: { pin, clientId: req.clientId } }
            });
            if (existingPin) {
                return res.status(409).json({ error: 'This PIN is already assigned to another staff member' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                pin: pin || null,
                clientId: req.clientId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                pin: true,
                isActive: true,
                createdAt: true,
            }
        });

        // Log Activity (Non-blocking)
        if (req.user) {
            prisma.activityLog.create({
                data: {
                    action: 'STAFF_CREATE',
                    details: `Created staff member: ${name} (${role})`,
                    userId: req.user.userId,
                    role: req.user.role,
                    clientId: req.clientId!
                }
            }).catch(err => console.error('Activity log error:', err));
        }

        res.status(201).json(user);
    } catch (error: any) {
        console.error('Create staff error:', error);
        res.status(500).json({ error: 'Failed to create staff member', details: error.message });
    }
});

// PUT /api/staff/:id — Update staff details
router.put('/:id', async (req: Request, res: Response) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    const id = req.params.id as string;
    const { name, email, role, pin, isActive } = req.body;

    if (pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
        return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    try {
        // Verify user belongs to this client
        const existingUser = await prisma.user.findFirst({
            where: { id, clientId: req.clientId }
        });
        if (!existingUser) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        // Check PIN uniqueness if changing
        if (pin && pin !== existingUser.pin) {
            const existingPin = await prisma.user.findUnique({
                where: { pin_clientId: { pin, clientId: req.clientId } }
            });
            if (existingPin) {
                return res.status(409).json({ error: 'This PIN is already assigned to another staff member' });
            }
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;

        // Issue #18: Only allow role update if requester is ADMIN
        if (role !== undefined) {
            if (req.user.role === 'ADMIN') {
                updateData.role = role;
            } else if (role !== existingUser.role) {
                return res.status(403).json({ error: 'Only admins can change user roles' });
            }
        }

        if (pin !== undefined) updateData.pin = pin || null;
        if (isActive !== undefined) updateData.isActive = isActive;

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                pin: true,
                isActive: true,
                createdAt: true,
            }
        });

        // Log Activity (Non-blocking)
        if (req.user) {
            prisma.activityLog.create({
                data: {
                    action: 'STAFF_UPDATE',
                    details: `Updated staff member: ${user.name}`,
                    userId: req.user.userId,
                    role: req.user.role,
                    clientId: req.clientId!
                }
            }).catch(err => console.error('Activity log error:', err));
        }

        res.json(user);
    } catch (error: any) {
        console.error('Update staff error:', error);
        res.status(500).json({ error: 'Failed to update staff member', details: error.message });
    }
});

// DELETE /api/staff/:id — Remove staff member
router.delete('/:id', async (req: Request, res: Response) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });
    const id = req.params.id as string;

    try {
        // Verify user belongs to this client
        const existingUser = await prisma.user.findFirst({
            where: { id, clientId: req.clientId }
        });
        if (!existingUser) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        // Prevent deleting yourself
        if (req.user?.userId === id) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }

        await prisma.user.delete({ where: { id } });

        // Log Activity (Non-blocking)
        if (req.user) {
            prisma.activityLog.create({
                data: {
                    action: 'STAFF_DELETE',
                    details: `Deleted staff member: ${existingUser.name} (${existingUser.role})`,
                    userId: req.user.userId,
                    role: req.user.role,
                    clientId: req.clientId!
                }
            }).catch(err => console.error('Activity log error:', err));
        }

        res.json({ message: 'Staff member removed successfully' });
    } catch (error: any) {
        console.error('Delete staff error:', error);
        res.status(500).json({ error: 'Failed to delete staff member', details: error.message });
    }
});

export default router;
