// utils/skillCache.js
/**
 * Caching utility for Skills
 * Implements cache-aside pattern with Redis
 */

const { client } = require('./redisClient');
const createLogger = require('./logger');

const logger = createLogger('SKILL_CACHE');

// Cache configuration
const CACHE_CONFIG = {
  // TTL in seconds
  SKILL_TTL: 3600, // 1 hour - individual skills
  SKILL_LIST_TTL: 1800, // 30 minutes - paginated lists
  SKILL_COUNT_TTL: 3600, // 1 hour - total count
  // Key prefixes
  PREFIX: {
    SKILL: 'skill',
    SKILL_LIST: 'skills:list',
    SKILL_COUNT: 'skills:count',
    SKILL_NAME: 'skill:name', // For name lookups
  },
};

/**
 * Generate cache key for a single skill
 * @param {string} skillId - Skill UUID
 * @returns {string} Cache key
 */
const getSkillKey = (skillId) => `${CACHE_CONFIG.PREFIX.SKILL}:${skillId}`;

/**
 * Generate cache key for paginated skill list
 * @param {number} page - Page number
 * @param {number} pageSize - Page size
 * @returns {string} Cache key
 */
const getSkillListKey = (page, pageSize) =>
  `${CACHE_CONFIG.PREFIX.SKILL_LIST}:page:${page}:pageSize:${pageSize}`;

/**
 * Generate cache key for skill count
 * @returns {string} Cache key
 */
const getSkillCountKey = () => CACHE_CONFIG.PREFIX.SKILL_COUNT;

/**
 * Generate cache key for skill name lookup
 * @param {string} name - Skill name (normalized)
 * @returns {string} Cache key
 */
const getSkillNameKey = (name) => `${CACHE_CONFIG.PREFIX.SKILL_NAME}:${name.toLowerCase().trim()}`;

/**
 * Get cached skill by ID
 * @param {string} skillId - Skill UUID
 * @returns {Object|null} Cached skill or null
 */
const getCachedSkill = async (skillId) => {
  try {
    const key = getSkillKey(skillId);
    const cached = await client.get(key);

    if (cached) {
      logger.info(`Cache HIT for skill: ${skillId}`);
      return JSON.parse(cached);
    }

    logger.info(`Cache MISS for skill: ${skillId}`);
    return null;
  } catch (error) {
    logger.warn(`Error reading from cache for skill ${skillId}: ${error.message}`);
    return null; // Fail gracefully - return null to fallback to DB
  }
};

/**
 * Cache a skill by ID
 * @param {string} skillId - Skill UUID
 * @param {Object} skill - Skill object
 * @returns {Promise<void>}
 */
const cacheSkill = async (skillId, skill) => {
  try {
    const key = getSkillKey(skillId);
    await client.setex(key, CACHE_CONFIG.SKILL_TTL, JSON.stringify(skill));
    logger.info(`Cached skill: ${skillId}`);
  } catch (error) {
    logger.warn(`Error caching skill ${skillId}: ${error.message}`);
    // Don't throw - caching failures shouldn't break the app
  }
};

/**
 * Get cached paginated skill list
 * @param {number} page - Page number
 * @param {number} pageSize - Page size
 * @returns {Object|null} Cached paginated result or null
 */
const getCachedSkillList = async (page, pageSize) => {
  try {
    const key = getSkillListKey(page, pageSize);
    const cached = await client.get(key);

    if (cached) {
      logger.info(`Cache HIT for skill list: page ${page}, pageSize ${pageSize}`);
      return JSON.parse(cached);
    }

    logger.info(`Cache MISS for skill list: page ${page}, pageSize ${pageSize}`);
    return null;
  } catch (error) {
    logger.warn(`Error reading from cache for skill list: ${error.message}`);
    return null;
  }
};

/**
 * Cache paginated skill list
 * @param {number} page - Page number
 * @param {number} pageSize - Page size
 * @param {Object} data - Paginated result object
 * @returns {Promise<void>}
 */
const cacheSkillList = async (page, pageSize, data) => {
  try {
    const key = getSkillListKey(page, pageSize);
    await client.setex(key, CACHE_CONFIG.SKILL_LIST_TTL, JSON.stringify(data));
    logger.info(`Cached skill list: page ${page}, pageSize ${pageSize}`);
  } catch (error) {
    logger.warn(`Error caching skill list: ${error.message}`);
  }
};

/**
 * Get cached total skill count
 * @returns {number|null} Cached count or null
 */
const getCachedSkillCount = async () => {
  try {
    const key = getSkillCountKey();
    const cached = await client.get(key);

    if (cached) {
      logger.info('Cache HIT for skill count');
      return parseInt(cached, 10);
    }

    logger.info('Cache MISS for skill count');
    return null;
  } catch (error) {
    logger.warn(`Error reading from cache for skill count: ${error.message}`);
    return null;
  }
};

/**
 * Cache total skill count
 * @param {number} count - Total count
 * @returns {Promise<void>}
 */
const cacheSkillCount = async (count) => {
  try {
    const key = getSkillCountKey();
    await client.setex(key, CACHE_CONFIG.SKILL_COUNT_TTL, count.toString());
    logger.info(`Cached skill count: ${count}`);
  } catch (error) {
    logger.warn(`Error caching skill count: ${error.message}`);
  }
};

/**
 * Invalidate all skill-related caches
 * Called when a skill is created, updated, or deleted
 * @returns {Promise<void>}
 */
const invalidateAllSkillCaches = async () => {
  try {
    // Get all keys matching skill patterns
    const patterns = [
      `${CACHE_CONFIG.PREFIX.SKILL}:*`,
      `${CACHE_CONFIG.PREFIX.SKILL_LIST}:*`,
      `${CACHE_CONFIG.PREFIX.SKILL_COUNT}`,
      `${CACHE_CONFIG.PREFIX.SKILL_NAME}:*`,
    ];

    for (const pattern of patterns) {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
        logger.info(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    }
  } catch (error) {
    logger.warn(`Error invalidating skill caches: ${error.message}`);
    // Don't throw - cache invalidation failures shouldn't break the app
  }
};

/**
 * Invalidate a specific skill cache
 * @param {string} skillId - Skill UUID
 * @returns {Promise<void>}
 */
const invalidateSkillCache = async (skillId) => {
  try {
    const key = getSkillKey(skillId);
    await client.del(key);
    logger.info(`Invalidated cache for skill: ${skillId}`);
  } catch (error) {
    logger.warn(`Error invalidating skill cache ${skillId}: ${error.message}`);
  }
};

/**
 * Invalidate skill name cache
 * @param {string} name - Skill name (normalized)
 * @returns {Promise<void>}
 */
const invalidateSkillNameCache = async (name) => {
  try {
    const key = getSkillNameKey(name);
    await client.del(key);
    logger.info(`Invalidated cache for skill name: ${name}`);
  } catch (error) {
    logger.warn(`Error invalidating skill name cache: ${error.message}`);
  }
};

/**
 * Cache skill name lookup (for duplicate checking)
 * @param {string} name - Skill name
 * @param {string|null} skillId - Skill ID if exists, null otherwise
 * @returns {Promise<void>}
 */
const cacheSkillNameLookup = async (name, skillId) => {
  try {
    const key = getSkillNameKey(name);
    // Cache for shorter time since this is for validation
    await client.setex(key, 300, skillId || ''); // 5 minutes
    logger.info(`Cached skill name lookup: ${name}`);
  } catch (error) {
    logger.warn(`Error caching skill name lookup: ${error.message}`);
  }
};

/**
 * Get cached skill name lookup
 * @param {string} name - Skill name
 * @returns {Promise<string|null>} Cached skill ID or null
 */
const getCachedSkillNameLookup = async (name) => {
  try {
    const key = getSkillNameKey(name);
    const cached = await client.get(key);

    if (cached !== null) {
      logger.info(`Cache HIT for skill name lookup: ${name}`);
      return cached === '' ? null : cached;
    }

    logger.info(`Cache MISS for skill name lookup: ${name}`);
    return null;
  } catch (error) {
    logger.warn(`Error reading from cache for skill name lookup: ${error.message}`);
    return null;
  }
};

module.exports = {
  // Get operations
  getCachedSkill,
  getCachedSkillList,
  getCachedSkillCount,
  getCachedSkillNameLookup,
  // Set operations
  cacheSkill,
  cacheSkillList,
  cacheSkillCount,
  cacheSkillNameLookup,
  // Invalidation operations
  invalidateAllSkillCaches,
  invalidateSkillCache,
  invalidateSkillNameCache,
  // Configuration
  CACHE_CONFIG,
};
