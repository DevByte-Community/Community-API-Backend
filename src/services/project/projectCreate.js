/**
 * Project creation operations
 * Separated for modularity
 */

const createLogger = require('../../utils/logger');
const { ValidationError, NotFoundError, InternalServerError } = require('../../utils/customErrors');
const { Project, User, Tech } = require('../../models');
const {
  invalidateAllProjectCaches,
  invalidateUserProjectCaches,
} = require('../../cache/projectCache');
const { uploadProjectCoverImage } = require('../../utils/imageUploader');

const logger = createLogger('PROJECT_CREATE');

/**
 * Validate and process tech IDs
 */
const validateAndProcessTechs = async (techIds = [], transaction) => {
  if (!techIds || techIds.length === 0) {
    return [];
  }

  const techs = await Tech.findAll({
    where: { id: techIds },
    transaction,
  });

  if (techs.length !== techIds.length) {
    throw new NotFoundError('One or more techs not found');
  }

  return techs;
};

/**
 * Validate and process contributor IDs
 */
const validateAndProcessContributors = async (contributorIds = [], userId, transaction) => {
  if (!contributorIds || contributorIds.length === 0) {
    return [];
  }

  // Filter out creator from contributors
  const filteredIds = contributorIds.filter((id) => id !== userId);

  if (filteredIds.length === 0) {
    return [];
  }

  const contributors = await User.findAll({
    where: { id: filteredIds },
    transaction,
  });

  if (contributors.length !== filteredIds.length) {
    throw new NotFoundError('One or more contributors not found');
  }

  return contributors;
};

/**
 * Upload cover image for a project
 */
const uploadCoverImage = async (project, fileBuffer, originalFileName, mimeType = 'image/jpeg') => {
  return uploadProjectCoverImage({
    fileBuffer,
    originalFileName,
    mimeType,
    projectId: project.id,
    oldImageUrl: project.coverImage,
  });
};

/**
 * Create a new project
 */
const createProject = async (
  projectData,
  userId,
  fileBuffer = null,
  originalFileName = null,
  mimeType = null
) => {
  const transaction = await Project.sequelize.transaction();

  try {
    logger.info(`Creating project by user ${userId}`, { title: projectData.title });

    // Verify user exists
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Create project first (data is already validated and trimmed by controller)
    const project = await Project.create(
      {
        title: projectData.title,
        description: projectData.description || null,
        repoLink: projectData.repoLink || null,
        featured: projectData.featured || false,
        createdBy: userId,
      },
      { transaction }
    );

    // Invalidate metrics cache on Project(Fire-and-forget)
    invalidateDashboardMetrics();

    // If file is provided, upload it to MinIO and update project
    if (fileBuffer && originalFileName && mimeType) {
      const coverImageUrl = await uploadCoverImage(project, fileBuffer, originalFileName, mimeType);
      project.coverImage = coverImageUrl;
      await project.save({ transaction });
    }

    // Add techs if provided
    if (projectData.techs && projectData.techs.length > 0) {
      const techs = await validateAndProcessTechs(projectData.techs, transaction);
      await project.addTechs(techs, { transaction });
    }

    // Add contributors if provided
    if (projectData.contributors && projectData.contributors.length > 0) {
      const contributors = await validateAndProcessContributors(
        projectData.contributors,
        userId,
        transaction
      );
      if (contributors.length > 0) {
        await project.addContributors(contributors, { transaction });
      }
    }

    await transaction.commit();

    // Invalidate all project caches
    await invalidateAllProjectCaches();
    await invalidateUserProjectCaches(userId);

    // Reload project with associations
    const fullProject = await Project.findByPk(project.id, {
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

    logger.info(`Project created successfully`, {
      projectId: project.id,
      title: project.title,
      userId,
    });

    return fullProject;
  } catch (error) {
    logger.error(`Error creating project: ${error.message}`, {
      userId,
      error: error.message,
      stack: error.stack,
    });
    await transaction.rollback();

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new InternalServerError(`Failed to create project: ${error.message}`);
  }
};

module.exports = {
  createProject,
  uploadCoverImage,
  validateAndProcessTechs,
  validateAndProcessContributors,
};
