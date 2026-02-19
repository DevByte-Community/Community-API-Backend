const express = require('express');
const router = express.Router();
const PartnerController = require('../controllers/partnerController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public
router.get('/', PartnerController.list);
router.get('/:id', PartnerController.get);

// Admin only
router.post('/', authMiddleware.adminOnly, upload.single('logo'), PartnerController.create);
router.patch('/:id', authMiddleware.adminOnly, upload.single('logo'), PartnerController.update);
router.delete('/:id', authMiddleware.adminOnly, PartnerController.delete);

module.exports = router;
