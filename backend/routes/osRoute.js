const express = require('express');
const router = express.Router();
const controller = require('../controllers/osController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/:id/status', controller.getPublicOS);
router.get('/:id/photos', controller.getPublicOSPhotos);
router.get('/:id/updates', controller.getPublicOSUpdates);

router.use(authenticate);
router.get('/', controller.getAllOS);
router.get('/search', controller.getOSByFilters);
router.get('/:id/status-history', controller.getStatusHistoryByOS);
router.get('/:id', controller.getOSById);
router.get('/:id/total', controller.getTotalValueOS);
router.get('/:id/pdf', controller.generatePDF);
router.post('/', controller.createOS);
router.post('/:id/parts', controller.addPartToOS);
router.patch('/:id/status', controller.patchStatusOs);
router.patch('/:id/labor', controller.patchLaborValue);
router.patch('/:id/description', controller.patchProblemDescription);

module.exports = router;
