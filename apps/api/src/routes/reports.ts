import express, { Request, Response } from 'express';
import prisma from '../services/prisma.js';

const router = express.Router();

router.get('/profit', async (req: Request, res: Response) => {
    if (!req.clientId) return res.status(400).json({ error: 'Client ID missing' });

    try {
        // Fetch all PAID orders for the client
        const orders = await prisma.order.findMany({
            where: {
                clientId: req.clientId!,
                status: 'Paid'
            },
            include: {
                items: {
                    include: {
                        menuItem: {
                            include: {
                                recipe: {
                                    include: {
                                        inventoryItem: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        let totalRevenue = 0;
        let totalCost = 0;
        const itemAnalysis: any = {};

        orders.forEach(order => {
            totalRevenue += order.totalAmount;

            order.items.forEach(item => {
                const menuItem = item.menuItem;
                const sellingPrice = item.price;
                const quantity = item.quantity;

                // Calculate recipe cost
                let recipeCost = 0;
                menuItem.recipe.forEach(ri => {
                    recipeCost += ri.quantity * ri.inventoryItem.unitPrice;
                });

                const totalItemCost = recipeCost * quantity;
                const totalItemRevenue = sellingPrice * quantity;
                const itemProfit = totalItemRevenue - totalItemCost;

                totalCost += totalItemCost;

                if (!itemAnalysis[menuItem.id]) {
                    itemAnalysis[menuItem.id] = {
                        name: menuItem.name,
                        sold: 0,
                        revenue: 0,
                        cost: 0,
                        profit: 0
                    };
                }

                itemAnalysis[menuItem.id].sold += quantity;
                itemAnalysis[menuItem.id].revenue += totalItemRevenue;
                itemAnalysis[menuItem.id].cost += totalItemCost;
                itemAnalysis[menuItem.id].profit += itemProfit;
            });
        });

        // Fetch Waste Transactions
        const wasteTransactions = await prisma.inventoryTransaction.findMany({
            where: {
                clientId: req.clientId!,
                OR: [
                    { reason: { in: ['Spoilage', 'Spillage', 'Kitchen Error'] } },
                    { type: 'WASTE' }
                ]
            },
            include: {
                inventoryItem: true
            }
        });

        let totalWasteLoss = 0;
        const wasteBreakdown: any = {};
        wasteTransactions.forEach(t => {
            const loss = t.quantity * t.inventoryItem.unitPrice;
            totalWasteLoss += loss;

            const reason = t.reason || 'Unknown';
            if (!wasteBreakdown[reason]) wasteBreakdown[reason] = 0;
            wasteBreakdown[reason] += loss;
        });

        res.json({
            summary: {
                totalRevenue,
                totalCost,
                totalWasteLoss,
                netProfit: totalRevenue - totalCost - totalWasteLoss,
                grossProfit: totalRevenue - totalCost,
                margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
            },
            items: Object.values(itemAnalysis).sort((a: any, b: any) => b.profit - a.profit),
            waste: {
                totalLoss: totalWasteLoss,
                breakdown: wasteBreakdown
            }
        });
    } catch (error) {
        console.error('Profit report error:', error);
        res.status(500).json({ error: 'Failed to generate profit report' });
    }
});

export default router;
