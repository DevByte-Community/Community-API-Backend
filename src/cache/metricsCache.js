const { client } = require('../utils/redisClient');
const createLogger = require('../utils/logger');
const { Logger } = require('sequelize/lib/utils/logger');

const logger = createLogger('DASHBOARD_CACHE');

const DASHBOARD_KEY = 'metrics:dashboard:v1';

const TTL = 300; // 5 minutes in seconds

const getDashboardMetrics = async () => {
    try {
        logger.info('Attempting to fetch dashboard metrics from Redis');

        const data = await client.get(DASHBOARD_KEY);

        if (!data) {
            logger.info('Cache miss', { key: DASHBOARD_KEY });
            return null;
        }

        logger.info('Cache hit', { key: DASHBOARD_KEY });

        return JSON.parse(data);
    } catch (err) {
        logger.error(`Redis GET failed for key ${DASHBOARD_KEY} - ${err.message}`);
        return null;  // graceful fallback
    }
};

const setDashboardMetrics = async (metrics) => {
    try {
        logger.info('Setting dashboard metrics in Redis', {
            key: DASHBOARD_KEY,
            ttl: TTL,
        });

        await client.set(DASHBOARD_KEY, JSON.stringify(metrics), 'EX', TTL);

        logger.info('Dashboard metrics cached successfully');
    } catch (err) {
        logger.error(`Redis SET failed for key ${DASHBOARD_KEY} - ${err.message}`);
        
    }
};

const invalidateDashboardMetrics = async () => {
    try {
        logger.info('Invalidating dashboard metrics cache', {
            key: DASHBOARD_KEY,
        });

        await client.del(DASHBOARD_KEY);

        logger.info('Dashboard metrics cache invalidated');
    } catch (err) {
        logger.error(`Redis DEL failed for key ${DASHBOARD_KEY} - ${err.message}`);
        
    }
};

module.exports = {
    getDashboardMetrics,
    setDashboardMetrics,
    invalidateDashboardMetrics,
};