const express = require('express');
const controller = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', controller.login);
router.post('/bootstrap', controller.bootstrapAdmin);
router.get('/me', authenticate, controller.getCurrentUser);

module.exports = router;
