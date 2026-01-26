/**
 * Project update operations
 * Separated for modularity
 */

const createLogger = require('../../utils/logger');
const { NotFoundError, InternalServerError, ForbiddenError } = require('../../utils/customErrors');
const { Project, User, Tech } = require('../../models');
const {
  invalidateAllProjectCaches,
  invalidateProjectCache,
  invalidateUserProjectCaches,
} = require('../../cache/projectCache');
const { uploadProjectCoverImage, deleteImage } = require('../../utils/imageUploader');
const { extractObjectKeyFromUrl } = require('../../utils/imageUploader');

const { invalidateDashboardMetrics } = require('../../cache/metricsCache');

const logger = createLogger('PROJECT_UPDATE');

/**
 * Update project cover image
 */
const updateCoverImage = async (project, fileBuffer, originalFileName, mimeType = 'image/jpeg') => {
  return uploadProjectCoverImage({
    fileBuffer,
    originalFileName,
    mimeType,
    projectId: project.id,
    oldImageUrl: project.coverImage,
  });
};

/**
 * Update project techs
 */
const updateProjectTechs = async (project, techIds, transaction) => {
  if (techIds === undefined) {
    return; // Field not provided, keep existing
  }

  if (techIds.length === 0) {
    // Remove all techs
    await project.setTechs([], { transaction });
  } else {
    // Validate new techs exist
    const techs = await Tech.findAll({
      where: { id: techIds },
      transaction,
    });

    if (techs.length !== techIds.length) {
      throw new NotFoundError('One or more techs not found');
    }

    await project.setTechs(techs, { transaction });
  }
};

/**
 * Update project contributors
 */
const updateProjectContributors = async (project, contributorIds, userId, transaction) => {
  if (contributorIds === undefined) {
    return; // Field not provided, keep existing
  }

  if (contributorIds.length === 0) {
    // Remove all contributors
    await project.setContributors([], { transaction });
  } else {
    // Filter out creator from contributors
    const filteredIds = contributorIds.filter((id) => id !== userId);

    if (filteredIds.length === 0) {
      // No valid contributors, remove all
      await project.setContributors([], { transaction });
      return;
    }

    // Validate contributors exist
    const contributors = await User.findAll({
      where: { id: filteredIds },
      transaction,
    });

    if (contributors.length !== filteredIds.length) {
      throw new NotFoundError('One or more contributors not found');
    }

    await project.setContributors(contributors, { transaction });
  }
};

/**
 * Handle cover image removal
 */
const handleCoverImageRemoval = async (project, projectData) => {
  if (projectData.coverImage === null || projectData.coverImage === '') {
    // User wants to remove cover image
    if (project.coverImage) {
      const oldKey = extractObjectKeyFromUrl(project.coverImage);
      deleteImage(oldKey, 'cover image');
    }
    return null;
  }

  return undefined; // Keep existing
};

/**
 * Update an existing project
 */
const updateProject = async (
  projectId,
  projectData,
  userId,
  fileBuffer = null,
  originalFileName = null,
  mimeType = null
) => {
  const transaction = await Project.sequelize.transaction();

  try {
    // Check if project exists and user is owner
    const project = await Project.findByPk(projectId, { transaction });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.createdBy !== userId) {
      throw new ForbiddenError('You are not authorized to update this project');
    }

    logger.info(`Updating project ${projectId} by user ${userId}`);

    // Handle cover image
    let coverImageUrl;

    if (fileBuffer && originalFileName && mimeType) {
      // Upload new cover image
      coverImageUrl = await updateCoverImage(project, fileBuffer, originalFileName, mimeType);
    } else if (projectData.coverImage !== undefined) {
      // Handle cover image removal or keep existing
      coverImageUrl = await handleCoverImageRemoval(project, projectData);
    } else {
      // Keep existing cover image
      coverImageUrl = project.coverImage;
    }

    // Update project fields
    const updateData = { ...projectData };
    if (coverImageUrl !== undefined) {
      updateData.coverImage = coverImageUrl;
    }

    await project.update(updateData, { transaction });

    // Invalidate metrics cache on updated project(Fire-and-forget)
      invalidateDashboardMetrics();

    // Update techs if provided
    await updateProjectTechs(project, projectData.techs, transaction);

    // Update contributors if provided
    await updateProjectContributors(project, projectData.contributors, userId, transaction);

    await transaction.commit();

    // Invalidate caches
    await invalidateAllProjectCaches();
    await invalidateProjectCache(projectId);
    await invalidateUserProjectCaches(userId);

    // Reload project with associations
    const updatedProject = await Project.findByPk(projectId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'fullname', 'email', 'profilePicture'],
        },
        {
          model: Tech,
          as: 'techs',
          attributes: ['id', 'name', 'icon'],
          through: { attributes: [] },
        },
        {
          model: User,
          as: 'contributors',
          attributes: ['id', 'fullname', 'email', 'profilePicture'],
          through: { attributes: [] },
        },
      ],
    });

    logger.info(`Project updated successfully`, {
      projectId,
      userId,
      title: project.title,
    });

    return updatedProject;
  } catch (error) {
    await transaction.rollback();

    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      throw error;
    }

    logger.error(`Error updating project ${projectId}: ${error.message}`, {
      userId,
      projectId,
      error: error.message,
      stack: error.stack,
    });
    throw new InternalServerError(`Failed to update project: ${error.message}`);
  }
};

/**
 * Delete a project
 */
const deleteProject = async (projectId, userId) => {
  const transaction = await Project.sequelize.transaction();

  try {
    // Check if project exists and user is owner
    const project = await Project.findByPk(projectId, { transaction });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.createdBy !== userId) {
      throw new ForbiddenError('You are not authorized to delete this project');
    }

    logger.info(`Deleting project ${projectId} by user ${userId}`, {
      title: project.title,
    });

    // Delete cover image if exists
    if (project.coverImage) {
      const oldKey = extractObjectKeyFromUrl(project.coverImage);
      deleteImage(oldKey, 'cover image');
    }

    // Delete the project (cascade will handle junction tables)
    await project.destroy({ transaction });

    await transaction.commit();

    // Invalidate caches
    await invalidateAllProjectCaches();
    await invalidateProjectCache(projectId);
    await invalidateUserProjectCaches(userId);

    logger.info(`Project deleted successfully`, {
      projectId,
      userId,
      title: project.title,
    });

    return { success: true };
  } catch (error) {
    await transaction.rollback();

    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      throw error;
    }

    logger.error(`Error deleting project ${projectId}: ${error.message}`, {
      userId,
      projectId,
      error: error.message,
      stack: error.stack,
    });
    throw new InternalServerError(`Failed to delete project: ${error.message}`);
  }
};

module.exports = {
  updateProject,
  deleteProject,
  updateCoverImage,
  updateProjectTechs,
  updateProjectContributors,
};
