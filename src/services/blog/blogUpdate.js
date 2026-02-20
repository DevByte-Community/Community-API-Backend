/**
 * Blog update and delete operations
 * Separated for modularity
 */

const createLogger = require('../../utils/logger');
const {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  InternalServerError,
} = require('../../utils/customErrors');
const { invalidateAllBlogCaches, invalidateBlogCache } = require('../../cache/blogCache');
const { checkBlogPermission, findBlogWithAuthor, reloadBlogWithAuthor } = require('./blogHelpers');
const { uploadBlogCoverImage } = require('../../utils/imageUploader');

const { invalidateDashboardMetrics } = require('../../cache/metricsCache');

const logger = createLogger('BLOG_UPDATE');

/**
 * Upload cover image for a blog post
 * @param {Object} blog - Blog object from database
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} originalFileName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {string} Cover image URL
 */
const uploadCoverImage = async (blog, fileBuffer, originalFileName, mimeType = 'image/jpeg') => {
  return uploadBlogCoverImage({
    fileBuffer,
    originalFileName,
    mimeType,
    blogId: blog.id,
    oldImageUrl: blog.coverImage,
  });
};

/**
 * Update a blog post
 * @param {string} blogId - ID of the blog to update
 * @param {Object} updates - Fields to update
 * @param {string} userId - ID of the user making the update
 * @param {boolean} isAdmin - Whether the user is an admin
 * @returns {Object} Updated blog object
 */
const updateBlog = async (blogId, updates, userId, isAdmin = false) => {
  try {
    logger.info(`Updating blog ${blogId} by user ${userId}`);

    const blog = await findBlogWithAuthor(blogId);
    checkBlogPermission(blog, userId, isAdmin);

    // Only update provided fields (data is already validated and trimmed by controller)
    if (updates.title !== undefined) {
      blog.title = updates.title;
    }
    if (updates.description !== undefined) {
      blog.description = updates.description;
    }
    if (updates.coverImage !== undefined) {
      blog.coverImage = updates.coverImage || null;
    }
    if (updates.topic !== undefined) {
      blog.topic = updates.topic || null;
    }
    // Only admins can change featured status
    if (updates.featured !== undefined && isAdmin) {
      blog.featured = updates.featured;
    }

    blog.updatedAt = new Date();
    await blog.save();

    // Reload to get fresh data
    await reloadBlogWithAuthor(blog);

    logger.info(`Blog ${blogId} updated successfully`);

    // Invalidate cache for this blog and all lists (since content changed)
    await invalidateBlogCache(blogId);
    await invalidateAllBlogCaches();

    // Invalidate metrics cache on Blog update(Fire-and-forget)
    invalidateDashboardMetrics();

    return blog;
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ValidationError ||
      err instanceof ForbiddenError
    ) {
      throw err;
    }

    logger.error(`Error updating blog ${blogId}: ${err.message}`, { error: err });
    throw new InternalServerError(`Failed to update blog: ${err.message}`);
  }
};

/**
 * Delete a blog post
 * @param {string} blogId - ID of the blog to delete
 * @param {string} userId - ID of the user making the delete request
 * @param {boolean} isAdmin - Whether the user is an admin
 * @returns {boolean} Success status
 */
const deleteBlog = async (blogId, userId, isAdmin = false) => {
  try {
    logger.info(`Deleting blog ${blogId} by user ${userId}`);

    const blog = await findBlogWithAuthor(blogId, false);
    checkBlogPermission(blog, userId, isAdmin);

    await blog.destroy();

    logger.info(`Blog ${blogId} deleted successfully`);

    // Invalidate cache for this blog and all lists (since blog was deleted)
    await invalidateBlogCache(blogId);
    await invalidateAllBlogCaches();

    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ForbiddenError) {
      throw err;
    }

    logger.error(`Error deleting blog ${blogId}: ${err.message}`, { error: err });
    throw new InternalServerError(`Failed to delete blog: ${err.message}`);
  }
};

/**
 * Update cover image for a blog post
 * @param {string} blogId - ID of the blog
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} originalFileName - Original file name
 * @param {string} mimeType - File MIME type
 * @param {string} userId - ID of the user making the update
 * @param {boolean} isAdmin - Whether the user is an admin
 * @returns {Object} Updated blog object
 */
const updateBlogCoverImage = async (
  blogId,
  fileBuffer,
  originalFileName,
  mimeType,
  userId,
  isAdmin = false
) => {
  try {
    logger.info(`Updating cover image for blog ${blogId} by user ${userId}`);

    const blog = await findBlogWithAuthor(blogId, false);
    checkBlogPermission(blog, userId, isAdmin);

    // Upload new cover image
    const coverImageUrl = await uploadCoverImage(blog, fileBuffer, originalFileName, mimeType);

    // Update blog with new cover image URL
    blog.coverImage = coverImageUrl;
    blog.updatedAt = new Date();
    await blog.save();

    // Reload with author information
    await reloadBlogWithAuthor(blog);

    logger.info(`Cover image updated successfully for blog ${blogId}`);

    // Invalidate cache for this blog and all lists (since cover image changed)
    await invalidateBlogCache(blogId);
    await invalidateAllBlogCaches();

    return blog;
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof ForbiddenError ||
      err instanceof ValidationError
    ) {
      throw err;
    }

    logger.error(`Error updating cover image for blog ${blogId}: ${err.message}`, { error: err });
    throw new InternalServerError(`Failed to update cover image: ${err.message}`);
  }
};

module.exports = {
  updateBlog,
  deleteBlog,
  updateBlogCoverImage,
  uploadCoverImage,
};
