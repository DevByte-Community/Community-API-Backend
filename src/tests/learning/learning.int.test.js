/**
 * @file tests/learning/learning.int.test.js
 * @description Integration tests for learning endpoints
 */

const request = require('supertest');
const { getTestContainersManager, resetTestContainersManager } = require('../testContainers');

jest.setTimeout(60000);

let testManager;
let app;
let adminAgent;
let userAgent;
let adminUser;
let regularUser;
let createdTech;

describe('Learning Controller (integration)', () => {
    beforeAll(async () => {
        testManager = getTestContainersManager();
        await testManager.setup({ createUsers: true });
        app = testManager.app;

        adminAgent = request.agent(app);
        userAgent = request.agent(app);
        adminUser = testManager.getUser('ADMIN');
        regularUser = testManager.getUser('USER');

        // Login Admin
        await adminAgent.post('/api/v1/auth/signin').send({
            email: adminUser.email,
            password: 'AdminPassword123!',
        });

        // Login User
        await userAgent.post('/api/v1/auth/signin').send({
            email: regularUser.email,
            password: 'UserPassword123!',
        });

        // Create a technology for testing
        // Note: Using /api/v1/techs (Tech module) as Technologies module is deprecated
        const techRes = await adminAgent.post('/api/v1/techs').send({
            name: 'Integration Tech',
            description: 'Test Tech',
        });
        // Tech creation returns { success, message, tech: {...} } or similar
        // Adjust based on techRoutes.js implementation
        createdTech = techRes.body.tech || techRes.body.data;
        if (!createdTech && techRes.body.created && techRes.body.created.length > 0) {
            createdTech = techRes.body.created[0]; // Fallback for batch?
        }
        // Looking at techRoutes.js (Step 222), createTechController return format:
        // res.status(201).json({ ..., tech: ... })
        // So techRes.body.tech is correct.
    });

    afterAll(async () => {
        await testManager.teardown();
        resetTestContainersManager();
    });

    describe('POST /api/v1/learnings', () => {
        it('should allow user to create learning with valid tech', async () => {
            const res = await userAgent.post('/api/v1/learnings').send({
                name: 'My Learning Path',
                description: 'Learning Integration Tests',
                level: 'BEGINNER',
                techs: [createdTech.id],
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe('My Learning Path');
            expect(res.body.data.techs).toHaveLength(1);
            expect(res.body.data.techs[0].id).toBe(createdTech.id);
        });

        it('should fail with invalid tech ID', async () => {
            const res = await userAgent.post('/api/v1/learnings').send({
                name: 'Invalid Tech',
                description: 'Should fail',
                level: 'BEGINNER',
                techs: ['00000000-0000-0000-0000-000000000000'],
            });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/learnings', () => {
        it('should return all learnings', async () => {
            const res = await request(app).get('/api/v1/learnings');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it('should filter by level', async () => {
            const res = await request(app).get('/api/v1/learnings?level=BEGINNER');

            expect(res.status).toBe(200);
            expect(res.body.data.every((l) => l.level === 'BEGINNER')).toBe(true);
        });
    });

    describe('PATCH /api/v1/learnings/:id', () => {
        let learningId;

        beforeAll(async () => {
            // Create a learning as regular user
            const res = await userAgent.post('/api/v1/learnings').send({
                name: 'Update Me',
                description: 'Original Description',
                level: 'INTERMEDIATE',
                techs: [createdTech.id],
            });
            learningId = res.body.data.id;
        });

        it('should allow owner to update', async () => {
            const res = await userAgent.patch(`/api/v1/learnings/${learningId}`).send({
                name: 'Updated Name',
            });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('Updated Name');
        });

        it('should allow admin to update user learning', async () => {
            const res = await adminAgent.patch(`/api/v1/learnings/${learningId}`).send({
                description: 'Admin Update',
            });

            expect(res.status).toBe(200);
            expect(res.body.data.description).toBe('Admin Update');
        });
    });

    describe('DELETE /api/v1/learnings/:id', () => {
        let learningId;

        beforeEach(async () => {
            const res = await userAgent.post('/api/v1/learnings').send({
                name: 'Delete Me',
                description: 'To be deleted',
                level: 'ADVANCED',
                techs: [createdTech.id],
            });
            learningId = res.body.data.id;
        });

        it('should allow owner to delete', async () => {
            const res = await userAgent.delete(`/api/v1/learnings/${learningId}`);
            expect(res.status).toBe(200);
        });

        it('should allow admin to delete user learning', async () => {
            // Create another one for admin to delete
            const resCreate = await userAgent.post('/api/v1/learnings').send({
                name: 'Admin Delete Me',
                description: 'To be deleted by admin',
                level: 'ADVANCED',
                techs: [createdTech.id],
            });
            const idToDelete = resCreate.body.data.id;

            const res = await adminAgent.delete(`/api/v1/learnings/${idToDelete}`);
            expect(res.status).toBe(200);
        });
    });
});
