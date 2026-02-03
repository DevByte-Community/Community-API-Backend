const { Op, fn, col } = require('sequelize');
const createLogger = require('../../utils/logger');
const { User, Project, Blog } = require('../../models');
const {
    getDashboardMetrics,
    setDashboardMetrics,
} = require('../../cache/metricsCache');

const logger = createLogger('METRIC_SERVICE');

const calculateTrend = (current, previous) => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
};

const getDashboardData = async () => {
    // try cache first
    const cached = await getDashboardMetrics();
    if (cached) return cached;

    const now = new Date();

    // Active Members (last 7 days)
    const activeSince = new Date(now);
    activeSince.setDate(now.getDate() - 7);

    const prevActiveSince = new Date(now);
    prevActiveSince.setDate(now.getDate() - 14);

    const activeMembersCount = await User.count({
        where: { lastActiveAt: { [Op.gte]: activeSince } },
    });
    const prevActiveMembersCount = await User.count({
        where: { lastActiveAt: { [Op.between]: [prevActiveSince, activeSince] } },
    });

    // Active Projects (last 30 days)
    const activeProjectSince = new Date(now);
    activeProjectSince.setDate(now.getDate() - 30);

    const prevActiveProjectSince = new Date(now);
    prevActiveProjectSince.setDate(now.getDate() - 60);

    const activeProjectsCount = await Project.count({
        where: { lastUpdated: { [Op.gte]: activeProjectSince  } },
    });
    const prevActiveProjectsCount = await Project.count({
        where: { lastUpdated: { [Op.between]: [prevActiveProjectSince, activeProjectSince] } },
    });

    // Upcoming Events (next 14 days)
    // const upcomingSince = new Date(now);
    // const upcomingUntil = new Date(now);
    // upcomingUntil.setDate(now.getDate() + 14);
    // const prevUpcomingSince = new Date(now);
    // const prevUpcomingUntil = new Date(now);
    // prevUpcomingSince.setDate(now.getDate() - 14);
    // prevUpcomingUntil.setDate(now.getDate());
    // const upcomingEventsCount = await Event.count({
    //     where: { startDate: { [Op.between]: [upcomingSince, upcomingUntil] } },
    // });
    // const prevUpcomingEventsCount = await Event.count({
    //     where: { startDate: { [Op.between]: [prevUpcomingSince, prevUpcomingUntil] } },
    // });

    // Upcoming Events (temporarily disabled – model not implemented yet)
    const upcomingEventsCount = 0;
    const prevUpcomingEventsCount = 0;
    
    

    



    // Blog Posts (published)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const blogPostsCount = await Blog.count({ where: { status: 'published' } });
    const prevBlogPostsCount = await Blog.count({ 
        where: { 
            status: 'published', createdAt: { [Op.between]: [prevMonthStart, prevMonthEnd] },
        },
    });

    const metrics = {
        activeMembers: {
            count: activeMembersCount,
            trend: calculateTrend(activeMembersCount, prevActiveMembersCount),
            description: 'Users active in last 7 days',
        },
        activeProjects: {
            count: activeProjectsCount,
            trend: calculateTrend(activeProjectsCount, prevActiveProjectsCount),
            description: 'Projects updated in last 30 days',
        },
        upcomingEvents: {
            count: upcomingEventsCount,
            trend: calculateTrend(upcomingEventsCount, prevUpcomingEventsCount),
            description: 'Events starting in next 14 days',
        },
        blogPosts: {
            count: blogPostsCount,
            trend: calculateTrend(blogPostsCount, prevBlogPostsCount),
            description: 'Total published blog posts',
        },
        lastUpdated: now.toISOString(),
    };
    // cache the result
    await setDashboardMetrics(metrics);

    return metrics;
};

module.exports = { getDashboardData };