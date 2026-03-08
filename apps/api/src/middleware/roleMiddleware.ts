import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to restrict access based on user roles.
 * @param allowedRoles - Array of roles permitted to access the resource.
 */
export const roleMiddleware = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized: User context missing' });
        }

        const userRole = req.user.role;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: 'Forbidden: You do not have permission to access this resource',
                requiredRoles: allowedRoles,
                currentRole: userRole
            });
        }

        next();
    };
};
