const request = require('supertest');
const { expect } = require('chai');
const app = require('../../app');
const { User, Project, Blog } = require('../../models');
const metricsCache = require('../../cache/metricsCache');

describe('GET /api/v1/metrics/dashboard', () => {
    beforeEach(async () => {
        // clear cache before each test
        await metricsCache.invalidateDashboardMetrics();
    });

    it('should return 200 and proper metrics structure', async () => {
        const res = await request(app).get('/api/v1/metrics/dashboard');

        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('message', 'Dashboard metrics retrieved successfully');

        expect(res.body).to.have.property('activeMembers');
        expect(res.body).to.have.property('activeProjects');
        expect(res.body).to.have.property('upcomingEvents');
        expect(res.body).to.have.property('blogPosts');
        expect(res.body).to.have.property('lastUpdated');

        expect(res.body.activeMembers).to.have.keys(['count', 'trend', 'description']);
        expect(res.body.activeProjects).to.have.keys(['count', 'trend', 'description']);
        expect(res.body.upcomingEvents).to.have.keys(['count', 'trend', 'description']);
        expect(res.body.blogPosts).to.have.keys(['count', 'trend', 'description']);


        expect(res.body.upcomingEvents.count).to.equal(0); // since events are disabled
        expect(res.body.upcomingEvents.trend).to.equal(0);
    });

    it('should serve cached metrics on repeated calls', async () => {
        const spy = sinon.spy(metricsCache, 'getDashboardMetrics');

        await request(app).get('/api/v1/metrics/dashboard');
        await request(app).get('/api/v1/metrics/dashboard');

        sinon.assert.calledTwice(spy);
        spy.restore();
    });
});