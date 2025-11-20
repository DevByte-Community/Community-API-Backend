// services/techService.js
const { UniqueConstraintError, Op } = require('sequelize');
const { Tech } = require('../models');
const createLogger = require('../utils/logger');
const { minioClient, bucketName } = require('../utils/minioClient');
const crypto = require('crypto');

const logger = createLogger('TECH_SERVICE');

class TechService {

     async uploadIconToMinio(file) {
        if (!file) return null;

        const extension = file.originalname.split('.').pop();
        const fileName = `tech-icons/${crypto.randomUUID()}.${extension}`;

        await minioClient.putObject(bucketName, fileName, file.buffer, {
            'Content-Type': file.mimetype,
        });

        logger.info(`Uploaded icon → ${fileName}`);

        // Public access URL
        return `${process.env.MINIO_ENDPOINT}/${bucketName}/${fileName}`;
    }

    async createTech(data, iconFile) {
        const existing = await Tech.findOne({ where: { name: data.name } });
        if (existing) throw new Error('Tech already exists');

        let iconUrl = null;
        if (iconFile) iconUrl = await this.uploadIconToMinio(iconFile);

        const tech = await Tech.create({
            name: data.name,
            description: data.description || null,
            icon: iconUrl,
        });

        return {
            success: true,
            message: 'Tech created successfully',
            tech,
        };
    }

    async getAllTechs(searchTerm = '') {
        try {
            const where = searchTerm
                ? { name: { [Op.iLike]: `%${searchTerm}%` } } // PostgreSQL-style search
                : {};

            const techs = await Tech.findAll({ where });
            return {
                message: 'Techs retrieved successfully',
                success: true,
                techs,
            };
        } catch (err) {
            logger.error(`Failed to retrieve techs - ${err.message}`);
            const error = new Error(err.message);
            error.statusCode = 500;
            throw error;
        }
    }

    async getTechById(id) {
        try {
            // Here I retrieve a tech entry by ID
            const tech = await Tech.findByPk(id);
            if (!tech) {
                const error = new Error('Tech not found.');
                error.statusCode = 404;
                throw error;
            }
            return {
                message: 'Tech retrieved successfully',
                success: true,
                tech,
            };
        } catch (err) {
            logger.error(`Failed to retrieve tech with id=${id} - ${err.message}`);
            const error = new Error(err.message);
            error.statusCode = 500;
            throw error;
        }
    }

    async updateTech(id, data, iconFile) {
        const tech = await Tech.findByPk(id);
        if (!tech) throw new Error('Tech not found');

        let iconUrl = tech.icon;
        if (iconFile) iconUrl = await this.uploadIconToMinio(iconFile);

        await tech.update({
            name: data.name ?? tech.name,
            description: data.description ?? tech.description,
            icon: iconUrl,
        });

        return {
            success: true,
            message: 'Tech updated successfully',
            tech,
        };
    }

    async deleteTech(id) {
        try {
            // Here I delete a tech entry by ID
            const tech = await Tech.findByPk(id);
            if (!tech) {
                const error = new Error('Tech not found.');
                error.statusCode = 404;
                throw error;
            }
            await tech.destroy();
            return {
                message: 'Tech deleted successfully',
                success: true,
            };
        }
        catch (err) {
            logger.error(`Tech deletion failed for id=${id} - ${err.message}`);
            const error = new Error(err.message);
            error.statusCode = 500;
            throw error;
        }
    }
}

module.exports = new TechService();
 