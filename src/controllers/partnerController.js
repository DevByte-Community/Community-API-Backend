const { Op } = require('sequelize');
const Partner = require('../models').Partner;
const PartnerService = require('../services/partnerService');
const createLogger = require('../utils/logger');
const logger = createLogger('PARTNER');

class PartnerController {
  static async create(req, res) {
    try {
      const partner = await PartnerService.createPartner(req.body, req.file);
      logger.info('Partner created', { adminUserId: req.user?.id, partnerId: partner.id });
      res.status(201).json({ success: true, message: 'Partner created successfully', partner });
    } catch (err) {
      logger.error('Partner creation failed', err);
      res.status(500).json({ success: false, message: [err.message] });
    }
  }

  static async list(req, res) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const offset = (page - 1) * limit;
      const where = search ? { name: { [Op.like]: `%${search}%` } } : {};
      const { count, rows } = await Partner.findAndCountAll({ where, limit, offset });
      res.json({ success: true, data: rows, pagination: { page, limit, total: count } });
    } catch (err) {
      logger.error('Failed to list partners', err);
      res.status(500).json({ success: false, message: [err.message] });
    }
  }

  static async get(req, res) {
    try {
      const partner = await Partner.findByPk(req.params.id);
      if (!partner) return res.status(404).json({ success: false, message: ['Partner not found'] });
      res.json({ success: true, partner });
    } catch (err) {
      logger.error('Failed to get partner', err);
      res.status(500).json({ success: false, message: [err.message] });
    }
  }

  static async update(req, res) {
    try {
      const partner = await PartnerService.updatePartner(req.params.id, req.body, req.file);
      res.json({ success: true, message: 'Partner updated successfully', partner });
    } catch (err) {
      logger.error('Partner update failed', err);
      res.status(500).json({ success: false, message: [err.message] });
    }
  }

  static async delete(req, res) {
    try {
      await PartnerService.deletePartner(req.params.id);
      res.json({ success: true, message: 'Partner deleted successfully' });
    } catch (err) {
      logger.error('Partner deletion failed', err);
      res.status(500).json({ success: false, message: [err.message] });
    }
  }
}

module.exports = PartnerController;
