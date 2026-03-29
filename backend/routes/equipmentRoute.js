const express = require('express');
const router = express.Router();
const controller = require('../controllers/equipmentController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);
router.get('/', controller.getAllEquipments);
router.get('/:id', controller.getEquipmentById);
router.get('/:id/history', controller.getHistoryById);
router.post('/', controller.createEquipment);
router.put('/:id', controller.updateEquipment);
router.delete('/:id', controller.deleteEquipment);

module.exports = router;
