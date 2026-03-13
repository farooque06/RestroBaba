import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
    it('should have a login endpoint', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'password' });

        // We expect a 401 because the user doesn't exist in the test DB yet, 
        // but this proves the route is wired up.
        expect(res.status).toBe(401);
    });

    it('should return 400 for invalid registration data', async () => {
        const res = await request(app)
            .post('/api/auth/register-client')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
});
