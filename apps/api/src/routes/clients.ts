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
    const { name, email, adminName, adminPassword, useTax, taxRate, useServiceCharge, serviceChargeRate, plan, planDuration } = req.body;

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
            // Find plan ID for the selected tier
            const subPlan = await tx.subscriptionPlan.findFirst({
                where: { tier: plan || 'SILVER', isActive: true },
                orderBy: { createdAt: 'desc' }
            });

            // Robust Date Parsing
            const parseDate = (val: any, fallbackMonths: number = 1) => {
                if (val) {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) return d;
                }
                const d = new Date();
                d.setMonth(d.getMonth() + fallbackMonths);
                return d;
            };

            const sStart = req.body.subscriptionStart ? new Date(req.body.subscriptionStart) : new Date();
            const sEnd = parseDate(req.body.subscriptionEnd, planDuration === '12m' ? 12 : planDuration === '3m' ? 3 : 1);

            console.log('Calculated Expiry for Prisma:', sEnd);

            const client = await tx.client.create({
                data: {
                    name,
                    email,
                    shopCode,
                    subdomain: name.toLowerCase().replace(/\s+/g, '-'),
                    useTax: useTax === true,
                    taxRate: parseFloat(taxRate) || 0,
                    useServiceCharge: useServiceCharge === true,
                    serviceChargeRate: parseFloat(serviceChargeRate) || 0,
                    plan: plan || 'SILVER',
                    planDuration: planDuration || '1m',
                    planId: subPlan?.id,
                    subscriptionStart: sStart,
                    subscriptionEnd: sEnd,
                    paymentStatus: req.body.paymentStatus || 'PAID',
                    lastPaymentDate: req.body.lastPaymentDate ? new Date(req.body.lastPaymentDate) : new Date()
                }
            });

            console.log('Database Result (Expiry):', client.subscriptionEnd);

            await tx.user.create({
                data: {
                    name: adminName,
                    email: email,
                    password: hashedPassword,
                    role: 'ADMIN',
                    clientId: client.id
                }
            });

            await tx.activityLog.create({
                data: {
                    action: 'CLIENT_CREATED',
                    details: `Created new node: ${name}`,
                    type: 'PLATFORM',
                    userId: (req as any).user.userId,
                    role: (req as any).user.role,
                    clientId: client.id
                }
            });

            // If marked as PAID during onboarding, create an initial ledger entry
            if (req.body.paymentStatus === 'PAID' && subPlan) {
                let baseAmount = subPlan.monthlyPrice;
                if (planDuration === '12m') baseAmount = subPlan.yearlyPrice;
                else if (planDuration === '3m') baseAmount = subPlan.quarterlyPrice;

                await tx.subscriptionPayment.create({
                    data: {
                        clientId: client.id,
                        planTier: plan || 'SILVER',
                        planDuration: planDuration || '1m',
                        baseAmount: baseAmount,
                        discount: 0,
                        totalPayable: baseAmount,
                        amountPaid: baseAmount,
                        balance: 0,
                        method: 'Initial Setup',
                        remarks: `Onboarding Payment [Covers until ${sEnd.toLocaleDateString()}]`,
                        date: new Date()
                    }
                });
            } else if (req.body.paymentStatus === 'PENDING' && subPlan) {
                 let baseAmount = subPlan.monthlyPrice;
                 if (planDuration === '12m') baseAmount = subPlan.yearlyPrice;
                 else if (planDuration === '3m') baseAmount = subPlan.quarterlyPrice;
                 
                 // Update client balance to reflect the pending debt
                 await tx.client.update({
                     where: { id: client.id },
                     data: { balance: baseAmount }
                 });
                 
                 await tx.subscriptionPayment.create({
                    data: {
                        clientId: client.id,
                        planTier: plan || 'SILVER',
                        planDuration: planDuration || '1m',
                        baseAmount: baseAmount,
                        discount: 0,
                        totalPayable: baseAmount,
                        amountPaid: 0,
                        balance: baseAmount,
                        method: 'Pending Invoice',
                        remarks: `Initial Onboarding - Payment Pending [For: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}]`,
                        date: new Date()
                    }
                });
            }

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
    const { name, email, shopCode, isActive, plan, planDuration } = req.body;

    try {
        // Find plan ID if plan is changing
        let planId = undefined;
        if (plan) {
            const subPlan = await prisma.subscriptionPlan.findFirst({
                where: { tier: plan, isActive: true },
                orderBy: { createdAt: 'desc' }
            });
            planId = subPlan?.id;
        }

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
                serviceChargeRate: req.body.serviceChargeRate !== undefined ? parseFloat(req.body.serviceChargeRate) : undefined,
                plan: plan,
                planId: planId,
                planDuration: planDuration,
                // Add these fields
                subscriptionStart: req.body.subscriptionStart ? new Date(req.body.subscriptionStart) : undefined,
                subscriptionEnd: req.body.subscriptionEnd ? new Date(req.body.subscriptionEnd) : undefined,
                paymentStatus: req.body.paymentStatus,
                lastPaymentDate: req.body.lastPaymentDate ? new Date(req.body.lastPaymentDate) : undefined
            }
        });

        await prisma.activityLog.create({
            data: {
                action: plan && plan !== client.plan ? 'PLAN_UPGRADED' : 'CLIENT_UPDATED',
                details: plan && plan !== client.plan ? `Upgraded to ${plan} tier` : `Updated settings for ${client.name}`,
                type: 'PLATFORM',
                userId: (req as any).user.userId,
                role: (req as any).user.role,
                clientId: id
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
    const { 
        useTax, taxRate, useServiceCharge, serviceChargeRate, restaurantName, qrCode,
        // Nepal IRD Compliance fields
        taxMode, panNumber, vatNumber, businessAddress, businessPhone, invoicePrefix
    } = req.body;

    try {
        // Build update data
        const updateData: any = {
            name: restaurantName,
            useServiceCharge: useServiceCharge !== undefined ? useServiceCharge === true : undefined,
            serviceChargeRate: serviceChargeRate !== undefined ? parseFloat(serviceChargeRate) : undefined,
            qrCode: qrCode !== undefined ? qrCode : undefined
        };

        // Nepal IRD Tax Mode Logic
        if (taxMode !== undefined) {
            updateData.taxMode = taxMode;

            if (taxMode === 'VAT_REGISTERED') {
                // VAT Registered: Force 13% VAT (Nepal standard rate)
                updateData.useTax = true;
                updateData.taxRate = 13;
            } else if (taxMode === 'PAN_ONLY') {
                // PAN Only: No VAT charged
                updateData.useTax = false;
                updateData.taxRate = 0;
            } else {
                // NONE: No tax at all
                updateData.useTax = false;
                updateData.taxRate = 0;
            }
        } else {
            // Legacy support if taxMode not sent
            updateData.useTax = useTax !== undefined ? useTax === true : undefined;
            updateData.taxRate = taxRate !== undefined ? parseFloat(taxRate) : undefined;
        }

        // Nepal IRD fields
        if (panNumber !== undefined) updateData.panNumber = panNumber || null;
        if (vatNumber !== undefined) updateData.vatNumber = vatNumber || null;
        if (businessAddress !== undefined) updateData.businessAddress = businessAddress || null;
        if (businessPhone !== undefined) updateData.businessPhone = businessPhone || null;
        if (invoicePrefix !== undefined) updateData.invoicePrefix = invoicePrefix || 'INV';

        const client = await prisma.client.update({
            where: { id: req.user.clientId },
            data: updateData
        });
        res.json(client);
    } catch (error) {
        console.error('Update own settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// ─── Upgrade Own Plan (ADMIN) ────────────────────────────────────────────────
router.patch('/my-shop/upgrade', authorize(['ADMIN']), async (req: any, res: Response) => {
    const { plan, duration } = req.body;

    if (!['SILVER', 'GOLD', 'DIAMOND'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid subscription plan level' });
    }

    if (duration && !['1m', '3m', '12m'].includes(duration)) {
        return res.status(400).json({ error: 'Invalid subscription duration' });
    }

    try {
        const subPlan = await prisma.subscriptionPlan.findFirst({
            where: { tier: plan, isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        const currentClient = await prisma.client.findUnique({
            where: { id: req.user.clientId },
            select: { subscriptionEnd: true }
        });

        // ─── Expiry Logic ───────────────────────────────────────────────────────
        let newEnd: Date;
        const now = new Date();
        const monthsToAdd = duration === '12m' ? 12 : duration === '3m' ? 3 : 1;

        if (!currentClient?.subscriptionEnd || new Date(currentClient.subscriptionEnd) < now) {
            // Expired or never set: Start from now
            newEnd = new Date(now);
            newEnd.setMonth(newEnd.getMonth() + monthsToAdd);
        } else {
            // Active: Extend from existing end date
            newEnd = new Date(currentClient.subscriptionEnd);
            newEnd.setMonth(newEnd.getMonth() + monthsToAdd);
        }

        const client = await prisma.client.update({
            where: { id: req.user.clientId },
            data: {
                plan,
                planId: subPlan?.id,
                planDuration: duration || undefined,
                subscriptionEnd: newEnd,
                lastPaymentDate: now,
                paymentStatus: 'PAID'
            }
        });

        await prisma.activityLog.create({
            data: {
                action: 'PLAN_UPGRADED',
                details: `Self-upgraded to ${plan} tier for ${duration || '1m'}`,
                type: 'PLATFORM',
                userId: req.user.userId,
                role: req.user.role,
                clientId: req.user.clientId
            }
        });

        await prisma.activityLog.create({
            data: {
                action: 'PLAN_UPGRADED',
                details: `Self-upgraded to ${plan} tier for ${duration || '1m'}`,
                type: 'PLATFORM',
                userId: req.user.userId,
                role: req.user.role,
                clientId: req.user.clientId
            }
        });

        res.json({
            message: `Successfully updated to ${plan}`,
            plan: client.plan,
            planDuration: client.planDuration,
            subscriptionEnd: client.subscriptionEnd
        });
    } catch (error) {
        console.error('Plan upgrade/renewal error:', error);
        res.status(500).json({ error: 'Internal server error during upgrade/renewal' });
    }
});

// ─── Get Client Payments (Paginated) ─────────────────────────────────────────
router.get('/:id/payments', authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 5; // Default to small chunk for performance
    const page = parseInt(req.query.page as string) || 1;
    
    try {
        const [payments, total] = await Promise.all([
            prisma.subscriptionPayment.findMany({
                where: { clientId: id as string },
                orderBy: { date: 'desc' },
                take: limit,
                skip: (page - 1) * limit
            }),
            prisma.subscriptionPayment.count({
                where: { clientId: id as string }
            })
        ]);

        res.json({
            payments,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// ─── Record Client Payment ─────────────────────────────────────────────────
router.post('/:id/payments', authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { 
        amountPaid, 
        method, 
        transactionId, 
        remarks, 
        extendSubscription, 
        extensionMonths,
        planTier,
        planDuration,
        baseAmount,
        discount,
        totalPayable,
        billingMonth
    } = req.body;

    try {
        const client = await prisma.client.findUnique({ where: { id: id as string } });
        if (!client) return res.status(404).json({ error: 'Client not found' });

        const balanceAdjustment = parseFloat((totalPayable - amountPaid).toFixed(2));

        const result = await prisma.$transaction(async (tx) => {
            // 2. Calculate new subscription end date
            let newSubscriptionEnd = client.subscriptionEnd;
            let coverageRemark = billingMonth ? ` [For: ${billingMonth}]` : "";

            if (extendSubscription && extensionMonths) {
                const current = client.subscriptionEnd ? new Date(client.subscriptionEnd) : new Date();
                const now = new Date();
                const baseDate = current > now ? current : now;
                
                const fresh = new Date(baseDate);
                fresh.setMonth(fresh.getMonth() + parseInt(extensionMonths));
                newSubscriptionEnd = fresh;
                
                coverageRemark = ` [Covers until ${newSubscriptionEnd.toLocaleDateString()}]`;
            }

            // 1. Create payment record
            const payment = await tx.subscriptionPayment.create({
                data: {
                    clientId: id as string,
                    planTier,
                    planDuration,
                    baseAmount: parseFloat(baseAmount || 0),
                    discount: parseFloat(discount || 0),
                    totalPayable: parseFloat(totalPayable || 0),
                    amountPaid: parseFloat(amountPaid || 0),
                    balance: balanceAdjustment,
                    method,
                    transactionId,
                    remarks: (remarks || "") + coverageRemark,
                    date: new Date()
                }
            });

            // 3. Update client
            const newTotalBalance = parseFloat((client.balance + balanceAdjustment).toFixed(2));
            
            const updatedClient = await tx.client.update({
                where: { id: id as string },
                data: {
                    subscriptionEnd: newSubscriptionEnd,
                    paymentStatus: newTotalBalance > 0 ? 'PENDING' : 'PAID',
                    lastPaymentDate: new Date(),
                    balance: { increment: balanceAdjustment }
                }
            });

            await tx.activityLog.create({
                data: {
                    action: 'PAYMENT_RECORDED',
                    details: `Recorded payment of ${amountPaid} (Plan: ${planTier}, Bal: ${balanceAdjustment})`,
                    type: 'PLATFORM',
                    userId: (req as any).user.userId,
                    role: (req as any).user.role,
                    clientId: id as string
                }
            });

            return { payment, updatedClient };
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Payment record error:', error);
        res.status(500).json({ error: 'Failed to record payment' });
    }
});

export default router;
