const express = require('express');
const router = express.Router();
const controller = require('../controllers/photoController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);
router.get('/:id', controller.getPhotosByOS);
router.post('/', controller.createPhoto);

module.exports = router;
