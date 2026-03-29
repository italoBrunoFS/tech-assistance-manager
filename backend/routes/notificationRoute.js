const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticate);
router.post('/', authorizeRoles('admin', 'gerente'), controller.createNotification);

module.exports = router;
