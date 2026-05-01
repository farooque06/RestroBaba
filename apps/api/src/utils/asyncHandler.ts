import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async express middleware/controller to catch errors and pass them to the next() handler.
 * This eliminates the need for manual try-catch blocks in every route.
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
