const { client } = require('../utils/redisClient');

const DASHBOARD_KEY = 'metrics:dashboard:v1';

const TTL = 300; // 5 minutes in seconds

const getDashboardMetrics = async () => {
    try {
        const data = await client.get(DASHBOARD_KEY);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        return null;  // graceful fallback
    }
};

const setDashboardMetrics = async (metrics) => {
    try {
        await client.set(DASHBOARD_KEY, JSON.stringify(metrics), 'EX', TTL);
    } catch (err) {
        // fail silently
    }
};

const invalidateDashboardMetrics = async () => {
    try {
        await client.del(DASHBOARD_KEY);
    } catch (err) {
        // fail silently
    }
};

module.exports = {
    getDashboardMetrics,
    setDashboardMetrics,
    invalidateDashboardMetrics,
};