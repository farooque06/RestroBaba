import { Request, Response, NextFunction } from 'express';

const PLAN_RANK = {
    'SILVER': 1,
    'GOLD': 2,
    'DIAMOND': 3
};

type PlanTier = keyof typeof PLAN_RANK;

/**
 * Middleware to check if the user's plan meets the minimum requirement
 * @param minimumPlan The lowest plan allowed (SILVER, GOLD, or DIAMOND)
 */
export const requirePlan = (minimumPlan: PlanTier) => {
    return (req: any, res: Response, next: NextFunction) => {
        // Super admins skip plan checks (they are Diamond equivalent)
        if (req.user?.role === 'SUPER_ADMIN') {
            return next();
        }

        const userPlan = (req.user?.plan || 'SILVER') as PlanTier;
        
        const userRank = PLAN_RANK[userPlan] || 1;
        const requiredRank = PLAN_RANK[minimumPlan] || 1;

        if (userRank < requiredRank) {
            return res.status(403).json({
                error: `Access denied. This feature requires a ${minimumPlan} plan or higher.`,
                code: 'PLAN_UPGRADE_REQUIRED',
                requiredPlan: minimumPlan,
                currentPlan: userPlan
            });
        }

        next();
    };
};
