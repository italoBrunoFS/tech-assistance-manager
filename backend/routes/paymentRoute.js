const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);
router.get('/', controller.getAllPayments);
router.post('/', controller.createPayment);

module.exports = router;
