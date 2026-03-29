const express = require('express');
const router = express.Router();
const controller = require('../controllers/partController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);
router.get('/', controller.getAllParts);
router.get('/:id', controller.getPartById);
router.post('/', controller.createPart);
router.put('/:id', controller.updatePart);
router.patch('/:id', controller.patchPart);
router.delete('/:id', controller.deletePart);

module.exports = router;
