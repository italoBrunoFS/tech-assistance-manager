const model = require('../models/photoModel');

const getPhotosByOS = async (req, res) => {
  try {
    const photos = await model.getPhotosByOS(req.params.id);
    res.status(200).json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createPhoto = async (req, res) => {
  try {
    const photo = await model.createPhoto(req.body);
    res.status(201).json(photo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const uploadPhoto = async (req, res) => {
  try {
    const idOs = Number(req.body?.id_os);

    if (!Number.isInteger(idOs) || idOs <= 0) {
      return res.status(400).json({ message: 'id_os obrigatorio para upload' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo de imagem obrigatorio' });
    }

    const photo = await model.createPhoto({
      id_os: idOs,
      url_arquivo: `/uploads/photos/${req.file.filename}`,
      data_upload: req.body?.data_upload || new Date()
    });

    return res.status(201).json(photo);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getPhotosByOS,
  createPhoto,
  uploadPhoto
};
