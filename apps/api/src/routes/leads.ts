import express, { Request, Response } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware as authenticate } from '../middleware/authMiddleware.js';
import { roleMiddleware as authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/leads
 * @desc    Public endpoint to submit a restaurant signup lead
 * @access  Public
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { restaurantName, ownerName, email, phone, location, message } = req.body;

        // Basic validation
        if (!restaurantName || !ownerName || !email || !phone) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        const lead = await prisma.restaurantLead.create({
            data: {
                restaurantName,
                ownerName,
                email,
                phone,
                location,
                message,
                status: 'PENDING'
            }
        });

        res.status(201).json({ message: 'Lead submitted successfully', leadId: lead.id });
    } catch (error) {
        console.error('Submit lead error:', error);
        res.status(500).json({ error: 'Failed to submit lead' });
    }
});

/**
 * @route   GET /api/leads
 * @desc    Get all leads (Super Admin only)
 * @access  Private (SUPER_ADMIN)
 */
router.get('/', authenticate, authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    try {
        const leads = await prisma.restaurantLead.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(leads);
    } catch (error) {
        console.error('List leads error:', error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

/**
 * @route   PATCH /api/leads/:id
 * @desc    Update lead status (Super Admin only)
 * @access  Private (SUPER_ADMIN)
 */
router.patch('/:id', authenticate, authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        const lead = await prisma.restaurantLead.update({
            where: { id: req.params.id as string },
            data: { status }
        });
        res.json(lead);
    } catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({ error: 'Failed to update lead' });
    }
});

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete a lead (Super Admin only)
 * @access  Private (SUPER_ADMIN)
 */
router.delete('/:id', authenticate, authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    try {
        await prisma.restaurantLead.delete({
            where: { id: req.params.id as string }
        });
        res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});

export default router;
