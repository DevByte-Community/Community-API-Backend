const Sequelize = require('sequelize');
const { Op } = Sequelize;
const Partner = require('../models').Partner;
const createLogger = require('../utils/logger');
const { ValidationError, NotFoundError, ConflictError, InternalServerError } = require('../utils/customErrors');
const { getMinioClient, getBucketName } = require('../blobStorage/minioClient');

const logger = createLogger('PARTNER_SERVICE');

/**
 * Upload logo to MinIO
 */
const uploadLogo = async (partnerId, fileBuffer, originalFileName) => {
  try {
    const client = getMinioClient();
    const bucket = getBucketName();
    const objectName = `${partnerId}_${originalFileName}`;
    await client.putObject(bucket, objectName, fileBuffer);
    return `http://${process.env.MINIO_HOST}:${process.env.MINIO_API_PORT}/${bucket}/${objectName}`;
  } catch (error) {
    logger.error(`Error uploading logo: ${error.message}`);
    throw new InternalServerError('Failed to upload logo');
  }
};

/**
 * Delete logo from MinIO
 */
const deleteLogo = async (logoUrl) => {
  try {
    const client = getMinioClient();
    const bucket = getBucketName();
    const objectKey = logoUrl.split(`/${bucket}/`)[1];
    if (objectKey) {
      await client.removeObject(bucket, objectKey);
    }
  } catch (error) {
    logger.warn(`Failed to delete logo: ${error.message}`);
  }
};

/**
 * Create partner
 */
const createPartner = async (data, file) => {
  try {
    const existing = await Partner.findOne({
      where: { [Op.or]: [{ name: data.name }, { email: data.email }] },
    });
    if (existing) throw new ConflictError('Partner name or email already exists');

    const id = `partner-${Date.now()}`;
    let logoUrl = null;
    if (file) logoUrl = await uploadLogo(id, file.buffer, file.originalname);

    const partner = await Partner.create({ id, ...data, logo: logoUrl });
    return partner;
  } catch (error) {
    logger.error(`createPartner failed: ${error.message}`);
    throw error instanceof ConflictError ? error : new InternalServerError(error.message);
  }
};

/**
 * Update partner
 */
const updatePartner = async (id, updates, file) => {
  try {
    const partner = await Partner.findByPk(id);
    if (!partner) throw new NotFoundError('Partner not found');

    if (file) {
      if (partner.logo) await deleteLogo(partner.logo);
      updates.logo = await uploadLogo(id, file.buffer, file.originalname);
    }

    await partner.update(updates);
    return partner;
  } catch (error) {
    logger.error(`updatePartner failed: ${error.message}`);
    throw error instanceof NotFoundError ? error : new InternalServerError(error.message);
  }
};

/**
 * Delete partner
 */
const deletePartner = async (id) => {
  try {
    const partner = await Partner.findByPk(id);
    if (!partner) throw new NotFoundError('Partner not found');

    if (partner.logo) await deleteLogo(partner.logo);
    await partner.destroy();
    return true;
  } catch (error) {
    logger.error(`deletePartner failed: ${error.message}`);
    throw error instanceof NotFoundError ? error : new InternalServerError(error.message);
  }
};

/**
 * Get all partners (with pagination & search)
 */
const getPartners = async ({ page = 1, limit = 10, search = '' }) => {
  try {
    const offset = (page - 1) * limit;
    const where = search
      ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const { rows, count } = await Partner.findAndCountAll({
      where,
      offset,
      limit,
      order: [['createdAt', 'DESC']],
    });

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
      },
    };
  } catch (error) {
    logger.error(`getPartners failed: ${error.message}`);
    throw new InternalServerError(error.message);
  }
};

/**
 * Get partner by ID
 */
const getPartnerById = async (id) => {
  try {
    const partner = await Partner.findByPk(id);
    if (!partner) throw new NotFoundError('Partner not found');
    return partner;
  } catch (error) {
    logger.error(`getPartnerById failed: ${error.message}`);
    throw error instanceof NotFoundError ? error : new InternalServerError(error.message);
  }
};

module.exports = {
  createPartner,
  updatePartner,
  deletePartner,
  getPartners,
  getPartnerById,
};
