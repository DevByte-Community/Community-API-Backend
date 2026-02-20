const { expect } = require('chai');
const sinon = require('sinon');
const { Op } = require('sequelize');
const { getDashboardData } = require('../../services/metrics/metricsService');
const { User, Project, Blog } = require('../../models');
const metricsCache = require('../../cache/metricsCache');


describe('Metrics Service', () => {
    let userCountStub, projectCountStub, blogCountStub, cacheGetStub, cacheSetStub;

    beforeEach(() => {
        userCountStub = sinon.stub(User, 'count');
        projectCountStub = sinon.stub.stub(Project, 'count');
        blogCountStub = sinon.stub(Blog, 'count');
        cacheGetStub = sinon.stub(metricsCache, 'getDashboardMetrics').resolves(null);
        cacheSetStub = sinon.stub(metricsCache, 'setDashboardMetrics').resolves();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return metrics object with counts and trends', async () => {
        userCountStub.onFirstCall().resolves(100);
        userCountStub.onFirstCall().resolves(80);

        projectCountStub.onFirstCall().resolves(50);
        projectCountStub.onFirstCall().resolves(60);

        blogCountStub.onFirstCall().resolves(15);
        blogCountStub.onFirstCall().resolves(10);

        const metrics = await getDashboardData();

        expect(metrics).to.have.keys([
            'activeMembers',
            'activeProjects',
            'upcominngEvents',
            'blogPosts',
            'lastUpdated',
        ]);

        expect(metrics.activeMembers).to.deep.include({
            count: 100,
            trend: 25
        });

        expect(metrics.activeProjects).to.deep.include({
            count: 50,
            trend: -17,
        });

        // Events are disabled -> must be zero
        expect(metrics.upcomingEvents.count).to.equal(0);
        expect(metrics.upcomingEvents.trend).to.equal(0);

        expect(metrics.blogPosts.count).to.equal(15);
        expect(metrics.blogPosts.trend).to.equal(50);

        sinon.assert.calledOnce(cachedSetStub);
    });

    it('should return cached metrics if available', async () => {
        const cachedData = { activeMembers: { count: 1, trend: 0 } };
        cachedGetStub.resolves(cachedData);

        const metrics = await getDashboardData();

        expect(metrics).to.equal(cachedData);
        sinon.assert.notCalled(userCountStub);
    });
});