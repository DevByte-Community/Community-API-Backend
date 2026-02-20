const { asyncHandler } = require('../middleware/errorHandler');
const { getDashboardData } = require('../services/metrics/metricsService');
const createLogger = require('../utils/logger');

const logger = createLogger('METRICS_CONTROLLER');

const getDashboardMetrics = asyncHandler(async (req, res) => {
    const data = await getDashboardData();
    logger.info('Dashboard metrics retrieved successfully');
    res.status(200).json({
        success: true,
        message: 'Dashboard metrics retrieved successfully',
        ...data,
    });
});

module.exports = { getDashboardMetrics };