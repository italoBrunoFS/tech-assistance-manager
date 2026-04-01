const express = require('express');
const router = express.Router();
const controller = require('../controllers/photoController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadPhoto } = require('../middleware/photoUploadMiddleware');

function handleUpload(req, res, next) {
  uploadPhoto.single('photo')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'Arquivo muito grande. Limite de 5 MB.' });
      return;
    }

    res.status(400).json({ message: err.message || 'Falha ao enviar arquivo' });
  });
}

router.use(authenticate);
router.get('/:id', controller.getPhotosByOS);
router.post('/upload', handleUpload, controller.uploadPhoto);
router.post('/', controller.createPhoto);

module.exports = router;
