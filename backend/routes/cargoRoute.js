const express = require('express');
const router = express.Router();
const controller = require('../controllers/cargoController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticate);
router.get('/', controller.getAllCargos);
router.post('/', authorizeRoles('admin', 'gerente'), controller.createCargo);

module.exports = router;
