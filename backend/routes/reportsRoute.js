const express = require('express');
const router = express.Router();

const controller = require('../controllers/reportsController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// Finance
router.get('/revenue', controller.getTotalRevenue);
router.get('/revenue/monthly', controller.getMonthlyRevenue);
router.get('/revenue/period', controller.getRevenueByPeriod);

// Orders
router.get('/orders/status', controller.getOrdersByStatus);
router.get('/orders/summary', controller.getOrdersSummary);
router.get('/orders/pdf', controller.generateAllOrdersPDF);

// Parts
router.get('/parts/most-used', controller.getMostUsedParts);

// Metrics
router.get('/ticket-average', controller.getAverageTicket);



module.exports = router;
